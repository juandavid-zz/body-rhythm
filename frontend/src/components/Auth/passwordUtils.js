// Reglas de fuerza de contraseña. Solo "longitud" es un requisito real del backend
// (RegistroSerializer, min_length=8); el resto son señales de fuerza que se muestran
// como guía pero nunca bloquean el envío por sí solas.

export const REQUISITOS = [
  { id: 'longitud', texto: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'mayusMinus', texto: 'Letras minúsculas y mayúsculas', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: 'numero', texto: 'Al menos 1 número', test: (p) => /\d/.test(p) },
  { id: 'simbolo', texto: 'Al menos 1 símbolo', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export const NIVELES = [
  { minimo: 0, texto: 'Muy débil', color: '#f87171' },
  { minimo: 1, texto: 'Débil', color: '#fb923c' },
  { minimo: 2, texto: 'Media', color: '#facc15' },
  { minimo: 3, texto: 'Fuerte', color: '#4ade80' },
  { minimo: 4, texto: 'Muy fuerte', color: '#22c55e' },
]

export function cumpleMinimoBackend(password) {
  return password.length >= 8
}

export function calcularFuerza(password) {
  const puntos = REQUISITOS.filter((r) => r.test(password)).length
  const nivel = [...NIVELES].reverse().find((n) => puntos >= n.minimo)
  return { puntos, nivel }
}
