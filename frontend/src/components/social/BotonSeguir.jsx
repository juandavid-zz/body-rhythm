import { useState } from "react";
import Swal from "sweetalert2";
import api from "../../api/api";

const TEXTOS = {
  ninguna: "Seguir",
  pendiente: "Solicitado",
  siguiendo: "Siguiendo",
};

/**
 * Botón de seguir con aprobación:
 * ninguna → envía solicitud · pendiente → la cancela · siguiendo → deja de seguir (con confirmación)
 */
export default function BotonSeguir({ usuario, onCambio }) {
  const [enviando, setEnviando] = useState(false);
  const { username, relacion } = usuario;

  if (relacion === "yo") return null;

  const alternar = async (evento) => {
    evento.stopPropagation();

    if (relacion === "siguiendo") {
      const { isConfirmed } = await Swal.fire({
        title: `¿Dejar de seguir a @${username}?`,
        text: "Sus entrenamientos dejarán de aparecer en tu feed.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#50118c",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Dejar de seguir",
        cancelButtonText: "Cancelar",
      });
      if (!isConfirmed) return;
    }

    setEnviando(true);
    try {
      if (relacion === "ninguna") {
        const res = await api.post(`/social/perfiles/${username}/seguir/`);
        onCambio?.(res.data.estado === "aceptado" ? "siguiendo" : "pendiente");
      } else {
        await api.delete(`/social/perfiles/${username}/seguir/`);
        onCambio?.("ninguna");
      }
    } catch (error) {
      Swal.fire({
        title: "No se pudo completar",
        text: error.response?.data?.error || "Intenta de nuevo en unos segundos.",
        icon: "error",
        confirmButtonColor: "#50118c",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <button
      type="button"
      className={`social-btn-seguir ${relacion}`}
      onClick={alternar}
      disabled={enviando}
    >
      {enviando ? "…" : TEXTOS[relacion] || "Seguir"}
    </button>
  );
}
