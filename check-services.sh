#!/bin/bash

# NDB Capacity Planner - Service Status Check
# This script checks if both services are running and healthy

echo "🔍 NDB Capacity Planner - Service Status Check"
echo "=============================================="
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to test API endpoint
test_api() {
    local url=$1
    local description=$2
    
    echo -n "Testing $description... "
    if curl -s -f "$url" >/dev/null 2>&1; then
        echo "✅ OK"
        return 0
    else
        echo "❌ FAILED"
        return 1
    fi
}

# Check ports
echo "📡 Port Status:"
if check_port 3000; then
    echo "  Port 3000 (Frontend): ✅ IN USE"
else
    echo "  Port 3000 (Frontend): ❌ FREE"
fi

if check_port 3001; then
    echo "  Port 3001 (Backend):  ✅ IN USE"
else
    echo "  Port 3001 (Backend):  ❌ FREE"
fi

echo ""

# Test API endpoints
echo "🌐 API Health Check:"
test_api "http://localhost:3000" "Frontend (Port 3000)"
test_api "http://localhost:3001/api/auth/profile" "Backend API (Port 3001)"

echo ""

# Test specific endpoints
echo "🔧 Detailed API Tests:"
echo -n "Testing authentication... "
if curl -s -H "Authorization: Bearer local-dev-token" http://localhost:3001/api/auth/profile | grep -q "local-dev@nutanix.com"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

echo -n "Testing JIRA integration... "
if curl -s -H "Authorization: Bearer local-dev-token" http://localhost:3001/api/release-plans/jira-status | grep -q "configured"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

echo -n "Testing release plans... "
if curl -s -H "Authorization: Bearer local-dev-token" http://localhost:3001/api/release-plans | grep -q "success"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

echo ""

# Summary
echo "📊 Summary:"
if check_port 3000 && check_port 3001; then
    echo "🎉 All services are running!"
    echo ""
    echo "🌐 Access URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:3001"
    echo ""
    echo "🧪 Run tests:"
    echo "  cd tests && ./run-tests.sh \"your issue description\""
else
    echo "❌ Some services are not running"
    echo ""
    echo "🚀 To start services:"
    echo "  ./start-services.sh"
fi

