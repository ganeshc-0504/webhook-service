/**
 * Structured JSON logger for production-ready logging
 * Outputs logs in JSON format with timestamp, level, and metadata
 */

class Logger {
    /**
     * Log an info message
     * @param {string} message - Log message
     * @param {object} metadata - Additional metadata
     */
    info(message, metadata = {}) {
        this._log('INFO', message, metadata);
    }

    /**
     * Log a warning message
     * @param {string} message - Log message
     * @param {object} metadata - Additional metadata
     */
    warn(message, metadata = {}) {
        this._log('WARN', message, metadata);
    }

    /**
     * Log an error message
     * @param {string} message - Log message
     * @param {object} metadata - Additional metadata
     */
    error(message, metadata = {}) {
        this._log('ERROR', message, metadata);
    }

    /**
     * Log webhook-specific events with structured format
     * @param {object} eventData - Webhook event data
     */
    webhook(eventData) {
        const { eventId, eventType, orderId, status, error } = eventData;

        const logData = {
            eventId,
            eventType,
            orderId,
            processingStatus: status,
        };

        if (error) {
            logData.error = error;
        }

        this._log('INFO', 'Webhook event processed', logData);
    }

    /**
     * Internal logging method
     * @private
     */
    _log(level, message, metadata) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...metadata,
        };

        const output = JSON.stringify(logEntry);

        if (level === 'ERROR') {
            console.error(output);
        } else {
            console.log(output);
        }
    }
}

module.exports = new Logger();
