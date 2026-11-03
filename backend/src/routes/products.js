const express = require('express');
const router = express.Router();
const { getNearbyProducts } = require('../controllers/product');

router.get('/getProducts', getNearbyProducts);

module.exports = router;
