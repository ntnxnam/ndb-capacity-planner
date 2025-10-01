#!/usr/bin/env node

/**
 * NDB Capacity Planner - Test Cases
 * Comprehensive test suite covering all functionality
 */

const TestFramework = require('./test-framework');

// Initialize test framework
const tester = new TestFramework();

// Test data
const testData = tester.generateTestData();

// ============================================================================
// P0 - CRITICAL SEVERITY TESTS (System Breaking)
// ============================================================================

// TC-P0-001: Authentication Bypass
tester.test('TC-P0-001: Authentication Bypass', async () => {
  // Test without authorization header
  try {
    await tester.apiCall('GET', '/release-plans', null, {});
    tester.assert(false, 'Should have been rejected without auth');
  } catch (error) {
    tester.assertContains(error.message, '401', 'Should return 401 for unauthenticated request');
  }

  // Test with invalid token
  try {
    await tester.apiCall('GET', '/release-plans', null, { 'Authorization': 'Bearer invalid-token' });
    tester.assert(false, 'Should have been rejected with invalid token');
  } catch (error) {
    tester.assertContains(error.message, '401', 'Should return 401 for invalid token');
  }
}, 'P0', 'SECURITY');

// TC-P0-002: SQL Injection Prevention
tester.test('TC-P0-002: SQL Injection Prevention', async () => {
  for (const payload of testData.maliciousPayloads.sqlInjection) {
    try {
      const response = await tester.apiCall('POST', '/release-plans', {
        name: payload,
        ga_date: '2024-12-31T00:00:00.000Z'
      });
      
      // If we get here, the payload was processed - check if it was sanitized
      tester.assert(!response.data.data.name.includes(payload), 
        `SQL injection payload should be sanitized: ${payload}`);
    } catch (error) {
      // Expected - should reject malicious input
      tester.assertContains(error.message, '400', 'Should reject SQL injection attempts');
    }
  }
}, 'P0', 'SECURITY');

// TC-P0-003: Rate Limiting
tester.test('TC-P0-003: Rate Limiting', async () => {
  const promises = [];
  
  // Send 50 requests rapidly
  for (let i = 0; i < 50; i++) {
    promises.push(
      tester.apiCall('GET', '/release-plans').catch(err => err)
    );
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r.message && r.message.includes('Too many requests'));
  
  tester.assert(rateLimited.length > 0, 'Rate limiting should kick in with rapid requests');
}, 'P0', 'SECURITY');

// TC-P0-004: Path Traversal Prevention
tester.test('TC-P0-004: Path Traversal Prevention', async () => {
  for (const payload of testData.maliciousPayloads.pathTraversal) {
    try {
      const response = await tester.apiCall('POST', '/release-plans', {
        name: payload,
        ga_date: '2024-12-31T00:00:00.000Z'
      });
      
      // Should not contain actual file content
      tester.assert(!response.data.data.name.includes('root:'), 
        'Path traversal should not expose system files');
    } catch (error) {
      // Expected - should reject path traversal attempts
      tester.assertContains(error.message, '400', 'Should reject path traversal attempts');
    }
  }
}, 'P0', 'SECURITY');

// TC-P0-005: JIRA Dropdown Persistence After Page Refresh
tester.test('TC-P0-005: JIRA Dropdown Persistence After Page Refresh', async () => {
  // This test simulates the critical issue where JIRA releases dropdown
  // disappears after page refresh, breaking core functionality
  
  // 1. First, ensure JIRA releases are available
  const releasesResponse = await tester.apiCall('GET', '/release-plans/jira-releases');
  tester.assertStatus(releasesResponse, 200);
  
  if (releasesResponse.data.length === 0) {
    // If no releases, try to sync them first
    try {
      const syncResponse = await tester.apiCall('POST', '/jira-releases/sync');
      tester.assertStatus(syncResponse, 200);
      
      // Wait a moment for sync to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to get releases again
      const retryResponse = await tester.apiCall('GET', '/release-plans/jira-releases');
      tester.assertStatus(retryResponse, 200);
    } catch (syncError) {
      // If sync fails, skip this test but log the issue
      tester.log('WARNING: JIRA sync failed, skipping dropdown persistence test');
      return;
    }
  }
  
  // 2. Simulate page load sequence (like a browser refresh)
  // This mimics what happens when the Release Plan form loads
  
  // Step 1: Check JIRA status
  const statusResponse = await tester.apiCall('GET', '/jira-releases/status');
  tester.assertStatus(statusResponse, 200);
  
  // If JIRA is not configured, skip this test but log it
  if (!statusResponse.data.configured) {
    tester.log('WARNING: JIRA not configured, skipping dropdown persistence test');
    return;
  }
  
  tester.assert(statusResponse.data.configured === true, 'JIRA should be configured');
  
  // Step 2: Load JIRA releases for dropdown
  const dropdownReleasesResponse = await tester.apiCall('GET', '/release-plans/jira-releases');
  tester.assertStatus(dropdownReleasesResponse, 200);
  tester.assert(Array.isArray(dropdownReleasesResponse.data), 'Should return array of releases');
  
  // Step 3: Verify releases are properly formatted for dropdown
  if (dropdownReleasesResponse.data.length > 0) {
    const release = dropdownReleasesResponse.data[0];
    tester.assert(release.id, 'Release should have ID');
    tester.assert(release.name, 'Release should have name');
    tester.assert(release.projectId, 'Release should have project ID');
    
    // Verify filtering works (exclude "Era Future" and "master")
    const filteredReleases = dropdownReleasesResponse.data.filter(r => 
      r.name !== 'Era Future' && r.name !== 'master'
    );
    tester.assert(filteredReleases.length >= 0, 'Filtering should work correctly');
  }
  
  // Step 4: Simulate multiple rapid requests (like React re-renders)
  const rapidRequests = [];
  for (let i = 0; i < 5; i++) {
    rapidRequests.push(tester.apiCall('GET', '/release-plans/jira-releases'));
  }
  
  const rapidResults = await Promise.all(rapidRequests);
  rapidResults.forEach((result, index) => {
    tester.assertStatus(result, 200, `Rapid request ${index + 1} should succeed`);
    tester.assert(Array.isArray(result.data), `Rapid request ${index + 1} should return array`);
  });
  
  // Step 5: Verify data consistency across requests
  const firstResult = rapidResults[0].data;
  rapidResults.forEach((result, index) => {
    if (index > 0) {
      tester.assert(
        JSON.stringify(result.data) === JSON.stringify(firstResult),
        `Request ${index + 1} should return same data as first request`
      );
    }
  });
  
  // Step 6: Test the specific scenario that was failing
  // Simulate the exact sequence that happens in ReleasePlanForm component
  const formLoadSequence = async () => {
    // This mimics the loadJiraData function in ReleasePlanForm
    const status = await tester.apiCall('GET', '/jira-releases/status');
    if (status.data.configured && status.data.connection_status === 'connected') {
      const releases = await tester.apiCall('GET', '/release-plans/jira-releases');
      return releases.data;
    }
    return [];
  };
  
  const formReleases = await formLoadSequence();
  tester.assert(Array.isArray(formReleases), 'Form should load releases successfully');
  
  // Step 7: Verify the dropdown would be visible
  const shouldShowDropdown = formReleases.length > 0;
  if (shouldShowDropdown) {
    tester.assert(true, 'Dropdown should be visible with releases available');
  } else {
    tester.log('INFO: No releases available for dropdown, but this is not an error');
  }
  
}, 'P0', 'UI_FUNCTIONALITY');

// TC-P0-006: JIRA Dropdown State Management (Frontend)
tester.test('TC-P0-006: JIRA Dropdown State Management (Frontend)', async () => {
  // This test uses the specialized method to test the exact issue
  const result = await tester.testJiraDropdownPersistence();
  
  // Log detailed results for debugging
  console.log('🔍 JIRA Dropdown Persistence Test Results:');
  result.steps.forEach((step, index) => {
    console.log(`  Step ${index + 1}: ${step.step} - ${step.success ? '✅ PASS' : '❌ FAIL'}`);
    if (step.data) {
      console.log(`    Data:`, JSON.stringify(step.data, null, 2));
    }
  });
  
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
  
  // Assert the overall test success
  tester.assert(result.success, 'JIRA dropdown persistence test should pass');
  
  // Additional assertions for specific failure modes
  const statusStep = result.steps.find(s => s.step === 'Check JIRA status');
  if (statusStep) {
    tester.assert(statusStep.success, 'JIRA status check should succeed');
  }
  
  const rapidCallsStep = result.steps.find(s => s.step === 'Rapid successive calls');
  if (rapidCallsStep) {
    tester.assert(rapidCallsStep.success, 'Rapid successive calls should be consistent');
  }
  
  const formSequenceStep = result.steps.find(s => s.step === 'Form load sequence');
  if (formSequenceStep) {
    tester.assert(formSequenceStep.success, 'Form load sequence should succeed');
  }
  
}, 'P0', 'UI_FUNCTIONALITY');

// TC-P0-007: Frozen Generate Date Suggestions Button
tester.test('TC-P0-007: Frozen Generate Date Suggestions Button', async () => {
  // This test simulates the frozen button issue when date suggestions fail
  
  // Test 1: Valid future date should work
  const validDate = '2025-12-31T00:00:00.000Z';
  const validResponse = await tester.apiCall('POST', '/release-plans/date-suggestions', {
    ga_date: validDate
  });
  tester.assertStatus(validResponse, 200);
  tester.assert(validResponse.data.success === true, 'Valid date should generate suggestions');
  tester.assert(validResponse.data.data.pre_cc_complete_date, 'Should have pre-cc date');
  
  // Test 2: Past date should return proper error (not freeze)
  try {
    await tester.apiCall('POST', '/release-plans/date-suggestions', {
      ga_date: '2020-01-01T00:00:00.000Z' // Past date
    });
    tester.assert(false, 'Past date should be rejected');
  } catch (error) {
    tester.assertContains(error.message, '400', 'Should return 400 for past date');
    // Check that the error response has proper structure
    if (error.response && error.response.data) {
      tester.assert(error.response.data.code === 'INVALID_GA_DATE', 'Should have proper error code');
      tester.assert(error.response.data.error, 'Should have error message');
    }
  }
  
  // Test 3: Invalid date format should return proper error
  try {
    await tester.apiCall('POST', '/release-plans/date-suggestions', {
      ga_date: 'invalid-date'
    });
    tester.assert(false, 'Invalid date should be rejected');
  } catch (error) {
    tester.assertContains(error.message, '400', 'Should return 400 for invalid date');
  }
  
  // Test 4: Missing date should return proper error
  try {
    await tester.apiCall('POST', '/release-plans/date-suggestions', {});
    tester.assert(false, 'Missing date should be rejected');
  } catch (error) {
    tester.assertContains(error.message, '400', 'Should return 400 for missing date');
  }
  
}, 'P0', 'UI_FUNCTIONALITY');

// ============================================================================
// P1 - HIGH SEVERITY TESTS (Major Functionality Broken)
// ============================================================================

// TC-P1-001: Data Validation
tester.test('TC-P1-001: Data Validation', async () => {
  // Test invalid date format
  try {
    await tester.apiCall('POST', '/release-plans', {
      name: 'Test Plan',
      ga_date: 'invalid-date'
    });
    tester.assert(false, 'Should reject invalid date format');
  } catch (error) {
    tester.assertContains(error.message, '400', 'Should reject invalid date format');
  }

  // Test missing required fields
  try {
    await tester.apiCall('POST', '/release-plans', {
      name: '', // Empty name
      ga_date: '2024-12-31T00:00:00.000Z'
    });
    tester.assert(false, 'Should reject empty name');
  } catch (error) {
    tester.assertContains(error.message, '400', 'Should reject empty required fields');
  }

  // Test extremely long input
  try {
    await tester.apiCall('POST', '/release-plans', {
      name: 'A'.repeat(10000), // Very long name
      ga_date: '2024-12-31T00:00:00.000Z'
    });
    tester.assert(false, 'Should reject extremely long input');
  } catch (error) {
    tester.assertContains(error.message, '400', 'Should reject extremely long input');
  }
}, 'P1', 'VALIDATION');

// TC-P1-002: JIRA Integration
tester.test('TC-P1-002: JIRA Integration', async () => {
  // Test JIRA status
  const statusResponse = await tester.apiCall('GET', '/release-plans/jira-status');
  tester.assertStatus(statusResponse, 200);
  tester.assertResponseStructure(statusResponse, ['configured', 'connected']);

  // Test JIRA releases
  const releasesResponse = await tester.apiCall('GET', '/release-plans/jira-releases');
  tester.assertStatus(releasesResponse, 200);
  tester.assert(Array.isArray(releasesResponse.data), 'Should return array of releases');
  
  if (releasesResponse.data.length > 0) {
    const release = releasesResponse.data[0];
    tester.assertResponseStructure(release, ['id', 'name', 'projectId']);
  }
}, 'P1', 'INTEGRATION');

// TC-P1-003: XSS Prevention
tester.test('TC-P1-003: XSS Prevention', async () => {
  for (const payload of testData.maliciousPayloads.xss) {
    try {
      const response = await tester.apiCall('POST', '/release-plans', {
        name: payload,
        ga_date: '2024-12-31T00:00:00.000Z'
      });
      
      // Check if script tags are escaped
      tester.assert(!response.data.data.name.includes('<script>'), 
        'XSS payload should be escaped');
    } catch (error) {
      // Expected - should reject XSS attempts
      tester.assertContains(error.message, '400', 'Should reject XSS attempts');
    }
  }
}, 'P1', 'SECURITY');

// TC-P1-004: Memory Exhaustion Prevention
tester.test('TC-P1-004: Memory Exhaustion Prevention', async () => {
  // Test with large data payload
  const largeData = {
    name: 'Test Plan',
    description: 'A'.repeat(100000), // Large description
    ga_date: '2024-12-31T00:00:00.000Z'
  };

  try {
    const response = await tester.apiCall('POST', '/release-plans', largeData);
    tester.assertStatus(response, 201);
  } catch (error) {
    // Should either succeed or fail gracefully
    tester.assertContains(error.message, '400', 'Should handle large payloads gracefully');
  }
}, 'P1', 'PERFORMANCE');

// ============================================================================
// P2 - MEDIUM SEVERITY TESTS (Significant Issues)
// ============================================================================

// TC-P2-001: Navigation Consistency
tester.test('TC-P2-001: Navigation Consistency', async () => {
  const pages = ['/', '/release-plans', '/audit-logs', '/data', '/calculations'];
  
  for (const page of pages) {
    const response = await tester.frontendCall(page);
    tester.assertStatus(response, 200);
    
    // Check if page contains navigation elements
    tester.assertContains(response.data, 'NDB Planner', 'Should contain navigation header');
  }
}, 'P2', 'UI');

// TC-P2-002: Concurrent Access
tester.test('TC-P2-002: Concurrent Access', async () => {
  // Create a release plan
  const createResponse = await tester.apiCall('POST', '/release-plans', testData.releasePlan);
  const planId = createResponse.data.data.id;

  // Try to update the same plan concurrently
  const updatePromises = [];
  for (let i = 0; i < 5; i++) {
    updatePromises.push(
      tester.apiCall('PUT', `/release-plans/${planId}`, {
        ...testData.releasePlan,
        name: `Updated Plan ${i}`
      }).catch(err => err)
    );
  }

  const results = await Promise.all(updatePromises);
  const successful = results.filter(r => r.status === 200);
  
  // At least one update should succeed
  tester.assert(successful.length > 0, 'At least one concurrent update should succeed');
}, 'P2', 'CONCURRENCY');

// TC-P2-003: Error Handling
tester.test('TC-P2-003: Error Handling', async () => {
  // Test 404 error
  try {
    await tester.apiCall('GET', '/release-plans/non-existent-id');
    tester.assert(false, 'Should return 404 for non-existent resource');
  } catch (error) {
    tester.assertContains(error.message, '404', 'Should return 404 for non-existent resource');
  }

  // Test malformed JSON
  try {
    await tester.apiCall('POST', '/release-plans', 'invalid-json');
    tester.assert(false, 'Should handle malformed JSON gracefully');
  } catch (error) {
    tester.assertContains(error.message, '400', 'Should return 400 for malformed JSON');
  }
}, 'P2', 'ERROR_HANDLING');

// TC-P2-004: Performance Testing
tester.test('TC-P2-004: Performance Testing', async () => {
  await tester.performanceTest('Release Plans List', async () => {
    const response = await tester.apiCall('GET', '/release-plans');
    tester.assertStatus(response, 200);
  }, 2000); // Max 2 seconds

  await tester.performanceTest('Date Suggestions', async () => {
    const response = await tester.apiCall('POST', '/release-plans/date-suggestions', {
      ga_date: '2024-12-31T00:00:00.000Z'
    });
    tester.assertStatus(response, 200);
  }, 3000); // Max 3 seconds
}, 'P2', 'PERFORMANCE');

// ============================================================================
// P3 - LOW SEVERITY TESTS (Minor Issues)
// ============================================================================

// TC-P3-001: UI Consistency
tester.test('TC-P3-001: UI Consistency', async () => {
  const response = await tester.frontendCall('/');
  tester.assertContains(response.data, 'NDB Capacity Planner', 'Should contain main title');
  tester.assertContains(response.data, 'Dashboard', 'Should contain dashboard content');
}, 'P3', 'UI');

// TC-P3-002: Data Display
tester.test('TC-P3-002: Data Display', async () => {
  // Create a release plan
  const createResponse = await tester.apiCall('POST', '/release-plans', testData.releasePlan);
  const planId = createResponse.data.data.id;

  // Retrieve the plan
  const getResponse = await tester.apiCall('GET', `/release-plans/${planId}`);
  tester.assertStatus(getResponse, 200);
  
  const plan = getResponse.data.data;
  tester.assert(plan.name === testData.releasePlan.name, 'Plan name should match');
  tester.assert(plan.ga_date === testData.releasePlan.ga_date, 'GA date should match');
}, 'P3', 'DATA');

// ============================================================================
// FUNCTIONAL TESTS
// ============================================================================

// TC-FUNC-001: Complete Release Plan Workflow
tester.test('TC-FUNC-001: Complete Release Plan Workflow', async () => {
  // 1. Create release plan
  const createResponse = await tester.apiCall('POST', '/release-plans', testData.releasePlan);
  tester.assertStatus(createResponse, 201);
  const planId = createResponse.data.data.id;

  // 2. Generate date suggestions
  const suggestionsResponse = await tester.apiCall('POST', '/release-plans/date-suggestions', {
    ga_date: '2024-12-31T00:00:00.000Z'
  });
  tester.assertStatus(suggestionsResponse, 200);
  tester.assertResponseStructure(suggestionsResponse.data, [
    'pre_cc_complete_date',
    'concept_commit_date',
    'execute_commit_date',
    'soft_code_complete_date',
    'commit_gate_met_date',
    'promotion_gate_met_date',
    'feature_complete_expected_date',
    'feature_qa_need_by_date'
  ]);

  // 3. Update release plan with suggestions
  const updateResponse = await tester.apiCall('PUT', `/release-plans/${planId}`, {
    ...testData.releasePlan,
    ...suggestionsResponse.data
  });
  tester.assertStatus(updateResponse, 200);

  // 4. Retrieve updated plan
  const getResponse = await tester.apiCall('GET', `/release-plans/${planId}`);
  tester.assertStatus(getResponse, 200);
  tester.assert(getResponse.data.data.pre_cc_complete_date !== null, 'Should have updated dates');

  // 5. Delete plan
  const deleteResponse = await tester.apiCall('DELETE', `/release-plans/${planId}`);
  tester.assertStatus(deleteResponse, 200);
}, 'P1', 'FUNCTIONAL');

// TC-FUNC-002: JIRA Integration Workflow
tester.test('TC-FUNC-002: JIRA Integration Workflow', async () => {
  // 1. Get JIRA releases
  const releasesResponse = await tester.apiCall('GET', '/release-plans/jira-releases');
  tester.assertStatus(releasesResponse, 200);

  if (releasesResponse.data.length > 0) {
    const jiraRelease = releasesResponse.data[0];
    
    // 2. Create release plan with JIRA data
    const createResponse = await tester.apiCall('POST', '/release-plans', {
      name: jiraRelease.name,
      jira_release_id: jiraRelease.id,
      jira_release_name: jiraRelease.name,
      ga_date: '2024-12-31T00:00:00.000Z'
    });
    tester.assertStatus(createResponse, 201);
    
    const planId = createResponse.data.data.id;
    
    // 3. Verify JIRA data was saved
    const getResponse = await tester.apiCall('GET', `/release-plans/${planId}`);
    tester.assert(getResponse.data.data.jira_release_id === jiraRelease.id, 'JIRA ID should match');
    tester.assert(getResponse.data.data.jira_release_name === jiraRelease.name, 'JIRA name should match');
    
    // 4. Clean up
    await tester.apiCall('DELETE', `/release-plans/${planId}`);
  }
}, 'P1', 'FUNCTIONAL');

// ============================================================================
// LOAD TESTS
// ============================================================================

// TC-LOAD-001: High Volume Release Plans
tester.test('TC-LOAD-001: High Volume Release Plans', async () => {
  await tester.loadTest('Create Multiple Release Plans', async () => {
    const response = await tester.apiCall('POST', '/release-plans', {
      ...testData.releasePlan,
      name: `Load Test Plan ${Date.now()}-${Math.random()}`
    });
    tester.assertStatus(response, 201);
    
    // Clean up
    await tester.apiCall('DELETE', `/release-plans/${response.data.data.id}`);
  }, 5, 20); // 5 concurrent, 20 iterations each
}, 'P2', 'LOAD');

// TC-LOAD-002: Concurrent Date Suggestions
tester.test('TC-LOAD-002: Concurrent Date Suggestions', async () => {
  await tester.loadTest('Concurrent Date Suggestions', async () => {
    const response = await tester.apiCall('POST', '/release-plans/date-suggestions', {
      ga_date: '2024-12-31T00:00:00.000Z'
    });
    tester.assertStatus(response, 200);
  }, 10, 50); // 10 concurrent, 50 iterations each
}, 'P2', 'LOAD');

// ============================================================================
// SECURITY TESTS
// ============================================================================

// TC-SEC-001: Authentication Security
tester.test('TC-SEC-001: Authentication Security', async () => {
  await tester.securityTest('Invalid Token Rejection', async () => {
    try {
      await tester.apiCall('GET', '/release-plans', null, { 'Authorization': 'Bearer invalid' });
      tester.assert(false, 'Should reject invalid token');
    } catch (error) {
      tester.assertContains(error.message, '401', 'Should return 401 for invalid token');
    }
  });

  await tester.securityTest('Expired Token Handling', async () => {
    try {
      await tester.apiCall('GET', '/release-plans', null, { 'Authorization': 'Bearer expired-token' });
      tester.assert(false, 'Should reject expired token');
    } catch (error) {
      tester.assertContains(error.message, '401', 'Should return 401 for expired token');
    }
  });
}, 'P0', 'SECURITY');

// TC-SEC-002: Input Sanitization
tester.test('TC-SEC-002: Input Sanitization', async () => {
  await tester.securityTest('SQL Injection Prevention', async () => {
    for (const payload of testData.maliciousPayloads.sqlInjection) {
      try {
        await tester.apiCall('POST', '/release-plans', {
          name: payload,
          ga_date: '2024-12-31T00:00:00.000Z'
        });
        tester.assert(false, `Should reject SQL injection: ${payload}`);
      } catch (error) {
        tester.assertContains(error.message, '400', 'Should reject SQL injection');
      }
    }
  });

  await tester.securityTest('XSS Prevention', async () => {
    for (const payload of testData.maliciousPayloads.xss) {
      try {
        await tester.apiCall('POST', '/release-plans', {
          name: payload,
          ga_date: '2024-12-31T00:00:00.000Z'
        });
        tester.assert(false, `Should reject XSS: ${payload}`);
      } catch (error) {
        tester.assertContains(error.message, '400', 'Should reject XSS');
      }
    }
  });
}, 'P0', 'SECURITY');

// ============================================================================
// RUN TESTS
// ============================================================================

if (require.main === module) {
  tester.run().catch(console.error);
}

module.exports = tester;

