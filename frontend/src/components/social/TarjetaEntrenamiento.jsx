import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { formatearDuracion, formatearNumero, tiempoRelativo } from "../../utils/formato";
import Avatar from "./Avatar";
import Comentarios from "./Comentarios";

const EJERCICIOS_VISIBLES = 4;

// Mismas etiquetas que en la pantalla de registrar entrenamiento
const ETIQUETAS_TIPO = { calentamiento: "W", fallo: "F", drop: "D" };

function pesoDeSerie(serie, ejercicio) {
  const peso = serie.peso ?? serie.peso_kg;
  const unidad = serie.peso != null ? ejercicio.unidad_peso || "kg" : "kg";
  // Con peso corporal (0 o vacío) solo se muestran las repeticiones
  return peso ? `${formatearNumero(peso)} ${unidad}` : null;
}

function textoSerie(serie, ejercicio) {
  if (ejercicio.por_tiempo) return formatearDuracion(serie.duracion_segundos);
  const peso = pesoDeSerie(serie, ejercicio);
  return peso ? `${peso} × ${serie.reps ?? 0}` : `${serie.reps ?? 0} reps`;
}

const normalizar = (texto) =>
  (texto || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Cómo se lee un récord: "antes 85 kg", "antes 8 reps", "antes 1 min"
function textoAnterior(record) {
  if (record.tipo === "peso") return `antes ${formatearNumero(record.anterior)} kg`;
  if (record.tipo === "reps") return `antes ${record.anterior} reps`;
  return `antes ${formatearDuracion(record.anterior)}`;
}

// La mejor serie, como en Hevy: la más pesada (o la más larga si es por tiempo)
function mejorSerie(ejercicio) {
  const hechas = ejercicio.series.filter((s) => s.hecho);
  if (!hechas.length) return null;
  const valor = (s) =>
    ejercicio.por_tiempo ? s.duracion_segundos || 0 : (s.peso_kg ?? 0) * 1000 + (s.reps ?? 0);
  return hechas.reduce((mejor, s) => (valor(s) > valor(mejor) ? s : mejor));
}

const IconoFuerza = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 11V7a2 2 0 1 1 4 0v3" />
    <path d="M11 10V5.5a2 2 0 1 1 4 0V11" />
    <path d="M15 9.5a2 2 0 1 1 4 0V14a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-5.2-3L4.5 13.8a1.8 1.8 0 0 1 3-2L9 13" />
  </svg>
);

const IconoComentario = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12z" />
  </svg>
);

/**
 * Entrenamiento terminado al estilo Hevy: autor, resumen, mejor serie de cada
 * ejercicio y las interacciones (dar fuerza y comentarios).
 */
export default function TarjetaEntrenamiento({ registro, mostrarAutor = false, esPropio = false, onActualizar }) {
  const navigate = useNavigate();
  const [detalle, setDetalle] = useState(false);
  const [verComentarios, setVerComentarios] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const autor = registro.usuario;
  const records = registro.records || [];
  const recordPorEjercicio = Object.fromEntries(records.map((r) => [normalizar(r.ejercicio), r]));
  const ejercicios = detalle ? registro.ejercicios : registro.ejercicios.slice(0, EJERCICIOS_VISIBLES);
  const restantes = registro.ejercicios.length - EJERCICIOS_VISIBLES;

  const alternarFuerza = async () => {
    // Se actualiza al momento y se corrige con la respuesta del servidor
    const antes = { fuerzas: registro.fuerzas || 0, di_fuerza: registro.di_fuerza };
    onActualizar?.({
      ...registro,
      di_fuerza: !antes.di_fuerza,
      fuerzas: antes.fuerzas + (antes.di_fuerza ? -1 : 1),
    });
    try {
      const ruta = `/social/registros/${registro.id}/fuerza/`;
      const res = antes.di_fuerza ? await api.delete(ruta) : await api.post(ruta);
      onActualizar?.({ ...registro, ...res.data });
    } catch {
      onActualizar?.({ ...registro, ...antes });
    }
  };

  const alternarCompartido = async () => {
    setGuardando(true);
    try {
      const res = await api.patch(`/entrenamientos/registros/${registro.id}/`, {
        compartido: !registro.compartido,
      });
      onActualizar?.({ ...registro, compartido: res.data.compartido });
    } catch (error) {
      console.error("No se pudo cambiar la privacidad:", error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <article className="social-tarjeta">
      <header className="social-tarjeta-cabecera">
        {mostrarAutor && autor ? (
          <button type="button" className="social-tarjeta-autor" onClick={() => navigate(`/perfil/${autor.username}`)}>
            <Avatar nombre={autor.nombre} foto={autor.foto} />
            <span>
              <strong>{autor.nombre}</strong>
              <span>
                @{autor.username} · <time dateTime={registro.fecha}>{tiempoRelativo(registro.fecha)}</time>
              </span>
            </span>
          </button>
        ) : (
          <time className="social-tarjeta-fecha" dateTime={registro.fecha}>
            {tiempoRelativo(registro.fecha)}
          </time>
        )}

        {esPropio && (
          <button
            type="button"
            className={`social-privacidad ${registro.compartido ? "" : "privado"}`}
            onClick={alternarCompartido}
            disabled={guardando}
            title="Elige si este entrenamiento se muestra en tu perfil y en el feed"
          >
            {registro.compartido ? "Compartido" : "Solo yo"}
          </button>
        )}
      </header>

      <h3>{registro.nombre}</h3>

      <dl className="social-tarjeta-stats">
        <div>
          <dt>Duración</dt>
          <dd>{formatearDuracion(registro.duracion_segundos)}</dd>
        </div>
        <div>
          <dt>Volumen</dt>
          <dd>{formatearNumero(registro.volumen_kg)} kg</dd>
        </div>
        <div>
          <dt>Series</dt>
          <dd>{registro.series_completadas}</dd>
        </div>
        {records.length > 0 && (
          <div className="social-stat-record">
            <dt>Récords</dt>
            <dd>🏆 {records.length}</dd>
          </div>
        )}
      </dl>

      <ul className="social-ejercicios">
        {ejercicios.map((ejercicio, indice) => {
          const hechas = ejercicio.series.filter((s) => s.hecho);
          const mejor = mejorSerie(ejercicio);
          const record = recordPorEjercicio[normalizar(ejercicio.nombre)];
          return (
            <li key={`${ejercicio.nombre}-${indice}`}>
              <div className="social-ejercicio-fila">
                <span className="social-ejercicio-nombre">
                  <strong>{ejercicio.nombre}</strong>
                  <span>{hechas.length} {hechas.length === 1 ? "serie" : "series"}</span>
                </span>
                <span className="social-ejercicio-marca">
                  {record && (
                    <span className="social-record" title={`Récord personal (${textoAnterior(record)})`}>
                      🏆 Récord
                    </span>
                  )}
                  {mejor && <span className="social-mejor">{textoSerie(mejor, ejercicio)}</span>}
                </span>
              </div>

              {detalle && hechas.length > 0 && (
                <ol className="social-series">
                  {hechas.map((serie, i) => (
                    <li key={i}>
                      <span className="social-serie-numero">{ETIQUETAS_TIPO[serie.tipo] || i + 1}</span>
                      {textoSerie(serie, ejercicio)}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>

      {registro.ejercicios.length > 0 && (
        <button type="button" className="social-link" onClick={() => setDetalle(!detalle)}>
          {detalle
            ? "Ocultar series"
            : restantes > 0
              ? `Ver todas las series (+${restantes} ${restantes === 1 ? "ejercicio" : "ejercicios"})`
              : "Ver todas las series"}
        </button>
      )}

      <footer className="social-tarjeta-acciones">
        <button
          type="button"
          className={`social-accion ${registro.di_fuerza ? "activa" : ""}`}
          onClick={alternarFuerza}
          aria-pressed={Boolean(registro.di_fuerza)}
        >
          <IconoFuerza />
          {registro.di_fuerza ? "Diste fuerza" : "Dar fuerza"}
          {registro.fuerzas > 0 && <span className="social-contador">{registro.fuerzas}</span>}
        </button>
        <button
          type="button"
          className={`social-accion ${verComentarios ? "activa" : ""}`}
          onClick={() => setVerComentarios(!verComentarios)}
          aria-expanded={verComentarios}
        >
          <IconoComentario />
          Comentar
          {registro.comentarios > 0 && <span className="social-contador">{registro.comentarios}</span>}
        </button>
      </footer>

      {verComentarios && (
        <Comentarios
          registroId={registro.id}
          esDuenoDelEntrenamiento={esPropio}
          onCambioTotal={(total) => onActualizar?.({ ...registro, comentarios: total })}
        />
      )}
    </article>
  );
}
