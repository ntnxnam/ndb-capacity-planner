import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSuperAdmin, requireAdminOrSuperAdmin, checkPermission } from '../middleware/rbac';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRole } from '../types';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from '../utils/uuid';

const router = Router();

// Get all users (Admin and SuperAdmin only)
router.get('/', authenticateToken, requireAdminOrSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const db = DatabaseManager.getInstance();
    const users = await db.all(
      'SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (Admin and SuperAdmin only)
router.get('/:id', authenticateToken, requireAdminOrSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = DatabaseManager.getInstance();
    
    const user = await db.get(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user role (SuperAdmin only)
router.patch('/:id/role', 
  authenticateToken,
  requireSuperAdmin,
  checkPermission('elevate_roles'),
  [
    body('role').isIn(['user', 'admin', 'superadmin']).withMessage('Invalid role')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { role } = req.body;
      const db = DatabaseManager.getInstance();

      // Check if user exists
      const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent superadmin from changing their own role
      if (req.user?.id === id && role !== UserRole.SUPERADMIN) {
        return res.status(400).json({ 
          error: 'Cannot change your own superadmin role' 
        });
      }

      // Update user role
      await db.run(
        'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [role, id]
      );

      const updatedUser = await db.get(
        'SELECT id, email, name, role, updated_at FROM users WHERE id = ?',
        [id]
      );

      res.json({
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

// Add new user (SuperAdmin only) - Manual user addition
router.post('/',
  authenticateToken,
  requireSuperAdmin,
  checkPermission('manage_users'),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
    body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, name, role } = req.body;
      const db = DatabaseManager.getInstance();

      // Check if user already exists
      const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Generate user ID
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      // Insert new user
      await db.run(
        'INSERT INTO users (id, email, name, role, okta_id) VALUES (?, ?, ?, ?, ?)',
        [userId, email, name, role, email] // okta_id will be updated on first login
      );

      const newUser = await db.get(
        'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
        [userId]
      );

      res.status(201).json({
        message: 'User created successfully',
        user: newUser
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// Delete user (SuperAdmin only)
router.delete('/:id',
  authenticateToken,
  requireSuperAdmin,
  checkPermission('manage_users'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const db = DatabaseManager.getInstance();

      // Check if user exists
      const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent deletion of current superadmin
      if (req.user?.id === id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Prevent deletion of the default superadmin
      if (user.email === 'namratha.singh@nutanix.com') {
        return res.status(400).json({ error: 'Cannot delete the default superadmin' });
      }

      // Delete user
      await db.run('DELETE FROM users WHERE id = ?', [id]);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
);

export { router as userRoutes };
