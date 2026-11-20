import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Check, Copy, Lock, Save, Stethoscope, Apple, RotateCcw, Sunrise, Sun, Moon, MousePointerClick } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { hoyISO } from "../../utils/fecha";
import { BLOQUES, DURACIONES, DURACION_POR_DEFECTO, PASO, aMin, deMin, corta, normalizarAgenda, resumen, minutosAbiertos, turnos } from "../../utils/horario";

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
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

// Horas de atención configuradas para un servicio (physiotherapy / nutrition) en una fecha.
// Devuelve { bloques, duracion } o null si ese día no se configuró (entonces no se restringe nada).
export function useHorasAtencion() {
  const { agendaEspecialistas = [] } = useGym();
  return (servicioApp, fecha) => {
    const clave = Object.keys(SERVICIOS).find((k) => SERVICIOS[k].app === servicioApp || k === servicioApp);
    if (!clave) return null;
    return normalizarAgenda(agendaEspecialistas.find((r) => r.id === `${clave}-${fecha}`));
  };
}

// Columnas del editor: cada una con sus horas (filas) y 4 bloques de 15 min por hora
const PARTES = [
  ["Mañana", Sunrise, 5, 12, "from-amber-400 to-orange-500"],
  ["Tarde", Sun, 12, 18, "from-sky-500 to-blue-600"],
  ["Noche", Moon, 18, 23, "from-violet-500 to-indigo-600"],
];
const bloquesEntre = (h1, h2) => BLOQUES.filter((b) => aMin(b) >= h1 * 60 && aMin(b) < h2 * 60);

export function AgendaEspecialistas({ servicioInicial, fijo = false }) {
  const { currentUser, agendaEspecialistas = [], guardarAgenda } = useGym();
  const rol = currentUser?.role;
  const puedeEditar = (s) => rol === "admin" || SERVICIOS[s]?.rol === rol;

  const [servicio, setServicio] = useState(
    servicioInicial || (rol === "nutritionist" ? "nutricion" : "fisioterapia")
  );
  const [fecha, setFecha] = useState(hoyISO());
  const [semana, setSemana] = useState(0);
  const [horas, setHoras] = useState([]); // bloques de 15 min abiertos
  const [duracion, setDuracion] = useState(DURACION_POR_DEFECTO);
  const [aviso, setAviso] = useState("");

  const registro = agendaEspecialistas.find((r) => r.id === `${servicio}-${fecha}`);
  const guardado = useMemo(() => normalizarAgenda(registro) || { bloques: [], duracion: DURACION_POR_DEFECTO }, [registro]);

  useEffect(() => {
    setHoras(guardado.bloques);
    setDuracion(guardado.duracion);
  }, [servicio, fecha, guardado.bloques.join("|"), guardado.duracion]);
  useEffect(() => setAviso(""), [servicio, fecha]);

  const editable = puedeEditar(servicio);
  const cambios = horas.join("|") !== guardado.bloques.join("|") || (horas.length > 0 && duracion !== guardado.duracion);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoyISO(), semana * 7 + i));
  const ordenar = (l) => [...new Set(l)].sort((a, b) => aMin(a) - aMin(b));

  const alternar = (h) => {
    if (!editable) return;
    setHoras((prev) => ordenar(prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  };
  // Toda una hora (sus 4 bloques) de un toque
  const alternarHora = (h24) => {
    if (!editable) return;
    const de = bloquesEntre(h24, h24 + 1);
    setHoras((prev) => (de.every((b) => prev.includes(b)) ? prev.filter((x) => !de.includes(x)) : ordenar([...prev, ...de])));
  };
  // Arrastrar con el mouse para marcar o desmarcar varios bloques seguidos
  const arrastre = React.useRef(null);
  useEffect(() => {
    const fin = () => (arrastre.current = null);
    window.addEventListener("pointerup", fin);
    return () => window.removeEventListener("pointerup", fin);
  }, []);
  const empezar = (h) => {
    if (!editable) return;
    const marcar = !horas.includes(h);
    arrastre.current = marcar;
    setHoras((prev) => ordenar(marcar ? [...prev, h] : prev.filter((x) => x !== h)));
  };
  const pasar = (h) => {
    if (arrastre.current === null || !editable) return;
    const marcar = arrastre.current;
    setHoras((prev) => ordenar(marcar ? [...prev, h] : prev.filter((x) => x !== h)));
  };

  const guardar = (fechas = [fecha]) => {
    fechas.forEach((f) =>
      guardarAgenda({
        id: `${servicio}-${f}`,
        servicio,
        fecha: f,
        horas: ordenar(horas),
        paso: PASO,
        duracion,
        por: currentUser?.fullName || currentUser?.username || "",
        actualizado: new Date().toISOString(),
      })
    );
    setAviso(
      fechas.length > 1
        ? `Horario guardado para ${fechas.length} ${DIAS_LARGO[aFecha(fecha).getDay()]}s. Recepción ya lo ve.`
        : "Horario confirmado. Recepción ya ve estos turnos."
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
  const lista = turnos(horas, duracion);

  return (
    <div className="rd-agenda-esp space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 p-3 sm:p-4">
        {(() => {
          const regs = dias.map((d) => agendaEspecialistas.find((r) => r.id === `${servicio}-${d}`)).filter(Boolean);
          const minTot = regs.reduce((a2, r) => a2 + minutosAbiertos(normalizarAgenda(r).bloques), 0);
          const diasCon = regs.filter((r) => r.horas?.length).length;
          return (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${servicio === "nutricion" ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500"}`}>
                  <Icono className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Horario de atención · {S.nombre}</h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {editable ? "Bloques de 15 minutos: toca, arrastra o toca la hora para marcarla entera. Elige cuánto dura cada cita y confirma." : "Solo se puede agendar dentro de estos turnos."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-1 rounded-lg border text-[11px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">{fmtMin(minTot)} esta semana</span>
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
          );
        })()}

        {/* Días */}
        <div className="mt-3 flex items-center gap-1.5">
          <button type="button" disabled={semana === 0} onClick={() => setSemana((s) => s - 1)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-2 rounded-lg text-xs font-bold disabled:opacity-30 cursor-pointer">‹</button>
          <div className="grid grid-cols-7 gap-1.5 flex-1">
            {dias.map((d) => {
              const fd = aFecha(d);
              const reg = agendaEspecialistas.find((r) => r.id === `${servicio}-${d}`);
              const nb = normalizarAgenda(reg);
              const n = nb ? minutosAbiertos(nb.bloques) : 0;
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
                  <span className={`block text-[10px] font-bold ${sel ? "text-white/90" : n ? "text-emerald-600" : "text-slate-400"}`}>
                    {reg ? (n ? fmtMin(n) : "cerrado") : "sin horario"}
                  </span>
                  <span className="mt-1 mx-1 flex gap-[2px] h-1" aria-hidden>
                    {Array.from({ length: 18 }, (_, i) => {
                      const de = bloquesEntre(5 + i, 6 + i);
                      const on = nb ? de.filter((b) => nb.bloques.includes(b)).length : 0;
                      return <span key={i} className={`flex-1 rounded-full ${on ? (sel ? "bg-white" : on === 4 ? "bg-emerald-500" : "bg-emerald-300") : sel ? "bg-white/25" : "bg-slate-200"}`} />;
                    })}
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" disabled={semana >= 7} onClick={() => setSemana((s) => s + 1)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-2 rounded-lg text-xs font-bold disabled:opacity-30 cursor-pointer">›</button>
        </div>

        {/* Bloques de 15 minutos */}
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-xs font-extrabold">
              {DIAS_LARGO[f.getDay()][0].toUpperCase() + DIAS_LARGO[f.getDay()].slice(1)} {f.getDate()} de {MESES[f.getMonth()]}
              <span className="ml-2 text-xs font-semibold opacity-70 normal-case">
                {horas.length ? resumen(horas) : registro ? "Día cerrado" : "Sin horario configurado (se puede agendar a cualquier hora)"}
              </span>
            </p>
            {editable && (
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["Mañana 8–12", 8, 12],
                  ["Tarde 3–7", 15, 19],
                  ["Jornada 7 AM–7 PM", 7, 19],
                ].map(([t, a1, a2]) => (
                  <button key={t} type="button" onClick={() => setHoras(bloquesEntre(a1, a2))} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer">
                    {t}
                  </button>
                ))}
                <button type="button" onClick={() => setHoras([])} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"><RotateCcw className="w-3 h-3" />Limpiar</button>
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-3 gap-2 select-none" onPointerLeave={() => (arrastre.current = null)}>
            {PARTES.map(([nombre, I, h1, h2, grad]) => {
              const deParte = bloquesEntre(h1, h2);
              const abiertos = deParte.filter((b) => horas.includes(b)).length * PASO;
              return (
                <div key={nombre} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
                      <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${grad} text-white flex items-center justify-center`}><I className="w-3 h-3" /></span>
                      {nombre}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">{abiertos ? fmtMin(abiertos) : "cerrado"}</span>
                  </div>
                  <div className="space-y-1">
                    {Array.from({ length: h2 - h1 }, (_, k) => h1 + k).map((h24) => {
                      const de = bloquesEntre(h24, h24 + 1);
                      const llena = de.every((b) => horas.includes(b));
                      return (
                        <div key={h24} className="grid grid-cols-[3.2rem_repeat(4,minmax(0,1fr))] gap-1 items-stretch">
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() => alternarHora(h24)}
                            title={editable ? "Marcar o quitar la hora completa" : undefined}
                            className={`rd-franja-hora rounded-md text-[10px] font-black border ${llena ? "bg-emerald-600/15 border-emerald-500/60 text-emerald-700" : "bg-white border-slate-200 text-slate-500"} ${editable ? "cursor-pointer hover:border-emerald-400" : "cursor-default"}`}
                          >
                            {deMin(h24 * 60).replace(":00 ", " ").replace(/^0/, "")}
                          </button>
                          {de.map((h) => {
                            const on = horas.includes(h);
                            return (
                              <button
                                key={h}
                                type="button"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  empezar(h);
                                }}
                                onPointerEnter={() => pasar(h)}
                                onClick={(e) => e.detail === 0 && alternar(h)}
                                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), alternar(h))}
                                disabled={!editable}
                                aria-pressed={on}
                                title={`${h} a ${deMin(aMin(h) + PASO)}`}
                                className={`rd-franja rounded-md py-1 text-[10px] font-extrabold border tabular-nums ${editable ? "cursor-pointer" : "cursor-default"} ${on ? "rd-franja-on bg-emerald-600 border-emerald-500 text-white" : "border-slate-200 bg-white text-slate-500"}`}
                              >
                                {corta(aMin(h))}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Duración de cada cita y turnos resultantes */}
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Cada cita dura
              </span>
              <div className="flex flex-wrap gap-1">
                {DURACIONES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={!editable}
                    onClick={() => setDuracion(d)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-extrabold ${duracion === d ? "bg-blue-600 border-blue-600 text-white shadow" : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"} ${editable ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
              <span className="ml-auto text-[11px] font-bold text-slate-500">
                {horas.length ? `${lista.length} ${lista.length === 1 ? "turno" : "turnos"} para agendar` : "Marca los bloques de atención"}
              </span>
            </div>
            {lista.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {lista.slice(0, 40).map((t) => (
                  <span key={t.inicio} className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600 tabular-nums">
                    {corta(t.min)}–{corta(t.min + duracion)}
                  </span>
                ))}
                {lista.length > 40 && <span className="text-[10px] font-bold text-slate-400 self-center">+{lista.length - 40} más</span>}
              </div>
            )}
          </div>

          {editable ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => guardar()}
                disabled={!cambios && !!registro}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-extrabold shadow cursor-pointer"
              >
                <Save className="w-4 h-4" /> Confirmar horario del día
              </button>
              <button
                type="button"
                onClick={repetir}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-extrabold cursor-pointer"
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
              return (
                <button key={r.id} type="button" onClick={() => setFecha(r.fecha)} className="text-left rounded-lg border border-slate-200 bg-white text-slate-700 px-2.5 py-1.5 hover:border-blue-400 cursor-pointer">
                  <span className="block text-xs font-extrabold">{DIAS_LARGO[fd.getDay()][0].toUpperCase() + DIAS_LARGO[fd.getDay()].slice(1)} {fd.getDate()} {MESES[fd.getMonth()]}</span>
                  <span className="block text-[11px] opacity-75">{resumen(normalizarAgenda(r).bloques)}</span>
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
