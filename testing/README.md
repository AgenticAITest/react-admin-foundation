# Business Analyst Testing Framework

This directory contains the Playwright MCP testing framework designed for business analysts to validate modules and business workflows.

## Quick Start

### Run All Tests
```bash
# From the root project directory
./testing/run-tests.sh
```

### Run Specific Test Suites
```bash
cd testing
npx playwright test --config=playwright-mcp.config.ts car-dealership.spec.ts
npx playwright test --config=playwright-mcp.config.ts module-hotswap.spec.ts
npx playwright test --config=playwright-mcp.config.ts natural-language.spec.ts
```

## Business Analyst Workflow

### 1. Natural Language Testing
Business analysts can describe tests in plain English:

```javascript
// Example: "Create a new customer named John Doe with email john@example.com"
const scenario = "Create a new customer named John Doe with email john@example.com";
const parsed = NaturalLanguageInterpreter.parseAction(scenario);
// Automatically converts to executable test actions
```

### 2. Module Testing
Test your modules with simple helpers:

```javascript
const helpers = new BusinessAnalystHelpers(page);

// Login and navigate
await helpers.loginAsSuperAdmin();
await helpers.navigateToModule('Inventory');

// Test CRUD operations
await helpers.createRecord('Product', {
  name: 'Toyota Camry',
  price: '25000'
});
```

### 3. Business Workflow Testing
Test complete business processes:

```javascript
// Car Dealership Sales Workflow
await helpers.createRecord('Customer', { name: 'Alice', email: 'alice@example.com' });
await helpers.createRecord('Vehicle', { make: 'Ford', model: 'F-150' });
await helpers.createRecord('Sale', { customer: 'Alice', vehicle: 'Ford F-150' });
```

## Test Categories

### Module Hotswap Tests (`module-hotswap.spec.ts`)
- Export/import module workflows
- Zero-downtime deployment validation
- Module status and health checks
- Security validation

### Car Dealership Tests (`car-dealership.spec.ts`)
- Customer management workflows
- Vehicle inventory management
- Sales process validation
- Tenant data isolation

### Natural Language Tests (`natural-language.spec.ts`)
- Business scenario interpretation
- Natural language to test action conversion
- Business workflow automation

## Configuration

### Environment Variables
Set these for security:
```bash
export TEST_ADMIN_USERNAME="your-admin-username"
export TEST_ADMIN_PASSWORD="your-admin-password"
export REPL_URL="http://localhost:5000"
```

### Browser Configuration
The framework uses headless Chromium optimized for Replit environment.

## Reports

After running tests, reports are available in:
- `test-results/results.json` - JSON test results
- `test-results/junit.xml` - JUnit XML for CI/CD
- `playwright-report/index.html` - HTML report

## Writing New Tests

### For Business Analysts
1. Use the `BusinessAnalystHelpers` class for common actions
2. Write tests in natural language first, then implement
3. Focus on business workflows, not technical implementation
4. Test both positive and negative scenarios

### Example Business Test
```javascript
test('car dealership: complete sale process', async ({ page }) => {
  const helpers = new BusinessAnalystHelpers(page);
  await helpers.loginAsSuperAdmin();
  
  // Business workflow: Customer walks in, finds car, completes purchase
  await helpers.navigateToModule('Customers');
  await helpers.createRecord('Customer', {
    name: 'John Smith',
    email: 'john@example.com'
  });
  
  await helpers.navigateToModule('Inventory');
  await helpers.createRecord('Vehicle', {
    make: 'Toyota',
    model: 'Camry',
    price: '25000'
  });
  
  await helpers.navigateToModule('Sales');
  await helpers.createRecord('Sale', {
    customer: 'John Smith',
    vehicle: 'Toyota Camry',
    finalPrice: '24500'
  });
  
  // Verify sale appears in reports
  await expect(page.locator('text=John Smith')).toBeVisible();
});
```

## Integration with Module Development

### Export/Import Testing
```javascript
// Export module for modification
const modulePackage = await helpers.exportModule('inventory');

// Modify module (business analyst makes changes)
modulePackage.version = '1.1.0';
modulePackage.config.description = 'Updated for car dealership';

// Import updated module
await helpers.importModule(modulePackage);

// Verify update was successful
await helpers.hotswapModule('inventory');
```

## Troubleshooting

### Common Issues
1. **Browser not found**: Ensure Chromium is installed in system dependencies
2. **Auth failures**: Verify TEST_ADMIN_USERNAME and TEST_ADMIN_PASSWORD
3. **Timeout errors**: Increase actionTimeout in config if needed
4. **Module not found**: Ensure server is running on port 5000

### Debug Mode
```bash
cd testing
npx playwright test --config=playwright-mcp.config.ts --debug
```

This opens Playwright Inspector for step-by-step debugging.