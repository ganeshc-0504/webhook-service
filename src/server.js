const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');

const server = app.listen(config.port, () => {
    logger.info('Server started', {
        port: config.port,
        nodeEnv: config.nodeEnv,
    });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', {
        reason: reason,
    });
    process.exit(1);
});
