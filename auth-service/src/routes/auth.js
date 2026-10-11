import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import {
  registerValidationRules,
  loginValidationRules,
  handleValidationErrors
} from '../middleware/validation.js';

const router = Router();

/**
 * GET /healthz
 * Health check endpoint
 */
router.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

/**
 * POST /register
 * Register a new user (email, password, name).
 * Password hashed with bcryptjs (10 rounds).
 * Stored in MySQL users table.
 * Returns { id, email, name }
 */
router.post(
  '/register',
  registerValidationRules,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, password, name } = req.body;

      // Hash password using bcryptjs with 10 salt rounds
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      try {
        const [result] = await db.query(
          'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
          [email, hashedPassword, name]
        );

        logger.info(`User registered successfully: ${email}`, { userId: result.insertId });

        return res.status(201).json({
          id: result.insertId,
          email,
          name
        });
      } catch (dbError) {
        if (dbError.code === 'ER_DUP_ENTRY' || dbError.errno === 1062) {
          logger.warn(`Registration attempt with duplicate email: ${email}`);
          return res.status(409).json({ error: 'Email already registered' });
        }
        throw dbError;
      }
    } catch (error) {
      logger.error(`Error registering user: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
);

/**
 * POST /login
 * Authenticate user by email/password.
 * Issues a JWT (HS256) with payload { userId, email } and 24h expiry.
 * Returns { token, user: { id, email, name } }
 */
router.post(
  '/login',
  loginValidationRules,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Fetch user from database
      const [rows] = await db.query(
        'SELECT id, email, password, name FROM users WHERE email = ?',
        [email]
      );

      if (!rows || rows.length === 0) {
        logger.warn(`Login failed: user not found (${email})`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = rows[0];

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.warn(`Login failed: password mismatch (${email})`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT with HS256 algorithm and configured expiry
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        {
          algorithm: 'HS256',
          expiresIn: config.jwt.expiry
        }
      );

      logger.info(`User authenticated successfully: ${email}`, { userId: user.id });

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      logger.error(`Error authenticating user: ${error.message}`, { stack: error.stack });
      next(error);
    }
  }
);

export default router;
