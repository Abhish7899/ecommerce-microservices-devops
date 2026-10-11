import dotenv from 'dotenv';

dotenv.config();

export const config = {
  serviceName: 'inventory-service',
  port: parseInt(process.env.PORT, 10) || 3003,
  nodeEnv: process.env.NODE_ENV || 'production',
  logLevel: process.env.LOG_LEVEL || 'info',

  mysql: {
    host: process.env.MYSQL_HOST || 'mysql',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'rootpassword',
    database: process.env.MYSQL_DATABASE || 'ecommerce',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
  },

  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
    inventoryQueue: process.env.INVENTORY_QUEUE || 'inventory_reserve',
  },

  lock: {
    keyPrefix: 'lock:inventory:',
    ttlSeconds: 10,
    maxRetries: 5,
    retryDelayMs: 200,
  },

  cache: {
    keyPrefix: 'stock:',
    ttlSeconds: 60,
  },
};
