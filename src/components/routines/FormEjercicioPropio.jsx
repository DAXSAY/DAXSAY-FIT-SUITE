// "Ejercicio propio": el mismo formato que los ejercicios del banco
// (imagen/GIF, zona, músculo objetivo, equipamiento, músculos secundarios y pasos),
// más el tipo de entrenamiento y el nivel. Lo usan entrenador y fisioterapia.
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Dumbbell, ImagePlus, Layers, Link2, ListOrdered, Plus, Target, Trash2, Upload, X } from "lucide-react";
import { MUSCLE_LABELS } from "./ExerciseBank";
import { BarraVolver } from "../common/BarraVolver";
import { subirImagen } from "../../utils/imagenes";
import { TIPOS_DIA } from "./SistemasEntrenamiento";
import { NIVELES_RUTINA } from "../../utils/rutinas";

// Colores de los chips (mismo tono que el "tipo de sesión")
export const TONO = {
  indigo: ["bg-indigo-50 text-indigo-800 border-indigo-200", "bg-indigo-600 text-white border-indigo-600"],
  violet: ["bg-violet-50 text-violet-800 border-violet-200", "bg-violet-600 text-white border-violet-600"],
  amber: ["bg-amber-50 text-amber-800 border-amber-200", "bg-amber-600 text-white border-amber-600"],
  sky: ["bg-sky-50 text-sky-800 border-sky-200", "bg-sky-600 text-white border-sky-600"],
  orange: ["bg-orange-50 text-orange-800 border-orange-200", "bg-orange-600 text-white border-orange-600"],
  rose: ["bg-rose-50 text-rose-800 border-rose-200", "bg-rose-600 text-white border-rose-600"],
  pink: ["bg-pink-50 text-pink-800 border-pink-200", "bg-pink-600 text-white border-pink-600"],
  teal: ["bg-teal-50 text-teal-700 border-teal-200", "bg-teal-600 text-white border-teal-600"],
  emerald: ["bg-emerald-50 text-emerald-800 border-emerald-200", "bg-emerald-600 text-white border-emerald-600"],
  slate: ["bg-slate-100 text-slate-800 border-slate-300", "bg-blue-600 text-white border-blue-600"],
};
export const TONO_NIVEL = { acondicionamiento: "emerald", principiante: "sky", intermedio: "amber", avanzado: "rose", experto: "violet" };

export const EQUIPOS = [
  ["🤸", "Peso corporal"],
  ["🏋️", "Mancuernas"],
  ["➖", "Barra"],
  ["〰️", "Barra Z"],
  ["⚙️", "Máquina"],
  ["🧩", "Máquina Smith"],
  ["🪢", "Polea / cables"],
  ["🔔", "Kettlebell"],
  ["🎗️", "Banda elástica"],
  ["⚽", "Balón medicinal"],
  ["🔵", "Fitball"],
  ["🧗", "TRX / suspensión"],
  ["📦", "Cajón / step"],
  ["🪑", "Banco"],
  ["💿", "Disco"],
  ["🪜", "Escalera de agilidad"],
  ["🔺", "Conos"],
  ["🌀", "Bosu"],
  ["🪨", "Saco / sandbag"],
  ["🧵", "Cuerda de batida"],
  ["🚴", "Bicicleta / elíptica"],
  ["🏃", "Caminadora"],
  ["🚣", "Remo"],
  ["🧘", "Colchoneta"],
];

// Músculos para "objetivo" y "secundarios" (se puede escribir otro)
export const MUSCULOS = [
  "Pectoral mayor", "Pectoral superior", "Dorsal ancho", "Trapecio", "Romboides", "Erectores espinales", "Deltoides anterior",
  "Deltoides lateral", "Deltoides posterior", "Manguito rotador", "Serrato anterior", "Bíceps braquial", "Braquial", "Braquiorradial",
  "Tríceps", "Antebrazos", "Recto abdominal", "Oblicuos", "Transverso abdominal", "Cuádriceps", "Isquiotibiales", "Glúteo mayor",
  "Glúteo medio", "Aductores", "Abductores", "Flexores de cadera", "Gemelos", "Sóleo", "Tibial anterior", "Cuello",
  "Sistema cardiovascular",
];

const INP = "w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-600";

const Seccion = ({ n, titulo, color, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5">
    <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
      <span className={`w-6 h-6 rounded-lg text-white text-xs flex items-center justify-center ${color}`}>{n}</span>
      <span className="flex-1">{titulo}</span>
    </h4>
    {children}
  </section>
);

/** Varias opciones + escribir una nueva */
const ChipsMultiples = ({ opciones, valor, onChange, placeholder }) => {
  const [otro, setOtro] = useState("");
  const alternar = (m) => onChange(valor.includes(m) ? valor.filter((x) => x !== m) : [...valor, m]);
  const agregar = () => {
    const t = otro.trim();
    if (t && !valor.includes(t)) onChange([...valor, t]);
    setOtro("");
  };
  const extras = valor.filter((v) => !opciones.includes(v));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {[...opciones, ...extras].map((m) => (
          <button key={m} type="button" onClick={() => alternar(m)} className={`px-2.5 py-1 rounded-full border text-xs font-bold cursor-pointer ${valor.includes(m) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
            {valor.includes(m) ? "✓ " : ""}
            {m}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={otro}
          onChange={(e) => setOtro(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              agregar();
            }
          }}
          placeholder={placeholder}
          className={`${INP} !py-1.5 text-xs`}
        />
        <button type="button" onClick={agregar} className="px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 whitespace-nowrap">
          + Añadir
        </button>
      </div>
    </div>
  );
};

export const FormEjercicioPropio = ({ onClose, onGuardar, tipoInicial = "fuerza", titulo = "Ejercicio propio" }) => {
  const [f, setF] = useState({
    name: "",
    tipo: tipoInicial,
    difficulty: "principiante",
    zona: tipoInicial === "rehabilitacion" ? "otros" : "pecho",
    zonaOtra: "",
    target: "",
    equipment: "Peso corporal",
    equipoOtro: "",
    secundarios: [],
    imagen: "",
    videoUrl: "",
    pasos: [""],
    tips: "",
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
  // Zona: una de la lista o la escrita en "Otra"
  const zona = f.zona === "otros" ? f.zonaOtra.trim() || "otros" : f.zona;
  const zonaTexto = MUSCLE_LABELS[zona] || zona;
  const equipo = f.equipment === "Otro" ? f.equipoOtro.trim() || "Otro" : f.equipment;
  const objetivo = f.target.trim() || zonaTexto;
  const listo = f.name.trim().length >= 3 && pasos.length > 0;

  const guardar = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!listo) return;
    onGuardar({
      name: f.name.trim(),
      tipo: f.tipo,
      difficulty: f.difficulty,
      muscleGroup: zona,
      target: objetivo,
      equipment: equipo,
      secondaryMuscles: f.secundarios,
      steps: pasos,
      instructions: pasos.join(" "),
      tips: f.tips.trim() || undefined,
      gifUrl: f.imagen || undefined,
      thumbnailUrl: f.imagen || undefined,
      videoUrl: f.videoUrl.trim() || undefined,
    });
  };

  const tipo = TIPOS_DIA.find((t) => t[0] === f.tipo);
  const nivel = NIVELES_RUTINA.find((t) => t[0] === f.difficulty);

  // Portal: así su <form> nunca queda dentro de otro formulario (ej. la evaluación de fisioterapia)
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto min-h-full p-4 sm:p-8 space-y-4">
        <BarraVolver onVolver={onClose} titulo={titulo} subtitulo="Queda en el banco de ejercicios con el mismo formato que los demás, para entrenadores y fisioterapia." />

        <form onSubmit={guardar} className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
          <div className="space-y-3">
            <Seccion n="1" titulo="Nombre del ejercicio" color="bg-blue-600">
              <input autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Sentadilla búlgara con mancuernas" className={`${INP} text-base font-bold`} />
            </Seccion>

            <Seccion n="2" titulo="Tipo de entrenamiento" color="bg-orange-600">
              <div className="flex flex-wrap gap-1.5">
                {TIPOS_DIA.map(([k, ic, l, c]) => (
                  <button key={k} type="button" onClick={() => set("tipo", k)} className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${TONO[c][f.tipo === k ? 1 : 0]}`}>
                    {ic} {l}
                  </button>
                ))}
              </div>
            </Seccion>

            <Seccion n="3" titulo="Nivel" color="bg-emerald-600">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {NIVELES_RUTINA.map(([k, ic, l, d]) => (
                  <button key={k} type="button" title={d} onClick={() => set("difficulty", k)} className={`px-2 py-2 rounded-xl border text-xs font-bold cursor-pointer text-left ${TONO[TONO_NIVEL[k]][f.difficulty === k ? 1 : 0]}`}>
                    <span className="block">
                      {ic} {l}
                    </span>
                    <span className={`block text-[10px] font-semibold leading-tight mt-0.5 ${f.difficulty === k ? "opacity-90" : "opacity-70"}`}>{d}</span>
                  </button>
                ))}
              </div>
            </Seccion>

            <Seccion n="4" titulo="Zona y músculos" color="bg-violet-600">
              <span className="block text-[11px] font-bold text-slate-500">Zona muscular (como aparece en el banco)</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(MUSCLE_LABELS).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => set("zona", k)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${f.zona === k ? "bg-violet-600 text-white border-violet-600" : "bg-violet-50 text-violet-800 border-violet-200"}`}>
                    {k === "otros" ? "✏️ Otra (escribir)" : l}
                  </button>
                ))}
              </div>
              {f.zona === "otros" && <input value={f.zonaOtra} onChange={(e) => set("zonaOtra", e.target.value)} placeholder="Escribe la zona, ej. Serrato, Suelo pélvico…" className={INP} />}
              <label className="block pt-1">
                <span className="mb-0.5 text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> Músculo objetivo
                </span>
                <input value={f.target} onChange={(e) => set("target", e.target.value)} list="musculos-objetivo" placeholder={`Ej. ${zonaTexto === "Pecho" ? "Pectoral mayor" : zonaTexto} (escribe o elige)`} className={INP} />
                <datalist id="musculos-objetivo">{MUSCULOS.map((m) => <option key={m} value={m} />)}</datalist>
              </label>
              <div>
                <span className="mb-1 text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Músculos secundarios
                </span>
                <ChipsMultiples opciones={MUSCULOS} valor={f.secundarios} onChange={(v) => set("secundarios", v)} placeholder="Otro músculo secundario y Enter (ej. Trapecio inferior)" />
              </div>
            </Seccion>

            <Seccion n="5" titulo="Equipamiento" color="bg-slate-700">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[...EQUIPOS, ["✏️", "Otro"]].map(([ic, l]) => (
                  <button key={l} type="button" onClick={() => set("equipment", l)} className={`px-2 py-2 rounded-xl border text-xs font-bold cursor-pointer flex items-center gap-1.5 text-left ${f.equipment === l ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"}`}>
                    <span className="text-base">{ic}</span> {l === "Otro" ? "Otro (escribir)" : l}
                  </button>
                ))}
              </div>
              {f.equipment === "Otro" && <input value={f.equipoOtro} onChange={(e) => set("equipoOtro", e.target.value)} placeholder="Escribe el equipamiento, ej. Landmine, rueda abdominal…" className={INP} />}
            </Seccion>

            <Seccion n="6" titulo="Ejecución paso a paso" color="bg-rose-600">
              {f.pasos.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 w-6 h-6 shrink-0 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
                  <textarea rows={1} value={p} onChange={(e) => set("pasos", f.pasos.map((x, k) => (k === i ? e.target.value : x)))} placeholder={["Posición inicial: pies a la anchura de la cadera…", "Baja controlando en 2-3 segundos…", "Sube empujando con el talón y exhala…"][i] || "Siguiente paso…"} className={INP} />
                  {f.pasos.length > 1 && (
                    <button type="button" onClick={() => set("pasos", f.pasos.filter((_, k) => k !== i))} className="mt-2 p-1 text-slate-400 hover:text-rose-600 cursor-pointer" title="Quitar paso">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => set("pasos", [...f.pasos, ""])} className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Otro paso
              </button>
              <input value={f.tips} onChange={(e) => set("tips", e.target.value)} placeholder="💡 Consejo del profesional (opcional), ej. mantén la espalda neutra" className={INP} />
            </Seccion>
          </div>

          {/* Vista previa: igual que la ficha de un ejercicio del banco */}
          <aside className="lg:sticky lg:top-6 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-slate-900 text-white px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">{zonaTexto}</span>
                <p className="text-base font-extrabold truncate">{f.name || "Nombre del ejercicio"}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tipo && <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${TONO[tipo[3]][1]}`}>{tipo[1]} {tipo[2]}</span>}
                  {nivel && <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${TONO[TONO_NIVEL[nivel[0]]][1]}`}>{nivel[1]} {nivel[2]}</span>}
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="aspect-square rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                  {f.imagen ? <img src={f.imagen} alt="" className="w-full h-full object-contain" /> : <ImagePlus className="w-14 h-14 text-slate-300" />}
                </div>
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
                    <button
                      type="button"
                      onClick={() => {
                        if (/^(https?:\/\/|\/uploads\/)/.test(enlace.trim())) {
                          set("imagen", enlace.trim());
                          setPegar(false);
                          setEnlace("");
                        } else setEstado("Pega un enlace que empiece con https://");
                      }}
                      className="px-3 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                )}
                {f.imagen && (
                  <button type="button" onClick={() => set("imagen", "")} className="w-full text-xs font-semibold text-rose-600 flex items-center justify-center gap-1 cursor-pointer">
                    <X className="w-3.5 h-3.5" /> Quitar imagen
                  </button>
                )}
                {estado && <p className="text-[11px] text-slate-500 text-center">{estado}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Músculo objetivo
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{objetivo}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <Dumbbell className="w-3 h-3" /> Equipamiento
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{equipo}</p>
                  </div>
                </div>
                {f.secundarios.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Músculos secundarios
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {f.secundarios.map((m) => (
                        <span key={m} className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {pasos.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <ListOrdered className="w-3 h-3" /> Ejecución paso a paso
                    </span>
                    <ol className="mt-1 space-y-0.5 text-xs text-slate-700 list-decimal list-inside">
                      {pasos.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ol>
                  </div>
                )}
                <input value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="Video de YouTube (opcional)" className={`${INP} !py-1.5 text-xs`} />
              </div>
            </div>
            <button type="submit" disabled={!listo} className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <Check className="w-4 h-4" /> Guardar en el banco
            </button>
            {!listo && <p className="text-[11px] text-slate-500 text-center">Falta el nombre y al menos un paso.</p>}
          </aside>
        </form>
      </div>
    </div>,
    document.body,
  );
};
