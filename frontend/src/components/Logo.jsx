import { useId } from "react";

// Contorno de la "B" de Plus Jakarta Sans (peso 800), para que el ícono se vea
// igual aunque la fuente no haya cargado. El mismo dibujo está en public/icons/icono.svg.
const LETRA_B =
  "M66 0V745H381Q458 745 513.0 719.0Q568 693 597.0 644.5Q626 596 626 527Q626 478 599.0 433.5Q572 389 510 359V435Q569 412 601.0 380.0Q633 348 645.0 310.5Q657 273 657 232Q657 122 584.0 61.0Q511 0 381 0ZM221 135H399Q446 135 474.0 162.0Q502 189 502 232Q502 276 474.0 303.0Q446 330 399 330H221ZM221 465H392Q428 465 449.5 485.5Q471 506 471 540Q471 574 449.5 594.5Q428 615 392 615H221Z";

/**
 * Logo de Body Rhythm: ícono tipo app con la inicial ("B.") sobre el degradado
 * de la marca, y el nombre en Plus Jakarta Sans.
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
            <linearGradient id={`${id}-fondo`} x1="5" y1="2" x2="35" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#a965ff" />
              <stop offset="0.48" stopColor="#7c34ee" />
              <stop offset="1" stopColor="#c2307e" />
            </linearGradient>
            {/* Luz arriba a la izquierda y resplandor rosa abajo a la derecha: profundidad */}
            <radialGradient id={`${id}-luz`} cx="9" cy="6" r="22" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#e2c6ff" stopOpacity="0.75" />
              <stop offset="1" stopColor="#e2c6ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${id}-rosa`} cx="34" cy="36" r="20" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ff5fa8" stopOpacity="0.85" />
              <stop offset="1" stopColor="#ff5fa8" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}-base`} x1="20" y1="24" x2="20" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#1a0533" stopOpacity="0" />
              <stop offset="1" stopColor="#1a0533" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id={`${id}-borde`} x1="20" y1="1" x2="20" y2="39" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
            </linearGradient>
            {/* La letra va de cabeza en sus propias coordenadas: 0 es la base */}
            <linearGradient id={`${id}-letra`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#efe4ff" />
              <stop offset="1" stopColor="#ffffff" />
            </linearGradient>
            <radialGradient id={`${id}-chispa`} cx="27.5" cy="27" r="2.4" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff3f9" />
              <stop offset="0.45" stopColor="#ff8ac2" />
              <stop offset="1" stopColor="#ff5b7f" />
            </radialGradient>
            <filter id={`${id}-relieve`} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="0.7" stdDeviation="0.7" floodColor="#2b0657" floodOpacity="0.45" />
            </filter>
            <filter id={`${id}-resplandor`} x="-150%" y="-150%" width="400%" height="400%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.9" floodColor="#ff6fb1" floodOpacity="0.9" />
            </filter>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="11" fill={url("fondo")} />
          <rect x="1" y="1" width="38" height="38" rx="11" fill={url("luz")} />
          <rect x="1" y="1" width="38" height="38" rx="11" fill={url("rosa")} />
          <rect x="1" y="1" width="38" height="38" rx="11" fill={url("base")} />
          <rect x="1.4" y="1.4" width="37.2" height="37.2" rx="10.6" fill="none" stroke={url("borde")} strokeWidth="0.8" />
          <g filter={url("relieve")}>
            <path transform="matrix(0.0262 0 0 -0.0262 8.18 29.75)" fill={url("letra")} d={LETRA_B} />
          </g>
          <circle className="br-logo-punto" filter={url("resplandor")} cx="28.3" cy="27.95" r="1.85" fill={url("chispa")} />
        </svg>
      </span>
      {conNombre && (
        <span className="br-logo-nombre">
          Body<span>Rhythm</span>
        </span>
      )}
    </span>
  );
}
