const CISService = require('../services/cisService.js');

// Runs all CIS checks and returns the latest results.
// Express 5 forwards rejected promises to the error middleware, so no try/catch needed.
const getCisResults = async (req, res) => {
    const results = await CISService.runAllChecks();
    res.json(results);
};

module.exports = { getCisResults };
