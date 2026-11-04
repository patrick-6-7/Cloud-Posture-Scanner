const logger = require('../utils/logger.js');

// Final error handler: log the error and always answer with JSON.
// AWS SDK errors carry their HTTP status in $metadata (e.g. 403 for missing permissions).
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    logger.error(`Request failed: ${req.method} ${req.originalUrl}`, err);

    const status = err.$metadata?.httpStatusCode ?? err.status ?? 500;
    res.status(status).json({
        error: err.name || 'Error',
        message: err.message
    });
};

module.exports = errorHandler;
