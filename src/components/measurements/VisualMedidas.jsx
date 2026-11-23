// Visualización de composición corporal (bioimpedancia) y medidas
// - Barras de rango de colores (IMC, grasa, músculo, visceral, agua, cintura/cadera)
// - Dona de composición (grasa, músculo, hueso, resto)
// - Silueta con las medidas (perímetros) y el cambio respecto a la evaluación anterior
import React from "react";
import { IconoEmoji } from "../common/IconoEmoji";

const n = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const r1 = (v) => Math.round(v * 10) / 10;

// Rangos de referencia por sexo y edad (adultos).
//  - Grasa: Gallagher et al. 2000 (Am J Clin Nutr) / ACSM, por grupo de edad
//  - Músculo esquelético %: tablas de bioimpedancia (Tanita/Omron) por edad
//  - IMC: OMS · Grasa visceral: escala 1-59 de bioimpedancia (1-9 normal)
//  - Agua: 50-65 % hombres, 45-60 % mujeres · Cintura: OMS/IDF · ICC: OMS 2008
const grupoEdad = (edad) => (edad == null ? "20-39" : edad < 40 ? "20-39" : edad < 60 ? "40-59" : "60+");
const GRASA = {
  M: { "20-39": [8, 19, 25], "40-59": [11, 21, 28], "60+": [13, 24, 30] },
  F: { "20-39": [21, 32, 39], "40-59": [23, 33, 40], "60+": [24, 35, 42] },
};
const MUSCULO = {
  M: { "20-39": [33.3, 39.3, 44], "40-59": [33.1, 39.1, 43.8], "60+": [32.9, 38.9, 43.6] },
  F: { "20-39": [24.3, 30.3, 35.3], "40-59": [24.1, 30.1, 35.1], "60+": [23.9, 29.9, 34.9] },
};
export function rangos(sexo, edad) {
  const m = sexo === "F";
  const s = m ? "F" : "M";
  const ge = grupoEdad(edad);
  const [gMin, gMax, gAlto] = GRASA[s][ge];
  const [mMin, mMax, mAlto] = MUSCULO[s][ge];
  const quien = `${m ? "mujer" : "hombre"} ${ge === "60+" ? "de 60 años a más" : `de ${ge} años`}`;
  return {
    imc: { min: 14, max: 40, optimo: [18.5, 24.9], fuente: "OMS", tramos: [[18.5, "var(--color-sky-400)", "Bajo"], [25, "var(--color-green-500)", "Normal"], [30, "var(--color-amber-500)", "Sobrepeso"], [40, "var(--color-red-500)", "Obesidad"]] },
    grasa: {
      min: m ? 10 : 3,
      max: m ? 50 : 40,
      optimo: [gMin, gMax],
      fuente: `Gallagher 2000 · ${quien}`,
      tramos: [[gMin, "var(--color-sky-400)", "Bajo"], [gMax, "var(--color-green-500)", "Saludable"], [gAlto, "var(--color-amber-500)", "Alto"], [m ? 50 : 40, "var(--color-red-500)", "Muy alto"]],
    },
    musculo: {
      min: m ? 15 : 25,
      max: m ? 45 : 55,
      optimo: [mMin, m ? 45 : 55],
      fuente: `Bioimpedancia · ${quien}`,
      tramos: [[mMin, "var(--color-amber-500)", "Bajo"], [mMax, "var(--color-green-500)", "Normal"], [mAlto, "var(--color-emerald-500)", "Alto"], [m ? 45 : 55, "var(--color-sky-500)", "Muy alto"]],
    },
    visceral: { min: 1, max: 30, optimo: [1, 9], fuente: "Escala de bioimpedancia", tramos: [[9.5, "var(--color-green-500)", "Normal"], [14.5, "var(--color-amber-500)", "Alto"], [30, "var(--color-red-500)", "Muy alto"]] },
    agua: m
      ? { min: 35, max: 70, optimo: [45, 60], fuente: "Referencia mujer adulta", tramos: [[45, "var(--color-amber-500)", "Baja"], [60, "var(--color-green-500)", "Normal"], [70, "var(--color-sky-500)", "Alta"]] }
      : { min: 40, max: 75, optimo: [50, 65], fuente: "Referencia hombre adulto", tramos: [[50, "var(--color-amber-500)", "Baja"], [65, "var(--color-green-500)", "Normal"], [75, "var(--color-sky-500)", "Alta"]] },
    icc: m
      ? { min: 0.6, max: 1.1, optimo: [0.6, 0.8], fuente: "OMS 2008", tramos: [[0.8, "var(--color-green-500)", "Bajo riesgo"], [0.85, "var(--color-amber-500)", "Moderado"], [1.1, "var(--color-red-500)", "Alto"]] }
      : { min: 0.7, max: 1.2, optimo: [0.7, 0.9], fuente: "OMS 2008", tramos: [[0.9, "var(--color-green-500)", "Bajo riesgo"], [1.0, "var(--color-amber-500)", "Moderado"], [1.2, "var(--color-red-500)", "Alto"]] },
    cintura: m
      ? { min: 55, max: 120, optimo: [55, 80], fuente: "OMS / IDF", tramos: [[80, "var(--color-green-500)", "Saludable"], [88, "var(--color-amber-500)", "Riesgo aumentado"], [120, "var(--color-red-500)", "Riesgo alto"]] }
      : { min: 65, max: 130, optimo: [65, 94], fuente: "OMS / IDF", tramos: [[94, "var(--color-green-500)", "Saludable"], [102, "var(--color-amber-500)", "Riesgo aumentado"], [130, "var(--color-red-500)", "Riesgo alto"]] },
    cinturaTalla: { min: 0.35, max: 0.75, optimo: [0.4, 0.49], fuente: "Ashwell 2012", tramos: [[0.4, "var(--color-sky-400)", "Bajo"], [0.5, "var(--color-green-500)", "Saludable"], [0.6, "var(--color-amber-500)", "Riesgo"], [0.75, "var(--color-red-500)", "Riesgo alto"]] },
  };
}

const pct = (p, kg, peso) => n(p) ?? (n(kg) && n(peso) ? (kg / peso) * 100 : null);
const tramoDe = (v, cfg) => cfg.tramos.find(([h]) => v <= h) || cfg.tramos[cfg.tramos.length - 1];

/** Barra horizontal con zonas de color y un marcador en el valor */
export function BarraRango({ titulo, icono, valor, unidad = "", cfg, previo, invertido = false, decimales = 1, compacto = false }) {
  const v = n(valor);
  const pos = (x) => Math.max(0, Math.min(100, ((x - cfg.min) / (cfg.max - cfg.min)) * 100));
  const t = v != null ? tramoDe(v, cfg) : null;
  const p = n(previo);
  const cambio = v != null && p != null ? r1(v - p) : null;
  const bueno = cambio == null || cambio === 0 ? null : invertido ? cambio < 0 : cambio > 0;
  let ini = cfg.min;
  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${compacto ? "p-2" : "p-3"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
          {icono && <span className="text-base"><IconoEmoji e={icono} /></span>} {titulo}
        </span>
        {t && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: t[1] }}>
            {t[2]}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className={`${compacto ? "text-lg" : "text-2xl"} font-black text-slate-900`}>{v != null ? (decimales === 0 ? Math.round(v) : decimales === 2 ? Math.round(v * 100) / 100 : r1(v)) : "—"}</span>
        <span className="text-sm text-slate-500">{unidad}</span>
        {cambio != null && cambio !== 0 && (
          <span className={`text-xs font-bold ${bueno ? "text-emerald-600" : "text-rose-600"}`}>
            {cambio > 0 ? "▲" : "▼"} {Math.abs(cambio)}
          </span>
        )}
      </div>
      <div className="relative mt-2 h-3">
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          {cfg.tramos.map(([hasta, color], k) => {
            const w = pos(hasta) - pos(ini);
            ini = hasta;
            return <div key={k} style={{ width: `${w}%`, background: color, opacity: 0.85 }} />;
          })}
        </div>
        {p != null && <div className="absolute -top-0.5 w-0.5 h-4 bg-slate-400" style={{ left: `${pos(p)}%` }} title={`Anterior: ${p}`} />}
        {v != null && (
          <div className="absolute -top-1.5 -translate-x-1/2" style={{ left: `${pos(v)}%` }}>
            <div className="w-5 h-5 rounded-full bg-white border-[3px] shadow" style={{ borderColor: t?.[1] || "#0f172a" }} />
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        {cfg.tramos.map(([, , l], k) => (
          <span key={k}>{l}</span>
        ))}
      </div>
      {cfg.optimo && v != null && (
        <p className={`mt-1.5 text-[11px] font-bold ${v >= cfg.optimo[0] && v <= cfg.optimo[1] ? "text-emerald-700" : "text-rose-600"}`} title={cfg.fuente}>
          {v >= cfg.optimo[0] && v <= cfg.optimo[1] ? "✓ En rango óptimo" : "Fuera del rango óptimo"} · óptimo {cfg.optimo[0]}–{cfg.optimo[1]}
          {unidad && unidad !== "nivel" ? ` ${unidad}` : ""}
          {cfg.fuente && <span className="block font-normal text-slate-400">{cfg.fuente}</span>}
        </p>
      )}
    </div>
  );
}

/** Dona de composición corporal en kg */
export function DonaComposicion({ peso, grasaKg, musculoKg, huesoKg }) {
  const P = n(peso);
  if (!P) return null;
  const g = n(grasaKg) || 0;
  const mu = n(musculoKg) || 0;
  const h = n(huesoKg) || 0;
  const resto = Math.max(0, P - g - mu - h);
  const partes = [
    ["Grasa", g, "var(--color-amber-500)"],
    ["Músculo", mu, "var(--color-emerald-500)"],
    ["Hueso", h, "#94a3b8"],
    ["Agua y órganos", resto, "var(--color-sky-400)"],
  ].filter(([, v]) => v > 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let acum = 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-4">
      <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {partes.map(([l, v, c]) => {
          const largo = (v / P) * C;
          const el = <circle key={l} cx="70" cy="70" r={R} fill="none" stroke={c} strokeWidth="18" strokeDasharray={`${largo} ${C - largo}`} strokeDashoffset={-acum} />;
          acum += largo;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" transform="rotate(90 70 70)" fontSize="20" fontWeight="900" fill="#0f172a">{r1(P)}</text>
        <text x="70" y="84" textAnchor="middle" transform="rotate(90 70 70)" fontSize="10" fill="#64748b">kg</text>
      </svg>
      <div className="space-y-1.5 text-sm">
        <p className="text-xs font-bold text-slate-500">¿De qué está hecho tu peso?</p>
        {partes.map(([l, v, c]) => (
          <p key={l} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: c }} />
            <span className="text-slate-700 w-28">{l}</span>
            <b className="text-slate-900">{r1(v)} kg</b>
            <span className="text-xs text-slate-400">{Math.round((v / P) * 100)}%</span>
          </p>
        ))}
      </div>
    </div>
  );
}

/** Panel completo de composición corporal */
export const edadDe = (nac) => {
  if (!nac) return null;
  const d = new Date(String(nac).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const h = new Date();
  let e = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) e--;
  return e;
};

export function PanelComposicion({ a, previo, sexo, edad }) {
  if (!a) return null;
  const b = a.bioimpedance || {};
  const bp = previo?.bioimpedance || {};
  const R = rangos(sexo, edad);
  const icc = n(a.waistHipRatio) ?? (n(a.perimeters?.waist) && n(a.perimeters?.hip) ? a.perimeters.waist / a.perimeters.hip : null);
  const iccPrev = n(previo?.waistHipRatio);
  const imc = n(a.bmi) ?? (n(a.weightKg) && n(a.heightCm) ? a.weightKg / (a.heightCm / 100) ** 2 : null);
  const edadMet = n(b.metabolicAge);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
        <DonaComposicion peso={a.weightKg} grasaKg={b.bodyFatKg ?? (n(b.bodyFatPercentage) && a.weightKg ? (a.weightKg * b.bodyFatPercentage) / 100 : null)} musculoKg={b.muscleMassKg} huesoKg={b.boneMassKg} />
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-orange-50 to-white p-3">
            <p className="text-xs font-bold text-slate-500"><IconoEmoji e="🔥" /> Metabolismo basal</p>
            <p className="text-2xl font-black text-slate-900">{n(b.basalMetabolicRateKcal) ? Math.round(b.basalMetabolicRateKcal) : "—"} <span className="text-sm font-semibold text-slate-500">kcal/día</span></p>
            <p className="text-[11px] text-slate-500">Lo que gasta tu cuerpo en reposo</p>
          </div>
          <div className={`rounded-xl border p-3 ${edadMet && edad ? (edadMet <= edad ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" : "border-rose-200 bg-gradient-to-br from-rose-50 to-white") : "border-slate-200 bg-white"}`}>
            <p className="text-xs font-bold text-slate-500"><IconoEmoji e="🎂" /> Edad metabólica</p>
            <p className="text-2xl font-black text-slate-900">{edadMet ?? "—"} <span className="text-sm font-semibold text-slate-500">años</span></p>
            {edadMet && edad ? (
              <p className={`text-[11px] font-semibold ${edadMet <= edad ? "text-emerald-700" : "text-rose-700"}`}>
                {edadMet < edad ? `${edad - edadMet} años más joven que tu edad real 💪` : edadMet === edad ? "Igual a tu edad real" : `${edadMet - edad} años mayor que tu edad real`}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">Comparada con tu edad real</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-3">
            <p className="text-xs font-bold text-slate-500"><IconoEmoji e="💧" /> Agua corporal</p>
            <p className="text-2xl font-black text-slate-900">{n(b.totalBodyWaterLiters) ? r1(b.totalBodyWaterLiters) : n(b.totalBodyWaterPercentage) && n(a.weightKg) ? r1((a.weightKg * b.totalBodyWaterPercentage) / 100) : "—"} <span className="text-sm font-semibold text-slate-500">litros</span></p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3">
            <p className="text-xs font-bold text-slate-500"><IconoEmoji e="🦴" /> Masa ósea</p>
            <p className="text-2xl font-black text-slate-900">{n(b.boneMassKg) ? r1(b.boneMassKg) : "—"} <span className="text-sm font-semibold text-slate-500">kg</span></p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <BarraRango titulo="Índice de masa corporal" icono="⚖️" valor={imc} cfg={R.imc} previo={previo?.bmi} invertido />
        <BarraRango titulo="Grasa corporal" icono="🟠" valor={b.bodyFatPercentage} unidad="%" cfg={R.grasa} previo={bp.bodyFatPercentage} invertido />
        <BarraRango titulo="Masa muscular" icono="💪" valor={pct(b.muscleMassPercentage, b.muscleMassKg, a.weightKg)} unidad="%" cfg={R.musculo} previo={pct(bp.muscleMassPercentage, bp.muscleMassKg, previo?.weightKg)} />
        <BarraRango titulo="Grasa visceral" icono="🫀" valor={b.visceralFatLevel} unidad="nivel" cfg={R.visceral} previo={bp.visceralFatLevel} invertido decimales={0} />
        <BarraRango titulo="Agua corporal" icono="💧" valor={b.totalBodyWaterPercentage} unidad="%" cfg={R.agua} previo={bp.totalBodyWaterPercentage} />
        {icc != null && <BarraRango titulo="Cintura / cadera" icono="📏" valor={icc} cfg={R.icc} previo={iccPrev} invertido decimales={2} />}
        {n(a.perimeters?.waist) != null && <BarraRango titulo="Perímetro de cintura" icono="📐" valor={a.perimeters.waist} unidad="cm" cfg={R.cintura} previo={previo?.perimeters?.waist} invertido />}
      </div>
      <p className="text-[11px] text-slate-400">Rangos de referencia por sexo y edad{edad ? ` (${edad} años)` : ""}. La línea gris marca la evaluación anterior.</p>
    </div>
  );
}

/** Silueta de frente con las medidas y su cambio */
export function SiluetaMedidas({ p = {}, previo = {}, sexo }) {
  const m = sexo === "F";
  const filas = [
    ["neck", "Cuello", 62, "izq"],
    ["shoulders", "Hombros", 82, "der"],
    ["chest", "Pecho", 108, "izq"],
    ["bicepsFlexedRight", "Brazo (contraído)", 128, "der"],
    ["waist", "Cintura", 150, "izq", true],
    ["abdomen", "Abdomen", 168, "der", true],
    ["hip", "Cadera", 192, "izq", true],
    ["thighSuperior", "Muslo", 228, "der"],
    ["calf", "Pantorrilla", 300, "izq"],
  ];
  const ancho = { neck: 14, shoulders: 50, chest: 40, bicepsFlexedRight: 9, waist: m ? 28 : 32, abdomen: m ? 32 : 34, hip: m ? 42 : 36, thighSuperior: 15, calf: 10 };
  const cx = { bicepsFlexedRight: 160, thighSuperior: 126, calf: 124 };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <svg viewBox="0 0 400 360" className="w-full max-w-[520px] mx-auto">
        {/* cuerpo */}
        <g fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2">
          <circle cx="200" cy="36" r="22" />
          <rect x="190" y="56" width="20" height="14" rx="4" />
          <path d={m ? "M152 78 Q200 70 248 78 L240 140 Q232 152 228 160 Q246 182 244 205 L156 205 Q154 182 172 160 Q168 152 160 140 Z" : "M148 78 Q200 70 252 78 L242 150 Q236 165 234 175 L238 205 L162 205 L166 175 Q164 165 158 150 Z"} />
          <path d="M148 82 L132 150 L140 152 L158 92 Z" />
          <path d="M252 82 L268 150 L260 152 L242 92 Z" />
          <path d="M162 205 L170 340 L194 340 L198 215 L202 215 L206 340 L230 340 L238 205 Z" />
        </g>
        {filas.map(([k, l, y, lado, invertido]) => {
          const v = n(p[k]);
          const ant = n(previo?.[k]);
          const c = v != null && ant != null ? r1(v - ant) : null;
          const bueno = c == null || c === 0 ? null : invertido ? c < 0 : c > 0;
          const x0 = (cx[k] || 200) - ancho[k];
          const x1 = (cx[k] || 200) + ancho[k];
          const xt = lado === "izq" ? 14 : 268;
          const xl = lado === "izq" ? 130 : 270;
          return (
            <g key={k} opacity={v != null ? 1 : 0.35}>
              <line x1={x0} y1={y} x2={x1} y2={y} stroke="var(--color-blue-600)" strokeWidth="2" strokeDasharray="4 3" />
              <line x1={lado === "izq" ? x0 : x1} y1={y} x2={xl} y2={y} stroke="#cbd5e1" strokeWidth="1" />
              <rect x={xt} y={y - 14} width="118" height="28" rx="8" fill={v != null ? "#ebfcfc" : "#f8fafc"} stroke={v != null ? "#a0ecef" : "#e2e8f0"} />
              <text x={xt + 8} y={y - 2} fontSize="9" fill="#64748b" fontWeight="600">{l}</text>
              <text x={xt + 8} y={y + 10} fontSize="12" fill="#0f172a" fontWeight="800">{v != null ? `${v} cm` : "—"}</text>
              {c != null && c !== 0 && (
                <text x={xt + 110} y={y + 10} fontSize="10" textAnchor="end" fontWeight="800" fill={bueno ? "var(--color-emerald-600)" : "var(--color-rose-600)"}>
                  {c > 0 ? "▲" : "▼"}{Math.abs(c)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-[11px] text-slate-400 text-center">▲▼ cambio respecto a la evaluación anterior (verde = mejora)</p>
    </div>
  );
}

// Dónde se mide cada perímetro (y cómo)
export const COMO_MEDIR = {
  neck: ["Cuello", 62, 200, 14, "Por debajo de la nuez (cartílago tiroides), cinta perpendicular al eje del cuello."],
  shoulders: ["Hombros", 82, 200, 52, "Por la parte más ancha de los deltoides, brazos relajados al costado."],
  chest: ["Pecho / tórax", 108, 200, 42, "A la altura de los pezones (mesoesternal), al final de una espiración normal."],
  waist: ["Cintura mínima", 150, 200, 30, "En el punto más estrecho entre la última costilla y la cresta ilíaca."],
  abdomen: ["Abdomen", 168, 200, 34, "A la altura del ombligo, abdomen relajado, sin meter la barriga."],
  hip: ["Cadera / glúteos", 192, 200, 40, "En la máxima protuberancia de los glúteos, pies juntos."],
  bicepsRel: ["Brazo relajado", 125, 262, 9, "Punto medio entre acromion y olécranon, brazo colgando relajado."],
  bicepsFlex: ["Brazo contraído", 120, 262, 11, "En el pico del bíceps con el codo a 90° y el puño cerrado, contraído al máximo."],
  forearm: ["Antebrazo", 160, 268, 8, "En la parte más ancha del antebrazo, mano relajada y palma hacia arriba."],
  thighSup: ["Muslo superior", 222, 222, 18, "1 cm por debajo del pliegue glúteo, peso repartido en ambas piernas."],
  thighMid: ["Muslo medio", 250, 222, 16, "Punto medio entre el pliegue inguinal y el borde superior de la rótula."],
  calf: ["Pantorrilla", 300, 220, 11, "En la parte más ancha de la pantorrilla, de pie con el peso repartido."],
};

/** Figura que resalta dónde se mide el perímetro que se está escribiendo */
export function GuiaPerimetros({ activo, sexo, valores = {} }) {
  const m = sexo === "F";
  const a = COMO_MEDIR[activo];
  return (
    <div className="rounded-2xl border border-cyan-200 bg-gradient-to-b from-cyan-50 to-white p-3 flex flex-col items-center gap-2">
      <svg viewBox="100 0 200 360" className="w-full max-w-[220px]">
        <g fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2">
          <circle cx="200" cy="36" r="22" />
          <rect x="190" y="56" width="20" height="14" rx="4" />
          <path d={m ? "M152 78 Q200 70 248 78 L240 140 Q232 152 228 160 Q246 182 244 205 L156 205 Q154 182 172 160 Q168 152 160 140 Z" : "M148 78 Q200 70 252 78 L242 150 Q236 165 234 175 L238 205 L162 205 L166 175 Q164 165 158 150 Z"} />
          <path d="M148 82 L132 150 L140 152 L158 92 Z" />
          <path d="M252 82 L268 150 L260 152 L242 92 Z" />
          <path d="M162 205 L170 340 L194 340 L198 215 L202 215 L206 340 L230 340 L238 205 Z" />
        </g>
        {Object.entries(COMO_MEDIR).map(([k, [, y, x, w]]) => {
          const on = k === activo;
          const tiene = n(valores[k]) != null;
          return (
            <g key={k}>
              <ellipse cx={x} cy={y} rx={w} ry={on ? 5 : 3.5} fill="none" stroke={on ? "var(--color-rose-500)" : tiene ? "var(--color-blue-600)" : "#cbd5e1"} strokeWidth={on ? 3 : 1.6} strokeDasharray={on ? "" : "4 3"} />
              {on && <circle cx={x + w} cy={y} r="4" fill="var(--color-rose-500)" />}
            </g>
          );
        })}
      </svg>
      {a ? (
        <div className="text-center">
          <p className="text-sm font-black text-rose-600"><IconoEmoji e="📏" /> {a[0]}</p>
          <p className="text-xs text-slate-600 leading-snug">{a[4]}</p>
        </div>
      ) : (
        <p className="text-xs text-slate-500 text-center">Toca una medida para ver dónde se toma. Las ya registradas se marcan en verde.</p>
      )}
    </div>
  );
}
