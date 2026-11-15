// =====================================================================
// Tarjeta de indicador con minigráfico (mismo estilo que el Dashboard
// general): título en mayúsculas, número grande animado, una línea de
// contexto y la tendencia de los últimos días a la derecha.
// =====================================================================
import React from "react";
import { NumeroAnimado } from "./NumeroAnimado";

/** Minigráfico de línea con relleno y punto final (igual que el dashboard) */
export const MiniGrafico = ({ serie = [], color = "var(--color-blue-500)", relleno = true, ancho = 80, alto = 26 }) => {
  const datos = serie.length > 1 ? serie.map((v) => Number(v) || 0) : [Number(serie[0]) || 0, Number(serie[0]) || 0];
  const min = Math.min(...datos);
  const max = Math.max(...datos);
  const rango = max - min || 1;
  const y = (v) => alto - ((v - min) / rango) * (alto - 6) - 3;
  const puntos = datos.map((v, i) => `${((i / (datos.length - 1)) * ancho).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={ancho} height={alto} className="overflow-visible">
      {relleno && <path d={`M 0,${alto} L ${puntos} L ${ancho},${alto} Z`} fill={color} fillOpacity={0.15} />}
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={puntos} />
      <circle cx={ancho} cy={y(datos[datos.length - 1])} r="3" fill={color} />
    </svg>
  );
};

const TONOS = {
  teal: { fondo: "bg-cyan-50 border-cyan-200", color: "var(--color-cyan-500)", grad: "from-cyan-500 to-teal-600", texto: "text-cyan-600", borde: "border-cyan-500 ring-2 ring-cyan-500/20", hover: "hover:border-cyan-400", sub: "text-cyan-700" },
  verde: { fondo: "bg-emerald-50 border-emerald-200", color: "var(--color-emerald-500)", grad: "from-emerald-500 to-teal-600", texto: "text-emerald-600", borde: "border-emerald-500 ring-2 ring-emerald-500/20", hover: "hover:border-emerald-400", sub: "text-emerald-700" },
  rojo: { fondo: "bg-rose-50 border-rose-200", color: "var(--color-rose-500)", grad: "from-rose-500 to-red-600", texto: "text-rose-600", borde: "border-rose-500 ring-2 ring-rose-500/20", hover: "hover:border-rose-400", sub: "text-rose-700" },
  ambar: { fondo: "bg-amber-50 border-amber-200", color: "var(--color-amber-500)", grad: "from-amber-500 to-orange-500", texto: "text-amber-600", borde: "border-amber-500 ring-2 ring-amber-500/20", hover: "hover:border-amber-400", sub: "text-amber-700" },
  violeta: { fondo: "bg-violet-50 border-violet-200", color: "var(--color-violet-500)", grad: "from-violet-500 to-indigo-600", texto: "text-violet-600", borde: "border-violet-500 ring-2 ring-violet-500/20", hover: "hover:border-violet-400", sub: "text-violet-700" },
  azul: { fondo: "bg-blue-50 border-blue-200", color: "var(--color-blue-500)", grad: "from-blue-500 to-indigo-600", texto: "text-blue-600", borde: "border-blue-500 ring-2 ring-blue-500/20", hover: "hover:border-blue-400", sub: "text-blue-700" },
  rosa: { fondo: "bg-pink-50 border-pink-200", color: "var(--color-pink-500)", grad: "from-pink-500 to-fuchsia-600", texto: "text-pink-600", borde: "border-pink-500 ring-2 ring-pink-500/20", hover: "hover:border-pink-400", sub: "text-pink-700" },
  plomo: { fondo: "bg-slate-50 border-slate-200", color: "var(--color-slate-500)", grad: "from-slate-500 to-slate-700", texto: "text-slate-700", borde: "border-slate-500 ring-2 ring-slate-500/20", hover: "hover:border-slate-400", sub: "text-slate-600" },
};

/** Anillo de avance (0-100) */
export const Anillo = ({ pct = 0, clase = "text-cyan-600", tam = 34 }) => (
  <svg viewBox="0 0 36 36" width={tam} height={tam} className="shrink-0 -rotate-90" aria-hidden>
    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
    <circle
      cx="18"
      cy="18"
      r="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      className={`${clase} transition-[stroke-dasharray] duration-700`}
      strokeDasharray={`${(Math.max(0, Math.min(100, pct)) / 100) * 94.2} 94.2`}
    />
  </svg>
);

/**
 * Tarjeta de indicador común a todo el sistema:
 * icono grande en degradado, número animado, línea de contexto y, a la derecha,
 * minigráfico (serie) o anillo de avance (progreso 0-100).
 * <TarjetaKpi titulo="Nuevos" valor={12} sub="registrados hoy" serie={[1,3,2,5]} tono="teal" icono={Sparkles} />
 * alerta = estilo rojo de "Acción inmediata"; activo = resaltada (filtro elegido)
 */
export const TarjetaKpi = ({ titulo, valor = 0, decimales = 0, prefijo = "", sufijo = "", sub, icono: I, tono = "teal", serie, progreso, activo = false, alerta = false, pulso = false, onClick, title, texto }) => {
  const t = TONOS[alerta ? "rojo" : tono] || TONOS.teal;
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={`rd-kpi @container rd-aparece rd-levanta relative overflow-hidden w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${onClick ? "cursor-pointer" : ""} ${
        alerta ? "bg-rose-50 border-rose-300 hover:border-rose-400" : `${t.fondo} ${activo ? t.borde : t.hover}`
      }`}
    >
      {I && (
        <span className={`relative w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center shadow-md ${pulso ? "animate-pulse" : ""}`}>
          <I className="w-[18px] h-[18px]" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-[10px] font-black uppercase tracking-wider leading-tight line-clamp-2 ${alerta ? "text-rose-700" : "text-slate-500"}`}>{titulo}</span>
        <span className={`block text-lg font-black leading-tight whitespace-nowrap ${t.texto}`}>
          {texto != null ? texto : <NumeroAnimado valor={Number(valor) || 0} decimales={decimales} prefijo={prefijo} />}
          {sufijo}
        </span>
        {sub && <span className="block text-[11px] font-semibold text-slate-500 leading-tight line-clamp-2" title={typeof sub === "string" ? sub : undefined}>{sub}</span>}
      </span>
      {progreso != null ? (
        <span className="hidden @[13rem]:block shrink-0"><Anillo pct={progreso} clase={t.texto} /></span>
      ) : serie ? (
        <span className="hidden @[16rem]:block shrink-0 pl-1">
          <MiniGrafico serie={serie} color={t.color} ancho={52} alto={22} />
        </span>
      ) : null}
    </Comp>
  );
};

/** Serie de los últimos n días contando las fechas (AAAA-MM-DD...) de una lista */
export const seriePorDia = (fechas, n = 8, hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })) => {
  const dias = Array.from({ length: n }, (_, i) => {
    const d = new Date(`${hoy}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
  const cuenta = Object.fromEntries(dias.map((d) => [d, 0]));
  fechas.forEach((f) => {
    const k = String(f || "").slice(0, 10);
    if (k in cuenta) cuenta[k]++;
  });
  return dias.map((d) => cuenta[d]);
};

/** Serie repartida en hasta n tramos entre dos fechas (para reportes con rango elegido) */
export const serieRango = (fechas, desde, hasta, n = 10) => {
  const t = (f) => Date.parse(`${String(f).slice(0, 10)}T12:00:00Z`);
  const a = t(desde), b = t(hasta);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return [fechas.length];
  const dias = Math.round((b - a) / 864e5) + 1;
  const tramos = Math.max(2, Math.min(n, dias));
  const out = Array(tramos).fill(0);
  fechas.forEach((f) => {
    const x = t(f);
    if (!Number.isFinite(x) || x < a || x > b) return;
    out[Math.min(tramos - 1, Math.floor(((x - a) / 864e5 / dias) * tramos))]++;
  });
  return out;
};
