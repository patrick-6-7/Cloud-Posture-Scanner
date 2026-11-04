const CloudTrailService = require('../services/cloudTrailService.js');
const { PASS, FAIL, formatList } = require('./helpers.js');

// CIS 3.1: at least one multi-region trail must be actively logging.
function evaluate(trails) {
    if (trails.length === 0) {
        return { status: FAIL, evidence: 'No CloudTrail trails are configured' };
    }

    const compliant = trails.find((t) => t.isMultiRegion && t.isLogging);
    if (compliant) {
        return { status: PASS, evidence: `Multi-region trail "${compliant.name}" (home region ${compliant.homeRegion}) is logging` };
    }

    const described = trails.map((t) =>
        `${t.name} (${t.isMultiRegion ? 'multi-region' : 'single-region'}, ${t.isLogging ? 'logging' : 'not logging'})`
    );
    return { status: FAIL, evidence: `No multi-region trail is logging. Trails found: ${formatList(described)}` };
}

module.exports = {
    id: 'cloudtrail-enabled',
    title: 'CloudTrail is enabled',
    evaluate,
    run: async () => evaluate(await CloudTrailService.listTrails())
};
