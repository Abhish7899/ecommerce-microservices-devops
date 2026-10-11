process.env.NODE_ENV = 'test';

import request from 'supertest';
import { app } from '../src/index.js';
import { setPool } from '../src/db.js';
import { setChannel } from '../src/services/eventPublisher.js';

describe('Order Service API', () => {
  let mockConnection;
  let mockPool;
  let mockChannel;

  beforeEach(() => {
    mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      release: jest.fn()
    };

    mockPool = {
      getConnection: jest.fn().mockResolvedValue(mockConnection),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined)
    };

    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockReturnValue(true),
      close: jest.fn().mockResolvedValue(undefined)
    };

    setPool(mockPool);
    setChannel(mockChannel);
  });

  describe('GET /healthz', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app).get('/healthz');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /orders', () => {
    const validItems = [
      { productId: 101, quantity: 2, price: 19.99 },
      { productId: 102, quantity: 1, price: 9.99 }
    ];

    it('should successfully create an order and publish order.created event', async () => {
      // Mock MySQL insert responses
      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 42 }]) // orders table insert
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // first item insert
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // second item insert

      const response = await request(app)
        .post('/orders')
        .set('x-user-id', '7')
        .set('traceparent', '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')
        .send({ items: validItems });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(42);
      expect(response.body.userId).toBe(7);
      expect(response.body.status).toBe('pending');
      expect(response.body.total).toBe(49.97); // (2 * 19.99) + (1 * 9.99)
      expect(response.body.items).toHaveLength(2);

      // Verify DB transaction
      expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(mockConnection.release).toHaveBeenCalledTimes(1);

      // Verify RabbitMQ publishing
      expect(mockChannel.publish).toHaveBeenCalledTimes(1);
      const [exchange, routingKey, buffer, options] = mockChannel.publish.mock.calls[0];
      expect(exchange).toBe('ecommerce.events');
      expect(routingKey).toBe('order.created');

      const publishedPayload = JSON.parse(buffer.toString());
      expect(publishedPayload.orderId).toBe(42);
      expect(publishedPayload.userId).toBe(7);
      expect(publishedPayload.total).toBe(49.97);
      expect(publishedPayload.items).toEqual(validItems);
      expect(publishedPayload.timestamp).toBeDefined();

      // Verify tracing headers propagation
      expect(response.headers['traceparent']).toBeDefined();
    });

    it('should return 400 when x-user-id header is missing', async () => {
      const response = await request(app)
        .post('/orders')
        .send({ items: validItems });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].path).toBe('x-user-id');
    });

    it('should return 400 when items array is empty', async () => {
      const response = await request(app)
        .post('/orders')
        .set('x-user-id', '7')
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when item quantity is invalid', async () => {
      const response = await request(app)
        .post('/orders')
        .set('x-user-id', '7')
        .send({
          items: [{ productId: 101, quantity: 0, price: 10 }]
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when item price is negative', async () => {
      const response = await request(app)
        .post('/orders')
        .set('x-user-id', '7')
        .send({
          items: [{ productId: 101, quantity: 1, price: -5 }]
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /orders', () => {
    it('should list orders for authenticated user with pagination', async () => {
      const mockCount = [{ total: 1 }];
      const mockOrders = [
        {
          id: 42,
          userId: 7,
          total: 49.97,
          status: 'pending',
          createdAt: '2026-10-27T10:00:00.000Z',
          updatedAt: '2026-10-27T10:00:00.000Z'
        }
      ];
      const mockItems = [
        { id: 1, orderId: 42, productId: 101, quantity: 2, price: 19.99 },
        { id: 2, orderId: 42, productId: 102, quantity: 1, price: 9.99 }
      ];

      mockPool.query
        .mockResolvedValueOnce([mockCount]) // count query
        .mockResolvedValueOnce([mockOrders]) // orders query
        .mockResolvedValueOnce([mockItems]); // order_items query

      const response = await request(app)
        .get('/orders?page=1&limit=10')
        .set('x-user-id', '7');

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0].id).toBe(42);
      expect(response.body.orders[0].items).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });
    });

    it('should return 400 if x-user-id header is missing', async () => {
      const response = await request(app).get('/orders');
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /orders/:id', () => {
    it('should get specific order for the owner', async () => {
      const mockOrder = [
        {
          id: 42,
          userId: 7,
          total: 49.97,
          status: 'pending',
          createdAt: '2026-10-27T10:00:00.000Z',
          updatedAt: '2026-10-27T10:00:00.000Z'
        }
      ];
      const mockItems = [
        { id: 1, productId: 101, quantity: 2, price: 19.99 }
      ];

      mockPool.query
        .mockResolvedValueOnce([mockOrder])
        .mockResolvedValueOnce([mockItems]);

      const response = await request(app)
        .get('/orders/42')
        .set('x-user-id', '7');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(42);
      expect(response.body.userId).toBe(7);
      expect(response.body.items).toHaveLength(1);
    });

    it('should return 404 when order is not found', async () => {
      mockPool.query.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .get('/orders/999')
        .set('x-user-id', '7');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 403 when order belongs to a different user', async () => {
      const mockOrder = [
        {
          id: 42,
          userId: 99, // Owned by user 99, but request has user 7
          total: 49.97,
          status: 'pending'
        }
      ];

      mockPool.query.mockResolvedValueOnce([mockOrder]);

      const response = await request(app)
        .get('/orders/42')
        .set('x-user-id', '7');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });
  });
});
