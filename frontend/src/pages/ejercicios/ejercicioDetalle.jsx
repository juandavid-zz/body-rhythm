import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../css/ejercicios.css";

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

const nombresMusculos = {
  rectus_abdominis: "Recto abdominal",
  transverse_abdominis: "Transverso abdominal",
  obliques: "Oblicuos",
  anterior_deltoid: "Deltoides anterior",
  lateral_deltoid: "Deltoides lateral",
  posterior_deltoid: "Deltoides posterior",
  pectoralis_major: "Pectoral mayor",
  latissimus_dorsi: "Dorsal ancho",
  trapezius: "Trapecio",
  biceps_brachii: "Bíceps",
  triceps_brachii: "Tríceps",
  brachialis: "Braquial",
  brachioradialis: "Braquiorradial",
  gluteus_maximus: "Glúteo mayor",
  gluteus_medius: "Glúteo medio",
  quadriceps: "Cuádriceps",
  hamstrings: "Isquiotibiales",
  calves: "Pantorrillas",
  gastrocnemius: "Gastrocnemio",
  soleus: "Sóleo",
  hip_flexors: "Flexores de cadera",
  adductors: "Aductores",
  abductors: "Abductores",
  erector_spinae: "Erectores espinales",
  serratus_anterior: "Serrato anterior",
  forearms: "Antebrazos",
};

function traducirMusculo(musculo) {
  return nombresMusculos[musculo] || musculo;
}

export default function EjercicioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ejercicio, setEjercicio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [imagenActiva, setImagenActiva] = useState("inicio");

  // ==========================================
  // CARGAR EJERCICIO
  // ==========================================

  useEffect(() => {
    const cargarEjercicio = async () => {
      try {
        setCargando(true);
        setError("");

        const response = await fetch(
          "http://127.0.0.1:8000/api/ejercicios/"
        );

        if (!response.ok) {
          throw new Error("No se pudieron cargar los ejercicios");
        }

        const data = await response.json();

        const encontrado = data.find(
          (item) => Number(item.id) === Number(id)
        );

        if (!encontrado) {
          setError("Ejercicio no encontrado");
          return;
        }

        setEjercicio(encontrado);
      } catch (error) {
        console.error("Error al cargar ejercicio:", error);
        setError("No se pudo cargar el ejercicio.");
      } finally {
        setCargando(false);
      }
    };

    cargarEjercicio();
  }, [id]);

  // ==========================================
  // ANIMACIÓN AUTOMÁTICA
  // ==========================================

  useEffect(() => {
    if (!ejercicio?.imagen_inicio || !ejercicio?.imagen_final) {
      return;
    }

    const intervalo = setInterval(() => {
      setImagenActiva((actual) =>
        actual === "inicio" ? "final" : "inicio"
      );
    }, 1200);

    return () => clearInterval(intervalo);
  }, [ejercicio]);

  // ==========================================
  // LOADING
  // ==========================================

  if (cargando) {
    return (
      <div className="detalle-page">
        <div className="detalle-loading">
          <div className="detalle-spinner"></div>
          <p>Cargando ejercicio...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error || !ejercicio) {
    return (
      <div className="detalle-page">
        <div className="detalle-error">
          <div className="detalle-error-icon">!</div>

          <h2>{error || "Ejercicio no encontrado"}</h2>

          <button
            type="button"
            onClick={() => navigate("/ejercicios")}
          >
            ← Volver a ejercicios
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // DATOS
  // ==========================================

  const {
    nombre,
    grupo,
    descripcion,
    imagen_inicio,
    imagen_final,
    musculos_principales = [],
    musculos_secundarios = [],
  } = ejercicio;

  const grupoNombre = nombresGrupos[grupo] || grupo;

  const imagenMostrar =
    imagenActiva === "final"
      ? imagen_final
      : imagen_inicio;

  return (
    <div className="detalle-page">
      <div className="detalle-wrapper">

        {/* BOTÓN VOLVER */}

        <button
          type="button"
          className="detalle-back"
          onClick={() => navigate("/ejercicios")}
        >
          <span>←</span>
          Volver a ejercicios
        </button>

        <main className="detalle-layout">

          {/* ==========================================
              IMAGEN
          ========================================== */}

          <section className="detalle-visual">

            <div className="detalle-image-wrapper">

              {imagenMostrar ? (
                <img
                  src={imagenMostrar}
                  alt={nombre}
                  className="detalle-image"
                />
              ) : (
                <div className="detalle-image-placeholder">
                  <span>🏋️</span>
                  <p>Imagen no disponible</p>
                </div>
              )}

              <div className="detalle-image-badge">
                <span></span>
                Movimiento automático
              </div>

            </div>

          </section>

          {/* ==========================================
              INFORMACIÓN
          ========================================== */}

          <section className="detalle-info">

            <div className="detalle-heading">

              <span className="detalle-overline">
                BODY RHYTHM · EJERCICIO
              </span>

              <h1>{nombre}</h1>

              <span className="detalle-group">
                {grupoNombre}
              </span>

            </div>

            {/* DESCRIPCIÓN */}

            <div className="detalle-description">

              <h2>Descripción</h2>

              <p>
                {descripcion ||
                  "No hay una descripción disponible para este ejercicio."}
              </p>

            </div>

            {/* MÚSCULOS */}

            <div className="detalle-data-grid">

              {/* PRINCIPALES */}

              <div className="detalle-data-card">

                <div className="data-card-header">

                  <span className="data-icon data-icon-primary">
                    ●
                  </span>

                  <div>
                    <h3>Músculos principales</h3>
                    <span>Trabajo principal</span>
                  </div>

                </div>

                <div className="tag-list">

                  {musculos_principales.length > 0 ? (
                    musculos_principales.map(
                      (musculo, index) => (
                        <span
                          className="muscle-tag primary"
                          key={`${musculo}-${index}`}
                        >
                          {traducirMusculo(musculo)}
                        </span>
                      )
                    )
                  ) : (
                    <span className="data-empty">
                      No especificado
                    </span>
                  )}

                </div>

              </div>

              {/* SECUNDARIOS */}

              <div className="detalle-data-card">

                <div className="data-card-header">

                  <span className="data-icon data-icon-secondary">
                    ◦
                  </span>

                  <div>
                    <h3>Músculos secundarios</h3>
                    <span>Trabajo complementario</span>
                  </div>

                </div>

                <div className="tag-list">

                  {musculos_secundarios.length > 0 ? (
                    musculos_secundarios.map(
                      (musculo, index) => (
                        <span
                          className="muscle-tag secondary"
                          key={`${musculo}-${index}`}
                        >
                          {traducirMusculo(musculo)}
                        </span>
                      )
                    )
                  ) : (
                    <span className="data-empty">
                      No especificado
                    </span>
                  )}

                </div>

              </div>

            </div>

            {/* ==========================================
                AGREGAR A RUTINA
            ========================================== */}

            <div className="detalle-action">

              <button
                type="button"
                className="btn-rutina"
                onClick={() => {
                  console.log(
                    "Agregar ejercicio a rutina:",
                    ejercicio
                  );
                }}
              >
                <span className="btn-rutina-icon">
                  +
                </span>

                <span>
                  Agregar a mi rutina
                </span>

                <span className="btn-rutina-arrow">
                  →
                </span>
              </button>

            </div>

          </section>

        </main>

      </div>
    </div>
  );
}