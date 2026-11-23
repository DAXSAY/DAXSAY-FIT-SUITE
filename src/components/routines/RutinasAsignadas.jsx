// "Rutinas asignadas": alumnos con su rutina personal, separado de las plantillas.
// Se busca por CÓDIGO (DF-12 o 12), nombre o DNI → Enter lleva directo al alumno.
// Aquí "Editar" cambia SOLO la rutina de ese alumno.
import { useRecordado } from "../../utils/subPestana";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pencil, RotateCcw, Search, UserCheck, UserPlus, Users } from "lucide-react";
import { CodigoAlumno, coincideAlumno } from "../common/BuscarAlumno";
import { ExerciseThumb, MUSCLE_LABELS } from "./ExerciseBank";
import { InsigniaMetodo, InsigniaTipoDia, etiquetasGrupo } from "./SistemasEntrenamiento";
import { textoNivelRutina, textoObjetivoRutina } from "../../utils/rutinas";
import { SaludAlumno } from "./SaludAlumno";
import { BotonProgramar } from "../common/Programados";
import { TONO, TONO_NIVEL } from "./FormEjercicioPropio";

const sinT = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const puntaje = (m, q) => {
  const t = sinT(q);
  if (m.code != null && String(m.code) === t) return 0;
  if (sinT(m.codeLabel).replace("-", "") === t.replace("-", "")) return 0;
  if (sinT(m.fullName).startsWith(t)) return 1;
  return 2;
};

export const RutinasAsignadas = ({
  routines,
  members,
  plantillas,
  seleccionInicial,
  onEditar,
  onVer,
  onAsignar,
  onRestablecer,
  onPlantilla,
}) => {
  const [q, setQ] = useRecordado("asig_q", "");
  const [sel, setSel] = useState(seleccionInicial || "");
  const [vista, setVista] = useRecordado("asig_vista", ""); // "" (nada hasta elegir o escribir) · con · sin · todos
  const [rIdx, setRIdx] = useState(0);
  const [dia, setDia] = useState(0);
  const [plantillaElegida, setPlantillaElegida] = useState("");
  const buscador = useRef(null);
  const filaSel = useRef(null);

  useEffect(() => {
    if (seleccionInicial) setSel(String(seleccionInicial));
  }, [seleccionInicial]);
  useEffect(() => {
    setRIdx(0);
    setDia(0);
    setPlantillaElegida("");
  }, [sel]);
  useEffect(() => {
    filaSel.current?.scrollIntoView?.({ block: "nearest" });
  }, [sel]);

  // Rutinas de cada alumno: copias propias + (de antes) plantilla asignada directo
  const porAlumno = useMemo(() => {
    const mapa = new Map();
    const add = (mid, r) => {
      const k = String(mid);
      if (!mapa.has(k)) mapa.set(k, []);
      if (!mapa.get(k).some((x) => x.id === r.id)) mapa.get(k).push(r);
    };
    routines.forEach((r) => r.targetStudentId && add(r.targetStudentId, r));
    members.forEach((m) => {
      const r = m.assignedRoutineId && routines.find((x) => String(x.id) === String(m.assignedRoutineId));
      if (r) add(m.id, r);
    });
    return mapa;
  }, [routines, members]);

  const lista = useMemo(() => {
    let l = members.filter((m) => (vista === "todos" || !vista ? true : vista === "con" ? porAlumno.has(String(m.id)) : !porAlumno.has(String(m.id))));
    if (q.trim()) l = l.filter((m) => coincideAlumno(m, q)).sort((a, b) => puntaje(a, q) - puntaje(b, q));
    else l = [...l].sort((a, b) => (Number(a.code) || 0) - (Number(b.code) || 0));
    return l;
  }, [members, porAlumno, q, vista]);

  // Todas las rutinas para asignar: generales y (sin repetir) las ya creadas para otros alumnos
  const opcionesRutina = useMemo(() => {
    const limpio = (t) => String(t || "Rutina").replace(/\s*·\s*[^·]+$/, "");
    const vistas = new Set();
    const generales = [];
    const otras = [];
    routines.forEach((r) => {
      const titulo = r.targetStudentId ? limpio(r.title) : r.title || "Rutina";
      const clave = `${titulo.toLowerCase()}|${r.level}|${(r.days || []).length}`;
      if (vistas.has(clave)) return;
      vistas.add(clave);
      (r.targetStudentId ? otras : generales).push({ id: r.id, titulo, level: r.level, coach: r.trainerName || r.creadaPor || "" });
    });
    const orden = (a, b) => a.titulo.localeCompare(b.titulo);
    return { generales: generales.sort(orden), otras: otras.sort(orden) };
  }, [routines]);
  const conRutina = members.filter((m) => porAlumno.has(String(m.id))).length;
  const alumno = members.find((m) => String(m.id) === String(sel));
  const suyas = alumno ? porAlumno.get(String(alumno.id)) || [] : [];
  const rutina = suyas[Math.min(rIdx, suyas.length - 1)];
  const base = rutina?.baseRoutineId ? routines.find((r) => r.id === rutina.baseRoutineId) : null;
  const dias = rutina?.days || [];
  const d = dias[Math.min(dia, dias.length - 1)];
  const etq = etiquetasGrupo(d?.exercises || []);

  const ir = (m) => m && setSel(String(m.id));
  const buscarEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const exacto = members.find((m) => puntaje(m, q) === 0 && coincideAlumno(m, q));
    const m = exacto || lista[0];
    if (m) {
      const tiene = porAlumno.has(String(m.id));
      if ((vista === "con" && !tiene) || (vista === "sin" && tiene)) setVista("todos");
      ir(m);
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra horizontal: buscador + contadores + lista de alumnos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2.5">
        <div className="flex flex-wrap items-stretch gap-2">
        {/* Mismo estilo que el campo "Marcar asistencia" */}
        <div className="relative flex-1 min-w-[260px]">
          <input
            ref={buscador}
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value.trim() && vista) setVista(""); // al buscar se busca entre todos
            }}
            onKeyDown={buscarEnter}
            aria-label="Buscar alumno por código, nombre o DNI"
            className="rd-campo-checkin w-full h-full pl-9 pr-24 py-2.5 rounded-xl text-sm font-semibold focus:outline-none transition-all"
          />
          {!q && (
            <span className="absolute left-9 right-24 top-1/2 -translate-y-1/2 pointer-events-none text-sm text-slate-400 truncate">
              Buscar alumno: <b className="font-semibold">código (DF-1 o 1), nombre o DNI</b>
            </span>
          )}
          <UserCheck className="rd-icono-checkin w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <button
            type="button"
            onClick={() => buscarEnter({ key: "Enter", preventDefault() {} })}
            className="rd-boton-marcar absolute right-1 top-1 bottom-1 px-3 text-white text-xs font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" /> Ver
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
          {[
            ["con", "Con rutina", conRutina, "emerald"],
            ["sin", "Sin rutina", members.length - conRutina, "rose"],
            ["todos", "Todos", members.length, "blue"],
          ].map(([k, l, n, c]) => {
            const on = vista === k;
            const col = {
              emerald: on ? "bg-emerald-600 border-emerald-600 text-white" : "bg-emerald-50 border-emerald-200 text-emerald-800",
              rose: on ? "bg-rose-600 border-rose-600 text-white" : "bg-rose-50 border-rose-200 text-rose-800",
              blue: on ? "bg-blue-600 border-blue-600 text-white" : "bg-blue-50 border-blue-200 text-blue-800",
            }[c];
            return (
              <button key={k} type="button" onClick={() => {
                const nueva = vista === k && !q.trim() ? "" : k;
                setQ(""); // el contador muestra todo su grupo aunque haya texto en el buscador
                setVista(nueva);
                setSel("");
                if (nueva) setTimeout(() => document.getElementById("rd-lista-asignadas")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
              }} className={`rounded-xl border px-4 py-1.5 text-center cursor-pointer min-w-[6.5rem] ${col}`}>
                <span className="block text-xl font-black leading-none">{n}</span>
                <span className="block text-[11px] font-bold mt-0.5">{l}</span>
              </button>
            );
          })}
        </div>
        </div>
        {alumno && (
          <button type="button" onClick={() => setSel("")} className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50">
            ← Volver a la lista ({lista.length})
          </button>
        )}
      </div>

      {/* Lista de alumnos (hasta elegir uno) */}
      {!alumno && (vista || q.trim()) && (
        <div id="rd-lista-asignadas" className="bg-white rounded-2xl border border-slate-200 overflow-hidden scroll-mt-20">
          <div className="hidden md:grid grid-cols-[110px_minmax(0,1.3fr)_minmax(0,1.5fr)_140px_170px] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span>Código</span>
            <span>Alumno</span>
            <span>Rutina</span>
            <span>Estado</span>
            <span>Acción</span>
          </div>
          {lista.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">{q.trim() ? `Ningún alumno con «${q}».` : "No hay alumnos en este grupo."}</p>}
          <div className="divide-y divide-slate-100 max-h-[calc(100vh-20rem)] overflow-y-auto">
            {lista.map((m) => {
              const rs = porAlumno.get(String(m.id)) || [];
              const pers = rs.some((r) => r.personalizada);
              return (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => ir(m)}
                  onKeyDown={(e) => e.key === "Enter" && ir(m)}
                  className="w-full grid md:grid-cols-[110px_minmax(0,1.3fr)_minmax(0,1.5fr)_140px_170px] gap-1 md:gap-3 items-center px-4 py-2.5 text-left cursor-pointer hover:bg-blue-50/60 transition-colors"
                >
                  <span>
                    <CodigoAlumno m={m} />
                  </span>
                  <span className="text-sm font-bold text-slate-900 truncate">{m.fullName}</span>
                  <span className="text-xs text-slate-600 truncate">
                    {rs.length ? rs.map((r) => String(r.title || "").replace(/\s*·\s*[^·]+$/, "")).join(" · ") : "—"}
                  </span>
                  <span>
                    {rs.length ? (
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${pers ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                        {pers ? "Personalizada" : "✓ Con rutina"}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full border text-[11px] font-bold bg-rose-50 border-rose-200 text-rose-800">Sin rutina</span>
                    )}
                  </span>
                  <span onClick={(e) => e.stopPropagation()}>
                    {rs.length ? (
                      <span className="text-[11px] font-semibold text-slate-400">Ver rutina →</span>
                    ) : (
                      <BotonProgramar tipo="rutina" member={m} />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detalle del alumno */}
      <section className="min-w-0">
        {!alumno ? null : (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2">
                  <CodigoAlumno m={alumno} />
                  <span className="text-lg font-black text-slate-900">{alumno.fullName}</span>
                </p>
                {rutina && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {base ? (
                      <>
                        Basada en la rutina general «{base.title}» ·{" "}
                        {rutina.personalizada ? <b className="text-amber-700">personalizada para este alumno</b> : "sigue los cambios de la rutina general"}
                      </>
                    ) : rutina.targetStudentId ? (
                      "Rutina hecha para este alumno"
                    ) : (
                      <b className="text-amber-700">Usa la rutina general directamente (editar aquí le crea su propia copia)</b>
                    )}
                  </p>
                )}
              </div>
              {rutina && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => onVer(rutina)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Eye className="w-3.5 h-3.5 text-blue-600" /> Ver / Imprimir
                  </button>
                  {base && rutina.personalizada && (
                    <button
                      type="button"
                      onClick={() => confirm(`¿Volver a la rutina general «${base.title}»? Se pierden los ajustes de ${alumno.fullName}.`) && onRestablecer(rutina, base)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Volver a la rutina general
                    </button>
                  )}
                  <button type="button" onClick={() => onEditar(rutina, alumno)} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" /> Editar solo para {String(alumno.fullName || "").split(" ")[0]}
                  </button>
                </div>
              )}
            </div>

            <SaludAlumno member={alumno} abiertoInicial={true} />

            {suyas.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {suyas.map((r, i) => (
                  <button key={r.id} type="button" onClick={() => { setRIdx(i); setDia(0); }} className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${i === rIdx ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700"}`}>
                    {r.title}
                  </button>
                ))}
              </div>
            )}

            {rutina ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${TONO[TONO_NIVEL[rutina.level || "intermedio"] || "slate"][0]}`}>{textoNivelRutina(rutina.level)}</span>
                  <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-semibold">{textoObjetivoRutina(rutina.objective)}</span>
                  <span className="text-sm font-black text-slate-900">{rutina.title}</span>
                  {(rutina.trainerName || rutina.creadaPor) && (
                    <span className="text-[11px] text-slate-500">
                      · {rutina.trainerName ? `Entrenador: ${rutina.trainerName}` : ""}
                      {rutina.creadaPor && rutina.creadaPor !== rutina.trainerName ? ` · creada por ${rutina.creadaPor}` : ""}
                    </span>
                  )}
                  {rutina.actualizadaEn && <span className="text-[11px] text-slate-500">· actualizada {String(rutina.actualizadaEn).slice(0, 16)}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dias.map((x, i) => (
                    <button key={i} type="button" onClick={() => setDia(i)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer flex items-center gap-1.5 ${i === dia ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-700"}`}>
                      {x.dayName || `Día ${i + 1}`} <span className="opacity-70">({(x.exercises || []).length})</span>
                    </button>
                  ))}
                </div>
                {d && (
                  <div className="space-y-2">
                    {(d.tipo || d.focus) && (
                      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <InsigniaTipoDia tipo={d.tipo} />
                        {d.focus}
                      </p>
                    )}
                    <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-2">
                      {(d.exercises || []).map((ex, i) => (
                        <div key={i} className={`flex gap-3 rounded-xl border p-2.5 ${ex.metodo?.grupo ? "border-violet-300 border-l-4 border-l-violet-500" : "border-slate-200"}`}>
                          <div className="relative shrink-0">
                            <span className="absolute top-0.5 left-0.5 z-10 min-w-5 h-5 px-1 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">{etq[i] || i + 1}</span>
                            <ExerciseThumb ex={{ ...ex, name: ex.exerciseName }} className="w-16 h-16 rounded-lg border border-slate-200" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 leading-tight">{ex.exerciseName}</p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              <b className="text-blue-700">{ex.sets} × {ex.reps}</b> · descanso {ex.restSeconds}s{ex.rir ? ` · ${ex.rir}` : ""} · {MUSCLE_LABELS[ex.muscleGroup] || ex.muscleGroup}
                            </p>
                            <InsigniaMetodo metodo={ex.metodo} etiqueta={etq[i]} className="mt-1" />
                            {ex.notes && <p className="text-[11px] text-amber-800 mt-1">Nota: {ex.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {/* Asignar (o cambiar) plantilla rápido */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 flex flex-wrap items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-bold text-blue-900">{rutina ? "Asignar otra rutina:" : "Este alumno no tiene rutina. Asignar rutina:"}</span>
              <select value={plantillaElegida} onChange={(e) => setPlantillaElegida(e.target.value)} className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm">
                <option value="">Elegir rutina…</option>
                {opcionesRutina.generales.length > 0 && (
                  <optgroup label="Rutinas generales">
                    {opcionesRutina.generales.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo} · {textoNivelRutina(p.level)}{p.coach ? ` · ${p.coach}` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {opcionesRutina.otras.length > 0 && (
                  <optgroup label="Otras rutinas ya creadas (se copia)">
                    {opcionesRutina.otras.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo} · {textoNivelRutina(p.level)}{p.coach ? ` · ${p.coach}` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                type="button"
                disabled={!plantillaElegida}
                onClick={() => {
                  onAsignar(alumno.id, plantillaElegida);
                  setPlantillaElegida("");
                  setRIdx(0);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                Asignar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
