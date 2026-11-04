const IAMService = require('../services/iamService.js');
const { PASS, FAIL } = require('./helpers.js');

function evaluate(summary) {
    const value = summary.AccountMFAEnabled ?? 0;
    return value === 1
        ? { status: PASS, evidence: 'Root account MFA is enabled (AccountMFAEnabled = 1)' }
        : { status: FAIL, evidence: `Root account has no MFA device (AccountMFAEnabled = ${value})` };
}

module.exports = {
    id: 'iam-root-mfa',
    title: 'IAM root account has MFA enabled',
    evaluate,
    run: async () => evaluate(await IAMService.getAccountSummary())
};
