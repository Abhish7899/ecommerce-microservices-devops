import { logger } from '../utils/logger.js';

export class NotificationService {
  /**
   * Simulates sending an order confirmation email to the user.
   * Logs: 'Sending order confirmation email to user {userId} for order {orderId}'
   * @param {Object} params
   * @param {string|number} params.userId
   * @param {string|number} params.orderId
   * @param {Object} [params.details]
   * @returns {Promise<{ success: boolean, messageId: string, type: 'email' }>}
   */
  async sendOrderConfirmationEmail({ userId, orderId, ...details }) {
    if (!userId) {
      throw new Error('User ID is required to send order confirmation email');
    }
    if (!orderId) {
      throw new Error('Order ID is required to send order confirmation email');
    }

    logger.info(`Sending order confirmation email to user ${userId} for order ${orderId}`, {
      orderId,
      userId,
      details,
    });

    return {
      success: true,
      messageId: `email-${orderId}-${Date.now()}`,
      type: 'email',
    };
  }

  /**
   * Simulates sending a webhook notification for the created order.
   * Logs: 'Sending webhook notification for order {orderId}'
   * @param {Object} params
   * @param {string|number} params.orderId
   * @param {Object} [params.details]
   * @returns {Promise<{ success: boolean, webhookId: string, type: 'webhook' }>}
   */
  async sendOrderWebhookNotification({ orderId, ...details }) {
    if (!orderId) {
      throw new Error('Order ID is required to send webhook notification');
    }

    logger.info(`Sending webhook notification for order ${orderId}`, {
      orderId,
      details,
    });

    return {
      success: true,
      webhookId: `wh-${orderId}-${Date.now()}`,
      type: 'webhook',
    };
  }

  /**
   * Orchestrates both email and webhook notifications for an order created event.
   * @param {Object} orderData
   * @returns {Promise<{ emailResult: Object, webhookResult: Object }>}
   */
  async processOrderCreatedNotifications(orderData) {
    const orderId = orderData.orderId || orderData.order_id || orderData.id;
    const userId = orderData.userId || orderData.user_id || orderData.customerId || orderData.customer_id;

    if (!orderId) {
      throw new Error('Missing orderId in order.created payload');
    }
    if (!userId) {
      throw new Error('Missing userId in order.created payload');
    }

    logger.info(`Processing order.created notification event for order ${orderId}`, {
      orderId,
      userId,
      eventDetails: orderData,
    });

    const emailResult = await this.sendOrderConfirmationEmail({
      userId,
      orderId,
      items: orderData.items,
      totalAmount: orderData.totalAmount || orderData.total,
    });

    const webhookResult = await this.sendOrderWebhookNotification({
      orderId,
      status: orderData.status || 'created',
      timestamp: orderData.createdAt || orderData.timestamp || new Date().toISOString(),
    });

    return {
      emailResult,
      webhookResult,
    };
  }
}

export const notificationService = new NotificationService();
