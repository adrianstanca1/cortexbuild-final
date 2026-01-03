import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { offlineStorage } from '@/services/OfflineStorage';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface SyncContextType {
    isOnline: boolean;
    pendingCount: number;
    queueAction: (url: string, method: string, body: any, type: 'daily-log' | 'rfi') => Promise<void>;
    syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const { addToast } = useToast();
    const { token } = useAuth();

    const updatePendingCount = useCallback(async () => {
        try {
            const requests = await offlineStorage.getRequests();
            setPendingCount(requests.length);
        } catch (e) {
            console.error("Failed to read offline storage", e);
        }
    }, []);

    useEffect(() => {
        updatePendingCount();
    }, [updatePendingCount]);

    const syncNow = useCallback(async () => {
        if (!navigator.onLine || isSyncing || !token) {
            return;
        }

        const requests = await offlineStorage.getRequests();
        if (requests.length === 0) return;

        setIsSyncing(true);
        let successCount = 0;

        for (const req of requests) {
            try {
                const response = await fetch(req.url, {
                    method: req.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(req.body),
                });

                if (response.ok) {
                    await offlineStorage.removeRequest(req.id);
                    successCount++;
                } else {
                    console.error('Failed to sync request:', req);
                    if (response.status >= 400 && response.status < 500) {
                        // Client error (e.g., validation), remove it to prevent blocking
                        await offlineStorage.removeRequest(req.id);
                        addToast(`Sync failed for an item: ${response.statusText}`, 'error');
                    }
                }
            } catch (error) {
                console.error('Network error during sync:', error);
            }
        }

        if (successCount > 0) {
            addToast(`Synced ${successCount} offline actions`, 'success');
        }

        await updatePendingCount();
        setIsSyncing(false);
    }, [isSyncing, addToast, updatePendingCount, token]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setTimeout(syncNow, 2000);
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncNow]);

    const queueAction = async (url: string, method: string, body: any, type: 'daily-log' | 'rfi') => {
        await offlineStorage.addRequest({ url, method, body, type });
        await updatePendingCount();

        addToast('Saved to offline queue', 'info');

        if (isOnline) {
            setTimeout(syncNow, 100);
        }
    };

    return (
        <SyncContext.Provider value={{ isOnline, pendingCount, queueAction, syncNow }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};
