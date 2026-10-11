import { Router } from 'express';
import { body, header, param, query, validationResult } from 'express-validator';
import orderService from '../services/orderService.js';
import logger from '../utils/logger.js';

const router = Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`Validation failed for ${req.method} ${req.originalUrl}: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * POST /orders - Create a new order
 */
router.post(
  '/',
  [
    header('x-user-id')
      .trim()
      .notEmpty()
      .withMessage('x-user-id header is required')
      .isInt({ min: 1 })
      .withMessage('x-user-id must be a positive integer'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('items must be a non-empty array'),
    body('items.*.productId')
      .isInt({ min: 1 })
      .withMessage('productId must be a positive integer'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('quantity must be a positive integer'),
    body('items.*.price')
      .isFloat({ min: 0 })
      .withMessage('price must be a non-negative number'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      const userId = parseInt(req.headers['x-user-id'], 10);
      const { items } = req.body;

      const traceHeaders = {
        traceparent: req.traceparent,
        tracestate: req.tracestate
      };

      const order = await orderService.createOrder(userId, items, traceHeaders);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /orders - List orders for the authenticated user
 */
router.get(
  '/',
  [
    header('x-user-id')
      .trim()
      .notEmpty()
      .withMessage('x-user-id header is required')
      .isInt({ min: 1 })
      .withMessage('x-user-id must be a positive integer'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      const userId = parseInt(req.headers['x-user-id'], 10);
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '10', 10);

      const result = await orderService.listOrders(userId, page, limit);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /orders/:id - Get a specific order
 */
router.get(
  '/:id',
  [
    header('x-user-id')
      .trim()
      .notEmpty()
      .withMessage('x-user-id header is required')
      .isInt({ min: 1 })
      .withMessage('x-user-id must be a positive integer'),
    param('id')
      .isInt({ min: 1 })
      .withMessage('id must be a positive integer'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      const userId = parseInt(req.headers['x-user-id'], 10);
      const orderId = parseInt(req.params.id, 10);

      const order = await orderService.getOrderById(orderId, userId);
      res.status(200).json(order);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
