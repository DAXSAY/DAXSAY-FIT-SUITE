// =====================================================================
// Datos comunes de los contratos del personal: duraciones, funciones por
// cargo, horario (cálculo automático de horas) y reglas de tardanza.
// =====================================================================

export const DURACIONES = {
  "1_month": { meses: 1, corto: "1 mes", label: "Contrato 1 Mes", clase: "bg-rose-100 text-rose-800" },
  "3_months": { meses: 3, corto: "3 meses", label: "Contrato 3 Meses", clase: "bg-amber-100 text-amber-800" },
  "6_months": { meses: 6, corto: "6 meses", label: "Contrato 6 Meses", clase: "bg-cyan-100 text-cyan-800" },
  "1_year": { meses: 12, corto: "1 año", label: "Contrato 1 Año", clase: "bg-emerald-100 text-emerald-800" },
};
export const etiquetaDuracion = (tipo) => DURACIONES[tipo]?.label || "Contrato 1 Año";

/** Fecha de fin: inicio + meses − 1 día (un contrato de 1 mes del 01/11 termina el 30/11) */
export function fechaFin(inicio, tipo) {
  const meses = DURACIONES[tipo]?.meses || 12;
  const d = new Date(`${inicio}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + meses);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const DIAS_SEMANA = [
  ["lu", "L"],
  ["ma", "M"],
  ["mi", "X"],
  ["ju", "J"],
  ["vi", "V"],
  ["sa", "S"],
  ["do", "D"],
];

/** Horas por día entre dos horas "06:00" y "14:00" */
export const horasEntre = (desde, hasta) => {
  const [h1, m1] = String(desde || "0:0").split(":").map(Number);
  const [h2, m2] = String(hasta || "0:0").split(":").map(Number);
  let min = h2 * 60 + m2 - (h1 * 60 + m1);
  if (min < 0) min += 24 * 60;
  return Math.round((min / 60) * 100) / 100;
};

/** Horas semanales a partir del horario { dias:[...], entrada, salida, refrigerio(min) } */
export const horasSemana = (h) => {
  if (!h?.dias?.length) return 0;
  const diarias = Math.max(0, horasEntre(h.entrada, h.salida) - (Number(h.refrigerio) || 0) / 60);
  return Math.round(diarias * h.dias.length * 10) / 10;
};

export const MODALIDADES = {
  full_time: { label: "Tiempo completo", sub: "Hasta 48 h por semana", horario: { dias: ["lu", "ma", "mi", "ju", "vi", "sa"], entrada: "06:00", salida: "14:00", refrigerio: 0 } },
  part_time: { label: "Medio tiempo", sub: "Menos de 4 h al día", horario: { dias: ["lu", "ma", "mi", "ju", "vi", "sa"], entrada: "18:00", salida: "22:00", refrigerio: 0 } },
  hourly: { label: "Por horas", sub: "Se paga lo trabajado", horario: { dias: ["lu", "mi", "vi"], entrada: "07:00", salida: "10:00", refrigerio: 0 } },
};

export const textoHorario = (h) => {
  if (!h?.dias?.length) return "";
  const nombres = { lu: "lun", ma: "mar", mi: "mié", ju: "jue", vi: "vie", sa: "sáb", do: "dom" };
  return `${h.dias.map((d) => nombres[d]).join(", ")} de ${h.entrada} a ${h.salida}${Number(h.refrigerio) ? ` (${h.refrigerio} min de refrigerio)` : ""}`;
};

// Funciones típicas por cargo (se eligen con un clic; se pueden agregar otras)
export const FUNCIONES_POR_ROL = {
  trainer: [
    "Orientar a los socios en sala de máquinas",
    "Armar y actualizar rutinas",
    "Corregir técnica y postura",
    "Dictar clases grupales",
    "Evaluar progreso (pesos y medidas)",
    "Velar por la seguridad en sala",
    "Ordenar discos y mancuernas al cierre",
    "Atender entrenamiento personal",
    "Hacer seguimiento a socios que no vienen",
    "Apoyar en ventas de membresías",
  ],
  physiotherapist: [
    "Evaluación fisioterapéutica inicial",
    "Sesiones de rehabilitación",
    "Prescribir ejercicio terapéutico",
    "Llevar la historia clínica",
    "Coordinar con entrenadores las restricciones",
    "Prevención de lesiones",
    "Charlas de postura y ergonomía",
  ],
  nutritionist: [
    "Evaluación nutricional y antropométrica",
    "Elaborar planes de alimentación",
    "Controles quincenales",
    "Recomendar suplementación",
    "Charlas de alimentación saludable",
    "Coordinar objetivos con entrenadores",
  ],
  receptionist: [
    "Atender a los socios en recepción",
    "Registrar matrículas y renovaciones",
    "Abrir y cerrar caja de su turno",
    "Vender productos de la tienda",
    "Controlar el ingreso (check-in)",
    "Atender WhatsApp y redes",
    "Hacer seguimiento a prospectos (CRM)",
    "Recordar vencimientos y deudas",
  ],
  maintenance: [
    "Limpieza de sala y vestuarios",
    "Desinfección de máquinas",
    "Mantenimiento preventivo de equipos",
    "Reportar averías",
    "Control de insumos de limpieza",
  ],
  manager: [
    "Supervisar al personal",
    "Elaborar horarios y turnos",
    "Revisar caja y reportes",
    "Gestionar proveedores",
    "Planificar campañas y metas",
    "Atender reclamos",
  ],
};

// Reglas de descuento por tardanza (editables por administración)
export const REGLAS_TARDANZA_BASE = {
  tolerancia: 10, // minutos sin descuento
  modo: "por_minuto", // por_minuto | monto_fijo | ninguno
  montoMinuto: 0.5, // S/ por minuto pasado la tolerancia
  montoFijo: 10, // S/ por cada tardanza
  diaCompletoDespues: 60, // pasado este tiempo se descuenta el día completo (0 = nunca)
  maxTardanzasMes: 3, // tardanzas permitidas antes de amonestación (0 = sin límite)
};

export const leerReglas = (config) => {
  try {
    const r = typeof config?.reglas_tardanza === "string" && config.reglas_tardanza ? JSON.parse(config.reglas_tardanza) : {};
    return { ...REGLAS_TARDANZA_BASE, ...r };
  } catch {
    return { ...REGLAS_TARDANZA_BASE };
  }
};

/** Descuento de una tardanza de `min` minutos para un sueldo diario `diario` */
export const descuentoTardanza = (min, reglas, diario = 0) => {
  const m = Number(min) || 0;
  if (m <= reglas.tolerancia) return 0;
  if (reglas.diaCompletoDespues && m >= reglas.diaCompletoDespues) return Math.round(diario * 100) / 100;
  if (reglas.modo === "monto_fijo") return Number(reglas.montoFijo) || 0;
  if (reglas.modo === "por_minuto") return Math.round((m - reglas.tolerancia) * (Number(reglas.montoMinuto) || 0) * 100) / 100;
  return 0;
};

export const textoReglas = (r) => {
  const partes = [`Tolerancia de ${r.tolerancia} min.`];
  if (r.modo === "por_minuto") partes.push(`Luego se descuenta S/ ${Number(r.montoMinuto).toFixed(2)} por minuto de retraso.`);
  if (r.modo === "monto_fijo") partes.push(`Cada tardanza descuenta S/ ${Number(r.montoFijo).toFixed(2)}.`);
  if (r.modo === "ninguno") partes.push("Las tardanzas no generan descuento.");
  if (Number(r.diaCompletoDespues)) partes.push(`Llegar ${r.diaCompletoDespues} min tarde o más descuenta el día completo.`);
  if (Number(r.maxTardanzasMes)) partes.push(`Más de ${r.maxTardanzasMes} tardanzas en el mes genera una amonestación.`);
  return partes.join(" ");
};
