import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    logger.warn({
      message: 'Authentication failed: missing Authorization header',
      path: req.originalUrl || req.path
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header is required'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
    logger.warn({
      message: 'Authentication failed: malformed Authorization header',
      path: req.originalUrl || req.path
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token format. Expected Bearer <token>'
    });
  }

  const token = parts[1].trim();

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;

    const userId = decoded.id ?? decoded.userId ?? decoded.sub ?? '';
    const userEmail = decoded.email ?? decoded.userEmail ?? '';

    req.headers['x-user-id'] = String(userId);
    req.headers['x-user-email'] = String(userEmail);

    next();
  } catch (error) {
    logger.warn({
      message: 'Authentication failed: invalid or expired token',
      error: error.message,
      path: req.originalUrl || req.path
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
};
