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

  const trimmedInput = input.trim();

  // Handle sysadmin special case (no domain) - case insensitive
  if (trimmedInput.toLowerCase() === 'sysadmin') {
    return { username: 'sysadmin', domain: null }; // Always return lowercase for consistency
  }

  // Parse email-like format for tenant users
  const emailPattern = /^([^@]+)@([^@]+)$/;
  const match = trimmedInput.match(emailPattern);

  if (!match) {
    throw new Error('Invalid credentials'); // Generic error for security
  }

  const [, username, domain] = match;
  return {
    username: username.trim(), // Preserve original case for username
    domain: domain.toLowerCase().trim() // Only lowercase the domain
  };
}

/**
 * Find tenant by domain name, with fallback to legacy tenant code lookup
 * @param domain - Domain name (e.g., techcorp.com) or legacy tenant code
 * @returns Tenant record or null if not found
 */
export async function findTenantByDomain(domain: string): Promise<TenantLookupResult | null> {
  if (!domain) {
    return null;
  }

  try {
    // First try to find by domain (new format)
    const [domainRecord] = await db
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

    if (domainRecord) {
      return domainRecord;
    }

    // Fallback: try to find by tenant code (legacy format)
    const [codeRecord] = await db
      .select({
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        domain: tenant.domain,
        schemaName: tenant.schemaName
      })
      .from(tenant)
      .where(and(
        eq(tenant.code, domain.toUpperCase()),
        eq(tenant.status, 'active')
      ))
      .limit(1);

    return codeRecord || null;
  } catch (error) {
    console.error('Error finding tenant by domain/code:', error);
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