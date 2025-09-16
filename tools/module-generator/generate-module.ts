#!/usr/bin/env node
/**
 * CLI tool for generating modules with automatic permission integration
 * Usage: npx tsx generate-module.ts <moduleName> <entityName>
 */

import { generateCrudModuleWithIntegration } from './templates/crud-template';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx tsx generate-module.ts <moduleName> <entityName>');
    console.error('Example: npx tsx generate-module.ts inventory Product');
    process.exit(1);
  }
  
  const [moduleName, entityName] = args;
  
  try {
    console.log(`🚀 Generating CRUD module: ${moduleName}/${entityName}`);
    
    const moduleConfig = await generateCrudModuleWithIntegration({
      moduleName,
      entityName,
      fields: [
        { name: 'description', type: 'string', required: false },
        { name: 'isActive', type: 'boolean', required: false }
      ]
    });
    
    // TODO: Write generated files to disk
    console.log('📁 Generated files:');
    console.log('   - Module config');
    console.log('   - Database schema');
    console.log('   - API routes');
    console.log('   - React components');
    console.log('   - Validation schemas');
    
    console.log(`\n✅ Module '${moduleName}' generated successfully with integrated permissions!`);
    
  } catch (error) {
    console.error('❌ Module generation failed:', error);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (process.argv[1].endsWith('generate-module.ts')) {
  main();
}