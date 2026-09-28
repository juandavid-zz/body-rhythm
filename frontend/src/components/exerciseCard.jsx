import { useNavigate } from "react-router-dom";

const nombresGrupos = {
  chest: "Pecho",
  back: "Espalda",
  upper_legs: "Piernas",
  lower_legs: "Pantorrillas",
  shoulders: "Hombros",
  upper_arms: "Brazos",
  lower_arms: "Antebrazos",
  core: "Core",
  full_body: "Cuerpo completo",
};

const clasesGrupos = {
  chest: "pecho",
  back: "espalda",
  upper_legs: "piernas",
  lower_legs: "pantorrillas",
  shoulders: "hombros",
  upper_arms: "brazos",
  lower_arms: "antebrazos",
  core: "core",
  full_body: "cuerpo-completo",
};

function ExerciseCard({ ejercicio }) {
  const navigate = useNavigate();

  const grupoNombre =
    nombresGrupos[ejercicio.grupo] || ejercicio.grupo;

  const grupoClase =
    clasesGrupos[ejercicio.grupo] || "default";

  const abrirDetalle = () => {
    navigate(`/ejercicios/${ejercicio.id}`);
  };

  return (
    <article
      className="card"
      onClick={abrirDetalle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          abrirDetalle();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="card-image-wrapper">

        {ejercicio.imagen_inicio ? (
          <>
            <img
              src={ejercicio.imagen_inicio}
              alt={ejercicio.nombre}
              className="card-img card-img-start"
              loading="lazy"
            />

            {ejercicio.imagen_final && (
              <img
                src={ejercicio.imagen_final}
                alt=""
                className="card-img card-img-final"
                loading="lazy"
              />
            )}
          </>
        ) : (
          <div className="card-image-placeholder">
            <span>🏋️</span>
            <p>Imagen no disponible</p>
          </div>
        )}

      </div>

      <div className="card-content">

        <div className="card-top">
          <span
            className={`grupo-badge grupo-badge--${grupoClase}`}
          >
            {grupoNombre}
          </span>
        </div>

        <h3>{ejercicio.nombre}</h3>

        <p className="card-description">
          {ejercicio.descripcion ||
            "Consulta los detalles de este ejercicio."}
        </p>

        <div className="card-footer">
          <span>
            Ver detalles
          </span>

          <span className="card-arrow">
            →
          </span>
        </div>

      </div>
    </article>
  );
}

export default ExerciseCard;