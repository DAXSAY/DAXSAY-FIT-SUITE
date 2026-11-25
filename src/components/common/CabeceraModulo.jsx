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
          {/* Sin números en las pestañas: solo el nombre */}
        </button>
      );
    })}
  </nav>
);

/* Ilustraciones de las pantallas vacías: escenas sobrias con tarjetas flotantes.
   Colores por clase (pastel en claro, neón suave en oscuro); sin emojis ni imágenes con licencia. */
const Tarjeta = ({ x, y, w, h, r = 10 }) => <rect x={x} y={y} width={w} height={h} rx={r} className="ilu-tarjeta" />;
const Linea = ({ x, y, w, c = "ilu-texto" }) => <rect x={x} y={y} width={w} height="5" rx="2.5" className={c} />;

const ILUSTRACIONES = {
  nutricion: (
    <g>
      <circle cx="150" cy="104" r="78" className="ilu-halo" />
      {/* plato */}
      <circle cx="150" cy="108" r="58" className="ilu-plato-borde" />
      <circle cx="150" cy="108" r="46" className="ilu-plato" />
      <path d="M150 108 L150 62 A46 46 0 0 1 193 122 Z" className="ilu-c1" />
      <path d="M150 108 L193 122 A46 46 0 0 1 117 140 Z" className="ilu-c2" />
      <path d="M150 108 L117 140 A46 46 0 0 1 150 62 Z" className="ilu-c3" />
      <circle cx="150" cy="108" r="14" className="ilu-plato" />
      {/* cubiertos */}
      <path d="M66 62 v26 a7 7 0 0 0 14 0 v-26 M73 62 v26 M73 95 v62" className="ilu-trazo" />
      <path d="M232 62 c14 8 14 34 0 42 v53" className="ilu-trazo" />
      {/* tarjeta de macros */}
      <g className="ilu-flota">
        <Tarjeta x="196" y="128" w="88" h="52" />
        <Linea x="206" y="138" w="34" c="ilu-texto-fuerte" />
        <rect x="206" y="150" width="62" height="6" rx="3" className="ilu-pista" /><rect x="206" y="150" width="44" height="6" rx="3" className="ilu-c1" />
        <rect x="206" y="160" width="62" height="6" rx="3" className="ilu-pista" /><rect x="206" y="160" width="30" height="6" rx="3" className="ilu-c2" />
        <rect x="206" y="170" width="62" height="6" rx="3" className="ilu-pista" /><rect x="206" y="170" width="18" height="6" rx="3" className="ilu-c3" />
      </g>
      {/* tarjeta de medidas */}
      <g className="ilu-flota ilu-flota-2">
        <Tarjeta x="14" y="30" w="74" h="44" />
        <circle cx="32" cy="52" r="10" className="ilu-c1-suave" />
        <path d="M27 52 h10 M32 47 v10" className="ilu-trazo-claro" />
        <Linea x="48" y="44" w="30" c="ilu-texto-fuerte" /><Linea x="48" y="55" w="20" />
      </g>
    </g>
  ),
  rutinas: (
    <g>
      <circle cx="150" cy="100" r="78" className="ilu-halo" />
      {/* mancuerna */}
      <rect x="86" y="92" width="128" height="12" rx="6" className="ilu-barra" />
      <rect x="62" y="64" width="20" height="68" rx="6" className="ilu-c1" />
      <rect x="84" y="74" width="14" height="48" rx="5" className="ilu-c1-suave" />
      <rect x="218" y="64" width="20" height="68" rx="6" className="ilu-c1" />
      <rect x="202" y="74" width="14" height="48" rx="5" className="ilu-c1-suave" />
      {/* tarjeta de rutina */}
      <g className="ilu-flota">
        <Tarjeta x="176" y="124" w="104" h="60" />
        {[136, 152, 168].map((y, i) => (
          <g key={y}>
            <circle cx="190" cy={y + 2} r="5" className={i < 2 ? "ilu-c2" : "ilu-pista"} />
            {i < 2 && <path d={`M187.5 ${y + 2} l2 2 l3.5 -4`} className="ilu-trazo-claro" />}
            <Linea x="201" y={y} w={i === 1 ? 44 : 64} c={i < 2 ? "ilu-texto-fuerte" : "ilu-texto"} />
          </g>
        ))}
      </g>
      {/* cronómetro */}
      <g className="ilu-flota ilu-flota-2">
        <Tarjeta x="18" y="26" w="70" h="64" />
        <circle cx="53" cy="62" r="18" className="ilu-pista" />
        <path d="M53 44 A18 18 0 0 1 70 67 L53 62 Z" className="ilu-c3" />
        <rect x="49" y="34" width="8" height="5" rx="2" className="ilu-texto-fuerte" />
      </g>
    </g>
  ),
  fisio: (
    <g>
      <circle cx="150" cy="100" r="78" className="ilu-halo" />
      {/* silueta */}
      <circle cx="150" cy="40" r="14" className="ilu-cuerpo" />
      <path d="M126 62 q24 -10 48 0 l6 52 q-30 8 -60 0 z" className="ilu-cuerpo" />
      <path d="M126 64 l-18 46 M174 64 l18 46" className="ilu-trazo-grueso" />
      <path d="M134 114 l-6 60 M166 114 l6 60" className="ilu-trazo-grueso" />
      {/* columna */}
      {[66, 76, 86, 96, 106].map((y) => (
        <rect key={y} x="143" y={y} width="14" height="7" rx="3" className="ilu-c1" />
      ))}
      <circle cx="150" cy="86" r="22" className="ilu-c2-aro" />
      {/* tarjeta EVA */}
      <g className="ilu-flota">
        <Tarjeta x="196" y="120" w="90" h="56" />
        <Linea x="206" y="131" w="40" c="ilu-texto-fuerte" />
        <defs>
          <linearGradient id="ilu-eva" x1="0" x2="1">
            <stop offset="0" className="ilu-stop-bien" />
            <stop offset="0.5" className="ilu-stop-medio" />
            <stop offset="1" className="ilu-stop-mal" />
          </linearGradient>
        </defs>
        <rect x="206" y="146" width="70" height="8" rx="4" fill="url(#ilu-eva)" />
        <circle cx="232" cy="150" r="6" className="ilu-marcador" />
        <Linea x="206" y="162" w="54" />
      </g>
      {/* pulso */}
      <g className="ilu-flota ilu-flota-2">
        <Tarjeta x="14" y="40" w="84" h="40" />
        <path d="M22 62 h16 l6 -12 l8 22 l6 -10 h30" className="ilu-pulso" />
      </g>
    </g>
  ),
  reportes: (
    <g>
      <circle cx="150" cy="100" r="78" className="ilu-halo" />
      <Tarjeta x="64" y="44" w="172" h="122" r="14" />
      <Linea x="78" y="56" w="54" c="ilu-texto-fuerte" />
      <Linea x="78" y="66" w="34" />
      <path d="M78 150 h144" className="ilu-pista-linea" />
      {[[86, 40], [108, 62], [130, 50], [152, 74], [174, 60], [196, 86]].map(([x, h], i) => (
        <rect key={x} x={x} y={150 - h} width="14" height={h} rx="4" className={i % 2 ? "ilu-c1" : "ilu-c1-suave"} />
      ))}
      <path d="M86 104 L114 86 L136 96 L160 72 L182 80 L206 58" className="ilu-linea-dato" />
      <circle cx="206" cy="58" r="5" className="ilu-c2" />
      {/* dona */}
      <g className="ilu-flota">
        <Tarjeta x="214" y="16" w="70" h="70" />
        <circle cx="249" cy="51" r="20" className="ilu-dona-pista" />
        <circle cx="249" cy="51" r="20" className="ilu-dona" strokeDasharray="80 126" transform="rotate(-90 249 51)" />
        <circle cx="249" cy="51" r="20" className="ilu-dona-2" strokeDasharray="30 126" strokeDashoffset="-80" transform="rotate(-90 249 51)" />
      </g>
      <g className="ilu-flota ilu-flota-2">
        <Tarjeta x="16" y="118" w="70" h="46" />
        <Linea x="26" y="129" w="30" />
        <Linea x="26" y="142" w="44" c="ilu-c2" />
      </g>
    </g>
  ),
  clientes: (
    <g>
      <circle cx="150" cy="100" r="78" className="ilu-halo" />
      {/* embudo */}
      <path d="M92 52 h116 l-22 34 h-72 z" className="ilu-c1-suave" />
      <path d="M114 92 h72 l-18 32 h-36 z" className="ilu-c1" />
      <path d="M132 130 h36 l-8 26 h-20 z" className="ilu-c2" />
      {/* personas */}
      <g className="ilu-flota">
        <Tarjeta x="200" y="112" w="86" h="62" />
        <circle cx="222" cy="134" r="10" className="ilu-c3" />
        <path d="M208 162 q14 -18 28 0" className="ilu-c3" />
        <Linea x="242" y="128" w="34" c="ilu-texto-fuerte" />
        <Linea x="242" y="140" w="24" />
        <rect x="242" y="152" width="34" height="10" rx="5" className="ilu-c2" />
      </g>
      {/* mensaje */}
      <g className="ilu-flota ilu-flota-2">
        <path d="M18 34 h72 a8 8 0 0 1 8 8 v28 a8 8 0 0 1 -8 8 h-50 l-12 10 v-10 h-10 a8 8 0 0 1 -8 -8 v-28 a8 8 0 0 1 8 -8 z" className="ilu-tarjeta" />
        <Linea x="28" y="46" w="50" c="ilu-texto-fuerte" />
        <Linea x="28" y="58" w="36" />
      </g>
    </g>
  ),
};

/** Pantalla vacía al entrar a un módulo: ilustración del tema con el logo del gimnasio, tenue */
export const SinSeleccion = ({ tema = "reportes", texto = "Elige una opción de arriba para empezar." }) => (
  <div className="rd-aparece rd-sin-seleccion relative overflow-hidden rounded-2xl border border-slate-200 bg-white/60 px-6 py-10 flex flex-col items-center justify-center min-h-[22rem]">
    <img src="/logo-daxsay.svg" alt="" aria-hidden className="rd-logo pointer-events-none select-none absolute -right-10 -bottom-12 w-72 h-72 opacity-[0.06] rounded-full" />
    <img src="/logo-daxsay.svg" alt="" aria-hidden className="rd-logo pointer-events-none select-none absolute -left-16 -top-16 w-56 h-56 opacity-[0.04] rounded-full" />
    <svg viewBox="0 0 300 190" className="rd-ilu relative w-80 max-w-full h-auto" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ILUSTRACIONES[tema] || ILUSTRACIONES.reportes}
    </svg>
    <p className="relative mt-4 text-xs font-bold text-slate-500 text-center max-w-md">{texto}</p>
  </div>
);
