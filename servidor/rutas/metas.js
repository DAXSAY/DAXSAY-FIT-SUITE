// =====================================================================
// METAS & LOGROS
//  * Turnos de recepción (Turno 1, Turno 2...) y su meta en soles por mes.
//    El avance suma los ingresos de los turnos de caja de ese turno.
//  * Objetivos de alumnos: nutrición o fisioterapia los crean y evalúan.
//    Si se consigue, el entrenador del alumno gana un logro (mancuerna).
//  * Metas de entrenadores: cantidad de logros (peso/masa o lesión/dolor).
//  * Bonos: administración los aprueba al cumplirse una meta y los paga.
// =====================================================================
import { Router } from "express";
import { consultar, transaccion } from "../db.js";
import { hoyLima } from "../congelamiento.js";
import { ErrorHttp, requierePermiso, soloPersonal, tienePermiso } from "../seguridad.js";
import { columnasCrm } from "../crmCredito.js";
import { columnaWhatsappTurno } from "./tareas.js";

const router = Router();
router.use(soloPersonal);

const hoy = hoyLima;
const fechaOk = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : null);
const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const txt = (v, max) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim().slice(0, max));
const dias = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);
const sumarDias = (f, n) => {
  const d = new Date(`${f}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const mesARango = (mes) => {
  if (!/^\d{4}-\d{2}$/.test(mes || "")) return null;
  const [a, m] = mes.split("-").map(Number);
  const fin = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  return [`${mes}-01`, fin];
};

async function esAdmin(req) {
  return tienePermiso(req.usuario.idusuario, "users", "editar");
}
async function yo(req) {
  const [u] = await consultar(
    `SELECT u.idempleado, u.idturno_recepcion, r.codigo AS rol FROM usuarios u JOIN roles r ON r.idrol = u.idrol
      WHERE u.idusuario = ?`,
    [req.usuario.idusuario],
  );
  return u || {};
}
const soloAdmin = async (req, res, next) => {
  try {
    if (!(await esAdmin(req))) throw new ErrorHttp(403, "Solo administración puede hacer esto");
    next();
  } catch (e) {
    next(e);
  }
};

// ---------------------------------------------------------------------
// TURNOS DE RECEPCIÓN (se pueden agregar los que hagan falta: 3, 4, 5...)
// ---------------------------------------------------------------------
/** WhatsApp del turno: solo dígitos y + (opcional) */
const telefonoTurno = (v) => {
  const s = String(v ?? "").replace(/[^\d+]/g, "").slice(0, 20);
  return s.replace(/\D/g, "").length >= 6 ? s : null;
};
router.get("/turnos-recepcion", requierePermiso(["goals", "cash"], "ver"), async (req, res, next) => {
  try {
    const turnos = await consultar("SELECT * FROM turnos_recepcion ORDER BY activo DESC, hora_inicio, nombre");
    const personas = await consultar(
      `SELECT u.idusuario, u.idturno_recepcion, u.idempleado, COALESCE(CONCAT_WS(' ', e.nombres, e.apellidos), u.usuario) AS nombre
         FROM usuarios u LEFT JOIN empleados e ON e.idempleado = u.idempleado
        WHERE u.activo = 1 AND u.idturno_recepcion IS NOT NULL`,
    );
    res.json(
      turnos.map((t) => ({
        id: String(t.idturno_recepcion),
        name: t.nombre,
        start: t.hora_inicio ? String(t.hora_inicio).slice(0, 5) : "",
        end: t.hora_fin ? String(t.hora_fin).slice(0, 5) : "",
        active: !!t.activo,
        whatsapp: t.whatsapp || "",
        people: personas
          .filter((p) => p.idturno_recepcion === t.idturno_recepcion)
          .map((p) => ({ userId: String(p.idusuario), staffId: p.idempleado ? String(p.idempleado) : null, name: p.nombre })),
      })),
    );
  } catch (e) {
    next(e);
  }
});

router.post("/turnos-recepcion", soloAdmin, async (req, res, next) => {
  try {
    const nombre = txt(req.body?.name, 60);
    if (!nombre) throw new ErrorHttp(400, "Escribe el nombre del turno");
    const wa = await columnaWhatsappTurno();
    await consultar(`INSERT INTO turnos_recepcion (nombre, hora_inicio, hora_fin${wa ? ", whatsapp" : ""}) VALUES (?,?,?${wa ? ",?" : ""})`, [
      nombre,
      txt(req.body?.start, 5),
      txt(req.body?.end, 5),
      ...(wa ? [telefonoTurno(req.body?.whatsapp)] : []),
    ]);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return next(new ErrorHttp(409, "Ya existe un turno con ese nombre"));
    next(e);
  }
});

router.put("/turnos-recepcion/:id(\\d+)", soloAdmin, async (req, res, next) => {
  try {
    if (!txt(req.body?.name, 60)) throw new ErrorHttp(400, "Escribe el nombre del turno");
    const wa = await columnaWhatsappTurno();
    await consultar(`UPDATE turnos_recepcion SET nombre = ?, hora_inicio = ?, hora_fin = ?, activo = ?${wa ? ", whatsapp = ?" : ""} WHERE idturno_recepcion = ?`, [
      txt(req.body?.name, 60),
      txt(req.body?.start, 5),
      txt(req.body?.end, 5),
      req.body?.active === false ? 0 : 1,
      ...(wa ? [telefonoTurno(req.body?.whatsapp)] : []),
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") return next(new ErrorHttp(409, "Ya existe un turno con ese nombre"));
    next(e);
  }
});


// A qué turno de recepción suma un ingreso de caja: si es una matrícula que
// salió del CRM, al turno del responsable (crédito); si no, al turno de la caja.
async function sqlTurnoIngreso() {
  const cred = (await columnasCrm()).credito;
  return {
    joins: cred
      ? `LEFT JOIN matriculas mac ON mc.categoria = 'matricula' AND mac.idmatricula = mc.idreferencia
         LEFT JOIN usuarios uc ON uc.idusuario = mac.idusuario_credito`
      : "",
    turno: cred ? "COALESCE(uc.idturno_recepcion, tc.idturno_recepcion, ua.idturno_recepcion)" : "COALESCE(tc.idturno_recepcion, ua.idturno_recepcion)",
    // Para contar matrículas (alias ma): el turno del crédito o el de la caja donde se cobró
    turnoMatricula: `${cred ? "COALESCE((SELECT uc2.idturno_recepcion FROM usuarios uc2 WHERE uc2.idusuario = ma.idusuario_credito), " : "("}
       (SELECT COALESCE(tc.idturno_recepcion, ua.idturno_recepcion)
          FROM movimientos_caja mc JOIN turnos_caja tc ON tc.idturno = mc.idturno
          LEFT JOIN usuarios ua ON ua.idusuario = tc.idusuario_apertura
         WHERE mc.categoria = 'matricula' AND mc.idreferencia = ma.idmatricula ORDER BY mc.idmovimiento LIMIT 1))`,
  };
}

// ---------------------------------------------------------------------
// METAS
// ---------------------------------------------------------------------
const AREA_DE = { composicion: ["nutricion"], lesion: ["fisioterapia"], general: ["nutricion", "fisioterapia"] };
const ESPECIALIDADES = ["nutricion", "fisioterapia"];
const CARGO_DE = { entrenador: "entrenador", nutricion: "nutricionista", fisioterapia: "fisioterapeuta" };

// ¿Ya se ejecutó base_datos/anteriores/27_metas_especialistas.sql? (se revisa cada minuto mientras falte)
const cache27 = { t: 0, v: null };
async function hay27() {
  if (cache27.v?.especialista && cache27.v?.controles) return cache27.v;
  if (cache27.v && Date.now() - cache27.t < 60000) return cache27.v;
  const [f] = await consultar(
    `SELECT
       (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'objetivos_alumno' AND COLUMN_NAME = 'idespecialista') AS esp,
       (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'objetivo_controles') AS ctl,
       (SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'metas' AND COLUMN_NAME = 'tipo') AS tipos`,
  );
  cache27.v = { especialista: Number(f?.esp) > 0, controles: Number(f?.ctl) > 0, metasEspecialistas: String(f?.tipos || "").includes("nutricion") };
  cache27.t = Date.now();
  return cache27.v;
}
const FALTA_27 = "Falta ejecutar base_datos/anteriores/27_metas_especialistas.sql en MySQL Workbench (como root).";

async function avance(m) {
  const inicio = String(m.fecha_inicio).slice(0, 10);
  const fin = String(m.fecha_fin).slice(0, 10);
  const h = hoy();
  const totalDias = dias(inicio, fin) + 1;
  const transcurridos = h < inicio ? 0 : h > fin ? totalDias : dias(inicio, h) + 1;
  const restantes = h > fin ? 0 : h < inicio ? totalDias : dias(h, fin) + 1;
  const objetivo = m.tipo === "recepcion" ? Number(m.monto_meta || 0) : Number(m.logros_meta || 0);

  let porDia = [];
  let logros = [];
  if (m.tipo === "recepcion") {
    const st = await sqlTurnoIngreso();
    porDia = await consultar(
      `SELECT DATE(mc.fecha) AS dia, SUM(mc.monto) AS total
         FROM movimientos_caja mc JOIN turnos_caja tc ON tc.idturno = mc.idturno
         LEFT JOIN usuarios ua ON ua.idusuario = tc.idusuario_apertura
         ${st.joins}
        WHERE ${st.turno} = ?
          AND mc.tipo = 'ingreso' AND mc.fecha >= ? AND mc.fecha < ? + INTERVAL 1 DAY
        GROUP BY DATE(mc.fecha)`,
      [m.idturno_recepcion, inicio, fin],
    );
  } else {
    const esEspecialista = ESPECIALIDADES.includes(m.tipo);
    const areas = esEspecialista ? [m.tipo] : AREA_DE[m.categoria] || AREA_DE.general;
    logros = await consultar(
      `SELECT o.idobjetivo, o.area, o.tipo, o.descripcion, o.valor_inicial, o.valor_final, o.unidad,
              DATE(o.fecha_evaluacion) AS dia, CONCAT(a.nombres, ' ', a.apellidos) AS alumno,
              CONCAT_WS(' ', ev.nombres, ev.apellidos) AS evaluador
         FROM objetivos_alumno o JOIN alumnos a ON a.idalumno = o.idalumno
         LEFT JOIN empleados ev ON ev.idempleado = o.evaluado_por
        WHERE ${esEspecialista ? "o.idespecialista = ?" : "o.identrenador = ? AND o.logro_otorgado = 1"} AND o.estado = 'conseguida'
          AND o.area IN (${areas.map(() => "?").join(",")})
          AND o.fecha_evaluacion >= ? AND o.fecha_evaluacion < ? + INTERVAL 1 DAY
        ORDER BY o.fecha_evaluacion`,
      [m.idempleado, ...areas, inicio, fin],
    );
    const conteo = {};
    logros.forEach((l) => (conteo[String(l.dia).slice(0, 10)] = (conteo[String(l.dia).slice(0, 10)] || 0) + 1));
    porDia = Object.entries(conteo).map(([dia, total]) => ({ dia, total }));
  }

  // Serie diaria con acumulado e ideal (para el gráfico)
  const mapa = Object.fromEntries(porDia.map((d) => [String(d.dia).slice(0, 10), Number(d.total)]));
  const diario = [];
  let acumulado = 0;
  for (let i = 0; i < totalDias; i++) {
    const dia = sumarDias(inicio, i);
    const valor = mapa[dia] || 0;
    acumulado += valor;
    diario.push({
      dia,
      valor: r2(valor),
      acumulado: dia <= h ? r2(acumulado) : null,
      ideal: r2((objetivo * (i + 1)) / totalDias),
    });
  }
  const logrado = r2(acumulado);
  // Semanas del periodo (bloques de 7 días desde el inicio)
  const semanas = [];
  for (let i = 0; i < totalDias; i += 7) {
    const bloque = diario.slice(i, i + 7);
    semanas.push({
      numero: semanas.length + 1,
      desde: bloque[0].dia,
      hasta: bloque[bloque.length - 1].dia,
      total: r2(bloque.reduce((a, d) => a + d.valor, 0)),
      meta: r2((objetivo * bloque.length) / totalDias),
    });
  }
  const faltante = Math.max(0, r2(objetivo - logrado));
  const hoyFila = diario.find((d) => d.dia === h);
  const semanaActual = semanas.find((s) => s.desde <= h && s.hasta >= h) || null;
  return {
    objetivo,
    logrado,
    porcentaje: objetivo > 0 ? Math.min(100, Math.round((logrado / objetivo) * 1000) / 10) : 0,
    faltante,
    cumplida: objetivo > 0 && logrado >= objetivo,
    totalDias,
    diasTranscurridos: transcurridos,
    diasRestantes: restantes,
    necesarioPorDia: restantes > 0 ? r2(faltante / restantes) : faltante,
    ritmoIdeal: r2((objetivo * transcurridos) / totalDias),
    hoy: hoyFila ? hoyFila.valor : 0,
    semanaActual,
    diario,
    semanas,
    logros: logros.map((l) => ({
      id: String(l.idobjetivo),
      area: l.area,
      tipo: l.tipo,
      descripcion: l.descripcion,
      alumno: l.alumno,
      evaluador: l.evaluador || "",
      inicial: l.valor_inicial != null ? Number(l.valor_inicial) : null,
      final: l.valor_final != null ? Number(l.valor_final) : null,
      unidad: l.unidad || "",
      dia: String(l.dia).slice(0, 10),
    })),
  };
}

async function metasCompletas(where, params) {
  const filas = await consultar(
    `SELECT m.*, tr.nombre AS turno, CONCAT_WS(' ', e.nombres, e.apellidos) AS empleado,
            b.idbono, b.estado AS bono_estado, b.monto AS bono_monto
       FROM metas m
       LEFT JOIN turnos_recepcion tr ON tr.idturno_recepcion = m.idturno_recepcion
       LEFT JOIN empleados e ON e.idempleado = m.idempleado
       LEFT JOIN bonos b ON b.idbono = (SELECT MAX(b2.idbono) FROM bonos b2 WHERE b2.idmeta = m.idmeta AND b2.estado <> 'anulado')
      WHERE ${where}
      ORDER BY m.tipo DESC, m.fecha_inicio DESC, tr.nombre, e.nombres`,
    params,
  );
  return Promise.all(
    filas.map(async (m) => ({
      id: String(m.idmeta),
      type: m.tipo,
      category: m.categoria,
      receptionShiftId: m.idturno_recepcion ? String(m.idturno_recepcion) : null,
      staffId: m.idempleado ? String(m.idempleado) : null,
      name: m.tipo === "recepcion" ? m.turno : m.empleado,
      start: String(m.fecha_inicio).slice(0, 10),
      end: String(m.fecha_fin).slice(0, 10),
      bonus: Number(m.bono),
      notes: m.notas || "",
      bonusId: m.idbono ? String(m.idbono) : null,
      bonusStatus: m.bono_estado || null,
      progress: await avance(m),
    })),
  );
}

// GET /api/metas/metas?mes=YYYY-MM  -> admin: todas; recepción: su turno; entrenador: las suyas
router.get("/metas", requierePermiso("goals", "ver"), async (req, res, next) => {
  try {
    const [ini, fin] = mesARango(req.query.mes) || mesARango(hoy().slice(0, 7));
    const base = "m.fecha_inicio <= ? AND m.fecha_fin >= ?";
    if (await esAdmin(req)) return res.json(await metasCompletas(base, [fin, ini]));
    const u = await yo(req);
    const cond = [];
    const params = [fin, ini];
    if (u.idturno_recepcion) {
      cond.push("(m.tipo = 'recepcion' AND m.idturno_recepcion = ?)");
      params.push(u.idturno_recepcion);
    }
    if (u.idempleado) {
      cond.push("(m.tipo IN ('entrenador','nutricion','fisioterapia') AND m.idempleado = ?)");
      params.push(u.idempleado);
    }
    if (!cond.length) return res.json([]);
    res.json(await metasCompletas(`${base} AND (${cond.join(" OR ")})`, params));
  } catch (e) {
    next(e);
  }
});

// GET /api/metas/personal?tipo=entrenador|nutricion|fisioterapia -> para elegir a quién va la meta
router.get("/personal", requierePermiso("goals", "ver"), async (req, res, next) => {
  try {
    const cargo = CARGO_DE[req.query.tipo] || "entrenador";
    const filas = await consultar(
      "SELECT idempleado, CONCAT_WS(' ', nombres, apellidos) AS nombre FROM empleados WHERE activo = 1 AND cargo = ? ORDER BY nombres",
      [cargo],
    );
    res.json(filas.map((f) => ({ id: String(f.idempleado), name: f.nombre })));
  } catch (e) {
    next(e);
  }
});

function datosMeta(d) {
  const tipo = ["entrenador", "nutricion", "fisioterapia"].includes(d.type) ? d.type : "recepcion";
  const deLogros = tipo !== "recepcion";
  let [ini, fin] = d.month ? mesARango(d.month) || [] : [fechaOk(d.start), fechaOk(d.end)];
  if (!ini || !fin || fin < ini) throw new ErrorHttp(400, "Indica el mes o las fechas de la meta");
  const categoria = tipo === "recepcion" ? "ingresos" : tipo === "nutricion" ? "composicion" : tipo === "fisioterapia" ? "lesion" : ["composicion", "lesion", "general"].includes(d.category) ? d.category : "general";
  const monto = tipo === "recepcion" ? r2(d.amount) : null;
  const logros = deLogros ? Math.round(Number(d.achievements)) : null;
  if (tipo === "recepcion" && !(monto > 0)) throw new ErrorHttp(400, "Indica el monto de la meta");
  if (deLogros && !(logros > 0)) throw new ErrorHttp(400, tipo === "entrenador" ? "Indica cuántos logros (mancuernas) debe conseguir" : "Indica cuántos objetivos de alumnos debe lograr");
  const idturno = tipo === "recepcion" ? Number(d.receptionShiftId) || null : null;
  const idemp = deLogros ? Number(d.staffId) || null : null;
  if (tipo === "recepcion" && !idturno) throw new ErrorHttp(400, "Elige el turno de recepción");
  if (deLogros && !idemp) throw new ErrorHttp(400, tipo === "entrenador" ? "Elige el entrenador" : tipo === "nutricion" ? "Elige el nutricionista" : "Elige el fisioterapeuta");
  return { tipo, categoria, ini, fin, monto, logros, idturno, idemp, bono: Math.max(0, r2(d.bonus)), notas: txt(d.notes, 300) };
}

async function validarCruce(m, excluir = 0) {
  const [f] = await consultar(
    `SELECT idmeta FROM metas
      WHERE tipo = ? AND categoria = ? AND idmeta <> ?
        AND ((? IS NOT NULL AND idturno_recepcion = ?) OR (? IS NOT NULL AND idempleado = ?))
        AND fecha_inicio <= ? AND fecha_fin >= ? LIMIT 1`,
    [m.tipo, m.categoria, excluir, m.idturno, m.idturno, m.idemp, m.idemp, m.fin, m.ini],
  );
  if (f) throw new ErrorHttp(409, "Ya hay una meta igual que se cruza con esas fechas. Edítala en lugar de crear otra.");
}

async function validarEspecialista(m) {
  if (!ESPECIALIDADES.includes(m.tipo)) return;
  if (!(await hay27()).metasEspecialistas) throw new ErrorHttp(503, FALTA_27);
  const [e] = await consultar("SELECT cargo FROM empleados WHERE idempleado = ? AND activo = 1", [m.idemp]);
  if (!e || e.cargo !== CARGO_DE[m.tipo]) throw new ErrorHttp(400, `Esa persona no es ${CARGO_DE[m.tipo]}`);
}

router.post("/metas", soloAdmin, async (req, res, next) => {
  try {
    const m = datosMeta(req.body || {});
    await validarEspecialista(m);
    await validarCruce(m);
    const r = await consultar(
      `INSERT INTO metas (tipo, idturno_recepcion, idempleado, categoria, fecha_inicio, fecha_fin, monto_meta, logros_meta, bono, notas, creado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [m.tipo, m.idturno, m.idemp, m.categoria, m.ini, m.fin, m.monto, m.logros, m.bono, m.notas, req.usuario.idusuario],
    );
    res.status(201).json((await metasCompletas("m.idmeta = ?", [r.insertId]))[0]);
  } catch (e) {
    next(e);
  }
});

router.put("/metas/:id(\\d+)", soloAdmin, async (req, res, next) => {
  try {
    const m = datosMeta(req.body || {});
    await validarEspecialista(m);
    await validarCruce(m, Number(req.params.id));
    await consultar(
      `UPDATE metas SET tipo = ?, idturno_recepcion = ?, idempleado = ?, categoria = ?, fecha_inicio = ?, fecha_fin = ?,
              monto_meta = ?, logros_meta = ?, bono = ?, notas = ? WHERE idmeta = ?`,
      [m.tipo, m.idturno, m.idemp, m.categoria, m.ini, m.fin, m.monto, m.logros, m.bono, m.notas, req.params.id],
    );
    res.json((await metasCompletas("m.idmeta = ?", [req.params.id]))[0]);
  } catch (e) {
    next(e);
  }
});

router.delete("/metas/:id(\\d+)", soloAdmin, async (req, res, next) => {
  try {
    const [b] = await consultar("SELECT 1 FROM bonos WHERE idmeta = ? AND estado <> 'anulado' LIMIT 1", [req.params.id]);
    if (b) throw new ErrorHttp(400, "Esta meta ya tiene un bono aprobado; anula el bono primero");
    await consultar("DELETE FROM metas WHERE idmeta = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// OBJETIVOS DE ALUMNOS
// ---------------------------------------------------------------------
const TIPOS_OBJ = ["bajar_peso", "ganar_masa", "reducir_grasa", "mejorar_lesion", "reducir_dolor", "movilidad", "otro"];

function aObjetivo(f) {
  return {
    id: String(f.idobjetivo),
    memberId: String(f.idalumno),
    memberName: f.alumno,
    memberDni: f.dni,
    trainerId: f.identrenador ? String(f.identrenador) : null,
    trainerName: f.entrenador || "",
    area: f.area,
    type: f.tipo,
    description: f.descripcion,
    initialValue: f.valor_inicial != null ? Number(f.valor_inicial) : null,
    targetValue: f.valor_meta != null ? Number(f.valor_meta) : null,
    finalValue: f.valor_final != null ? Number(f.valor_final) : null,
    unit: f.unidad || "",
    start: String(f.fecha_inicio).slice(0, 10),
    controlDate: String(f.fecha_control).slice(0, 10),
    status: f.estado,
    achievementGranted: !!f.logro_otorgado,
    evaluatedBy: f.evaluador || "",
    evaluatedAt: f.fecha_evaluacion || null,
    observation: f.observacion || "",
    createdBy: f.creador || "",
    specialistId: f.idespecialista ? String(f.idespecialista) : null,
    specialistName: f.especialista || "",
    controls: Number(f.n_controles || 0),
    lastControl: f.ult_valor != null ? { date: String(f.ult_fecha).slice(0, 10), value: Number(f.ult_valor), note: f.ult_obs || "", by: f.ult_por || "" } : null,
    progressPct: avanceObjetivo(f),
  };
}

/** Cuánto avanzó hacia la meta (0-100), con el último control o el valor final */
function avanceObjetivo(f) {
  const ini = f.valor_inicial != null ? Number(f.valor_inicial) : null;
  const meta = f.valor_meta != null ? Number(f.valor_meta) : null;
  const actual = f.valor_final != null ? Number(f.valor_final) : f.ult_valor != null ? Number(f.ult_valor) : null;
  if (ini === null || meta === null || actual === null || ini === meta) return f.estado === "conseguida" ? 100 : null;
  return Math.max(0, Math.min(100, Math.round(((actual - ini) / (meta - ini)) * 100)));
}

const SQL_OBJ_BASE = `
  SELECT o.*, a.dni, CONCAT(a.nombres, ' ', a.apellidos) AS alumno,
         CONCAT_WS(' ', e.nombres, e.apellidos) AS entrenador,
         CONCAT_WS(' ', ev.nombres, ev.apellidos) AS evaluador, u.usuario AS creador`;
const SQL_OBJ_FROM = `
    FROM objetivos_alumno o
    JOIN alumnos a ON a.idalumno = o.idalumno
    LEFT JOIN empleados e  ON e.idempleado  = o.identrenador
    LEFT JOIN empleados ev ON ev.idempleado = o.evaluado_por
    LEFT JOIN usuarios u   ON u.idusuario   = o.creado_por`;
const SQL_OBJ = SQL_OBJ_BASE + SQL_OBJ_FROM;
/** SELECT de objetivos con especialista y último control (si ya está el script 27) */
async function sqlObj() {
  const c = await hay27();
  if (!c.especialista) return SQL_OBJ;
  return `${SQL_OBJ_BASE},
         CONCAT_WS(' ', es.nombres, es.apellidos) AS especialista
         ${c.controles
           ? `, (SELECT COUNT(*) FROM objetivo_controles k WHERE k.idobjetivo = o.idobjetivo) AS n_controles,
              uc.fecha AS ult_fecha, uc.valor AS ult_valor, uc.observacion AS ult_obs, CONCAT_WS(' ', ek.nombres, ek.apellidos) AS ult_por`
           : ""}
    ${SQL_OBJ_FROM}
    LEFT JOIN empleados es ON es.idempleado = o.idespecialista
    ${c.controles
      ? `LEFT JOIN objetivo_controles uc ON uc.idcontrol = (SELECT k2.idcontrol FROM objetivo_controles k2 WHERE k2.idobjetivo = o.idobjetivo ORDER BY k2.fecha DESC, k2.idcontrol DESC LIMIT 1)
         LEFT JOIN empleados ek ON ek.idempleado = uc.idempleado`
      : ""}`;
}

/** Área que el usuario puede gestionar (admin: cualquiera) */
async function areaPermitida(req) {
  if (await esAdmin(req)) return null; // todas
  const u = await yo(req);
  if (u.rol === "nutritionist") return "nutricion";
  if (u.rol === "physio") return "fisioterapia";
  return "ninguna";
}

router.get("/objetivos", requierePermiso("goals", "ver"), async (req, res, next) => {
  try {
    const u = await yo(req);
    const cond = ["1 = 1"];
    const params = [];
    if (!(await esAdmin(req)) && u.rol === "trainer") {
      cond.push("(o.identrenador = ? OR (o.identrenador IS NULL AND a.identrenador = ?))");
      params.push(u.idempleado || 0, u.idempleado || 0);
    } else if (!(await esAdmin(req)) && !["nutritionist", "physio"].includes(u.rol)) {
      return res.json([]);
    }
    if (/^\d+$/.test(req.query.alumno || "")) {
      cond.push("o.idalumno = ?");
      params.push(Number(req.query.alumno));
    }
    res.json((await consultar(`${await sqlObj()} WHERE ${cond.join(" AND ")} ORDER BY o.estado = 'en_proceso' DESC, o.fecha_control, o.idobjetivo DESC LIMIT 2000`, params)).map(aObjetivo));
  } catch (e) {
    next(e);
  }
});

router.post("/objetivos", requierePermiso("goals", "crear"), async (req, res, next) => {
  try {
    const d = req.body || {};
    const permitida = await areaPermitida(req);
    if (permitida === "ninguna") throw new ErrorHttp(403, "Solo nutrición, fisioterapia o administración registran objetivos");
    const area = permitida || (d.area === "fisioterapia" ? "fisioterapia" : "nutricion");
    const [a] = await consultar("SELECT idalumno, identrenador FROM alumnos WHERE idalumno = ? AND activo = 1", [d.memberId]);
    if (!a) throw new ErrorHttp(400, "Elige un alumno");
    if (!TIPOS_OBJ.includes(d.type)) throw new ErrorHttp(400, "Elige el tipo de objetivo");
    const descripcion = txt(d.description, 255);
    if (!descripcion) throw new ErrorHttp(400, "Describe el objetivo (ej. bajar de 90 a 85 kg)");
    const control = fechaOk(d.controlDate);
    if (!control) throw new ErrorHttp(400, "Indica la fecha del próximo control");
    const u = await yo(req);
    const r = await consultar(
      `INSERT INTO objetivos_alumno (idalumno, identrenador, area, tipo, descripcion, valor_inicial, valor_meta, unidad,
                                     fecha_inicio, fecha_control, creado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        a.idalumno,
        Number(d.trainerId) || a.identrenador || null,
        area,
        d.type,
        descripcion,
        d.initialValue === "" || d.initialValue == null ? null : r2(d.initialValue),
        d.targetValue === "" || d.targetValue == null ? null : r2(d.targetValue),
        txt(d.unit, 20),
        fechaOk(d.start) || hoy(),
        control,
        req.usuario.idusuario,
      ],
    );
    if ((await hay27()).especialista) {
      // El especialista es quien lo registra; si lo registra administración, el que elija (o ninguno)
      const esp = permitida ? u.idempleado || null : Number(d.specialistId) || null;
      if (esp) await consultar("UPDATE objetivos_alumno SET idespecialista = ? WHERE idobjetivo = ?", [esp, r.insertId]);
    }
    const [f] = await consultar(`${await sqlObj()} WHERE o.idobjetivo = ?`, [r.insertId]);
    res.status(201).json(aObjetivo(f));
  } catch (e) {
    next(e);
  }
});

// POST /objetivos/:id/evaluar { status: conseguida|no_conseguida, finalValue, observation, grant }
router.post("/objetivos/:id(\\d+)/evaluar", requierePermiso("goals", "editar"), async (req, res, next) => {
  try {
    const d = req.body || {};
    const [o] = await consultar("SELECT * FROM objetivos_alumno WHERE idobjetivo = ?", [req.params.id]);
    if (!o) throw new ErrorHttp(404, "Objetivo no encontrado");
    const permitida = await areaPermitida(req);
    if (permitida === "ninguna" || (permitida && permitida !== o.area)) {
      throw new ErrorHttp(403, `Este objetivo lo evalúa ${o.area === "nutricion" ? "nutrición" : "fisioterapia"}`);
    }
    if (o.estado !== "en_proceso") throw new ErrorHttp(400, "Este objetivo ya fue evaluado");
    const estado = d.status === "conseguida" ? "conseguida" : d.status === "no_conseguida" ? "no_conseguida" : null;
    if (!estado) throw new ErrorHttp(400, "Indica si la meta se consiguió o no");
    const obs = txt(d.observation, 300);
    if (!obs) throw new ErrorHttp(400, "Escribe una observación del control");
    const u = await yo(req);
    const otorga = estado === "conseguida" && d.grant !== false && !!(Number(d.trainerId) || o.identrenador);
    await consultar(
      `UPDATE objetivos_alumno SET estado = ?, valor_final = ?, observacion = ?, logro_otorgado = ?, identrenador = COALESCE(?, identrenador),
              evaluado_por = ?, fecha_evaluacion = NOW() WHERE idobjetivo = ?`,
      [
        estado,
        d.finalValue === "" || d.finalValue == null ? null : r2(d.finalValue),
        obs,
        otorga ? 1 : 0,
        Number(d.trainerId) || null,
        u.idempleado || null,
        o.idobjetivo,
      ],
    );
    const [f] = await consultar(`${await sqlObj()} WHERE o.idobjetivo = ?`, [o.idobjetivo]);
    res.json(aObjetivo(f));
  } catch (e) {
    next(e);
  }
});

// POST /objetivos/:id/control { value, observation, date } -> nuevo control (el objetivo sigue en proceso)
router.post("/objetivos/:id(\\d+)/control", requierePermiso("goals", "editar"), async (req, res, next) => {
  try {
    if (!(await hay27()).controles) throw new ErrorHttp(503, FALTA_27);
    const d = req.body || {};
    const [o] = await consultar("SELECT * FROM objetivos_alumno WHERE idobjetivo = ?", [req.params.id]);
    if (!o) throw new ErrorHttp(404, "Objetivo no encontrado");
    const permitida = await areaPermitida(req);
    if (permitida === "ninguna" || (permitida && permitida !== o.area)) {
      throw new ErrorHttp(403, `Este control lo registra ${o.area === "nutricion" ? "nutrición" : "fisioterapia"}`);
    }
    if (o.estado !== "en_proceso") throw new ErrorHttp(400, "Este objetivo ya fue evaluado");
    if (d.value === "" || d.value == null || Number.isNaN(Number(d.value))) throw new ErrorHttp(400, "Escribe el valor del control");
    const fecha = fechaOk(d.date) || hoy();
    if (fecha > hoy()) throw new ErrorHttp(400, "La fecha del control no puede ser futura");
    const u = await yo(req);
    await consultar("INSERT INTO objetivo_controles (idobjetivo, fecha, valor, observacion, idempleado) VALUES (?,?,?,?,?)", [
      o.idobjetivo, fecha, r2(d.value), txt(d.observation, 300), u.idempleado || null,
    ]);
    // Próximo control (opcional)
    if (fechaOk(d.nextControl)) await consultar("UPDATE objetivos_alumno SET fecha_control = ? WHERE idobjetivo = ?", [d.nextControl, o.idobjetivo]);
    const [f] = await consultar(`${await sqlObj()} WHERE o.idobjetivo = ?`, [o.idobjetivo]);
    res.json(aObjetivo(f));
  } catch (e) {
    next(e);
  }
});

// GET /objetivos/:id/controles -> historial de controles del objetivo
router.get("/objetivos/:id(\\d+)/controles", requierePermiso("goals", "ver"), async (req, res, next) => {
  try {
    if (!(await hay27()).controles) return res.json([]);
    const filas = await consultar(
      `SELECT k.*, CONCAT_WS(' ', e.nombres, e.apellidos) AS por FROM objetivo_controles k
         LEFT JOIN empleados e ON e.idempleado = k.idempleado WHERE k.idobjetivo = ? ORDER BY k.fecha, k.idcontrol`,
      [req.params.id],
    );
    res.json(filas.map((k) => ({ id: String(k.idcontrol), date: String(k.fecha).slice(0, 10), value: Number(k.valor), note: k.observacion || "", by: k.por || "" })));
  } catch (e) {
    next(e);
  }
});

router.post("/objetivos/:id(\\d+)/cancelar", requierePermiso("goals", "editar"), async (req, res, next) => {
  try {
    const [o] = await consultar("SELECT area, estado FROM objetivos_alumno WHERE idobjetivo = ?", [req.params.id]);
    if (!o) throw new ErrorHttp(404, "Objetivo no encontrado");
    const permitida = await areaPermitida(req);
    if (permitida === "ninguna" || (permitida && permitida !== o.area)) throw new ErrorHttp(403, "No puedes cancelar este objetivo");
    await consultar("UPDATE objetivos_alumno SET estado = 'cancelada', logro_otorgado = 0, observacion = ? WHERE idobjetivo = ?", [
      txt(req.body?.observation, 300) || "Cancelado",
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// LOGROS (ranking de entrenadores)
// ---------------------------------------------------------------------
router.get("/logros", requierePermiso("goals", "ver"), async (req, res, next) => {
  try {
    const [ini, fin] = mesARango(req.query.mes) || [fechaOk(req.query.desde) || "2000-01-01", fechaOk(req.query.hasta) || "2999-12-31"];
    const filas = await consultar(
      `SELECT e.idempleado, CONCAT_WS(' ', e.nombres, e.apellidos) AS nombre,
              SUM(o.area = 'nutricion') AS composicion, SUM(o.area = 'fisioterapia') AS lesion, COUNT(o.idobjetivo) AS total,
              (SELECT COUNT(*) FROM alumnos al WHERE al.identrenador = e.idempleado AND al.activo = 1) AS alumnos,
              (SELECT COUNT(*) FROM objetivos_alumno ox WHERE ox.identrenador = e.idempleado AND ox.estado = 'en_proceso') AS en_proceso
         FROM empleados e
         LEFT JOIN objetivos_alumno o ON o.identrenador = e.idempleado AND o.estado = 'conseguida' AND o.logro_otorgado = 1
              AND o.fecha_evaluacion >= ? AND o.fecha_evaluacion < ? + INTERVAL 1 DAY
        WHERE e.cargo = 'entrenador' AND e.activo = 1
        GROUP BY e.idempleado ORDER BY total DESC, nombre`,
      [ini, fin],
    );
    res.json(
      filas.map((f) => ({
        staffId: String(f.idempleado),
        name: f.nombre,
        composition: Number(f.composicion || 0),
        injury: Number(f.lesion || 0),
        total: Number(f.total || 0),
        students: Number(f.alumnos || 0),
        inProgress: Number(f.en_proceso || 0),
      })),
    );
  } catch (e) {
    next(e);
  }
});

// GET /logros/especialistas?mes= -> objetivos que lograron nutrición y fisioterapia
router.get("/logros/especialistas", requierePermiso("goals", "ver"), async (req, res, next) => {
  try {
    if (!(await hay27()).especialista) return res.json({ falta27: true, filas: [] });
    const [ini, fin] = mesARango(req.query.mes) || [fechaOk(req.query.desde) || "2000-01-01", fechaOk(req.query.hasta) || "2999-12-31"];
    const filas = await consultar(
      `SELECT e.idempleado, e.cargo, CONCAT_WS(' ', e.nombres, e.apellidos) AS nombre,
              COUNT(o.idobjetivo) AS logrados,
              (SELECT COUNT(*) FROM objetivos_alumno ox WHERE ox.idespecialista = e.idempleado AND ox.estado = 'en_proceso') AS en_proceso,
              (SELECT COUNT(*) FROM objetivos_alumno oy WHERE oy.idespecialista = e.idempleado AND oy.estado = 'no_conseguida'
                  AND oy.fecha_evaluacion >= ? AND oy.fecha_evaluacion < ? + INTERVAL 1 DAY) AS no_logrados
         FROM empleados e
         LEFT JOIN objetivos_alumno o ON o.idespecialista = e.idempleado AND o.estado = 'conseguida'
              AND o.fecha_evaluacion >= ? AND o.fecha_evaluacion < ? + INTERVAL 1 DAY
        WHERE e.cargo IN ('nutricionista','fisioterapeuta') AND e.activo = 1
        GROUP BY e.idempleado ORDER BY logrados DESC, nombre`,
      [ini, fin, ini, fin],
    );
    res.json({
      filas: filas.map((f) => ({
        staffId: String(f.idempleado),
        area: f.cargo === "nutricionista" ? "nutricion" : "fisioterapia",
        name: f.nombre,
        achieved: Number(f.logrados || 0),
        notAchieved: Number(f.no_logrados || 0),
        inProgress: Number(f.en_proceso || 0),
      })),
    });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// BONOS
// ---------------------------------------------------------------------
router.get("/bonos", requierePermiso("goals", "ver"), async (req, res, next) => {
  try {
    const admin = await esAdmin(req);
    const u = await yo(req);
    const filas = await consultar(
      `SELECT b.*, m.tipo, m.fecha_inicio, m.fecha_fin, uu.usuario AS aprobador
         FROM bonos b LEFT JOIN metas m ON m.idmeta = b.idmeta LEFT JOIN usuarios uu ON uu.idusuario = b.aprobado_por
        ${admin ? "" : "WHERE b.idempleado = ?"}
        ORDER BY b.fecha_aprobacion DESC LIMIT 500`,
      admin ? [] : [u.idempleado || 0],
    );
    res.json(
      filas.map((b) => ({
        id: String(b.idbono),
        goalId: b.idmeta ? String(b.idmeta) : null,
        staffId: b.idempleado ? String(b.idempleado) : null,
        beneficiary: b.beneficiario,
        amount: Number(b.monto),
        reason: b.motivo,
        status: b.estado,
        approvedBy: b.aprobador || "",
        approvedAt: b.fecha_aprobacion,
        paidAt: b.fecha_pago,
        method: b.metodo_pago,
        period: b.fecha_inicio ? `${String(b.fecha_inicio).slice(0, 10)} a ${String(b.fecha_fin).slice(0, 10)}` : "",
      })),
    );
  } catch (e) {
    next(e);
  }
});

// POST /bonos { goalId, staffId?, amount? }  -> aprueba el bono de una meta cumplida
router.post("/bonos", soloAdmin, async (req, res, next) => {
  try {
    const d = req.body || {};
    const [meta] = await metasCompletas("m.idmeta = ?", [d.goalId]);
    if (!meta) throw new ErrorHttp(404, "Meta no encontrada");
    if (!meta.progress.cumplida) throw new ErrorHttp(400, "La meta aún no se cumple");
    const monto = r2(d.amount ?? meta.bonus);
    if (!(monto > 0)) throw new ErrorHttp(400, "Indica el monto del bono");
    let idemp = meta.type !== "recepcion" ? Number(meta.staffId) : Number(d.staffId) || null;
    let beneficiario = meta.name;
    if (idemp) {
      const [e] = await consultar("SELECT CONCAT_WS(' ', nombres, apellidos) AS n FROM empleados WHERE idempleado = ?", [idemp]);
      if (!e) throw new ErrorHttp(400, "Trabajador no encontrado");
      beneficiario = e.n;
    }
    const [dup] = await consultar(
      "SELECT 1 FROM bonos WHERE idmeta = ? AND estado <> 'anulado' AND IFNULL(idempleado, 0) = IFNULL(?, 0) LIMIT 1",
      [meta.id, idemp],
    );
    if (dup) throw new ErrorHttp(409, "Ya se aprobó el bono de esta meta para esa persona");
    const motivo =
      meta.type === "recepcion"
        ? `Meta ${meta.name}: S/ ${meta.progress.objetivo} (${meta.start} a ${meta.end})`
        : `Meta de logros${meta.type === "nutricion" ? " (nutrición)" : meta.type === "fisioterapia" ? " (fisioterapia)" : ""}: ${meta.progress.logrado} de ${meta.progress.objetivo} (${meta.start} a ${meta.end})`;
    await consultar(
      "INSERT INTO bonos (idmeta, idempleado, beneficiario, monto, motivo, aprobado_por) VALUES (?,?,?,?,?,?)",
      [meta.id, idemp, beneficiario.slice(0, 120), monto, motivo.slice(0, 200), req.usuario.idusuario],
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /bonos/:id/pagar { method }  -> egreso en caja y bono pagado
router.post("/bonos/:id(\\d+)/pagar", soloAdmin, async (req, res, next) => {
  try {
    const metodo = ["efectivo", "tarjeta", "transferencia", "yape_plin"].includes(req.body?.method) ? req.body.method : "transferencia";
    await transaccion(async (cx) => {
      const [[b]] = await cx.query("SELECT * FROM bonos WHERE idbono = ? FOR UPDATE", [req.params.id]);
      if (!b) throw new ErrorHttp(404, "Bono no encontrado");
      if (b.estado !== "aprobado") throw new ErrorHttp(400, "Este bono no está pendiente de pago");
      await cx.query("UPDATE bonos SET estado = 'pagado', fecha_pago = NOW(), metodo_pago = ? WHERE idbono = ?", [metodo, b.idbono]);
      const [mov] = await cx.query(
        `INSERT INTO movimientos_caja (tipo, categoria, monto, descripcion, idreferencia, metodo_pago, idempleado, nombre_relacionado, idusuario_registro)
         VALUES ('egreso', 'sueldo', ?, ?, ?, ?, ?, ?, ?)`,
        [b.monto, `Bono: ${b.motivo}`.slice(0, 255), b.idbono, metodo, b.idempleado, b.beneficiario, req.usuario.idusuario],
      );
      // Solo el efectivo sale de la caja de recepción
      if (metodo !== "efectivo") await cx.query("UPDATE movimientos_caja SET idturno = NULL WHERE idmovimiento = ?", [mov.insertId]);
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/bonos/:id(\\d+)/anular", soloAdmin, async (req, res, next) => {
  try {
    const [b] = await consultar("SELECT estado FROM bonos WHERE idbono = ?", [req.params.id]);
    if (!b) throw new ErrorHttp(404, "Bono no encontrado");
    if (b.estado === "pagado") throw new ErrorHttp(400, "El bono ya fue pagado; regístralo como corrección en Finanzas");
    await consultar("UPDATE bonos SET estado = 'anulado' WHERE idbono = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// PROYECCIONES DE RECEPCIÓN
// Cada turno de recepción escribe cuánto espera vender, cuántas
// matrículas y cuántas renovaciones hará: un número por día (lunes a
// domingo) y uno para la semana. Cada lunes empieza una semana nueva y
// las anteriores quedan guardadas para comparar lo proyectado con lo real.
// ---------------------------------------------------------------------
const NOMBRE_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const diasEntre = dias;
const NOMBRE_DIA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const lunesDe = (f) => {
  const d = new Date(`${f}T12:00:00Z`);
  return sumarDias(f, 1 - (d.getUTCDay() || 7));
};
/** "Semana 2 de noviembre": la semana se cuenta por el mes de su lunes */
const etiquetaSemana = (lunes) => {
  const n = Math.floor((Number(lunes.slice(8, 10)) - 1) / 7) + 1;
  return { numero: n, mes: NOMBRE_MES[Number(lunes.slice(5, 7)) - 1], texto: `Semana ${n} de ${NOMBRE_MES[Number(lunes.slice(5, 7)) - 1]}` };
};
const entero = (v) => (v === "" || v === null || v === undefined ? null : Math.max(0, Math.round(Number(v)) || 0));
const soles = (v) => (v === "" || v === null || v === undefined ? null : Math.max(0, r2(v)));

let tablaProyecciones = false;
async function hayTablaProyecciones() {
  if (tablaProyecciones) return true;
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyecciones_recepcion'",
  );
  tablaProyecciones = Number(f?.n) > 0;
  return tablaProyecciones;
}
const SIN_TABLA_PROY = "Falta ejecutar base_datos/anteriores/25_proyecciones_recepcion.sql en MySQL Workbench (como root) para guardar las proyecciones.";

/** Turno con el que se trabaja: el del recepcionista, o el que elige administración */
async function turnoProyeccion(req, admin) {
  if (admin) {
    const pedido = Number(req.query.turno || req.body?.turno) || null;
    const turnos = await consultar("SELECT idturno_recepcion, nombre FROM turnos_recepcion WHERE activo = 1 ORDER BY hora_inicio, nombre");
    const t = turnos.find((x) => x.idturno_recepcion === pedido) || turnos[0];
    if (!t) throw new ErrorHttp(400, "Primero crea los turnos de recepción");
    return { id: t.idturno_recepcion, nombre: t.nombre, turnos };
  }
  const u = await yo(req);
  if (!u.idturno_recepcion) throw new ErrorHttp(400, "Tu usuario no tiene un turno de recepción asignado. Pídeselo a administración.");
  const [t] = await consultar("SELECT idturno_recepcion, nombre FROM turnos_recepcion WHERE idturno_recepcion = ?", [u.idturno_recepcion]);
  return { id: u.idturno_recepcion, nombre: t?.nombre || "Mi turno", turnos: [] };
}

/** Lo que de verdad hizo el turno: ventas (ingresos de caja), matrículas y renovaciones por día */
async function realPorDia(idturno, desde, hasta) {
  const st = await sqlTurnoIngreso();
  const ingresos = await consultar(
    `SELECT DATE(mc.fecha) AS dia, SUM(mc.monto) AS total
       FROM movimientos_caja mc JOIN turnos_caja tc ON tc.idturno = mc.idturno
       LEFT JOIN usuarios ua ON ua.idusuario = tc.idusuario_apertura
       ${st.joins}
      WHERE ${st.turno} = ?
        AND mc.tipo = 'ingreso' AND mc.fecha >= ? AND mc.fecha < ? + INTERVAL 1 DAY
      GROUP BY DATE(mc.fecha)`,
    [idturno, desde, hasta],
  );
  const matriculas = await consultar(
    `SELECT DATE(ma.fecha_registro) AS dia, SUM(ma.es_renovacion = 0) AS nuevas, SUM(ma.es_renovacion = 1) AS renovaciones
       FROM matriculas ma
      WHERE ma.estado <> 'anulada' AND ma.fecha_registro >= ? AND ma.fecha_registro < ? + INTERVAL 1 DAY
        AND ${st.turnoMatricula} = ?
      GROUP BY DATE(ma.fecha_registro)`,
    [desde, hasta, idturno],
  );
  const mapa = {};
  const de = (d) => (mapa[String(d).slice(0, 10)] ||= { monto: 0, matriculas: 0, renovaciones: 0 });
  ingresos.forEach((f) => (de(f.dia).monto = r2(f.total)));
  matriculas.forEach((f) => {
    de(f.dia).matriculas = Number(f.nuevas || 0);
    de(f.dia).renovaciones = Number(f.renovaciones || 0);
  });
  return mapa;
}

const sumar = (lista) =>
  lista.reduce(
    (a, x) => ({ monto: r2(a.monto + Number(x?.monto || 0)), matriculas: a.matriculas + Number(x?.matriculas || 0), renovaciones: a.renovaciones + Number(x?.renovaciones || 0) }),
    { monto: 0, matriculas: 0, renovaciones: 0 },
  );
const aProy = (f) => (f ? { monto: f.monto != null ? Number(f.monto) : null, matriculas: f.matriculas, renovaciones: f.renovaciones, notas: f.notas || "", actualizado: f.fecha_actualizacion, por: f.por || "" } : null);

async function datosProyeccion(req, admin, semanaPedida) {
  if (!(await hayTablaProyecciones())) throw new ErrorHttp(503, SIN_TABLA_PROY);
  const turno = await turnoProyeccion(req, admin);
  const h = hoy();
  const lunesHoy = lunesDe(h);
  const lunes = lunesDe(fechaOk(semanaPedida) || h);
  const domingo = sumarDias(lunes, 6);
  const desdeHist = sumarDias(lunes, -7 * 11);

  const filas = await consultar(
    `SELECT p.*, COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.nombres, e.apellidos)), ''), u.usuario) AS por
       FROM proyecciones_recepcion p
       LEFT JOIN usuarios u ON u.idusuario = p.idusuario
       LEFT JOIN empleados e ON e.idempleado = u.idempleado
      WHERE p.idturno_recepcion = ? AND p.semana_inicio BETWEEN ? AND ?`,
    [turno.id, desdeHist, lunes],
  );
  const real = await realPorDia(turno.id, desdeHist, domingo);
  const proyDe = (sem, dia) => aProy(filas.find((f) => String(f.semana_inicio).slice(0, 10) === sem && f.dia === dia));
  // Puede escribir: administración siempre; recepción, hoy y los días que vienen (y su semana mientras no termine)
  const editable = (fecha) => admin || fecha >= h;

  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(lunes, i);
    return {
      dia: i + 1,
      nombre: NOMBRE_DIA[i + 1],
      fecha,
      esHoy: fecha === h,
      pasado: fecha < h,
      editable: editable(fecha),
      proyeccion: proyDe(lunes, i + 1),
      real: fecha <= h ? real[fecha] || { monto: 0, matriculas: 0, renovaciones: 0 } : null,
    };
  });
  const realSemana = sumar(dias.map((d) => d.real));

  // Meta del mes del turno, para tener una referencia al proyectarse
  const [meta] = await consultar(
    `SELECT monto_meta, fecha_inicio, fecha_fin FROM metas
      WHERE tipo = 'recepcion' AND idturno_recepcion = ? AND fecha_inicio <= ? AND fecha_fin >= ?
      ORDER BY fecha_inicio DESC LIMIT 1`,
    [turno.id, domingo, lunes],
  );
  let metaInfo = null;
  if (meta) {
    const ini = String(meta.fecha_inicio).slice(0, 10);
    const fin = String(meta.fecha_fin).slice(0, 10);
    const total = diasEntre(ini, fin) + 1;
    const enSemana = dias.filter((d) => d.fecha >= ini && d.fecha <= fin).length;
    metaInfo = {
      monto: Number(meta.monto_meta || 0),
      desde: ini,
      hasta: fin,
      sugeridoSemana: r2((Number(meta.monto_meta || 0) * enSemana) / total),
      sugeridoDia: r2(Number(meta.monto_meta || 0) / total),
    };
  }

  // Cuadro de semanas anteriores (las últimas 12)
  const historial = [];
  for (let k = 0; k < 12; k++) {
    const ini = sumarDias(lunes, -7 * k);
    const fin = sumarDias(ini, 6);
    const semanal = proyDe(ini, 0);
    const diarias = [1, 2, 3, 4, 5, 6, 7].map((d) => proyDe(ini, d)).filter(Boolean);
    const r = sumar(Array.from({ length: 7 }, (_, i) => (sumarDias(ini, i) <= h ? real[sumarDias(ini, i)] : null)));
    if (!semanal && !diarias.length && !r.monto && !r.matriculas && !r.renovaciones) continue;
    historial.push({
      inicio: ini,
      fin,
      etiqueta: etiquetaSemana(ini).texto,
      actual: ini === lunesHoy,
      semanal,
      sumaDiaria: diarias.length ? sumar(diarias) : null,
      diasProyectados: diarias.length,
      real: r,
    });
  }

  return {
    turno: { id: String(turno.id), nombre: turno.nombre },
    turnos: turno.turnos.map((t) => ({ id: String(t.idturno_recepcion), nombre: t.nombre })),
    hoy: h,
    semana: { inicio: lunes, fin: domingo, ...etiquetaSemana(lunes), actual: lunes === lunesHoy, futura: lunes > lunesHoy },
    semanal: { proyeccion: proyDe(lunes, 0), real: realSemana, editable: admin || domingo >= h },
    sumaDiaria: sumar(dias.map((d) => d.proyeccion)),
    dias,
    meta: metaInfo,
    faltaHoy: lunes === lunesHoy && !dias.find((d) => d.esHoy)?.proyeccion,
    faltaSemana: lunes === lunesHoy && !proyDe(lunes, 0),
    historial,
    admin,
  };
}

// GET /api/metas/proyecciones?semana=AAAA-MM-DD&turno=  (turno solo para administración)
router.get("/proyecciones", requierePermiso("goals", "ver"), async (req, res, next) => {
  try {
    res.json(await datosProyeccion(req, await esAdmin(req), req.query.semana));
  } catch (e) {
    next(e);
  }
});

// PUT /api/metas/proyecciones {semana, dia (0 = semana, 1-7 = lunes a domingo), monto, matriculas, renovaciones, notas, turno?}
router.put("/proyecciones", requierePermiso("goals", "ver"), async (req, res, next) => {
  try {
    if (!(await hayTablaProyecciones())) throw new ErrorHttp(503, SIN_TABLA_PROY);
    const admin = await esAdmin(req);
    const turno = await turnoProyeccion(req, admin);
    const b = req.body || {};
    if (!fechaOk(b.semana)) throw new ErrorHttp(400, "Indica la semana");
    const lunes = lunesDe(b.semana);
    const dia = Number(b.dia);
    if (!Number.isInteger(dia) || dia < 0 || dia > 7) throw new ErrorHttp(400, "Día no válido");
    const h = hoy();
    const fecha = dia === 0 ? sumarDias(lunes, 6) : sumarDias(lunes, dia - 1);
    if (!admin && fecha < h) throw new ErrorHttp(403, dia === 0 ? "Esa semana ya terminó" : "Ese día ya pasó: solo se proyecta hoy y los días que vienen");
    if (!admin && lunes > sumarDias(lunesDe(h), 7)) throw new ErrorHttp(400, "Solo puedes proyectar esta semana y la siguiente");
    const v = { monto: soles(b.monto), matriculas: entero(b.matriculas), renovaciones: entero(b.renovaciones), notas: txt(b.notas, 200) };
    if (v.monto !== null && v.monto > 1000000) throw new ErrorHttp(400, "Revisa el monto");
    if (v.monto === null && v.matriculas === null && v.renovaciones === null && !v.notas) {
      await consultar("DELETE FROM proyecciones_recepcion WHERE idturno_recepcion = ? AND semana_inicio = ? AND dia = ?", [turno.id, lunes, dia]);
    } else {
      await consultar(
        `INSERT INTO proyecciones_recepcion (idturno_recepcion, semana_inicio, dia, monto, matriculas, renovaciones, notas, idusuario)
         VALUES (?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE monto = VALUES(monto), matriculas = VALUES(matriculas), renovaciones = VALUES(renovaciones),
                                 notas = VALUES(notas), idusuario = VALUES(idusuario)`,
        [turno.id, lunes, dia, v.monto, v.matriculas, v.renovaciones, v.notas, req.usuario.idusuario],
      );
    }
    req.query.turno = String(turno.id);
    res.json(await datosProyeccion(req, admin, lunes));
  } catch (e) {
    next(e);
  }
});

export default router;
