// Minimal service worker so Chrome treats the dashboard as an installable app.
// Network-only on purpose: nothing is cached, so project data is never stale and
// the GitHub token never ends up in a cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
