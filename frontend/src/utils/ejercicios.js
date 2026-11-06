import api from '../api/api'
import animadas from '../data/animaciones.json'

// Ejercicios que tienen animación propia (video con el estilo de la app en
// /ejercicios/animadas/). Los demás siguen con las fotos de inicio y final.
const conAnimacion = new Set(animadas)

export function animacionDe(ejercicio) {
  const slug = ejercicio?.repdb_id
  if (!slug || !conAnimacion.has(slug)) return null
  return {
    video: `/ejercicios/animadas/${slug}.mp4`,
    poster: `/ejercicios/animadas/${slug}.webp`,
  }
}

// El catálogo de ejercicios (~376) casi nunca cambia y lo usan varias páginas
// (Ejercicios, su detalle, Rutinas y el entrenamiento). Se descarga una sola
// vez por sesión y las demás páginas reutilizan la misma respuesta.
let catalogo = null

export function obtenerEjercicios() {
  if (!catalogo) {
    catalogo = api
      .get('/ejercicios/')
      .then((res) => (Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch((error) => {
        catalogo = null // si falló, la próxima visita lo intenta de nuevo
        throw error
      })
  }
  return catalogo
}
