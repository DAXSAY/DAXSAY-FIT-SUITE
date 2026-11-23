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

/** "05:15 AM" o "05:15" (24 h) → minutos; acepta también números */
const minDe = (v) => (typeof v === "number" ? v : aMin(v));

/**
 * Lleva un registro de agenda al formato actual.
 * Formato actual (modelo 2): turnos con inicio y fin libres, p. ej.
 *   5:00–5:15 (15 min), 5:15–5:35 (20 min), 5:35–6:05 (30 min).
 * Formatos anteriores: bloques de 15 min + una duración fija, u horas completas.
 * Todo se convierte a { turnos: [{ini, fin}], bloques, duracion } sin perder nada.
 */
export const normalizarAgenda = (reg) => {
  if (!reg) return null;
  let lista;
  if (Array.isArray(reg.turnos)) {
    lista = reg.turnos
      .map((t) => ({ ini: minDe(t.inicio ?? t.ini), fin: minDe(t.fin) }))
      .filter((t) => t.ini != null && t.fin != null && t.fin > t.ini);
  } else {
    const horas = reg.horas || [];
    const bloques0 =
      reg.paso === PASO
        ? horas
        : horas.flatMap((h) => {
            const ini = aMin(h);
            return ini == null ? [] : [0, 15, 30, 45].map((d) => deMin(ini + d));
          });
    const dur = DURACIONES.includes(Number(reg.duracion)) ? Number(reg.duracion) : reg.paso === PASO ? DURACION_POR_DEFECTO : 45;
    lista = turnos(bloques0, dur).map((t) => ({ ini: t.min, fin: t.min + dur }));
  }
  // ordenados y sin repetidos
  const vistos = new Set();
  lista = lista
    .sort((a, b) => a.ini - b.ini || a.fin - b.fin)
    .filter((t) => {
      const k = `${t.ini}-${t.fin}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  const bloques = [];
  lista.forEach((t) => {
    for (let m = Math.floor(t.ini / PASO) * PASO; m < t.fin; m += PASO) bloques.push(deMin(m));
  });
  const durs = lista.map((t) => t.fin - t.ini);
  const duracion = durs.length ? durs.sort((a, b) => durs.filter((x) => x === b).length - durs.filter((x) => x === a).length)[0] : DURACION_POR_DEFECTO;
  return {
    turnos: lista.map((t) => ({ ...t, inicio: deMin(t.ini), final: deMin(t.fin), dur: t.fin - t.ini })),
    bloques: [...new Set(bloques)].sort((a, b) => aMin(a) - aMin(b)),
    duracion,
  };
};

/** Minutos totales de atención de una lista de turnos */
export const minutosTurnos = (lista) => (lista || []).reduce((a, t) => a + (t.fin - t.ini), 0);

/** "5:00 – 5:15 AM" (mismo AM/PM) o "11:45 AM – 12:15 PM" */
export const rangoTexto = (ini, fin) => {
  const a = deMin(ini), b = deMin(fin);
  return a.slice(-2) === b.slice(-2) ? `${corta(ini)} – ${corta(fin)} ${b.slice(-2)}` : `${corta(ini)} ${a.slice(-2)} – ${corta(fin)} ${b.slice(-2)}`;
};

/** Parte del día de un minuto: mañana (antes de 12), tarde (12–18) o noche */
export const parteDelDia = (min) => (min < 720 ? "manana" : min < 1080 ? "tarde" : "noche");

/** Turnos que se cruzan entre sí (para avisar antes de guardar) */
export const cruces = (lista) => {
  const out = new Set();
  const l = [...(lista || [])].sort((a, b) => a.ini - b.ini);
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length && l[j].ini < l[i].fin; j++) {
    out.add(i);
    out.add(j);
  }
  return [...out].map((i) => l[i]);
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
