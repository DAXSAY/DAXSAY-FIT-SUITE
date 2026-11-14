// "Ejercicio propio": formulario visual y completo (el mismo para entrenador y fisioterapia).
// Lo creado se guarda en el banco del gimnasio y aparece en ambos bancos de ejercicios.
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ImagePlus, Link2, Plus, Trash2, Upload, X } from "lucide-react";
import { MUSCLE_LABELS } from "./ExerciseBank";
import { BarraVolver } from "../common/BarraVolver";
import { subirImagen } from "../../utils/imagenes";
import { DESCANSOS } from "./SistemasEntrenamiento";

export const TIPOS_EJERCICIO = [
  ["fuerza", "💪", "Fuerza", "bg-indigo-50 text-indigo-800 border-indigo-200", "bg-indigo-600 text-white border-indigo-600"],
  ["hipertrofia", "🏋️", "Hipertrofia", "bg-violet-50 text-violet-800 border-violet-200", "bg-violet-600 text-white border-violet-600"],
  ["cardio", "🏃", "Cardio", "bg-teal-50 text-teal-700 border-teal-200", "bg-teal-600 text-white border-teal-600"],
  ["funcional", "🤸", "Funcional", "bg-orange-50 text-orange-800 border-orange-200", "bg-orange-600 text-white border-orange-600"],
  ["movilidad", "🧘", "Movilidad / estiramiento", "bg-sky-50 text-sky-800 border-sky-200", "bg-sky-600 text-white border-sky-600"],
  ["pliometria", "🦘", "Pliometría", "bg-amber-50 text-amber-800 border-amber-200", "bg-amber-600 text-white border-amber-600"],
  ["halterofilia", "🏅", "Halterofilia", "bg-rose-50 text-rose-800 border-rose-200", "bg-rose-600 text-white border-rose-600"],
  ["terapeutico", "🩺", "Terapéutico", "bg-emerald-50 text-emerald-800 border-emerald-200", "bg-emerald-600 text-white border-emerald-600"],
];
const NIVELES = [
  ["acondicionamiento", "🌱", "Acondicionamiento", "bg-emerald-50 text-emerald-800 border-emerald-200", "bg-emerald-600 text-white border-emerald-600"],
  ["principiante", "🙂", "Principiante", "bg-sky-50 text-sky-800 border-sky-200", "bg-sky-600 text-white border-sky-600"],
  ["intermedio", "💪", "Intermedio", "bg-amber-50 text-amber-800 border-amber-200", "bg-amber-600 text-white border-amber-600"],
  ["avanzado", "🔥", "Avanzado", "bg-rose-50 text-rose-800 border-rose-200", "bg-rose-600 text-white border-rose-600"],
];
const EQUIPOS = [
  ["mancuernas", "🏋️", "Mancuernas"],
  ["barra", "➖", "Barra"],
  ["maquina", "⚙️", "Máquina"],
  ["polea", "🪢", "Polea / cables"],
  ["peso_corporal", "🤸", "Peso corporal"],
  ["kettlebell", "🔔", "Kettlebell"],
  ["banda", "🎗️", "Banda elástica"],
  ["balon", "⚽", "Balón / fitball"],
  ["trx", "🧗", "TRX / suspensión"],
  ["cajon", "📦", "Cajón / step"],
  ["otro", "✳️", "Otro"],
];
const INP = "w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-600";

const Chips = ({ lista, valor, onChange, cols = "" }) => (
  <div className={`flex flex-wrap gap-1.5 ${cols}`}>
    {lista.map(([k, ic, l, suave, on]) => (
      <button key={k} type="button" onClick={() => onChange(k)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${valor === k ? on || "bg-slate-900 text-white border-slate-900" : suave || "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
        {ic} {l}
      </button>
    ))}
  </div>
);

const Seccion = ({ n, titulo, color, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
    <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
      <span className={`w-6 h-6 rounded-lg text-white text-xs flex items-center justify-center ${color}`}>{n}</span>
      {titulo}
    </h4>
    {children}
  </section>
);

export const FormEjercicioPropio = ({ onClose, onGuardar, tipoInicial = "fuerza", titulo = "Nuevo ejercicio propio" }) => {
  const [f, setF] = useState({
    name: "",
    tipo: tipoInicial,
    difficulty: "principiante",
    muscleGroup: tipoInicial === "terapeutico" ? "otros" : "pecho",
    equipment: "mancuernas",
    imagen: "",
    videoUrl: "",
    pasos: [""],
    tips: "",
    series: 3,
    reps: "10-12",
    descanso: 60,
  });
  const [estado, setEstado] = useState("");
  const [pegar, setPegar] = useState(false);
  const [enlace, setEnlace] = useState("");
  const archivo = useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const subir = async (e) => {
    const a = e.target.files?.[0];
    e.target.value = "";
    if (!a) return;
    setEstado("Subiendo imagen…");
    try {
      set("imagen", await subirImagen(a, "ejercicios"));
      setEstado("✓ Imagen lista");
    } catch (er) {
      setEstado(er.message || "No se pudo subir");
    }
  };

  const pasos = f.pasos.map((p) => p.trim()).filter(Boolean);
  const listo = f.name.trim().length >= 3 && pasos.length > 0;

  const guardar = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!listo) return;
    const ej = {
      name: f.name.trim(),
      tipo: f.tipo,
      muscleGroup: f.muscleGroup,
      equipment: f.equipment,
      difficulty: f.difficulty,
      steps: pasos,
      instructions: pasos.join(" "),
      tips: f.tips.trim() || "Controla el movimiento y respira de forma constante.",
      targetSetsRepsDefault: `${f.series} series x ${f.reps}`,
      defaultSets: f.series,
      defaultReps: f.reps,
      defaultRest: f.descanso,
      gifUrl: f.imagen || undefined,
      thumbnailUrl: f.imagen || undefined,
      videoUrl: f.videoUrl.trim() || undefined,
    };
    onGuardar(ej);
  };

  const tipo = TIPOS_EJERCICIO.find((t) => t[0] === f.tipo);
  const nivel = NIVELES.find((t) => t[0] === f.difficulty);

  // Portal: así su <form> nunca queda dentro de otro formulario (ej. la evaluación de fisioterapia)
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto min-h-full p-4 sm:p-8 space-y-4">
        <BarraVolver onVolver={onClose} titulo={titulo} subtitulo="Se guarda en el banco del gimnasio y queda disponible para entrenadores y fisioterapia." />

        <form onSubmit={guardar} className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
          <div className="space-y-3">
            <Seccion n="1" titulo="Nombre y tipo" color="bg-blue-600">
              <input autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Sentadilla búlgara con mancuernas" className={`${INP} text-base font-bold`} />
              <Chips lista={TIPOS_EJERCICIO} valor={f.tipo} onChange={(v) => set("tipo", v)} />
            </Seccion>

            <Seccion n="2" titulo="Nivel" color="bg-emerald-600">
              <Chips lista={NIVELES} valor={f.difficulty} onChange={(v) => set("difficulty", v)} />
            </Seccion>

            <Seccion n="3" titulo="Músculo principal y equipo" color="bg-violet-600">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(MUSCLE_LABELS).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => set("muscleGroup", k)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${f.muscleGroup === k ? "bg-violet-600 text-white border-violet-600" : "bg-violet-50 text-violet-800 border-violet-200"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                {EQUIPOS.map(([k, ic, l]) => (
                  <button key={k} type="button" onClick={() => set("equipment", k)} className={`px-2 py-2 rounded-xl border text-xs font-bold cursor-pointer flex items-center gap-1.5 ${f.equipment === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
                    <span className="text-base">{ic}</span> {l}
                  </button>
                ))}
              </div>
            </Seccion>

            <Seccion n="4" titulo="Cómo se hace (paso a paso)" color="bg-orange-600">
              {f.pasos.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 w-6 h-6 shrink-0 rounded-full bg-orange-100 text-orange-800 text-xs font-black flex items-center justify-center">{i + 1}</span>
                  <textarea rows={1} value={p} onChange={(e) => set("pasos", f.pasos.map((x, k) => (k === i ? e.target.value : x)))} placeholder={["Posición inicial: pies a la anchura de la cadera…", "Baja controlando en 2-3 segundos…", "Sube empujando con el talón y exhala…"][i] || "Siguiente paso…"} className={INP} />
                  {f.pasos.length > 1 && (
                    <button type="button" onClick={() => set("pasos", f.pasos.filter((_, k) => k !== i))} className="mt-2 p-1 text-slate-400 hover:text-rose-600 cursor-pointer" title="Quitar paso">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => set("pasos", [...f.pasos, ""])} className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold flex items-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Agregar paso
              </button>
              <input value={f.tips} onChange={(e) => set("tips", e.target.value)} placeholder="💡 Consejo del profesional (ej. mantén la espalda neutra, rodilla alineada con el pie)" className={INP} />
            </Seccion>

            <Seccion n="5" titulo="Dosis sugerida" color="bg-rose-600">
              <div className="grid grid-cols-2 sm:grid-cols-[8rem_1fr] gap-2">
                <label>
                  <span className="block text-[11px] font-bold text-slate-500">Series</span>
                  <input type="number" min="1" max="20" value={f.series} onChange={(e) => set("series", Number(e.target.value))} className={`${INP} text-center font-black`} />
                </label>
                <label>
                  <span className="block text-[11px] font-bold text-slate-500">Repeticiones o tiempo</span>
                  <input value={f.reps} onChange={(e) => set("reps", e.target.value)} className={`${INP} font-bold`} />
                </label>
              </div>
              <div className="flex flex-wrap gap-1">
                {DESCANSOS.map((d) => (
                  <button key={d} type="button" onClick={() => set("descanso", d)} className={`flex-1 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${f.descanso === d ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                    {d}s
                  </button>
                ))}
              </div>
            </Seccion>
          </div>

          {/* Vista previa con imagen */}
          <aside className="lg:sticky lg:top-6 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="aspect-square bg-slate-50 flex items-center justify-center relative">
                {f.imagen ? <img src={f.imagen} alt="" className="w-full h-full object-contain" /> : <ImagePlus className="w-14 h-14 text-slate-300" />}
                {tipo && <span className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full border text-[11px] font-bold ${tipo[4]}`}>{tipo[1]} {tipo[2]}</span>}
                {nivel && <span className={`absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full border text-[11px] font-bold ${nivel[3]}`}>{nivel[1]} {nivel[2]}</span>}
              </div>
              <div className="p-3 space-y-1">
                <p className="font-black text-slate-900">{f.name || "Nombre del ejercicio"}</p>
                <p className="text-xs text-slate-500">
                  {MUSCLE_LABELS[f.muscleGroup]} · {EQUIPOS.find((e) => e[0] === f.equipment)?.[2]} · {f.series}×{f.reps} · {f.descanso}s
                </p>
              </div>
              <div className="p-3 pt-0 space-y-2">
                <input ref={archivo} type="file" accept="image/*" className="hidden" onChange={subir} />
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => archivo.current?.click()} className="py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Subir imagen / GIF
                  </button>
                  <button type="button" onClick={() => setPegar((v) => !v)} className="py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer">
                    <Link2 className="w-3.5 h-3.5" /> Pegar enlace
                  </button>
                </div>
                {pegar && (
                  <div className="flex gap-1">
                    <input value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="https://… .gif / .jpg" className={`${INP} !py-1.5 text-xs`} />
                    <button type="button" onClick={() => { if (/^(https?:\/\/|\/uploads\/)/.test(enlace.trim())) { set("imagen", enlace.trim()); setPegar(false); setEnlace(""); } else setEstado("Pega un enlace que empiece con https://"); }} className="px-3 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">OK</button>
                  </div>
                )}
                {f.imagen && (
                  <button type="button" onClick={() => set("imagen", "")} className="w-full text-xs font-semibold text-rose-600 flex items-center justify-center gap-1 cursor-pointer">
                    <X className="w-3.5 h-3.5" /> Quitar imagen
                  </button>
                )}
                <input value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="Video de YouTube (opcional)" className={`${INP} !py-1.5 text-xs`} />
                {estado && <p className="text-[11px] text-slate-500 text-center">{estado}</p>}
              </div>
            </div>
            <button type="submit" disabled={!listo} className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <Check className="w-4 h-4" /> Guardar ejercicio
            </button>
            {!listo && <p className="text-[11px] text-slate-500 text-center">Falta el nombre y al menos un paso.</p>}
          </aside>
        </form>
      </div>
    </div>,
    document.body,
  );
};
