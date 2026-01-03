
import { getDb } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { broadcastToAll, broadcastToUser, broadcastToCompany } from '../socket.js';
import { logger } from '../utils/logger.js';

export type SystemEventType =
    | 'PROVISIONING_SUCCESS'
    | 'PROVISIONING_FAILURE'
    | 'SECURITY_ALERT'
    | 'SYSTEM_UPDATE'
    | 'MAINTENANCE_MODE'
    | 'COMPANY_UPDATE';

export type SystemEventLevel = 'info' | 'warning' | 'critical';

export interface SystemEvent {
    id: string;
    type: SystemEventType;
    level: SystemEventLevel;
    message: string;
    source: string;
    metadata?: any;
    is_read: boolean;
    created_at: string;
}

/**
 * Emits a system event: persists to DB and broadcasts to all connected clients
 * Used for platform-level alerts for SuperAdmins
 */
export const emitSystemEvent = async (params: {
    type: SystemEventType;
    level: SystemEventLevel;
    message: string;
    source: string;
    metadata?: any;
}) => {
    try {
        const db = getDb();
        const event: SystemEvent = {
            id: uuidv4(),
            ...params,
            is_read: false,
            created_at: new Date().toISOString()
        };

        // Persist to DB
        await db.run(
            `INSERT INTO system_events (id, type, level, message, source, metadata, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                event.id,
                event.type,
                event.level,
                event.message,
                event.source,
                event.metadata ? JSON.stringify(event.metadata) : null,
                event.is_read ? 0 : 0, // is_read is false (0) by default
                event.created_at
            ]
        );

        // Broadcast to all connected clients
        broadcastToAll({
            type: 'SYSTEM_EVENT',
            payload: event
        });

        logger.info(`System event emitted: [${event.level.toUpperCase()}] ${event.type} - ${event.message}`);
        return event;
    } catch (error) {
        logger.error('Failed to emit system event:', error);
    }
};

/**
 * Sends a notification to a specific user (tenant-level)
 * Reconstructed to fix overwrite error.
 */
export const sendNotification = async (
    companyId: string,
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    link?: string
) => {
    try {
        const db = getDb();
        const id = uuidv4();
        const createdAt = new Date().toISOString();

        await db.run(
            `INSERT INTO notifications (id, companyId, userId, type, title, message, link, isRead, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, companyId, userId, type, title, message, link || null, 0, createdAt]
        );

        // Broadcast to specific user via WebSocket
        broadcastToUser(userId, {
            type: 'notification',
            id,
            notificationType: type,
            title,
            message,
            link,
            createdAt
        });

        logger.info(`Notification sent to user ${userId}: ${title}`);
    } catch (error) {
        logger.error('Failed to send notification:', error);
    }
};

/**
 * Sends a notification to all users in a specific company
 */
export const sendCompanyNotification = async (
    companyId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    link?: string
) => {
    try {
        const db = getDb();
        const createdAt = new Date().toISOString();

        // Get all users in the company to persist notifications for each? 
        // Or just broadcast?
        // To be real persistence-backed, we should find all users.
        const users = await db.all('SELECT userId FROM memberships WHERE companyId = ?', [companyId]);

        for (const u of users) {
            const id = uuidv4();
            await db.run(
                `INSERT INTO notifications (id, companyId, userId, type, title, message, link, isRead, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, companyId, u.userId, type, title, message, link || null, 0, createdAt]
            );
        }

        // Broadcast to company room
        broadcastToCompany(companyId, {
            type: 'notification',
            notificationType: type,
            title,
            message,
            link,
            createdAt
        });

        logger.info(`Company notification sent to ${companyId}: ${title}`);
    } catch (error) {
        logger.error('Failed to send company notification:', error);
    }
};
