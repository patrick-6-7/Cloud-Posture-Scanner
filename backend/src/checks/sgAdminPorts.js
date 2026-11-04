const EC2Service = require('../services/ec2Service.js');
const { PASS, FAIL, formatList, plural, ruleExposesPort, ruleOpenToInternet } = require('./helpers.js');

const ADMIN_PORTS = [
    { port: 22, name: 'SSH' },
    { port: 3389, name: 'RDP' }
];

// One finding per security group, e.g. "launch-wizard-1 (sg-0abc, eu-north-1): port 22 (SSH)".
function findExposures(groups) {
    return groups.flatMap((group) => {
        const openRules = group.ipPermissions.filter(ruleOpenToInternet);
        const exposed = ADMIN_PORTS.filter(({ port }) => openRules.some((rule) => ruleExposesPort(rule, port)));
        if (exposed.length === 0) return [];
        const ports = exposed.map(({ port, name }) => `port ${port} (${name})`).join(', ');
        return [`${group.name} (${group.id}, ${group.region}): ${ports}`];
    });
}

function evaluate({ items, regionsScanned, regionsTotal }) {
    const exposures = findExposures(items);
    const skipped = regionsTotal - regionsScanned;

    if (exposures.length > 0) {
        return {
            status: FAIL,
            evidence: `${exposures.length} security ${plural(exposures.length, 'group')} open to 0.0.0.0/0 on SSH/RDP: ${formatList(exposures)}`
        };
    }
    if (skipped > 0) {
        return { status: FAIL, evidence: `Could not scan ${skipped} of ${regionsTotal} regions; no exposures found in the other ${regionsScanned}` };
    }
    return { status: PASS, evidence: `No security group allows 0.0.0.0/0 on port 22 or 3389 across ${regionsScanned} regions` };
}

module.exports = {
    id: 'sg-admin-ports',
    title: 'Security groups not open to 0.0.0.0/0 for SSH or RDP',
    evaluate,
    run: async () => evaluate(await EC2Service.listInternetOpenSecurityGroups())
};
