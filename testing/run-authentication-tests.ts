#!/usr/bin/env tsx

/**
 * Authentication Test Runner for Phase 5e
 * Executes comprehensive authentication testing suite
 */

import { AuthenticationTestSuite, TestReport } from './authentication-test-suite';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('🚀 Phase 5e: Authentication Testing & Monitoring');
  console.log('Starting Domain-Based Login System Validation...\n');

  try {
    // Initialize test suite
    const testSuite = new AuthenticationTestSuite();
    
    // Run complete test suite
    const report = await testSuite.runCompleteTestSuite();
    
    // Generate JSON report for CI/CD integration
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(__dirname, `reports/auth-test-report-${timestamp}.json`);
    
    try {
      // Create reports directory if it doesn't exist
      const { mkdirSync } = await import('fs');
      mkdirSync(join(__dirname, 'reports'), { recursive: true });
      
      // Write detailed JSON report
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Detailed test report saved: ${reportPath}`);
    } catch (reportError) {
      console.log('⚠️  Could not save detailed report, but tests completed');
    }

    // Generate human-readable summary
    generateHumanReadableReport(report);
    
    // Exit with appropriate code
    const exitCode = report.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('💥 Test suite execution failed:', error);
    process.exit(1);
  }
}

function generateHumanReadableReport(report: TestReport): void {
  console.log('\n📋 PHASE 5e: AUTHENTICATION SYSTEM VALIDATION REPORT');
  console.log('='.repeat(70));
  
  const duration = report.endTime 
    ? ((report.endTime.getTime() - report.startTime.getTime()) / 1000).toFixed(2)
    : 'Unknown';
    
  console.log(`🗓️  Test Date: ${report.startTime.toISOString()}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`🎯 Suite: ${report.suite}`);
  console.log('');

  // Category breakdown
  const categories = {
    'Authentication Flow': 0,
    'Security Testing': 0,
    'Integration Tests': 0,
    'Tenant Isolation': 0
  };

  report.results.forEach(result => {
    if (result.testName.includes('Login') || result.testName.includes('JWT')) {
      categories['Authentication Flow']++;
    } else if (result.testName.includes('Rate') || result.testName.includes('Security') || result.testName.includes('Domain Enumeration')) {
      categories['Security Testing']++;
    } else if (result.testName.includes('Integration') || result.testName.includes('Format') || result.testName.includes('Case')) {
      categories['Integration Tests']++;
    } else if (result.testName.includes('Tenant') || result.testName.includes('Resolution') || result.testName.includes('Sysadmin Access')) {
      categories['Tenant Isolation']++;
    }
  });

  console.log('📊 TEST CATEGORIES:');
  Object.entries(categories).forEach(([category, count]) => {
    const categoryResults = report.results.filter(r => {
      const name = r.testName;
      switch (category) {
        case 'Authentication Flow': return name.includes('Login') || name.includes('JWT');
        case 'Security Testing': return name.includes('Rate') || name.includes('Security') || name.includes('Domain Enumeration');
        case 'Integration Tests': return name.includes('Integration') || name.includes('Format') || name.includes('Case');
        case 'Tenant Isolation': return name.includes('Tenant') || name.includes('Resolution') || name.includes('Sysadmin Access');
        default: return false;
      }
    });
    
    const passed = categoryResults.filter(r => r.status === 'PASS').length;
    const icon = passed === count ? '✅' : '⚠️';
    console.log(`  ${icon} ${category}: ${passed}/${count} passed`);
  });

  console.log('');
  console.log('🏆 OVERALL RESULTS:');
  console.log(`  Total Tests: ${report.summary.total}`);
  console.log(`  ✅ Passed: ${report.summary.passed}`);
  console.log(`  ❌ Failed: ${report.summary.failed}`);
  console.log(`  ⏭️  Skipped: ${report.summary.skipped}`);
  console.log(`  📈 Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`);

  // Phase 5e validation status
  console.log('');
  console.log('🎯 PHASE 5e VALIDATION STATUS:');
  
  const criticalTestsPassed = report.results.filter(r => 
    (r.testName.includes('Login - Valid Credentials') || 
     r.testName.includes('JWT Token Validation') ||
     r.testName.includes('Sysadmin Access Validation')) && 
    r.status === 'PASS'
  ).length;
  
  const criticalTestsTotal = report.results.filter(r => 
    r.testName.includes('Login - Valid Credentials') || 
    r.testName.includes('JWT Token Validation') ||
    r.testName.includes('Sysadmin Access Validation')
  ).length;

  if (report.summary.failed === 0 && criticalTestsPassed === criticalTestsTotal) {
    console.log('  ✅ PASSED - Domain-based authentication system ready for production');
    console.log('  ✅ All security measures validated');
    console.log('  ✅ Frontend/backend integration confirmed'); 
    console.log('  ✅ Tenant isolation working correctly');
  } else if (report.summary.failed === 0 && report.summary.skipped > 0) {
    console.log('  ⚠️  CONDITIONAL PASS - Some tests skipped due to rate limiting');
    console.log('  ⚠️  Manual verification recommended for skipped critical tests');
    console.log('  🔍 Consider testing in isolated environment to avoid rate limits');
  } else {
    console.log('  ❌ ISSUES DETECTED - Review failed tests before production deployment');
    console.log('  ⚠️  Some authentication features may not work as expected');
  }

  // Recommendations
  console.log('');
  console.log('💡 RECOMMENDATIONS:');
  
  if (report.summary.failed === 0 && report.summary.skipped === 0) {
    console.log('  • ✅ System is ready for production deployment');
    console.log('  • 📊 Consider implementing monitoring dashboards');
    console.log('  • 🔄 Set up automated test execution in CI/CD pipeline');
    console.log('  • 📝 Update user documentation with new login formats');
  } else if (report.summary.failed === 0 && report.summary.skipped > 0) {
    console.log('  • 🧪 Re-run tests in isolated environment to avoid rate limiting');
    console.log('  • ✋ Manual verification of skipped critical authentication flows');
    console.log('  • 📊 Consider rate limit configuration for testing environments');
    console.log('  • ⚠️  Cautious production deployment - verify skipped tests manually');
  } else {
    console.log('  • 🔧 Fix failing tests before production deployment');
    console.log('  • 🧪 Re-run test suite after fixes');
    console.log('  • 📞 Consider additional manual testing for critical failures');
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('Phase 5e: Test and Monitor - COMPLETED');
}

// Execute if run directly
// For ES modules, check if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}