import React, { useState, useMemo } from "react";
import { BarraVolver } from "../common/BarraVolver";
import {
  Dumbbell,
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
} from "lucide-react";
import { useGym } from "../../context/GymContext";
// Sin confeti: el sistema usa avisos de color en su lugar
const confetti = () => {};
import {
  useExerciseBank,
  ExerciseLibrary,
  ExerciseDetail,
  ExercisePicker,
  ExerciseThumb,
  MUSCLE_LABELS,
} from "./ExerciseBank";
import { PanelIndicaciones } from "../indicaciones/Indicaciones";

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
import { FormEjercicioPropio } from "./FormEjercicioPropio";
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
  const [activeSubTab, setActiveSubTab] = useState("routines");

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
  const [verCopias, setVerCopias] = useState(false);
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
  const editarParaAlumno = (routine, a) => {
    const copia = a.copia || assignRoutineToMember(a.id, routine.id);
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

    const nuevo = {
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
    };
    // Actualización inmutable (evita que se agregue dos veces)
    setRoutineDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, exercises: [...d.exercises, nuevo] } : d)),
    );
  };

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
    if (!editando) {
      addRoutine(datos);
    } else if (editando.modo === "alumno") {
      // Solo para este alumno: su copia queda marcada como personalizada
      updateRoutine(editando.id, { ...datos, personalizada: true });
    } else {
      const n = updateRoutineGeneral(editando.id, datos, { incluirPersonalizadas });
      if (n) setTimeout(() => avisoBreve(`✓ Cambios aplicados también a ${n} alumno(s) con esta rutina`), 900);
    }
    setEditando(null);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
    });

    setActiveSubTab("routines");
  };

  const handleConfirmAssignment = (e) => {
    e.preventDefault();
    if (!assigningRoutine || !studentToAssignId) return;

    assignRoutineToMember(studentToAssignId, assigningRoutine.id);
    const alumnoAsignado = members.find((m) => String(m.id) === String(studentToAssignId));
    avisoBreve(`✓ Rutina asignada a ${alumnoAsignado?.fullName || "el alumno"}`);
    setAssigningRoutine(null);
    setStudentToAssignId("");

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-4">
      {/* Sub Navigation Bar */}
      <div className="rd-portada rd-cabecera flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-blue-600" />
            <span>Rutinas y ejercicios</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Banco de {allExercises.length} ejercicios con animación, creador de rutinas y asignación a alumnos.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveSubTab("routines")}
            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === "routines"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-gray-600 hover:text-slate-900"
            }`}
          >
            Rutinas ({routines.length})
          </button>

          <button
            onClick={() => setActiveSubTab("exercises")}
            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeSubTab === "exercises"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-gray-600 hover:text-slate-900"
            }`}
          >
            <span>Banco de ejercicios</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">
              {allExercises.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("indicaciones")}
            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === "indicaciones"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-gray-600 hover:text-slate-900"
            }`}
          >
            Indicaciones
          </button>

          <button
            onClick={() => (editando ? setActiveSubTab("builder") : nuevaRutina())}
            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
              activeSubTab === "builder"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:text-slate-900"
            }`}
          >
            {editando ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{editando ? "Editando rutina" : "Crear Rutina"}</span>
          </button>
        </div>
      </div>

      {/* SUBTAB: INDICACIONES (estiramientos, movilidad, calentamiento, postura y cuidados) */}
      {activeSubTab === "indicaciones" && <PanelIndicaciones />}

      {/* SUBTAB 1: ROUTINES LIST */}
      {activeSubTab === "routines" && (
        <div className="space-y-4">
          {routines.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <Dumbbell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800">Aún no hay rutinas creadas</p>
              <p className="text-sm text-slate-500 mb-4">Arme la primera usando el banco de ejercicios con GIF.</p>
              <button
                onClick={nuevaRutina}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold cursor-pointer"
              >
                Crear rutina
              </button>
            </div>
          )}
          {(() => {
            const existe = new Set(routines.map((r) => r.id));
            const copiasEnlazadas = routines.filter((r) => r.baseRoutineId && existe.has(r.baseRoutineId));
            const visibles = verCopias ? routines : routines.filter((r) => !(r.baseRoutineId && existe.has(r.baseRoutineId)));
            return (
              <>
                {copiasEnlazadas.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-600">
                      <Users className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-violet-600" />
                      Las copias de cada alumno están dentro de su plantilla (<b>Asignada a</b>).
                    </p>
                    <button
                      type="button"
                      onClick={() => setVerCopias((v) => !v)}
                      className={`px-3 py-1 rounded-full border text-xs font-bold cursor-pointer ${verCopias ? "bg-violet-600 border-violet-600 text-white" : "bg-violet-50 border-violet-200 text-violet-800"}`}
                    >
                      {verCopias ? "Ocultar copias por alumno" : `Ver copias por alumno (${copiasEnlazadas.length})`}
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {visibles.map((routine) => {
                    const assignedStudent = members.find((m) => String(m.id) === String(routine.targetStudentId));
                    const totalExercises = (routine.days || []).reduce((sum, d) => sum + (d.exercises || []).length, 0);
                    const asignados = routine.targetStudentId ? [] : asignadosDe(routine);
                    const base = routine.baseRoutineId ? routines.find((r) => r.id === routine.baseRoutineId) : null;
                    const tiposDia = [...new Set((routine.days || []).map((d) => d.tipo).filter(Boolean))];
                    return (
                      <div
                        key={routine.id}
                        className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-4 flex flex-col justify-between transition-all shadow-xs group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                              {textoNivelRutina(routine.level)} • {textoObjetivoRutina(routine.objective)}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">{(routine.days || []).length} Días / sem</span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1 group-hover:text-blue-600 transition-colors">{routine.title}</h3>
                          <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">{routine.description}</p>
                          {tiposDia.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {tiposDia.map((t) => (
                                <InsigniaTipoDia key={t} tipo={t} />
                              ))}
                            </div>
                          )}

                          <div className="space-y-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                            <div className="flex items-center justify-between text-slate-700">
                              <span className="text-gray-500">Total ejercicios:</span>
                              <span className="font-semibold">{totalExercises} ejercicios</span>
                            </div>
                            {routine.trainerName && (
                              <div className="flex items-center justify-between text-slate-700">
                                <span className="text-gray-500">Coach:</span>
                                <span className="font-semibold text-blue-700">{routine.trainerName}</span>
                              </div>
                            )}
                            {assignedStudent || routine.targetStudentId ? (
                              <div className="pt-1 border-t border-gray-200 space-y-1">
                                <div className="flex items-center justify-between text-slate-700">
                                  <span className="text-gray-500">Rutina de:</span>
                                  <span className="font-bold text-emerald-700">{assignedStudent?.fullName || routine.targetStudentName}</span>
                                </div>
                                {base && (
                                  <p className="text-[11px] text-slate-500">
                                    Copia de «{base.title}» · {routine.personalizada ? <b className="text-amber-700">personalizada</b> : "sigue a la plantilla"}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="pt-1 border-t border-gray-200 space-y-1.5">
                                <div className="flex items-center justify-between text-slate-700">
                                  <span className="text-gray-500">Tipo:</span>
                                  <span className="text-gray-500 font-medium">Plantilla general</span>
                                </div>
                                <details className="rounded-lg bg-white border border-violet-200">
                                  <summary className="px-2 py-1.5 cursor-pointer select-none font-bold text-violet-800 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" /> Asignada a {asignados.length} alumno(s)
                                  </summary>
                                  <div className="px-2 pb-2 space-y-1">
                                    {asignados.length === 0 ? (
                                      <p className="text-[11px] text-slate-500 italic">Aún nadie. Usa «Asignar».</p>
                                    ) : (
                                      asignados.map((a) => (
                                        <div key={a.id} className="flex items-center justify-between gap-2">
                                          <span className="truncate font-semibold text-slate-800">
                                            {a.nombre}
                                            {a.copia?.personalizada && <span className="ml-1 px-1 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">personalizada</span>}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => editarParaAlumno(routine, a)}
                                            className="shrink-0 px-2 py-0.5 rounded-md border border-violet-200 text-violet-800 text-[11px] font-bold hover:bg-violet-50 cursor-pointer flex items-center gap-1"
                                            title="Editar solo para este alumno"
                                          >
                                            <Pencil className="w-3 h-3" /> Solo para él/ella
                                          </button>
                                        </div>
                                      ))
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
                              onClick={() => abrirEditor(routine, routine.targetStudentId ? "alumno" : "general")}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                              title={routine.targetStudentId ? "Editar la rutina de este alumno" : "Editar la plantilla (llega a todos sus alumnos)"}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>{routine.targetStudentId ? "Editar" : "Editar general"}</span>
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

      {/* SUBTAB 2: BANCO DE EJERCICIOS */}
      {activeSubTab === "exercises" && (
        <ExerciseLibrary
          exercises={allExercises}
          onOpen={setSelectedExerciseModal}
          onNew={() => setIsNewExerciseOpen(true)}
        />
      )}

      {/* SUBTAB 3: ROUTINE BUILDER WIZARD */}
      {activeSubTab === "builder" && (
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs space-y-5 text-slate-800">
          <BarraVolver
            onVolver={() => setActiveSubTab("routines")}
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
                  <b>Editando la plantilla general.</b>{" "}
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
                  <b>Editando solo la rutina de {editando.alumno || "este alumno"}.</b> El cambio no afecta a la plantilla ni a otros alumnos
                  {editando.base ? "; esta copia quedará como personalizada." : "."}
                </p>
                <button type="button" onClick={() => { limpiarCreador(); setActiveSubTab("routines"); }} className="px-3 py-1.5 rounded-lg border border-violet-300 bg-white text-violet-800 text-xs font-bold cursor-pointer">
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
                      {ic} {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nivel
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {NIVELES_RUTINA.map(([k, ic, l, d]) => (
                    <button
                      key={k}
                      type="button"
                      title={d}
                      onClick={() => setRoutineLevel(k)}
                      className={`min-w-0 px-1.5 py-1.5 rounded-lg border text-[10.5px] leading-tight font-bold cursor-pointer flex items-center justify-center gap-1 ${routineLevel === k ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-slate-700 hover:border-blue-400"}`}
                    >
                      <span className="shrink-0">{ic}</span>
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
                <SelectorAlumno alumnos={members} value={routineTargetMemberId} onChange={(id) => setRoutineTargetMemberId(id)} vacio="Dejar como plantilla general" />
              </div>
            </div>

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

                    {/* Pantalla partida 50/50: ejercicios del día | banco (arriba/abajo en celular) */}
                    <div className="grid lg:grid-cols-2 gap-3 items-start">
                    <div className="space-y-2 min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Ejercicios de este día ({day.exercises.length})</p>
                      {day.exercises.length === 0 ? (
                        <p className="text-xs text-gray-500 italic py-6 text-center border border-dashed border-gray-300 rounded-xl bg-white">
                          Toca ejercicios en el banco de la derecha para agregarlos. Luego ajusta series, descanso y el sistema
                          (biserie, rest-pause, tempo, HIIT…).
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
                    <div className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto rounded-2xl border border-blue-200 bg-blue-50/40 p-3 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                          <Dumbbell className="w-3.5 h-3.5" /> Banco de ejercicios ({allExercises.length}) · toca para agregar
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPropioParaDia(dIdx);
                            setIsNewExerciseOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-blue-300 bg-white text-blue-700 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-blue-50"
                        >
                          <Plus className="w-3.5 h-3.5" /> Ejercicio propio
                        </button>
                      </div>
                      <ExercisePicker
                        exercises={allExercises}
                        onPick={(ex) => handleAddExerciseToDay(dIdx, ex)}
                        picked={(day.exercises || []).map((e) => e.exerciseId)}
                      />
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
                  if (editando) limpiarCreador();
                  setActiveSubTab("routines");
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

      {/* Routine Detail / Print View Modal */}
      {viewingRoutine && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto min-h-full sm:px-8 sm:py-8 bg-white overflow-y-auto p-5 text-slate-800">
            <div className="flex items-start justify-between border-b border-gray-200 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                  {textoNivelRutina(viewingRoutine.level)} • {textoObjetivoRutina(viewingRoutine.objective)}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {viewingRoutine.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewingRoutine.description}
                </p>
                {viewingRoutine.targetStudentName && (
                  <p className="text-xs text-blue-700 font-semibold mt-1">
                    Asignado a: {viewingRoutine.targetStudentName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-md cursor-pointer"
                  title="Imprimir rutina para el alumno"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <BotonesDescarga compacto nombre={`Rutina_${viewingRoutine.title || ""}`} />
                <button
                  onClick={() => setViewingRoutine(null)}
                  className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 my-4 text-xs">
              {viewingRoutine.days.map((day, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-xl border border-gray-200 p-3.5"
                >
                  <div className="flex items-center justify-between mb-2.5 border-b border-gray-200 pb-1.5">
                    <h4 className="font-bold text-blue-700 text-xs sm:text-sm flex flex-wrap items-center gap-2">
                      {day.dayName}
                      <InsigniaTipoDia tipo={day.tipo} />
                    </h4>
                    {day.focus && (
                      <span className="text-xs text-gray-500">
                        {day.focus}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(() => { const etq = etiquetasGrupo(day.exercises); return day.exercises.map((ex, eIdx) => (
                      <div
                        key={eIdx}
                        className="p-2.5 bg-white rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="rounded accent-blue-600 w-3.5 h-3.5"
                            title="Marcar al completar"
                          />
                          <ExerciseThumb
                            ex={{ ...ex, name: ex.exerciseName }}
                            alwaysGif
                            className="w-16 h-16 rounded-lg border border-gray-200 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">
                                {ex.exerciseName}
                              </p>
                              {ex.videoUrl && (
                                <button
                                  onClick={() =>
                                    setPreviewVideoUrl({
                                      url: ex.videoUrl,
                                      title: ex.exerciseName,
                                    })
                                  }
                                  className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
                                >
                                  <PlayCircle className="w-3 h-3" />
                                  <span>Ver Demo</span>
                                </button>
                              )}
                            </div>
                            {ex.notes && (
                              <p className="text-xs text-gray-500">
                                {ex.notes}
                              </p>
                            )}
                            <InsigniaMetodo metodo={ex.metodo} etiqueta={etq[eIdx]} className="mt-1" />
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-blue-700 font-bold">
                            {ex.sets} series x {ex.reps}
                          </span>
                          <span className="text-gray-500 text-xs ml-2">
                            ⏱ {ex.restSeconds}s descanso
                          </span>
                          {ex.rir && (
                            <span className="text-amber-700 text-xs ml-2 font-semibold">
                              ({ex.rir})
                            </span>
                          )}
                        </div>
                      </div>
                    )); })()}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingRoutine(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-xs cursor-pointer shadow-xs"
              >
                Cerrar
              </button>
            </div>
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
