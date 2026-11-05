import { useId } from "react";

// La B cincelada: esquinas cortadas a 45° y dos huecos. Se inclina con skewX.
const LETRA_B =
  "M8 5h17l6.5 6.5v4.5l-3.4 3.6 3.9 3.9V28l-6.5 6.5H8z M15.2 11.6v5.2h7.4l1.6-1.6v-2l-1.6-1.6z M15.2 22.6v6h8.3l1.8-1.8v-2.4l-1.8-1.8z";
const ESCUDO = "M6 2.5h28l3.5 3.5v15.6L20 38 2.5 21.6V6z";

/**
 * Logo de Body Rhythm: un escudo en punta, en degradado metálico, con la B
 * cincelada calada en el centro, y el nombre apilado en letra condensada.
 * El mismo dibujo está en public/icons/icono.svg.
 */
export default function Logo({ conNombre = true }) {
  // Ids únicos: el logo puede aparecer más de una vez en la misma página
  const id = useId().replace(/:/g, "");
  const url = (nombre) => `url(#${id}-${nombre})`;

  return (
    <span className="br-logo">
      <span className="br-logo-marco">
        <svg className="br-logo-icono" viewBox="0 0 40 40" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-metal`} x1="8" y1="2" x2="32" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#e3c4ff" />
              <stop offset="0.3" stopColor="#a855f7" />
              <stop offset="0.72" stopColor="#d0287a" />
              <stop offset="1" stopColor="#fb7185" />
            </linearGradient>
            <linearGradient id={`${id}-filo`} x1="20" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${id}-bisel`} x1="20" y1="3" x2="20" y2="37" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.12" />
              <stop offset="1" stopColor="#ffd0e4" stopOpacity="0.5" />
            </linearGradient>
            <clipPath id={`${id}-recorte`}>
              <path d={ESCUDO} />
            </clipPath>
          </defs>
          <path fill={url("metal")} d={ESCUDO} />
          <path fill={url("filo")} d={ESCUDO} />
          {/* Destello que cruza el escudo al pasar el mouse */}
          <g clipPath={url("recorte")}>
            <path className="br-logo-destello" d="M-6 40 L10 -2 H17 L1 40z" fill="#fff" opacity="0.55" />
          </g>
          <path fill="none" stroke={url("bisel")} strokeWidth="0.9" d="M6.6 4h26.8l2.6 2.6v14.4L20 36 4 21V6.6z" />
          <g transform="translate(20 18.4) scale(0.64) skewX(-11) translate(-20 -20)">
            <path fillRule="evenodd" fill="#0d0716" d={LETRA_B} />
          </g>
        </svg>
      </span>
      {conNombre && (
        <span className="br-logo-nombre">
          <span>Body</span>
          <span>Rhythm</span>
        </span>
      )}
    </span>
  );
}
