import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/landing.css";

// Frase que se enciende palabra por palabra al bajar; las últimas van en degradado
const FRASE =
  "Dile qué quieres lograr, dónde entrenas y qué equipo tienes. En treinta segundos tienes tu semana armada, cada ejercicio animado y tu comida calculada.";
const FRASE_FINAL = "Solo te queda entrenar.";
const PALABRAS = [
  ...FRASE.split(" ").map((texto) => ({ texto, morado: false })),
  ...FRASE_FINAL.split(" ").map((texto) => ({ texto, morado: true })),
];

const PASOS = [
  {
    eti: "Entrenador con IA",
    titulo: ["Una rutina hecha para ti.", "En segundos."],
    texto: (
      <>
        Cuéntale tu meta, tu equipo y tus días. <b>Te arma la semana completa</b>, con series, repeticiones y
        descansos, y la cambia cuando se lo pidas.
      </>
    ),
  },
  {
    eti: "376 ejercicios animados",
    titulo: ["Mira cómo se hace.", "Antes de hacerlo."],
    texto: (
      <>
        Cada ejercicio tiene <b>su animación con los músculos que trabaja</b>. Normal, lento o en pausa, para que lo
        hagas bien desde la primera serie.
      </>
    ),
  },
  {
    eti: "Nutrición",
    titulo: ["Tu comida,", "calculada a tu meta."],
    texto: (
      <>
        Calorías y macros según quieras <b>ganar músculo, bajar grasa o mantenerte</b>, con comidas reales que puedes
        cambiar.
      </>
    ),
  },
  {
    eti: "Progreso",
    titulo: ["Cada serie cuenta.", "Y se nota."],
    texto: (
      <>
        Tus récords, tu volumen y tus medidas en el tiempo. <b>Ver lo que has avanzado</b> es lo que te hace volver.
      </>
    ),
  },
];

const DESTACADOS = [
  { video: "deadlift", fuerte: "Peso muerto, sentadilla, dominadas.", resto: "Los ejercicios que importan, explicados en movimiento." },
  { video: "hip-thrust", fuerte: "Glúteos, espalda, core.", resto: "Filtra por grupo muscular y encuentra lo que necesitas." },
  { video: "push-up", fuerte: "En casa o en el gimnasio.", resto: "La rutina se adapta al equipo que tengas a mano." },
  { video: "pull-up", fuerte: "Comunidad.", resto: "Comparte tus entrenos y dale fuerza a los de los demás." },
];

// Planes: los mismos de la página de Planes
const PLANES = [
  { nombre: "Free", precio: "0", lema: "Todo lo esencial para empezar.", brillo: 0.35 },
  { nombre: "Pro", precio: "19.900", lema: "Más herramientas para subir de nivel.", brillo: 0.65, destacado: true },
  { nombre: "Premium", precio: "29.900", lema: "La experiencia completa de Body Rhythm.", brillo: 1 },
];
const FILAS_PLANES = [
  ["Lista de ejercicios animados", true, true, true],
  ["Rutinas básicas", true, true, true],
  ["Seguimiento de progreso", true, true, true],
  ["Rutinas personalizadas", false, true, true],
  ["Estadísticas avanzadas", false, true, true],
  ["Recomendaciones inteligentes", false, true, true],
  ["Asistente de IA", false, false, true],
  ["Planes personalizados", false, false, true],
  ["Soporte prioritario", false, false, true],
];

const DURACION_DESTACADO = 5000;
const video = (nombre) => `/ejercicios/animadas/${nombre}.mp4`;
const limitar = (v) => Math.min(1, Math.max(0, v));

/** Barra de estado del celular dibujado */
function Estado() {
  return (
    <>
      <span className="la-reflejo" />
      <span className="la-isla" />
      <span className="la-estado">
        <span>9:41</span>
        <span>●●●</span>
      </span>
    </>
  );
}

/**
 * Página de inicio al estilo de las páginas de producto de Apple: el celular
 * sube y crece al bajar, una frase se enciende palabra por palabra, un
 * recorrido con el celular fijo cuya pantalla cambia, una tarjeta que se
 * revela a pantalla completa, lo destacado en un carrusel, una cuadrícula de
 * funciones, la comparación de planes y un cierre con el escudo.
 */
export default function Landing() {
  const navigate = useNavigate();
  const logueado = Boolean(localStorage.getItem("token"));

  const hero = useRef(null);
  const frase = useRef(null);
  const pasos = useRef([]);
  const pista = useRef(null);
  const piezas = useRef([]);
  const revelado = useRef(null);
  const pagina = useRef(null);

  const [encendidas, setEncendidas] = useState(0);
  const [pasoActivo, setPasoActivo] = useState(0);
  const [destacado, setDestacado] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [carruselVisible, setCarruselVisible] = useState(false);

  const empezar = () => navigate(logueado ? "/dashboard" : "/auth?modo=registro");
  const irA = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Todo lo que depende del scroll se calcula en un solo cuadro de animación
  useEffect(() => {
    let pendiente = false;

    const pintar = () => {
      pendiente = false;

      // 1. Hero: el titular se va y el celular sube hasta quedar centrado
      const h = hero.current;
      if (h) {
        const r = h.getBoundingClientRect();
        const p = limitar(-r.top / (r.height - innerHeight));
        const q = Math.min(1, p * 1.4);
        h.style.setProperty("--la-texto", (1 - p * 1.8).toFixed(3));
        h.style.setProperty("--la-sube", `${(-p * 120).toFixed(1)}px`);
        h.style.setProperty("--la-celu-y", `${(330 * (1 - q)).toFixed(1)}px`);
        h.style.setProperty("--la-celu-s", (0.82 + q * 0.22).toFixed(3));
        h.style.setProperty("--la-luz", (0.5 + p * 0.5).toFixed(3));
      }

      // Revelado: la tarjeta con video crece hasta ocupar toda la pantalla
      const rv = revelado.current;
      if (rv) {
        const r = rv.getBoundingClientRect();
        const p = limitar(-r.top / (r.height - innerHeight));
        const crece = limitar(p / 0.6);
        rv.style.setProperty("--la-r-s", (0.6 + crece * 0.4).toFixed(3));
        rv.style.setProperty("--la-r-radio", `${(40 * (1 - crece)).toFixed(1)}px`);
        rv.style.setProperty("--la-r-texto", limitar((p - 0.45) / 0.25).toFixed(3));
      }

      // 2. Frase: cuántas palabras van encendidas según lo que has bajado
      const f = frase.current;
      if (f) {
        const r = f.getBoundingClientRect();
        const p = limitar((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.4));
        setEncendidas(Math.round(p * PALABRAS.length));
      }

      // 3. Recorrido: manda el paso más cerca de la zona de lectura
      // (en celular el teléfono ocupa la parte de arriba, así que se lee más abajo)
      const referencia = innerWidth <= 860 ? innerHeight * 0.66 : innerHeight / 2;
      let activo = 0;
      let mejor = Infinity;
      pasos.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + Math.min(r.height / 2, 160) - referencia);
        if (d < mejor) {
          mejor = d;
          activo = i;
        }
      });
      setPasoActivo(activo);
    };

    const alBajar = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(pintar);
    };

    pintar();
    window.addEventListener("scroll", alBajar, { passive: true });
    window.addEventListener("resize", alBajar);
    return () => {
      window.removeEventListener("scroll", alBajar);
      window.removeEventListener("resize", alBajar);
    };
  }, []);

  // Los videos (salvo los del carrusel) solo corren mientras se ven en pantalla
  useEffect(() => {
    const raiz = pagina.current;
    if (!raiz) return undefined;
    const obs = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((e) => {
          if (e.isIntersecting) e.target.play().catch(() => {});
          else e.target.pause();
        }),
      { threshold: 0.15 }
    );
    raiz.querySelectorAll("video[data-auto]").forEach((v) => obs.observe(v));
    return () => obs.disconnect();
  }, []);

  // Luz que sigue al mouse en las tarjetas de la cuadrícula
  const seguirMouse = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--la-mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--la-my", `${e.clientY - r.top}px`);
  };

  // 4. El carrusel arranca cuando se ve
  useEffect(() => {
    const el = pista.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setCarruselVisible(true), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const mostrarDestacado = useCallback((i) => {
    const el = pista.current;
    const pieza = piezas.current[i];
    if (!el || !pieza) return;
    el.scrollTo({ left: pieza.offsetLeft - (el.clientWidth - pieza.clientWidth) / 2, behavior: "smooth" });
    piezas.current.forEach((p, j) => {
      const v = p?.querySelector("video");
      if (!v) return;
      if (j === i) v.play().catch(() => {});
      else v.pause();
    });
  }, []);

  // Cada pieza se queda unos segundos y pasa a la siguiente, salvo en pausa
  useEffect(() => {
    if (!carruselVisible) return undefined;
    mostrarDestacado(destacado);
    if (pausado) return undefined;
    const t = setTimeout(() => setDestacado((d) => (d + 1) % DESTACADOS.length), DURACION_DESTACADO);
    return () => clearTimeout(t);
  }, [carruselVisible, destacado, pausado, mostrarDestacado]);

  return (
    <div className="la-pagina" ref={pagina}>
      {/* Sub-barra pegada, como la de las páginas de producto */}
      <div className="la-sub">
        <div className="la-ancho">
          <button type="button" onClick={() => irA("la-recorrido")}>Funciones</button>
          <button type="button" onClick={() => irA("la-destacado")}>Lo destacado</button>
          <button type="button" className="la-pildora" onClick={empezar}>
            {logueado ? "Ir a entrenar" : "Empezar gratis"}
          </button>
        </div>
      </div>

      {/* 1. Hero */}
      <section className="la-hero" ref={hero}>
        <div className="la-hero-fijo">
          <div className="la-hero-luz" />
          <div className="la-hero-titulos">
            <p className="la-sobre la-deg">Body Rhythm</p>
            <h1>
              Tu entrenador.
              <br />
              Siempre contigo.
            </h1>
            <div className="la-hero-acciones">
              <button type="button" className="la-boton" onClick={empezar}>
                {logueado ? "Ir a entrenar" : "Empezar gratis"}
              </button>
              <button type="button" className="la-enlace" onClick={() => irA("la-recorrido")}>
                Ver cómo funciona ›
              </button>
            </div>
          </div>
          <div className="la-celu la-celu-hero">
            <div className="la-pantalla">
              <Estado />
              <div className="la-vista la-v-ejercicio la-activa">
                <video src={video("squat")} data-auto muted loop playsInline />
                <div className="la-datos">
                  <small>Piernas · Día 2</small>
                  <h5>Sentadilla con barra</h5>
                  <div className="la-series">
                    <i className="ok">60 kg</i>
                    <i className="ok">65 kg</i>
                    <i>70 kg</i>
                    <i>70 kg</i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Frase que se enciende */}
      <section className="la-frase">
        <div className="la-ancho">
          <p ref={frase}>
            {PALABRAS.map((p, i) => (
              <span key={i} className={`${i < encendidas ? "on" : ""}${p.morado ? " morado" : ""}`}>
                {p.texto}{" "}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* 3. Recorrido con el celular fijo */}
      <section className="la-recorrido" id="la-recorrido">
        <div className="la-rejilla">
          <div className="la-lado-celu">
            <div className="la-celu">
              <div className="la-pantalla">
                <Estado />
                <div className={`la-vista${pasoActivo === 0 ? " la-activa" : ""}`}>
                  <small>Entrenador IA</small>
                  <h5>Tu rutina</h5>
                  <div className="la-chat">
                    <p className="yo">Quiero ganar músculo. Entreno en casa con mancuernas, 4 días.</p>
                    <p>Listo. Te armé empuje, tirón, piernas y cuerpo completo:</p>
                  </div>
                  <div className="la-rutina">
                    <span>Lunes · Empuje <b>6 ejercicios</b></span>
                    <span>Martes · Tirón <b>6 ejercicios</b></span>
                    <span>Jueves · Piernas <b>5 ejercicios</b></span>
                    <span>Sábado · Completo <b>7 ejercicios</b></span>
                  </div>
                </div>
                <div className={`la-vista la-v-ejercicio${pasoActivo === 1 ? " la-activa" : ""}`}>
                  <video src={video("bench-press")} data-auto muted loop playsInline />
                  <div className="la-datos">
                    <small>Pecho · Día 1</small>
                    <h5>Press de banca</h5>
                    <div className="la-series">
                      <i className="ok">40 kg</i>
                      <i className="ok">45 kg</i>
                      <i>50 kg</i>
                    </div>
                  </div>
                </div>
                <div className={`la-vista${pasoActivo === 2 ? " la-activa" : ""}`}>
                  <small>Nutrición · Hoy</small>
                  <h5>2.150 kcal</h5>
                  <div className="la-anillos">
                    <svg width="170" height="170" viewBox="0 0 170 170" aria-hidden="true">
                      <circle cx="85" cy="85" r="72" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="14" />
                      <circle cx="85" cy="85" r="72" fill="none" stroke="#a855f7" strokeWidth="14" strokeLinecap="round" strokeDasharray="330 453" transform="rotate(-90 85 85)" />
                      <circle cx="85" cy="85" r="50" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="14" />
                      <circle cx="85" cy="85" r="50" fill="none" stroke="#c14cff" strokeWidth="14" strokeLinecap="round" strokeDasharray="210 314" transform="rotate(-90 85 85)" />
                      <circle cx="85" cy="85" r="28" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="14" />
                      <circle cx="85" cy="85" r="28" fill="none" stroke="#ec4899" strokeWidth="14" strokeLinecap="round" strokeDasharray="120 176" transform="rotate(-90 85 85)" />
                    </svg>
                  </div>
                  <div className="la-macros">
                    <div><b>142 g</b>Proteína</div>
                    <div><b>240 g</b>Carbos</div>
                    <div><b>68 g</b>Grasa</div>
                  </div>
                </div>
                <div className={`la-vista${pasoActivo === 3 ? " la-activa" : ""}`}>
                  <small>Progreso · Sentadilla</small>
                  <h5>+15 kg en 8 semanas</h5>
                  <div className="la-grafica">
                    {[32, 40, 38, 52, 58, 66, 74, 92].map((alto, i) => (
                      <i key={i} style={{ height: `${alto}%` }} />
                    ))}
                  </div>
                  <div className="la-record">
                    Nuevo récord personal<b>80 kg × 5</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            {PASOS.map((paso, i) => (
              <article
                key={paso.eti}
                ref={(el) => {
                  pasos.current[i] = el;
                }}
                className={`la-paso${pasoActivo === i ? " la-activo" : ""}`}
              >
                <small>{paso.eti}</small>
                <h2>
                  {paso.titulo[0]}
                  <br />
                  {paso.titulo[1]}
                </h2>
                <p>{paso.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Revelado: una tarjeta que crece hasta llenar la pantalla */}
      <section className="la-revelado" ref={revelado}>
        <div className="la-revelado-fijo">
          <div className="la-revelado-media">
            <video src={video("kettlebell-swing")} data-auto muted loop playsInline />
            <div className="la-revelado-texto">
              <p className="la-deg">Ejercicios animados</p>
              <h2>
                Cada movimiento.
                <br />
                Explicado.
              </h2>
              <span>376 ejercicios con los músculos que trabajan, a la velocidad que quieras.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Lo más destacado */}
      <section className="la-destacado" id="la-destacado">
        <h2>Lo más destacado.</h2>
        <div className="la-pista" ref={pista}>
          {DESTACADOS.map((d, i) => (
            <article
              key={d.video}
              className="la-pieza"
              ref={(el) => {
                piezas.current[i] = el;
              }}
            >
              <video src={video(d.video)} muted loop playsInline />
              <p>
                <b>{d.fuerte}</b> {d.resto}
              </p>
            </article>
          ))}
        </div>
        <div className={`la-controles${pausado ? " la-pausado" : ""}`}>
          <div className="la-puntos">
            {DESTACADOS.map((d, i) => (
              <button
                key={`${d.video}-${i === destacado ? destacado : "x"}`}
                type="button"
                className={i === destacado && carruselVisible ? "on" : ""}
                style={{ "--la-dur": `${DURACION_DESTACADO}ms` }}
                aria-label={`Ir a ${i + 1}`}
                onClick={() => setDestacado(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="la-pausa"
            aria-label={pausado ? "Reproducir" : "Pausar"}
            onClick={() => setPausado((v) => !v)}
          >
            {pausado ? "▶" : "❚❚"}
          </button>
        </div>
      </section>

      {/* 5. Todo lo que necesitas: cuadrícula con luz que sigue al mouse */}
      <section className="la-todo">
        <div className="la-ancho">
          <h2>
            Todo lo que necesitas.
            <br />
            <span className="la-gris-txt">En una sola app.</span>
          </h2>
          <div className="la-bento">
            <article className="la-caja la-caja-ia" onMouseMove={seguirMouse}>
              <span className="la-chispa" aria-hidden="true">✦</span>
              <h3>Entrenador con IA</h3>
              <p>Pídele una rutina, cámbiale un ejercicio o pregúntale lo que quieras. A cualquier hora.</p>
            </article>
            <article className="la-caja la-caja-num" onMouseMove={seguirMouse}>
              <b className="la-deg">376</b>
              <p>ejercicios con animación</p>
            </article>
            <article className="la-caja la-caja-video" onMouseMove={seguirMouse}>
              <video src={video("barbell-curl")} data-auto muted loop playsInline />
              <h3>Normal, lento o en pausa</h3>
            </article>
            <article className="la-caja" onMouseMove={seguirMouse}>
              <b className="la-deg">30 s</b>
              <p>para tener tu semana armada</p>
            </article>
            <article className="la-caja" onMouseMove={seguirMouse}>
              <h3>Nutrición</h3>
              <p>Calorías y macros según tu meta.</p>
              <div className="la-mini-anillo" aria-hidden="true" />
            </article>
            <article className="la-caja" onMouseMove={seguirMouse}>
              <h3>Comunidad</h3>
              <p>Comparte tus entrenos y dale fuerza a los demás.</p>
              <div className="la-caras" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 6. ¿Qué plan es para ti? */}
      <section className="la-planes">
        <div className="la-ancho">
          <h2>¿Qué plan es para ti?</h2>
          <div className="la-planes-rejilla">
            {PLANES.map((plan, i) => {
              const gratis = plan.precio === "0";
              return (
                <article key={plan.nombre} className={`la-plan${plan.destacado ? " la-plan-destacado" : ""}`}>
                  {plan.destacado && <span className="la-plan-etiqueta">Más elegido</span>}
                  <img src="/icons/icono.svg" alt="" style={{ "--la-brillo": plan.brillo }} />
                  <h3>{plan.nombre}</h3>
                  <p className="la-plan-lema">{plan.lema}</p>
                  <p className="la-plan-precio">
                    {gratis ? "Gratis" : <>${plan.precio}<small> / mes</small></>}
                  </p>
                  <button
                    type="button"
                    className={plan.destacado ? "la-boton" : "la-boton la-boton-suave"}
                    onClick={() => (gratis ? empezar() : navigate("/planes"))}
                  >
                    {gratis ? (logueado ? "Ir a entrenar" : "Empezar gratis") : `Elegir ${plan.nombre}`}
                  </button>
                  <ul>
                    {FILAS_PLANES.map(([texto, ...incluye]) => (
                      <li key={texto} className={incluye[i] ? "" : "no"}>
                        <span aria-hidden="true">{incluye[i] ? "✓" : "—"}</span>
                        {texto}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Cierre */}
      <section className="la-cierre">
        <span className="la-escudo">
          <img src="/icons/icono.svg" alt="" />
        </span>
        <h2>
          Empieza hoy.
          <br />
          <span className="la-deg">Gratis.</span>
        </h2>
        <p>Tu primera rutina en menos de un minuto.</p>
        <div className="la-cierre-acciones">
          <button type="button" className="la-boton" onClick={empezar}>
            {logueado ? "Ir a entrenar" : "Crear mi cuenta"}
          </button>
          <button type="button" className="la-enlace" onClick={() => navigate("/planes")}>
            Ver planes ›
          </button>
        </div>
      </section>

      <footer className="la-pie">
        <div className="la-ancho">
          <span>© 2026 Body Rhythm. Entrena. Come bien. Repite.</span>
          <span>Privacidad · Términos · Contacto</span>
        </div>
      </footer>
    </div>
  );
}
