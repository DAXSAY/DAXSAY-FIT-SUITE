// Texto guía del campo "Marcar asistencia" (el mismo en la barra superior y
// en Asistencias). En vez de un placeholder largo que se corta en pantallas
// angostas, muestra "Marcar asistencia:" fijo y va rotando qué se puede
// escribir: código del alumno, código del personal, DNI o pase libre.
import React, { useEffect, useState } from "react";

export const OPCIONES_MARCAR = ["código del socio (DF-1 o 1)", "código del personal (1-ENTRENADOR)", "DNI", "pase libre"];
export const TEXTO_MARCAR = "Marcar asistencia: código del socio o del personal, DNI o pase libre";

export const PistaMarcar = ({ visible, className = "", corta = false }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setI((x) => (x + 1) % OPCIONES_MARCAR.length), 2200);
    return () => clearInterval(id);
  }, [visible]);
  if (!visible) return null;
  return (
    <span aria-hidden="true" className={`rd-pista-marcar pointer-events-none absolute inset-y-0 flex items-center gap-1 min-w-0 overflow-hidden whitespace-nowrap ${className}`}>
      <span className={`shrink-0 font-semibold ${corta ? "hidden sm:inline" : ""}`}>Marcar asistencia:</span>
      <span key={i} className="rd-pista-opcion truncate">
        {OPCIONES_MARCAR[i]}
      </span>
    </span>
  );
};
