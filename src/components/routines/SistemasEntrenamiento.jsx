// Sistemas de entrenamiento y configuración de un ejercicio.
// El MISMO módulo lo usan el creador de rutinas (entrenador) y los ejercicios
// terapéuticos (fisioterapia): series, repeticiones, descanso con chips,
// esfuerzo y el "Sistema de entrenamiento" (biserie, rest-pause, tempo, HIIT…).
//
// Cada ejercicio guarda `metodo`: { tipo, params, grupo?, resumen }
//  - tipo: clave de SISTEMAS
//  - params: valores propios del sistema (peso, reps, segundos…)
//  - grupo: letra que une ejercicios combinados (A, B…) → se muestran A1, A2
//  - resumen: texto corto ya armado (para imprimir, PDF y la base de datos)
import React, { useMemo, useState } from "react";
import { ChevronDown, Minus, Plus, Settings2, X } from "lucide-react";

// ---------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------
// Colores literales (Tailwind los incluye) y con reglas de modo oscuro en index.css
const COLOR = {
  slate: { chip: "bg-slate-100 text-slate-800 border-slate-300", on: "bg-blue-600 text-white border-blue-600", caja: "bg-slate-50 border-slate-200", texto: "text-slate-700" },
  violet: { chip: "bg-violet-50 text-violet-800 border-violet-200", on: "bg-violet-600 text-white border-violet-600", caja: "bg-violet-50 border-violet-200", texto: "text-violet-700" },
  rose: { chip: "bg-rose-50 text-rose-800 border-rose-200", on: "bg-rose-600 text-white border-rose-600", caja: "bg-rose-50 border-rose-200", texto: "text-rose-700" },
  sky: { chip: "bg-sky-50 text-sky-800 border-sky-200", on: "bg-sky-600 text-white border-sky-600", caja: "bg-sky-50 border-sky-200", texto: "text-sky-700" },
  orange: { chip: "bg-orange-50 text-orange-800 border-orange-200", on: "bg-orange-600 text-white border-orange-600", caja: "bg-orange-50 border-orange-200", texto: "text-orange-700" },
  amber: { chip: "bg-amber-50 text-amber-800 border-amber-200", on: "bg-amber-600 text-white border-amber-600", caja: "bg-amber-50 border-amber-200", texto: "text-amber-700" },
  teal: { chip: "bg-teal-50 text-teal-700 border-teal-200", on: "bg-teal-600 text-white border-teal-600", caja: "bg-teal-50 border-teal-200", texto: "text-teal-700" },
  indigo: { chip: "bg-indigo-50 text-indigo-800 border-indigo-200", on: "bg-indigo-600 text-white border-indigo-600", caja: "bg-indigo-50 border-indigo-200", texto: "text-indigo-700" },
};

export const FAMILIAS = [
  { id: "base", nombre: "Clásico", color: "slate" },
  { id: "combinar", nombre: "Combinar ejercicios", color: "violet" },
  { id: "intensidad", nombre: "Técnicas de intensidad", color: "rose" },
  { id: "control", nombre: "Tempo y control", color: "sky" },
  { id: "metabolico", nombre: "Funcional / metabólico", color: "orange" },
  { id: "potencia", nombre: "Potencia", color: "amber" },
];

// p = parámetro: [clave, etiqueta, tipo ("n" número | "t" texto), valor por defecto, sufijo]
export const SISTEMAS = {
  normal: { nombre: "Series normales", icono: "🏋️", familia: "base", desc: "Series y repeticiones con su descanso. Lo de siempre.", p: [] },
  superserie: {
    nombre: "Superserie", icono: "🔁", familia: "combinar", agrupa: [2, 2],
    desc: "2 ejercicios de músculos opuestos (ej. bíceps + tríceps) seguidos, sin descanso entre ellos.",
    p: [["descansoEntre", "Descanso entre ejercicios", "n", 0, "s"]],
  },
  biserie: {
    nombre: "Biserie", icono: "✌️", familia: "combinar", agrupa: [2, 2],
    desc: "2 ejercicios seguidos sin descanso; se descansa al terminar los dos.",
    p: [["descansoEntre", "Descanso entre ejercicios", "n", 0, "s"]],
  },
  triserie: {
    nombre: "Triserie", icono: "🔺", familia: "combinar", agrupa: [3, 3],
    desc: "3 ejercicios seguidos sin descanso; se descansa al terminar los tres.",
    p: [["descansoEntre", "Descanso entre ejercicios", "n", 0, "s"]],
  },
  circuito: {
    nombre: "Circuito", icono: "🔄", familia: "combinar", agrupa: [4, 8],
    desc: "4 a 6 ejercicios (o más) uno tras otro. Al terminar la vuelta se descansa y se repite.",
    p: [
      ["rondas", "Vueltas", "n", 3, ""],
      ["trabajo", "Trabajo por estación", "n", 40, "s"],
      ["descansoEstacion", "Pausa entre estaciones", "n", 15, "s"],
      ["descansoRonda", "Descanso entre vueltas", "n", 90, "s"],
    ],
  },
  rest_pause: {
    nombre: "Rest-pause", icono: "⏸️", familia: "intensidad",
    desc: "Una serie casi al fallo, pausa corta (10-20 s) y mini-series con el mismo peso.",
    p: [
      ["peso", "Peso", "n", "", "kg"],
      ["reps1", "Reps de la 1.ª serie", "t", "8", ""],
      ["pausa", "Pausa", "n", 15, "s"],
      ["mini", "Mini-series", "n", 2, ""],
      ["repsMini", "Reps de cada mini-serie", "t", "3-2", ""],
    ],
  },
  drop_set: {
    nombre: "Drop set", icono: "⬇️", familia: "intensidad",
    desc: "Al llegar al fallo se baja el peso y se sigue sin descanso.",
    p: [
      ["peso", "Peso inicial", "n", "", "kg"],
      ["bajadas", "Bajadas", "n", 2, ""],
      ["porcentaje", "Cuánto bajar", "n", 20, "%"],
      ["pesoMin", "Peso mínimo", "n", "", "kg"],
      ["repsMin", "Reps con el peso mínimo", "t", "al fallo", ""],
    ],
  },
  piramide_asc: {
    nombre: "Pirámide ascendente", icono: "📈", familia: "intensidad",
    desc: "Cada serie sube el peso y baja las repeticiones.",
    p: [["secuencia", "Reps por serie", "t", "12-10-8-6", ""], ["pesos", "Pesos por serie", "t", "", "kg"]],
  },
  piramide_desc: {
    nombre: "Pirámide descendente", icono: "📉", familia: "intensidad",
    desc: "Se empieza pesado con pocas reps y cada serie baja el peso y sube las reps.",
    p: [["secuencia", "Reps por serie", "t", "6-8-10-12", ""], ["pesos", "Pesos por serie", "t", "", "kg"]],
  },
  cluster: {
    nombre: "Cluster", icono: "🧩", familia: "intensidad",
    desc: "La serie se parte en bloques cortos con micro-pausas para mover más peso.",
    p: [["repsBloque", "Reps por bloque", "n", 3, ""], ["bloques", "Bloques", "n", 4, ""], ["pausa", "Micro-pausa", "n", 20, "s"], ["peso", "Peso", "n", "", "kg"]],
  },
  parciales: {
    nombre: "21s / parciales", icono: "✂️", familia: "intensidad",
    desc: "7 reps en la mitad baja, 7 en la mitad alta y 7 completas.",
    p: [["esquema", "Esquema", "t", "7 + 7 + 7", ""]],
  },
  negativas: {
    nombre: "Negativas (excéntricas)", icono: "🐢", familia: "control",
    desc: "Se enfatiza la bajada lenta; la subida puede ser con ayuda.",
    p: [["excentrica", "Bajada", "n", 4, "s"], ["ayuda", "Subida", "t", "con ayuda del compañero", ""], ["peso", "Peso", "n", "", "kg"]],
  },
  positivas: {
    nombre: "Positivas (concéntricas)", icono: "🚀", familia: "control",
    desc: "Se enfatiza la subida con intención y la bajada se controla o se asiste.",
    p: [["concentrica", "Subida", "n", 1, "s"], ["bajada", "Bajada", "t", "controlada", ""]],
  },
  tempo: {
    nombre: "Tempo", icono: "⏱️", familia: "control",
    desc: "Segundos en cada fase: bajada (excéntrica) · pausa abajo (isométrica) · subida (concéntrica) · pausa arriba.",
    p: [["exc", "Bajada", "n", 3, "s"], ["iso", "Pausa abajo", "n", 1, "s"], ["con", "Subida", "n", 1, "s"], ["arriba", "Pausa arriba", "n", 0, "s"]],
  },
  isometrico: {
    nombre: "Isométrico", icono: "🧱", familia: "control",
    desc: "Mantener la posición sin moverse (plancha, sentadilla en pared…).",
    p: [["segundos", "Mantener", "n", 30, "s"], ["posicion", "Posición / ángulo", "t", "", ""]],
  },
  hiit: {
    nombre: "HIIT trabajo / descanso", icono: "🔥", familia: "metabolico",
    desc: "Intervalos de trabajo intenso y descanso corto (ej. 1 min trabajo / 20 s descanso).",
    p: [["trabajo", "Trabajo", "n", 60, "s"], ["descanso", "Descanso", "n", 20, "s"], ["rondas", "Rondas", "n", 6, ""]],
  },
  tabata: {
    nombre: "Tabata", icono: "⚡", familia: "metabolico",
    desc: "8 rondas de 20 s a tope y 10 s de descanso (4 minutos).",
    p: [["trabajo", "Trabajo", "n", 20, "s"], ["descanso", "Descanso", "n", 10, "s"], ["rondas", "Rondas", "n", 8, ""]],
  },
  emom: {
    nombre: "EMOM", icono: "🕐", familia: "metabolico",
    desc: "Cada minuto se hacen las reps indicadas; lo que sobra del minuto es descanso.",
    p: [["minutos", "Minutos", "n", 10, "min"], ["repsMinuto", "Reps por minuto", "t", "10", ""]],
  },
  amrap: {
    nombre: "AMRAP", icono: "♾️", familia: "metabolico",
    desc: "Tantas rondas o reps como se pueda en el tiempo indicado.",
    p: [["minutos", "Tiempo", "n", 12, "min"], ["meta", "Meta", "t", "máximas rondas", ""]],
  },
  pliometria: {
    nombre: "Pliometría / explosivo", icono: "🦘", familia: "potencia",
    desc: "Saltos y lanzamientos a máxima velocidad, con descanso completo.",
    p: [["contactos", "Saltos / contactos", "n", 10, ""], ["altura", "Altura del cajón", "n", "", "cm"], ["descansoCompleto", "Descanso completo", "n", 90, "s"]],
  },
  halterofilia: {
    nombre: "Halterofilia (% 1RM)", icono: "🏅", familia: "potencia",
    desc: "Carga según el máximo (1RM): fases explosivas, recepción y control excéntrico.",
    p: [["pct", "% del 1RM", "n", 75, "%"], ["rm", "1RM del alumno", "n", "", "kg"], ["fase", "Fase / complejo", "t", "tirón + recepción", ""]],
  },
  velocidad: {
    nombre: "Potencia / velocidad", icono: "💨", familia: "potencia",
    desc: "Carga ligera-media movida a la máxima velocidad posible.",
    p: [["pct", "Carga", "n", 40, "% 1RM"], ["intencion", "Indicación", "t", "máxima velocidad en la subida", ""]],
  },
};

export const DESCANSOS = [30, 45, 60, 90, 120];

// Tipo de sesión por día (ej. sábado funcional)
export const TIPOS_DIA = [
  ["fuerza", "💪", "Fuerza", "indigo"],
  ["hipertrofia", "🏋️", "Hipertrofia", "violet"],
  ["funcional", "🤸", "Funcional", "orange"],
  ["hiit", "🔥", "HIIT / Metabólico", "rose"],
  ["circuito", "🔄", "Circuito", "amber"],
  ["potencia", "⚡", "Potencia / Pliometría", "amber"],
  ["halterofilia", "🏅", "Halterofilia", "sky"],
  ["cardio", "🏃", "Cardio", "teal"],
  ["movilidad", "🧘", "Movilidad / Core", "teal"],
  ["rehabilitacion", "🩺", "Rehabilitación", "sky"],
];
export const tipoDia = (k) => TIPOS_DIA.find((t) => t[0] === k);

// ---------------------------------------------------------------------
// Utilidades (sin React): resumen y grupos
// ---------------------------------------------------------------------
const conSuf = (v, s) => (v === "" || v == null ? "" : `${v}${s ? (/^[%a-z]/i.test(s) && s.length <= 3 && s !== "min" ? s : ` ${s}`) : ""}`);

/** Texto corto del sistema, ej. "Rest-pause · 60 kg · 8 reps + 2×(3-2) · pausa 15 s" */
export function resumenMetodo(m) {
  if (!m || !m.tipo || m.tipo === "normal") return "";
  const s = SISTEMAS[m.tipo];
  if (!s) return "";
  const p = { ...Object.fromEntries(s.p.map(([k, , , d]) => [k, d])), ...(m.params || {}) };
  const partes = [];
  switch (m.tipo) {
    case "superserie":
    case "biserie":
    case "triserie":
      partes.push(Number(p.descansoEntre) > 0 ? `${p.descansoEntre} s entre ejercicios` : "sin descanso entre ejercicios");
      break;
    case "circuito":
      partes.push(`${p.rondas} vueltas`);
      if (p.trabajo) partes.push(`${p.trabajo} s por estación`);
      if (p.descansoEstacion) partes.push(`pausa ${p.descansoEstacion} s`);
      if (p.descansoRonda) partes.push(`descanso ${p.descansoRonda} s entre vueltas`);
      break;
    case "rest_pause":
      if (p.peso) partes.push(`${p.peso} kg`);
      partes.push(`${p.reps1} reps + ${p.mini}×(${p.repsMini})`);
      partes.push(`pausa ${p.pausa} s`);
      break;
    case "drop_set":
      if (p.peso) partes.push(`desde ${p.peso} kg`);
      partes.push(`${p.bajadas} bajada(s) de ${p.porcentaje}%`);
      if (p.pesoMin) partes.push(`hasta ${p.pesoMin} kg`);
      if (p.repsMin) partes.push(`${p.repsMin} con el mínimo`);
      break;
    case "piramide_asc":
    case "piramide_desc":
      partes.push(`reps ${p.secuencia}`);
      if (p.pesos) partes.push(`pesos ${p.pesos} kg`);
      break;
    case "cluster":
      partes.push(`${p.bloques}×${p.repsBloque} reps`, `micro-pausa ${p.pausa} s`);
      if (p.peso) partes.push(`${p.peso} kg`);
      break;
    case "parciales":
      partes.push(p.esquema);
      break;
    case "negativas":
      partes.push(`bajada en ${p.excentrica} s`);
      if (p.ayuda) partes.push(`subida ${p.ayuda}`);
      if (p.peso) partes.push(`${p.peso} kg`);
      break;
    case "positivas":
      partes.push(`subida explosiva (${p.concentrica} s)`);
      if (p.bajada) partes.push(`bajada ${p.bajada}`);
      break;
    case "tempo":
      partes.push(`${p.exc}-${p.iso}-${p.con}-${p.arriba}`, `bajada ${p.exc} s · pausa ${p.iso} s · subida ${p.con} s`);
      break;
    case "isometrico":
      partes.push(`mantener ${p.segundos} s`);
      if (p.posicion) partes.push(p.posicion);
      break;
    case "hiit":
    case "tabata":
      partes.push(`${p.rondas} rondas`, `${p.trabajo} s trabajo / ${p.descanso} s descanso`);
      break;
    case "emom":
      partes.push(`${p.minutos} min`, `${p.repsMinuto} reps cada minuto`);
      break;
    case "amrap":
      partes.push(`${p.minutos} min`, p.meta);
      break;
    case "pliometria":
      partes.push(`${p.contactos} saltos`);
      if (p.altura) partes.push(`cajón ${p.altura} cm`);
      if (p.descansoCompleto) partes.push(`descanso ${p.descansoCompleto} s`);
      break;
    case "halterofilia": {
      partes.push(`${p.pct}% 1RM`);
      const kg = Number(p.rm) > 0 && Number(p.pct) > 0 ? Math.round((Number(p.rm) * Number(p.pct)) / 100 / 2.5) * 2.5 : 0;
      if (kg) partes.push(`≈ ${kg} kg (1RM ${p.rm} kg)`);
      if (p.fase) partes.push(p.fase);
      break;
    }
    case "velocidad":
      partes.push(`${p.pct}% 1RM`);
      if (p.intencion) partes.push(p.intencion);
      break;
    default:
      s.p.forEach(([k, l, , , suf]) => p[k] !== "" && p[k] != null && partes.push(`${l} ${conSuf(p[k], suf)}`));
  }
  return [s.nombre, ...partes.filter(Boolean)].join(" · ");
}

/** Arma el objeto método con su resumen al día */
export function armarMetodo(tipo, params = {}, grupo) {
  if (!tipo || tipo === "normal") return null;
  const s = SISTEMAS[tipo];
  const base = Object.fromEntries((s?.p || []).map(([k, , , d]) => [k, d]));
  const m = { tipo, params: { ...base, ...params } };
  if (s?.agrupa && grupo) m.grupo = grupo;
  m.resumen = resumenMetodo(m);
  return m;
}

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Etiquetas A1, A2, B1… de los ejercicios combinados de una lista */
export function etiquetasGrupo(lista = []) {
  const cuenta = {};
  return lista.map((ex) => {
    const g = ex?.metodo?.grupo;
    if (!g || !SISTEMAS[ex.metodo.tipo]?.agrupa) return "";
    cuenta[g] = (cuenta[g] || 0) + 1;
    return `${g}${cuenta[g]}`;
  });
}

/**
 * Une (o separa) el ejercicio i con el ejercicio j en el mismo grupo.
 * Devuelve la lista nueva. Todos los del grupo comparten tipo y parámetros.
 */
export function alternarCompanero(lista, i, j) {
  const yo = lista[i];
  const m = yo?.metodo;
  if (!m || !SISTEMAS[m.tipo]?.agrupa) return lista;
  let letra = m.grupo;
  if (!letra) {
    const usadas = new Set(lista.map((x) => x?.metodo?.grupo).filter(Boolean));
    letra = [...LETRAS].find((l) => !usadas.has(l)) || "Z";
  }
  const yaEsta = lista[j]?.metodo?.grupo === letra;
  return lista.map((x, k) => {
    if (k === i) return { ...x, metodo: armarMetodo(m.tipo, m.params, letra) };
    if (k !== j) return x;
    if (yaEsta) return { ...x, metodo: null };
    return { ...x, metodo: armarMetodo(m.tipo, m.params, letra) };
  });
}

/** Cambia el método del ejercicio i y mantiene sincronizado su grupo */
export function cambiarMetodo(lista, i, metodo) {
  const antes = lista[i]?.metodo;
  return lista.map((x, k) => {
    if (k === i) return { ...x, metodo };
    // El resto del grupo copia el sistema y sus parámetros
    if (antes?.grupo && x?.metodo?.grupo === antes.grupo) {
      if (metodo && SISTEMAS[metodo.tipo]?.agrupa) return { ...x, metodo: armarMetodo(metodo.tipo, metodo.params, antes.grupo) };
      return { ...x, metodo: null };
    }
    return x;
  });
}

// ---------------------------------------------------------------------
// Vista (rutina, portal del alumno, impresión, PDF)
// ---------------------------------------------------------------------
export const InsigniaMetodo = ({ metodo, etiqueta, className = "" }) => {
  if (!metodo || !metodo.tipo || metodo.tipo === "normal") return null;
  const s = SISTEMAS[metodo.tipo];
  if (!s) return null;
  const c = COLOR[FAMILIAS.find((f) => f.id === s.familia)?.color || "slate"];
  const texto = metodo.resumen || resumenMetodo(metodo);
  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${c.caja} ${className}`}>
      {etiqueta && <span className={`px-1.5 rounded-md text-[11px] font-black ${c.on}`}>{etiqueta}</span>}
      <span className={`font-bold ${c.texto}`}>
        {s.icono} {texto}
      </span>
    </div>
  );
};

export const InsigniaTipoDia = ({ tipo, className = "" }) => {
  const t = tipoDia(tipo);
  if (!t) return null;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${COLOR[t[3]].chip} ${className}`}>{t[1]} {t[2]}</span>;
};

// ---------------------------------------------------------------------
// Edición
// ---------------------------------------------------------------------
const INP = "w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600";

export const SelectorTipoDia = ({ valor, onChange, readOnly }) => (
  <div className="flex flex-wrap gap-1">
    {TIPOS_DIA.map(([k, ic, l, col]) => {
      const on = valor === k;
      return (
        <button
          key={k}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(on ? "" : k)}
          className={`px-2 py-1 rounded-full border text-[11px] font-bold cursor-pointer transition-colors ${on ? COLOR[col].on : COLOR[col].chip}`}
        >
          {ic} {l}
        </button>
      );
    })}
  </div>
);

/**
 * Configuración de un ejercicio (la misma para entrenador y fisioterapia).
 *  ex        objeto del ejercicio
 *  campos    nombres de las claves en ese objeto: { series, reps, descanso, esfuerzo }
 *  onPatch   (cambios) => void      cambia campos simples del ejercicio
 *  onMetodo  (metodo) => void       cambia el sistema (el padre sincroniza su grupo)
 *  companeros [{ i, nombre, enGrupo }]  otros ejercicios del mismo día (para biserie, circuito…)
 *  onCompanero (i) => void          une / separa un compañero
 *  etiqueta  "A1" si está combinado
 */
export const ConfigEjercicio = ({
  ex,
  campos = { series: "sets", reps: "reps", descanso: "restSeconds", esfuerzo: "rir" },
  onPatch,
  onMetodo,
  companeros = [],
  onCompanero,
  etiqueta,
  repsSugeridas = ["6-8", "8-10", "10-12", "12-15", "15-20", "30 seg", "45 seg", "60 seg"],
  readOnly = false,
  placeholderEsfuerzo = "RIR 1-2",
}) => {
  const metodo = ex.metodo;
  const sis = SISTEMAS[metodo?.tipo || "normal"];
  const [abierto, setAbierto] = useState(false);
  const [famVista, setFamVista] = useState(sis?.familia || "base");
  const series = Number(ex[campos.series]) || 0;
  const descanso = Number(ex[campos.descanso]);
  const otroDescanso = !DESCANSOS.includes(descanso);
  const listId = useMemo(() => `reps-${Math.random().toString(36).slice(2, 8)}`, []);
  const fam = FAMILIAS.find((f) => f.id === sis?.familia) || FAMILIAS[0];
  const c = COLOR[fam.color];
  const enGrupo = companeros.filter((x) => x.enGrupo).length;
  const [minG, maxG] = sis?.agrupa || [0, 0];

  const setParam = (k, v) => onMetodo(armarMetodo(metodo.tipo, { ...(metodo.params || {}), [k]: v }, metodo.grupo));

  return (
    <div className="space-y-2">
      {/* Series · reps · esfuerzo */}
      <div className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <div>
          <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Series</span>
          <div className="flex items-stretch rounded-lg border border-slate-300 bg-white overflow-hidden">
            <button type="button" disabled={readOnly || series <= 1} onClick={() => onPatch({ [campos.series]: Math.max(1, series - 1) })} className="px-2 text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-40" title="Una serie menos">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="1"
              max="20"
              disabled={readOnly}
              value={ex[campos.series] ?? ""}
              onChange={(e) => onPatch({ [campos.series]: Number(e.target.value) })}
              className="w-full min-w-0 text-center font-black text-sm text-slate-900 bg-transparent py-2 focus:outline-none"
            />
            <button type="button" disabled={readOnly || series >= 20} onClick={() => onPatch({ [campos.series]: series + 1 })} className="px-2 text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-40" title="Una serie más">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <label className="block min-w-0">
          <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Repeticiones o tiempo</span>
          <input disabled={readOnly} value={ex[campos.reps] ?? ""} placeholder="10-12" list={listId} onChange={(e) => onPatch({ [campos.reps]: e.target.value })} className={`${INP} text-center font-bold`} />
          <datalist id={listId}>{repsSugeridas.map((r) => <option key={r} value={r} />)}</datalist>
        </label>
        <label className="block min-w-0">
          <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Esfuerzo (RIR / RPE)</span>
          <input disabled={readOnly} value={ex[campos.esfuerzo] ?? ""} placeholder={placeholderEsfuerzo} onChange={(e) => onPatch({ [campos.esfuerzo]: e.target.value })} className={`${INP} text-center font-bold`} />
        </label>
      </div>

      {/* Descanso con chips */}
      <div>
        <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Descanso entre series</span>
        <div className="flex flex-wrap gap-1">
          {DESCANSOS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={readOnly}
              onClick={() => onPatch({ [campos.descanso]: d })}
              className={`flex-1 min-w-[3rem] py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${descanso === d ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"}`}
            >
              {d < 60 ? `${d}s` : d % 60 ? `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}` : `${d / 60} min`}
            </button>
          ))}
          <label className={`flex items-center gap-1 rounded-lg border px-2 ${otroDescanso ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`} title="Otro tiempo de descanso">
            <input
              type="number"
              min="0"
              step="5"
              disabled={readOnly}
              value={otroDescanso && Number.isFinite(descanso) ? descanso : ""}
              placeholder="otro"
              onChange={(e) => onPatch({ [campos.descanso]: e.target.value === "" ? 0 : Number(e.target.value) })}
              className="w-12 py-1 text-xs font-bold text-center bg-transparent focus:outline-none"
            />
            <span className="text-[11px] text-slate-500">s</span>
          </label>
        </div>
      </div>

      {/* Sistema de entrenamiento */}
      <div className={`rounded-xl border ${metodo ? c.caja : "border-dashed border-slate-300 bg-white"}`}>
        <button type="button" disabled={readOnly} onClick={() => setAbierto((v) => !v)} className="w-full flex items-center gap-2 px-2.5 py-2 text-left cursor-pointer">
          <Settings2 className={`w-4 h-4 shrink-0 ${metodo ? c.texto : "text-slate-400"}`} />
          <span className="flex-1 min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500">Sistema de entrenamiento · personalizar</span>
            <span className={`block text-xs font-bold truncate ${metodo ? c.texto : "text-slate-600"}`}>
              {etiqueta && <span className={`mr-1 px-1.5 rounded-md text-[11px] ${c.on}`}>{etiqueta}</span>}
              {sis.icono} {metodo ? metodo.resumen || resumenMetodo(metodo) : "Series normales (toca para biserie, rest-pause, tempo, HIIT…)"}
            </span>
          </span>
          {metodo && !readOnly && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onMetodo(null);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white"
              title="Volver a series normales"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
        </button>

        {abierto && !readOnly && (
          <div className="px-2.5 pb-2.5 space-y-2.5">
            {/* Familias */}
            <div className="flex flex-wrap gap-1">
              {FAMILIAS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFamVista(f.id)}
                  className={`px-2 py-1 rounded-full border text-[11px] font-bold cursor-pointer ${famVista === f.id ? COLOR[f.color].on : COLOR[f.color].chip}`}
                >
                  {f.nombre}
                </button>
              ))}
            </div>
            {/* Sistemas de la familia */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {Object.entries(SISTEMAS)
                .filter(([, s]) => s.familia === famVista)
                .map(([k, s]) => {
                  const on = (metodo?.tipo || "normal") === k;
                  const col = COLOR[FAMILIAS.find((f) => f.id === s.familia).color];
                  return (
                    <button
                      key={k}
                      type="button"
                      title={s.desc}
                      onClick={() => onMetodo(k === "normal" ? null : armarMetodo(k, metodo?.tipo === k ? metodo.params : {}, metodo?.tipo === k ? metodo.grupo : undefined))}
                      className={`rounded-lg border px-2 py-1.5 text-left cursor-pointer transition-colors ${on ? col.on : `${col.chip} hover:brightness-95`}`}
                    >
                      <span className="block text-xs font-black leading-tight">
                        {s.icono} {s.nombre}
                      </span>
                      {s.agrupa && <span className={`block text-[10px] font-semibold ${on ? "opacity-90" : "opacity-75"}`}>{s.agrupa[0] === s.agrupa[1] ? `${s.agrupa[0]} ejercicios` : `${s.agrupa[0]}+ ejercicios`}</span>}
                    </button>
                  );
                })}
            </div>

            {metodo && (
              <div className="rounded-lg bg-white border border-slate-200 p-2 space-y-2">
                <p className="text-xs text-slate-600">
                  <b className={c.texto}>
                    {sis.icono} {sis.nombre}:
                  </b>{" "}
                  {sis.desc}
                </p>
                {sis.p.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sis.p.map(([k, l, t, d, suf]) => (
                      <label key={k} className="block min-w-0">
                        <span className="block text-[11px] font-bold text-slate-500 truncate" title={l}>
                          {l}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type={t === "n" ? "number" : "text"}
                            min={t === "n" ? 0 : undefined}
                            value={metodo.params?.[k] ?? d ?? ""}
                            onChange={(e) => setParam(k, t === "n" && e.target.value !== "" ? Number(e.target.value) : e.target.value)}
                            className={`${INP} !py-1.5 font-bold`}
                          />
                          {suf && <span className="text-[11px] text-slate-500 shrink-0">{suf}</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {sis.agrupa && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-500">
                      Combinar con ({enGrupo + 1}/{maxG > minG ? `${minG}-${maxG}` : minG} ejercicios){" "}
                      {enGrupo + 1 < minG && <span className="text-rose-600">· elige {minG - enGrupo - 1} más</span>}
                    </p>
                    {companeros.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">Agrega más ejercicios a este día para combinarlos.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {companeros.map((x) => (
                          <button
                            key={x.i}
                            type="button"
                            disabled={!x.enGrupo && enGrupo + 1 >= maxG}
                            onClick={() => onCompanero?.(x.i)}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${x.enGrupo ? c.on : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"}`}
                          >
                            {x.enGrupo ? "✓ " : "+ "}
                            {x.i + 1}. {x.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
