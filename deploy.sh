#!/bin/bash

# NDB Capacity Planner Deployment Script
# This script helps deploy the application in a production environment

set -e

echo "🚀 NDB Capacity Planner Deployment Script"
echo "========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it first."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=("OKTA_DOMAIN" "OKTA_CLIENT_ID" "OKTA_CLIENT_SECRET" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set in .env file"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Create data directory for database
mkdir -p ./data/database
echo "✅ Created database directory"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all
echo "✅ Dependencies installed"

# Build applications
echo "🔨 Building applications..."
npm run build
echo "✅ Applications built"

# Start services with Docker Compose
echo "🐳 Starting services with Docker Compose..."
docker-compose up -d

echo ""
echo "✅ NDB Capacity Planner deployed successfully!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo ""
echo "🔍 To check service status: docker-compose ps"
echo "📋 To view logs: docker-compose logs -f"
echo "🛑 To stop services: docker-compose down"
echo ""
echo "👤 Default Users:"
echo "   SuperAdmin: namratha.singh@nutanix.com"
echo "   Admin: bharath@nutanix.com"
echo "   Users: ndb-tech-leads@nutanix.com distribution group members"
echo ""
echo "📚 For more information, see README.md"

