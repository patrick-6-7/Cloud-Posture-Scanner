require('dotenv').config();
const logger = require('./utils/logger.js');
const Loader = require('./loaders/loader.js');
const express = require('express');
const app = express();


async function main() {
	logger.info('Loading Server... \n');
	await Loader.initializeApp(app, process.env.PORT, process.env.MONGODB_URI);
}

main();