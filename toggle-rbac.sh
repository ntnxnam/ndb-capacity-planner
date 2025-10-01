#!/bin/bash

# RBAC Toggle Script for NDB Capacity Planner
# This script allows you to easily enable/disable RBAC functionality

ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_help() {
    echo -e "${BLUE}NDB Capacity Planner - RBAC Toggle Script${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status    Show current RBAC status"
    echo "  enable    Enable RBAC (role-based access control)"
    echo "  disable   Disable RBAC (all authenticated users get full access)"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 disable"
    echo "  $0 enable"
}

check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Error: .env file not found${NC}"
        echo "Please create a .env file first with your environment configuration."
        exit 1
    fi
}

get_rbac_status() {
    if grep -q "^RBAC_ENABLED=" "$ENV_FILE"; then
        local rbac_value=$(grep "^RBAC_ENABLED=" "$ENV_FILE" | cut -d'=' -f2)
        if [ "$rbac_value" = "false" ]; then
            echo "disabled"
        else
            echo "enabled"
        fi
    else
        echo "enabled" # Default is enabled
    fi
}

show_status() {
    local status=$(get_rbac_status)
    echo -e "${BLUE}🔍 Current RBAC Status:${NC}"
    if [ "$status" = "enabled" ]; then
        echo -e "   Status: ${GREEN}✅ ENABLED${NC}"
        echo -e "   Description: Role-based access control is active"
        echo -e "   - SuperAdmins: Full access to all features"
        echo -e "   - Admins: Can edit data and manage entries"
        echo -e "   - Users: Read-only access to view data and run calculations"
    else
        echo -e "   Status: ${YELLOW}⚠️  DISABLED${NC}"
        echo -e "   Description: All authenticated users have full SuperAdmin access"
        echo -e "   - Security Warning: This should only be used for development/testing"
    fi
}

set_rbac() {
    local new_value=$1
    local action=$2
    
    check_env_file
    
    if grep -q "^RBAC_ENABLED=" "$ENV_FILE"; then
        # Update existing line
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/^RBAC_ENABLED=.*/RBAC_ENABLED=$new_value/" "$ENV_FILE"
        else
            # Linux
            sed -i "s/^RBAC_ENABLED=.*/RBAC_ENABLED=$new_value/" "$ENV_FILE"
        fi
    else
        # Add new line
        echo "" >> "$ENV_FILE"
        echo "# RBAC Configuration" >> "$ENV_FILE"
        echo "RBAC_ENABLED=$new_value" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✅ RBAC has been ${action}${NC}"
    echo ""
    show_status
    echo ""
    echo -e "${YELLOW}📝 Note: You need to restart the backend server for changes to take effect.${NC}"
    echo "   - For development: npm run dev:backend"
    echo "   - For production: docker-compose restart backend"
}

# Main script logic
case "$1" in
    "status")
        check_env_file
        show_status
        ;;
    "enable")
        set_rbac "true" "ENABLED"
        ;;
    "disable")
        set_rbac "false" "DISABLED"
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

