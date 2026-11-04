const logger = require('../utils/logger.js');

// Order here is the order results are returned (and shown on the dashboard).
const CHECKS = [
    require('../checks/s3PublicAccess.js'),
    require('../checks/s3Encryption.js'),
    require('../checks/iamRootMfa.js'),
    require('../checks/cloudTrailEnabled.js'),
    require('../checks/sgAdminPorts.js')
];

class CISService {
    // Runs one check. AWS failures become an ERROR result (with the reason as evidence)
    // instead of failing the whole run, so the other checks still report.
    async runCheck(check, checkedAt) {
        const startedAt = Date.now();
        let outcome;
        try {
            outcome = await check.run();
        } catch (error) {
            logger.warn(`CIS ${check.id} could not run: ${error.name}: ${error.message}`);
            outcome = { status: 'ERROR', evidence: `${error.name}: ${error.message}` };
        }

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        logger.info(`CIS ${check.id}: ${outcome.status} (${seconds}s)`);
        return { id: check.id, title: check.title, ...outcome, checkedAt };
    }

    // Runs every check in parallel. All results share one checkedAt so a run can later
    // be stored and looked up by its date/time.
    async runAllChecks() {
        const startedAt = Date.now();
        const checkedAt = new Date().toISOString();
        const results = await Promise.all(
                            CHECKS.map(
                                (check) => this.runCheck(check, checkedAt)
                            )
                        );

        const count = (status) => results.filter((r) => r.status === status).length;
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        logger.info(`CIS run: ${count('PASS')} PASS, ${count('FAIL')} FAIL, ${count('ERROR')} ERROR (${seconds}s)`);
        return results;
    }
}

module.exports = new CISService();
