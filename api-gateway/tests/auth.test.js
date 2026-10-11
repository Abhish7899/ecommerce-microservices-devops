import jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import { authenticateToken } from '../src/middleware/auth.js';
import { config } from '../src/config.js';

describe('Auth Middleware (JWT validation)', () => {
  let testApp;

  beforeEach(() => {
    testApp = express();
    testApp.use(express.json());
    testApp.get('/protected', authenticateToken, (req, res) => {
      res.status(200).json({
        user: req.user,
        userIdHeader: req.headers['x-user-id'],
        userEmailHeader: req.headers['x-user-email']
      });
    });
  });

  test('should return 401 when Authorization header is missing', async () => {
    const response = await request(testApp).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Authorization header is required'
    });
  });

  test('should return 401 when Authorization header is malformed', async () => {
    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Basic invalidtoken');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Invalid token format. Expected Bearer <token>'
    });
  });

  test('should return 401 when Authorization header is Bearer with no token', async () => {
    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer ');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Invalid token format. Expected Bearer <token>'
    });
  });

  test('should return 401 when token is invalid or signed with wrong secret', async () => {
    const invalidToken = jwt.sign({ id: '123', email: 'test@example.com' }, 'wrong-secret');
    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  });

  test('should return 401 when token is expired', async () => {
    const expiredToken = jwt.sign(
      { id: '123', email: 'test@example.com' },
      config.jwtSecret,
      { expiresIn: '-1s' }
    );
    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  });

  test('should authenticate and extract user headers when valid token is provided', async () => {
    const payload = { id: 'usr_456', email: 'user@example.com', role: 'admin' };
    const validToken = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });

    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body.userIdHeader).toBe('usr_456');
    expect(response.body.userEmailHeader).toBe('user@example.com');
    expect(response.body.user.id).toBe('usr_456');
    expect(response.body.user.email).toBe('user@example.com');
  });

  test('should handle userId and sub fallback attributes in JWT payload', async () => {
    const payloadWithUserId = { userId: 'usr_789', userEmail: 'fallback@example.com' };
    const token = jwt.sign(payloadWithUserId, config.jwtSecret);

    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.userIdHeader).toBe('usr_789');
    expect(response.body.userEmailHeader).toBe('fallback@example.com');
  });

  test('should handle sub claim in JWT payload', async () => {
    const payloadWithSub = { sub: 'usr_sub_101', email: 'sub@example.com' };
    const token = jwt.sign(payloadWithSub, config.jwtSecret);

    const response = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.userIdHeader).toBe('usr_sub_101');
    expect(response.body.userEmailHeader).toBe('sub@example.com');
  });
});
