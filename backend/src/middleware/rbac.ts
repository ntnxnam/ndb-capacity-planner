import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole } from '../types';

// Check if RBAC is enabled (default: true)
const isRBACEnabled = (): boolean => {
  return process.env.RBAC_ENABLED !== 'false';
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // If RBAC is disabled, allow all authenticated users to proceed
    if (!isRBACEnabled()) {
      console.log('ℹ️ RBAC is disabled - bypassing role check');
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

export const requireSuperAdmin = requireRole([UserRole.SUPERADMIN]);

export const requireAdminOrSuperAdmin = requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]);

export const requireAnyRole = requireRole([UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN]);

// Custom permission checker for specific operations
export const checkPermission = (operation: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // If RBAC is disabled, allow all authenticated users to perform any operation
    if (!isRBACEnabled()) {
      console.log(`ℹ️ RBAC is disabled - bypassing permission check for operation: ${operation}`);
      next();
      return;
    }

    const { role } = req.user;
    let hasPermission = false;

    switch (operation) {
      case 'manage_users':
      case 'elevate_roles':
      case 'configure_fields':
      case 'manage_calculation_logic':
        hasPermission = role === UserRole.SUPERADMIN;
        break;
      
      case 'edit_data':
      case 'create_data':
      case 'manage_data':
        hasPermission = [UserRole.ADMIN, UserRole.SUPERADMIN].includes(role);
        break;
      
      case 'view_data':
      case 'view_calculations':
        hasPermission = [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN].includes(role);
        break;
      
      case 'run_calculations':
        hasPermission = [UserRole.USER, UserRole.ADMIN, UserRole.SUPERADMIN].includes(role);
        break;
      
      default:
        hasPermission = false;
    }

    if (!hasPermission) {
      res.status(403).json({ 
        error: `Insufficient permissions for operation: ${operation}`,
        userRole: role
      });
      return;
    }

    next();
  };
};

