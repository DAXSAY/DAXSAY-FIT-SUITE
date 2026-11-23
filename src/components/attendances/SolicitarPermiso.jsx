// El propio trabajador (entrenador, fisioterapia, nutrición, recepción) pide un
// permiso desde su campana; queda «pendiente» y le llega a administración.
import React, { useState } from "react";
import { FileCheck2, X, Send, Check } from "lucide-react";
import { api } from "../../api/cliente";
import { useGym } from "../../context/GymContext";
import { hoyISO } from "../../utils/fecha";
import { TIPOS_PERMISO, diasDelPermiso } from "./PermisosPersonal";
import { getRole } from "../../config/roles";
import { IconoEmoji } from "../common/IconoEmoji";

export const BotonSolicitarPermiso = () => {
  const { currentUser } = useGym();
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState({ tipo: "salud", desde: hoyISO(), hasta: hoyISO(), porHoras: false, horaDesde: "09:00", horaHasta: "11:00", motivo: "" });
  const [estado, setEstado] = useState("");
  if (!currentUser || ["admin", "student"].includes(currentUser.role)) return null;

  const enviar = async (e) => {
    e.preventDefault();
    if (f.motivo.trim().length < 3) return setEstado("Escribe el motivo.");
    if (!f.porHoras && f.hasta < f.desde) return setEstado("La fecha final no puede ser antes de la inicial.");
    const id = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const datos = {
      id,
      idusuarioSolicitante: currentUser.id,
      staffId: currentUser.staffId || null,
      nombre: currentUser.fullName,
      cargo: getRole(currentUser.role)?.label || currentUser.role,
      role: currentUser.role,
      tipo: f.tipo,
      desde: f.desde,
      hasta: f.porHoras ? f.desde : f.hasta,
      porHoras: f.porHoras,
      horaDesde: f.porHoras ? f.horaDesde : null,
      horaHasta: f.porHoras ? f.horaHasta : null,
      conGoce: true,
      motivo: f.motivo.trim(),
      estado: "pendiente",
      solicitadoPor: currentUser.fullName,
      creado: new Date().toISOString(),
    };
    try {
      setEstado("Enviando…");
      await api(`/registros/permisos/${id}`, { method: "PUT", body: { datos } });
      setEstado("ok");
    } catch (err) {
      setEstado(err?.message || "No se pudo enviar.");
    }
  };

  const campo = "w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm";
  return (
    <>
      <button type="button" onClick={() => (setAbierto(true), setEstado(""))} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-800 text-xs font-black hover:bg-sky-100 cursor-pointer">
        <FileCheck2 className="w-4 h-4" /> Solicitar un permiso
      </button>
      {abierto && (
        <div className="fixed inset-0 z-[90] rd-velo flex items-center justify-center p-4" onClick={() => setAbierto(false)}>
          <form onSubmit={enviar} onClick={(e) => e.stopPropagation()} className="rd-ventana-std bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center"><FileCheck2 className="w-5 h-5" /></span>
                Solicitar permiso
              </p>
              <button type="button" onClick={() => setAbierto(false)} className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer" aria-label="Cerrar"><X className="w-4 h-4" /></button>
            </div>
            {estado === "ok" ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-2">
                <Check className="w-5 h-5 shrink-0" /> Listo. Administración ya ve tu solicitud en sus avisos; te aprobarán o te dirán el motivo si no.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(TIPOS_PERMISO).map(([k, t]) => (
                    <button key={k} type="button" onClick={() => setF({ ...f, tipo: k })} className={`px-2.5 py-2 rounded-xl border text-xs font-bold text-left cursor-pointer ${f.tipo === k ? "bg-sky-600 border-sky-600 text-white" : "bg-white border-slate-200 text-slate-700"}`}>
                      <IconoEmoji e={t.icono} /> {t.nombre}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={f.porHoras} onChange={(e) => setF({ ...f, porHoras: e.target.checked })} /> Solo unas horas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-bold text-slate-500">Desde<input type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} className={campo} /></label>
                  {f.porHoras ? (
                    <div className="grid grid-cols-2 gap-1">
                      <label className="text-xs font-bold text-slate-500">De<input type="time" value={f.horaDesde} onChange={(e) => setF({ ...f, horaDesde: e.target.value })} className={campo} /></label>
                      <label className="text-xs font-bold text-slate-500">A<input type="time" value={f.horaHasta} onChange={(e) => setF({ ...f, horaHasta: e.target.value })} className={campo} /></label>
                    </div>
                  ) : (
                    <label className="text-xs font-bold text-slate-500">Hasta<input type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} className={campo} /></label>
                  )}
                </div>
                {!f.porHoras && <p className="text-[11px] text-slate-500">{diasDelPermiso(f.desde, f.hasta).length} día(s) (sin domingos)</p>}
                <textarea required rows={3} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Motivo (ej. cita médica en EsSalud)" className={campo} />
                {estado && <p className="text-xs font-bold text-rose-600">{estado}</p>}
                <button type="submit" className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-black flex items-center justify-center gap-2 cursor-pointer">
                  <Send className="w-4 h-4" /> Enviar a administración
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
};
