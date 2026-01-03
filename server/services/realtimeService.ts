import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';

export interface RealtimeMessage {
    type: string;
    payload?: any;
    entityType?: string;
    entityId?: string;
    companyId?: string;
    userId?: string;
    projectId?: string;
    timestamp: string;
    [key: string]: any;
}

import { UserRole } from '../types.js';

export class RealtimeService {
    private static instance: RealtimeService;
    private wss: WebSocketServer | null = null;
    private clients: Map<WebSocket, any> = new Map();

    private constructor() { }

    public static getInstance(): RealtimeService {
        if (!RealtimeService.instance) {
            RealtimeService.instance = new RealtimeService();
        }
        return RealtimeService.instance;
    }

    public init(wss: WebSocketServer, clients: Map<WebSocket, any>) {
        this.wss = wss;
        this.clients = clients;
        logger.info('RealtimeService initialized with core WebSocket refs');
    }

    /**
     * Broadcast to specific company (tenant)
     */
    public broadcastToCompany(companyId: string, message: Partial<RealtimeMessage>, excludeUserId?: string) {
        if (!this.wss) return;

        const fullMessage: RealtimeMessage = {
            timestamp: new Date().toISOString(),
            type: 'generic_update',
            ...message
        };

        const msgString = JSON.stringify(fullMessage);

        this.wss.clients.forEach((client) => {
            const clientData = this.clients.get(client as WebSocket);
            if (client.readyState === WebSocket.OPEN && clientData?.companyId === companyId) {
                if (excludeUserId && clientData.userId === excludeUserId) return;
                client.send(msgString);
            }
        });
    }

    /**
     * Broadcast to specific project room
     */
    public broadcastToProject(projectId: string, message: Partial<RealtimeMessage>, excludeUserId?: string) {
        if (!this.wss) return;

        const fullMessage: RealtimeMessage = {
            timestamp: new Date().toISOString(),
            type: 'project_update',
            projectId,
            ...message
        };

        const msgString = JSON.stringify(fullMessage);

        this.wss.clients.forEach((client) => {
            const clientData = this.clients.get(client as WebSocket);
            if (client.readyState === WebSocket.OPEN && clientData?.projectId === projectId) {
                if (excludeUserId && clientData.userId === excludeUserId) return;
                client.send(msgString);
            }
        });
    }

    /**
     * Broadcast to specific user
     */
    public sendToUser(userId: string, message: Partial<RealtimeMessage>) {
        if (!this.wss) return;

        const fullMessage: RealtimeMessage = {
            timestamp: new Date().toISOString(),
            type: 'notification',
            ...message
        };

        const msgString = JSON.stringify(fullMessage);

        this.wss.clients.forEach((client) => {
            const clientData = this.clients.get(client as WebSocket);
            if (client.readyState === WebSocket.OPEN && clientData?.userId === userId) {
                client.send(msgString);
            }
        });
    }

    /**
     * Entity level broadcasts (Syntactic sugar)
     */
    public notifyEntityChanged(companyId: string, entityType: string, entityId: string, action: 'create' | 'update' | 'delete', data?: any) {
        this.broadcastToCompany(companyId, {
            type: `entity_${action}`,
            entityType,
            entityId,
            payload: data,
            action
        });
    }

    public broadcastToSuperAdmins(message: Partial<RealtimeMessage>) {
        if (!this.wss) return;

        const fullMessage: RealtimeMessage = {
            timestamp: new Date().toISOString(),
            type: 'superadmin_update',
            ...message
        };

        const msgString = JSON.stringify(fullMessage);

        this.wss.clients.forEach((client) => {
            const clientData = this.clients.get(client as WebSocket);
            if (client.readyState === WebSocket.OPEN && clientData?.role === UserRole.SUPERADMIN) {
                client.send(msgString);
            }
        });
    }

    public notifySystemAlert(severity: 'info' | 'warning' | 'critical' | 'success', message: string, details?: any) {
        this.broadcastToSuperAdmins({
            type: 'system_alert',
            severity,
            message,
            details
        });
    }
}

export const realtimeService = RealtimeService.getInstance();
