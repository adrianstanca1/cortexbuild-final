import { getDb, IDatabase } from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../utils/AppError.js';
import { emailService } from './emailService.js';
import { taskService } from './taskService.js';
import { logger } from '../utils/logger.js';
import { broadcastToCompany } from '../socket.js';

export interface Automation {
    id: string;
    companyId: string;
    name: string;
    triggerType: string;
    actionType: string;
    configuration: string; // JSON
    enabled: boolean;
}

export class WorkflowService {
    /**
     * Trigger an automation flow
     */
    static async trigger(companyId: string, triggerType: string, context: any, tenantDb?: IDatabase) {
        const db = tenantDb || getDb();
        const automations = await db.all(
            'SELECT * FROM automations WHERE companyId = ? AND triggerType = ? AND enabled = 1',
            [companyId, triggerType]
        );

        logger.info(`[Workflow] Triggered ${triggerType} for company ${companyId}. Found ${automations.length} automations.`);

        for (const automation of automations) {
            try {
                await this.executeAction(automation, context, db);
            } catch (error) {
                logger.error(`[Workflow] Failed to execute action for automation ${automation.id}:`, error);
            }
        }
    }

    /**
     * Execute specific action
     */
    private static async executeAction(automation: any, context: any, dbInstance?: IDatabase) {
        const config = JSON.parse(automation.configuration || '{}');
        const db = dbInstance || getDb();

        switch (automation.actionType) {
            case 'send_notification': {
                // Fetch all users in the company to send notification to
                const users = await db.all('SELECT id FROM users WHERE companyId = ?', [automation.companyId]);

                for (const user of users) {
                    const notificationId = uuidv4();
                    const notification = {
                        id: notificationId,
                        userId: user.id,
                        title: config.title || `Automation: ${automation.name}`,
                        message: config.message || `Triggered by ${automation.triggerType}`,
                        type: config.type || 'info',
                        isRead: 0,
                        createdAt: new Date().toISOString(),
                        companyId: automation.companyId
                    };

                    await db.run(
                        'INSERT INTO notifications (id, userId, title, message, type, isRead, createdAt, companyId) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
                        [notification.id, notification.userId, notification.title, notification.message, notification.type, notification.createdAt, notification.companyId]
                    );

                    // Broadcast Notification to specific user
                    broadcastToCompany(automation.companyId, {
                        type: 'notification',
                        userId: user.id,
                        data: notification
                    });
                }
                logger.info(`[Workflow] Action Executed: Notifications sent to ${users.length} users for ${automation.id}`);
                break;
            }

            case 'update_task_priority':
                if (context.taskId && config.priority) {
                    await db.run(
                        'UPDATE tasks SET priority = ?, updatedAt = ? WHERE id = ? AND companyId = ?',
                        [config.priority, new Date().toISOString(), context.taskId, automation.companyId]
                    );

                    // Broadcast Task Update
                    const updatedTask = await taskService.getTask(db, 'SYSTEM', automation.companyId, context.taskId);
                    broadcastToCompany(automation.companyId, {
                        type: 'entity_update',
                        entityType: 'tasks',
                        id: context.taskId,
                        data: updatedTask,
                        changes: { priority: config.priority }
                    });

                    logger.info(`[Workflow] Action Executed: Task ${context.taskId} priority updated to ${config.priority}`);
                }
                break;

            case 'send_email': {
                if (config.to && config.subject) {
                    await emailService.sendEmail({
                        to: config.to,
                        subject: config.subject,
                        text: config.message || `Automation Triggered: ${automation.name}`,
                        html: config.html
                    });
                    logger.info(`[Workflow] Action Executed: Email sent for ${automation.id}`);
                }
                break;
            }

            case 'create_task': {
                if (config.title && context.projectId) {
                    const newTask = await taskService.createTask(db, 'SYSTEM', automation.companyId, {
                        projectId: context.projectId,
                        title: config.title,
                        description: config.description || `Automated task from ${automation.name}`,
                        status: config.status || 'Todo',
                        priority: config.priority || 'Medium',
                        dueDate: config.dueDate || new Date(Date.now() + 86400000 * 3).toISOString() // Default 3 days
                    });

                    // Broadcast Task Creation
                    broadcastToCompany(automation.companyId, {
                        type: 'entity_create',
                        entityType: 'tasks',
                        data: newTask,
                        timestamp: new Date().toISOString()
                    });

                    logger.info(`[Workflow] Action Executed: Task created for ${automation.id}`);
                }
                break;
            }

            default:
                logger.warn(`[Workflow] Unknown action type: ${automation.actionType}`);
        }

        // Broadcast Automation Execution Event (for UI "last run" updates)
        broadcastToCompany(automation.companyId, {
            type: 'automation_executed',
            automationId: automation.id,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * CRUD: Get all automations for a tenant
     */
    static async getAutomations(companyId: string) {
        const db = getDb();
        return await db.all('SELECT * FROM automations WHERE companyId = ?', [companyId]);
    }

    /**
     * CRUD: Create automation
     */
    static async createAutomation(companyId: string, data: any) {
        const db = getDb();
        const id = uuidv4();
        const now = new Date().toISOString();

        await db.run(
            'INSERT INTO automations (id, companyId, name, triggerType, actionType, configuration, enabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                id,
                companyId,
                data.name,
                data.triggerType,
                data.actionType,
                JSON.stringify(data.configuration || {}),
                data.enabled ?? 1,
                now,
                now
            ]
        );

        return { id, ...data };
    }

    /**
     * CRUD: Update automation
     */
    static async updateAutomation(companyId: string, id: string, data: any) {
        const db = getDb();
        const existing = await db.get('SELECT id FROM automations WHERE id = ? AND companyId = ?', [id, companyId]);
        if (!existing) throw new AppError('Automation not found', 404);

        const updates: string[] = [];
        const params: any[] = [];

        if (data.name) { updates.push('name = ?'); params.push(data.name); }
        if (data.triggerType) { updates.push('triggerType = ?'); params.push(data.triggerType); }
        if (data.actionType) { updates.push('actionType = ?'); params.push(data.actionType); }
        if (data.configuration) { updates.push('configuration = ?'); params.push(JSON.stringify(data.configuration)); }
        if (data.enabled !== undefined) { updates.push('enabled = ?'); params.push(data.enabled ? 1 : 0); }

        updates.push('updatedAt = ?');
        params.push(new Date().toISOString());

        params.push(id);
        params.push(companyId);

        await db.run(
            `UPDATE automations SET ${updates.join(', ')} WHERE id = ? AND companyId = ?`,
            params
        );

        return { id, success: true };
    }

    /**
     * CRUD: Delete automation
     */
    static async deleteAutomation(companyId: string, id: string) {
        const db = getDb();
        await db.run('DELETE FROM automations WHERE id = ? AND companyId = ?', [id, companyId]);
        return { success: true };
    }
}
