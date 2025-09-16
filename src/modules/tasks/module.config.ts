export const taskManagementModule = {
  id: "tasks",
  name: "Task Management",
  version: "1.0.0", 
  description: "Complete task management system",
  author: "Module Generator",
  
  dependencies: [],
  compatibleVersions: ["1.0.0"],
  permissions: [
    "tasks.task_management.view",
    "tasks.task_management.add",
    "tasks.task_management.edit", 
    "tasks.task_management.delete"
  ],
  roles: ["SYSADMIN", "USER"],
  
  database: {
    tables: ["task_managements"],
    requiresSeeding: true
  },
  
  apiRoutes: {
    prefix: "/api/tasks",
    endpoints: [
      { path: "/task-managements", methods: ["GET", "POST"] },
      { path: "/task-managements/:id", methods: ["GET", "PUT", "DELETE"] }
    ]
  },
  
  navigation: {
    section: "Business",
    items: [
      { 
        path: "/console/tasks/task-managements",
        label: "Task Managements",
        icon: "Package",
        permissions: ["tasks.task_management.view"]
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

export default taskManagementModule;