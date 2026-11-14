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
  teal: { color: "var(--color-blue-500)", borde: "border-blue-500 ring-2 ring-blue-500/20", hover: "hover:border-blue-400", sub: "text-blue-600" },
  verde: { color: "var(--color-emerald-500)", borde: "border-emerald-500 ring-2 ring-emerald-500/20", hover: "hover:border-emerald-400", sub: "text-emerald-600" },
  rojo: { color: "var(--color-rose-500)", borde: "border-rose-500 ring-2 ring-rose-500/20", hover: "hover:border-rose-400", sub: "text-rose-600" },
  ambar: { color: "var(--color-amber-500)", borde: "border-amber-500 ring-2 ring-amber-500/20", hover: "hover:border-amber-400", sub: "text-amber-600" },
  violeta: { color: "var(--color-violet-500)", borde: "border-violet-500 ring-2 ring-violet-500/20", hover: "hover:border-violet-400", sub: "text-violet-600" },
  azul: { color: "var(--color-blue-500)", borde: "border-blue-500 ring-2 ring-blue-500/20", hover: "hover:border-blue-400", sub: "text-blue-600" },
};

/**
 * <TarjetaKpi titulo="Nuevos" valor={12} sub="registrados hoy" serie={[1,3,2,5]} tono="teal" icono={Sparkles} />
 * alerta = estilo rojo de "Acción inmediata"; activo = resaltada (filtro elegido)
 */
export const TarjetaKpi = ({ titulo, valor = 0, decimales = 0, prefijo = "", sufijo = "", sub, icono: I, tono = "teal", serie, activo = false, alerta = false, onClick, title }) => {
  const t = TONOS[tono] || TONOS.teal;
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={`rd-aparece rd-levanta w-full text-left p-4 rounded-xl border transition-all shadow-xs ${onClick ? "cursor-pointer" : ""} ${
        alerta ? "bg-rose-50/30 border-rose-200 hover:border-rose-400" : `bg-white ${activo ? t.borde : `border-gray-200 ${t.hover}`}`
      }`}
    >
      <div className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wider ${alerta ? "text-rose-700" : "text-gray-500"}`}>
        <span className="truncate">{titulo}</span>
        {I ? <I className="w-3.5 h-3.5 shrink-0" style={{ color: t.color }} /> : <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: t.color }} />}
      </div>
      <div className="flex items-end justify-between mt-1 gap-2">
        <div className="min-w-0">
          <span className={`text-2xl font-black ${alerta ? "text-rose-700" : "text-slate-900"}`}>
            <NumeroAnimado valor={Number(valor) || 0} decimales={decimales} prefijo={prefijo} />
            {sufijo}
          </span>
          {sub && <span className={`block text-xs font-bold mt-0.5 truncate ${alerta ? "text-rose-600" : t.sub}`}>{sub}</span>}
        </div>
        {serie && (
          <div className="shrink-0 pl-2">
            <MiniGrafico serie={serie} color={alerta ? "var(--color-rose-600)" : t.color} />
          </div>
        )}
      </div>
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
