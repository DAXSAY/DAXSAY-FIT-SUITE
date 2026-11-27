// =====================================================================
// CLASES GRUPALES
//  - Disciplinas (Full Body, Fit Complex, Ex Local, X-Box, Baile…) con su
//    color, emoji y los profesores que las dictan.
//  - Horario semanal: cada clase es una disciplina en un día y una hora,
//    con su profesor. Lo arman administración y recepción.
//  - Discos: el profesor anota qué disco (coreografía/música) dictará en
//    la clase de cada fecha. Administración y recepción lo ven como
//    reporte, y al alumno le llega un recordatorio 2 horas antes.
// =====================================================================
import { Router } from "express";
import { consultar } from "../db.js";
import { ErrorHttp } from "../seguridad.js";
import { hoyLima, sumarDias } from "../congelamiento.js";
import { horaLima } from "./tareas.js";

const router = Router();

const GESTIONA = ["admin", "reception"];
const COLORES = ["teal", "verde", "rojo", "ambar", "violeta", "azul", "rosa", "plomo", "naranja", "indigo", "lima"];
const HORAS_AVISO = 2; // recordatorio al alumno: 2 horas antes de la clase
const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

const txt = (v, max) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};
const fechaOk = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);
const horaOk = (v) => (/^\d{2}:\d{2}(:\d{2})?$/.test(String(v || "")) ? String(v).slice(0, 5) : null);
const hhmm = (v) => (v ? String(v).slice(0, 5) : "");
const aMin = (h) => {
  const [a, b] = String(h).split(":").map(Number);
  return a * 60 + (b || 0);
};
/** Día de la semana de una fecha ISO: 1=lunes … 7=domingo */
export const diaSemana = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
};
const nombreProfesor = (f) => [f.prof_nombres, f.prof_apellidos].filter(Boolean).join(" ").trim();

// ---------------------------------------------------------------------
// ¿Existen las tablas? (en la PC se crean ejecutando la parte 38 como root)
// ---------------------------------------------------------------------
let hayTablas = { v: null, t: 0 };
export async function tablasClases() {
  if (hayTablas.v === true || Date.now() - hayTablas.t < 20000) return hayTablas.v;
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('disciplinas','disciplina_profesores','clases_grupales','clase_discos')",
  );
  hayTablas = { v: Number(f?.n) === 4, t: Date.now() };
  return hayTablas.v;
}
async function exigirTablas() {
  if (!(await tablasClases()))
    throw new ErrorHttp(503, "Falta crear las tablas de clases grupales: ejecuta la parte 38 (38_clases_grupales.sql) en MySQL Workbench.");
}
const exigirRol = (req, roles, msg) => {
  if (!roles.includes(req.usuario.rol)) throw new ErrorHttp(403, msg || "No tienes permiso para esta acción");
};
async function empleadoDe(req) {
  const [u] = await consultar("SELECT idempleado FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  return u?.idempleado || null;
}

const SQL_CLASES = `
  SELECT c.idclase_grupal, c.iddisciplina, c.nombre, c.dia_semana, c.hora_inicio, c.hora_fin, c.idempleado, c.sala,
         d.nombre AS disciplina, d.emoji, d.color,
         e.nombres AS prof_nombres, e.apellidos AS prof_apellidos
    FROM clases_grupales c
    JOIN disciplinas d ON d.iddisciplina = c.iddisciplina
    LEFT JOIN empleados e ON e.idempleado = c.idempleado
   WHERE c.activa = 1`;
const claseJson = (f) => ({
  id: f.idclase_grupal,
  disciplinaId: f.iddisciplina,
  disciplina: f.disciplina,
  nombre: f.nombre || f.disciplina,
  emoji: f.emoji || "🎵",
  color: f.color || "teal",
  dia: Number(f.dia_semana),
  inicio: hhmm(f.hora_inicio),
  fin: hhmm(f.hora_fin),
  profesorId: f.idempleado || null,
  profesor: nombreProfesor(f) || "Sin profesor",
  sala: f.sala || "",
});

// ---------------------------------------------------------------------
// GET /api/clases -> disciplinas, profesores y horario semanal
// ---------------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    await exigirTablas();
    const alumno = req.usuario.rol === "student";
    const [disc, dp, profes, clases, idempleado] = await Promise.all([
      consultar("SELECT * FROM disciplinas ORDER BY activa DESC, orden, nombre"),
      consultar("SELECT iddisciplina, idempleado FROM disciplina_profesores"),
      alumno
        ? []
        : consultar(
            `SELECT e.idempleado, e.nombres, e.apellidos, e.especialidad, e.telefono, u.usuario, u.activo AS usuario_activo
               FROM empleados e LEFT JOIN usuarios u ON u.idempleado = e.idempleado
              WHERE e.activo = 1 AND (e.cargo IN ('instructor','entrenador')
                 OR e.idempleado IN (SELECT idempleado FROM disciplina_profesores))
              ORDER BY e.cargo = 'instructor' DESC, e.nombres, e.apellidos`,
          ),
      consultar(`${SQL_CLASES} ORDER BY c.dia_semana, c.hora_inicio`),
      alumno ? null : empleadoDe(req),
    ]);
    res.json({
      disciplinas: disc
        .filter((d) => !alumno || d.activa)
        .map((d) => ({
          id: d.iddisciplina,
          nombre: d.nombre,
          emoji: d.emoji || "🎵",
          color: d.color || "teal",
          descripcion: d.descripcion || "",
          orden: d.orden,
          activa: !!d.activa,
          profesores: dp.filter((x) => x.iddisciplina === d.iddisciplina).map((x) => x.idempleado),
        })),
      profesores: profes.map((p) => ({
        id: p.idempleado,
        nombre: `${p.nombres} ${p.apellidos}`.trim(),
        usuario: p.usuario || "",
        activo: p.usuario_activo === null ? null : !!p.usuario_activo,
        telefono: p.telefono || "",
        disciplinas: dp.filter((x) => x.idempleado === p.idempleado).map((x) => x.iddisciplina),
      })),
      clases: clases.map(claseJson),
      yo: { rol: req.usuario.rol, empleadoId: idempleado },
      hoy: hoyLima(),
      hora: horaLima(),
    });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// Sesiones (clase + fecha) de un rango, con su disco
// ---------------------------------------------------------------------
export async function sesiones(desde, hasta, filtro = {}) {
  const clases = (await consultar(`${SQL_CLASES} ORDER BY c.hora_inicio`)).map(claseJson);
  const discos = await consultar(
    `SELECT dc.*, TRIM(CONCAT(IFNULL(e.nombres,''),' ',IFNULL(e.apellidos,''))) AS quien
       FROM clase_discos dc
       LEFT JOIN usuarios u ON u.idusuario = dc.idusuario
       LEFT JOIN empleados e ON e.idempleado = u.idempleado
      WHERE dc.fecha BETWEEN ? AND ?`,
    [desde, hasta],
  );
  const porClave = new Map(discos.map((d) => [`${d.idclase_grupal}|${String(d.fecha).slice(0, 10)}`, d]));
  const cuentas = await consultar(
    `SELECT idclase_grupal, fecha, SUM(estado = 'reservado') AS reservados, SUM(estado = 'asistio') AS asistieron
       FROM clase_reservas WHERE fecha BETWEEN ? AND ? AND ocupa = 1 GROUP BY idclase_grupal, fecha`,
    [desde, hasta],
  ).catch(() => []);
  const porCuenta = new Map(cuentas.map((d) => [`${d.idclase_grupal}|${String(d.fecha).slice(0, 10)}`, d]));
  const lista = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    const dia = diaSemana(f);
    for (const c of clases) {
      if (c.dia !== dia) continue;
      if (filtro.profesorId && c.profesorId !== filtro.profesorId) continue;
      if (filtro.disciplinaId && c.disciplinaId !== filtro.disciplinaId) continue;
      const d = porClave.get(`${c.id}|${f}`);
      const k = porCuenta.get(`${c.id}|${f}`);
      lista.push({
        ...c,
        claseId: c.id,
        id: `${c.id}-${f}`,
        fecha: f,
        disco: d?.disco || "",
        nota: d?.nota || "",
        registradoPor: d?.quien || "",
        registradoEn: d ? String(d.actualizado_en || d.registrado_en).replace("T", " ").slice(0, 16) : "",
        reservados: Number(k?.reservados) || 0,
        asistieron: Number(k?.asistieron) || 0,
      });
    }
  }
  return lista.sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio));
}

// GET /api/clases/sesiones?desde&hasta&profesor&disciplina
router.get("/sesiones", async (req, res, next) => {
  try {
    await exigirTablas();
    const hoy = hoyLima();
    const desde = fechaOk(req.query.desde) || hoy;
    let hasta = fechaOk(req.query.hasta) || sumarDias(desde, 6);
    if (hasta < desde) throw new ErrorHttp(400, "La fecha final es anterior a la inicial");
    if (hasta > sumarDias(desde, 92)) hasta = sumarDias(desde, 92);
    const filtro = {
      profesorId: Number(req.query.profesor) || null,
      disciplinaId: Number(req.query.disciplina) || null,
    };
    if (req.query.mias === "1") filtro.profesorId = (await empleadoDe(req)) || -1;
    res.json({ desde, hasta, hoy, hora: horaLima(), sesiones: await sesiones(desde, hasta, filtro) });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// POST /api/clases/discos { claseId, fecha, disco, nota }  (vacío = borrar)
// El profesor solo en sus clases; administración y recepción en todas.
// ---------------------------------------------------------------------
router.post("/discos", async (req, res, next) => {
  try {
    await exigirTablas();
    exigirRol(req, ["admin", "reception", "instructor"], "Solo el profesor de la clase (o administración) registra el disco");
    const b = req.body || {};
    const items = Array.isArray(b.discos) ? b.discos : [b];
    if (!items.length || items.length > 60) throw new ErrorHttp(400, "Nada que guardar");
    const idempleado = req.usuario.rol === "instructor" ? await empleadoDe(req) : null;
    let guardados = 0;
    for (const it of items) {
      const idclase = Number(it.claseId);
      const fecha = fechaOk(it.fecha);
      if (!idclase || !fecha) throw new ErrorHttp(400, "Falta la clase o la fecha");
      const [c] = await consultar("SELECT idclase_grupal, dia_semana, idempleado FROM clases_grupales WHERE idclase_grupal = ? AND activa = 1", [idclase]);
      if (!c) throw new ErrorHttp(404, "La clase ya no existe");
      if (Number(c.dia_semana) !== diaSemana(fecha)) throw new ErrorHttp(400, "Esa clase no se dicta ese día");
      if (idempleado && c.idempleado !== idempleado) throw new ErrorHttp(403, "Solo puedes registrar el disco de tus propias clases");
      const disco = txt(it.disco, 120);
      if (!disco) {
        await consultar("DELETE FROM clase_discos WHERE idclase_grupal = ? AND fecha = ?", [idclase, fecha]);
      } else {
        await consultar(
          `INSERT INTO clase_discos (idclase_grupal, fecha, disco, nota, idusuario) VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE disco = VALUES(disco), nota = VALUES(nota), idusuario = VALUES(idusuario)`,
          [idclase, fecha, disco, txt(it.nota, 300), req.usuario.idusuario],
        );
      }
      guardados++;
    }
    res.json({ ok: true, guardados });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// Horario: crear (uno o varios días), cambiar y quitar clases
// ---------------------------------------------------------------------
async function validarClase(b) {
  const iddisciplina = Number(b.disciplinaId);
  const [d] = iddisciplina ? await consultar("SELECT iddisciplina FROM disciplinas WHERE iddisciplina = ? AND activa = 1", [iddisciplina]) : [];
  if (!d) throw new ErrorHttp(400, "Elige una disciplina");
  const inicio = horaOk(b.inicio);
  const fin = horaOk(b.fin);
  if (!inicio || !fin) throw new ErrorHttp(400, "Elige la hora de inicio y de fin");
  if (aMin(fin) <= aMin(inicio)) throw new ErrorHttp(400, "La hora de fin debe ser después de la de inicio");
  let idempleado = Number(b.profesorId) || null;
  if (idempleado) {
    const [e] = await consultar("SELECT idempleado FROM empleados WHERE idempleado = ? AND activo = 1", [idempleado]);
    if (!e) throw new ErrorHttp(400, "El profesor elegido no existe");
  }
  return { iddisciplina, inicio, fin, idempleado, nombre: txt(b.nombre, 80), sala: txt(b.sala, 60) };
}
/** Otra clase del mismo profesor que se cruza en ese día y hora */
async function cruceProfesor(idempleado, dia, inicio, fin, excepto = 0) {
  if (!idempleado) return null;
  const [x] = await consultar(
    `SELECT c.hora_inicio, c.hora_fin, d.nombre FROM clases_grupales c JOIN disciplinas d ON d.iddisciplina = c.iddisciplina
      WHERE c.activa = 1 AND c.idempleado = ? AND c.dia_semana = ? AND c.idclase_grupal <> ?
        AND c.hora_inicio < ? AND c.hora_fin > ? LIMIT 1`,
    [idempleado, dia, excepto, fin, inicio],
  );
  return x ? `El profesor ya tiene ${x.nombre} el ${DIAS[dia]} de ${hhmm(x.hora_inicio)} a ${hhmm(x.hora_fin)}` : null;
}

router.post("/", async (req, res, next) => {
  try {
    await exigirTablas();
    exigirRol(req, GESTIONA, "Solo administración y recepción arman el horario");
    const b = req.body || {};
    const v = await validarClase(b);
    const dias = [...new Set((Array.isArray(b.dias) ? b.dias : [b.dia]).map(Number).filter((d) => d >= 1 && d <= 7))];
    if (!dias.length) throw new ErrorHttp(400, "Elige al menos un día");
    for (const dia of dias) {
      const cruce = await cruceProfesor(v.idempleado, dia, v.inicio, v.fin);
      if (cruce) throw new ErrorHttp(409, cruce);
    }
    const ids = [];
    for (const dia of dias) {
      const r = await consultar(
        `INSERT INTO clases_grupales (iddisciplina, nombre, dia_semana, hora_inicio, hora_fin, idempleado, sala, idusuario_creador)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.iddisciplina, v.nombre, dia, v.inicio, v.fin, v.idempleado, v.sala, req.usuario.idusuario],
      );
      ids.push(r.insertId);
    }
    res.status(201).json({ ok: true, ids });
  } catch (e) {
    next(e);
  }
});

router.put("/:id(\\d+)", async (req, res, next) => {
  try {
    await exigirTablas();
    exigirRol(req, GESTIONA, "Solo administración y recepción cambian el horario");
    const id = Number(req.params.id);
    const [c] = await consultar("SELECT idclase_grupal FROM clases_grupales WHERE idclase_grupal = ? AND activa = 1", [id]);
    if (!c) throw new ErrorHttp(404, "La clase ya no existe");
    const b = req.body || {};
    const v = await validarClase(b);
    const dia = Number(b.dia);
    if (!(dia >= 1 && dia <= 7)) throw new ErrorHttp(400, "Elige el día");
    const cruce = await cruceProfesor(v.idempleado, dia, v.inicio, v.fin, id);
    if (cruce) throw new ErrorHttp(409, cruce);
    await consultar(
      "UPDATE clases_grupales SET iddisciplina = ?, nombre = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ?, idempleado = ?, sala = ? WHERE idclase_grupal = ?",
      [v.iddisciplina, v.nombre, dia, v.inicio, v.fin, v.idempleado, v.sala, id],
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id(\\d+)", async (req, res, next) => {
  try {
    await exigirTablas();
    exigirRol(req, GESTIONA, "Solo administración y recepción quitan clases");
    await consultar("UPDATE clases_grupales SET activa = 0 WHERE idclase_grupal = ?", [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// Disciplinas (solo administración)
// ---------------------------------------------------------------------
async function guardarProfesores(iddisciplina, profesores) {
  if (!Array.isArray(profesores)) return;
  const ids = [...new Set(profesores.map(Number).filter(Boolean))];
  await consultar("DELETE FROM disciplina_profesores WHERE iddisciplina = ?", [iddisciplina]);
  for (const ide of ids) await consultar("INSERT IGNORE INTO disciplina_profesores (iddisciplina, idempleado) SELECT ?, idempleado FROM empleados WHERE idempleado = ?", [iddisciplina, ide]);
}
const datosDisciplina = (b) => {
  const nombre = txt(b.nombre, 60);
  if (!nombre) throw new ErrorHttp(400, "Escribe el nombre de la disciplina");
  return { nombre, emoji: txt(b.emoji, 16) || "🎵", color: COLORES.includes(b.color) ? b.color : "teal", descripcion: txt(b.descripcion, 300) };
};
router.post("/disciplinas", async (req, res, next) => {
  try {
    await exigirTablas();
    exigirRol(req, ["admin"], "Solo administración crea disciplinas");
    const d = datosDisciplina(req.body || {});
    const [o] = await consultar("SELECT COALESCE(MAX(orden),0)+1 AS n FROM disciplinas");
    let r;
    try {
      r = await consultar("INSERT INTO disciplinas (nombre, emoji, color, descripcion, orden) VALUES (?, ?, ?, ?, ?)", [d.nombre, d.emoji, d.color, d.descripcion, o.n]);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") throw new ErrorHttp(409, "Ya existe una disciplina con ese nombre");
      throw e;
    }
    await guardarProfesores(r.insertId, req.body?.profesores);
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) {
    next(e);
  }
});
router.put("/disciplinas/:id(\\d+)", async (req, res, next) => {
  try {
    await exigirTablas();
    exigirRol(req, ["admin"], "Solo administración cambia las disciplinas");
    const id = Number(req.params.id);
    const d = datosDisciplina(req.body || {});
    try {
      await consultar("UPDATE disciplinas SET nombre = ?, emoji = ?, color = ?, descripcion = ?, activa = ? WHERE iddisciplina = ?", [
        d.nombre, d.emoji, d.color, d.descripcion, req.body?.activa === false ? 0 : 1, id,
      ]);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") throw new ErrorHttp(409, "Ya existe una disciplina con ese nombre");
      throw e;
    }
    await guardarProfesores(id, req.body?.profesores);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// Croquis del salón (steps y zonas)
// ---------------------------------------------------------------------
const ANCHO = 40;
const ALTO = 28;
async function minutosReserva() {
  const [c] = await consultar("SELECT valor FROM configuracion WHERE clave = 'clases_minutos_reserva'");
  const n = Number(c?.valor);
  return n >= 5 && n <= 240 ? n : 30;
}
async function croquis() {
  const filas = await consultar("SELECT * FROM clase_steps WHERE activo = 1 ORDER BY tipo = 'zona' DESC, numero, idstep");
  return filas.map((f) => ({
    id: f.idstep,
    tipo: f.tipo,
    numero: f.numero,
    etiqueta: f.etiqueta || "",
    x: f.x,
    y: f.y,
    w: f.ancho,
    h: f.alto,
  }));
}
router.get("/croquis", async (req, res, next) => {
  try {
    await exigirTablas();
    res.json({ ancho: ANCHO, alto: ALTO, steps: await croquis(), minutosReserva: await minutosReserva() });
  } catch (e) {
    next(e);
  }
});
// PUT /api/clases/croquis { steps:[{id?, tipo, numero, etiqueta, x, y, w, h}], minutosReserva }
router.put("/croquis", async (req, res, next) => {
  try {
    await exigirTablas();
    exigirRol(req, ["admin"], "Solo administración cambia el croquis");
    const b = req.body || {};
    if (b.minutosReserva !== undefined) {
      const n = Math.round(Number(b.minutosReserva));
      if (!(n >= 5 && n <= 240)) throw new ErrorHttp(400, "Los minutos para reservar deben estar entre 5 y 240");
      await consultar(
        `INSERT INTO configuracion (clave, valor, descripcion, actualizado_por) VALUES ('clases_minutos_reserva', ?, 'Clases grupales: minutos antes de la clase para reservar', ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_por = VALUES(actualizado_por)`,
        [String(n), req.usuario.idusuario],
      );
    }
    if (Array.isArray(b.steps)) {
      if (b.steps.length > 400) throw new ErrorHttp(400, "Demasiados elementos en el croquis");
      const limpio = b.steps.map((st) => {
        const tipo = st.tipo === "zona" ? "zona" : "step";
        const w = Math.max(1, Math.min(ANCHO, Math.round(Number(st.w) || 3)));
        const h = Math.max(1, Math.min(ALTO, Math.round(Number(st.h) || 2)));
        const x = Math.max(0, Math.min(ANCHO - w, Math.round(Number(st.x) || 0)));
        const y = Math.max(0, Math.min(ALTO - h, Math.round(Number(st.y) || 0)));
        const numero = tipo === "step" ? Math.round(Number(st.numero)) : null;
        if (tipo === "step" && !(numero >= 1 && numero <= 999)) throw new ErrorHttp(400, "Cada step necesita un número del 1 al 999");
        return { id: Number(st.id) || null, tipo, numero, etiqueta: tipo === "zona" ? txt(st.etiqueta, 40) || "Zona" : null, x, y, w, h };
      });
      const nums = limpio.filter((z) => z.tipo === "step").map((z) => z.numero);
      const rep = nums.find((n, i) => nums.indexOf(n) !== i);
      if (rep) throw new ErrorHttp(400, `El número ${rep} está repetido en dos steps`);
      const actuales = new Set((await consultar("SELECT idstep FROM clase_steps WHERE activo = 1")).map((f) => f.idstep));
      const quedan = new Set();
      for (const z of limpio) {
        if (z.id && actuales.has(z.id)) {
          await consultar("UPDATE clase_steps SET tipo = ?, numero = ?, etiqueta = ?, x = ?, y = ?, ancho = ?, alto = ? WHERE idstep = ?", [
            z.tipo, z.numero, z.etiqueta, z.x, z.y, z.w, z.h, z.id,
          ]);
          quedan.add(z.id);
        } else {
          await consultar("INSERT INTO clase_steps (tipo, numero, etiqueta, x, y, ancho, alto) VALUES (?, ?, ?, ?, ?, ?, ?)", [z.tipo, z.numero, z.etiqueta, z.x, z.y, z.w, z.h]);
        }
      }
      const fuera = [...actuales].filter((id) => !quedan.has(id));
      if (fuera.length) await consultar(`UPDATE clase_steps SET activo = 0 WHERE idstep IN (${fuera.map(() => "?").join(",")})`, fuera);
    }
    res.json({ ok: true, steps: await croquis(), minutosReserva: await minutosReserva() });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// Reservas de step
// ---------------------------------------------------------------------
const STAFF_RESERVA = ["admin", "reception", "instructor"];
async function alumnoDe(req) {
  const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  return u?.idalumno || null;
}
async function claseDelDia(idclase, fecha) {
  const [c] = await consultar("SELECT idclase_grupal, dia_semana, hora_inicio, hora_fin FROM clases_grupales WHERE idclase_grupal = ? AND activa = 1", [idclase]);
  if (!c) throw new ErrorHttp(404, "La clase ya no existe");
  if (Number(c.dia_semana) !== diaSemana(fecha)) throw new ErrorHttp(400, "Esa clase no se dicta ese día");
  return c;
}
/** Ventana de reserva del alumno: de (inicio − minutos) hasta el inicio */
async function ventana(c, fecha) {
  const min = await minutosReserva();
  const hoy = hoyLima();
  const ini = aMin(hhmm(c.hora_inicio));
  const ahora = aMin(horaLima());
  const abre = ini - min;
  const deMin = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String((((m % 60) + 60) % 60)).padStart(2, "0")}`;
  const estado = fecha < hoy ? "pasada" : fecha > hoy ? "pronto" : ahora < abre ? "pronto" : ahora < ini ? "abierta" : aMin(hhmm(c.hora_fin)) > ahora ? "en_curso" : "pasada";
  return { minutos: min, abre: deMin(abre), cierra: hhmm(c.hora_inicio), estado };
}
async function listaReservas(idclase, fecha) {
  return consultar(
    `SELECT r.idreserva, r.idstep, r.idalumno, r.estado, r.origen, r.actualizada_en, s.numero,
            a.nombres, a.apellidos, a.codigo
       FROM clase_reservas r
       JOIN clase_steps s ON s.idstep = r.idstep
       JOIN alumnos a ON a.idalumno = r.idalumno
      WHERE r.idclase_grupal = ? AND r.fecha = ?
      ORDER BY s.numero`,
    [idclase, fecha],
  ).catch(async (e) => {
    if (e.code !== "ER_BAD_FIELD_ERROR") throw e;
    return consultar(
      `SELECT r.idreserva, r.idstep, r.idalumno, r.estado, r.origen, r.actualizada_en, s.numero, a.nombres, a.apellidos, NULL AS codigo
         FROM clase_reservas r JOIN clase_steps s ON s.idstep = r.idstep JOIN alumnos a ON a.idalumno = r.idalumno
        WHERE r.idclase_grupal = ? AND r.fecha = ? ORDER BY s.numero`,
      [idclase, fecha],
    );
  });
}

// GET /api/clases/reservas?clase=&fecha=
router.get("/reservas", async (req, res, next) => {
  try {
    await exigirTablas();
    const idclase = Number(req.query.clase);
    const fecha = fechaOk(req.query.fecha) || hoyLima();
    const c = await claseDelDia(idclase, fecha);
    const alumno = req.usuario.rol === "student";
    const yo = alumno ? await alumnoDe(req) : null;
    const filas = await listaReservas(idclase, fecha);
    res.json({
      fecha,
      ventana: await ventana(c, fecha),
      reservas: filas
        .filter((f) => !alumno || ["reservado", "asistio"].includes(f.estado) || f.idalumno === yo)
        .map((f) => ({
          id: f.idreserva,
          stepId: f.idstep,
          numero: f.numero,
          estado: f.estado,
          origen: f.origen,
          mia: alumno ? f.idalumno === yo : undefined,
          alumnoId: alumno ? undefined : f.idalumno,
          // El alumno solo ve el primer nombre de quien ocupa cada step
          alumno: alumno ? String(f.nombres || "").trim().split(/\s+/)[0] : `${f.nombres} ${f.apellidos}`.trim(),
          hora: String(f.actualizada_en).slice(11, 16),
        })),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/clases/reservas { clase, fecha, step, alumno?, estado? }
//  - alumno: solo hoy y dentro de su ventana; si ya tenía un step, se cambia.
//  - recepción / administración / profesor: hoy, a cualquier hora (llegó sin reservar).
router.post("/reservas", async (req, res, next) => {
  try {
    await exigirTablas();
    const b = req.body || {};
    const idclase = Number(b.clase);
    const fecha = fechaOk(b.fecha) || hoyLima();
    const idstep = Number(b.step);
    const c = await claseDelDia(idclase, fecha);
    const alumno = req.usuario.rol === "student";
    if (!alumno) exigirRol(req, STAFF_RESERVA, "No puedes reservar steps");
    const idalumno = alumno ? await alumnoDe(req) : Number(b.alumno);
    if (!idalumno) throw new ErrorHttp(400, "Falta el alumno");
    if (fecha !== hoyLima()) throw new ErrorHttp(400, "Solo se reservan steps para las clases de hoy");
    const v = await ventana(c, fecha);
    if (alumno && v.estado !== "abierta")
      throw new ErrorHttp(409, v.estado === "pronto" ? `La reserva se abre a las ${v.abre} (${v.minutos} min antes de la clase)` : "La reserva ya cerró: la clase ya empezó");
    if (!alumno && v.estado === "pasada") throw new ErrorHttp(409, "Esa clase ya terminó");
    const [st] = await consultar("SELECT idstep, numero FROM clase_steps WHERE idstep = ? AND activo = 1 AND tipo = 'step'", [idstep]);
    if (!st) throw new ErrorHttp(404, "Ese step ya no existe en el croquis");
    const [al] = await consultar("SELECT idalumno, nombres, apellidos FROM alumnos WHERE idalumno = ?", [idalumno]);
    if (!al) throw new ErrorHttp(404, "No existe ese alumno");
    const estado = !alumno && b.estado === "asistio" ? "asistio" : "reservado";
    const [ocupado] = await consultar(
      `SELECT r.idalumno, a.nombres FROM clase_reservas r JOIN alumnos a ON a.idalumno = r.idalumno
        WHERE r.idclase_grupal = ? AND r.fecha = ? AND r.idstep = ? AND r.ocupa = 1`,
      [idclase, fecha, idstep],
    );
    const quien = (n) => String(n || "").trim().split(/\s+/)[0];
    if (ocupado && ocupado.idalumno !== idalumno)
      throw new ErrorHttp(409, `Lugar ocupado: el step ${st.numero} ya lo reservó ${quien(ocupado.nombres)} antes. Elige otro.`);
    // Si ya tenía otro step en esta clase, se le cambia
    const [previa] = await consultar(
      "SELECT idreserva, estado FROM clase_reservas WHERE idclase_grupal = ? AND fecha = ? AND idalumno = ? AND ocupa = 1 AND idstep <> ?",
      [idclase, fecha, idalumno, idstep],
    );
    if (previa) await consultar("UPDATE clase_reservas SET estado = 'cancelado', idusuario = ? WHERE idreserva = ?", [req.usuario.idusuario, previa.idreserva]);
    if (ocupado) {
      await consultar("UPDATE clase_reservas SET estado = ?, idusuario = ? WHERE idclase_grupal = ? AND fecha = ? AND idstep = ? AND ocupa = 1", [
        estado === "asistio" ? "asistio" : "reservado", req.usuario.idusuario, idclase, fecha, idstep,
      ]);
    } else {
      try {
        await consultar(
          "INSERT INTO clase_reservas (idclase_grupal, fecha, idstep, idalumno, estado, origen, idusuario) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [idclase, fecha, idstep, idalumno, estado, alumno ? "alumno" : "recepcion", req.usuario.idusuario],
        );
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
          // Le devolvemos el step que tenía antes de intentar el cambio
          if (previa) await consultar("UPDATE clase_reservas SET estado = ? WHERE idreserva = ?", [previa.estado, previa.idreserva]).catch(() => {});
          const [g] = await consultar(
            "SELECT a.nombres FROM clase_reservas r JOIN alumnos a ON a.idalumno = r.idalumno WHERE r.idclase_grupal = ? AND r.fecha = ? AND r.idstep = ? AND r.ocupa = 1",
            [idclase, fecha, idstep],
          );
          throw new ErrorHttp(409, `Lugar ocupado: el step ${st.numero} lo reservó ${g ? quien(g.nombres) : "otra persona"} un instante antes. Elige otro.`);
        }
        throw e;
      }
    }
    res.json({ ok: true, numero: st.numero, estado, alumno: `${al.nombres} ${al.apellidos}`.trim() });
  } catch (e) {
    next(e);
  }
});

// POST /api/clases/reservas/:id/estado { estado: asistio | no_vino | cancelado | reservado }
router.post("/reservas/:id(\\d+)/estado", async (req, res, next) => {
  try {
    await exigirTablas();
    const id = Number(req.params.id);
    const estado = String(req.body?.estado || "");
    if (!["asistio", "no_vino", "cancelado", "reservado"].includes(estado)) throw new ErrorHttp(400, "Estado no válido");
    const [r] = await consultar("SELECT * FROM clase_reservas WHERE idreserva = ?", [id]);
    if (!r) throw new ErrorHttp(404, "La reserva no existe");
    if (req.usuario.rol === "student") {
      if (r.idalumno !== (await alumnoDe(req)) || estado !== "cancelado") throw new ErrorHttp(403, "Solo puedes anular tu propia reserva");
    } else exigirRol(req, STAFF_RESERVA, "No puedes cambiar reservas");
    try {
      await consultar("UPDATE clase_reservas SET estado = ?, idusuario = ? WHERE idreserva = ?", [estado, req.usuario.idusuario, id]);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") throw new ErrorHttp(409, "Ese step ya lo tomó otra persona");
      throw e;
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// GET /api/clases/reporte?desde&hasta -> asistencia por disciplina, clase y día
// (cuenta los steps confirmados «llegó»; también reservas y «no vino»)
// ---------------------------------------------------------------------
router.get("/reporte", async (req, res, next) => {
  try {
    await exigirTablas();
    exigirRol(req, ["admin", "reception", "trainer", "instructor"], "El reporte es para el personal");
    const hoy = hoyLima();
    const desde = fechaOk(req.query.desde) || sumarDias(hoy, -29);
    let hasta = fechaOk(req.query.hasta) || hoy;
    if (hasta < desde) throw new ErrorHttp(400, "La fecha final es anterior a la inicial");
    if (hasta > sumarDias(desde, 400)) hasta = sumarDias(desde, 400);
    const filas = await consultar(
      `SELECT r.idreserva, r.fecha, r.estado, r.origen, r.idalumno, c.idclase_grupal, c.dia_semana, c.hora_inicio, c.hora_fin,
              d.iddisciplina, d.nombre AS disciplina, d.emoji, d.color, COALESCE(c.nombre, d.nombre) AS clase,
              TRIM(CONCAT(IFNULL(e.nombres,''),' ',IFNULL(e.apellidos,''))) AS profesor,
              a.nombres, a.apellidos
         FROM clase_reservas r
         JOIN clases_grupales c ON c.idclase_grupal = r.idclase_grupal
         JOIN disciplinas d ON d.iddisciplina = c.iddisciplina
         LEFT JOIN empleados e ON e.idempleado = c.idempleado
         JOIN alumnos a ON a.idalumno = r.idalumno
        WHERE r.fecha BETWEEN ? AND ? AND r.estado <> 'cancelado'
        ORDER BY r.fecha, c.hora_inicio`,
      [desde, hasta],
    );
    res.json({
      desde,
      hasta,
      filas: filas.map((f) => ({
        id: f.idreserva,
        fecha: f.fecha,
        estado: f.estado,
        origen: f.origen,
        alumnoId: f.idalumno,
        alumno: `${f.nombres} ${f.apellidos}`.trim(),
        claseId: f.idclase_grupal,
        clase: f.clase,
        disciplinaId: f.iddisciplina,
        disciplina: f.disciplina,
        emoji: f.emoji || "🎵",
        color: f.color || "teal",
        inicio: hhmm(f.hora_inicio),
        fin: hhmm(f.hora_fin),
        profesor: f.profesor || "Sin profesor",
      })),
    });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// Avisos de la campanita
//  - Alumno: 2 horas antes de cada clase de hoy, con el disco.
//  - Profesor: sus clases de hoy y mañana que aún no tienen disco.
//  - Administración y recepción: discos que los profesores enviaron.
// ---------------------------------------------------------------------
export async function avisosClases(req, hoy) {
  if (!(await tablasClases())) return [];
  const rol = req.usuario.rol;
  const ahora = aMin(horaLima());
  if (rol === "student") {
    const ses = (await sesiones(hoy, hoy)).filter((s) => {
      const ini = aMin(s.inicio);
      return ini >= ahora && ini - ahora <= HORAS_AVISO * 60;
    });
    return ses.map((s) => ({
      id: `clase-${s.id}-${s.disco ? s.disco.slice(0, 20) : "x"}`,
      tipo: "clase_grupal",
      nivel: "medio",
      titulo: `${s.emoji} Hoy a las ${s.inicio}: ${s.nombre}`,
      mensaje: s.disco
        ? `${s.profesor} dictará el disco «${s.disco}»${s.sala ? ` en ${s.sala}` : ""}. ¡Te esperamos!`
        : `Clase con ${s.profesor}${s.sala ? ` en ${s.sala}` : ""} de ${s.inicio} a ${s.fin}. ¡Te esperamos!`,
      fecha: hoy,
      accion: { tipo: "ir", tab: "mis_clases", etiqueta: "Ver clases" },
    }));
  }
  if (rol === "instructor") {
    const idempleado = await empleadoDe(req);
    if (!idempleado) return [];
    const faltan = (await sesiones(hoy, sumarDias(hoy, 1), { profesorId: idempleado })).filter(
      (s) => !s.disco && (s.fecha > hoy || aMin(s.fin) > ahora),
    );
    const avisos = [];
    // Sábado y domingo: anotar los discos de toda la próxima semana
    const dh = diaSemana(hoy);
    if (dh >= 6) {
      const lunes = sumarDias(hoy, 8 - dh);
      const prox = (await sesiones(lunes, sumarDias(lunes, 6), { profesorId: idempleado })).filter((s) => !s.disco);
      if (prox.length)
        avisos.push({
          id: `discos-semana-${lunes}-${prox.length}`,
          tipo: "clase_sin_disco",
          nivel: "medio",
          titulo: "🎵 Anota los discos de la próxima semana",
          mensaje: `Tienes ${prox.length} clase${prox.length === 1 ? "" : "s"} desde el lunes sin disco. Anótalos hoy para que recepción y los alumnos los vean.`,
          fecha: hoy,
          accion: { tipo: "ir", tab: "classes", etiqueta: "Anotar discos" },
        });
    }
    if (!faltan.length) return avisos;
    return [
      ...avisos,
      {
        id: `sin-disco-${faltan.map((s) => s.id).join("_")}`,
        tipo: "clase_sin_disco",
        nivel: faltan.some((s) => s.fecha === hoy) ? "alto" : "medio",
        titulo: "🎵 Registra el disco de tus clases",
        mensaje: `Aún no anotas qué disco dictarás: ${faltan
          .map((s) => `${s.nombre} ${s.fecha === hoy ? "hoy" : "mañana"} ${s.inicio}`)
          .join(" · ")}. Los alumnos lo verán en su recordatorio.`,
        fecha: hoy,
        accion: { tipo: "ir", tab: "classes", etiqueta: "Anotar discos" },
      },
    ];
  }
  if (GESTIONA.includes(rol)) {
    const filas = await consultar(
      `SELECT dc.idusuario, MAX(dc.actualizado_en) AS ultimo, COUNT(*) AS n,
              TRIM(CONCAT(IFNULL(e.nombres,''),' ',IFNULL(e.apellidos,''))) AS quien,
              GROUP_CONCAT(DISTINCT d.nombre ORDER BY d.nombre SEPARATOR ', ') AS disciplinas
         FROM clase_discos dc
         JOIN clases_grupales c ON c.idclase_grupal = dc.idclase_grupal
         JOIN disciplinas d ON d.iddisciplina = c.iddisciplina
         LEFT JOIN usuarios u ON u.idusuario = dc.idusuario
         LEFT JOIN empleados e ON e.idempleado = u.idempleado
        WHERE dc.fecha >= ? AND dc.actualizado_en >= DATE_SUB(NOW(), INTERVAL 2 DAY)
          AND (u.idrol IS NULL OR u.idrol IN (SELECT idrol FROM roles WHERE codigo = 'instructor'))
        GROUP BY dc.idusuario, quien`,
      [hoy],
    );
    return filas.map((f) => ({
      id: `discos-${f.idusuario}-${String(f.ultimo).replace(/\D/g, "").slice(0, 12)}`,
      tipo: "discos_enviados",
      nivel: "bajo",
      titulo: `🎵 ${f.quien || "Un profesor"} envió sus discos`,
      mensaje: `${f.n} clase${f.n === 1 ? "" : "s"} de ${f.disciplinas} ya tiene${f.n === 1 ? "" : "n"} su disco. Revísalo en Clases grupales › Discos.`,
      fecha: hoy,
      accion: { tipo: "ir", tab: "classes", etiqueta: "Ver discos" },
    }));
  }
  return [];
}

export default router;
