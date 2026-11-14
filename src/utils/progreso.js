// =====================================================================
// Cálculo del progreso de pesos (mismos números en pantalla, PDF y Excel)
//
// ¿Cómo comparar 3 x 15 con 40 kg contra 4 x 10 con 45 kg?
// Con la FUERZA ESTIMADA (1RM estimado, fórmula de Epley):
//     fuerza = peso × (1 + repeticiones / 30)
// Se toma la MEJOR serie de cada sesión. Así una serie de 40 kg x 15 (60 kg)
// y otra de 45 kg x 10 (60 kg) valen lo mismo, aunque cambien series o
// repeticiones. Además se muestran el peso máximo y el volumen (kg movidos).
//
// Semáforo (contra la sesión anterior del mismo ejercicio):
//   sube  >= +2 %   ·   igual entre -2 % y +2 %   ·   baja <= -2 %
// =====================================================================

export const UMBRAL = 2; // % para decir que subió o bajó

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const r1 = (n) => Math.round(n * 10) / 10;
export const kg = (n) => (n === null || n === undefined || !Number.isFinite(n) ? "—" : `${r1(n).toLocaleString("es-PE")} kg`);
export const pct = (n) => (n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : ""}${r1(n)} %`);
export const masMenos = (n, u = "kg") =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : ""}${r1(n).toLocaleString("es-PE")} ${u}`;

/** Primer número de las repeticiones planificadas: "8-12" -> 8, "15" -> 15 */
export const repsBase = (txt) => {
  const m = String(txt || "").match(/\d+/);
  return m ? Number(m[0]) : null;
};

/** Fuerza estimada de una serie */
export const fuerzaSerie = (peso, reps) => {
  if (!(peso > 0)) return 0;
  const r = reps > 0 ? Math.min(reps, 30) : 1;
  return peso * (1 + r / 30);
};

/** Lunes de la semana de una fecha AAAA-MM-DD */
export const lunesDe = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
};
export const sumar = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const diaSemana = (iso) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
export const fechaBonita = (iso) => {
  const [, m, d] = String(iso).split("-");
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
};
export const mesBonito = (clave) => {
  const [a, m] = clave.split("-");
  return `${MESES[Number(m) - 1]} ${a}`;
};

export const tendencia = (delta) =>
  delta === null || delta === undefined || !Number.isFinite(delta) ? "nuevo" : delta >= UMBRAL ? "sube" : delta <= -UMBRAL ? "baja" : "igual";

export const ESTILO_TENDENCIA = {
  sube: { icono: "▲", texto: "Progresó", clase: "text-emerald-700 bg-emerald-50 border-emerald-200", color: "#059669" },
  igual: { icono: "●", texto: "Se mantiene", clase: "text-slate-600 bg-slate-50 border-slate-200", color: "#64748b" },
  baja: { icono: "▼", texto: "Bajó", clase: "text-rose-700 bg-rose-50 border-rose-200", color: "#e11d48" },
  nuevo: { icono: "★", texto: "Primer registro", clase: "text-blue-700 bg-blue-50 border-blue-200", color: "#2563eb" },
};

const variacion = (actual, anterior) => (anterior > 0 ? ((actual - anterior) / anterior) * 100 : null);

/** Agrupa las filas por sesión (fecha + ejercicio) y calcula sus métricas */
export function sesionesDe(registros) {
  const mapa = new Map();
  for (const f of registros) {
    const k = `${f.fecha}|${f.clave}`;
    if (!mapa.has(k)) {
      mapa.set(k, {
        fecha: f.fecha,
        clave: f.clave,
        nombre: f.nombre,
        grupo: f.grupo,
        dia: f.dia,
        seriesPlan: f.seriesPlan,
        repsPlan: f.repsPlan,
        series: [],
      });
    }
    mapa.get(k).series.push({ serie: f.serie, peso: f.peso, reps: f.reps });
  }
  return [...mapa.values()]
    .map((s) => {
      s.series.sort((a, b) => a.serie - b.serie);
      const base = repsBase(s.repsPlan);
      let mejor = null;
      let volumen = 0;
      let repsTot = 0;
      for (const x of s.series) {
        const r = x.reps ?? base ?? 0;
        const f = fuerzaSerie(x.peso, r);
        volumen += x.peso * r;
        repsTot += r;
        if (!mejor || f > mejor.fuerza || (f === mejor.fuerza && x.peso > mejor.peso)) mejor = { ...x, reps: r || x.reps, fuerza: f };
      }
      const pesoMax = Math.max(...s.series.map((x) => x.peso));
      const corporal = pesoMax === 0; // ejercicio con peso corporal: se compara por repeticiones
      return {
        ...s,
        pesoMax,
        volumen,
        repsTot,
        mejor,
        fuerza: corporal ? repsTot : mejor?.fuerza || 0,
        corporal,
        completa: s.seriesPlan ? s.series.length >= s.seriesPlan : true,
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Análisis por ejercicio: última vs anterior, semana vs semana, mes vs mes y vs inicio */
export function analizarEjercicios(sesiones) {
  const porClave = new Map();
  for (const s of sesiones) {
    if (!porClave.has(s.clave)) porClave.set(s.clave, []);
    porClave.get(s.clave).push(s);
  }
  return [...porClave.entries()]
    .map(([clave, lista]) => {
      const ultima = lista[lista.length - 1];
      const previa = lista[lista.length - 2] || null;
      const inicio = lista[0];
      const mejorDe = (arr) => arr.reduce((m, s) => (!m || s.fuerza > m.fuerza ? s : m), null);
      const semanas = agrupar(lista, (s) => lunesDe(s.fecha)).map(([k, arr]) => ({ clave: k, mejor: mejorDe(arr), sesiones: arr }));
      const meses = agrupar(lista, (s) => s.fecha.slice(0, 7)).map(([k, arr]) => ({ clave: k, mejor: mejorDe(arr), sesiones: arr }));
      const deltaSesion = previa ? variacion(ultima.fuerza, previa.fuerza) : null;
      const semA = semanas[semanas.length - 1];
      const semB = semanas[semanas.length - 2];
      const mesA = meses[meses.length - 1];
      const mesB = meses[meses.length - 2];
      // Mejor marca de las 4 sesiones anteriores: detecta si bajó y se quedó abajo
      const recientes = lista.slice(Math.max(0, lista.length - 5), lista.length - 1);
      const mejorReciente = recientes.reduce((m, s) => (!m || s.fuerza > m.fuerza ? s : m), null);
      // Bajas seguidas (para alertar al entrenador)
      let bajas = 0;
      for (let i = lista.length - 1; i > 0; i--) {
        if (tendencia(variacion(lista[i].fuerza, lista[i - 1].fuerza)) === "baja") bajas++;
        else break;
      }
      return {
        clave,
        nombre: ultima.nombre,
        grupo: ultima.grupo,
        corporal: ultima.corporal,
        sesiones: lista,
        ultima,
        previa,
        inicio,
        record: mejorDe(lista),
        deltaSesion,
        deltaSesionKg: previa ? ultima.pesoMax - previa.pesoMax : null,
        tendencia: tendencia(deltaSesion),
        deltaSemana: semA && semB ? variacion(semA.mejor.fuerza, semB.mejor.fuerza) : null,
        deltaSemanaKg: semA && semB ? semA.mejor.pesoMax - semB.mejor.pesoMax : null,
        deltaMes: mesA && mesB ? variacion(mesA.mejor.fuerza, mesB.mejor.fuerza) : null,
        deltaMesKg: mesA && mesB ? mesA.mejor.pesoMax - mesB.mejor.pesoMax : null,
        deltaTotal: lista.length > 1 ? variacion(ultima.fuerza, inicio.fuerza) : null,
        deltaTotalKg: lista.length > 1 ? ultima.pesoMax - inicio.pesoMax : null,
        semanas,
        meses,
        bajasSeguidas: bajas,
        mejorReciente,
        deltaVsMejor: mejorReciente ? variacion(ultima.fuerza, mejorReciente.fuerza) : null,
        deltaVsMejorKg: mejorReciente ? ultima.pesoMax - mejorReciente.pesoMax : null,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function agrupar(lista, fnClave) {
  const m = new Map();
  for (const x of lista) {
    const k = fnClave(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/** Resumen general para tarjetas (alumno, entrenador y administración) */
export function resumenGeneral(datos) {
  const sesiones = sesionesDe(datos.registros || []);
  const ejercicios = analizarEjercicios(sesiones);
  const fechas = [...new Set(sesiones.map((s) => s.fecha))].sort();
  const asist = new Set(datos.asistencias || []);
  const hoy = datos.hoy;
  const hace30 = sumar(hoy, -30);
  const sinRegistrar = [...asist].filter((f) => f >= hace30 && !fechas.includes(f)).sort();
  const conDatos = ejercicios.filter((e) => e.deltaTotal !== null);
  const indice = conDatos.length ? conDatos.reduce((t, e) => t + e.deltaTotal, 0) / conDatos.length : null;
  const conteo = { sube: 0, igual: 0, baja: 0, nuevo: 0 };
  ejercicios.forEach((e) => conteo[e.tendencia]++);
  const asis30 = [...asist].filter((f) => f >= hace30).length;
  const ses30 = fechas.filter((f) => f >= hace30).length;
  // Cumplimiento = de los días que vino (asistencia), en cuántos anotó sus pesos
  const anotoAlVenir = asis30 - sinRegistrar.length;
  return {
    sesiones,
    ejercicios,
    fechas,
    primera: fechas[0] || null,
    ultima: fechas[fechas.length - 1] || null,
    totalSesiones: fechas.length,
    semanasEntrenadas: new Set(fechas.map(lunesDe)).size,
    volumenTotal: sesiones.reduce((t, s) => t + s.volumen, 0),
    indice, // % promedio de mejora de fuerza desde el inicio
    conteo,
    alertas: ejercicios.filter(
      (e) => e.bajasSeguidas >= 2 || (e.deltaSesion !== null && e.deltaSesion <= -5) || (e.deltaVsMejor !== null && e.deltaVsMejor <= -5),
    ),
    sinRegistrar,
    asistencias30: asis30,
    sesiones30: ses30,
    anotoAlVenir,
    cumplimiento: asis30 ? Math.round((anotoAlVenir / asis30) * 100) : null,
  };
}

/** Sugerencia del día de rutina: el siguiente al último que registró (si faltó, sigue el orden) */
export function diaSugerido(plan, sesiones) {
  const dias = plan?.dias || [];
  if (!dias.length) return 0;
  const ultima = [...sesiones].reverse().find((s) => s.dia);
  if (!ultima) return 0;
  const i = dias.findIndex((d) => d.nombre === ultima.dia);
  return i < 0 ? 0 : (i + 1) % dias.length;
}

/** Texto corto de una sesión: "40 · 40 · 37.5 kg" */
export const textoSeries = (s) => {
  if (!s) return "";
  if (s.series.every((x) => !(x.peso > 0))) return "Peso corporal";
  return `${s.series.map((x) => (x.peso > 0 ? r1(x.peso).toLocaleString("es-PE") : "PC")).join(" · ")} kg`;
};
/** Mejor serie en texto: "45 kg × 10" o "12 reps (peso corporal)" */
export const textoMejor = (s) =>
  !s ? "—" : s.corporal ? `${s.repsTot} reps` : `${kg(s.mejor?.peso)} × ${s.mejor?.reps ?? "?"}`;
export const textoReps = (s) => (s ? s.series.map((x) => (x.reps ?? "–")).join(" · ") : "");

/** Filas planas para Excel / PDF (detalle serie por serie) */
export function filasDetalle(sesiones) {
  const lista = [];
  for (const s of sesiones) {
    for (const x of s.series) {
      lista.push({
        fecha: s.fecha,
        semana: lunesDe(s.fecha),
        dia: s.dia || "",
        ejercicio: s.nombre,
        plan: `${s.seriesPlan || "?"} x ${s.repsPlan || "?"}`,
        serie: x.serie,
        peso: x.peso,
        reps: x.reps ?? "",
        fuerza: r1(fuerzaSerie(x.peso, x.reps ?? repsBase(s.repsPlan) ?? 0)),
      });
    }
  }
  return lista;
}
