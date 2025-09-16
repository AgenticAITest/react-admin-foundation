import { FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';

/**
 * Global teardown for Playwright MCP testing
 * Cleanup resources and generate reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running global teardown...');
  
  try {
    // Clean up auth state file
    try {
      await fs.unlink('testing/auth-state.json');
      console.log('✅ Cleaned up authentication state');
    } catch (error) {
      // File might not exist, which is fine
    }
    
    // Generate test summary
    console.log('📊 Test results available in:');
    console.log('  - HTML Report: playwright-report/index.html');
    console.log('  - JSON Results: test-results/results.json');
    console.log('  - JUnit XML: test-results/junit.xml');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
}

export default globalTeardown;