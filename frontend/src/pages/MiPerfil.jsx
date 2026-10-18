import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/api";
import Navbar from "../components/Navbar";
import "../css/social.css";

// /perfil → redirige al perfil del usuario con sesión iniciada
export default function MiPerfil() {
  const [username, setUsername] = useState(localStorage.getItem("username"));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (username) return;
    api
      .get("/usuarios/me/")
      .then((res) => {
        localStorage.setItem("username", res.data.username);
        setUsername(res.data.username);
      })
      .catch(() => setError(true));
  }, [username]);

  if (username) return <Navigate to={`/perfil/${username}`} replace />;
  return (
    <>
      <Navbar />
      <main className="social-page">
        <p className="social-vacio">{error ? "No se pudo cargar tu perfil." : "Cargando…"}</p>
      </main>
    </>
  );
}
