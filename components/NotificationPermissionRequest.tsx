import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { urlB64ToUint8Array } from '@/src/utils/pushUtils';

export const NotificationPermissionRequest: React.FC = () => {
    const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
    const [isLoading, setIsLoading] = useState(false);
    const { token } = useAuth();
    const { addToast } = useToast();

    useEffect(() => {
        // Double check on mount
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const subscribeUser = async () => {
        if (!('serviceWorker' in navigator)) return;

        setIsLoading(true);
        try {
            // 1. Get Registration
            const registration = await navigator.serviceWorker.ready;

            // 2. Get Public Key from Backend
            const response = await fetch('/api/notifications/config');
            const { publicKey } = await response.json();
            const convertedVapidKey = urlB64ToUint8Array(publicKey);

            // 3. Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            // 4. Send Registration to Backend
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            addToast('Notifications enabled successfully!', 'success');
            setPermission('granted');

        } catch (error) {
            console.error('Failed to subscribe:', error);
            addToast('Failed to enable notifications.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnableClick = async () => {
        if (!('Notification' in window)) {
            addToast('Notifications not supported in this browser.', 'error');
            return;
        }

        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === 'granted') {
            await subscribeUser();
        } else if (result === 'denied') {
            addToast('Permission denied. Please enable in browser settings.', 'error');
        }
    };

    if (permission === 'granted') {
        return (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg text-green-700">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-green-900 text-sm">Notifications Active</h3>
                        <p className="text-xs text-green-700">You will receive updates on this device.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (permission === 'denied') {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg text-red-700">
                        <BellOff size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-red-900 text-sm">Notifications Blocked</h3>
                        <p className="text-xs text-red-700">Please enable notifications in your browser settings to stay updated.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-200 rounded-lg text-zinc-600">
                    <Bell size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-zinc-900 text-sm">Enable Notifications</h3>
                    <p className="text-xs text-zinc-500">Get instant updates on daily logs and alerts.</p>
                </div>
            </div>
            <button
                onClick={handleEnableClick}
                disabled={isLoading}
                className="px-4 py-2 bg-[#0f5c82] hover:bg-[#0c4a6e] text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
            >
                {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Enable'}
            </button>
        </div>
    );
};
