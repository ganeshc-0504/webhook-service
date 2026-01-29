const express = require('express');
const rawBodyParser = require('./middleware/rawBodyParser');
const errorHandler = require('./middleware/errorHandler');
const webhookRoutes = require('./routes/webhooks');
const logger = require('./utils/logger');

const app = express();

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('HTTP Request', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
        });
    });

    next();
});

// Raw body parser for webhook routes (MUST come before JSON parser)
app.use(rawBodyParser);

// JSON body parser for other routes
app.use(express.json());

// Routes
app.use('/webhooks', webhookRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Webhook Service',
        version: '1.0.0',
        endpoints: {
            webhook: 'POST /webhooks/provider-x',
            health: 'GET /webhooks/health',
        },
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
    });
});

// Global error handler (MUST be last)
app.use(errorHandler);

module.exports = app;
