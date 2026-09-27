import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../css/formularioPago.css";

function FormularioPago() {
  const location = useLocation();
  const navigate = useNavigate();

  const planSeleccionado = location.state?.plan || "pro";
  const precioSeleccionado = location.state?.precio || "19.900";

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const scriptExistente = document.querySelector(
      'script[src="https://checkout.wompi.co/widget.js"]'
    );

    if (!scriptExistente) {
      const script = document.createElement("script");

      script.src = "https://checkout.wompi.co/widget.js";
      script.async = true;

      document.body.appendChild(script);
    }
  }, []);

  const realizarPago = async (e) => {
    e.preventDefault();
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/auth?modo=login");
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch(
        "http://127.0.0.1:8000/api/pagos/wompi/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            plan: planSeleccionado,
          }),
        }
      );

      const data = await respuesta.json();

      console.log("STATUS WOMPI:", respuesta.status);
      console.log("RESPUESTA WOMPI:", data);

      if (!respuesta.ok) {
        throw new Error(
          data.error ||
            data.detail ||
            `Error del servidor (${respuesta.status})`
        );
      }

      if (!window.WidgetCheckout) {
        throw new Error(
          "El Widget de Wompi todavía no está disponible. Intenta nuevamente."
        );
      }

      console.log("DATOS ENVIADOS AL WIDGET:", {
        currency: data.currency,
        amountInCents: data.amount_in_cents,
        reference: data.reference,
        publicKey: data.public_key,
        signature: data.signature,
});

      const checkout = new window.WidgetCheckout({
        currency: data.currency,
        amountInCents: data.amount_in_cents,
        reference: data.reference,
        publicKey: data.public_key,
        signature: {
          integrity: data.signature,
        },
      });

      checkout.open(function (result) {
        console.log("RESPUESTA DEL WIDGET WOMPI:", result);

        const transaction = result.transaction;

        console.log("ID DE TRANSACCIÓN:", transaction.id);
        console.log("ESTADO:", transaction.status);

        if (transaction.status === "APPROVED") {
          alert(
            "El pago fue aprobado por Wompi.\n\n" +
              "La activación del plan se realizará mediante la confirmación del backend."
          );
        } else if (transaction.status === "DECLINED") {
          setError("El pago fue rechazado.");
        } else if (transaction.status === "VOIDED") {
          setError("El pago fue anulado.");
        } else {
          setError(
            `El pago terminó con estado: ${transaction.status}`
          );
        }
      });
    } catch (error) {
      console.error("Error preparando el pago:", error);
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
                $
                {Number(
                  precioSeleccionado.replace(".", "")
                ).toLocaleString("es-CO")}{" "}
                COP
              </strong>
            </div>
          </div>

          <form onSubmit={realizarPago}>

            <div className="pago-info">
              <p>
                Serás dirigido al proceso seguro de pago de Wompi.
              </p>

              <p>
                Tus datos de pago serán procesados directamente por Wompi.
              </p>
            </div>

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
              {cargando
                ? "Preparando pago..."
                : "Continuar con Wompi"}
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