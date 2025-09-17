/**
 * Login input parsing utilities for Phase 5b - Domain-based login system
 * Supports both sysadmin (no domain) and username@domain.com formats
 */

import { db } from '../db';
import { tenant } from '../db/schema/system';
import { eq, and } from 'drizzle-orm';

export interface ParsedLoginInput {
  username: string;
  domain: string | null;
}

export interface TenantLookupResult {
  id: string;
  code: string;
  name: string;
  domain: string;
  schemaName: string;
}

/**
 * Parse login input to handle both sysadmin and username@domain.com formats
 * @param input - Login input string
 * @returns Parsed username and domain (null for sysadmin)
 */
export function parseLoginInput(input: string): ParsedLoginInput {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid credentials');
  }

  // Handle sysadmin special case (no domain)
  if (input === 'sysadmin') {
    return { username: 'sysadmin', domain: null };
  }

  // Parse email-like format for tenant users
  const emailPattern = /^([^@]+)@([^@]+)$/;
  const match = input.match(emailPattern);

  if (!match) {
    throw new Error('Invalid credentials'); // Generic error for security
  }

  const [, username, domain] = match;
  return {
    username: username.toLowerCase(),
    domain: domain.toLowerCase()
  };
}

/**
 * Find tenant by domain name
 * @param domain - Domain name (e.g., techcorp.com)
 * @returns Tenant record or null if not found
 */
export async function findTenantByDomain(domain: string): Promise<TenantLookupResult | null> {
  if (!domain) {
    return null;
  }

  try {
    const [tenantRecord] = await db
      .select({
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        domain: tenant.domain,
        schemaName: tenant.schemaName
      })
      .from(tenant)
      .where(and(
        eq(tenant.domain, domain.toLowerCase()),
        eq(tenant.status, 'active')
      ))
      .limit(1);

    return tenantRecord || null;
  } catch (error) {
    console.error('Error finding tenant by domain:', error);
    return null;
  }
}

/**
 * Convert domain-based username to the stored format
 * @param username - Username part (e.g., 'admin')
 * @param tenantCode - Tenant code (e.g., 'TECHCORP')
 * @returns Stored username format (e.g., 'admin@TECHCORP')
 */
export function buildStoredUsername(username: string, tenantCode: string): string {
  return `${username}@${tenantCode}`;
}