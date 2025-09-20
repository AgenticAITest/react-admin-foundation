// Foundation config: src/modules/sample/module.config.ts
// This file would be placed in the foundation repo for module discovery

export default {
  id: 'sample',
  name: 'Sample Module',
  version: '1.0.0',
  api: '1.x',
  permissions: [
    'sample.items.read',
    'sample.items.create', 
    'sample.items.update',
    'sample.items.delete',
  ],
  nav: {
    basePath: '/app/sample',
    items: [
      { 
        path: '/app/sample/items', 
        label: 'Items', 
        permissions: ['sample.items.read'] 
      }
    ]
  }
};