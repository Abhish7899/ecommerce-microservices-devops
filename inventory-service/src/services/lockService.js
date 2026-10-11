import crypto from 'crypto';
import { redis } from '../redis.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

// Lua script to release lock atomically only if token matches
const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export class LockAcquisitionError extends Error {
  constructor(message, productId) {
    super(message);
    this.name = 'LockAcquisitionError';
    this.productId = productId;
    this.statusCode = 409;
  }
}

export class LockService {
  constructor(redisClient = redis, customConfig = config.lock) {
    this.redis = redisClient;
    this.config = {
      keyPrefix: customConfig?.keyPrefix || 'lock:inventory:',
      ttlSeconds: customConfig?.ttlSeconds || 10,
      maxRetries: customConfig?.maxRetries || 5,
      retryDelayMs: customConfig?.retryDelayMs || 200,
    };
  }

  /**
   * Generates formatted lock key for a productId
   */
  getLockKey(productId) {
    return `${this.config.keyPrefix}${productId}`;
  }

  /**
   * Generates a unique lock token
   */
  generateToken() {
    return `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Acquires a distributed lock using Redis SETNX with TTL.
   * Retries up to maxRetries times with retryDelayMs delay.
   *
   * @param {string|number} productId
   * @param {number} ttlSeconds
   * @param {number} maxRetries
   * @param {number} retryDelayMs
   * @returns {Promise<string>} lockToken if acquired
   * @throws {LockAcquisitionError} if lock could not be acquired
   */
  async acquireLock(
    productId,
    ttlSeconds = this.config.ttlSeconds,
    maxRetries = this.config.maxRetries,
    retryDelayMs = this.config.retryDelayMs
  ) {
    const lockKey = this.getLockKey(productId);
    const lockToken = this.generateToken();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // SET key val EX ttl NX
      const result = await this.redis.set(lockKey, lockToken, 'EX', ttlSeconds, 'NX');

      if (result === 'OK') {
        logger.debug(`Lock acquired for product ${productId}`, { productId, lockKey, attempt });
        return lockToken;
      }

      logger.debug(
        `Failed to acquire lock for product ${productId} on attempt ${attempt}/${maxRetries}`
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    logger.warn(`Could not acquire lock for product ${productId} after ${maxRetries} attempts`);
    throw new LockAcquisitionError(
      `Could not acquire lock for product ${productId} after ${maxRetries} attempts`,
      productId
    );
  }

  /**
   * Releases the distributed lock atomically if the token matches.
   *
   * @param {string|number} productId
   * @param {string} lockToken
   * @returns {Promise<boolean>} true if released, false if expired or owned by someone else
   */
  async releaseLock(productId, lockToken) {
    if (!lockToken) return false;
    const lockKey = this.getLockKey(productId);
    try {
      const result = await this.redis.eval(RELEASE_LOCK_LUA, 1, lockKey, lockToken);
      const released = result === 1;
      if (released) {
        logger.debug(`Lock released for product ${productId}`, { productId, lockKey });
      } else {
        logger.warn(`Lock release failed or already expired for product ${productId}`, {
          productId,
          lockKey,
        });
      }
      return released;
    } catch (err) {
      logger.error(`Error releasing lock for product ${productId}`, {
        productId,
        lockKey,
        error: err.message,
      });
      return false;
    }
  }

  /**
   * Executes an async operation with a distributed lock on a single product.
   * Lock is guaranteed to be released in the finally block.
   *
   * @param {string|number} productId
   * @param {Function} asyncFn
   * @param {Object} options
   */
  async withLock(productId, asyncFn, options = {}) {
    const ttl = options.ttlSeconds || this.config.ttlSeconds;
    const maxRetries = options.maxRetries || this.config.maxRetries;
    const retryDelayMs = options.retryDelayMs || this.config.retryDelayMs;

    const lockToken = await this.acquireLock(productId, ttl, maxRetries, retryDelayMs);
    try {
      return await asyncFn();
    } finally {
      await this.releaseLock(productId, lockToken);
    }
  }

  /**
   * Executes an async operation acquiring locks on multiple products.
   * Sorts product IDs to prevent deadlocks across concurrent transactions.
   * Automatically releases all acquired locks in the finally block.
   *
   * @param {Array<string|number>} productIds
   * @param {Function} asyncFn
   * @param {Object} options
   */
  async withMultipleLocks(productIds, asyncFn, options = {}) {
    // Deduplicate and sort IDs numerically/lexicographically to prevent deadlocks
    const uniqueSortedIds = [...new Set(productIds)].sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return numA - numB;
      }
      return String(a).localeCompare(String(b));
    });

    const acquiredLocks = [];

    try {
      for (const productId of uniqueSortedIds) {
        const lockToken = await this.acquireLock(
          productId,
          options.ttlSeconds,
          options.maxRetries,
          options.retryDelayMs
        );
        acquiredLocks.push({ productId, lockToken });
      }

      return await asyncFn();
    } finally {
      // Release all acquired locks in reverse order
      for (let i = acquiredLocks.length - 1; i >= 0; i--) {
        const { productId, lockToken } = acquiredLocks[i];
        await this.releaseLock(productId, lockToken);
      }
    }
  }
}

export const lockService = new LockService();
export default lockService;
