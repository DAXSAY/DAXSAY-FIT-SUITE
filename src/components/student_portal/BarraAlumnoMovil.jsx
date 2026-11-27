// Barra de navegación inferior del portal del alumno en el celular (como una
// app): Membresía, Rutina, Comidas, Medidas, Clases y «Más» (citas,
// fisioterapia y asistencias). En la PC no se muestra: ahí está el menú de la izquierda.
// Solo muestra las secciones que el gimnasio tiene contratadas.
import React, { useState } from "react";
import { useGym } from "../../context/GymContext";

const SECCIONES = [
  { k: "membership", modulo: "mi_membresia", emoji: "💳", label: "Membresía" },
  { k: "routine", modulo: "mi_rutina", emoji: "🏋️", label: "Rutina" },
  { k: "nutrition", modulo: "mi_dieta", emoji: "🍽️", label: "Comidas" },
  { k: "measurements", modulo: "mis_medidas", emoji: "📈", label: "Medidas" },
  { k: "clases", modulo: "mis_clases", emoji: "🎵", label: "Clases" },
  { k: "appointments", modulo: "mis_citas", emoji: "📅", label: "Avisos y citas" },
  { k: "physio", modulo: "mi_fisioterapia", emoji: "🩺", label: "Mi fisioterapia" },
  { k: "attendance", modulo: "mis_asistencias", emoji: "🙋", label: "Mis asistencias" },
];

export const BarraAlumnoMovil = ({ activa, onIr }) => {
  const { currentUser } = useGym();
  const mods = currentUser?.modules;
  const visibles = SECCIONES.filter((x) => !Array.isArray(mods) || mods.includes(x.modulo));
  // Hasta 5 botones abajo; si hay más, los últimos van en «Más»
  const PRINCIPALES = visibles.length <= 5 ? visibles : visibles.slice(0, 4);
  const MAS = visibles.length <= 5 ? [] : visibles.slice(4);
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
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${PRINCIPALES.length + (MAS.length ? 1 : 0)}, minmax(0, 1fr))` }}>
          {[...PRINCIPALES, ...(MAS.length ? [{ k: "_mas", emoji: "☰", label: "Más" }] : [])].map((m) => {
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
