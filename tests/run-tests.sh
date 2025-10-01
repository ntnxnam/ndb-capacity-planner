#!/bin/bash

# NDB Capacity Planner - Test Runner Script
# Usage: ./run-tests.sh "issue description"

echo "🧪 NDB Capacity Planner Test Runner"
echo "=================================="
echo ""

# Check if issue description is provided
if [ -z "$1" ]; then
    echo "Usage: ./run-tests.sh \"issue description\""
    echo ""
    echo "Examples:"
    echo "  ./run-tests.sh \"sidebar disappears on audit logs page\""
    echo "  ./run-tests.sh \"failed to generate date suggestions\""
    echo "  ./run-tests.sh \"sql injection vulnerability\""
    echo "  ./run-tests.sh \"rate limiting too aggressive\""
    echo "  ./run-tests.sh \"navigation breadcrumb missing\""
    echo "  ./run-tests.sh \"jira integration not working\""
    echo "  ./run-tests.sh \"performance issues slow loading\""
    echo ""
    exit 1
fi

# Run the intelligent test runner
echo "🔍 Analyzing issue: $1"
echo ""

node intelligent-test-runner.js "$1"

echo ""
echo "✅ Test run completed!"

