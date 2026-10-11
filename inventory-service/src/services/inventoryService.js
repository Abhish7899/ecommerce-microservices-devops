import { db } from '../db.js';
import { redis } from '../redis.js';
import { lockService } from './lockService.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class BadRequestError extends Error {
  constructor(message = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
  }
}

export class InventoryService {
  constructor(database = db, redisClient = redis, locker = lockService) {
    this.db = database;
    this.redis = redisClient;
    this.lockService = locker;
    this.cachePrefix = config.cache.keyPrefix || 'stock:';
    this.cacheTtl = config.cache.ttlSeconds || 60;
  }

  getCacheKey(productId) {
    return `${this.cachePrefix}${productId}`;
  }

  /**
   * Invalidate Redis cache for a product
   */
  async invalidateCache(productId) {
    try {
      const cacheKey = this.getCacheKey(productId);
      await this.redis.del(cacheKey);
      logger.debug(`Cache invalidated for product ${productId}`, { cacheKey });
    } catch (err) {
      logger.warn(`Failed to invalidate cache for product ${productId}`, { error: err.message });
    }
  }

  /**
   * List all products with stock counts and pagination
   * GET /inventory?page=1&limit=20
   */
  async listProducts({ page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Get total count
    const [countResult] = await this.db.query('SELECT COUNT(*) as total FROM products');
    const total = countResult[0]?.total || 0;

    // Get paginated products
    const [rows] = await this.db.query(
      `SELECT id, name, sku, price, stock, reserved, (stock - reserved) AS available, created_at, updated_at
       FROM products
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      [limitNum, offset]
    );

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      products: rows.map((p) => ({
        ...p,
        price: parseFloat(p.price),
        stock: parseInt(p.stock, 10),
        reserved: parseInt(p.reserved, 10),
        available: parseInt(p.available, 10),
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    };
  }

  /**
   * Get stock for a specific product, checking Redis cache first
   * GET /inventory/:productId
   */
  async getProductStock(productId) {
    const parsedId = parseInt(productId, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestError('Invalid product ID');
    }

    const cacheKey = this.getCacheKey(parsedId);

    // 1. Try reading from Redis cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for product stock ${parsedId}`);
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          cached: true,
        };
      }
    } catch (err) {
      logger.warn(`Redis cache get failed for product ${parsedId}`, { error: err.message });
    }

    // 2. Query MySQL
    const [rows] = await this.db.query(
      `SELECT id, name, sku, price, stock, reserved, (stock - reserved) AS available, created_at, updated_at
       FROM products
       WHERE id = ?`,
      [parsedId]
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundError(`Product with ID ${parsedId} not found`);
    }

    const rawProduct = rows[0];
    const product = {
      id: rawProduct.id,
      name: rawProduct.name,
      sku: rawProduct.sku,
      price: parseFloat(rawProduct.price),
      stock: parseInt(rawProduct.stock, 10),
      reserved: parseInt(rawProduct.reserved, 10),
      available: parseInt(rawProduct.available, 10),
      createdAt: rawProduct.created_at,
      updatedAt: rawProduct.updated_at,
    };

    // 3. Cache the product stock in Redis
    try {
      await this.redis.set(cacheKey, JSON.stringify(product), 'EX', this.cacheTtl);
      logger.debug(`Cached product stock for ${parsedId}`, { ttl: this.cacheTtl });
    } catch (err) {
      logger.warn(`Redis cache set failed for product ${parsedId}`, { error: err.message });
    }

    return {
      ...product,
      cached: false,
    };
  }

  /**
   * Update stock count using Redis distributed locking
   * PUT /inventory/:productId
   * Payload: { quantity: number, operation: 'set' | 'increment' | 'decrement' }
   */
  async updateStock(productId, { quantity, operation }) {
    const parsedId = parseInt(productId, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestError('Invalid product ID');
    }

    const numQuantity = parseInt(quantity, 10);
    if (Number.isNaN(numQuantity) || numQuantity < 0) {
      throw new BadRequestError('Quantity must be a non-negative number');
    }

    const validOps = ['set', 'increment', 'decrement'];
    if (!validOps.includes(operation)) {
      throw new BadRequestError(`Operation must be one of: ${validOps.join(', ')}`);
    }

    // Execute with distributed lock to prevent race conditions
    return await this.lockService.withLock(parsedId, async () => {
      // Fetch current stock from DB
      const [rows] = await this.db.query(
        'SELECT id, name, sku, price, stock, reserved FROM products WHERE id = ?',
        [parsedId]
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundError(`Product with ID ${parsedId} not found`);
      }

      const current = rows[0];
      const currentStock = parseInt(current.stock, 10);
      const currentReserved = parseInt(current.reserved, 10);

      let newStock;
      switch (operation) {
        case 'set':
          newStock = numQuantity;
          break;
        case 'increment':
          newStock = currentStock + numQuantity;
          break;
        case 'decrement':
          newStock = currentStock - numQuantity;
          break;
      }

      if (newStock < 0) {
        throw new BadRequestError(
          `Insufficient stock: operation '${operation}' would result in negative stock (${newStock})`
        );
      }

      if (newStock < currentReserved) {
        throw new BadRequestError(
          `Cannot reduce stock to ${newStock}: currently reserved stock is ${currentReserved}`
        );
      }

      // Update in MySQL
      await this.db.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, parsedId]);

      // Invalidate Redis cache
      await this.invalidateCache(parsedId);

      const available = newStock - currentReserved;
      logger.info(`Stock updated for product ${parsedId}`, {
        productId: parsedId,
        operation,
        quantity: numQuantity,
        previousStock: currentStock,
        newStock,
        reserved: currentReserved,
        available,
      });

      return {
        id: current.id,
        name: current.name,
        sku: current.sku,
        price: parseFloat(current.price),
        stock: newStock,
        reserved: currentReserved,
        available,
      };
    });
  }

  /**
   * Reserve stock for an order atomically across multiple products using Redis locks.
   * POST /inventory/reserve
   * Payload: { items: [{ productId, quantity }] }
   */
  async reserveStock(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Items must be a non-empty array');
    }

    // Consolidate duplicate products in the request
    const itemMap = new Map();
    for (const item of items) {
      const pId = parseInt(item.productId, 10);
      const qty = parseInt(item.quantity, 10);

      if (Number.isNaN(pId) || pId <= 0) {
        throw new BadRequestError(`Invalid productId: ${item.productId}`);
      }
      if (Number.isNaN(qty) || qty <= 0) {
        throw new BadRequestError(`Quantity for product ${pId} must be greater than 0`);
      }

      const existingQty = itemMap.get(pId) || 0;
      itemMap.set(pId, existingQty + qty);
    }

    const consolidatedItems = Array.from(itemMap.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    const productIds = consolidatedItems.map((i) => i.productId);

    // Acquire distributed locks for all products in sorted order to prevent deadlocks
    return await this.lockService.withMultipleLocks(productIds, async () => {
      const connection = await this.db.getConnection();
      try {
        await connection.beginTransaction();

        const reservations = [];

        for (const item of consolidatedItems) {
          const [rows] = await connection.query(
            'SELECT id, name, sku, price, stock, reserved FROM products WHERE id = ? FOR UPDATE',
            [item.productId]
          );

          if (!rows || rows.length === 0) {
            await connection.rollback();
            logger.warn(`Reserve failed: product ${item.productId} not found`);
            return {
              success: false,
              message: `Product with ID ${item.productId} not found`,
              failedProductId: item.productId,
            };
          }

          const product = rows[0];
          const currentStock = parseInt(product.stock, 10);
          const currentReserved = parseInt(product.reserved, 10);

          if (currentStock < item.quantity) {
            await connection.rollback();
            logger.warn(
              `Reserve failed: insufficient stock for product ${item.productId}. Requested: ${item.quantity}, Available: ${currentStock}`
            );
            return {
              success: false,
              message: `Insufficient stock for product '${product.name}' (ID: ${item.productId}). Requested: ${item.quantity}, In stock: ${currentStock}`,
              failedProductId: item.productId,
              requestedQuantity: item.quantity,
              availableStock: currentStock,
            };
          }

          // Atomically decrement stock and record in reserved
          const newStock = currentStock - item.quantity;
          const newReserved = currentReserved + item.quantity;

          await connection.query(
            'UPDATE products SET stock = ?, reserved = ? WHERE id = ?',
            [newStock, newReserved, item.productId]
          );

          reservations.push({
            productId: item.productId,
            name: product.name,
            sku: product.sku,
            reservedQuantity: item.quantity,
            remainingStock: newStock,
            totalReserved: newReserved,
          });
        }

        await connection.commit();

        // Invalidate cache for all affected products
        await Promise.all(productIds.map((id) => this.invalidateCache(id)));

        logger.info('Stock successfully reserved for order', {
          itemCount: consolidatedItems.length,
          reservations,
        });

        return {
          success: true,
          message: 'Stock successfully reserved',
          items: reservations,
        };
      } catch (err) {
        await connection.rollback();
        logger.error('Transaction failed during stock reservation', { error: err.message });
        throw err;
      } finally {
        connection.release();
      }
    });
  }

  /**
   * Seed sample products for development
   * POST /inventory/seed
   */
  async seedProducts() {
    const sampleProducts = [
      { name: 'Ultra HD 4K Monitor 27"', sku: 'MON-4K-27', price: 349.99, stock: 45, reserved: 0 },
      { name: 'Mechanical Gaming Keyboard', sku: 'KB-MECH-RGB', price: 119.50, stock: 120, reserved: 0 },
      { name: 'Ergonomic Wireless Mouse', sku: 'MOU-WL-ERG', price: 59.99, stock: 85, reserved: 0 },
      { name: 'Noise-Cancelling Headphones', sku: 'AUD-NC-BT', price: 199.95, stock: 60, reserved: 0 },
      { name: 'USB-C Docking Station 10-in-1', sku: 'ACC-DOCK-10', price: 89.00, stock: 150, reserved: 0 },
    ];

    const seeded = [];
    for (const item of sampleProducts) {
      const [existing] = await this.db.query('SELECT id FROM products WHERE sku = ?', [item.sku]);
      if (existing && existing.length > 0) {
        await this.db.query(
          'UPDATE products SET name = ?, price = ?, stock = ?, reserved = ? WHERE sku = ?',
          [item.name, item.price, item.stock, item.reserved, item.sku]
        );
        seeded.push({ id: existing[0].id, ...item, action: 'updated' });
        await this.invalidateCache(existing[0].id);
      } else {
        const [result] = await this.db.query(
          'INSERT INTO products (name, sku, price, stock, reserved) VALUES (?, ?, ?, ?, ?)',
          [item.name, item.sku, item.price, item.stock, item.reserved]
        );
        seeded.push({ id: result.insertId, ...item, action: 'created' });
      }
    }

    logger.info('Database seeded with sample products', { count: seeded.length });
    return {
      message: 'Sample inventory seeded successfully',
      count: seeded.length,
      products: seeded,
    };
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
