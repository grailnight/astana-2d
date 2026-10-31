'use strict';
// Офлайн-кэш для установленной игры: файлы игры из кэша, шрифты — из кэша с фоновым обновлением.
const CACHE = 'astana-v10';
const SHELL = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'src/util.js', 'src/art.js', 'src/world.js', 'src/entities.js', 'src/game.js', 'src/content.js', 'src/quests.js',
  'src/minigames.js', 'src/romance.js', 'src/social.js', 'src/life.js', 'src/interior.js', 'src/city.js', 'src/daily.js', 'src/decor.js', 'src/fun.js', 'src/pet.js', 'src/events.js', 'src/lives.js', 'src/dreams.js', 'src/uikit.js', 'src/device.js', 'src/audio.js', 'src/ui.js', 'src/input.js', 'src/render.js', 'src/main.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !font) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: !font });
    const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
