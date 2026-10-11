import { Router } from 'express';
import { query, param, body, validationResult } from 'express-validator';
import { inventoryService } from '../services/inventoryService.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * Middleware to handle express-validator validation results
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.path || e.param,
        message: e.msg,
        value: e.value,
      })),
    });
  }
  next();
}

/**
 * GET /inventory
 * List all products with stock counts. Supports ?page=1&limit=20.
 */
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be a positive integer greater than or equal to 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be an integer between 1 and 100'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await inventoryService.listProducts({ page, limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /inventory/seed
 * Seed initial inventory data for development.
 * Note: Placed before /:productId to prevent route matching collisions.
 */
router.post('/seed', async (req, res, next) => {
  try {
    const result = await inventoryService.seedProducts();
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /inventory/reserve
 * Reserve stock for an order atomically using Redis distributed locks.
 * Expects: { items: [{ productId, quantity }] }
 */
router.post(
  '/reserve',
  [
    body('items')
      .isArray({ min: 1 })
      .withMessage('items must be a non-empty array'),
    body('items.*.productId')
      .isInt({ min: 1 })
      .withMessage('Each item must include a valid positive productId'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Each item quantity must be an integer greater than 0'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await inventoryService.reserveStock(req.body.items);
      if (!result.success) {
        return res.status(409).json(result);
      }
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /inventory/:productId
 * Get stock for a specific product.
 */
router.get(
  '/:productId',
  [
    param('productId')
      .isInt({ min: 1 })
      .withMessage('productId must be a positive integer'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const product = await inventoryService.getProductStock(productId);
      res.json(product);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /inventory/:productId
 * Update stock count.
 * Expects: { quantity: number, operation: 'set' | 'increment' | 'decrement' }
 */
router.put(
  '/:productId',
  [
    param('productId')
      .isInt({ min: 1 })
      .withMessage('productId must be a positive integer'),
    body('quantity')
      .isInt({ min: 0 })
      .withMessage('quantity must be a non-negative integer'),
    body('operation')
      .isIn(['set', 'increment', 'decrement'])
      .withMessage("operation must be 'set', 'increment', or 'decrement'"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { productId } = req.params;
      const { quantity, operation } = req.body;
      const updated = await inventoryService.updateStock(productId, {
        quantity,
        operation,
      });
      res.json({
        message: 'Stock updated successfully',
        product: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
