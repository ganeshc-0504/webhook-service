const logger = require('../utils/logger');

/**
 * In-memory order store
 * Handles business logic for order events
 */
class OrderService {
    constructor() {
        // In-memory storage for orders
        this.orders = new Map();

        // Dead-letter queue for failed events (bonus feature)
        this.failedEvents = [];
    }

    /**
     * Process webhook event based on event type
     * @param {string} eventType - Type of event (order.created, order.updated, order.cancelled)
     * @param {object} payload - Event payload
     * @returns {object} - Processing result
     */
    async processEvent(eventType, payload) {
        try {
            switch (eventType) {
                case 'order.created':
                    return this.createOrder(payload);

                case 'order.updated':
                    return this.updateOrder(payload);

                case 'order.cancelled':
                    return this.cancelOrder(payload);

                default:
                    // Unknown event types should not error
                    logger.warn('Unknown event type received', {
                        eventType,
                        eventId: payload.eventId,
                    });
                    return {
                        success: true,
                        skipped: true,
                        message: 'Unknown event type - log and skip',
                    };
            }
        } catch (error) {
            // Log processing failure
            logger.error('Event processing failed', {
                eventType,
                eventId: payload.eventId,
                orderId: payload.orderId,
                error: error.message,
            });

            // Store in failed events queue
            this.failedEvents.push({
                eventType,
                payload,
                error: error.message,
                timestamp: new Date().toISOString(),
            });

            throw error;
        }
    }

    /**
     * Create a new order
     * @param {object} payload - Order creation payload
     */
    createOrder(payload) {
        const { orderId, eventId, amount, currency, timestamp } = payload;

        // Check if order already exists
        if (this.orders.has(orderId)) {
            logger.warn('Order already exists', { orderId, eventId });
            // Not throwing error - idempotency consideration
        }

        const order = {
            orderId,
            status: 'created',
            totalAmount: amount || 0,
            currency: currency || 'INR',
            lastEventId: eventId,
            updatedAt: new Date(timestamp * 1000),
        };

        this.orders.set(orderId, order);

        logger.info('Order created', { orderId, eventId });

        return {
            success: true,
            order,
        };
    }

    /**
     * Update an existing order
     * @param {object} payload - Order update payload
     */
    updateOrder(payload) {
        const { orderId, eventId, amount, currency, timestamp } = payload;

        const existingOrder = this.orders.get(orderId);

        if (!existingOrder) {
            logger.warn('Order not found for update, creating new', { orderId, eventId });
            // Create order if it doesn't exist (defensive)
            return this.createOrder(payload);
        }

        const updatedOrder = {
            ...existingOrder,
            status: 'updated',
            totalAmount: amount !== undefined ? amount : existingOrder.totalAmount,
            currency: currency || existingOrder.currency,
            lastEventId: eventId,
            updatedAt: new Date(timestamp * 1000),
        };

        this.orders.set(orderId, updatedOrder);

        logger.info('Order updated', { orderId, eventId });

        return {
            success: true,
            order: updatedOrder,
        };
    }

    /**
     * Cancel an order
     * @param {object} payload - Order cancellation payload
     */
    cancelOrder(payload) {
        const { orderId, eventId, timestamp } = payload;

        const existingOrder = this.orders.get(orderId);

        if (!existingOrder) {
            logger.warn('Order not found for cancellation', { orderId, eventId });
            throw new Error(`Order ${orderId} not found`);
        }

        const cancelledOrder = {
            ...existingOrder,
            status: 'cancelled',
            lastEventId: eventId,
            updatedAt: new Date(timestamp * 1000),
        };

        this.orders.set(orderId, cancelledOrder);

        logger.info('Order cancelled', { orderId, eventId });

        return {
            success: true,
            order: cancelledOrder,
        };
    }

    /**
     * Get order by ID
     * @param {string} orderId - Order ID
     */
    getOrder(orderId) {
        return this.orders.get(orderId);
    }

    /**
     * Get all orders
     */
    getAllOrders() {
        return Array.from(this.orders.values());
    }

    /**
     * Get failed events (dead-letter queue)
     */
    getFailedEvents() {
        return this.failedEvents;
    }
}

// Export singleton instance
module.exports = new OrderService();
