import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { LoggingService } from '../services/loggingService';
import { logger, LogCategory } from '../utils/logger';

const router = Router();

// Get audit logs with filtering
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      action,
      resource,
      level,
      category,
      limit = '50',
      offset = '0'
    } = req.query;

    const loggingService = LoggingService.getInstance();
    const logs = await loggingService.getAuditLogs({
      startDate: startDate as string,
      endDate: endDate as string,
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      level: level as any,
      category: category as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    logger.audit('AUDIT_LOGS_VIEWED', 'Audit logs viewed', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      resource: 'audit_logs',
      metadata: { filters: req.query }
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: logs.length
      }
    });
  } catch (error) {
    logger.error(LogCategory.API, 'Failed to get audit logs', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs',
      code: 'AUDIT_LOGS_FETCH_ERROR'
    });
  }
});

// Get audit statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const loggingService = LoggingService.getInstance();
    const stats = await loggingService.getAuditStats(parseInt(days as string));

    logger.audit('AUDIT_STATS_VIEWED', 'Audit statistics viewed', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      resource: 'audit_stats',
      metadata: { days: parseInt(days as string) }
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(LogCategory.API, 'Failed to get audit stats', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit statistics',
      code: 'AUDIT_STATS_FETCH_ERROR'
    });
  }
});

// Get date history for a release plan
router.get('/date-history/:releasePlanId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { releasePlanId } = req.params;
    const { fieldName } = req.query;
    
    const loggingService = LoggingService.getInstance();
    const history = await loggingService.getDateHistory(
      releasePlanId, 
      fieldName as string
    );

    logger.audit('DATE_HISTORY_VIEWED', 'Date history viewed', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      resource: 'date_history',
      resourceId: releasePlanId,
      metadata: { fieldName }
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error(LogCategory.API, 'Failed to get date history', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve date history',
      code: 'DATE_HISTORY_FETCH_ERROR'
    });
  }
});

export { router as auditLogRoutes };

