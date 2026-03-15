import pg from "pg";
const { Pool } = pg;
import { drizzle } from "drizzle-orm/node-postgres";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  min: 1,
  idleTimeoutMillis: 120000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err: Error) => {
  console.error('DB pool error (non-fatal):', err.message);
});

// Keep-alive: prevent Neon from suspending and terminating idle connections.
const dbKeepAlive = setInterval(() => {
  pool.query('SELECT 1').catch((err: Error) => {
    console.error('DB pool keep-alive failed (non-fatal):', err.message);
  });
}, 60 * 1000);
if (dbKeepAlive.unref) dbKeepAlive.unref();

export const db = drizzle(pool);
