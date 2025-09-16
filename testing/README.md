# Business Analyst Testing Framework

This directory contains the Replit native testing framework designed for business analysts to validate modules and business workflows using Replit Agent App Testing and unit testing capabilities.

## Quick Start

### Run All Tests
```bash
# From the root project directory
./testing/run-tests.sh
```

### Run Specific Test Suites
```bash
cd testing
npm test car-dealership
npm test module-hotswap
npm test natural-language
```

### Use Replit Agent App Testing
1. Enable **App Testing** in the Agent Tools panel
2. Ask Replit Agent to test your application workflows
3. Review video replays of testing sessions for insights

## Business Analyst Workflow

### 1. AI-Powered App Testing
Business analysts can request testing in natural language:

```
"Test the car dealership customer creation workflow"
"Validate that inventory items can be added and searched"
"Test the complete sales process from customer to final sale"
```

Replit Agent will automatically:
- Navigate your application like a real user
- Test forms, buttons, and workflows
- Identify and report issues
- Provide video replays of testing sessions

### 2. Module Testing
Test your modules with unit tests and API validation:

```javascript
// Unit test example
test('should create customer', async () => {
  const customer = await createCustomer({
    name: 'John Doe',
    email: 'john@example.com'
  });
  expect(customer.id).toBeDefined();
  expect(customer.name).toBe('John Doe');
});
```

### 3. Business Workflow Testing
Combine AI testing with unit tests for complete validation:

1. **Replit Agent Testing**: "Test the complete car sales workflow"
2. **Unit Tests**: Validate business logic and data integrity
3. **API Tests**: Verify module endpoints and security

## Test Categories

### AI-Powered App Testing (Replit Agent)
- Complete business workflow validation
- User interface interaction testing
- Automatic issue detection and reporting
- Visual feedback through video replays

### Module Hotswap Tests (`module-hotswap.test.js`)
- Export/import module workflows
- Zero-downtime deployment validation
- Module status and health checks
- Security validation

### Car Dealership Tests (`car-dealership.test.js`)
- Customer management workflows
- Vehicle inventory management
- Sales process validation
- Tenant data isolation

### Unit Testing (`*.test.js`)
- Business logic validation
- API endpoint testing
- Data integrity verification
- Module functionality testing

## Configuration

### Environment Variables
Set these for testing:
```bash
export TEST_ADMIN_USERNAME="your-admin-username"
export TEST_ADMIN_PASSWORD="your-admin-password"
export NODE_ENV="test"
```

### Replit Agent Configuration
Enable App Testing in your Replit environment:
1. Open Agent Tools panel
2. Enable "App Testing" feature
3. Configure testing frequency and scope

## Reports

After running tests, reports are available in:
- `test-results/results.json` - JSON test results
- `test-results/junit.xml` - JUnit XML for CI/CD
- Replit Agent video replays - Interactive testing session recordings

## Writing New Tests

### For Business Analysts
1. Use the `BusinessAnalystHelpers` class for common actions
2. Write tests in natural language first, then implement
3. Focus on business workflows, not technical implementation
4. Test both positive and negative scenarios

### Example Business Test

**Using Replit Agent:**
```
Ask Agent: "Test the car dealership sales workflow - create a customer, add a vehicle to inventory, and complete a sale"
```

**Using Unit Tests:**
```javascript
test('car dealership: complete sale process', async () => {
  // Test business logic
  const customer = await createCustomer({
    name: 'John Smith',
    email: 'john@example.com'
  });
  
  const vehicle = await createVehicle({
    make: 'Toyota',
    model: 'Camry',
    price: 25000
  });
  
  const sale = await createSale({
    customerId: customer.id,
    vehicleId: vehicle.id,
    finalPrice: 24500
  });
  
  expect(sale.id).toBeDefined();
  expect(sale.finalPrice).toBe(24500);
});
```

## Integration with Module Development

### Export/Import Testing

**Using Replit Agent:**
```
Ask Agent: "Test module export and import functionality - export the inventory module, verify the package structure, and test importing it back"
```

**Using API Tests:**
```javascript
test('module export/import workflow', async () => {
  // Test module export API
  const exportResponse = await fetch('/api/system/modules/export/inventory');
  expect(exportResponse.status).toBe(200);
  
  const modulePackage = await exportResponse.json();
  expect(modulePackage.id).toBe('inventory');
  
  // Test module import API
  const importResponse = await fetch('/api/system/modules/import', {
    method: 'POST',
    body: JSON.stringify(modulePackage)
  });
  expect(importResponse.status).toBe(200);
});
```

## Troubleshooting

### Common Issues
1. **App Testing not working**: Ensure App Testing is enabled in Agent Tools panel
2. **Auth failures**: Verify TEST_ADMIN_USERNAME and TEST_ADMIN_PASSWORD
3. **Test failures**: Check server is running on port 5000
4. **Module not found**: Ensure modules are properly deployed and discovered

### Debug Mode
```bash
cd testing
npm test -- --verbose
```

Or use Replit Agent's interactive testing mode for real-time debugging.