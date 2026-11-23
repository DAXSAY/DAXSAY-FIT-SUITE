import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Clock, Check, Copy, Lock, Save, Stethoscope, Apple, RotateCcw, Sunrise, Sun, Moon, Plus, Trash2, Pencil, Wand2, X, TriangleAlert, User,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import { hoyISO } from "../../utils/fecha";
import { INICIO_DIA, FIN_DIA, PASO, aMin, deMin, normalizarAgenda, minutosTurnos, rangoTexto, parteDelDia, cruces, rangoCita, seCruzan } from "../../utils/horario";

export const SERVICIOS = {
  fisioterapia: { nombre: "Fisioterapia", app: "physiotherapy", icono: Stethoscope, rol: "physio", color: "emerald" },
  nutricion: { nombre: "Nutrición", app: "nutrition", icono: Apple, rol: "nutritionist", color: "amber" },
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DURACIONES_TURNO = [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 90];
const DESCANSOS = [0, 5, 10, 15];
export const PARTES_DIA = [
  ["manana", "Mañana", Sunrise, "from-amber-400 to-orange-500"],
  ["tarde", "Tarde", Sun, "from-sky-500 to-blue-600"],
  ["noche", "Noche", Moon, "from-violet-500 to-indigo-600"],
];

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
const plural = (dia) => (/s$/.test(dia) ? dia : `${dia}s`);
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
// <input type="time"> usa "HH:MM" en 24 h
const aCampo = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const deCampo = (v) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(v || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const ordenarTurnos = (l) => [...l].sort((a, b) => a.ini - b.ini || a.fin - b.fin);
const firma = (l) => ordenarTurnos(l).map((t) => `${t.ini}-${t.fin}`).join("|");

// Turnos de atención de un servicio (physiotherapy / nutrition) en una fecha.
// Devuelve { turnos: [{ini, fin, inicio, final, dur}], bloques, duracion } o null si ese día no se publicó.
export function useHorasAtencion() {
  const { agendaEspecialistas = [] } = useGym();
  return (servicioApp, fecha) => {
    const clave = Object.keys(SERVICIOS).find((k) => SERVICIOS[k].app === servicioApp || k === servicioApp);
    if (!clave) return null;
    return normalizarAgenda(agendaEspecialistas.find((r) => r.id === `${clave}-${fecha}`));
  };
}

function CampoHora({ valor, onCambio, disabled, etiqueta }) {
  // Copia local: mientras se escribe con el teclado la hora pasa por estados
  // incompletos ("" para el navegador) que no deben borrar lo ya escrito.
  const externo = valor == null ? "" : aCampo(valor);
  const [texto, setTexto] = useState(externo);
  useEffect(() => setTexto(externo), [externo]);
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-slate-500 mb-1">{etiqueta}</span>
      <input
        type="time"
        step={300}
        min={aCampo(INICIO_DIA)}
        max={aCampo(FIN_DIA)}
        value={texto}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          setTexto(v);
          if (v) onCambio(deCampo(v));
        }}
        onBlur={(e) => !e.target.value && onCambio(null)}
        className="rd-campo-hora w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-extrabold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function ElegirDuracion({ valor, onCambio, disabled }) {
  const otra = !DURACIONES_TURNO.includes(valor);
  return (
    <div>
      <span className="block text-[11px] font-bold text-slate-500 mb-1">Duración</span>
      <div className="flex flex-wrap gap-1">
        {DURACIONES_TURNO.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => onCambio(d)}
            className={`px-2 py-1 rounded-lg border text-xs font-extrabold tabular-nums cursor-pointer ${valor === d ? "bg-blue-600 border-blue-600 text-white shadow" : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"}`}
          >
            {d}
          </button>
        ))}
        <label className={`flex items-center gap-1 px-1.5 rounded-lg border text-xs font-bold ${otra ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-500"}`}>
          otra
          <input
            type="number"
            min={5}
            max={240}
            step={5}
            disabled={disabled}
            value={valor}
            onChange={(e) => onCambio(Math.max(5, Math.min(240, Math.round(Number(e.target.value) || 0))))}
            className="w-12 bg-transparent text-xs font-extrabold tabular-nums focus:outline-none"
            aria-label="Minutos del turno"
          />
          min
        </label>
      </div>
    </div>
  );
}

export function AgendaEspecialistas({ servicioInicial, fijo = false }) {
  const { currentUser, agendaEspecialistas = [], guardarAgenda, appointments = [] } = useGym();
  const rol = currentUser?.role;
  const puedeEditar = (s) => rol === "admin" || SERVICIOS[s]?.rol === rol;

  const [servicio, setServicio] = useState(servicioInicial || (rol === "nutritionist" ? "nutricion" : "fisioterapia"));
  const [fecha, setFecha] = useState(hoyISO());
  const [semana, setSemana] = useState(0);
  const [lista, setLista] = useState([]); // turnos del día que se está editando
  const [aviso, setAviso] = useState("");
  // Agregar un turno
  const [inicio, setInicio] = useState(8 * 60);
  const [dur, setDur] = useState(30);
  // Generar varios
  const [desde, setDesde] = useState(8 * 60);
  const [hasta, setHasta] = useState(12 * 60);
  const [cada, setCada] = useState(30);
  const [descanso, setDescanso] = useState(0);
  // Editar uno
  const [editando, setEditando] = useState(null); // { idx, ini, dur }

  const registro = agendaEspecialistas.find((r) => r.id === `${servicio}-${fecha}`);
  const guardado = useMemo(() => normalizarAgenda(registro)?.turnos || [], [registro]);

  useEffect(() => {
    const l = guardado.map((t) => ({ ini: t.ini, fin: t.fin }));
    setLista(l);
    setEditando(null);
    const ult = l[l.length - 1];
    if (ult) setInicio(ult.fin);
  }, [servicio, fecha, firma(guardado)]);
  useEffect(() => setAviso(""), [servicio, fecha]);

  const editable = puedeEditar(servicio);
  const cambios = firma(lista) !== firma(guardado);
  const cruzados = cruces(lista);
  const esCruzado = (t) => cruzados.some((c) => c.ini === t.ini && c.fin === t.fin);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoyISO(), semana * 7 + i));
  const S = SERVICIOS[servicio];
  const Icono = S.icono;
  const f = aFecha(fecha);

  // Citas del día de este servicio (para ver qué turnos ya están reservados)
  const citasDia = appointments.filter((a) => a.date === fecha && a.serviceType === S.app && a.status !== "cancelled" && a.status !== "falta");
  const reservadoEn = (t) => citasDia.find((a) => seCruzan(rangoCita(a), { ini: t.ini, fin: t.fin }));

  const dentroDelDia = (ini, fin) => ini != null && fin != null && ini >= INICIO_DIA && fin <= FIN_DIA && fin > ini;
  const nuevo = inicio != null ? { ini: inicio, fin: inicio + dur } : null;
  const nuevoCruza = nuevo && lista.some((t) => seCruzan(t, nuevo));
  const nuevoValido = nuevo && dentroDelDia(nuevo.ini, nuevo.fin) && !nuevoCruza;

  const agregar = () => {
    if (!editable || !nuevoValido) return;
    setLista((l) => ordenarTurnos([...l, nuevo]));
    setInicio(nuevo.fin); // el siguiente turno empieza donde terminó este
  };
  const generados = (() => {
    const out = [];
    if (desde == null || hasta == null || cada < 5) return out;
    for (let t = desde; t + cada <= hasta && out.length < 120; t += cada + descanso) {
      const x = { ini: t, fin: t + cada };
      if (dentroDelDia(x.ini, x.fin) && !lista.some((y) => seCruzan(y, x))) out.push(x);
    }
    return out;
  })();
  const generar = () => {
    if (!editable || !generados.length) return;
    setLista((l) => ordenarTurnos([...l, ...generados]));
    const ult = generados[generados.length - 1];
    setInicio(ult.fin);
  };
  const quitar = (t) => setLista((l) => l.filter((x) => !(x.ini === t.ini && x.fin === t.fin)));
  const guardarEdicion = () => {
    if (!editando) return;
    const x = { ini: editando.ini, fin: editando.ini + editando.dur };
    if (!dentroDelDia(x.ini, x.fin)) return;
    setLista((l) => ordenarTurnos(l.map((t, i) => (i === editando.idx ? x : t))));
    setEditando(null);
  };

  const guardar = (fechas = [fecha]) => {
    const turnos = ordenarTurnos(lista);
    const n = normalizarAgenda({ turnos: turnos.map((t) => ({ inicio: deMin(t.ini), fin: deMin(t.fin) })) });
    fechas.forEach((fx) =>
      guardarAgenda({
        id: `${servicio}-${fx}`,
        servicio,
        fecha: fx,
        modelo: 2,
        turnos: turnos.map((t) => ({ inicio: deMin(t.ini), fin: deMin(t.fin) })),
        // compatibilidad con versiones anteriores
        horas: n.bloques,
        paso: PASO,
        duracion: n.duracion,
        por: currentUser?.fullName || currentUser?.username || "",
        actualizado: new Date().toISOString(),
      }),
    );
    setAviso(fechas.length > 1 ? `Horario guardado para ${fechas.length} ${plural(DIAS_LARGO[f.getDay()])}. Recepción ya lo ve.` : "Horario confirmado. Recepción ya ve estos turnos.");
  };
  const repetir = () => guardar([0, 7, 14, 21].map((n) => sumarDias(fecha, n)));
  const copiarDe = (otra) => {
    const r = normalizarAgenda(agendaEspecialistas.find((x) => x.id === `${servicio}-${otra}`));
    if (r) setLista(r.turnos.map((t) => ({ ini: t.ini, fin: t.fin })));
  };
  const diaAnteriorConHorario = (() => {
    for (let i = 1; i <= 14; i++) {
      const d = sumarDias(fecha, -i);
      if (normalizarAgenda(agendaEspecialistas.find((x) => x.id === `${servicio}-${d}`))?.turnos.length) return d;
    }
    return null;
  })();

  const proximos = agendaEspecialistas
    .filter((r) => r.servicio === servicio && r.fecha >= hoyISO() && normalizarAgenda(r)?.turnos.length)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 8);

  const totalSemana = dias.reduce((a, d) => a + minutosTurnos(normalizarAgenda(agendaEspecialistas.find((r) => r.id === `${servicio}-${d}`))?.turnos), 0);
  const diasCon = dias.filter((d) => normalizarAgenda(agendaEspecialistas.find((r) => r.id === `${servicio}-${d}`))?.turnos.length).length;
  const ordenada = ordenarTurnos(lista);

  return (
    <div className="rd-agenda-esp space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${servicio === "nutricion" ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500"}`}>
              <Icono className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Horario de atención · {S.nombre}</h3>
              <p className="text-[11px] text-slate-500">
                {editable
                  ? "Arma tus turnos como quieras: cada uno con su hora de inicio y su duración (10, 20, 35 minutos…). Recepción solo agenda en estos turnos."
                  : "Recepción solo puede agendar en estos turnos."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-1 rounded-lg border text-[11px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">{fmtMin(totalSemana)} esta semana</span>
            <span className="px-2 py-1 rounded-lg border text-[11px] font-bold text-sky-700 bg-sky-50 border-sky-200">{diasCon} de 7 días</span>
            {!fijo && (
              <div className="flex gap-1 rounded-lg p-0.5 bg-slate-100">
                {Object.entries(SERVICIOS).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setServicio(k)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${servicio === k ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {v.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Días */}
        <div className="mt-3 flex items-center gap-1.5">
          <button type="button" disabled={semana === 0} onClick={() => setSemana((s) => s - 1)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-2 rounded-lg text-xs font-bold disabled:opacity-30 cursor-pointer" aria-label="Semana anterior">‹</button>
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {dias.map((d) => {
              const fd = aFecha(d);
              const reg = agendaEspecialistas.find((r) => r.id === `${servicio}-${d}`);
              const t = normalizarAgenda(reg)?.turnos || [];
              const sel = d === fecha;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFecha(d)}
                  className={`rd-dia-agenda rounded-xl px-1 py-1.5 text-center border transition cursor-pointer ${sel ? "bg-blue-600 border-blue-500 text-white shadow-lg" : "border-slate-200 bg-white text-slate-700 hover:border-blue-400"}`}
                >
                  <span className="block text-[11px] font-bold uppercase opacity-80">{DIAS[fd.getDay()]}</span>
                  <span className="block text-base font-extrabold leading-tight">{fd.getDate()}</span>
                  <span className={`block text-[10px] font-bold ${sel ? "text-white/90" : t.length ? "text-emerald-600" : "text-slate-400"}`}>
                    {t.length ? `${t.length} ${t.length === 1 ? "turno" : "turnos"}` : reg ? "cerrado" : "sin horario"}
                  </span>
                  <span className={`block text-[9px] font-semibold truncate ${sel ? "text-white/75" : "text-slate-400"}`}>
                    {t.length ? `${deMin(t[0].ini).replace(":00 ", " ").replace(/^0/, "")} – ${deMin(t[t.length - 1].fin).replace(":00 ", " ").replace(/^0/, "")}` : " "}
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" disabled={semana >= 7} onClick={() => setSemana((s) => s + 1)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-2 rounded-lg text-xs font-bold disabled:opacity-30 cursor-pointer" aria-label="Semana siguiente">›</button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-extrabold">
            {DIAS_LARGO[f.getDay()][0].toUpperCase() + DIAS_LARGO[f.getDay()].slice(1)} {f.getDate()} de {MESES[f.getMonth()]}
            <span className="ml-2 text-xs font-semibold text-slate-500">
              {ordenada.length ? `${ordenada.length} ${ordenada.length === 1 ? "turno" : "turnos"} · ${fmtMin(minutosTurnos(ordenada))} de atención` : registro ? "Día cerrado" : "Sin horario publicado: recepción no puede agendar este día"}
            </span>
          </p>
          {editable && (
            <div className="flex flex-wrap gap-1.5">
              {diaAnteriorConHorario && (
                <button type="button" onClick={() => copiarDe(diaAnteriorConHorario)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Copiar del {DIAS_LARGO[aFecha(diaAnteriorConHorario).getDay()]} {aFecha(diaAnteriorConHorario).getDate()}
                </button>
              )}
              <button type="button" onClick={() => setLista([])} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Limpiar día
              </button>
            </div>
          )}
        </div>

        <div className={`mt-3 grid gap-3 ${editable ? "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" : ""}`}>
          {editable && (
            <div className="space-y-3">
              {/* Agregar un turno */}
              <div className="rd-caja-turno rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-600 flex items-center gap-1.5 mb-2">
                  <Plus className="w-3.5 h-3.5" /> Agregar un turno
                </p>
                <div className="grid grid-cols-[8.6rem_minmax(0,1fr)] gap-2 items-start">
                  <CampoHora etiqueta="Empieza" valor={inicio} onCambio={setInicio} />
                  <ElegirDuracion valor={dur} onCambio={setDur} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className={`text-xs font-extrabold tabular-nums ${nuevoValido ? "text-slate-700" : "text-rose-600"}`}>
                    {nuevo ? rangoTexto(nuevo.ini, nuevo.fin) : "Elige la hora"}{" "}
                    <span className="font-semibold">
                      {nuevo && !dentroDelDia(nuevo.ini, nuevo.fin) ? "· fuera de 5 AM – 11 PM" : nuevoCruza ? "· se cruza con otro turno" : `· ${dur} min`}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={!nuevoValido}
                    onClick={agregar}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-extrabold cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar turno
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">El siguiente turno empieza solo donde terminó el anterior; puedes cambiar la hora.</p>
              </div>

              {/* Generar varios */}
              <div className="rd-caja-turno rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-600 flex items-center gap-1.5 mb-2">
                  <Wand2 className="w-3.5 h-3.5" /> Generar varios de una vez
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <CampoHora etiqueta="Desde" valor={desde} onCambio={setDesde} />
                  <CampoHora etiqueta="Hasta" valor={hasta} onCambio={setHasta} />
                </div>
                <div className="mt-2">
                  <ElegirDuracion valor={cada} onCambio={setCada} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Descanso entre turnos</span>
                  {DESCANSOS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDescanso(d)}
                      className={`px-2 py-1 rounded-lg border text-xs font-extrabold cursor-pointer ${descanso === d ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"}`}
                    >
                      {d ? `${d} min` : "sin"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!generados.length}
                  onClick={generar}
                  className="mt-2.5 w-full px-3 py-2 rounded-lg bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-40 text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1"
                >
                  <Wand2 className="w-3.5 h-3.5" /> {generados.length ? `Agregar ${generados.length} ${generados.length === 1 ? "turno" : "turnos"} de ${cada} min` : "No hay turnos nuevos en ese rango"}
                </button>
              </div>
            </div>
          )}

          {/* Turnos del día */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-600 flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5" /> Turnos del día
              {cruzados.length > 0 && (
                <span className="ml-auto normal-case tracking-normal text-rose-600 flex items-center gap-1">
                  <TriangleAlert className="w-3.5 h-3.5" /> Hay turnos que se cruzan
                </span>
              )}
            </p>
            {ordenada.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{editable ? "Aún no hay turnos. Agrega uno o genera varios a la izquierda." : "Este día no hay turnos publicados."}</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-2">
                {PARTES_DIA.map(([clave, nombre, I, grad]) => {
                  const deParte = ordenada.filter((t) => parteDelDia(t.ini) === clave);
                  return (
                    <div key={clave} className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-600 mb-1.5">
                        <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${grad} text-white flex items-center justify-center`}>
                          <I className="w-3 h-3" />
                        </span>
                        {nombre}
                        <span className="ml-auto font-bold normal-case text-slate-400">{deParte.length ? `${deParte.length}` : "—"}</span>
                      </p>
                      <div className="space-y-1">
                        {deParte.map((t) => {
                          const idx = ordenada.indexOf(t);
                          const res = reservadoEn(t);
                          const cruza = esCruzado(t);
                          if (editando?.idx === idx) {
                            return (
                              <div key={`${t.ini}-${t.fin}`} className="rounded-lg border border-blue-400 bg-white p-2 space-y-2">
                                <CampoHora etiqueta="Empieza" valor={editando.ini} onCambio={(v) => setEditando((e) => ({ ...e, ini: v }))} />
                                <ElegirDuracion valor={editando.dur} onCambio={(v) => setEditando((e) => ({ ...e, dur: v }))} />
                                <div className="flex justify-end gap-1">
                                  <button type="button" onClick={() => setEditando(null)} className="px-2 py-1 rounded-md border border-slate-200 text-xs font-bold cursor-pointer">Cancelar</button>
                                  <button type="button" onClick={guardarEdicion} className="px-2 py-1 rounded-md bg-blue-600 text-white text-xs font-bold cursor-pointer">Listo</button>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={`${t.ini}-${t.fin}`}
                              className={`rd-turno group flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${cruza ? "border-rose-300 bg-rose-50" : res ? "rd-turno-reservado border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-extrabold tabular-nums text-slate-800">{rangoTexto(t.ini, t.fin)}</p>
                                <p className="text-[10px] font-semibold text-slate-500 truncate flex items-center gap-1">
                                  {t.fin - t.ini} min
                                  {res && (
                                    <>
                                      {" · "}
                                      <User className="w-3 h-3 shrink-0" /> {String(res.memberName || "").split(" ")[0]}
                                    </>
                                  )}
                                  {cruza && " · se cruza"}
                                </p>
                              </div>
                              {editable && (
                                <>
                                  <button type="button" title="Cambiar hora o duración" onClick={() => setEditando({ idx, ini: t.ini, dur: t.fin - t.ini })} className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" title={res ? "Tiene una cita reservada" : "Quitar turno"} onClick={() => quitar(t)} className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                        {deParte.length === 0 && <p className="text-[11px] text-slate-400 py-1">Sin turnos</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {editable ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => guardar()}
              disabled={(!cambios && !!registro) || cruzados.length > 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-extrabold shadow cursor-pointer"
            >
              <Save className="w-4 h-4" /> Confirmar horario del día
            </button>
            <button
              type="button"
              onClick={repetir}
              disabled={cruzados.length > 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-xs font-extrabold cursor-pointer"
            >
              <Copy className="w-4 h-4" /> Repetir 4 {plural(DIAS_LARGO[f.getDay()])} seguidos
            </button>
            {cambios && <span className="text-xs font-bold text-amber-500">Cambios sin confirmar</span>}
            {cruzados.length > 0 && <span className="text-xs font-bold text-rose-500">Corrige los turnos que se cruzan para poder guardar</span>}
            {aviso && !cambios && (
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {aviso}
              </span>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs opacity-70 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Solo {S.nombre === "Nutrición" ? "nutrición" : "fisioterapia"} o administración pueden cambiar este horario.
          </p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 p-3">
        <p className="text-xs font-extrabold uppercase tracking-wide opacity-70 mb-2 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" /> Próximos días con atención · {S.nombre}
        </p>
        {proximos.length === 0 ? (
          <p className="text-xs opacity-60">Aún no hay días confirmados.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {proximos.map((r) => {
              const fd = aFecha(r.fecha);
              const t = normalizarAgenda(r).turnos;
              return (
                <button key={r.id} type="button" onClick={() => setFecha(r.fecha)} className="text-left rounded-lg border border-slate-200 bg-white text-slate-700 px-2.5 py-1.5 hover:border-blue-400 cursor-pointer">
                  <span className="block text-xs font-extrabold">
                    {DIAS_LARGO[fd.getDay()][0].toUpperCase() + DIAS_LARGO[fd.getDay()].slice(1)} {fd.getDate()} {MESES[fd.getMonth()]}
                  </span>
                  <span className="block text-[11px] opacity-75">
                    {t.length} turnos · {rangoTexto(t[0].ini, t[t.length - 1].fin)}
                  </span>
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
