const CACHE_NAME = "lavado-esteban-v1";

const APP_SHELL = [
    "./",
    "./index.html",
    "./login.html",
    "./recibos.html",
    "./gastos.html",

    "./css/global.css",
    "./css/login.css",
    "./css/recibos.css",
    "./css/historial.css",
    "./css/gastos.css",

    "./js/firebase.js",
    "./js/login.js",
    "./js/recibos.js",
    "./js/historial.js",
    "./js/gastos.js",

    "./manifest.json",

    "./imagenes/logo.png",
    "./imagenes/favicon.png",
    "./imagenes/icon-192.png",
    "./imagenes/icon-512.png",
    "./imagenes/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName !== CACHE_NAME;
                        })
                        .map((cacheName) => {
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (
                        response &&
                        response.status === 200
                    ) {
                        const responseClone = response.clone();

                        caches
                            .open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(
                                    request,
                                    responseClone
                                );
                            });
                    }

                    return response;
                })
                .catch(async () => {
                    const cachedResponse =
                        await caches.match(request);

                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return caches.match("./login.html");
                })
        );

        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (
                    !response ||
                    response.status !== 200 ||
                    response.type !== "basic"
                ) {
                    return response;
                }

                const responseClone =
                    response.clone();

                caches
                    .open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(
                            request,
                            responseClone
                        );
                    });

                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});