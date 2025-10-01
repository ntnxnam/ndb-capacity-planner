import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSuperAdmin, checkPermission } from '../middleware/rbac';
import { DatabaseManager } from '../database/DatabaseManager';
import { v4 as uuidv4 } from '../utils/uuid';

const router = Router();

// Get all data field configurations (All authenticated users can view)
router.get('/fields', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = DatabaseManager.getInstance();
    const fields = await db.all('SELECT * FROM data_fields ORDER BY created_at ASC');
    res.json(fields);
  } catch (error) {
    console.error('Error fetching data fields:', error);
    res.status(500).json({ error: 'Failed to fetch data fields' });
  }
});

// Get data field by ID
router.get('/fields/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = DatabaseManager.getInstance();
    
    const field = await db.get('SELECT * FROM data_fields WHERE id = ?', [id]);
    if (!field) {
      return res.status(404).json({ error: 'Data field not found' });
    }
    
    res.json(field);
  } catch (error) {
    console.error('Error fetching data field:', error);
    res.status(500).json({ error: 'Failed to fetch data field' });
  }
});

// Create new data field (SuperAdmin only)
router.post('/fields',
  authenticateToken,
  requireSuperAdmin,
  checkPermission('configure_fields'),
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Field name is required'),
    body('type').isIn(['string', 'number', 'boolean', 'date']).withMessage('Invalid field type'),
    body('required').isBoolean().withMessage('Required must be a boolean'),
    body('description').optional().isString().withMessage('Description must be a string')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, type, required, description } = req.body;
      const db = DatabaseManager.getInstance();

      // Check if field name already exists
      const existingField = await db.get('SELECT id FROM data_fields WHERE name = ?', [name]);
      if (existingField) {
        return res.status(400).json({ error: 'Field with this name already exists' });
      }

      const fieldId = uuidv4();
      await db.run(
        'INSERT INTO data_fields (id, name, type, required, description) VALUES (?, ?, ?, ?, ?)',
        [fieldId, name, type, required ? 1 : 0, description || null]
      );

      const newField = await db.get('SELECT * FROM data_fields WHERE id = ?', [fieldId]);

      res.status(201).json({
        message: 'Data field created successfully',
        field: newField
      });
    } catch (error) {
      console.error('Error creating data field:', error);
      res.status(500).json({ error: 'Failed to create data field' });
    }
  }
);

// Update data field (SuperAdmin only)
router.put('/fields/:id',
  authenticateToken,
  requireSuperAdmin,
  checkPermission('configure_fields'),
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Field name is required'),
    body('type').isIn(['string', 'number', 'boolean', 'date']).withMessage('Invalid field type'),
    body('required').isBoolean().withMessage('Required must be a boolean'),
    body('description').optional().isString().withMessage('Description must be a string')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, type, required, description } = req.body;
      const db = DatabaseManager.getInstance();

      // Check if field exists
      const existingField = await db.get('SELECT * FROM data_fields WHERE id = ?', [id]);
      if (!existingField) {
        return res.status(404).json({ error: 'Data field not found' });
      }

      // Check if name conflicts with other fields (excluding current field)
      const nameConflict = await db.get(
        'SELECT id FROM data_fields WHERE name = ? AND id != ?',
        [name, id]
      );
      if (nameConflict) {
        return res.status(400).json({ error: 'Field with this name already exists' });
      }

      await db.run(
        `UPDATE data_fields 
         SET name = ?, type = ?, required = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, type, required ? 1 : 0, description || null, id]
      );

      const updatedField = await db.get('SELECT * FROM data_fields WHERE id = ?', [id]);

      res.json({
        message: 'Data field updated successfully',
        field: updatedField
      });
    } catch (error) {
      console.error('Error updating data field:', error);
      res.status(500).json({ error: 'Failed to update data field' });
    }
  }
);

// Delete data field (SuperAdmin only)
router.delete('/fields/:id',
  authenticateToken,
  requireSuperAdmin,
  checkPermission('configure_fields'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const db = DatabaseManager.getInstance();

      const existingField = await db.get('SELECT * FROM data_fields WHERE id = ?', [id]);
      if (!existingField) {
        return res.status(404).json({ error: 'Data field not found' });
      }

      // Check if field is used in any data entries (optional warning)
      const dataEntries = await db.all('SELECT data FROM data_entries');
      let fieldInUse = false;
      
      for (const entry of dataEntries) {
        const data = JSON.parse(entry.data);
        if (existingField.name in data) {
          fieldInUse = true;
          break;
        }
      }

      if (fieldInUse) {
        return res.status(400).json({ 
          error: 'Cannot delete field that is used in existing data entries. Please remove the field from all data entries first.' 
        });
      }

      await db.run('DELETE FROM data_fields WHERE id = ?', [id]);

      res.json({ message: 'Data field deleted successfully' });
    } catch (error) {
      console.error('Error deleting data field:', error);
      res.status(500).json({ error: 'Failed to delete data field' });
    }
  }
);

export { router as configRoutes };
