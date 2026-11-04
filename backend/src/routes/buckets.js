const express = require('express');
const router = express.Router();
const { getBuckets } = require('../controllers/buckets.js');

router.get('/', getBuckets);

module.exports = router;
