import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AnimacionEjercicio from "./AnimacionEjercicio";
import { animacionDe, obtenerEjercicios } from "../utils/ejercicios";
import "../css/boton-animacion.css";

const normalizar = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// Busca el ejercicio en el catálogo (se descarga una sola vez) por id o por nombre
function buscarEnCatalogo(catalogo, { id, nombre }) {
  return (
    catalogo.find((e) => id != null && Number(e.id) === Number(id)) ||
    catalogo.find((e) => nombre && normalizar(e.nombre) === normalizar(nombre)) ||
    null
  );
}

/**
 * Miniatura del ejercicio que abre su animación en una ventana.
 * Recibe lo que se tenga del ejercicio: repdb_id, id del catálogo o nombre.
 * Si el ejercicio no tiene animación, no muestra nada.
 */
export default function BotonAnimacion({ id = null, repdbId = null, nombre = "", className = "" }) {
  const directa = repdbId ? animacionDe({ repdb_id: repdbId }) : null;
  const [encontrada, setEncontrada] = useState(null);
  const [abierta, setAbierta] = useState(false);
  const animacion = directa || encontrada;

  useEffect(() => {
    if (directa || (id == null && !nombre)) return undefined;
    let vivo = true;
    obtenerEjercicios()
      .then((catalogo) => {
        if (!vivo) return;
        const ejercicio = buscarEnCatalogo(catalogo, { id, nombre });
        setEncontrada(animacionDe(ejercicio));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [directa, id, nombre]);

  // Escape cierra la ventana y la página de fondo no se mueve mientras está abierta
  useEffect(() => {
    if (!abierta) return undefined;
    const alTeclado = (e) => e.key === "Escape" && setAbierta(false);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", alTeclado);
    };
  }, [abierta]);

  if (!animacion) return null;

  return (
    <>
      {/* Miniatura del ejercicio: se ve como parte de la información, y al tocarla se anima */}
      <button
        type="button"
        className={`ba-mini ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setAbierta(true);
        }}
        aria-label={`Ver cómo se hace ${nombre}`}
        title="Ver cómo se hace"
      >
        <img src={animacion.poster} alt="" loading="lazy" decoding="async" />
        <span className="ba-mini-play" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
      </button>

      {abierta &&
        createPortal(
          <div className="ba-fondo" onClick={() => setAbierta(false)}>
            <div
              className="ba-ventana"
              role="dialog"
              aria-modal="true"
              aria-label={`Animación de ${nombre}`}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="ba-cabecera">
                <strong>{nombre}</strong>
                <button type="button" className="ba-cerrar" onClick={() => setAbierta(false)} aria-label="Cerrar">
                  ×
                </button>
              </header>
              <AnimacionEjercicio animacion={animacion} nombre={nombre} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
