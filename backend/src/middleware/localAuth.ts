import { Request, Response, NextFunction } from 'express';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRole } from '../types';
import { v4 as uuidv4 } from '../utils/uuid';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    okta_id: string;
  };
}

// Simple local development authentication - bypasses OKTA completely
export const localDevAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('🚀 Local development mode - bypassing OKTA authentication');
    
    // Create a fake local user for development
    const localUser = {
      id: 'local-dev-user-id',
      email: 'local-dev@nutanix.com',
      name: 'Local Dev User',
      role: UserRole.SUPERADMIN, // Give full access for local development
      okta_id: 'local-dev-okta-id'
    };

    // Ensure the user exists in database
    const db = DatabaseManager.getInstance();
    let existingUser = await db.get('SELECT * FROM users WHERE email = ?', [localUser.email]);
    
    if (!existingUser) {
      await db.run(
        `INSERT OR REPLACE INTO users (id, email, name, role, okta_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [localUser.id, localUser.email, localUser.name, localUser.role, localUser.okta_id]
      );
      console.log('✅ Created local development user with SuperAdmin role');
    }

    req.user = localUser;
    next();
  } catch (error) {
    console.error('Local dev authentication error:', error);
    res.status(500).json({ error: 'Local development setup failed' });
    return;
  }
};
