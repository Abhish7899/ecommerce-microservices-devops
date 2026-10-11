import Redis from 'ioredis';
import { config } from './config.js';
import { logger } from './utils/logger.js';

let redisClient = null;

/**
 * Creates and configures the Redis client singleton
 */
export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        logger.warn(`Redis connection retry attempt ${times}, delaying ${delay}ms`);
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        if (targetErrors.some((target) => err.message.includes(target))) {
          return true; // Reconnect
        }
        return false;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message, stack: err.stack });
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });
  }

  return redisClient;
}

/**
 * Connects to Redis with retry
 */
export async function initRedis(retries = 5, delayMs = 1000) {
  const client = getRedisClient();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (client.status === 'ready' || client.status === 'connecting' || client.status === 'connect') {
        await client.ping();
        logger.info('Redis ping verified');
        return client;
      }
      await client.connect();
      await client.ping();
      logger.info('Redis initialized successfully');
      return client;
    } catch (err) {
      logger.warn(`Redis init attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error('Could not connect to Redis after max retries', { error: err.message });
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return client;
}

/**
 * Gracefully close Redis client
 */
export async function closeRedis() {
  if (redisClient) {
    try {
      if (redisClient.status !== 'end') {
        await redisClient.quit();
        logger.info('Redis connection closed cleanly');
      }
    } catch (err) {
      logger.warn('Error during Redis quit, forcing disconnect', { error: err.message });
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
}

export const redis = getRedisClient();
export default redis;
