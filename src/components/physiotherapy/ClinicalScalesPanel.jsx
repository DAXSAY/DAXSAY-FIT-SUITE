import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  AlertTriangle,
  ShieldAlert,
  Dumbbell,
  Ruler,
  ClipboardList,
  Flame,
  Info,
  Stethoscope,
  Hand,
  Plus,
  Trash2,
} from "lucide-react";

/* ------------------------------------------------------------------
   HERRAMIENTAS CLÍNICAS ESTANDARIZADAS DE FISIOTERAPIA
   Cada sección se exporta por separado para ubicarla en la pestaña
   que corresponde (anamnesis / exploración).
------------------------------------------------------------------- */

export const RED_FLAGS = [
  { id: "anestesia_silla", label: "Anestesia en silla de montar (zona perineal)", urgent: true },
  { id: "vejiga_intestino", label: "Retención / incontinencia urinaria o fecal", urgent: true },
  { id: "deficit_neuro", label: "Déficit neurológico progresivo en piernas", urgent: true },
  { id: "mielopatia", label: "Marcha inestable o torpeza de manos", urgent: true },
  { id: "cancer", label: "Antecedente de cáncer" },
  { id: "peso", label: "Pérdida de peso inexplicada" },
  { id: "fiebre", label: "Fiebre, escalofríos o infección reciente" },
  { id: "trauma", label: "Traumatismo importante (caída, accidente)" },
  { id: "dolor_nocturno", label: "Dolor nocturno que no cede con reposo" },
  { id: "corticoides", label: "Corticoides prolongados / osteoporosis" },
  { id: "edad", label: "Primer episodio con > 50 o < 20 años" },
];

export const MRC_GRADES = [
  { v: 0, label: "0 · Sin contracción" },
  { v: 1, label: "1 · Contracción sin movimiento" },
  { v: 2, label: "2 · Mueve sin gravedad" },
  { v: 3, label: "3 · Vence la gravedad" },
  { v: 4, label: "4 · Vence resistencia moderada" },
  { v: 5, label: "5 · Normal" },
];

// Grupos musculares por región (se eligen los que se evalúan)
export const MRC_GROUPS = [
  { id: "flex_cuello", label: "Flexores de cuello", region: "Cuello" },
  { id: "ext_cuello", label: "Extensores de cuello", region: "Cuello" },
  { id: "abd_hombro", label: "Abductores de hombro", region: "Hombro" },
  { id: "flex_hombro", label: "Flexores de hombro", region: "Hombro" },
  { id: "re_hombro", label: "Rotadores externos de hombro", region: "Hombro" },
  { id: "ri_hombro", label: "Rotadores internos de hombro", region: "Hombro" },
  { id: "esc_estab", label: "Estabilizadores escapulares", region: "Hombro" },
  { id: "flex_codo", label: "Flexores de codo", region: "Brazo" },
  { id: "ext_codo", label: "Extensores de codo", region: "Brazo" },
  { id: "ext_muneca", label: "Extensores de muñeca", region: "Antebrazo y mano" },
  { id: "flex_muneca", label: "Flexores de muñeca", region: "Antebrazo y mano" },
  { id: "prension", label: "Prensión (flexores de dedos)", region: "Antebrazo y mano" },
  { id: "intrinsecos_mano", label: "Intrínsecos de la mano / pinza", region: "Antebrazo y mano" },
  { id: "abdominales", label: "Abdominales (core anterior)", region: "Tronco" },
  { id: "ext_tronco", label: "Extensores de tronco", region: "Tronco" },
  { id: "flex_cadera", label: "Flexores de cadera", region: "Cadera" },
  { id: "ext_cadera", label: "Extensores de cadera (glúteo mayor)", region: "Cadera" },
  { id: "abd_cadera", label: "Abductores de cadera (glúteo medio)", region: "Cadera" },
  { id: "adu_cadera", label: "Aductores de cadera", region: "Cadera" },
  { id: "ext_rodilla", label: "Extensores de rodilla (cuádriceps)", region: "Rodilla" },
  { id: "flex_rodilla", label: "Flexores de rodilla (isquiotibiales)", region: "Rodilla" },
  { id: "dorsi_tobillo", label: "Dorsiflexores de tobillo", region: "Tobillo y pie" },
  { id: "plantiflex", label: "Flexores plantares (gemelos, sóleo)", region: "Tobillo y pie" },
  { id: "inv_ev", label: "Inversores / eversores de tobillo", region: "Tobillo y pie" },
  { id: "ext_hallux", label: "Extensor del hallux", region: "Tobillo y pie" },
  { id: "intrinsecos_pie", label: "Intrínsecos del pie", region: "Tobillo y pie" },
];

/* Articulaciones y movimientos con valores de referencia AAOS (grados).
   bilateral:false -> movimiento axial de columna con un solo valor. */
export const ROM_JOINTS = [
  {
    id: "Cervical",
    zones: ["cervical"],
    movs: [
      { id: "cerv_flex", mov: "Flexión", norm: 45, bilateral: false },
      { id: "cerv_ext", mov: "Extensión", norm: 45, bilateral: false },
      { id: "cerv_incl", mov: "Inclinación lateral", norm: 45 },
      { id: "cerv_rot", mov: "Rotación", norm: 60 },
    ],
  },
  {
    id: "Hombro",
    zones: ["hombro"],
    movs: [
      { id: "hom_flex", mov: "Flexión", norm: 180 },
      { id: "hom_ext", mov: "Extensión", norm: 60 },
      { id: "hom_abd", mov: "Abducción", norm: 180 },
      { id: "hom_re", mov: "Rotación externa", norm: 90 },
      { id: "hom_ri", mov: "Rotación interna", norm: 70 },
    ],
  },
  {
    id: "Codo",
    zones: ["codo", "codo_muneca"],
    movs: [
      { id: "codo_flex", mov: "Flexión", norm: 150 },
      { id: "ant_pro", mov: "Pronación", norm: 80 },
      { id: "ant_sup", mov: "Supinación", norm: 80 },
    ],
  },
  {
    id: "Muñeca",
    zones: ["muneca_mano", "codo_muneca"],
    movs: [
      { id: "mun_flex", mov: "Flexión", norm: 80 },
      { id: "mun_ext", mov: "Extensión", norm: 70 },
      { id: "mun_rad", mov: "Desviación radial", norm: 20 },
      { id: "mun_cub", mov: "Desviación cubital", norm: 30 },
    ],
  },
  {
    id: "Dedos de la mano",
    zones: ["dedos_mano", "muneca_mano"],
    movs: [
      { id: "mcf_flex", mov: "Flexión MCF", norm: 90 },
      { id: "ifp_flex", mov: "Flexión IFP", norm: 100 },
      { id: "ifd_flex", mov: "Flexión IFD", norm: 90 },
      { id: "pul_abd", mov: "Abducción del pulgar", norm: 70 },
      { id: "pul_flex", mov: "Flexión del pulgar (MCF)", norm: 50 },
    ],
  },
  {
    id: "Tronco",
    zones: ["columna_dorsal", "lumbar", "toracica", "sacroiliaca"],
    movs: [
      { id: "tr_flex", mov: "Flexión", norm: 80, bilateral: false },
      { id: "tr_ext", mov: "Extensión", norm: 25, bilateral: false },
      { id: "tr_incl", mov: "Inclinación lateral", norm: 35 },
      { id: "tr_rot", mov: "Rotación", norm: 45 },
    ],
  },
  {
    id: "Cadera",
    zones: ["cadera", "sacroiliaca", "muslo"],
    movs: [
      { id: "cad_flex", mov: "Flexión", norm: 120 },
      { id: "cad_ext", mov: "Extensión", norm: 30 },
      { id: "cad_abd", mov: "Abducción", norm: 45 },
      { id: "cad_ri", mov: "Rotación interna", norm: 45 },
      { id: "cad_re", mov: "Rotación externa", norm: 45 },
    ],
  },
  {
    id: "Rodilla",
    zones: ["rodilla", "muslo", "pierna"],
    movs: [{ id: "rod_flex", mov: "Flexión", norm: 135 }],
    zonesExtra: true,
  },
  {
    id: "Tobillo",
    zones: ["tobillo_pie"],
    movs: [
      { id: "tob_df", mov: "Dorsiflexión", norm: 20 },
      { id: "tob_pf", mov: "Flexión plantar", norm: 50 },
      { id: "tob_inv", mov: "Inversión", norm: 35 },
      { id: "tob_ev", mov: "Eversión", norm: 15 },
    ],
  },
  {
    id: "Dedos del pie",
    zones: ["dedos_pie", "talon", "tobillo_pie"],
    movs: [
      { id: "hal_ext", mov: "Extensión del hallux (MTF)", norm: 70 },
      { id: "hal_flex", mov: "Flexión del hallux (MTF)", norm: 45 },
      { id: "dedos_flex", mov: "Flexión de dedos", norm: 40 },
    ],
  },
];

export const ROM_NORMS = ROM_JOINTS.flatMap((j) =>
  j.movs.map((m) => ({ ...m, joint: j.id, bilateral: m.bilateral !== false })),
);

export const jointsForZones = (zones = []) =>
  ROM_JOINTS.filter((j) => j.zones.some((z) => zones.includes(z))).map((j) => j.id);

export const ODI_SECTIONS = [
  "Intensidad del dolor",
  "Cuidado personal (vestirse, asearse)",
  "Levantar objetos",
  "Caminar",
  "Estar sentado",
  "Estar de pie",
  "Dormir",
  "Actividad laboral / doméstica",
  "Vida social",
  "Viajar / desplazarse",
];

const ODI_LEVELS = [
  "0 · Sin limitación",
  "1 · Muy leve",
  "2 · Leve",
  "3 · Moderada",
  "4 · Severa",
  "5 · Imposible / máxima",
];

export const PAIN_PHASES = [
  { id: "ninguno", label: "Sin dolor" },
  { id: "inicio", label: "Al inicio" },
  { id: "medio", label: "Arco medio" },
  { id: "final", label: "Final del rango" },
  { id: "todo", label: "Todo el recorrido" },
];

export const EMPTY_CLINICAL_SCALES = {
  redFlags: [],
  pain: { actual: null, mejor: null, peor: null },
  mrc: {},
  romJoints: [],
  rom: {},
  romPain: {},
  odi: { enabled: false, answers: Array(10).fill(null) },
};

export const normalizeScales = (s) => ({
  ...EMPTY_CLINICAL_SCALES,
  ...(s || {}),
  pain: { ...EMPTY_CLINICAL_SCALES.pain, ...(s?.pain || {}) },
  odi: { ...EMPTY_CLINICAL_SCALES.odi, ...(s?.odi || {}) },
  romJoints: s?.romJoints || [],
  romPain: s?.romPain || {},
});

export const odiResult = (odi) => {
  const answered = (odi?.answers || []).filter((a) => a !== null && a !== undefined && a !== "");
  if (answered.length === 0) return null;
  const total = answered.reduce((s, a) => s + Number(a), 0);
  const pct = Math.round((total / (answered.length * 5)) * 100);
  let label = "Discapacidad mínima";
  let color = "var(--color-green-600)";
  if (pct > 80) { label = "Postrado / posible magnificación"; color = "#7f1d1d"; }
  else if (pct > 60) { label = "Discapacidad invalidante"; color = "var(--color-red-700)"; }
  else if (pct > 40) { label = "Discapacidad severa"; color = "var(--color-orange-600)"; }
  else if (pct > 20) { label = "Discapacidad moderada"; color = "var(--color-yellow-600)"; }
  return { pct, label, color, answered: answered.length };
};

export const mrcTotal = (mrc) => {
  let total = 0;
  let count = 0;
  MRC_GROUPS.forEach((g) => {
    ["izq", "der"].forEach((lado) => {
      const v = mrc?.[g.id]?.[lado];
      if (v !== undefined && v !== null && v !== "") { total += Number(v); count++; }
    });
  });
  return count ? { total, count } : null;
};

/** Resumen de goniometría: % promedio y peor % respecto a lo normal */
export const romSummary = (rom = {}) => {
  const pcts = [];
  ROM_NORMS.forEach((r) => {
    ["izq", "der", "val"].forEach((k) => {
      const v = rom?.[r.id]?.[k];
      if (v !== null && v !== undefined && v !== "") pcts.push(Math.min(120, (Number(v) / r.norm) * 100));
    });
  });
  if (!pcts.length) return null;
  const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  const worst = Math.round(Math.min(...pcts));
  const status =
    worst >= 90 ? "completo" : worst >= 70 ? "limitacion_leve" : worst >= 45 ? "limitacion_moderada" : "bloqueo_severo";
  return { avg, worst, status, count: pcts.length };
};

export const romStatusLabel = (pct) =>
  pct == null
    ? null
    : pct >= 90
      ? ["Normal", "bg-emerald-100 text-emerald-700", "var(--color-green-600)"]
      : pct >= 70
        ? ["Limitación leve", "bg-amber-100 text-amber-700", "var(--color-amber-600)"]
        : pct >= 45
          ? ["Limitación moderada", "bg-orange-100 text-orange-700", "var(--color-orange-600)"]
          : ["Limitación severa", "bg-rose-100 text-rose-700", "var(--color-red-600)"];

const painColor = (v) =>
  v === null || v === undefined ? "#cbd5e1" : v <= 3 ? "var(--color-green-600)" : v <= 6 ? "var(--color-amber-500)" : "var(--color-red-600)";

export const Card = ({ icon: Icon, title, subtitle, color = "text-blue-700", right, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
    <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
    {children}
  </section>
);

/* ===================== 1. BANDERAS ROJAS ===================== */
export const RedFlagsSection = ({ scales, set }) => {
  const urgent = RED_FLAGS.filter((f) => f.urgent && scales.redFlags.includes(f.id));
  const other = RED_FLAGS.filter((f) => !f.urgent && scales.redFlags.includes(f.id));
  const toggle = (id) =>
    set({
      redFlags: scales.redFlags.includes(id)
        ? scales.redFlags.filter((f) => f !== id)
        : [...scales.redFlags, id],
    });
  return (
    <Card
      icon={ShieldAlert}
      color="text-rose-600"
      title="Cribado de banderas rojas"
      subtitle="Signos de posible patología grave (cola de caballo, fractura, tumor, infección). Marque solo los presentes."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {RED_FLAGS.map((f) => {
          const on = scales.redFlags.includes(f.id);
          return (
            <button
              type="button"
              key={f.id}
              onClick={() => toggle(f.id)}
              className={`text-left px-3 py-2.5 rounded-xl border-2 text-sm font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                on
                  ? f.urgent
                    ? "bg-rose-50 border-rose-500 text-rose-800"
                    : "bg-amber-50 border-amber-500 text-amber-800"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                  on ? (f.urgent ? "bg-rose-600 border-rose-600" : "bg-amber-500 border-amber-500") : "border-slate-300"
                }`}
              >
                {on && <span className="text-white text-xs font-black">✓</span>}
              </span>
              <span className="flex-1">{f.label}</span>
              {f.urgent && (
                <span className="text-xs font-black uppercase text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                  Urgente
                </span>
              )}
            </button>
          );
        })}
      </div>
      {urgent.length > 0 ? (
        <div className="mt-4 p-4 rounded-xl bg-rose-600 text-white flex gap-3 items-start">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <div className="text-sm">
            <p className="font-extrabold">Derivación médica URGENTE recomendada</p>
            <p className="opacity-90">
              Signos compatibles con compromiso neurológico grave. No iniciar tratamiento con carga; derivar a
              emergencias o al médico de inmediato.
            </p>
          </div>
        </div>
      ) : other.length > 0 ? (
        <div className="mt-4 p-4 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 flex gap-3 items-start">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <p className="text-sm">
            <b>{other.length} bandera(s) presente(s).</b> Vigilar la evolución; si no mejora con el tratamiento,
            derivar a valoración médica.
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
          <b>Ninguna señal de alarma marcada.</b> Puedes continuar con la evaluación con normalidad.
        </div>
      )}
    </Card>
  );
};

/* ===================== 2. DOLOR NRS ===================== */
export const PainSection = ({ scales, set }) => (
  <Card
    icon={Flame}
    color="text-orange-600"
    title="Intensidad del dolor (escala numérica 0-10)"
    subtitle="0 = sin dolor · 1-3 leve · 4-6 moderado · 7-10 severo."
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[
        ["actual", "Dolor actual *"],
        ["mejor", "Mínimo últimas 24 h"],
        ["peor", "Máximo últimas 24 h"],
      ].map(([k, label]) => {
        const v = scales.pain[k];
        return (
          <div key={k} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-800">{label}</span>
              <span className="text-2xl font-black" style={{ color: painColor(v) }}>
                {v ?? "–"}
                <span className="text-sm text-slate-400">/10</span>
              </span>
            </div>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => set({ pain: { ...scales.pain, [k]: v === n ? null : n } })}
                  className={`h-10 rounded-md text-sm font-bold transition-all cursor-pointer ${
                    v === n ? "text-white scale-110 shadow-md" : "text-slate-700 hover:scale-105"
                  }`}
                  style={{
                    background: v === n ? painColor(n) : `${painColor(n)}22`,
                    border: `1px solid ${painColor(n)}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </Card>
);

/* ===================== 3. GONIOMETRÍA MULTI-ARTICULAR ===================== */

// Indicador semicircular de colores: arco 0..norm (rojo → verde), agujas izq (índigo) y der (cian)
const RomGauge = ({ norm, izq, der, val }) => {
  const uid = React.useId().replace(/:/g, "");
  const max = norm * 1.15;
  const cx = 100;
  const cy = 96;
  const r = 72;
  const pt = (deg, rr = r) => {
    const a = Math.PI - (Math.min(Math.max(deg, 0), max) / max) * Math.PI;
    return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
  };
  const arc = (from, to, rr = r) => {
    const [x1, y1] = pt(from, rr);
    const [x2, y2] = pt(to, rr);
    const large = ((to - from) / max) * 180 > 180 ? 1 : 0;
    return `M${x1},${y1} A${rr},${rr} 0 ${large} 1 ${x2},${y2}`;
  };
  const needle = (v, color) => {
    if (v == null || v === "") return null;
    const deg = Number(v);
    const [x, y] = pt(deg, r - 6);
    const a = Math.PI - (Math.min(Math.max(deg, 0), max) / max) * Math.PI;
    const px = Math.sin(a) * 4;
    const py = Math.cos(a) * 4;
    return (
      <g>
        <polygon points={`${cx + px},${cy + py} ${x},${y} ${cx - px},${cy - py}`} fill={color} opacity="0.9" />
        <circle cx={x} cy={y} r="4.5" fill="white" stroke={color} strokeWidth="2.5" />
      </g>
    );
  };
  const ticks = Array.from({ length: 11 }, (_, k) => (norm * k) / 10);
  const [nx, ny] = pt(norm, r + 15);
  const etiquetas = [
    izq != null && izq !== "" ? [`I ${izq}°`, "var(--color-indigo-600)"] : null,
    der != null && der !== "" ? [`D ${der}°`, "var(--color-cyan-600)"] : null,
    val != null && val !== "" ? [`${val}°`, "var(--color-violet-600)"] : null,
  ].filter(Boolean);
  return (
    <svg viewBox="0 0 200 128" className="w-full h-auto">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--color-rose-500)" />
          <stop offset="40%" stopColor="#fb923c" />
          <stop offset="68%" stopColor="var(--color-yellow-400)" />
          <stop offset="100%" stopColor="var(--color-green-500)" />
        </linearGradient>
      </defs>
      <path d={arc(0, max)} stroke="#f1f5f9" strokeWidth="18" fill="none" strokeLinecap="round" />
      <path d={arc(0, norm)} stroke={`url(#g${uid})`} strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d={arc(norm, max)} stroke="#cbd5e1" strokeWidth="6" fill="none" strokeDasharray="3 3" />
      {ticks.map((t, k) => {
        const [x1, y1] = pt(t, r - 12);
        const [x2, y2] = pt(t, r - (k % 5 === 0 ? 19 : 16));
        return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={k % 5 === 0 ? 1.6 : 1} />;
      })}
      <text x={nx} y={ny} fontSize="10" fontWeight="800" fill="#15803d" textAnchor="middle">{norm}°</text>
      <text x={cx - r} y={cy + 15} fontSize="9" fill="#94a3b8" textAnchor="middle">0°</text>
      {needle(val, "var(--color-violet-600)")}
      {needle(izq, "var(--color-indigo-600)")}
      {needle(der, "var(--color-cyan-600)")}
      <circle cx={cx} cy={cy} r="7" fill="white" stroke="#0f172a" strokeWidth="3" />
      {etiquetas.length > 0 ? (
        etiquetas.map(([t, c], k) => (
          <g key={k}>
            <rect x={cx - 52 + k * 56 - (etiquetas.length === 1 ? -28 : 0)} y={cy + 12} width="48" height="16" rx="8" fill={c} opacity="0.12" />
            <text x={cx - 28 + k * 56 - (etiquetas.length === 1 ? -28 : 0)} y={cy + 24} fontSize="10" fontWeight="800" fill={c} textAnchor="middle">{t}</text>
          </g>
        ))
      ) : (
        <text x={cx} y={cy + 24} fontSize="9" fill="#94a3b8" textAnchor="middle">Anota los grados</text>
      )}
    </svg>
  );
};

const NumIn = ({ value, onChange, color, label }) => (
  <label className="flex-1">
    <span className="block text-xs font-bold uppercase mb-0.5" style={{ color }}>
      {label}
    </span>
    <div className="relative">
      <input
        type="number"
        min="0"
        max="200"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full text-sm font-bold py-1 px-1.5 pr-5 rounded-lg border-2 text-center select-text"
        style={{ borderColor: `color-mix(in srgb, ${color} 33%, transparent)` }}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">°</span>
    </div>
  </label>
);

export const RomSection = ({ scales, set, zones = [] }) => {
  const suggested = jointsForZones(zones);
  const joints = scales.romJoints;

  const toggleJoint = (id) =>
    set({ romJoints: joints.includes(id) ? joints.filter((j) => j !== id) : [...joints, id] });
  const [grafico, setGrafico] = useState(false);

  const setVal = (mid, k, v) =>
    set({ rom: { ...scales.rom, [mid]: { ...(scales.rom[mid] || {}), [k]: v } } });

  const setPain = (jid, patch) =>
    set({ romPain: { ...scales.romPain, [jid]: { ...(scales.romPain[jid] || {}), ...patch } } });

  const chartData = useMemo(
    () =>
      ROM_NORMS.filter((r) => joints.includes(r.joint))
        .map((r) => {
          const v = scales.rom[r.id] || {};
          const pc = (x) => (x == null ? null : Math.round((x / r.norm) * 100));
          return {
            name: `${r.joint} · ${r.mov}`,
            Izquierdo: r.bilateral ? pc(v.izq) : pc(v.val),
            Derecho: r.bilateral ? pc(v.der) : null,
          };
        })
        .filter((d) => d.Izquierdo != null || d.Derecho != null),
    [scales.rom, joints],
  );

  return (
    <Card
      icon={Ruler}
      color="text-cyan-700"
      title="Rango de movimiento articular (goniometría)"
      subtitle="Elija las articulaciones y anote los grados. Se compara con el valor normal (AAOS) y entre lados (> 10 % = asimetría)."
      right={
        joints.length > 0 && (
          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-bold">
            <button type="button" onClick={() => setGrafico(false)} className={`px-3 py-1.5 cursor-pointer ${!grafico ? "bg-cyan-600 text-white" : "bg-white text-slate-600"}`}>
              Compacto
            </button>
            <button type="button" onClick={() => setGrafico(true)} className={`px-3 py-1.5 cursor-pointer ${grafico ? "bg-cyan-600 text-white" : "bg-white text-slate-600"}`}>
              Con medidores
            </button>
          </div>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {ROM_JOINTS.map((j) => {
          const on = joints.includes(j.id);
          const sug = suggested.includes(j.id);
          return (
            <button
              type="button"
              key={j.id}
              onClick={() => toggleJoint(j.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                on
                  ? "bg-cyan-600 border-cyan-600 text-white shadow"
                  : sug
                    ? "bg-cyan-50 border-cyan-300 text-cyan-800 border-dashed"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
              }`}
            >
              {on ? "✓" : <Plus className="w-3.5 h-3.5" />}
              {j.id}
              {sug && !on && <span className="text-xs font-black uppercase">· zona afectada</span>}
            </button>
          );
        })}
        {suggested.some((s) => !joints.includes(s)) && (
          <button
            type="button"
            onClick={() => set({ romJoints: Array.from(new Set([...joints, ...suggested])) })}
            className="text-sm font-bold text-cyan-700 underline underline-offset-2 cursor-pointer"
          >
            Agregar todas las zonas afectadas
          </button>
        )}
      </div>

      {joints.length === 0 ? (
        <p className="px-3 py-2 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs flex items-center justify-center gap-1.5">
          <Info className="w-4 h-4 text-slate-400" />
          Toque arriba las articulaciones a medir. Las sugeridas salen del mapa corporal.
        </p>
      ) : (
        <div className={grafico ? "space-y-4" : "grid xl:grid-cols-2 gap-3"}>
          {ROM_JOINTS.filter((j) => joints.includes(j.id)).map((j) => {
            const jp = scales.romPain[j.id] || {};
            return (
              <div key={j.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white border-b border-slate-200">
                  <h5 className="text-sm font-extrabold text-slate-900">{j.id}</h5>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-600">Dolor al movimiento:</span>
                    <select
                      value={jp.fase || "ninguno"}
                      onChange={(e) => setPain(j.id, { fase: e.target.value })}
                      className="p-1.5 rounded-lg border border-slate-300 text-sm"
                    >
                      {PAIN_PHASES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    {jp.fase && jp.fase !== "ninguno" && (
                      <>
                        <span className="font-semibold text-slate-600">NRS</span>
                        <select
                          value={jp.nrs ?? ""}
                          onChange={(e) => setPain(j.id, { nrs: e.target.value === "" ? null : Number(e.target.value) })}
                          className="p-1.5 rounded-lg border border-slate-300 text-sm w-16"
                        >
                          <option value="">–</option>
                          {Array.from({ length: 11 }, (_, n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleJoint(j.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Quitar articulación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {!grafico && (
                  <div className="p-2 space-y-1">
                    <div className="grid grid-cols-[minmax(0,1.3fr)_64px_64px_minmax(0,1fr)] gap-1.5 px-1 text-[10px] font-bold uppercase text-slate-500">
                      <span>Movimiento</span>
                      <span className="text-center text-indigo-700">Izq.</span>
                      <span className="text-center text-cyan-700">Der.</span>
                      <span>% del normal</span>
                    </div>
                    {j.movs.map((m) => {
                      const bil = m.bilateral !== false;
                      const v = scales.rom[m.id] || {};
                      const pct = (x) => (x == null ? null : Math.round((x / m.norm) * 100));
                      const pI = pct(bil ? v.izq : v.val);
                      const pD = bil ? pct(v.der) : null;
                      const worst = [pI, pD].filter((x) => x != null);
                      const st = romStatusLabel(worst.length ? Math.min(...worst) : null);
                      const asym = bil && v.izq != null && v.der != null && Math.max(v.izq, v.der) > 0 && Math.abs(v.izq - v.der) / Math.max(v.izq, v.der) > 0.1;
                      const inp = "w-full text-sm font-bold py-1 px-1 rounded-lg border border-slate-300 bg-white text-center";
                      const barra = (p, c) =>
                        p == null ? null : (
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(p, 100)}%`, background: c }} />
                          </div>
                        );
                      return (
                        <div key={m.id} className="grid grid-cols-[minmax(0,1.3fr)_64px_64px_minmax(0,1fr)] gap-1.5 items-center bg-white rounded-lg border border-slate-200 px-1.5 py-1">
                          <span className="min-w-0">
                            <span className="block text-xs font-bold text-slate-800 truncate">{m.mov}</span>
                            <span className="block text-[10px] font-mono text-slate-500">normal 0–{m.norm}°</span>
                          </span>
                          {bil ? (
                            <>
                              <input type="number" min="0" max="200" value={v.izq ?? ""} onChange={(e) => setVal(m.id, "izq", e.target.value === "" ? null : Number(e.target.value))} className={inp} placeholder="°" />
                              <input type="number" min="0" max="200" value={v.der ?? ""} onChange={(e) => setVal(m.id, "der", e.target.value === "" ? null : Number(e.target.value))} className={inp} placeholder="°" />
                            </>
                          ) : (
                            <input type="number" min="0" max="200" value={v.val ?? ""} onChange={(e) => setVal(m.id, "val", e.target.value === "" ? null : Number(e.target.value))} className={`${inp} col-span-2`} placeholder="° medido" />
                          )}
                          <span className="min-w-0 space-y-0.5">
                            {barra(pI, "var(--color-indigo-500)")}
                            {barra(pD, "var(--color-cyan-500)")}
                            {(st || asym) && (
                              <span className="flex flex-wrap gap-1">
                                {st && <span className={`text-[10px] font-bold px-1.5 rounded-full ${st[1]}`}>{st[0]} · {Math.min(...worst)}%</span>}
                                {asym && <span className="text-[10px] font-bold px-1.5 rounded-full bg-rose-100 text-rose-700">Asimetría</span>}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {grafico && (
                <div className="p-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 select-none">
                  {j.movs.map((m) => {
                    const bil = m.bilateral !== false;
                    const v = scales.rom[m.id] || {};
                    const vals = bil ? [v.izq, v.der] : [v.val];
                    const present = vals.filter((x) => x != null);
                    const worst = present.length ? Math.min(...present.map((x) => (x / m.norm) * 100)) : null;
                    const st = romStatusLabel(worst);
                    const asym =
                      bil && v.izq != null && v.der != null && Math.max(v.izq, v.der) > 0
                        ? Math.abs(v.izq - v.der) / Math.max(v.izq, v.der) > 0.1
                        : false;
                    return (
                      <div
                        key={m.id}
                        className={`bg-white rounded-xl border border-slate-200 border-t-4 p-2 ${
                          worst == null ? "border-t-slate-200" : worst >= 90 ? "border-t-emerald-500" : worst >= 70 ? "border-t-amber-400" : "border-t-rose-500"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 leading-tight">{m.mov}</span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">0–{m.norm}°</span>
                        </div>
                        <div className="max-w-[150px] mx-auto">
                          <RomGauge norm={m.norm} izq={bil ? v.izq : null} der={bil ? v.der : null} val={bil ? null : v.val} />
                        </div>
                        <div className="flex gap-2">
                          {bil ? (
                            <>
                              <NumIn label="Izquierdo" color="var(--color-indigo-600)" value={v.izq} onChange={(x) => setVal(m.id, "izq", x)} />
                              <NumIn label="Derecho" color="var(--color-cyan-600)" value={v.der} onChange={(x) => setVal(m.id, "der", x)} />
                            </>
                          ) : (
                            <NumIn label="Medido" color="var(--color-violet-600)" value={v.val} onChange={(x) => setVal(m.id, "val", x)} />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2 min-h-[22px]">
                          {st && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st[1]}`}>
                              {st[0]} · {Math.round(worst)}%
                            </span>
                          )}
                          {asym && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                              Asimetría
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })}

          {chartData.length > 0 && (
            <div className={`rounded-2xl border border-slate-200 p-3 bg-white ${grafico ? "" : "xl:col-span-2"}`}>
              <h5 className="text-sm font-extrabold text-slate-800 mb-2">
                Resumen: % del rango normal alcanzado
              </h5>
              <div style={{ height: Math.max(180, chartData.length * 30 + 50) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 120]} unit="%" tick={{ fontSize: 13 }} />
                    <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 13, fill: "#334155" }} />
                    <Tooltip formatter={(v) => (v == null ? "–" : `${v}%`)} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <ReferenceLine x={100} stroke="var(--color-green-600)" strokeWidth={2} />
                    <ReferenceLine x={70} stroke="var(--color-amber-500)" strokeDasharray="4 4" />
                    <Bar isAnimationActive={false} maxBarSize={56} dataKey="Izquierdo" name="Izquierdo / único" fill="var(--color-indigo-500)" radius={[0, 6, 6, 0]} barSize={16} />
                    <Bar isAnimationActive={false} maxBarSize={56} dataKey="Derecho" fill="var(--color-cyan-500)" radius={[0, 6, 6, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

/* ===================== 4. FUERZA MRC ===================== */
export const MrcSection = ({ scales, set }) => {
  const setMRC = (gid, lado, v) =>
    set({ mrc: { ...scales.mrc, [gid]: { ...(scales.mrc[gid] || {}), [lado]: v === "" ? null : Number(v) } } });
  const conValor = (g) => scales.mrc[g.id]?.izq != null || scales.mrc[g.id]?.der != null;
  const [visibles, setVisibles] = useState(() => {
    const v = MRC_GROUPS.filter(conValor).map((g) => g.id);
    return v.length ? v : ["abd_hombro", "flex_codo", "ext_muneca", "flex_cadera", "ext_rodilla", "dorsi_tobillo"];
  });
  const regiones = [...new Set(MRC_GROUPS.map((g) => g.region))];
  const alternar = (id) => setVisibles((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const lista = MRC_GROUPS.filter((g) => visibles.includes(g.id) || conValor(g));
  const data = lista.map((g) => ({
    corto: g.label,
    Izquierdo: scales.mrc[g.id]?.izq ?? null,
    Derecho: scales.mrc[g.id]?.der ?? null,
  }));
  const sum = mrcTotal(scales.mrc);
  const any = data.some((d) => d.Izquierdo != null || d.Derecho != null);
  return (
    <Card
      icon={Dumbbell}
      color="text-indigo-600"
      title="Fuerza muscular (escala MRC 0-5)"
      subtitle="Test muscular manual bilateral. Toque los grupos que va a evaluar; la suma se compara con el máximo (5 por lado)."
      right={
        <div className="text-right">
          <span className="block text-xs font-bold uppercase text-slate-500">Suma MRC</span>
          <span className="text-3xl font-black text-indigo-700">
            {sum ? sum.total : "–"}
            <span className="text-base text-slate-400">/{sum ? sum.count * 5 : 60}</span>
          </span>
        </div>
      }
    >
      <div className="space-y-1.5 mb-4 select-none">
        {regiones.map((r) => (
          <div key={r} className="flex flex-wrap items-center gap-1.5">
            <span className="w-28 shrink-0 text-[11px] font-black uppercase text-slate-500">{r}</span>
            {MRC_GROUPS.filter((g) => g.region === r).map((g) => {
              const on = visibles.includes(g.id) || conValor(g);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => alternar(g.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${on ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"}`}
                >
                  {on ? "✓ " : "+ "}
                  {g.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-1 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 text-xs uppercase">
              <th className="py-2">Grupo muscular</th>
              <th className="py-2">Izquierdo</th>
              <th className="py-2">Derecho</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((g) => (
              <tr key={g.id} className="border-t border-slate-100">
                <td className="py-2 font-semibold text-slate-800">{g.label}</td>
                {["izq", "der"].map((lado) => (
                  <td key={lado} className="py-2 pr-2">
                    <select
                      value={scales.mrc[g.id]?.[lado] ?? ""}
                      onChange={(e) => setMRC(g.id, lado, e.target.value)}
                      className="w-full text-sm p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">–</option>
                      {MRC_GRADES.map((m) => (
                        <option key={m.v} value={m.v}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3" style={{ height: Math.max(260, data.length * 34 + 60) }}>
          {any ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 13 }} />
                <YAxis type="category" dataKey="corto" width={160} tick={{ fontSize: 13, fill: "#334155" }} />
                <Tooltip formatter={(v) => (v == null ? "–" : `${v}/5`)} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <ReferenceLine x={5} stroke="var(--color-green-600)" strokeDasharray="4 4" />
                <Bar isAnimationActive={false} maxBarSize={56} dataKey="Izquierdo" fill="var(--color-indigo-500)" radius={[0, 6, 6, 0]} barSize={14} />
                <Bar isAnimationActive={false} maxBarSize={56} dataKey="Derecho" fill="var(--color-cyan-500)" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
              <Info className="w-7 h-7" />
              El gráfico aparece al registrar la fuerza.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

/* ===================== 5. PRUEBAS ESPECIALES ===================== */
const TEST_ZONE_KEYWORDS = {
  cervical: ["cervical"],
  hombro: ["hombro"],
  codo: ["codo"],
  muneca_mano: ["muñeca", "mano", "pulgar"],
  codo_muneca: ["codo", "muñeca"],
  columna_dorsal: ["dorsal", "lumbar"],
  lumbar: ["lumbar"],
  cadera: ["cadera"],
  rodilla: ["rodilla"],
  tobillo_pie: ["tobillo", "pie", "talón"],
  dedos_mano: ["dedos de la mano", "mano"],
  dedos_pie: ["dedos del pie", "hallux"],
  talon: ["talón", "fascia", "tobillo"],
  sacroiliaca: ["sacroilíaca", "lumbar"],
  toracica: ["dorsal"],
  muslo: ["cadera", "rodilla"],
  pierna: ["tobillo", "rodilla"],
  atm: ["cervical"],
};

export const SpecialTestsSection = ({ tests = [], onChange, zones = [] }) => {
  const [showAll, setShowAll] = useState(false);
  const [newName, setNewName] = useState("");
  const [newJoint, setNewJoint] = useState("");
  const keys = zones.flatMap((z) => TEST_ZONE_KEYWORDS[z] || []);
  const relevant = (t) => keys.some((k) => (t.joint || "").toLowerCase().includes(k));
  const indexed = tests.map((t, i) => ({ t, i }));
  const visible = showAll || keys.length === 0 ? indexed : indexed.filter(({ t }) => relevant(t) || t.custom);
  const positives = tests.filter((t) => t.result === "positivo").length;
  const evaluadas = tests.filter((t) => t.result && t.result !== "no_evaluado").length;

  const setResult = (i, result) => onChange(tests.map((t, k) => (k === i ? { ...t, result } : t)));
  const remove = (i) => onChange(tests.filter((_, k) => k !== i));
  const add = () => {
    if (!newName.trim()) return;
    onChange([...tests, { testName: newName.trim(), joint: newJoint.trim() || "Otra", result: "positivo", custom: true }]);
    setNewName("");
    setNewJoint("");
  };

  return (
    <Card
      icon={Stethoscope}
      color="text-emerald-700"
      title="Pruebas ortopédicas especiales"
      subtitle="Se muestran las pruebas de las zonas marcadas en el mapa corporal. Registre el resultado de las que realice."
      right={
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${positives ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
          {evaluadas} evaluada(s) · {positives} positiva(s)
        </span>
      }
    >
      {keys.length > 0 && (
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3 cursor-pointer w-fit">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="w-4 h-4" />
          Mostrar todas las pruebas ({tests.length})
        </label>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {visible.map(({ t, i }) => (
          <div
            key={`${t.testName}-${i}`}
            className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border ${
              t.result === "positivo"
                ? "border-rose-300 bg-rose-50"
                : t.result === "dudoso"
                  ? "border-amber-300 bg-amber-50"
                  : t.result === "negativo"
                    ? "border-emerald-300 bg-emerald-50/60"
                    : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-800">{t.testName}</span>
              <span className="text-xs text-slate-500">{t.joint}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              {[
                ["no_evaluado", "No evaluado", "bg-slate-500"],
                ["negativo", "Negativo", "bg-emerald-600"],
                ["dudoso", "Dudoso", "bg-amber-500"],
                ["positivo", "Positivo", "bg-rose-600"],
              ].map(([r, l, c]) => {
                const actual = t.result || "no_evaluado";
                return (
                  <button
                    type="button"
                    key={r}
                    title={r === "negativo" ? "Normal: no reproduce síntomas" : r === "positivo" ? "Reproduce el síntoma / hallazgo" : r === "dudoso" ? "Respuesta poco clara" : "No se realizó"}
                    onClick={() => setResult(i, r)}
                    className={`px-2 h-8 rounded-lg text-[11px] font-black cursor-pointer border select-none ${
                      actual === r ? `${c} text-white border-transparent` : "bg-white text-slate-500 border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
              {t.custom && (
                <button type="button" onClick={() => remove(i)} className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-sm text-slate-500">No hay pruebas predefinidas para estas zonas; agregue una abajo.</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Otra prueba (ej. Test de Jobe)"
          className="flex-1 text-sm p-2.5 rounded-xl border border-slate-300"
        />
        <input
          value={newJoint}
          onChange={(e) => setNewJoint(e.target.value)}
          placeholder="Articulación"
          className="sm:w-48 text-sm p-2.5 rounded-xl border border-slate-300"
        />
        <button
          type="button"
          onClick={add}
          className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold flex items-center gap-1 justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>
    </Card>
  );
};

/* ===================== 6. PALPACIÓN ===================== */
export const PalpationSection = ({ tone, onTone, temp, onTemp, notes, onNotes }) => (
  <Card
    icon={Hand}
    color="text-amber-700"
    title="Palpación e inspección local"
    subtitle="Tono muscular, signos inflamatorios y puntos gatillo."
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <span className="block text-sm font-bold text-slate-700 mb-2">Tono muscular</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["normotono", "Normal"],
            ["contractura_focal", "Contractura focal"],
            ["hipertono_espasmo", "Hipertono / espasmo"],
            ["hipotono", "Hipotono"],
          ].map(([v, l]) => (
            <button
              type="button"
              key={v}
              onClick={() => onTone(v)}
              className={`p-2.5 rounded-xl border-2 text-sm font-bold cursor-pointer ${
                tone === v ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-700"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="block text-sm font-bold text-slate-700 mb-2">Temperatura / edema</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["normotermico", "Sin signos"],
            ["calor_local", "Calor local"],
            ["edema_leve", "Edema leve"],
            ["edema_moderado", "Edema moderado"],
          ].map(([v, l]) => (
            <button
              type="button"
              key={v}
              onClick={() => onTemp(v)}
              className={`p-2.5 rounded-xl border-2 text-sm font-bold cursor-pointer ${
                temp === v ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-700"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
    <textarea
      rows={2}
      value={notes}
      onChange={(e) => onNotes(e.target.value)}
      placeholder="Puntos gatillo, zonas dolorosas a la palpación, crepitación…"
      className="w-full mt-4 text-sm p-3 rounded-xl border border-slate-300"
    />
  </Card>
);

/* ===================== 7. OSWESTRY ===================== */
export const OdiSection = ({ scales, set }) => {
  const odi = odiResult(scales.odi);
  return (
    <Card
      icon={ClipboardList}
      color="text-violet-700"
      title="Índice de Discapacidad de Oswestry (dolor lumbar)"
      subtitle="10 secciones de 0 a 5. Resultado en %; un cambio de 10 puntos o más entre evaluaciones se considera real."
      right={
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={scales.odi.enabled}
            onChange={(e) => set({ odi: { ...scales.odi, enabled: e.target.checked } })}
            className="w-5 h-5 accent-violet-600"
          />
          Aplicar cuestionario
        </label>
      }
    >
      {scales.odi.enabled ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {ODI_SECTIONS.map((s, i) => (
              <div key={s} className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  {i + 1}. {s}
                </label>
                <select
                  value={scales.odi.answers[i] ?? ""}
                  onChange={(e) => {
                    const answers = [...scales.odi.answers];
                    answers[i] = e.target.value === "" ? null : Number(e.target.value);
                    set({ odi: { ...scales.odi, answers } });
                  }}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Sin responder</option>
                  {ODI_LEVELS.map((l, v) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Resultado ODI</span>
            <span className="text-6xl font-black my-2" style={{ color: odi ? odi.color : "#64748b" }}>
              {odi ? `${odi.pct}%` : "–"}
            </span>
            <span className="text-lg font-bold">{odi ? odi.label : "Complete el cuestionario"}</span>
            {odi && <span className="text-xs text-slate-400 mt-1">{odi.answered}/10 secciones</span>}
            <div className="w-full mt-6 space-y-1 text-left text-xs">
              {[
                ["0–20 %", "Mínima", "var(--color-green-600)"],
                ["21–40 %", "Moderada", "var(--color-yellow-600)"],
                ["41–60 %", "Severa", "var(--color-orange-600)"],
                ["61–80 %", "Invalidante", "var(--color-red-700)"],
                ["81–100 %", "Postrado / magnificación", "#7f1d1d"],
              ].map(([r, l, c]) => (
                <div key={r} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: c }} />
                  <span className="font-mono w-16">{r}</span>
                  <span className="text-slate-300">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Recomendado cuando el motivo de consulta es dolor lumbar. Active la casilla para responderlo.
        </p>
      )}
    </Card>
  );
};
