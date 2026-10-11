import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/index.js';
import { inventoryService, InventoryService } from '../src/services/inventoryService.js';
import { LockService } from '../src/services/lockService.js';

describe('Inventory Service API & Business Logic', () => {
  describe('GET /healthz', () => {
    it('should return 200 with status ok and W3C traceparent header', async () => {
      const res = await request(app)
        .get('/healthz')
        .set('traceparent', '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
      expect(res.headers).toHaveProperty('traceparent');
      expect(res.headers.traceparent).toContain('4bf92f3577b34da6a3ce929d0e0e4736');
    });
  });

  describe('InventoryService Unit Logic', () => {
    let mockDb;
    let mockRedis;
    let mockLockService;
    let service;

    beforeEach(() => {
      mockDb = {
        query: jest.fn(),
        getConnection: jest.fn(),
      };
      mockRedis = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      };
      mockLockService = {
        withLock: jest.fn((id, fn) => fn()),
        withMultipleLocks: jest.fn((ids, fn) => fn()),
      };

      service = new InventoryService(mockDb, mockRedis, mockLockService);
    });

    describe('listProducts', () => {
      it('should return paginated products from database', async () => {
        mockDb.query
          .mockResolvedValueOnce([[{ total: 1 }]]) // count query
          .mockResolvedValueOnce([
            [
              {
                id: 1,
                name: 'Laptop Pro',
                sku: 'LAP-001',
                price: '1299.99',
                stock: 25,
                reserved: 5,
                available: 20,
                created_at: '2026-01-01',
                updated_at: '2026-01-01',
              },
            ],
          ]);

        const result = await service.listProducts({ page: 1, limit: 10 });

        expect(result.pagination.total).toBe(1);
        expect(result.pagination.page).toBe(1);
        expect(result.products).toHaveLength(1);
        expect(result.products[0].price).toBe(1299.99);
        expect(result.products[0].available).toBe(20);
      });
    });

    describe('getProductStock', () => {
      it('should return cached product if found in Redis', async () => {
        const cachedProduct = {
          id: 42,
          name: 'Mechanical Keyboard',
          sku: 'KB-042',
          price: 99.99,
          stock: 50,
          reserved: 0,
          available: 50,
        };
        mockRedis.get.mockResolvedValue(JSON.stringify(cachedProduct));

        const result = await service.getProductStock(42);

        expect(result.id).toBe(42);
        expect(result.cached).toBe(true);
        expect(mockDb.query).not.toHaveBeenCalled();
      });

      it('should query DB and cache stock on Redis cache miss', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockDb.query.mockResolvedValueOnce([
          [
            {
              id: 42,
              name: 'Mechanical Keyboard',
              sku: 'KB-042',
              price: '99.99',
              stock: 50,
              reserved: 5,
              available: 45,
            },
          ],
        ]);

        const result = await service.getProductStock(42);

        expect(result.id).toBe(42);
        expect(result.cached).toBe(false);
        expect(result.available).toBe(45);
        expect(mockRedis.set).toHaveBeenCalledWith(
          'stock:42',
          expect.any(String),
          'EX',
          60
        );
      });

      it('should throw NotFoundError if product does not exist in DB', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockDb.query.mockResolvedValueOnce([[]]);

        await expect(service.getProductStock(999)).rejects.toThrow(
          'Product with ID 999 not found'
        );
      });
    });

    describe('updateStock', () => {
      it('should increment stock count and invalidate cache under distributed lock', async () => {
        mockDb.query
          .mockResolvedValueOnce([
            [{ id: 1, name: 'Item', sku: 'SKU1', price: '10.00', stock: 20, reserved: 2 }],
          ]) // SELECT
          .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE

        const result = await service.updateStock(1, { quantity: 10, operation: 'increment' });

        expect(mockLockService.withLock).toHaveBeenCalledWith(1, expect.any(Function));
        expect(mockDb.query).toHaveBeenCalledWith(
          'UPDATE products SET stock = ? WHERE id = ?',
          [30, 1]
        );
        expect(mockRedis.del).toHaveBeenCalledWith('stock:1');
        expect(result.stock).toBe(30);
      });

      it('should decrement stock count and reject if insufficient stock', async () => {
        mockDb.query.mockResolvedValueOnce([
          [{ id: 1, name: 'Item', sku: 'SKU1', price: '10.00', stock: 5, reserved: 0 }],
        ]);

        await expect(
          service.updateStock(1, { quantity: 10, operation: 'decrement' })
        ).rejects.toThrow(/Insufficient stock/);
      });

      it('should reject if new stock is less than reserved stock', async () => {
        mockDb.query.mockResolvedValueOnce([
          [{ id: 1, name: 'Item', sku: 'SKU1', price: '10.00', stock: 15, reserved: 10 }],
        ]);

        await expect(
          service.updateStock(1, { quantity: 5, operation: 'set' })
        ).rejects.toThrow(/currently reserved stock is 10/);
      });
    });

    describe('reserveStock', () => {
      let mockConnection;

      beforeEach(() => {
        mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn(),
          query: jest.fn(),
        };
        mockDb.getConnection.mockResolvedValue(mockConnection);
      });

      it('should atomically reserve stock across multiple products', async () => {
        mockConnection.query
          // Product 1 SELECT
          .mockResolvedValueOnce([
            [{ id: 1, name: 'Item 1', sku: 'SKU-1', price: '20.00', stock: 10, reserved: 0 }],
          ])
          // Product 1 UPDATE
          .mockResolvedValueOnce([{ affectedRows: 1 }])
          // Product 2 SELECT
          .mockResolvedValueOnce([
            [{ id: 2, name: 'Item 2', sku: 'SKU-2', price: '30.00', stock: 5, reserved: 0 }],
          ])
          // Product 2 UPDATE
          .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const items = [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 3 },
        ];

        const result = await service.reserveStock(items);

        expect(result.success).toBe(true);
        expect(result.items).toHaveLength(2);
        expect(mockConnection.beginTransaction).toHaveBeenCalled();
        expect(mockConnection.commit).toHaveBeenCalled();
        expect(mockConnection.release).toHaveBeenCalled();
        expect(mockRedis.del).toHaveBeenCalledWith('stock:1');
        expect(mockRedis.del).toHaveBeenCalledWith('stock:2');
      });

      it('should rollback transaction and return failure if any item has insufficient stock', async () => {
        mockConnection.query.mockResolvedValueOnce([
          [{ id: 1, name: 'Item 1', sku: 'SKU-1', price: '20.00', stock: 2, reserved: 0 }],
        ]);

        const items = [{ productId: 1, quantity: 5 }];

        const result = await service.reserveStock(items);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Insufficient stock');
        expect(mockConnection.rollback).toHaveBeenCalled();
        expect(mockConnection.commit).not.toHaveBeenCalled();
        expect(mockConnection.release).toHaveBeenCalled();
      });
    });

    describe('seedProducts', () => {
      it('should insert sample products when database is empty', async () => {
        // Mock sku checks returning empty
        mockDb.query
          .mockResolvedValueOnce([[]])
          .mockResolvedValueOnce([{ insertId: 1 }])
          .mockResolvedValueOnce([[]])
          .mockResolvedValueOnce([{ insertId: 2 }])
          .mockResolvedValueOnce([[]])
          .mockResolvedValueOnce([{ insertId: 3 }])
          .mockResolvedValueOnce([[]])
          .mockResolvedValueOnce([{ insertId: 4 }])
          .mockResolvedValueOnce([[]])
          .mockResolvedValueOnce([{ insertId: 5 }]);

        const result = await service.seedProducts();

        expect(result.count).toBe(5);
        expect(result.products).toHaveLength(5);
      });
    });
  });

  describe('HTTP Route Endpoints with express-validator', () => {
    describe('GET /inventory', () => {
      it('should call inventoryService.listProducts and return json', async () => {
        const spy = jest
          .spyOn(inventoryService, 'listProducts')
          .mockResolvedValueOnce({
            products: [{ id: 1, name: 'Sample', stock: 10 }],
            pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
          });

        const res = await request(app).get('/inventory?page=1&limit=20');

        expect(res.status).toBe(200);
        expect(res.body.products).toHaveLength(1);
        expect(spy).toHaveBeenCalledWith({ page: 1, limit: 20 });
        spy.mockRestore();
      });

      it('should return 400 if pagination parameters are invalid', async () => {
        const res = await request(app).get('/inventory?page=invalid&limit=-5');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
      });
    });

    describe('GET /inventory/:productId', () => {
      it('should return product details when found', async () => {
        const spy = jest
          .spyOn(inventoryService, 'getProductStock')
          .mockResolvedValueOnce({ id: 10, name: 'Phone', stock: 15, available: 15 });

        const res = await request(app).get('/inventory/10');

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(10);
        spy.mockRestore();
      });

      it('should return 400 for non-numeric productId', async () => {
        const res = await request(app).get('/inventory/abc');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
      });
    });

    describe('PUT /inventory/:productId', () => {
      it('should update stock count with valid payload', async () => {
        const spy = jest
          .spyOn(inventoryService, 'updateStock')
          .mockResolvedValueOnce({ id: 5, stock: 40 });

        const res = await request(app)
          .put('/inventory/5')
          .send({ quantity: 10, operation: 'increment' });

        expect(res.status).toBe(200);
        expect(res.body.product.stock).toBe(40);
        expect(spy).toHaveBeenCalledWith('5', { quantity: 10, operation: 'increment' });
        spy.mockRestore();
      });

      it('should return 400 if operation is invalid', async () => {
        const res = await request(app)
          .put('/inventory/5')
          .send({ quantity: 10, operation: 'multiply' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
      });
    });

    describe('POST /inventory/reserve', () => {
      it('should return 200 on successful reservation', async () => {
        const spy = jest
          .spyOn(inventoryService, 'reserveStock')
          .mockResolvedValueOnce({
            success: true,
            message: 'Stock successfully reserved',
            items: [{ productId: 1, reservedQuantity: 2 }],
          });

        const res = await request(app)
          .post('/inventory/reserve')
          .send({ items: [{ productId: 1, quantity: 2 }] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        spy.mockRestore();
      });

      it('should return 409 if reservation fails due to insufficient stock', async () => {
        const spy = jest
          .spyOn(inventoryService, 'reserveStock')
          .mockResolvedValueOnce({
            success: false,
            message: 'Insufficient stock',
          });

        const res = await request(app)
          .post('/inventory/reserve')
          .send({ items: [{ productId: 1, quantity: 50 }] });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        spy.mockRestore();
      });

      it('should return 400 if items array is empty or missing', async () => {
        const res = await request(app)
          .post('/inventory/reserve')
          .send({ items: [] });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
      });
    });

    describe('POST /inventory/seed', () => {
      it('should seed products and return 201', async () => {
        const spy = jest
          .spyOn(inventoryService, 'seedProducts')
          .mockResolvedValueOnce({
            message: 'Sample inventory seeded successfully',
            count: 5,
            products: [],
          });

        const res = await request(app).post('/inventory/seed');

        expect(res.status).toBe(201);
        expect(res.body.count).toBe(5);
        spy.mockRestore();
      });
    });
  });
});
