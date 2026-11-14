// =====================================================================
// PROGRESO DE PESOS POR SERIE (tabla registro_peso_serie, script 24)
//  - El alumno anota el peso y las repeticiones de cada serie de SU rutina,
//    eligiendo el día de la rutina y la fecha (si faltó un día, igual anota).
//  - El entrenador, administración y recepción ven el progreso.
//  - Cada fila guarda una copia de lo planificado: si la rutina cambia,
//    el historial no se pierde.
// Los cálculos de progreso se hacen en src/utils/progreso.js (mismos datos
// para la pantalla, el PDF y el Excel).
// =====================================================================
import { Router } from "express";
import { consultar, transaccion } from "../db.js";
import { ErrorHttp, tienePermiso } from "../seguridad.js";
import { hoyLima, sumarDias } from "../congelamiento.js";
import { codigoAlumno } from "../codigoAlumno.js";

const router = Router();

const SIN_TABLA = "Falta ejecutar base_datos/24_pesos_por_serie.sql en Workbench (como root) para usar el progreso de pesos.";
const DIAS_ATRAS_ALUMNO = 31; // el alumno puede corregir o completar hasta un mes atrás
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

let hayTabla = null;
async function exigirTabla() {
  if (hayTabla) return;
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'registro_peso_serie'",
  );
  hayTabla = Number(f?.n) > 0;
  if (!hayTabla) throw new ErrorHttp(503, SIN_TABLA);
}

const leer = (f) => (typeof f.datos === "string" ? JSON.parse(f.datos) : f.datos);
const txt = (v, max) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};
const sinTildes = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Clave estable del ejercicio: código del banco o el nombre normalizado */
export const claveEjercicio = (ex) =>
  ex?.exerciseId ? String(ex.exerciseId).slice(0, 150) : `n:${sinTildes(ex?.exerciseName || ex?.nombre)}`.slice(0, 150);

/** Rutina vigente del alumno (la asignada; si no, la última diseñada para él) */
export async function rutinaDe(idalumno) {
  const [asig] = await consultar(
    "SELECT datos FROM registros_app WHERE modulo = 'asignaciones_rutina' AND idalumno = ? ORDER BY fecha_actualizacion DESC LIMIT 1",
    [idalumno],
  );
  const routineId = asig ? leer(asig)?.routineId : null;
  if (routineId) {
    const [r] = await consultar("SELECT idregistro, datos FROM registros_app WHERE modulo = 'rutinas' AND idregistro = ?", [String(routineId)]);
    if (r) return { id: r.idregistro, ...leer(r) };
  }
  const [r] = await consultar(
    "SELECT idregistro, datos FROM registros_app WHERE modulo = 'rutinas' AND idalumno = ? ORDER BY fecha_actualizacion DESC LIMIT 1",
    [idalumno],
  );
  return r ? { id: r.idregistro, ...leer(r) } : null;
}

/** Solo lo que la pantalla necesita de la rutina */
export function planDe(rutina) {
  if (!rutina) return null;
  return {
    id: String(rutina.id),
    titulo: rutina.title || "Rutina",
    entrenador: rutina.trainerName || "",
    dias: (Array.isArray(rutina.days) ? rutina.days : []).map((d, i) => {
      // El mismo ejercicio puede repetirse en un día (calentamiento y trabajo, por ejemplo):
      // la 2.ª vez se registra aparte ("#2") para no mezclar sus series.
      const vistas = new Map();
      return {
      nombre: d.dayName || `Día ${i + 1}`,
      enfoque: d.focus || "",
      ejercicios: (d.exercises || []).map((e) => {
        const base = claveEjercicio(e);
        const n = (vistas.get(base) || 0) + 1;
        vistas.set(base, n);
        return {
        clave: n > 1 ? `${base}#${n}`.slice(0, 150) : base,
        nombre: `${e.exerciseName || "Ejercicio"}${n > 1 ? ` (${n}.ª vez)` : ""}`,
        grupo: e.muscleGroup || "",
        gifUrl: e.gifUrl || e.videoUrl || "",
        exerciseId: e.exerciseId || "",
        series: Math.min(Math.max(Number(e.sets) || 1, 1), 20),
        reps: String(e.reps || ""),
        descanso: Number(e.restSeconds) || 0,
        notas: e.notes || "",
        };
      }),
      };
    }),
  };
}

/**
 * Qué alumno se consulta y si el usuario puede anotar.
 * Alumno: solo él mismo. Personal: ver con permiso de alumnos o rutinas;
 * anotar solo con permiso de editar rutinas (entrenador / administración).
 */
async function acceso(req, escribir = false) {
  const { idusuario, rol } = req.usuario;
  const pedido = String(req.params.idalumno || "");
  if (!/^\d+$/.test(pedido)) throw new ErrorHttp(400, "Alumno inválido");
  if (rol === "student") {
    const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [idusuario]);
    if (!u?.idalumno || String(u.idalumno) !== pedido) throw new ErrorHttp(403, "Solo puedes ver tu propio progreso");
    return { idalumno: Number(pedido), esAlumno: true, puedeAnotar: true };
  }
  const ver = await tienePermiso(idusuario, ["members", "routines"], "ver");
  if (!ver) throw new ErrorHttp(403, "No tienes permiso para ver el progreso de los alumnos");
  const anotar = await tienePermiso(idusuario, "routines", "editar");
  if (escribir && !anotar) throw new ErrorHttp(403, "Solo el entrenador o administración pueden anotar pesos de un alumno");
  return { idalumno: Number(pedido), esAlumno: false, puedeAnotar: anotar };
}

async function alumnoBasico(idalumno) {
  const [a] = await consultar(
    "SELECT idalumno, codigo, nombres, apellidos, objetivo, activo FROM alumnos WHERE idalumno = ?",
    [idalumno],
  );
  if (!a) throw new ErrorHttp(404, "Alumno no encontrado");
  return {
    id: String(a.idalumno),
    nombre: `${a.nombres} ${a.apellidos}`.trim(),
    codigo: codigoAlumno(a.codigo, a.nombres, a.apellidos),
    objetivo: a.objetivo,
    activo: !!a.activo,
  };
}

const fila = (r) => ({
  fecha: r.fecha,
  dia: r.dia_rutina || "",
  rutina: r.rutina_titulo || "",
  clave: r.clave_ejercicio,
  nombre: r.nombre_ejercicio,
  grupo: r.grupo_muscular || "",
  seriesPlan: r.series_plan,
  repsPlan: r.reps_plan || "",
  serie: r.serie,
  peso: Number(r.peso_kg),
  reps: r.repeticiones,
  por: r.registrado_por,
});

// GET /api/progreso/alumnos -> lista para el entrenador / administración:
// a quién le toca registrar y quién no está anotando sus pesos.
router.get("/alumnos", async (req, res, next) => {
  try {
    if (req.usuario.rol === "student") throw new ErrorHttp(403, "Solo para el personal");
    if (!(await tienePermiso(req.usuario.idusuario, ["members", "routines"], "ver"))) throw new ErrorHttp(403, "Sin permiso");
    await exigirTabla();
    const [yo] = await consultar("SELECT idempleado FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
    const filas = await consultar(
      `SELECT a.idalumno, a.codigo, a.nombres, a.apellidos, a.identrenador,
              (SELECT MAX(p.fecha) FROM registro_peso_serie p WHERE p.idalumno = a.idalumno) AS ultimo_registro,
              (SELECT COUNT(DISTINCT p.fecha) FROM registro_peso_serie p
                WHERE p.idalumno = a.idalumno AND p.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS sesiones30,
              (SELECT COUNT(DISTINCT s.fecha) FROM asistencias_alumno s
                WHERE s.idalumno = a.idalumno AND s.tipo = 'entrada' AND s.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS asistencias30,
              (SELECT COUNT(DISTINCT s.fecha) FROM asistencias_alumno s
                WHERE s.idalumno = a.idalumno AND s.tipo = 'entrada' AND s.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                  AND NOT EXISTS (SELECT 1 FROM registro_peso_serie p WHERE p.idalumno = a.idalumno AND p.fecha = s.fecha)) AS sin_registrar30,
              EXISTS (SELECT 1 FROM registros_app r WHERE r.idalumno = a.idalumno AND r.modulo IN ('asignaciones_rutina', 'rutinas')) AS tiene_rutina
         FROM alumnos a
        WHERE a.activo = 1
        ORDER BY a.apellidos, a.nombres`,
    );
    res.json(
      filas
        .filter((f) => f.tiene_rutina || f.ultimo_registro)
        .map((f) => ({
          id: String(f.idalumno),
          nombre: `${f.nombres} ${f.apellidos}`.trim(),
          codigo: codigoAlumno(f.codigo, f.nombres, f.apellidos),
          mio: !!(yo?.idempleado && f.identrenador === yo.idempleado),
          ultimoRegistro: f.ultimo_registro,
          sesiones30: Number(f.sesiones30 || 0),
          asistencias30: Number(f.asistencias30 || 0),
          sinRegistrar30: Number(f.sin_registrar30 || 0),
          tieneRutina: !!f.tiene_rutina,
        })),
    );
  } catch (e) {
    next(e);
  }
});

// GET /api/progreso/:idalumno?desde=&hasta= -> rutina, registros y asistencias
router.get("/:idalumno", async (req, res, next) => {
  try {
    const a = await acceso(req);
    await exigirTabla();
    const hoy = hoyLima();
    const hasta = FECHA.test(req.query.hasta || "") ? req.query.hasta : hoy;
    const desde = FECHA.test(req.query.desde || "") ? req.query.desde : sumarDias(hoy, -400);
    const [alumno, rutina, registros, asistencias] = await Promise.all([
      alumnoBasico(a.idalumno),
      rutinaDe(a.idalumno),
      consultar(
        `SELECT fecha, dia_rutina, rutina_titulo, clave_ejercicio, nombre_ejercicio, grupo_muscular,
                series_plan, reps_plan, serie, peso_kg, repeticiones, registrado_por
           FROM registro_peso_serie
          WHERE idalumno = ? AND fecha BETWEEN ? AND ?
          ORDER BY fecha, clave_ejercicio, serie`,
        [a.idalumno, desde, hasta],
      ),
      consultar(
        `SELECT DISTINCT fecha FROM asistencias_alumno
          WHERE idalumno = ? AND tipo = 'entrada' AND fecha BETWEEN ? AND ? ORDER BY fecha`,
        [a.idalumno, desde, hasta],
      ),
    ]);
    res.json({
      alumno,
      plan: planDe(rutina),
      registros: registros.map(fila),
      asistencias: asistencias.map((x) => x.fecha),
      desde,
      hasta,
      hoy,
      puedeAnotar: a.puedeAnotar,
      diasAtras: a.esAlumno ? DIAS_ATRAS_ALUMNO : null,
    });
  } catch (e) {
    next(e);
  }
});

// PUT /api/progreso/:idalumno/sesion
// { fecha, dia, ejercicios: [{ clave, nombre, grupo, seriesPlan, repsPlan, series: [{ peso, reps }] }] }
// Reemplaza lo anotado ese día para esos ejercicios (las series vacías se borran).
router.put("/:idalumno/sesion", async (req, res, next) => {
  try {
    const a = await acceso(req, true);
    await exigirTabla();
    const { fecha, dia, ejercicios } = req.body || {};
    const hoy = hoyLima();
    if (!FECHA.test(fecha || "")) throw new ErrorHttp(400, "Fecha inválida");
    if (fecha > hoy) throw new ErrorHttp(400, "No puedes anotar pesos de un día que aún no llega");
    if (a.esAlumno && fecha < sumarDias(hoy, -DIAS_ATRAS_ALUMNO)) {
      throw new ErrorHttp(400, `Solo puedes anotar o corregir hasta ${DIAS_ATRAS_ALUMNO} días atrás. Pide a tu entrenador que lo corrija.`);
    }
    if (!Array.isArray(ejercicios) || !ejercicios.length) throw new ErrorHttp(400, "No hay ejercicios para guardar");
    if (ejercicios.length > 40) throw new ErrorHttp(400, "Demasiados ejercicios en una sesión");

    const rutina = await rutinaDe(a.idalumno);
    const plan = planDe(rutina);
    const delPlan = new Map((plan?.dias || []).flatMap((d) => d.ejercicios.map((e) => [e.clave, e])));

    const filas = [];
    const claves = new Set();
    for (const ex of ejercicios) {
      const clave = txt(ex?.clave, 150);
      if (!clave) throw new ErrorHttp(400, "Ejercicio sin identificar");
      if (claves.has(clave)) throw new ErrorHttp(400, "Un ejercicio aparece dos veces en la misma sesión");
      claves.add(clave);
      const p = delPlan.get(clave);
      const nombre = txt(p?.nombre || ex.nombre, 150);
      if (!nombre) throw new ErrorHttp(400, "Ejercicio sin nombre");
      const series = Array.isArray(ex.series) ? ex.series : [];
      if (series.length > 20) throw new ErrorHttp(400, `${nombre}: máximo 20 series`);
      series.forEach((s, i) => {
        const vacio = s?.peso === "" || s?.peso === null || s?.peso === undefined;
        if (vacio) return;
        const peso = Number(String(s.peso).replace(",", "."));
        if (!Number.isFinite(peso) || peso < 0 || peso > 999.99) throw new ErrorHttp(400, `${nombre}, serie ${i + 1}: peso inválido (0 a 999 kg)`);
        let reps = s.reps === "" || s.reps === null || s.reps === undefined ? null : Number(s.reps);
        if (reps !== null && (!Number.isInteger(reps) || reps < 0 || reps > 200)) {
          throw new ErrorHttp(400, `${nombre}, serie ${i + 1}: repeticiones inválidas`);
        }
        filas.push([
          a.idalumno, fecha, plan?.id || null, txt(plan?.titulo, 150), txt(dia, 120), clave, nombre,
          txt(p?.grupo || ex.grupo, 40), p ? p.series : Math.min(Number(ex.seriesPlan) || series.length, 20) || null,
          txt(p?.reps || ex.repsPlan, 20), i + 1, Math.round(peso * 100) / 100, reps,
          a.esAlumno ? "alumno" : "personal", req.usuario.idusuario,
        ]);
      });
    }

    await transaccion(async (cx) => {
      const lista = [...claves];
      await cx.query(
        `DELETE FROM registro_peso_serie WHERE idalumno = ? AND fecha = ? AND clave_ejercicio IN (${lista.map(() => "?").join(",")})`,
        [a.idalumno, fecha, ...lista],
      );
      if (filas.length) {
        await cx.query(
          `INSERT INTO registro_peso_serie (idalumno, fecha, rutina_ref, rutina_titulo, dia_rutina, clave_ejercicio, nombre_ejercicio,
                                            grupo_muscular, series_plan, reps_plan, serie, peso_kg, repeticiones, registrado_por, idusuario_registro)
           VALUES ?`,
          [filas],
        );
      }
    });
    res.json({ ok: true, series: filas.length });
  } catch (e) {
    next(e);
  }
});

export default router;
