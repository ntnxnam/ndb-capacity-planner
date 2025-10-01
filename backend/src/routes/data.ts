import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdminOrSuperAdmin, checkPermission } from '../middleware/rbac';
import { DatabaseManager } from '../database/DatabaseManager';
import { v4 as uuidv4 } from '../utils/uuid';

const router = Router();

// Get all data entries (All authenticated users can view)
router.get('/', authenticateToken, checkPermission('view_data'), async (req: AuthRequest, res) => {
  try {
    const db = DatabaseManager.getInstance();
    const entries = await db.all(`
      SELECT 
        de.id, 
        de.data, 
        de.created_at, 
        de.updated_at,
        u.name as created_by_name,
        u.email as created_by_email
      FROM data_entries de
      LEFT JOIN users u ON de.created_by = u.id
      ORDER BY de.created_at DESC
    `);

    // Parse JSON data for each entry
    const parsedEntries = entries.map(entry => ({
      ...entry,
      data: JSON.parse(entry.data)
    }));

    res.json(parsedEntries);
  } catch (error) {
    console.error('Error fetching data entries:', error);
    res.status(500).json({ error: 'Failed to fetch data entries' });
  }
});

// Get data entry by ID
router.get('/:id', authenticateToken, checkPermission('view_data'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = DatabaseManager.getInstance();
    
    const entry = await db.get(`
      SELECT 
        de.id, 
        de.data, 
        de.created_at, 
        de.updated_at,
        u.name as created_by_name,
        u.email as created_by_email
      FROM data_entries de
      LEFT JOIN users u ON de.created_by = u.id
      WHERE de.id = ?
    `, [id]);
    
    if (!entry) {
      return res.status(404).json({ error: 'Data entry not found' });
    }

    // Parse JSON data
    entry.data = JSON.parse(entry.data);
    
    res.json(entry);
  } catch (error) {
    console.error('Error fetching data entry:', error);
    res.status(500).json({ error: 'Failed to fetch data entry' });
  }
});

// Create new data entry (Admin and SuperAdmin only)
router.post('/',
  authenticateToken,
  checkPermission('create_data'),
  [
    body('data').isObject().withMessage('Data must be an object')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { data } = req.body;
      const db = DatabaseManager.getInstance();

      // Validate data against configured fields
      const configuredFields = await db.all('SELECT * FROM data_fields WHERE required = 1');
      for (const field of configuredFields) {
        if (!(field.name in data)) {
          return res.status(400).json({ 
            error: `Required field '${field.name}' is missing` 
          });
        }
      }

      const entryId = uuidv4();
      await db.run(
        'INSERT INTO data_entries (id, data, created_by) VALUES (?, ?, ?)',
        [entryId, JSON.stringify(data), req.user!.id]
      );

      const newEntry = await db.get(`
        SELECT 
          de.id, 
          de.data, 
          de.created_at,
          u.name as created_by_name,
          u.email as created_by_email
        FROM data_entries de
        LEFT JOIN users u ON de.created_by = u.id
        WHERE de.id = ?
      `, [entryId]);

      newEntry.data = JSON.parse(newEntry.data);

      res.status(201).json({
        message: 'Data entry created successfully',
        entry: newEntry
      });
    } catch (error) {
      console.error('Error creating data entry:', error);
      res.status(500).json({ error: 'Failed to create data entry' });
    }
  }
);

// Update data entry (Admin and SuperAdmin only)
router.put('/:id',
  authenticateToken,
  checkPermission('edit_data'),
  [
    body('data').isObject().withMessage('Data must be an object')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { data } = req.body;
      const db = DatabaseManager.getInstance();

      // Check if entry exists
      const existingEntry = await db.get('SELECT * FROM data_entries WHERE id = ?', [id]);
      if (!existingEntry) {
        return res.status(404).json({ error: 'Data entry not found' });
      }

      // Validate data against configured fields
      const configuredFields = await db.all('SELECT * FROM data_fields WHERE required = 1');
      for (const field of configuredFields) {
        if (!(field.name in data)) {
          return res.status(400).json({ 
            error: `Required field '${field.name}' is missing` 
          });
        }
      }

      await db.run(
        'UPDATE data_entries SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(data), id]
      );

      const updatedEntry = await db.get(`
        SELECT 
          de.id, 
          de.data, 
          de.updated_at,
          u.name as created_by_name,
          u.email as created_by_email
        FROM data_entries de
        LEFT JOIN users u ON de.created_by = u.id
        WHERE de.id = ?
      `, [id]);

      updatedEntry.data = JSON.parse(updatedEntry.data);

      res.json({
        message: 'Data entry updated successfully',
        entry: updatedEntry
      });
    } catch (error) {
      console.error('Error updating data entry:', error);
      res.status(500).json({ error: 'Failed to update data entry' });
    }
  }
);

// Delete data entry (Admin and SuperAdmin only)
router.delete('/:id',
  authenticateToken,
  checkPermission('edit_data'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const db = DatabaseManager.getInstance();

      const existingEntry = await db.get('SELECT * FROM data_entries WHERE id = ?', [id]);
      if (!existingEntry) {
        return res.status(404).json({ error: 'Data entry not found' });
      }

      await db.run('DELETE FROM data_entries WHERE id = ?', [id]);

      res.json({ message: 'Data entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting data entry:', error);
      res.status(500).json({ error: 'Failed to delete data entry' });
    }
  }
);

export { router as dataRoutes };
