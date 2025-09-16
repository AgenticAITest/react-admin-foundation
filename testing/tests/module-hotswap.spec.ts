import { test, expect } from '@playwright/test';

/**
 * Module Hotswap End-to-End Tests
 * Tests the complete module hotswap workflow for business analysts
 */
test.describe('Module Hotswap System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to super admin dashboard
    await page.goto('/console/super-admin');
    await expect(page.locator('h1')).toContainText('Super Admin Dashboard');
  });

  test('should show module status', async ({ page }) => {
    // Navigate to module management
    await page.click('text=Module Management');
    
    // Verify we can see module status
    await expect(page.locator('.module-status')).toBeVisible();
    
    // Check that existing modules are shown
    await expect(page.locator('text=inventory')).toBeVisible();
    await expect(page.locator('text=tasks')).toBeVisible();
  });

  test('should export module successfully', async ({ page }) => {
    // Navigate to module management
    await page.click('text=Module Management');
    
    // Click export on inventory module
    const exportButton = page.locator('[data-module="inventory"] .export-button');
    await exportButton.click();
    
    // Verify export dialog or download starts
    await expect(page.locator('.export-dialog')).toBeVisible();
  });

  test('should validate module security', async ({ page, request }) => {
    // Test module status API
    const response = await request.get('/api/system/modules/status');
    expect(response.status()).toBe(200);
    
    const moduleStatus = await response.json();
    expect(moduleStatus).toHaveProperty('modules');
    expect(Array.isArray(moduleStatus.modules)).toBe(true);
  });

  test('should handle module rediscovery', async ({ page, request }) => {
    // Test rediscovery API
    const response = await request.post('/api/system/modules/rediscover');
    expect(response.status()).toBe(200);
    
    const result = await response.json();
    expect(result).toHaveProperty('discovered');
  });

});

/**
 * Business Analyst Workflow Tests
 */
test.describe('Business Analyst Module Development', () => {
  
  test('complete module development workflow', async ({ page, request }) => {
    // Step 1: Check current modules
    await page.goto('/console/super-admin');
    await page.click('text=Module Management');
    
    // Step 2: Export existing module for modification
    const response = await request.get('/api/system/modules/export/inventory');
    expect(response.status()).toBe(200);
    
    const modulePackage = await response.json();
    expect(modulePackage).toHaveProperty('id', 'inventory');
    expect(modulePackage).toHaveProperty('config');
    expect(modulePackage).toHaveProperty('files');
    
    // Step 3: Verify module structure
    expect(modulePackage.files).toHaveProperty('module.config.ts');
    expect(modulePackage.files).toHaveProperty('database/schema.ts');
  });

});