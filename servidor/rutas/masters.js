// =====================================================================
// MÁSTERS: clases especiales de fin de semana con costo aparte
//  - Administración crea cada máster con su profesor, fecha, hora y dos
//    precios: socio (membresía vigente) y público. Pueden cambiar cada semana.
//  - Durante la semana se van inscribiendo: en recepción (alumno o persona
//    de afuera) o el propio alumno desde su app (queda «por pagar»).
//  - Recepción cobra (efectivo, Yape/Plin, tarjeta, transferencia), marca
//    quién asistió y descarga la lista.
// =====================================================================
import { Router } from "express";
import { consultar, enFila } from "../db.js";
import { ErrorHttp, exigirCajaAbierta } from "../seguridad.js";
import { hoyLima, sumarDias } from "../congelamiento.js";
import { croquis, nombreStep } from "./clases.js";

const router = Router();
const STAFF = ["admin", "reception"];
const VEN = ["admin", "reception", "trainer", "instructor"];
const METODOS = ["efectivo", "yape_plin", "tarjeta", "transferencia"];

const txt = (v, max) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};
const fechaOk = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);
const horaOk = (v) => (/^\d{2}:\d{2}(:\d{2})?$/.test(String(v || "")) ? String(v).slice(0, 5) : null);
const hhmm = (v) => (v ? String(v).slice(0, 5) : "");
const dinero = (v) => Math.round(Number(v || 0) * 100) / 100;
const exigir = (req, roles, msg) => {
  if (!roles.includes(req.usuario.rol)) throw new ErrorHttp(403, msg || "No tienes permiso para esta acción");
};

let hay = { v: null, t: 0 };
async function tablas() {
  if (hay.v === true || Date.now() - hay.t < 20000) return hay.v;
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('masters','master_inscripciones')",
  );
  hay = { v: Number(f?.n) === 2, t: Date.now() };
  return hay.v;
}
async function exigirTablas() {
  if (!(await tablas())) throw new ErrorHttp(503, "Falta crear las tablas de másters: ejecuta la parte 39 (39_masters.sql) en MySQL Workbench.");
}
export const tablasMasters = tablas;

/** ¿Tiene membresía vigente hoy? (define el precio socio) */
export async function esSocio(idalumno) {
  if (!idalumno) return false;
  const [m] = await consultar(
    `SELECT 1 AS si FROM matriculas WHERE idalumno = ? AND estado IN ('activa','por_vencer','congelada')
        AND fecha_inicio <= ? AND (fecha_fin IS NULL OR fecha_fin >= ?) LIMIT 1`,
    [idalumno, hoyLima(), hoyLima()],
  );
  return !!m;
}
async function alumnoDe(req) {
  const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  return u?.idalumno || null;
}

const SQL_MASTER = `
  SELECT m.*, d.nombre AS disciplina, d.emoji, d.color,
         TRIM(CONCAT(IFNULL(e.nombres,''),' ',IFNULL(e.apellidos,''))) AS profesor,
         (SELECT COUNT(*) FROM master_inscripciones i WHERE i.idmaster = m.idmaster AND i.estado = 'inscrito') AS inscritos,
         (SELECT COUNT(*) FROM master_inscripciones i WHERE i.idmaster = m.idmaster AND i.estado = 'inscrito' AND i.pagado = 1) AS pagados,
         (SELECT COUNT(*) FROM master_inscripciones i WHERE i.idmaster = m.idmaster AND i.estado = 'inscrito' AND i.es_socio = 1) AS socios,
         (SELECT COUNT(*) FROM master_inscripciones i WHERE i.idmaster = m.idmaster AND i.estado = 'inscrito' AND i.asistio = 1) AS asistieron,
         (SELECT COALESCE(SUM(i.precio),0) FROM master_inscripciones i WHERE i.idmaster = m.idmaster AND i.estado = 'inscrito' AND i.pagado = 1) AS recaudado,
         (SELECT COALESCE(SUM(i.precio),0) FROM master_inscripciones i WHERE i.idmaster = m.idmaster AND i.estado = 'inscrito' AND i.pagado = 0) AS por_cobrar
    FROM masters m
    LEFT JOIN disciplinas d ON d.iddisciplina = m.iddisciplina
    LEFT JOIN empleados e ON e.idempleado = m.idempleado`;
const NOMBRE_METODO = { efectivo: "efectivo", yape_plin: "Yape/Plin", tarjeta: "tarjeta", transferencia: "transferencia" };
/** ¿Las columnas de la parte 40 ya existen? (porcentaje y enlace con caja) */
let p40 = { v: null, t: 0 };
async function parte40() {
  if (p40.v === true || Date.now() - p40.t < 20000) return p40.v;
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_inscripciones' AND COLUMN_NAME = 'idmovimiento'",
  );
  p40 = { v: Number(f?.n) === 1, t: Date.now() };
  return p40.v;
}
/** ¿Ya existe la columna del step (parte 41)? */
let p41 = { v: null, t: 0 };
async function parte41() {
  if (p41.v === true || Date.now() - p41.t < 20000) return p41.v;
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_inscripciones' AND COLUMN_NAME = 'idstep'",
  );
  p41 = { v: Number(f?.n) === 1, t: Date.now() };
  return p41.v;
}
async function exigirParte41() {
  if (!(await parte41())) throw new ErrorHttp(503, "Falta ejecutar la parte 41 (41_steps_masters_calificaciones.sql) en MySQL Workbench para elegir steps en los másters.");
}
/** Valida que el step exista en el croquis */
async function stepValido(idstep) {
  const [st] = await consultar("SELECT idstep, COALESCE(NULLIF(etiqueta,''), numero) AS numero FROM clase_steps WHERE idstep = ? AND activo = 1 AND tipo = 'step'", [idstep]);
  if (!st) throw new ErrorHttp(400, "Ese step ya no existe en el croquis");
  return { ...st, numero: nombreStep(st.numero) };
}
/** ¿Quién tiene ese step en el máster? (la inscripción más antigua gana) */
async function duenoStep(idmaster, idstep) {
  const [d] = await consultar(
    "SELECT idinscripcion, nombre FROM master_inscripciones WHERE idmaster = ? AND idstep = ? AND estado = 'inscrito' ORDER BY idinscripcion LIMIT 1",
    [idmaster, idstep],
  );
  return d || null;
}
const ocupado = (numero, nombre) => new ErrorHttp(409, `Lugar ocupado: el step ${numero} ya es de ${String(nombre || "otra persona").split(" ")[0]}. Elige otro.`);

async function pctDefecto() {
  const [c] = await consultar("SELECT valor FROM configuracion WHERE clave = 'pct_gym_masters'").catch(() => []);
  const n = Number(c?.valor);
  return n >= 0 && n <= 100 && c ? n : 50;
}
/** El cobro de una inscripción entra a caja como ingreso «master» */
async function registrarCobro(req, ins, m, metodo) {
  if (!(await parte40())) return null;
  await exigirCajaAbierta(req);
  const r = await consultar(
    `INSERT INTO movimientos_caja (tipo, categoria, monto, descripcion, metodo_pago, idreferencia, idalumno, nombre_relacionado, idusuario_registro)
     VALUES ('ingreso', 'master', ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(ins.precio),
      `Máster «${m.titulo}» ${String(m.fecha).slice(0, 10)} · ${ins.nombre} (${ins.es_socio ? "socio" : "público"})`.slice(0, 255),
      metodo === "yape_plin" || metodo === "tarjeta" || metodo === "transferencia" ? metodo : "efectivo",
      ins.idinscripcion,
      ins.idalumno || null,
      ins.nombre,
      req.usuario.idusuario,
    ],
  );
  await consultar("UPDATE master_inscripciones SET idmovimiento = ? WHERE idinscripcion = ?", [r.insertId, ins.idinscripcion]);
  return r.insertId;
}

const masterJson = (f) => ({
  id: f.idmaster,
  titulo: f.titulo,
  disciplinaId: f.iddisciplina,
  disciplina: f.disciplina || "",
  emoji: f.emoji || "🌟",
  color: f.color || "ambar",
  profesorId: f.idempleado,
  profesor: [f.profesor, f.profesor_invitado].filter(Boolean).join(" · ") || "Por confirmar",
  invitado: f.profesor_invitado || "",
  fecha: String(f.fecha).slice(0, 10),
  inicio: hhmm(f.hora_inicio),
  fin: hhmm(f.hora_fin),
  precioSocio: Number(f.precio_socio),
  precioPublico: Number(f.precio_publico),
  cupo: f.cupo,
  sala: f.sala || "",
  descripcion: f.descripcion || "",
  estado: f.estado,
  pctGym: f.pct_gym === undefined || f.pct_gym === null ? 50 : Number(f.pct_gym),
  pagadoProfesor: f.pagado_profesor === undefined || f.pagado_profesor === null ? 0 : Number(f.pagado_profesor),
  pagadoProfesorEn: f.pagado_profesor_en ? String(f.pagado_profesor_en).replace("T", " ").slice(0, 16) : "",
  inscritos: Number(f.inscritos) || 0,
  pagados: Number(f.pagados) || 0,
  socios: Number(f.socios) || 0,
  asistieron: Number(f.asistieron) || 0,
  recaudado: Number(f.recaudado) || 0,
  porCobrar: Number(f.por_cobrar) || 0,
});

// GET /api/masters?ver=proximos|pasados|todos
router.get("/", async (req, res, next) => {
  try {
    await exigirTablas();
    const hoy = hoyLima();
    const alumno = req.usuario.rol === "student";
    const ver = alumno ? "proximos" : req.query.ver || "proximos";
    const filtro = ver === "pasados" ? "WHERE m.fecha < ?" : ver === "todos" ? "WHERE ? IS NOT NULL" : "WHERE m.fecha >= ?";
    let filas = (await consultar(`${SQL_MASTER} ${filtro} ORDER BY m.fecha ${ver === "pasados" ? "DESC" : "ASC"}, m.hora_inicio LIMIT 200`, [hoy])).map(masterJson);
    if (alumno) {
      filas = filas.filter((m) => m.estado === "abierto" || m.estado === "cerrado");
      const yo = await alumnoDe(req);
      const socio = await esSocio(yo);
      const mias = yo
        ? await consultar(
            (await parte41())
              ? `SELECT i.idinscripcion, i.idmaster, i.pagado, i.precio, i.idstep, COALESCE(NULLIF(s.etiqueta,''), s.numero) AS step_numero
                   FROM master_inscripciones i LEFT JOIN clase_steps s ON s.idstep = i.idstep
                  WHERE i.idalumno = ? AND i.estado = 'inscrito'`
              : "SELECT idinscripcion, idmaster, pagado, precio FROM master_inscripciones WHERE idalumno = ? AND estado = 'inscrito'",
            [yo],
          )
        : [];
      filas = filas.map((m) => {
        const i = mias.find((x) => x.idmaster === m.id);
        return {
          ...m,
          recaudado: undefined,
          porCobrar: undefined,
          miPrecio: socio ? m.precioSocio : m.precioPublico,
          soySocio: socio,
          lleno: !!m.cupo && m.inscritos >= m.cupo,
          miInscripcion: i ? { id: i.idinscripcion, pagado: !!i.pagado, precio: Number(i.precio), stepId: i.idstep || null, step: nombreStep(i.step_numero) || null } : null,
        };
      });
    }
    res.json({ hoy, masters: filas, pctDefecto: alumno ? undefined : await pctDefecto(), conCaja: await parte40(), conSteps: !!(await parte41()) });
  } catch (e) {
    next(e);
  }
});

async function validar(b) {
  const titulo = txt(b.titulo, 100);
  if (!titulo) throw new ErrorHttp(400, "Escribe el nombre del máster");
  const fecha = fechaOk(b.fecha);
  if (!fecha) throw new ErrorHttp(400, "Elige el sábado o domingo del máster");
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  if (dia !== 0 && dia !== 6) throw new ErrorHttp(400, "Los másters son sábado o domingo");
  const inicio = horaOk(b.inicio);
  const fin = horaOk(b.fin);
  if (!inicio || !fin || fin <= inicio) throw new ErrorHttp(400, "Revisa la hora: la de fin debe ser después de la de inicio");
  const precioSocio = dinero(b.precioSocio);
  const precioPublico = dinero(b.precioPublico);
  if (!(precioPublico > 0)) throw new ErrorHttp(400, "Pon el precio público");
  if (precioSocio < 0 || precioSocio > precioPublico) throw new ErrorHttp(400, "El precio para socios no puede ser mayor que el público");
  const cupo = Number(b.cupo) > 0 ? Math.min(999, Math.round(Number(b.cupo))) : null;
  const pct = b.pctGym === undefined || b.pctGym === "" ? await pctDefecto() : Number(b.pctGym);
  if (!(pct >= 0 && pct <= 100)) throw new ErrorHttp(400, "El porcentaje del gimnasio debe estar entre 0 y 100");
  return {
    titulo,
    iddisciplina: Number(b.disciplinaId) || null,
    idempleado: Number(b.profesorId) || null,
    invitado: txt(b.invitado, 120),
    fecha,
    inicio,
    fin,
    precioSocio,
    precioPublico,
    cupo,
    sala: txt(b.sala, 60),
    descripcion: txt(b.descripcion, 400),
    pct: Math.round(pct * 100) / 100,
  };
}
router.post("/", async (req, res, next) => {
  try {
    await exigirTablas();
    exigir(req, ["admin"], "Solo administración crea másters");
    const v = await validar(req.body || {});
    if (v.fecha < hoyLima()) throw new ErrorHttp(400, "La fecha ya pasó");
    const r = await consultar(
      `INSERT INTO masters (titulo, iddisciplina, idempleado, profesor_invitado, fecha, hora_inicio, hora_fin, precio_socio, precio_publico, cupo, sala, descripcion, idusuario_creador)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.titulo, v.iddisciplina, v.idempleado, v.invitado, v.fecha, v.inicio, v.fin, v.precioSocio, v.precioPublico, v.cupo, v.sala, v.descripcion, req.usuario.idusuario],
    );
    if (await parte40()) await consultar("UPDATE masters SET pct_gym = ? WHERE idmaster = ?", [v.pct, r.insertId]);
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) {
    next(e);
  }
});
router.put("/:id(\\d+)", async (req, res, next) => {
  try {
    await exigirTablas();
    exigir(req, ["admin"], "Solo administración cambia los másters");
    const v = await validar(req.body || {});
    const estado = ["abierto", "cerrado", "realizado", "cancelado"].includes(req.body?.estado) ? req.body.estado : "abierto";
    await consultar(
      `UPDATE masters SET titulo=?, iddisciplina=?, idempleado=?, profesor_invitado=?, fecha=?, hora_inicio=?, hora_fin=?, precio_socio=?, precio_publico=?, cupo=?, sala=?, descripcion=?, estado=?
        WHERE idmaster = ?`,
      [v.titulo, v.iddisciplina, v.idempleado, v.invitado, v.fecha, v.inicio, v.fin, v.precioSocio, v.precioPublico, v.cupo, v.sala, v.descripcion, estado, Number(req.params.id)],
    );
    if (req.body?.pctGym !== undefined && req.body.pctGym !== "" && (await parte40()))
      await consultar("UPDATE masters SET pct_gym = ? WHERE idmaster = ?", [v.pct, Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// GET /api/masters/:id/inscritos (personal)
router.get("/:id(\\d+)/inscritos", async (req, res, next) => {
  try {
    await exigirTablas();
    exigir(req, VEN, "La lista es para el personal");
    const filas = await consultar(
      (await parte41())
        ? `SELECT i.*, a.codigo, COALESCE(NULLIF(s.etiqueta,''), s.numero) AS step_numero FROM master_inscripciones i
             LEFT JOIN alumnos a ON a.idalumno = i.idalumno LEFT JOIN clase_steps s ON s.idstep = i.idstep
            WHERE i.idmaster = ? ORDER BY i.estado = 'anulado', i.creada_en`
        : `SELECT i.*, a.codigo FROM master_inscripciones i LEFT JOIN alumnos a ON a.idalumno = i.idalumno
            WHERE i.idmaster = ? ORDER BY i.estado = 'anulado', i.creada_en`,
      [Number(req.params.id)],
    );
    res.json({
      inscritos: filas.map((f) => ({
        id: f.idinscripcion,
        alumnoId: f.idalumno,
        codigo: f.codigo || "",
        nombre: f.nombre,
        dni: f.dni || "",
        celular: f.celular || "",
        stepId: f.idstep || null,
        step: nombreStep(f.step_numero) || null,
        socio: !!f.es_socio,
        precio: Number(f.precio),
        pagado: !!f.pagado,
        metodo: f.metodo_pago || "",
        pagadoEn: f.pagado_en ? String(f.pagado_en).replace("T", " ").slice(0, 16) : "",
        asistio: !!f.asistio,
        origen: f.origen,
        estado: f.estado,
        nota: f.nota || "",
        registrado: String(f.creada_en).replace("T", " ").slice(0, 16),
      })),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/masters/:id/steps -> croquis y quién tiene cada step en este máster
router.get("/:id(\\d+)/steps", async (req, res, next) => {
  try {
    await exigirTablas();
    const id = Number(req.params.id);
    const alumno = req.usuario.rol === "student";
    const yo = alumno ? await alumnoDe(req) : null;
    const pasos = await croquis();
    const filas = (await parte41())
      ? await consultar(
          `SELECT i.idinscripcion, i.idstep, i.idalumno, i.nombre, i.asistio, COALESCE(NULLIF(s.etiqueta,''), s.numero) AS numero
             FROM master_inscripciones i JOIN clase_steps s ON s.idstep = i.idstep
            WHERE i.idmaster = ? AND i.estado = 'inscrito' AND i.idstep IS NOT NULL ORDER BY i.idinscripcion`,
          [id],
        )
      : [];
    const vistos = new Set();
    res.json({
      conSteps: !!(await parte41()),
      croquis: { ancho: 40, alto: 28, steps: pasos },
      libres: pasos.filter((z) => z.tipo === "step").length - new Set(filas.map((f) => f.idstep)).size,
      reservas: filas
        .filter((f) => !vistos.has(f.idstep) && vistos.add(f.idstep))
        .map((f) => ({
          stepId: f.idstep,
          numero: nombreStep(f.numero),
          estado: f.asistio ? "asistio" : "reservado",
          mia: !!yo && f.idalumno === yo,
          inscripcionId: alumno ? undefined : f.idinscripcion,
          // el alumno solo ve el primer nombre de los demás
          alumno: alumno ? String(f.nombre || "").split(" ")[0] : f.nombre,
        })),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/masters/:id/inscribir
//  personal: { alumnoId } o { nombre, dni, celular }, + { pagado, metodo }
//  alumno:   se inscribe él mismo; queda por pagar en recepción
router.post("/:id(\\d+)/inscribir", (req, res, next) =>
  enFila(`master-${req.params.id}`, () => inscribir(req, res)).catch(next),
);
async function inscribir(req, res) {
  {
    await exigirTablas();
    const id = Number(req.params.id);
    const [m] = await consultar("SELECT * FROM masters WHERE idmaster = ?", [id]);
    if (!m) throw new ErrorHttp(404, "El máster no existe");
    if (m.estado !== "abierto") throw new ErrorHttp(409, "Las inscripciones de este máster están cerradas");
    if (String(m.fecha).slice(0, 10) < hoyLima()) throw new ErrorHttp(409, "Este máster ya pasó");
    const b = req.body || {};
    const alumno = req.usuario.rol === "student";
    if (!alumno) exigir(req, STAFF, "Solo recepción y administración inscriben");
    let idalumno = alumno ? await alumnoDe(req) : Number(b.alumnoId) || null;
    let nombre = txt(b.nombre, 120);
    let dni = txt(b.dni, 15);
    let celular = txt(b.celular, 20);
    if (idalumno) {
      const [a] = await consultar("SELECT idalumno, nombres, apellidos, dni, telefono FROM alumnos WHERE idalumno = ?", [idalumno]).catch(() =>
        consultar("SELECT idalumno, nombres, apellidos, dni, NULL AS telefono FROM alumnos WHERE idalumno = ?", [idalumno]),
      );
      if (!a) throw new ErrorHttp(404, "No existe ese alumno");
      nombre = `${a.nombres} ${a.apellidos}`.trim();
      dni = dni || a.dni || null;
      celular = celular || a.telefono || null;
      const [ya] = await consultar("SELECT idinscripcion FROM master_inscripciones WHERE idmaster = ? AND idalumno = ? AND estado = 'inscrito'", [id, idalumno]);
      if (ya) throw new ErrorHttp(409, `${nombre.split(" ")[0]} ya está inscrito en este máster`);
    } else {
      if (!nombre) throw new ErrorHttp(400, "Escribe el nombre de la persona");
      if (dni) {
        const [ya] = await consultar("SELECT idinscripcion FROM master_inscripciones WHERE idmaster = ? AND dni = ? AND estado = 'inscrito'", [id, dni]);
        if (ya) throw new ErrorHttp(409, "Esa persona (DNI) ya está inscrita");
      }
    }
    if (m.cupo) {
      const [c] = await consultar("SELECT COUNT(*) AS n FROM master_inscripciones WHERE idmaster = ? AND estado = 'inscrito'", [id]);
      if (Number(c.n) >= m.cupo) throw new ErrorHttp(409, `Cupo lleno (${m.cupo} personas)`);
    }
    // Step del croquis (gana quien lo tomó primero)
    let st = null;
    if (Number(b.step)) {
      await exigirParte41();
      st = await stepValido(Number(b.step));
      const d = await duenoStep(id, st.idstep);
      if (d) throw ocupado(st.numero, d.nombre);
    } else if (alumno && (await parte41())) {
      const libres = (await croquis()).filter((z) => z.tipo === "step").length;
      const [u] = await consultar("SELECT COUNT(DISTINCT idstep) AS n FROM master_inscripciones WHERE idmaster = ? AND estado = 'inscrito' AND idstep IS NOT NULL", [id]);
      if (libres > Number(u.n)) throw new ErrorHttp(400, "Elige tu step en el croquis para inscribirte");
    }
    const socio = await esSocio(idalumno);
    const precio = socio ? Number(m.precio_socio) : Number(m.precio_publico);
    const pagado = !alumno && !!b.pagado;
    const metodo = pagado ? (METODOS.includes(b.metodo) ? b.metodo : "efectivo") : null;
    if (pagado && (await parte40())) await exigirCajaAbierta(req);
    const r = await consultar(
      `INSERT INTO master_inscripciones (idmaster, idalumno, nombre, dni, celular, es_socio, precio, pagado, metodo_pago, pagado_en, origen, nota, idusuario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${pagado ? "NOW()" : "NULL"}, ?, ?, ?)`,
      [id, idalumno, nombre, dni, celular, socio ? 1 : 0, precio, pagado ? 1 : 0, metodo, alumno ? "alumno" : "recepcion", txt(b.nota, 200), req.usuario.idusuario],
    );
    if (st) await consultar("UPDATE master_inscripciones SET idstep = ? WHERE idinscripcion = ?", [st.idstep, r.insertId]);
    if (pagado) {
      const [ins] = await consultar("SELECT * FROM master_inscripciones WHERE idinscripcion = ?", [r.insertId]);
      await registrarCobro(req, ins, m, metodo);
    }
    res.status(201).json({ ok: true, id: r.insertId, nombre, socio, precio, pagado, step: st?.numero || null });
  }
}

// POST /api/masters/inscripciones/:id { accion: pagar|anular|asistio|no_asistio, metodo }
router.post("/inscripciones/:id(\\d+)", async (req, res, next) => {
  try {
    await exigirTablas();
    const id = Number(req.params.id);
    const [i] = await consultar("SELECT * FROM master_inscripciones WHERE idinscripcion = ?", [id]);
    if (!i) throw new ErrorHttp(404, "La inscripción no existe");
    const accion = String(req.body?.accion || "");
    if (req.usuario.rol === "student") {
      if (!["anular", "step"].includes(accion) || i.idalumno !== (await alumnoDe(req))) throw new ErrorHttp(403, "Solo puedes cambiar tu propia inscripción");
      if (accion === "anular" && i.pagado) throw new ErrorHttp(409, "Ya pagaste: para anular acércate a recepción");
    } else exigir(req, STAFF, "Solo recepción y administración");
    const [m] = await consultar("SELECT * FROM masters WHERE idmaster = ?", [i.idmaster]);
    if (accion === "step") {
      // Elegir, cambiar o quitar (solo personal) el step de un inscrito
      await exigirParte41();
      if (i.estado !== "inscrito") throw new ErrorHttp(409, "La inscripción está anulada");
      if (String(m.fecha).slice(0, 10) < hoyLima()) throw new ErrorHttp(409, "Este máster ya pasó");
      const nuevo = Number(req.body?.step) || null;
      if (!nuevo && req.usuario.rol === "student") throw new ErrorHttp(400, "Elige un step");
      const numero = await enFila(`master-${i.idmaster}`, async () => {
        let st = null;
        if (nuevo) {
          st = await stepValido(nuevo);
          const d = await duenoStep(i.idmaster, st.idstep);
          if (d && d.idinscripcion !== i.idinscripcion) throw ocupado(st.numero, d.nombre);
        }
        await consultar("UPDATE master_inscripciones SET idstep = ?, idusuario = ? WHERE idinscripcion = ?", [st?.idstep || null, req.usuario.idusuario, id]);
        return st?.numero || null;
      });
      return res.json({ ok: true, step: numero });
    }
    if (accion === "pagar") {
      if (i.pagado) throw new ErrorHttp(409, "Ya estaba pagado");
      if (i.estado !== "inscrito") throw new ErrorHttp(409, "La inscripción está anulada");
      const metodo = METODOS.includes(req.body?.metodo) ? req.body.metodo : "efectivo";
      if (await parte40()) await exigirCajaAbierta(req);
      await consultar("UPDATE master_inscripciones SET pagado = 1, metodo_pago = ?, pagado_en = NOW(), idusuario = ? WHERE idinscripcion = ?", [metodo, req.usuario.idusuario, id]);
      await registrarCobro(req, i, m, metodo);
    } else if (accion === "anular") {
      if (i.estado !== "inscrito") throw new ErrorHttp(409, "Ya estaba anulada");
      // Si ya había pagado, la devolución sale de caja como egreso
      if (i.pagado && i.idmovimiento && (await parte40())) {
        await exigirCajaAbierta(req);
        await consultar(
          `INSERT INTO movimientos_caja (tipo, categoria, monto, descripcion, metodo_pago, idreferencia, idalumno, nombre_relacionado, idusuario_registro)
           VALUES ('egreso', 'master', ?, ?, ?, ?, ?, ?, ?)`,
          [Number(i.precio), `Devolución máster «${m.titulo}» · ${i.nombre}`.slice(0, 255), i.metodo_pago || "efectivo", i.idinscripcion, i.idalumno || null, i.nombre, req.usuario.idusuario],
        );
      }
      await consultar("UPDATE master_inscripciones SET estado = 'anulado', idusuario = ? WHERE idinscripcion = ?", [req.usuario.idusuario, id]);
    } else if (accion === "asistio" || accion === "no_asistio") {
      await consultar("UPDATE master_inscripciones SET asistio = ?, idusuario = ? WHERE idinscripcion = ?", [accion === "asistio" ? 1 : 0, req.usuario.idusuario, id]);
    } else throw new ErrorHttp(400, "Acción no válida");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/masters/:id/pago-profesor -> entrega al profesor su parte (egreso de caja)
router.post("/:id(\\d+)/pago-profesor", async (req, res, next) => {
  try {
    await exigirTablas();
    exigir(req, STAFF, "Solo recepción y administración registran el pago al profesor");
    if (!(await parte40())) throw new ErrorHttp(503, "Falta ejecutar la parte 40 (40_masters_caja_tareas.sql) en MySQL Workbench.");
    const id = Number(req.params.id);
    const [m] = (await consultar(`${SQL_MASTER} WHERE m.idmaster = ?`, [id])).map(masterJson);
    if (!m) throw new ErrorHttp(404, "El máster no existe");
    const parte = Math.round(m.recaudado * (100 - m.pctGym)) / 100;
    const falta = Math.round((parte - m.pagadoProfesor) * 100) / 100;
    if (!(falta > 0)) throw new ErrorHttp(409, "No hay nada pendiente por pagar al profesor");
    await exigirCajaAbierta(req);
    const metodo = METODOS.includes(req.body?.metodo) ? req.body.metodo : "efectivo";
    await consultar(
      `INSERT INTO movimientos_caja (tipo, categoria, monto, descripcion, metodo_pago, idreferencia, idempleado, nombre_relacionado, idusuario_registro)
       VALUES ('egreso', 'master', ?, ?, ?, ?, ?, ?, ?)`,
      [falta, `Pago al profesor · máster «${m.titulo}» ${m.fecha} (${100 - m.pctGym}% de S/ ${m.recaudado.toFixed(2)})`.slice(0, 255), metodo, id, m.profesorId || null, m.profesor, req.usuario.idusuario],
    );
    await consultar("UPDATE masters SET pagado_profesor = COALESCE(pagado_profesor,0) + ?, pagado_profesor_en = NOW() WHERE idmaster = ?", [falta, id]);
    res.json({ ok: true, monto: falta });
  } catch (e) {
    next(e);
  }
});

// Aviso al alumno: másters nuevos publicados (próximos 10 días)
export async function avisosMasters(req, hoy) {
  if (req.usuario.rol !== "student" || !(await tablas())) return [];
  const filas = await consultar(
    `SELECT m.idmaster, m.titulo, m.fecha, m.hora_inicio, m.precio_socio, m.precio_publico, d.emoji
       FROM masters m LEFT JOIN disciplinas d ON d.iddisciplina = m.iddisciplina
      WHERE m.estado = 'abierto' AND m.fecha BETWEEN ? AND ?`,
    [hoy, sumarDias(hoy, 10)],
  );
  if (!filas.length) return [];
  const yo = await alumnoDe(req);
  const socio = await esSocio(yo);
  const ya = yo ? (await consultar("SELECT idmaster FROM master_inscripciones WHERE idalumno = ? AND estado = 'inscrito'", [yo])).map((x) => x.idmaster) : [];
  const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  return filas
    .filter((f) => !ya.includes(f.idmaster))
    .map((f) => {
      const fecha = String(f.fecha).slice(0, 10);
      const d = DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];
      const precio = socio ? Number(f.precio_socio) : Number(f.precio_publico);
      return {
        id: `master-${f.idmaster}`,
        tipo: "master",
        nivel: "bajo",
        titulo: `${f.emoji || "🌟"} Máster: ${f.titulo}`,
        mensaje: `${d} ${Number(fecha.slice(8))} a las ${hhmm(f.hora_inicio)} · ${socio ? "precio socio" : "precio"} S/ ${precio.toFixed(2)}. Inscríbete desde Clases grupales.`,
        fecha: hoy,
        accion: { tipo: "ir", tab: "mis_clases", etiqueta: "Ver máster" },
      };
    });
}

export default router;
