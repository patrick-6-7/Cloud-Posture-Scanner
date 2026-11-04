const PASS = 'PASS';
const FAIL = 'FAIL';

// "a, b, c, d, e +2 more": keeps evidence readable when many resources fail.
const formatList = (names, max = 5) => {
    const shown = names.slice(0, max).join(', ');
    return names.length > max ? `${shown} +${names.length - max} more` : shown;
};

const plural = (count, singular, pluralForm = `${singular}s`) => (count === 1 ? singular : pluralForm);

// True if an inbound rule allows the given TCP port. Protocol "-1" means all traffic.
const ruleExposesPort = (rule, port) => {
    if (rule.IpProtocol === '-1') return true;
    if (rule.IpProtocol !== 'tcp' && rule.IpProtocol !== '6') return false;
    return rule.FromPort <= port && port <= rule.ToPort;
};

const ruleOpenToInternet = (rule) => (rule.IpRanges ?? []).some((range) => range.CidrIp === '0.0.0.0/0');

module.exports = { PASS, FAIL, formatList, plural, ruleExposesPort, ruleOpenToInternet };
