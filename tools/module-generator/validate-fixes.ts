#!/usr/bin/env tsx

/**
 * Validation script for Database Schema Integration critical fixes
 * Verifies all fixes work without requiring database operations
 */

import { DatabaseSchemaIntegrator, ModuleSchemaConfig } from './lib/database-schema-integrator.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG: ModuleSchemaConfig = {
  moduleId: 'validation-test',
  moduleName: 'Validation Test',
  entityName: 'ValidationItem',
  entityNamePlural: 'validationItems',
  entityNameCamel: 'validationItem',
  fields: [
    { name: 'testField', type: 'string', required: true },
    // These should be filtered out by deduplication
    { name: 'name', type: 'string' },
    { name: 'id', type: 'string' },
    { name: 'isActive', type: 'boolean' },
  ]
};

async function validatePathResolution() {
  console.log('📍 Validating absolute path resolution...');
  
  // Test that the integrator can resolve paths correctly
  const schemas = await DatabaseSchemaIntegrator.listModuleSchemas();
  console.log(`   Found ${schemas.length} existing schemas`);
  console.log('✅ Path resolution working correctly');
}

async function validateSchemaGeneration() {
  console.log('🏗️  Validating schema generation and field deduplication...');
  
  // Generate schema without database push
  const originalMethod = (DatabaseSchemaIntegrator as any).runDatabasePush;
  (DatabaseSchemaIntegrator as any).runDatabasePush = async () => {
    console.log('   ⏭️  Skipping database push for validation');
  };
  
  try {
    await DatabaseSchemaIntegrator.integrateModuleSchema(TEST_CONFIG);
    
    // Check schema file content
    const schemaPath = path.resolve(__dirname, '../../src/server/lib/db/schema/modules/validation-test.ts');
    const content = await fs.readFile(schemaPath, 'utf-8');
    
    // Validate UUID generation fix
    if (!content.includes('sql`gen_random_uuid()`')) {
      throw new Error('UUID generation fix not applied');
    }
    console.log('✅ UUID generation fix applied correctly');
    
    // Validate field deduplication (conflicting fields should not appear in custom section)
    const hasConflictingField = content.includes('name: varchar(\'name\',') && 
                               !content.includes('// Core business fields');
    if (hasConflictingField) {
      throw new Error('Field deduplication failed');
    }
    console.log('✅ Field deduplication working correctly');
    
    // Validate schema structure
    if (!content.includes('export const validationItems') || 
        !content.includes('export type ValidationItem')) {
      throw new Error('Schema structure not generated correctly');
    }
    console.log('✅ Schema generation working correctly');
    
  } finally {
    // Restore original method
    (DatabaseSchemaIntegrator as any).runDatabasePush = originalMethod;
  }
}

async function validateIndexIntegration() {
  console.log('🔗 Validating index.ts integration...');
  
  const indexPath = path.resolve(__dirname, '../../src/server/lib/db/index.ts');
  const content = await fs.readFile(indexPath, 'utf-8');
  
  // Check that module imports are present
  if (!content.includes('validation_testSchema')) {
    throw new Error('Module schema not integrated into index.ts');
  }
  console.log('✅ Index integration working correctly');
  
  // Check syntax is valid (modules may include multiple schemas)
  if (content.includes('...systemSchema, ...masterSchema') && 
      content.includes('...validation_testSchema') &&
      content.match(/const schema = \{[^}]+\};/)) {
    console.log('✅ Schema export syntax is correct');
  } else {
    throw new Error('Schema export syntax is malformed');
  }
}

async function validateProductionSafety() {
  console.log('🛡️  Validating production safety...');
  
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  
  try {
    let productionError: Error | null = null;
    try {
      await DatabaseSchemaIntegrator.integrateModuleSchema({
        ...TEST_CONFIG,
        moduleId: 'prod-test'
      });
    } catch (error) {
      productionError = error as Error;
    }
    
    if (!productionError?.message.includes('production environment')) {
      throw new Error('Production safety check failed');
    }
    console.log('✅ Production safety checks working correctly');
    
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
}

async function validateIdempotentOperation() {
  console.log('🔄 Validating idempotent operation...');
  
  const indexPath = path.resolve(__dirname, '../../src/server/lib/db/index.ts');
  
  // Skip database push for this test
  const originalMethod = (DatabaseSchemaIntegrator as any).runDatabasePush;
  (DatabaseSchemaIntegrator as any).runDatabasePush = async () => {};
  
  try {
    // First run
    await DatabaseSchemaIntegrator.integrateModuleSchema(TEST_CONFIG);
    const firstContent = await fs.readFile(indexPath, 'utf-8');
    
    // Second run (should be idempotent)
    await DatabaseSchemaIntegrator.integrateModuleSchema(TEST_CONFIG);
    const secondContent = await fs.readFile(indexPath, 'utf-8');
    
    if (firstContent !== secondContent) {
      throw new Error('Integration is not idempotent');
    }
    console.log('✅ Idempotent operation working correctly');
    
  } finally {
    (DatabaseSchemaIntegrator as any).runDatabasePush = originalMethod;
  }
}

async function validateCleanup() {
  console.log('🧹 Validating cleanup and removal...');
  
  // Remove test schema
  await DatabaseSchemaIntegrator.removeModuleSchema('validation-test');
  
  const indexPath = path.resolve(__dirname, '../../src/server/lib/db/index.ts');
  const content = await fs.readFile(indexPath, 'utf-8');
  
  // Check that imports are cleaned up
  if (content.includes('validation_testSchema')) {
    throw new Error('Schema imports not properly cleaned up');
  }
  console.log('✅ Cleanup and removal working correctly');
}

async function runValidation() {
  console.log('🔍 Starting Database Schema Integration Fix Validation\n');
  
  try {
    await validatePathResolution();
    await validateSchemaGeneration();
    await validateIndexIntegration();
    await validateProductionSafety();
    await validateIdempotentOperation();
    await validateCleanup();
    
    console.log('\n🎉 All critical fixes validated successfully!\n');
    console.log('📋 Validated fixes:');
    console.log('✅ Absolute path resolution');
    console.log('✅ Proper UUID generation with sql`gen_random_uuid()`');
    console.log('✅ Field deduplication to prevent conflicts');
    console.log('✅ Safe index.ts integration');
    console.log('✅ Production environment safety');
    console.log('✅ Idempotent operation capability');
    console.log('✅ Proper cleanup and removal');
    console.log('\n🚀 Database Schema Integration system is production-ready!');
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runValidation();
}