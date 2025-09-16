import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ModuleSchemaConfig {
  moduleId: string;
  moduleName: string;
  entityName: string;
  entityNamePlural: string;
  entityNameCamel: string;
  fields?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required?: boolean;
    unique?: boolean;
    length?: number;
  }>;
}

export class DatabaseSchemaIntegrator {
  private static readonly SCHEMA_DIR = path.resolve(__dirname, '../../../src/server/lib/db/schema');
  private static readonly MODULES_SCHEMA_DIR = path.resolve(__dirname, '../../../src/server/lib/db/schema/modules');
  private static readonly DB_INDEX_PATH = path.resolve(__dirname, '../../../src/server/lib/db/index.ts');
  
  // Core fields that should not be duplicated by user-defined fields
  private static readonly CORE_FIELDS = new Set(['id', 'tenantId', 'name', 'description', 'isActive', 'createdAt', 'updatedAt']);
  
  // Delimited section markers for safe index.ts integration
  private static readonly MODULE_IMPORTS_BEGIN = '// BEGIN MODULE SCHEMAS IMPORTS';
  private static readonly MODULE_IMPORTS_END = '// END MODULE SCHEMAS IMPORTS';
  private static readonly MODULE_EXPORTS_BEGIN = '// BEGIN MODULE SCHEMAS EXPORTS';
  private static readonly MODULE_EXPORTS_END = '// END MODULE SCHEMAS EXPORTS';

  /**
   * Integrates a generated module schema into the existing database setup
   */
  static async integrateModuleSchema(config: ModuleSchemaConfig): Promise<void> {
    try {
      console.log(`🔧 Integrating database schema for module: ${config.moduleName}`);
      
      // 1. Create modules schema directory if it doesn't exist
      await this.ensureModulesSchemaDirectory();
      
      // 2. Generate the module schema file
      await this.generateModuleSchemaFile(config);
      
      // 3. Update database index to include module schemas
      await this.updateDatabaseIndex();
      
      // 4. Run database push to create tables
      await this.runDatabasePush();
      
      console.log(`✅ Database schema integration completed for module: ${config.moduleName}`);
    } catch (error) {
      console.error(`❌ Failed to integrate database schema for module ${config.moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Creates the modules schema directory if it doesn't exist
   */
  private static async ensureModulesSchemaDirectory(): Promise<void> {
    try {
      await fs.access(this.MODULES_SCHEMA_DIR);
    } catch {
      await fs.mkdir(this.MODULES_SCHEMA_DIR, { recursive: true });
      console.log(`📁 Created modules schema directory: ${this.MODULES_SCHEMA_DIR}`);
    }
  }

  /**
   * Generates the module schema file with proper Drizzle ORM schema definitions
   */
  private static async generateModuleSchemaFile(config: ModuleSchemaConfig): Promise<void> {
    const { moduleId, entityName, entityNamePlural, entityNameCamel, fields = [] } = config;
    
    // Filter out fields that conflict with core fields
    const validFields = fields.filter(field => {
      if (this.CORE_FIELDS.has(field.name)) {
        console.warn(`⚠️  Skipping field '${field.name}' as it conflicts with core field`);
        return false;
      }
      return true;
    });
    
    // Generate field definitions
    const fieldDefinitions = validFields.map(field => {
      switch (field.type) {
        case 'string':
          const length = field.length || 255;
          return `  ${field.name}: varchar('${field.name}', { length: ${length} })${field.required ? '.notNull()' : ''},`;
        case 'number':
          return `  ${field.name}: integer('${field.name}')${field.required ? '.notNull()' : ''},`;
        case 'boolean':
          return `  ${field.name}: boolean('${field.name}').default(false),`;
        case 'date':
          return `  ${field.name}: timestamp('${field.name}')${field.required ? '.notNull()' : ''},`;
        default:
          return `  ${field.name}: varchar('${field.name}', { length: 255 }),`;
      }
    }).join('\n');

    // Generate unique indexes for valid unique fields
    const uniqueIndexes = validFields
      .filter(field => field.unique)
      .map(field => `uniqueIndex("${entityNamePlural}_${field.name}_unique_idx").on(t.tenantId, t.${field.name})`)
      .join(',\n    ');

    const schemaContent = `import { relations, sql } from 'drizzle-orm';
import { boolean, integer, pgTable, uniqueIndex, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenant } from '../system';

export const ${entityNamePlural} = pgTable('${entityNamePlural}', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  
  // Core business fields
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  
${fieldDefinitions ? fieldDefinitions + '\n' : ''}
  
  // Standard audit fields
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("${entityNamePlural}_name_unique_idx").on(t.tenantId, t.name)${uniqueIndexes ? ',\n  ' + uniqueIndexes : ''}
]);

// Relations
export const ${entityNamePlural}Relations = relations(${entityNamePlural}, ({ one }) => ({
  tenant: one(tenant, {
    fields: [${entityNamePlural}.tenantId],
    references: [tenant.id],
  }),
}));

// Types
export type ${entityName} = typeof ${entityNamePlural}.$inferSelect;
export type New${entityName} = typeof ${entityNamePlural}.$inferInsert;
`;

    const schemaFilePath = path.join(this.MODULES_SCHEMA_DIR, `${moduleId}.ts`);
    await fs.writeFile(schemaFilePath, schemaContent);
    console.log(`📄 Generated schema file: ${schemaFilePath}`);
  }

  /**
   * Updates the main database index.ts to include module schemas using delimited sections
   */
  private static async updateDatabaseIndex(): Promise<void> {
    const indexPath = this.DB_INDEX_PATH;
    
    try {
      // Read current index file
      let currentContent = await fs.readFile(indexPath, 'utf-8');
      
      // Generate imports for all module schema files
      const moduleFiles = await this.getModuleSchemaFiles();
      
      if (moduleFiles.length === 0) {
        console.log(`ℹ️  No module schemas found, cleaning up delimited sections`);
        currentContent = this.removeDelimitedSections(currentContent);
        await fs.writeFile(indexPath, currentContent);
        return;
      }
      
      const moduleImports = moduleFiles.map(file => {
        const moduleName = file.replace('.ts', '');
        // Convert hyphen-containing names to valid JavaScript identifiers
        const validVarName = moduleName.replace(/[-]/g, '_');
        return `import * as ${validVarName}Schema from './schema/modules/${moduleName}';`;
      }).join('\n');
      
      // Generate module schema exports
      const moduleExports = moduleFiles.map(file => {
        const moduleName = file.replace('.ts', '');
        const validVarName = moduleName.replace(/[-]/g, '_');
        return `...${validVarName}Schema`;
      }).join(', ');
      
      // Update imports section
      currentContent = this.updateDelimitedSection(
        currentContent,
        this.MODULE_IMPORTS_BEGIN,
        this.MODULE_IMPORTS_END,
        moduleImports,
        'after',
        /import \* as masterSchema from '\.?\/?schema\/master';/
      );
      
      // Update schema exports section
      currentContent = this.updateDelimitedSection(
        currentContent,
        this.MODULE_EXPORTS_BEGIN,
        this.MODULE_EXPORTS_END,
        moduleExports,
        'inside',
        /const schema = \{ \.\.\.systemSchema, \.\.\.masterSchema(.*?) \};/
      );
      
      await fs.writeFile(indexPath, currentContent);
      console.log(`✅ Updated database index to include ${moduleFiles.length} module schemas`);
    } catch (error) {
      console.error(`❌ Failed to update database index:`, error);
      throw error;
    }
  }

  /**
   * Gets all module schema files
   */
  private static async getModuleSchemaFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.MODULES_SCHEMA_DIR);
      return files.filter(file => file.endsWith('.ts'));
    } catch {
      return [];
    }
  }

  /**
   * Runs npm run db:push with production safety checks
   */
  private static async runDatabasePush(): Promise<void> {
    try {
      // Production safety check
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          '🚨 Database push operations are disabled in production environment. ' +
          'Please use proper migration tools in production.'
        );
      }
      
      console.log(`🚀 Running database push to create tables...`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // First try without --force to respect data integrity
      let command = 'npm run db:push';
      let { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 60000 // 60 second timeout
      });
      
      // If stderr contains data loss warning and we're in development, retry with --force
      if (stderr && stderr.includes('data loss') && process.env.NODE_ENV !== 'production') {
        console.log(`⚠️  Data loss detected, retrying with --force in development environment...`);
        command = 'npm run db:push --force';
        const result = await execAsync(command, {
          cwd: process.cwd(),
          timeout: 60000
        });
        stdout = result.stdout;
        stderr = result.stderr;
      }
      
      if (stderr && !stderr.includes('Warning') && !stderr.includes('data loss')) {
        console.warn(`⚠️  Database push stderr: ${stderr}`);
      }
      
      console.log(`✅ Database push completed successfully`);
      if (stdout) {
        console.log(`📋 Database push output: ${stdout.split('\n').slice(-3).join('\n')}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to run database push:`, error.message);
      throw error;
    }
  }

  /**
   * Removes a module schema and updates the database
   */
  static async removeModuleSchema(moduleId: string): Promise<void> {
    try {
      console.log(`🗑️  Removing database schema for module: ${moduleId}`);
      
      // Remove schema file
      const schemaFilePath = path.join(this.MODULES_SCHEMA_DIR, `${moduleId}.ts`);
      await fs.unlink(schemaFilePath).catch(() => {}); // Ignore if file doesn't exist
      
      // Update database index
      await this.updateDatabaseIndex();
      
      console.log(`✅ Module schema removed: ${moduleId}`);
    } catch (error) {
      console.error(`❌ Failed to remove module schema:`, error);
      throw error;
    }
  }

  /**
   * Lists all integrated module schemas
   */
  static async listModuleSchemas(): Promise<string[]> {
    try {
      const files = await this.getModuleSchemaFiles();
      return files.map(file => file.replace('.ts', ''));
    } catch {
      return [];
    }
  }

  /**
   * Helper method to update or create delimited sections in file content
   */
  private static updateDelimitedSection(
    content: string,
    beginMarker: string,
    endMarker: string,
    newContent: string,
    insertType: 'after' | 'inside',
    targetPattern?: RegExp
  ): string {
    const beginIndex = content.indexOf(beginMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (beginIndex !== -1 && endIndex !== -1) {
      // Section exists, replace content
      const before = content.substring(0, beginIndex + beginMarker.length);
      const after = content.substring(endIndex);
      return `${before}\n${newContent}\n${after}`;
    }
    
    // Section doesn't exist, create it
    if (insertType === 'after' && targetPattern) {
      const match = content.match(targetPattern);
      if (match) {
        const insertPosition = content.indexOf(match[0]) + match[0].length;
        const before = content.substring(0, insertPosition);
        const after = content.substring(insertPosition);
        return `${before}\n${beginMarker}\n${newContent}\n${endMarker}${after}`;
      }
    }
    
    if (insertType === 'inside' && targetPattern) {
      const match = content.match(targetPattern);
      if (match) {
        // For schema exports, we need to modify the existing schema definition
        const fullMatch = match[0];
        const existingContent = match[1] || '';
        const newSchemaLine = fullMatch.replace(
          /\{ \.\.\.systemSchema, \.\.\.masterSchema(.*?) \}/,
          `{ ...systemSchema, ...masterSchema, ${newContent} }`
        );
        return content.replace(fullMatch, newSchemaLine);
      }
    }
    
    return content;
  }

  /**
   * Helper method to remove delimited sections from file content
   */
  private static removeDelimitedSections(content: string): string {
    // Remove module imports section
    const importsBeginIndex = content.indexOf(this.MODULE_IMPORTS_BEGIN);
    const importsEndIndex = content.indexOf(this.MODULE_IMPORTS_END);
    
    if (importsBeginIndex !== -1 && importsEndIndex !== -1) {
      const before = content.substring(0, importsBeginIndex);
      const after = content.substring(importsEndIndex + this.MODULE_IMPORTS_END.length);
      content = before + after;
    }
    
    // Remove module exports section
    const exportsBeginIndex = content.indexOf(this.MODULE_EXPORTS_BEGIN);
    const exportsEndIndex = content.indexOf(this.MODULE_EXPORTS_END);
    
    if (exportsBeginIndex !== -1 && exportsEndIndex !== -1) {
      const before = content.substring(0, exportsBeginIndex);
      const after = content.substring(exportsEndIndex + this.MODULE_EXPORTS_END.length);
      content = before + after;
    }
    
    // Clean up any leftover whitespace or empty lines
    return content.replace(/\n\s*\n\s*\n/g, '\n\n');
  }
}