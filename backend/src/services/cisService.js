const logger = require('../utils/logger.js');
const CisRunModel = require('../models/cisRunModel.js');

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

    // Runs every check in parallel, then saves the run to DynamoDB. All results share one
    // checkedAt, which becomes the run's sort key (runAt).
    async runAllChecks() {
        const startedAt = Date.now();
        const checkedAt = new Date().toISOString();
        const results = await Promise.all(
                            CHECKS.map(
                                (check) => this.runCheck(check, checkedAt)
                            )
                        );

        const count = (status) => results.filter((r) => r.status === status).length;
        const summary = { pass: count('PASS'), fail: count('FAIL'), error: count('ERROR') };
        const durationMs = Date.now() - startedAt;
        logger.info(`CIS run: ${summary.pass} PASS, ${summary.fail} FAIL, ${summary.error} ERROR (${(durationMs / 1000).toFixed(1)}s)`);

        await this.saveRun({ runAt: checkedAt, durationMs, summary, results });
        return results;
    }

    // A failed save shouldn't hide the live results, so it is logged rather than thrown.
    async saveRun(run) {
        try {
            await CisRunModel.save(run);
            logger.info(`CIS run saved (runAt ${run.runAt})`);
        } catch (error) {
            logger.warn(`CIS run not saved: ${error.name}: ${error.message}`);
        }
    }
}

module.exports = new CISService();
