import express from "express";
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import ViteExpress from "vite-express";
import permissionRoutes from "./routes/system/permission";
import authRoutes from "./routes/auth/auth";
import roleRoutes from "./routes/system/role";
import tenantRoutes from "./routes/system/tenant";
import optionRoutes from "./routes/system/option";
import userRoutes from "./routes/system/user";
import departmentRoutes from "./routes/demo/department";
import masterRoutes from "./routes/master";
import { rateLimit } from 'express-rate-limit'
import fileUpload from "express-fileupload";
import { routeRegistry } from "./lib/modules/route-registry";
import { moduleRegistry } from "./lib/modules/module-registry";
import { tenantDbManager } from "./lib/db/tenant-db";


const app = express();

// rate limiter
const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 5000, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
        standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
        ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
        // store: ... , // Redis, Memcached, etc. See below.
})
//app.use(limiter);

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// misc middleware
app.use(fileUpload())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0', // Specify OpenAPI version
    info: {
      title: 'React Admin API',
      version: '1.0.0',
      description: 'API documentation for react admin application',
    },
    servers: [
      {
        url: 'http://localhost:5000', // Updated to match actual server port
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  // Path to your route files where JSDoc comments are located
  apis: [
    './src/server/routes/auth/*.ts',
    './src/server/routes/system/*.ts',
    './src/server/routes/demo/*.ts',
    './src/server/routes/master.ts',
  ], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// auth routes
app.use('/api/auth', authRoutes);

// system routes
app.use('/api/system/permission', permissionRoutes);
app.use('/api/system/role', roleRoutes);
app.use('/api/system/tenant', tenantRoutes);
app.use('/api/system/option', optionRoutes);
app.use('/api/system/user', userRoutes);

// demo routes
app.use('/api/demo/department', departmentRoutes);

// master data routes
app.use('/api/master', masterRoutes);


// Initialize module system
async function initializeModuleSystem() {
  try {
    // STARTUP VALIDATION: Ensure all tenant schemas exist before initializing modules
    await tenantDbManager.validateAllTenantSchemasOnStartup();
    
    // Initialize RouteRegistry with the Express app
    routeRegistry.setExpressApp(app);
    
    // Discover and register all modules
    await moduleRegistry.discoverModules();
    
    console.log('✅ Module system initialized successfully');
    const mountedRoutes = routeRegistry.getMountedRoutes();
    if (mountedRoutes.length > 0) {
      console.log(`📍 Mounted ${mountedRoutes.length} module route(s):`);
      mountedRoutes.forEach(route => {
        console.log(`   - ${route.moduleId}: ${route.prefix} (${route.endpoints.length} endpoints)`);
      });
    } else {
      console.log('ℹ️ No modules found to mount');
    }
  } catch (error) {
    console.error('❌ Failed to initialize module system:', error);
  }
}

// Initialize module system and start server only after everything is ready
async function startServer() {
  try {
    // Initialize module system first
    await initializeModuleSystem();
    
    // Note: Removed catch-all API route to avoid path-to-regexp conflicts
    // The ViteExpress integration should handle API routing properly
    
    // Start the server only after all routes are registered
    ViteExpress.listen(app, 5000, () =>
      console.log("Server is listening on port 5000..."),
    );
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
