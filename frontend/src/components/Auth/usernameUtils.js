import { useEffect, useState } from 'react'
import api from '../../api/api'

export const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/

export const MENSAJE_FORMATO_USERNAME =
  'De 3 a 30 caracteres: minúsculas, números, punto o guion bajo.'

// Lo que escribe el usuario → cómo se guarda (sin @, sin espacios, en minúsculas)
export function normalizarUsername(valor) {
  return (valor || '').trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase()
}

/**
 * Comprueba contra el backend (con una pausa de 400 ms) si el @username está libre.
 * estado: 'vacio' | 'invalido' | 'comprobando' | 'libre' | 'ocupado' | 'desconocido'
 */
export function useDisponibilidadUsername(valor) {
  const username = normalizarUsername(valor)
  const formatoValido = USERNAME_REGEX.test(username)
  const [resultado, setResultado] = useState({ username: '', disponible: null, mensaje: '' })

  useEffect(() => {
    if (!formatoValido) return undefined
    let activo = true

    const id = setTimeout(async () => {
      try {
        const res = await api.get('/usuarios/username-disponible/', { params: { username } })
        if (activo) {
          setResultado({ username, disponible: res.data.disponible, mensaje: res.data.mensaje || '' })
        }
      } catch {
        // Si falla la red no bloqueamos el formulario: el backend vuelve a validar al registrar
        if (activo) setResultado({ username, disponible: null, mensaje: '' })
      }
    }, 400)

    return () => {
      activo = false
      clearTimeout(id)
    }
  }, [username, formatoValido])

  if (!username) return { username, estado: 'vacio' }
  if (!formatoValido) return { username, estado: 'invalido', mensaje: MENSAJE_FORMATO_USERNAME }
  if (resultado.username !== username) return { username, estado: 'comprobando' }
  if (resultado.disponible === true) return { username, estado: 'libre' }
  if (resultado.disponible === false) {
    return { username, estado: 'ocupado', mensaje: resultado.mensaje || 'Ese nombre de usuario ya está en uso.' }
  }
  return { username, estado: 'desconocido' }
}
