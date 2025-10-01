import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { UserRole } from '../types';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: sqlite3.Database | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    const dbPath = process.env.DATABASE_PATH || './database/ndb_capacity_planner.db';
    const dbDir = path.dirname(dbPath);

    // Create database directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  private async createTables(): Promise<void> {
    const queries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'user')),
        okta_id TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Data fields configuration table
      `CREATE TABLE IF NOT EXISTS data_fields (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'date')),
        required BOOLEAN NOT NULL DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Data entries table
      `CREATE TABLE IF NOT EXISTS data_entries (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL, -- JSON data
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Calculation rules table
      `CREATE TABLE IF NOT EXISTS calculation_rules (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        logic TEXT NOT NULL,
        ai_prompt TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Release plans table
      `CREATE TABLE IF NOT EXISTS release_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        jira_release_id TEXT,
        release_dris TEXT, -- JSON array of DRI JIRA IDs/emails
        pre_cc_complete_date DATETIME,
        concept_commit_date DATETIME,
        execute_commit_date DATETIME,
        soft_code_complete_date DATETIME,
        commit_gate_met_date DATETIME,
        promotion_gate_met_date DATETIME,
        ga_date DATETIME,
        feature_qa_need_by_date DATETIME,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id),
        FOREIGN KEY (jira_release_id) REFERENCES jira_releases (id)
      )`,

      // Audit logs table
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        level TEXT NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'AUDIT')),
        category TEXT NOT NULL CHECK (category IN ('AUTH', 'API', 'DATABASE', 'USER_ACTION', 'SYSTEM', 'SECURITY', 'PERFORMANCE')),
        message TEXT NOT NULL,
        user_id TEXT,
        user_email TEXT,
        action TEXT,
        resource TEXT,
        resource_id TEXT,
        old_value TEXT, -- JSON
        new_value TEXT, -- JSON
        ip_address TEXT,
        user_agent TEXT,
        duration INTEGER, -- milliseconds
        error_name TEXT,
        error_message TEXT,
        error_stack TEXT,
        metadata TEXT, -- JSON
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Date history table for tracking date changes
      `CREATE TABLE IF NOT EXISTS date_history (
        id TEXT PRIMARY KEY,
        release_plan_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        old_date DATETIME,
        new_date DATETIME,
        changed_by TEXT NOT NULL,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        change_reason TEXT,
        FOREIGN KEY (release_plan_id) REFERENCES release_plans (id),
        FOREIGN KEY (changed_by) REFERENCES users (id)
      )`,

      // JIRA releases table for storing releases fetched from JIRA
      `CREATE TABLE IF NOT EXISTS jira_releases (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        project_id TEXT NOT NULL,
        released BOOLEAN NOT NULL DEFAULT 0,
        archived BOOLEAN NOT NULL DEFAULT 0,
        start_date DATETIME,
        release_date DATETIME,
        last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Date fields table for dynamic date field management
      `CREATE TABLE IF NOT EXISTS date_fields (
        id TEXT PRIMARY KEY,
        field_name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        is_required BOOLEAN NOT NULL DEFAULT 0,
        field_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Indexes for better performance
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_okta_id ON users (okta_id)`,
      `CREATE INDEX IF NOT EXISTS idx_data_entries_created_by ON data_entries (created_by)`,
      `CREATE INDEX IF NOT EXISTS idx_calculation_rules_created_by ON calculation_rules (created_by)`,
      `CREATE INDEX IF NOT EXISTS idx_release_plans_created_by ON release_plans (created_by)`,
      `CREATE INDEX IF NOT EXISTS idx_release_plans_ga_date ON release_plans (ga_date)`,
      `CREATE INDEX IF NOT EXISTS idx_release_plans_jira_id ON release_plans (jira_release_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource)`,
      `CREATE INDEX IF NOT EXISTS idx_date_history_release_plan_id ON date_history (release_plan_id)`,
      `CREATE INDEX IF NOT EXISTS idx_date_history_field_name ON date_history (field_name)`,
      `CREATE INDEX IF NOT EXISTS idx_date_history_changed_at ON date_history (changed_at)`,
      `CREATE INDEX IF NOT EXISTS idx_jira_releases_project_id ON jira_releases (project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_jira_releases_released ON jira_releases (released)`,
      `CREATE INDEX IF NOT EXISTS idx_jira_releases_release_date ON jira_releases (release_date)`,
      `CREATE INDEX IF NOT EXISTS idx_jira_releases_last_synced ON jira_releases (last_synced_at)`
    ];

    for (const query of queries) {
      await this.run(query);
    }

    // Insert default superadmin user
    await this.insertDefaultSuperAdmin();
    console.log('✅ Database tables created and initialized');
  }

  private async insertDefaultSuperAdmin(): Promise<void> {
    const existingSuperAdmin = await this.get(
      'SELECT * FROM users WHERE email = ?',
      ['namratha.singh@nutanix.com']
    );

    if (!existingSuperAdmin) {
      await this.run(
        `INSERT INTO users (id, email, name, role, okta_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          'superadmin-001',
          'namratha.singh@nutanix.com',
          'Namratha Singh',
          UserRole.SUPERADMIN,
          'namratha.singh@nutanix.com' // Will be updated when first login happens
        ]
      );
      console.log('✅ Default superadmin user created');
    }

    // Insert default admin user
    const existingAdmin = await this.get(
      'SELECT * FROM users WHERE email = ?',
      ['bharath@nutanix.com']
    );

    if (!existingAdmin) {
      await this.run(
        `INSERT INTO users (id, email, name, role, okta_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          'admin-001',
          'bharath@nutanix.com',
          'Bharath',
          UserRole.ADMIN,
          'bharath@nutanix.com' // Will be updated when first login happens
        ]
      );
      console.log('✅ Default admin user created');
    }
  }

  public async run(query: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async get(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  public async all(query: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  public async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close(() => {
          console.log('✅ Database connection closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
