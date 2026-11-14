// Controles iguales a los de las ventanas («← Volver» y «✕») para las
// pantallas que se abren DENTRO de un módulo (editor de rutinas, progreso
// de un alumno, editar un mensaje…). También hacen que el botón «atrás» del
// navegador cierre esa pantalla en vez de salir del módulo.
import React from "react";
import { useAtras } from "../../utils/controlesVentana";

export const BotonVolver = ({ onClick, texto = "Volver" }) => (
  <button type="button" onClick={onClick} className="rd-ctrl-volver shrink-0" title="Volver" aria-label="Volver" data-rd-ctrl="volver-propio">
    <span aria-hidden="true">←</span> {texto}
  </button>
);

export const BotonCerrar = ({ onClick }) => (
  <button type="button" onClick={onClick} className="rd-ctrl-cerrar shrink-0" title="Cerrar" aria-label="Cerrar" data-rd-ctrl="cerrar-propio">
    <span aria-hidden="true">✕</span>
  </button>
);

/** Barra de una pantalla interna: ← Volver · título · ✕ */
export const BarraVolver = ({ onVolver, titulo, subtitulo, children, className = "" }) => {
  useAtras(true, onVolver);
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BotonVolver onClick={onVolver} />
      <div className="min-w-0 flex-1">
        {titulo && <div className="text-sm sm:text-base font-bold text-slate-900 leading-tight">{titulo}</div>}
        {subtitulo && <div className="text-xs text-slate-500 mt-0.5">{subtitulo}</div>}
      </div>
      {children}
      <BotonCerrar onClick={onVolver} />
    </div>
  );
};
