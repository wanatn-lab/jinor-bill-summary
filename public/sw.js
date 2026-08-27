// Service Worker — Restaurant Sales Dashboard PWA
// วางไฟล์นี้ไว้ที่ root ของเว็บ (path: /sw.js)

const CACHE_NAME = "sales-dash-v2";

// App shell: ไฟล์ที่ทำให้เปิดแอปได้แม้เน็ตหลุด (ไม่รวมข้อมูลยอดขายที่เป็น dynamic)
const APP_SHELL = [
  "/config.js",
  "/dashboard.js",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ข้อมูลยอดขายจริงจาก Supabase: ห้าม cache เด็ดขาด ยิง network ตรงเสมอ
  // (กันเห็นตัวเลขเก่าค้าง)
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Never cache authentication, dashboard pages, or APIs. These routes need
  // the latest signed session and must not be served from an old PWA cache.
  const isProtectedPath =
    url.pathname === "/login" ||
    url.pathname.startsWith("/admin") ||
    url.pathname === "/dashboard" ||
    url.pathname === "/dashboard.html" ||
    url.pathname.startsWith("/api/");

  if (event.request.method === "GET" && url.origin === self.location.origin && !isProtectedPath && APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
