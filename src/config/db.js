const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
});

// Export cả hàm query lẫn đối tượng pool để gọi kiểu nào cũng chạy
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
