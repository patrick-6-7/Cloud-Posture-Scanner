const express = require('express');
const router = express.Router();
const { getCisResults } = require('../controllers/cisResults.js');

router.get('/', getCisResults);

module.exports = router;
