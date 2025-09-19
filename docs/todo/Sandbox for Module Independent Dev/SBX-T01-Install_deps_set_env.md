# SBX-T01 — Install deps & set env

**Edit**: `package.json`
```json
{
  "scripts": {
    "dev": "tsx sandbox/server.ts"
  },
  "dependencies": {
    "express": "^4.19.2",
    "pg": "^8.11.5",
    "drizzle-orm": "^0.33.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "tsx": "^4.16.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

**Create**: `.env` (or set Replit Secrets)
```
DATABASE_URL=postgres://<user>:<pass>@<neon-host>/<db>?sslmode=require
DEV_TENANT_CODE=dev
DEV_TENANT_SCHEMA=tenant_dev
```

---
