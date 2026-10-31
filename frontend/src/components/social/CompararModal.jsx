import { useEffect, useState } from "react";
import api from "../../api/api";
import { formatearNumero } from "../../utils/formato";

const FILAS = [
  { id: "entrenamientos", nombre: "Entrenamientos" },
  { id: "minutos", nombre: "Minutos", unidad: " min" },
  { id: "volumen", nombre: "Volumen", unidad: " kg" },
  { id: "records", nombre: "Récords" },
  { id: "mejor_racha", nombre: "Mejor racha", unidad: (n) => (n === 1 ? " día" : " días") },
];

function formatoMarca(tipo, valor) {
  if (tipo === "peso") return `${formatearNumero(valor)} kg`;
  if (tipo === "reps") return `${valor} reps`;
  const min = Math.floor(valor / 60);
  return `${min}:${String(valor % 60).padStart(2, "0")}`;
}

// Quién va ganando en una fila: "yo", "otro" o "" si empatan
// Unidad de una fila: texto fijo o función del valor (para singular/plural)
const conUnidad = (fila, valor) =>
  formatearNumero(valor) + (typeof fila.unidad === "function" ? fila.unidad(valor) : fila.unidad || "");

const ganador = (a, b) => (a > b ? "yo" : b > a ? "otro" : "");

/** Tus números frente a los de otra persona, y su mejor marca en ejercicios que ambos hacen. */
export default function CompararModal({ username, onCerrar }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    api
      .get(`/social/perfiles/${username}/comparar/`)
      .then((res) => activo && setDatos(res.data))
      .catch((e) => activo && setError(e.response?.data?.error || "No se pudo comparar."));
    return () => {
      activo = false;
    };
  }, [username]);

  return (
    <div className="social-modal-fondo" onClick={onCerrar}>
      <div
        className="social-modal social-comparar"
        role="dialog"
        aria-modal="true"
        aria-label={`Comparar con @${username}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>Tú vs @{username}</h2>
          <button type="button" className="social-modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>

        {!datos && !error && <p className="social-vacio">Cargando…</p>}
        {error && <p className="social-vacio">{error}</p>}

        {datos && (
          <>
            <table className="social-comparar-tabla">
              <thead>
                <tr>
                  <th />
                  <th>Tú</th>
                  <th>{datos.otro.nombre.split(" ")[0]}</th>
                </tr>
              </thead>
              <tbody>
                {FILAS.map((fila) => {
                  const gana = ganador(datos.yo[fila.id], datos.otro[fila.id]);
                  return (
                    <tr key={fila.id}>
                      <th scope="row">{fila.nombre}</th>
                      <td className={gana === "yo" ? "gana" : ""}>
                        {conUnidad(fila, datos.yo[fila.id])}
                      </td>
                      <td className={gana === "otro" ? "gana" : ""}>
                        {conUnidad(fila, datos.otro[fila.id])}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <h3 className="social-comparar-sub">Ejercicios en común</h3>
            {datos.ejercicios_en_comun.length === 0 ? (
              <p className="social-vacio">Todavía no han hecho los mismos ejercicios.</p>
            ) : (
              <table className="social-comparar-tabla">
                <tbody>
                  {datos.ejercicios_en_comun.map((e) => {
                    const gana = ganador(e.yo, e.otro);
                    return (
                      <tr key={e.nombre}>
                        <th scope="row">{e.nombre}</th>
                        <td className={gana === "yo" ? "gana" : ""}>{formatoMarca(e.tipo, e.yo)}</td>
                        <td className={gana === "otro" ? "gana" : ""}>{formatoMarca(e.tipo, e.otro)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <p className="social-comparar-nota">De la otra persona solo cuentan los entrenamientos que comparte.</p>
          </>
        )}
      </div>
    </div>
  );
}
