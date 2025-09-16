#!/bin/bash

# Business Analyst Testing Framework
# Simple script to run Playwright MCP tests

echo "🧪 Setting up Business Analyst Testing Environment..."

# Set required environment variables for security
export TEST_ADMIN_USERNAME="sysadmin"
export TEST_ADMIN_PASSWORD="S3cr3T"
export REPL_URL="http://localhost:5000"

echo "✅ Environment configured"

# Run Playwright tests
echo "🎭 Running Playwright MCP tests..."
cd testing
npx playwright test --config=playwright-mcp.config.ts --reporter=list

echo "📊 Test results available in testing/test-results/"
echo "🎯 Business Analyst Framework ready!"