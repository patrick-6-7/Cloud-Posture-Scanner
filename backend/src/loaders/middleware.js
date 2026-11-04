const logger = require('../utils/logger.js');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('../middlewares/errorHandler.js');

class MiddlewareLoader {

    corsOptions = {
        origin: [process.env.CORS_ORIGIN1, process.env.CORS_ORIGIN2],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    };

    async loadMiddlewares(app) {
        logger.info('Loading Middlewares...');
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use(cookieParser());
        app.use(cors(this.corsOptions));
        logger.info('All Middlewares Loaded...\n');
    }

    // Must be registered after the routes so it catches their errors.
    async loadErrorHandlers(app) {
        app.use(errorHandler);
        logger.info('Error Handler Loaded... \n');
    }

}

module.exports = new MiddlewareLoader();
