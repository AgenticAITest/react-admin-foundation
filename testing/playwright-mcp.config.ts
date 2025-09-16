import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright MCP Configuration for Foundation Testing
 * Optimized for Replit environment with headless browsing
 */
export default defineConfig({
  // Test directory structure
  testDir: './tests',
  
  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL for the application
    baseURL: process.env.REPL_URL || 'http://localhost:5000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Timeout for each action
    actionTimeout: 30000,
    
    // Timeout for navigation
    navigationTimeout: 60000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Force headless mode for Replit
        headless: true,
        // Use system-installed Chromium
        channel: undefined,
      },
    },
    
    // Uncomment when Firefox is available
    // {
    //   name: 'firefox',
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //     headless: true,
    //   },
    // },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        headless: true,
      },
    },
  ],

  // Web server configuration for local development
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});