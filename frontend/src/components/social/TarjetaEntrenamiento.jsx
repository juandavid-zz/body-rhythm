import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { formatearDuracion, formatearNumero, tiempoRelativo } from "../../utils/formato";
import Avatar from "./Avatar";

// Mismas etiquetas que en la pantalla de registrar entrenamiento
const ETIQUETAS_TIPO = {
  calentamiento: "W",
  fallo: "F",
  drop: "D",
};

function TextoSerie({ serie, ejercicio }) {
  if (ejercicio.por_tiempo) {
    return <span>{formatearDuracion(serie.duracion_segundos)}</span>;
  }

  const peso = serie.peso ?? serie.peso_kg;
  const unidad = serie.peso != null ? ejercicio.unidad_peso || "kg" : "kg";

  return (
    <span>
      {peso != null ? (
        <>
          <strong>{formatearNumero(peso)} {unidad}</strong> × {serie.reps ?? 0} reps
        </>
      ) : (
        <>{serie.reps ?? 0} reps</>
      )}
    </span>
  );
}

/**
 * Entrenamiento terminado con sus ejercicios y series (peso × repeticiones).
 * `mostrarAutor` se usa en el feed; `esPropio` permite cambiar si se comparte.
 */
export default function TarjetaEntrenamiento({ registro, mostrarAutor = false, esPropio = false, onActualizar }) {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const alternarCompartido = async () => {
    setGuardando(true);
    try {
      const res = await api.patch(`/entrenamientos/registros/${registro.id}/`, {
        compartido: !registro.compartido,
      });
      onActualizar?.({ ...registro, ...res.data });
    } catch (error) {
      console.error("No se pudo cambiar la privacidad:", error);
    } finally {
      setGuardando(false);
    }
  };

  const ejerciciosVisibles = abierto ? registro.ejercicios : registro.ejercicios.slice(0, 3);

  return (
    <article className="social-tarjeta">
      <header className="social-tarjeta-cabecera">
        {mostrarAutor && (
          <button
            type="button"
            className="social-tarjeta-autor"
            onClick={() => navigate(`/perfil/${registro.usuario.username}`)}
          >
            <Avatar nombre={registro.usuario.nombre} />
            <span>
              <strong>{registro.usuario.nombre}</strong>
              <span>@{registro.usuario.username}</span>
            </span>
          </button>
        )}
        <time dateTime={registro.fecha} title={new Date(registro.fecha).toLocaleString("es")}>
          {tiempoRelativo(registro.fecha)}
        </time>
      </header>

      <h3>{registro.nombre}</h3>

      <ul className="social-tarjeta-stats">
        <li><span>Duración</span><strong>{formatearDuracion(registro.duracion_segundos)}</strong></li>
        <li><span>Series</span><strong>{registro.series_completadas}/{registro.series_totales}</strong></li>
        <li><span>Volumen</span><strong>{formatearNumero(registro.volumen_kg)} kg</strong></li>
      </ul>

      <ol className="social-ejercicios">
        {ejerciciosVisibles.map((ejercicio, indice) => {
          const hechas = ejercicio.series.filter((serie) => serie.hecho);
          return (
            <li key={`${ejercicio.nombre}-${indice}`}>
              <h4>{ejercicio.nombre}</h4>
              {hechas.length ? (
                <ol className="social-series">
                  {hechas.map((serie, i) => (
                    <li key={i}>
                      <span className="social-serie-numero">
                        {ETIQUETAS_TIPO[serie.tipo] || i + 1}
                      </span>
                      <TextoSerie serie={serie} ejercicio={ejercicio} />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="social-sin-series">Sin series completadas</p>
              )}
            </li>
          );
        })}
      </ol>

      <footer className="social-tarjeta-pie">
        {registro.ejercicios.length > 3 && (
          <button type="button" className="social-link" onClick={() => setAbierto(!abierto)}>
            {abierto ? "Ver menos" : `Ver los ${registro.ejercicios.length} ejercicios`}
          </button>
        )}
        {esPropio && (
          <button
            type="button"
            className={`social-privacidad ${registro.compartido ? "" : "privado"}`}
            onClick={alternarCompartido}
            disabled={guardando}
            title="Elige si tus seguidores pueden ver este entrenamiento"
          >
            {registro.compartido ? "👥 Visible para seguidores" : "🔒 Solo yo"}
          </button>
        )}
      </footer>
    </article>
  );
}
