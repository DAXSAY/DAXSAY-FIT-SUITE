// =====================================================================
// Permisos del personal: alguien solicita (el trabajador por recepción o
// administración), administración aprueba o rechaza. Al aprobar, los días
// quedan marcados como "Permiso" en el calendario del personal, con su motivo.
// =====================================================================
import React, { useMemo, useState } from "react";
import { FileCheck2, Plus, X, Check, Ban, Undo2, Clock, CalendarRange, User, Hourglass } from "lucide-react";
import { TarjetaKpi } from "../common/TarjetaKpi";
import { useGym } from "../../context/GymContext";
import { hoyISO } from "../../utils/fecha";
import { userCan } from "../../config/roles";
import { registrosDe } from "./CalendarioPersonal";
import { IconoEmoji } from "../common/IconoEmoji";

export const TIPOS_PERMISO = {
  salud: { nombre: "Salud / cita médica", icono: "🩺" },
  personal: { nombre: "Personal / familiar", icono: "👨‍👩‍👧" },
  tramite: { nombre: "Trámite", icono: "📄" },
  estudios: { nombre: "Estudios / capacitación", icono: "🎓" },
  vacaciones: { nombre: "Vacaciones", icono: "🏖️" },
  duelo: { nombre: "Duelo", icono: "🕊️" },
  otro: { nombre: "Otro", icono: "📝" },
};

const ESTADO = {
  pendiente: { nombre: "Pendiente", clase: "bg-amber-100 text-amber-800 border-amber-300" },
  aprobado: { nombre: "Aprobado", clase: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  rechazado: { nombre: "Rechazado", clase: "bg-rose-100 text-rose-700 border-rose-300" },
  anulado: { nombre: "Anulado", clase: "bg-slate-100 text-slate-500 border-slate-300" },
};

const fechaCorta = (f) => (f ? f.split("-").reverse().slice(0, 2).join("/") : "");
const iniciales = (n) =>
  String(n || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

/** Días entre dos fechas (incluidas), sin domingos */
export const diasDelPermiso = (desde, hasta) => {
  const out = [];
  if (!desde) return out;
  const fin = hasta && hasta >= desde ? hasta : desde;
  for (let d = new Date(`${desde}T12:00:00`); d <= new Date(`${fin}T12:00:00`); d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) out.push(d.toISOString().slice(0, 10));
    if (out.length > 62) break;
  }
  return out;
};

const VACIO = { contratoId: "", tipo: "salud", desde: hoyISO(), hasta: hoyISO(), porHoras: false, horaDesde: "09:00", horaHasta: "11:00", conGoce: true, motivo: "" };

export const PermisosPersonal = () => {
  const { staffContracts = [], permisos = [], guardarPermiso, attendances = [], recordAttendance, deleteAttendance, currentUser } = useGym();
  const puedeSolicitar = userCan(currentUser, "attendances", "crear") || userCan(currentUser, "staff", "crear");
  const puedeAprobar = currentUser?.role === "admin" || userCan(currentUser, "staff", "editar");
  const [filtro, setFiltro] = useState("pendiente");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [rechazando, setRechazando] = useState(null); // { id, comentario }

  const personal = useMemo(() => staffContracts.filter((c) => c.status !== "terminated"), [staffContracts]);
  const hoy = hoyISO();
  const mes = hoy.slice(0, 7);
  const cuenta = {
    pendiente: permisos.filter((p) => p.estado === "pendiente").length,
    aprobadoMes: permisos.filter((p) => p.estado === "aprobado" && String(p.desde).slice(0, 7) === mes).length,
    rechazado: permisos.filter((p) => p.estado === "rechazado").length,
  };
  const lista = permisos
    .filter((p) => filtro === "todos" || p.estado === filtro)
    .sort((a, b) => String(b.creado).localeCompare(String(a.creado)));

  const enviar = (e) => {
    e.preventDefault();
    setError("");
    const c = personal.find((x) => x.id === form.contratoId);
    if (!c) return setError("Elige al trabajador.");
    if (!form.desde) return setError("Elige la fecha.");
    if (form.hasta < form.desde) return setError("La fecha final no puede ser antes de la inicial.");
    if (form.motivo.trim().length < 3) return setError("Escribe el motivo del permiso.");
    if (form.porHoras && form.horaHasta <= form.horaDesde) return setError("La hora final debe ser después de la inicial.");
    guardarPermiso({
      id: `perm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      contratoId: c.id,
      staffId: c.staffId,
      nombre: c.fullName,
      codigo: c.staffCode,
      cargo: c.roleTitle,
      dni: c.dni,
      role: c.role,
      tipo: form.tipo,
      desde: form.desde,
      hasta: form.porHoras ? form.desde : form.hasta,
      porHoras: form.porHoras,
      horaDesde: form.porHoras ? form.horaDesde : null,
      horaHasta: form.porHoras ? form.horaHasta : null,
      conGoce: form.conGoce,
      motivo: form.motivo.trim(),
      estado: "pendiente",
      solicitadoPor: currentUser?.fullName || currentUser?.username || "—",
      creado: new Date().toISOString(),
    });
    setForm(null);
    setFiltro("pendiente");
  };

  const aprobar = (p) => {
    // Pedido desde la campana del trabajador: se busca su contrato por DNI o nombre
    const c =
      staffContracts.find((x) => x.id === p.contratoId) ||
      staffContracts.find((x) => (p.staffId && String(x.staffId) === String(p.staffId)) || (p.dni && x.dni === p.dni) || x.fullName === p.nombre) || { id: p.contratoId, staffId: p.staffId, dni: p.dni };
    p = { ...p, contratoId: p.contratoId || c.id, staffId: p.staffId || c.staffId, dni: p.dni || c.dni, codigo: p.codigo || c.staffCode, cargo: p.cargo || c.roleTitle };
    const previos = registrosDe(attendances, c);
    const marcados = [];
    diasDelPermiso(p.desde, p.hasta).forEach((dia) => {
      if (!p.porHoras) previos.filter((a) => a.date === dia && (a.type || "in") === "in").forEach((a) => deleteAttendance(a.id));
      if (p.porHoras && previos.some((a) => a.date === dia)) return; // ya marcó ese día: el permiso por horas solo queda anotado
      const r = recordAttendance({
        date: dia,
        time: p.porHoras ? `${p.horaDesde}–${p.horaHasta}` : "—",
        userId: p.staffId,
        userName: p.nombre,
        userRole: p.role === "trainer" ? "trainer" : "staff",
        userDni: p.dni,
        staffCode: p.codigo,
        type: "in",
        status: "permiso",
        category: "staff",
        contractId: p.contratoId,
        hoursWorked: 0,
        reason: `${TIPOS_PERMISO[p.tipo]?.nombre || p.tipo}: ${p.motivo}`,
        permisoId: p.id,
        checkInMethod: "permiso",
        notes: `Permiso aprobado por ${currentUser?.fullName || "administración"}${p.conGoce ? " (con goce)" : " (sin goce)"}`,
      });
      if (r?.record) marcados.push(r.record.id);
    });
    guardarPermiso({ ...p, estado: "aprobado", resueltoPor: currentUser?.fullName || "—", resuelto: new Date().toISOString(), asistencias: marcados });
  };

  const rechazar = (p, comentario) => {
    guardarPermiso({ ...p, estado: "rechazado", resueltoPor: currentUser?.fullName || "—", resuelto: new Date().toISOString(), comentario: comentario.trim() });
    setRechazando(null);
  };

  const anular = (p) => {
    (p.asistencias || []).forEach((id) => deleteAttendance(id));
    guardarPermiso({ ...p, estado: "anulado", anuladoPor: currentUser?.fullName || "—", anulado: new Date().toISOString() });
  };

  const campo = "w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm";
  const diasForm = form ? (form.porHoras ? 1 : diasDelPermiso(form.desde, form.hasta).length) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-sky-600" /> Permisos del personal
          </h3>
          <p className="text-xs text-slate-500">Se registra la solicitud y administración la aprueba. Al aprobarla, esos días quedan como «Permiso» en la puntualidad.</p>
        </div>
        {puedeSolicitar && (
          <button type="button" onClick={() => (setForm({ ...VACIO }), setError(""))} className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Nueva solicitud
          </button>
        )}
      </div>

      {/* Indicadores: tocar uno filtra la lista */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <TarjetaKpi titulo="Por aprobar" valor={cuenta.pendiente} sub="toca para ver" icono={Hourglass} tono="ambar" pulso={cuenta.pendiente > 0} activo={filtro === "pendiente"} onClick={() => setFiltro("pendiente")} />
        <TarjetaKpi titulo="Aprobados este mes" valor={cuenta.aprobadoMes} sub="ya marcados en el calendario" icono={Check} tono="verde" activo={filtro === "aprobado"} onClick={() => setFiltro("aprobado")} />
        <TarjetaKpi titulo="Rechazados" valor={cuenta.rechazado} sub="con su motivo" icono={Ban} tono="rojo" activo={filtro === "rechazado"} onClick={() => setFiltro("rechazado")} />
        <TarjetaKpi titulo="Todos" valor={permisos.length} sub="historial completo" icono={FileCheck2} tono="azul" activo={filtro === "todos"} onClick={() => setFiltro("todos")} />
      </div>

      {form && (
        <form onSubmit={enviar} className="bg-white rounded-2xl border-2 border-sky-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-slate-900">Nueva solicitud de permiso</p>
            <button type="button" onClick={() => setForm(null)} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600">
              Trabajador *
              <select value={form.contratoId} onChange={(e) => setForm({ ...form, contratoId: e.target.value })} className={`${campo} mt-1`}>
                <option value="">— Elige —</option>
                {personal.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.staffCode} · {c.fullName} ({c.roleTitle})
                  </option>
                ))}
              </select>
            </label>
            <div className="text-xs font-bold text-slate-600">
              Duración
              <div className="mt-1 inline-flex p-1 rounded-xl bg-slate-100 gap-1 w-full">
                {[
                  [false, "Día(s) completo(s)"],
                  [true, "Solo unas horas"],
                ].map(([v, l]) => (
                  <button key={l} type="button" onClick={() => setForm({ ...form, porHoras: v })} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${form.porHoras === v ? "bg-white shadow text-sky-800" : "text-slate-600"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1">Tipo de permiso</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TIPOS_PERMISO).map(([k, t]) => (
                <button key={k} type="button" onClick={() => setForm({ ...form, tipo: k })} className={`px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${form.tipo === k ? "bg-sky-600 border-sky-600 text-white" : "bg-white border-slate-200 text-slate-700"}`}>
                  <IconoEmoji e={t.icono} /> {t.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-xs font-bold text-slate-600">
              {form.porHoras ? "Día" : "Desde"}
              <input type="date" value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value, hasta: form.hasta < e.target.value ? e.target.value : form.hasta })} className={`${campo} mt-1`} />
            </label>
            {form.porHoras ? (
              <>
                <label className="text-xs font-bold text-slate-600">
                  De
                  <input type="time" value={form.horaDesde} onChange={(e) => setForm({ ...form, horaDesde: e.target.value })} className={`${campo} mt-1`} />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  A
                  <input type="time" value={form.horaHasta} onChange={(e) => setForm({ ...form, horaHasta: e.target.value })} className={`${campo} mt-1`} />
                </label>
              </>
            ) : (
              <label className="text-xs font-bold text-slate-600">
                Hasta
                <input type="date" min={form.desde} value={form.hasta} onChange={(e) => setForm({ ...form, hasta: e.target.value })} className={`${campo} mt-1`} />
              </label>
            )}
            <label className="text-xs font-bold text-slate-600 flex items-end gap-2 pb-2 cursor-pointer">
              <input type="checkbox" checked={form.conGoce} onChange={(e) => setForm({ ...form, conGoce: e.target.checked })} className="w-4 h-4 accent-sky-600" />
              Con goce de haber
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-600">
            Motivo *
            <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} maxLength={200} placeholder="Ej. Cita en EsSalud a las 10 a. m." className={`${campo} mt-1`} />
          </label>
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {form.porHoras ? `Permiso de ${form.horaDesde} a ${form.horaHasta}` : `${diasForm} día(s) laborable(s)`} · Lo registra {currentUser?.fullName || "—"}
            </p>
            <button className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-black cursor-pointer">Enviar solicitud</button>
          </div>
        </form>
      )}

      {lista.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
          {filtro === "pendiente" ? "No hay permisos por aprobar." : "No hay permisos en esta lista."}
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {lista.map((p) => {
            const T = TIPOS_PERMISO[p.tipo] || TIPOS_PERMISO.otro;
            const dias = p.porHoras ? null : diasDelPermiso(p.desde, p.hasta).length;
            return (
              <div key={p.id} className={`rd-levanta rd-aparece bg-white rounded-2xl border border-slate-200 border-l-4 p-4 space-y-2.5 ${p.estado === "pendiente" ? "border-l-amber-500" : p.estado === "aprobado" ? "border-l-emerald-500" : p.estado === "rechazado" ? "border-l-rose-500" : "border-l-slate-300"}`}>
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 font-black text-sm flex items-center justify-center shrink-0">{iniciales(p.nombre)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono font-bold text-violet-700">{p.codigo}</span> · {p.cargo}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-black ${ESTADO[p.estado]?.clase}`}>{ESTADO[p.estado]?.nombre}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">
                    <IconoEmoji e={T.icono} /> {T.nombre}
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 inline-flex items-center gap-1">
                    {p.porHoras ? <Clock className="w-3.5 h-3.5" /> : <CalendarRange className="w-3.5 h-3.5" />}
                    {p.porHoras ? `${fechaCorta(p.desde)} · ${p.horaDesde}–${p.horaHasta}` : p.desde === p.hasta ? fechaCorta(p.desde) : `${fechaCorta(p.desde)} al ${fechaCorta(p.hasta)}`}
                    {dias ? ` · ${dias} día(s)` : ""}
                  </span>
                  <span className={`px-2 py-1 rounded-lg font-bold ${p.conGoce ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{p.conGoce ? "Con goce" : "Sin goce"}</span>
                </div>
                <p className="text-sm text-slate-700">{p.motivo}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3" /> Registró {p.solicitadoPor} el {new Date(p.creado).toLocaleDateString("es-PE")}
                  {p.resueltoPor && ` · ${p.estado === "rechazado" ? "Rechazó" : "Aprobó"} ${p.resueltoPor}`}
                </p>
                {p.comentario && <p className="text-xs text-rose-700 bg-rose-50 rounded-lg px-2 py-1">Motivo del rechazo: {p.comentario}</p>}

                {puedeAprobar && p.estado === "pendiente" && rechazando?.id !== p.id && (
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => aprobar(p)} className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer">
                      <Check className="w-4 h-4" /> Aprobar
                    </button>
                    <button type="button" onClick={() => setRechazando({ id: p.id, comentario: "" })} className="flex-1 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer">
                      <Ban className="w-4 h-4" /> Rechazar
                    </button>
                  </div>
                )}
                {rechazando?.id === p.id && (
                  <div className="flex gap-2 pt-1">
                    <input autoFocus value={rechazando.comentario} onChange={(e) => setRechazando({ ...rechazando, comentario: e.target.value })} placeholder="¿Por qué se rechaza? (opcional)" className="flex-1 px-3 py-1.5 rounded-lg border border-rose-300 text-xs" />
                    <button type="button" onClick={() => rechazar(p, rechazando.comentario)} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-black cursor-pointer">
                      Rechazar
                    </button>
                    <button type="button" onClick={() => setRechazando(null)} className="px-2 py-1.5 rounded-lg text-xs font-bold text-slate-500 cursor-pointer">
                      Cancelar
                    </button>
                  </div>
                )}
                {puedeAprobar && p.estado === "aprobado" && (
                  <button type="button" onClick={() => anular(p)} className="text-xs font-bold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer">
                    <Undo2 className="w-3.5 h-3.5" /> Anular permiso (quita las marcas del calendario)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!puedeAprobar && cuenta.pendiente > 0 && <p className="text-xs text-slate-500 text-center">Las solicitudes pendientes las aprueba administración.</p>}
    </div>
  );
};
