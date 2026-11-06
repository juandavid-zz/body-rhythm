import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api/api";
import Notificaciones from "./Notificaciones";
import Avatar from "./social/Avatar";
import Logo from "./Logo";
import "../css/navbar.css";

// Secciones de la barra. "privada": sin sesión lleva a iniciar sesión.
// "soloConSesion": ni se muestra si no hay sesión.
const SECCIONES = [
  { ruta: "/", texto: "Inicio", icono: "inicio" },
  { ruta: "/ejercicios", texto: "Ejercicios", icono: "ejercicios", soloConSesion: true },
  { ruta: "/dashboard", texto: "Entrenamientos", icono: "entrenar", privada: true, tambien: ["/progreso", "/chatbot"] },
  { ruta: "/nutricion", texto: "Nutrición", icono: "nutricion", privada: true },
  { ruta: "/rutinas", texto: "Rutinas", icono: "rutinas", privada: true },
  { ruta: "/comunidad", texto: "Comunidad", icono: "comunidad", soloConSesion: true, tambien: ["/perfil"] },
  { ruta: "/planes", texto: "Planes", icono: "planes", tambien: ["/pago"] },
];

const TRAZOS = {
  inicio: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  ejercicios: "M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11",
  entrenar: "M13 2 4.5 13.5H12L11 22l8.5-11.5H12z",
  nutricion: "M12 7c-2-3-7-3-7 2 0 6 4 11 7 11s7-5 7-11c0-5-5-5-7-2zM12 7c0-2 1-4 3-5",
  rutinas: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  comunidad: "M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  planes: "M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z",
  perfil: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  ajustes: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  salir: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3",
  progreso: "M3 3v18h18M7 15l4-4 3 3 6-7",
  flecha: "M9 6l6 6-6 6",
};

function Icono({ nombre }) {
  return (
    <svg className="nav-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

// La foto de perfil se pide una sola vez por sesión y la comparten todas las páginas
let perfilCache = null;
function obtenerPerfil() {
  if (!perfilCache) {
    perfilCache = api.get("/usuarios/me/").then((res) => res.data).catch(() => {
      perfilCache = null;
      return null;
    });
  }
  return perfilCache;
}

const esActiva = (seccion, ruta) =>
  [seccion.ruta, ...(seccion.tambien || [])].some((r) =>
    r === "/" ? ruta === "/" : ruta === r || ruta.startsWith(`${r}/`)
  );

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const logueado = Boolean(localStorage.getItem("token"));
  const nombre = localStorage.getItem("nombre") || "";
  const username = localStorage.getItem("username") || "";

  const [foto, setFoto] = useState(null);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [panelMovil, setPanelMovil] = useState(false);
  const [conScroll, setConScroll] = useState(false);
  const [pildora, setPildora] = useState(null);

  const pista = useRef(null);
  const enlaces = useRef({});
  const usuario = useRef(null);

  const secciones = SECCIONES.filter((s) => logueado || !s.soloConSesion);
  const activa = secciones.find((s) => esActiva(s, pathname));

  useEffect(() => {
    if (!logueado) return;
    let vivo = true;
    obtenerPerfil().then((perfil) => vivo && setFoto(perfil?.foto || null));
    return () => {
      vivo = false;
    };
  }, [logueado]);

  // La barra se vuelve más sólida cuando la página baja
  useEffect(() => {
    const revisar = () => setConScroll(window.scrollY > 8);
    revisar();
    window.addEventListener("scroll", revisar, { passive: true });
    return () => window.removeEventListener("scroll", revisar);
  }, []);

  // La píldora se coloca bajo la sección activa (o la que tiene el mouse encima)
  const moverPildora = (ruta) => {
    const el = ruta && enlaces.current[ruta];
    if (!el || !pista.current) {
      setPildora(null);
      return;
    }
    setPildora({ left: el.offsetLeft, width: el.offsetWidth });
  };

  useLayoutEffect(() => {
    moverPildora(activa?.ruta);
    const alCambiarTamano = () => moverPildora(activa?.ruta);
    window.addEventListener("resize", alCambiarTamano);
    return () => window.removeEventListener("resize", alCambiarTamano);
  }, [activa?.ruta, logueado]);

  // Menú del usuario: se cierra al tocar fuera o con Escape
  useEffect(() => {
    if (!menuUsuario) return;
    const fuera = (e) => {
      if (usuario.current && !usuario.current.contains(e.target)) setMenuUsuario(false);
    };
    const escape = (e) => e.key === "Escape" && setMenuUsuario(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [menuUsuario]);

  // Panel del celular: bloquea el scroll de la página mientras está abierto
  useEffect(() => {
    if (!panelMovil) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (e) => e.key === "Escape" && setPanelMovil(false);
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", escape);
    };
  }, [panelMovil]);

  const ir = (seccion) => {
    setPanelMovil(false);
    setMenuUsuario(false);
    if (seccion.privada && !logueado) {
      navigate("/auth?modo=login");
      return;
    }
    navigate(seccion.ruta);
  };

  const cerrarSesion = async () => {
    setMenuUsuario(false);
    setPanelMovil(false);
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
      perfilCache = null;

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

  const opcionesUsuario = [
    { texto: "Mi perfil", icono: "perfil", accion: () => navigate(username ? `/perfil/${username}` : "/perfil") },
    { texto: "Mi progreso", icono: "progreso", accion: () => navigate("/progreso") },
    { texto: "Configuración", icono: "ajustes", accion: () => navigate("/configuracion") },
  ];

  return (
    <header className={`br-nav${conScroll ? " br-nav--scroll" : ""}`}>
      <nav className="br-nav-barra" aria-label="Principal">
        <a
          href="/"
          className="br-nav-marca"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          <Logo />
        </a>

        <div className="br-nav-pista" ref={pista} onMouseLeave={() => moverPildora(activa?.ruta)}>
          {pildora && (
            <span
              className="br-nav-pildora"
              style={{ transform: `translateX(${pildora.left}px)`, width: pildora.width }}
              aria-hidden="true"
            >
              <span className="br-nav-haz" />
            </span>
          )}
          {secciones.map((s, i) => (
            <a
              key={s.ruta}
              style={{ "--i": i + 1 }}
              ref={(el) => {
                enlaces.current[s.ruta] = el;
              }}
              href={s.ruta}
              className={`br-nav-enlace${activa?.ruta === s.ruta ? " activo" : ""}`}
              aria-current={activa?.ruta === s.ruta ? "page" : undefined}
              onMouseEnter={() => moverPildora(s.ruta)}
              onFocus={() => moverPildora(s.ruta)}
              onClick={(e) => {
                e.preventDefault();
                ir(s);
              }}
            >
              {s.texto}
            </a>
          ))}
        </div>

        <div className="br-nav-acciones">
          {logueado ? (
            <>
              <Notificaciones />

              <div className="br-nav-usuario" ref={usuario}>
                <button
                  type="button"
                  className="br-nav-avatar"
                  aria-haspopup="menu"
                  aria-expanded={menuUsuario}
                  aria-label="Tu cuenta"
                  onClick={() => setMenuUsuario((v) => !v)}
                >
                  <Avatar nombre={nombre || username || "?"} foto={foto} />
                </button>

                {menuUsuario && (
                  <div className="br-nav-menu" role="menu">
                    <div className="br-nav-menu-cabecera">
                      <span className="br-nav-menu-avatar">
                        <Avatar nombre={nombre || username || "?"} foto={foto} />
                      </span>
                      <div>
                        <strong>{nombre || "Tu cuenta"}</strong>
                        {username && <span>@{username}</span>}
                      </div>
                    </div>
                    {opcionesUsuario.map((o) => (
                      <button
                        key={o.texto}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuUsuario(false);
                          o.accion();
                        }}
                      >
                        <Icono nombre={o.icono} />
                        {o.texto}
                      </button>
                    ))}
                    <hr />
                    <button type="button" role="menuitem" className="peligro" onClick={cerrarSesion}>
                      <Icono nombre="salir" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button type="button" className="br-nav-boton br-nav-boton--suave" onClick={() => navigate("/auth?modo=login")}>
                Iniciar sesión
              </button>
              <button type="button" className="br-nav-boton br-nav-boton--fuerte" onClick={() => navigate("/auth?modo=registro")}>
                Regístrate
              </button>
            </>
          )}

          <button
            type="button"
            className={`br-nav-hamburguesa${panelMovil ? " abierta" : ""}`}
            aria-label={panelMovil ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={panelMovil}
            aria-controls="br-nav-panel"
            onClick={() => setPanelMovil((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Celular: panel a pantalla completa con iconos */}
      <div id="br-nav-panel" className={`br-nav-panel${panelMovil ? " abierto" : ""}`} aria-hidden={!panelMovil}>
        <ul>
          {secciones.map((s, i) => (
            <li key={s.ruta} style={{ "--i": i }}>
              <button
                type="button"
                className={activa?.ruta === s.ruta ? "activo" : ""}
                tabIndex={panelMovil ? 0 : -1}
                onClick={() => ir(s)}
              >
                <span className="br-nav-panel-icono">
                  <Icono nombre={s.icono} />
                </span>
                {s.texto}
                <Icono nombre="flecha" />
              </button>
            </li>
          ))}
        </ul>

        <div className="br-nav-panel-pie" style={{ "--i": secciones.length }}>
          {logueado ? (
            <>
              {opcionesUsuario.map((o) => (
                <button
                  key={o.texto}
                  type="button"
                  tabIndex={panelMovil ? 0 : -1}
                  onClick={() => {
                    setPanelMovil(false);
                    o.accion();
                  }}
                >
                  <Icono nombre={o.icono} />
                  {o.texto}
                </button>
              ))}
              <button type="button" className="peligro" tabIndex={panelMovil ? 0 : -1} onClick={cerrarSesion}>
                <Icono nombre="salir" />
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <button type="button" className="br-nav-boton br-nav-boton--suave" tabIndex={panelMovil ? 0 : -1}
                onClick={() => {
                  setPanelMovil(false);
                  navigate("/auth?modo=login");
                }}>
                Iniciar sesión
              </button>
              <button type="button" className="br-nav-boton br-nav-boton--fuerte" tabIndex={panelMovil ? 0 : -1}
                onClick={() => {
                  setPanelMovil(false);
                  navigate("/auth?modo=registro");
                }}>
                Regístrate
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
