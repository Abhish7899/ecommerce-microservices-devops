import { logger } from '../utils/logger.js';
import { notificationService } from '../services/notificationService.js';

/**
 * Handles incoming order.created events.
 * Parses the event, logs the details, and sends email & webhook notifications.
 * @param {Buffer|string|Object} rawPayload
 * @param {Object} [properties={}]
 * @returns {Promise<Object>}
 */
export async function handleOrderCreated(rawPayload, properties = {}) {
  let event;

  if (Buffer.isBuffer(rawPayload)) {
    try {
      event = JSON.parse(rawPayload.toString('utf-8'));
    } catch (err) {
      logger.error('Failed to parse order.created message payload as JSON', {
        error: err.message,
        payloadString: rawPayload.toString('utf-8').slice(0, 200),
      });
      throw new Error(`Malformed JSON in order.created event: ${err.message}`);
    }
  } else if (typeof rawPayload === 'string') {
    try {
      event = JSON.parse(rawPayload);
    } catch (err) {
      logger.error('Failed to parse order.created message string as JSON', {
        error: err.message,
        payloadString: rawPayload.slice(0, 200),
      });
      throw new Error(`Malformed JSON in order.created event: ${err.message}`);
    }
  } else if (rawPayload && typeof rawPayload === 'object') {
    event = rawPayload;
  } else {
    throw new Error('Invalid payload received: expected Buffer, string, or Object');
  }

  // Extract order identifier and user identifier
  const orderId = event.orderId || event.order_id || event.id;
  const userId = event.userId || event.user_id || event.customerId || event.customer_id;

  if (!orderId) {
    throw new Error('Event validation failed: missing orderId');
  }
  if (!userId) {
    throw new Error('Event validation failed: missing userId');
  }

  // Log the event details (simulating email notification)
  logger.info('Received order.created event details', {
    orderId,
    userId,
    event,
    headers: properties.headers || {},
  });

  // Execute email and webhook notifications
  const result = await notificationService.processOrderCreatedNotifications(event);

  logger.info(`Successfully completed notifications for order ${orderId}`, {
    orderId,
    userId,
  });

  return result;
}
