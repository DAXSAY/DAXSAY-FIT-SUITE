// Objetivos de entrenamiento del alumno. Puede tener varios a la vez
// (ej. bajar de peso + tonificar): se guardan separados por coma.
// La MISMA lista que usan las rutinas (así matrícula, ficha, rutinas y reportes hablan igual)
import { OBJETIVOS_RUTINA } from "./rutinas";
export const OBJETIVOS_ALUMNO = OBJETIVOS_RUTINA;
export const listaObjetivos = (v) =>
  (Array.isArray(v) ? v : String(v || "").split(","))
    .map((x) => x.trim())
    .map((x) => (x === "salud_rehabilitacion" ? "rehabilitacion" : x))
    .filter((x) => OBJETIVOS_ALUMNO.some(([k]) => k === x));
/** "Ganancia muscular ·  Pérdida de grasa" */
export const textoObjetivos = (v, corto = false) => {
  const l = listaObjetivos(v);
  if (!l.length) return "—";
  return l
    .map((k) => {
      const o = OBJETIVOS_ALUMNO.find(([x]) => x === k);
      return `${o[1]} ${corto ? o[2].split(" /")[0].split(",")[0] : o[2]}`;
    })
    .join(" · ");
};
/** El primero (para cálculos que necesitan uno solo, ej. calorías) */
export const objetivoPrincipal = (v) => listaObjetivos(v)[0] || "tonificacion";
/** Objetivo del alumno -> objetivo de la calculadora de nutrición */
const A_NUTRICION = {
  potencia: "fuerza", deportivo: "fuerza", acondicionamiento: "salud_rehabilitacion", funcional: "resistencia",
  movilidad: "salud_rehabilitacion", postura: "salud_rehabilitacion", rehabilitacion: "salud_rehabilitacion",
};
export const objetivoNutricion = (v) => {
  const o = objetivoPrincipal(v);
  return A_NUTRICION[o] || o;
};
