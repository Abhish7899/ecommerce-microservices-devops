import express from 'express';
import config from './config.js';
import logger from './utils/logger.js';
import { tracingMiddleware } from './middleware/tracing.js';
import ordersRouter from './routes/orders.js';
import { initDb, closeDb } from './db.js';
import { connectRabbitMQ, closeRabbitMQ } from './services/eventPublisher.js';

const app = express();

app.use(express.json());
app.use(tracingMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount orders routes
app.use('/orders', ordersRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (err.status || 500);
  logger.error(`Error processing request ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack,
    statusCode
  });
  res.status(statusCode).json({
    error: err.message || 'Internal server error'
  });
});

let server = null;

export const startServer = async () => {
  try {
    // Initialize MySQL with auto-migration tables
    await initDb();

    // Connect to RabbitMQ with retry
    await connectRabbitMQ();

    server = app.listen(config.PORT, () => {
      logger.info(`${config.SERVICE_NAME} listening on port ${config.PORT} in ${config.NODE_ENV} mode`);
    });

    return server;
  } catch (err) {
    logger.error(`Failed to start ${config.SERVICE_NAME}: ${err.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handling
export const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP server closed');
  }
  await closeRabbitMQ();
  await closeDb();
  logger.info('Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Auto-start when executed directly and not under test
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server };
export default app;
