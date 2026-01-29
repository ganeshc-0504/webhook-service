/**
 * Validate webhook payload structure and required fields
 * 
 * @param {object} payload - Parsed JSON payload
 * @returns {object} - { valid: boolean, error?: string }
 */
function validateWebhookPayload(payload) {
    // Check if payload is an object
    if (!payload || typeof payload !== 'object') {
        return {
            valid: false,
            error: 'Payload must be a valid JSON object',
        };
    }

    // Check required fields
    const requiredFields = ['eventId', 'orderId', 'timestamp'];

    for (const field of requiredFields) {
        if (!payload[field]) {
            return {
                valid: false,
                error: `Missing required field: ${field}`,
            };
        }
    }

    // Validate field types
    if (typeof payload.eventId !== 'string') {
        return {
            valid: false,
            error: 'eventId must be a string',
        };
    }

    if (typeof payload.orderId !== 'string') {
        return {
            valid: false,
            error: 'orderId must be a string',
        };
    }

    if (typeof payload.timestamp !== 'number') {
        return {
            valid: false,
            error: 'timestamp must be a number',
        };
    }

    // Optional fields validation
    if (payload.amount !== undefined && typeof payload.amount !== 'number') {
        return {
            valid: false,
            error: 'amount must be a number',
        };
    }

    if (payload.currency !== undefined && typeof payload.currency !== 'string') {
        return {
            valid: false,
            error: 'currency must be a string',
        };
    }

    return { valid: true };
}

module.exports = { validateWebhookPayload };
