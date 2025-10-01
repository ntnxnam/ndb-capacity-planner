import { DatabaseManager } from '../database/DatabaseManager';
import { logger, LogLevel, LogCategory, LogEntry } from '../utils/logger';
import { v4 as uuidv4 } from '../utils/uuid';

export interface AuditLogQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  resource?: string;
  level?: LogLevel;
  category?: LogCategory;
  limit?: number;
  offset?: number;
}

export interface DateHistoryEntry {
  id: string;
  releasePlanId: string;
  fieldName: string;
  oldDate: string | null;
  newDate: string | null;
  changedBy: string;
  changedAt: string;
  changeReason: string | null;
  changedByName: string;
  changedByEmail: string;
}

export class LoggingService {
  private static instance: LoggingService;
  private db: DatabaseManager;

  private constructor() {
    this.db = DatabaseManager.getInstance();
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  // Store audit log in database
  public async storeAuditLog(entry: LogEntry): Promise<void> {
    try {
      const logId = uuidv4();
      await this.db.run(
        `INSERT INTO audit_logs (
          id, timestamp, level, category, message, user_id, user_email,
          action, resource, resource_id, old_value, new_value, ip_address,
          user_agent, duration, error_name, error_message, error_stack, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          logId,
          entry.timestamp,
          entry.level,
          entry.category,
          entry.message,
          entry.userId || null,
          entry.userEmail || null,
          entry.action || null,
          entry.resource || null,
          entry.resourceId || null,
          entry.oldValue ? JSON.stringify(entry.oldValue) : null,
          entry.newValue ? JSON.stringify(entry.newValue) : null,
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.duration || null,
          entry.error?.name || null,
          entry.error?.message || null,
          entry.error?.stack || null,
          entry.metadata ? JSON.stringify(entry.metadata) : null
        ]
      );
    } catch (error) {
      logger.error(LogCategory.DATABASE, 'Failed to store audit log', {
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  // Query audit logs
  public async getAuditLogs(query: AuditLogQuery = {}): Promise<LogEntry[]> {
    try {
      let sql = `
        SELECT 
          id, timestamp, level, category, message, user_id as userId, user_email as userEmail,
          action, resource, resource_id as resourceId, old_value as oldValue, new_value as newValue,
          ip_address as ipAddress, user_agent as userAgent, duration, error_name as errorName,
          error_message as errorMessage, error_stack as errorStack, metadata
        FROM audit_logs
        WHERE 1=1
      `;
      const params: any[] = [];

      if (query.startDate) {
        sql += ' AND timestamp >= ?';
        params.push(query.startDate);
      }

      if (query.endDate) {
        sql += ' AND timestamp <= ?';
        params.push(query.endDate);
      }

      if (query.userId) {
        sql += ' AND user_id = ?';
        params.push(query.userId);
      }

      if (query.action) {
        sql += ' AND action = ?';
        params.push(query.action);
      }

      if (query.resource) {
        sql += ' AND resource = ?';
        params.push(query.resource);
      }

      if (query.level) {
        sql += ' AND level = ?';
        params.push(query.level);
      }

      if (query.category) {
        sql += ' AND category = ?';
        params.push(query.category);
      }

      sql += ' ORDER BY timestamp DESC';

      if (query.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }

      const rows = await this.db.all(sql, params);
      
      return rows.map(row => ({
        timestamp: row.timestamp,
        level: row.level as LogLevel,
        category: row.category as LogCategory,
        message: row.message,
        userId: row.userId,
        userEmail: row.userEmail,
        action: row.action,
        resource: row.resource,
        resourceId: row.resourceId,
        oldValue: row.oldValue ? JSON.parse(row.oldValue) : undefined,
        newValue: row.newValue ? JSON.parse(row.newValue) : undefined,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        duration: row.duration,
        error: row.errorName ? {
          name: row.errorName,
          message: row.errorMessage,
          stack: row.errorStack
        } : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      logger.error(LogCategory.DATABASE, 'Failed to query audit logs', {
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  // Record date change
  public async recordDateChange(
    releasePlanId: string,
    fieldName: string,
    oldDate: string | null,
    newDate: string | null,
    changedBy: string,
    changeReason?: string
  ): Promise<void> {
    try {
      const historyId = uuidv4();
      await this.db.run(
        `INSERT INTO date_history (
          id, release_plan_id, field_name, old_date, new_date, 
          changed_by, change_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [historyId, releasePlanId, fieldName, oldDate, newDate, changedBy, changeReason || null]
      );

      // Also log this as an audit event
      logger.audit('DATE_CHANGED', `Date field ${fieldName} changed`, {
        resource: 'release_plan',
        resourceId: releasePlanId,
        userId: changedBy,
        oldValue: { [fieldName]: oldDate },
        newValue: { [fieldName]: newDate },
        metadata: { changeReason }
      });
    } catch (error) {
      logger.error(LogCategory.DATABASE, 'Failed to record date change', {
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  // Get date history for a release plan
  public async getDateHistory(releasePlanId: string, fieldName?: string): Promise<DateHistoryEntry[]> {
    try {
      let sql = `
        SELECT 
          dh.id, dh.release_plan_id as releasePlanId, dh.field_name as fieldName,
          dh.old_date as oldDate, dh.new_date as newDate, dh.changed_by as changedBy,
          dh.changed_at as changedAt, dh.change_reason as changeReason,
          u.name as changedByName, u.email as changedByEmail
        FROM date_history dh
        JOIN users u ON dh.changed_by = u.id
        WHERE dh.release_plan_id = ?
      `;
      const params: any[] = [releasePlanId];

      if (fieldName) {
        sql += ' AND dh.field_name = ?';
        params.push(fieldName);
      }

      sql += ' ORDER BY dh.changed_at DESC';

      const rows = await this.db.all(sql, params);
      return rows;
    } catch (error) {
      logger.error(LogCategory.DATABASE, 'Failed to get date history', {
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  // Get audit log statistics
  public async getAuditStats(days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await this.db.all(`
        SELECT 
          level,
          category,
          COUNT(*) as count
        FROM audit_logs
        WHERE timestamp >= ?
        GROUP BY level, category
        ORDER BY count DESC
      `, [startDate.toISOString()]);

      const userStats = await this.db.all(`
        SELECT 
          user_email,
          COUNT(*) as action_count
        FROM audit_logs
        WHERE timestamp >= ? AND user_email IS NOT NULL
        GROUP BY user_email
        ORDER BY action_count DESC
        LIMIT 10
      `, [startDate.toISOString()]);

      return {
        period: `${days} days`,
        totalLogs: stats.reduce((sum, stat) => sum + stat.count, 0),
        byLevel: stats.reduce((acc, stat) => {
          if (!acc[stat.level]) acc[stat.level] = 0;
          acc[stat.level] += stat.count;
          return acc;
        }, {}),
        byCategory: stats.reduce((acc, stat) => {
          if (!acc[stat.category]) acc[stat.category] = 0;
          acc[stat.category] += stat.count;
          return acc;
        }, {}),
        topUsers: userStats
      };
    } catch (error) {
      logger.error(LogCategory.DATABASE, 'Failed to get audit stats', {
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  }
}

