import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../css/formularioPago.css";

function FormularioPago() {
  const location = useLocation();
  const navigate = useNavigate();

  const planSeleccionado = location.state?.plan || "pro";
  const precioSeleccionado = location.state?.precio || "19.900";

  const [metodo, setMetodo] = useState("tarjeta");
  const [numeroTarjeta, setNumeroTarjeta] = useState("");
  const [nombreTitular, setNombreTitular] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [cvv, setCvv] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const generarReferencia = () => {
    return `BR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  };

  const realizarPago = async (e) => {
    e.preventDefault();
    setError("");

    if (metodo === "tarjeta") {
      if (
        !numeroTarjeta ||
        !nombreTitular ||
        !fechaVencimiento ||
        !cvv
      ) {
        setError("Completa todos los datos de la tarjeta.");
        return;
      }
    }

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/auth?modo=login");
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch("http://127.0.0.1:8000/api/pagos/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: planSeleccionado,
          precio: precioSeleccionado.replace(".", ""),
          metodo,
          referencia: generarReferencia(),
        }),
      });

        const data = await respuesta.json();

        console.log("STATUS:", respuesta.status);
        console.log("RESPUESTA DEL BACKEND:", data);

        if (!respuesta.ok) {
        throw new Error(
            data.error ||
            data.detail ||
            `Error del servidor (${respuesta.status})`
        );
        }

        navigate("/pago-exitoso", {
        state: {
            pago: data.pago,
            fechaFin: data.fecha_fin,
    },
});
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="pago-page">
      <Navbar />

      <main className="pago-container">

        <section className="pago-card">

          <div className="pago-header">
            <span>BODY RHYTHM</span>

            <h1>Completa tu pago</h1>

            <p>
              Estás adquiriendo el plan{" "}
              <strong>{planSeleccionado.toUpperCase()}</strong>.
            </p>
          </div>

          <div className="pago-resumen">
            <div>
              <span>Plan seleccionado</span>
              <strong>{planSeleccionado.toUpperCase()}</strong>
            </div>

            <div>
              <span>Total</span>
              <strong>
                ${Number(
                  precioSeleccionado.replace(".", "")
                ).toLocaleString("es-CO")} COP
              </strong>
            </div>
          </div>

          <form onSubmit={realizarPago}>

            <div className="metodos-pago">

              <button
                type="button"
                className={metodo === "tarjeta" ? "metodo activo" : "metodo"}
                onClick={() => setMetodo("tarjeta")}
              >
                Tarjeta
              </button>

              <button
                type="button"
                className={metodo === "pse" ? "metodo activo" : "metodo"}
                onClick={() => setMetodo("pse")}
              >
                PSE
              </button>

            </div>

            {metodo === "tarjeta" && (
              <div className="datos-tarjeta">

                <label>
                  Número de tarjeta
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={numeroTarjeta}
                    onChange={(e) => setNumeroTarjeta(e.target.value)}
                    maxLength="19"
                  />
                </label>

                <label>
                  Nombre del titular
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={nombreTitular}
                    onChange={(e) => setNombreTitular(e.target.value)}
                  />
                </label>

                <div className="pago-row">

                  <label>
                    Vencimiento
                    <input
                      type="text"
                      placeholder="MM/AA"
                      value={fechaVencimiento}
                      onChange={(e) =>
                        setFechaVencimiento(e.target.value)
                      }
                      maxLength="5"
                    />
                  </label>

                  <label>
                    CVV
                    <input
                      type="password"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      maxLength="4"
                    />
                  </label>

                </div>

              </div>
            )}

            {metodo === "pse" && (
              <div className="pse-info">
                <p>
                  Serás dirigido al proceso de pago mediante PSE.
                </p>
              </div>
            )}

            {error && (
              <div className="pago-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-pagar"
              disabled={cargando}
            >
              {cargando ? "Procesando..." : "Confirmar pago"}
            </button>

          </form>

          <button
            type="button"
            className="btn-volver"
            onClick={() => navigate("/planes")}
          >
            ← Volver a planes
          </button>

        </section>

      </main>
    </div>
  );
}

export default FormularioPago;