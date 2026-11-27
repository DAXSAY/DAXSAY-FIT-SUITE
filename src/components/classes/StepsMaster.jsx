// =====================================================================
// Steps (sitios) de un máster: el mismo croquis del salón de clases.
//  - El alumno elige su step al inscribirse o lo cambia después.
//  - Recepción lo elige al inscribir o se lo asigna/cambia a cada inscrito.
//  Gana quien lo tomó primero: al segundo le sale «Lugar ocupado».
// =====================================================================
import React, { useEffect, useRef, useState } from "react";
import { LayoutGrid, X, RefreshCw } from "lucide-react";
import { api } from "../../api/cliente";
import { Croquis, LeyendaCroquis } from "./Croquis";
import { DIAS, diaDe, fechaBonita } from "./clasesComun";

/** Carga el croquis del máster y lo actualiza solo cada pocos segundos */
export function useStepsMaster(idmaster, cada = 5000) {
  const [info, setInfo] = useState(null);
  const vivo = useRef(true);
  const cargar = () =>
    api(`/masters/${idmaster}/steps`)
      .then((d) => vivo.current && setInfo(d))
      .catch(() => vivo.current && setInfo((x) => x || { conSteps: false, croquis: null, reservas: [] }));
  useEffect(() => {
    vivo.current = true;
    cargar();
    const t = cada ? setInterval(cargar, cada) : null;
    return () => ((vivo.current = false), t && clearInterval(t));
  }, [idmaster]); // eslint-disable-line react-hooks/exhaustive-deps
  return { info, cargar };
}

/**
 * Croquis para elegir un step libre.
 *  seleccionado: id del step elegido (aún sin guardar)
 *  miStepId: el step que ya tiene esta persona (se muestra como «el tuyo»)
 */
export const ElegirStep = ({ info, seleccionado, miStepId, onElegir, conMio = false, nombres = true }) => {
  const [aviso, setAviso] = useState("");
  if (!info) return <p className="text-sm text-slate-500">Cargando croquis…</p>;
  if (!info.conSteps || !info.croquis?.steps?.some((z) => z.tipo === "step"))
    return <p className="text-xs text-slate-500">El salón aún no tiene croquis de steps: se entra sin sitio asignado.</p>;
  const reservas = info.reservas.map((r) => ({ ...r, mia: r.mia || (miStepId && r.stepId === miStepId) }));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LeyendaCroquis conMio={conMio} conExterno />
        <span className="text-[11px] text-slate-500 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Se actualiza solo · ⭐ {info.socios ?? 0} socio{info.socios === 1 ? "" : "s"} · 🎟️ {info.externos ?? 0} externo{info.externos === 1 ? "" : "s"} · {Math.max(0, info.libres)} libres</span>
      </div>
      <Croquis
        croquis={info.croquis}
        reservas={reservas}
        nombres={nombres}
        seleccionado={seleccionado}
        onStep={(z, r) => {
          if (r && !r.mia) return setAviso(`Lugar ocupado: el step ${z.numero} ya es de ${String(r.alumno || "otra persona").split(" ")[0]}. Elige otro.`);
          setAviso("");
          onElegir(z);
        }}
      />
      {aviso && <p className="text-sm font-bold rounded-xl border p-2.5 text-rose-700 bg-rose-50 border-rose-200">{aviso}</p>}
    </div>
  );
};

/** Ventana completa para elegir o cambiar el step (alumno o recepción) */
export const VentanaStep = ({ master, titulo, miStepId, conMio = false, boton = "Guardar step", onGuardar, onCerrar, permitirQuitar = false, sinStep = "" }) => {
  const { info, cargar } = useStepsMaster(master.id, 4000);
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const guardar = async (step) => {
    setEnviando(true);
    try {
      const texto = await onGuardar(step);
      if (texto) setMsg({ ok: true, texto });
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
      setSel(null);
    } finally {
      setEnviando(false);
      cargar();
    }
  };
  const elegido = info?.croquis?.steps?.find((z) => z.id === sel);
  const hayCroquis = !!info?.conSteps && !!info?.croquis?.steps?.some((z) => z.tipo === "step");
  const sinLibres = hayCroquis && info.libres <= 0 && !miStepId;
  return (
    <div className="fixed inset-0 z-[80] bg-slate-100 overflow-y-auto" data-rd-tam="ancha">
      <div className="w-full max-w-2xl mx-auto min-h-full bg-white p-4 sm:p-6 space-y-3 text-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-black flex items-center gap-2 min-w-0">
            <LayoutGrid className="w-5 h-5 text-amber-500 shrink-0" /> <span className="truncate">{titulo}</span>
          </h3>
          <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>
        <div className={`rd-kpi-${master.color} rd-clase-card rounded-2xl p-3 text-sm`}>
          <p className="font-black">{master.emoji} {master.titulo}</p>
          <p className="text-xs">📅 {DIAS[diaDe(master.fecha)]} {fechaBonita(master.fecha).split(" ").slice(1).join(" ")} · {master.inicio} – {master.fin} · 🧑‍🏫 {master.profesor}</p>
        </div>
        {msg && <p className={`text-sm font-bold rounded-xl border p-3 ${msg.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.texto}</p>}
        <ElegirStep info={info} seleccionado={sel} miStepId={miStepId} conMio={conMio} onElegir={(z) => (setSel(z.id), setMsg(null))} />
        <p className="text-xs text-slate-500">Toca un step libre. Si dos personas eligen el mismo a la vez, se queda quien lo hizo primero.</p>
        <div className="flex flex-wrap justify-end gap-2">
          {permitirQuitar && miStepId && (
            <button type="button" disabled={enviando} onClick={() => guardar(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 cursor-pointer">Quitar step</button>
          )}
          {sinStep && info && (!hayCroquis || sinLibres) && (
            <button type="button" disabled={enviando} onClick={() => guardar(null)} className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black cursor-pointer">{sinStep}</button>
          )}
          <button type="button" disabled={!sel || enviando} onClick={() => guardar(sel)} className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-black cursor-pointer">
            {elegido ? `${boton} · step ${elegido.numero}` : "👆 Elige un step"}
          </button>
        </div>
      </div>
    </div>
  );
};
