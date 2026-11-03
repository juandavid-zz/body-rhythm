import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import PantallaError from './components/PantallaError'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PantallaError>
      <App />
    </PantallaError>
  </React.StrictMode>
)

// Service worker: permite instalar la app en el celular. Solo en producción, para
// que en desarrollo no se queden guardadas versiones viejas de los archivos.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
