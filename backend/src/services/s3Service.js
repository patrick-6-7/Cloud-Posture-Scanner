const logger = require('../utils/logger.js');
const {
    S3Client,
    paginateListBuckets,
    GetBucketLocationCommand,
    GetBucketEncryptionCommand,
    GetPublicAccessBlockCommand,
    GetBucketPolicyStatusCommand,
    GetBucketAclCommand
} = require('@aws-sdk/client-s3');

const ENCRYPTION_LABELS = {
    'AES256': 'AES256',
    'aws:kms': 'AWS-KMS',
    'aws:kms:dsse': 'AWS-KMS-DSSE'
};

const PUBLIC_ACL_GROUPS = [
    'http://acs.amazonaws.com/groups/global/AllUsers',
    'http://acs.amazonaws.com/groups/global/AuthenticatedUsers'
];

// Runs an S3 call; returns `fallback` when AWS reports the setting simply isn't configured.
async function sendOrDefault(client, command, notConfiguredError, fallback) {
    try {
        return await client.send(command);
    } catch (error) {
        if (error.name === notConfiguredError) return fallback;
        throw error;
    }
}

class S3Service {
    // One client per region: bucket-level calls must hit the bucket's own region.
    clientFor(clients, region) {
        if (!clients.has(region)) clients.set(region, new S3Client({ region }));
        return clients.get(region);
    }

    async listBuckets(client) {
        // pageSize (MaxBuckets) is required for ListBuckets to include BucketRegion.
        const paginator = paginateListBuckets({ client, pageSize: 1000 }, {});
        const buckets = [];
        for await (const page of paginator) {
            for (const bucket of page.Buckets ?? []) {
                buckets.push({
                    name: bucket.Name,
                    region: bucket.BucketRegion ?? await this.getBucketRegion(client, bucket.Name)
                });
            }
        }
        return buckets;
    }

    async getBucketRegion(client, bucket) {
        const { LocationConstraint } = await client.send(new GetBucketLocationCommand({ Bucket: bucket }));
        if (!LocationConstraint) return 'us-east-1';
        if (LocationConstraint === 'EU') return 'eu-west-1';
        return LocationConstraint;
    }

    async getEncryption(client, bucket) {
        const result = await sendOrDefault(
            client,
            new GetBucketEncryptionCommand({ Bucket: bucket }),
            'ServerSideEncryptionConfigurationNotFoundError',
            null
        );
        const algorithm = result?.ServerSideEncryptionConfiguration?.Rules?.[0]
            ?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm;
        if (!algorithm) return 'None';
        return ENCRYPTION_LABELS[algorithm] ?? algorithm;
    }

    async getAccessPolicy(client, bucket) {
        const [blockResult, policyResult, aclResult] = await Promise.all([
            sendOrDefault(client, new GetPublicAccessBlockCommand({ Bucket: bucket }),
                'NoSuchPublicAccessBlockConfiguration', {}),
            sendOrDefault(client, new GetBucketPolicyStatusCommand({ Bucket: bucket }),
                'NoSuchBucketPolicy', {}),
            client.send(new GetBucketAclCommand({ Bucket: bucket }))
        ]);

        const block = blockResult.PublicAccessBlockConfiguration ?? {};
        const policyIsPublic = policyResult.PolicyStatus?.IsPublic === true;
        const aclIsPublic = (aclResult.Grants ?? []).some(
            (grant) => PUBLIC_ACL_GROUPS.includes(grant.Grantee?.URI)
        );

        // Block Public Access overrides a public policy / ACL at the bucket level.
        const publicViaPolicy = policyIsPublic && !block.RestrictPublicBuckets;
        const publicViaAcl = aclIsPublic && !block.IgnorePublicAcls;
        return publicViaPolicy || publicViaAcl ? 'Public' : 'Private';
    }

    // Shape expected by the frontend table (see frontend/src/dummyData/S3.json).
    toBucket({ name, region }, encryption, policy) {
        let status = 'Secure';
        if (policy === 'Public') status = 'Exposed';
        else if (encryption === 'None' || encryption === 'Unknown' || policy === 'Unknown') status = 'Warning';
        return { name, region, encryption, policy, status };
    }

    async scanBucket(clients, bucket) {
        const client = this.clientFor(clients, bucket.region);
        const [encryption, policy] = await Promise.allSettled([
            this.getEncryption(client, bucket.name),
            this.getAccessPolicy(client, bucket.name)
        ]);

        if (encryption.status === 'rejected') {
            logger.warn(`S3 encryption check failed for ${bucket.name}: ${encryption.reason.message}`);
        }
        if (policy.status === 'rejected') {
            logger.warn(`S3 access check failed for ${bucket.name}: ${policy.reason.message}`);
        }

        return this.toBucket(
            bucket,
            encryption.status === 'fulfilled' ? encryption.value : 'Unknown',
            policy.status === 'fulfilled' ? policy.value : 'Unknown'
        );
    }

    async scanAllBuckets() {
        const startedAt = Date.now();
        const clients = new Map();

        // ListBuckets is global: one call returns buckets from every region.
        const buckets = await this.listBuckets(this.clientFor(clients, process.env.AWS_REGION));
        const results = await Promise.all(buckets.map((bucket) => this.scanBucket(clients, bucket)));

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        logger.info(`S3 scan: ${results.length} buckets (${seconds}s)`);
        return results;
    }
}

module.exports = new S3Service();
