// Service Worker for Rolan Ice Cream PWA
// Provides offline functionality and caching

const CACHE_NAME = 'rolan-ice-cream-v1.0.0';
const STATIC_CACHE_NAME = 'rolan-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'rolan-dynamic-v1.0.0';

// Files to cache immediately (critical for app functionality)
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap',
    'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvalIhTp2mxdt0UX8gO3BP.woff2'
];

// Files that can be cached dynamically
const CACHEABLE_DOMAINS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Install event triggered');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE_NAME).then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES.map(url => {
                    return new Request(url, { credentials: 'same-origin' });
                }));
            }),
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate event triggered');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all pages
            self.clients.claim()
        ])
    );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other protocols
    if (!url.protocol.startsWith('http')) {
        return;
    }

    event.respondWith(handleFetch(request));
});

// Main fetch handling strategy
async function handleFetch(request) {
    const url = new URL(request.url);
    
    try {
        // Strategy 1: Cache First for static files
        if (isStaticFile(request)) {
            return await cacheFirst(request);
        }
        
        // Strategy 2: Network First for dynamic content
        if (isDynamicContent(request)) {
            return await networkFirst(request);
        }
        
        // Strategy 3: Stale While Revalidate for fonts and external resources
        if (isExternalResource(request)) {
            return await staleWhileRevalidate(request);
        }
        
        // Default: Network with cache fallback
        return await networkWithCacheFallback(request);
        
    } catch (error) {
        console.error('Service Worker: Fetch failed:', error);
        return await handleFetchError(request);
    }
}

// Cache First Strategy (for static files)
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    const cache = await caches.open(STATIC_CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
}

// Network First Strategy (for dynamic content)
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
        const cache = caches.open(DYNAMIC_CACHE_NAME);
        cache.then((c) => c.put(request, networkResponse.clone()));
        return networkResponse;
    });
    
    return cachedResponse || fetchPromise;
}

// Network with Cache Fallback
async function networkWithCacheFallback(request) {
    try {
        return await fetch(request);
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Error handling
async function handleFetchError(request) {
    const url = new URL(request.url);
    
    // For HTML pages, return offline page
    if (request.headers.get('accept').includes('text/html')) {
        const cachedResponse = await caches.match('/');
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return a basic offline page if main page isn't cached
        return new Response(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>غير متصل - رولان آيس كريم</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px;
                        background: linear-gradient(135deg, #FF6B9D, #FF8A9B);
                        color: white;
                        min-height: 100vh;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                    }
                    .offline-icon { font-size: 4rem; margin-bottom: 20px; }
                    h1 { margin-bottom: 20px; }
                    .btn { 
                        background: white; 
                        color: #FF6B9D; 
                        padding: 15px 30px; 
                        border: none; 
                        border-radius: 25px; 
                        font-weight: bold;
                        cursor: pointer;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="offline-icon">📱</div>
                <h1>أنت غير متصل بالإنترنت</h1>
                <p>يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى</p>
                <button class="btn" onclick="window.location.reload()">إعادة المحاولة</button>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
    
    // For other resources, return a generic error
    return new Response('Network error', { 
        status: 408,
        statusText: 'Network timeout' 
    });
}

// Helper functions to determine request types
function isStaticFile(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    return pathname.endsWith('.css') ||
           pathname.endsWith('.js') ||
           pathname.endsWith('.html') ||
           pathname.endsWith('.json') ||
           pathname === '/' ||
           STATIC_FILES.some(file => pathname.includes(file));
}

function isDynamicContent(request) {
    const url = new URL(request.url);
    
    // API calls or dynamic content
    return url.pathname.includes('/api/') ||
           url.searchParams.has('dynamic') ||
           request.headers.get('Cache-Control') === 'no-cache';
}

function isExternalResource(request) {
    const url = new URL(request.url);
    
    return CACHEABLE_DOMAINS.some(domain => url.hostname.includes(domain)) ||
           url.pathname.includes('font') ||
           url.pathname.includes('.woff') ||
           url.pathname.includes('.woff2');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'order-sync') {
        event.waitUntil(syncOrders());
    }
    
    if (event.tag === 'contact-sync') {
        event.waitUntil(syncContactForms());
    }
});

// Sync pending orders when back online
async function syncOrders() {
    try {
        // Get pending orders from IndexedDB or localStorage
        const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
        
        for (const order of pendingOrders) {
            try {
                // Attempt to send order to server
                const response = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(order)
                });
                
                if (response.ok) {
                    // Remove from pending orders
                    const remainingOrders = pendingOrders.filter(o => o.id !== order.id);
                    localStorage.setItem('pendingOrders', JSON.stringify(remainingOrders));
                }
            } catch (error) {
                console.error('Failed to sync order:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Sync contact form submissions
async function syncContactForms() {
    try {
        const pendingContacts = JSON.parse(localStorage.getItem('pendingContacts') || '[]');
        
        for (const contact of pendingContacts) {
            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contact)
                });
                
                if (response.ok) {
                    const remainingContacts = pendingContacts.filter(c => c.id !== contact.id);
                    localStorage.setItem('pendingContacts', JSON.stringify(remainingContacts));
                }
            } catch (error) {
                console.error('Failed to sync contact:', error);
            }
        }
    } catch (error) {
        console.error('Contact sync failed:', error);
    }
}

// Push notifications (for future enhancement)
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push message received');
    
    const options = {
        body: event.data ? event.data.text() : 'رسالة جديدة من رولان آيس كريم',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        dir: 'rtl',
        lang: 'ar',
        actions: [
            {
                action: 'view',
                title: 'عرض',
                icon: '/icons/icon-96x96.png'
            },
            {
                action: 'close',
                title: 'إغلاق'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('رولان آيس كريم', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification click received');
    
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Periodic background sync (for future enhancement)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'menu-update') {
        event.waitUntil(updateMenuCache());
    }
});

async function updateMenuCache() {
    try {
        const response = await fetch('/api/menu');
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put('/api/menu', response);
        }
    } catch (error) {
        console.error('Failed to update menu cache:', error);
    }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('Service Worker: Script loaded successfully');