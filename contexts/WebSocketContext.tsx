
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { supabase } from '../services/supabaseClient';

interface WebSocketContextType {
    isConnected: boolean;
    joinRoom: (projectId: string) => void;
    leaveRoom: () => void;
    sendMessage: (type: string, payload: any) => void;
    lastMessage: any;
    onlineUsers: string[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, refreshPermissions } = useAuth();
    const { addToast } = useToast();
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const currentRoomRef = useRef<string | null>(null);
    const reconnectAttemptRef = useRef<number>(0);
    const maxReconnectAttempts = 10;
    const pollingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const [usePolling, setUsePolling] = useState(false);

    // Polling fallback when WebSocket is not available
    const startPolling = () => {
        console.log('🔄 WebSocket unavailable - switching to HTTP polling');
        setUsePolling(true);

        const poll = async () => {
            if (!user?.id) return;

            try {
                // Parse the session to get the raw access token string
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token || '';

                // Poll for notifications and updates
                const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/notifications/poll`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.updates && data.updates.length > 0) {
                        // Process updates similar to WebSocket messages
                        data.updates.forEach((update: any) => {
                            setLastMessage(update);
                            handleUpdate(update);
                        });
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        // Poll every 10 seconds
        pollingIntervalRef.current = setInterval(poll, 10000);
        poll(); // Initial poll
    };

    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = undefined;
        }
        setUsePolling(false);
    };

    const handleUpdate = (data: any) => {
        switch (data.type) {
            case 'company_presence':
                setOnlineUsers(data.users || []);
                break;
            case 'project_updated':
                addToast(`Project updated by another user`, 'info');
                break;
            case 'task_updated':
                addToast(`Task "${data.changes?.title || 'task'}" was updated`, 'info');
                break;
            case 'task_notification':
                addToast(`You have a new task update`, 'info');
                break;
            case 'safety_alert': {
                const severity = data.severity || 'Medium';
                const toastType = severity === 'Critical' || severity === 'High' ? 'error' : 'warning';
                addToast(`Safety Alert: ${data.title || 'New incident reported'}`, toastType);
                break;
            }
            case 'rbac_updated':
                refreshPermissions();
                addToast('Permissions updated.', 'info');
                break;
        }
    };

    const connect = async () => {
        // Prepare token for auth
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || '';

        const wsUrlStr = import.meta.env.VITE_WS_URL || 'wss://api.cortexbuildpro.com/live';
        let wsUrl: string;

        try {
            const url = new URL(wsUrlStr);
            if (authToken) {
                url.searchParams.append('token', authToken);
            }
            wsUrl = url.toString();
        } catch (e) {
            console.error('Invalid WS URL:', wsUrlStr);
            return;
        }

        console.log('Connecting to WS:', wsUrl.split('?')[0]);

        try {
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log('WS Connection Established');
                setIsConnected(true);
                reconnectAttemptRef.current = 0; // Reset on successful connection
                if (currentRoomRef.current && user) {
                    joinRoom(currentRoomRef.current);
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                    handleUpdate(data);
                } catch (e) {
                    console.error('WS Parse Error', e);
                }
            };

            socket.onclose = () => {
                console.log('WS Disconnected');
                setIsConnected(false);
                setOnlineUsers([]);
                clearTimeout(reconnectTimeoutRef.current);

                // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
                if (reconnectAttemptRef.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
                    reconnectAttemptRef.current++;
                    console.log(`WS Reconnecting in ${delay / 1000}s (attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts})`);
                    reconnectTimeoutRef.current = setTimeout(connect, delay);
                } else {
                    console.warn('WS Max reconnection attempts reached. Switching to polling fallback.');
                    startPolling();
                }
            };

            socket.onerror = (err) => {
                console.error('WS Error', err);
                socket.close();
            };

            socketRef.current = socket;

        } catch (e) {
            console.error('WS Connection Failed', e);
        }
    };

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            clearTimeout(reconnectTimeoutRef.current);
            stopPolling();
        };
    }, [user?.id]); // Reconnect if user changes

    const joinRoom = (projectId: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN && user) {
            currentRoomRef.current = projectId;
            socketRef.current.send(JSON.stringify({
                type: 'join_project',
                projectId,
                userId: user.id
            }));
        }
    };

    const leaveRoom = () => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'leave_project' }));
            currentRoomRef.current = null;
        }
    };

    const sendMessage = (type: string, payload: any) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type,
                payload,
                projectId: currentRoomRef.current,
                userId: user?.id
            }));
        }
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, joinRoom, leaveRoom, sendMessage, lastMessage, onlineUsers }}>
            {children}
        </WebSocketContext.Provider>
    );
};
