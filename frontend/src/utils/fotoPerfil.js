// Aviso de que la foto de perfil cambió: la barra de arriba la guarda en memoria
// una sola vez por sesión y así se entera sin recargar la página.
export const EVENTO_FOTO_PERFIL = 'br-foto-perfil'

export function avisarFotoPerfil(foto) {
  window.dispatchEvent(new CustomEvent(EVENTO_FOTO_PERFIL, { detail: { foto } }))
}
