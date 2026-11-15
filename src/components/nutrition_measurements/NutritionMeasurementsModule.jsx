import React, { useState } from "react";
import { Utensils, Activity, Sparkles, Users, CalendarDays, Calculator, Hand, Apple, Plus } from "lucide-react";
import { useRecordado } from "../../utils/subPestana";
import { CabeceraModulo, AccionCabecera } from "../common/CabeceraModulo";
import { SeguimientoServicio, useCobertura } from "../common/Programados";
import { AgendaEspecialistas } from "../appointments/AgendaEspecialistas";
import { NutritionModule } from "../nutrition/NutritionModule";
import { MeasurementsModule } from "../measurements/MeasurementsModule";
import { useGym } from "../../context/GymContext";

export const NutritionMeasurementsModule = () => {
  const [subTab, setSubTab] = useRecordado("nutricion", "plans");
  const [pedirCrear, setPedirCrear] = useState(0);
  const { nutritionPlans, bodyAssessments, members } = useGym();

  const totalDietPlans = nutritionPlans.length;
  const conPlan = useCobertura().nutricion;
  const sinPlan = members.filter((m) => !conPlan.has(String(m.id))).length;
  const totalAssessments = bodyAssessments.length;
  const evaluatedStudentsCount = new Set(bodyAssessments.map((a) => a.memberId))
    .size;

  return (
    <div className="space-y-5">
      <CabeceraModulo
        icono={Sparkles}
        etiqueta="Salud"
        titulo="Nutrición y medidas"
        descripcion="Planes de alimentación, macros y evaluaciones corporales del alumno."
        accion={<AccionCabecera icono={Plus} onClick={() => { setSubTab("plans"); setPedirCrear((n) => n + 1); }}>Crear / asignar dieta</AccionCabecera>}
        activa={subTab}
        onCambiar={setSubTab}
        pestanas={[
          { k: "plans", icono: Utensils, label: "Planes y dietas", badge: totalDietPlans, tono: "emerald" },
          { k: "calculator", icono: Calculator, label: "Calculadora TDEE", tono: "sky" },
          { k: "guide", icono: Hand, label: "Porciones y platos", tono: "amber" },
          { k: "foods", icono: Apple, label: "Catálogo de alimentos", tono: "rose" },
          { k: "measurements_bio", icono: Activity, label: "Evaluación corporal", badge: totalAssessments, tono: "teal" },
          { k: "seguimiento", icono: Users, label: "Seguimiento", badge: `${sinPlan} sin plan`, tono: "violet" },
          { k: "agenda", icono: CalendarDays, label: "Horario de atención", tono: "amber" },
        ]}
      />

      {/* Embedded Sub-views */}
      <div className="transition-opacity duration-200">
        {["plans", "calculator", "guide", "foods"].includes(subTab) && (
          <NutritionModule vista={subTab} onVista={setSubTab} pedirCrear={pedirCrear} />
        )}

        {subTab === "seguimiento" && <SeguimientoServicio tipo="nutricion" />}
        {subTab === "agenda" && <AgendaEspecialistas servicioInicial="nutricion" />}

        {subTab === "measurements_bio" && (
          <div>
            <MeasurementsModule />
          </div>
        )}
      </div>
    </div>
  );
};
