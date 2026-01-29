const crypto = require('crypto');

/**
 * Verify HMAC-SHA256 signature for webhook authenticity
 * Uses timing-safe comparison to prevent timing attacks
 * 
 * @param {string|Buffer} rawBody - Raw request body (must be exact bytes received)
 * @param {string} signature - Signature from X-Signature header
 * @param {string} secret - Webhook secret key
 * @returns {boolean} - True if signature is valid
 */
function verifySignature(rawBody, signature, secret) {
    if (!rawBody || !signature || !secret) {
        return false;
    }

    try {
        // Generate expected signature using HMAC-SHA256
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody, 'utf8')
            .digest('hex');

        // Use timing-safe comparison to prevent timing attacks
        // Both buffers must be same length for timingSafeEqual
        if (signature.length !== expectedSignature.length) {
            return false;
        }

        return crypto.timingSafeEqual(
            Buffer.from(signature, 'utf8'),
            Buffer.from(expectedSignature, 'utf8')
        );
    } catch (error) {
        // If any error occurs during verification, treat as invalid
        return false;
    }
}

module.exports = { verifySignature };
