import mysql from 'mysql2/promise';
import config from './config.js';
import logger from './utils/logger.js';

let pool = null;

/**
 * Creates the database if it doesn't already exist and initializes the connection pool and tables.
 * Retries up to config.mysql.maxRetries times with config.mysql.retryDelayMs between attempts.
 */
export async function initDb() {
  const maxRetries = config.mysql.maxRetries;
  const retryDelay = config.mysql.retryDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting MySQL connection (attempt ${attempt}/${maxRetries})...`);

      // First, create the database if it does not exist
      const adminConn = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password
      });

      await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\`;`);
      await adminConn.end();

      // Initialize the connection pool
      pool = mysql.createPool({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        waitForConnections: true,
        connectionLimit: config.mysql.connectionLimit,
        queueLimit: 0
      });

      // Verify connection pool works
      const connection = await pool.getConnection();
      logger.info('MySQL connection pool established successfully');

      // Auto-create users table if not exists
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `;
      await connection.query(createTableSql);
      connection.release();

      logger.info('Database schema verified / initialized successfully');
      return pool;
    } catch (err) {
      logger.warn(`MySQL connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        logger.info(`Retrying MySQL connection in ${retryDelay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        logger.error(`Exhausted all ${maxRetries} MySQL connection attempts.`);
        throw err;
      }
    }
  }
}

/**
 * Returns the current database pool.
 */
export function getPool() {
  return pool;
}

/**
 * Sets the database pool (useful for testing and dependency injection).
 */
export function setPool(newPool) {
  pool = newPool;
}

/**
 * Executes a query using the connection pool.
 */
export async function query(sql, params) {
  if (!pool) {
    throw new Error('Database pool has not been initialized');
  }
  return pool.execute(sql, params);
}

/**
 * Gracefully closes the database connection pool.
 */
export async function closeDb() {
  if (pool) {
    logger.info('Closing MySQL connection pool...');
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
}

export default {
  initDb,
  getPool,
  setPool,
  query,
  closeDb
};
