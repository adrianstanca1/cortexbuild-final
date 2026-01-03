import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from './utils/logger.js';
import jwt from 'jsonwebtoken';
import { getDb } from './database.js';
import { realtimeService } from './services/realtimeService.js';

interface WebSocketClient extends WebSocket {
    isAlive: boolean;
    userId?: string;
    companyId?: string; // Tenant Context
    projectId?: string;
    role?: string;
}

export const setupWebSocketServer = (server: any) => {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket: any, head: any) => {
        const url = new URL(request.url || '', `http://${request.headers.host}`);
        const pathname = url.pathname;

        if (pathname === '/live' || pathname === '/api/live') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else {
            // Let other upgrade handlers (if any) have a chance, or destroy
            // socket.destroy(); // Don't destroy immediately if other services use WS
        }
    });

    // Store global reference for external broadcasting
    const clients = new Map<WebSocket, { userId?: string; projectId?: string; companyId?: string; isAlive: boolean }>();
    (global as any).wsClients = clients;
    (global as any).wss = wss;

    // Initialize the logic-only service
    realtimeService.init(wss, clients);

    // Heartbeat to prune dead connections
    const interval = setInterval(() => {
        wss.clients.forEach((ws: any) => {
            const client = clients.get(ws);
            if (!client) return;

            if (client.isAlive === false) {
                logger.info(`Terminating dead socket for user: ${client.userId || 'unknown'}`);
                ws.terminate();
                clients.delete(ws);
                if (client.companyId) broadcastCompanyPresence(client.companyId);
                return;
            }

            client.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        logger.info('WebSocket server closing, clearing interval');
        clearInterval(interval);
    });

    wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
        logger.info('Client connected to Live View Socket');

        // 1. Authenticate & Resolve Tenant
        let userId: string | undefined;
        let companyId: string | undefined;
        let role: string | undefined;

        try {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const token = url.searchParams.get('token');

            if (token) {
                const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
                if (!secret) {
                    logger.error('[Socket] No JWT secret configured, cannot verify connection');
                    throw new Error('Server configuration error');
                }

                const decoded: any = jwt.verify(token, secret);
                // Align with Supabase JWT structure: 'sub' is the userId
                userId = decoded.sub || decoded.userId;
                companyId = decoded.companyId || decoded.user_metadata?.companyId;
                role = decoded.role || decoded.user_metadata?.role;

                logger.info(`[Socket] Verified connection for user: ${userId}, role: ${role}`);
            }
        } catch (err: any) {
            logger.warn(`[Socket] Authentication failed for client: ${err.message}`);
        }

        const clientState = { isAlive: true, userId, companyId, role };
        clients.set(ws, clientState);

        // Initial presence broadcast if company is known
        if (companyId) broadcastCompanyPresence(companyId);

        ws.on('pong', () => {
            const client = clients.get(ws);
            if (client) client.isAlive = true;
        });

        ws.on('message', (message: string) => handleSocketMessage(ws, message));

        ws.on('close', () => {
            const client = clients.get(ws);
            if (client) {
                if (client.userId) logger.info(`User ${client.userId} disconnected`);
                clients.delete(ws);
                if (client.companyId) {
                    broadcastCompanyPresence(client.companyId);
                }
            }
        });

        ws.on('error', (err) => {
            logger.error('Socket error:', err);
        });
    });

    return wss;
};

// Centralized message handler
const handleSocketMessage = async (ws: WebSocket, message: string) => {
    try {
        const data = JSON.parse(message.toString());
        const clients = (global as any).wsClients as Map<WebSocket, any>;
        const wss = (global as any).wss as WebSocketServer;
        const client = clients.get(ws);

        if (!client) return;

        switch (data.type) {
            case 'join_project': {
                // Return early if already in this project
                if (client.projectId === data.projectId) break;

                // Handle switching projects (leave previous)
                if (client.projectId) {
                    realtimeService.broadcastToProject(client.projectId, {
                        type: 'presence_update',
                        userId: client.userId,
                        status: 'offline'
                    });
                    logger.info(`User ${client.userId} left project ${client.projectId} (switching)`);
                }

                if (client.companyId && data.projectId) {
                    try {
                        const db = getDb();
                        const project = await db.get('SELECT companyId FROM projects WHERE id = ?', [data.projectId]);
                        if (!project || project.companyId !== client.companyId) {
                            logger.warn(`Security Warning: User ${client.userId} attempted to join unauthorized project ${data.projectId}`);
                            return;
                        }
                    } catch (dberr) {
                        logger.error('Socket DB check failed', dberr);
                        return;
                    }
                }

                client.projectId = data.projectId;
                if (!client.userId && data.userId) client.userId = data.userId;

                logger.info(`User ${client.userId} joined project ${data.projectId}`);

                realtimeService.broadcastToProject(data.projectId, {
                    type: 'presence_update',
                    userId: client.userId,
                    status: 'online'
                });
                break;
            }

            case 'leave_project': {
                if (client.projectId) {
                    realtimeService.broadcastToProject(client.projectId, {
                        type: 'presence_update',
                        userId: client.userId,
                        status: 'offline'
                    });
                    logger.info(`User ${client.userId} explicitly left project ${client.projectId}`);
                    client.projectId = undefined;
                }
                break;
            }

            case 'chat_typing':
                if (client.projectId && client.userId) {
                    realtimeService.broadcastToProject(client.projectId, {
                        ...data,
                        userId: client.userId
                    }, client.userId);
                }
                break;

            case 'presence_ping':
                client.isAlive = true;
                break;

            default:
                // Handle generic type based broadcasts if needed
                if (data.broadcastLevel === 'company' && client.companyId) {
                    broadcastToCompany(client.companyId, data, client.userId);
                }
                break;
        }
    } catch (e) {
        logger.error('Socket message parse error', e);
    }
};

// Helper: Get list of online users for a company
const getOnlineUsers = (companyId: string) => {
    const clients = (global as any).wsClients as Map<WebSocket, any>;
    const onlineUsers = new Set<string>();

    if (!clients) return [];

    clients.forEach((client) => {
        if (client.companyId === companyId && client.userId) {
            onlineUsers.add(client.userId);
        }
    });

    return Array.from(onlineUsers);
};

// Helper: Broadcast company presence
export const broadcastCompanyPresence = (companyId: string) => {
    const onlineUsers = getOnlineUsers(companyId);
    realtimeService.broadcastToCompany(companyId, {
        type: 'company_presence',
        users: onlineUsers,
        count: onlineUsers.length
    });
};

// --- Legacy generic exports (proxies to RealtimeService for compatibility) ---
export const broadcastToCompany = (companyId: string, message: any, excludeUserId?: string) =>
    realtimeService.broadcastToCompany(companyId, message, excludeUserId);

export const broadcastToUser = (userId: string, message: any) =>
    realtimeService.sendToUser(userId, message);

export const broadcastToAll = (message: any) => {
    const wss = (global as any).wss as WebSocketServer;
    if (!wss) return;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
};
