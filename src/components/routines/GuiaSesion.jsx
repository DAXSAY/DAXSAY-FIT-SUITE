import React from "react";
import { Wand2, Filter } from "lucide-react";
import { tipoDia } from "./SistemasEntrenamiento";

// Qué significa cada "Tipo de sesión" y qué se aplica al elegirlo.
// sets/reps/rest/rir: valores que "Aplicar al día" pone en los ejercicios.
// tipos: clases de ejercicio del banco que encajan (ver tipoDeEjercicio).
export const GUIA_SESION = {
  fuerza: { meta: "Mover más peso: pocas repeticiones, cargas altas y descansos largos.", sets: 5, reps: "3-5", rest: 180, rir: "RIR 1-2", sistemas: "Series pirámide, clúster, top set + back-off", tipos: ["compuesto"] },
  hipertrofia: { meta: "Ganar masa muscular con volumen moderado-alto y cerca del fallo.", sets: 4, reps: "8-12", rest: 90, rir: "RIR 1-2", sistemas: "Biserie, drop set, rest-pause, superserie antagonista", tipos: ["compuesto", "aislamiento", "pantorrilla"] },
  potencia: { meta: "Mover rápido cargas medias. Cada repetición a máxima velocidad, sin fatiga.", sets: 5, reps: "3-5", rest: 150, rir: "RIR 3-4", sistemas: "Contraste (pesado + explosivo), clúster", tipos: ["olimpico", "pliometria", "lanzamiento", "compuesto"] },
  pliometria: { meta: "Saltos y rebotes para fuerza reactiva. Calidad del aterrizaje antes que cantidad.", sets: 4, reps: "5-8", rest: 120, rir: "Técnica perfecta", sistemas: "Contraste, series por contactos", tipos: ["pliometria", "lanzamiento"] },
  halterofilia: { meta: "Arranque, envión y sus derivados: técnica, velocidad y descanso completo.", sets: 5, reps: "1-3", rest: 180, rir: "RPE 7-8", sistemas: "Complejos, clúster, oleadas", tipos: ["olimpico"] },
  powerlifting: { meta: "Sentadilla, press de banca y peso muerto con cargas casi máximas.", sets: 5, reps: "1-5", rest: 240, rir: "RPE 7-9", sistemas: "Top set + back-off, pirámide, ondulante", tipos: ["compuesto"] },
  calistenia: { meta: "Dominar el propio peso: dominadas, fondos, flexiones y progresiones.", sets: 4, reps: "6-12", rest: 90, rir: "RIR 1-2", sistemas: "EMOM, escalera, rest-pause", tipos: ["peso_corporal", "core", "core_iso"] },
  funcional: { meta: "Patrones del día a día: empujar, jalar, cargar, girar y estabilizar.", sets: 3, reps: "10-15", rest: 60, rir: "RIR 2-3", sistemas: "Circuito, biserie, por tiempo", tipos: ["compuesto", "peso_corporal", "core", "lanzamiento"] },
  cross: { meta: "Trabajo variado de alta intensidad (WOD): fuerza, gimnásticos y metabólico.", sets: 3, reps: "10-15", rest: 45, rir: "RPE 8", sistemas: "AMRAP, EMOM, For Time, Tabata", tipos: ["olimpico", "peso_corporal", "pliometria", "cardio", "compuesto"] },
  hiit: { meta: "Intervalos muy intensos con pausas cortas para mejorar la condición y quemar energía.", sets: 6, reps: "30 s", rest: 30, rir: "RPE 8-9", sistemas: "Tabata, EMOM, intervalos", tipos: ["cardio", "pliometria", "peso_corporal"] },
  circuito: { meta: "Encadenar ejercicios con poco descanso entre ellos y descansar al final de la vuelta.", sets: 3, reps: "12-15", rest: 60, rir: "RIR 2-3", sistemas: "Circuito, estaciones por tiempo", tipos: ["compuesto", "peso_corporal", "core", "cardio"] },
  resistencia: { meta: "Aguantar más repeticiones: cargas ligeras, muchas repeticiones y poco descanso.", sets: 3, reps: "15-20", rest: 45, rir: "RIR 2-3", sistemas: "Circuito, series largas, superserie", tipos: ["compuesto", "aislamiento", "peso_corporal", "core"] },
  cardio: { meta: "Mejorar el corazón y los pulmones con trabajo continuo o por intervalos.", sets: 1, reps: "20-40 min", rest: 0, rir: "Zona 2-3", sistemas: "Continuo, intervalos, fartlek", tipos: ["cardio"] },
  velocidad: { meta: "Aceleración, cambios de dirección y reacción. Esfuerzos cortos y descanso completo.", sets: 6, reps: "10-30 m", rest: 90, rir: "Máxima velocidad", sistemas: "Sprints, escalera de agilidad, contraste", tipos: ["pliometria", "cardio", "lanzamiento"] },
  deportivo: { meta: "Gestos y cualidades del deporte del socio (salto, cambio de ritmo, golpeo).", sets: 4, reps: "6-10", rest: 90, rir: "RIR 2", sistemas: "Contraste, circuito específico", tipos: ["pliometria", "lanzamiento", "compuesto", "olimpico"] },
  core: { meta: "Estabilidad del tronco: anti-extensión, anti-rotación y control.", sets: 3, reps: "10-15 / 30 s", rest: 45, rir: "Técnica controlada", sistemas: "Circuito, superserie, isometría", tipos: ["core", "core_iso"] },
  movilidad: { meta: "Ganar rango de movimiento articular de forma activa y controlada.", sets: 2, reps: "8-10 lentas", rest: 30, rir: "Sin dolor", sistemas: "Flujo, circuito suave", tipos: ["estiramiento", "core_iso"] },
  flexibilidad: { meta: "Alargar el músculo con estiramientos sostenidos al final o en días suaves.", sets: 2, reps: "30-45 s", rest: 15, rir: "Tensión suave", sistemas: "Estático, FNP (contraer-relajar)", tipos: ["estiramiento"] },
  equilibrio: { meta: "Control del cuerpo y propiocepción: apoyos inestables y a una pierna.", sets: 3, reps: "30 s / 8-10", rest: 45, rir: "Control", sistemas: "Circuito, progresión ojos cerrados", tipos: ["core_iso", "peso_corporal"] },
  postura: { meta: "Fortalecer espalda alta, glúteos y tronco para corregir la postura.", sets: 3, reps: "12-15", rest: 60, rir: "RIR 3", sistemas: "Biserie con movilidad", tipos: ["aislamiento", "core_iso", "estiramiento"] },
  prevencion: { meta: "Reforzar zonas que suelen lesionarse (hombro, rodilla, tobillo, zona lumbar).", sets: 3, reps: "12-15", rest: 45, rir: "RIR 3-4", sistemas: "Circuito suave, excéntricos", tipos: ["aislamiento", "core_iso", "peso_corporal"] },
  rehabilitacion: { meta: "Volver a cargar después de una lesión, con dolor bajo control.", sets: 3, reps: "10-15", rest: 60, rir: "Dolor ≤ 3/10", sistemas: "Isometría, excéntricos lentos", tipos: ["aislamiento", "core_iso", "estiramiento", "peso_corporal"] },
  recuperacion: { meta: "Moverse suave para recuperar: poca carga, buen flujo sanguíneo.", sets: 2, reps: "10-12", rest: 30, rir: "Muy fácil", sistemas: "Continuo suave, movilidad", tipos: ["cardio", "estiramiento"] },
  adulto_mayor: { meta: "Fuerza, equilibrio y autonomía con movimientos seguros y controlados.", sets: 2, reps: "10-12", rest: 90, rir: "RIR 3-4", sistemas: "Circuito suave, series simples", tipos: ["peso_corporal", "aislamiento", "core_iso", "estiramiento"] },
};

const seg = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min` : `${s} s`);

export const GuiaSesion = ({ tipo, nEjercicios = 0, onAplicar, filtroActivo, onFiltro }) => {
  const g = GUIA_SESION[tipo];
  const t = tipoDia(tipo);
  if (!g || !t) return null;
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm text-slate-800 flex-1 min-w-[220px]">
          <b className="text-indigo-800">{t[1]} {t[2]}:</b> {g.meta}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {onFiltro && (
            <button
              type="button"
              onClick={onFiltro}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer flex items-center gap-1 ${filtroActivo ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"}`}
              title="El banco muestra solo ejercicios que encajan con este tipo de sesión"
            >
              <Filter className="w-3.5 h-3.5" /> {filtroActivo ? "Banco filtrado" : "Filtrar banco"}
            </button>
          )}
          {onAplicar && nEjercicios > 0 && (
            <button
              type="button"
              onClick={() => onAplicar({ sets: g.sets, reps: g.reps, restSeconds: g.rest, rir: g.rir })}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1"
              title="Pone estas series, repeticiones y descanso en todos los ejercicios del día"
            >
              <Wand2 className="w-3.5 h-3.5" /> Aplicar a los {nEjercicios} ejercicios
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
        {[
          ["Series", g.sets],
          ["Repeticiones", g.reps],
          ["Descanso", g.rest ? seg(g.rest) : "—"],
          ["Esfuerzo", g.rir],
          ["Sistemas", g.sistemas],
        ].map(([k, v]) => (
          <div key={k} className={`rounded-lg bg-white border border-indigo-100 px-2 py-1 ${k === "Sistemas" ? "col-span-2 sm:col-span-1" : ""}`}>
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{k}</span>
            <span className="block font-bold text-slate-900 leading-tight">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
