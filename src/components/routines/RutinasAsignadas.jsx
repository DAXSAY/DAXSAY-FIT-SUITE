// "Rutinas asignadas": alumnos con su rutina personal, separado de las plantillas.
// Se busca por CÓDIGO (DF-12 o 12), nombre o DNI → Enter lleva directo al alumno.
// Aquí "Editar" cambia SOLO la rutina de ese alumno.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CopyPlus, Eye, Pencil, RotateCcw, Search, UserCheck, UserPlus, Users } from "lucide-react";
import { CodigoAlumno, coincideAlumno } from "../common/BuscarAlumno";
import { ExerciseThumb, MUSCLE_LABELS } from "./ExerciseBank";
import { InsigniaMetodo, InsigniaTipoDia, etiquetasGrupo } from "./SistemasEntrenamiento";
import { textoNivelRutina, textoObjetivoRutina } from "../../utils/rutinas";

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
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(seleccionInicial || "");
  const [verSinRutina, setVerSinRutina] = useState(false);
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
    let l = members.filter((m) => verSinRutina || porAlumno.has(String(m.id)));
    if (q.trim()) l = l.filter((m) => coincideAlumno(m, q)).sort((a, b) => puntaje(a, q) - puntaje(b, q));
    else l = [...l].sort((a, b) => (Number(a.code) || 0) - (Number(b.code) || 0));
    return l;
  }, [members, porAlumno, q, verSinRutina]);

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
      if (!porAlumno.has(String(m.id))) setVerSinRutina(true);
      ir(m);
    }
  };

  return (
    <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
      {/* Lista de alumnos */}
      <aside className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 lg:sticky lg:top-24">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={buscador}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={buscarEnter}
            placeholder="Código del alumno (DF-12 o 12), nombre o DNI · Enter"
            className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-blue-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-600"
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">
            <Users className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-violet-600" />
            {conRutina} alumno(s) con rutina
          </span>
          <button
            type="button"
            onClick={() => setVerSinRutina((v) => !v)}
            className={`px-2 py-1 rounded-full border font-bold cursor-pointer ${verSinRutina ? "bg-violet-600 border-violet-600 text-white" : "bg-violet-50 border-violet-200 text-violet-800"}`}
          >
            {verSinRutina ? "Todos los alumnos" : "+ sin rutina"}
          </button>
        </div>
        <div className="max-h-[calc(100vh-17rem)] min-h-[200px] overflow-y-auto -mx-1 px-1 space-y-1">
          {lista.length === 0 && <p className="text-sm text-slate-500 text-center py-6">Ningún alumno con «{q}».</p>}
          {lista.map((m) => {
            const rs = porAlumno.get(String(m.id)) || [];
            const on = String(m.id) === String(sel);
            return (
              <button
                key={m.id}
                ref={on ? filaSel : null}
                type="button"
                onClick={() => ir(m)}
                className={`w-full text-left rounded-xl border px-2.5 py-2 cursor-pointer transition-colors ${on ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 hover:border-blue-300"}`}
              >
                <span className="flex items-center gap-2">
                  <span className={on ? "" : ""}>
                    <CodigoAlumno m={m} />
                  </span>
                  <span className={`flex-1 min-w-0 truncate text-sm font-bold ${on ? "text-white" : "text-slate-900"}`}>{m.fullName}</span>
                </span>
                <span className={`block mt-0.5 text-[11px] truncate ${on ? "text-blue-100" : "text-slate-500"}`}>
                  {rs.length ? rs.map((r) => `${r.title}${r.personalizada ? " ✎" : ""}`).join(" · ") : "Sin rutina"}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Detalle del alumno */}
      <section className="min-w-0">
        {!alumno ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-800">Escribe el código del alumno y presiona Enter</p>
            <p className="text-sm text-slate-500">o elígelo de la lista. Aquí verás y editarás solo su rutina.</p>
          </div>
        ) : (
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
                        Basada en la plantilla «{base.title}» ·{" "}
                        {rutina.personalizada ? <b className="text-amber-700">personalizada para este alumno</b> : "sigue los cambios de la plantilla"}
                      </>
                    ) : rutina.targetStudentId ? (
                      "Rutina hecha para este alumno"
                    ) : (
                      <b className="text-amber-700">Usa la plantilla general directamente (editar aquí le crea su propia copia)</b>
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
                      onClick={() => confirm(`¿Volver a la plantilla «${base.title}»? Se pierden los ajustes de ${alumno.fullName}.`) && onRestablecer(rutina, base)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Volver a la plantilla
                    </button>
                  )}
                  {!base && rutina.targetStudentId && (
                    <button type="button" onClick={() => onPlantilla(rutina)} className="px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-800 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-violet-100" title="Copiarla como plantilla general para asignarla a otros">
                      <CopyPlus className="w-3.5 h-3.5" /> Guardar como plantilla
                    </button>
                  )}
                  <button type="button" onClick={() => onEditar(rutina, alumno)} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" /> Editar solo para {String(alumno.fullName || "").split(" ")[0]}
                  </button>
                </div>
              )}
            </div>

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
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    {textoNivelRutina(rutina.level)} • {textoObjetivoRutina(rutina.objective)}
                  </span>
                  <span className="text-sm font-black text-slate-900">{rutina.title}</span>
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
                    <div className="grid xl:grid-cols-2 gap-2">
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
              <span className="text-xs font-bold text-blue-900">{rutina ? "Asignar otra plantilla:" : "Este alumno no tiene rutina. Asignar plantilla:"}</span>
              <select value={plantillaElegida} onChange={(e) => setPlantillaElegida(e.target.value)} className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-sm">
                <option value="">Elegir plantilla…</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {textoNivelRutina(p.level)}
                  </option>
                ))}
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
