import { test, expect } from '@playwright/test';
import { BusinessAnalystHelpers, NaturalLanguageInterpreter } from './business-analyst-helpers';

/**
 * Natural Language Business Analyst Tests
 * Example of how business analysts can write tests in plain English
 */
test.describe('Natural Language Business Tests', () => {
  let helpers: BusinessAnalystHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new BusinessAnalystHelpers(page);
    await helpers.loginAsSuperAdmin();
  });

  test('interpret business scenario: create customer', async ({ page }) => {
    // Business Analyst writes: "Create a new customer named Test Customer with email test@example.com"
    const scenario = "Create a new customer named Test Customer with email test@example.com";
    const parsed = NaturalLanguageInterpreter.parseAction(scenario);
    
    expect(parsed.action).toBe('create');
    expect(parsed.target).toBe('customer');
    
    // Execute the interpreted action
    await helpers.navigateToModule('Customers');
    await helpers.createRecord('Customer', {
      name: 'Test Customer',
      email: 'test@example.com'
    });
    
    // Verify result
    await expect(page.locator('text=Test Customer')).toBeVisible();
  });

  test('interpret business scenario: export module', async ({ page }) => {
    // Business Analyst writes: "Export the inventory module for modification"
    const scenario = "Export the inventory module for modification";
    const parsed = NaturalLanguageInterpreter.parseAction(scenario);
    
    expect(parsed.action).toBe('exportModule');
    expect(parsed.target).toBe('inventory');
    
    // Execute the interpreted action
    const modulePackage = await helpers.exportModule('inventory');
    expect(modulePackage).toHaveProperty('id', 'inventory');
  });

  test('interpret business scenario: switch tenant', async ({ page }) => {
    // Business Analyst writes: "Switch to Public tenant to test data isolation"
    const scenario = "Switch to Public tenant to test data isolation";
    const parsed = NaturalLanguageInterpreter.parseAction(scenario);
    
    expect(parsed.action).toBe('switchTenant');
    expect(parsed.target).toBe('Public');
    
    // Execute the interpreted action
    await helpers.switchTenant('Public');
    await expect(page.locator('.current-tenant')).toContainText('Public');
  });

});

/**
 * Business Workflow Tests in Natural Language Style
 */
test.describe('Business Workflows (Natural Language Style)', () => {
  let helpers: BusinessAnalystHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new BusinessAnalystHelpers(page);
    await helpers.loginAsSuperAdmin();
  });

  test('Car Dealership: Complete sales workflow', async ({ page }) => {
    /*
    Business Analyst Description:
    "Test that I can complete a full car sale process:
    1. Add a customer 
    2. Add a vehicle to inventory
    3. Create a sale record
    4. Verify the sale appears in the sales report"
    */
    
    // Step 1: Add customer
    await helpers.navigateToModule('Customers');
    await helpers.createRecord('Customer', {
      name: 'Alice Cooper',
      email: 'alice@example.com',
      phone: '(555) 111-2222'
    });
    
    // Step 2: Add vehicle  
    await helpers.navigateToModule('Inventory');
    await helpers.createRecord('Vehicle', {
      make: 'Ford',
      model: 'F-150',
      year: '2024',
      price: '35000'
    });
    
    // Step 3: Create sale
    await helpers.navigateToModule('Sales');
    await helpers.createRecord('Sale', {
      customer: 'Alice Cooper',
      vehicle: 'Ford F-150 2024',
      salePrice: '34000'
    });
    
    // Step 4: Verify in sales report
    await page.click('text=Sales Report');
    await expect(page.locator('text=Alice Cooper')).toBeVisible();
    await expect(page.locator('text=Ford F-150')).toBeVisible();
    await expect(page.locator('text=$34,000')).toBeVisible();
  });

  test('Car Rental: Complete rental workflow', async ({ page }) => {
    /*
    Business Analyst Description:
    "Test the car rental process:
    1. Add a rental vehicle to fleet
    2. Create a customer reservation
    3. Process vehicle pickup
    4. Handle vehicle return"
    */
    
    // Step 1: Add rental vehicle
    await helpers.navigateToModule('Fleet');
    await helpers.createRecord('Vehicle', {
      make: 'Nissan',
      model: 'Altima',
      year: '2023',
      dailyRate: '45',
      status: 'Available'
    });
    
    // Step 2: Create reservation
    await helpers.navigateToModule('Reservations');
    await helpers.createRecord('Reservation', {
      customer: 'Bob Johnson',
      vehicle: 'Nissan Altima 2023',
      startDate: '2024-03-01',
      endDate: '2024-03-05',
      totalCost: '180'
    });
    
    // Step 3: Process pickup
    await page.click('text=Bob Johnson');
    await page.click('text=Mark Picked Up');
    await expect(page.locator('text=Picked Up')).toBeVisible();
    
    // Step 4: Handle return (simulate)
    await page.click('text=Process Return');
    await page.fill('[name="endingMileage"]', '12500');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Returned')).toBeVisible();
  });

});