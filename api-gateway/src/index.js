import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { tracingMiddleware } from './middleware/tracing.js';
import proxyRoutes from './routes/proxy.js';

export const app = express();

// Enable CORS
app.use(cors());

// Context and request tracing
app.use(requestIdMiddleware);
app.use(tracingMiddleware);

// Structured request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      message: 'Request processed',
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      requestId: req.id
    });
  });
  next();
});

// Rate limiting: 100 requests per 15 minutes per IP
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/healthz',
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use(limiter);

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// JSON body parser for incoming requests (if needed by proxies or endpoints)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Downstream microservice proxies
app.use(proxyRoutes);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl || req.url}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({
    message: 'Unhandled server error',
    error: err.message,
    stack: err.stack,
    path: req.originalUrl || req.url
  });
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

export let server;

if (config.nodeEnv !== 'test') {
  server = app.listen(config.port, () => {
    logger.info({ message: `API Gateway listening on port ${config.port}` });
  });

  const gracefulShutdown = (signal) => {
    logger.info({ message: `Received ${signal}. Starting graceful shutdown...` });
    if (server) {
      server.close((err) => {
        if (err) {
          logger.error({ message: 'Error closing HTTP server', error: err.message });
          process.exit(1);
        }
        logger.info({ message: 'HTTP server closed successfully. Process exiting.' });
        process.exit(0);
      });

      // Force kill if graceful shutdown hangs
      setTimeout(() => {
        logger.error({ message: 'Graceful shutdown timed out after 10s. Forcing exit.' });
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
