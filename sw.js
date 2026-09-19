/* 젤다의 성장일기 — 오프라인에서도 열리도록 앱 파일을 캐시해 둔다.
   기록과 사진은 여기 들어오지 않는다. 그건 IndexedDB에 있다. */
const CACHE = "zelda-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./zelda-sticker.png",
  "./zelda-head.png",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon-64.png",
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // 하나가 실패해도 나머지는 담기도록 개별로 넣는다
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const sameOrigin = new URL(req.url).origin === location.origin;

  // 앱 화면 자체는 네트워크 우선 — 새 버전을 올리면 바로 반영되도록
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put("./index.html", c)); return res; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && sameOrigin) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
      return res;
    }))
  );
});
