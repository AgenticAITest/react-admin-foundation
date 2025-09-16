import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as systemSchema from './schema/system';
import * as masterSchema from './schema/master';
// BEGIN MODULE SCHEMAS IMPORTS
import * as prod_testSchema from './schema/modules/prod-test';
import * as test_inventorySchema from './schema/modules/test-inventory';
// END MODULE SCHEMAS IMPORTS
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);

const schema = { ...systemSchema, ...masterSchema, ...prod_testSchema, ...test_inventorySchema };
export const db = drizzle(client, { schema });
