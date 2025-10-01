#!/bin/bash

# NDB Capacity Planner - Service Startup Script
# This script starts both backend and frontend services

echo "🚀 NDB Capacity Planner - Starting Services"
echo "=========================================="
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

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    echo "🔄 Killing processes on port $port..."
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check and clean up ports
echo "🔍 Checking ports..."
if check_port 3000; then
    echo "⚠️  Port 3000 is in use. Cleaning up..."
    kill_port 3000
fi

if check_port 3001; then
    echo "⚠️  Port 3001 is in use. Cleaning up..."
    kill_port 3001
fi

echo "✅ Ports are clean"
echo ""

# Start backend
echo "🔧 Starting Backend (Port 3001)..."
cd backend
npm run dev &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if check_port 3001; then
    echo "✅ Backend started successfully on port 3001"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo "🌐 Starting Frontend (Port 3000)..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 5

# Check if frontend is running
if check_port 3000; then
    echo "✅ Frontend started successfully on port 3000"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "🎉 All services are running!"
echo "================================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait

