import React, { useState, useMemo, useRef, useEffect } from "react";
import { BarraVolver } from "../common/BarraVolver";
import {
  Dumbbell,
  Save,
  Plus,
  Layers,
  Sparkles,
  Trash2,
  Check,
  Printer,
  UserCheck,
  Video,
  PlayCircle,
  ExternalLink,
  Eye,
  Pencil,
  Users,
  ArrowLeft,
  X,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import {
  useExerciseBank,
  ExerciseLibrary,
  ExerciseDetail,
  ExercisePicker,
  ExerciseThumb,
  MUSCLE_LABELS,
} from "./ExerciseBank";

import { OBJETIVOS_RUTINA, NIVELES_RUTINA, textoObjetivoRutina, textoNivelRutina } from "../../utils/rutinas";
import { SelectorAlumno } from "../common/BuscarAlumno";
import { avisoBreve } from "../../utils/avisoBreve";
import { BotonesDescarga } from "../common/BotonesDescarga";
import {
  ConfigEjercicio,
  InsigniaMetodo,
  InsigniaTipoDia,
  SelectorTipoDia,
  alternarCompanero,
  cambiarMetodo,
  etiquetasGrupo,
} from "./SistemasEntrenamiento";
import { FormEjercicioPropio, TONO, TONO_NIVEL } from "./FormEjercicioPropio";
import { RutinasAsignadas } from "./RutinasAsignadas";
import { BancoFlotante } from "./BancoFlotante";
import { SinSeleccion } from "../common/CabeceraModulo";
import { CabeceraModulo, AccionCabecera } from "../common/CabeceraModulo";
import { useRecordado } from "../../utils/subPestana";
import { GuiaSesion } from "./GuiaSesion";
import { SaludAlumno } from "./SaludAlumno";
import { IconoEmoji, ConIconos } from "../common/IconoEmoji";
import { HojaRutina } from "./HojaRutina";
export const RoutinesAndExercises = () => {
  const {
    exercises,
    routines,
    trainers,
    members,
    addExercise,
    updateExercise,
    deleteExercise,
    addRoutine,
    updateRoutine,
    updateRoutineGeneral,
    deleteRoutine,
    assignRoutineToMember,
  } = useGym();

  // El progreso de pesos de los alumnos ahora está en Metas & Logros
  const [activeSubTab, setActiveSubTab] = useRecordado("rutinas", "");

  // Exercise Filters
  const [selectedMuscle, setSelectedMuscle] = useState("all");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExerciseModal, setSelectedExerciseModal] = useState(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState(null);

  // New Exercise Modal
  const [isNewExerciseOpen, setIsNewExerciseOpen] = useState(false);
  // Active Routine Viewer / Printable Modal
  const [viewingRoutine, setViewingRoutine] = useState(null);

  // Routine Assign Modal
  const [assigningRoutine, setAssigningRoutine] = useState(null);
  const [studentToAssignId, setStudentToAssignId] = useState("");

  // Routine Builder State
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineDesc, setRoutineDesc] = useState("");
  const [routineLevel, setRoutineLevel] = useState("intermedio");
  const [routineObjective, setRoutineObjective] = useState("hipertrofia");
  const [routineTrainerId, setRoutineTrainerId] = useState(
    trainers[0]?.id || "",
  );
  const [routineTargetMemberId, setRoutineTargetMemberId] = useState("");

  const [routineDays, setRoutineDays] = useState([
    { dayName: "Día 1", focus: "", notes: "", tipo: "", exercises: [] },
  ]);
  // Edición: null = rutina nueva · { id, modo: "general" | "alumno", alumno }
  const [editando, setEditando] = useState(null);
  const [incluirPersonalizadas, setIncluirPersonalizadas] = useState(false);
  const [alumnoSel, setAlumnoSel] = useState("");
  const [filtroRut, setFiltroRut] = useState("todas");
  const [buscarRut, setBuscarRut] = useState("");
  const [entrenadorRut, setEntrenadorRut] = useState("");
  const plantillas = useMemo(() => routines.filter((r) => !r.targetStudentId), [routines]);
  const conRutina = useMemo(() => {
    const ids = new Set(routines.filter((r) => r.targetStudentId).map((r) => String(r.targetStudentId)));
    members.forEach((m) => m.assignedRoutineId && routines.some((r) => String(r.id) === String(m.assignedRoutineId)) && ids.add(String(m.id)));
    return ids.size;
  }, [routines, members]);
  const irAAlumno = (id) => {
    setAlumnoSel(String(id));
    setActiveSubTab("asignadas");
  };
  // Día al que se agrega el "ejercicio propio" recién creado
  const [propioParaDia, setPropioParaDia] = useState(null);

  // Banco de ejercicios (GIF) + ejercicios propios del gimnasio
  const bank = useExerciseBank();
  const allExercises = useMemo(
    () => [
      ...exercises.map((e) => ({ ...e, gifUrl: e.gifUrl || e.videoUrl, custom: true })),
      ...bank,
    ],
    [exercises, bank],
  );

  // Helper to extract clean youtube embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes("youtube.com/watch?v=")) {
      const id = url.split("watch?v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  // Exercise list filtering
  const filteredExercises = exercises.filter((ex) => {
    const matchesMuscle =
      selectedMuscle === "all" || ex.muscleGroup === selectedMuscle;
    const matchesSearch =
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.instructions.toLowerCase().includes(exerciseSearch.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  const muscleLabels = MUSCLE_LABELS;

  // Copias por alumno de una plantilla (y alumnos con la plantilla directa, de antes)
  const copiasDe = (id) => routines.filter((r) => r.baseRoutineId === id);
  const asignadosDe = (routine) => {
    const copias = copiasDe(routine.id).map((c) => ({
      id: c.targetStudentId,
      nombre: c.targetStudentName || members.find((m) => String(m.id) === String(c.targetStudentId))?.fullName || "Alumno",
      copia: c,
    }));
    const ya = new Set(copias.map((c) => String(c.id)));
    const directos = members
      .filter((m) => String(m.assignedRoutineId) === String(routine.id) && !ya.has(String(m.id)) && String(m.id) !== String(routine.targetStudentId))
      .map((m) => ({ id: m.id, nombre: m.fullName, copia: null }));
    return [...copias, ...directos];
  };

  const limpiarCreador = () => {
    setRoutineTitle("");
    setRoutineDesc("");
    setRoutineLevel("intermedio");
    setRoutineObjective("hipertrofia");
    setRoutineTrainerId(trainers[0]?.id || "");
    setRoutineTargetMemberId("");
    setRoutineDays([{ dayName: "Día 1", focus: "", notes: "", tipo: "", exercises: [] }]);
    setEditando(null);
    setIncluirPersonalizadas(false);
  };
  // ---- Cambios sin guardar en el creador ----
  const estadoCreador = JSON.stringify({ routineTitle, routineDesc, routineLevel, routineObjective, routineTrainerId, routineTargetMemberId, routineDays });
  const fotoCreador = useRef(null);
  useEffect(() => {
    if (activeSubTab === "builder") {
      if (fotoCreador.current === null) fotoCreador.current = estadoCreador;
    } else fotoCreador.current = null;
  }, [activeSubTab, estadoCreador]);
  const creadorSucio = activeSubTab === "builder" && fotoCreador.current !== null && fotoCreador.current !== estadoCreador;
  const [salidaPendiente, setSalidaPendiente] = useState(null);
  const salirDelCreador = (ir) => {
    if (creadorSucio) return setSalidaPendiente(() => ir);
    if (editando) limpiarCreador();
    setBancoDestino(null);
    ir();
  };
  useEffect(() => {
    if (!creadorSucio) return;
    const aviso = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [creadorSucio]);

  const nuevaRutina = () => {
    limpiarCreador();
    setActiveSubTab("builder");
  };
  const abrirEditor = (r, modo = "general") => {
    if (!r) return;
    setRoutineTitle(r.title || "");
    setRoutineDesc(r.description || "");
    setRoutineLevel(r.level || "intermedio");
    setRoutineObjective(r.objective || "hipertrofia");
    setRoutineTrainerId(r.trainerId || "");
    setRoutineTargetMemberId(r.targetStudentId || "");
    setRoutineDays(
      JSON.parse(JSON.stringify(r.days?.length ? r.days : [{ dayName: "Día 1", focus: "", exercises: [] }])).map((d) => ({
        tipo: "",
        ...d,
        exercises: d.exercises || [],
      })),
    );
    setEditando({ id: r.id, modo, alumno: r.targetStudentName || "", base: r.baseRoutineId || null });
    setIncluirPersonalizadas(false);
    setActiveSubTab("builder");
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };
  // Editar solo para un alumno: si aún no tiene copia propia, se crea
  const editarParaAlumno = (rutina, alumno) => {
    setAlumnoSel(String(alumno.id));
    const copia = rutina.targetStudentId ? rutina : assignRoutineToMember(alumno.id, rutina.id);
    if (copia) abrirEditor(copia, "alumno");
  };

  const guardarEjercicioPropio = (ej) => {
    const nuevo = addExercise(ej);
    setIsNewExerciseOpen(false);
    if (nuevo && propioParaDia != null) handleAddExerciseToDay(propioParaDia, { ...nuevo, custom: true });
    setPropioParaDia(null);
    avisoBreve(`✓ Ejercicio «${ej.name}» agregado al banco`);
  };

  // Add new day to routine builder
  const handleAddDay = () => {
    const nextDayNum = routineDays.length + 1;
    setRoutineDays((prev) => [
      ...prev,
      {
        dayName: `Día ${nextDayNum}`,
        focus: "",
        tipo: "",
        exercises: [],
      },
    ]);
  };

  // Remove day from routine builder
  const handleRemoveDay = (dayIndex) => {
    setRoutineDays((prev) => prev.filter((_, i) => i !== dayIndex));
  };

  // Add exercise to day in builder
  const handleAddExerciseToDay = (dayIndex, exerciseOrId) => {
    const exObj = typeof exerciseOrId === "object" ? exerciseOrId : allExercises.find((e) => e.id === exerciseOrId);
    if (!exObj) return;

    const nuevo = ejercicioNuevo(exObj);
    // Actualización inmutable (evita que se agregue dos veces)
    setRoutineDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, exercises: [...d.exercises, nuevo] } : d)),
    );
  };
  const ejercicioNuevo = (exObj) => ({
      exerciseId: exObj.id,
      exerciseName: exObj.name,
      muscleGroup: exObj.muscleGroup,
      sets: exObj.defaultSets || 4,
      reps: exObj.defaultReps || "10-12",
      rir: "RIR 1-2",
      restSeconds: exObj.defaultRest || 60,
      metodo: null,
      notes: "",
      gifUrl: exObj.gifUrl,
      thumbnailUrl: exObj.thumbnailUrl,
      steps: exObj.steps || [],
  });
  // Agrega un ejercicio del banco justo debajo y lo une al mismo grupo (biserie, circuito…)
  const agregarCompanero = (dayIndex, exIndex, exObj) =>
    setRoutineDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const lista = [...d.exercises];
        lista.splice(exIndex + 1, 0, ejercicioNuevo(exObj));
        return { ...d, exercises: alternarCompanero(lista, exIndex, exIndex + 1) };
      }),
    );
  // Banco flotante: null = cerrado · { dia, combinarCon? }
  const [bancoDestino, setBancoDestino] = useState(null);

  // Remove exercise from day in builder
  const handleRemoveExerciseFromDay = (dayIndex, exIndex) => {
    setRoutineDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, exercises: d.exercises.filter((_, k) => k !== exIndex) } : d,
      ),
    );
  };

  // Save routine from builder
  const handleSaveRoutine = (e) => {
    e.preventDefault();
    if (!routineTitle.trim()) {
      alert("Por favor asigna un título a la rutina.");
      return;
    }

    const trainerObj = trainers.find((t) => t.id === routineTrainerId);
    const memberObj = members.find((m) => m.id === routineTargetMemberId);

    const datos = {
      title: routineTitle.trim(),
      description:
        routineDesc.trim() || "Rutina personalizada diseñada en RADICAL.",
      level: routineLevel,
      objective: routineObjective,
      trainerId: routineTrainerId || undefined,
      trainerName: trainerObj?.name,
      targetStudentId: routineTargetMemberId || undefined,
      targetStudentName: memberObj?.fullName,
      days: routineDays,
    };
    const volver = editando?.modo === "alumno" ? "asignadas" : "routines";
    if (!editando) {
      addRoutine(datos);
      if (datos.targetStudentId) setAlumnoSel(String(datos.targetStudentId));
    } else if (editando.modo === "alumno") {
      // Solo para este alumno: su copia queda marcada como personalizada
      updateRoutine(editando.id, { ...datos, personalizada: true });
    } else {
      const n = updateRoutineGeneral(editando.id, datos, { incluirPersonalizadas });
      if (n) setTimeout(() => avisoBreve(`✓ Cambios aplicados también a ${n} alumno(s) con esta rutina`), 900);
    }
    setEditando(null);


    setActiveSubTab(!editando && datos.targetStudentId ? "asignadas" : volver);
  };

  const handleConfirmAssignment = (e) => {
    e.preventDefault();
    if (!assigningRoutine || !studentToAssignId) return;

    assignRoutineToMember(studentToAssignId, assigningRoutine.id);
    const alumnoAsignado = members.find((m) => String(m.id) === String(studentToAssignId));
    avisoBreve(`✓ Rutina asignada a ${alumnoAsignado?.fullName || "el alumno"}`);
    setAssigningRoutine(null);
    setStudentToAssignId("");

  };

  return (
    <div className="space-y-4">
      {(() => {
        const cambiarSeccion = (k) => {
          const ir = () => {
            if (k === "asignadas") setAlumnoSel("");
            if (k === "builder" && !editando) nuevaRutina();
            else setActiveSubTab(k);
          };
          if (activeSubTab === "builder" && k !== "builder") salirDelCreador(ir);
          else ir();
        };
        return (
          <CabeceraModulo
            icono={Dumbbell}
            etiqueta="Entrenamiento"
            titulo="Rutinas y ejercicios"
            descripcion="Crea rutinas, asígnalas a tus alumnos y ajústalas a cada uno."
            accion={
              <AccionCabecera icono={editando ? Pencil : Plus} onClick={() => cambiarSeccion("builder")}>
                {editando ? "Seguir editando" : "Crear rutina"}
              </AccionCabecera>
            }
            activa={activeSubTab}
            onCambiar={cambiarSeccion}
            pestanas={[
              { k: "routines", icono: Layers, label: "Rutinas", badge: routines.length, tono: "teal" },
              { k: "asignadas", icono: Users, label: "Rutinas asignadas", badge: conRutina, tono: "violet" },
              { k: "exercises", icono: Dumbbell, label: "Banco de ejercicios", badge: allExercises.length, tono: "emerald" },
            ]}
          />
        );
      })()}

      {/* SUBTAB 1: ROUTINES LIST */}
      {!activeSubTab && <SinSeleccion tema="rutinas" texto="Elige una opción de arriba o toca «Crear rutina»." />}

      {activeSubTab === "routines" && (
        <div className="space-y-4">
          {routines.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <Dumbbell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800">Aún no hay rutinas</p>
              <p className="text-sm text-slate-500 mb-4">
                Crea una con el banco de ejercicios, o en <b>Rutinas asignadas</b> usa «Guardar como rutina general» sobre la rutina de un alumno.
              </p>
              <button
                onClick={nuevaRutina}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold cursor-pointer"
              >
                Crear rutina
              </button>
            </div>
          )}
          {(() => {
            const q = buscarRut.trim().toLowerCase();
            const autor = (r) => r.trainerName || r.creadaPor || "Sin entrenador";
            const entrenadores = [...new Set(routines.map(autor))].sort();
            const porEntrenador = routines.filter((r) => !entrenadorRut || autor(r) === entrenadorRut);
            const visibles = porEntrenador
              .filter((r) => filtroRut === "todas" || (r.level || "intermedio") === filtroRut)
              .filter((r) => !q || String(r.title || "").toLowerCase().includes(q));
            return (
              <>
                {routines.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1">Nivel</span>
                      {[["todas", "📋", "Todas"], ...NIVELES_RUTINA].map(([k, ic, l]) => {
                        const n = k === "todas" ? porEntrenador.length : porEntrenador.filter((r) => (r.level || "intermedio") === k).length;
                        // Solo los niveles que tienen rutinas (como en Nutrición y Fisioterapia)
                        if (k !== "todas" && n === 0 && filtroRut !== k) return null;
                        return (
                          <button key={k} type="button" onClick={() => setFiltroRut(k)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${filtroRut === k ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`}>
                            <IconoEmoji e={ic} /> {l} <span className="opacity-70">{n}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Entrenador</span>
                      <select value={entrenadorRut} onChange={(e) => setEntrenadorRut(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-semibold">
                        <option value="">Todos los entrenadores ({routines.length})</option>
                        {entrenadores.map((t) => (
                          <option key={t} value={t}>
                            {t} ({routines.filter((r) => autor(r) === t).length})
                          </option>
                        ))}
                      </select>
                      <input value={buscarRut} onChange={(e) => setBuscarRut(e.target.value)} placeholder="Buscar por nombre de rutina…" className="flex-1 min-w-[200px] max-w-sm px-3 py-1.5 bg-white border border-slate-300 rounded-full text-xs focus:outline-none focus:border-blue-600" />
                      <span className="text-xs text-slate-500">{visibles.length} rutina(s)</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {visibles.map((routine) => {
                    const assignedStudent = members.find((m) => String(m.id) === String(routine.targetStudentId));
                    const totalExercises = (routine.days || []).reduce((sum, d) => sum + (d.exercises || []).length, 0);
                    const asignados = routine.targetStudentId ? [] : asignadosDe(routine);
                    const base = routine.baseRoutineId ? routines.find((r) => r.id === routine.baseRoutineId) : null;
                    const tiposDia = [...new Set((routine.days || []).map((d) => d.tipo).filter(Boolean))];
                    const nivelR = NIVELES_RUTINA.find(([k]) => k === (routine.level || "intermedio"));
                    const tonoN = TONO[TONO_NIVEL[routine.level || "intermedio"] || "slate"];
                    const objetivoR = OBJETIVOS_RUTINA.find(([k]) => k === routine.objective);
                    const tituloR = routine.targetStudentId ? String(routine.title || "").replace(/\s*·\s*[^·]+$/, "") : routine.title;
                    const barra = { emerald: "border-l-emerald-500", sky: "border-l-sky-500", amber: "border-l-amber-500", rose: "border-l-rose-500", violet: "border-l-violet-500" }[TONO_NIVEL[routine.level || "intermedio"]] || "border-l-slate-400";
                    return (
                      <div
                        key={routine.id}
                        className={`bg-white border border-gray-200 border-l-4 ${barra} hover:shadow-md rounded-2xl p-4 flex flex-col justify-between transition-all shadow-xs group`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {nivelR && <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${tonoN[0]}`}><ConIconos texto={`${nivelR[1]} ${nivelR[2]}`} /></span>}
                            {objetivoR && <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-semibold"><ConIconos texto={`${objetivoR[1]} ${objetivoR[2]}`} /></span>}
                          </div>

                          <h3 className="text-base font-black text-slate-900 mt-2 leading-tight group-hover:text-blue-600 transition-colors">{tituloR}</h3>
                          {routine.description && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{routine.description}</p>}
                          {tiposDia.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tiposDia.map((t) => (
                                <InsigniaTipoDia key={t} tipo={t} />
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                            <div className="rounded-xl bg-slate-50 border border-slate-100 py-1.5">
                              <span className="block text-base font-black text-slate-900 leading-none">{totalExercises}</span>
                              <span className="text-[10px] font-semibold text-slate-500">ejercicios</span>
                            </div>
                            <div className="rounded-xl bg-slate-50 border border-slate-100 py-1.5">
                              <span className="block text-base font-black text-slate-900 leading-none">{(routine.days || []).length}</span>
                              <span className="text-[10px] font-semibold text-slate-500">días / sem</span>
                            </div>
                            <div className="rounded-xl bg-slate-50 border border-slate-100 py-1.5 px-1 min-w-0">
                              <span className="block text-[11px] font-black text-blue-700 leading-tight truncate" title={routine.trainerName || routine.creadaPor || ""}>
                                {routine.trainerName || routine.creadaPor || "—"}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500">coach</span>
                            </div>
                          </div>
                          {routine.creadaPor && routine.creadaPor !== routine.trainerName && (
                            <p className="text-[11px] text-slate-500 mt-1.5">Creada por {routine.creadaPor}</p>
                          )}

                          <div className="mt-2 text-xs">
                            {routine.targetStudentId ? null : (
                              <div>
                                <details className="rounded-xl bg-white border border-violet-200">
                                  <summary className="px-2 py-1.5 cursor-pointer select-none font-bold text-violet-800 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" /> Asignada a {asignados.length} alumno(s)
                                  </summary>
                                  <div className="px-2 pb-2 space-y-1">
                                    {asignados.length === 0 ? (
                                      <p className="text-[11px] text-slate-500 italic">Aún nadie. Usa «Asignar».</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {asignados.map((a) => (
                                          <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => irAAlumno(a.id)}
                                            className="px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-800 text-[11px] font-bold hover:bg-violet-100 cursor-pointer"
                                            title="Ver su rutina"
                                          >
                                            {a.nombre.split(" ").slice(0, 2).join(" ")}
                                            {a.copia?.personalizada ? " ✎" : ""}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingRoutine(routine)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-slate-800 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>Ver / Imprimir</span>
                            </button>
                            <button
                              onClick={() => (routine.targetStudentId ? editarParaAlumno(routine, { id: routine.targetStudentId }) : abrirEditor(routine, "general"))}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                              title={routine.targetStudentId ? "Editar solo la rutina de este alumno" : "Editar la rutina general (llega a todos sus alumnos)"}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setAssigningRoutine(routine)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Asignar a un alumno"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Asignar</span>
                            </button>
                            <button
                              onClick={() => {
                                const n = copiasDe(routine.id).length;
                                if (confirm(`¿Eliminar la rutina "${routine.title}"?${n ? `\n\nSus ${n} copia(s) por alumno se mantienen.` : ""}`)) {
                                  deleteRoutine(routine.id);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Eliminar rutina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* SUBTAB: RUTINAS ASIGNADAS (por alumno, búsqueda por código) */}
      {activeSubTab === "asignadas" && (
        <RutinasAsignadas
          routines={routines}
          members={members}
          plantillas={plantillas}
          seleccionInicial={alumnoSel}
          onVer={setViewingRoutine}
          onEditar={editarParaAlumno}
          onAsignar={(mid, rid) => {
            assignRoutineToMember(mid, rid);
            const a = members.find((m) => String(m.id) === String(mid));
            avisoBreve(`✓ Rutina asignada a ${a?.fullName || "el alumno"}`);
          }}
          onPlantilla={(r) => {
            const { id, targetStudentId, targetStudentName, baseRoutineId, personalizada, cambios, actualizadaEn, actualizadaPor, actualizadaPorId, ultimoCambio, ...resto } = r;
            const titulo = String(r.title || "Rutina").replace(/\s*·\s*[^·]+$/, "");
            addRoutine({ ...resto, title: titulo, days: JSON.parse(JSON.stringify(r.days || [])) });
            avisoBreve(`✓ «${titulo}» guardada como rutina general`);
          }}
          onRestablecer={(r, base) =>
            updateRoutine(r.id, {
              days: JSON.parse(JSON.stringify(base.days || [])),
              level: base.level,
              objective: base.objective,
              description: base.description,
              personalizada: false,
            })
          }
        />
      )}

      {/* SUBTAB 2: BANCO DE EJERCICIOS */}
      {activeSubTab === "exercises" && (
        <ExerciseLibrary
          exercises={allExercises}
          onOpen={setSelectedExerciseModal}
          onNew={() => setIsNewExerciseOpen(true)}
        />
      )}

      {/* SUBTAB 3: ROUTINE BUILDER WIZARD */}
      {salidaPendiente && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-label="Cambios sin guardar" data-sin-controles>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Save className="w-5 h-5" />
              </span>
              <div>
                <p className="text-base font-extrabold text-slate-900">¿Guardar los cambios?</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  {editando ? "Modificaste esta rutina y aún no la guardas." : "Tienes una rutina a medio crear sin guardar."} Si sales ahora, se pierden.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={() => setSalidaPendiente(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50">
                Seguir editando
              </button>
              <button
                type="button"
                onClick={() => {
                  const ir = salidaPendiente;
                  setSalidaPendiente(null);
                  fotoCreador.current = null;
                  limpiarCreador();
                  setBancoDestino(null);
                  ir();
                }}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-bold cursor-pointer hover:bg-rose-100"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSalidaPendiente(null);
                  setBancoDestino(null);
                  handleSaveRoutine({ preventDefault() {} });
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-extrabold cursor-pointer"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "builder" && (
        <BancoFlotante
          exercises={allExercises}
          destino={bancoDestino}
          setDestino={setBancoDestino}
          dias={routineDays.map((d) => ({ nombre: d.dayName, tipo: d.tipo, ids: (d.exercises || []).map((e) => e.exerciseId) }))}
          onAgregar={(dia, ex) => handleAddExerciseToDay(dia, ex)}
          onCombinar={(dia, idx, ex) => agregarCompanero(dia, idx, ex)}
          onPropio={(dia) => {
            setBancoDestino(null);
            setPropioParaDia(dia);
            setIsNewExerciseOpen(true);
          }}
        />
      )}

      {activeSubTab === "builder" && (
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs space-y-5 text-slate-800">
          <BarraVolver
            onVolver={() => salirDelCreador(() => setActiveSubTab("routines"))}
            className="border-b border-gray-200 pb-3"
            titulo={
              <>
                <span className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" /> Creador Interactivo de Rutinas para Entrenadores
                </span>
                Diseñar programa personalizado (series, repeticiones y descansos)
              </>
            }
          />

          {editando && (() => {
            const n = editando.modo === "general" ? copiasDe(editando.id).length : 0;
            const pers = editando.modo === "general" ? copiasDe(editando.id).filter((c) => c.personalizada).length : 0;
            return editando.modo === "general" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex flex-wrap items-center gap-3">
                <Pencil className="w-4 h-4 text-amber-700 shrink-0" />
                <div className="flex-1 min-w-[220px] text-xs text-amber-900">
                  <b>Editando la rutina general.</b>{" "}
                  {n ? `Al guardar, el cambio llega a ${n - pers} alumno(s) que la tienen asignada (su portal se actualiza y reciben aviso).` : "Aún no tiene alumnos asignados."}
                  {pers > 0 && (
                    <label className="mt-1.5 flex items-center gap-1.5 font-semibold cursor-pointer">
                      <input type="checkbox" checked={incluirPersonalizadas} onChange={(e) => setIncluirPersonalizadas(e.target.checked)} className="accent-amber-600 w-4 h-4" />
                      También reemplazar las {pers} copia(s) personalizadas (se pierden sus ajustes individuales)
                    </label>
                  )}
                </div>
                <button type="button" onClick={() => { limpiarCreador(); setActiveSubTab("routines"); }} className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 text-xs font-bold cursor-pointer">
                  Cancelar edición
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 flex flex-wrap items-center gap-3">
                <Pencil className="w-4 h-4 text-violet-700 shrink-0" />
                <p className="flex-1 min-w-[220px] text-xs text-violet-900">
                  <b>Editando solo la rutina de {editando.alumno || "este alumno"}.</b> El cambio no afecta a la rutina general ni a otros alumnos
                  {editando.base ? "; esta copia quedará como personalizada." : "."}
                </p>
                <button type="button" onClick={() => { limpiarCreador(); setActiveSubTab("asignadas"); }} className="px-3 py-1.5 rounded-lg border border-violet-300 bg-white text-violet-800 text-xs font-bold cursor-pointer">
                  Cancelar edición
                </button>
              </div>
            );
          })()}

          <form onSubmit={handleSaveRoutine} className="space-y-5">
            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Título de la Rutina *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rutina Hipertrofia Push-Pull-Legs 4 Días"
                  value={routineTitle}
                  onChange={(e) => setRoutineTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Objetivo del Alumno
                </label>
                <select
                  value={routineObjective}
                  onChange={(e) => setRoutineObjective(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  {OBJETIVOS_RUTINA.map(([k, ic, l]) => (
                    <option key={k} value={k}>
                      <IconoEmoji e={ic} /> {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nivel
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {NIVELES_RUTINA.map(([k, ic, l, d]) => (
                    <button
                      key={k}
                      type="button"
                      title={d}
                      onClick={() => setRoutineLevel(k)}
                      className={`min-w-0 px-1.5 py-1.5 rounded-lg border text-[10.5px] leading-tight font-bold cursor-pointer flex items-center justify-center gap-1 ${routineLevel === k ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-slate-700 hover:border-blue-400"}`}
                    >
                      <span className="shrink-0"><IconoEmoji e={ic} /></span>
                      <span className="truncate tracking-tight">{l}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Descripción / Indicaciones Generales
                </label>
                <input
                  type="text"
                  placeholder="Ej. 4 días de entrenamiento a la semana. Descansar miércoles y domingos."
                  value={routineDesc}
                  onChange={(e) => setRoutineDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Entrenador Responsable
                </label>
                <select
                  value={routineTrainerId}
                  onChange={(e) => setRoutineTrainerId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                >
                  <option value="">Seleccionar Entrenador...</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.specialization ? ` · ${t.specialization}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Asignar a Alumno Directo (Opcional)
                </label>
                <SelectorAlumno alumnos={members} value={routineTargetMemberId} onChange={(id) => setRoutineTargetMemberId(id)} vacio="Dejar como rutina general" />
              </div>
            </div>
            {routineTargetMemberId && (
              <SaludAlumno abiertoInicial={false} member={members.find((m) => String(m.id) === String(routineTargetMemberId))} />
            )}

            {/* Days Section */}
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Días de Entrenamiento y Ejercicios Seleccionados</span>
                </h3>

                <button
                  type="button"
                  onClick={handleAddDay}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-blue-700 font-semibold rounded-md text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Día</span>
                </button>
              </div>

              <div className="space-y-3">
                {routineDays.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2.5 flex-1">
                        <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {dIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={day.dayName}
                          onChange={(e) => {
                            const updated = [...routineDays];
                            updated[dIdx].dayName = e.target.value;
                            setRoutineDays(updated);
                          }}
                          className="bg-transparent font-bold text-slate-900 text-xs sm:text-sm focus:outline-none border-b border-dashed border-gray-300 focus:border-blue-600 w-full sm:w-80"
                        />
                      </div>

                      <div className="flex items-center gap-2">

                        {routineDays.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(dIdx)}
                            className="text-gray-400 hover:text-rose-600 text-xs px-1.5 py-0.5 cursor-pointer"
                            title="Eliminar este día"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Tipo de sesión</span>
                      <SelectorTipoDia
                        valor={day.tipo || ""}
                        onChange={(t) => setRoutineDays((prev) => prev.map((d, i) => (i === dIdx ? { ...d, tipo: t } : d)))}
                      />
                    </div>

                    {day.tipo && (
                      <GuiaSesion
                        tipo={day.tipo}
                        nEjercicios={day.exercises.length}
                        onAplicar={(patch) =>
                          setRoutineDays((prev) =>
                            prev.map((d, i) =>
                              i === dIdx ? { ...d, exercises: d.exercises.map((x) => (x.metodo ? { ...x, restSeconds: patch.restSeconds, rir: patch.rir } : { ...x, ...patch })) } : d,
                            ),
                          )
                        }
                      />
                    )}

                    <div className="grid gap-3 items-start grid-cols-1">
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Ejercicios de este día ({day.exercises.length})</p>
                        <button
                          type="button"
                          onClick={() => setBancoDestino({ dia: dIdx })}
                          className="px-3 py-1.5 rounded-xl border border-blue-600 bg-blue-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 hover:bg-blue-500"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar ejercicios
                        </button>
                      </div>
                      {day.exercises.length === 0 ? (
                        <p className="text-xs text-gray-500 italic py-6 text-center border border-dashed border-gray-300 rounded-xl bg-white">
                          Toca «Agregar ejercicios» o el botón azul de la esquina para abrir el banco. Luego ajusta series,
                          descanso y el sistema (biserie, rest-pause, tempo, HIIT…).
                        </p>
                      ) : (
                        (() => {
                          const etiquetas = etiquetasGrupo(day.exercises);
                          const setLista = (fn) =>
                            setRoutineDays((prev) => prev.map((d, i) => (i === dIdx ? { ...d, exercises: fn(d.exercises) } : d)));
                          return day.exercises.map((ex, exIdx) => {
                            const base = allExercises.find((e) => e.id === ex.exerciseId);
                            const pasos = ex.steps || base?.steps || [];
                            const upd = (patch) => setLista((l) => l.map((x, k) => (k === exIdx ? { ...x, ...patch } : x)));
                            const grupo = ex.metodo?.grupo;
                            return (
                              <div key={exIdx} className={`bg-white border rounded-xl p-3 shadow-2xs ${grupo ? "border-violet-300 border-l-4 border-l-violet-500" : "border-gray-200"}`}>
                                <div className="flex items-start gap-3">
                                  <button type="button" onClick={() => base && setSelectedExerciseModal(base)} title="Ver ejecución" className="relative shrink-0 cursor-pointer">
                                    <span className="absolute top-0.5 left-0.5 z-10 min-w-5 h-5 px-1 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                                      {etiquetas[exIdx] || exIdx + 1}
                                    </span>
                                    <ExerciseThumb ex={{ ...ex, name: ex.exerciseName }} className="w-20 h-20 rounded-lg border border-gray-200" />
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 text-sm leading-tight">{ex.exerciseName}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                          <span className="text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded uppercase border border-blue-100 font-semibold">
                                            {muscleLabels[ex.muscleGroup] || ex.muscleGroup}
                                          </span>
                                          {base?.equipment && <span className="text-[11px] text-gray-500">{base.equipment}</span>}
                                        </div>
                                      </div>
                                      <div className="flex items-center shrink-0">
                                        <button type="button" disabled={exIdx === 0} onClick={() => setLista((l) => { const c = [...l]; [c[exIdx - 1], c[exIdx]] = [c[exIdx], c[exIdx - 1]]; return c; })} className="px-1.5 py-1 text-gray-400 hover:text-slate-800 cursor-pointer disabled:opacity-30" title="Subir">↑</button>
                                        <button type="button" disabled={exIdx === day.exercises.length - 1} onClick={() => setLista((l) => { const c = [...l]; [c[exIdx + 1], c[exIdx]] = [c[exIdx], c[exIdx + 1]]; return c; })} className="px-1.5 py-1 text-gray-400 hover:text-slate-800 cursor-pointer disabled:opacity-30" title="Bajar">↓</button>
                                        <button type="button" onClick={() => handleRemoveExerciseFromDay(dIdx, exIdx)} className="w-8 h-8 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Quitar ejercicio">✕</button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2.5">
                                  <ConfigEjercicio
                                    ex={ex}
                                    campos={{ series: "sets", reps: "reps", descanso: "restSeconds", esfuerzo: "rir" }}
                                    onPatch={upd}
                                    onMetodo={(m) => setLista((l) => cambiarMetodo(l, exIdx, m))}
                                    etiqueta={etiquetas[exIdx]}
                                    companeros={day.exercises
                                      .map((x, k) => ({ i: k, nombre: x.exerciseName, enGrupo: !!grupo && x.metodo?.grupo === grupo }))
                                      .filter((x) => x.i !== exIdx)}
                                    onCompanero={(k) => setLista((l) => alternarCompanero(l, exIdx, k))}
                                    onElegirDelBanco={() => setBancoDestino({ dia: dIdx, combinarCon: { idx: exIdx, nombre: ex.exerciseName, etiqueta: etiquetas[exIdx] } })}
                                  />
                                </div>
                                <div className="mt-2 space-y-2">
                                  {pasos.length > 0 && (
                                    <details className="bg-slate-50 border border-slate-200 rounded-lg">
                                      <summary className="px-3 py-2 text-xs font-semibold text-blue-700 cursor-pointer select-none">
                                        Indicaciones de ejecución ({pasos.length} pasos)
                                      </summary>
                                      <ol className="px-4 pb-3 space-y-1.5 list-decimal list-inside text-sm text-slate-700">
                                        {pasos.map((p, i) => (
                                          <li key={i}>{p}</li>
                                        ))}
                                      </ol>
                                    </details>
                                  )}
                                  <input
                                    type="text"
                                    value={ex.notes || ""}
                                    placeholder="Nota para el alumno (opcional), ej. cuidar rodilla derecha"
                                    onChange={(e) => upd({ notes: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-slate-800 text-sm"
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Routine Button */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  const t = editando?.modo === "alumno" ? "asignadas" : "routines";
                  salirDelCreador(() => {
                    limpiarCreador();
                    setActiveSubTab(t);
                  });
                }}
                className="px-3.5 py-1.5 text-gray-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{!editando ? "Guardar Rutina Completa" : editando.modo === "general" ? "Guardar cambios para todos" : "Guardar solo para este alumno"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ver rutina: hoja ordenada para imprimir, PDF o foto */}
      {viewingRoutine && (
        <div className="fixed inset-0 z-50 overflow-y-auto rd-velo-hoja">
          <div className="rd-hr-barra" data-no-captura="1">
            <button onClick={() => setViewingRoutine(null)} className="rd-hr-btn rd-ctrl-volver">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Volver</span>
            </button>
            <p className="flex-1 min-w-0 truncate text-sm font-bold">{viewingRoutine.title}</p>
            <BotonesDescarga imprimir selector=".rd-hoja-rutina" nombre={`Rutina_${viewingRoutine.title || ""}`} />
            <button onClick={() => setViewingRoutine(null)} className="rd-hr-btn" title="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-2 sm:px-6 pb-10 pt-3">
            <HojaRutina rutina={viewingRoutine} />
            {viewingRoutine.days.some((d) => d.exercises.some((e) => e.videoUrl)) && (
              <div className="max-w-[820px] mx-auto mt-3 flex flex-wrap gap-2" data-no-captura="1">
                {viewingRoutine.days.flatMap((d) => d.exercises).filter((e) => e.videoUrl).map((ex, i) => (
                  <button key={i} onClick={() => setPreviewVideoUrl({ url: ex.videoUrl, title: ex.exerciseName })} className="rd-hr-btn text-xs">
                    <PlayCircle className="w-3.5 h-3.5" /> Demo: {ex.exerciseName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Routine Assignment Modal */}
      {assigningRoutine && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="rd-compacta w-full max-w-3xl mx-auto min-h-full sm:px-8 sm:py-8 bg-white p-5 text-slate-800">
            <BarraVolver
              className="mb-4"
              onVolver={() => setAssigningRoutine(null)}
              titulo="Asignar Rutina a Alumno"
              subtitulo={<>Rutina seleccionada: <span className="text-blue-700 font-bold">{assigningRoutine.title}</span></>}
            />

            <form
              onSubmit={handleConfirmAssignment}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Seleccionar Alumno
                </label>
                <SelectorAlumno alumnos={members} value={studentToAssignId} onChange={(id) => setStudentToAssignId(id)} required />
              </div>
              {studentToAssignId && (
                <SaludAlumno member={members.find((m) => String(m.id) === String(studentToAssignId))} />
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setAssigningRoutine(null)}
                  className="px-3 py-1.5 text-gray-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-xs cursor-pointer"
                >
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ejercicio propio (mismo formulario que fisioterapia) */}
      {isNewExerciseOpen && (
        <FormEjercicioPropio
          onClose={() => {
            setIsNewExerciseOpen(false);
            setPropioParaDia(null);
          }}
          onGuardar={guardarEjercicioPropio}
        />
      )}

      {/* Detalle de ejercicio (pantalla completa con GIF) */}
      {selectedExerciseModal && (
        <ExerciseDetail ex={selectedExerciseModal} onClose={() => setSelectedExerciseModal(null)} />
      )}

      {/* Floating Video Preview Player Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto min-h-full sm:px-8 sm:py-8 bg-white p-4 text-slate-800">
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {previewVideoUrl.title} - Video Demostrativo
                </h3>
              </div>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-3">
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-gray-200 shadow-md">
                <iframe
                  src={getEmbedUrl(previewVideoUrl.url) || ""}
                  title={previewVideoUrl.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
              <a
                href={previewVideoUrl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <span>Ver en YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-slate-800 rounded-md font-semibold cursor-pointer"
              >
                Cerrar Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
