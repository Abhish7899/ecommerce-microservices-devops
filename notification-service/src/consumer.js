import amqp from 'amqplib';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { handleOrderCreated } from './handlers/orderCreatedHandler.js';
import { extractTraceContext, injectTraceContext } from './middleware/tracing.js';
import { context } from '@opentelemetry/api';

export class RabbitMQConsumer {
  constructor(customConfig = {}) {
    this.config = { ...config.rabbitmq, ...customConfig };
    this.connection = null;
    this.channel = null;
    this.status = 'disconnected';
    this.consumerTag = null;
    this.isShuttingDown = false;
  }

  /**
   * Returns current connection status.
   * @returns {string} 'connected' | 'connecting' | 'disconnected' | 'closed'
   */
  getStatus() {
    return this.status;
  }

  /**
   * Returns whether RabbitMQ connection and channel are open and ready.
   * @returns {boolean}
   */
  isConnected() {
    return this.status === 'connected' && !!this.channel && !this.isShuttingDown;
  }

  /**
   * Connects to RabbitMQ and initializes exchanges, queues, and bindings.
   * @param {Object} [amqpLib=amqp] Optional injected amqplib for testing
   */
  async connect(amqpLib = amqp) {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.status = 'connecting';
    this.isShuttingDown = false;

    try {
      logger.info('Connecting to RabbitMQ...', { url: this.config.url.replace(/:[^:]*@/, ':***@') });
      this.connection = await amqpLib.connect(this.config.url);
      this.status = 'connected';

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
      });

      this.connection.on('close', () => {
        if (!this.isShuttingDown) {
          logger.warn('RabbitMQ connection closed unexpectedly');
          this.status = 'disconnected';
          this.channel = null;
        }
      });

      this.channel = await this.connection.createChannel();

      this.channel.on('error', (err) => {
        logger.error('RabbitMQ channel error', { error: err.message });
      });

      this.channel.on('close', () => {
        if (!this.isShuttingDown) {
          logger.warn('RabbitMQ channel closed');
        }
      });

      await this.setupTopology();
      logger.info('RabbitMQ connection and topology established successfully');
    } catch (err) {
      this.status = 'disconnected';
      logger.error('Failed to connect to RabbitMQ', { error: err.message });
      throw err;
    }
  }

  /**
   * Declares exchanges, queues, DLX, DLQ, and their bindings.
   */
  async setupTopology() {
    const { exchange, exchangeType, queue, routingKey, dlx, dlq, prefetch } = this.config;

    // 1. Declare Dead Letter Exchange (DLX)
    await this.channel.assertExchange(dlx, 'topic', { durable: true });

    // 2. Declare Dead Letter Queue (DLQ) and bind to DLX
    await this.channel.assertQueue(dlq, { durable: true });
    await this.channel.bindQueue(dlq, dlx, '#');
    await this.channel.bindQueue(dlq, dlx, routingKey);

    // 3. Declare Main Topic Exchange
    await this.channel.assertExchange(exchange, exchangeType, { durable: true });

    // 4. Declare Main Queue with dead-letter configuration
    await this.channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': dlx,
        'x-dead-letter-routing-key': routingKey,
      },
    });

    // 5. Bind Main Queue to Main Exchange with routing key 'order.created'
    await this.channel.bindQueue(queue, exchange, routingKey);

    // 6. Set Prefetch
    await this.channel.prefetch(prefetch);
  }

  /**
   * Starts consuming messages from the notification.order.created queue.
   */
  async startConsuming() {
    if (!this.channel) {
      throw new Error('Cannot start consuming: channel is not initialized');
    }

    const { queue } = this.config;
    logger.info(`Starting consumer for queue: ${queue}`);

    const { consumerTag } = await this.channel.consume(
      queue,
      async (msg) => {
        if (!msg) {
          return;
        }
        await this.processMessage(msg);
      },
      { noAck: false }
    );

    this.consumerTag = consumerTag;
    logger.info(`Consumer started with consumer tag: ${consumerTag}`);
  }

  /**
   * Processes a single RabbitMQ message with OpenTelemetry context propagation,
   * retry tracking, and dead-letter routing.
   * @param {Object} msg amqplib message object
   */
  async processMessage(msg) {
    const headers = msg.properties.headers || {};
    const traceCtx = extractTraceContext(headers);

    await context.with(traceCtx, async () => {
      try {
        await handleOrderCreated(msg.content, msg.properties);
        // Acknowledge the message upon successful processing
        this.channel.ack(msg);
      } catch (err) {
        await this.handleProcessingFailure(msg, err);
      }
    });
  }

  /**
   * Handles message processing failure with retry counter and DLQ forwarding.
   * @param {Object} msg amqplib message object
   * @param {Error} err failure error
   */
  async handleProcessingFailure(msg, err) {
    const headers = msg.properties.headers || {};
    const currentRetries = parseInt(headers['x-retry-count'] || '0', 10);
    const { exchange, routingKey, dlx, maxRetries } = this.config;
    const effectiveRoutingKey = msg.fields.routingKey || routingKey;

    if (currentRetries < maxRetries) {
      const nextRetry = currentRetries + 1;
      logger.warn(`Message processing failed. Retrying (${nextRetry}/${maxRetries})`, {
        error: err.message,
        retryCount: nextRetry,
        routingKey: effectiveRoutingKey,
      });

      const updatedHeaders = injectTraceContext({
        ...headers,
        'x-retry-count': nextRetry,
        'x-last-error': err.message,
        'x-last-failed-at': new Date().toISOString(),
      });

      // Republish to exchange with incremented retry count
      this.channel.publish(exchange, effectiveRoutingKey, msg.content, {
        ...msg.properties,
        headers: updatedHeaders,
        persistent: true,
      });

      // Acknowledge the original message
      this.channel.ack(msg);
    } else {
      logger.error(`Message exceeded max retries (${maxRetries}). Sending to DLQ: ${this.config.dlq}`, {
        error: err.message,
        retryCount: currentRetries,
        routingKey: effectiveRoutingKey,
      });

      const dlqHeaders = injectTraceContext({
        ...headers,
        'x-retry-count': currentRetries,
        'x-death-reason': err.message,
        'x-dead-lettered-at': new Date().toISOString(),
      });

      // Publish directly to DLX
      this.channel.publish(dlx, effectiveRoutingKey, msg.content, {
        ...msg.properties,
        headers: dlqHeaders,
        persistent: true,
      });

      // Acknowledge the original message
      this.channel.ack(msg);
    }
  }

  /**
   * Gracefully closes the consumer channel and connection.
   */
  async close() {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;
    this.status = 'closed';

    logger.info('Closing RabbitMQ consumer...');

    try {
      if (this.channel) {
        if (this.consumerTag) {
          try {
            await this.channel.cancel(this.consumerTag);
          } catch (cancelErr) {
            logger.warn('Failed to cancel consumer tag during shutdown', { error: cancelErr.message });
          }
        }
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      logger.info('RabbitMQ connection closed cleanly');
    } catch (err) {
      logger.error('Error during RabbitMQ shutdown', { error: err.message });
    }
  }
}

export const consumer = new RabbitMQConsumer();
