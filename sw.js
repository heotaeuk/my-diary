// 오프라인에서도 플래너를 열 수 있도록 앱 파일을 캐시
// 파일을 바꿔 배포할 때는 CACHE 이름의 숫자를 올려 옛 캐시를 지움
const CACHE = 'ten-minute-planner-v1';
const ASSETS = [
  './',
  './index.html',
  './about.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // 페이지(HTML)는 최신 버전을 먼저 받고, 인터넷이 없으면 캐시
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))),
    );
    return;
  }

  // 아이콘 등 나머지는 캐시를 먼저 쓰고, 없으면 받아서 저장
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
      }
      return res;
    })),
  );
});
