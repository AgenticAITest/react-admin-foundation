import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as systemSchema from './schema/system';
import * as masterSchema from './schema/master';
// BEGIN MODULE SCHEMAS IMPORTS
import * as inventorySchema from './schema/modules/inventory';
import * as prod_testSchema from './schema/modules/prod-test';
import * as test_inventorySchema from './schema/modules/test-inventory';
import * as testmoduleSchema from './schema/modules/testmodule';
import * as testmodule2Schema from './schema/modules/testmodule2';
import * as testmodule3Schema from './schema/modules/testmodule3';
// END MODULE SCHEMAS IMPORTS
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);

const schema = { ...systemSchema, ...masterSchema, ...inventorySchema, ...prod_testSchema, ...test_inventorySchema, ...testmoduleSchema, ...testmodule2Schema, ...testmodule3Schema };
export const db = drizzle(client, { schema });
