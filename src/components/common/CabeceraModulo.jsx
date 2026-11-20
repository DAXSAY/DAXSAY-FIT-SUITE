import React from "react";

/**
 * Cabecera común de los módulos de trabajo (Rutinas, Nutrición, Fisioterapia):
 * etiqueta, título, descripción, acción principal a la derecha y, abajo,
 * una sola fila de pestañas con el mismo estilo en todos.
 *
 * pestanas: [{ k, icono, label, badge?, tono? }]
 */
export const CabeceraModulo = ({ icono: Icono, etiqueta, titulo, descripcion, accion, pestanas = [], activa, onCambiar }) => (
  <div className="rd-portada rd-cabecera rd-cab-modulo">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <span className="rd-cab-etiqueta text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
          {Icono && <Icono className="w-4 h-4" />} {etiqueta}
        </span>
        <h1>{titulo}</h1>
        {descripcion && <p className="text-sm text-slate-300 max-w-2xl">{descripcion}</p>}
      </div>
      {accion && <div className="flex items-center gap-2.5 shrink-0">{accion}</div>}
    </div>
    {pestanas.length > 0 && <Pestanas pestanas={pestanas} activa={activa} onCambiar={onCambiar} className="mt-4 pt-3" />}
  </div>
);

/** Botón de acción principal de la cabecera (mismo estilo en todos los módulos) */
export const AccionCabecera = ({ icono: I, children, ...props }) => (
  <button type="button" {...props} className="rd-accion-cabecera px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer">
    {I && <I className="w-4 h-4" />} {children}
  </button>
);

/** Fila de pestañas con el diseño común (también se usa sola, fuera de una cabecera) */
export const Pestanas = ({ pestanas, activa, onCambiar, className = "" }) => (
  <nav className={`rd-pestanas-modulo flex items-center gap-2 overflow-x-auto ${className}`} aria-label="Secciones">
    {pestanas.map(({ k, icono: I, label, badge, tono = "teal" }) => {
      const on = activa === k;
      return (
        <button
          key={k}
          type="button"
          onClick={() => onCambiar(k)}
          aria-current={on ? "page" : undefined}
          data-tono={tono}
          className={`rd-pestana-modulo ${on ? "rd-pestana-activa" : ""} shrink-0 flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap cursor-pointer`}
        >
          {I && (
            <span className="rd-pestana-icono w-7 h-7 rounded-lg flex items-center justify-center">
              <I className="w-4 h-4" />
            </span>
          )}
          <span>{label}</span>
          {badge != null && badge !== "" && <span className="rd-pestana-badge px-2 py-0.5 rounded-full text-[11px] font-black">{badge}</span>}
        </button>
      );
    })}
  </nav>
);

/* Ilustraciones de línea para las pantallas vacías (sin emojis ni fotos con licencia) */
const ILUSTRACIONES = {
  nutricion: (
    <g>
      <circle cx="120" cy="92" r="58" className="rd-ilu-suave" />
      <circle cx="120" cy="92" r="42" />
      <path d="M120 50 v42 l30 22" className="rd-ilu-acento" />
      <path d="M92 70 q14 -6 22 8 q-14 6 -22 -8z" className="rd-ilu-acento" />
      <circle cx="104" cy="108" r="7" /><circle cx="134" cy="76" r="5" />
      <path d="M40 40 v34 M32 40 v18 q0 8 8 8 q8 0 8 -8 v-18 M40 74 v70" />
      <path d="M198 40 q14 10 0 46 v58" /><path d="M198 40 v104" />
    </g>
  ),
  rutinas: (
    <g>
      <rect x="42" y="74" width="14" height="40" rx="4" /><rect x="58" y="64" width="14" height="60" rx="4" className="rd-ilu-acento" />
      <rect x="168" y="64" width="14" height="60" rx="4" className="rd-ilu-acento" /><rect x="184" y="74" width="14" height="40" rx="4" />
      <path d="M72 94 h96" />
      <path d="M100 150 q-14 -2 -14 -18 q0 -18 34 -18 q34 0 34 18 q0 16 -14 18 z" className="rd-ilu-suave" />
      <path d="M104 116 q0 -18 16 -18 q16 0 16 18" />
      <path d="M30 160 h180" className="rd-ilu-suave" />
    </g>
  ),
  fisio: (
    <g>
      <circle cx="120" cy="34" r="14" />
      <path d="M120 50 v70" className="rd-ilu-acento" />
      {[60, 72, 84, 96, 108].map((y) => (
        <path key={y} d={`M110 ${y} h20`} className="rd-ilu-acento" />
      ))}
      <path d="M120 60 l-34 28 M120 60 l34 28 M120 120 l-22 44 M120 120 l22 44" />
      <path d="M50 110 q-16 -10 -6 -26 l14 8 M190 110 q16 -10 6 -26 l-14 8" className="rd-ilu-suave" />
      <circle cx="120" cy="96" r="44" className="rd-ilu-suave" />
    </g>
  ),
  reportes: (
    <g>
      <path d="M40 160 h170 M40 160 v-130" className="rd-ilu-suave" />
      <rect x="60" y="110" width="22" height="50" rx="3" /><rect x="96" y="84" width="22" height="76" rx="3" className="rd-ilu-acento" />
      <rect x="132" y="98" width="22" height="62" rx="3" /><rect x="168" y="60" width="22" height="100" rx="3" className="rd-ilu-acento" />
      <path d="M60 92 l36 -26 l36 14 l46 -40" />
      <circle cx="178" cy="40" r="5" />
    </g>
  ),
  clientes: (
    <g>
      <circle cx="90" cy="64" r="20" /><path d="M54 140 q0 -40 36 -40 q36 0 36 40" />
      <circle cx="152" cy="74" r="16" className="rd-ilu-acento" /><path d="M126 140 q2 -32 26 -32 q24 0 26 32" className="rd-ilu-acento" />
      <path d="M40 160 h160" className="rd-ilu-suave" />
      <path d="M180 34 l10 10 l18 -20" className="rd-ilu-acento" />
    </g>
  ),
};

/** Pantalla vacía al entrar a un módulo: ilustración del tema con el logo del gimnasio, tenue */
export const SinSeleccion = ({ tema = "reportes", texto = "Elige una opción de arriba para empezar." }) => (
  <div className="rd-aparece rd-sin-seleccion relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 px-6 py-10 flex flex-col items-center justify-center min-h-[22rem]">
    <img src="/logo-radical.png" alt="" aria-hidden className="pointer-events-none select-none absolute -right-10 -bottom-12 w-72 h-72 opacity-[0.06] rounded-full" />
    <img src="/logo-radical.png" alt="" aria-hidden className="pointer-events-none select-none absolute -left-16 -top-16 w-56 h-56 opacity-[0.04] rounded-full" />
    <svg viewBox="0 0 240 180" className="rd-ilu relative w-64 max-w-full h-auto" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ILUSTRACIONES[tema] || ILUSTRACIONES.reportes}
    </svg>
    <p className="relative mt-4 text-xs font-bold text-slate-500 text-center max-w-md">{texto}</p>
  </div>
);
