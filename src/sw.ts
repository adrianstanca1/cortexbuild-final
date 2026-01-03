/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

// Precache resources
precacheAndRoute(self.__WB_MANIFEST);

// Runtime Caching for Google Fonts
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

registerRoute(
    /^https:\/\/fonts\.googleapis\.com\/.*/i,
    new CacheFirst({
        cacheName: 'google-fonts-cache',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
            }),
        ],
    })
);

registerRoute(
    /^https:\/\/fonts\.gstatic\.com\/.*/i,
    new CacheFirst({
        cacheName: 'gstatic-fonts-cache',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
            }),
        ],
    })
);

registerRoute(
    ({ request }) => request.destination === 'script' || request.url.endsWith('.wasm'),
    new CacheFirst({
        cacheName: 'wasm-cache',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new ExpirationPlugin({
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
            }),
        ],
    })
);

self.skipWaiting();
clientsClaim();

// Push Notification Handler
self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {};
    const title = data.title || 'BuildPro Notification';
    const options = {
        body: data.body || 'You have a new update.',
        icon: '/pwa-192x192.png', // Ensure this path is correct
        badge: '/pwa-192x192.png',
        data: data.url || '/'
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a tab open
            for (const client of clientList) {
                if (client.url === event.notification.data && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(event.notification.data);
            }
        })
    );
});
