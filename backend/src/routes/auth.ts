import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseManager } from '../database/DatabaseManager';

const router = Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      okta_id: req.user.okta_id
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token and get user info (used by frontend during initialization)
router.post('/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ 
      valid: false, 
      error: 'Token verification failed' 
    });
  }
});

// Logout endpoint (mainly for frontend state management)
router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // In a JWT-based system, logout is mainly handled on the client side
    // We can add token blacklisting here if needed in the future
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as authRoutes };

