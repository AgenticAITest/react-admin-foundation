import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright MCP testing
 * Handles authentication and environment preparation
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up global test environment...');
  
  // Create browser instance for auth setup
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to login page and authenticate as super admin
    const baseURL = process.env.REPL_URL || 'http://localhost:5000';
    await page.goto(`${baseURL}/login`);
    
    // Login as super admin for testing - require environment variables for security
    const username = process.env.TEST_ADMIN_USERNAME;
    const password = process.env.TEST_ADMIN_PASSWORD;
    
    if (!username || !password) {
      throw new Error('TEST_ADMIN_USERNAME and TEST_ADMIN_PASSWORD environment variables are required for testing');
    }
    
    await page.fill('[name="username"]', username);
    await page.fill('[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for authentication to complete
    await page.waitForURL(/\/console/);
    
    // Save authentication state
    await context.storageState({ path: 'testing/auth-state.json' });
    
    console.log('✅ Authentication state saved');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;