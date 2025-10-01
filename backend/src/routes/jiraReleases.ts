import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../database/DatabaseManager';
import { getJiraService, isJiraConfigured } from '../services/jiraService';
import { JiraRelease, UserRole } from '../types';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';

const router = Router();
const db = DatabaseManager.getInstance();

// Apply authentication and RBAC middleware
router.use(authenticateToken);
router.use(checkPermission('view_data'));

/**
 * GET /api/jira-releases
 * Get all stored JIRA releases
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const releases = await db.all(`
      SELECT * FROM jira_releases 
      ORDER BY release_date DESC, name ASC
    `);

    res.json({
      success: true,
      data: releases,
      count: releases.length
    });
  } catch (error) {
    console.error('Error fetching JIRA releases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch JIRA releases'
    });
  }
});

/**
 * POST /api/jira-releases/sync
 * Sync releases from JIRA and store them locally
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    if (!isJiraConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'JIRA is not configured. Please set JIRA_USERNAME and JIRA_API_TOKEN environment variables.'
      });
    }

    const jiraService = getJiraService();
    
    // Fetch only unreleased versions from JIRA ERA project
    const jiraReleases = await jiraService.getUnreleasedVersions();
    
    let syncedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const jiraRelease of jiraReleases) {
      try {
        // Check if release already exists
        const existingRelease = await db.get(
          'SELECT * FROM jira_releases WHERE id = ?',
          [jiraRelease.id]
        );

        const now = new Date().toISOString();
        
        if (existingRelease) {
          // Update existing release
          await db.run(`
            UPDATE jira_releases SET
              name = ?,
              description = ?,
              project_id = ?,
              released = ?,
              archived = ?,
              start_date = ?,
              release_date = ?,
              last_synced_at = ?,
              updated_at = ?
            WHERE id = ?
          `, [
            jiraRelease.name,
            jiraRelease.description || null,
            jiraRelease.projectId,
            jiraRelease.released ? 1 : 0,
            jiraRelease.archived ? 1 : 0,
            jiraRelease.startDate || null,
            jiraRelease.releaseDate || null,
            now,
            now,
            jiraRelease.id
          ]);
          updatedCount++;
        } else {
          // Insert new release
          await db.run(`
            INSERT INTO jira_releases (
              id, name, description, project_id, released, archived,
              start_date, release_date, last_synced_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            jiraRelease.id,
            jiraRelease.name,
            jiraRelease.description || null,
            jiraRelease.projectId,
            jiraRelease.released ? 1 : 0,
            jiraRelease.archived ? 1 : 0,
            jiraRelease.startDate || null,
            jiraRelease.releaseDate || null,
            now,
            now,
            now
          ]);
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error syncing release ${jiraRelease.id}:`, error);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: 'JIRA releases synced successfully',
      stats: {
        synced: syncedCount,
        updated: updatedCount,
        errors: errorCount,
        total: jiraReleases.length
      }
    });
  } catch (error) {
    console.error('Error syncing JIRA releases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync JIRA releases'
    });
  }
});

/**
 * GET /api/jira-releases/status
 * Get JIRA connection status and last sync information
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const isConfigured = isJiraConfigured();
    
    // Get last sync information
    const lastSync = await db.get(`
      SELECT MAX(last_synced_at) as last_synced_at, COUNT(*) as total_releases
      FROM jira_releases
    `);

    // Determine connection status based on database state, not live JIRA calls
    let connectionStatus = 'not_configured';
    if (isConfigured) {
      // If we have releases in the database, assume JIRA was connected before
      // Only check live connection when user explicitly syncs
      connectionStatus = lastSync?.total_releases > 0 ? 'connected' : 'not_connected';
    }

    res.json({
      success: true,
      data: {
        configured: isConfigured,
        connection_status: connectionStatus,
        last_synced_at: lastSync?.last_synced_at || null,
        total_releases: lastSync?.total_releases || 0
      }
    });
  } catch (error) {
    console.error('Error checking JIRA status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check JIRA status'
    });
  }
});

/**
 * GET /api/jira-releases/active
 * Get only active (not released and not archived) JIRA releases
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const releases = await db.all(`
      SELECT * FROM jira_releases 
      WHERE released = 0 AND archived = 0
      ORDER BY release_date ASC, name ASC
    `);

    res.json({
      success: true,
      data: releases,
      count: releases.length
    });
  } catch (error) {
    console.error('Error fetching active JIRA releases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active JIRA releases'
    });
  }
});

/**
 * GET /api/jira-releases/components
 * Get all components from the ERA project (from database)
 */
router.get('/components', async (req: Request, res: Response) => {
  try {
    console.log('🔍 API: Fetching JIRA components from database...');
    
    const db = DatabaseManager.getInstance();
    const components = await db.all(`
      SELECT 
        id, name, description, project_id, assignee_type,
        lead_key, lead_name, lead_display_name, is_assignee_type_valid,
        last_synced_at, created_at, updated_at
      FROM jira_components 
      ORDER BY name ASC
    `);

    // Transform to match frontend expectations
    const transformedComponents = components.map(comp => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      assigneeType: comp.assignee_type,
      lead: comp.lead_key ? {
        key: comp.lead_key,
        name: comp.lead_name,
        displayName: comp.lead_display_name
      } : undefined,
      isAssigneeTypeValid: comp.is_assignee_type_valid === 1
    }));

    console.log(`✅ API: Successfully fetched ${transformedComponents.length} components from database`);

    res.json({
      success: true,
      data: transformedComponents,
      count: transformedComponents.length
    });
  } catch (error: any) {
    console.error('❌ API: Error fetching JIRA components from database:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: `Failed to fetch JIRA components: ${error.message}`
    });
  }
});

/**
 * GET /api/jira-releases/assignees
 * Get all assignable users from the ERA project
 */
router.get('/assignees', async (req: Request, res: Response) => {
  try {
    console.log('🔍 API: Fetching JIRA assignees...');
    
    if (!isJiraConfigured()) {
      console.log('❌ JIRA not configured');
      return res.status(400).json({
        success: false,
        error: 'JIRA is not configured. Please set JIRA_USERNAME and JIRA_API_TOKEN environment variables.'
      });
    }

    const jiraService = getJiraService();
    const assignees = await jiraService.getProjectAssignableUsers();

    console.log(`✅ API: Successfully fetched ${assignees.length} assignees`);

    res.json({
      success: true,
      data: assignees,
      count: assignees.length
    });
  } catch (error: any) {
    console.error('❌ API: Error fetching JIRA assignees:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: `Failed to fetch JIRA assignees: ${error.message}`
    });
  }
});

/**
 * GET /api/jira-releases/:id
 * Get a specific JIRA release by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const release = await db.get(
      'SELECT * FROM jira_releases WHERE id = ?',
      [id]
    );

    if (!release) {
      return res.status(404).json({
        success: false,
        error: 'JIRA release not found'
      });
    }

    res.json({
      success: true,
      data: release
    });
  } catch (error) {
    console.error('Error fetching JIRA release:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch JIRA release'
    });
  }
});

/**
 * DELETE /api/jira-releases/:id
 * Delete a specific JIRA release from local storage
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if the release exists first
    const existingRelease = await db.get(
      'SELECT id FROM jira_releases WHERE id = ?',
      [id]
    );

    if (!existingRelease) {
      return res.status(404).json({
        success: false,
        error: 'JIRA release not found'
      });
    }

    await db.run(
      'DELETE FROM jira_releases WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'JIRA release deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting JIRA release:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete JIRA release'
    });
  }
});

export default router;
