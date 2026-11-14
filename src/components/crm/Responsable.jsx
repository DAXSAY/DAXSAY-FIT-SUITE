// =====================================================================
// CRM: responsable del interesado y sus 3 luces
//  🟢 Datos registrados → 🟢 Pase libre agendado → 🟢 Vino a su visita
// Con las tres, el interesado queda asegurado para su responsable.
// Si el responsable pasa 15 días sin seguimiento (30 si está asegurado), queda libre.
// =====================================================================
import React, { useEffect, useState } from "react";
import { ShieldCheck, UserRound, Unlock, Clock } from "lucide-react";
import { api } from "../../api/cliente";

export const LUCES = [
  ["datos", "Datos"],
  ["pase", "Pase libre"],
  ["visita", "Visita"],
];
export const lucesEncendidas = (p) => LUCES.filter(([k]) => p?.lights?.[k]).length;

/** Las tres luces; compacto = solo los puntos */
export const Luces = ({ p, compacto = false }) => (
  <span className="inline-flex items-center gap-1" title={LUCES.map(([k, l]) => `${p?.lights?.[k] ? "✓" : "○"} ${l}`).join("  ")}>
    {LUCES.map(([k, l]) => (
      <span key={k} className="inline-flex items-center gap-0.5">
        <span className={`w-2.5 h-2.5 rounded-full border ${p?.lights?.[k] ? "bg-emerald-500 border-emerald-600" : "bg-white border-slate-300"}`} />
        {!compacto && <span className={`text-[11px] font-bold ${p?.lights?.[k] ? "text-emerald-700" : "text-slate-400"}`}>{l}</span>}
      </span>
    ))}
  </span>
);

/** Situación del responsable en una frase y con color */
export const situacion = (p) => {
  if (!p?.owner) return { texto: "Sin responsable", tono: "bg-slate-100 border-slate-200 text-slate-600" };
  if (p.status === "matriculado") return { texto: "Matriculado", tono: "bg-emerald-50 border-emerald-200 text-emerald-800" };
  if (p.status === "de_baja") return { texto: "De baja", tono: "bg-slate-100 border-slate-200 text-slate-600" };
  if (p.free) return { texto: `Libre · ${p.daysWithoutFollowUp} días sin seguimiento`, tono: "bg-slate-100 border-slate-300 text-slate-700", icono: Unlock };
  if (p.freeInDays != null && p.freeInDays <= 5) return { texto: `Se libera en ${p.freeInDays} día${p.freeInDays === 1 ? "" : "s"}`, tono: "bg-amber-50 border-amber-200 text-amber-800", icono: Clock };
  if (p.secured) return { texto: "Asegurado", tono: "bg-emerald-50 border-emerald-200 text-emerald-800", icono: ShieldCheck };
  return null;
};

/** Chip para listas: 👤 David · Turno mañana  [Asegurado] */
export const ChipResponsable = ({ p }) => {
  if (!p?.owner) return null;
  const s = situacion(p);
  const I = s?.icono;
  return (
    <span className="inline-flex items-center gap-1 text-[11px]">
      <UserRound className="w-3.5 h-3.5 text-slate-400" />
      <span className="font-bold text-slate-700">{p.owner}</span>
      {p.ownerShift && <span className="text-slate-400">· {p.ownerShift}</span>}
      {s && !["Matriculado", "De baja"].includes(s.texto) && (
        <span className={`ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border font-black ${s.tono}`}>
          {I && <I className="w-3 h-3" />} {s.texto}
        </span>
      )}
    </span>
  );
};

/** Recuadro del detalle: responsable, luces y (administración) cambiar responsable */
export const PanelResponsable = ({ p, admin, onCambio }) => {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState([]);
  const [userId, setUserId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (abierto && !lista.length) api("/prospectos/responsables").then(setLista).catch((e) => setError(e.message));
  }, [abierto]);
  const s = situacion(p);
  const n = lucesEncendidas(p);
  const cerrado = ["matriculado", "de_baja"].includes(p.status);
  const guardar = async () => {
    setError("");
    try {
      onCambio(await api(`/prospectos/${p.id}/responsable`, { method: "POST", body: { userId, motivo } }));
      setAbierto(false);
      setMotivo("");
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className={`rounded-2xl border p-3 space-y-2 ${p.secured ? "border-emerald-200 bg-emerald-50/50" : p.free ? "border-slate-300 bg-slate-50" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase text-slate-400">Responsable del seguimiento</p>
          <p className="font-black text-slate-900">
            {p.owner || "Sin responsable"} {p.ownerShift && <span className="text-sm font-bold text-slate-500">· {p.ownerShift}</span>}
          </p>
        </div>
        {s && <span className={`px-2 py-1 rounded-full border text-xs font-black ${s.tono}`}>{s.texto}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Luces p={p} />
        <span className="text-xs font-bold text-slate-500">{n}/3</span>
      </div>
      {!cerrado && (
        <p className="text-xs text-slate-500">
          {p.secured
            ? `Tiene las 3 luces: si se matricula, aunque lo cobre otro turno, la venta es de ${p.owner}. Se libera solo si pasa ${p.freeInDays ?? 30} día(s) más sin seguimiento.`
            : p.free
              ? "Quedó libre: quien le haga el próximo seguimiento pasa a ser su responsable."
              : `Es de ${p.owner || "su responsable"}. Con pase libre y visita queda asegurado. Si pasa ${p.freeInDays ?? 15} día(s) más sin seguimiento, se libera.`}
        </p>
      )}
      {admin && !cerrado && (
        <div>
          {!abierto ? (
            <button type="button" onClick={() => setAbierto(true)} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
              Cambiar responsable
            </button>
          ) : (
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="">Pasar a…</option>
                {lista.filter((u) => u.id !== p.ownerId).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}{u.shift ? ` · ${u.shift}` : u.role === "admin" ? " · Administración" : ""}</option>
                ))}
              </select>
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={150} placeholder="Motivo del cambio" className="flex-1 min-w-[160px] px-2 py-1.5 rounded-lg border border-slate-300 text-sm" />
              <button type="button" disabled={!userId || !motivo.trim()} onClick={guardar} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-40">
                Guardar
              </button>
              <button type="button" onClick={() => setAbierto(false)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold cursor-pointer">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
    </div>
  );
};
