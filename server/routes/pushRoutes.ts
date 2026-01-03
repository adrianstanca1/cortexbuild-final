import { Router } from 'express';
import { pushService } from '../services/PushService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

// Get Public Key
router.get('/config', (req, res) => {
    res.json({ publicKey: pushService.getPublicKey() });
});

// Subscribe
router.post('/subscribe', authenticateToken, (req: any, res) => {
    try {
        const subscription = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }
        pushService.addSubscription(req.user.id, subscription);
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Test Send (allows self-testing)
router.post('/send', authenticateToken, async (req: any, res) => {
    const { userId, payload } = req.body;
    // self-send for testing if no userId provided
    const targetId = userId || req.user.id;

    try {
        await pushService.sendNotification(targetId, payload);
        res.json({ success: true });
    } catch (error) {
        console.error('Send error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// In-App Notifications
router.get('/', authenticateToken, notificationController.getUserNotifications);
router.put('/:id/read', authenticateToken, notificationController.markNotificationAsRead);
router.post('/mark-all-read', authenticateToken, notificationController.markAllNotificationsAsRead);

export default router;
