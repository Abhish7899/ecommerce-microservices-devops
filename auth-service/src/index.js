import express from 'express';
import config from './config.js';
import logger from './utils/logger.js';
import db from './db.js';
import { tracingMiddleware } from './middleware/tracing.js';
import authRoutes from './routes/auth.js';

export const app = express();

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(tracingMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration
    });
  });
  next();
});

// Health check endpoint (also available on root)
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

// Authentication routes
app.use('/', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    method: req.method,
    url: req.originalUrl
  });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error'
  });
});

let server = null;

export async function startServer() {
  try {
    // Initialize MySQL connection with retry logic
    await db.initDb();

    // Start Express server
    server = app.listen(config.port, () => {
      logger.info(`Auth service started successfully on port ${config.port}`, {
        port: config.port,
        env: config.env
      });
    });

    return server;
  } catch (error) {
    logger.error(`Failed to start auth service: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
}

// Graceful shutdown handling
export async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
  }

  await db.closeDb();
  logger.info('Graceful shutdown completed');
}

process.on('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', async () => {
  await gracefulShutdown('SIGINT');
  process.exit(0);
});

// Start the server if running as main module
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
