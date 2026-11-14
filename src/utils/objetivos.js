// Objetivos de entrenamiento del alumno. Puede tener varios a la vez
// (ej. bajar de peso + tonificar): se guardan separados por coma.
export const OBJETIVOS_ALUMNO = [
  ["hipertrofia", "💪", "Ganancia muscular / hipertrofia"],
  ["perdida_peso", "🔥", "Pérdida de grasa / peso"],
  ["fuerza", "⚡", "Aumento de fuerza"],
  ["tonificacion", "✨", "Tonificación general"],
  ["resistencia", "🏃", "Resistencia cardiovascular y funcional"],
  ["rehabilitacion", "🩺", "Salud, postura / rehabilitación"],
];
export const listaObjetivos = (v) =>
  (Array.isArray(v) ? v : String(v || "").split(","))
    .map((x) => x.trim())
    .map((x) => (x === "salud_rehabilitacion" ? "rehabilitacion" : x))
    .filter((x) => OBJETIVOS_ALUMNO.some(([k]) => k === x));
/** "💪 Ganancia muscular · 🔥 Pérdida de grasa" */
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
