const EC2Service = require('../services/ec2Service.js');

// Express 5 forwards rejected promises to the error middleware, so no try/catch needed.
const getInstances = async (req, res) => {
    const instances = await EC2Service.scanAllRegions();
    res.json(instances);
};

module.exports = { getInstances };
