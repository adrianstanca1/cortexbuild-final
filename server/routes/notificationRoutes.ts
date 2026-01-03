import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { UserRole } from '../types.js';

const router = Router();

// --- User Notification Routes (Accessible by all authenticated users) ---
router.get('/', notificationController.getUserNotifications);
router.get('/poll', notificationController.getUserNotifications); // Polling endpoint alias
router.put('/:id/read', notificationController.markNotificationAsRead);
router.post('/mark-all-read', notificationController.markAllNotificationsAsRead);

// --- System Event Routes (SuperAdmin Only) ---
// Note: These paths must not conflict with user routes
router.get('/events', requireRole([UserRole.SUPERADMIN]), notificationController.getSystemEvents);
router.put('/events/:id/read', requireRole([UserRole.SUPERADMIN]), notificationController.markAsRead);
router.post('/events/mark-all-read', requireRole([UserRole.SUPERADMIN]), notificationController.markAllRead);
router.delete('/events/clear', requireRole([UserRole.SUPERADMIN]), notificationController.clearEvents);

export default router;
