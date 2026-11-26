// Barra de navegación inferior del portal del alumno en el celular (como una
// app): Membresía, Rutina, Alimentación, Medidas y «Más» (citas, fisioterapia
// y asistencias). En la PC no se muestra: ahí están las pestañas de arriba.
import React, { useState } from "react";

const PRINCIPALES = [
  { k: "membership", emoji: "💳", label: "Membresía" },
  { k: "routine", emoji: "🏋️", label: "Rutina" },
  { k: "nutrition", emoji: "🍽️", label: "Comidas" },
  { k: "measurements", emoji: "📈", label: "Medidas" },
];
const MAS = [
  { k: "appointments", emoji: "📅", label: "Avisos y citas" },
  { k: "physio", emoji: "🩺", label: "Mi fisioterapia" },
  { k: "attendance", emoji: "🙋", label: "Mis asistencias" },
];

export const BarraAlumnoMovil = ({ activa, onIr }) => {
  const [mas, setMas] = useState(false);
  const enMas = MAS.some((m) => m.k === activa);
  const ir = (k) => {
    setMas(false);
    onIr(k);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <>
      {mas && (
        <div className="rd-barra-alumno-velo md:hidden fixed inset-0 z-[55]" onClick={() => setMas(false)}>
          <div className="rd-barra-alumno-hoja absolute left-3 right-3 bottom-[5.25rem] rounded-2xl border p-2 space-y-1" onClick={(e) => e.stopPropagation()}>
            {MAS.map((m) => (
              <button
                key={m.k}
                type="button"
                onClick={() => ir(m.k)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-extrabold cursor-pointer ${activa === m.k ? "rd-barra-alumno-on" : ""}`}
              >
                <span className="rd-emoji text-lg">{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="rd-barra-alumno md:hidden fixed left-0 right-0 bottom-0 z-[56] border-t px-2 pt-1.5 pb-[max(.5rem,env(safe-area-inset-bottom))]" aria-label="Secciones del portal">
        <div className="grid grid-cols-5 gap-1">
          {[...PRINCIPALES, { k: "_mas", emoji: "☰", label: "Más" }].map((m) => {
            const on = m.k === "_mas" ? enMas || mas : activa === m.k;
            return (
              <button
                key={m.k}
                type="button"
                onClick={() => (m.k === "_mas" ? setMas((v) => !v) : ir(m.k))}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl cursor-pointer ${on ? "rd-barra-alumno-on" : ""}`}
                aria-current={on ? "page" : undefined}
              >
                <span className="rd-emoji text-xl leading-none">{m.emoji}</span>
                <span className="text-[10px] font-black leading-tight">{m.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
