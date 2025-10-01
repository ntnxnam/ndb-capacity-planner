export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  USER = 'user'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  okta_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DataField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DataEntry {
  id: string;
  data: Record<string, any>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CalculationRule {
  id: string;
  name: string;
  description: string;
  logic: string; // AI-generated or manual logic
  ai_prompt?: string; // Original prompt if created via AI
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface OKTATokenPayload {
  sub: string;
  email: string;
  name: string;
  groups?: string[];
  iss: string;
  aud: string;
  exp: number;
  iat: number;
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
  jira_release_id?: string; // JIRA release/version ID
  jira_release_name?: string; // JIRA release name for reference
  release_dris?: string; // JSON object of structured DRIs
  pre_cc_complete_date?: Date;
  concept_commit_date?: Date;
  execute_commit_date?: Date;
  soft_code_complete_date?: Date;
  commit_gate_met_date?: Date;
  promotion_gate_met_date?: Date;
  ga_date?: Date;
  feature_qa_need_by_date?: Date; // Calculated field
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface JiraRelease {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  released: boolean;
  archived: boolean;
  startDate?: string;
  releaseDate?: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    okta_id: string;
  };
}

