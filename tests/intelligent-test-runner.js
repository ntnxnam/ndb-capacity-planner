#!/usr/bin/env node

/**
 * NDB Capacity Planner - Intelligent Test Runner
 * Runs specific tests based on reported issues
 */

const TestFramework = require('./test-framework');
const fs = require('fs');
const path = require('path');

class IntelligentTestRunner {
  constructor() {
    this.tester = new TestFramework();
    this.issuePatterns = this.loadIssuePatterns();
    this.testRegistry = new Map();
  }

  // Load issue patterns and their corresponding test mappings
  loadIssuePatterns() {
    return {
      // Authentication & Security Issues
      'authentication|auth|login|token|credential': ['TC-P0-001', 'TC-SEC-001'],
      'sql injection|sql|injection|database|query': ['TC-P0-002', 'TC-SEC-002'],
      'xss|cross-site|script|injection|malicious': ['TC-P1-003', 'TC-SEC-002'],
      'security|vulnerability|exploit|attack|hack': ['TC-P0-001', 'TC-P0-002', 'TC-P1-003', 'TC-SEC-001', 'TC-SEC-002'],
      
      // Navigation & UI Issues
      'navigation|sidebar|breadcrumb|menu|nav': ['TC-P2-001', 'TC-P3-001'],
      'ui|interface|layout|display|visual': ['TC-P2-001', 'TC-P3-001', 'TC-P3-002'],
      'disappear|missing|not showing|hidden': ['TC-P2-001', 'TC-P3-001'],
      
      // Data & Validation Issues
      'validation|invalid|error|format|input': ['TC-P1-001', 'TC-P2-003'],
      'data|save|create|update|delete|crud': ['TC-P1-001', 'TC-P2-002', 'TC-P3-002', 'TC-FUNC-001'],
      'date|suggestion|calculation|timeline': ['TC-P2-004', 'TC-FUNC-001', 'TC-LOAD-002'],
      'jira|integration|external|api': ['TC-P1-002', 'TC-FUNC-002'],
      
      // Performance Issues
      'slow|performance|timeout|lag|delay': ['TC-P2-004', 'TC-LOAD-001', 'TC-LOAD-002'],
      'memory|crash|freeze|hang|unresponsive': ['TC-P1-004', 'TC-LOAD-001'],
      'concurrent|race|conflict|simultaneous': ['TC-P2-002', 'TC-LOAD-001'],
      
      // Rate Limiting Issues
      'rate limit|too many requests|throttle|blocked': ['TC-P0-003', 'TC-LOAD-001'],
      'request|api call|endpoint|service': ['TC-P0-003', 'TC-P2-004', 'TC-LOAD-001'],
      
      // Error Handling
      'error|exception|fail|broken|not working': ['TC-P2-003', 'TC-P1-001'],
      '500|400|404|unauthorized|forbidden': ['TC-P2-003', 'TC-P0-001'],
      
      // Port & Network Issues
      'port|3000|3001|connection|network': ['TC-P2-004', 'TC-P2-003'],
      'localhost|url|endpoint|service': ['TC-P2-004', 'TC-P2-003']
    };
  }

  // Register test cases with the runner
  registerTest(testId, testName, testFn, severity, category, keywords = []) {
    this.testRegistry.set(testId, {
      name: testName,
      fn: testFn,
      severity,
      category,
      keywords: keywords.map(k => k.toLowerCase())
    });
  }

  // Analyze issue description and find relevant tests
  analyzeIssue(issueDescription) {
    const description = issueDescription.toLowerCase();
    const relevantTests = new Set();
    
    // Check against issue patterns
    for (const [pattern, testIds] of Object.entries(this.issuePatterns)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(description)) {
        testIds.forEach(testId => relevantTests.add(testId));
      }
    }
    
    // Check against test keywords
    for (const [testId, test] of this.testRegistry) {
      for (const keyword of test.keywords) {
        if (description.includes(keyword)) {
          relevantTests.add(testId);
        }
      }
    }
    
    return Array.from(relevantTests);
  }

  // Run tests based on issue description
  async runTestsForIssue(issueDescription, options = {}) {
    console.log('🔍 Analyzing issue...'.cyan.bold);
    console.log(`Issue: ${issueDescription}\n`.white);
    
    const relevantTestIds = this.analyzeIssue(issueDescription);
    
    if (relevantTestIds.length === 0) {
      console.log('⚠️  No specific tests found for this issue. Running all tests...'.yellow);
      return await this.runAllTests();
    }
    
    console.log(`🎯 Found ${relevantTestIds.length} relevant test(s):`.green.bold);
    relevantTestIds.forEach(testId => {
      const test = this.testRegistry.get(testId);
      if (test) {
        console.log(`   - ${testId}: ${test.name} (${test.severity})`.white);
      }
    });
    console.log('');
    
    // Run only the relevant tests
    return await this.runSpecificTests(relevantTestIds, options);
  }

  // Run specific tests by ID
  async runSpecificTests(testIds, options = {}) {
    const testsToRun = testIds
      .map(id => this.testRegistry.get(id))
      .filter(test => test !== undefined);
    
    if (testsToRun.length === 0) {
      console.log('❌ No valid tests found for the provided IDs.'.red);
      return;
    }
    
    console.log(`🚀 Running ${testsToRun.length} specific test(s)...\n`.cyan.bold);
    
    // Clear existing tests
    this.tester.tests = [];
    
    // Register the specific tests
    testsToRun.forEach(test => {
      this.tester.test(test.name, test.fn, test.severity, test.category);
    });
    
    // Run the tests
    await this.tester.run();
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Running all tests...\n'.cyan.bold);
    
    // Clear existing tests
    this.tester.tests = [];
    
    // Register all tests
    for (const [testId, test] of this.testRegistry) {
      this.tester.test(test.name, test.fn, test.severity, test.category);
    }
    
    // Run the tests
    await this.tester.run();
  }

  // Add new issue pattern
  addIssuePattern(pattern, testIds) {
    this.issuePatterns[pattern] = testIds;
  }

  // Get test statistics
  getTestStats() {
    const stats = {
      total: this.testRegistry.size,
      bySeverity: {},
      byCategory: {}
    };
    
    for (const [testId, test] of this.testRegistry) {
      // Count by severity
      stats.bySeverity[test.severity] = (stats.bySeverity[test.severity] || 0) + 1;
      
      // Count by category
      stats.byCategory[test.category] = (stats.byCategory[test.category] || 0) + 1;
    }
    
    return stats;
  }

  // Export test results
  exportResults(format = 'json') {
    return this.tester.exportResults(format);
  }

  // Save test results to file
  async saveResults(filename = 'test-results.json') {
    const results = this.exportResults();
    const filepath = path.join(__dirname, filename);
    await fs.promises.writeFile(filepath, results);
    console.log(`📁 Results saved to: ${filepath}`.blue);
  }
}

// Load test cases and register them
function loadTestCases(runner) {
  // P0 - Critical Tests
  runner.registerTest('TC-P0-001', 'Authentication Bypass', async () => {
    // Test without authorization header
    try {
      await runner.tester.apiCall('GET', '/release-plans', null, {});
      runner.tester.assert(false, 'Should have been rejected without auth');
    } catch (error) {
      runner.tester.assertContains(error.message, '401', 'Should return 401 for unauthenticated request');
    }
  }, 'P0', 'SECURITY', ['authentication', 'auth', 'login', 'token', 'credential']);

  runner.registerTest('TC-P0-002', 'SQL Injection Prevention', async () => {
    const sqlPayloads = ["'; DROP TABLE release_plans; --", "1' OR '1'='1"];
    for (const payload of sqlPayloads) {
      try {
        await runner.tester.apiCall('POST', '/release-plans', {
          name: payload,
          ga_date: '2024-12-31T00:00:00.000Z'
        });
        runner.tester.assert(false, `Should reject SQL injection: ${payload}`);
      } catch (error) {
        runner.tester.assertContains(error.message, '400', 'Should reject SQL injection');
      }
    }
  }, 'P0', 'SECURITY', ['sql', 'injection', 'database', 'query']);

  runner.registerTest('TC-P0-003', 'Rate Limiting', async () => {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(
        runner.tester.apiCall('GET', '/release-plans').catch(err => err)
      );
    }
    const results = await Promise.all(promises);
    const rateLimited = results.filter(r => r.message && r.message.includes('Too many requests'));
    runner.tester.assert(rateLimited.length > 0, 'Rate limiting should kick in');
  }, 'P0', 'SECURITY', ['rate', 'limit', 'throttle', 'blocked']);

  // P1 - High Severity Tests
  runner.registerTest('TC-P1-001', 'Data Validation', async () => {
    try {
      await runner.tester.apiCall('POST', '/release-plans', {
        name: '', // Empty name
        ga_date: 'invalid-date'
      });
      runner.tester.assert(false, 'Should reject invalid data');
    } catch (error) {
      runner.tester.assertContains(error.message, '400', 'Should reject invalid data');
    }
  }, 'P1', 'VALIDATION', ['validation', 'invalid', 'error', 'format', 'input']);

  runner.registerTest('TC-P1-002', 'JIRA Integration', async () => {
    const statusResponse = await runner.tester.apiCall('GET', '/release-plans/jira-status');
    runner.tester.assertStatus(statusResponse, 200);
    runner.tester.assertResponseStructure(statusResponse, ['configured', 'connected']);
  }, 'P1', 'INTEGRATION', ['jira', 'integration', 'external', 'api']);

  runner.registerTest('TC-P1-003', 'XSS Prevention', async () => {
    const xssPayloads = ["<script>alert('XSS')</script>", "javascript:alert('XSS')"];
    for (const payload of xssPayloads) {
      try {
        await runner.tester.apiCall('POST', '/release-plans', {
          name: payload,
          ga_date: '2024-12-31T00:00:00.000Z'
        });
        runner.tester.assert(false, `Should reject XSS: ${payload}`);
      } catch (error) {
        runner.tester.assertContains(error.message, '400', 'Should reject XSS');
      }
    }
  }, 'P1', 'SECURITY', ['xss', 'cross-site', 'script', 'injection']);

  // P2 - Medium Severity Tests
  runner.registerTest('TC-P2-001', 'Navigation Consistency', async () => {
    const pages = ['/', '/release-plans', '/audit-logs'];
    for (const page of pages) {
      const response = await runner.tester.frontendCall(page);
      runner.tester.assertStatus(response, 200);
      runner.tester.assertContains(response.data, 'NDB Planner', 'Should contain navigation');
    }
  }, 'P2', 'UI', ['navigation', 'sidebar', 'breadcrumb', 'menu', 'nav']);

  runner.registerTest('TC-P2-002', 'Concurrent Access', async () => {
    const createResponse = await runner.tester.apiCall('POST', '/release-plans', {
      name: 'Test Plan',
      ga_date: '2024-12-31T00:00:00.000Z'
    });
    const planId = createResponse.data.data.id;

    const updatePromises = [];
    for (let i = 0; i < 3; i++) {
      updatePromises.push(
        runner.tester.apiCall('PUT', `/release-plans/${planId}`, {
          name: `Updated Plan ${i}`,
          ga_date: '2024-12-31T00:00:00.000Z'
        }).catch(err => err)
      );
    }

    const results = await Promise.all(updatePromises);
    const successful = results.filter(r => r.status === 200);
    runner.tester.assert(successful.length > 0, 'At least one update should succeed');

    await runner.tester.apiCall('DELETE', `/release-plans/${planId}`);
  }, 'P2', 'CONCURRENCY', ['concurrent', 'race', 'conflict', 'simultaneous']);

  runner.registerTest('TC-P2-003', 'Error Handling', async () => {
    try {
      await runner.tester.apiCall('GET', '/release-plans/non-existent-id');
      runner.tester.assert(false, 'Should return 404');
    } catch (error) {
      runner.tester.assertContains(error.message, '404', 'Should return 404 for non-existent resource');
    }
  }, 'P2', 'ERROR_HANDLING', ['error', 'exception', 'fail', 'broken', '404', '500']);

  runner.registerTest('TC-P2-004', 'Performance Testing', async () => {
    await runner.tester.performanceTest('Release Plans List', async () => {
      const response = await runner.tester.apiCall('GET', '/release-plans');
      runner.tester.assertStatus(response, 200);
    }, 2000);
  }, 'P2', 'PERFORMANCE', ['slow', 'performance', 'timeout', 'lag', 'delay']);

  // P3 - Low Severity Tests
  runner.registerTest('TC-P3-001', 'UI Consistency', async () => {
    const response = await runner.tester.frontendCall('/');
    runner.tester.assertContains(response.data, 'NDB Capacity Planner', 'Should contain main title');
  }, 'P3', 'UI', ['ui', 'interface', 'layout', 'display', 'visual']);

  runner.registerTest('TC-P3-002', 'Data Display', async () => {
    const createResponse = await runner.tester.apiCall('POST', '/release-plans', {
      name: 'Test Plan',
      ga_date: '2024-12-31T00:00:00.000Z'
    });
    const planId = createResponse.data.data.id;

    const getResponse = await runner.tester.apiCall('GET', `/release-plans/${planId}`);
    runner.tester.assertStatus(getResponse, 200);
    runner.tester.assert(getResponse.data.data.name === 'Test Plan', 'Plan name should match');

    await runner.tester.apiCall('DELETE', `/release-plans/${planId}`);
  }, 'P3', 'DATA', ['data', 'save', 'create', 'update', 'delete', 'display']);

  // Functional Tests
  runner.registerTest('TC-FUNC-001', 'Complete Release Plan Workflow', async () => {
    const createResponse = await runner.tester.apiCall('POST', '/release-plans', {
      name: 'Test Plan',
      ga_date: '2025-12-31T00:00:00.000Z'
    });
    runner.tester.assertStatus(createResponse, 201);
    const planId = createResponse.data.data.id;

    const suggestionsResponse = await runner.tester.apiCall('POST', '/release-plans/date-suggestions', {
      ga_date: '2025-12-31T00:00:00.000Z'
    });
    runner.tester.assertStatus(suggestionsResponse, 200);

    await runner.tester.apiCall('DELETE', `/release-plans/${planId}`);
  }, 'P1', 'FUNCTIONAL', ['date', 'suggestion', 'calculation', 'timeline', 'workflow']);

  runner.registerTest('TC-FUNC-002', 'JIRA Integration Workflow', async () => {
    const releasesResponse = await runner.tester.apiCall('GET', '/release-plans/jira-releases');
    runner.tester.assertStatus(releasesResponse, 200);
    runner.tester.assert(Array.isArray(releasesResponse.data), 'Should return array of releases');
  }, 'P1', 'FUNCTIONAL', ['jira', 'integration', 'external', 'api', 'workflow']);

  // Load Tests
  runner.registerTest('TC-LOAD-001', 'High Volume Release Plans', async () => {
    await runner.tester.loadTest('Create Multiple Release Plans', async () => {
      const response = await runner.tester.apiCall('POST', '/release-plans', {
        name: `Load Test Plan ${Date.now()}-${Math.random()}`,
        ga_date: '2024-12-31T00:00:00.000Z'
      });
      runner.tester.assertStatus(response, 201);
      await runner.tester.apiCall('DELETE', `/release-plans/${response.data.data.id}`);
    }, 3, 10);
  }, 'P2', 'LOAD', ['slow', 'performance', 'memory', 'crash', 'freeze']);

  runner.registerTest('TC-LOAD-002', 'Concurrent Date Suggestions', async () => {
    await runner.tester.loadTest('Concurrent Date Suggestions', async () => {
      const response = await runner.tester.apiCall('POST', '/release-plans/date-suggestions', {
        ga_date: '2025-12-31T00:00:00.000Z'
      });
      runner.tester.assertStatus(response, 200);
    }, 5, 20);
  }, 'P2', 'LOAD', ['concurrent', 'date', 'suggestion', 'performance']);

  // Security Tests
  runner.registerTest('TC-SEC-001', 'Authentication Security', async () => {
    try {
      await runner.tester.apiCall('GET', '/release-plans', null, { 'Authorization': 'Bearer invalid' });
      runner.tester.assert(false, 'Should reject invalid token');
    } catch (error) {
      runner.tester.assertContains(error.message, '401', 'Should return 401 for invalid token');
    }
  }, 'P0', 'SECURITY', ['authentication', 'auth', 'login', 'token', 'credential', 'security']);

  runner.registerTest('TC-SEC-002', 'Input Sanitization', async () => {
    const maliciousPayloads = [
      "'; DROP TABLE release_plans; --",
      "<script>alert('XSS')</script>",
      "../../../etc/passwd"
    ];

    for (const payload of maliciousPayloads) {
      try {
        await runner.tester.apiCall('POST', '/release-plans', {
          name: payload,
          ga_date: '2024-12-31T00:00:00.000Z'
        });
        runner.tester.assert(false, `Should reject malicious input: ${payload}`);
      } catch (error) {
        runner.tester.assertContains(error.message, '400', 'Should reject malicious input');
      }
    }
  }, 'P0', 'SECURITY', ['sql', 'injection', 'xss', 'cross-site', 'script', 'malicious', 'security']);
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const issueDescription = args.join(' ');
  
  if (!issueDescription) {
    console.log('Usage: node intelligent-test-runner.js "issue description"');
    console.log('Examples:');
    console.log('  node intelligent-test-runner.js "sidebar disappears on audit logs page"');
    console.log('  node intelligent-test-runner.js "failed to generate date suggestions"');
    console.log('  node intelligent-test-runner.js "sql injection vulnerability"');
    console.log('  node intelligent-test-runner.js "rate limiting too aggressive"');
    process.exit(1);
  }

  const runner = new IntelligentTestRunner();
  loadTestCases(runner);
  
  runner.runTestsForIssue(issueDescription)
    .then(() => {
      console.log('✅ Test run completed!'.green.bold);
    })
    .catch(error => {
      console.error('❌ Test run failed:'.red.bold, error.message);
      process.exit(1);
    });
}

module.exports = { IntelligentTestRunner, loadTestCases };
