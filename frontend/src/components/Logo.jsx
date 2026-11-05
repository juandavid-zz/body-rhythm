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

  return (
    <span className="br-logo">
      <svg className="br-logo-icono" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-fondo`} x1="6" y1="2" x2="34" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#b57bff" />
            <stop offset="0.5" stopColor="#8f45f5" />
            <stop offset="1" stopColor="#d9408c" />
          </linearGradient>
          <linearGradient id={`${id}-brillo`} x1="20" y1="1" x2="20" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-borde`} x1="20" y1="1" x2="20" y2="39" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${id}-fondo)`} />
        <rect x="1" y="1" width="38" height="20" rx="11" fill={`url(#${id}-brillo)`} />
        <rect x="1.4" y="1.4" width="37.2" height="37.2" rx="10.6" fill="none" stroke={`url(#${id}-borde)`} strokeWidth="0.8" />
        <path transform="matrix(0.0255 0 0 -0.0255 8.481 29.5)" fill="#fff" d={LETRA_B} />
        <circle className="br-logo-punto" cx="28.09" cy="27.75" r="1.75" fill="#ffd1ec" />
      </svg>
      {conNombre && (
        <span className="br-logo-nombre">
          Body<span>Rhythm</span>
        </span>
      )}
    </span>
  );
}
