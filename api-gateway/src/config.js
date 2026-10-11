import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://order-service:3002',
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://inventory-service:3003',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'production',
  serviceName: 'api-gateway'
};
