// db/client.ts (sandbox-only)
import { Pool, PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

export const pool = new Pool({
  connectionString,
  max: 10,
  // ssl: { rejectUnauthorized: false }, // uncomment if needed
});

export function makeDb(client: PoolClient) {
  return drizzle(client, { logger: process.env.NODE_ENV !== 'production' });
}