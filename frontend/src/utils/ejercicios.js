import api from '../api/api'

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
