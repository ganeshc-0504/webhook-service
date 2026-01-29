const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    const statusCode = err.statusCode || 500;
    const message = statusCode === 500
        ? 'Internal server error'
        : err.message || 'An error occurred';

    res.status(statusCode).json({
        error: message,
    });
}

module.exports = errorHandler;
