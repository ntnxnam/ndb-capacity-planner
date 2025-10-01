# RBAC Toggle Feature

The NDB Capacity Planner now supports disabling Role-Based Access Control (RBAC) via a single command. This is useful for development, testing, or scenarios where you want all authenticated users to have full access.

## Quick Commands

### One-Line Commands
```bash
# Disable RBAC (give all users full access)
npm run rbac:disable

# Enable RBAC (restore role-based permissions)  
npm run rbac:enable

# Check current status
npm run rbac:status
```

### Script Commands
```bash
# Disable RBAC
./toggle-rbac.sh disable

# Enable RBAC  
./toggle-rbac.sh enable

# Check status
./toggle-rbac.sh status

# Show help
./toggle-rbac.sh help
```

## What Happens When RBAC is Disabled

When RBAC is disabled (`RBAC_ENABLED=false`):

1. **All authenticated users get SuperAdmin privileges**
   - Can manage users and roles
   - Can configure data fields
   - Can create and edit data entries
   - Can manage AI calculation logic
   - Full access to all features

2. **Role checks are bypassed**
   - No permission errors for any operations
   - All middleware permission checks pass through

3. **New users automatically get SuperAdmin role**
   - Any user logging in through OKTA gets full access
   - No need to manually assign roles

## Environment Variable

The feature is controlled by the `RBAC_ENABLED` environment variable in your `.env` file:

```bash
# Enable RBAC (default behavior)
RBAC_ENABLED=true

# Disable RBAC (all users get full access)
RBAC_ENABLED=false
```

## Security Warning

⚠️ **IMPORTANT**: Disabling RBAC should only be used for:
- Development and testing environments
- Scenarios where all team members need full access
- Temporary troubleshooting

**DO NOT disable RBAC in production** unless you specifically need all authenticated users to have administrative privileges.

## Server Status Display

When you start the backend server, it will display the current RBAC status:

```bash
🚀 NDB Capacity Planner API server running on port 3001
🔒 OKTA Domain: your-okta-domain.okta.com
🌐 Frontend URL: http://localhost:3000
🛡️ RBAC: ✅ ENABLED (Role-based access control active)
```

Or when disabled:
```bash
🛡️ RBAC: ⚠️  DISABLED (All authenticated users have full access)
```

## Restart Required

After changing the RBAC setting, you need to restart the backend server:

```bash
# For development
npm run dev:backend

# For Docker deployment
docker-compose restart backend
```

## Role Hierarchy (When RBAC is Enabled)

| Role | Permissions |
|------|-------------|
| **SuperAdmin** | Full access to all features including user management |
| **Admin** | Can create/edit data, view all content, run calculations |  
| **User** | Read-only access, can view data and run calculations |

## Examples

### Disable RBAC for development team access
```bash
npm run rbac:disable
npm run dev:backend
```

### Re-enable RBAC for production deployment
```bash
npm run rbac:enable
./deploy.sh
```

### Check current status before deployment
```bash
npm run rbac:status
```

