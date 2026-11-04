const S3Service = require('../services/s3Service.js');

// Express 5 forwards rejected promises to the error middleware, so no try/catch needed.
const getBuckets = async (req, res) => {
    const buckets = await S3Service.scanAllBuckets();
    res.json(buckets);
};

module.exports = { getBuckets };
