const express = require('express');
const config = require('../config/env');
const { verifySignature } = require('../utils/signatureVerifier');
const { validateWebhookPayload } = require('../utils/validator');
const logger = require('../utils/logger');
const orderService = require('../services/orderService');

const router = express.Router();

/**
 * POST /webhooks/provider-x
 * Receive and process webhooks from external provider
 * 
 * Request Flow:
 * 1. Raw body capture (middleware)
 * 2. Signature verification
 * 3. JSON parsing
 * 4. Payload validation
 * 5. Event type check
 * 6. Business logic processing
 * 7. Response
 */
router.post('/provider-x', async (req, res) => {
    const startTime = Date.now();
    let eventId, eventType, orderId;

    try {
        // Step 1: Extract headers
        const signature = req.headers['x-signature'];
        eventType = req.headers['x-event-type'];
        const webhookVersion = req.headers['x-webhook-version'] || '1.0';

        // Step 2: Verify signature (MANDATORY)
        if (!signature) {
            logger.warn('Missing signature header', { path: req.path });
            return res.status(401).json({ error: 'Missing X-Signature header' });
        }

        if (!req.rawBody) {
            logger.error('Raw body not captured', { path: req.path });
            return res.status(500).json({ error: 'Internal server error' });
        }

        const isValidSignature = verifySignature(
            req.rawBody,
            signature,
            config.webhookSecret
        );

        if (!isValidSignature) {
            logger.warn('Invalid signature', {
                path: req.path,
                eventType,
            });
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Step 3: Parse JSON (after signature verification)
        let payload;
        try {
            payload = JSON.parse(req.rawBody);
        } catch (error) {
            logger.warn('Malformed JSON payload', {
                path: req.path,
                error: error.message,
            });
            return res.status(400).json({ error: 'Invalid JSON payload' });
        }

        // Extract event details for logging
        eventId = payload.eventId;
        orderId = payload.orderId;

        // Step 4: Validate payload structure
        const validation = validateWebhookPayload(payload);
        if (!validation.valid) {
            logger.warn('Invalid payload structure', {
                eventId,
                orderId,
                eventType,
                error: validation.error,
            });
            return res.status(400).json({ error: validation.error });
        }

        // Step 5: Check event type
        if (!eventType) {
            logger.warn('Missing event type header', { eventId, orderId });
            return res.status(400).json({ error: 'Missing X-Event-Type header' });
        }

        // Step 6: Process event
        const result = await orderService.processEvent(eventType, payload);

        // Step 7: Log and respond
        const processingTime = Date.now() - startTime;

        if (result.skipped) {
            // Unknown event type - log and accept
            logger.webhook({
                eventId,
                eventType,
                orderId,
                status: 'skipped',
                processingTime,
                webhookVersion,
            });

            return res.status(202).json({
                message: 'Event accepted but not processed (unknown type)',
                eventId,
            });
        }

        // Successfully processed
        logger.webhook({
            eventId,
            eventType,
            orderId,
            status: 'processed',
            processingTime,
            webhookVersion,
        });

        return res.status(200).json({
            message: 'Webhook processed successfully',
            eventId,
            orderId,
        });

    } catch (error) {
        // Processing failure
        const processingTime = Date.now() - startTime;

        logger.webhook({
            eventId,
            eventType,
            orderId,
            status: 'failed',
            error: error.message,
            processingTime,
        });

        return res.status(500).json({
            error: 'Failed to process webhook',
            eventId,
        });
    }
});

/**
 * GET /webhooks/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
