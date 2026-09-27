import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const rutasPublicas = ['/registro/', '/login/', '/verificar/', '/reenviar-verificacion/']
  const esPublica = rutasPublicas.some(ruta => config.url.includes(ruta))

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

export default api