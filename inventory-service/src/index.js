import express from 'express';
import amqplib from 'amqplib';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { initDb, closeDb } from './db.js';
import { initRedis, closeRedis } from './redis.js';
import { tracingMiddleware } from './middleware/tracing.js';
import inventoryRoutes from './routes/inventory.js';
import { inventoryService } from './services/inventoryService.js';

export const app = express();

// Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// W3C Trace context propagation middleware
app.use(tracingMiddleware);

// HTTP request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      traceId: req.traceId || null,
    });
  });
  next();
});

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Inventory service API routes
app.use('/inventory', inventoryRoutes);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const response = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
  };

  if (statusCode >= 500) {
    logger.error(`Unhandled error: ${err.message}`, {
      error: err.message,
      stack: err.stack,
      statusCode,
      traceId: req.traceId || null,
    });
  } else {
    logger.warn(`Client error: ${err.message}`, {
      statusCode,
      traceId: req.traceId || null,
    });
  }

  res.status(statusCode).json(response);
});

let server = null;
let rmqConnection = null;
let rmqChannel = null;

/**
 * Initializes RabbitMQ event consumer for asynchronous inventory reservations
 */
async function initRabbitMQ() {
  try {
    logger.info(`Attempting RabbitMQ connection at ${config.rabbitmq.url}...`);
    rmqConnection = await amqplib.connect(config.rabbitmq.url);
    rmqChannel = await rmqConnection.createChannel();

    const queue = config.rabbitmq.inventoryQueue;
    await rmqChannel.assertQueue(queue, { durable: true });

    logger.info(`RabbitMQ consumer ready, listening on queue '${queue}'`);

    rmqChannel.consume(
      queue,
      async (msg) => {
        if (!msg) return;
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info('Received inventory reservation event via RabbitMQ', { event: content });

          if (content.items && Array.isArray(content.items)) {
            const result = await inventoryService.reserveStock(content.items);
            logger.info('Processed RabbitMQ inventory reservation event', { result });
          }

          rmqChannel.ack(msg);
        } catch (err) {
          logger.error('Error processing RabbitMQ message', { error: err.message });
          // Reject and requeue only if transient error
          rmqChannel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

    rmqConnection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { error: err.message });
    });

    rmqConnection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });
  } catch (err) {
    logger.warn(`RabbitMQ initialization skipped or failed: ${err.message}. Running HTTP-only mode.`);
  }
}

/**
 * Starts the HTTP server and external service connections
 */
export async function startServer() {
  try {
    // 1. Initialize MySQL pool and schema
    await initDb();

    // 2. Initialize Redis client
    await initRedis();

    // 3. Initialize RabbitMQ consumer (non-blocking)
    initRabbitMQ().catch((err) => {
      logger.warn('RabbitMQ background init failure', { error: err.message });
    });

    // 4. Start HTTP listener
    return new Promise((resolve) => {
      server = app.listen(config.port, () => {
        logger.info(`Inventory Service running on port ${config.port}`, {
          port: config.port,
          nodeEnv: config.nodeEnv,
        });
        resolve(server);
      });
    });
  } catch (err) {
    logger.error('Failed to start Inventory Service', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
export async function shutdown(signal = 'SIGTERM') {
  logger.info(`Received ${signal}, initiating graceful shutdown...`);

  // 1. Stop accepting new HTTP requests
  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
  }

  // 2. Close RabbitMQ channel and connection
  if (rmqChannel) {
    try {
      await rmqChannel.close();
    } catch (e) {
      // ignore
    }
  }
  if (rmqConnection) {
    try {
      await rmqConnection.close();
      logger.info('RabbitMQ connection closed');
    } catch (e) {
      // ignore
    }
  }

  // 3. Close Redis client
  await closeRedis();

  // 4. Close MySQL pool
  await closeDb();

  logger.info('Graceful shutdown completed');
}

// Process lifecycle event listeners
process.on('SIGTERM', async () => {
  await shutdown('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdown('SIGINT');
  process.exit(0);
});

// Start server automatically when executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
