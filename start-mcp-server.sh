#!/bin/bash

# NDB Capacity Planner MCP Server Startup Script
# This script starts the MCP server for the AI Availability Agent

echo "🚀 Starting NDB Capacity Planner MCP Server..."

# Check if we're in the right directory
if [ ! -f "backend/package-mcp.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Navigate to backend directory
cd backend

# Install MCP dependencies if not already installed
if [ ! -d "node_modules/@modelcontextprotocol" ]; then
    echo "📦 Installing MCP dependencies..."
    npm install --package-lock-only package-mcp.json
    npm install @modelcontextprotocol/sdk@^0.4.0
fi

# Build the MCP server
echo "🔨 Building MCP server..."
npx tsc src/mcp/server.ts --outDir dist --target es2022 --module esnext --moduleResolution node

# Start the MCP server
echo "🤖 Starting MCP server..."
node dist/mcp/server.js

echo "✅ MCP Server started successfully!"
