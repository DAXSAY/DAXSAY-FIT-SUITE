// =====================================================================
// Buscador de socio por código, DNI o nombre.
//  Campo grande y llamativo; mientras se escribe muestra a quién
//  corresponde (nombre, código, plan y si está vigente) para que
//  recepción sepa exactamente a quién está sentando o inscribiendo.
// =====================================================================
import React from "react";
import { buscarAlumno } from "../../utils/codigo";

const VENCIDOS = ["expired", "inactive", "cancelled"];

/** Devuelve { hallado, vigente, resultado } para el texto escrito */
export function useSocio(members, texto) {
  const resultado = String(texto || "").trim() ? buscarAlumno(members, texto) : null;
  const hallado = resultado?.member || null;
  return { resultado, hallado, vigente: !!hallado && !VENCIDOS.includes(hallado.status) };
}

const iniciales = (n) =>
  String(n || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

/**
 * value / onChange: el texto escrito
 * detalleVigente / detalleVencido: texto opcional bajo el nombre (p. ej. el precio)
 */
export const BuscarSocio = React.forwardRef(function BuscarSocio(
  { members = [], value, onChange, etiqueta = "Código, DNI o nombre del socio", detalleVigente, detalleVencido, autoFocus = true },
  ref,
) {
  const { resultado, hallado, vigente } = useSocio(members, value);
  const escrito = String(value || "").trim();
  return (
    <div className="space-y-2.5">
      <label className="block">
        <span className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">🔎 {etiqueta}</span>
        <div className="rd-codigo">
          <span className="rd-codigo-ico">🪪</span>
          <input
            ref={ref}
            autoFocus={autoFocus}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ej. 1 · 70900002 · María"
            autoComplete="off"
            inputMode="text"
          />
        </div>
      </label>
      {hallado ? (
        <div className={`rd-socio-hallado rounded-xl border p-2.5 flex items-center gap-3 ${vigente ? "rd-kpi-verde rd-aviso-t" : "rd-kpi-ambar rd-aviso-t"}`}>
          <span className="rd-socio-avatar">{iniciales(hallado.fullName)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black leading-tight truncate">{hallado.fullName}</p>
            <p className="text-xs font-bold opacity-90">
              {hallado.codeLabel ? `🏷️ ${hallado.codeLabel}` : ""}
              {hallado.dni ? ` · 🪪 ${hallado.dni}` : ""}
              {hallado.planName ? ` · ${hallado.planName}` : ""}
            </p>
            <p className="text-xs font-black mt-0.5">
              {vigente ? "✅ Plan vigente" : "⚠️ Sin plan vigente"}
              {vigente ? (detalleVigente ? ` · ${detalleVigente}` : "") : detalleVencido ? ` · ${detalleVencido}` : ""}
            </p>
            {resultado?.by === "nombre" && resultado.varios > 1 && <p className="text-[11px] opacity-80">Hay {resultado.varios} coincidencias: escribe más letras o usa su código.</p>}
            {resultado?.letrasDistintas && <p className="text-[11px] opacity-80">Las letras del código no coinciden; revisa que sea la persona correcta.</p>}
          </div>
        </div>
      ) : escrito ? (
        <div className="rd-kpi-plomo rd-aviso-t rounded-2xl border p-3 text-sm font-bold">🙅 Ningún socio coincide con «{escrito}» todavía.</div>
      ) : (
        <p className="text-xs text-slate-500">Escribe y aparecerá aquí el nombre del socio antes de confirmar.</p>
      )}
    </div>
  );
});
