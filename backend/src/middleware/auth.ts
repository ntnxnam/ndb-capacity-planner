import { Request, Response, NextFunction } from 'express';
// import OktaJwtVerifier from '@okta/jwt-verifier'; // DISABLED FOR LOCAL DEV
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRole, OKTATokenPayload } from '../types';
import { v4 as uuidv4 } from '../utils/uuid';

// const oktaJwtVerifier = new OktaJwtVerifier({
//   issuer: process.env.OKTA_ISSUER || 'https://nutanix.okta.com/oauth2/default',
//   audience: process.env.OKTA_AUDIENCE || 'api://default',
//   clientId: process.env.OKTA_CLIENT_ID
// }); // DISABLED FOR LOCAL DEV

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    okta_id: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if we're in local development mode
    if (process.env.LOCAL_DEV_MODE === 'true') {
      // Use local development authentication instead
      const { localDevAuth } = await import('./localAuth');
      return localDevAuth(req, res, next);
    }
    
    // OKTA authentication is disabled for local development
    console.log('⚠️ OKTA authentication attempted but LOCAL_DEV_MODE is not enabled');
    
    res.status(500).json({ 
      error: 'OKTA authentication disabled for local development',
      message: 'Please ensure LOCAL_DEV_MODE=true is set in your environment'
    });
    return;
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

async function getOrCreateUser(payload: OKTATokenPayload) {
  const db = DatabaseManager.getInstance();
  
  // First try to find user by email
  let user = await db.get('SELECT * FROM users WHERE email = ?', [payload.email]);
  
  if (user) {
    // Update OKTA ID if it has changed
    if (user.okta_id !== payload.sub) {
      await db.run(
        'UPDATE users SET okta_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [payload.sub, user.id]
      );
      user.okta_id = payload.sub;
    }
    return user;
  }

  // If user doesn't exist, determine their role based on email and groups
  let role = UserRole.USER;
  
  // If RBAC is disabled, assign SuperAdmin role to all users for full access
  if (process.env.RBAC_ENABLED === 'false') {
    console.log('ℹ️ RBAC is disabled - assigning SuperAdmin role to new user');
    role = UserRole.SUPERADMIN;
  } else {
    // Check if this is one of our predefined users
    if (payload.email === 'namratha.singh@nutanix.com') {
      role = UserRole.SUPERADMIN;
    } else if (payload.email === 'bharath@nutanix.com') {
      role = UserRole.ADMIN;
    } else {
      // Check if user is in the ndb-tech-leads group (this would come from OKTA groups)
      const userGroups = payload.groups || [];
      if (userGroups.includes('ndb-tech-leads@nutanix.com') || 
          payload.email.includes('@nutanix.com')) {
        role = UserRole.USER;
      } else {
        // If not from Nutanix domain, deny access
        throw new Error('Access denied: Not authorized for this application');
      }
    }
  }

  // Create new user
  const userId = uuidv4();
  await db.run(
    `INSERT INTO users (id, email, name, role, okta_id) 
     VALUES (?, ?, ?, ?, ?)`,
    [userId, payload.email, payload.name || payload.email, role, payload.sub]
  );

  return {
    id: userId,
    email: payload.email,
    name: payload.name || payload.email,
    role,
    okta_id: payload.sub
  };
}
