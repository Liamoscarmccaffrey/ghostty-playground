// Cross-origin-isolation service worker.
//
// BrowserPod needs SharedArrayBuffer, which requires the page to be
// cross-origin isolated (COOP: same-origin + COEP: require-corp). The Vite
// dev server can set those headers, but a built static bundle served from an
// arbitrary host cannot. This worker injects the headers on the client so the
// page is isolated in dev and in production alike.
//
// Adapted from the well-known coi-serviceworker pattern.

if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) =>
    event.waitUntil(self.clients.claim())
  );

  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const headers = new Headers(response.headers);
          headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
          headers.set('Cross-Origin-Opener-Policy', 'same-origin');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  // Page-side registration. Registers the worker, then reloads once so the
  // controlled page loads with the isolation headers applied.
  (() => {
    if (!window.crossOriginIsolated && window.isSecureContext) {
      navigator.serviceWorker
        .register(window.document.currentScript.src)
        .then((registration) => {
          registration.addEventListener('updatefound', () =>
            window.location.reload()
          );
          if (registration.active && !navigator.serviceWorker.controller) {
            window.location.reload();
          }
        })
        .catch((e) => console.error('COI worker registration failed:', e));
    }
  })();
}
