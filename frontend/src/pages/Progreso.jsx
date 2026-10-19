import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/api";
import Navbar from "../components/Navbar";
import { formatearDuracion, formatearNumero } from "../utils/formato";
import "../css/Progreso.css";

const ACENTO = "#a855f7";

const RANGOS_IMC = [
  { hasta: 18.5, nombre: "Bajo peso" },
  { hasta: 25, nombre: "Rango saludable" },
  { hasta: 30, nombre: "Sobrepeso" },
  { hasta: Infinity, nombre: "Obesidad" },
];

const rangoImc = (imc) => RANGOS_IMC.find((r) => imc < r.hasta)?.nombre;

const fechaCorta = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const diaSemana = new Intl.DateTimeFormat("es", { weekday: "short" });

// Las fechas del backend vienen sin zona ("2026-10-18"): se leen como fecha local
const aFecha = (texto) => new Date(texto.length === 10 ? `${texto}T00:00:00` : texto);

function TooltipGrafica({ active, payload, unidad }) {
  if (!active || !payload?.length) return null;
  const punto = payload[0].payload;
  return (
    <div className="pg-tooltip">
      <span>{fechaCorta.format(aFecha(punto.fecha))}</span>
      <strong>
        {formatearNumero(payload[0].value)} {unidad}
      </strong>
    </div>
  );
}

function Grafica({ historial, metrica }) {
  if (historial.length < 2) {
    return (
      <div className="pg-grafica-vacia">
        <p>Registra tu peso al menos dos días para ver tu evolución aquí.</p>
      </div>
    );
  }

  const datos = historial.map((h) => ({ ...h, etiqueta: fechaCorta.format(aFecha(h.fecha)) }));
  const unidad = metrica === "peso" ? "kg" : "";

  return (
    <div className="pg-grafica" role="img" aria-label={`Evolución de tu ${metrica === "peso" ? "peso" : "IMC"}`}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={datos} margin={{ top: 16, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} tick={{ fill: "rgba(240,235,255,0.5)", fontSize: 12 }} minTickGap={24} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgba(240,235,255,0.5)", fontSize: 12 }}
            // Límites redondos un poco por fuera de los datos
            domain={[(min) => Math.floor(min - 1), (max) => Math.ceil(max + 1)]}
            allowDecimals={false}
            tickFormatter={(v) => formatearNumero(v)}
            width={48}
          />
          <Tooltip content={<TooltipGrafica unidad={unidad} />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
          <Line
            type="monotone"
            dataKey={metrica}
            stroke={ACENTO}
            strokeWidth={2}
            dot={{ r: 4, fill: ACENTO, stroke: "#14101f", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: ACENTO, stroke: "#14101f", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function RegistrarPeso({ pesoActual, onRegistrado }) {
  const [peso, setPeso] = useState(pesoActual ?? "");
  const [estado, setEstado] = useState({ enviando: false, error: "" });

  const enviar = async (evento) => {
    evento.preventDefault();
    setEstado({ enviando: true, error: "" });
    try {
      await api.post("/progreso/peso/", { peso: Number(peso) });
      setEstado({ enviando: false, error: "" });
      onRegistrado();
    } catch (error) {
      const data = error.response?.data;
      setEstado({ enviando: false, error: data?.error || data?.peso?.[0] || "No se pudo registrar." });
    }
  };

  return (
    <form className="pg-registrar" onSubmit={enviar}>
      <label htmlFor="pg-peso">Peso de hoy</label>
      <div className="pg-registrar-fila">
        <input
          id="pg-peso"
          type="number"
          step="0.1"
          min="20"
          max="400"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          required
        />
        <span>kg</span>
        <button type="submit" disabled={estado.enviando || !peso}>
          {estado.enviando ? "Guardando…" : "Registrar"}
        </button>
      </div>
      {estado.error && <p className="pg-error">{estado.error}</p>}
    </form>
  );
}

export default function Progreso() {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState({ cargando: true, valor: null, error: "" });
  const [metrica, setMetrica] = useState("peso");

  useEffect(() => {
    let activo = true;
    api
      .get("/progreso/")
      .then((res) => activo && setDatos({ cargando: false, valor: res.data, error: "" }))
      .catch(() => activo && setDatos({ cargando: false, valor: null, error: "No se pudo cargar tu progreso." }));
    return () => {
      activo = false;
    };
  }, [version]);

  const d = datos.valor;
  const historial = d?.historial_peso || [];
  const primero = historial[0];
  const cambio = d?.perfil.peso != null && primero ? Math.round((d.perfil.peso - primero.peso) * 10) / 10 : null;

  return (
    <>
      <Navbar />
      <main className="pg-page">
        <div className="pg-contenedor">
          <header className="pg-cabecera">
            <h1>Mi progreso</h1>
            <p>Tu evolución con los datos de tus entrenamientos y tus registros de peso.</p>
          </header>

          {datos.cargando && <p className="pg-nota">Cargando…</p>}
          {datos.error && <p className="pg-error">{datos.error}</p>}

          {d && (
            <>
              {/* ── Cifras principales ── */}
              <section className="pg-cifras" aria-label="Resumen">
                <div className="pg-panel pg-cifra">
                  <span>Peso actual</span>
                  <strong>{d.perfil.peso != null ? `${formatearNumero(d.perfil.peso)} kg` : "–"}</strong>
                  <small>
                    {cambio === null || historial.length < 2
                      ? "Sin registros anteriores"
                      : `${cambio > 0 ? "+" : ""}${formatearNumero(cambio)} kg desde el ${fechaCorta.format(aFecha(primero.fecha))}`}
                  </small>
                </div>
                <div className="pg-panel pg-cifra">
                  <span>IMC</span>
                  <strong>{d.perfil.imc ?? "–"}</strong>
                  <small>{d.perfil.imc ? rangoImc(d.perfil.imc) : "Agrega peso y altura"}</small>
                </div>
                <div className="pg-panel pg-cifra">
                  <span>Esta semana</span>
                  <strong>{d.totales.dias_semana}/7</strong>
                  <small>días con entrenamiento</small>
                </div>
                <div className="pg-panel pg-cifra">
                  <span>Racha</span>
                  <strong>
                    {d.totales.racha} {d.totales.racha === 1 ? "día" : "días"}
                  </strong>
                  <small>Mejor racha: {d.totales.mejor_racha} {d.totales.mejor_racha === 1 ? "día" : "días"}</small>
                </div>
              </section>

              <div className="pg-grid">
                {/* ── Evolución ── */}
                <section className="pg-panel pg-evolucion">
                  <div className="pg-panel-cabecera">
                    <h2>Evolución</h2>
                    <div className="pg-tabs" role="tablist" aria-label="Métrica">
                      {[["peso", "Peso"], ["imc", "IMC"]].map(([id, texto]) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={metrica === id}
                          className={metrica === id ? "activa" : ""}
                          onClick={() => setMetrica(id)}
                        >
                          {texto}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Grafica historial={historial} metrica={metrica} />

                  {d.perfil.altura ? (
                    <RegistrarPeso
                      key={d.perfil.peso ?? "sin-peso"}
                      pesoActual={d.perfil.peso}
                      onRegistrado={() => setVersion((v) => v + 1)}
                    />
                  ) : (
                    <p className="pg-nota">
                      Agrega tu altura en{" "}
                      <button type="button" className="pg-link" onClick={() => navigate("/configuracion")}>
                        Configuración
                      </button>{" "}
                      para registrar tu peso y calcular tu IMC.
                    </p>
                  )}
                </section>

                {/* ── Semana y totales ── */}
                <section className="pg-panel pg-semana">
                  <h2>Últimos 7 días</h2>
                  <ol className="pg-dias">
                    {d.semana.map((dia) => (
                      <li key={dia.fecha} className={dia.entrenado ? "entrenado" : ""}>
                        <span className="pg-punto" aria-hidden="true" />
                        <span>{diaSemana.format(aFecha(dia.fecha)).replace(".", "")}</span>
                        <span className="pg-oculto">{dia.entrenado ? "entrenaste" : "sin entrenar"}</span>
                      </li>
                    ))}
                  </ol>

                  <h2 className="pg-subtitulo">Totales</h2>
                  <dl className="pg-totales">
                    <div>
                      <dt>Entrenamientos</dt>
                      <dd>{formatearNumero(d.totales.entrenamientos)}</dd>
                    </div>
                    <div>
                      <dt>Tiempo</dt>
                      <dd>{formatearDuracion(d.totales.minutos * 60)}</dd>
                    </div>
                    <div>
                      <dt>Volumen</dt>
                      <dd>{formatearNumero(d.totales.volumen)} kg</dd>
                    </div>
                    <div>
                      <dt>Récords</dt>
                      <dd>{d.totales.records}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              {/* ── Logros ── */}
              <section className="pg-panel">
                <h2>
                  Logros <span className="pg-contador">{d.logros.filter((l) => l.obtenido).length}/{d.logros.length}</span>
                </h2>
                <ul className="pg-logros">
                  {d.logros.map((logro) => (
                    <li key={logro.id} className={logro.obtenido ? "obtenido" : ""}>
                      <span className="pg-logro-icono" aria-hidden="true">{logro.icono}</span>
                      <span>
                        <strong>{logro.titulo}</strong>
                        <small>{logro.obtenido ? logro.descripcion : `Pendiente: ${logro.descripcion.toLowerCase()}`}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* ── Récords ── */}
              <section className="pg-panel">
                <h2>Últimos récords personales</h2>
                {d.records_recientes.length === 0 ? (
                  <p className="pg-nota">
                    Cuando superes tu mejor marca en un ejercicio aparecerá aquí.
                  </p>
                ) : (
                  <ul className="pg-records">
                    {d.records_recientes.map((r, i) => (
                      <li key={`${r.ejercicio}-${i}`}>
                        <span>
                          <strong>🏆 {r.ejercicio}</strong>
                          <small>{r.entrenamiento} · {fechaCorta.format(aFecha(r.fecha))}</small>
                        </span>
                        <span className="pg-record-valor">
                          {r.tipo === "peso" && `${formatearNumero(r.valor)} kg`}
                          {r.tipo === "reps" && `${r.valor} reps`}
                          {r.tipo === "tiempo" && formatearDuracion(r.valor)}
                          <small>
                            antes {r.tipo === "peso" ? `${formatearNumero(r.anterior)} kg` : r.tipo === "reps" ? `${r.anterior} reps` : formatearDuracion(r.anterior)}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
