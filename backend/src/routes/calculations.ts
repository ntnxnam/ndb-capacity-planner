import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSuperAdmin, checkPermission } from '../middleware/rbac';
import { DatabaseManager } from '../database/DatabaseManager';
import { v4 as uuidv4 } from '../utils/uuid';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Get all calculation rules (All authenticated users can view)
router.get('/rules', authenticateToken, checkPermission('view_calculations'), async (req: AuthRequest, res) => {
  try {
    const db = DatabaseManager.getInstance();
    const rules = await db.all(`
      SELECT 
        cr.id, 
        cr.name, 
        cr.description, 
        cr.logic,
        cr.ai_prompt,
        cr.created_at, 
        cr.updated_at,
        u.name as created_by_name,
        u.email as created_by_email
      FROM calculation_rules cr
      LEFT JOIN users u ON cr.created_by = u.id
      ORDER BY cr.created_at DESC
    `);
    
    res.json(rules);
  } catch (error) {
    console.error('Error fetching calculation rules:', error);
    res.status(500).json({ error: 'Failed to fetch calculation rules' });
  }
});

// Get calculation rule by ID
router.get('/rules/:id', authenticateToken, checkPermission('view_calculations'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = DatabaseManager.getInstance();
    
    const rule = await db.get(`
      SELECT 
        cr.id, 
        cr.name, 
        cr.description, 
        cr.logic,
        cr.ai_prompt,
        cr.created_at, 
        cr.updated_at,
        u.name as created_by_name,
        u.email as created_by_email
      FROM calculation_rules cr
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE cr.id = ?
    `, [id]);
    
    if (!rule) {
      return res.status(404).json({ error: 'Calculation rule not found' });
    }
    
    res.json(rule);
  } catch (error) {
    console.error('Error fetching calculation rule:', error);
    res.status(500).json({ error: 'Failed to fetch calculation rule' });
  }
});

// Create new calculation rule (SuperAdmin only)
router.post('/rules',
  authenticateToken,
  requireSuperAdmin,
  checkPermission('manage_calculation_logic'),
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Rule name is required'),
    body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
    body('logic').trim().isLength({ min: 1 }).withMessage('Logic is required'),
    body('ai_prompt').optional().isString().withMessage('AI prompt must be a string')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, logic, ai_prompt } = req.body;
      const db = DatabaseManager.getInstance();

      // Check if rule name already exists
      const existingRule = await db.get('SELECT id FROM calculation_rules WHERE name = ?', [name]);
      if (existingRule) {
        return res.status(400).json({ error: 'Rule with this name already exists' });
      }

      const ruleId = uuidv4();
      await db.run(
        'INSERT INTO calculation_rules (id, name, description, logic, ai_prompt, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [ruleId, name, description, logic, ai_prompt || null, req.user!.id]
      );

      const newRule = await db.get(`
        SELECT 
          cr.id, 
          cr.name, 
          cr.description, 
          cr.logic,
          cr.ai_prompt,
          cr.created_at,
          u.name as created_by_name,
          u.email as created_by_email
        FROM calculation_rules cr
        LEFT JOIN users u ON cr.created_by = u.id
        WHERE cr.id = ?
      `, [ruleId]);

      res.status(201).json({
        message: 'Calculation rule created successfully',
        rule: newRule
      });
    } catch (error) {
      console.error('Error creating calculation rule:', error);
      res.status(500).json({ error: 'Failed to create calculation rule' });
    }
  }
);

// Generate calculation logic using AI (SuperAdmin only)
router.post('/rules/generate-from-prompt',
  authenticateToken,
  requireSuperAdmin,
  checkPermission('manage_calculation_logic'),
  [
    body('prompt').trim().isLength({ min: 10 }).withMessage('Prompt must be at least 10 characters'),
    body('name').trim().isLength({ min: 1 }).withMessage('Rule name is required'),
    body('description').trim().isLength({ min: 1 }).withMessage('Description is required')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!openai) {
        return res.status(500).json({ error: 'OpenAI integration not configured' });
      }

      const { prompt, name, description } = req.body;
      const db = DatabaseManager.getInstance();

      // Check if rule name already exists
      const existingRule = await db.get('SELECT id FROM calculation_rules WHERE name = ?', [name]);
      if (existingRule) {
        return res.status(400).json({ error: 'Rule with this name already exists' });
      }

      // Get current data fields to provide context to AI
      const dataFields = await db.all('SELECT name, type, description FROM data_fields');
      
      const systemPrompt = `You are an expert at creating capacity planning calculations for database systems. 
      
Available data fields:
${dataFields.map(f => `- ${f.name} (${f.type}): ${f.description || 'No description'}`).join('\n')}

Generate JavaScript code that calculates capacity planning metrics based on the user's requirements. 
The code should:
1. Be a function that takes a data object as parameter
2. Return a numerical result or an object with calculated values
3. Include proper error handling
4. Use only the available data fields listed above
5. Be safe to execute (no external calls, file system access, etc.)

Return ONLY the JavaScript function code, no explanations or markdown formatting.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const generatedLogic = response.choices[0].message?.content?.trim();

      if (!generatedLogic) {
        return res.status(500).json({ error: 'Failed to generate calculation logic' });
      }

      // Create the rule with generated logic
      const ruleId = uuidv4();
      await db.run(
        'INSERT INTO calculation_rules (id, name, description, logic, ai_prompt, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [ruleId, name, description, generatedLogic, prompt, req.user!.id]
      );

      const newRule = await db.get(`
        SELECT 
          cr.id, 
          cr.name, 
          cr.description, 
          cr.logic,
          cr.ai_prompt,
          cr.created_at,
          u.name as created_by_name,
          u.email as created_by_email
        FROM calculation_rules cr
        LEFT JOIN users u ON cr.created_by = u.id
        WHERE cr.id = ?
      `, [ruleId]);

      res.status(201).json({
        message: 'Calculation rule generated and created successfully',
        rule: newRule
      });
    } catch (error) {
      console.error('Error generating calculation rule:', error);
      res.status(500).json({ error: 'Failed to generate calculation rule' });
    }
  }
);

// Execute calculation on data entries (All authenticated users can run calculations)
router.post('/execute/:ruleId',
  authenticateToken,
  checkPermission('run_calculations'),
  async (req: AuthRequest, res) => {
    try {
      const { ruleId } = req.params;
      const { dataEntryIds } = req.body; // Optional: specific data entries to calculate on
      const db = DatabaseManager.getInstance();

      // Get calculation rule
      const rule = await db.get('SELECT * FROM calculation_rules WHERE id = ?', [ruleId]);
      if (!rule) {
        return res.status(404).json({ error: 'Calculation rule not found' });
      }

      // Get data entries
      let dataEntries;
      if (dataEntryIds && dataEntryIds.length > 0) {
        const placeholders = dataEntryIds.map(() => '?').join(',');
        dataEntries = await db.all(`SELECT * FROM data_entries WHERE id IN (${placeholders})`, dataEntryIds);
      } else {
        dataEntries = await db.all('SELECT * FROM data_entries');
      }

      if (dataEntries.length === 0) {
        return res.status(400).json({ error: 'No data entries found to calculate on' });
      }

      const results = [];

      // Execute calculation for each data entry
      for (const entry of dataEntries) {
        try {
          const data = JSON.parse(entry.data);
          
          // Create a safe execution context
          const calculationFunction = new Function('data', `
            try {
              ${rule.logic}
            } catch (error) {
              throw new Error('Calculation error: ' + error.message);
            }
          `);

          const result = calculationFunction(data);
          
          results.push({
            dataEntryId: entry.id,
            result,
            success: true
          });
        } catch (error) {
          results.push({
            dataEntryId: entry.id,
            error: error.message,
            success: false
          });
        }
      }

      res.json({
        ruleId,
        ruleName: rule.name,
        executedAt: new Date().toISOString(),
        results
      });
    } catch (error) {
      console.error('Error executing calculation:', error);
      res.status(500).json({ error: 'Failed to execute calculation' });
    }
  }
);

// Update calculation rule (SuperAdmin only)
router.put('/rules/:id',
  authenticateToken,
  requireSuperAdmin,
  checkPermission('manage_calculation_logic'),
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Rule name is required'),
    body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
    body('logic').trim().isLength({ min: 1 }).withMessage('Logic is required'),
    body('ai_prompt').optional().isString().withMessage('AI prompt must be a string')
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, description, logic, ai_prompt } = req.body;
      const db = DatabaseManager.getInstance();

      // Check if rule exists
      const existingRule = await db.get('SELECT * FROM calculation_rules WHERE id = ?', [id]);
      if (!existingRule) {
        return res.status(404).json({ error: 'Calculation rule not found' });
      }

      // Check if name conflicts with other rules (excluding current rule)
      const nameConflict = await db.get(
        'SELECT id FROM calculation_rules WHERE name = ? AND id != ?',
        [name, id]
      );
      if (nameConflict) {
        return res.status(400).json({ error: 'Rule with this name already exists' });
      }

      await db.run(
        `UPDATE calculation_rules 
         SET name = ?, description = ?, logic = ?, ai_prompt = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, description, logic, ai_prompt || null, id]
      );

      const updatedRule = await db.get(`
        SELECT 
          cr.id, 
          cr.name, 
          cr.description, 
          cr.logic,
          cr.ai_prompt,
          cr.updated_at,
          u.name as created_by_name,
          u.email as created_by_email
        FROM calculation_rules cr
        LEFT JOIN users u ON cr.created_by = u.id
        WHERE cr.id = ?
      `, [id]);

      res.json({
        message: 'Calculation rule updated successfully',
        rule: updatedRule
      });
    } catch (error) {
      console.error('Error updating calculation rule:', error);
      res.status(500).json({ error: 'Failed to update calculation rule' });
    }
  }
);

// Delete calculation rule (SuperAdmin only)
router.delete('/rules/:id',
  authenticateToken,
  requireSuperAdmin,
  checkPermission('manage_calculation_logic'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const db = DatabaseManager.getInstance();

      const existingRule = await db.get('SELECT * FROM calculation_rules WHERE id = ?', [id]);
      if (!existingRule) {
        return res.status(404).json({ error: 'Calculation rule not found' });
      }

      await db.run('DELETE FROM calculation_rules WHERE id = ?', [id]);

      res.json({ message: 'Calculation rule deleted successfully' });
    } catch (error) {
      console.error('Error deleting calculation rule:', error);
      res.status(500).json({ error: 'Failed to delete calculation rule' });
    }
  }
);

export { router as calculationRoutes };
