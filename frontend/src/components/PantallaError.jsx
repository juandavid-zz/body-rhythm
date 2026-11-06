import { Component } from 'react'
import '../css/pantalla-error.css'

const CLAVE_RECARGA = 'br-recarga-por-version'

// Tras publicar una versión nueva, los archivos JS viejos ya no existen y abrir una
// página falla al descargarla. En ese caso basta con recargar (una sola vez).
const esVersionVieja = (error) =>
  /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(error?.message || '')

/**
 * Si una página falla al dibujarse, muestra un aviso con "Recargar" en lugar de
 * dejar la pantalla en blanco.
 */
export default class PantallaError extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (esVersionVieja(error)) {
      try {
        if (!sessionStorage.getItem(CLAVE_RECARGA)) {
          sessionStorage.setItem(CLAVE_RECARGA, '1')
          window.location.reload()
          return
        }
      } catch {
        // sin sessionStorage: se muestra el aviso normal
      }
    }
    console.error('Error al mostrar la página:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="pantalla-error" role="alert">
        <div className="pantalla-error-caja">
          <h1>Algo salió mal</h1>
          <p>No pudimos mostrar esta página. Recarga para intentarlo de nuevo; tus datos están a salvo.</p>
          <div className="pantalla-error-botones">
            <button type="button" className="primario" onClick={() => window.location.reload()}>Recargar</button>
            <button type="button" onClick={() => window.location.assign('/')}>Ir al inicio</button>
          </div>
        </div>
      </div>
    )
  }
}
