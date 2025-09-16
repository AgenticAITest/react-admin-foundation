#!/usr/bin/env tsx

/**
 * Test script for Database Schema Integration system
 * Tests all critical fixes including idempotent operation, production safety, and proper cleanup
 */

import { DatabaseSchemaIntegrator, ModuleSchemaConfig } from './lib/database-schema-integrator.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_MODULE_CONFIG: ModuleSchemaConfig = {
  moduleId: 'test-inventory',
  moduleName: 'Test Inventory',
  entityName: 'TestInventoryItem',
  entityNamePlural: 'testInventoryItems',
  entityNameCamel: 'testInventoryItem',
  fields: [
    { name: 'sku', type: 'string', required: true, unique: true, length: 50 },
    { name: 'quantity', type: 'number', required: true },
    { name: 'isAvailable', type: 'boolean' },
    { name: 'lastRestocked', type: 'date' },
    // Test field deduplication - these should be filtered out
    { name: 'name', type: 'string' }, // Conflicts with core field
    { name: 'id', type: 'string' }, // Conflicts with core field
  ]
};

const DB_INDEX_PATH = path.resolve(__dirname, '../../src/server/lib/db/index.ts');

async function readDbIndex(): Promise<string> {
  return await fs.readFile(DB_INDEX_PATH, 'utf-8');
}

async function testFieldDeduplication() {
  console.log('\n🧪 Testing field deduplication...');
  
  try {
    await DatabaseSchemaIntegrator.integrateModuleSchema(TEST_MODULE_CONFIG);
    
    // Check that the generated schema file doesn't contain conflicting fields
    const schemaPath = path.resolve(__dirname, '../../src/server/lib/db/schema/modules/test-inventory.ts');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    
    // Verify conflicting fields are not present in custom fields section
    const hasConflictingNameField = schemaContent.includes('name: varchar(\'name\'') && !schemaContent.includes('// Core business fields');
    const hasConflictingIdField = schemaContent.includes('id: varchar(\'id\'');
    
    if (hasConflictingNameField || hasConflictingIdField) {
      throw new Error('Field deduplication failed - found conflicting fields in schema');
    }
    
    // Verify proper UUID generation
    if (!schemaContent.includes('sql`gen_random_uuid()`')) {
      throw new Error('UUID generation fix not applied - missing sql`gen_random_uuid()`');
    }
    
    console.log('✅ Field deduplication working correctly');
    console.log('✅ UUID generation fix applied correctly');
    
  } catch (error) {
    console.error('❌ Field deduplication test failed:', error);
    throw error;
  }
}

async function testIdempotentOperation() {
  console.log('\n🔄 Testing idempotent operation...');
  
  try {
    // First integration
    await DatabaseSchemaIntegrator.integrateModuleSchema(TEST_MODULE_CONFIG);
    const firstContent = await readDbIndex();
    
    // Second integration (should be idempotent)
    await DatabaseSchemaIntegrator.integrateModuleSchema(TEST_MODULE_CONFIG);
    const secondContent = await readDbIndex();
    
    if (firstContent !== secondContent) {
      throw new Error('Integration is not idempotent - file content changed on second run');
    }
    
    // Verify delimited sections exist
    if (!firstContent.includes('// BEGIN MODULE SCHEMAS IMPORTS') || 
        !firstContent.includes('// END MODULE SCHEMAS IMPORTS')) {
      throw new Error('Delimited sections not properly created');
    }
    
    console.log('✅ Idempotent operation working correctly');
    console.log('✅ Delimited sections approach working correctly');
    
  } catch (error) {
    console.error('❌ Idempotent operation test failed:', error);
    throw error;
  }
}

async function testModuleRemoval() {
  console.log('\n🗑️  Testing module removal and cleanup...');
  
  try {
    // Remove the test module
    await DatabaseSchemaIntegrator.removeModuleSchema('test-inventory');
    
    const content = await readDbIndex();
    
    // Verify delimited sections are cleaned up when no modules exist
    if (content.includes('// BEGIN MODULE SCHEMAS') || content.includes('// END MODULE SCHEMAS')) {
      throw new Error('Delimited sections not properly cleaned up after module removal');
    }
    
    // Verify import cleanup
    if (content.includes('test_inventory')) {
      throw new Error('Stale imports not properly cleaned up');
    }
    
    console.log('✅ Module removal and cleanup working correctly');
    
  } catch (error) {
    console.error('❌ Module removal test failed:', error);
    throw error;
  }
}

async function testProductionSafety() {
  console.log('\n🚨 Testing production safety checks...');
  
  const originalEnv = process.env.NODE_ENV;
  
  try {
    // Set production environment
    process.env.NODE_ENV = 'production';
    
    let productionError: Error | null = null;
    try {
      await DatabaseSchemaIntegrator.integrateModuleSchema(TEST_MODULE_CONFIG);
    } catch (error) {
      productionError = error as Error;
    }
    
    if (!productionError || !productionError.message.includes('production environment')) {
      throw new Error('Production safety check failed - should have blocked operation');
    }
    
    console.log('✅ Production safety checks working correctly');
    
  } finally {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  }
}

async function runTests() {
  console.log('🧪 Starting Database Schema Integration Tests...\n');
  
  try {
    // Test in the correct order
    await testFieldDeduplication();
    await testIdempotentOperation();
    await testModuleRemoval();
    await testProductionSafety();
    
    console.log('\n🎉 All tests passed successfully!');
    console.log('\n📋 Summary of verified fixes:');
    console.log('✅ Path resolution with absolute paths');
    console.log('✅ Delimited sections for safe db/index.ts integration');
    console.log('✅ Production safety for database operations');
    console.log('✅ Proper UUID generation with sql`gen_random_uuid()`');
    console.log('✅ Field deduplication to prevent conflicts');
    console.log('✅ Proper cleanup of stale imports and sections');
    console.log('✅ Idempotent operation capability');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}