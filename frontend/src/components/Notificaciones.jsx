import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { iniciales, tiempoRelativo } from "../utils/formato";

// Cada cuánto se revisa si hay avisos nuevos (solo con la pestaña visible)
const INTERVALO_MS = 60000;

function textoDe(aviso) {
  const entreno = aviso.registro ? `«${aviso.registro.nombre}»` : "tu entrenamiento";
  switch (aviso.tipo) {
    case "fuerza":
      return `le dio fuerza a ${entreno}`;
    case "comentario":
      return `comentó ${entreno}: “${aviso.comentario}”`;
    case "mencion":
      return `te mencionó: “${aviso.comentario}”`;
    case "seguidor":
      return "empezó a seguirte";
    case "solicitud":
      return "quiere seguirte";
    case "solicitud_aceptada":
      return "aceptó tu solicitud";
    default:
      return "";
  }
}

// A dónde lleva cada aviso al tocarlo
function destinoDe(aviso) {
  if (aviso.tipo === "solicitud") return "/comunidad";
  if (aviso.registro?.usuario) return `/perfil/${aviso.registro.usuario}`;
  return `/perfil/${aviso.actor.username}`;
}

const IconoCampana = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

/** Campana de la navbar: número de avisos sin leer y la lista al abrirla. */
export default function Notificaciones() {
  const navigate = useNavigate();
  const [noLeidas, setNoLeidas] = useState(0);
  const [abierta, setAbierta] = useState(false);
  const [avisos, setAvisos] = useState(null);
  const contenedor = useRef(null);

  // Contador: al entrar y cada minuto mientras la pestaña está visible
  useEffect(() => {
    let activo = true;
    const revisar = () => {
      if (document.hidden) return;
      api
        .get("/social/notificaciones/contador/")
        .then((res) => activo && setNoLeidas(res.data.no_leidas))
        .catch(() => {});
    };
    revisar();
    const id = setInterval(revisar, INTERVALO_MS);
    document.addEventListener("visibilitychange", revisar);
    return () => {
      activo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", revisar);
    };
  }, []);

  // Cerrar al tocar fuera o con Escape
  useEffect(() => {
    if (!abierta) return undefined;
    const cerrarFuera = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierta(false);
    };
    const cerrarEsc = (e) => e.key === "Escape" && setAbierta(false);
    document.addEventListener("mousedown", cerrarFuera);
    document.addEventListener("keydown", cerrarEsc);
    return () => {
      document.removeEventListener("mousedown", cerrarFuera);
      document.removeEventListener("keydown", cerrarEsc);
    };
  }, [abierta]);

  const abrir = async () => {
    if (abierta) {
      setAbierta(false);
      return;
    }
    setAbierta(true);
    try {
      const res = await api.get("/social/notificaciones/");
      setAvisos(res.data.resultados);
      if (res.data.no_leidas) {
        // Se ven como nuevas en esta apertura y quedan leídas para la próxima
        await api.post("/social/notificaciones/");
        setNoLeidas(0);
      }
    } catch {
      setAvisos([]);
    }
  };

  const ir = (aviso) => {
    setAbierta(false);
    navigate(destinoDe(aviso));
  };

  return (
    <div className="nav-notificaciones" ref={contenedor}>
      <button
        type="button"
        className="btn-campana"
        onClick={abrir}
        aria-label={noLeidas ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
        aria-expanded={abierta}
        title="Notificaciones"
      >
        <IconoCampana />
        {noLeidas > 0 && <span className="campana-contador">{noLeidas > 9 ? "9+" : noLeidas}</span>}
      </button>

      {abierta && (
        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
          <p className="notif-titulo">Notificaciones</p>
          {avisos === null && <p className="notif-vacio">Cargando…</p>}
          {avisos?.length === 0 && (
            <p className="notif-vacio">Aún no tienes avisos. Cuando alguien te siga o reaccione a tus entrenamientos, aparecerá aquí.</p>
          )}
          {avisos?.length > 0 && (
            <ul>
              {avisos.map((aviso) => (
                <li key={aviso.id}>
                  <button type="button" className={aviso.leida ? "" : "nueva"} onClick={() => ir(aviso)}>
                    <span className="notif-avatar" aria-hidden="true">{iniciales(aviso.actor.nombre)}</span>
                    <span className="notif-texto">
                      <span>
                        <strong>@{aviso.actor.username}</strong> {textoDe(aviso)}
                      </span>
                      <small>{tiempoRelativo(aviso.created_at)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
