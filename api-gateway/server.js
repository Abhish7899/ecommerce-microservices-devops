const http = require('http');

const PORT = parseInt(process.env.PORT || '3000', 10);
const SERVICE_NAME = 'api-gateway';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3002';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'UP',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (url.pathname === '/' || url.pathname === '/routes') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'API Gateway is running',
      service: SERVICE_NAME,
      downstream: {
        auth: AUTH_SERVICE_URL,
        orders: ORDER_SERVICE_URL,
        inventory: INVENTORY_SERVICE_URL,
        notifications: NOTIFICATION_SERVICE_URL
      },
      jwtConfigured: Boolean(JWT_SECRET)
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', path: url.pathname }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_NAME}] Listening on port ${PORT}`);
});
