import mysql from 'mysql2/promise';
import config from './config.js';
import logger from './utils/logger.js';

let pool = null;

export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.MYSQL_HOST,
      port: config.MYSQL_PORT,
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      database: config.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true
    });
  }
  return pool;
};

export const setPool = (newPool) => {
  pool = newPool;
};

export const initDb = async (maxRetries = 10, retryDelayMs = 3000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      logger.info(`Connecting to MySQL (attempt ${attempt}/${maxRetries})...`);

      // First ensure database exists
      const rootConn = await mysql.createConnection({
        host: config.MYSQL_HOST,
        port: config.MYSQL_PORT,
        user: config.MYSQL_USER,
        password: config.MYSQL_PASSWORD
      });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.MYSQL_DATABASE}\`;`);
      await rootConn.end();

      // Now create and test pool
      const p = getPool();
      const connection = await p.getConnection();
      await connection.ping();

      // Auto-create orders table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          status ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);

      // Auto-create order_items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
      `);

      connection.release();
      logger.info('MySQL initialized and tables created/verified successfully');
      return p;
    } catch (err) {
      logger.warn(`MySQL connection attempt ${attempt} failed: ${err.message}`);
      if (attempt >= maxRetries) {
        logger.error(`Exceeded maximum retries (${maxRetries}) connecting to MySQL`);
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};

export const closeDb = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
};

export default {
  getPool,
  setPool,
  initDb,
  closeDb
};
