#!/usr/bin/env node
/**
 * CLI tool for generating modules with automatic permission integration
 * Usage: npx tsx generate-module.ts <moduleName> <entityName>
 */

import { generateCrudModuleWithIntegration } from './templates/crud-template';
import { promises as fs } from 'fs';
import path from 'path';

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
    
    // Create module directory structure
    const moduleDir = path.join('src', 'modules', moduleName);
    const entityNameLower = entityName.toLowerCase();
    const entityNameCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1);
    
    console.log(`📁 Creating module directory: ${moduleDir}`);
    
    // Create all necessary directories
    await fs.mkdir(path.join(moduleDir, 'server', 'routes'), { recursive: true });
    await fs.mkdir(path.join(moduleDir, 'server', 'schemas'), { recursive: true });
    await fs.mkdir(path.join(moduleDir, 'client', 'pages'), { recursive: true });
    await fs.mkdir(path.join(moduleDir, 'client', 'components'), { recursive: true });
    
    // Write all generated files to disk
    const filesToWrite = [
      {
        path: path.join(moduleDir, 'module.config.ts'),
        content: moduleConfig.config,
        description: 'Module configuration'
      },
      {
        path: path.join(moduleDir, 'server', 'routes', `${entityNameCamel}Routes.ts`),
        content: moduleConfig.routerFile,
        description: 'API routes'
      },
      {
        path: path.join(moduleDir, 'server', 'schemas', `${entityNameCamel}Schema.ts`),
        content: moduleConfig.schemas,
        description: 'Validation schemas'
      },
      {
        path: path.join(moduleDir, 'client', 'pages', `${entityName}sPage.tsx`),
        content: moduleConfig.component,
        description: 'React component'
      }
    ];
    
    console.log('📁 Writing generated files:');
    for (const file of filesToWrite) {
      await fs.writeFile(file.path, file.content, 'utf8');
      console.log(`   ✅ ${file.description}: ${file.path}`);
    }
    
    console.log(`\n✅ Module '${moduleName}' generated successfully with integrated permissions!`);
    console.log(`📂 Module files created in: ${moduleDir}`);
    console.log(`🔄 Permissions and database schema have been automatically integrated`);
    console.log(`🚀 Module is ready to use!`);
    
  } catch (error) {
    console.error('❌ Module generation failed:', error);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (process.argv[1].endsWith('generate-module.ts')) {
  main();
}