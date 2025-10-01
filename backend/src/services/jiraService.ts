import axios, { AxiosInstance } from 'axios';
import { JiraRelease } from '../types';

export class JiraService {
  private client: AxiosInstance;
  private baseUrl: string;
  private projectKey: string;

  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL || 'https://jira.nutanix.com';
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'ERA';
    
    const username = process.env.JIRA_USERNAME;
    const apiToken = process.env.JIRA_API_TOKEN || process.env.JIRA_PRIVATE_KEY;

    if (!username || !apiToken) {
      throw new Error('JIRA credentials not configured. Please set JIRA_USERNAME and JIRA_API_TOKEN environment variables.');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      timeout: 30000, // 30 seconds timeout
      validateStatus: function (status) {
        return status >= 200 && status < 300; // Only resolve for 2xx status codes
      }
    });
  }

  /**
   * Get all releases from the ERA project (including released and archived)
   */
  async getAllReleases(): Promise<JiraRelease[]> {
    try {
      const response = await this.client.get(`/rest/api/2/project/${this.projectKey}/versions`);
      
      const versions = response.data;
      
      // Return all releases (active, released, and archived)
      const allReleases: JiraRelease[] = versions.map((version: any) => ({
        id: version.id,
        name: version.name,
        description: version.description || undefined,
        projectId: this.projectKey,
        released: version.released,
        archived: version.archived,
        startDate: version.startDate || undefined,
        releaseDate: version.releaseDate || undefined
      }));

      return allReleases;
    } catch (error: any) {
      console.error('Error fetching releases from JIRA:', error);
      
      if (error.response?.status === 401) {
        throw new Error('JIRA authentication failed. Please check your credentials.');
      } else if (error.response?.status === 403) {
        throw new Error('JIRA access forbidden. Please check your permissions for the ERA project.');
      } else if (error.response?.status === 404) {
        throw new Error('JIRA project not found. Please check the project key.');
      } else {
        throw new Error(`Failed to fetch releases from JIRA: ${error.message}`);
      }
    }
  }

  /**
   * Get only unreleased versions from the ERA project
   */
  async getUnreleasedVersions(): Promise<JiraRelease[]> {
    try {
      const response = await this.client.get(`/rest/api/2/project/${this.projectKey}/versions`);
      
      const versions = response.data;
      
      // Filter for unreleased versions only
      const unreleasedVersions: JiraRelease[] = versions
        .filter((version: any) => !version.released && !version.archived)
        .map((version: any) => ({
          id: version.id,
          name: version.name,
          description: version.description || undefined,
          projectId: this.projectKey,
          released: false,
          archived: false,
          startDate: version.startDate || undefined,
          releaseDate: version.releaseDate || undefined
        }));

      return unreleasedVersions;
    } catch (error: any) {
      console.error('Error fetching unreleased versions from JIRA:', error);
      
      if (error.response?.status === 401) {
        throw new Error('JIRA authentication failed. Please check your credentials.');
      } else if (error.response?.status === 403) {
        throw new Error('JIRA access forbidden. Please check your permissions for the ERA project.');
      } else if (error.response?.status === 404) {
        throw new Error('JIRA project not found. Please check the project key.');
      } else {
        throw new Error(`Failed to fetch unreleased versions from JIRA: ${error.message}`);
      }
    }
  }

  /**
   * Get all active releases from the ERA project (unreleased versions only)
   */
  async getActiveReleases(): Promise<JiraRelease[]> {
    try {
      // Use the dedicated method for unreleased versions
      return await this.getUnreleasedVersions();
    } catch (error: any) {
      console.error('Error fetching active releases from JIRA:', error);
      throw error;
    }
  }

  /**
   * Get a specific release by ID
   */
  async getReleaseById(releaseId: string): Promise<JiraRelease | null> {
    try {
      const response = await this.client.get(`/rest/api/3/version/${releaseId}`);
      
      const version = response.data;
      
      return {
        id: version.id,
        name: version.name,
        description: version.description || undefined,
        projectId: version.projectId,
        released: version.released,
        archived: version.archived,
        startDate: version.startDate || undefined,
        releaseDate: version.releaseDate || undefined
      };
    } catch (error: any) {
      console.error('Error fetching release from JIRA:', error);
      
      if (error.response?.status === 404) {
        return null;
      }
      
      throw new Error(`Failed to fetch release from JIRA: ${error.message}`);
    }
  }

  /**
   * Validate JIRA connection and credentials
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.client.get(`/rest/api/2/project/${this.projectKey}`);
      return true;
    } catch (error) {
      console.error('JIRA connection validation failed:', error);
      return false;
    }
  }

  /**
   * Search releases by name pattern
   */
  async searchReleases(namePattern: string): Promise<JiraRelease[]> {
    try {
      const allReleases = await this.getActiveReleases();
      
      return allReleases.filter(release => 
        release.name.toLowerCase().includes(namePattern.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching releases:', error);
      throw error;
    }
  }

  /**
   * Get all components from the ERA project and store them in database
   */
  async getProjectComponents(): Promise<any[]> {
    try {
      console.log(`🔍 Fetching components for project: ${this.projectKey}`);
      
      // Try to get project details first to see what's available
      const projectResponse = await this.client.get(`/rest/api/2/project/${this.projectKey}`);
      const project = projectResponse.data;
      
      console.log(`✅ Project data structure:`, {
        projectKey: project.key,
        projectName: project.name,
        availableFields: Object.keys(project),
        hasComponents: !!project.components
      });
      
      // Return components if they exist in the project data
      if (project.components && Array.isArray(project.components)) {
        console.log(`✅ Found ${project.components.length} components in project data`);
        
        // Store components in database
        await this.storeComponentsInDatabase(project.components);
        
        return project.components;
      }
      
      // If no components in project data, return empty array for now
      console.log(`⚠️ No components found in project data, returning empty array`);
      return [];
      
    } catch (error: any) {
      console.error('❌ Error fetching project components:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Return empty array instead of throwing error for now
      console.log(`⚠️ Returning empty array due to error`);
      return [];
    }
  }

  /**
   * Store components in database
   */
  private async storeComponentsInDatabase(components: any[]): Promise<void> {
    try {
      const { DatabaseManager } = await import('../database/DatabaseManager');
      const db = DatabaseManager.getInstance();
      
      // Clear existing components for this project
      await db.run('DELETE FROM jira_components WHERE project_id = ?', [this.projectKey]);
      
      // Insert new components
      for (const component of components) {
        await db.run(`
          INSERT INTO jira_components (
            id, name, description, project_id, assignee_type, 
            lead_key, lead_name, lead_display_name, is_assignee_type_valid,
            last_synced_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          component.id,
          component.name,
          component.description || null,
          this.projectKey,
          component.assigneeType || null,
          component.lead?.key || null,
          component.lead?.name || null,
          component.lead?.displayName || null,
          component.isAssigneeTypeValid ? 1 : 0
        ]);
      }
      
      console.log(`✅ Stored ${components.length} components in database`);
    } catch (error) {
      console.error('❌ Error storing components in database:', error);
      throw error;
    }
  }

  /**
   * Get all users who can be assigned to issues in the ERA project
   */
  async getProjectAssignableUsers(): Promise<any[]> {
    try {
      console.log(`🔍 Fetching assignable users for project: ${this.projectKey}`);
      
      // For now, return empty array since user endpoints might not be available
      // This will be implemented once we confirm the correct JIRA API structure
      console.log(`⚠️ User fetching not implemented yet, returning empty array`);
      return [];
      
    } catch (error: any) {
      console.error('❌ Error fetching assignable users:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Return empty array instead of throwing error for now
      console.log(`⚠️ Returning empty array due to error`);
      return [];
    }
  }
}

// Singleton instance
let jiraService: JiraService | null = null;

export function getJiraService(): JiraService {
  if (!jiraService) {
    if (isJiraConfigured()) {
      jiraService = new JiraService();
      console.log('✅ Real JIRA service initialized');
    } else {
      throw new Error('JIRA credentials not configured. Please set JIRA_USERNAME and JIRA_API_TOKEN environment variables.');
    }
  }
  return jiraService;
}

// No mock service - we only use real JIRA data

// Helper function to check if JIRA is configured
export function isJiraConfigured(): boolean {
  // Check if JIRA credentials are available
  const hasCredentials = !!(process.env.JIRA_USERNAME && (process.env.JIRA_API_TOKEN || process.env.JIRA_PRIVATE_KEY));
  
  if (hasCredentials) {
    console.log('✅ JIRA credentials found - attempting real JIRA connection');
    return true;
  }
  
  console.log('⚠️ JIRA credentials not found - using mock service');
  return false;
}

