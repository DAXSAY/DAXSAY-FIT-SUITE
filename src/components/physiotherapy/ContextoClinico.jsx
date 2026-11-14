// Contexto clínico de la anamnesis: completa la ficha para un reporte
// fisioterapéutico completo (modelo biopsicosocial / CIF).
// Se guarda dentro de clinicalScales.contexto.
import React from "react";
import { UserRound } from "lucide-react";

export const TIEMPO_EVOLUCION = [
  ["agudo", "Agudo", "menos de 6 semanas"],
  ["subagudo", "Subagudo", "6 a 12 semanas"],
  ["cronico", "Crónico", "más de 12 semanas"],
  ["recidiva", "Recaída", "ya lo tuvo antes"],
];
export const TIPO_DOLOR = ["Punzante", "Quemante", "Sordo / profundo", "Eléctrico / hormigueo", "Pulsátil", "Rigidez"];
export const COMPORTAMIENTO = ["Empeora en la mañana", "Empeora en la noche", "Empeora al final del día", "Aumenta con el esfuerzo", "Mejora con el movimiento", "Mejora en reposo", "Despierta por la noche"];
export const IMAGENES = ["Radiografía", "Resonancia", "Ecografía", "Tomografía", "Electromiografía"];
export const PSICOSOCIAL = ["Miedo a moverse", "Estrés alto", "Duerme mal", "Ansiedad / ánimo bajo", "Baja motivación", "Espera solución pasiva", "Problemas laborales por el dolor"];
export const LIMITACIONES = ["Caminar", "Subir escaleras", "Agacharse", "Levantar peso", "Correr", "Dormir", "Trabajar sentado", "Entrenar en el gimnasio", "Vestirse"];

export const CONTEXTO_VACIO = {
  ocupacion: "",
  actividad: "",
  evolucion: "",
  tipoDolor: [],
  comportamiento: [],
  irradiacion: "",
  imagenes: [],
  imagenResultado: "",
  cirugias: "",
  psicosocial: [],
  limitaciones: [],
  objetivo: "",
};

const INP = "w-full text-sm px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500";
const LBL = "block text-xs font-bold text-slate-600 mb-1";

const Chips = ({ opciones, valor = [], onChange, tono = "blue", unico = false }) => (
  <div className="flex flex-wrap gap-1.5">
    {opciones.map((o) => {
      const [v, l, d] = Array.isArray(o) ? o : [o, o];
      const on = unico ? valor === v : valor.includes(v);
      return (
        <button
          key={v}
          type="button"
          title={d}
          onClick={() => onChange(unico ? (on ? "" : v) : on ? valor.filter((x) => x !== v) : [...valor, v])}
          className={`px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer ${
            on ? (tono === "rose" ? "bg-rose-600 border-rose-600 text-white" : tono === "amber" ? "bg-amber-500 border-amber-500 text-white" : "bg-blue-600 border-blue-600 text-white") : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
          }`}
        >
          {on ? "✓ " : ""}
          {l}
          {d && <span className="opacity-70 font-normal"> · {d}</span>}
        </button>
      );
    })}
  </div>
);

export const ContextoClinico = ({ scales, set }) => {
  const c = { ...CONTEXTO_VACIO, ...(scales?.contexto || {}) };
  const cambiar = (k, v) => set({ contexto: { ...c, [k]: v } });
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
      <div className="flex items-start gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
          <UserRound className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-black text-slate-900">Contexto clínico del paciente</p>
          <p className="text-xs text-slate-500">Completa el informe: evolución, comportamiento del dolor, estudios, factores que influyen y qué quiere lograr.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label>
          <span className={LBL}>Ocupación</span>
          <input value={c.ocupacion} onChange={(e) => cambiar("ocupacion", e.target.value)} placeholder="Ej. Contador · 8 h sentado" className={INP} />
        </label>
        <label>
          <span className={LBL}>Actividad física / deporte</span>
          <input value={c.actividad} onChange={(e) => cambiar("actividad", e.target.value)} placeholder="Ej. Pesas 4 veces por semana, fútbol los domingos" className={INP} />
        </label>
      </div>

      <div>
        <span className={LBL}>Tiempo de evolución</span>
        <Chips unico opciones={TIEMPO_EVOLUCION} valor={c.evolucion} onChange={(v) => cambiar("evolucion", v)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <span className={LBL}>Cómo es el dolor</span>
          <Chips opciones={TIPO_DOLOR} valor={c.tipoDolor} onChange={(v) => cambiar("tipoDolor", v)} />
        </div>
        <div>
          <span className={LBL}>Cuándo aparece o cambia</span>
          <Chips opciones={COMPORTAMIENTO} valor={c.comportamiento} onChange={(v) => cambiar("comportamiento", v)} />
        </div>
      </div>
      <label className="block">
        <span className={LBL}>¿Se irradia? (hacia dónde)</span>
        <input value={c.irradiacion} onChange={(e) => cambiar("irradiacion", e.target.value)} placeholder="Ej. Baja por la parte de atrás del muslo hasta la rodilla" className={INP} />
      </label>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-2">
          <span className={LBL}>Estudios de imagen</span>
          <Chips opciones={IMAGENES} valor={c.imagenes} onChange={(v) => cambiar("imagenes", v)} />
          {c.imagenes.length > 0 && (
            <input value={c.imagenResultado} onChange={(e) => cambiar("imagenResultado", e.target.value)} placeholder="Resultado del informe (ej. protrusión L4-L5)" className={INP} />
          )}
        </div>
        <label>
          <span className={LBL}>Cirugías o lesiones previas</span>
          <input value={c.cirugias} onChange={(e) => cambiar("cirugias", e.target.value)} placeholder="Ej. Artroscopia de rodilla derecha (2022)" className={INP} />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <span className={LBL}>Actividades que le cuestan (CIF)</span>
          <Chips tono="amber" opciones={LIMITACIONES} valor={c.limitaciones} onChange={(v) => cambiar("limitaciones", v)} />
        </div>
        <div>
          <span className={LBL}>Factores psicosociales (banderas amarillas)</span>
          <Chips tono="rose" opciones={PSICOSOCIAL} valor={c.psicosocial} onChange={(v) => cambiar("psicosocial", v)} />
        </div>
      </div>

      <label className="block">
        <span className={LBL}>¿Qué quiere lograr el paciente?</span>
        <input value={c.objetivo} onChange={(e) => cambiar("objetivo", e.target.value)} placeholder="Ej. Volver a hacer sentadilla sin dolor en 6 semanas" className={INP} />
      </label>
    </section>
  );
};

/** Líneas de texto para el reporte (PDF) */
export const lineasContexto = (contexto) => {
  const c = { ...CONTEXTO_VACIO, ...(contexto || {}) };
  const ev = TIEMPO_EVOLUCION.find((t) => t[0] === c.evolucion);
  return [
    c.ocupacion && ["Ocupación", c.ocupacion],
    c.actividad && ["Actividad física", c.actividad],
    ev && ["Tiempo de evolución", `${ev[1]} (${ev[2]})`],
    c.tipoDolor.length && ["Tipo de dolor", c.tipoDolor.join(", ")],
    c.comportamiento.length && ["Comportamiento", c.comportamiento.join(", ")],
    c.irradiacion && ["Irradiación", c.irradiacion],
    c.imagenes.length && ["Estudios", `${c.imagenes.join(", ")}${c.imagenResultado ? `: ${c.imagenResultado}` : ""}`],
    c.cirugias && ["Cirugías / lesiones previas", c.cirugias],
    c.limitaciones.length && ["Limitaciones en actividades", c.limitaciones.join(", ")],
    c.psicosocial.length && ["Factores psicosociales", c.psicosocial.join(", ")],
    c.objetivo && ["Objetivo del paciente", c.objetivo],
  ].filter(Boolean);
};
