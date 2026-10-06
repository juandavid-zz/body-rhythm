import { useNavigate } from "react-router-dom";

const nombresGrupos = {
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  abdomen: "Core",
  cuadriceps: "Cuádriceps",
  femoral: "Femoral",
  gluteos: "Glúteos",
  pantorrillas: "Pantorrillas",
  cardio: "Cardio",
  cuerpo_completo: "Cuerpo completo",
};

const clasesGrupos = {
  pecho: "pecho",
  espalda: "espalda",
  hombros: "hombros",
  biceps: "brazos",
  triceps: "brazos",
  abdomen: "core",
  cuadriceps: "piernas",
  femoral: "piernas",
  gluteos: "piernas",
  pantorrillas: "pantorrillas",
  cardio: "cardio",
  cuerpo_completo: "cuerpo-completo",
};

function ExerciseCard({ ejercicio }) {
  const navigate = useNavigate();

  const grupo = ejercicio.grupo_muscular;

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
          event.preventDefault();
          abrirDetalle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalles de ${ejercicio.nombre}`}
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

            <div className="card-image-gradient" />
          </>
        ) : (
          <div className="card-image-placeholder">
            <span>🏋️</span>
            <p>Imagen no disponible</p>
          </div>
        )}

        <span
          className={`grupo-badge grupo-badge--${grupoClase}`}
        >
          {grupoNombre}
        </span>

        <div className="card-view">
          <span>Ver ejercicio</span>
          <span>↗</span>
        </div>
      </div>

      <div className="card-content">

        <div className="card-heading">
          <h3>{ejercicio.nombre}</h3>

        </div>

        <p className="card-description">
          {ejercicio.descripcion ||
            "Consulta los detalles de este ejercicio."}
        </p>

      </div>
    </article>
  );
}

export default ExerciseCard;