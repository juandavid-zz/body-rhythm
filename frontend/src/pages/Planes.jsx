import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import "../css/planes.css";
import { useNavigate } from "react-router-dom";

const planes = [
  {
    nombre: "Free",
    precio: "0",
    descripcion: "Todo lo esencial para comenzar tu entrenamiento.",
    clase: "free",
    beneficios: [
      "Rutinas básicas",
      "Seguimiento de progreso",
      "Lista de ejercicios",
      "Perfil personalizado",
    ],
    boton: "Plan actual",
  },
  {
    nombre: "Pro",
    precio: "19.900",
    descripcion:
      "Más herramientas para llevar tu entrenamiento al siguiente nivel.",
    clase: "pro",
    destacado: true,
    beneficios: [
      "Todo lo incluido en Free",
      "Rutinas personalizadas",
      "Estadísticas avanzadas",
      "Seguimiento detallado",
      "Recomendaciones inteligentes",
    ],
    boton: "Elegir Pro",
  },
  {
    nombre: "Premium",
    precio: "29.900",
    descripcion: "La experiencia completa de Body Rhythm.",
    clase: "premium",
    beneficios: [
      "Todo lo incluido en Pro",
      "Entrenamientos ilimitados",
      "Planes personalizados",
      "Asistente de IA",
      "Funciones exclusivas",
      "Soporte prioritario",
    ],
    boton: "Elegir Premium",
  },
];

function Planes() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerUsuario = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setCargando(false);
        return;
      }

      try {
        const respuesta = await fetch(
          "http://127.0.0.1:8000/api/usuarios/me/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            data.detail || "No se pudo obtener la información del usuario."
          );
        }

        setUsuario(data);
      } catch (error) {
        console.error("Error obteniendo usuario:", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerUsuario();
  }, []);

  const seleccionarPlan = (plan) => {
    navigate("/pago", {
      state: {
        plan: plan.nombre.toLowerCase(),
        precio: plan.precio,
      },
    });
  };

  const planActual = usuario?.plan?.toLowerCase() || "free";

  return (
    <div className="planes-page">
      <Navbar />

      <main className="planes-container">

        {/* HERO */}
        <section className="planes-hero">
          <span className="planes-badge">BODY RHYTHM</span>

          <h1>
            Elige el plan que se adapte a <span>tu ritmo</span>
          </h1>

          <p>
            Mejora tu entrenamiento, sigue tu progreso y alcanza tus objetivos
            con las herramientas de Body Rhythm.
          </p>
        </section>

        {/* PLANES */}
        <section className="planes-grid">
          {planes.map((plan) => {
            const esPlanActual =
              plan.nombre.toLowerCase() === planActual;

            const niveles = {
              free: 0,
              pro: 1,
              premium: 2,
            };

            const nivelPlan = niveles[plan.nombre.toLowerCase()];
            const nivelActual = niveles[planActual];

            const esInferior = nivelPlan < nivelActual;

            return (
              <article
                key={plan.nombre}
                className={
                  "plan-card " +
                  plan.clase +
                  (plan.destacado ? " destacado" : "")
                }
              >

                {/* MÁS POPULAR */}
                {plan.destacado && (
                  <div className="plan-popular">
                    MÁS POPULAR
                  </div>
                )}

                {/* INFORMACIÓN */}
                <div className="plan-header">
                  <h2>{plan.nombre}</h2>

                  <p className="plan-description">
                    {plan.descripcion}
                  </p>

                  <div className="plan-price">
                    <span>$</span>
                    {plan.precio}
                    <small>COP / mes</small>
                  </div>
                </div>

                <div className="plan-divider"></div>

                {/* BENEFICIOS */}
                <ul className="plan-benefits">
                  {plan.beneficios.map((beneficio, index) => (
                    <li key={index}>
                      <span className="check">✓</span>
                      {beneficio}
                    </li>
                  ))}
                </ul>

                {/* BOTÓN */}
                <button
                  className={"plan-button " + plan.clase}
                  disabled={esPlanActual || esInferior || cargando}
                  onClick={() => seleccionarPlan(plan)}
                >
                  {cargando
                    ? "Cargando..."
                    : esPlanActual
                    ? "Plan actual"
                    : esInferior
                    ? "Incluido en tu plan"
                    : plan.boton}
                </button>

              </article>
            );
          })}
        </section>

        {/* INFORMACIÓN DEL PLAN ACTUAL */}
        {!cargando && usuario && (
          <section className="planes-bottom">

            <h3>
              Tu plan actual:{" "}
              <span>
                {usuario.plan?.toUpperCase() || "FREE"}
              </span>
            </h3>

            {usuario.fecha_fin_plan && (
              <p>
                Tu plan está activo hasta el{" "}
                <strong>
                  {new Date(
                    usuario.fecha_fin_plan
                  ).toLocaleDateString("es-CO")}
                </strong>
                .
              </p>
            )}

          </section>
        )}

      </main>
    </div>
  );
}

export default Planes;