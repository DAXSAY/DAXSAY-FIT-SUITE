import React, { useState } from "react";
import { Utensils, Activity, Sparkles, Users, CalendarDays, Calculator, Hand, Apple, Plus } from "lucide-react";
import { useRecordado } from "../../utils/subPestana";
import { CabeceraModulo, AccionCabecera } from "../common/CabeceraModulo";
import { SeguimientoServicio } from "../common/Programados";
import { AgendaEspecialistas } from "../appointments/AgendaEspecialistas";
import { NutritionModule } from "../nutrition/NutritionModule";
import { DietasYMedidas } from "./DietasYMedidas";
import { CabeceraModulo as _C, SinSeleccion } from "../common/CabeceraModulo";
import { useGym } from "../../context/GymContext";

export const NutritionMeasurementsModule = () => {
  const [subTab, setSubTab] = useRecordado("nutricion", "", ["agenda"]);
  const [pedirCrear, setPedirCrear] = useState(0);
  const { nutritionPlans, bodyAssessments, members } = useGym();

  const totalDietPlans = nutritionPlans.length;
  const totalAssessments = bodyAssessments.length;
  const evaluatedStudentsCount = new Set(bodyAssessments.map((a) => a.memberId))
    .size;

  return (
    <div className="space-y-5">
      <CabeceraModulo
        icono={Sparkles}
        etiqueta="Salud"
        titulo="Nutrición y medidas"
        descripcion="Medidas del alumno y su plan de alimentación, en un solo lugar."
        accion={<AccionCabecera icono={Plus} onClick={() => { setSubTab("dym"); setPedirCrear((n) => n + 1); }}>Crear / asignar dieta</AccionCabecera>}
        activa={subTab}
        onCambiar={setSubTab}
        pestanas={[
          { k: "dym", icono: Utensils, label: "Dietas y medidas", badge: totalDietPlans, tono: "emerald" },
          { k: "seguimiento", icono: Users, label: "Seguimiento", tono: "violet" },
          { k: "guide", icono: Hand, label: "Porciones y platos", tono: "amber" },
          { k: "agenda", icono: CalendarDays, label: "Horario de atención", tono: "amber" },
        ]}
      />

      <div className="transition-opacity duration-200">
        {!subTab && <SinSeleccion tema="nutricion" texto="Elige una opción de arriba." />}
        {subTab === "dym" && <DietasYMedidas pedirCrear={pedirCrear} />}
        {subTab === "guide" && <NutritionModule vista="guide" onVista={setSubTab} />}
        {subTab === "seguimiento" && <SeguimientoServicio tipo="nutricion" />}
        {subTab === "agenda" && <AgendaEspecialistas servicioInicial="nutricion" fijo />}
      </div>
    </div>
  );
};
