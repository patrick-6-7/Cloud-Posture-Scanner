const express = require('express');
const router = express.Router();
const { getCisResults } = require('../controllers/cisResults.js');
const cooldown = require('../middlewares/cooldown.js');

// A run scans the whole AWS account, so allow at most one every 10 seconds.
router.get('/', cooldown(10), getCisResults);

module.exports = router;
