# Multi-Tenant WMS Development - Granular Task Breakdown
## Foundation & RBAC Setup (Steps 8-21)

---

## STEP 10: Master Data - Inventory Items Management
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 10A: Inventory Items Backend API
**MUST ASK**: Do you want these exact API endpoints for inventory items?
**MUST PRESENT**: Complete route definitions before implementation
**TASK**: Create routes/masterData.js with EXACTLY:
- `GET /api/master-data/inventory-items` - list with pagination/search
- `POST /api/master-data/inventory-items` - create new item
- `PUT /api/master-data/inventory-items/:id` - update existing
- `DELETE /api/master-data/inventory-items/:id` - soft delete (active=false)
- ALL endpoints require authentication + tenant context middleware
- Return format: `{success, data, message, pagination}`

### STEP 10B: Inventory Items Database Operations
**MUST ASK**: Do you want these exact database query functions?
**MUST PRESENT**: Complete controller functions before implementation
**TASK**: Create controllers/masterDataController.js with EXACTLY:
- `getInventoryItems()`: SELECT with WHERE tenant_id + search/pagination
- `createInventoryItem()`: INSERT with field validation from ERD
- `updateInventoryItem()`: UPDATE with WHERE id + tenant_id
- `deleteInventoryItem()`: UPDATE active=false WHERE id + tenant_id
- Validate required fields from ERD: sku, name, inventory_type_id, package_type_id
- NO business logic beyond basic CRUD

### STEP 10C: Inventory Items Frontend Page
**MUST ASK**: Do you want this exact page layout matching PRD Tab 1?
**MUST PRESENT**: Complete component structure before creation
**TASK**: Create pages/MasterData/InventoryItems.jsx with EXACTLY:
- Page title: "Inventory Items"
- Add New Item button (top right)
- DataTable with columns: SKU, Name, Type, Package, Min Stock, Status, Actions
- Add/Edit Modal with form fields from ERD + PRD
- Form validation: required fields, positive numbers for min stock
- Success/error toasts for CRUD operations
- NO additional features beyond PRD Tab 1 specifications

---

## STEP 11: Master Data - Suppliers and Customers
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 11A: Suppliers Backend Implementation
**MUST ASK**: Do you want these exact API endpoints for suppliers?
**MUST PRESENT**: Complete supplier routes and controller functions
**TASK**: Add to masterData routes EXACTLY:
- `GET /api/master-data/suppliers` - with locations count
- `POST /api/master-data/suppliers` - create with multiple locations
- `PUT /api/master-data/suppliers/:id` - update with locations
- `DELETE /api/master-data/suppliers/:id` - soft delete if no active POs
- Controller functions for suppliers + supplier_locations tables
- Validate business rule: cannot delete if active POs exist

### STEP 11B: Customers Backend Implementation  
**MUST ASK**: Do you want these exact API endpoints for customers?
**MUST PRESENT**: Complete customer routes and controller functions
**TASK**: Add to masterData routes EXACTLY:
- `GET /api/master-data/customers` - with locations count
- `POST /api/master-data/customers` - create with multiple locations  
- `PUT /api/master-data/customers/:id` - update with locations
- `DELETE /api/master-data/customers/:id` - soft delete if no active SOs
- Controller functions for customers + customer_locations tables
- Validate business rule: cannot delete if active SOs exist

### STEP 11C: Suppliers and Customers Frontend
**MUST ASK**: Do you want these exact tabbed interfaces matching PRD Tab 4 & 5?
**MUST PRESENT**: Complete tabbed component structure
**TASK**: Create pages/MasterData/SuppliersCustomers.jsx with EXACTLY:
- Tab switching between Suppliers and Customers
- Each tab: Add button + DataTable + Add/Edit Modal
- Suppliers table: Name, Code, Contact, Email, Phone, Locations#, Status
- Customers table: Name, Code, Contact, Email, Phone, Locations#, Status  
- Modal forms with multiple location management (dynamic add/remove rows)
- Location fields: address, city, state, postal_code, lat/lng
- NO additional features beyond PRD specifications

---

## STEP 12: Warehouse Setup (4-Level Hierarchy)
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 12A: Warehouse Structure Backend
**MUST ASK**: Do you want these exact API endpoints for 4-level hierarchy?
**MUST PRESENT**: Complete warehouse routes structure
**TASK**: Create routes/warehouse.js with EXACTLY:
- `GET /api/warehouse/structure` - full hierarchy tree
- `POST /api/warehouse/zones` - create zone
- `POST /api/warehouse/aisles` - create aisle under zone
- `POST /api/warehouse/shelves` - create shelf under aisle
- `POST /api/warehouse/bins` - create bin under shelf
- `PUT /api/warehouse/:type/:id` - update any level
- `DELETE /api/warehouse/:type/:id` - soft delete any level
- Generate location_id in format: A.1.2.3 (Zone.Aisle.Shelf.Bin)

### STEP 12B: Warehouse Database Operations
**MUST ASK**: Do you want these exact database functions for hierarchy?
**MUST PRESENT**: Complete warehouseController.js functions
**TASK**: Create controllers/warehouseController.js with EXACTLY:
- `getWarehouseStructure()`: Nested query returning tree structure
- `createZone()`: INSERT into zones with warehouse_id + tenant_id
- `createAisle()`: INSERT into aisles with zone_id validation
- `createShelf()`: INSERT into shelves with aisle_id validation  
- `createBin()`: INSERT into bins with shelf_id + capacity fields
- Parent-child relationship validation before creation
- Location ID generation: concatenate parent levels

### STEP 12C: Warehouse Setup Frontend (Accordion UI)
**MUST ASK**: Do you want this exact accordion interface from PRD?
**MUST PRESENT**: Complete accordion component structure
**TASK**: Create pages/Settings/WarehouseSetup.jsx with EXACTLY:
- Accordion-style collapsible tree view
- Each level expandable: Warehouse > Zones > Aisles > Shelves > Bins
- Add child buttons at appropriate levels
- Edit in-place for names and descriptions
- Bin level: additional fields for max_weight, max_volume
- Location ID display (read-only, auto-generated)
- NO drag-and-drop or advanced tree features

---

## STEP 13: User Management and RBAC Configuration UI
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 13A: User Management Backend
**MUST ASK**: Do you want these exact user management APIs?
**MUST PRESENT**: Complete user management route definitions
**TASK**: Create routes/userManagement.js with EXACTLY:
- `GET /api/users` - list users with roles for tenant
- `POST /api/users` - create user with password hashing
- `PUT /api/users/:id` - update user (excluding password)
- `PUT /api/users/:id/password` - change password separately
- `DELETE /api/users/:id` - soft delete (active=false)
- `GET /api/roles` - list tenant roles with permission counts
- `POST /api/roles` - create role with permissions
- `PUT /api/roles/:id` - update role permissions
- `DELETE /api/roles/:id` - soft delete if no users assigned

### STEP 13B: RBAC Permission Matrix Backend
**MUST ASK**: Do you want this exact permission matrix API?
**MUST PRESENT**: Complete permission matrix endpoint structure  
**TASK**: Add to userManagement routes EXACTLY:
- `GET /api/permissions` - all system permissions grouped by category
- `GET /api/roles/:id/permissions` - role's permission matrix
- `PUT /api/roles/:id/permissions` - bulk update role permissions
- Permission levels: "manage", "view", "none" (matching PRD)
- Return permissions grouped by menu/submenu hierarchy
- Matrix format for frontend table rendering

### STEP 13C: User Management Frontend (3-Tab Interface)
**MUST ASK**: Do you want this exact 3-tab interface from PRD Section 4.3?
**MUST PRESENT**: Complete 3-tab component structure
**TASK**: Create pages/Settings/UserManagement.jsx with EXACTLY:
**Tab 1 - Users**:
- Users DataTable: Name, Username, Email, Role, Status, Actions
- Add User Modal: first_name, last_name, username, password, email, role, active
- Form validation: all required fields, email format, password strength

**Tab 2 - Roles**:  
- Left card: Roles list with Add/Edit/Delete
- Right card: Permission matrix for selected role
- Permission matrix: Menu/Submenu rows, Manage/View/None dropdowns
- Color coding: Green (Manage), Blue (View), Pink (None)

**Tab 3 - Permissions**:
- Read-only permission matrix overview
- All roles vs all permissions in table format
- Same color coding as Tab 2
- NO editing capabilities on this tab

---

## STEP 14: General Settings and Workflow Configuration
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 14A: General Settings Backend
**MUST ASK**: Do you want these exact tenant settings APIs?
**MUST PRESENT**: Complete settings route structure
**TASK**: Create routes/settings.js with EXACTLY:
- `GET /api/settings/general` - get tenant general settings
- `PUT /api/settings/general` - update general settings
- `GET /api/settings/workflow` - get workflow enable/disable states
- `PUT /api/settings/workflow` - update workflow configurations
- `GET /api/settings/numbering` - get PO/SO numbering schemes
- `PUT /api/settings/numbering` - update numbering prefixes/sequences
- Settings stored in tenant_settings table with key-value pairs

### STEP 14B: Settings Database Operations
**MUST ASK**: Do you want these exact settings controller functions?
**MUST PRESENT**: Complete settingsController.js functions
**TASK**: Create controllers/settingsController.js with EXACTLY:
- `getGeneralSettings()`: logo, company_name, language, timezone, currency, date_format
- `updateGeneralSettings()`: upsert tenant_settings records
- `getWorkflowSettings()`: PO and SO workflow step enablement
- `updateWorkflowSettings()`: update workflow_configs table
- `getNumberingSettings()`: PO/SO prefixes and current numbers
- `updateNumberingSettings()`: update document_sequences table
- NO complex business logic - simple CRUD operations

### STEP 14C: Settings Frontend Pages
**MUST ASK**: Do you want these exact settings pages matching PRD Section 5.4 & 5.3?
**MUST PRESENT**: Complete settings page structure
**TASK**: Create pages/Settings/ with EXACTLY:
**GeneralSettings.jsx**:
- Form fields: logo upload, company_name, language dropdown, timezone, currency, date_format
- Save button with confirmation modal
- Preview section showing how settings appear in app

**WorkflowSettings.jsx**:  
- Two sections: Purchase Order Workflow, Sales Order Workflow
- Each step with enable/disable toggle switches
- Live preview showing enabled workflow steps
- Warning modal if disabling steps that would break active orders

**NumberingSettings.jsx**:
- PO prefix/current number fields with preview
- SO prefix/current number fields with preview  
- Reset sequence buttons with confirmation modals
- NO advanced numbering patterns

---

## STEP 15: Purchase Order Creation and Suggestion
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 15A: Purchase Order Backend APIs
**MUST ASK**: Do you want these exact PO creation endpoints?
**MUST PRESENT**: Complete PO route definitions
**TASK**: Create routes/purchaseOrders.js with EXACTLY:
- `GET /api/purchase-orders` - list POs with status filter
- `GET /api/purchase-orders/suggestions` - auto-suggest based on min stock
- `POST /api/purchase-orders` - create new PO with items
- `GET /api/purchase-orders/:id` - get single PO with items
- `PUT /api/purchase-orders/:id/status` - update PO workflow status
- PO number generation using document_sequences table
- Status workflow: pending > approved > received > completed

### STEP 15B: PO Creation Database Logic
**MUST ASK**: Do you want these exact PO controller functions?
**MUST PRESENT**: Complete PO controller implementation
**TASK**: Create controllers/purchaseOrderController.js with EXACTLY:
- `getPurchaseOrders()`: JOIN suppliers, filter by status/dates
- `createPurchaseOrder()`: INSERT PO + PO items in transaction
- `getPOSuggestions()`: SELECT products WHERE available < minimum_stock
- `updatePOStatus()`: UPDATE status + workflow_state with validation
- Auto-calculate total_amount from line items
- Workflow validation: status progression must follow sequence
- NO complex pricing or approval logic

### STEP 15C: Purchase Order Frontend
**MUST ASK**: Do you want this exact PO creation interface from PRD Section 6.1.1?
**MUST PRESENT**: Complete PO creation component structure
**TASK**: Create pages/Inbound/CreatePurchaseOrder.jsx with EXACTLY:
- PO list: DataTable with PO#, Supplier, Date, Status, Total, Actions
- Create PO Modal: Supplier dropdown, Items selection table
- Items table: SKU, Name, Available Stock, Warning Icon, Quantity input, Price, Total
- Pagination: 20 items per page with search by SKU/Name
- Running total calculation at bottom
- Create PO confirmation modal with all details
- Success toast with generated PO number
- NO supplier creation or advanced item management

---

## STEP 16: Purchase Order Approval Workflow
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 16A: PO Approval Backend
**MUST ASK**: Do you want these exact approval workflow endpoints?
**MUST PRESENT**: Complete approval route structure
**TASK**: Add to purchaseOrders routes EXACTLY:
- `GET /api/purchase-orders/pending-approval` - list POs needing approval
- `PUT /api/purchase-orders/:id/approve` - approve PO with user tracking
- `PUT /api/purchase-orders/:id/reject` - reject PO with reason
- `POST /api/purchase-orders/:id/generate-document` - create HTML document
- Update status to 'approved' and workflow_state to 'receive'
- Log approval actions in audit_logs table

### STEP 16B: Document Generation System
**MUST ASK**: Do you want this exact HTML document generation from templates?
**MUST PRESENT**: Complete document generation logic
**TASK**: Create utils/documentGenerator.js with EXACTLY:
- `generatePODocument()`: Use instruction_templates.html_template
- Template variables: {{po_number}}, {{supplier_name}}, {{items}}, {{total}}
- Store rendered HTML in generated_documents table
- Return HTML for immediate display/print
- Template selection by type='PO' and tenant_id
- NO PDF generation or complex formatting

### STEP 16C: PO Approval Frontend
**MUST ASK**: Do you want this exact approval interface from PRD Section 6.1.2?
**MUST PRESENT**: Complete approval component structure
**TASK**: Create pages/Inbound/ApprovePurchaseOrder.jsx with EXACTLY:
- Pending approval POs table: PO#, Supplier, Date, Total, Actions
- Approve/Reject buttons for each PO
- Approval confirmation modal with full PO details
- Reject modal with reason text area (required)
- Document generation and preview after approval
- Print button for generated PO document
- Status update toasts for approve/reject actions
- NO bulk approval or advanced workflow features

---

## STEP 17: Receiving Items Functionality
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 17A: Receiving Backend APIs
**MUST ASK**: Do you want these exact receiving endpoints?
**MUST PRESENT**: Complete receiving route definitions
**TASK**: Add to purchaseOrders routes EXACTLY:
- `GET /api/purchase-orders/approved` - list approved POs ready for receiving
- `POST /api/purchase-orders/:id/receive` - record receipt with quantities
- `POST /api/purchase-orders/:id/receive-partial` - handle partial receipts
- `POST /api/purchase-orders/:id/close-incomplete` - close PO with reasons
- Update received_quantity in purchase_order_items
- Create receiving_instruction document
- Update workflow_state to 'putaway'

### STEP 17B: Receiving Database Logic
**MUST ASK**: Do you want these exact receiving controller functions?
**MUST PRESENT**: Complete receiving controller implementation
**TASK**: Add to purchaseOrderController.js EXACTLY:
- `receiveItems()`: UPDATE purchase_order_items.received_quantity
- `validateReceiving()`: received_quantity <= ordered_quantity
- `handlePartialReceipt()`: Allow partial with reason tracking
- `closeIncompletePO()`: Set status to completed with notes
- Generate receiving instruction HTML document
- Create movement_history records for received items
- NO automatic inventory updates (happens in putaway)

### STEP 17C: Receiving Items Frontend
**MUST ASK**: Do you want this exact receiving interface from PRD Section 6.1.3?
**MUST PRESENT**: Complete receiving component structure
**TASK**: Create pages/Inbound/ReceivingItems.jsx with EXACTLY:
- Approved POs table: PO#, Supplier, Date, Expected Items, Actions
- Receive Items Modal: List items with Ordered vs Received quantity inputs
- Expiry date inputs for items with has_expiry_date=true
- Partial receipt handling with reason dropdown
- Incomplete PO closure modal with reason text area
- Receiving confirmation modal with quantities
- Generated receiving instruction display/print
- Success toasts for complete/partial receipts
- NO quality control or advanced receiving features

---

## STEP 18: Putaway System with Smart Bin Suggestions
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 18A: Putaway Backend APIs
**MUST ASK**: Do you want these exact putaway endpoints?
**MUST PRESENT**: Complete putaway route definitions
**TASK**: Add to purchaseOrders routes EXACTLY:
- `GET /api/purchase-orders/ready-putaway` - POs ready for putaway
- `GET /api/purchase-orders/:id/putaway-suggestions` - smart bin suggestions
- `POST /api/purchase-orders/:id/putaway` - confirm putaway locations
- `PUT /api/purchase-orders/:id/putaway-complete` - mark putaway done
- Smart algorithm using PUTAWAY_SCORE_WEIGHTS from PRD
- Update inventory_items table with quantities and locations

### STEP 18B: Smart Putaway Algorithm
**MUST ASK**: Do you want this exact putaway scoring algorithm from PRD?
**MUST PRESENT**: Complete putaway algorithm implementation
**TASK**: Create utils/putawayAlgorithm.js with EXACTLY:
```javascript
const PUTAWAY_SCORE_WEIGHTS = {
  zoneCompatibility: 0.3,
  availableCapacity: 0.25,
  accessibility: 0.2,
  distanceFromReceiving: 0.15,
  binUtilization: 0.1
};
```
- Calculate weighted score for each available bin
- Consider product type compatibility with bin category
- Factor in current capacity vs max capacity
- Return sorted list of suggested bins
- NO machine learning or complex optimization

### STEP 18C: Putaway Frontend Interface
**MUST ASK**: Do you want this exact putaway interface from PRD Section 6.1.4?
**MUST PRESENT**: Complete putaway component structure
**TASK**: Create pages/Inbound/PutawayItems.jsx with EXACTLY:
- Ready for putaway POs table
- Putaway Modal: Items list with suggested bins dropdown
- "Enable Smart" toggle for each item (triggers algorithm)
- Manual bin selection override capability
- Putaway confirmation modal with item-location mapping
- Generated putaway instruction with checkboxes
- Print instruction for warehouse workers
- Checkbox completion tracking for each item
- PO completion when all items checked off
- NO barcode scanning or mobile optimizations

---

## STEP 19: Sales Order Creation and Management
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 19A: Sales Order Backend APIs
**MUST ASK**: Do you want these exact SO creation endpoints?
**MUST PRESENT**: Complete SO route definitions
**TASK**: Create routes/salesOrders.js with EXACTLY:
- `GET /api/sales-orders` - list SOs with status filter
- `POST /api/sales-orders` - create new SO with availability check
- `GET /api/sales-orders/:id` - get single SO with items
- `PUT /api/sales-orders/:id/status` - update SO workflow status
- SO number generation using document_sequences
- Status workflow: pending > allocated > picked > packed > shipped > delivered

### STEP 19B: SO Creation Database Logic
**MUST ASK**: Do you want these exact SO controller functions?
**MUST PRESENT**: Complete SO controller implementation
**TASK**: Create controllers/salesOrderController.js with EXACTLY:
- `getSalesOrders()`: JOIN customers, filter by status/dates
- `createSalesOrder()`: INSERT SO + SO items with stock validation
- `checkStockAvailability()`: Ensure ordered_quantity <= available stock
- `updateSOStatus()`: UPDATE status + workflow_state progression
- Auto-calculate total_amount from line items
- Stock validation prevents overselling
- NO complex pricing or customer credit checks

### STEP 19C: Sales Order Frontend
**MUST ASK**: Do you want this exact SO creation interface from PRD Section 6.2.1?
**MUST PRESENT**: Complete SO creation component structure
**TASK**: Create pages/Outbound/CreateSalesOrder.jsx with EXACTLY:
- SO list: DataTable with SO#, Customer, Date, Status, Total, Actions
- Create SO Modal: Customer dropdown, Items selection table
- Items table: SKU, Name, Available Stock, Warning Icon, Quantity input, Price, Total
- Stock validation: Cannot enter quantity > available stock
- Pagination: 20 items per page with search by SKU/Name
- Running total calculation at bottom
- Create SO confirmation modal with all details
- Success toast with generated SO number
- NO customer creation or credit limit checking

---

## STEP 20: Allocation and Picking Systems
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 20A: Allocation Backend Logic
**MUST ASK**: Do you want this exact allocation system?
**MUST PRESENT**: Complete allocation endpoint structure
**TASK**: Add to salesOrders routes EXACTLY:
- `GET /api/sales-orders/pending-allocation` - SOs ready for allocation
- `POST /api/sales-orders/:id/allocate` - allocate stock to SO
- `POST /api/sales-orders/:id/cancel-allocation` - reverse allocation
- Update sales_order_items.allocated_quantity
- Reduce inventory_items.available_quantity by allocated amount
- Create movement_history records for allocation
- Allocation must not exceed available stock

### STEP 20B: Picking System with FEFO/FIFO
**MUST ASK**: Do you want this exact picking strategy from PRD Section 6.2.3?
**MUST PRESENT**: Complete picking algorithm implementation
**TASK**: Create utils/pickingStrategy.js with EXACTLY:
- FIFO: Sort by received_date ASC (oldest first)
- FEFO: Sort by expiry_date ASC (earliest expiry first) 
- `generatePickingInstructions()`: Return bin locations in pick order
- Handle partial bin quantities across multiple locations
- Update allocated_quantity to picked_quantity
- NO wave picking or route optimization

### STEP 20C: Allocation and Picking Frontend
**MUST ASK**: Do you want these exact interfaces from PRD Sections 6.2.2 & 6.2.3?
**MUST PRESENT**: Complete allocation and picking components
**TASK**: Create pages/Outbound/ with EXACTLY:
**Allocate.jsx**:
- Pending allocation SOs table
- Allocate button with confirmation modal
- Modal shows SO details and stock impact
- Allocation/cancellation toasts

**Pick.jsx**:
- Allocated SOs table with item details
- Pick suggestions showing bin locations (FIFO/FEFO)
- Pick confirmation modal with items and locations
- Generated picking instruction with checkboxes
- Print instruction for warehouse workers
- Pick completion updates and workflow progression
- NO batch picking or pick path optimization

---

## STEP 21: Packing and Shipping Workflow
⚠️ **MANDATORY APPROVAL PROTOCOL** - Must get explicit "Yes, proceed" before execution

### STEP 21A: Packing System Backend
**MUST ASK**: Do you want this exact package management system?
**MUST PRESENT**: Complete packing route structure
**TASK**: Add to salesOrders routes EXACTLY:
- `GET /api/sales-orders/ready-packing` - picked SOs ready for packing
- `POST /api/sales-orders/:id/create-package` - create delivery package
- `PUT /api/packages/:id/add-items` - assign items to package
- `GET /api/packages/:packageId/instructions` - packing instructions
- Package ID format: PKG-001, PKG-002, etc.
- Track package dimensions and weight
- Ensure all SO items assigned to packages before shipping

### STEP 21B: Shipping Integration Backend
**MUST ASK**: Do you want this exact shipping method system?
**MUST PRESENT**: Complete shipping endpoint structure
**TASK**: Add to salesOrders routes EXACTLY:
- `GET /api/shipping-methods` - available shipping options
- `POST /api/sales-orders/:id/ship` - create shipment with tracking
- `GET /api/transporters` - third-party transporter list
- `POST /api/shipments/:id/generate-label` - shipping label HTML
- Integration with transporters table for third-party options
- Internal shipping method support
- Tracking number assignment and storage

### STEP 21C: Packing and Shipping Frontend
**MUST ASK**: Do you want these exact interfaces from PRD Sections 6.2.4 & 6.2.5?
**MUST PRESENT**: Complete packing and shipping components
**TASK**: Create pages/Outbound/ with EXACTLY:
**Pack.jsx**:
- Ready for packing SOs table
- Create Packages button opens package management modal
- Package modal: dimensions input, item assignment table
- Items summary showing packed vs unpacked status
- Generated packing instruction with checkboxes
- Package ID generation and tracking

**Ship.jsx**:
- Ready for shipping SOs with packages list
- Ship Order modal with delivery location selection
- Transporter dropdown (internal/third-party options)
- Multiple packages to different locations support
- Tracking number assignment
- Generated shipping instruction/label
- Shipment confirmation and workflow progression
- NO real-time carrier integration or rate shopping

---

