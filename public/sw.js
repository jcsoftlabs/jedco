// Service worker minimal pour rendre /admin/terrain installable (critère
// Chrome : manifest + service worker avec un handler `fetch`) et donner un
// filet de secours hors-ligne — la couverture réseau mobile en zone
// d'intervention est irrégulière en Haïti. Stratégie network-first : la
// version en ligne est toujours préférée quand elle répond, le cache ne sert
// que quand le réseau échoue (jamais de page périmée servie sciemment).
const CACHE = "jedco-terrain-v1";
const COQUILLE = ["/admin/terrain", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(COQUILLE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Seules les requêtes GET de navigation/assets sous /admin/terrain passent
  // par le cache — jamais les mutations (POST/PUT) ni les autres routes
  // admin, pour ne jamais servir une réponse mise en cache à une API.
  if (event.request.method !== "GET" || !event.request.url.includes("/admin/terrain")) return;

  event.respondWith(
    fetch(event.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copie));
        return reponse;
      })
      .catch(() => caches.match(event.request))
  );
});
