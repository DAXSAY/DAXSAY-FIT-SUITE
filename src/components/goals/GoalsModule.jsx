// ============================================================
// METAS & LOGROS
//  Administración: metas en soles por turno de recepción, metas de
//  logros (mancuernas) por entrenador, objetivos de alumnos y bonos.
//  Recepción: ve su meta del mes (cuánto falta por mes, semana y día).
//  Entrenador: ve sus mancuernas y los objetivos de sus alumnos.
//  Nutrición / Fisioterapia: crean y evalúan objetivos de alumnos;
//  al aprobarlos, el entrenador del alumno gana un logro.
// ============================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Target,
  Dumbbell,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Gift,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Wallet,
  Search,
  RefreshCw,
  Salad,
  Activity,
  History,
} from "lucide-react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import { useGym } from "../../context/GymContext";
import { api } from "../../api/cliente";
import { userCan } from "../../config/roles";
import { hoyISO } from "../../utils/fecha";
import { ProyeccionesRecepcion } from "./ProyeccionesRecepcion";
import PanelProgresoAlumnos from "../progreso/PanelProgresoAlumnos";
import { TarjetaKpi } from "../common/TarjetaKpi";

import { coincideAlumno } from "../common/BuscarAlumno";
const soles = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fCorta = (f) => (f ? `${String(f).slice(8, 10)}/${String(f).slice(5, 7)}` : "");
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const nombreMes = (m) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const CATEGORIA = { composicion: "Peso / masa muscular", lesion: "Lesiones / dolor", general: "Todos los logros", ingresos: "Ingresos" };
const TIPO_OBJ = {
  bajar_peso: ["Bajar de peso", "nutricion", "kg"],
  ganar_masa: ["Ganar masa muscular", "nutricion", "kg"],
  reducir_grasa: ["Reducir % de grasa", "nutricion", "%"],
  mejorar_lesion: ["Recuperar lesión", "fisioterapia", ""],
  reducir_dolor: ["Reducir dolor", "fisioterapia", "EVA"],
  movilidad: ["Mejorar movilidad", "fisioterapia", "°"],
  otro: ["Otro", null, ""],
};
const ESTADO_OBJ = {
  en_proceso: ["En proceso", "bg-blue-100 text-blue-700"],
  conseguida: ["Meta conseguida", "bg-emerald-100 text-emerald-700"],
  no_conseguida: ["No conseguida", "bg-rose-100 text-rose-700"],
  cancelada: ["Cancelada", "bg-slate-100 text-slate-500"],
};

const Pantalla = ({ titulo, subtitulo, onVolver, children, ancho = "max-w-3xl" }) => (
  <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
    <div className={`w-full ${ancho} mx-auto min-h-full p-4 sm:p-6 space-y-5`}>
      <div className="flex items-center gap-3">
        <button onClick={onVolver} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <div>
          <h2 className="text-lg font-black text-slate-900">{titulo}</h2>
          {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
        </div>
      </div>
      {children}
    </div>
  </div>
);
const campo = "mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// Mancuernas (logros) dibujadas
const Mancuernas = ({ logrado, meta }) => {
  const total = Math.max(meta, logrado);
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: Math.min(total, 40) }, (_, i) => (
        <span
          key={i}
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${i < logrado ? "bg-amber-400 text-amber-950 shadow-sm" : "bg-slate-100 text-slate-300"}`}
          title={i < logrado ? "Logro conseguido" : "Por conseguir"}
        >
          <Dumbbell className="w-4 h-4" />
        </span>
      ))}
      {total > 40 && <span className="text-xs text-slate-500 self-center">+{total - 40}</span>}
    </div>
  );
};

// ------------------------------------------------------------
// Tarjeta de meta con su avance
// ------------------------------------------------------------
const TarjetaMeta = ({ meta, admin, onEditar, onEliminar, onBono }) => {
  const p = meta.progress;
  const dinero = meta.type === "recepcion";
  const fmt = (v) => (dinero ? soles(v) : `${v}`);
  const h = hoyISO();
  const vigente = meta.start <= h && meta.end >= h;
  const atraso = vigente && p.logrado < p.ritmoIdeal;
  return (
    <div className={`bg-white rounded-2xl border-2 p-5 space-y-4 ${p.cumplida ? "border-emerald-300" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase text-slate-500">
            {dinero
              ? "Meta de recepción"
              : meta.type === "nutricion"
                ? "Meta de nutrición · objetivos logrados"
                : meta.type === "fisioterapia"
                  ? "Meta de fisioterapia · objetivos logrados"
                  : `Meta de entrenador · ${CATEGORIA[meta.category]}`}
          </span>
          <h3 className="text-xl font-black text-slate-900">{meta.name}</h3>
          <p className="text-xs text-slate-500">
            {fCorta(meta.start)} al {fCorta(meta.end)} · {p.totalDias} días {meta.bonus > 0 && `· Bono: ${soles(meta.bonus)}`}
          </p>
          {meta.notes && <p className="text-xs text-slate-600 mt-1">{meta.notes}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {p.cumplida ? (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> ¡Meta cumplida!
            </span>
          ) : (
            vigente && (
              <span className={`px-3 py-1 rounded-full text-xs font-black ${atraso ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700"}`}>
                {atraso ? "Por debajo del ritmo" : "A buen ritmo"}
              </span>
            )
          )}
          {admin && (
            <>
              <button onClick={onEditar} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer" title="Editar meta">
                <Pencil className="w-4 h-4 text-slate-600" />
              </button>
              {!meta.bonusId && (
                <button onClick={onEliminar} className="p-2 rounded-lg hover:bg-rose-50 cursor-pointer" title="Eliminar meta">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Barra de avance */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-black text-slate-900">
            {fmt(p.logrado)} <span className="text-slate-400 font-bold">de {fmt(p.objetivo)}</span>
          </span>
          <span className="font-black text-blue-700">{p.porcentaje}%</span>
        </div>
        <div className="h-4 rounded-full bg-slate-100 overflow-hidden relative">
          <div className={`h-full rounded-full ${p.cumplida ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-indigo-600"}`} style={{ width: `${p.porcentaje}%` }} />
          {vigente && !p.cumplida && (
            <div className="absolute top-0 h-full w-0.5 bg-slate-900/60" style={{ left: `${Math.min(100, (p.ritmoIdeal / (p.objetivo || 1)) * 100)}%` }} title="Donde debería ir hoy" />
          )}
        </div>
      </div>

      {dinero ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-sm">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
            <span className="text-xs font-bold text-rose-500 uppercase block">Falta en el mes</span>
            <strong className="text-lg text-rose-700">{soles(p.faltante)}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase block">Días que quedan</span>
            <strong className="text-lg">{p.diasRestantes}</strong>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <span className="text-xs font-bold text-blue-500 uppercase block">Necesario por día</span>
            <strong className="text-lg text-blue-700">{soles(p.necesarioPorDia)}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase block">Esta semana</span>
            <strong className="text-lg">{soles(p.semanaActual?.total)}</strong>
            {p.semanaActual && <span className="text-xs text-slate-500 block">meta {soles(p.semanaActual.meta)}</span>}
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase block">Hoy</span>
            <strong className="text-lg text-emerald-700">{soles(p.hoy)}</strong>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Mancuernas logrado={p.logrado} meta={p.objetivo} />
          <p className="text-sm text-slate-600">
            {p.cumplida ? "Consiguió todas sus mancuernas." : `Le faltan ${p.faltante} logro(s). Quedan ${p.diasRestantes} días.`}
          </p>
          {p.logros.length > 0 && (
            <ul className="text-xs text-slate-600 space-y-0.5">
              {p.logros.map((l) => (
                <li key={l.id}>
                  🏋️ {fCorta(l.dia)} · <strong>{l.alumno}</strong>: {l.descripcion}
                  {l.inicial != null && l.final != null && ` (${l.inicial} → ${l.final} ${l.unidad})`} · aprobó {l.evaluador || (l.area === "nutricion" ? "nutrición" : "fisioterapia")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Gráficos */}
      <div className={`grid grid-cols-1 ${dinero ? "lg:grid-cols-3" : ""} gap-4`}>
        <div className={dinero ? "lg:col-span-2" : ""} style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={p.diario} margin={{ top: 5, right: 10, left: dinero ? 10 : -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tickFormatter={fCorta} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={dinero} />
              <Tooltip labelFormatter={fCorta} formatter={(v, n) => [dinero ? soles(v) : v, n === "acumulado" ? "Logrado" : n === "ideal" ? "Ritmo ideal" : "Del día"]} />
              <Area isAnimationActive={false} type="monotone" dataKey="acumulado" stroke="var(--color-blue-600)" fill="#0c879422" strokeWidth={2} connectNulls={false} />
              <Line isAnimationActive={false} type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {dinero && (
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.semanas.map((s) => ({ ...s, nombre: `Sem ${s.numero}` }))} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => soles(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar isAnimationActive={false} maxBarSize={56} dataKey="meta" name="Meta semana" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar isAnimationActive={false} maxBarSize={56} dataKey="total" name="Logrado" fill="var(--color-green-600)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {p.cumplida && admin && meta.bonus >= 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-sm font-bold text-amber-900">
            {meta.bonusId ? `Bono ${meta.bonusStatus === "pagado" ? "pagado" : "aprobado"}` : "Meta cumplida: puedes aprobar el bono."}
          </span>
          {!meta.bonusId && (
            <button onClick={onBono} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
              <Gift className="w-4 h-4" /> Aprobar bono
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------
// Formulario de meta (admin)
// ------------------------------------------------------------
const FormMeta = ({ tipo, meta, mes, historial = [], onVolver, onGuardada }) => {
  const { staffDirectory } = useGym();
  const [turnos, setTurnos] = useState([]);
  const [f, setF] = useState({
    receptionShiftId: meta?.receptionShiftId || "",
    staffId: meta?.staffId || "",
    category: meta?.category && meta.category !== "ingresos" ? meta.category : "general",
    month: meta ? "" : mes,
    start: meta?.start || "",
    end: meta?.end || "",
    amount: meta?.type === "recepcion" ? meta.progress.objetivo : "",
    achievements: meta && meta.type !== "recepcion" ? meta.progress.objetivo : "",
    bonus: meta?.bonus || "",
    notes: meta?.notes || "",
  });
  const [porFechas, setPorFechas] = useState(!!meta);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/metas/turnos-recepcion").then(setTurnos).catch(() => {});
  }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const CARGO = { entrenador: "entrenador", nutricion: "nutricionista", fisioterapia: "fisioterapeuta" };
  const NOMBRE = { entrenador: "Entrenador", nutricion: "Nutricionista", fisioterapia: "Fisioterapeuta" };
  const entrenadores = staffDirectory.filter((s) => s.cargo === (CARGO[tipo] || "entrenador"));
  const especialista = tipo === "nutricion" || tipo === "fisioterapia";
  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const body = { ...f, type: tipo, month: porFechas ? undefined : f.month };
      if (meta) await api(`/metas/metas/${meta.id}`, { method: "PUT", body });
      else await api("/metas/metas", { method: "POST", body });
      onGuardada();
    } catch (er) {
      setError(er.message);
    }
  };
  return (
    <Pantalla
      titulo={meta ? "Editar meta" : tipo === "recepcion" ? "Nueva meta de recepción" : tipo === "nutricion" ? "Nueva meta de nutrición" : tipo === "fisioterapia" ? "Nueva meta de fisioterapia" : "Nueva meta de entrenador"}
      subtitulo={especialista ? "Cuenta los objetivos de alumnos que este especialista puso y que se cumplieron en el periodo (ej. bajar 3 kg, dolor de 7 a 3)." : undefined}
      onVolver={onVolver}
    >
      <form onSubmit={guardar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        {tipo === "recepcion" ? (
          <label className="block text-sm">
            <span className="font-bold text-slate-700">Turno de recepción *</span>
            <select required value={f.receptionShiftId} onChange={set("receptionShiftId")} className={campo}>
              <option value="">Elegir…</option>
              {turnos.filter((t) => t.active).map((t) => (
                <option key={t.id} value={t.id}>{t.name} {t.people.length ? `· ${t.people.map((p) => p.name).join(", ")}` : "· sin personas asignadas"}</option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-bold text-slate-700">{NOMBRE[tipo] || "Entrenador"} *</span>
              <select required value={f.staffId} onChange={set("staffId")} className={campo}>
                <option value="">Elegir…</option>
                {entrenadores.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
            </label>
            {!especialista && (
            <label className="block text-sm">
              <span className="font-bold text-slate-700">Cuentan los logros de</span>
              <select value={f.category} onChange={set("category")} className={campo}>
                <option value="general">Todos (nutrición y fisioterapia)</option>
                <option value="composicion">Peso / masa muscular (nutrición)</option>
                <option value="lesion">Lesiones / dolor (fisioterapia)</option>
              </select>
            </label>
            )}
          </div>
        )}
        <div className="flex gap-2 text-xs font-bold">
          <button type="button" onClick={() => setPorFechas(false)} className={`px-3 py-1.5 rounded-lg cursor-pointer ${!porFechas ? "bg-blue-600 text-white" : "bg-slate-100"}`}>Por mes</button>
          <button type="button" onClick={() => setPorFechas(true)} className={`px-3 py-1.5 rounded-lg cursor-pointer ${porFechas ? "bg-blue-600 text-white" : "bg-slate-100"}`}>Por fechas</button>
        </div>
        {porFechas ? (
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm"><span className="font-bold text-slate-700">Desde *</span><input type="date" required value={f.start} onChange={set("start")} className={campo} /></label>
            <label className="block text-sm"><span className="font-bold text-slate-700">Hasta *</span><input type="date" required value={f.end} min={f.start} onChange={set("end")} className={campo} /></label>
          </div>
        ) : (
          <label className="block text-sm"><span className="font-bold text-slate-700">Mes *</span><input type="month" required value={f.month} onChange={set("month")} className={campo} /></label>
        )}
        <div className="grid grid-cols-2 gap-4">
          {tipo === "recepcion" ? (
            <label className="block text-sm"><span className="font-bold text-slate-700">Meta en soles *</span><input type="number" min="1" step="0.01" required value={f.amount} onChange={set("amount")} placeholder="5000" className={`${campo} text-lg font-black`} /></label>
          ) : (
            <label className="block text-sm"><span className="font-bold text-slate-700">{especialista ? "Objetivos de alumnos a lograr *" : "Logros (mancuernas) a conseguir *"}</span><input type="number" min="1" required value={f.achievements} onChange={set("achievements")} placeholder="10" className={`${campo} text-lg font-black`} /></label>
          )}
          <label className="block text-sm"><span className="font-bold text-slate-700">Bono al cumplir (S/)</span><input type="number" min="0" step="0.01" value={f.bonus} onChange={set("bonus")} placeholder="0" className={`${campo} text-lg font-black`} /></label>
        </div>
        <label className="block text-sm"><span className="font-bold text-slate-700">Notas</span><input value={f.notes} onChange={set("notes")} className={campo} /></label>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer">Guardar meta</button>
      </form>
      <VistaPreviaMeta tipo={tipo} f={f} porFechas={porFechas} turno={turnos.find((t) => String(t.id) === String(f.receptionShiftId))} especialista={entrenadores.find((t) => String(t.id) === String(f.staffId))} />
      <OtrasMetas tipo={tipo} metas={(historial || []).filter((m) => m.type === tipo && m.id !== meta?.id)} />
    </Pantalla>
  );
};

// Otras metas del mismo tipo en el periodo: sirven de referencia al fijar la nueva
const OtrasMetas = ({ tipo, metas }) => {
  const dinero = tipo === "recepcion";
  const fmt = (v) => (dinero ? `S/ ${Number(v || 0).toLocaleString("es-PE", { maximumFractionDigits: 0 })}` : `${v || 0}`);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">Metas de este periodo como referencia</span>
      {metas.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {metas.slice(0, 4).map((m) => {
            const obj = Number(m.progress?.objetivo) || 0;
            const log = Number(m.progress?.logrado) || 0;
            const pct = obj ? Math.min(100, Math.round((log / obj) * 100)) : 0;
            return (
              <div key={m.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <b className="truncate text-slate-900">{m.name || "Meta"}</b>
                  <span className={`shrink-0 text-xs font-black ${m.progress?.cumplida ? "text-emerald-700" : "text-slate-600"}`}>{m.progress?.cumplida ? "✓ Cumplida" : `${pct} %`}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-500" style={{ width: `${Math.max(pct, 3)}%` }} /></div>
                <p className="mt-1 text-[11px] text-slate-500">{fmt(log)} de {fmt(obj)}{m.bonus ? ` · bono S/ ${Number(m.bonus).toFixed(2)}` : ""}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Todavía no hay otras metas de este tipo en el mes. La que crees será la primera.</p>
      )}
    </div>
  );
};

// Vista previa de la meta: cómo la verá el equipo y cuánto representa por día
const VistaPreviaMeta = ({ tipo, f, porFechas, turno, especialista }) => {
  const dias = (() => {
    if (porFechas) {
      if (!f.start || !f.end) return 0;
      return Math.max(1, Math.round((new Date(`${f.end}T12:00:00`) - new Date(`${f.start}T12:00:00`)) / 864e5) + 1);
    }
    if (!f.month) return 0;
    const [y, m] = f.month.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  })();
  const esDinero = tipo === "recepcion";
  const objetivo = Number(esDinero ? f.amount : f.achievements) || 0;
  const bono = Number(f.bonus) || 0;
  const porDia = dias ? objetivo / dias : 0;
  const quien = esDinero ? turno?.name || "Turno de recepción" : especialista?.fullName || "Especialista";
  const fmt = (v) => (esDinero ? `S/ ${v.toLocaleString("es-PE", { maximumFractionDigits: 2 })}` : `${Math.round(v * 10) / 10}`);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Así la verá el equipo</span>
        <div className="flex items-center justify-between gap-2">
          <b className="text-slate-900 truncate">{quien}</b>
          {bono > 0 && <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">Bono S/ {bono.toFixed(2)}</span>}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{esDinero ? "Meta de cobros del turno" : "Objetivos de alumnos logrados"} · {dias ? `${dias} días` : "elige el periodo"}</p>
        <div className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full w-[8%] rounded-full bg-gradient-to-r from-emerald-400 to-blue-500" />
        </div>
        <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-1">
          <span>Avance (empieza en 0)</span>
          <span className="text-slate-800">{objetivo ? fmt(objetivo) : "—"}</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Para lograrla</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5">
            <span className="block text-[10px] font-bold uppercase text-blue-700">Por día</span>
            <span className="block text-lg font-black text-blue-800 font-mono">{objetivo && dias ? fmt(porDia) : "—"}</span>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-200 p-2.5">
            <span className="block text-[10px] font-bold uppercase text-violet-700">Por semana</span>
            <span className="block text-lg font-black text-violet-800 font-mono">{objetivo && dias ? fmt(porDia * 7) : "—"}</span>
          </div>
        </div>
        <ul className="mt-3 space-y-1 text-[11px] text-slate-600">
          <li>✓ El avance se calcula solo con {esDinero ? "las matrículas, renovaciones y ventas cobradas en ese turno" : "los objetivos que se cumplen en los controles"}.</li>
          <li>✓ Al cumplirla, el bono se aprueba en «Bonos» y luego se marca como pagado.</li>
          <li>✓ Puedes editarla o anularla mientras el periodo esté abierto.</li>
        </ul>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Aprobar bono
// ------------------------------------------------------------
const FormBono = ({ meta, onVolver, onListo }) => {
  const [turnos, setTurnos] = useState([]);
  const [staffId, setStaffId] = useState(meta.staffId || "");
  const [monto, setMonto] = useState(meta.bonus || "");
  const [error, setError] = useState("");
  useEffect(() => {
    if (meta.type === "recepcion") api("/metas/turnos-recepcion").then(setTurnos).catch(() => {});
  }, [meta]);
  const personas = turnos.find((t) => t.id === meta.receptionShiftId)?.people || [];
  const aprobar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/metas/bonos", { method: "POST", body: { goalId: meta.id, staffId: staffId || undefined, amount: Number(monto) } });
      onListo();
    } catch (er) {
      setError(er.message);
    }
  };
  return (
    <Pantalla titulo={`Aprobar bono · ${meta.name}`} subtitulo="El bono queda aprobado; luego se marca como pagado en la pestaña Bonos." onVolver={onVolver}>
      <form onSubmit={aprobar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        {meta.type === "recepcion" && (
          <label className="block text-sm">
            <span className="font-bold text-slate-700">Para quién</span>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={campo}>
              <option value="">Todo el turno ({meta.name})</option>
              {personas.filter((p) => p.staffId).map((p) => <option key={p.staffId} value={p.staffId}>{p.name}</option>)}
            </select>
            <span className="text-xs text-slate-500">Si son varias personas, aprueba un bono para cada una.</span>
          </label>
        )}
        <label className="block text-sm"><span className="font-bold text-slate-700">Monto del bono (S/)</span><input type="number" min="1" step="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} className={`${campo} text-lg font-black`} /></label>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black cursor-pointer">Aprobar bono</button>
      </form>
    </Pantalla>
  );
};

// ------------------------------------------------------------
// Objetivos de alumnos
// ------------------------------------------------------------
const FormObjetivo = ({ areaFija, onVolver, onGuardado }) => {
  const { members, trainers } = useGym();
  const [buscar, setBuscar] = useState("");
  const [f, setF] = useState({ memberId: "", type: areaFija === "fisioterapia" ? "reducir_dolor" : "bajar_peso", description: "", initialValue: "", targetValue: "", unit: "", controlDate: "", trainerId: "", area: areaFija || "nutricion" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const alumno = members.find((m) => m.id === f.memberId);
  const lista = members.filter((m) => coincideAlumno(m, buscar)).slice(0, 8);
  const tipos = Object.entries(TIPO_OBJ).filter(([, [, area]]) => !area || area === (areaFija || f.area));
  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/metas/objetivos", { method: "POST", body: { ...f, unit: f.unit || TIPO_OBJ[f.type][2], trainerId: f.trainerId || alumno?.assignedTrainerId } });
      onGuardado();
    } catch (er) {
      setError(er.message);
    }
  };
  return (
    <Pantalla titulo="Nuevo objetivo del alumno" subtitulo="Al hacer el nuevo control podrás marcarlo como conseguido y darle el logro a su entrenador." onVolver={onVolver}>
      <form onSubmit={guardar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="text-sm">
          <span className="font-bold text-slate-700">Alumno *</span>
          {alumno ? (
            <div className="mt-1 flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span>
                <strong>{alumno.fullName}</strong> · DNI {alumno.dni} · Entrenador: {trainers.find((t) => t.id === alumno.assignedTrainerId)?.name || "sin asignar"}
              </span>
              <button type="button" onClick={() => setF({ ...f, memberId: "" })} className="text-xs font-bold text-blue-700 cursor-pointer">Cambiar</button>
            </div>
          ) : (
            <>
              <div className="relative mt-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Código, nombre o DNI" className={`${campo} pl-9 mt-0`} />
              </div>
              <div className="mt-1 border border-slate-200 rounded-xl divide-y divide-slate-100">
                {lista.map((m) => (
                  <button type="button" key={m.id} onClick={() => setF({ ...f, memberId: m.id })} className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    {m.fullName} <span className="text-xs text-slate-500">· {m.dni} · {m.planName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {!areaFija && (
          <label className="block text-sm">
            <span className="font-bold text-slate-700">Área que evalúa</span>
            <select value={f.area} onChange={set("area")} className={campo}>
              <option value="nutricion">Nutrición</option>
              <option value="fisioterapia">Fisioterapia</option>
            </select>
          </label>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="font-bold text-slate-700">Tipo de objetivo *</span>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, unit: TIPO_OBJ[e.target.value][2] })} className={campo}>
              {tipos.map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-bold text-slate-700">Fecha del próximo control *</span>
            <input type="date" required min={hoyISO()} value={f.controlDate} onChange={set("controlDate")} className={campo} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-bold text-slate-700">Objetivo *</span>
          <input required value={f.description} onChange={set("description")} placeholder="Ej. Bajar de 90 kg a 85 kg / Dolor lumbar de EVA 7 a 2" className={campo} />
        </label>
        <div className="grid grid-cols-3 gap-4">
          <label className="block text-sm"><span className="font-bold text-slate-700">Valor inicial</span><input type="number" step="0.01" value={f.initialValue} onChange={set("initialValue")} className={campo} /></label>
          <label className="block text-sm"><span className="font-bold text-slate-700">Valor meta</span><input type="number" step="0.01" value={f.targetValue} onChange={set("targetValue")} className={campo} /></label>
          <label className="block text-sm"><span className="font-bold text-slate-700">Unidad</span><input value={f.unit || TIPO_OBJ[f.type][2]} onChange={set("unit")} className={campo} /></label>
        </div>
        <label className="block text-sm">
          <span className="font-bold text-slate-700">Entrenador que recibirá el logro</span>
          <select value={f.trainerId || alumno?.assignedTrainerId || ""} onChange={set("trainerId")} className={campo}>
            <option value="">Sin entrenador</option>
            {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button disabled={!f.memberId} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black cursor-pointer">Guardar objetivo</button>
      </form>
    </Pantalla>
  );
};

const EvaluarObjetivo = ({ objetivo, onVolver, onListo }) => {
  const { trainers } = useGym();
  const [estado, setEstado] = useState("conseguida");
  const [valorFinal, setValorFinal] = useState("");
  const [obs, setObs] = useState("");
  const [otorgar, setOtorgar] = useState(true);
  const [trainerId, setTrainerId] = useState(objetivo.trainerId || "");
  const [error, setError] = useState("");
  const evaluar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api(`/metas/objetivos/${objetivo.id}/evaluar`, {
        method: "POST",
        body: { status: estado, finalValue: valorFinal, observation: obs, grant: otorgar, trainerId: trainerId || undefined },
      });
      onListo();
    } catch (er) {
      setError(er.message);
    }
  };
  return (
    <Pantalla titulo={`Evaluación final · ${objetivo.memberName}`} subtitulo={objetivo.description} onVolver={onVolver}>
      <form onSubmit={evaluar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold text-slate-400 block">INICIAL</span><strong>{objetivo.initialValue ?? "—"} {objetivo.unit}</strong></div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold text-slate-400 block">META</span><strong>{objetivo.targetValue ?? "—"} {objetivo.unit}</strong></div>
          <label className="block"><span className="text-xs font-bold text-slate-500">VALOR HOY</span><input type="number" step="0.01" value={valorFinal} onChange={(e) => setValorFinal(e.target.value)} className={`${campo} mt-0.5 font-black`} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setEstado("conseguida")} className={`p-4 rounded-xl border-2 font-black flex items-center justify-center gap-2 cursor-pointer ${estado === "conseguida" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
            <CheckCircle2 className="w-5 h-5" /> Meta conseguida
          </button>
          <button type="button" onClick={() => setEstado("no_conseguida")} className={`p-4 rounded-xl border-2 font-black flex items-center justify-center gap-2 cursor-pointer ${estado === "no_conseguida" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500"}`}>
            <XCircle className="w-5 h-5" /> No conseguida
          </button>
        </div>
        <label className="block text-sm"><span className="font-bold text-slate-700">Observación del control *</span><textarea required rows={3} value={obs} onChange={(e) => setObs(e.target.value)} className={campo} /></label>
        {estado === "conseguida" && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <input type="checkbox" checked={otorgar} onChange={(e) => setOtorgar(e.target.checked)} />
              <Dumbbell className="w-4 h-4" /> Dar el logro (mancuerna) al entrenador
            </label>
            {otorgar && (
              <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className={campo}>
                <option value="">Elegir entrenador…</option>
                {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>
        )}
        {estado === "conseguida" && (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            Este objetivo cumplido cuenta como logro para {objetivo.specialistName || (objetivo.area === "nutricion" ? "nutrición" : "fisioterapia")} y, si lo marcas, como mancuerna para el entrenador.
          </p>
        )}
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer">Guardar evaluación final</button>
      </form>
    </Pantalla>
  );
};

// Control intermedio: el objetivo sigue en proceso y el entrenador ve el avance
const RegistrarControl = ({ objetivo, onVolver, onListo }) => {
  const [f, setF] = useState({ value: "", date: hoyISO(), observation: "", nextControl: "" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api(`/metas/objetivos/${objetivo.id}/control`, { method: "POST", body: f });
      onListo();
    } catch (er) {
      setError(er.message);
    }
  };
  const previo = objetivo.lastControl?.value ?? objetivo.initialValue;
  return (
    <Pantalla titulo={`Anotar avance · ${objetivo.memberName}`} subtitulo={objetivo.description} onVolver={onVolver}>
      <form onSubmit={guardar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold text-slate-400 block">{objetivo.lastControl ? "ÚLTIMO CONTROL" : "INICIAL"}</span><strong>{previo ?? "—"} {objetivo.unit}</strong></div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold text-slate-400 block">META</span><strong>{objetivo.targetValue ?? "—"} {objetivo.unit}</strong></div>
          <label className="block"><span className="text-xs font-bold text-slate-500">VALOR HOY *</span><input type="number" step="0.01" required value={f.value} onChange={set("value")} className={`${campo} mt-0.5 font-black`} /></label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm"><span className="font-bold text-slate-700">Fecha del control</span><input type="date" max={hoyISO()} value={f.date} onChange={set("date")} className={campo} /></label>
          <label className="block text-sm"><span className="font-bold text-slate-700">Próximo control</span><input type="date" min={hoyISO()} value={f.nextControl} onChange={set("nextControl")} className={campo} /></label>
        </div>
        <label className="block text-sm"><span className="font-bold text-slate-700">Observación</span><textarea rows={2} value={f.observation} onChange={set("observation")} placeholder="Ej. cumple la dieta, bajó 1.5 kg / dolor al levantar el brazo bajó de 7 a 5" className={campo} /></label>
        <p className="text-xs text-slate-500">El objetivo sigue en proceso. El entrenador del alumno verá el avance y, si mejoró, le llega un aviso.</p>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer">Guardar avance</button>
      </form>
    </Pantalla>
  );
};

const HistorialControles = ({ objetivo }) => {
  const [lista, setLista] = useState(null);
  useEffect(() => {
    api(`/metas/objetivos/${objetivo.id}/controles`).then(setLista).catch(() => setLista([]));
  }, [objetivo.id]);
  if (!lista) return <p className="text-xs text-slate-400">Cargando controles…</p>;
  const filas = [
    objetivo.initialValue != null ? { id: "ini", date: objetivo.start, value: objetivo.initialValue, note: "Inicio", by: objetivo.specialistName } : null,
    ...lista,
    objetivo.finalValue != null ? { id: "fin", date: String(objetivo.evaluatedAt || "").slice(0, 10), value: objetivo.finalValue, note: "Evaluación final", by: objetivo.evaluatedBy } : null,
  ].filter(Boolean);
  if (!filas.length) return <p className="text-xs text-slate-400">Aún no hay controles.</p>;
  return (
    <ol className="text-xs space-y-1 bg-slate-50 rounded-lg p-2">
      {filas.map((k) => (
        <li key={k.id} className="flex items-center gap-2">
          <span className="w-16 text-slate-500">{fCorta(k.date)}</span>
          <strong className="w-20">{k.value} {objetivo.unit}</strong>
          <span className="text-slate-600 truncate">{k.note}{k.by ? ` · ${k.by}` : ""}</span>
        </li>
      ))}
    </ol>
  );
};

/** Una sola pestaña: objetivos que ponen nutrición/fisio y el progreso de pesos del entrenamiento */
const AlumnosObjetivosProgreso = ({ puedeCrear, areaPropia, admin, conProgreso }) => {
  const [vista, setVista] = useState(() => {
    try {
      return sessionStorage.getItem("radical_abrir_progreso") && conProgreso ? "progreso" : "objetivos";
    } catch {
      return "objetivos";
    }
  });
  useEffect(() => {
    const ir = () => conProgreso && setVista("progreso");
    window.addEventListener("radical:abrir-progreso", ir);
    return () => window.removeEventListener("radical:abrir-progreso", ir);
  }, [conProgreso]);
  return (
    <div className="space-y-4">
      {conProgreso && (
        <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 gap-1">
          {[
            ["objetivos", "🎯 Objetivos (nutrición y fisio)"],
            ["progreso", "🏋️ Progreso de pesos en el gym"],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setVista(k)} className={`px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer ${vista === k ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {l}
            </button>
          ))}
        </div>
      )}
      {vista === "progreso" && conProgreso ? <PanelProgresoAlumnos /> : <ListaObjetivos puedeCrear={puedeCrear} areaPropia={areaPropia} admin={admin} />}
    </div>
  );
};

const ListaObjetivos = ({ puedeCrear, areaPropia, admin }) => {
  const [objetivos, setObjetivos] = useState(null);
  const [vista, setVista] = useState(null);
  const [filtro, setFiltro] = useState("en_proceso");
  const [area, setArea] = useState(areaPropia || "todas");
  const [abiertoHist, setAbiertoHist] = useState(null);
  const [buscar, setBuscar] = useState("");
  const cargar = () => api("/metas/objetivos").then(setObjetivos).catch(() => setObjetivos([]));
  useEffect(() => {
    cargar();
  }, []);
  const h = hoyISO();
  const lista = (objetivos || []).filter((o) => (area === "todas" || o.area === area) && (filtro === "todos" || o.status === filtro || (filtro === "vencidos" && o.status === "en_proceso" && o.controlDate <= h)) && `${o.memberName} ${o.memberDni} ${o.trainerName}`.toLowerCase().includes(buscar.toLowerCase()));
  const puedeEvaluar = (o) => o.status === "en_proceso" && (admin || o.area === areaPropia);

  if (vista === "nuevo") return <FormObjetivo areaFija={areaPropia} onVolver={() => setVista(null)} onGuardado={() => { setVista(null); cargar(); }} />;
  if (vista?.evaluar) return <EvaluarObjetivo objetivo={vista.evaluar} onVolver={() => setVista(null)} onListo={() => { setVista(null); cargar(); }} />;
  if (vista?.control) return <RegistrarControl objetivo={vista.control} onVolver={() => setVista(null)} onListo={() => { setVista(null); cargar(); }} />;

  const pendientesHoy = (objetivos || []).filter((o) => o.status === "en_proceso" && o.controlDate <= h).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {[
          ["1", "Crear el objetivo", "Nutrición o fisio anota el valor de inicio (ej. 82 kg, dolor 7/10), la meta y la fecha de control.", "bg-blue-50 border-blue-200 text-blue-900"],
          ["2", "Anotar avances", "En cada cita se anota cómo va (ej. 80.5 kg). El objetivo sigue abierto y el entrenador ve el avance.", "bg-amber-50 border-amber-200 text-amber-900"],
          ["3", "Cerrar: ¿lo logró?", "En la fecha final se indica si lo consiguió: es un logro del especialista y una mancuerna para el entrenador.", "bg-emerald-50 border-emerald-200 text-emerald-900"],
        ].map(([n, t, d, c]) => (
          <div key={n} className={`rounded-xl border p-3 flex gap-2.5 ${c}`}>
            <span className="w-7 h-7 rounded-full bg-white font-black flex items-center justify-center shrink-0 shadow-sm">{n}</span>
            <span>
              <b className="block text-sm">{t}</b>
              <span className="text-xs opacity-80">{d}</span>
            </span>
          </div>
        ))}
      </div>
      {pendientesHoy > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-bold flex items-center gap-2">
          <CalendarClock className="w-4 h-4" /> {pendientesHoy} objetivo(s) ya tienen fecha de control: evalúalos para dar los logros.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {[["todas", "Todas las especialidades", Target, "from-slate-700 to-slate-600"], ["nutricion", "Nutrición", Salad, "from-emerald-600 to-lime-500"], ["fisioterapia", "Fisioterapia", Activity, "from-cyan-600 to-sky-500"]].map(([k, l, I, g]) => {
          const n = (objetivos || []).filter((o) => (k === "todas" || o.area === k) && o.status === "en_proceso").length;
          return (
            <button key={k} onClick={() => setArea(k)} className={`px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer ${area === k ? `bg-gradient-to-r ${g} text-white shadow` : "bg-white border border-slate-200 text-slate-600"}`}>
              <I className="w-4 h-4" /> {l} <span className={`px-1.5 rounded-full text-[11px] ${area === k ? "bg-white/25" : "bg-slate-100"}`}>{n}</span>
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-2">
        {[["en_proceso", "En proceso"], ["vencidos", "Control pendiente"], ["conseguida", "Conseguidos"], ["no_conseguida", "No conseguidos"], ["todos", "Todos"]].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${filtro === k ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{l}</button>
        ))}
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar alumno o entrenador" className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm flex-1 min-w-48" />
        {puedeCrear && (
          <button onClick={() => setVista("nuevo")} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Nuevo objetivo
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {!objetivos && <p className="text-slate-500 text-sm">Cargando…</p>}
        {objetivos && lista.length === 0 && <p className="text-slate-500 text-sm">No hay objetivos con este filtro.</p>}
        {lista.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <strong className="text-slate-900">{o.memberName}</strong>
                <span className="text-xs text-slate-500 block">
                  {TIPO_OBJ[o.type]?.[0]} · {o.area === "nutricion" ? "Nutrición" : "Fisioterapia"}{o.specialistName ? ` (${o.specialistName})` : ""} · Entrenador: {o.trainerName || "—"}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${ESTADO_OBJ[o.status][1]}`}>{ESTADO_OBJ[o.status][0]}</span>
            </div>
            <p className="text-sm text-slate-700">{o.description}</p>
            <p className="text-xs text-slate-500">
              {o.initialValue != null && `Inicio ${o.initialValue} ${o.unit} → meta ${o.targetValue ?? "—"} ${o.unit}`}
              {o.finalValue != null && ` · Final ${o.finalValue} ${o.unit}`} · Control: <strong className={o.status === "en_proceso" && o.controlDate <= h ? "text-amber-700" : ""}>{fCorta(o.controlDate)}</strong>
            </p>
            {o.lastControl && o.status === "en_proceso" && (
              <p className="text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-2">
                Último control {fCorta(o.lastControl.date)}: <strong>{o.lastControl.value} {o.unit}</strong>
                {o.lastControl.note ? ` · ${o.lastControl.note}` : ""}{o.lastControl.by ? ` · ${o.lastControl.by}` : ""}
              </p>
            )}
            {o.progressPct != null && (
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-500"><span>Avance hacia la meta</span><span>{o.progressPct}%</span></div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                  <div className={`h-full ${o.progressPct >= 100 ? "bg-emerald-500" : o.progressPct >= 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${o.progressPct}%` }} />
                </div>
              </div>
            )}
            {o.observation && <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">{o.observation} {o.evaluatedBy && `· ${o.evaluatedBy}`}</p>}
            {o.achievementGranted && <p className="text-xs font-black text-amber-700 flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" /> Logro otorgado a {o.trainerName}</p>}
            <div className="flex flex-wrap gap-1.5">
              {puedeEvaluar(o) && (
                <>
                  <button onClick={() => setVista({ control: o })} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer">
                    + Anotar avance
                  </button>
                  <button onClick={() => setVista({ evaluar: o })} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer">
                    ✓ Cerrar: ¿lo logró?
                  </button>
                </>
              )}
              <button onClick={() => setAbiertoHist(abiertoHist === o.id ? null : o.id)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
                <History className="w-3.5 h-3.5" /> {abiertoHist === o.id ? "Ocultar avances" : `Avances${o.controls ? ` (${o.controls})` : ""}`}
              </button>
            </div>
            {abiertoHist === o.id && <HistorialControles objetivo={o} />}
          </div>
        ))}
      </div>
    </div>
  );
};

const RankingEspecialistas = ({ datos }) => {
  if (!datos) return <p className="text-slate-500 text-sm">Cargando…</p>;
  if (datos.falta27) return <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">Falta ejecutar base_datos/27_metas_especialistas.sql en MySQL Workbench (como root).</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[["nutricion", "Nutrición", Salad, "from-emerald-600 to-lime-500"], ["fisioterapia", "Fisioterapia", Activity, "from-cyan-600 to-sky-500"]].map(([k, l, I, g]) => {
        const filas = datos.filas.filter((f) => f.area === k);
        return (
          <div key={k} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className={`px-4 py-2.5 bg-gradient-to-r ${g} text-white font-black flex items-center gap-2`}>
              <I className="w-4 h-4" /> {l}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200">
                  <th className="py-2 px-3">Especialista</th>
                  <th className="py-2 px-3">Logrados</th>
                  <th className="py-2 px-3">No logrados</th>
                  <th className="py-2 px-3">En proceso</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.staffId} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-semibold">{f.name}</td>
                    <td className="py-2 px-3 font-black text-emerald-600">🏆 {f.achieved}</td>
                    <td className="py-2 px-3">{f.notAchieved}</td>
                    <td className="py-2 px-3">{f.inProgress}</td>
                  </tr>
                ))}
                {!filas.length && (
                  <tr>
                    <td colSpan={4} className="py-4 px-3 text-center text-slate-400 text-xs">No hay {k === "nutricion" ? "nutricionistas" : "fisioterapeutas"} activos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------
// Bonos (admin)
// ------------------------------------------------------------
const ListaBonos = ({ admin }) => {
  const [bonos, setBonos] = useState(null);
  const [metas, setMetas] = useState([]);
  const [error, setError] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [filtro, setFiltro] = useState("pendientes");
  const cargar = () => {
    api("/metas/bonos").then(setBonos).catch((e) => setError(e.message));
    api(`/metas/metas?mes=${hoyISO().slice(0, 7)}`).then(setMetas).catch(() => setMetas([]));
  };
  useEffect(() => {
    cargar();
  }, []);
  const accion = async (id, tipo) => {
    setError("");
    try {
      await api(`/metas/bonos/${id}/${tipo}`, { method: "POST", body: { method: metodo } });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };
  // Una tarjeta por persona: sus metas del mes y sus bonos
  const personas = useMemo(() => {
    const mapa = new Map();
    const de = (nombre) => {
      const k = String(nombre || "—").trim();
      if (!mapa.has(k)) mapa.set(k, { nombre: k, bonos: [], metas: [] });
      return mapa.get(k);
    };
    (bonos || []).forEach((b) => de(b.beneficiary).bonos.push(b));
    (metas || []).filter((m) => m.type !== "recepcion" || m.name).forEach((m) => de(m.name).metas.push(m));
    return [...mapa.values()]
      .map((x) => ({
        ...x,
        porPagar: x.bonos.filter((b) => b.status === "aprobado").reduce((a, b) => a + Number(b.amount || 0), 0),
        pagado: x.bonos.filter((b) => b.status === "pagado").reduce((a, b) => a + Number(b.amount || 0), 0),
      }))
      .filter((x) => filtro === "todos" || (filtro === "pendientes" ? x.porPagar > 0 || x.metas.length : x.pagado > 0))
      .sort((a, b) => b.porPagar - a.porPagar || a.nombre.localeCompare(b.nombre));
  }, [bonos, metas, filtro]);
  const totalPorPagar = personas.reduce((a, x) => a + x.porPagar, 0);
  const iniciales = (n) => n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center gap-2">
        {[
          ["pendientes", "Con metas o bonos por pagar"],
          ["pagados", "Con bonos pagados"],
          ["todos", "Todos"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${filtro === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-sm font-black text-amber-700">Por pagar: {soles(totalPorPagar)}</span>
        {admin && (
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            Pagar con
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="px-2 py-1 rounded-lg border border-slate-300">
              <option value="efectivo">Efectivo</option>
              <option value="yape_plin">Yape / Plin</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </label>
        )}
      </div>
      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      {!bonos ? (
        <p className="text-slate-500 text-sm">Cargando…</p>
      ) : personas.length === 0 ? (
        <p className="text-slate-500 text-sm bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">No hay nadie en esta lista.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {personas.map((x) => (
            <div key={x.nombre} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 flex items-center gap-3 bg-amber-50 border-b border-slate-100">
                <span className="w-11 h-11 rounded-2xl bg-amber-500 text-white font-black flex items-center justify-center">{iniciales(x.nombre)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-900 truncate">{x.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {x.metas.length} meta(s) este mes · {x.bonos.length} bono(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-amber-700">Por pagar</p>
                  <p className="text-lg font-black text-amber-700">{soles(x.porPagar)}</p>
                </div>
              </div>
              <div className="p-4 space-y-3 flex-1">
                {x.metas.map((m) => {
                  const p = m.progress || {};
                  const pc = p.objetivo ? Math.min(100, Math.round((p.logrado / p.objetivo) * 100)) : 0;
                  return (
                    <div key={m.id}>
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span className="truncate">🎯 {m.type === "recepcion" ? "Meta de recepción" : CATEGORIA[m.category] || "Meta del mes"}</span>
                        <span>
                          {m.type === "recepcion" ? soles(p.logrado) : p.logrado} / {m.type === "recepcion" ? soles(p.objetivo) : p.objetivo}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                        <div className={`h-full ${p.cumplida ? "bg-emerald-500" : pc >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${pc}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {p.cumplida ? "✓ Cumplida" : `${pc}% de avance`}
                        {m.bonus > 0 && ` · bono al cumplir: ${soles(m.bonus)}`}
                      </p>
                    </div>
                  );
                })}
                {x.bonos.map((b) => (
                  <div key={b.id} className="rounded-xl border border-slate-200 p-2.5 flex items-center gap-2">
                    <Wallet className={`w-4 h-4 shrink-0 ${b.status === "pagado" ? "text-emerald-600" : b.status === "anulado" ? "text-slate-300" : "text-amber-600"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-700 truncate" title={b.reason}>{b.reason}</p>
                      <p className={`text-[11px] font-bold ${b.status === "pagado" ? "text-emerald-700" : b.status === "anulado" ? "text-slate-400" : "text-amber-700"}`}>
                        {b.status === "pagado" ? `Pagado el ${fCorta(b.paidAt)}` : b.status === "anulado" ? "Anulado" : "Aprobado, por pagar"}
                      </p>
                    </div>
                    <span className="font-black text-sm">{soles(b.amount)}</span>
                    {admin && b.status === "aprobado" && (
                      <span className="flex gap-1">
                        <button onClick={() => accion(b.id, "pagar")} className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer">Pagar</button>
                        <button onClick={() => accion(b.id, "anular")} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold cursor-pointer">Anular</button>
                      </span>
                    )}
                  </div>
                ))}
                {!x.metas.length && !x.bonos.length && <p className="text-xs text-slate-400">Sin metas ni bonos.</p>}
              </div>
              {x.pagado > 0 && <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">Pagado en total: <b className="text-emerald-700">{soles(x.pagado)}</b></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Módulo
// ============================================================
export const GoalsModule = () => {
  const { currentUser } = useGym();
  const admin = userCan(currentUser, "users", "editar");
  const rol = currentUser?.role;
  const areaPropia = rol === "nutritionist" ? "nutricion" : rol === "physio" ? "fisioterapia" : null;
  const puedeObjetivos = admin || !!areaPropia;

  const pestanas = admin
    ? [["recepcion", "Metas de recepción"], ["proyecciones", "Proyecciones de recepción"], ["entrenadores", "Entrenadores y logros"], ["especialistas", "Nutrición y fisioterapia"], ["objetivos", "Alumnos: objetivos y progreso"], ["bonos", "Bonos"]]
    : rol === "trainer"
      ? [["mias", "Mis mancuernas"], ["objetivos", "Mis alumnos: objetivos y progreso"], ["bonos", "Mis bonos"]]
      : rol === "reception"
        ? [["mias", "Mi meta"], ["proyecciones", "Mis proyecciones"], ["bonos", "Mis bonos"]]
        : areaPropia
          ? [["mias", "Mi meta"], ["objetivos", "Objetivos de alumnos"], ["ranking", "Logros del equipo"], ["bonos", "Mis bonos"]]
          : [["objetivos", "Objetivos de alumnos"], ["ranking", "Logros de entrenadores"]];

  const [tab, setTab] = useState(() => {
    // Desde la campanita: abrir directo en Proyecciones o en el progreso de un alumno
    try {
      if (sessionStorage.getItem("radical_abrir_progreso") && pestanas.some(([k]) => k === "objetivos")) return "objetivos";
      if (sessionStorage.getItem("radical_abrir_proyecciones") && pestanas.some(([k]) => k === "proyecciones")) {
        sessionStorage.removeItem("radical_abrir_proyecciones");
        return "proyecciones";
      }
    } catch {
      /* nada */
    }
    return pestanas[0][0];
  });
  useEffect(() => {
    const ir = () => {
      try {
        sessionStorage.removeItem("radical_abrir_proyecciones");
      } catch {
        /* nada */
      }
      if (pestanas.some(([k]) => k === "proyecciones")) setTab("proyecciones");
    };
    const irProgreso = () => pestanas.some(([k]) => k === "objetivos") && setTab("objetivos");
    window.addEventListener("radical:abrir-proyecciones", ir);
    window.addEventListener("radical:abrir-progreso", irProgreso);
    return () => (window.removeEventListener("radical:abrir-proyecciones", ir), window.removeEventListener("radical:abrir-progreso", irProgreso));
  }, [pestanas]);
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const [metas, setMetas] = useState(null);
  const [logros, setLogros] = useState([]);
  const [logrosEsp, setLogrosEsp] = useState(null);
  const [vista, setVista] = useState(null);
  const [aviso, setAviso] = useState("");

  const cargar = () => {
    if (["recepcion", "entrenadores", "especialistas", "mias"].includes(tab)) api(`/metas/metas?mes=${mes}`).then(setMetas).catch(() => setMetas([]));
    if (["entrenadores", "ranking"].includes(tab)) api(`/metas/logros?mes=${mes}`).then(setLogros).catch(() => setLogros([]));
    if (["especialistas", "ranking"].includes(tab)) api(`/metas/logros/especialistas?mes=${mes}`).then(setLogrosEsp).catch(() => setLogrosEsp({ filas: [] }));
  };
  useEffect(() => {
    setMetas(null);
    cargar();
  }, [tab, mes]);

  const listo = (texto) => {
    setVista(null);
    setAviso(texto);
    cargar();
    setTimeout(() => setAviso(""), 5000);
  };
  const eliminar = async (m) => {
    if (!window.confirm(`¿Eliminar la meta de ${m.name}?`)) return;
    try {
      await api(`/metas/metas/${m.id}`, { method: "DELETE" });
      cargar();
    } catch (e) {
      setAviso(e.message);
    }
  };

  if (vista?.form) return <FormMeta tipo={vista.form} meta={vista.meta} mes={mes} historial={metas} onVolver={() => setVista(null)} onGuardada={() => listo("Meta guardada.")} />;
  if (vista?.bono) return <FormBono meta={vista.bono} onVolver={() => setVista(null)} onListo={() => listo("Bono aprobado. Págalo desde la pestaña Bonos.")} />;

  const de = (tipo) => (metas || []).filter((m) => m.type === tipo);
  const recep = de("recepcion");
  const resumenRecepcion = {
    meta: recep.reduce((a, m) => a + m.progress.objetivo, 0),
    logrado: recep.reduce((a, m) => a + m.progress.logrado, 0),
  };

  const tarjetas = (lista) =>
    lista.length === 0 ? (
      <p className="text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
        No hay metas para {nombreMes(mes)}.
      </p>
    ) : (
      lista.map((m) => (
        <TarjetaMeta
          key={m.id}
          meta={m}
          admin={admin}
          onEditar={() => setVista({ form: m.type, meta: m })}
          onEliminar={() => eliminar(m)}
          onBono={() => setVista({ bono: m })}
        />
      ))
    );

  return (
    <div className="space-y-4">
      <div className="rd-portada rd-cabecera flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
            <Target className="w-4 h-4" /> Metas & logros
          </span>
          <h1 className="text-2xl font-black mt-1">{admin ? "Metas del equipo" : rol === "reception" ? "Mi meta del mes" : rol === "trainer" ? "Mis logros" : areaPropia ? "Mis metas y objetivos de alumnos" : "Objetivos de los alumnos"}</h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            {admin
              ? "Asigna metas en soles a cada turno de recepción y metas de logros a entrenadores, nutricionistas y fisioterapeutas. Cada objetivo de alumno cumplido es un logro para el especialista que lo puso y una mancuerna para el entrenador."
              : rol === "reception"
                ? "Lo que se cobra en tu turno suma a la meta. Mira cuánto falta en el mes, la semana y hoy."
                : rol === "trainer"
                  ? "Mira lo que nutrición y fisioterapia les pusieron a tus alumnos y cómo van en cada control. Cada objetivo cumplido es una mancuerna para ti."
                  : "Registra el objetivo del alumno, anota cada control (peso, % de grasa, dolor...) y en la evaluación final indica si lo consiguió: es un logro para ti y una mancuerna para su entrenador."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} className="px-3 py-2 rounded-xl bg-white text-slate-900 text-sm font-bold" />
          <button onClick={cargar} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer" title="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
        {pestanas.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 rounded-lg text-sm font-bold cursor-pointer ${tab === k ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {l}
          </button>
        ))}
      </div>
      {aviso && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold">{aviso}</div>}
      {!admin && ["mias", "bonos", "progreso", "ranking"].includes(tab) && (
        <p className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
          👁️ Solo lectura: las metas, los logros y los bonos los define y paga administración.
          {rol === "reception" ? " Lo único que escribes tú son tus proyecciones." : ""}
        </p>
      )}

      {tab === "recepcion" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 flex-1 min-w-[280px]">
              <TarjetaKpi titulo={`Meta total · ${nombreMes(mes)}`} valor={resumenRecepcion.meta} decimales={2} prefijo="S/ " sub={`${recep.length} turno(s) con meta`} tono="ambar" icono={Target} />
              <TarjetaKpi
                titulo="Logrado"
                valor={resumenRecepcion.logrado}
                decimales={2}
                prefijo="S/ "
                sub={resumenRecepcion.meta ? `${Math.round((resumenRecepcion.logrado / resumenRecepcion.meta) * 100)}% de la meta` : "—"}
                tono="verde"
                serie={(() => {
                  const dias = recep[0]?.progress?.diario?.map((x) => x.dia) || [];
                  return dias.map((dia) => recep.reduce((a, m) => a + (m.progress.diario.find((x) => x.dia === dia)?.acumulado || 0), 0));
                })()}
              />
              <TarjetaKpi
                titulo="Falta"
                valor={Math.max(0, resumenRecepcion.meta - resumenRecepcion.logrado)}
                decimales={2}
                prefijo="S/ "
                sub="para cumplir el mes"
                alerta={resumenRecepcion.meta > 0 && resumenRecepcion.logrado < resumenRecepcion.meta}
                tono="rojo"
              />
            </div>
            <button onClick={() => setVista({ form: "recepcion" })} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> Nueva meta de recepción
            </button>
          </div>
          {metas ? tarjetas(de("recepcion")) : <p className="text-slate-500 text-sm">Cargando…</p>}
        </div>
      )}

      {(tab === "entrenadores" || tab === "ranking") && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-black uppercase text-slate-600 mb-3 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" /> Ranking de logros · {nombreMes(mes)}
            </h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={logros} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar isAnimationActive={false} maxBarSize={56} dataKey="composition" stackId="a" name="Peso / masa" fill="var(--color-green-600)" />
                  <Bar isAnimationActive={false} maxBarSize={56} dataKey="injury" stackId="a" name="Lesión / dolor" fill="var(--color-cyan-600)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200">
                  <th className="py-2">Entrenador</th>
                  <th className="py-2">Alumnos</th>
                  <th className="py-2">Peso / masa</th>
                  <th className="py-2">Lesión / dolor</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Objetivos en proceso</th>
                </tr>
              </thead>
              <tbody>
                {logros.map((l) => (
                  <tr key={l.staffId} className="border-b border-slate-100">
                    <td className="py-2 font-semibold">{l.name}</td>
                    <td className="py-2">{l.students}</td>
                    <td className="py-2">{l.composition}</td>
                    <td className="py-2">{l.injury}</td>
                    <td className="py-2 font-black text-amber-600">🏋️ {l.total}</td>
                    <td className="py-2">{l.inProgress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tab === "entrenadores" && (
            <>
              <div className="flex justify-end">
                <button onClick={() => setVista({ form: "entrenador" })} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-4 h-4" /> Nueva meta de entrenador
                </button>
              </div>
              {metas ? tarjetas(de("entrenador")) : <p className="text-slate-500 text-sm">Cargando…</p>}
            </>
          )}
        </div>
      )}

      {tab === "especialistas" && (
        <div className="space-y-4">
          <RankingEspecialistas datos={logrosEsp} />
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => setVista({ form: "nutricion" })} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> Nueva meta de nutrición
            </button>
            <button onClick={() => setVista({ form: "fisioterapia" })} className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> Nueva meta de fisioterapia
            </button>
          </div>
          {metas ? tarjetas([...de("nutricion"), ...de("fisioterapia")]) : <p className="text-slate-500 text-sm">Cargando…</p>}
        </div>
      )}
      {tab === "ranking" && areaPropia && <RankingEspecialistas datos={logrosEsp} />}

      {tab === "mias" && <div className="space-y-4">{metas ? tarjetas(metas) : <p className="text-slate-500 text-sm">Cargando…</p>}</div>}
      {tab === "objetivos" && <AlumnosObjetivosProgreso puedeCrear={puedeObjetivos} areaPropia={areaPropia} admin={admin} conProgreso={admin || rol === "trainer"} />}
      {tab === "bonos" && <ListaBonos admin={admin} />}
      {tab === "proyecciones" && <ProyeccionesRecepcion />}

    </div>
  );
};
