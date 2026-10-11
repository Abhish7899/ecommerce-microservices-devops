import { getPool } from '../db.js';
import { publishOrderCreated } from './eventPublisher.js';
import logger from '../utils/logger.js';

export const createOrder = async (userId, items, traceContext = {}) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  // Calculate order total
  const calculatedTotal = items.reduce((sum, item) => {
    return sum + (Number(item.price) * Number(item.quantity));
  }, 0);
  const total = parseFloat(calculatedTotal.toFixed(2));

  let orderId = null;

  try {
    await connection.beginTransaction();

    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
      [userId, total, 'pending']
    );
    orderId = orderResult.insertId;

    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.productId, item.quantity, parseFloat(Number(item.price).toFixed(2))]
      );
    }

    await connection.commit();
    logger.info(`Order ${orderId} created successfully for user ${userId} with total ${total}`);
  } catch (err) {
    await connection.rollback();
    logger.error(`Failed to create order in database for user ${userId}: ${err.message}`);
    throw err;
  } finally {
    connection.release();
  }

  // Publish event to RabbitMQ
  const eventPayload = {
    orderId,
    userId,
    items,
    total,
    timestamp: new Date().toISOString()
  };

  try {
    await publishOrderCreated(eventPayload, traceContext);
  } catch (pubErr) {
    logger.error(`Order ${orderId} saved to database, but RabbitMQ publish failed: ${pubErr.message}`);
  }

  return {
    id: orderId,
    userId,
    total,
    status: 'pending',
    items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const listOrders = async (userId, page = 1, limit = 10) => {
  const pool = getPool();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const offset = (pageNum - 1) * limitNum;

  // Total count
  const [countResult] = await pool.query(
    'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
    [userId]
  );
  const total = countResult[0]?.total || 0;

  // Retrieve paginated orders
  const [orderRows] = await pool.query(
    'SELECT id, user_id as userId, total, status, created_at as createdAt, updated_at as updatedAt FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, limitNum, offset]
  );

  if (orderRows.length === 0) {
    return {
      orders: [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        totalPages: Math.ceil(total / limitNum) || 1
      }
    };
  }

  // Retrieve order items for the retrieved orders
  const orderIds = orderRows.map((o) => o.id);
  const [itemRows] = await pool.query(
    'SELECT id, order_id as orderId, product_id as productId, quantity, price FROM order_items WHERE order_id IN (?)',
    [orderIds]
  );

  const itemsMap = new Map();
  for (const item of itemRows) {
    if (!itemsMap.has(item.orderId)) {
      itemsMap.set(item.orderId, []);
    }
    itemsMap.get(item.orderId).push({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      price: parseFloat(item.price)
    });
  }

  const orders = orderRows.map((o) => ({
    id: o.id,
    userId: o.userId,
    total: parseFloat(o.total),
    status: o.status,
    items: itemsMap.get(o.id) || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  }));

  return {
    orders,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: Number(total),
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
};

export const getOrderById = async (orderId, userId) => {
  const pool = getPool();
  const [orderRows] = await pool.query(
    'SELECT id, user_id as userId, total, status, created_at as createdAt, updated_at as updatedAt FROM orders WHERE id = ?',
    [orderId]
  );

  if (!orderRows || orderRows.length === 0) {
    const error = new Error(`Order ${orderId} not found`);
    error.statusCode = 404;
    throw error;
  }

  const order = orderRows[0];
  if (Number(order.userId) !== Number(userId)) {
    const error = new Error('Access denied to this order');
    error.statusCode = 403;
    throw error;
  }

  const [itemRows] = await pool.query(
    'SELECT id, product_id as productId, quantity, price FROM order_items WHERE order_id = ?',
    [orderId]
  );

  return {
    id: order.id,
    userId: order.userId,
    total: parseFloat(order.total),
    status: order.status,
    items: itemRows.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      price: parseFloat(i.price)
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
};

export default {
  createOrder,
  listOrders,
  getOrderById
};
