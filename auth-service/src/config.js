import dotenv from 'dotenv';

dotenv.config();

const config = {
  serviceName: 'auth-service',
  env: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT, 10) || 3001,
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiry: process.env.JWT_EXPIRY || '24h'
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'mysql',
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'rootpassword',
    database: process.env.MYSQL_DATABASE || 'ecommerce',
    connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT, 10) || 10,
    maxRetries: parseInt(process.env.MYSQL_MAX_RETRIES, 10) || 10,
    retryDelayMs: parseInt(process.env.MYSQL_RETRY_DELAY_MS, 10) || 3000
  },
  logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;
