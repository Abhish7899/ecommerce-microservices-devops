import amqp from 'amqplib';
import config from '../config.js';
import logger from '../utils/logger.js';

let connection = null;
let channel = null;

export const setChannel = (mockChannel) => {
  channel = mockChannel;
};

export const setConnection = (mockConnection) => {
  connection = mockConnection;
};

export const getChannel = () => channel;
export const getConnection = () => connection;

export const connectRabbitMQ = async (maxRetries = 10, retryDelayMs = 3000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      logger.info(`Connecting to RabbitMQ at ${config.RABBITMQ_URL} (attempt ${attempt}/${maxRetries})...`);
      connection = await amqp.connect(config.RABBITMQ_URL);
      channel = await connection.createChannel();

      // Assert topic exchange
      await channel.assertExchange(config.RABBITMQ_EXCHANGE, 'topic', {
        durable: true
      });

      connection.on('error', (err) => {
        logger.error(`RabbitMQ connection error: ${err.message}`);
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        channel = null;
        connection = null;
      });

      logger.info(`Connected to RabbitMQ and topic exchange '${config.RABBITMQ_EXCHANGE}' asserted`);
      return { connection, channel };
    } catch (err) {
      logger.warn(`RabbitMQ connection attempt ${attempt} failed: ${err.message}`);
      if (attempt >= maxRetries) {
        logger.error(`Exceeded maximum retries (${maxRetries}) connecting to RabbitMQ`);
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

export const publishOrderCreated = async (orderPayload, headers = {}) => {
  if (!channel) {
    throw new Error('RabbitMQ channel is not available to publish order.created event');
  }

  const routingKey = 'order.created';
  const content = Buffer.from(JSON.stringify(orderPayload));

  const published = channel.publish(config.RABBITMQ_EXCHANGE, routingKey, content, {
    persistent: true,
    contentType: 'application/json',
    headers: headers || {}
  });

  if (!published) {
    logger.warn(`Failed to buffer message for exchange ${config.RABBITMQ_EXCHANGE} with key ${routingKey}`);
  } else {
    logger.info(`Published ${routingKey} event for order ID ${orderPayload.orderId}`);
  }

  return published;
};

export const closeRabbitMQ = async () => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('RabbitMQ connection and channel closed');
  } catch (err) {
    logger.error(`Error closing RabbitMQ: ${err.message}`);
  }
};

export default {
  connectRabbitMQ,
  publishOrderCreated,
  closeRabbitMQ,
  setChannel,
  setConnection,
  getChannel,
  getConnection
};
