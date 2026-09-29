/* AR GYM service worker
   - app shell: precached by workbox (html, js, css, fonts, icons, posters)
   - /videos/*.mp4: cache-first from `videos-v1` with Range support (iOS
     Safari only plays cached video when served as 206 partial content);
     on a miss, stream from the network and store a full copy in the background. */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

/* Stable across deploys so people never re-download their videos. */
const VIDEO_CACHE = "videos-v1";
const VIDEO_PATH = /^\/videos\/[^/]+\.mp4$/;
/* set by the page's own "Download" buttons, which write the cache themselves */
const PAGE_DOWNLOAD = "X-ARGYM-Download";

const inflight = new Map();

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

/* Registered before workbox's routes so video requests are ours. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !VIDEO_PATH.test(url.pathname)) return;

  const key = url.origin + url.pathname;
  const hit = caches.open(VIDEO_CACHE).then((c) => c.match(key, { ignoreSearch: true, ignoreVary: true }));
  const range = req.headers.get("range");

  event.respondWith(hit.then((res) => {
    if (res) return range ? partial(res, range) : res;
    return fetch(req);
  }));
  if (!req.headers.has(PAGE_DOWNLOAD)) {
    event.waitUntil(hit.then((res) => (res ? undefined : fill(key))));
  }
});

/* Download the whole file once (no Range) and keep it if it came back 200. */
function fill(key) {
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const res = await fetch(key, { cache: "no-store", credentials: "same-origin" });
    if (res.status !== 200) return;
    const cache = await caches.open(VIDEO_CACHE);
    await cache.put(key, res);
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ type: "VIDEO_CACHED", url: key }));
  })().catch(() => {}).finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/* 206 slice of a cached full response. */
async function partial(res, rangeHeader) {
  const type = res.headers.get("Content-Type") || "video/mp4";
  const blob = await res.blob();
  const size = blob.size;
  const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  let start, end;
  if (m && m[1] !== "") {
    start = Number(m[1]);
    end = m[2] !== "" ? Math.min(Number(m[2]), size - 1) : size - 1;
  } else if (m && m[2] !== "") {                     /* suffix: last N bytes */
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  }
  if (start === undefined || start >= size || start > end) {
    return new Response(null, { status: 416, statusText: "Range Not Satisfiable", headers: { "Content-Range": `bytes */${size}` } });
  }
  return new Response(blob.slice(start, end + 1, type), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": type,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html"), { denylist: [/^\/videos\//] }));
clientsClaim();
