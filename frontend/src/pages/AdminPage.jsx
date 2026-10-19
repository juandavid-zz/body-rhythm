import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Navbar from "../components/Navbar";
import "../css/configuracion.css";

// El panel de administración real es el de Django (usuarios, ejercicios, rutinas,
// pagos, comunidad...). Antes esta página era una maqueta que no cargaba nada.
const URL_ADMIN_DJANGO = "http://127.0.0.1:8000/admin/";

export default function AdminPage() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState("cargando"); // cargando | admin | sin-acceso

  useEffect(() => {
    let activo = true;
    api
      .get("/usuarios/me/")
      .then((res) => activo && setEstado(res.data.es_admin ? "admin" : "sin-acceso"))
      .catch(() => activo && setEstado("sin-acceso"));
    return () => {
      activo = false;
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="cfg-page">
        <div className="cfg-contenedor">
          <h1>Administración</h1>

          {estado === "cargando" && <p className="cfg-nota">Cargando…</p>}

          {estado === "admin" && (
            <section className="cfg-panel">
              <h2>Panel de administración</h2>
              <p className="cfg-nota">
                Gestiona usuarios, ejercicios de la biblioteca, rutinas, pagos, planes de nutrición
                y la comunidad desde el panel de Django.
              </p>
              <div className="cfg-pie">
                <a className="cfg-btn primario" href={URL_ADMIN_DJANGO} target="_blank" rel="noreferrer">
                  Abrir el panel
                </a>
              </div>
            </section>
          )}

          {estado === "sin-acceso" && (
            <section className="cfg-panel">
              <h2>No tienes acceso</h2>
              <p className="cfg-nota">Esta sección es solo para administradores de Body Rhythm.</p>
              <div className="cfg-pie">
                <button type="button" className="cfg-btn" onClick={() => navigate("/")}>
                  Volver al inicio
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
