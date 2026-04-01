const CACHE = 'streak-v3';
const FILES = ['./index.html', './verses.js', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    if(list.length) return list[0].focus();
    return clients.openWindow('./index.html');
  }));
});

// Check every minute if any notification is due
self.addEventListener('periodicsync', e => {
  if(e.tag === 'check-streak') {
    e.waitUntil(checkAndNotify());
  }
});

// Also check when SW starts (when app is opened)
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SCHEDULE_NOTIF') {
    const {notifType, fireAt, title, body} = e.data;
    // Store the scheduled notification
    self.registration.showNotification; // keep SW alive
    scheduleCheck(notifType, fireAt, title, body);
  }
  if(e.data && e.data.type === 'CHECK_NOTIFS') {
    checkAndNotify();
  }
});

const scheduled = {};

function scheduleCheck(type, fireAt, title, body) {
  const now = Date.now();
  const delay = fireAt - now;
  if(delay <= 0) return;
  if(scheduled[type]) clearTimeout(scheduled[type]);
  scheduled[type] = setTimeout(() => {
    self.registration.showNotification(title, {
      body: body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'streak-' + type,
      renotify: true,
      vibrate: [200, 100, 200],
      requireInteraction: true
    });
  }, delay);
}

async function checkAndNotify() {
  // This runs when the SW wakes up — clients send us the schedule info
  const allClients = await clients.matchAll({includeUncontrolled: true});
  allClients.forEach(c => c.postMessage({type: 'REQUEST_SCHEDULE'}));
}