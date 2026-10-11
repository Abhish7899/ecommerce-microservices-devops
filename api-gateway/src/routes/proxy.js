import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateToken } from '../middleware/auth.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const router = Router();

const createHeaderForwarder = () => {
  return (proxyReq, req, res) => {
    if (req.id) {
      proxyReq.setHeader('x-request-id', req.id);
    }
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
    }
    if (req.headers['x-user-email']) {
      proxyReq.setHeader('x-user-email', req.headers['x-user-email']);
    }
    if (req.headers['traceparent']) {
      proxyReq.setHeader('traceparent', req.headers['traceparent']);
    }
    if (req.headers['tracestate']) {
      proxyReq.setHeader('tracestate', req.headers['tracestate']);
    }

    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  };
};

const createErrorHandler = (serviceName, targetUrl) => {
  return (err, req, res) => {
    logger.error({
      message: `Proxy error forwarding to ${serviceName}`,
      error: err.message,
      url: req.originalUrl || req.url,
      target: targetUrl
    });

    if (!res.headersSent) {
      res.status(502).json({
        error: 'Bad Gateway',
        message: `Failed to connect to downstream service: ${serviceName}`
      });
    }
  };
};

// Path rewriters
const authPathRewrite = (path, req) => {
  const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : path;
  const search = req.originalUrl && req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
  const rewritten = fullPath.replace(/^\/api\/auth/, '');
  return (rewritten || '/') + search;
};

const orderPathRewrite = (path, req) => {
  const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : path;
  const search = req.originalUrl && req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
  const rewritten = fullPath.replace(/^\/api\/orders/, '/orders');
  return rewritten + search;
};

const inventoryPathRewrite = (path, req) => {
  const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : path;
  const search = req.originalUrl && req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
  const rewritten = fullPath.replace(/^\/api\/inventory/, '/inventory');
  return rewritten + search;
};

const forwardHeaders = createHeaderForwarder();

// 1. Auth service proxy (public)
export const authProxy = createProxyMiddleware({
  target: config.authServiceUrl,
  changeOrigin: true,
  pathRewrite: authPathRewrite,
  on: {
    proxyReq: forwardHeaders,
    error: createErrorHandler('auth-service', config.authServiceUrl)
  },
  onProxyReq: forwardHeaders,
  onError: createErrorHandler('auth-service', config.authServiceUrl)
});

// 2. Order service proxy (protected)
export const orderProxy = createProxyMiddleware({
  target: config.orderServiceUrl,
  changeOrigin: true,
  pathRewrite: orderPathRewrite,
  on: {
    proxyReq: forwardHeaders,
    error: createErrorHandler('order-service', config.orderServiceUrl)
  },
  onProxyReq: forwardHeaders,
  onError: createErrorHandler('order-service', config.orderServiceUrl)
});

// 3. Inventory service proxy (protected)
export const inventoryProxy = createProxyMiddleware({
  target: config.inventoryServiceUrl,
  changeOrigin: true,
  pathRewrite: inventoryPathRewrite,
  on: {
    proxyReq: forwardHeaders,
    error: createErrorHandler('inventory-service', config.inventoryServiceUrl)
  },
  onProxyReq: forwardHeaders,
  onError: createErrorHandler('inventory-service', config.inventoryServiceUrl)
});

// Mount routes
router.use('/api/auth', authProxy);
router.use('/api/orders', authenticateToken, orderProxy);
router.use('/api/inventory', authenticateToken, inventoryProxy);

export default router;
