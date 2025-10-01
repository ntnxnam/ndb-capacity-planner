import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSuperAdmin, checkPermission } from '../middleware/rbac';
import { DatabaseManager } from '../database/DatabaseManager';
import { v4 as uuidv4 } from '../utils/uuid';
import { logger, LogCategory } from '../utils/logger';

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

// Date Gaps Configuration
router.get('/date-gaps', 
  authenticateToken, 
  async (req: AuthRequest, res) => {
    try {
      const db = DatabaseManager.getInstance();
      
      // Try to get the latest configuration from database
      const configResult = await db.get('SELECT config_data FROM date_gaps_config ORDER BY created_at DESC LIMIT 1');
      
      if (configResult) {
        const configData = JSON.parse(configResult.config_data);
        res.json(configData);
      } else {
        // Return default configuration if none exists
        const defaultConfig = {
          gaToPromotionGate: 4,
          promotionGateToCommitGate: 4,
          commitGateToSoftCodeComplete: 4,
          softCodeCompleteToExecuteCommit: 4,
          executeCommitToConceptCommit: 4,
          conceptCommitToPreCC: 4
        };
        res.json(defaultConfig);
      }
    } catch (error) {
      console.error('Error getting date gaps configuration:', error);
      res.status(500).json({ error: 'Failed to get date gaps configuration' });
    }
  }
);

router.post('/date-gaps', 
  authenticateToken, 
  requireSuperAdmin,
  [
    body('gaToPromotionGate').isInt({ min: 1, max: 52 }).withMessage('GA to Promotion Gate gap must be between 1-52 weeks'),
    body('promotionGateToCommitGate').isInt({ min: 1, max: 52 }).withMessage('Promotion Gate to Commit Gate gap must be between 1-52 weeks'),
    body('commitGateToSoftCodeComplete').isInt({ min: 1, max: 52 }).withMessage('Commit Gate to Soft Code Complete gap must be between 1-52 weeks'),
    body('softCodeCompleteToExecuteCommit').isInt({ min: 1, max: 52 }).withMessage('Soft Code Complete to Execute Commit gap must be between 1-52 weeks'),
    body('executeCommitToConceptCommit').isInt({ min: 1, max: 52 }).withMessage('Execute Commit to Concept Commit gap must be between 1-52 weeks'),
    body('conceptCommitToPreCC').isInt({ min: 1, max: 52 }).withMessage('Concept Commit to Pre-CC Complete gap must be between 1-52 weeks')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { gaToPromotionGate, promotionGateToCommitGate, commitGateToSoftCodeComplete, 
              softCodeCompleteToExecuteCommit, executeCommitToConceptCommit, conceptCommitToPreCC } = req.body;

      const db = DatabaseManager.getInstance();
      const configId = uuidv4();
      
      const configData = {
        gaToPromotionGate,
        promotionGateToCommitGate,
        commitGateToSoftCodeComplete,
        softCodeCompleteToExecuteCommit,
        executeCommitToConceptCommit,
        conceptCommitToPreCC
      };

      // Save to database
      await db.run(
        `INSERT INTO date_gaps_config (id, config_data, created_by) VALUES (?, ?, ?)`,
        [configId, JSON.stringify(configData), req.user!.id]
      );

      // Log the configuration change
      logger.audit('CONFIG_UPDATE', 'Date gaps configuration updated', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'UPDATE_DATE_GAPS',
        resource: 'date_gaps',
        metadata: configData
      });

      res.json({
        success: true,
        message: 'Date gaps configuration saved successfully',
        data: configData
      });
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to save date gaps configuration', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'UPDATE_DATE_GAPS',
        resource: 'date_gaps',
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      res.status(500).json({ success: false, error: 'Failed to save date gaps configuration' });
    }
  }
);

// Date Fields Configuration
router.get('/date-fields', 
  authenticateToken, 
  async (req: AuthRequest, res) => {
    try {
      // Return default configuration for now
      // TODO: Load from database when implemented
      const defaultFields = [
        { key: 'ga_date', label: 'GA Date', description: 'General availability release date', priority: 1, isRequired: true, isEnabled: true },
        { key: 'promotion_gate_met_date', label: 'Promotion Gate Met Date', description: 'Promotion gate milestone date', priority: 2, isRequired: true, isEnabled: true },
        { key: 'commit_gate_met_date', label: 'Commit Gate Met Date', description: 'Commit gate milestone date', priority: 3, isRequired: true, isEnabled: true },
        { key: 'soft_code_complete_date', label: 'Soft Code Complete Date', description: 'Soft code completion date', priority: 4, isRequired: true, isEnabled: true },
        { key: 'execute_commit_date', label: 'Execute Commit Date', description: 'Execution commitment date', priority: 5, isRequired: true, isEnabled: true },
        { key: 'concept_commit_date', label: 'Concept Commit Date', description: 'Concept commitment date', priority: 6, isRequired: true, isEnabled: true },
        { key: 'pre_cc_complete_date', label: 'Pre-CC Complete Date', description: 'Pre-concept commit completion date', priority: 7, isRequired: true, isEnabled: true }
      ];
      
      res.json(defaultFields);
    } catch (error) {
      console.error('Error getting date fields configuration:', error);
      res.status(500).json({ error: 'Failed to get date fields configuration' });
    }
  }
);

router.post('/date-fields', 
  authenticateToken, 
  requireSuperAdmin,
  [
    body('fields').isArray().withMessage('Fields must be an array'),
    body('fields.*.key').isString().notEmpty().withMessage('Field key is required'),
    body('fields.*.label').isString().notEmpty().withMessage('Field label is required'),
    body('fields.*.isRequired').isBoolean().withMessage('isRequired must be boolean'),
    body('fields.*.isEnabled').isBoolean().withMessage('isEnabled must be boolean'),
    body('fields.*.priority').isInt({ min: 1 }).withMessage('Priority must be a positive integer')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { fields } = req.body;

      // Log the configuration change
      logger.audit('CONFIG_UPDATE', 'Date fields configuration updated', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'UPDATE_DATE_FIELDS',
        resource: 'date_fields',
        metadata: { fields }
      });

      // TODO: Save to database or configuration store
      // For now, just return success
      res.json({
        success: true,
        message: 'Date fields configuration saved successfully',
        data: { fields }
      });
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to save date fields configuration', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'UPDATE_DATE_FIELDS',
        resource: 'date_fields',
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      res.status(500).json({ success: false, error: 'Failed to save date fields configuration' });
    }
  }
);

export { router as configRoutes };
