import React from "react";
import { Activity } from "lucide-react";

export const DEFAULT_WILLIAMS_EXERCISES = [
  {
    id: "williams-1",
    number: 1,
    name: "1. Pelvic Tilt (Inclinación / Retroversión Pélvica)",
    description:
      "Decúbito supino, rodillas dobladas. Aplanar la columna lumbar contra la camilla activando abdomen y glúteos.",
    selected: true,
    executionStatus: "correcto_sin_dolor",
    painEVA: 1,
    repetitionsOrHold: "10 contracciones de 5 seg",
    clinicalComment:
      "Buena activación del transverso abdominal sin compensación de cuello.",
  },
  {
    id: "williams-2",
    number: 2,
    name: "2. Rodilla Simple al Pecho (Single Knee to Chest)",
    description:
      "Flexión unamipodal hacia el tórax sujetando detrás del muslo. Evalúa flexibilidad de glúteo mayor y fascia lumbar.",
    selected: true,
    executionStatus: "correcto_sin_dolor",
    painEVA: 2,
    repetitionsOrHold: "3 repeticiones de 20 seg por pierna",
    clinicalComment:
      "Alivio notable de la tensión paravertebral en la descarga.",
  },
  {
    id: "williams-3",
    number: 3,
    name: "3. Rodillas Dobles al Pecho (Double Knee to Chest)",
    description:
      "Ambas rodillas llevadas al pecho simultáneamente. Provoca máxima apertura foraminal lumbosacra.",
    selected: true,
    executionStatus: "molestia_leve",
    painEVA: 3,
    repetitionsOrHold: "3 repeticiones de 20 seg",
    clinicalComment:
      "Molestia leve al final del arco por acortamiento de glúteos.",
  },
  {
    id: "williams-4",
    number: 4,
    name: "4. Flexión Parcial de Tronco (Crunch Abdominal Modificado)",
    description:
      "Despegue escapular con rodillas dobladas. Fortalece pared abdominal anterior sin sobrecargar el psoas.",
    selected: true,
    executionStatus: "correcto_sin_dolor",
    painEVA: 1,
    repetitionsOrHold: "2 series de 10 repeticiones",
    clinicalComment: "Fuerza abdominal adecuada, mantiene pelvis estable.",
  },
  {
    id: "williams-5",
    number: 5,
    name: "5. Estiramiento Isquiotibial en Sedente (Hamstring Stretch)",
    description:
      "Sedente con rodillas extendidas, flexión anterior de tronco. Mide flexibilidad de cadena miofascial posterior.",
    selected: true,
    executionStatus: "molestia_leve",
    painEVA: 4,
    repetitionsOrHold: "3 repeticiones de 15 seg",
    clinicalComment:
      "Tirantez en tercio medio de isquiotibiales con distancia dedos-planta de 12 cm.",
  },
  {
    id: "williams-6",
    number: 6,
    name: "6. Estiramiento de Flexores de Cadera / Zancada (Hip Flexor Stretch)",
    description:
      "Posición de caballero o zancada baja, retroversión pélvica para elongar el psoas-ilíaco y recto anterior.",
    selected: true,
    executionStatus: "correcto_sin_dolor",
    painEVA: 2,
    repetitionsOrHold: "3 repeticiones de 20 seg por lado",
    clinicalComment:
      "Disminuye la anteversión forzada y descomprime charnela lumbosacra.",
  },
];

// Ejercicios complementarios (se agregan con un clic)
export const WILLIAMS_EXTRA = [
  { id: "williams-7", number: 7, name: "7. Sentadilla profunda asistida (Full Squat)", description: "De pie, pies al ancho de hombros, bajar en cuclillas manteniendo talones apoyados. Abre el espacio lumbosacro y moviliza caderas." },
  { id: "williams-8", number: 8, name: "8. Postura del niño (Child's Pose)", description: "Sentado sobre talones, llevar el tronco hacia adelante con brazos extendidos. Descarga la musculatura paravertebral." },
  { id: "williams-9", number: 9, name: "9. Puente de glúteos", description: "Decúbito supino, rodillas flexionadas: elevar la pelvis con retroversión. Fortalece glúteo mayor y estabiliza la pelvis." },
  { id: "williams-10", number: 10, name: "10. Gato - camello (cuadrupedia)", description: "En cuatro apoyos, alternar flexión y extensión de columna de forma lenta. Movilidad segmentaria lumbar y torácica." },
  { id: "williams-11", number: 11, name: "11. Estiramiento de piriforme", description: "Supino, cruzar el tobillo sobre la rodilla contraria y llevar el muslo al pecho. Alivia tensión glútea y ciática." },
  { id: "williams-12", number: 12, name: "12. Retroversión pélvica de pie contra la pared", description: "Espalda apoyada en la pared, aplanar la zona lumbar contra ella. Traslada el control pélvico a la postura de pie." },
].map((e) => ({ ...e, selected: false, executionStatus: "correcto_sin_dolor", painEVA: 0, repetitionsOrHold: "2 series de 10", clinicalComment: "" }));

export const TOLERANCIAS_WILLIAMS = [
  ["excelente", "Excelente", "Sin dolor (EVA 0)", "emerald"],
  ["muy_buena", "Muy buena", "Molestia mínima (EVA 1-2)", "teal"],
  ["buena", "Buena", "Molestia leve tolerable (EVA 3)", "sky"],
  ["regular_con_molestia", "Regular", "Dolor moderado (EVA 4-5)", "amber"],
  ["limitada", "Limitada", "Dolor que limita el movimiento (EVA 6-7)", "orange"],
  ["deficiente_dolorosa", "Deficiente", "Dolor severo (EVA 8-10)", "rose"],
  ["no_tolera", "No tolera", "Se suspende el protocolo", "fuchsia"],
];

export const RESPUESTAS_WILLIAMS = [
  ["correcto_sin_dolor", "Correcto, sin dolor", "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"],
  ["correcto_compensacion", "Correcto con compensación", "bg-teal-500/15 border-teal-500/40 text-teal-300"],
  ["molestia_leve", "Molestia leve (tolerable)", "bg-sky-500/15 border-sky-500/40 text-sky-300"],
  ["molestia_moderada", "Molestia moderada", "bg-amber-500/15 border-amber-500/40 text-amber-300"],
  ["dolor_limitante", "Dolor punzante / limitante", "bg-rose-500/15 border-rose-500/40 text-rose-300"],
  ["no_realiza", "No lo pudo realizar", "bg-slate-500/20 border-slate-500/40 text-slate-300"],
  ["contraindicado", "Contraindicado / no evaluar", "bg-purple-500/15 border-purple-500/40 text-purple-300"],
];
export const textoRespuestaWilliams = (k) => RESPUESTAS_WILLIAMS.find(([x]) => x === k)?.[1] || String(k || "").replace(/_/g, " ");
export const textoToleranciaWilliams = (k) => {
  const t = TOLERANCIAS_WILLIAMS.find(([x]) => x === k);
  return t ? `${t[1]} · ${t[2]}` : String(k || "").replace(/_/g, " ");
};
/** Ejercicios elegidos (los registros antiguos no tienen `selected`: cuentan todos) */
export const williamsElegidos = (ev) => (ev?.exercises || []).filter((e) => e.selected !== false);

// SVG Drawings for each Williams exercise
export const WilliamsExerciseSVG = ({ exerciseNumber }) => {
  switch (exerciseNumber) {
    case 1:
      // Pelvic Tilt
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line
            x1="10"
            y1="48"
            x2="90"
            y2="48"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Supine body */}
          <circle cx="22" cy="40" r="5" fill="var(--color-sky-400)" />
          <path d="M26 44 L50 46" stroke="var(--color-sky-400)" strokeWidth="3" />
          {/* Bent knees */}
          <path
            d="M50 46 L64 28 L76 48"
            stroke="var(--color-sky-400)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Pelvis flat arrow down */}
          <path
            d="M46 38 L46 45"
            stroke="var(--color-green-500)"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />
        </svg>
      );
    case 2:
      // Single knee to chest
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line
            x1="10"
            y1="48"
            x2="90"
            y2="48"
            stroke="#334155"
            strokeWidth="2"
          />
          <circle cx="20" cy="40" r="5" fill="var(--color-sky-400)" />
          <line
            x1="24"
            y1="44"
            x2="48"
            y2="46"
            stroke="var(--color-sky-400)"
            strokeWidth="3"
          />
          {/* One leg flat, one bent to chest */}
          <line
            x1="48"
            y1="46"
            x2="80"
            y2="48"
            stroke="#64748b"
            strokeWidth="2.5"
          />
          <path
            d="M48 46 L42 26 L52 24"
            stroke="var(--color-amber-500)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Arm holding knee */}
          <path
            d="M30 42 L48 26"
            stroke="var(--color-sky-400)"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
        </svg>
      );
    case 3:
      // Double knee to chest
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line
            x1="10"
            y1="48"
            x2="90"
            y2="48"
            stroke="#334155"
            strokeWidth="2"
          />
          <circle cx="20" cy="40" r="5" fill="var(--color-sky-400)" />
          <line
            x1="24"
            y1="44"
            x2="44"
            y2="46"
            stroke="var(--color-sky-400)"
            strokeWidth="3"
          />
          {/* Both knees bent to chest */}
          <path
            d="M44 46 L38 24 L50 22"
            stroke="var(--color-purple-500)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path d="M28 42 L44 24" stroke="var(--color-sky-400)" strokeWidth="2" />
        </svg>
      );
    case 4:
      // Partial crunch
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line
            x1="10"
            y1="48"
            x2="90"
            y2="48"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Torso curled up */}
          <circle cx="26" cy="30" r="5" fill="var(--color-sky-400)" />
          <path
            d="M28 34 C36 40, 44 46, 52 46"
            stroke="var(--color-sky-400)"
            strokeWidth="3"
          />
          <path
            d="M52 46 L66 28 L78 48"
            stroke="var(--color-sky-400)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M32 34 L54 32" stroke="var(--color-green-500)" strokeWidth="2" />
        </svg>
      );
    case 5:
      // Hamstring stretch
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line
            x1="10"
            y1="48"
            x2="90"
            y2="48"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Sitting folded */}
          <path d="M30 48 L78 48" stroke="var(--color-sky-400)" strokeWidth="3.5" />
          <circle cx="44" cy="28" r="5" fill="var(--color-sky-400)" />
          <path d="M30 48 L42 32 L68 44" stroke="var(--color-amber-500)" strokeWidth="3" />
        </svg>
      );
    case 7:
      // Sentadilla profunda
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line x1="10" y1="52" x2="90" y2="52" stroke="#334155" strokeWidth="2" />
          <circle cx="44" cy="14" r="5" fill="var(--color-sky-400)" />
          <path d="M44 19 L48 34 L60 40 L56 52" stroke="var(--color-sky-400)" strokeWidth="3" strokeLinecap="round" />
          <path d="M44 24 L62 26" stroke="var(--color-green-500)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 8:
      // Postura del niño
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="#334155" strokeWidth="2" />
          <circle cx="26" cy="44" r="5" fill="var(--color-sky-400)" />
          <path d="M30 42 Q46 28 62 40 L68 48 L56 48" stroke="var(--color-sky-400)" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 46 L12 48" stroke="var(--color-green-500)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 9:
      // Puente de glúteos
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="#334155" strokeWidth="2" />
          <circle cx="18" cy="45" r="5" fill="var(--color-sky-400)" />
          <path d="M22 46 L48 32 L64 30 L72 50" stroke="var(--color-sky-400)" strokeWidth="3" strokeLinecap="round" />
          <path d="M48 40 L48 33" stroke="var(--color-green-500)" strokeWidth="2" />
        </svg>
      );
    case 10:
      // Gato - camello
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="#334155" strokeWidth="2" />
          <circle cx="24" cy="30" r="5" fill="var(--color-sky-400)" />
          <path d="M28 32 Q48 16 68 32" stroke="var(--color-green-500)" strokeWidth="3" strokeLinecap="round" />
          <path d="M30 34 L30 50 M66 34 L66 50" stroke="var(--color-sky-400)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 11:
      // Estiramiento de piriforme
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="#334155" strokeWidth="2" />
          <circle cx="18" cy="45" r="5" fill="var(--color-sky-400)" />
          <path d="M22 46 L48 46 L60 30 L70 46" stroke="var(--color-sky-400)" strokeWidth="3" strokeLinecap="round" />
          <path d="M60 30 L48 36 L58 40" stroke="var(--color-green-500)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 12:
      // Retroversión pélvica de pie contra la pared
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line x1="66" y1="6" x2="66" y2="54" stroke="#334155" strokeWidth="3" />
          <circle cx="58" cy="12" r="5" fill="var(--color-sky-400)" />
          <path d="M60 17 L62 36 L56 44 L60 54" stroke="var(--color-sky-400)" strokeWidth="3" strokeLinecap="round" />
          <path d="M54 32 L60 34" stroke="var(--color-green-500)" strokeWidth="2" />
        </svg>
      );
    case 6:
    default:
      // Hip flexor lunge
      return (
        <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
          <rect width="100" height="60" rx="8" fill="#0f172a" />
          <line
            x1="10"
            y1="48"
            x2="90"
            y2="48"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Lunge position */}
          <circle cx="48" cy="22" r="5" fill="var(--color-sky-400)" />
          <line
            x1="48"
            y1="27"
            x2="48"
            y2="40"
            stroke="var(--color-sky-400)"
            strokeWidth="3"
          />
          {/* Front leg */}
          <path
            d="M48 40 L64 40 L64 48"
            stroke="var(--color-green-500)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Back leg knee down */}
          <path
            d="M48 40 L34 44 L24 48"
            stroke="var(--color-sky-400)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

const TONO = {
  emerald: "bg-emerald-500 border-emerald-400",
  teal: "bg-teal-500 border-teal-400",
  sky: "bg-sky-500 border-sky-400",
  amber: "bg-amber-500 border-amber-400",
  orange: "bg-orange-500 border-orange-400",
  rose: "bg-rose-500 border-rose-400",
  fuchsia: "bg-fuchsia-500 border-fuchsia-400",
};

export const WilliamsVisuals = ({ williamsEval, onChange, readOnly = false }) => {
  const base = williamsEval || {
    enabled: true,
    overallTolerance: "buena",
    summaryNotes: "",
    exercises: DEFAULT_WILLIAMS_EXERCISES,
  };
  // Siempre se ofrecen los 12 ejercicios; los que no están en el registro se agregan sin elegir
  const ids = new Set((base.exercises || []).map((e) => e.id));
  const todos = [...(base.exercises || []).map((e) => ({ ...e, selected: e.selected !== false })), ...WILLIAMS_EXTRA.filter((e) => !ids.has(e.id))].sort(
    (a, b) => a.number - b.number,
  );
  const current = { ...base, exercises: todos };
  const elegidos = todos.filter((e) => e.selected);

  const cambiar = (cambio) => onChange && onChange({ ...current, ...cambio });
  const actualizar = (id, campo, valor) => cambiar({ exercises: todos.map((e) => (e.id === id ? { ...e, [campo]: valor } : e)) });
  const alternar = (id) => !readOnly && actualizar(id, "selected", !todos.find((e) => e.id === id)?.selected);

  return (
    <div className="space-y-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-indigo-900/40 text-white shadow-xl select-none rd-panel-oscuro">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
              Protocolo de flexión de Williams (columna lumbosacra)
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {elegidos.length} de {todos.length} ejercicios
              </span>
            </h4>
            <p className="text-xs text-slate-400">Toca los ejercicios que aplicaste. Solo los elegidos salen en el informe.</p>
          </div>
        </div>
      </div>

      {/* Tolerancia global */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-slate-300 uppercase">Tolerancia global</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-1.5">
          {TOLERANCIAS_WILLIAMS.map(([k, l, d, c]) => {
            const on = current.overallTolerance === k;
            return (
              <button
                key={k}
                type="button"
                disabled={readOnly}
                onClick={() => cambiar({ overallTolerance: k })}
                className={`text-left rounded-xl border px-2.5 py-1.5 cursor-pointer disabled:cursor-default ${on ? `${TONO[c]} text-white` : "bg-slate-950/60 border-slate-700 text-slate-300 hover:border-slate-500"}`}
              >
                <span className="block text-xs font-black">{l}</span>
                <span className={`block text-[10px] leading-tight ${on ? "text-white/90" : "text-slate-500"}`}>{d}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selección múltiple de ejercicios */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
        {todos.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => alternar(e.id)}
            className={`relative rounded-xl border p-1.5 text-left cursor-pointer transition-colors ${e.selected ? "border-indigo-400 bg-indigo-500/15" : "border-slate-700 bg-slate-950/50 opacity-70 hover:opacity-100"}`}
          >
            {e.selected && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-indigo-500 text-white text-[11px] font-black flex items-center justify-center">✓</span>}
            <div className="w-full aspect-[5/3] rounded-lg overflow-hidden">
              <WilliamsExerciseSVG exerciseNumber={e.number} />
            </div>
            <span className="block mt-1 text-[11px] font-bold leading-tight line-clamp-2">{e.name}</span>
          </button>
        ))}
      </div>

      {/* Detalle de los elegidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {elegidos.map((item) => {
          const r = RESPUESTAS_WILLIAMS.find(([k]) => k === item.executionStatus) || RESPUESTAS_WILLIAMS[0];
          return (
            <div key={item.id} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex gap-3">
              <div className="w-36 shrink-0 space-y-1">
                <div className="w-36 h-24 rounded-xl overflow-hidden">
                  <WilliamsExerciseSVG exerciseNumber={item.number} />
                </div>
                <input
                  type="text"
                  disabled={readOnly}
                  value={item.repetitionsOrHold || ""}
                  onChange={(e) => actualizar(item.id, "repetitionsOrHold", e.target.value)}
                  placeholder="Series / tiempo"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h5 className="text-xs font-extrabold text-white leading-tight">{item.name}</h5>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{item.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    disabled={readOnly}
                    value={item.executionStatus}
                    onChange={(e) => actualizar(item.id, "executionStatus", e.target.value)}
                    className={`w-full p-1.5 rounded-lg text-[11px] font-bold border ${r[2]} bg-slate-900`}
                  >
                    {RESPUESTAS_WILLIAMS.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Dolor EVA</span>
                      <span className={`text-xs font-mono font-black ${item.painEVA >= 7 ? "text-rose-400" : item.painEVA >= 4 ? "text-amber-300" : "text-emerald-300"}`}>{item.painEVA}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      disabled={readOnly}
                      value={item.painEVA}
                      onChange={(e) => actualizar(item.id, "painEVA", Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  disabled={readOnly}
                  value={item.clinicalComment || ""}
                  onChange={(e) => actualizar(item.id, "clinicalComment", e.target.value)}
                  placeholder="Observación clínica…"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 select-text"
                />
              </div>
            </div>
          );
        })}
        {!elegidos.length && <p className="text-sm text-slate-400 text-center py-4 lg:col-span-2">Elige al menos un ejercicio arriba.</p>}
      </div>

      <div className="space-y-1.5 pt-2 border-t border-slate-800">
        <label className="text-xs font-bold text-slate-300 uppercase block">Conclusión y prescripción</label>
        <textarea
          disabled={readOnly}
          rows={2}
          value={current.summaryNotes}
          onChange={(e) => cambiar({ summaryNotes: e.target.value })}
          placeholder="Resumen del protocolo y recomendaciones para casa…"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white placeholder-slate-500 select-text"
        />
      </div>
    </div>
  );
};
