import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Notificaciones from "./Notificaciones";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const logueado = !!token;

  const cerrarSesion = async () => {
    const resultado = await Swal.fire({
      title: "Cerrar sesión",
      text: "¿Estás seguro de que deseas cerrar sesión?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#50118c",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
    });

    if (resultado.isConfirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("nombre");
      localStorage.removeItem("username");

      await Swal.fire({
        title: "Sesión cerrada",
        text: "Has cerrado sesión correctamente.",
        icon: "success",
        confirmButtonColor: "#50118c",
      });

      navigate("/");
      window.location.reload();
    }
  };

  const irAEntrenamientos = () => {
    if (logueado) {
      navigate("/dashboard");
    } else {
      navigate("/auth?modo=login");
    }
  };

  const irANutricion = () => {
    if (logueado) {
      navigate("/nutricion");
    } else {
      navigate("/auth?modo=login");
    }
  };

  const irARutinas = () => {
    if (logueado) {
      navigate("/rutinas");
    } else {
      navigate("/auth?modo=login");
    }
  };

  return (
    <nav>
      <a href="/" className="logo">
        Body <span>Rhythm</span>
      </a>

      <ul className="nav-links">
        <li>
          <a href="/">Inicio</a>
        </li>

        {token && (
          <li>
            <a href="/ejercicios">Ejercicios</a>
          </li>
        )}

        <li>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              irAEntrenamientos();
            }}
          >
            Entrenamientos
          </a>
        </li>

        <li>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              irANutricion();
            }}
          >
            Nutrición
          </a>
        </li>

        <li>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              irARutinas();
            }}
          >
            Rutinas
          </a>
        </li>
        {token && (
          <li>
            <a href="/comunidad">Comunidad</a>
          </li>
        )}

<li>
  <a
    href="/planes"
    onClick={(e) => {
      e.preventDefault();
      navigate("/planes");
    }}
  >
    Planes
  </a>
</li>
      </ul>

      {!token ? (
        <>
          <button
            className="btn-iniciar"
            onClick={() => navigate("/auth?modo=login")}
          >
            Iniciar Sesión
          </button>

          <button
            className="btn-registro"
            onClick={() => navigate("/auth?modo=registro")}
          >
            Regístrate
          </button>
        </>
      ) : (
        <>
          <Notificaciones />
          <button
            type="button"
            className="btn-configuracion"
            onClick={() => navigate("/configuracion")}
            aria-label="Configuración"
            title="Configuración"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
          <button className="btn-iniciar" onClick={cerrarSesion}>
            Cerrar Sesión
          </button>
        </>
      )}
    </nav>
  );
}
