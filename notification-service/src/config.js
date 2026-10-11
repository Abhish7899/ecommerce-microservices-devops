export const config = {
  serviceName: 'notification-service',
  nodeEnv: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT || '3004', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
    exchange: process.env.EXCHANGE_NAME || 'ecommerce.events',
    exchangeType: 'topic',
    queue: process.env.QUEUE_NAME || 'notification.order.created',
    routingKey: process.env.ROUTING_KEY || 'order.created',
    dlx: process.env.DLX_NAME || 'ecommerce.dlx',
    dlq: process.env.DLQ_NAME || 'notification.order.created.dlq',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    prefetch: parseInt(process.env.PREFETCH_COUNT || '10', 10),
    reconnectIntervalMs: parseInt(process.env.RECONNECT_INTERVAL_MS || '5000', 10),
  },
};
