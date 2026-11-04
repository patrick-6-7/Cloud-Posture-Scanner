const S3Service = require('../services/s3Service.js');
const { PASS, FAIL, formatList, plural } = require('./helpers.js');

function evaluate(buckets) {
    if (buckets.length === 0) {
        return { status: PASS, evidence: 'No S3 buckets found in the account' };
    }

    const publicBuckets = buckets.filter((b) => b.policy === 'Public').map((b) => b.name);
    const unknown = buckets.filter((b) => b.policy === 'Unknown').map((b) => b.name);

    if (publicBuckets.length === 0 && unknown.length === 0) {
        return { status: PASS, evidence: `All ${buckets.length} ${plural(buckets.length, 'bucket')} block public access` };
    }

    const findings = [];
    if (publicBuckets.length > 0) {
        findings.push(`${publicBuckets.length} of ${buckets.length} buckets ${plural(publicBuckets.length, 'is', 'are')} publicly accessible: ${formatList(publicBuckets)}`);
    }
    if (unknown.length > 0) {
        findings.push(`Could not verify access settings for: ${formatList(unknown)}`);
    }
    return { status: FAIL, evidence: findings.join('. ') };
}

module.exports = {
    id: 's3-public-access',
    title: 'No S3 buckets publicly accessible',
    evaluate,
    run: async () => evaluate(await S3Service.scanAllBuckets())
};
