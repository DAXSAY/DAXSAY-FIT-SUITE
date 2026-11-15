import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Dumbbell, X, Link2, Plus, Filter, Check } from "lucide-react";
import { ExercisePicker, tipoDeEjercicio } from "./ExerciseBank";
import { GUIA_SESION } from "./GuiaSesion";
import { tipoDia } from "./SistemasEntrenamiento";

/**
 * Banco de ejercicios en un panel lateral que se abre desde un botón flotante
 * (siempre visible en la esquina, sin importar cuánto se haya bajado).
 *
 * destino: { dia, combinarCon?: { idx, nombre, etiqueta } } | null (cerrado)
 * dias: [{ nombre, tipo, ids: [exerciseId…] }]
 */
export const BancoFlotante = ({ exercises, destino, setDestino, dias = [], onAgregar, onCombinar, onPropio, etiquetaBoton = "Banco de ejercicios", aviso, onCerrar }) => {
  const abierto = !!destino;
  const dia = destino?.dia ?? 0;
  const d = dias[dia] || dias[0] || { ids: [] };
  const guia = d.tipo ? GUIA_SESION[d.tipo] : null;
  const [filtrar, setFiltrar] = useState(true);
  const [ultimo, setUltimo] = useState("");
  const [ultimoDia, setUltimoDia] = useState(0);
  useEffect(() => {
    if (destino) setUltimoDia(destino.dia ?? 0);
  }, [destino?.dia]);

  useEffect(() => {
    if (!abierto) return;
    const esc = (e) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [abierto, setDestino]);
  useEffect(() => setUltimo(""), [destino?.dia, destino?.combinarCon?.idx]);

  const cerrar = () => {
    setDestino(null);
    onCerrar?.();
  };
  const lista = useMemo(() => {
    if (!guia || !filtrar) return exercises;
    const ok = new Set(guia.tipos);
    return exercises.filter((e) => ok.has(tipoDeEjercicio(e)));
  }, [exercises, guia, filtrar]);

  const elegir = (ex) => {
    if (destino?.combinarCon) {
      onCombinar(dia, destino.combinarCon.idx, ex);
      // Ya quedó unido: lo siguiente que elija se agrega normal al día
      setDestino({ dia });
    } else onAgregar(dia, ex);
    setUltimo(ex.name);
  };

  const t = d.tipo ? tipoDia(d.tipo) : null;

  return createPortal(
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setDestino({ dia: Math.min(ultimoDia, Math.max(dias.length - 1, 0)) })}
          className="rd-boton-banco fixed bottom-5 right-5 z-[60] flex items-center gap-2 pl-4 pr-5 py-3 rounded-full text-sm font-extrabold cursor-pointer"
          aria-label="Abrir banco de ejercicios"
        >
          <Dumbbell className="w-5 h-5" /> {etiquetaBoton}
        </button>
      )}
      {abierto && (
        <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-label="Banco de ejercicios" data-sin-controles>
          <div className="rd-cajon-velo absolute inset-0 bg-slate-900/35" onClick={cerrar} />
          <aside className="rd-cajon relative m-0 sm:m-3 h-full sm:h-[calc(100%-1.5rem)] w-full sm:w-[560px] rounded-none sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden">
            <header className="px-4 pt-4 pb-3 border-b border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-extrabold text-slate-900 flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white flex items-center justify-center shadow-md"><Dumbbell className="w-5 h-5" /></span>
                  <span>
                    Banco de ejercicios
                    <span className="block text-[11px] font-semibold text-slate-500">{lista.length} ejercicios · {dias[dia]?.nombre || "Día"}</span>
                  </span>
                </p>
                <button type="button" onClick={cerrar} className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:rotate-90 transition-transform flex items-center justify-center cursor-pointer" aria-label="Cerrar banco">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {aviso && <p className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900">{aviso}</p>}
              {destino?.combinarCon ? (
                <div className="rounded-xl bg-violet-50 border border-violet-200 px-3 py-2 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-violet-700 shrink-0" />
                  <p className="text-xs text-violet-900 flex-1 min-w-0">
                    Combinar con <b>{destino.combinarCon.etiqueta ? `${destino.combinarCon.etiqueta} · ` : ""}{destino.combinarCon.nombre}</b>. El que elijas se agrega debajo y queda unido.
                  </p>
                  <button type="button" onClick={() => setDestino({ dia })} className="text-[11px] font-bold text-violet-700 underline cursor-pointer shrink-0">
                    Solo agregar
                  </button>
                </div>
              ) : (
                dias.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    <span className="text-[11px] font-bold text-slate-500 shrink-0">Agregar a:</span>
                    {dias.map((x, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDestino({ dia: i })}
                        className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${i === dia ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"}`}
                      >
                        {x.nombre || `Día ${i + 1}`} ({x.ids.length})
                      </button>
                    ))}
                  </div>
                )
              )}

              {guia && (
                <button
                  type="button"
                  onClick={() => setFiltrar((v) => !v)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer flex items-center gap-1.5 ${filtrar ? "bg-indigo-50 border-indigo-200 text-indigo-800" : "bg-white border-slate-200 text-slate-600"}`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {filtrar ? `Mostrando ejercicios para ${t?.[2]} (${lista.length}) · ver todos` : `Mostrando todo el banco · solo los de ${t?.[2]}`}
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-4 rd-scroll-suave">
              <ExercisePicker exercises={lista} onPick={elegir} picked={d.ids} alto="max-h-none" />
            </div>

            <footer className="px-4 py-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-600 truncate flex items-center gap-1">
                {ultimo ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Agregado: <b className="truncate">{ultimo}</b>
                  </>
                ) : (
                  "Toca un ejercicio para agregarlo. Puedes elegir varios."
                )}
              </span>
              <div className="flex gap-1.5 shrink-0">
                {onPropio && (
                  <button type="button" onClick={() => onPropio(dia)} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-50">
                    <Plus className="w-3.5 h-3.5" /> Ejercicio propio
                  </button>
                )}
                <button type="button" onClick={cerrar} className="rd-accion-cabecera px-5 py-2 rounded-xl text-xs font-extrabold cursor-pointer">
                  Listo
                </button>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </>,
    document.body
  );
};
