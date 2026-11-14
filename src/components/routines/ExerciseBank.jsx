import { tipoDia } from "./SistemasEntrenamiento";
import { NOMBRES_ES, varianteDe } from "../../data/nombresEjercicios";
import { textoNivelRutina } from "../../utils/rutinas";
import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Dumbbell, Target, Layers, ListOrdered, Info, ShieldCheck, Gauge, Shuffle } from "lucide-react";

/* ------------------------------------------------------------------
   BANCO DE EJERCICIOS CON GIFS
   Fuente: carpeta banco_gym_ejercicios (1 324 ejercicios).
   Media © Gym visual — https://gymvisual.com/ (atribución obligatoria,
   180×180). Ver public/ejercicios/LICENCIA_MEDIA_GYMVISUAL.md
------------------------------------------------------------------- */

export const ATRIBUCION_MEDIA = "Animaciones © Gym visual — https://gymvisual.com/";

export const MUSCLE_LABELS = {
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebrazo: "Antebrazo",
  core_abdomen: "Core y abdomen",
  cuadriceps: "Cuádriceps",
  isquiotibiales_gluteos: "Glúteos e isquios",
  pantorrillas: "Pantorrillas",
  cardio_funcional: "Cardio y funcional",
  cuello: "Cuello",
  trapecio: "Trapecio",
  lumbar: "Zona lumbar",
  oblicuos: "Oblicuos",
  gluteos: "Glúteos",
  isquiotibiales: "Isquiotibiales",
  aductores: "Aductores",
  abductores: "Abductores",
  tibial: "Tibial anterior",
  cadera: "Flexores de cadera",
  manguito: "Manguito rotador",
  cuerpo_completo: "Cuerpo completo",
  otros: "Otros",
};

// Nombres populares (Perú/Latam) para encontrar ejercicios con la palabra que usa el entrenador
const ALIAS = [
  [/flexi[oó]n de brazos|push-?up/i, "lagartijas planchas push up"],
  [/sentadilla|squat/i, "cuclillas squat"],
  [/zancada|lunge/i, "estocadas desplantes"],
  [/dominada|pull-?up|chin-?up/i, "barras"],
  [/fondos|dip/i, "paralelas fondos"],
  [/crunch|abdominal|sit-?up/i, "abdominales"],
  [/elevaci[oó]n de talones|calf raise/i, "gemelos pantorrillas"],
  [/peso muerto|deadlift/i, "despegue"],
  [/hip thrust|puente de gl[uú]teo/i, "empuje de cadera"],
];
const aliasFor = (txt) => ALIAS.filter(([re]) => re.test(txt)).map(([, a]) => a).join(" ");

let cache = null;
let pending = null;

const loadCatalog = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch("/ejercicios/catalogo.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        // Nombres: traducción de los que venían en inglés y variante para los repetidos
        const base = list.map((x) => (NOMBRES_ES[x.id] || x.nombre || "").trim());
        const veces = {};
        base.forEach((n) => (veces[n.toLowerCase()] = (veces[n.toLowerCase()] || 0) + 1));
        const usados = new Set();
        const nombres = base.map((n, i) => {
          let nom = n;
          if (veces[n.toLowerCase()] > 1) {
            const v = varianteDe(list[i].nombreEn);
            if (v && v.toLowerCase() !== n.toLowerCase()) nom = `${n} (${v})`;
          }
          let k = 2;
          const raiz = nom;
          while (usados.has(nom.toLowerCase())) nom = `${raiz} · v. ${k++}`;
          usados.add(nom.toLowerCase());
          return nom;
        });
        cache = list.map((x, i) => ({
          id: x.id,
          name: nombres[i],
          nameEn: x.nombreEn,
          muscleGroup: x.grupo,
          target: x.objetivo,
          secondaryMuscles: x.secundarios,
          equipment: x.equipo,
          steps: x.pasos,
          instructions: x.pasos.join(" "),
          gifUrl: x.gif,
          thumbnailUrl: x.img,
          targetSetsRepsDefault: "3 x 10-12",
          fromBank: true,
          alias: aliasFor(x.nombre + " " + x.nombreEn),
        }));
        return cache;
      })
      .catch(() => []);
  }
  return pending;
};

export const useExerciseBank = () => {
  const [list, setList] = useState(cache || []);
  useEffect(() => {
    let alive = true;
    loadCatalog().then((l) => alive && setList(l));
    return () => {
      alive = false;
    };
  }, []);
  return list;
};

const norm = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export const filterExercises = (list, { q = "", group = "all", equip = "all" }) => {
  const nq = norm(q.trim());
  return list.filter(
    (ex) =>
      (group === "all" || ex.muscleGroup === group) &&
      (equip === "all" || ex.equipment === equip) &&
      (!nq ||
        norm(ex.name).includes(nq) ||
        norm(ex.nameEn || "").includes(nq) ||
        norm(ex.alias || "").includes(nq) ||
        norm(ex.target || "").includes(nq)),
  );
};

/* Imagen que muestra la miniatura y reproduce el GIF al pasar el mouse */
export const ExerciseThumb = ({ ex, className = "", alwaysGif = false }) => {
  const [hover, setHover] = useState(false);
  const src = alwaysGif || hover ? ex.gifUrl || ex.thumbnailUrl : ex.thumbnailUrl || ex.gifUrl;
  if (!src)
    return (
      <div className={`bg-slate-100 flex items-center justify-center text-slate-300 ${className}`}>
        <Dumbbell className="w-1/3 h-1/3" />
      </div>
    );
  return (
    <img
      src={src}
      alt={ex.name || ex.exerciseName}
      loading="lazy"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`bg-white object-contain ${className}`}
    />
  );
};

/* ===================== Biblioteca ===================== */
export const ExerciseLibrary = ({ exercises, onOpen, onNew }) => {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [equip, setEquip] = useState("all");
  const [limit, setLimit] = useState(60);

  const equipos = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.equipment).filter(Boolean))).sort(),
    [exercises],
  );
  const counts = useMemo(() => {
    const c = {};
    exercises.forEach((e) => (c[e.muscleGroup] = (c[e.muscleGroup] || 0) + 1));
    return c;
  }, [exercises]);
  const filtered = useMemo(() => filterExercises(exercises, { q, group, equip }), [exercises, q, group, equip]);

  useEffect(() => setLimit(60), [q, group, equip]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar en español o inglés (ej. sentadilla, curl, press, squat)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-11 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
          <select
            value={equip}
            onChange={(e) => setEquip(e.target.value)}
            className="lg:w-64 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
          >
            <option value="all">Todo el equipamiento</option>
            {equipos.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          {onNew && (
            <button
              onClick={onNew}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 justify-center cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ejercicio propio
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {[["all", "Todos", exercises.length], ...Object.entries(MUSCLE_LABELS).map(([k, l]) => [k, l, counts[k] || 0])]
            .filter(([, , n]) => n > 0)
            .map(([k, l, n]) => (
              <button
                key={k}
                onClick={() => setGroup(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer border ${
                  group === k
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                {l} <span className="opacity-70">({n})</span>
              </button>
            ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 px-1">
        <span>
          {filtered.length} ejercicio(s) · pase el mouse sobre la imagen para ver el movimiento
        </span>
        <span className="text-xs">{ATRIBUCION_MEDIA}</span>
      </div>

      {exercises.length === 0 ? (
        <div className="p-10 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          Cargando banco de ejercicios…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {filtered.slice(0, limit).map((ex) => (
            <button
              key={ex.id}
              onClick={() => onOpen(ex)}
              className="text-left bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-2xl overflow-hidden transition-all cursor-pointer group"
            >
              <div className="aspect-square bg-white border-b border-slate-100 p-2">
                <ExerciseThumb ex={ex} className="w-full h-full" />
              </div>
              <div className="p-3">
                <span className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  {MUSCLE_LABELS[ex.muscleGroup] || ex.muscleGroup}
                </span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mt-0.5 group-hover:text-blue-700">
                  {ex.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 truncate">{ex.equipment}</p>
                {ex.nameEn && ex.nameEn !== ex.name && (
                  <p className="text-xs text-slate-400 truncate italic">{ex.nameEn}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {filtered.length > limit && (
        <div className="flex justify-center">
          <button
            onClick={() => setLimit((l) => l + 60)}
            className="px-6 py-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Mostrar más ({filtered.length - limit} restantes)
          </button>
        </div>
      )}
    </div>
  );
};

/* ===================== Detalle (pantalla completa) ===================== */
// Claves de técnica según equipo y zona (guía general)
const CLAVES_EQUIPO = [
  [/barra/i, "Agarre firme y simétrico; usa collarines en los discos."],
  [/mancuern/i, "Muñecas neutras y el mismo recorrido con ambos brazos."],
  [/m[aá]quina|smith/i, "Ajusta asiento y respaldo para que la articulación coincida con el eje de la máquina."],
  [/polea|cable/i, "Mantén la tensión todo el recorrido; no dejes que el peso caiga de golpe."],
  [/kettlebell|pesa rusa/i, "El impulso sale de la cadera, no de la espalda."],
  [/banda|el[aá]stic/i, "Revisa que la banda esté bien anclada y no la sueltes en tensión."],
  [/corporal/i, "Progresa sumando repeticiones, tiempo o una variante más difícil."],
];
const CLAVES_ZONA = {
  core_abdomen: "No aguantes la respiración; la zona lumbar no se despega ni se arquea.",
  oblicuos: "Gira desde el tronco, sin tirar del cuello.",
  lumbar: "Columna neutra; evita hiperextender al final.",
  pecho: "Escápulas juntas y hacia abajo; no rebotes en el pecho.",
  espalda: "Lleva los codos hacia atrás y aprieta las escápulas; no balancees el cuerpo.",
  hombros: "No subas los hombros hacia las orejas; codos ligeramente por delante.",
  biceps: "Codos pegados al cuerpo; sin balanceo.",
  triceps: "Codos fijos; solo se mueve el antebrazo.",
  cuadriceps: "Rodillas en la línea de los pies; talones apoyados.",
  isquiotibiales_gluteos: "Cadera hacia atrás con espalda neutra; aprieta glúteos al subir.",
  gluteos: "Empuja con el talón y aprieta el glúteo arriba.",
  pantorrillas: "Recorrido completo: estira abajo y sube hasta la punta.",
  cuello: "Movimientos lentos y cortos; nunca con dolor.",
  cardio_funcional: "Mantén la técnica aunque te canses; baja el ritmo antes que perder la postura.",
};
// Guía de dosificación por objetivo: [clave, ícono, objetivo, series, reps/tiempo, descanso, intensidad, tempo]
const DOSIS = [
  ["fuerza", "💪", "Fuerza máxima", "3-5", "3-6 reps", "2-3 min", "80-90% 1RM · RIR 1-2", "controlado"],
  ["hipertrofia", "🏋️", "Hipertrofia", "3-4", "8-12 reps", "60-90 s", "65-80% 1RM · RIR 1-3", "2-0-1"],
  ["resistencia", "🔋", "Resistencia muscular", "2-3", "15-25 reps", "30-45 s", "50-65% 1RM", "fluido"],
  ["potencia", "⚡", "Potencia", "3-5", "3-5 explosivas", "2-3 min", "30-60% 1RM · máxima velocidad", "subida explosiva"],
  ["pliometria", "🦘", "Pliometría", "3-4", "5-10 saltos", "90-120 s", "Peso corporal · calidad > cantidad", "contacto corto"],
  ["acondicionamiento", "🌱", "Acondicionamiento / principiante", "2-3", "10-15 reps", "60-90 s", "RPE 5-6 · técnica primero", "3-0-2"],
  ["perdida_grasa", "🔥", "Pérdida de grasa / circuito", "3-4 vueltas", "12-15 reps o 40 s", "15-30 s entre ejercicios", "RPE 7-8", "constante"],
  ["tonificacion", "✨", "Tonificación", "3", "12-15 reps", "45-60 s", "60-70% 1RM", "2-1-2"],
  ["movilidad", "🧘", "Movilidad / flexibilidad", "2-3", "30-45 s o 8-10 lentas", "15-30 s", "Sin dolor · tensión suave", "lento"],
  ["rehabilitacion", "🩺", "Rehabilitación / readaptación", "2-3", "10-15 reps", "60 s", "Dolor ≤ 3/10 · según fisioterapia", "3-1-3"],
  ["adulto_mayor", "👵", "Adulto mayor / salud", "2", "10-12 reps", "90 s", "RPE 4-6", "lento y estable"],
];
// Qué objetivos encajan mejor con el ejercicio (se resaltan)
const objetivosSugeridos = (ex) => {
  const n = `${ex.name} ${ex.nameEn || ""}`.toLowerCase();
  if (/estiramiento|stretch|yoga|pose|movilidad/.test(n)) return ["movilidad", "rehabilitacion", "adulto_mayor"];
  if (/salto|jump|plyo|pliom|lanzamiento|throw|slam|swing|sprint/.test(n)) return ["potencia", "pliometria"];
  if (ex.muscleGroup === "cardio_funcional" || /caminata|bicicleta|el[ií]ptica|treadmill|escaladora|burpee/.test(n)) return ["perdida_grasa", "resistencia", "acondicionamiento"];
  if (/peso corporal|banda|fitball|bosu/i.test(ex.equipment || "")) return ["acondicionamiento", "resistencia", "tonificacion", "rehabilitacion"];
  if (/barra|smith|prensa|m[aá]quina/i.test(ex.equipment || "")) return ["fuerza", "hipertrofia", "potencia"];
  return ["hipertrofia", "tonificacion", "resistencia"];
};

export const ExerciseDetail = ({ ex: inicial, onClose, onAdd }) => {
  const [ex, setEx] = useState(inicial);
  useEffect(() => setEx(inicial), [inicial]);
  const banco = useExerciseBank();
  const similares = useMemo(() => {
    if (!ex) return [];
    const mismos = banco.filter((x) => x.id !== ex.id && x.muscleGroup === ex.muscleGroup);
    const objetivo = mismos.filter((x) => x.target && x.target === ex.target);
    return [...objetivo, ...mismos.filter((x) => !objetivo.includes(x))].slice(0, 6);
  }, [banco, ex]);
  if (!ex) return null;
  const sugeridos = objetivosSugeridos(ex);
  const claves = [
    "Exhala al hacer fuerza e inhala al volver.",
    "Controla la bajada (2-3 s) y usa el rango completo sin dolor.",
    ...CLAVES_EQUIPO.filter(([r]) => r.test(ex.equipment || "")).map(([, t]) => t).slice(0, 1),
    ...(CLAVES_ZONA[ex.muscleGroup] ? [CLAVES_ZONA[ex.muscleGroup]] : []),
  ];
  const steps = ex.steps?.length ? ex.steps : (ex.instructions || "").split(/(?<=\.)\s+/).filter(Boolean);
  return (
    <div className="fixed inset-0 z-50 rd-velo">
<div className="rd-hoja flex flex-col">
      <div className="bg-slate-900 text-white px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            {MUSCLE_LABELS[ex.muscleGroup] || ex.muscleGroup}
          </span>
          <h2 className="text-xl font-extrabold truncate">{ex.name}</h2>
          {ex.nameEn && ex.nameEn !== ex.name && <p className="text-sm text-slate-400 truncate">{ex.nameEn}</p>}
          {(ex.tipo || ex.custom) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {ex.custom && <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-bold">Ejercicio propio del gimnasio</span>}
              {tipoDia(ex.tipo) && <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-bold">{tipoDia(ex.tipo)[1]} {tipoDia(ex.tipo)[2]}</span>}
              {ex.difficulty && <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-bold">{textoNivelRutina(ex.difficulty)}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onAdd && (
            <button
              onClick={() => onAdd(ex)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Agregar a la rutina
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 cursor-pointer" title="Cerrar">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-center">
              <ExerciseThumb ex={ex} alwaysGif className="w-full max-w-[360px] aspect-square" />
            </div>
            {ex.fromBank && <p className="text-xs text-slate-500 text-center">{ATRIBUCION_MEDIA}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> Músculo objetivo
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1">{ex.target || MUSCLE_LABELS[ex.muscleGroup]}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Dumbbell className="w-3.5 h-3.5" /> Equipamiento
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1">{ex.equipment}</p>
              </div>
            </div>
            {ex.secondaryMuscles?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Músculos secundarios
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ex.secondaryMuscles.map((m) => (
                    <span key={m} className="text-sm px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Claves de técnica y seguridad
                </h3>
                <ul className="space-y-1.5">
                  {claves.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="text-emerald-600 font-black">✓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
          </div>
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                <ListOrdered className="w-5 h-5 text-blue-600" /> Ejecución paso a paso
              </h3>
              <ol className="space-y-3">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-black flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-[0.95rem] text-slate-700 leading-relaxed pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            {ex.tips && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-sm text-amber-900 flex gap-2">
                <Info className="w-5 h-5 shrink-0" />
                <span>{ex.tips}</span>
              </div>
            )}

          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-violet-600" /> Cómo dosificarlo según el objetivo
              </h3>
              <p className="text-[11px] text-slate-500 mb-2">Resaltados: los objetivos que mejor encajan con este ejercicio.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="py-1 pr-2">Objetivo</th>
                      <th className="py-1 pr-2">Series</th>
                      <th className="py-1 pr-2">Reps / tiempo</th>
                      <th className="py-1 pr-2">Descanso</th>
                      <th className="py-1 pr-2">Intensidad</th>
                      <th className="py-1">Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DOSIS.map(([k, ic, o, se, re, de, inten, tempo]) => {
                      const on = sugeridos.includes(k);
                      return (
                        <tr key={k} className={`border-t border-slate-100 ${on ? "bg-violet-50" : ""}`}>
                          <td className={`py-1.5 pr-2 font-bold whitespace-nowrap ${on ? "text-violet-800" : "text-slate-800"}`}>
                            {ic} {o} {on && <span className="ml-1 px-1.5 rounded-full bg-violet-600 text-white text-[9px]">recomendado</span>}
                          </td>
                          <td className="py-1.5 pr-2 text-slate-700">{se}</td>
                          <td className="py-1.5 pr-2 font-bold text-blue-700">{re}</td>
                          <td className="py-1.5 pr-2 text-slate-600">⏱ {de}</td>
                          <td className="py-1.5 pr-2 text-slate-600">{inten}</td>
                          <td className="py-1.5 text-slate-500">{tempo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">Guía general: ajústala al nivel del alumno y a sus indicaciones de fisioterapia y nutrición.</p>
            </div>
            {similares.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-blue-600" /> Ejercicios similares · {MUSCLE_LABELS[ex.muscleGroup] || ex.muscleGroup}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {similares.map((x) => (
                    <button key={x.id} type="button" onClick={() => setEx(x)} className="text-left rounded-xl border border-slate-200 p-1.5 hover:border-blue-400 cursor-pointer" title="Ver este ejercicio">
                      <ExerciseThumb ex={x} className="w-full aspect-square rounded-lg" />
                      <span className="block text-[11px] font-bold text-slate-800 mt-1 line-clamp-2 leading-tight">{x.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
</div>
  );
};

/* ===================== Selector para el creador de rutinas ===================== */
// Coincidencia: con 1-2 letras busca palabras que EMPIECEN así ("p" → press, plancha, pullover…);
// con más letras busca en cualquier parte del nombre.
const matchQuery = (ex, nq) => {
  if (!nq) return true;
  const names = [norm(ex.name), norm(ex.nameEn || ""), norm(ex.alias || "")];
  if (nq.length <= 2) return names.some((n) => n.split(/[\s/-]+/).some((w) => w.startsWith(nq)));
  return names.some((n) => n.includes(nq)) || norm(ex.target || "").includes(nq);
};

export const ExercisePicker = ({ exercises, onPick, picked = [], compacto = false }) => {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [limit, setLimit] = useState(30);

  const counts = useMemo(() => {
    const c = {};
    exercises.forEach((e) => (c[e.muscleGroup] = (c[e.muscleGroup] || 0) + 1));
    return c;
  }, [exercises]);

  const abierto = !!group || q.trim().length > 0;
  const results = useMemo(() => {
    if (!abierto) return [];
    const nq = norm(q.trim());
    const list = exercises.filter((ex) => (group === "" || group === "all" || ex.muscleGroup === group) && matchQuery(ex, nq));
    if (nq) list.sort((a, b) => (norm(b.name).startsWith(nq) ? 1 : 0) - (norm(a.name).startsWith(nq) ? 1 : 0));
    return list;
  }, [exercises, q, group, abierto]);

  useEffect(() => setLimit(30), [q, group]);
  const cuenta = (id) => picked.filter((x) => String(x) === String(id)).length;

  return (
    <div className="@container w-full space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ejercicio (ej. press, plancha, sentadilla)…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-blue-600"
          />
        </div>
        {abierto && (
          <button type="button" onClick={() => { setGroup(""); setQ(""); }} className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer">
            Cerrar
          </button>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[["all", "Todos"], ...Object.entries(MUSCLE_LABELS).filter(([k]) => counts[k])].map(([k, l]) => {
          const on = group === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setGroup(on ? "" : k)}
              className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
                on ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"
              }`}
            >
              {l} <span className={on ? "text-blue-100" : "text-slate-400"}>{k === "all" ? exercises.length : counts[k]}</span>
            </button>
          );
        })}
      </div>

      {abierto && (
        <div className="rounded-2xl border border-blue-200 bg-white p-3 space-y-2">
          <p className="text-xs text-slate-500">
            {results.length} ejercicio(s)
            {group && group !== "all" ? ` de ${MUSCLE_LABELS[group]}` : ""}
            {q ? ` con «${q}»` : ""} · toca para agregar (puedes agregar varios)
          </p>
          {/* Mismo formato en todo el sistema: 4 por fila (2 en celular), tarjetas del mismo tamaño */}
          <div className={`grid grid-cols-2 @sm:grid-cols-3 @3xl:grid-cols-4 gap-2.5 overflow-y-auto pr-1 ${compacto ? "max-h-[560px]" : "max-h-[640px]"}`}>
            {results.slice(0, limit).map((ex) => {
              const n = cuenta(ex.id);
              return (
                <button
                  type="button"
                  key={ex.id}
                  onClick={() => onPick(ex)}
                  className={`relative flex flex-col text-left rounded-xl border p-2 cursor-pointer transition-colors h-full ${n ? "border-emerald-400 bg-emerald-50" : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/40"}`}
                >
                  {n > 0 && (
                    <span className="absolute top-1.5 right-1.5 z-10 min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                      ✓{n > 1 ? n : ""}
                    </span>
                  )}
                  <ExerciseThumb ex={ex} className="w-full aspect-square rounded-lg bg-white" />
                  <span className="block text-xs font-bold text-slate-900 mt-1.5 line-clamp-2 leading-tight min-h-[2.5em]">{ex.name}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{MUSCLE_LABELS[ex.muscleGroup] || ex.muscleGroup} · {ex.equipment}</span>
                </button>
              );
            })}
          </div>
          {results.length === 0 && <p className="p-4 text-sm text-slate-500 text-center">Sin resultados. Prueba otra palabra o grupo.</p>}
          {results.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + 30)} className="w-full py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer">
              Ver más ({results.length - limit})
            </button>
          )}
        </div>
      )}
    </div>
  );
};
