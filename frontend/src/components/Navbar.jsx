import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function Navbar() {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

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
          <a href="#">Entrenamientos</a>
        </li>

        <li>
          <a href="#">Nutrición</a>
        </li>

        <li>
          <a href="#">Planes</a>
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
          <button
            className="btn-iniciar"
           onClick={cerrarSesion}
>
          Cerrar Sesión
          </button>
      )}
    </nav>
  );
}