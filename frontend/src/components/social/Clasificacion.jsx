import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { formatearNumero } from "../../utils/formato";
import Avatar from "./Avatar";

const METRICAS = [
  { id: "entrenamientos", nombre: "Sesiones", unidad: "" },
  { id: "minutos", nombre: "Minutos", unidad: " min" },
  { id: "volumen", nombre: "Kg", unidad: " kg" },
];
const MAX_FILAS = 5;

/** Esta semana: tú y la gente que sigues, ordenados por la métrica elegida. */
export default function Clasificacion() {
  const navigate = useNavigate();
  const [filas, setFilas] = useState(null);
  const [metrica, setMetrica] = useState("entrenamientos");

  useEffect(() => {
    let activo = true;
    api
      .get("/social/clasificacion/")
      .then((res) => activo && setFilas(res.data.resultados))
      .catch(() => activo && setFilas([]));
    return () => {
      activo = false;
    };
  }, []);

  if (!filas || filas.length === 0) return null;

  const unidad = METRICAS.find((m) => m.id === metrica).unidad;
  const ordenadas = [...filas].sort(
    (a, b) => b[metrica] - a[metrica] || b.entrenamientos - a.entrenamientos || a.usuario.username.localeCompare(b.usuario.username)
  );
  const visibles = ordenadas.slice(0, MAX_FILAS);
  const miPosicion = ordenadas.findIndex((f) => f.soy_yo);
  // Si quedas fuera del top, igual ves tu puesto al final
  if (miPosicion >= MAX_FILAS) visibles.push(ordenadas[miPosicion]);

  return (
    <section className="social-panel social-clasificacion">
      <h2 className="social-panel-titulo">Esta semana</h2>

      <div className="social-segmentado" role="group" aria-label="Ordenar por">
        {METRICAS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={metrica === m.id ? "activo" : ""}
            aria-pressed={metrica === m.id}
            onClick={() => setMetrica(m.id)}
          >
            {m.nombre}
          </button>
        ))}
      </div>

      {filas.length === 1 && <p className="social-vacio">Sigue a más personas para competir con ellas cada semana.</p>}

      <ol>
        {visibles.map((fila) => {
          const posicion = ordenadas.indexOf(fila) + 1;
          return (
            <li key={fila.usuario.id} className={fila.soy_yo ? "soy-yo" : ""}>
              <span className={`social-puesto puesto-${posicion}`}>{posicion}</span>
              <button type="button" className="social-clasif-usuario" onClick={() => navigate(`/perfil/${fila.usuario.username}`)}>
                <Avatar nombre={fila.usuario.nombre} />
                <span>{fila.soy_yo ? "Tú" : fila.usuario.nombre}</span>
              </button>
              <strong>
                {formatearNumero(fila[metrica])}
                {unidad}
              </strong>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
