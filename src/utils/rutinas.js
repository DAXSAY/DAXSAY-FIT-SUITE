// Objetivos y niveles de las rutinas de entrenamiento
export const OBJETIVOS_RUTINA = [
  ["hipertrofia", "💪", "Hipertrofia / ganancia muscular"],
  ["perdida_peso", "🔥", "Pérdida de grasa / definición"],
  ["recomposicion", "⚖️", "Recomposición corporal"],
  ["fuerza", "🏋️", "Fuerza máxima"],
  ["potencia", "⚡", "Potencia / explosividad"],
  ["tonificacion", "✨", "Tonificación / tonicidad"],
  ["resistencia", "🏃", "Resistencia muscular y cardio"],
  ["acondicionamiento", "🔄", "Acondicionamiento físico general"],
  ["funcional", "🤸", "Entrenamiento funcional"],
  ["movilidad", "🧘", "Movilidad y flexibilidad"],
  ["postura", "🧍", "Postura y core"],
  ["rehabilitacion", "🩺", "Readaptación / post-lesión"],
  ["adulto_mayor", "👵", "Salud y adulto mayor"],
  ["deportivo", "⚽", "Rendimiento deportivo"],
];

export const NIVELES_RUTINA = [
  ["acondicionamiento", "🌱", "Acondicionamiento", "Recién empieza o vuelve tras mucho tiempo"],
  ["principiante", "🟢", "Principiante", "Menos de 6 meses entrenando"],
  ["intermedio", "🟡", "Intermedio", "6 meses a 2 años"],
  ["avanzado", "🔴", "Avanzado", "Más de 2 años, buena técnica"],
  ["experto", "🏆", "Experto", "Atleta o competidor, más de 5 años y técnica dominada"],
];

export const textoObjetivoRutina = (k) => {
  const o = OBJETIVOS_RUTINA.find(([x]) => x === k);
  return o ? `${o[1]} ${o[2]}` : k || "—";
};
export const textoNivelRutina = (k) => {
  const n = NIVELES_RUTINA.find(([x]) => x === k);
  return n ? `${n[1]} ${n[2]}` : k || "—";
};
