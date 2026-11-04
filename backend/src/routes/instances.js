const express = require('express');
const router = express.Router();
const { getInstances } = require('../controllers/instances.js');

router.get('/', getInstances);

module.exports = router;
