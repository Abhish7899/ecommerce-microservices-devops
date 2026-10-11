import mysql from 'mysql2/promise';
import { config } from './config.js';
import { logger } from './utils/logger.js';

let pool = null;

/**
 * Returns or initializes the MySQL pool instance
 */
export function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: config.mysql.waitForConnections,
      connectionLimit: config.mysql.connectionLimit,
      queueLimit: config.mysql.queueLimit,
      connectTimeout: config.mysql.connectTimeout,
      decimalNumbers: true,
    });
  }
  return pool;
}

/**
 * Ensures the database schema exists
 */
export async function createSchema(connection) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) UNIQUE NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      reserved INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_products_sku (sku)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await connection.query(createTableQuery);
  logger.info('MySQL database schema verified/created');
}

/**
 * Initializes MySQL connection pool with retries and runs schema migration
 */
export async function initDb(retries = 10, delayMs = 2000) {
  const currentPool = getDbPool();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Attempting MySQL connection (${attempt}/${retries})...`);
      const connection = await currentPool.getConnection();
      try {
        await connection.ping();
        logger.info('MySQL connection established');
        await createSchema(connection);
      } finally {
        connection.release();
      }
      return currentPool;
    } catch (err) {
      logger.warn(`MySQL connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error('Failed to connect to MySQL after maximum retries', { error: err.message });
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return currentPool;
}

/**
 * Gracefully close the MySQL pool
 */
export async function closeDb() {
  if (pool) {
    try {
      await pool.end();
      logger.info('MySQL connection pool closed cleanly');
    } catch (err) {
      logger.error('Error closing MySQL pool', { error: err.message });
    } finally {
      pool = null;
    }
  }
}

export const db = {
  query: (...args) => getDbPool().query(...args),
  execute: (...args) => getDbPool().execute(...args),
  getConnection: () => getDbPool().getConnection(),
};

export default db;
