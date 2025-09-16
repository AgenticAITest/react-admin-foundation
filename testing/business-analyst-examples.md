# Business Analyst Testing Examples with Playwright MCP

This file contains natural language testing examples that business analysts can use with Playwright MCP to validate their modules.

## 🏠 Foundation Testing Examples

### Authentication & Authorization
```
"Test that I can login as a super admin with username 'sysadmin' and password 'S3cr3T' and see the admin dashboard"

"Verify that regular users cannot access the super admin console and get redirected to their normal dashboard"

"Test that when I logout, I'm redirected to the login page and cannot access protected areas"
```

### Module Management
```
"Navigate to the module management section and verify I can see the inventory and tasks modules with their status"

"Test that I can export the inventory module and get a downloadable package file"

"Verify that the module status API shows both modules as 'mounted' and 'healthy'"
```

### Multi-Tenant Functionality
```
"Create a test task in the System tenant and verify it doesn't appear when I switch to the Public tenant"

"Test that user data is properly isolated between different tenants"

"Verify that when I create a new tenant, all module tables are automatically created"
```

## 🚗 Car Dealership Module Examples

### Customer Management
```
"Test that a sales manager can add a new customer with name, phone, and email, and the customer appears in the customer list"

"Verify that customer information can be edited and the changes are saved correctly"

"Test that deleted customers are removed from the system and cannot be found in searches"
```

### Vehicle Inventory
```
"Add a new vehicle with make 'Toyota', model 'Camry', year '2024', price '$25000' and verify it appears in inventory"

"Test that I can search for vehicles by make and only matching vehicles are shown"

"Verify that when a vehicle is sold, its status changes and it's marked as unavailable"
```

### Sales Process
```
"Test the complete sales workflow: create customer, show available vehicles, select vehicle, create sale record"

"Verify that when a sale is completed, the vehicle status updates and commission is calculated"

"Test that sales reports show accurate totals and can be filtered by date range"
```

## 🚙 Car Rental Module Examples

### Fleet Management
```
"Add a rental vehicle with license plate 'ABC-123', make 'Honda', model 'Civic', and daily rate '$45'"

"Test that vehicle availability is correctly shown on the calendar view"

"Verify that maintenance schedules can be set and vehicles are marked unavailable during service"
```

### Reservation System
```
"Create a reservation for customer John Doe from March 1st to March 5th for vehicle ABC-123"

"Test that double-booking is prevented and shows an error when trying to book an unavailable vehicle"

"Verify that reservation modifications update pricing and availability correctly"
```

### Billing & Returns
```
"Test the vehicle return process including mileage check, damage assessment, and final billing"

"Verify that late return fees are calculated correctly and added to the total"

"Test that security deposits are refunded when vehicles are returned in good condition"
```

## 🧪 System Integration Examples

### API Testing
```
"Test that all module API endpoints require proper authentication and reject requests without valid tokens"

"Verify that tenant-scoped data access works correctly and users only see their tenant's data"

"Test that module APIs return proper JSON responses and handle errors gracefully"
```

### Performance Testing
```
"Test that the dashboard loads within 3 seconds even with 100 customers and 50 vehicles"

"Verify that database queries complete quickly when testing with large datasets"

"Test that module hotswap operations complete without affecting ongoing user sessions"
```

### Error Handling
```
"Test that the system handles database connection failures gracefully and shows user-friendly error messages"

"Verify that form validation prevents invalid data entry and shows helpful error messages"

"Test that broken modules don't crash the entire system and proper fallbacks are shown"
```

## 🎯 Business Workflow Examples

### End-to-End Car Dealership
```
"Simulate a complete customer journey: browsing vehicles, scheduling test drive, negotiating price, completing purchase, scheduling delivery"

"Test the sales reporting workflow: generate monthly sales report, filter by salesperson, export to CSV"

"Verify the service department workflow: schedule maintenance, order parts, complete service, bill customer"
```

### End-to-End Car Rental
```
"Test a complete rental cycle: search availability, make reservation, pick up vehicle, extend rental, return vehicle, process payment"

"Verify the fleet maintenance workflow: schedule inspections, track repairs, manage vehicle availability"

"Test the customer loyalty program: track rental history, apply discounts, generate loyalty reports"
```

## 💡 Tips for Business Analysts

### Writing Effective Tests
- Use specific, measurable criteria (exact text, numbers, timeframes)
- Include both positive and negative test cases
- Test real business scenarios that your customers will encounter
- Verify data flows between different parts of the system

### Common Test Patterns
- **CRUD Operations**: Create, Read, Update, Delete for all business entities
- **Workflow Testing**: Complete business processes from start to finish
- **Validation Testing**: Ensure business rules are enforced
- **Integration Testing**: Verify modules work together correctly

### Best Practices
- Test with realistic data that matches your business
- Include edge cases (empty lists, maximum values, unusual inputs)
- Verify user permissions and access controls
- Test on both desktop and mobile views