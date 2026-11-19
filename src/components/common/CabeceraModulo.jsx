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

/** Pantalla vacía al entrar a un módulo: nada preseleccionado hasta que la persona elija */
export const SinSeleccion = ({ texto = "Elige una opción del menú de arriba para empezar." }) => (
  <div className="rd-aparece rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
    <svg viewBox="0 0 24 24" className="w-9 h-9 mx-auto text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
    <p className="mt-2 text-sm font-bold text-slate-600">{texto}</p>
  </div>
);
