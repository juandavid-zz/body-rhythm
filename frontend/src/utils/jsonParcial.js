/**
 * Lee un JSON que todavía se está escribiendo (la IA lo manda por partes).
 *
 * Cierra lo que quedó abierto (comillas, llaves y corchetes) y descarta la
 * clave o el número que aún no termina, para que JSON.parse funcione en
 * cualquier momento. Un texto a medio escribir se devuelve tal cual va, así
 * se ve aparecer letra por letra. Devuelve null si todavía no hay nada útil.
 *
 *   jsonParcial('{"nombre": "Fuer')        -> { nombre: 'Fuer' }
 *   jsonParcial('{"dias": [1, 2')          -> { dias: [1] }
 *   jsonParcial('{"a": 1, "b')             -> { a: 1 }
 */
export function jsonParcial(texto) {
  if (!texto) return null
  const inicio = texto.indexOf('{')
  if (inicio === -1) return null
  const t = texto.slice(inicio)

  const pila = [] // '{' o '['
  let enTexto = false
  let escape = false
  let textoEsValor = false
  let esperaClave = false
  // Último punto donde lo escrito es JSON válido si se cierra lo abierto
  let seguro = { pos: 0, pila: [] }
  const marcar = (pos) => {
    seguro = { pos, pila: pila.slice() }
  }

  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (enTexto) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') {
        enTexto = false
        if (textoEsValor) marcar(i + 1)
      }
      continue
    }
    if (c === '{' || c === '[') {
      pila.push(c)
      esperaClave = c === '{'
      marcar(i + 1)
    } else if (c === '}' || c === ']') {
      pila.pop()
      esperaClave = false
      marcar(i + 1)
    } else if (c === '"') {
      enTexto = true
      textoEsValor = !(pila[pila.length - 1] === '{' && esperaClave)
    } else if (c === ':') {
      esperaClave = false
    } else if (c === ',') {
      // Lo de antes de la coma ya está completo (sirve para números y true/false/null)
      marcar(i)
      if (pila[pila.length - 1] === '{') esperaClave = true
    }
  }

  const cerrar = (p) =>
    p
      .slice()
      .reverse()
      .map((x) => (x === '{' ? '}' : ']'))
      .join('')

  const intentos = []
  if (enTexto && textoEsValor) {
    // Un texto a medio escribir se muestra con lo que lleva
    let parcial = t
    if (escape) parcial = parcial.slice(0, -1)
    // Un \u incompleto rompe el JSON: se quita
    parcial = parcial.replace(/\\u[0-9a-fA-F]{0,3}$/, '')
    intentos.push(parcial + '"' + cerrar(pila))
  }
  intentos.push(t.slice(0, seguro.pos).replace(/,\s*$/, '') + cerrar(seguro.pila))

  for (const intento of intentos) {
    try {
      return JSON.parse(intento)
    } catch {
      // se prueba el siguiente
    }
  }
  return null
}
