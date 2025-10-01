import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'user';
}

export interface DataField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DataEntry {
  id: string;
  data: Record<string, any>;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

export interface CalculationRule {
  id: string;
  name: string;
  description: string;
  logic: string;
  ai_prompt?: string;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

export interface ReleaseDRIs {
  qa_dri: string; // Required - QA DRI JIRA ID/email
  dev_dri: string; // Required - Dev DRI JIRA ID/email
  tpm_dri: string; // Required - TPM DRI JIRA ID/email
  pm_dri?: string; // Optional - PM DRI JIRA ID/email
}

export interface ReleasePlan {
  id: string;
  name: string;
  description?: string;
  jira_release_id?: string;
  jira_release_name?: string; // This will come from the JOIN with jira_releases table
  jira_release_description?: string;
  jira_project_id?: string;
  jira_released?: boolean;
  jira_archived?: boolean;
  jira_start_date?: string;
  jira_release_date?: string;
  release_dris?: string; // JSON object of structured DRIs
  pre_cc_complete_date?: string;
  concept_commit_date?: string;
  execute_commit_date?: string;
  soft_code_complete_date?: string;
  commit_gate_met_date?: string;
  promotion_gate_met_date?: string;
  ga_date?: string;
  feature_qa_need_by_date?: string;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
}

export interface JiraRelease {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  released: boolean;
  archived: boolean;
  start_date?: string;
  release_date?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReleasePlanSuggestions {
  pre_cc_complete_date: string;
  concept_commit_date: string;
  execute_commit_date: string;
  soft_code_complete_date: string;
  commit_gate_met_date: string;
  promotion_gate_met_date: string;
  feature_qa_need_by_date: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.BACKEND_URL || 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      // Check if we're in local development mode
      const isLocalDev = process.env.NODE_ENV === 'development' && 
                         (process.env.NEXT_PUBLIC_LOCAL_DEV === 'true' || 
                          !process.env.NEXT_PUBLIC_OKTA_CLIENT_ID ||
                          process.env.NEXT_PUBLIC_OKTA_CLIENT_ID === 'local-dev');
      
      if (isLocalDev) {
        // Use a fake token for local development
        config.headers.Authorization = `Bearer local-dev-token`;
      } else {
        const token = localStorage.getItem('local_access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          localStorage.removeItem('local_access_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async verifyToken(): Promise<{ valid: boolean; user?: User }> {
    const response = await this.client.post('/auth/verify');
    return response.data;
  }

  async getUserProfile(): Promise<User> {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  // User management endpoints
  async getUsers(): Promise<User[]> {
    const response = await this.client.get('/users');
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async updateUserRole(id: string, role: string): Promise<{ message: string; user: User }> {
    const response = await this.client.patch(`/users/${id}/role`, { role });
    return response.data;
  }

  async createUser(userData: { email: string; name: string; role: string }): Promise<{ message: string; user: User }> {
    const response = await this.client.post('/users', userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  // Data field configuration endpoints
  async getDataFields(): Promise<DataField[]> {
    const response = await this.client.get('/config/fields');
    return response.data;
  }

  async getDataField(id: string): Promise<DataField> {
    const response = await this.client.get(`/config/fields/${id}`);
    return response.data;
  }

  async createDataField(fieldData: Omit<DataField, 'id' | 'created_at' | 'updated_at'>): Promise<{ message: string; field: DataField }> {
    const response = await this.client.post('/config/fields', fieldData);
    return response.data;
  }

  async updateDataField(id: string, fieldData: Omit<DataField, 'id' | 'created_at' | 'updated_at'>): Promise<{ message: string; field: DataField }> {
    const response = await this.client.put(`/config/fields/${id}`, fieldData);
    return response.data;
  }

  async deleteDataField(id: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/config/fields/${id}`);
    return response.data;
  }

  // Data entry endpoints
  async getDataEntries(): Promise<DataEntry[]> {
    const response = await this.client.get('/data');
    return response.data;
  }

  async getDataEntry(id: string): Promise<DataEntry> {
    const response = await this.client.get(`/data/${id}`);
    return response.data;
  }

  async createDataEntry(data: Record<string, any>): Promise<{ message: string; entry: DataEntry }> {
    const response = await this.client.post('/data', { data });
    return response.data;
  }

  async updateDataEntry(id: string, data: Record<string, any>): Promise<{ message: string; entry: DataEntry }> {
    const response = await this.client.put(`/data/${id}`, { data });
    return response.data;
  }

  async deleteDataEntry(id: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/data/${id}`);
    return response.data;
  }

  // Calculation rule endpoints
  async getCalculationRules(): Promise<CalculationRule[]> {
    const response = await this.client.get('/calculations/rules');
    return response.data;
  }

  async getCalculationRule(id: string): Promise<CalculationRule> {
    const response = await this.client.get(`/calculations/rules/${id}`);
    return response.data;
  }

  async createCalculationRule(ruleData: { name: string; description: string; logic: string; ai_prompt?: string }): Promise<{ message: string; rule: CalculationRule }> {
    const response = await this.client.post('/calculations/rules', ruleData);
    return response.data;
  }

  async generateCalculationRuleFromPrompt(promptData: { prompt: string; name: string; description: string }): Promise<{ message: string; rule: CalculationRule }> {
    const response = await this.client.post('/calculations/rules/generate-from-prompt', promptData);
    return response.data;
  }

  async updateCalculationRule(id: string, ruleData: { name: string; description: string; logic: string; ai_prompt?: string }): Promise<{ message: string; rule: CalculationRule }> {
    const response = await this.client.put(`/calculations/rules/${id}`, ruleData);
    return response.data;
  }

  async deleteCalculationRule(id: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/calculations/rules/${id}`);
    return response.data;
  }

  async executeCalculation(ruleId: string, dataEntryIds?: string[]): Promise<{
    ruleId: string;
    ruleName: string;
    executedAt: string;
    results: Array<{
      dataEntryId: string;
      result?: any;
      error?: string;
      success: boolean;
    }>;
  }> {
    const response = await this.client.post(`/calculations/execute/${ruleId}`, { dataEntryIds });
    return response.data;
  }

  // Release plan endpoints
  async getReleasePlans(): Promise<ReleasePlan[]> {
    const response = await this.client.get('/release-plans');
    return response.data;
  }

  async getReleasePlan(id: string): Promise<ReleasePlan> {
    const response = await this.client.get(`/release-plans/${id}`);
    return response.data;
  }

  async createReleasePlan(planData: {
    name: string;
    description?: string;
    jira_release_id?: string;
    jira_release_name?: string;
    release_dris?: ReleaseDRIs;
    pre_cc_complete_date?: string;
    concept_commit_date?: string;
    execute_commit_date?: string;
    soft_code_complete_date?: string;
    commit_gate_met_date?: string;
    promotion_gate_met_date?: string;
    ga_date?: string;
  }): Promise<{ message: string; plan: ReleasePlan }> {
    const response = await this.client.post('/release-plans', planData);
    return response.data;
  }

  async updateReleasePlan(id: string, planData: {
    name: string;
    description?: string;
    jira_release_id?: string;
    jira_release_name?: string;
    release_dris?: ReleaseDRIs;
    pre_cc_complete_date?: string;
    concept_commit_date?: string;
    execute_commit_date?: string;
    soft_code_complete_date?: string;
    commit_gate_met_date?: string;
    promotion_gate_met_date?: string;
    ga_date?: string;
  }): Promise<{ message: string; plan: ReleasePlan }> {
    const response = await this.client.put(`/release-plans/${id}`, planData);
    return response.data;
  }

  async deleteReleasePlan(id: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/release-plans/${id}`);
    return response.data;
  }

  async getDateSuggestions(gaDate: string): Promise<ReleasePlanSuggestions> {
    const response = await this.client.post('/release-plans/date-suggestions', { ga_date: gaDate });
    return response.data.data;
  }

  async getJiraReleasesForReleasePlans(): Promise<JiraRelease[]> {
    const response = await this.client.get('/release-plans/jira-releases');
    return response.data;
  }

  // JIRA releases endpoints
  async getJiraReleases(): Promise<{ success: boolean; data: JiraRelease[]; count: number }> {
    const response = await this.client.get('/jira-releases');
    return response.data;
  }

  async getActiveJiraReleases(): Promise<{ success: boolean; data: JiraRelease[]; count: number }> {
    const response = await this.client.get('/jira-releases/active');
    return response.data;
  }

  async getJiraRelease(id: string): Promise<{ success: boolean; data: JiraRelease }> {
    const response = await this.client.get(`/jira-releases/${id}`);
    return response.data;
  }

  async syncJiraReleases(): Promise<{ 
    success: boolean; 
    message: string; 
    stats: { synced: number; updated: number; errors: number; total: number } 
  }> {
    const response = await this.client.post('/jira-releases/sync');
    return response.data;
  }

  async deleteJiraRelease(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/jira-releases/${id}`);
    return response.data;
  }

  async getJiraStatus(): Promise<{ 
    success: boolean; 
    data: { 
      configured: boolean; 
      connection_status: string; 
      last_synced_at?: string; 
      total_releases: number 
    } 
  }> {
    const response = await this.client.get('/jira-releases/status');
    return response.data;
  }
}

export const api = new ApiClient();

