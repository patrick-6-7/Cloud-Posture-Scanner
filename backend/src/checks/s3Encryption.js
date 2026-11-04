const S3Service = require('../services/s3Service.js');
const { PASS, FAIL, formatList, plural } = require('./helpers.js');

function evaluate(buckets) {
    if (buckets.length === 0) {
        return { status: PASS, evidence: 'No S3 buckets found in the account' };
    }

    const unencrypted = buckets.filter((b) => b.encryption === 'None').map((b) => b.name);
    const unknown = buckets.filter((b) => b.encryption === 'Unknown').map((b) => b.name);

    if (unencrypted.length === 0 && unknown.length === 0) {
        // e.g. "AES256: 2, AWS-KMS: 1"
        const counts = {};
        buckets.forEach((b) => { counts[b.encryption] = (counts[b.encryption] ?? 0) + 1; });
        const breakdown = Object.entries(counts).map(([type, count]) => `${type}: ${count}`).join(', ');
        return { status: PASS, evidence: `All ${buckets.length} ${plural(buckets.length, 'bucket')} encrypted by default (${breakdown})` };
    }

    const findings = [];
    if (unencrypted.length > 0) {
        findings.push(`${unencrypted.length} of ${buckets.length} buckets ${plural(unencrypted.length, 'has', 'have')} no default encryption: ${formatList(unencrypted)}`);
    }
    if (unknown.length > 0) {
        findings.push(`Could not read encryption settings for: ${formatList(unknown)}`);
    }
    return { status: FAIL, evidence: findings.join('. ') };
}

module.exports = {
    id: 's3-encryption',
    title: 'All S3 buckets encrypted',
    evaluate,
    run: async () => evaluate(await S3Service.scanAllBuckets())
};
