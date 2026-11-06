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
  { video: "kettlebell-swing", fuerte: "En casa o en el gimnasio.", resto: "La rutina se adapta al equipo que tengas a mano." },
  { video: "pull-up", fuerte: "Comunidad.", resto: "Comparte tus entrenos y dale fuerza a los de los demás." },
];

const DURACION_DESTACADO = 5000;
const video = (nombre) => `/ejercicios/animadas/${nombre}.mp4`;
const limitar = (v) => Math.min(1, Math.max(0, v));

/** Barra de estado del celular dibujado */
function Estado() {
  return (
    <>
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
 * recorrido con el celular fijo cuya pantalla cambia, lo destacado en un
 * carrusel que avanza solo y un cierre con el escudo.
 */
export default function Landing() {
  const navigate = useNavigate();
  const logueado = Boolean(localStorage.getItem("token"));

  const hero = useRef(null);
  const frase = useRef(null);
  const pasos = useRef([]);
  const pista = useRef(null);
  const piezas = useRef([]);

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
    <div className="la-pagina">
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
                <video src={video("squat")} autoPlay muted loop playsInline />
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
                  <video src={video("bench-press")} autoPlay muted loop playsInline />
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

      {/* 5. Números */}
      <section>
        <div className="la-ancho la-numeros">
          <div><b className="la-deg">376</b><span>ejercicios con animación</span></div>
          <div><b className="la-deg">30 s</b><span>para tener tu rutina</span></div>
          <div><b className="la-deg">24/7</b><span>entrenador con IA</span></div>
        </div>
      </section>

      {/* 6. Cierre */}
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
