import { useMemo } from 'react'
import '../css/nutricion-visual.css'

// Bloque visual de Nutrición: anillo de calorías, semana y reparto de macros.
// Solo muestra datos que ya existen (objetivo y registros). No llama a la API.
const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const RADIO = 54
const LARGO = 2 * Math.PI * RADIO

const aISO = (fecha) => fecha.toISOString().slice(0, 10)

export default function NutricionVisual({ caloriasHoy = 0, objetivo = null, registros = [] }) {
  const meta = Number(objetivo?.calorias) || 0
  const pct = meta > 0 ? Math.min(100, (caloriasHoy / meta) * 100) : 0
  const restantes = Math.max(0, meta - caloriasHoy)

  const semana = useMemo(() => {
    const hoy = new Date()
    const dias = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(hoy)
      d.setDate(hoy.getDate() - i)
      dias.push({ iso: aISO(d), letra: DIAS[d.getDay()], kcal: 0, esHoy: i === 0 })
    }
    registros.forEach((r) => {
      const dia = dias.find((x) => x.iso === r.fecha)
      if (dia) dia.kcal += Number(r.calorias) || 0
    })
    return dias
  }, [registros])

  const tope = Math.max(meta, ...semana.map((d) => d.kcal), 1)

  const macros = useMemo(() => {
    if (!objetivo || meta <= 0) return []
    const lista = [
      { nombre: 'Proteínas', g: Number(objetivo.proteinas_g) || 0, k: 4, clase: 'p' },
      { nombre: 'Carbohidratos', g: Number(objetivo.carbohidratos_g) || 0, k: 4, clase: 'c' },
      { nombre: 'Grasas', g: Number(objetivo.grasas_g) || 0, k: 9, clase: 'g' },
    ]
    return lista.map((m) => ({
      ...m,
      pct: Math.min(100, Math.round(((m.g * m.k) / meta) * 100)),
    }))
  }, [objetivo, meta])

  if (!objetivo || meta <= 0) return null

  return (
    <section className="nv" aria-label="Resumen visual de tu día">
      <article className="nv-card nv-dia">
        <span className="nv-label">TU DÍA</span>
        <div className="nv-ring">
          <svg viewBox="0 0 128 128" role="img" aria-label={`${Math.round(pct)}% de tu objetivo`}>
            <circle className="nv-ring-bg" cx="64" cy="64" r={RADIO} />
            <circle
              className="nv-ring-fg"
              cx="64"
              cy="64"
              r={RADIO}
              style={{ strokeDasharray: LARGO, strokeDashoffset: LARGO * (1 - pct / 100) }}
            />
          </svg>
          <div className="nv-ring-txt">
            <strong>{Math.round(caloriasHoy)}</strong>
            <span>de {Math.round(meta)} kcal</span>
          </div>
        </div>
        <p className="nv-nota">
          {caloriasHoy >= meta
            ? 'Objetivo del día cumplido'
            : `Te faltan ${Math.round(restantes)} kcal`}
        </p>
      </article>

      <article className="nv-card nv-semana">
        <span className="nv-label">ÚLTIMOS 7 DÍAS</span>
        <div className="nv-bars">
          {semana.map((d) => (
            <div className={`nv-bar${d.esHoy ? ' hoy' : ''}`} key={d.iso} title={`${d.kcal} kcal`}>
              <div className="nv-bar-col">
                <div
                  className="nv-bar-fill"
                  style={{ height: `${d.kcal > 0 ? Math.max(6, (d.kcal / tope) * 100) : 0}%` }}
                />
              </div>
              <span>{d.letra}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="nv-card nv-macros">
        <span className="nv-label">REPARTO DE MACROS</span>
        {macros.map((m) => (
          <div className="nv-macro" key={m.nombre}>
            <div className="nv-macro-top">
              <span>{m.nombre}</span>
              <strong>{Math.round(m.g)} g · {m.pct}%</strong>
            </div>
            <div className="nv-track">
              <div className={`nv-track-fill ${m.clase}`} style={{ width: `${m.pct}%` }} />
            </div>
          </div>
        ))}
      </article>
    </section>
  )
}
