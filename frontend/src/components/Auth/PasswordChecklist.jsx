import { REQUISITOS, NIVELES, calcularFuerza } from './passwordUtils'

export default function PasswordChecklist({ password }) {
  if (!password) return null

  const { puntos, nivel } = calcularFuerza(password)

  return (
    <div className="password-panel">
      <div className="fuerza-fila">
        <span className="fuerza-etiqueta">Seguridad de contraseña</span>
        <span className="fuerza-valor" style={{ color: nivel.color }}>{nivel.texto}</span>
      </div>

      <div className="fuerza-barra">
        {NIVELES.slice(1).map((n, i) => (
          <div
            key={n.texto}
            className="fuerza-segmento"
            style={{ background: puntos > i ? nivel.color : undefined }}
          />
        ))}
      </div>

      <div className="checklist">
        {REQUISITOS.map((req) => {
          const ok = req.test(password)
          return (
            <div key={req.id} className={`checklist-item${ok ? ' ok' : ''}`}>
              <span className="checklist-marca">
                <svg viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l2.5 2.5L10 3" stroke="#0a0b12" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {req.texto}
            </div>
          )
        })}
      </div>
    </div>
  )
}
