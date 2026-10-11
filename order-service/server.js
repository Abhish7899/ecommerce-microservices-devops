const http = require('http');

const PORT = parseInt(process.env.PORT || '3002', 10);
const SERVICE_NAME = 'order-service';
const DB_HOST = process.env.DB_HOST || 'mysql';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_NAME = process.env.DB_NAME || 'ecommerce';
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || '5672';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3003';

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

  if (url.pathname === '/orders' || url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: SERVICE_NAME,
      message: 'Order service ready',
      dependencies: {
        database: `${DB_HOST}:${DB_PORT}/${DB_NAME}`,
        broker: `${RABBITMQ_HOST}:${RABBITMQ_PORT}`,
        inventory: INVENTORY_SERVICE_URL
      }
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', path: url.pathname }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_NAME}] Listening on port ${PORT}`);
});
