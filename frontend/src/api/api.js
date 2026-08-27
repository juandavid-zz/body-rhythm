import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 45000, // 45s — evita que el chat se quede "escribiendo..." para siempre
})

const RUTAS_PUBLICAS = ['/registro/', '/login/', '/token/refresh/']

api.interceptors.request.use((config) => {
  const esPublica = RUTAS_PUBLICAS.some((ruta) => config.url.includes(ruta))

  if (!esPublica) {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } else {
    delete config.headers.Authorization
  }

  return config
})

// ── Renovación automática del access token cuando expira (401) ──
let renovando = false
let colaEspera = []

function resolverCola(nuevoToken) {
  colaEspera.forEach((cb) => cb(nuevoToken))
  colaEspera = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const esPublica = RUTAS_PUBLICAS.some((ruta) => (original?.url || '').includes(ruta))

    // Solo intentamos renovar en un 401 real, en rutas privadas, y solo una vez por petición
    if (error.response?.status !== 401 || esPublica || original._reintentado) {
      return Promise.reject(error)
    }

    const refresh = localStorage.getItem('refresh')
    if (!refresh) {
      // No hay forma de renovar: hay que loguearse de nuevo
      localStorage.removeItem('token')
      localStorage.removeItem('refresh')
      window.location.href = '/auth?modo=login'
      return Promise.reject(error)
    }

    original._reintentado = true

    if (renovando) {
      // Ya hay una renovación en curso: esperamos a que termine y reintentamos con el token nuevo
      return new Promise((resolve, reject) => {
        colaEspera.push((nuevoToken) => {
          if (!nuevoToken) return reject(error)
          original.headers.Authorization = `Bearer ${nuevoToken}`
          resolve(api(original))
        })
      })
    }

    renovando = true
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/token/refresh/', { refresh })
      const nuevoAccess = res.data.access
      localStorage.setItem('token', nuevoAccess)
      resolverCola(nuevoAccess)
      original.headers.Authorization = `Bearer ${nuevoAccess}`
      return api(original)
    } catch (errorRefresh) {
      // El refresh también venció o es inválido: hay que loguearse de nuevo
      resolverCola(null)
      localStorage.removeItem('token')
      localStorage.removeItem('refresh')
      window.location.href = '/auth?modo=login'
      return Promise.reject(errorRefresh)
    } finally {
      renovando = false
    }
  }
)

export default api