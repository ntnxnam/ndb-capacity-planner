import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { DatabaseManager } from '../database/DatabaseManager';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { logger, LogCategory } from '../utils/logger';

const router = express.Router();
const db = DatabaseManager.getInstance();

// Apply authentication and authorization middleware
router.use(authenticateToken);
router.use(checkPermission('view_data'));

// Get all date fields
router.get('/', async (req: Request, res: Response) => {
  try {
    const dateFields = await db.all(`
      SELECT 
        field_name,
        display_name,
        description,
        is_required,
        field_order,
        created_at,
        updated_at
      FROM date_fields 
      ORDER BY field_order ASC
    `);

    res.json({
      success: true,
      data: dateFields
    });
  } catch (error) {
    console.error('Error fetching date fields:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch date fields'
    });
  }
});

// Create a new date field
router.post('/', [
  body('field_name').isString().notEmpty().withMessage('Field name is required'),
  body('display_name').isString().notEmpty().withMessage('Display name is required'),
  body('description').optional().isString(),
  body('is_required').optional().isBoolean(),
  body('field_order').optional().isInt({ min: 0 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { field_name, display_name, description, is_required = false, field_order } = req.body;

    // Check if field already exists
    const existingField = await db.get(
      'SELECT field_name FROM date_fields WHERE field_name = ?',
      [field_name]
    );

    if (existingField) {
      return res.status(400).json({
        success: false,
        error: 'Date field with this name already exists'
      });
    }

    // Get next field order if not provided
    let nextOrder = field_order;
    if (nextOrder === undefined) {
      const maxOrder = await db.get('SELECT MAX(field_order) as max_order FROM date_fields');
      nextOrder = (maxOrder?.max_order || 0) + 1;
    }

    // Add column to release_plans table
    await db.run(`ALTER TABLE release_plans ADD COLUMN ${field_name} DATETIME`);

    // Insert into date_fields table
    const fieldId = `df_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.run(
      `INSERT INTO date_fields (id, field_name, display_name, description, is_required, field_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fieldId, field_name, display_name, description || '', is_required, nextOrder]
    );

    logger.audit('DATE_FIELD_CREATED', 'Date field created', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'CREATE_DATE_FIELD',
      resource: 'date_field',
      metadata: { field_name, display_name, is_required }
    });

    res.status(201).json({
      success: true,
      message: 'Date field created successfully',
      data: {
        id: fieldId,
        field_name,
        display_name,
        description: description || '',
        is_required,
        field_order: nextOrder
      }
    });
  } catch (error) {
    console.error('Error creating date field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create date field'
    });
  }
});

// Update a date field
router.put('/:id', [
  body('display_name').optional().isString().notEmpty(),
  body('description').optional().isString(),
  body('is_required').optional().isBoolean(),
  body('field_order').optional().isInt({ min: 0 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { display_name, description, is_required, field_order } = req.body;

    // Check if field exists
    const existingField = await db.get(
      'SELECT field_name FROM date_fields WHERE id = ?',
      [id]
    );

    if (!existingField) {
      return res.status(404).json({
        success: false,
        error: 'Date field not found'
      });
    }

    // Update the field
    const updateFields = [];
    const updateValues = [];

    if (display_name !== undefined) {
      updateFields.push('display_name = ?');
      updateValues.push(display_name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (is_required !== undefined) {
      updateFields.push('is_required = ?');
      updateValues.push(is_required);
    }
    if (field_order !== undefined) {
      updateFields.push('field_order = ?');
      updateValues.push(field_order);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    await db.run(
      `UPDATE date_fields SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    logger.audit('DATE_FIELD_UPDATED', 'Date field updated', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'UPDATE_DATE_FIELD',
      resource: 'date_field',
      metadata: { field_id: id, updates: req.body }
    });

    res.json({
      success: true,
      message: 'Date field updated successfully'
    });
  } catch (error) {
    console.error('Error updating date field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update date field'
    });
  }
});

// Delete a date field
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get field details
    const field = await db.get(
      'SELECT field_name, is_required FROM date_fields WHERE id = ?',
      [id]
    );

    if (!field) {
      return res.status(404).json({
        success: false,
        error: 'Date field not found'
      });
    }

    // Don't allow deletion of required fields
    if (field.is_required) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete required date fields'
      });
    }

    // Remove column from release_plans table
    await db.run(`ALTER TABLE release_plans DROP COLUMN ${field.field_name}`);

    // Delete from date_fields table
    await db.run('DELETE FROM date_fields WHERE id = ?', [id]);

    logger.audit('DATE_FIELD_DELETED', 'Date field deleted', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'DELETE_DATE_FIELD',
      resource: 'date_field',
      metadata: { field_id: id, field_name: field.field_name }
    });

    res.json({
      success: true,
      message: 'Date field deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting date field:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete date field'
    });
  }
});

export default router;
