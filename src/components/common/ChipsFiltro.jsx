// Barra de filtros con el mismo diseño que la de Rutinas (Nivel / Entrenador):
// filas con su etiqueta, chips con emoji y contador, y un buscador redondeado.
// Se usa en Fisioterapia (fichas) y Nutrición (dietas y medidas).
import React from "react";

/** opciones: [{ k, emoji, texto, n }] · valor: k elegido ("" = ninguno) */
export function ChipsFiltro({ opciones, valor, onCambio, alternar = true }) {
  return (
    <>
      {opciones.map((o) => {
        const on = valor === o.k;
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onCambio(on && alternar ? "" : o.k)}
            className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${on ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`}
          >
            <span className="rd-emoji" aria-hidden="true">{o.emoji}</span> {o.texto}
            {o.n != null && <span className="opacity-70"> {o.n}</span>}
          </button>
        );
      })}
    </>
  );
}

/** Tarjeta de filtros: filas [{ etiqueta, contenido }] */
export function PanelFiltros({ filas }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
      {filas.filter(Boolean).map((f) => (
        <div key={f.etiqueta} className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1">{f.etiqueta}</span>
          {f.contenido}
        </div>
      ))}
    </div>
  );
}

/** Buscador redondeado (igual al «Buscar por nombre de rutina…») */
export const BuscadorFiltro = ({ valor, onCambio, placeholder, total, unidad = "alumno(s)" }) => (
  <>
    <input
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      placeholder={placeholder}
      className="flex-1 min-w-[200px] max-w-xl px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs focus:outline-none focus:border-blue-600"
    />
    {total != null && <span className="text-xs text-slate-500">{total} {unidad}</span>}
  </>
);

export default ChipsFiltro;
