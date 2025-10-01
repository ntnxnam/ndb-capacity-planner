import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { DatabaseManager } from '../database/DatabaseManager';
import { v4 as uuidv4 } from '../utils/uuid';
import { getJiraService, isJiraConfigured } from '../services/jiraService';
import { logger, LogCategory } from '../utils/logger';
import { LoggingService } from '../services/loggingService';

const router = Router();

// Get active JIRA releases
router.get('/jira-releases', authenticateToken, checkPermission('view_data'), async (req: AuthRequest, res) => {
  try {
    if (!isJiraConfigured()) {
      return res.status(503).json({ error: 'JIRA integration not configured' });
    }

    const jiraService = getJiraService();
    const activeReleases = await jiraService.getActiveReleases();
    
    res.json(activeReleases);
  } catch (error) {
    console.error('Error fetching JIRA releases:', error);
    res.status(500).json({ error: 'Failed to fetch JIRA releases' });
  }
});

// Validate JIRA connection
router.get('/jira-status', authenticateToken, checkPermission('view_data'), async (req: AuthRequest, res) => {
  try {
    const configured = isJiraConfigured();
    if (!configured) {
      return res.json({ configured: false, connected: false });
    }

    const jiraService = getJiraService();
    const connected = await jiraService.validateConnection();
    
    res.json({ configured: true, connected });
  } catch (error) {
    console.error('Error checking JIRA status:', error);
    res.json({ configured: true, connected: false, error: error.message });
  }
});

// Get available JIRA releases for dropdown
router.get('/jira-releases', authenticateToken, checkPermission('view_data'), async (req: AuthRequest, res) => {
  try {
    const db = DatabaseManager.getInstance();
    const releases = await db.all(`
      SELECT id, name, description, project_id, released, archived, start_date, release_date
      FROM jira_releases 
      WHERE archived = 0
      ORDER BY release_date ASC, name ASC
    `);
    
    res.json(releases);
  } catch (error) {
    console.error('Error fetching JIRA releases for release plans:', error);
    res.status(500).json({ error: 'Failed to fetch JIRA releases' });
  }
});

// Get all release plans (All authenticated users can view)
router.get('/', authenticateToken, checkPermission('view_data'), async (req: AuthRequest, res) => {
  try {
    const db = DatabaseManager.getInstance();
    const plans = await db.all(`
      SELECT 
        rp.id, 
        rp.name, 
        rp.description,
        rp.jira_release_id,
        jr.name as jira_release_name,
        jr.description as jira_release_description,
        jr.project_id as jira_project_id,
        jr.released as jira_released,
        jr.archived as jira_archived,
        jr.start_date as jira_start_date,
        jr.release_date as jira_release_date,
        rp.release_dris,
        rp.pre_cc_complete_date,
        rp.concept_commit_date,
        rp.execute_commit_date,
        rp.soft_code_complete_date,
        rp.commit_gate_met_date,
        rp.promotion_gate_met_date,
        rp.ga_date,
        rp.feature_qa_need_by_date,
        rp.created_at, 
        rp.updated_at,
        u.name as created_by_name,
        u.email as created_by_email
      FROM release_plans rp
      LEFT JOIN users u ON rp.created_by = u.id
      LEFT JOIN jira_releases jr ON rp.jira_release_id = jr.id
      ORDER BY rp.created_at DESC
    `);
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching release plans:', error);
    res.status(500).json({ error: 'Failed to fetch release plans' });
  }
});

// Get release plan by ID
router.get('/:id', authenticateToken, checkPermission('view_data'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = DatabaseManager.getInstance();
    
    const plan = await db.get(`
      SELECT 
        rp.id, 
        rp.name, 
        rp.description,
        rp.jira_release_id,
        rp.jira_release_name,
        rp.release_dris,
        rp.pre_cc_complete_date,
        rp.concept_commit_date,
        rp.execute_commit_date,
        rp.soft_code_complete_date,
        rp.commit_gate_met_date,
        rp.promotion_gate_met_date,
        rp.ga_date,
        rp.feature_qa_need_by_date,
        rp.created_at, 
        rp.updated_at,
        u.name as created_by_name,
        u.email as created_by_email
      FROM release_plans rp
      LEFT JOIN users u ON rp.created_by = u.id
      WHERE rp.id = ?
    `, [id]);
    
    if (!plan) {
      return res.status(404).json({ error: 'Release plan not found' });
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Error fetching release plan:', error);
    res.status(500).json({ error: 'Failed to fetch release plan' });
  }
});

// Create new release plan (Admin and SuperAdmin can create)
router.post('/',
  authenticateToken,
  checkPermission('manage_data'),
  [
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Release plan name is required and must be less than 255 characters'),
    body('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be a string and less than 1000 characters'),
    body('jira_release_id').optional().isString().isLength({ max: 100 }).withMessage('JIRA release ID must be a string and less than 100 characters'),
    body('jira_release_name').optional().isString().isLength({ max: 255 }).withMessage('JIRA release name must be a string and less than 255 characters'),
    body('release_dris').optional().isObject().withMessage('Release DRIs must be an object'),
    body('release_dris.qa_dri').if(body('release_dris').exists()).isString().isLength({ min: 1, max: 255 }).withMessage('QA DRI is required and must be a non-empty string less than 255 characters'),
    body('release_dris.dev_dri').if(body('release_dris').exists()).isString().isLength({ min: 1, max: 255 }).withMessage('Dev DRI is required and must be a non-empty string less than 255 characters'),
    body('release_dris.tpm_dri').if(body('release_dris').exists()).isString().isLength({ min: 1, max: 255 }).withMessage('TPM DRI is required and must be a non-empty string less than 255 characters'),
    body('release_dris.pm_dri').optional().isString().isLength({ max: 255 }).withMessage('PM DRI must be a string less than 255 characters'),
    body('pre_cc_complete_date').optional().isISO8601().withMessage('Pre-CC complete date must be a valid ISO 8601 date'),
    body('concept_commit_date').optional().isISO8601().withMessage('Concept commit date must be a valid ISO 8601 date'),
    body('execute_commit_date').optional().isISO8601().withMessage('Execute commit date must be a valid ISO 8601 date'),
    body('soft_code_complete_date').optional().isISO8601().withMessage('Soft code complete date must be a valid ISO 8601 date'),
    body('commit_gate_met_date').optional().isISO8601().withMessage('Commit gate met date must be a valid ISO 8601 date'),
    body('promotion_gate_met_date').optional().isISO8601().withMessage('Promotion gate met date must be a valid ISO 8601 date'),
    body('ga_date').optional().isISO8601().withMessage('GA date must be a valid ISO 8601 date')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(LogCategory.API, 'Release plan creation validation failed', {
          userId: req.user?.id,
          userEmail: req.user?.email,
          action: 'CREATE_RELEASE_PLAN',
          resource: 'release_plan',
          metadata: { validationErrors: errors.array() }
        });

        return res.status(400).json({ 
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          }))
        });
      }

      const { 
        name, 
        description,
        jira_release_id,
        jira_release_name,
        release_dris,
        pre_cc_complete_date,
        concept_commit_date,
        execute_commit_date,
        soft_code_complete_date,
        commit_gate_met_date,
        promotion_gate_met_date,
        ga_date
      } = req.body;
      
      const db = DatabaseManager.getInstance();

      // Calculate Feature QA Need By Date (defaults to Soft Code Complete Date)
      const feature_qa_need_by_date = soft_code_complete_date || null;
      
      // Validate and convert DRIs object to JSON string
      let release_dris_json = null;
      if (release_dris) {
        // Ensure required DRIs are provided
        if (!release_dris.qa_dri || !release_dris.dev_dri || !release_dris.tpm_dri) {
          return res.status(400).json({ error: 'QA DRI, Dev DRI, and TPM DRI are required' });
        }
        release_dris_json = JSON.stringify(release_dris);
      }

      const planId = uuidv4();
      await db.run(
        `INSERT INTO release_plans (
          id, name, description, jira_release_id, jira_release_name, release_dris,
          pre_cc_complete_date, concept_commit_date, execute_commit_date, 
          soft_code_complete_date, commit_gate_met_date, promotion_gate_met_date, 
 ga_date, feature_qa_need_by_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          planId, name, description, jira_release_id, jira_release_name, release_dris_json,
          pre_cc_complete_date, concept_commit_date, execute_commit_date,
          soft_code_complete_date, commit_gate_met_date, promotion_gate_met_date,
 ga_date, feature_qa_need_by_date, req.user!.id
        ]
      );

      // Log the creation
      logger.dataCreated('release_plan', planId, req.user!.id, req.user!.email, {
        name,
        description,
        jira_release_id,
        jira_release_name,
        release_dris,
        pre_cc_complete_date,
        concept_commit_date,
        execute_commit_date,
        soft_code_complete_date,
        commit_gate_met_date,
        promotion_gate_met_date,
        ga_date,
        feature_qa_need_by_date
      });

      const newPlan = await db.get(`
        SELECT 
          rp.id, 
          rp.name, 
          rp.description,
          rp.jira_release_id,
          rp.jira_release_name,
          rp.release_dris,
          rp.pre_cc_complete_date,
          rp.concept_commit_date,
          rp.execute_commit_date,
          rp.soft_code_complete_date,
          rp.commit_gate_met_date,
          rp.promotion_gate_met_date,
          rp.ga_date,
          rp.feature_qa_need_by_date,
          rp.created_at,
          u.name as created_by_name,
          u.email as created_by_email
        FROM release_plans rp
        LEFT JOIN users u ON rp.created_by = u.id
        WHERE rp.id = ?
      `, [planId]);

      res.status(201).json({
        success: true,
        message: 'Release plan created successfully',
        data: newPlan
      });
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to create release plan', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'CREATE_RELEASE_PLAN',
        resource: 'release_plan',
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });

      res.status(500).json({ 
        success: false,
        error: 'Failed to create release plan',
        code: 'RELEASE_PLAN_CREATE_ERROR'
      });
    }
  }
);

// Update release plan (Admin and SuperAdmin can update)
router.put('/:id',
  authenticateToken,
  checkPermission('manage_data'),
  [
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Release plan name is required and must be less than 255 characters'),
    body('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be a string and less than 1000 characters'),
    body('jira_release_id').optional().isString().isLength({ max: 100 }).withMessage('JIRA release ID must be a string and less than 100 characters'),
    body('jira_release_name').optional().isString().isLength({ max: 255 }).withMessage('JIRA release name must be a string and less than 255 characters'),
    body('release_dris').optional().isObject().withMessage('Release DRIs must be an object'),
    body('release_dris.qa_dri').if(body('release_dris').exists()).isString().isLength({ min: 1, max: 255 }).withMessage('QA DRI is required and must be a non-empty string less than 255 characters'),
    body('release_dris.dev_dri').if(body('release_dris').exists()).isString().isLength({ min: 1, max: 255 }).withMessage('Dev DRI is required and must be a non-empty string less than 255 characters'),
    body('release_dris.tpm_dri').if(body('release_dris').exists()).isString().isLength({ min: 1, max: 255 }).withMessage('TPM DRI is required and must be a non-empty string less than 255 characters'),
    body('release_dris.pm_dri').optional().isString().isLength({ max: 255 }).withMessage('PM DRI must be a string less than 255 characters'),
    body('pre_cc_complete_date').optional().isISO8601().withMessage('Pre-CC complete date must be a valid ISO 8601 date'),
    body('concept_commit_date').optional().isISO8601().withMessage('Concept commit date must be a valid ISO 8601 date'),
    body('execute_commit_date').optional().isISO8601().withMessage('Execute commit date must be a valid ISO 8601 date'),
    body('soft_code_complete_date').optional().isISO8601().withMessage('Soft code complete date must be a valid ISO 8601 date'),
    body('commit_gate_met_date').optional().isISO8601().withMessage('Commit gate met date must be a valid ISO 8601 date'),
    body('promotion_gate_met_date').optional().isISO8601().withMessage('Promotion gate met date must be a valid ISO 8601 date'),
    body('ga_date').optional().isISO8601().withMessage('GA date must be a valid ISO 8601 date')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(LogCategory.API, 'Release plan update validation failed', {
          userId: req.user?.id,
          userEmail: req.user?.email,
          action: 'UPDATE_RELEASE_PLAN',
          resource: 'release_plan',
          resourceId: req.params.id,
          metadata: { validationErrors: errors.array() }
        });

        return res.status(400).json({ 
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          }))
        });
      }

      const { id } = req.params;
      const { 
        name, 
        description,
        jira_release_id,
        jira_release_name,
        release_dris,
        pre_cc_complete_date,
        concept_commit_date,
        execute_commit_date,
        soft_code_complete_date,
        commit_gate_met_date,
        promotion_gate_met_date,
        ga_date
      } = req.body;
      
      const db = DatabaseManager.getInstance();

      // Check if release plan exists
      const existingPlan = await db.get('SELECT * FROM release_plans WHERE id = ?', [id]);
      if (!existingPlan) {
        return res.status(404).json({ 
          success: false,
          error: 'Release plan not found',
          code: 'RELEASE_PLAN_NOT_FOUND'
        });
      }

      // Calculate Feature QA Need By Date (defaults to Soft Code Complete Date)
      const feature_qa_need_by_date = soft_code_complete_date || null;
      
      // Convert DRIs array to JSON string
      const release_dris_json = release_dris ? JSON.stringify(release_dris) : null;

      // Track date changes for audit
      const loggingService = LoggingService.getInstance();
      const dateFields = [
        'pre_cc_complete_date',
        'concept_commit_date', 
        'execute_commit_date',
        'soft_code_complete_date',
        'commit_gate_met_date',
        'promotion_gate_met_date',
        'ga_date'
      ];

      // Record date changes
      for (const field of dateFields) {
        const oldValue = existingPlan[field];
        const newValue = req.body[field];
        
        if (oldValue !== newValue) {
          await loggingService.recordDateChange(
            id,
            field,
            oldValue,
            newValue,
            req.user!.id,
            `Updated via release plan edit`
          );
        }
      }

      await db.run(
        `UPDATE release_plans 
         SET name = ?, description = ?, jira_release_id = ?, jira_release_name = ?, release_dris = ?,
             pre_cc_complete_date = ?, concept_commit_date = ?, execute_commit_date = ?, 
             soft_code_complete_date = ?, commit_gate_met_date = ?, promotion_gate_met_date = ?, 
             ga_date = ?, feature_qa_need_by_date = ?, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [
          name, description, jira_release_id, jira_release_name, release_dris_json,
          pre_cc_complete_date, concept_commit_date, execute_commit_date,
          soft_code_complete_date, commit_gate_met_date, promotion_gate_met_date,
 ga_date, feature_qa_need_by_date, id
        ]
      );

      // Log the update
      logger.dataUpdated('release_plan', id, req.user!.id, req.user!.email, existingPlan, {
        name,
        description,
        jira_release_id,
        jira_release_name,
        release_dris,
        pre_cc_complete_date,
        concept_commit_date,
        execute_commit_date,
        soft_code_complete_date,
        commit_gate_met_date,
        promotion_gate_met_date,
        ga_date,
        feature_qa_need_by_date
      });

      const updatedPlan = await db.get(`
        SELECT 
          rp.id, 
          rp.name, 
          rp.description,
          rp.jira_release_id,
          rp.jira_release_name,
          rp.release_dris,
          rp.pre_cc_complete_date,
          rp.concept_commit_date,
          rp.execute_commit_date,
          rp.soft_code_complete_date,
          rp.commit_gate_met_date,
          rp.promotion_gate_met_date,
          rp.ga_date,
          rp.feature_qa_need_by_date,
          rp.updated_at,
          u.name as created_by_name,
          u.email as created_by_email
        FROM release_plans rp
        LEFT JOIN users u ON rp.created_by = u.id
        WHERE rp.id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Release plan updated successfully',
        data: updatedPlan
      });
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to update release plan', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'UPDATE_RELEASE_PLAN',
        resource: 'release_plan',
        resourceId: req.params.id,
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });

      res.status(500).json({ 
        success: false,
        error: 'Failed to update release plan',
        code: 'RELEASE_PLAN_UPDATE_ERROR'
      });
    }
  }
);

// Delete release plan (Admin and SuperAdmin can delete)
router.delete('/:id',
  authenticateToken,
  checkPermission('manage_data'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const db = DatabaseManager.getInstance();

      const existingPlan = await db.get('SELECT * FROM release_plans WHERE id = ?', [id]);
      if (!existingPlan) {
        return res.status(404).json({ error: 'Release plan not found' });
      }

      await db.run('DELETE FROM release_plans WHERE id = ?', [id]);

      res.json({ message: 'Release plan deleted successfully' });
    } catch (error) {
      console.error('Error deleting release plan:', error);
      res.status(500).json({ error: 'Failed to delete release plan' });
    }
  }
);

// Generate date suggestions based on GA date
router.post('/date-suggestions',
  authenticateToken,
  checkPermission('view_data'),
  [
    body('ga_date').isISO8601().withMessage('GA date is required and must be a valid ISO 8601 date')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn(LogCategory.API, 'Date suggestions validation failed', {
          userId: req.user?.id,
          userEmail: req.user?.email,
          action: 'GENERATE_DATE_SUGGESTIONS',
          resource: 'date_suggestions',
          metadata: { validationErrors: errors.array() }
        });

        return res.status(400).json({ 
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
          }))
        });
      }

      const { ga_date } = req.body;
      const gaDate = new Date(ga_date);

      // Validate that the date is not in the past
      const now = new Date();
      if (gaDate < now) {
        return res.status(400).json({
          success: false,
          error: 'GA date cannot be in the past',
          code: 'INVALID_GA_DATE'
        });
      }

      // Calculate suggested dates working backwards from GA date
      const suggestions = {
        pre_cc_complete_date: new Date(gaDate.getTime() - (24 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 24 weeks before
        concept_commit_date: new Date(gaDate.getTime() - (20 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 20 weeks before
        execute_commit_date: new Date(gaDate.getTime() - (16 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 16 weeks before
        soft_code_complete_date: new Date(gaDate.getTime() - (12 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 12 weeks before
        commit_gate_met_date: new Date(gaDate.getTime() - (8 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 8 weeks before
        promotion_gate_met_date: new Date(gaDate.getTime() - (4 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 4 weeks before
        feature_qa_need_by_date: new Date(gaDate.getTime() - (12 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] // Same as soft code complete
      };

      logger.audit('DATE_SUGGESTIONS_GENERATED', 'Date suggestions generated', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'GENERATE_DATE_SUGGESTIONS',
        resource: 'date_suggestions',
        metadata: { ga_date, suggestions }
      });

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to generate date suggestions', {
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: 'GENERATE_DATE_SUGGESTIONS',
        resource: 'date_suggestions',
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });

      res.status(500).json({ 
        success: false,
        error: 'Failed to generate date suggestions',
        code: 'DATE_SUGGESTIONS_ERROR'
      });
    }
  }
);

export { router as releasePlanRoutes };
