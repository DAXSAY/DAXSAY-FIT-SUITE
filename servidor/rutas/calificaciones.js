// =====================================================================
// CALIFICACIÓN DE LAS CLASES
//  - Después de su clase grupal (o máster) el alumno le pone de 1 a 5
//    estrellas, etiquetas rápidas y un comentario opcional. Tiene 7 días.
//  - Una sola calificación por alumno y por clase (no se puede repetir).
//  - Administración y recepción ven el promedio por profesor, disciplina y
//    los comentarios. El profesor ve solo las suyas y sin el nombre del
//    alumno (así los alumnos opinan con confianza).
// =====================================================================
import { Router } from "express";
import { consultar } from "../db.js";
import { ErrorHttp } from "../seguridad.js";
import { hoyLima, sumarDias } from "../congelamiento.js";
import { horaLima } from "./tareas.js";

const router = Router();
const DIAS_PARA_CALIFICAR = 7;
const ETIQUETAS = ["Buena música", "Muy intensa", "Bien explicada", "Me motivó", "Muy suave", "Empezó tarde", "Salón lleno", "Mucho calor", "Volvería"];
const hhmm = (v) => (v ? String(v).slice(0, 5) : "");
const fechaOk = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);
const iso = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

let hay = { v: null, t: 0 };
export async function tablaCalificaciones() {
  if (hay.v === true || Date.now() - hay.t < 20000) return hay.v;
  const [f] = await consultar("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clase_calificaciones'");
  hay = { v: Number(f?.n) === 1, t: Date.now() };
  return hay.v;
}
async function exigirTabla() {
  if (!(await tablaCalificaciones()))
    throw new ErrorHttp(503, "Falta ejecutar la parte 41 (41_steps_masters_calificaciones.sql) en MySQL Workbench para calificar las clases.");
}
async function alumnoDe(req) {
  const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  return u?.idalumno || null;
}
async function empleadoDe(req) {
  const [u] = await consultar("SELECT idempleado FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  return u?.idempleado || null;
}
async function hayMasters() {
  const [f] = await consultar("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_inscripciones'");
  return Number(f?.n) === 1;
}

/** Clases y másters que el alumno ya terminó en los últimos 7 días y aún no califica */
async function pendientesDe(idalumno) {
  const hoy = hoyLima();
  const desde = sumarDias(hoy, -DIAS_PARA_CALIFICAR);
  const ahora = horaLima();
  const ya = new Set((await consultar("SELECT clave FROM clase_calificaciones WHERE idalumno = ? AND fecha >= ?", [idalumno, desde])).map((f) => f.clave));
  const clases = await consultar(
    `SELECT DISTINCT r.idclase_grupal, r.fecha, c.hora_inicio, c.hora_fin, c.idempleado, d.iddisciplina,
            COALESCE(c.nombre, d.nombre) AS nombre, d.emoji, d.color,
            TRIM(CONCAT(IFNULL(e.nombres,''),' ',IFNULL(e.apellidos,''))) AS profesor,
            (SELECT dc.disco FROM clase_discos dc WHERE dc.idclase_grupal = r.idclase_grupal AND dc.fecha = r.fecha LIMIT 1) AS disco
       FROM clase_reservas r
       JOIN clases_grupales c ON c.idclase_grupal = r.idclase_grupal
       JOIN disciplinas d ON d.iddisciplina = c.iddisciplina
       LEFT JOIN empleados e ON e.idempleado = c.idempleado
      WHERE r.idalumno = ? AND r.estado IN ('reservado','asistio') AND r.fecha BETWEEN ? AND ?
      ORDER BY r.fecha DESC, c.hora_inicio DESC`,
    [idalumno, desde, hoy],
  );
  const lista = clases
    .map((f) => ({ ...f, fecha: iso(f.fecha) }))
    .filter((f) => f.fecha < hoy || hhmm(f.hora_fin) <= ahora)
    .map((f) => ({
      clave: `c-${f.idclase_grupal}-${f.fecha}`,
      tipo: "clase",
      claseId: f.idclase_grupal,
      fecha: f.fecha,
      inicio: hhmm(f.hora_inicio),
      fin: hhmm(f.hora_fin),
      titulo: f.nombre,
      emoji: f.emoji || "🎵",
      color: f.color || "teal",
      profesor: f.profesor || "Sin profesor",
      disco: f.disco || "",
      idempleado: f.idempleado || null,
      iddisciplina: f.iddisciplina,
    }));
  if (await hayMasters()) {
    const ms = await consultar(
      `SELECT m.idmaster, m.titulo, m.fecha, m.hora_inicio, m.hora_fin, m.idempleado, m.iddisciplina, d.emoji, d.color,
              TRIM(CONCAT(IFNULL(e.nombres,''),' ',IFNULL(e.apellidos,''))) AS profesor
         FROM master_inscripciones i
         JOIN masters m ON m.idmaster = i.idmaster
         LEFT JOIN disciplinas d ON d.iddisciplina = m.iddisciplina
         LEFT JOIN empleados e ON e.idempleado = m.idempleado
        WHERE i.idalumno = ? AND i.estado = 'inscrito' AND (i.asistio = 1 OR i.pagado = 1)
          AND m.estado <> 'cancelado' AND m.fecha BETWEEN ? AND ?`,
      [idalumno, desde, hoy],
    );
    ms.map((f) => ({ ...f, fecha: iso(f.fecha) }))
      .filter((f) => f.fecha < hoy || hhmm(f.hora_fin) <= ahora)
      .forEach((f) =>
        lista.push({
          clave: `m-${f.idmaster}`,
          tipo: "master",
          masterId: f.idmaster,
          fecha: f.fecha,
          inicio: hhmm(f.hora_inicio),
          fin: hhmm(f.hora_fin),
          titulo: `Máster: ${f.titulo}`,
          emoji: f.emoji || "🌟",
          color: f.color || "ambar",
          profesor: f.profesor || "Por confirmar",
          disco: "",
          idempleado: f.idempleado || null,
          iddisciplina: f.iddisciplina || null,
        }),
      );
  }
  return lista.filter((p) => !ya.has(p.clave)).sort((a, b) => (b.fecha + b.inicio).localeCompare(a.fecha + a.inicio));
}
const limpiar = ({ idempleado, iddisciplina, ...p }) => p; // eslint-disable-line no-unused-vars

// GET /api/calificaciones/pendientes (alumno)
router.get("/pendientes", async (req, res, next) => {
  try {
    if (req.usuario.rol !== "student") return res.json({ pendientes: [], etiquetas: ETIQUETAS });
    if (!(await tablaCalificaciones())) return res.json({ pendientes: [], etiquetas: ETIQUETAS, sinTabla: true });
    const yo = await alumnoDe(req);
    res.json({ pendientes: yo ? (await pendientesDe(yo)).map(limpiar) : [], etiquetas: ETIQUETAS });
  } catch (e) {
    next(e);
  }
});

// POST /api/calificaciones { clave, estrellas, etiquetas[], comentario } (alumno)
router.post("/", async (req, res, next) => {
  try {
    await exigirTabla();
    if (req.usuario.rol !== "student") throw new ErrorHttp(403, "Solo los alumnos califican sus clases");
    const yo = await alumnoDe(req);
    const b = req.body || {};
    const estrellas = Math.round(Number(b.estrellas));
    if (!(estrellas >= 1 && estrellas <= 5)) throw new ErrorHttp(400, "Elige de 1 a 5 estrellas");
    const p = (await pendientesDe(yo)).find((x) => x.clave === String(b.clave || ""));
    if (!p) {
      const [ya] = await consultar("SELECT 1 AS si FROM clase_calificaciones WHERE idalumno = ? AND clave = ?", [yo, String(b.clave || "")]);
      throw new ErrorHttp(ya ? 409 : 400, ya ? "Ya calificaste esta clase. ¡Gracias!" : "Solo puedes calificar clases a las que fuiste en los últimos 7 días");
    }
    const etiquetas = (Array.isArray(b.etiquetas) ? b.etiquetas : []).filter((e) => ETIQUETAS.includes(e)).slice(0, 6).join(", ") || null;
    const comentario = String(b.comentario || "").trim().slice(0, 300) || null;
    try {
      await consultar(
        `INSERT INTO clase_calificaciones (tipo, idclase_grupal, idmaster, fecha, idalumno, idempleado, iddisciplina, estrellas, etiquetas, comentario, clave)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.tipo, p.claseId || null, p.masterId || null, p.fecha, yo, p.idempleado, p.iddisciplina, estrellas, etiquetas, comentario, p.clave],
      );
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") throw new ErrorHttp(409, "Ya calificaste esta clase. ¡Gracias!");
      throw e;
    }
    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// GET /api/calificaciones?desde&hasta (personal)
router.get("/", async (req, res, next) => {
  try {
    const rol = req.usuario.rol;
    if (!["admin", "reception", "instructor"].includes(rol)) throw new ErrorHttp(403, "Las calificaciones son para el personal");
    await exigirTabla();
    const hoy = hoyLima();
    const desde = fechaOk(req.query.desde) || sumarDias(hoy, -29);
    let hasta = fechaOk(req.query.hasta) || hoy;
    if (hasta < desde) throw new ErrorHttp(400, "La fecha final es anterior a la inicial");
    if (hasta > sumarDias(desde, 400)) hasta = sumarDias(desde, 400);
    const profe = rol === "instructor" ? await empleadoDe(req) : null;
    if (rol === "instructor" && !profe) return res.json({ desde, hasta, filas: [], anonimo: true });
    const filas = await consultar(
      `SELECT k.*, a.nombres, a.apellidos, d.nombre AS disciplina, d.emoji, d.color,
              COALESCE(c.nombre, d.nombre) AS clase, c.hora_inicio AS c_inicio, m.titulo AS master, m.hora_inicio AS m_inicio,
              TRIM(CONCAT(IFNULL(e.nombres,''),' ',IFNULL(e.apellidos,''))) AS profesor
         FROM clase_calificaciones k
         JOIN alumnos a ON a.idalumno = k.idalumno
         LEFT JOIN disciplinas d ON d.iddisciplina = k.iddisciplina
         LEFT JOIN clases_grupales c ON c.idclase_grupal = k.idclase_grupal
         LEFT JOIN masters m ON m.idmaster = k.idmaster
         LEFT JOIN empleados e ON e.idempleado = k.idempleado
        WHERE k.fecha BETWEEN ? AND ? ${profe ? "AND k.idempleado = ?" : ""}
        ORDER BY k.creada_en DESC`,
      profe ? [desde, hasta, profe] : [desde, hasta],
    );
    res.json({
      desde,
      hasta,
      anonimo: !!profe,
      filas: filas.map((f) => ({
        id: f.idcalificacion,
        tipo: f.tipo,
        fecha: iso(f.fecha),
        clase: f.tipo === "master" ? `Máster: ${f.master || ""}` : f.clase || f.disciplina || "Clase",
        inicio: hhmm(f.tipo === "master" ? f.m_inicio : f.c_inicio),
        disciplinaId: f.iddisciplina,
        disciplina: f.disciplina || "Sin disciplina",
        emoji: f.emoji || (f.tipo === "master" ? "🌟" : "🎵"),
        color: f.color || "teal",
        profesorId: f.idempleado,
        profesor: f.profesor || "Sin profesor",
        estrellas: Number(f.estrellas),
        etiquetas: f.etiquetas ? String(f.etiquetas).split(", ") : [],
        comentario: f.comentario || "",
        alumno: profe ? "Alumno" : `${f.nombres} ${f.apellidos}`.trim(),
        creada: String(f.creada_en).replace("T", " ").slice(0, 16),
      })),
    });
  } catch (e) {
    next(e);
  }
});

// Aviso al alumno: «¿Qué tal tu clase?» cuando tiene clases por calificar
export async function avisosCalificaciones(req, hoy) {
  if (req.usuario.rol !== "student" || !(await tablaCalificaciones())) return [];
  const yo = await alumnoDe(req);
  if (!yo) return [];
  const p = await pendientesDe(yo);
  if (!p.length) return [];
  const u = p[0];
  return [
    {
      id: `calificar-${p.map((x) => x.clave).join("_").slice(0, 80)}`,
      tipo: "calificar_clase",
      nivel: "bajo",
      titulo: `⭐ ¿Qué tal estuvo ${u.titulo}?`,
      mensaje: p.length === 1 ? `Califica tu clase con ${u.profesor}: toma 5 segundos y ayuda a mejorar.` : `Tienes ${p.length} clases por calificar. Toma 5 segundos y ayuda a mejorar.`,
      fecha: hoy,
      accion: { tipo: "ir", tab: "mis_clases", etiqueta: "Calificar" },
    },
  ];
}

export default router;
