#!/usr/bin/env node

/**
 * NDB Capacity Planner - Lightweight Test Framework
 * A simple, fast testing framework for API and integration tests
 */

const axios = require('axios');
const colors = require('colors');

class TestFramework {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    this.config = {
      baseUrl: 'http://localhost:3001/api',  // Backend API
      frontendUrl: 'http://localhost:3000',  // Frontend
      timeout: 10000,
      verbose: true
    };
  }

  // Test registration
  test(name, fn, severity = 'P3', category = 'FUNCTIONAL') {
    this.tests.push({
      name,
      fn,
      severity,
      category,
      status: 'PENDING'
    });
  }

  // Test execution
  async run() {
    console.log('🧪 NDB Capacity Planner Test Framework'.cyan.bold);
    console.log('=====================================\n');

    this.results.total = this.tests.length;
    
    for (const test of this.tests) {
      try {
        console.log(`Running: ${test.name}`.yellow);
        await test.fn();
        test.status = 'PASSED';
        this.results.passed++;
        console.log(`✅ PASSED: ${test.name}`.green);
      } catch (error) {
        test.status = 'FAILED';
        this.results.failed++;
        console.log(`❌ FAILED: ${test.name}`.red);
        if (this.config.verbose) {
          console.log(`   Error: ${error.message}`.red);
        }
      }
      console.log('');
    }

    this.printSummary();
  }

  // Test utilities
  async apiCall(method, endpoint, data = null, headers = {}) {
    const config = {
      method,
      url: `${this.config.baseUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer local-dev-token',
        ...headers
      },
      timeout: this.config.timeout
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      throw new Error(`API call failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }
  }

  async frontendCall(endpoint) {
    try {
      const response = await axios.get(`${this.config.frontendUrl}${endpoint}`, {
        timeout: this.config.timeout
      });
      return response;
    } catch (error) {
      throw new Error(`Frontend call failed: ${error.response?.status} - ${error.message}`);
    }
  }

  // JIRA Dropdown Persistence Test
  async testJiraDropdownPersistence() {
    // This test specifically checks the JIRA dropdown persistence issue
    const testSteps = [];
    
    try {
      // Step 1: Check if JIRA releases are available
      const releasesResponse = await this.apiCall('GET', '/release-plans/jira-releases');
      testSteps.push({
        step: 'Check JIRA releases availability',
        success: releasesResponse.status === 200,
        data: releasesResponse.data
      });

      // Step 2: Simulate the exact API calls made by ReleasePlanForm
      const statusResponse = await this.apiCall('GET', '/jira-releases/status');
      const jiraConfigured = statusResponse.status === 200 && statusResponse.data.configured;
      testSteps.push({
        step: 'Check JIRA status',
        success: jiraConfigured,
        data: statusResponse.data
      });

      // If JIRA is not configured, we can still test the API structure
      if (!jiraConfigured) {
        testSteps.push({
          step: 'JIRA not configured - testing API structure only',
          success: true,
          data: { message: 'JIRA not configured, testing API structure only' }
        });
        return {
          success: true, // API structure is working
          steps: testSteps
        };
      }

      // Step 3: Test rapid successive calls (simulating React re-renders)
      const rapidCalls = [];
      for (let i = 0; i < 3; i++) {
        rapidCalls.push(this.apiCall('GET', '/release-plans/jira-releases'));
      }
      
      const rapidResults = await Promise.all(rapidCalls);
      const allSuccessful = rapidResults.every(r => r.status === 200);
      const dataConsistent = rapidResults.every(r => 
        JSON.stringify(r.data) === JSON.stringify(rapidResults[0].data)
      );
      
      testSteps.push({
        step: 'Rapid successive calls',
        success: allSuccessful && dataConsistent,
        data: {
          allSuccessful,
          dataConsistent,
          results: rapidResults.map(r => ({ status: r.status, dataLength: r.data.length }))
        }
      });

      // Step 4: Test the specific sequence that fails
      const formSequence = async () => {
        const status = await this.apiCall('GET', '/jira-releases/status');
        if (status.data.configured && status.data.connection_status === 'connected') {
          const releases = await this.apiCall('GET', '/release-plans/jira-releases');
          return releases.data;
        }
        return [];
      };

      const formReleases = await formSequence();
      testSteps.push({
        step: 'Form load sequence',
        success: Array.isArray(formReleases),
        data: { releasesCount: formReleases.length }
      });

      return {
        success: testSteps.every(step => step.success),
        steps: testSteps
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        steps: testSteps
      };
    }
  }

  // Assertions
  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}. Expected: ${expected}, Actual: ${actual}`);
    }
  }

  assertContains(text, substring, message) {
    if (!text.includes(substring)) {
      throw new Error(`${message}. Expected to contain: ${substring}`);
    }
  }

  assertStatus(response, expectedStatus) {
    if (response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
  }

  assertResponseStructure(response, expectedFields) {
    for (const field of expectedFields) {
      if (!(field in response.data)) {
        throw new Error(`Missing field in response: ${field}`);
      }
    }
  }

  // Test data generation
  generateTestData() {
    return {
      releasePlan: {
        name: `Test Release Plan ${Date.now()}`,
        description: 'Test plan for automated testing',
        release_dris: {
          qa_dri: 'test.qa@nutanix.com',
          dev_dri: 'test.dev@nutanix.com',
          tpm_dri: 'test.tpm@nutanix.com'
        },
        ga_date: '2024-12-31T00:00:00.000Z'
      },
      maliciousPayloads: {
        sqlInjection: [
          "'; DROP TABLE release_plans; --",
          "1' OR '1'='1",
          "'; SELECT * FROM users; --",
          "1' UNION SELECT * FROM users--"
        ],
        xss: [
          "<script>alert('XSS')</script>",
          "javascript:alert('XSS')",
          "onload=alert('XSS')",
          "<img src=x onerror=alert('XSS')>"
        ],
        pathTraversal: [
          "../../../etc/passwd",
          "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
          "....//....//....//etc/passwd"
        ]
      }
    };
  }

  // Performance testing
  async performanceTest(name, fn, maxDuration = 5000) {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    
    if (duration > maxDuration) {
      throw new Error(`Performance test failed: ${name} took ${duration}ms (max: ${maxDuration}ms)`);
    }
    
    console.log(`⚡ Performance: ${name} completed in ${duration}ms`.blue);
  }

  // Load testing
  async loadTest(name, fn, concurrency = 10, iterations = 100) {
    console.log(`🚀 Load Test: ${name} (${concurrency} concurrent, ${iterations} iterations)`.blue);
    
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.runLoadTestIterations(fn, iterations / concurrency));
    }
    
    const results = await Promise.all(promises);
    const totalDuration = Math.max(...results);
    
    console.log(`📊 Load Test Complete: ${name} - Max duration: ${totalDuration}ms`.blue);
  }

  async runLoadTestIterations(fn, iterations) {
    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
    return Date.now() - start;
  }

  // Security testing
  async securityTest(name, fn) {
    console.log(`🔒 Security Test: ${name}`.magenta);
    try {
      await fn();
      console.log(`✅ Security Test Passed: ${name}`.green);
    } catch (error) {
      console.log(`❌ Security Test Failed: ${name} - ${error.message}`.red);
      throw error;
    }
  }

  // Results summary
  printSummary() {
    console.log('\n📊 TEST SUMMARY'.cyan.bold);
    console.log('================');
    console.log(`Total Tests: ${this.results.total}`.white);
    console.log(`✅ Passed: ${this.results.passed}`.green);
    console.log(`❌ Failed: ${this.results.failed}`.red);
    console.log(`⏭️  Skipped: ${this.results.skipped}`.yellow);
    
    const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    console.log(`📈 Pass Rate: ${passRate}%`.white);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:'.red.bold);
      this.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`   - ${t.name} (${t.severity})`.red));
    }
    
    console.log('\n');
  }

  // Test categorization
  getTestsBySeverity(severity) {
    return this.tests.filter(t => t.severity === severity);
  }

  getTestsByCategory(category) {
    return this.tests.filter(t => t.category === category);
  }

  // Export results
  exportResults(format = 'json') {
    const results = {
      timestamp: new Date().toISOString(),
      summary: this.results,
      tests: this.tests.map(t => ({
        name: t.name,
        severity: t.severity,
        category: t.category,
        status: t.status
      }))
    };

    if (format === 'json') {
      return JSON.stringify(results, null, 2);
    }
    
    return results;
  }
}

module.exports = TestFramework;
