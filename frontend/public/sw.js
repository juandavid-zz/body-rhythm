// Service worker de Body Rhythm: permite instalar la app y que abra rápido.
// - Páginas: primero la red; sin conexión, la última versión guardada.
// - Archivos de /assets (JS y CSS con hash), íconos e imágenes de ejercicios: desde
//   la caché, porque no cambian. La API nunca se guarda: siempre va a la red.
// - Los videos (mp4) no se guardan aquí: el navegador los pide por partes (Range) y
//   Safari no los reproduce si se le responde con el archivo entero desde la caché.
// Sube VERSION cuando cambien archivos que conservan su nombre (las animaciones):
// así se borra la caché vieja y nadie se queda con la versión anterior.
const VERSION = 'br-v2'
const CACHE_APP = `${VERSION}-app`
const CACHE_ARCHIVOS = `${VERSION}-archivos`

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE_APP).then((cache) => cache.add('/index.html')))
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  // Borra las cachés de versiones anteriores
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

const ES_ARCHIVO_FIJO = /^\/(assets|icons|ejercicios|gifs)\//

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone()
          caches.open(CACHE_APP).then((cache) => cache.put('/index.html', copia))
          return respuesta
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  if (url.pathname.endsWith('.mp4') || request.headers.has('range')) return

  if (ES_ARCHIVO_FIJO.test(url.pathname)) {
    evento.respondWith(
      caches.match(request).then((guardada) =>
        guardada ||
        fetch(request).then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone()
            caches.open(CACHE_ARCHIVOS).then((cache) => cache.put(request, copia))
          }
          return respuesta
        }),
      ),
    )
  }
})
