# 🧪 NDB Capacity Planner - Intelligent Test Framework

A lightweight, intelligent test framework that automatically runs relevant tests based on reported issues.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Backend running on port 3001
- Frontend running on port 3000

### Installation
```bash
cd tests
npm install
```

### Running Tests

#### Run tests for a specific issue:
```bash
./run-tests.sh "sidebar disappears on audit logs page"
```

#### Run tests via Node.js:
```bash
node intelligent-test-runner.js "failed to generate date suggestions"
```

#### Run all tests:
```bash
node intelligent-test-runner.js "run all tests"
```

## 🎯 Intelligent Test Selection

The framework automatically selects relevant tests based on issue keywords:

### Issue Patterns → Test Selection

| Issue Keywords | Selected Tests | Severity |
|----------------|----------------|----------|
| `authentication`, `auth`, `login`, `token` | TC-P0-001, TC-SEC-001 | P0 |
| `sql injection`, `sql`, `database` | TC-P0-002, TC-SEC-002 | P0 |
| `xss`, `cross-site`, `script` | TC-P1-003, TC-SEC-002 | P1 |
| `navigation`, `sidebar`, `breadcrumb` | TC-P2-001, TC-P3-001 | P2/P3 |
| `validation`, `invalid`, `error` | TC-P1-001, TC-P2-003 | P1/P2 |
| `data`, `save`, `create`, `update` | TC-P1-001, TC-P2-002, TC-P3-002 | P1/P2/P3 |
| `date`, `suggestion`, `calculation` | TC-P2-004, TC-FUNC-001, TC-LOAD-002 | P1/P2 |
| `jira`, `integration`, `external` | TC-P1-002, TC-FUNC-002 | P1 |
| `slow`, `performance`, `timeout` | TC-P2-004, TC-LOAD-001, TC-LOAD-002 | P2 |
| `rate limit`, `too many requests` | TC-P0-003, TC-LOAD-001 | P0/P2 |
| `port`, `3000`, `3001`, `connection` | TC-P2-004, TC-P2-003 | P2 |

## 📋 Test Categories

### P0 - Critical Severity (System Breaking)
- **TC-P0-001**: Authentication Bypass
- **TC-P0-002**: SQL Injection Prevention  
- **TC-P0-003**: Rate Limiting
- **TC-SEC-001**: Authentication Security
- **TC-SEC-002**: Input Sanitization

### P1 - High Severity (Major Functionality Broken)
- **TC-P1-001**: Data Validation
- **TC-P1-002**: JIRA Integration
- **TC-P1-003**: XSS Prevention
- **TC-FUNC-001**: Complete Release Plan Workflow
- **TC-FUNC-002**: JIRA Integration Workflow

### P2 - Medium Severity (Significant Issues)
- **TC-P2-001**: Navigation Consistency
- **TC-P2-002**: Concurrent Access
- **TC-P2-003**: Error Handling
- **TC-P2-004**: Performance Testing
- **TC-LOAD-001**: High Volume Release Plans
- **TC-LOAD-002**: Concurrent Date Suggestions

### P3 - Low Severity (Minor Issues)
- **TC-P3-001**: UI Consistency
- **TC-P3-002**: Data Display

## 🔧 Test Framework Features

### Intelligent Test Selection
- Analyzes issue descriptions using keyword matching
- Maps issues to relevant test cases automatically
- Runs only necessary tests to save time

### Comprehensive Test Coverage
- **Security Tests**: Authentication, SQL injection, XSS prevention
- **Functional Tests**: Complete workflows, API integration
- **Performance Tests**: Load testing, concurrent access
- **UI Tests**: Navigation, consistency, display
- **Validation Tests**: Input validation, error handling

### Test Utilities
- **API Testing**: Automated API calls with assertions
- **Frontend Testing**: Page loading and content verification
- **Performance Testing**: Response time measurement
- **Load Testing**: Concurrent request simulation
- **Security Testing**: Malicious payload injection

## 📊 Test Results

### Output Format
```
🔍 Analyzing issue...
Issue: sidebar disappears on audit logs page

🎯 Found 2 relevant test(s):
   - TC-P2-001: Navigation Consistency (P2)
   - TC-P3-001: UI Consistency (P3)

🚀 Running 2 specific test(s)...

🧪 NDB Capacity Planner Test Framework
=====================================

Running: Navigation Consistency
✅ PASSED: Navigation Consistency

Running: UI Consistency
✅ PASSED: UI Consistency

📊 TEST SUMMARY
================
Total Tests: 2
✅ Passed: 2
❌ Failed: 0
⏭️  Skipped: 0
📈 Pass Rate: 100.0%

✅ Test run completed!
```

### Result Export
- JSON format export
- Detailed test results
- Performance metrics
- Error details

## 🛠️ Adding New Tests

### 1. Register Test Case
```javascript
runner.registerTest('TC-NEW-001', 'New Test Name', async () => {
  // Test implementation
  const response = await runner.tester.apiCall('GET', '/endpoint');
  runner.tester.assertStatus(response, 200);
}, 'P1', 'CATEGORY', ['keyword1', 'keyword2']);
```

### 2. Add Issue Pattern
```javascript
runner.addIssuePattern('new issue|problem|bug', ['TC-NEW-001']);
```

### 3. Test Categories
- **SECURITY**: Authentication, authorization, input validation
- **FUNCTIONAL**: Business logic, workflows, integrations
- **PERFORMANCE**: Speed, load, concurrent access
- **UI**: User interface, navigation, display
- **VALIDATION**: Data validation, error handling
- **LOAD**: High volume, stress testing

## 🚨 Common Issues & Solutions

### Issue: "Too many requests from this IP"
**Solution**: Rate limiting is working. Wait a few minutes or restart the backend.

### Issue: "GA date cannot be in the past"
**Solution**: Use future dates in test data (e.g., 2025-12-31).

### Issue: "Frontend call failed: 404"
**Solution**: Ensure frontend is running on port 3000.

### Issue: "API call failed: 401"
**Solution**: Ensure backend is running and authentication is working.

## 📈 Continuous Improvement

### Adding New Issue Patterns
When new issues are reported, add them to the pattern matching:

```javascript
// In intelligent-test-runner.js
this.issuePatterns = {
  // ... existing patterns
  'new issue type|specific problem': ['TC-RELEVANT-001', 'TC-RELEVANT-002']
};
```

### Enhancing Test Coverage
- Add new test cases for uncovered functionality
- Improve existing tests based on real issues
- Add performance benchmarks
- Enhance security test coverage

## 🎯 Best Practices

1. **Run specific tests** for reported issues rather than all tests
2. **Use descriptive issue descriptions** for better test selection
3. **Monitor test results** and update patterns as needed
4. **Keep test data current** (use future dates, valid formats)
5. **Document new test cases** with clear descriptions and keywords

## 🔍 Debugging

### Enable Verbose Output
```javascript
const tester = new TestFramework();
tester.config.verbose = true;
```

### Check Test Registry
```javascript
console.log(runner.getTestStats());
```

### Export Results
```javascript
await runner.saveResults('debug-results.json');
```

---

**Framework Version**: 1.0.0  
**Last Updated**: October 1, 2025  
**Maintainer**: NDB Capacity Planner Team

