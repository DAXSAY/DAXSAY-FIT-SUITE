// Horario de atención de fisioterapia y nutrición en bloques de 15 minutos.
// Las horas se escriben como el resto del sistema: "06:15 AM".

export const PASO = 15; // minutos por bloque
export const INICIO_DIA = 5 * 60; // 05:00 AM
export const FIN_DIA = 23 * 60; // 11:00 PM (fin del último bloque)
export const DURACIONES = [10, 15, 20, 25, 30, 40, 45, 60];
export const DURACION_POR_DEFECTO = 30;

/** "06:15 AM" → 375 minutos desde la medianoche (null si no se entiende) */
export const aMin = (txt) => {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM|a\.?\s*m\.?|p\.?\s*m\.?)?/i.exec(String(txt || ""));
  if (!m) return null;
  let h = Number(m[1]) % 12;
  const pm = /p/i.test(m[3] || "");
  if (m[3]) h += pm ? 12 : 0;
  else h = Number(m[1]); // ya viene en 24 h
  return h * 60 + Number(m[2]);
};

/** 375 → "06:15 AM" */
export const deMin = (min) => {
  const h24 = Math.floor(min / 60) % 24;
  const mm = min % 60;
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
};

/** 375 → "6:15" (para chips pequeños) */
export const corta = (min) => {
  const h12 = Math.floor(min / 60) % 12 || 12;
  return `${h12}:${String(min % 60).padStart(2, "0")}`;
};

/** Todos los bloques posibles del día */
export const BLOQUES = Array.from({ length: (FIN_DIA - INICIO_DIA) / PASO }, (_, i) => deMin(INICIO_DIA + i * PASO));

/** Horas (inicio de cada hora) que cubre el día */
export const HORAS_DIA = Array.from({ length: (FIN_DIA - INICIO_DIA) / 60 }, (_, i) => deMin(INICIO_DIA + i * 60));

/**
 * Lleva un registro de agenda al formato de 15 minutos.
 * Los registros antiguos guardaban horas completas ("08:00 PM" = de 8 a 9):
 * cada una se convierte en sus 4 bloques, sin perder nada.
 */
export const normalizarAgenda = (reg) => {
  if (!reg) return null;
  const horas = reg.horas || [];
  let bloques;
  if (reg.paso === PASO) bloques = horas;
  else bloques = horas.flatMap((h) => {
    const ini = aMin(h);
    return ini == null ? [] : [0, 15, 30, 45].map((d) => deMin(ini + d));
  });
  const set = new Set(bloques.filter((b) => aMin(b) != null));
  return {
    bloques: [...set].sort((a, b) => aMin(a) - aMin(b)),
    duracion: DURACIONES.includes(Number(reg.duracion)) ? Number(reg.duracion) : reg.paso === PASO ? DURACION_POR_DEFECTO : 45,
  };
};

/** Bloques seguidos → ventanas [{ini, fin}] en minutos */
export const ventanas = (bloques) => {
  const mins = [...new Set((bloques || []).map(aMin).filter((x) => x != null))].sort((a, b) => a - b);
  const out = [];
  for (const m of mins) {
    const ult = out[out.length - 1];
    if (ult && ult.fin === m) ult.fin = m + PASO;
    else out.push({ ini: m, fin: m + PASO });
  }
  return out;
};

/** "2 h 30 min · 08:00 PM a 10:30 PM" (resume las ventanas del día) */
export const resumen = (bloques) => {
  const v = ventanas(bloques);
  if (!v.length) return "";
  const total = v.reduce((a, x) => a + (x.fin - x.ini), 0);
  const dur = `${Math.floor(total / 60) ? `${Math.floor(total / 60)} h` : ""}${total % 60 ? ` ${total % 60} min` : ""}`.trim();
  const tramos = v.map((x) => `${deMin(x.ini).replace(":00 ", " ")} a ${deMin(x.fin).replace(":00 ", " ")}`).join(", ");
  return `${dur} · ${tramos}`;
};

/** Minutos de atención del día */
export const minutosAbiertos = (bloques) => ventanas(bloques).reduce((a, x) => a + (x.fin - x.ini), 0);

/** Turnos que se pueden agendar: cada uno dura «duracion» y entra completo en una ventana */
export const turnos = (bloques, duracion) => {
  const out = [];
  for (const v of ventanas(bloques)) {
    for (let t = v.ini; t + duracion <= v.fin; t += duracion) out.push({ inicio: deMin(t), fin: deMin(t + duracion), min: t });
  }
  return out;
};

/** Inicio y fin (en minutos) de una cita a partir de su franja "06:15 AM - 06:45 AM" */
export const rangoCita = (cita) => {
  const partes = String(cita?.timeSlot || cita?.time || "").split(/\s*[-–]\s*/);
  const ini = aMin(partes[0]);
  if (ini == null) return null;
  let fin = partes[1] ? aMin(partes[1]) : null;
  if (fin == null || fin <= ini) fin = ini + (Number(cita?.durationMinutes) || 45);
  return { ini, fin };
};

/** ¿Se cruzan dos rangos? */
export const seCruzan = (a, b) => !!a && !!b && a.ini < b.fin && b.ini < a.fin;

/** Hora redonda que contiene un minuto: 375 → "06:00 AM" */
export const horaDeMin = (min) => deMin(Math.floor(min / 60) * 60);
