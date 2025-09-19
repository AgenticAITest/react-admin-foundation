// db/client.ts
import 'dotenv/config';
import { Pool, PoolClient } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export function makeDb(clientOrPool: Pool | PoolClient = pool): NodePgDatabase {
  return drizzle(clientOrPool as any);
}