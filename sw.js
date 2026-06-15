// Sayı Avcısı Service Worker — Network-first strategy
// Her açılışta GitHub'dan taze HTML çek, network başarısız olursa cache'i kullan

const CACHE_NAME = 'sa-cache-v1';

self.addEventListener('install', function(e) {
    // Yeni service worker hemen aktif olsun, eski sürümü bekleme
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    // Aktif olunca eski cache'leri temizle, kontrolü ele al
    e.waitUntil(
        Promise.all([
            // Eski cache'leri sil
            caches.keys().then(function(keys) {
                return Promise.all(keys.map(function(key) {
                    if (key !== CACHE_NAME) return caches.delete(key);
                }));
            }),
            // Tüm açık sekmelerin kontrolünü al
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', function(e) {
    // Sadece GET isteklerini ele al
    if (e.request.method !== 'GET') return;
    
    // Network-first: önce GitHub'a sor, başarısız olursa cache'den ver
    e.respondWith(
        fetch(e.request, { cache: 'no-store' })
            .then(function(response) {
                // Başarılı network yanıtı → cache'i güncelle ve döndür
                if (response && response.status === 200 && response.type === 'basic') {
                    const respClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(e.request, respClone);
                    });
                }
                return response;
            })
            .catch(function() {
                // Network başarısız → cache'den döndür (offline kullanım)
                return caches.match(e.request);
            })
    );
});

// Yeni sürüm geldiğinde tüm sekmelere haber ver
self.addEventListener('message', function(e) {
    if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
