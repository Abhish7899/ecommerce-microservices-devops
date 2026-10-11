import request from 'supertest';
import { app } from '../src/index.js';

describe('API Gateway Core Routes & Middleware', () => {
  describe('GET /healthz', () => {
    test('should return 200 and { status: "ok" }', async () => {
      const response = await request(app).get('/healthz');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Request ID Middleware', () => {
    test('should generate and return x-request-id when none provided', async () => {
      const response = await request(app).get('/healthz');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    test('should preserve incoming x-request-id header', async () => {
      const customRequestId = 'custom-request-id-12345';
      const response = await request(app)
        .get('/healthz')
        .set('x-request-id', customRequestId);

      expect(response.headers['x-request-id']).toBe(customRequestId);
    });
  });

  describe('Tracing Middleware (W3C Trace Context)', () => {
    test('should generate valid W3C traceparent header when none provided', async () => {
      const response = await request(app).get('/healthz');

      expect(response.headers['traceparent']).toBeDefined();
      // Format: 00-{32 hex trace-id}-{16 hex span-id}-{2 hex flags}
      expect(response.headers['traceparent']).toMatch(
        /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/
      );
    });

    test('should preserve incoming valid traceparent header', async () => {
      const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const response = await request(app)
        .get('/healthz')
        .set('traceparent', traceparent);

      expect(response.headers['traceparent']).toBe(traceparent);
    });

    test('should preserve incoming tracestate header', async () => {
      const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const tracestate = 'vendor1=opaqueValue,vendor2=opaqueValue';
      const response = await request(app)
        .get('/healthz')
        .set('traceparent', traceparent)
        .set('tracestate', tracestate);

      expect(response.headers['traceparent']).toBe(traceparent);
      expect(response.headers['tracestate']).toBe(tracestate);
    });
  });

  describe('CORS', () => {
    test('should include CORS headers in response', async () => {
      const response = await request(app)
        .get('/healthz')
        .set('Origin', 'http://example.com');

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Protected Route Guards (Authentication required)', () => {
    test('POST /api/orders requires authentication', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({ items: [] });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('GET /api/orders requires authentication', async () => {
      const response = await request(app).get('/api/orders');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('GET /api/orders/:id requires authentication', async () => {
      const response = await request(app).get('/api/orders/order-123');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('GET /api/inventory requires authentication', async () => {
      const response = await request(app).get('/api/inventory');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('GET /api/inventory/:productId requires authentication', async () => {
      const response = await request(app).get('/api/inventory/prod-99');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('PUT /api/inventory/:productId requires authentication', async () => {
      const response = await request(app)
        .put('/api/inventory/prod-99')
        .send({ stock: 50 });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('404 Not Found Handling', () => {
    test('should return 404 for unmapped endpoints', async () => {
      const response = await request(app).get('/non-existent-path');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Cannot GET /non-existent-path'
      });
    });
  });
});
