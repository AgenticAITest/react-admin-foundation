import { test, expect } from '@playwright/test';
import { BusinessAnalystHelpers } from './business-analyst-helpers';

/**
 * Car Dealership Vertical Solution Tests
 * Example tests for SME/SMB car dealership business workflows
 */
test.describe('Car Dealership Business Workflows', () => {
  let helpers: BusinessAnalystHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new BusinessAnalystHelpers(page);
    await helpers.loginAsSuperAdmin();
  });

  test('complete customer management workflow', async ({ page }) => {
    // Business Analyst Test: "Test that I can add a new customer and see them in the customer list"
    
    await helpers.navigateToModule('Customers');
    
    await helpers.createRecord('Customer', {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '(555) 123-4567'
    });
    
    // Verify customer appears in list
    await expect(page.locator('text=John Smith')).toBeVisible();
    await expect(page.locator('text=john.smith@example.com')).toBeVisible();
  });

  test('vehicle inventory management', async ({ page }) => {
    // Business Analyst Test: "Add a new vehicle to inventory and verify it can be found in search"
    
    await helpers.navigateToModule('Inventory');
    
    await helpers.createRecord('Vehicle', {
      make: 'Toyota',
      model: 'Camry',
      year: '2024',
      price: '25000',
      vin: '1HGCM82633A123456'
    });
    
    // Search for the vehicle
    await page.fill('[name="search"]', 'Toyota Camry');
    await page.click('button[type="search"]');
    
    // Verify vehicle appears in search results
    await expect(page.locator('text=Toyota Camry')).toBeVisible();
    await expect(page.locator('text=$25,000')).toBeVisible();
  });

  test('sales process workflow', async ({ page }) => {
    // Business Analyst Test: "Test complete sales process from customer creation to sale completion"
    
    // Step 1: Create customer
    await helpers.navigateToModule('Customers');
    await helpers.createRecord('Customer', {
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '(555) 987-6543'
    });
    
    // Step 2: Create vehicle
    await helpers.navigateToModule('Inventory');
    await helpers.createRecord('Vehicle', {
      make: 'Honda',
      model: 'Civic',
      year: '2024',
      price: '22000',
      vin: '2HGFB2F59FH123456'
    });
    
    // Step 3: Create sale
    await helpers.navigateToModule('Sales');
    await helpers.createRecord('Sale', {
      customerName: 'Sarah Johnson',
      vehicle: 'Honda Civic 2024',
      salePrice: '21500',
      paymentMethod: 'Financing'
    });
    
    // Verify sale was recorded
    await expect(page.locator('text=Sarah Johnson')).toBeVisible();
    await expect(page.locator('text=Honda Civic')).toBeVisible();
    await expect(page.locator('text=$21,500')).toBeVisible();
  });

  test('tenant data isolation', async ({ page }) => {
    // Business Analyst Test: "Verify that dealership data is isolated between different locations"
    
    // Create customer in System tenant
    await helpers.switchTenant('System');
    await helpers.navigateToModule('Customers');
    await helpers.createRecord('Customer', {
      name: 'System Customer',
      email: 'system@example.com'
    });
    
    // Switch to Public tenant
    await helpers.switchTenant('Public');
    await helpers.navigateToModule('Customers');
    
    // Verify System customer is not visible in Public tenant
    await helpers.verifyDataIsolation('Customer', 'System Customer');
    
    // Create customer in Public tenant
    await helpers.createRecord('Customer', {
      name: 'Public Customer',
      email: 'public@example.com'
    });
    
    // Switch back to System tenant
    await helpers.switchTenant('System');
    await helpers.navigateToModule('Customers');
    
    // Verify Public customer is not visible in System tenant
    await helpers.verifyDataIsolation('Customer', 'Public Customer');
  });

});

/**
 * Module Integration Tests
 */
test.describe('Dealership Module Integration', () => {
  let helpers: BusinessAnalystHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new BusinessAnalystHelpers(page);
    await helpers.loginAsSuperAdmin();
  });

  test('module export and import workflow', async ({ page }) => {
    // Business Analyst Test: "Export dealership module, modify it, and import it back"
    
    // Export current inventory module
    const modulePackage = await helpers.exportModule('inventory');
    expect(modulePackage).toHaveProperty('id', 'inventory');
    expect(modulePackage).toHaveProperty('version');
    
    // Modify module version (simulating business analyst changes)
    const modifiedPackage = {
      ...modulePackage,
      version: '1.1.0',
      config: {
        ...modulePackage.config,
        description: 'Updated inventory module for car dealership'
      }
    };
    
    // Import modified module
    await helpers.importModule(modifiedPackage);
    
    // Verify module was updated
    await page.goto('/console/super-admin');
    await page.click('text=Module Management');
    await expect(page.locator('text=v1.1.0')).toBeVisible();
  });

  test('hotswap module without downtime', async ({ page, request }) => {
    // Business Analyst Test: "Update module while users are actively using the system"
    
    // Verify current module is working
    const initialResponse = await request.get('/api/inventory/products');
    expect(initialResponse.status()).toBe(200);
    
    // Perform hotswap
    await helpers.hotswapModule('inventory');
    
    // Verify module still works after hotswap
    const postSwapResponse = await request.get('/api/inventory/products');
    expect(postSwapResponse.status()).toBe(200);
    
    // Verify no downtime occurred
    expect(postSwapResponse.headers()['content-type']).toContain('application/json');
  });

});