import { useEffect, useState } from 'react'
import './Toast.css'

export default function Toast({ mensaje, tipo = 'exito', duracion = 3500 }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duracion)
    return () => clearTimeout(timer)
  }, [duracion])

  if (!visible) return null

  return (
    <div className={`toast toast--${tipo}`}>
      <span className="toast-icono">
        {tipo === 'exito' ? '✓' : '✕'}
      </span>
      <span className="toast-mensaje">{mensaje}</span>
    </div>
  )
}