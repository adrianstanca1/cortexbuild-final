import webpush from 'web-push';

// VAPID keys should be stored in environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BIlt3bJbrihkU-C59ai6O7HTkHv2DDxBQYqCmTf21HXtvnz4AtQoFDNY1Yp-NjkKiZx1EsJmAzvKjXDDsvbJec0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'WeOUiG99HErtbuK-nDQhlRw4dVwdmfa4usBoFWCWSCE';

// Configure web-push
webpush.setVapidDetails(
    'mailto:admin@buildpro.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// Mock storage for subscriptions
// In production, this would be a database table: user_id -> subscription_json
import { getDb } from '../database.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const pushService = {
    getPublicKey: () => VAPID_PUBLIC_KEY,

    addSubscription: async (userId: string, subscription: webpush.PushSubscription) => {
        const db = getDb();
        const existing = await db.get('SELECT id FROM push_subscriptions WHERE endpoint = ?', [subscription.endpoint]);

        if (!existing) {
            await db.run(
                'INSERT INTO push_subscriptions (id, userId, endpoint, keys, createdAt) VALUES (?, ?, ?, ?, ?)',
                [
                    uuidv4(),
                    userId,
                    subscription.endpoint,
                    JSON.stringify(subscription.keys),
                    new Date().toISOString()
                ]
            );
        }
    },

    sendNotification: async (userId: string, payload: any) => {
        const db = getDb();
        const userSubs = await db.all('SELECT * FROM push_subscriptions WHERE userId = ?', [userId]);

        if (!userSubs || userSubs.length === 0) return;

        const notifications = userSubs.map(async (row) => {
            const subscription = {
                endpoint: row.endpoint,
                keys: JSON.parse(row.keys)
            };

            try {
                await webpush.sendNotification(subscription, JSON.stringify(payload));
            } catch (error: any) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription is invalid/expired, remove it
                    await db.run('DELETE FROM push_subscriptions WHERE id = ?', [row.id]);
                }
                logger.error('Push notification failed', error);
            }
        });

        await Promise.all(notifications);
    },

    // Helper to send to all (for testing)
    broadcastNotification: async (payload: any) => {
        const db = getDb();
        const allSubs = await db.all('SELECT userId FROM push_subscriptions GROUP BY userId');
        await Promise.all(allSubs.map(u => pushService.sendNotification(u.userId, payload)));
    }
};
