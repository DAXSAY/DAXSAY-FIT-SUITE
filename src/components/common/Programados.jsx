// "Programados": alumnos a los que les FALTA rutina, nutrición o fisioterapia.
// - Cobertura: quién tiene y quién no (lista vacía hasta buscar o elegir un grupo)
// - Botón "Programar": deja el aviso al área que corresponde (entrenador,
//   nutrición o fisioterapia) y en las alertas generales, con código y WhatsApp.
import { useRecordado } from "../../utils/subPestana";
import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, ClipboardCopy, Hourglass, Dumbbell, HeartPulse, MessageCircle, Salad, Search, UserCheck, UserRound } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { CodigoAlumno, coincideAlumno } from "./BuscarAlumno";
import { enlaceWhatsApp } from "./TelWhatsApp";
import { IconoEmoji } from "./IconoEmoji";

export const TIPOS_PROG = {
  rutina: { etiqueta: "Falta rutina", accion: "Programar rutina", area: "Entrenador", icono: Dumbbell, tab: "routines", color: "violet", servicio: "su rutina de entrenamiento" },
  nutricion: { etiqueta: "Falta nutrición", accion: "Programar cita", area: "Nutrición", icono: Salad, tab: "nutrition", color: "emerald", servicio: "su cita de nutrición" },
  fisioterapia: { etiqueta: "Falta fisioterapia", accion: "Programar cita", area: "Fisioterapia", icono: HeartPulse, tab: "physiotherapy", color: "rose", servicio: "su evaluación de fisioterapia" },
};
const TONO = {
  violet: { caja: "border-violet-200 bg-violet-50", texto: "text-violet-800", boton: "bg-violet-600 hover:bg-violet-700 text-white", barra: "border-l-violet-500" },
  emerald: { caja: "border-emerald-200 bg-emerald-50", texto: "text-emerald-800", boton: "bg-emerald-600 hover:bg-emerald-700 text-white", barra: "border-l-emerald-500" },
  rose: { caja: "border-rose-200 bg-rose-50", texto: "text-rose-800", boton: "bg-rose-600 hover:bg-rose-700 text-white", barra: "border-l-rose-500" },
};
// Qué tipos ve cada rol en sus avisos
const TIPOS_DEL_ROL = { trainer: ["rutina"], nutritionist: ["nutricion"], physio: ["fisioterapia"] };

const fechaHora = (f) => {
  if (!f) return "";
  const [d, h] = String(f).split(" ");
  const [a, m, dd] = d.split("-");
  return `${dd}/${m}/${a}${h ? ` ${h.slice(0, 5)}` : ""}`;
};

/** Quién tiene rutina / dieta / fisioterapia (ids de alumno como texto) */
export function useCobertura() {
  const { members = [], routines = [], nutritionPlans = [], physioRecords = [] } = useGym();
  return useMemo(() => {
    const rutina = new Set(routines.filter((r) => r.targetStudentId).map((r) => String(r.targetStudentId)));
    members.forEach((m) => m.assignedRoutineId && routines.some((r) => String(r.id) === String(m.assignedRoutineId)) && rutina.add(String(m.id)));
    const nutricion = new Set(nutritionPlans.filter((p) => p.active !== false && p.targetStudentId).map((p) => String(p.targetStudentId)));
    const fisioterapia = new Set(physioRecords.map((r) => String(r.memberId)).filter(Boolean));
    return { rutina, nutricion, fisioterapia };
  }, [members, routines, nutritionPlans, physioRecords]);
}

/** Programados pendientes (los que ya tienen el servicio se dan por atendidos) */
export function usePendientes({ todos = false } = {}) {
  const { programados = [], currentUser, members = [] } = useGym();
  const cob = useCobertura();
  return useMemo(() => {
    const tipos = todos ? Object.keys(TIPOS_PROG) : TIPOS_DEL_ROL[currentUser?.role] || Object.keys(TIPOS_PROG);
    const activos = new Set(members.map((m) => String(m.id)));
    return programados
      .filter((p) => p.estado === "pendiente" && tipos.includes(p.tipo) && activos.has(String(p.memberId)) && !cob[p.tipo]?.has(String(p.memberId)))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [programados, currentUser?.role, members, cob, todos]);
}

// Un programado se cierra SOLO cuando el alumno ya tiene el servicio
// (rutina asignada, dieta activa o evaluación de fisioterapia). Nadie puede
// darle check a mano sin que se haya hecho la asignación.
const yaCerrados = new Set();
export function useCierreAutomatico() {
  const { programados = [], resolverProgramado, currentUser } = useGym();
  const cob = useCobertura();
  const puede = ["admin", "trainer", "nutritionist", "physio", "reception"].includes(currentUser?.role);
  useEffect(() => {
    if (!puede || !resolverProgramado) return;
    programados.forEach((p) => {
      if (p.estado === "pendiente" && cob[p.tipo]?.has(String(p.memberId)) && !yaCerrados.has(p.id)) {
        yaCerrados.add(p.id);
        resolverProgramado(p.id);
      }
    });
  }, [programados, cob, puede, resolverProgramado]);
}

const copiar = (t) => {
  try {
    navigator.clipboard?.writeText(t)?.catch?.(() => {});
  } catch {
    /* sin portapapeles */
  }
};
export const abrirPerfilAlumno = (id) => {
  try {
    sessionStorage.setItem("radical_abrir_alumno", String(id));
    sessionStorage.setItem("radical_perfil_desde", "1");
  } catch {
    /* nada */
  }
  window.dispatchEvent(new CustomEvent("radical:ir-modulo", { detail: "members" }));
  setTimeout(() => window.dispatchEvent(new CustomEvent("radical:abrir-alumno", { detail: String(id) })), 300);
};

/** Una fila de "programado" (avisos y lista completa) */
export const FilaProgramado = ({ p, compacta = false, onAtendido }) => {
  const { gymConfig } = useGym();
  const t = TIPOS_PROG[p.tipo];
  const c = TONO[t.color];
  const Icono = t.icono;
  const nombre = String(p.memberName || "").split(" ")[0];
  const msg = `Hola ${nombre}, te saluda ${gymConfig?.name || "el gimnasio"}. Queremos agendar ${t.servicio}. ¿Qué día y hora te queda mejor?`;
  return (
    <li className={`rounded-xl border border-slate-200 border-l-4 ${c.barra} bg-white px-3 py-2 flex items-center gap-2.5`}>
      <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${c.caja} ${c.texto} border`}>
        <Icono className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          {p.codigo && <span className="shrink-0 font-mono text-[11px] font-bold text-slate-500">{p.codigo}</span>}
          <b className="truncate text-sm text-slate-900">{p.memberName}</b>
        </span>
        <span className="block truncate text-[11px] text-slate-500">
          <b className={c.texto}>{t.etiqueta}</b>
          {!compacta && p.por ? ` · programó ${p.por}` : ""} · {fechaHora(p.fecha)}
          {p.nota ? ` · ${p.nota}` : ""}
        </span>
      </span>
      {p.telefono && (
        <a href={enlaceWhatsApp(p.telefono, msg)} target="_blank" rel="noreferrer" title={`WhatsApp ${p.telefono}`} className="shrink-0 w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100">
          <MessageCircle className="w-4 h-4" />
        </a>
      )}
      <button type="button" onClick={() => abrirPerfilAlumno(p.memberId)} title="Ver perfil (teléfono, datos)" className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 cursor-pointer">
        <UserRound className="w-4 h-4" />
      </button>
      <span
        title={`Se marca como atendido solo, cuando ${p.memberName} ya tenga ${t.servicio.replace("su ", "su ")} asignada en el sistema`}
        className="shrink-0 h-8 px-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide cursor-help"
      >
        <Hourglass className="w-3.5 h-3.5" /> {compacta ? "" : "Pendiente"}
      </span>
    </li>
  );
};

/** Sección para los paneles de avisos (campanita) */
export const SeccionProgramados = ({ todos = false }) => {
  const pend = usePendientes({ todos });
  useCierreAutomatico();
  if (!pend.length) return null;
  return (
    <div className="mb-3 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1">
        <CalendarClock className="w-3.5 h-3.5" /> Programados · por atender ({pend.length})
      </p>
      <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {pend.map((p) => (
          <FilaProgramado key={p.id} p={p} compacta />
        ))}
      </ul>
    </div>
  );
};

/** Pestaña completa (Ver todas las alertas → Programados), por tipo */
export const ProgramadosCompleto = () => {
  const pend = usePendientes({ todos: true });
  useCierreAutomatico();
  const [q, setQ] = useState("");
  const lista = q.trim() ? pend.filter((p) => `${p.memberName} ${p.codigo}`.toLowerCase().includes(q.trim().toLowerCase())) : pend;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(TIPOS_PROG).map(([k, t]) => {
          const c = TONO[t.color];
          const Icono = t.icono;
          return (
            <div key={k} className={`rounded-2xl border ${c.caja} px-4 py-3 flex items-center gap-3`}>
              <Icono className={`w-6 h-6 ${c.texto}`} />
              <span>
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500">{t.etiqueta}</span>
                <span className={`block text-2xl font-black ${c.texto}`}>{pend.filter((p) => p.tipo === k).length}</span>
              </span>
              <span className="ml-auto text-[11px] text-slate-500">Avisa a: {t.area}</span>
            </div>
          );
        })}
      </div>
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alumno o código…" className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {Object.entries(TIPOS_PROG).map(([k, t]) => {
          const c = TONO[t.color];
          const l = lista.filter((p) => p.tipo === k);
          return (
            <section key={k} className={`rounded-2xl border ${c.caja} p-3`}>
              <h3 className={`text-sm font-black uppercase tracking-wider mb-2 ${c.texto}`}>
                {t.etiqueta} ({l.length})
              </h3>
              {l.length ? (
                <ul className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                  {l.map((p) => (
                    <FilaProgramado key={p.id} p={p} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 py-4 text-center">Nadie por programar.</p>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Se agregan con el botón <b>Programar</b> (Rutinas asignadas, Nutrición o Fisioterapia → Seguimiento). Salen solos de aquí cuando el alumno ya tiene su rutina, plan o evaluación.
      </p>
    </div>
  );
};

/** Botón Programar (para una fila de alumno sin servicio) */
export const BotonProgramar = ({ tipo, member, className = "" }) => {
  const { programados = [], programarAlumno } = useGym();
  const [hecho, setHecho] = useState(false);
  const t = TIPOS_PROG[tipo];
  const c = TONO[t.color];
  const ya = programados.some((p) => p.id === `prog-${tipo}-${member.id}` && p.estado === "pendiente");
  if (ya || hecho)
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-bold ${c.caja} ${c.texto} ${className}`} title={`Avisado a ${t.area}`}>
        <CalendarClock className="w-3.5 h-3.5" /> Programado
      </span>
    );
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        programarAlumno(tipo, member);
        copiar(member.codeLabel || "");
        setHecho(true);
      }}
      title={`Avisa a ${t.area} y copia el código ${member.codeLabel || ""}`}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${c.boton} ${className}`}
    >
      <CalendarClock className="w-3.5 h-3.5" /> {t.accion}
    </button>
  );
};

/**
 * Seguimiento de un servicio (nutrición o fisioterapia): con / sin / todos.
 * La lista aparece solo al escribir o al elegir un grupo.
 */
export const SeguimientoServicio = ({ tipo }) => {
  const { members = [] } = useGym();
  const cob = useCobertura()[tipo];
  const t = TIPOS_PROG[tipo];
  const [q, setQ] = useRecordado(`seg_q_${tipo}`, "");
  const [vista, setVista] = useRecordado(`seg_${tipo}`, "");
  const con = members.filter((m) => cob.has(String(m.id))).length;
  const etiquetaCon = tipo === "nutricion" ? "Con plan" : "Evaluados";
  const etiquetaSin = tipo === "nutricion" ? "Sin plan" : "Sin evaluación";
  const lista = useMemo(() => {
    if (!q.trim() && !vista) return [];
    let l = members;
    if (vista === "con") l = l.filter((m) => cob.has(String(m.id)));
    if (vista === "sin") l = l.filter((m) => !cob.has(String(m.id)));
    if (q.trim()) l = l.filter((m) => coincideAlumno(m, q));
    return [...l].sort((a, b) => (Number(a.code) || 0) - (Number(b.code) || 0));
  }, [members, cob, q, vista]);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-stretch gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value.trim() && vista) setVista("");
            }}
            aria-label="Buscar alumno por código, nombre o DNI"
            className="rd-campo-checkin w-full h-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-semibold focus:outline-none transition-all"
          />
          {!q && (
            <span className="absolute left-9 right-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm text-slate-400 truncate">
              Buscar alumno: <b className="font-semibold">código (DF-1 o 1), nombre o DNI</b>
            </span>
          )}
          <UserCheck className="rd-icono-checkin w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
          {[
            ["con", etiquetaCon, con, "emerald"],
            ["sin", etiquetaSin, members.length - con, "rose"],
            ["todos", "Todos", members.length, "blue"],
          ].map(([k, l, n, col]) => {
            const on = vista === k;
            const cls = {
              emerald: on ? "bg-emerald-600 border-emerald-600 text-white" : "bg-emerald-50 border-emerald-200 text-emerald-800",
              rose: on ? "bg-rose-600 border-rose-600 text-white" : "bg-rose-50 border-rose-200 text-rose-800",
              blue: on ? "bg-blue-600 border-blue-600 text-white" : "bg-blue-50 border-blue-200 text-blue-800",
            }[col];
            return (
              <button key={k} type="button" onClick={() => {
                const nueva = on && !q.trim() ? "" : k;
                setQ("");
                setVista(nueva);
                if (nueva) setTimeout(() => document.getElementById(`rd-lista-seg-${tipo}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
              }} className={`rounded-xl border px-4 py-1.5 text-center cursor-pointer min-w-[6.5rem] ${cls}`}>
                <span className="block text-xl font-black leading-none">{n}</span>
                <span className="block text-[11px] font-bold mt-0.5">{l}</span>
              </button>
            );
          })}
        </div>
      </div>

      {(q.trim() || vista) && (
        <div id={`rd-lista-seg-${tipo}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden scroll-mt-20">
          <div className="hidden md:grid grid-cols-[110px_minmax(0,1.4fr)_150px_minmax(0,1fr)] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span>Código</span>
            <span>Alumno</span>
            <span>Estado</span>
            <span>Acción</span>
          </div>
          {lista.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">Ningún alumno{q ? ` con «${q}»` : ""}.</p>}
          <div className="divide-y divide-slate-100 max-h-[calc(100vh-22rem)] overflow-y-auto">
            {lista.map((m) => {
              const tiene = cob.has(String(m.id));
              return (
                <div key={m.id} className="grid md:grid-cols-[110px_minmax(0,1.4fr)_150px_minmax(0,1fr)] gap-1 md:gap-3 items-center px-4 py-2.5">
                  <span>
                    <CodigoAlumno m={m} />
                  </span>
                  <span className="text-sm font-bold text-slate-900 truncate">{m.fullName}</span>
                  <span>
                    {tiene ? (
                      <span className="px-2 py-0.5 rounded-full border text-[11px] font-bold bg-emerald-50 border-emerald-200 text-emerald-800">✓ {etiquetaCon}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full border text-[11px] font-bold bg-rose-50 border-rose-200 text-rose-800"><IconoEmoji e="⚠" /> {etiquetaSin}</span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {!tiene && <BotonProgramar tipo={tipo} member={m} />}
                    <button type="button" onClick={() => abrirPerfilAlumno(m.id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-[11px] font-bold cursor-pointer hover:bg-slate-50">
                      <UserRound className="w-3.5 h-3.5" /> Ver perfil
                    </button>
                    {!tiene && m.codeLabel && (
                      <button type="button" onClick={() => copiar(m.codeLabel)} title="Copiar código" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-500 text-[11px] font-bold cursor-pointer hover:bg-slate-50">
                        <ClipboardCopy className="w-3.5 h-3.5" /> {m.codeLabel}
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!q.trim() && !vista && (
        <p className="text-xs text-slate-500 px-1">
          Escribe un código o toca <b>{etiquetaCon}</b>, <b>{etiquetaSin}</b> o <b>Todos</b> para ver la lista. Con <b>{t.accion}</b> el alumno queda en <b>Programados</b> y le llega el aviso a {t.area}.
        </p>
      )}
    </div>
  );
};
