import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../css/pagoExitoso.css";

function PagoExitoso() {
  const location = useLocation();
  const navigate = useNavigate();

  const pago = location.state?.pago;
  const fechaFin = location.state?.fechaFin;

  const formatearFecha = (fecha) => {
    if (!fecha) return "No disponible";

    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="pago-exitoso-page">
      <Navbar />

      <main className="pago-exitoso-container">

        <section className="pago-exitoso-card">

          <div className="pago-icono">
            ✓
          </div>

          <span className="pago-exitoso-badge">
            PAGO CONFIRMADO
          </span>

          <h1>
            ¡Pago exitoso!
          </h1>

          <p className="pago-exitoso-description">
            Tu pago fue procesado correctamente y tu plan ya está activo.
          </p>

          <div className="pago-detalles">

            <div className="detalle">
              <span>Plan adquirido</span>
              <strong>
                {pago?.plan?.toUpperCase() || "PRO"}
              </strong>
            </div>

            <div className="detalle">
              <span>Valor pagado</span>
              <strong>
                $
                {Number(pago?.precio || 0).toLocaleString("es-CO")}
                {" "}COP
              </strong>
            </div>

            <div className="detalle">
              <span>Método de pago</span>
              <strong>
                {pago?.metodo?.toUpperCase() || "TARJETA"}
              </strong>
            </div>

            <div className="detalle">
              <span>Referencia</span>
              <strong>
                {pago?.referencia || "No disponible"}
              </strong>
            </div>

            <div className="detalle">
              <span>Válido hasta</span>
              <strong>
                {formatearFecha(fechaFin)}
              </strong>
            </div>

          </div>

          <div className="pago-exitoso-actions">

            <button
              className="btn-dashboard"
              onClick={() => navigate("/dashboard")}
            >
              Ir al Dashboard
            </button>

            <button
              className="btn-planes"
              onClick={() => navigate("/planes")}
            >
              Ver mi plan
            </button>

          </div>

        </section>

      </main>
    </div>
  );
}

export default PagoExitoso;