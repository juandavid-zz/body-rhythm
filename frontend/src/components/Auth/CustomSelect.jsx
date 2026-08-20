import { useState, useRef, useEffect } from 'react'

// Ícono chevron animado
const Chevron = ({ abierto }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
      transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)',
      flexShrink: 0,
      color: abierto ? '#d8b4fe' : 'rgba(235,235,245,0.45)',
    }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
)

// Ícono check para la opción seleccionada dentro del dropdown
const Check = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
    <path d="M3 8l3 3 7-7" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function CustomSelect({ name, value, onChange, options, placeholder = 'Seleccionar' }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Soporte de teclado (Escape cierra, Enter/Space abre)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setAbierto(false)
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setAbierto(!abierto)
    }
  }

  const seleccionado = options.find((o) => o.value === value)

  const handleSelect = (val) => {
    onChange({ target: { name, value: val } })
    setAbierto(false)
  }

  return (
    <div
      className={`custom-select${abierto ? ' custom-select--abierto' : ''}`}
      ref={ref}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-haspopup="listbox"
      aria-expanded={abierto}
    >
      {/* Trigger */}
      <div
        className="custom-select__trigger"
        onClick={() => setAbierto(!abierto)}
      >
        <span className={`custom-select__valor${!seleccionado ? ' custom-select__placeholder' : ''}`}>
          {seleccionado ? seleccionado.label : placeholder}
        </span>
        <Chevron abierto={abierto} />
      </div>

      {/* Dropdown */}
      {abierto && (
        <div className="custom-select__menu" role="listbox">
          {options.map((op) => (
            <div
              key={op.value}
              className={`custom-select__opcion${value === op.value ? ' custom-select__opcion--activa' : ''}`}
              role="option"
              aria-selected={value === op.value}
              onClick={() => handleSelect(op.value)}
            >
              <span>{op.label}</span>
              {value === op.value && <Check />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
