import { Router } from 'express';
import * as platformController from '../controllers/platformController.js';
import * as platformStatsController from '../controllers/platformStatsController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole, Message } from '../types.js';
import { resetUserPassword } from '../controllers/userManagementController.js';

const router = Router();

// All platform routes require SUPERADMIN role
router.use(requireRole([UserRole.SUPERADMIN]));

// Dashboard stats and metrics
router.get('/stats', platformStatsController.getPlatformStats);
router.get('/health/metrics', platformStatsController.getSystemHealthMetrics);
router.get('/performance/history', platformStatsController.getPerformanceHistory);
router.get('/alerts', platformStatsController.getPlatformAlerts);
router.get('/security/stats', platformStatsController.getSecurityStats);
router.get('/activity', platformStatsController.getGlobalActivityFeed);
router.get('/companies/:id/activity', platformStatsController.getCompanyActivity);

// Legacy routes (keep for backward compatibility)
router.get('/dashboard/stats', platformController.getDashboardStats);
router.get('/analytics', platformController.getPlatformAnalytics);
router.get('/health', platformController.getSystemHealth);
// Legacy alias
router.get('/audit-logs', platformController.getAuditLogs);
router.get('/metrics', platformController.getAdvancedMetrics);

router.get('/users', platformController.getAllUsers);
router.post('/users', platformController.provisionUser);
router.put('/users/:id/status', platformController.updateUserStatus);
router.put('/users/:id/role', platformController.updateUserRole);
router.delete('/users/:id', platformController.deleteUser);

router.post('/broadcast', platformController.broadcastMessage);
router.post('/maintenance', platformController.toggleMaintenance);
router.post('/maintenance/schedule', platformController.scheduleMaintenance);
router.post('/sql', platformController.executeSql);
router.post('/restart', platformController.restartServices);
router.post('/cache/flush', platformController.flushCache);

router.get('/performance/history', platformController.getPerformanceHistory);
router.get('/alerts', platformController.getPlatformAlerts);
router.get('/security/stats', platformController.getSecurityStats);

router.get('/config', platformController.getSystemConfig);
router.post('/config', platformController.updateSystemConfig);
router.post('/broadcast/targeted', platformController.sendTargetedBroadcast);

// Company bulk operations & usage tracking
router.post('/companies/bulk-suspend', platformController.bulkSuspendCompanies);
router.post('/companies/bulk-activate', platformController.bulkActivateCompanies);
router.get('/companies/:id/usage', platformController.getCompanyUsage);
router.post('/users/:id/reset-password', resetUserPassword);

// Database Management
router.get('/database/health', platformController.getDatabaseHealth);
router.get('/database/backups', platformController.listDatabaseBackups);
router.post('/database/backup', platformController.createDatabaseBackup);
router.post('/database/cleanup', platformController.cleanupDatabase);
router.get('/database/metrics/live', platformController.getLiveMetrics);

export default router;
