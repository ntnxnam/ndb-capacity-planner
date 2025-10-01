import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { DatabaseManager } from './database/DatabaseManager';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { dataRoutes } from './routes/data';
import { configRoutes } from './routes/config';
import { calculationRoutes } from './routes/calculations';
import { releasePlanRoutes } from './routes/releasePlans';
import { auditLogRoutes } from './routes/auditLogs';
import jiraReleaseRoutes from './routes/jiraReleases';
import dateFieldRoutes from './routes/dateFields';
import { errorHandler } from './middleware/errorHandler';
import { localDevAuth } from './middleware/localAuth';
import { logger, LogCategory } from './utils/logger';
import { LoggingService } from './services/loggingService';

// Load environment variables from project root
dotenv.config({ path: '../.env' });
dotenv.config(); // Also try loading from current directory

// Debug environment variables
console.log('🔍 Environment Debug:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  LOCAL_DEV_MODE:', process.env.LOCAL_DEV_MODE);
console.log('  RBAC_ENABLED:', process.env.RBAC_ENABLED);
console.log('  JIRA_BASE_URL:', process.env.JIRA_BASE_URL);
console.log('  JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY);
console.log('  JIRA_USERNAME:', process.env.JIRA_USERNAME);
console.log('  JIRA_API_TOKEN:', process.env.JIRA_API_TOKEN ? '***SET***' : 'NOT SET');

// Initialize logging service
const loggingService = LoggingService.getInstance();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting - very lenient for local development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit for local dev
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    logger.apiCall(req.method, req.path, undefined, undefined, duration, res.statusCode);
    return originalSend.call(this, data);
  };
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'NDB Capacity Planner API is running',
    timestamp: new Date().toISOString()
  });
});

// Local development mode is now handled directly in authenticateToken middleware

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/config', configRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/release-plans', releasePlanRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/jira-releases', jiraReleaseRoutes);
app.use('/api/date-fields', dateFieldRoutes);

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    const dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 NDB Capacity Planner API server running on port ${PORT}`);
      console.log(`🔒 OKTA Domain: ${process.env.OKTA_DOMAIN}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
      
      // Show RBAC status
      const rbacEnabled = process.env.RBAC_ENABLED !== 'false';
      if (rbacEnabled) {
        console.log(`🛡️ RBAC: ✅ ENABLED (Role-based access control active)`);
      } else {
        console.log(`🛡️ RBAC: ⚠️  DISABLED (All authenticated users have full access)`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  const dbManager = DatabaseManager.getInstance();
  await dbManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  const dbManager = DatabaseManager.getInstance();
  await dbManager.close();
  process.exit(0);
});

startServer();

export default app;

