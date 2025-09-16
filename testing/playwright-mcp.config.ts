import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright MCP Configuration for Foundation Testing
 * Optimized for Replit environment with headless browsing
 */
export default defineConfig({
  // Test directory structure - point to tests in testing directory
  testDir: './tests',
  
  // Global setup and teardown
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  
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
    
    // Use saved authentication state
    storageState: 'testing/auth-state.json',
    
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
        // Use system Chromium in Replit
        launchOptions: {
          executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
        }
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