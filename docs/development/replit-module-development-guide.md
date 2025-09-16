# Replit Module Development Guide

## Overview

This guide shows how to use Replit to develop new business modules on the plugin-based foundation. Replit's collaborative features make it perfect for distributed teams working on different modules simultaneously.

## 🚀 Quick Start: Developing a New Module on Replit

### Option A: Starting from Existing Replit Project

**Step 1: Join the Foundation Replit**
```
1. Get the join link from your team lead
2. Click the join link to access the live foundation
3. You now have real-time access to the codebase
```

**Step 2: Create Your Module Branch**
```bash
# In Replit Shell:
git checkout -b feature/your-module-name
```

**Step 3: Generate Your Module**
```bash
# Generate a new business module
npx tsx tools/module-generator/generate-module.ts yourmodule YourEntity

# Example: Generate a Customer Loyalty module
npx tsx tools/module-generator/generate-module.ts loyalty Customer
```

**Step 4: Develop in Isolation**
```
Edit only files in: src/modules/loyalty/
- ✅ src/modules/loyalty/client/pages/
- ✅ src/modules/loyalty/server/routes/
- ✅ src/modules/loyalty/database/schema.ts
- 🚫 Don't touch foundation files!
```

### Option B: Importing from GitHub

**Step 1: Import Foundation from GitHub**
```
1. Go to replit.com
2. Click "Create Repl"
3. Select "Import from GitHub"
4. Enter your foundation repository URL
5. Replit automatically sets up the project
```

**Step 2: Configure Replit Environment**
```bash
# Replit automatically runs:
npm install
npm run dev

# If needed, manually run database setup:
npm run db:push
```

**Step 3: Create Feature Branch**
```bash
# Use Replit's Git pane or Shell:
git checkout -b feature/inventory-module
```

## 🔄 Replit-Specific Workflow

### 1. Real-Time Collaboration Features

**Multiple Developers on Same Module:**
```
Team Lead: Creates the module scaffold
├── Generates base module structure
├── Shares join link with team
└── Sets up initial database schema

Frontend Dev: Works on UI components
├── Edits src/modules/[name]/client/pages/
├── Uses live preview to test changes
└── See changes in real-time

Backend Dev: Works on API routes  
├── Edits src/modules/[name]/server/routes/
├── Uses Replit's API testing tools
└── Database changes sync automatically
```

**Live Collaboration Commands:**
```bash
# See who's online
# Check the collaboration indicator in top-right

# Share your current view
# Use the share button to show specific files to teammates

# Chat while coding
# Use built-in chat for coordination
```

### 2. Using Replit's Git Integration

**Visual Git Workflow:**
```
1. Open Git pane in Replit sidebar
2. See all changed files visually
3. Stage files by clicking the "+" button
4. Write commit message in the text box
5. Click "Commit & Push" button
```

**Branch Management:**
```bash
# Create feature branch (Shell or Git pane)
git checkout -b feature/customer-portal

# Switch branches visually
# Use the branch dropdown in Git pane

# Merge when ready
git checkout main
git merge feature/customer-portal
```

### 3. Replit Development Environment

**Live Preview for Module Testing:**
```
1. Your module runs automatically at: https://[repl-name].[username].repl.co
2. Test your module's routes: /console/[module-name]
3. Preview updates in real-time as you code
4. Use browser dev tools for debugging
```

**Database Management:**
```bash
# Database runs automatically on Replit
# Check database status:
npm run db:push --dry-run

# Apply schema changes:
npm run db:push

# View database (if configured):
# Use Replit's database viewers or connect external tools
```

### 4. Environment Variables & Secrets

**Setting Up Module Secrets:**
```
1. Click "Secrets" tab in left sidebar
2. Add any module-specific environment variables
3. These sync with your generated module automatically
4. ⚠️  Remember: Join link shares secrets!
```

**Common Module Environment Variables:**
```
DATABASE_URL=postgresql://... (auto-configured)
NODE_ENV=development
[MODULE_NAME]_API_KEY=your-external-api-key
[MODULE_NAME]_WEBHOOK_SECRET=your-webhook-secret
```

## 📋 Complete Replit Module Development Checklist

### Pre-Development Setup
- [ ] Access foundation Replit (via join link or GitHub import)
- [ ] Verify foundation runs successfully (`npm run dev`)
- [ ] Create feature branch (`git checkout -b feature/my-module`)
- [ ] Understand module boundaries (stay in `src/modules/[name]/`)

### Module Generation
- [ ] Run module generator: `npx tsx tools/module-generator/generate-module.ts mymodule MyEntity`
- [ ] Verify generated files are in correct directory structure
- [ ] Check that module appears in navigation (after restart)
- [ ] Confirm database tables were created: `npm run db:push`

### Development Phase
- [ ] Edit module files only (never foundation files)
- [ ] Use Replit's live preview to test changes
- [ ] Collaborate with team using real-time editing
- [ ] Test API endpoints using Replit's built-in tools
- [ ] Use browser dev tools for frontend debugging

### Testing & Integration
- [ ] Verify module works in isolation
- [ ] Test with different tenants/users
- [ ] Ensure proper permissions are enforced
- [ ] Check that foundation functionality is unaffected
- [ ] Run any automated tests: `npm test`

### Deployment Preparation
- [ ] Use Git pane to review all changes
- [ ] Ensure only module files and minimal foundation files changed
- [ ] Write descriptive commit messages
- [ ] Push to feature branch: commit & push in Git pane
- [ ] Create pull request (via GitHub or Replit integration)

### Post-Deployment
- [ ] Verify module works in production environment
- [ ] Monitor for any foundation impacts
- [ ] Update module documentation if needed
- [ ] Share join link with team for next module development

## 🤝 Team Collaboration Best Practices

### Multiple Teams, One Foundation
```
Team A (Marketing Module):
├── Uses join link: https://replit.com/@company/foundation?join=abc123
├── Works in src/modules/marketing/
└── Deploys weekly

Team B (Sales Module): 
├── Uses same foundation, different branch
├── Works in src/modules/sales/
└── Deploys independently
```

### Avoiding Conflicts
- **Rule 1**: Only edit your module's directory
- **Rule 2**: Use descriptive branch names: `feature/[team]-[module]-[feature]`
- **Rule 3**: Communicate major changes via Replit chat
- **Rule 4**: Test locally before pushing to shared branches

## 🎯 Replit-Specific Advantages

### For Individual Developers:
- **Instant Environment**: No local setup required
- **Live Preview**: See changes immediately in browser
- **Cloud Computing**: Powerful development environment anywhere
- **Built-in Tools**: Database viewers, API testing, file management

### For Teams:
- **Real-time Collaboration**: Multiple developers, one codebase
- **Easy Onboarding**: Share join link, start coding instantly  
- **Visual Git**: Non-technical team members can see progress
- **Integrated Chat**: Communicate while coding

### For Managers:
- **Live Monitoring**: See development progress in real-time
- **Quick Reviews**: Check code without setup
- **Cost Effective**: No individual development environment costs
- **Backup**: Code automatically saved to cloud

## 🔧 Troubleshooting Common Issues

**Module Not Appearing in Navigation:**
```bash
# Restart the development server
# In Replit, click the Stop button then Run again
```

**Database Changes Not Applied:**
```bash
# Force database schema sync
npm run db:push --force
```

**Git Conflicts:**
```bash
# Use Replit's conflict resolution
# Or resolve in Shell:
git pull origin main
# Resolve conflicts in editor
git add .
git commit -m "Resolve conflicts"
```

**Join Link Not Working:**
```
1. Check if link is expired
2. Ask team lead to regenerate join link
3. Verify you have proper permissions
```

## Conclusion

Replit makes module development incredibly smooth by removing environment setup barriers and enabling real-time collaboration. The combination of our plugin architecture and Replit's collaborative features allows distributed teams to build business modules efficiently without stepping on each other's work.

The key is to leverage Replit's strengths (real-time collaboration, instant environment) while respecting our architecture's boundaries (module isolation, foundation protection).