import { useNavigate, useParams } from "react-router-dom";
import { ejercicios } from "../../data/ejercicios";
import "../../css/ejercicios.css";

export default function EjercicioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const ejercicio = ejercicios.find(
    (e) => e.id === Number(id)
  );

  if (!ejercicio) {
    return <h2>Ejercicio no encontrado</h2>;
  }

  return (
    <div className="detalle-container">
      <button onClick={() => navigate("/ejercicios")}>
        ← Volver
      </button>

      <div className="detalle-card">
        <h1>{ejercicio.nombre}</h1>

        <p className="grupo-badge">
          {ejercicio.grupo}
        </p>

        <img
          src={ejercicio.imagen}
          alt={ejercicio.nombre}
          className="ejercicio-gif"
        />

        <p className="descripcion">
          <strong>Descripción:</strong>{" "}
          {ejercicio.descripcion}
        </p>

        {ejercicio.musculosPrincipales && (
          <section className="detalle-seccion">
            <h2>Músculos principales</h2>

            <ul>
              {ejercicio.musculosPrincipales.map((musculo) => (
                <li key={musculo}>{musculo}</li>
              ))}
            </ul>
          </section>
        )}

        {ejercicio.musculosSecundarios && (
          <section className="detalle-seccion">
            <h2>Músculos secundarios</h2>

            <ul>
              {ejercicio.musculosSecundarios.map((musculo) => (
                <li key={musculo}>{musculo}</li>
              ))}
            </ul>
          </section>
        )}

        {ejercicio.equipamiento && (
          <section className="detalle-seccion">
            <h2>Equipamiento</h2>
            <p>{ejercicio.equipamiento}</p>
          </section>
        )}

        {ejercicio.instrucciones && (
          <section className="detalle-seccion">
            <h2>¿Cómo ejecutarlo?</h2>

            <ol>
              {ejercicio.instrucciones.map((paso, index) => (
                <li key={index}>{paso}</li>
              ))}
            </ol>
          </section>
        )}

        {ejercicio.erroresComunes && (
          <section className="detalle-seccion">
            <h2>Errores comunes</h2>

            <ul>
              {ejercicio.erroresComunes.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        )}

        {ejercicio.consejos && (
          <section className="detalle-seccion">
            <h2>Consejos</h2>

            <ul>
              {ejercicio.consejos.map((consejo) => (
                <li key={consejo}>{consejo}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}