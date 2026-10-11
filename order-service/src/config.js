import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '3002', 10),
  MYSQL_HOST: process.env.MYSQL_HOST || 'mysql',
  MYSQL_PORT: parseInt(process.env.MYSQL_PORT || '3306', 10),
  MYSQL_USER: process.env.MYSQL_USER || 'root',
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || 'rootpassword',
  MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'ecommerce',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  RABBITMQ_EXCHANGE: process.env.RABBITMQ_EXCHANGE || 'ecommerce.events',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  NODE_ENV: process.env.NODE_ENV || 'production',
  SERVICE_NAME: process.env.SERVICE_NAME || 'order-service'
};

export default config;
