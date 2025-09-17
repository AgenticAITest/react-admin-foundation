/**
 * Utility functions for tenant schema generation and domain validation
 */

/**
 * Generate schema name from domain
 * Converts domain to valid PostgreSQL schema name
 * @param domain - Domain name (e.g., "acme-corp")
 * @returns Schema name (e.g., "tenant_acme_corp")
 */
export const generateSchemaName = (domain: string): string => {
  // Convert domain to valid PostgreSQL schema name
  // Replace non-alphanumeric characters with underscores and make lowercase
  const cleanDomain = domain.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // PostgreSQL identifier limit is 63 bytes, reserve 7 for "tenant_" prefix
  const maxDomainLength = 63 - 7;
  const truncatedDomain = cleanDomain.substring(0, maxDomainLength);
  
  // Ensure domain part is not empty after cleaning
  if (!truncatedDomain) {
    throw new Error('Domain must contain at least one alphanumeric character');
  }
  
  return `tenant_${truncatedDomain}`;
};

/**
 * Validate domain name format
 * @param domain - Domain name to validate
 * @returns true if valid, false otherwise
 */
export const validateDomainName = (domain: string): boolean => {
  // Domain must be 2-50 characters, lowercase letters, numbers, and hyphens only
  // Cannot start or end with hyphen, cannot have consecutive hyphens
  const validFormat = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(domain);
  const validLength = domain.length >= 2 && domain.length <= 50;
  const noConsecutiveHyphens = !domain.includes('--');
  
  return validFormat && validLength && noConsecutiveHyphens;
};

/**
 * Check if domain name is reserved (system domains that cannot be used by tenants)
 * @param domain - Domain name to check
 * @returns true if reserved, false if available
 */
export const isReservedDomain = (domain: string): boolean => {
  const reservedDomains = [
    // Existing tenant domains
    'system',
    'public',
    
    // Administrative domains
    'admin',
    'superadmin',
    'root',
    'default',
    
    // System and API domains
    'api',
    'www',
    'app',
    'mail',
    'ftp',
    
    // Database related
    'database',
    'db',
    'cache',
    'redis',
    'postgres',
    'mysql',
    
    // PostgreSQL system schemas
    'pg',
    'pg-catalog',
    'information-schema',
    
    // Environment domains
    'localhost',
    'staging',
    'production',
    'dev',
    'development',
    'test',
    'testing'
  ];
  
  return reservedDomains.includes(domain.toLowerCase());
};

/**
 * Comprehensive domain validation including format and reserved checks
 * @param domain - Domain name to validate
 * @returns object with validation result and error message if invalid
 */
export const validateDomain = (domain: string): { isValid: boolean; error?: string } => {
  if (!domain || typeof domain !== 'string') {
    return { isValid: false, error: 'Domain is required' };
  }

  if (!validateDomainName(domain)) {
    return { 
      isValid: false, 
      error: 'Domain must be 2-50 characters with lowercase letters, numbers, and hyphens only. Cannot start/end with hyphen or contain consecutive hyphens.' 
    };
  }

  if (isReservedDomain(domain)) {
    return { 
      isValid: false, 
      error: 'This domain name is reserved and cannot be used' 
    };
  }

  return { isValid: true };
};

/**
 * Generate a suggested domain from tenant name
 * @param tenantName - Tenant name
 * @returns Suggested domain name
 */
export const suggestDomainFromName = (tenantName: string): string => {
  return tenantName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit to 50 characters
};