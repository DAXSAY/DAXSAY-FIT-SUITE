import React, { useEffect, useMemo } from "react";
import { Search, User, Ruler, Utensils, Flame, X } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { coincideAlumno, CodigoAlumno } from "../common/BuscarAlumno";
import { NutritionModule } from "../nutrition/NutritionModule";
import { MeasurementsModule } from "../measurements/MeasurementsModule";
import { useRecordado } from "../../utils/subPestana";
import { OBJETIVOS_NUTRI } from "../../data/nutricionOpciones";

const OBJETIVOS = [["all", "Todos los objetivos"], ...OBJETIVOS_NUTRI.map((o) => [o.id, o.label])];

/**
 * Dietas y medidas: el alumno es el centro. Se busca (no se carga nada hasta
 * escribir o elegir un objetivo) y, al elegirlo, se trabaja en dos pasos:
 * 1) Medidas (evaluación corporal y sus controles) · 2) Plan de alimentación.
 */
export const DietasYMedidas = ({ pedirCrear = 0 }) => {
  const { members, nutritionPlans = [], bodyAssessments = [] } = useGym();
  const [q, setQ] = useRecordado("dym_q", "");
  const [objetivo, setObjetivo] = useRecordado("dym_obj", "all");
  const [alumnoId, setAlumnoId] = useRecordado("dym_alumno", "");
  const [paso, setPaso] = useRecordado("dym_paso", "medidas");

  const planDe = useMemo(() => {
    const m = new Map();
    nutritionPlans.forEach((p) => {
      const k = String(p.targetStudentId);
      const a = m.get(k);
      if (!a || String(p.createdDate || "") >= String(a.createdDate || "")) m.set(k, p);
    });
    return m;
  }, [nutritionPlans]);
  const tomasDe = useMemo(() => {
    const m = new Map();
    bodyAssessments.forEach((a) => m.set(String(a.memberId), (m.get(String(a.memberId)) || 0) + 1));
    return m;
  }, [bodyAssessments]);

  const buscando = q.trim() !== "" || objetivo !== "all";
  const lista = useMemo(() => {
    if (!buscando) return [];
    return members.filter((m) => {
      if (q.trim() && !coincideAlumno(m, q)) return false;
      if (objetivo !== "all") return planDe.get(String(m.id))?.objective === objetivo;
      return true;
    });
  }, [members, q, objetivo, planDe, buscando]);

  const alumno = members.find((m) => String(m.id) === String(alumnoId));
  // «Crear / asignar dieta» de la cabecera: con alumno elegido va al paso 2
  useEffect(() => {
    if (pedirCrear > 0 && alumnoId) setPaso("dieta");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedirCrear]);
  const plan = alumno ? planDe.get(String(alumno.id)) : null;
  const tomas = alumno ? tomasDe.get(String(alumno.id)) || 0 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Izquierda: buscar alumno */}
      <div className="lg:col-span-4 space-y-3 lg:sticky lg:top-3 self-start">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Código del alumno (12 o DR-12), nombre o DNI..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-hidden"
          >
            {OBJETIVOS.map(([k, t]) => (
              <option key={k} value={k}>
                {t}
                {k !== "all" ? ` (${nutritionPlans.filter((p) => p.objective === k).length})` : ""}
              </option>
            ))}
          </select>
        </div>

        {!buscando ? (
          <p className="text-xs text-slate-500 px-1">Escribe un código, nombre o DNI, o elige un objetivo para ver alumnos.</p>
        ) : (
          <div className="space-y-2 max-h-[640px] lg:max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
            {lista.length === 0 && <p className="text-xs text-slate-500 px-1 py-4 text-center">Ningún alumno coincide.</p>}
            {lista.map((m) => {
              const p = planDe.get(String(m.id));
              const t = tomasDe.get(String(m.id)) || 0;
              const sel = String(m.id) === String(alumnoId);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAlumnoId(m.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${sel ? "bg-blue-50/50 border-blue-500 ring-1 ring-blue-500" : "bg-white border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">{m.fullName}</span>
                    {p ? (
                      <span className="shrink-0 text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{p.dailyCaloriesTarget} kcal</span>
                    ) : (
                      <span className="shrink-0 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">Sin dieta</span>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 min-w-0">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <CodigoAlumno m={m} className="shrink-0" />
                      <span className="truncate">DNI {m.dni}</span>
                    </span>
                    <span className="shrink-0">{t ? `${t} ${t === 1 ? "medición" : "mediciones"}` : "sin medidas"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sin alumno elegido, «Crear / asignar dieta» abre el formulario directo */}
      {!alumno && pedirCrear > 0 && <NutritionModule vista="ninguna" onVista={() => {}} pedirCrear={pedirCrear} />}
      {/* Derecha: el alumno elegido, en dos pasos */}
      <div className="lg:col-span-8 space-y-4">
        {!alumno ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
            <User className="w-9 h-9 mx-auto text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-600">Busca y elige un alumno para ver sus medidas y su plan de alimentación.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-black text-slate-900 truncate">{alumno.fullName}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CodigoAlumno m={alumno} /> DNI {alumno.dni} · {alumno.planName || "sin plan"}
                </p>
              </div>
              <button type="button" onClick={() => setAlumnoId("")} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center cursor-pointer" title="Cerrar alumno">
                <X className="w-4 h-4" />
              </button>
              {/* Pasos, como en fisioterapia */}
              <div className="w-full grid grid-cols-2 gap-2">
                {[
                  ["medidas", Ruler, "Paso 1 · Medidas", tomas ? `${tomas} ${tomas === 1 ? "medición" : "mediciones"}` : "sin medidas"],
                  ["dieta", Utensils, "Paso 2 · Plan de alimentación", plan ? `${plan.dailyCaloriesTarget} kcal` : "sin dieta"],
                ].map(([k, I, t, d]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPaso(k)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left cursor-pointer transition-all ${
                      paso === k ? "bg-teal-50 border-teal-500 ring-1 ring-teal-500 text-teal-900" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${paso === k ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <I className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold leading-tight">{t}</span>
                      <span className="block text-[11px] opacity-75 flex items-center gap-1">
                        {k === "dieta" && plan && <Flame className="w-3 h-3" />} {d}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {paso === "medidas" ? (
              <MeasurementsModule alumnoFijo={alumno.id} />
            ) : (
              <NutritionModule vista="plans" onVista={() => {}} pedirCrear={pedirCrear} alumnoFijo={alumno.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
