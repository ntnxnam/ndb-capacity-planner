import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  AUDIT = 'AUDIT'
}

export enum LogCategory {
  AUTH = 'AUTH',
  API = 'API',
  DATABASE = 'DATABASE',
  USER_ACTION = 'USER_ACTION',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  duration?: number; // in milliseconds
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

class Logger {
  private logDir: string;
  private auditLogFile: string;
  private errorLogFile: string;
  private infoLogFile: string;

  constructor() {
    this.logDir = process.env.LOG_DIR || './logs';
    this.auditLogFile = path.join(this.logDir, 'audit.log');
    this.errorLogFile = path.join(this.logDir, 'error.log');
    this.infoLogFile = path.join(this.logDir, 'info.log');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseEntry = {
      timestamp: entry.timestamp,
      level: entry.level,
      category: entry.category,
      message: entry.message
    };

    const fullEntry = {
      ...baseEntry,
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.userEmail && { userEmail: entry.userEmail }),
      ...(entry.action && { action: entry.action }),
      ...(entry.resource && { resource: entry.resource }),
      ...(entry.resourceId && { resourceId: entry.resourceId }),
      ...(entry.oldValue && { oldValue: entry.oldValue }),
      ...(entry.newValue && { newValue: entry.newValue }),
      ...(entry.ipAddress && { ipAddress: entry.ipAddress }),
      ...(entry.userAgent && { userAgent: entry.userAgent }),
      ...(entry.duration && { duration: entry.duration }),
      ...(entry.error && { error: entry.error }),
      ...(entry.metadata && { metadata: entry.metadata })
    };

    return JSON.stringify(fullEntry);
  }

  private writeToFile(filename: string, entry: LogEntry): void {
    const logLine = this.formatLogEntry(entry) + '\n';
    fs.appendFileSync(filename, logLine);
  }

  private getLogFile(level: LogLevel): string {
    switch (level) {
      case LogLevel.AUDIT:
        return this.auditLogFile;
      case LogLevel.ERROR:
        return this.errorLogFile;
      default:
        return this.infoLogFile;
    }
  }

  private log(level: LogLevel, category: LogCategory, message: string, options: Partial<LogEntry> = {}): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...options
    };

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const colorMap = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
        [LogLevel.AUDIT]: '\x1b[35m'  // Magenta
      };
      const reset = '\x1b[0m';
      const color = colorMap[level] || '';
      
      console.log(`${color}[${entry.timestamp}] ${level} [${category}] ${message}${reset}`);
      if (options.userId) console.log(`  User: ${options.userEmail} (${options.userId})`);
      if (options.action) console.log(`  Action: ${options.action}`);
      if (options.resource) console.log(`  Resource: ${options.resource}`);
      if (options.duration) console.log(`  Duration: ${options.duration}ms`);
      if (options.error) console.log(`  Error: ${options.error.message}`);
    }

    // Write to file
    this.writeToFile(this.getLogFile(level), entry);
  }

  debug(category: LogCategory, message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.DEBUG, category, message, options);
  }

  info(category: LogCategory, message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, category, message, options);
  }

  warn(category: LogCategory, message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.WARN, category, message, options);
  }

  error(category: LogCategory, message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.ERROR, category, message, options);
  }

  audit(action: string, message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.AUDIT, LogCategory.USER_ACTION, message, {
      action,
      ...options
    });
  }

  // Convenience methods for common operations
  userLogin(userId: string, userEmail: string, ipAddress?: string, userAgent?: string): void {
    this.audit('USER_LOGIN', `User logged in: ${userEmail}`, {
      userId,
      userEmail,
      ipAddress,
      userAgent
    });
  }

  userLogout(userId: string, userEmail: string, ipAddress?: string): void {
    this.audit('USER_LOGOUT', `User logged out: ${userEmail}`, {
      userId,
      userEmail,
      ipAddress
    });
  }

  dataCreated(resource: string, resourceId: string, userId: string, userEmail: string, data: any): void {
    this.audit('DATA_CREATED', `${resource} created`, {
      resource,
      resourceId,
      userId,
      userEmail,
      newValue: data
    });
  }

  dataUpdated(resource: string, resourceId: string, userId: string, userEmail: string, oldValue: any, newValue: any): void {
    this.audit('DATA_UPDATED', `${resource} updated`, {
      resource,
      resourceId,
      userId,
      userEmail,
      oldValue,
      newValue
    });
  }

  dataDeleted(resource: string, resourceId: string, userId: string, userEmail: string, oldValue: any): void {
    this.audit('DATA_DELETED', `${resource} deleted`, {
      resource,
      resourceId,
      userId,
      userEmail,
      oldValue
    });
  }

  apiCall(method: string, endpoint: string, userId?: string, userEmail?: string, duration?: number, statusCode?: number): void {
    this.info(LogCategory.API, `${method} ${endpoint}`, {
      userId,
      userEmail,
      action: 'API_CALL',
      resource: endpoint,
      duration,
      metadata: { method, statusCode }
    });
  }

  securityEvent(event: string, message: string, userId?: string, userEmail?: string, ipAddress?: string): void {
    this.warn(LogCategory.SECURITY, message, {
      action: event,
      userId,
      userEmail,
      ipAddress
    });
  }

  performanceMetric(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(LogCategory.PERFORMANCE, `${operation} completed in ${duration}ms`, {
      action: 'PERFORMANCE',
      duration,
      metadata
    });
  }
}

export const logger = new Logger();

