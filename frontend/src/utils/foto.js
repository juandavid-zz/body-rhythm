import api from '../api/api'

// El backend devuelve la ruta de la foto (ej. /media/fotos_perfil/abc.webp);
// se sirve desde el mismo servidor que la API, sin el "/api" final
const SERVIDOR = String(api.defaults.baseURL || '').replace(/\/api\/?$/, '')

export function urlFoto(ruta) {
  if (!ruta) return null
  return /^https?:\/\//.test(ruta) ? ruta : `${SERVIDOR}${ruta}`
}
