
// Phase-1 namespace:
//   Routes are mounted under /api/plugins/<module-id>.
//   A legacy prefix (e.g., /api/<module-id>) may be temporarily mounted for transition.
//
// Toggle semantics:
//   - enabled_global = false  => plugin is OFF platform-wide (tenants cannot override).
//   - enabled_global = true   => tenant-level 'enabled' must also be true to allow access.

export const productModule = {
  id: "inventory",
  name: "Product Management",
  version: "1.0.0",
  description: "Complete product management system",
  author: "Module Generator",
  
  dependencies: [],
  compatibleVersions: ["1.0.0"],
  permissions: [
    "inventory.product.view",
    "inventory.product.add", 
    "inventory.product.edit",
    "inventory.product.delete"
  ],
  roles: ["SYSADMIN", "USER"],
  
  database: {
    tables: ["products"],
    requiresSeeding: true
  },
  
  apiRoutes: {
    prefix: "/api/inventory",
    endpoints: [
      { path: "/products", methods: ["GET", "POST"] },
      { path: "/products/:id", methods: ["GET", "PUT", "DELETE"] }
    ]
  },
  
  navigation: {
    section: "Business",
    items: [
      { 
        path: "/console/inventory/products", 
        label: "Products", 
        icon: "Package",
        permissions: ["inventory.product.view"]
      }
    ]
  },
  
  features: {
    export: true,
    import: true,
    advancedFiltering: true
  },
  settings: {}
};

export default productModule;