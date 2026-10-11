import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/index.js';
import db from '../src/db.js';
import config from '../src/config.js';

describe('Auth Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /healthz', () => {
    it('should return health check status 200 with service name', async () => {
      const response = await request(app).get('/healthz');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        service: 'auth-service'
      });
      expect(response.headers['traceparent']).toBeDefined();
    });
  });

  describe('POST /register', () => {
    it('should register a new user successfully and return user details (201)', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce([
        { insertId: 101, affectedRows: 1 }
      ]);

      const newUser = {
        email: 'alice@example.com',
        password: 'Password123!',
        name: 'Alice Johnson'
      };

      const response = await request(app)
        .post('/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 101);
      expect(response.body).toHaveProperty('email', 'alice@example.com');
      expect(response.body).toHaveProperty('name', 'Alice Johnson');
      expect(response.body.password).toBeUndefined();
      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when required fields are missing or invalid', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          email: 'invalid-email',
          password: '123',
          name: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should return 409 when email is already registered', async () => {
      const duplicateError = new Error('Duplicate entry');
      duplicateError.code = 'ER_DUP_ENTRY';
      duplicateError.errno = 1062;

      jest.spyOn(db, 'query').mockRejectedValueOnce(duplicateError);

      const response = await request(app)
        .post('/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePassword123',
          name: 'Existing User'
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'Email already registered' });
    });
  });

  describe('POST /login', () => {
    it('should authenticate user with valid credentials and return JWT token (200)', async () => {
      const rawPassword = 'SecurePassword123!';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const mockUser = {
        id: 42,
        email: 'bob@example.com',
        password: hashedPassword,
        name: 'Bob Smith'
      };

      jest.spyOn(db, 'query').mockResolvedValueOnce([[mockUser]]);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'bob@example.com',
          password: rawPassword
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: 42,
        email: 'bob@example.com',
        name: 'Bob Smith'
      });

      // Verify JWT token payload and validity
      const decoded = jwt.verify(response.body.token, config.jwt.secret);
      expect(decoded.userId).toBe(42);
      expect(decoded.email).toBe('bob@example.com');
    });

    it('should return 401 when user email does not exist', async () => {
      jest.spyOn(db, 'query').mockResolvedValueOnce([[]]);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'unknown@example.com',
          password: 'AnyPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should return 401 when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123', 10);
      const mockUser = {
        id: 43,
        email: 'charlie@example.com',
        password: hashedPassword,
        name: 'Charlie'
      };

      jest.spyOn(db, 'query').mockResolvedValueOnce([[mockUser]]);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'charlie@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should return 400 when login payload fails validation', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'not-an-email',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('W3C Tracing Headers', () => {
    it('should propagate incoming traceparent header in response', async () => {
      const incomingTraceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

      const response = await request(app)
        .get('/healthz')
        .set('traceparent', incomingTraceparent);

      expect(response.status).toBe(200);
      const resTraceparent = response.headers['traceparent'];
      expect(resTraceparent).toBeDefined();
      expect(resTraceparent.startsWith('00-4bf92f3577b34da6a3ce929d0e0e4736-')).toBe(true);
    });
  });
});
