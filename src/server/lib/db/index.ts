import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as systemSchema from './schema/system';
import * as masterSchema from './schema/master';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);

const schema = { ...systemSchema, ...masterSchema };
export const db = drizzle(client, { schema });
