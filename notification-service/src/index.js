import express from 'express';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { consumer } from './consumer.js';
import { tracingMiddleware } from './middleware/tracing.js';

export const app = express();

// Middleware
app.use(express.json());
app.use(tracingMiddleware);

// Health check endpoint on port 3004
app.get('/healthz', (req, res) => {
  const isConnected = consumer.isConnected();
  const status = isConnected ? 'ok' : 'degraded';
  const statusCode = isConnected ? 200 : 503;

  res.status(statusCode).json({
    status,
    service: config.serviceName,
    rabbitmq: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

let server = null;
let isShuttingDown = false;

/**
 * Initializes and starts the HTTP health server and RabbitMQ consumer.
 */
export async function start() {
  // Start HTTP health check server
  server = app.listen(config.port, () => {
    logger.info(`Notification service health server listening on port ${config.port}`, {
      port: config.port,
      nodeEnv: config.nodeEnv,
    });
  });

  // Connect to RabbitMQ and start consuming
  try {
    await consumer.connect();
    await consumer.startConsuming();
    logger.info('RabbitMQ consumer initialization complete and ready for events');
  } catch (err) {
    logger.error('Initial RabbitMQ connection failed; will retry in background', {
      error: err.message,
    });
    // Background retry loop
    scheduleRabbitMQReconnect();
  }
}

/**
 * Periodically attempts to reconnect if the initial connection failed.
 */
function scheduleRabbitMQReconnect() {
  if (isShuttingDown || consumer.isConnected()) {
    return;
  }

  const timer = setTimeout(async () => {
    if (isShuttingDown || consumer.isConnected()) {
      return;
    }
    try {
      logger.info('Attempting to reconnect to RabbitMQ...');
      await consumer.connect();
      await consumer.startConsuming();
      logger.info('RabbitMQ consumer successfully connected on reconnect attempt');
    } catch (err) {
      logger.error('RabbitMQ reconnect attempt failed', { error: err.message });
      scheduleRabbitMQReconnect();
    }
  }, config.rabbitmq.reconnectIntervalMs);

  // Unref timer so it does not prevent process exit during shutdown
  if (timer.unref) {
    timer.unref();
  }
}

/**
 * Gracefully shuts down HTTP server and RabbitMQ resources.
 * @param {string} signal
 */
export async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);

  if (shutdownTimeout.unref) {
    shutdownTimeout.unref();
  }

  try {
    // Stop accepting new HTTP requests
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      logger.info('HTTP health check server closed');
    }

    // Close RabbitMQ consumer and connection
    await consumer.close();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error encountered during graceful shutdown', { error: err.message });
    process.exit(1);
  }
}

// Register termination signal listeners
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Auto-start when executed directly
if (process.env.NODE_ENV !== 'test') {
  start();
}
