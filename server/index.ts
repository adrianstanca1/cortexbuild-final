

import dotenv from 'dotenv';
dotenv.config({ override: true });
const isProduction = process.env.NODE_ENV === 'production';
logger.info(`Server initialized in ${process.env.NODE_ENV || 'development'} mode`);
if (!isProduction) {
    logger.info('External DB Host:', process.env.DB_HOST || 'Unset');
}
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { createServer } from 'http';
import { ApolloServer } from 'apollo-server-express';

// Internal
import { logger } from './utils/logger.js';
import { AppError } from './utils/AppError.js';
import { initializeDatabase, getDb, ensureDbInitialized } from './database.js';
import { seedDatabase } from './seed.js';
import { setupWebSocketServer } from './socket.js';
import { realtimeService } from './services/realtimeService.js';
import { UserRole } from './types.js';

// Middleware
import { apiLimiter, authLimiter, uploadLimiter } from './middleware/rateLimit.js';
import { requireRole, requirePermission } from './middleware/rbacMiddleware.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import { contextMiddleware } from './middleware/contextMiddleware.js';
import { maintenanceMiddleware } from './middleware/maintenanceMiddleware.js';
import { rateLimit } from './middleware/rateLimitMiddleware.js';
import errorHandler from './middleware/errorMiddleware.js';
import { responseCacheMiddleware, connectionHealthMiddleware } from './middleware/performanceMiddleware.js';

// Services
import { getTenantAnalytics, logUsage, checkTenantLimits, getTenantUsage } from './services/tenantService.js';
import * as activityService from './services/activityService.js';
import { auditService } from './services/auditService.js';

// Controllers
import * as companyController from './controllers/companyController.js';
import * as platformController from './controllers/platformController.js';
import * as userManagementController from './controllers/userManagementController.js';
import * as dailyLogController from './controllers/dailyLogController.js';
import * as marketplaceController from './controllers/marketplaceController.js';
import * as rfiController from './controllers/rfiController.js';
import * as safetyController from './controllers/safetyController.js';
// import * as taskController from './controllers/taskController.js'; // Removed
import * as commentController from './controllers/commentController.js';
import * as rbacController from './controllers/rbacController.js';
import * as automationController from './controllers/automationController.js';
import * as predictiveController from './controllers/predictiveController.js';
import * as ocrController from './controllers/ocrController.js';
import * as analyticsController from './controllers/analyticsController.js';
import * as integrationController from './controllers/integrationController.js';
import * as tenantTeamController from './controllers/tenantTeamController.js';
import * as setupController from './controllers/setupController.js';
import * as superadminCompanyController from './controllers/superadminCompanyController.js';
import { getVendors, createVendor, updateVendor } from './controllers/vendorController.js';
import { getCostCodes, createCostCode, updateCostCode } from './controllers/costCodeController.js';
import * as invoiceController from './controllers/invoiceController.js';
import * as mlController from './controllers/mlController.js';
import * as searchController from './controllers/searchController.js';

// Middleware  
import { tenantRoutingMiddleware } from './middleware/tenantMiddleware.js';

// Routes
import tenantRoutes from './routes/tenantRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import platformRoutes from './routes/platformRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import userManagementRoutes from './routes/userManagementRoutes.js';
import clientPortalRoutes from './routes/clientPortalRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import aiRoutes from './routes/ai.js';
import provisioningRoutes from './routes/provisioningRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import impersonationRoutes from './routes/impersonationRoutes.js';
import moduleRoutes from './routes/moduleRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import platformAutomationRoutes from './routes/platformAutomationRoutes.js';
import databaseRoutes from './routes/databaseRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import apiManagementRoutes from './routes/apiManagementRoutes.js';
import storageRoutes from './routes/storageRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import dataManagementRoutes from './routes/dataManagementRoutes.js';
import financialRoutes from './routes/financialRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import { sessionIpLockMiddleware, dynamicCspMiddleware } from './middleware/securityMiddleware.js';

// GraphQL
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';

const app = express();
// Enable proxy trust for Hostinger Load Balancer
app.set('trust proxy', 1);

const port = process.env.PORT || 3001; // Matches Hostinger proxy configuration

// Explicitly handle HTTP requests to WebSocket endpoints to prevent index.html fallback
// This must be BEFORE any other middleware
app.use(['/api/live', '/live'], (req: any, res: any, next: any) => {
    const upgradeHeader = req.headers.upgrade;

    // Log headers to debug proxy behavior
    if (req.originalUrl && req.originalUrl.includes('live')) {
        logger.info(`[WS-Debug] Headers for ${req.originalUrl}: ${JSON.stringify(req.headers)}`);
    }

    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
        return next();
    }

    // Relaxed check: If it looks like a websocket request (has connection: upgrade), let it pass
    if (req.headers.connection && req.headers.connection.toLowerCase().includes('upgrade')) {
        return next();
    }

    // Return text response to avoid HTML fallback issues
    return res.status(426).send('Upgrade Required');
});

// Security middleware
const SUPABASE_HOST = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_WS = SUPABASE_HOST ? SUPABASE_HOST.replace(/^https?:/, 'wss:') : '';

// Security Headers with Enhanced CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"], // 'unsafe-eval' needed for some dev tools/charts
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https:",
                "https://cortexbuildpro.com",
                "https://api.cortexbuildpro.com"
            ],
            connectSrc: [
                "'self'",
                "ws:",
                "wss:",
                "https:", // Allow external APIs
                SUPABASE_HOST,
                SUPABASE_WS,
                "https://api.cortexbuildpro.com",
                "https://cortexbuildpro.com",
                "https://fonts.googleapis.com",
                "https://fonts.gstatic.com",
                "https://generativelanguage.googleapis.com"
            ],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"], // or allow if embedding is needed
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
}));

// CORS Configuration with Environment Separation
const productionOrigins = [
    'https://cortexbuildpro.com',
    'https://www.cortexbuildpro.com',
    'https://api.cortexbuildpro.com' // Allow self-calls
];
const developmentOrigins = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000', 'http://localhost:3001'];

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : isProduction
        ? productionOrigins
        : [...productionOrigins, ...developmentOrigins];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            logger.info(`CORS: Allowed origin: ${origin}`);
            callback(null, true);
        } else {
            logger.warn(`CORS: Rejected origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id', 'x-api-version', 'x-company-id']
}));

// Request ID Tracking & API Version
app.use((req, res, next) => {
    const requestId = req.header('x-request-id') || uuidv4();
    (req as any).id = requestId;
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-api-version', '1.1.0');
    next();
});

// Compression & Logging with Smart Filtering
app.use(compression({
    level: 6, // Balance between speed and compression ratio
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        // Don't compress WebSocket upgrade requests or streaming responses
        if (req.headers['upgrade']) return false;
        // Use compression defaults for other requests
        return compression.filter(req, res);
    }
}));
morgan.token('id', (req: any) => req.id);
app.use(morgan(':id :method :url :status :res[content-length] - :response-time ms', {
    skip: (req, res) => req.url === '/api/health' // Skip health checks to keep logs clean
}));

// Performance Monitoring
app.use(connectionHealthMiddleware);

// Response Caching Headers
app.use(responseCacheMiddleware);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Health Check Implementation ---
const getHealth = async (req: any, res: any) => {
    try {
        const db = getDb();
        const start = Date.now();
        await db.get('SELECT 1 as connected');
        const dbLatency = Date.now() - start;

        const tenantCount = await db.get('SELECT COUNT(*) as count FROM companies');

        res.json({
            status: 'online',
            service: 'CortexBuild Pro API',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            database: {
                status: 'connected',
                type: db.getType(),
                latencyMs: dbLatency
            },
            system: {
                memory: {
                    free: Math.round(os.freemem() / 1024 / 1024) + 'MB',
                    total: Math.round(os.totalmem() / 1024 / 1024) + 'MB',
                    usage: Math.round((1 - os.freemem() / os.totalmem()) * 100) + '%'
                },
                load: os.loadavg()
            },
            metrics: {
                tenants: tenantCount?.count || 0
            },
            version: process.env.npm_package_version || '1.1.0'
        });
    } catch (error: any) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'degraded',
            database: 'disconnected',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// --- Routes Configuration ---
// These are defined BEFORE the DB initialization middleware to allow fast status checks
app.get(['/api/health', '/api/v1/health'], getHealth);


// Middleware to ensure DB is initialized before handling requests
app.use(async (req, res, next) => {
    try {
        await ensureDbInitialized();
        next();
    } catch (err) {
        next(err);
    }
});

// Serve local uploads with optional HMAC signature verification
const verifySignedUpload = (req: any, res: any, next: any) => {
    const signingSecret = process.env.FILE_SIGNING_SECRET;
    if (!signingSecret) return next();

    const { expires, sig } = req.query;
    if (!expires || !sig) {
        return res.status(403).json({ error: 'Signed URL required' });
    }

    const expiresAt = Number(expires);
    if (!expiresAt || Date.now() > expiresAt) {
        return res.status(403).json({ error: 'Signed URL expired' });
    }

    const relativePath = req.path.replace(/^\/+/, '');
    const parts = relativePath.split('/');
    const tenantId = parts.length >= 2 && parts[0] === 'tenants' ? parts[1] : 'unknown';
    const payload = `${tenantId}:${relativePath}:${expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');

    if (expectedSig !== sig) {
        return res.status(403).json({ error: 'Invalid signature' });
    }

    return next();
};

app.use('/uploads', verifySignedUpload, express.static(resolve('uploads')));

// Serve frontend static files - Unified deployment (frontend + backend together)
if (process.env.NODE_ENV === 'production') {
    const frontendDist = resolve(__dirname, '../../');
    logger.info(`Serving frontend static files from: ${frontendDist}`);
    app.use(express.static(frontendDist));
}
// }

// Helper for audit logging
const logAction = async (req: any, action: string, resource: string, resourceId: string, changes: any = null, status: string = 'success') => {
    // Forward to centralized audit service
    await auditService.logRequest(req, action, resource, resourceId, changes);
};


const v1Router = express.Router();

// --- Public Routes (No Auth Required) ---
const publicRouter = express.Router();
publicRouter.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), authRoutes);
publicRouter.use('/invitations', invitationRoutes);
publicRouter.use('/client-portal', clientPortalRoutes);

v1Router.use(publicRouter);

// --- Profile & RBAC Routes (Auth Required, but not Tenant-Scoped) ---
const profileRouter = express.Router();
profileRouter.use(authenticateToken as any);

profileRouter.get('/user/me', async (req: any, res: any, next: any) => {
    try {
        const userId = req.userId;
        const db = getDb();
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

        // Fetch memberships from DB
        const memberships = await db.all(`
            SELECT m.*, c.name as companyName 
            FROM memberships m 
            JOIN companies c ON m.companyId = c.id 
            WHERE m.userId = ?
        `, [userId]);

        // RESILIENCE: If user is SuperAdmin in Supabase metadata, prioritize that
        const isMetadataSuperAdmin = req.context?.role === 'SUPERADMIN' || req.context?.isSuperadmin;

        // Find primary membership or create virtual one for SuperAdmin
        let primaryMembership = memberships.find(m => m.role === 'SUPERADMIN') || memberships[0];
        let finalRole = primaryMembership?.role || 'OPERATIVE';
        let finalCompanyId = primaryMembership?.companyId || 'c1';

        if (isMetadataSuperAdmin) {
            finalRole = 'SUPERADMIN';
            // Use 'platform-admin' or 'c1' as default company for system-level superadmins
            finalCompanyId = primaryMembership?.companyId || 'platform-admin';
        }

        if (!user && !isMetadataSuperAdmin) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: userId,
            name: user?.name || req.user?.user_metadata?.full_name || 'Super Admin',
            email: user?.email || req.user?.email,
            phone: user?.phone || '',
            role: finalRole,
            companyId: finalCompanyId,
            permissions: ['*'],
            memberships: memberships.length > 0 ? memberships.map(m => ({
                companyId: m.companyId,
                companyName: m.companyName,
                role: m.role
            })) : (isMetadataSuperAdmin ? [{
                companyId: 'platform-admin',
                companyName: 'Platform Administration',
                role: 'SUPERADMIN'
            }] : [])
        });
    } catch (error) {
        next(error);
    }
});

profileRouter.get('/roles', rbacController.getRoles);
profileRouter.post('/roles', rbacController.createRole);
profileRouter.put('/roles/:id/permissions', rbacController.updateRolePermissions);

// Mount authRoutes (includes /me/context, /invite, /register, etc.)
profileRouter.use(authRoutes);

v1Router.use(profileRouter);

// --- Protected Routes ---
const protectedRouter = express.Router();
protectedRouter.use(authenticateToken as any);
protectedRouter.use(contextMiddleware as any);
protectedRouter.use(tenantRoutingMiddleware as any);

// --- Construction Management Routes (Phase 4) ---
protectedRouter.get('/daily_logs', dailyLogController.getDailyLogs);
protectedRouter.post('/daily_logs', dailyLogController.createDailyLog);
protectedRouter.put('/daily_logs/:id', dailyLogController.updateDailyLog);
protectedRouter.delete('/daily_logs/:id', dailyLogController.deleteDailyLog);

protectedRouter.get('/rfis', rfiController.getRFIs);
protectedRouter.post('/rfis', rfiController.createRFI);
protectedRouter.put('/rfis/:id', rfiController.updateRFI);
protectedRouter.delete('/rfis/:id', rfiController.deleteRFI);

protectedRouter.get('/safety_incidents', requirePermission('safety', 'read'), safetyController.getSafetyIncidents);
protectedRouter.post('/safety_incidents', requirePermission('safety', 'create'), safetyController.createSafetyIncident);
protectedRouter.put('/safety_incidents/:id', requirePermission('safety', 'update'), safetyController.updateSafetyIncident);
protectedRouter.delete('/safety_incidents/:id', requirePermission('safety', 'delete'), safetyController.deleteSafetyIncident);

protectedRouter.get('/safety_hazards', safetyController.getSafetyHazards);
protectedRouter.post('/safety_hazards', requirePermission('safety', 'create'), safetyController.createSafetyHazard);
protectedRouter.put('/safety_hazards/:id', requirePermission('safety', 'update'), safetyController.updateSafetyHazard);

protectedRouter.get('/comments', commentController.getComments);
protectedRouter.post('/comments', apiLimiter as any, commentController.createComment);
protectedRouter.put('/comments/:id', commentController.updateComment);
protectedRouter.delete('/comments/:id', commentController.deleteComment);

protectedRouter.get('/activity', activityService.getActivityFeed);
protectedRouter.get('/activity/:entityType/:entityId', activityService.getEntityActivity);

protectedRouter.get('/analytics/kpis', analyticsController.getExecutiveKPIs);
protectedRouter.get('/analytics/project-progress', analyticsController.getProjectProgress);
protectedRouter.get('/analytics/cost-variance', analyticsController.getCostVarianceTrend);
protectedRouter.get('/analytics/resource-utilization', analyticsController.getResourceUtilization);
protectedRouter.get('/analytics/safety-metrics', analyticsController.getSafetyMetrics);
protectedRouter.get('/analytics/project-health/:projectId', analyticsController.getProjectHealth);
protectedRouter.get('/analytics/custom-report', analyticsController.getCustomReport);

protectedRouter.get('/search', searchController.searchAll);

// Notifications endpoint
// Notifications endpoint handled by notificationRoutes


protectedRouter.get('/integrations/:type', integrationController.getStatus);
protectedRouter.post('/integrations/connect', integrationController.connect);
protectedRouter.post('/integrations/sync', integrationController.sync);





protectedRouter.get('/predictive/:projectId', predictiveController.analyzeProjectDelays);

protectedRouter.get('/ml-models', mlController.getModels);
protectedRouter.post('/ml-models/:id/train', mlController.trainModel);
protectedRouter.get('/ml-predictions', mlController.getPredictions);

protectedRouter.post('/ocr/extract', ocrController.extractData);

protectedRouter.get('/vendors', getVendors);
protectedRouter.post('/vendors', requirePermission('settings', 'update'), createVendor);
protectedRouter.put('/vendors/:id', requirePermission('settings', 'update'), updateVendor);

// System Settings
import * as systemSettingsController from './controllers/systemSettingsController.js';
protectedRouter.get('/system-settings', requirePermission('settings', 'read'), systemSettingsController.getSettings);
protectedRouter.put('/system-settings', requirePermission('settings', 'update'), systemSettingsController.updateSetting);

// --- Cost Codes (Legacy removed, use /financials/cost-codes) ---
// --- Invoices (Legacy removed, use /financials/invoices) ---

// --- Consolidated Route Mounting ---
protectedRouter.use('/tenants', tenantRoutes);
protectedRouter.use('/companies', companyRoutes);
protectedRouter.use('/projects', projectRoutes);
protectedRouter.use('/tasks', taskRoutes);
protectedRouter.use('/platform', platformRoutes);
protectedRouter.use('/support', supportRoutes);
protectedRouter.use('/notifications', notificationRoutes);
protectedRouter.use('/users', userManagementRoutes);
protectedRouter.use('/push', pushRoutes);
protectedRouter.use('/ai', aiRoutes);
protectedRouter.use('/provisioning', provisioningRoutes);
protectedRouter.use('/audit', auditRoutes);
protectedRouter.use('/compliance', complianceRoutes);
protectedRouter.use('/impersonation', impersonationRoutes);
protectedRouter.use('/modules', moduleRoutes);
protectedRouter.use('/dashboard', dashboardRoutes);
protectedRouter.use('/platform-automation', platformAutomationRoutes);
protectedRouter.use('/database', databaseRoutes);
protectedRouter.use('/export', exportRoutes);
protectedRouter.use('/security', securityRoutes);
protectedRouter.use('/api-management', apiManagementRoutes);
protectedRouter.use('/storage', storageRoutes);
protectedRouter.use('/permissions', permissionRoutes);
protectedRouter.use('/data-management', dataManagementRoutes);
protectedRouter.use('/financials', financialRoutes);

v1Router.use(protectedRouter);

// Mount the unified router
app.use(['/api/v1', '/api'], v1Router);

// Apply Maintenance & Security Controls globally to all authenticated API routes
// Note: These must be applied AFTER v1Router mounts or we can apply them to the v1Router itself.
// Better: Apply them as global middleware that checks req.path
v1Router.use(maintenanceMiddleware as any);
v1Router.use(sessionIpLockMiddleware as any);
v1Router.use(dynamicCspMiddleware as any);

protectedRouter.use('/system', systemRoutes);


// Signed document URL for secure access to local uploads
app.get('/api/documents/:id/signed-url', authenticateToken, requirePermission('documents', 'read'), async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const tenantId = req.context?.tenantId || req.tenantId;
        if (!tenantId) {
            return res.status(401).json({ error: 'Tenant context required' });
        }

        const db = getDb();
        const doc = await db.get('SELECT id, companyId, url, name FROM documents WHERE id = ? AND companyId = ?', [id, tenantId]);
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const signingSecret = process.env.FILE_SIGNING_SECRET;
        if (!signingSecret || !doc.url || !doc.url.startsWith('/uploads/')) {
            return res.json({ url: doc.url });
        }

        const relativePath = doc.url.replace(/^\/uploads\//, '');
        const expiresAt = Date.now() + 3600 * 1000; // 1 hour default
        const payload = `${tenantId}:${relativePath}:${expiresAt}`;
        const signature = crypto.createHmac('sha256', signingSecret).update(payload).digest('hex');
        const signedUrl = `${doc.url}?expires=${expiresAt}&sig=${signature}`;

        return res.json({ url: signedUrl, expiresAt });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to generate signed URL' });
    }
});

// --- Client Portal Routes ---
// --- Legacy Routes Removed - Use /api/v1/... ---


// --- Generic CRUD Helper --- 
const createCrudRoutes = (tableName: string, jsonFields: string[] = [], permissionResource?: string) => {
    // Whitelist check for table names to prevent arbitrary table access
    const allowedTables = ['projects', 'tasks', 'team', 'documents', 'clients', 'inventory', 'punch_items', 'dayworks', 'equipment', 'timesheets', 'channels', 'team_messages', 'transactions', 'purchase_orders', 'defects', 'project_risks', 'expense_claims', 'audit_logs'];
    if (!allowedTables.includes(tableName) && tableName !== 'companies') {
        logger.error(`Attempted to create CRUD routes for unauthorized table: ${tableName}`);
        return;
    }

    // Helper to get middleware array (Authenticate + Context + Optional Permission)
    const getMiddleware = (action: 'read' | 'create' | 'update' | 'delete') => {
        const middlewares: any[] = [authenticateToken, contextMiddleware];
        if (permissionResource) {
            middlewares.push(requirePermission(permissionResource, action));
        }
        return middlewares;
    };

    v1Router.get(`/${tableName}`, ...getMiddleware('read'), async (req: any, res: any) => {
        try {
            const db = getDb();
            let sql = `SELECT * FROM ${tableName}`;
            const params: any[] = [];

            const tenantTables = ['team', 'clients', 'inventory', 'equipment', 'timesheets', 'channels', 'rfis', 'punch_items', 'daily_logs', 'dayworks', 'safety_incidents', 'tasks', 'documents', 'transactions', 'purchase_orders', 'invoices', 'expense_claims'];

            if (req.tenantId && tenantTables.includes(tableName)) {
                sql += ` WHERE companyId = ?`;
                params.push(req.tenantId);
            } else if (!req.tenantId && tenantTables.includes(tableName) && tableName !== 'companies') {
                logger.warn(`Accessing tenant table ${tableName} without companyId header!`);
                // In strict mode, we might return [] or error, but keeping legacy behavior for now
            }

            const items = await db.all(sql, params);
            const parsed = items.map((item: any) => {
                const newItem = { ...item };
                jsonFields.forEach(field => {
                    if (newItem[field]) {
                        try {
                            newItem[field] = JSON.parse(newItem[field]);
                        } catch (e) {
                            logger.error(`Failed to parse JSON field ${field} in ${tableName}`, { error: e });
                        }
                    }
                });
                return newItem;
            });
            res.json(parsed);
        } catch (e) {
            res.status(500).json({ error: (e as Error).message });
        }
    });

    v1Router.post(`/${tableName}`, ...getMiddleware('create'), async (req: any, res: any) => {
        try {
            const db = getDb();
            const item = req.body;
            const id = item.id || uuidv4();

            const keys = Object.keys(item).filter(k => k !== 'id');
            const values = keys.map(k => {
                if (jsonFields.includes(k)) return JSON.stringify(item[k]);
                return item[k];
            });

            const tenantTables = ['team', 'clients', 'inventory', 'equipment', 'timesheets', 'channels', 'rfis', 'punch_items', 'daily_logs', 'dayworks', 'safety_incidents', 'tasks', 'documents', 'transactions'];

            if (req.tenantId && tenantTables.includes(tableName)) {
                if (!item.companyId) {
                    keys.push('companyId');
                    values.push(req.tenantId);
                }
            }

            const placeholders = values.map(() => '?').join(',');
            const columns = keys.join(',');

            await db.run(
                `INSERT INTO ${tableName} (id, ${columns}) VALUES (?, ${placeholders})`,
                [id, ...values]
            );

            await logAction(req, 'CREATE', tableName, id, item);

            // Broadcast real-time update
            if (req.tenantId) {
                realtimeService.notifyEntityChanged(req.tenantId, tableName, id, 'create', { ...item, id });
            }

            res.json({ ...item, id });
        } catch (e) {
            res.status(500).json({ error: (e as Error).message });
        }
    });

    v1Router.put(`/${tableName}/:id`, ...getMiddleware('update'), async (req: any, res: any) => {
        try {
            const db = getDb();
            const { id } = req.params;
            const updates = req.body;

            const keys = Object.keys(updates).filter(k => k !== 'id');
            const values = keys.map(k => {
                if (jsonFields.includes(k)) return JSON.stringify(updates[k]);
                return updates[k];
            });

            const setClause = keys.map(k => `${k} = ?`).join(',');
            let sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
            const params = [...values, id];

            const tenantTables = ['team', 'clients', 'inventory', 'equipment', 'timesheets', 'channels', 'rfis', 'punch_items', 'daily_logs', 'dayworks', 'safety_incidents', 'tasks', 'documents', 'transactions'];
            if (req.tenantId && tenantTables.includes(tableName)) {
                sql += ` AND companyId = ?`;
                params.push(req.tenantId);
            }

            const result = await db.run(sql, params);
            if (result.changes === 0) {
                return res.status(403).json({ error: 'Unauthorized or resource not found' });
            }

            await logAction(req, 'UPDATE', tableName, id, updates);

            // Broadcast real-time update
            // Broadcast real-time update
            if (req.tenantId) {
                realtimeService.notifyEntityChanged(req.tenantId, tableName, id, 'update', updates);
            }

            res.json({ ...updates, id });
        } catch (e) {
            res.status(500).json({ error: (e as Error).message });
        }
    });

    v1Router.delete(`/${tableName}/:id`, ...getMiddleware('delete'), async (req: any, res: any) => {
        try {
            const db = getDb();
            const { id } = req.params;

            let sql = `DELETE FROM ${tableName} WHERE id = ?`;
            const params = [id];

            const tenantTables = ['team', 'clients', 'inventory', 'equipment', 'timesheets', 'channels', 'rfis', 'punch_items', 'daily_logs', 'dayworks', 'safety_incidents', 'tasks', 'documents', 'transactions'];
            if (req.tenantId && tenantTables.includes(tableName)) {
                sql += ` AND companyId = ?`;
                params.push(req.tenantId);
            }

            const result = await db.run(sql, params);
            if (result.changes === 0) {
                return res.status(403).json({ error: 'Unauthorized or resource not found' });
            }

            await logAction(req, 'DELETE', tableName, id);

            // Broadcast real-time update
            // Broadcast real-time update
            if (req.tenantId) {
                realtimeService.notifyEntityChanged(req.tenantId, tableName, id, 'delete');
            }

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: (e as Error).message });
        }
    });
};

// [Routes moved up]

// --- Generic Resources ---

app.get('/api/roles/:id/permissions', rbacController.getRolePermissions);

// --- Generic Resources ---
// [REMOVED] createCrudRoutes for projects and tasks as they have dedicated controllers

// Register Routes for other entities (Secured with granular RBAC)
createCrudRoutes('team', ['skills', 'certifications'], 'team');
createCrudRoutes('documents', ['linkedTaskIds'], 'documents');
createCrudRoutes('clients', [], 'clients');
createCrudRoutes('inventory', [], 'inventory');
createCrudRoutes('punch_items', [], 'punch_items');
createCrudRoutes('dayworks', ['labor', 'materials', 'attachments'], 'dayworks');
createCrudRoutes('equipment', [], 'equipment');
createCrudRoutes('timesheets', [], 'timesheets');
createCrudRoutes('channels', [], 'channels');
createCrudRoutes('team_messages', [], 'team_messages');
createCrudRoutes('transactions', [], 'financials');
createCrudRoutes('purchase_orders', ['items', 'approvers'], 'procurement');
createCrudRoutes('defects', ['box_2d'], 'quality');
createCrudRoutes('project_risks', ['factors', 'recommendations'], 'risk');
createCrudRoutes('audit_logs', [], 'audit');
createCrudRoutes('expense_claims', ['receipts', 'items'], 'financials');

// Initialize and Start

logger.info('Creating HTTP Server...');
const httpServer = createServer(app);

// Setup WebSockets
try {
    logger.info('Setting up WebSockets...');
    setupWebSocketServer(httpServer);
    logger.info('WebSockets Setup Complete.');
} catch (e) {
    logger.error('WebSocket Setup Failed:', e);
}

// Setup GraphQL
const startApolloServer = async () => {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({ req }: any) => {
            // Use the context already populated by our middlewares
            return req.context || {};
        },
        introspection: process.env.NODE_ENV !== 'production',
        persistedQueries: false, // Security: Disable unbounded persisted queries
    });
    await server.start();
    server.applyMiddleware({ app: app as any, path: '/api/graphql' });
    logger.info(`GraphQL server ready at /api/graphql`);
};
startApolloServer();

// Start server immediately to satisfy Cloud Run health checks
const startServer = async () => {
    logger.info(`startServer() called. Port: ${port}`);

    // 1. Start Listening IMMEDIATELY to satisfy Cloud Run health checks
    if (process.env.NODE_ENV !== 'test') {
        try {
            // Listen strictly on 127.0.0.1 for Hostinger Proxy
            httpServer.listen(Number(port), '127.0.0.1', () => {
                logger.info(`Backend server running at http://127.0.0.1:${port}`);
                logger.info(`WebSocket server ready at ws://127.0.0.1:${port}/live`);
            });
            logger.info('httpServer.listen called.');
        } catch (e) {
            logger.error('CRITICAL: httpServer.listen failed:', e);
            if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'testing') {
                process.exit(1);
            }
        }
    }

    // 2. Initialize DB in background
    try {
        logger.info('Starting DB initialization in background...');
        await ensureDbInitialized();
        const db = getDb();
        await db.get('SELECT 1');
        logger.info('DB Initialized. Seeding...');
        await seedDatabase();
        logger.info('DB Ready.');
    } catch (err) {
        logger.error('CRITICAL: DB Initialization failed:', err);
    }

    logger.info(`Reached end of startServer. Env VERCEL: ${process.env.VERCEL}`);
};

// --- Graceful Shutdown ---
const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Close HTTP Server first (stops accepting new requests)
    httpServer.close(async () => {
        logger.info('HTTP server closed.');

        try {
            // Close Database connections
            const db = getDb();
            await db.close();
            logger.info('Database connection closed.');

            logger.info('Graceful shutdown complete. Exiting.');
            process.exit(0);
        } catch (err) {
            logger.error('Error during shutdown:', err);
            process.exit(1);
        }
    });

    // Force shutdown after 10s
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));



logger.info(`Reached end of index.ts. Env VERCEL: ${process.env.VERCEL}`);

// Startup environment validation: fail fast if core Supabase server envs are missing
(() => {
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
        logger.warn(`WARNING: Missing environment variables: ${missing.join(', ')}. Server features requiring Supabase admin access may fail.`);
    }
})();

// Handle Uncaught Exceptions & Rejections
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'testing') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'testing') {
        process.exit(1);
    }
});

const serverPromise = startServer();

// For testing purposes, we might want to wait for this promise
export { serverPromise };

// API 404 Handler - Catch all unknown API routes and return JSON
app.all('/api/*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Handle SPA routing for frontend in production - must be AFTER API routes
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        // When running in public_html/api/dist/index.js:
        // __dirname = .../public_html/api/dist
        // ../../   = .../public_html (Where frontend index.html lives)
        const frontendRoot = resolve(__dirname, '../../');
        res.sendFile(resolve(frontendRoot, 'index.html'));
    });
}

// Global Error Handler (must be last)
app.use(errorHandler);

export default app;
