import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Check, Copy, Lock, Save, Stethoscope, Apple, RotateCcw } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { hoyISO } from "../../utils/fecha";

// Franjas de una hora que el especialista puede abrir o cerrar
export const FRANJAS = [
  "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM",
];

const SERVICIOS = {
  fisioterapia: { nombre: "Fisioterapia", app: "physiotherapy", icono: Stethoscope, rol: "physio", color: "emerald" },
  nutricion: { nombre: "Nutrición", app: "nutrition", icono: Apple, rol: "nutritionist", color: "amber" },
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const aFecha = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const aISO = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
const sumarDias = (iso, n) => {
  const f = aFecha(iso);
  f.setDate(f.getDate() + n);
  return aISO(f);
};
const rango = (horas) => {
  if (!horas?.length) return "";
  const fin = (h) => {
    const i = FRANJAS.indexOf(h);
    return FRANJAS[i + 1] || "10:00 PM";
  };
  return `${horas.length} h · ${horas[0].replace(":00", "")} a ${fin(horas[horas.length - 1]).replace(":00", "")}`;
};

const ordenar = (horas) => [...horas].sort((a, b) => FRANJAS.indexOf(a) - FRANJAS.indexOf(b));

// Horas de atención configuradas para un servicio (physiotherapy / nutrition) en una fecha.
// Devuelve null si ese día no se configuró (entonces no se restringe nada).
export function useHorasAtencion() {
  const { agendaEspecialistas = [] } = useGym();
  return (servicioApp, fecha) => {
    const clave = Object.keys(SERVICIOS).find((k) => SERVICIOS[k].app === servicioApp || k === servicioApp);
    if (!clave) return null;
    const reg = agendaEspecialistas.find((r) => r.id === `${clave}-${fecha}`);
    return reg ? reg.horas || [] : null;
  };
}

export function AgendaEspecialistas({ servicioInicial }) {
  const { currentUser, agendaEspecialistas = [], guardarAgenda } = useGym();
  const rol = currentUser?.role;
  const puedeEditar = (s) => rol === "admin" || SERVICIOS[s]?.rol === rol;

  const [servicio, setServicio] = useState(
    servicioInicial || (rol === "nutritionist" ? "nutricion" : "fisioterapia")
  );
  const [fecha, setFecha] = useState(hoyISO());
  const [semana, setSemana] = useState(0);
  const [horas, setHoras] = useState([]);
  const [aviso, setAviso] = useState("");

  const registro = agendaEspecialistas.find((r) => r.id === `${servicio}-${fecha}`);
  const guardadas = useMemo(() => ordenar(registro?.horas || []), [registro]);

  useEffect(() => {
    setHoras(guardadas);
  }, [servicio, fecha, guardadas.join("|")]);
  useEffect(() => setAviso(""), [servicio, fecha]);

  const editable = puedeEditar(servicio);
  const cambios = horas.join("|") !== guardadas.join("|");
  const dias = Array.from({ length: 14 }, (_, i) => sumarDias(hoyISO(), semana * 14 + i));

  const alternar = (h) => {
    if (!editable) return;
    setHoras((prev) => ordenar(prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  };

  const guardar = (fechas = [fecha]) => {
    fechas.forEach((f) =>
      guardarAgenda({
        id: `${servicio}-${f}`,
        servicio,
        fecha: f,
        horas: ordenar(horas),
        por: currentUser?.fullName || currentUser?.username || "",
        actualizado: new Date().toISOString(),
      })
    );
    setAviso(
      fechas.length > 1
        ? `Horario guardado para ${fechas.length} ${DIAS_LARGO[aFecha(fecha).getDay()]}s. Recepción ya lo ve.`
        : "Horario confirmado. Recepción ya ve estas horas."
    );
  };

  const repetir = () => guardar([0, 7, 14, 21].map((n) => sumarDias(fecha, n)));

  const proximos = agendaEspecialistas
    .filter((r) => r.servicio === servicio && r.fecha >= hoyISO() && r.horas?.length)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 8);

  const S = SERVICIOS[servicio];
  const Icono = S.icono;
  const f = aFecha(fecha);

  return (
    <div className="rd-agenda-esp space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${servicio === "nutricion" ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500"}`}>
              <Icono className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Horario de atención · {S.nombre}</h3>
              <p className="text-xs opacity-70">
                {editable
                  ? "Elige un día y marca las horas en que atiendes. Al confirmar, recepción solo podrá agendar en esas horas."
                  : "Horas en que el especialista atiende. Solo se puede agendar dentro de ellas."}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 rounded-xl p-1 bg-slate-100">
            {Object.entries(SERVICIOS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setServicio(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${servicio === k ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
              >
                {v.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Días */}
        <div className="mt-4 flex items-center gap-2">
          <button type="button" disabled={semana === 0} onClick={() => setSemana((s) => s - 1)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-2 rounded-lg text-xs font-bold disabled:opacity-30 cursor-pointer">‹</button>
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {dias.map((d) => {
              const fd = aFecha(d);
              const reg = agendaEspecialistas.find((r) => r.id === `${servicio}-${d}`);
              const n = reg?.horas?.length || 0;
              const sel = d === fecha;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFecha(d)}
                  className={`rounded-xl px-1 py-2 text-center border transition cursor-pointer ${sel ? "bg-blue-600 border-blue-500 text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-blue-400"}`}
                >
                  <span className="block text-[11px] font-bold uppercase opacity-80">{DIAS[fd.getDay()]}</span>
                  <span className="block text-lg font-extrabold leading-tight">{fd.getDate()}</span>
                  <span className={`block text-[10px] font-bold ${sel ? "text-white/90" : n ? "text-emerald-500" : "opacity-50"}`}>
                    {reg ? (n ? `${n} h` : "cerrado") : "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" disabled={semana >= 3} onClick={() => setSemana((s) => s + 1)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-2 rounded-lg text-xs font-bold disabled:opacity-30 cursor-pointer">›</button>
        </div>

        {/* Franjas */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-sm font-extrabold">
              {DIAS_LARGO[f.getDay()][0].toUpperCase() + DIAS_LARGO[f.getDay()].slice(1)} {f.getDate()} de {MESES[f.getMonth()]}
              <span className="ml-2 text-xs font-semibold opacity-70 normal-case">
                {horas.length ? rango(horas) : registro ? "Día cerrado" : "Sin horario configurado (se puede agendar a cualquier hora)"}
              </span>
            </p>
            {editable && (
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setHoras(FRANJAS.slice(1, 13))} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Mañana y tarde</button>
                <button type="button" onClick={() => setHoras([])} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"><RotateCcw className="w-3 h-3" />Limpiar</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {FRANJAS.map((h) => {
              const on = horas.includes(h);
              const i = FRANJAS.indexOf(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => alternar(h)}
                  disabled={!editable}
                  aria-pressed={on}
                  className={`relative rounded-xl px-2 py-2.5 text-xs font-extrabold border transition ${editable ? "cursor-pointer" : "cursor-default"} ${on ? "bg-emerald-600 border-emerald-500 text-white shadow" : "border-slate-200 bg-white text-slate-700 opacity-80 hover:opacity-100"}`}
                >
                  <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {h.replace(":00", "")}–{(FRANJAS[i + 1] || "10:00 PM").replace(":00", "")}
                  {on && <Check className="w-3.5 h-3.5 absolute top-1 right-1" />}
                </button>
              );
            })}
          </div>

          {editable ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => guardar()}
                disabled={!cambios && !!registro}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-extrabold shadow cursor-pointer"
              >
                <Save className="w-4 h-4" /> Confirmar horario del día
              </button>
              <button
                type="button"
                onClick={repetir}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-extrabold cursor-pointer"
              >
                <Copy className="w-4 h-4" /> Repetir 4 {DIAS_LARGO[f.getDay()]}s seguidos
              </button>
              {cambios && <span className="text-xs font-bold text-amber-500">Cambios sin confirmar</span>}
              {aviso && !cambios && <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{aviso}</span>}
            </div>
          ) : (
            <p className="mt-3 text-xs opacity-70 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />Solo {S.nombre === "Nutrición" ? "nutrición" : "fisioterapia"} o administración pueden cambiar este horario.</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 p-4">
        <p className="text-xs font-extrabold uppercase tracking-wide opacity-70 mb-2 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" /> Próximos días con atención · {S.nombre}
        </p>
        {proximos.length === 0 ? (
          <p className="text-xs opacity-60">Aún no hay días confirmados.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {proximos.map((r) => {
              const fd = aFecha(r.fecha);
              return (
                <button key={r.id} type="button" onClick={() => setFecha(r.fecha)} className="text-left rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 hover:border-blue-400 cursor-pointer">
                  <span className="block text-xs font-extrabold capitalize">{DIAS_LARGO[fd.getDay()]} {fd.getDate()} {MESES[fd.getMonth()]}</span>
                  <span className="block text-[11px] opacity-75">{rango(ordenar(r.horas))}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgendaEspecialistas;
