// =====================================================================
// TAREAS ENTRE TURNOS
// Algo que alguien del gimnasio debe hacer: llamar, cobrar, avisar una
// renovación, recibir un pase libre, armar una rutina...
//  - Se dirige a un TURNO de recepción (Mañana, Tarde y los que se agreguen
//    en Usuarios › Turnos), a un ROL completo o a una PERSONA.
//  - La primera persona que pulsa «Tomar» se queda con ella (sin duplicados
//    aunque dos pantallas lo hagan a la vez).
//  - Se puede pasar a otro turno con un comentario o reprogramar; todo queda
//    en el historial.
//  - El sistema crea tareas solas (por vencer, pase libre, alumno sin rutina,
//    seguimiento de rutina cada 3 días, fisioterapia, abandono) y las cierra
//    solas cuando pasa lo que se esperaba (renovó, se guardó su rutina,
//    volvió a entrenar...).
// =====================================================================
import { Router } from "express";
import { consultar } from "../db.js";
import { ErrorHttp } from "../seguridad.js";
import { hoyLima, sumarDias } from "../congelamiento.js";
import { codigoAlumno } from "../codigoAlumno.js";

const router = Router();

export const TIPOS = ["llamada", "whatsapp", "visita", "renovacion", "cobro", "pase_libre", "rutina", "seguimiento", "fisio", "abandono", "nutricion", "equipo", "entrega", "limpieza", "nota", "otro"];
const ROLES_PERSONAL = ["admin", "reception", "trainer", "physio", "nutritionist", "instructor"];
const DIAS_ABANDONO = 7;
const DIAS_POR_VENCER = 3;
const CADA_SEGUIMIENTO = 3;
const ABIERTA = "t.estado IN ('pendiente','en_curso')";

const txt = (v, max) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};
const fechaOk = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);
const horaOk = (v) => (/^\d{2}:\d{2}(:\d{2})?$/.test(String(v || "")) ? String(v).slice(0, 5) : null);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fBonita = (iso) => {
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
};
const FORMATO_HORA = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });
export const horaLima = () => FORMATO_HORA.format(Date.now()).slice(0, 5);
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);
/** «Turno 1 - Mañana» -> «Mañana» (se muestra «Turno Mañana · Ana») */
export const nombreCortoTurno = (n) => String(n || "").replace(/^\s*turno\s*\d*\s*[-–·:]?\s*/i, "").trim() || String(n || "");

// ---------------------------------------------------------------------
// ¿Existen las tablas? (en la PC se crean ejecutando la parte 37 como root)
// ---------------------------------------------------------------------
let hayTablas = { v: null, t: 0 };
export async function tablasListas() {
  if (hayTablas.v === true || Date.now() - hayTablas.t < 20000) return hayTablas.v;
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('tareas','tarea_historial')",
  );
  hayTablas = { v: Number(f?.n) === 2, t: Date.now() };
  return hayTablas.v;
}
const SIN_TABLAS =
  "Falta crear las tablas de tareas: ejecuta base_datos/anteriores/37_tareas_entre_turnos.sql en MySQL Workbench (como root).";

let hayWhatsapp = null;
let revisadoWa = 0;
export async function columnaWhatsappTurno() {
  if (hayWhatsapp === true || (hayWhatsapp === false && Date.now() - revisadoWa < 20000)) return hayWhatsapp;
  revisadoWa = Date.now();
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'turnos_recepcion' AND COLUMN_NAME = 'whatsapp'",
  );
  hayWhatsapp = Number(f?.n) > 0;
  return hayWhatsapp;
}

// Todas las rutas son del personal (el alumno no ve tareas)
router.use(async (req, res, next) => {
  try {
    if (!ROLES_PERSONAL.includes(req.usuario.rol)) throw new ErrorHttp(403, "Las tareas son solo para el personal del gimnasio");
    if (!(await tablasListas())) return res.status(503).json({ error: SIN_TABLAS, codigo: "SIN_TABLAS" });
    next();
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// Personas, turnos y quién soy
// ---------------------------------------------------------------------
async function personal() {
  return consultar(
    `SELECT u.idusuario, r.codigo AS rol, u.idturno_recepcion, u.idempleado,
            COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.nombres, e.apellidos)), ''), u.usuario) AS nombre
       FROM usuarios u JOIN roles r ON r.idrol = u.idrol
       LEFT JOIN empleados e ON e.idempleado = u.idempleado
      WHERE u.activo = 1 AND r.codigo <> 'student'
      ORDER BY nombre`,
  );
}
async function turnos() {
  const wa = await columnaWhatsappTurno();
  return consultar(
    `SELECT idturno_recepcion, nombre, hora_inicio, hora_fin, activo${wa ? ", whatsapp" : ""} FROM turnos_recepcion ORDER BY activo DESC, hora_inicio, nombre`,
  );
}
async function yo(req) {
  const [u] = await consultar("SELECT idusuario, idturno_recepcion FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  return { id: req.usuario.idusuario, rol: req.usuario.rol, turno: u?.idturno_recepcion || null };
}

/** Qué tareas ve cada quien: admin todas; el resto las de su turno, su rol, las suyas y las que creó */
function filtroVisible(me, alias = "t") {
  if (me.rol === "admin") return { sql: "1=1", p: [] };
  const partes = [`(${alias}.destino_tipo = 'rol' AND ${alias}.rol_codigo = ?)`, `${alias}.idusuario_destino = ?`, `${alias}.idusuario_creador = ?`, `${alias}.idusuario_tomada = ?`];
  const p = [me.rol, me.id, me.id, me.id];
  if (me.rol === "reception") {
    // recepción sin turno asignado ve todas las de turno (para no perder ninguna)
    if (me.turno) {
      partes.push(`(${alias}.destino_tipo = 'turno' AND ${alias}.idturno_recepcion = ?)`);
      p.push(me.turno);
    } else partes.push(`${alias}.destino_tipo = 'turno'`);
  }
  return { sql: `(${partes.join(" OR ")})`, p };
}

const SELECT_TAREA = `
  SELECT t.*, a.codigo AS al_codigo, a.nombres AS al_nombres, a.apellidos AS al_apellidos, a.telefono AS al_telefono,
         p.nombres AS pr_nombre, p.celular AS pr_celular
    FROM tareas t
    LEFT JOIN alumnos a ON a.idalumno = t.idalumno
    LEFT JOIN prospectos p ON p.idprospecto = t.idprospecto`;

function aTarea(f, nombres, hoy, ahora) {
  const abierta = f.estado === "pendiente" || f.estado === "en_curso";
  const fecha = String(f.fecha).slice(0, 10);
  const hora = f.hora ? String(f.hora).slice(0, 5) : "";
  const atrasada = abierta && f.tipo !== "nota" && (fecha < hoy || (fecha === hoy && hora && hora < ahora));
  const cerrada = f.cerrada_en ? String(f.cerrada_en) : null;
  const aTiempo = f.estado === "hecha" && cerrada ? cerrada.slice(0, 10) <= fecha : null;
  return {
    id: String(f.idtarea),
    tipo: f.tipo,
    prioridad: f.prioridad === "urgente" ? "urgente" : "normal",
    titulo: f.titulo,
    nota: f.nota || "",
    destino: {
      tipo: f.destino_tipo,
      turnoId: f.idturno_recepcion ? String(f.idturno_recepcion) : null,
      rol: f.rol_codigo || null,
      usuarioId: f.idusuario_destino ? String(f.idusuario_destino) : null,
      usuario: f.idusuario_destino ? nombres[f.idusuario_destino] || "" : null,
    },
    alumno: f.idalumno
      ? { id: String(f.idalumno), nombre: `${f.al_nombres || ""} ${f.al_apellidos || ""}`.trim(), codigo: codigoAlumno(f.al_codigo, f.al_nombres, f.al_apellidos), telefono: f.al_telefono || "" }
      : null,
    prospecto: f.idprospecto ? { id: String(f.idprospecto), nombre: f.pr_nombre || "", telefono: f.pr_celular || "" } : null,
    fecha,
    hora,
    estado: f.estado,
    atrasada,
    aTiempo,
    resultado: f.resultado || "",
    origen: f.origen,
    desdePortal: f.referencia === "portal",
    creador: f.idusuario_creador ? { id: String(f.idusuario_creador), nombre: nombres[f.idusuario_creador] || "" } : null,
    tomadaPor: f.idusuario_tomada ? { id: String(f.idusuario_tomada), nombre: nombres[f.idusuario_tomada] || "" } : null,
    tomadaEn: f.tomada_en || null,
    cerradaPor: f.idusuario_cierre ? { id: String(f.idusuario_cierre), nombre: nombres[f.idusuario_cierre] || "" } : null,
    cerradaEn: cerrada,
    cierreAuto: !!f.cierre_auto,
    reprogramaciones: Number(f.reprogramaciones) || 0,
    pases: Number(f.pases) || 0,
    fechaOriginal: f.fecha_original ? String(f.fecha_original).slice(0, 10) : null,
    creadaEn: f.creada_en,
  };
}

export async function historial(idtarea, accion, detalle, idusuario, cx = null) {
  const q = "INSERT INTO tarea_historial (idtarea, accion, detalle, idusuario) VALUES (?,?,?,?)";
  const p = [idtarea, accion, txt(detalle, 500), idusuario || null];
  return cx ? cx.execute(q, p) : consultar(q, p);
}

// ---------------------------------------------------------------------
// TAREAS AUTOMÁTICAS: se crean y se cierran solas (idempotente)
// ---------------------------------------------------------------------
let sucio = true;
let ultimo = 0;
let enCurso = null;
/** Cualquier guardado del sistema puede cerrar o crear tareas: se revisa en la próxima lectura */
export function marcarCambioTareas() {
  sucio = true;
}
export async function revisarTareasAutomaticas(forzar = false) {
  if (enCurso) return enCurso;
  if (!forzar && !sucio && Date.now() - ultimo < 60000) return;
  if (!(await tablasListas())) return;
  sucio = false;
  ultimo = Date.now();
  enCurso = (async () => {
    try {
      await generar();
      await cerrarSolas();
    } catch (e) {
      console.error("Tareas automáticas:", e.message);
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

async function crearAuto(t) {
  // Nunca nace atrasada: si su fecha ya pasó, se programa para hoy
  const hoy = hoyLima();
  if (t.fecha < hoy) t = { ...t, fecha: hoy, hora: null };
  const r = await consultar(
    `INSERT IGNORE INTO tareas (tipo, titulo, nota, destino_tipo, idturno_recepcion, rol_codigo, idusuario_destino, idalumno, idprospecto,
                                fecha, hora, origen, clave_auto, referencia)
     VALUES (?,?,?,?,?,?,?,?,?,?,?, 'auto', ?, ?)`,
    [t.tipo, t.titulo.slice(0, 160), t.nota ? t.nota.slice(0, 500) : null, t.destino, t.turno || null, t.rol || null, t.usuario || null, t.alumno || null, t.prospecto || null,
      t.fecha, t.hora || null, t.clave.slice(0, 80), t.ref ? String(t.ref).slice(0, 40) : null],
  );
  if (r.affectedRows) await historial(r.insertId, "creada", "La creó el sistema automáticamente", null);
  return r.affectedRows ? r.insertId : null;
}

/** El entrenador del alumno (si tiene usuario) o, si no, todo el rol de entrenadores */
function destinoEntrenador(identrenador, trainers) {
  const u = identrenador ? trainers.find((p) => String(p.idempleado) === String(identrenador)) : null;
  return u ? { destino: "usuario", usuario: u.idusuario } : { destino: "rol", rol: "trainer" };
}

async function generar() {
  const hoy = hoyLima();
  const gente = await personal();
  const trainers = gente.filter((p) => p.rol === "trainer");
  const listaTurnos = (await turnos()).filter((t) => t.activo && t.hora_inicio && t.hora_fin);
  const turnoDeHora = (h) => {
    if (!h) return null;
    const x = String(h).slice(0, 5);
    return listaTurnos.find((t) => String(t.hora_inicio).slice(0, 5) <= x && x < String(t.hora_fin).slice(0, 5)) || null;
  };
  const fechaTarea = (f) => (f && f >= sumarDias(hoy, -1) ? f : hoy);

  // Membresía vigente de cada alumno activo
  const vig = await consultar(
    `SELECT a.idalumno, a.nombres, a.apellidos, a.identrenador, u.fecha_fin, u.fecha_inicio, u.idmatricula
       FROM alumnos a
       JOIN (SELECT m.idalumno, MAX(m.fecha_fin) AS fecha_fin, MAX(m.fecha_inicio) AS fecha_inicio, MAX(m.idmatricula) AS idmatricula
               FROM matriculas m WHERE m.estado <> 'anulada' GROUP BY m.idalumno) u ON u.idalumno = a.idalumno
      WHERE a.activo = 1 AND u.fecha_fin >= ?`,
    [hoy],
  );
  const nom = (a) => `${a.nombres} ${a.apellidos}`.trim();

  // 1) Por vencer en los próximos 3 días -> recepción (si ya hay una de renovación abierta, p. ej. del portal, no se repite)
  const conRenovacion = new Set(
    (await consultar("SELECT DISTINCT idalumno FROM tareas WHERE tipo = 'renovacion' AND estado IN ('pendiente','en_curso') AND idalumno IS NOT NULL")).map((x) => String(x.idalumno)),
  );
  for (const a of vig) {
    if (conRenovacion.has(String(a.idalumno))) continue;
    const fin = String(a.fecha_fin).slice(0, 10);
    if (fin > sumarDias(hoy, DIAS_POR_VENCER)) continue;
    const d = diasEntre(hoy, fin);
    await crearAuto({
      clave: `vence:${a.idalumno}:${fin}`,
      tipo: "renovacion",
      titulo: `Avisar renovación: ${nom(a)}`,
      nota: `Su plan vence ${d === 0 ? "HOY" : d === 1 ? "mañana" : `en ${d} días`} (${fBonita(fin)}). Llámalo o escríbele para que renueve. Se cierra sola cuando se registre su renovación.`,
      destino: "rol",
      rol: "reception",
      alumno: a.idalumno,
      fecha: hoy,
      ref: fin,
    });
  }

  // 2) Pase libre de hoy y mañana -> al turno de esa hora
  const pases = await consultar(
    `SELECT pl.idpase, pl.idprospecto, pl.codigo, pl.fecha_visita, pl.hora_visita, p.nombres
       FROM pases_libres pl JOIN prospectos p ON p.idprospecto = pl.idprospecto
      WHERE pl.estado = 'pendiente' AND pl.fecha_visita BETWEEN ? AND ?`,
    [hoy, sumarDias(hoy, 1)],
  );
  for (const p of pases) {
    const t = turnoDeHora(p.hora_visita);
    const hora = p.hora_visita ? String(p.hora_visita).slice(0, 5) : "";
    await crearAuto({
      clave: `pase:${p.idpase}:${p.fecha_visita}`,
      tipo: "pase_libre",
      titulo: `Recibir pase libre: ${p.nombres}`,
      nota: `Viene ${hora ? `a las ${hora}` : "hoy"} con el pase ${p.codigo}. Atiéndelo, muéstrale el gimnasio y ofrécele un plan.`,
      destino: t ? "turno" : "rol",
      turno: t?.idturno_recepcion,
      rol: t ? null : "reception",
      prospecto: p.idprospecto,
      fecha: String(p.fecha_visita).slice(0, 10),
      hora,
      ref: `pase:${p.idpase}`,
    });
  }

  // Rutinas de cada alumno (propia o asignada): fecha del último cambio
  const rut = await consultar(
    `SELECT idalumno, MAX(DATE(fecha_actualizacion)) AS ult FROM registros_app
      WHERE modulo IN ('rutinas','asignaciones_rutina') AND idalumno IS NOT NULL GROUP BY idalumno`,
  );
  const rutinaDe = new Map(rut.map((r) => [String(r.idalumno), String(r.ult).slice(0, 10)]));

  for (const a of vig) {
    const ini = String(a.fecha_inicio).slice(0, 10);
    const ult = rutinaDe.get(String(a.idalumno));
    // 3) Alumno nuevo o que renovó hace poco y aún no tiene rutina -> su entrenador
    if (!ult && ini >= sumarDias(hoy, -14) && ini <= hoy) {
      await crearAuto({
        clave: `rutina:${a.idalumno}:${a.idmatricula}`,
        tipo: "rutina",
        titulo: `Armar rutina: ${nom(a)}`,
        nota: "Empezó su plan y todavía no tiene rutina. Se cierra sola cuando guardes su rutina.",
        ...destinoEntrenador(a.identrenador, trainers),
        alumno: a.idalumno,
        fecha: fechaTarea(ini),
      });
    }
    // 4) Seguimiento de la rutina cada 3 días (las primeras 3 semanas)
    if (ult) {
      const dias = diasEntre(ult, hoy);
      const n = Math.floor(dias / CADA_SEGUIMIENTO) * CADA_SEGUIMIENTO;
      if (n >= CADA_SEGUIMIENTO && n <= 21) {
        const toca = sumarDias(ult, n);
        const id = await crearAuto({
          clave: `seg:${a.idalumno}:${toca}`,
          tipo: "seguimiento",
          titulo: `Seguimiento de rutina: ${nom(a)}`,
          nota: `Hace ${n} días recibió o cambió su rutina. Pregúntale cómo le va, revisa sus pesos y ajusta cargas si hace falta.`,
          ...destinoEntrenador(a.identrenador, trainers),
          alumno: a.idalumno,
          fecha: toca,
          ref: ult,
        });
        if (id) {
          // el seguimiento anterior que no se hizo queda reemplazado por este
          const viejas = await consultar(
            `SELECT idtarea FROM tareas t WHERE ${ABIERTA} AND t.tipo = 'seguimiento' AND t.origen = 'auto' AND t.idalumno = ? AND t.idtarea <> ?`,
            [a.idalumno, id],
          );
          for (const v of viejas) {
            await consultar("UPDATE tareas SET estado = 'cancelada', resultado = ?, cerrada_en = NOW(), cierre_auto = 1 WHERE idtarea = ?", [
              "No se hizo: llegó el siguiente seguimiento",
              v.idtarea,
            ]);
            await historial(v.idtarea, "cancelada", "Reemplazada por el siguiente seguimiento", null);
          }
        }
      }
    }
  }

  // 5) Fisioterapia marcó recaída / empeoramiento / derivación -> su entrenador
  const fis = await consultar(
    `SELECT r.idregistro, r.idalumno, r.datos, a.nombres, a.apellidos, a.identrenador
       FROM registros_app r JOIN alumnos a ON a.idalumno = r.idalumno
      WHERE r.modulo = 'fisioterapia' AND r.fecha_actualizacion >= ?`,
    [sumarDias(hoy, -20)],
  );
  const ultFis = new Map();
  for (const f of fis) {
    let d;
    try {
      d = typeof f.datos === "string" ? JSON.parse(f.datos) : f.datos;
    } catch {
      continue;
    }
    const k = String(f.idalumno);
    const clave = `${d.date || ""}${d.time || ""}`;
    if (!ultFis.has(k) || clave > ultFis.get(k).clave) ultFis.set(k, { clave, d, f });
  }
  const MALOS = { recaida: "Recaída", empeoramiento: "Empeoramiento", derivacion: "Derivado a médico" };
  for (const { d, f } of ultFis.values()) {
    const fecha = String(d.date || "").slice(0, 10);
    if (!MALOS[d.improvementStatus] || !fecha || fecha < sumarDias(hoy, -14)) continue;
    await crearAuto({
      clave: `fisio:${f.idregistro}:${d.improvementStatus}`,
      tipo: "fisio",
      titulo: `Fisioterapia: ${nom(f)} · ${MALOS[d.improvementStatus]}`,
      nota: "Revisa sus indicaciones de fisioterapia y ajusta la carga de su rutina antes de su próximo entrenamiento.",
      ...destinoEntrenador(f.identrenador, trainers),
      alumno: f.idalumno,
      fecha: fechaTarea(fecha),
      ref: fecha,
    });
  }

  // 6) Abandono: no viene hace 7 días o más (con plan vigente) -> recepción
  const asis = await consultar(
    "SELECT idalumno, MAX(fecha) AS ult FROM asistencias_alumno WHERE tipo = 'entrada' GROUP BY idalumno",
  );
  const ultAsis = new Map(asis.map((x) => [String(x.idalumno), String(x.ult).slice(0, 10)]));
  // No cuentan los congelados ni los que avisaron que faltarán (viaje, salud...) hasta esa fecha
  const excusados = new Set(
    (
      await consultar(
        `SELECT idalumno FROM congelamientos WHERE estado = 'vigente' AND ? BETWEEN fecha_inicio AND fecha_fin
         UNION SELECT idalumno FROM seguimiento_asistencia WHERE fecha_hasta >= ?`,
        [hoy, hoy],
      )
    ).map((x) => String(x.idalumno)),
  );
  for (const a of vig) {
    if (excusados.has(String(a.idalumno))) continue;
    const ini = String(a.fecha_inicio).slice(0, 10);
    const ult = ultAsis.get(String(a.idalumno));
    const base = ult && ult >= ini ? ult : ini <= hoy ? ini : null;
    if (!base) continue;
    const dias = diasEntre(base, hoy);
    if (dias < DIAS_ABANDONO) continue;
    await crearAuto({
      clave: `abandono:${a.idalumno}:${base}`,
      tipo: "abandono",
      titulo: `No viene hace ${dias} días: ${nom(a)}`,
      nota: `${ult ? `Su última visita fue el ${fBonita(ult)}` : "No ha venido desde que empezó su plan"}. Llámalo o escríbele para saber cómo está y motivarlo a volver. Se cierra sola cuando vuelva a entrenar.`,
      destino: "rol",
      rol: "reception",
      alumno: a.idalumno,
      fecha: hoy,
      ref: base,
    });
  }
}

/** Cierra solas las tareas cuando pasó lo que se esperaba */
async function cerrarSolas() {
  const cerrar = async (sql, params, resultado, estado = "hecha") => {
    const filas = await consultar(sql, params);
    for (const f of filas) {
      const r = await consultar(
        `UPDATE tareas SET estado = ?, resultado = ?, cerrada_en = NOW(), cierre_auto = 1, idusuario_cierre = COALESCE(?, idusuario_tomada)
          WHERE idtarea = ? AND estado IN ('pendiente','en_curso')`,
        [estado, typeof resultado === "function" ? resultado(f) : resultado, f.quien || null, f.idtarea],
      );
      if (r.affectedRows) await historial(f.idtarea, estado === "hecha" ? "cerrada_auto" : "cancelada", typeof resultado === "function" ? resultado(f) : resultado, f.quien || null);
    }
  };
  // Renovación (automática o manual con alumno): se registró una matrícula después de crearla
  await cerrar(
    `SELECT t.idtarea, (SELECT m.idusuario_registro FROM matriculas m WHERE m.idalumno = t.idalumno AND m.estado <> 'anulada'
                          AND m.fecha_registro >= t.creada_en ORDER BY m.idmatricula DESC LIMIT 1) AS quien
       FROM tareas t
      WHERE ${ABIERTA} AND t.tipo IN ('renovacion','cobro') AND t.idalumno IS NOT NULL
        AND EXISTS (SELECT 1 FROM matriculas m WHERE m.idalumno = t.idalumno AND m.estado <> 'anulada' AND m.fecha_registro >= t.creada_en)`,
    [],
    "✅ Renovó: se cerró sola al registrar su renovación",
  );
  // Rutina: se guardó la rutina del alumno después de crear la tarea
  await cerrar(
    `SELECT t.idtarea, (SELECT r.actualizado_por FROM registros_app r WHERE r.idalumno = t.idalumno AND r.modulo IN ('rutinas','asignaciones_rutina')
                          ORDER BY r.fecha_actualizacion DESC LIMIT 1) AS quien
       FROM tareas t
      WHERE ${ABIERTA} AND t.tipo = 'rutina' AND t.idalumno IS NOT NULL
        AND EXISTS (SELECT 1 FROM registros_app r WHERE r.idalumno = t.idalumno AND r.modulo IN ('rutinas','asignaciones_rutina')
                     AND (t.origen = 'auto' OR r.fecha_actualizacion >= t.creada_en))`,
    [],
    "✅ Rutina guardada: se cerró sola",
  );
  // Abandono: volvió a entrenar, o recepción registró el seguimiento de asistencia
  await cerrar(
    `SELECT t.idtarea, NULL AS quien FROM tareas t
      WHERE ${ABIERTA} AND t.tipo = 'abandono' AND t.idalumno IS NOT NULL
        AND EXISTS (SELECT 1 FROM asistencias_alumno x WHERE x.idalumno = t.idalumno AND x.tipo = 'entrada'
                     AND x.fecha > COALESCE(t.referencia, DATE(t.creada_en)))`,
    [],
    "🎉 Volvió a entrenar: se cerró sola",
  );
  await cerrar(
    `SELECT t.idtarea, s.idusuario_registro AS quien, s.motivo, s.medio FROM tareas t
       JOIN seguimiento_asistencia s ON s.idseguimiento = (SELECT MAX(s2.idseguimiento) FROM seguimiento_asistencia s2
                                                            WHERE s2.idalumno = t.idalumno AND s2.fecha_registro >= t.creada_en)
      WHERE ${ABIERTA} AND t.tipo = 'abandono' AND t.idalumno IS NOT NULL`,
    [],
    (f) => `✅ Se registró su seguimiento de asistencia (${f.motivo || "motivo"}${f.medio && f.medio !== "ninguno" ? ` · por ${f.medio}` : ""})`,
  );
  // Pase libre: ya vino, no vino o se reprogramó
  await cerrar(
    `SELECT t.idtarea, pl.idusuario_cierre AS quien, pl.estado AS est FROM tareas t
       JOIN pases_libres pl ON CONCAT('pase:', pl.idpase) = t.referencia
      WHERE ${ABIERTA} AND t.tipo = 'pase_libre' AND t.origen = 'auto' AND pl.estado <> 'pendiente'`,
    [],
    (f) => (f.est === "usado" ? "✅ Vino con su pase libre" : "🚶 No vino: quedó registrado en Interesados"),
  );
  await cerrar(
    `SELECT t.idtarea, NULL AS quien FROM tareas t
       JOIN pases_libres pl ON CONCAT('pase:', pl.idpase) = t.referencia
      WHERE ${ABIERTA} AND t.tipo = 'pase_libre' AND t.origen = 'auto' AND pl.estado = 'pendiente' AND pl.fecha_visita <> t.fecha`,
    [],
    "El pase libre se reprogramó para otro día",
    "cancelada",
  );
}

// ---------------------------------------------------------------------
// LECTURAS
// ---------------------------------------------------------------------
async function contexto(req) {
  const [me, gente, ts] = await Promise.all([yo(req), personal(), turnos()]);
  const nombres = Object.fromEntries(gente.map((p) => [p.idusuario, p.nombre]));
  const lista = ts.map((t) => ({
    id: String(t.idturno_recepcion),
    nombre: t.nombre,
    corto: nombreCortoTurno(t.nombre),
    inicio: t.hora_inicio ? String(t.hora_inicio).slice(0, 5) : "",
    fin: t.hora_fin ? String(t.hora_fin).slice(0, 5) : "",
    activo: !!t.activo,
    whatsapp: t.whatsapp || "",
    personas: gente.filter((p) => p.idturno_recepcion === t.idturno_recepcion).map((p) => ({ id: String(p.idusuario), nombre: p.nombre })),
  }));
  const ahora = horaLima();
  const actual = lista.find((t) => t.activo && t.inicio && t.fin && t.inicio <= ahora && ahora < t.fin) || null;
  return {
    me,
    nombres,
    gente,
    respuesta: {
      hoy: hoyLima(),
      hora: ahora,
      yo: { id: String(me.id), rol: me.rol, turnoId: me.turno ? String(me.turno) : null, nombre: nombres[me.id] || "" },
      turnoActualId: actual?.id || null,
      turnos: lista,
      personas: gente.map((p) => ({ id: String(p.idusuario), nombre: p.nombre, rol: p.rol, turnoId: p.idturno_recepcion ? String(p.idturno_recepcion) : null })),
    },
  };
}

// GET /api/tareas?desde=&hasta=  -> tareas visibles en el rango (+ atrasadas abiertas)
router.get("/", async (req, res, next) => {
  try {
    await revisarTareasAutomaticas();
    const { me, nombres, respuesta } = await contexto(req);
    const hoy = respuesta.hoy;
    const desde = fechaOk(req.query.desde) || sumarDias(hoy, -31);
    const hasta = fechaOk(req.query.hasta) || sumarDias(hoy, 31);
    const v = filtroVisible(me);
    const filas = await consultar(
      `${SELECT_TAREA}
        WHERE ${v.sql} AND ((t.fecha BETWEEN ? AND ?) OR (${ABIERTA} AND t.fecha < ?))
        ORDER BY t.fecha, t.hora IS NULL, t.hora, t.idtarea`,
      [...v.p, desde, hasta, hoy],
    );
    res.json({ ...respuesta, desde, hasta, tareas: filas.map((f) => aTarea(f, nombres, hoy, respuesta.hora)) });
  } catch (e) {
    next(e);
  }
});

// GET /api/tareas/hoy -> lo mío de hoy y lo atrasado (para «Tus tareas de hoy» al entrar)
router.get("/hoy", async (req, res, next) => {
  try {
    await revisarTareasAutomaticas();
    const { me, nombres, respuesta } = await contexto(req);
    const v = filtroVisible(me);
    const filas = await consultar(
      `${SELECT_TAREA} WHERE ${v.sql} AND ${ABIERTA} AND t.fecha <= ? ORDER BY t.fecha, t.hora IS NULL, t.hora, t.idtarea LIMIT 200`,
      [...v.p, respuesta.hoy],
    );
    res.json({ ...respuesta, tareas: filas.map((f) => aTarea(f, nombres, respuesta.hoy, respuesta.hora)) });
  } catch (e) {
    next(e);
  }
});

// GET /api/tareas/buscar?q=  -> alumnos e interesados para vincular la tarea
router.get("/buscar", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json([]);
    const like = `%${q}%`;
    const [al, pr] = await Promise.all([
      consultar(
        `SELECT idalumno, codigo, nombres, apellidos, telefono, dni FROM alumnos
          WHERE activo = 1 AND (CONCAT(nombres,' ',apellidos) LIKE ? OR dni LIKE ? OR codigo = ?) ORDER BY nombres LIMIT 8`,
        [like, like, Number(q.replace(/\D/g, "")) || -1],
      ),
      consultar(
        `SELECT idprospecto, nombres, celular FROM prospectos
          WHERE estado NOT IN ('matriculado','de_baja') AND (nombres LIKE ? OR celular LIKE ? OR dni LIKE ?) ORDER BY fecha_registro DESC LIMIT 6`,
        [like, like, like],
      ),
    ]);
    res.json([
      ...al.map((a) => ({ tipo: "alumno", id: String(a.idalumno), nombre: `${a.nombres} ${a.apellidos}`, detalle: `${codigoAlumno(a.codigo, a.nombres, a.apellidos)} · DNI ${a.dni}`, telefono: a.telefono || "" })),
      ...pr.map((p) => ({ tipo: "prospecto", id: String(p.idprospecto), nombre: p.nombres, detalle: `Interesado${p.celular ? ` · ${p.celular}` : ""}`, telefono: p.celular || "" })),
    ]);
  } catch (e) {
    next(e);
  }
});

// GET /api/tareas/reporte?desde=&hasta=  -> cumplimiento por turno, por persona y por tipo
router.get("/reporte", async (req, res, next) => {
  try {
    await revisarTareasAutomaticas();
    const { me, nombres, gente, respuesta } = await contexto(req);
    const hoy = respuesta.hoy;
    const desde = fechaOk(req.query.desde) || sumarDias(hoy, -30);
    const hasta = fechaOk(req.query.hasta) || hoy;
    const v = filtroVisible(me);
    const filas = await consultar(`${SELECT_TAREA} WHERE ${v.sql} AND t.fecha BETWEEN ? AND ?`, [...v.p, desde, hasta]);
    const tareas = filas.map((f) => ({ ...aTarea(f, nombres, hoy, respuesta.hora), _f: f }));
    const ids = tareas.map((t) => Number(t.id));
    const hist = ids.length
      ? await consultar(`SELECT idtarea, accion, idusuario FROM tarea_historial WHERE idtarea IN (${ids.map(() => "?").join(",")})`, ids)
      : [];
    const vacio = () => ({ total: 0, hechas: 0, aTiempo: 0, tarde: 0, pendientes: 0, atrasadas: 0, reprogramadas: 0, pasadas: 0, anuladas: 0, auto: 0 });
    const sumar = (o, t) => {
      o.total += 1;
      if (t.estado === "hecha") {
        o.hechas += 1;
        if (t.aTiempo) o.aTiempo += 1;
        else o.tarde += 1;
      } else if (t.estado === "cancelada") o.anuladas += 1;
      else if (t.atrasada) o.atrasadas += 1;
      else o.pendientes += 1;
      if (t.reprogramaciones) o.reprogramadas += 1;
      if (t.pases) o.pasadas += 1;
      if (t.cierreAuto) o.auto += 1;
    };
    // Cumplimiento: de lo que ya tocaba hacer (hechas + atrasadas), cuánto se hizo
    const porcentaje = (o) => ({ ...o, cumplimiento: o.hechas + o.atrasadas > 0 ? Math.round((o.hechas / (o.hechas + o.atrasadas)) * 100) : null });
    const general = vacio();
    const porTurno = {};
    const porRol = {};
    const porTipo = {};
    for (const t of tareas) {
      sumar(general, t);
      if (t.destino.tipo === "turno" && t.destino.turnoId) sumar((porTurno[t.destino.turnoId] ||= vacio()), t);
      const rol = t.destino.tipo === "rol" ? t.destino.rol : t.destino.tipo === "usuario" ? gente.find((p) => String(p.idusuario) === t.destino.usuarioId)?.rol : "reception";
      if (rol) sumar((porRol[rol] ||= vacio()), t);
      sumar((porTipo[t.tipo] ||= vacio()), t);
    }
    // Por persona: lo que tomó o cerró (a tiempo / tarde), lo que pasó y reprogramó
    const porPersona = {};
    const persona = (id) => (porPersona[id] ||= { tomadas: 0, hechas: 0, aTiempo: 0, tarde: 0, pendientes: 0, atrasadas: 0, pasadas: 0, reprogramadas: 0, creadas: 0 });
    for (const t of tareas) {
      const f = t._f;
      if (f.idusuario_creador) persona(f.idusuario_creador).creadas += 1;
      if (f.idusuario_tomada) {
        const p = persona(f.idusuario_tomada);
        p.tomadas += 1;
        if (t.estado !== "hecha" && t.estado !== "cancelada") (t.atrasada ? p.atrasadas++ : p.pendientes++);
      }
      if (t.estado === "hecha" && f.idusuario_cierre && !f.cierre_auto) {
        const p = persona(f.idusuario_cierre);
        p.hechas += 1;
        if (t.aTiempo) p.aTiempo += 1;
        else p.tarde += 1;
      }
      if (t.estado === "hecha" && f.cierre_auto && f.idusuario_cierre) persona(f.idusuario_cierre).hechas += 1;
    }
    for (const h of hist) {
      if (!h.idusuario) continue;
      if (h.accion === "pasada") persona(h.idusuario).pasadas += 1;
      if (h.accion === "reprogramada") persona(h.idusuario).reprogramadas += 1;
    }
    // Anuncio de renovación del portal: cuántos lo pidieron y cuántos renovaron
    const delPortal = tareas.filter((t) => t._f.referencia === "portal");
    const anuncio = {
      solicitudes: delPortal.length,
      renovaron: delPortal.filter((t) => t.estado === "hecha" && t.cierreAuto).length,
      pendientes: delPortal.filter((t) => t.estado === "pendiente" || t.estado === "en_curso").length,
    };
    res.json({
      ...respuesta,
      desde,
      hasta,
      anuncio,
      general: porcentaje(general),
      porTurno: respuesta.turnos.map((t) => ({ turnoId: t.id, nombre: t.corto, personas: t.personas, ...porcentaje(porTurno[t.id] || vacio()) })),
      porRol: Object.entries(porRol).map(([rol, o]) => ({ rol, ...porcentaje(o) })),
      porTipo: Object.entries(porTipo).map(([tipo, o]) => ({ tipo, ...porcentaje(o) })).sort((a, b) => b.total - a.total),
      porPersona: Object.entries(porPersona)
        .map(([id, o]) => {
          const g = gente.find((p) => String(p.idusuario) === String(id));
          const t = g?.idturno_recepcion ? respuesta.turnos.find((x) => x.id === String(g.idturno_recepcion)) : null;
          return { usuarioId: String(id), nombre: nombres[id] || "Usuario", rol: g?.rol || "", turno: t?.corto || "", ...o, cumplimiento: o.hechas + o.atrasadas > 0 ? Math.round((o.aTiempo / Math.max(1, o.hechas + o.atrasadas)) * 100) : null };
        })
        .sort((a, b) => b.hechas - a.hechas),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/tareas/:id/historial
router.get("/:id(\\d+)/historial", async (req, res, next) => {
  try {
    const { me, nombres } = await contexto(req);
    const v = filtroVisible(me);
    const [t] = await consultar(`SELECT t.idtarea FROM tareas t WHERE t.idtarea = ? AND ${v.sql}`, [req.params.id, ...v.p]);
    if (!t) throw new ErrorHttp(404, "Tarea no encontrada");
    const filas = await consultar("SELECT * FROM tarea_historial WHERE idtarea = ? ORDER BY fecha, idhistorial", [req.params.id]);
    res.json(filas.map((h) => ({ accion: h.accion, detalle: h.detalle || "", fecha: h.fecha, quien: h.idusuario ? nombres[h.idusuario] || "Usuario" : "Sistema" })));
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// ESCRITURAS
// ---------------------------------------------------------------------
/** Valida el destino { tipo: turno|rol|usuario, turnoId, rol, usuarioId } */
async function leerDestino(d) {
  const tipo = d?.tipo;
  if (tipo === "turno") {
    const [t] = await consultar("SELECT idturno_recepcion FROM turnos_recepcion WHERE idturno_recepcion = ? AND activo = 1", [Number(d.turnoId) || 0]);
    if (!t) throw new ErrorHttp(400, "Elige un turno de recepción activo");
    return { destino: "turno", turno: t.idturno_recepcion, rol: null, usuario: null };
  }
  if (tipo === "rol") {
    if (!ROLES_PERSONAL.includes(d.rol) || d.rol === "admin") throw new ErrorHttp(400, "Elige para qué área es la tarea");
    return { destino: "rol", turno: null, rol: d.rol, usuario: null };
  }
  if (tipo === "usuario") {
    const [u] = await consultar(
      "SELECT u.idusuario FROM usuarios u JOIN roles r ON r.idrol = u.idrol WHERE u.idusuario = ? AND u.activo = 1 AND r.codigo <> 'student'",
      [Number(d.usuarioId) || 0],
    );
    if (!u) throw new ErrorHttp(400, "Elige a la persona");
    return { destino: "usuario", turno: null, rol: null, usuario: u.idusuario };
  }
  throw new ErrorHttp(400, "Elige para quién es la tarea");
}

// POST /api/tareas
router.post("/", async (req, res, next) => {
  try {
    const b = req.body || {};
    const titulo = txt(b.titulo, 160);
    if (!titulo) throw new ErrorHttp(400, "Escribe qué hay que hacer");
    const fecha = fechaOk(b.fecha) || hoyLima();
    if (fecha < sumarDias(hoyLima(), -1)) throw new ErrorHttp(400, "La fecha no puede ser pasada");
    const d = await leerDestino(b.destino);
    const tipo = TIPOS.includes(b.tipo) ? b.tipo : "otro";
    const idal = Number(b.alumnoId) || null;
    const idpr = Number(b.prospectoId) || null;
    if (idal && !(await consultar("SELECT 1 FROM alumnos WHERE idalumno = ?", [idal])).length) throw new ErrorHttp(400, "Ese alumno no existe");
    if (idpr && !(await consultar("SELECT 1 FROM prospectos WHERE idprospecto = ?", [idpr])).length) throw new ErrorHttp(400, "Ese interesado no existe");
    const r = await consultar(
      `INSERT INTO tareas (tipo, titulo, nota, destino_tipo, idturno_recepcion, rol_codigo, idusuario_destino, idalumno, idprospecto, fecha, hora, origen, idusuario_creador)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, 'manual', ?)`,
      [tipo, titulo, txt(b.nota, 500), d.destino, d.turno, d.rol, d.usuario, idal, idpr, fecha, horaOk(b.hora), req.usuario.idusuario],
    );
    // Prioridad (columna de la parte 40; si aún no existe, se ignora)
    if (b.prioridad === "urgente")
      await consultar("UPDATE tareas SET prioridad = 'urgente' WHERE idtarea = ?", [r.insertId]).catch(() => {});
    await historial(r.insertId, "creada", txt(b.nota, 200) || (tipo === "nota" ? "Comentario dejado" : "Tarea creada"), req.usuario.idusuario);
    res.status(201).json({ ok: true, id: String(r.insertId) });
  } catch (e) {
    next(e);
  }
});

/** Lee una tarea que el usuario puede ver */
async function tareaVisible(req) {
  const me = await yo(req);
  const v = filtroVisible(me);
  const [t] = await consultar(`SELECT t.* FROM tareas t WHERE t.idtarea = ? AND ${v.sql}`, [req.params.id, ...v.p]);
  if (!t) throw new ErrorHttp(404, "Tarea no encontrada");
  return { t, me };
}
const nombreDe = async (id) => {
  if (!id) return "otra persona";
  const [p] = await consultar(
    "SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.nombres, e.apellidos)), ''), u.usuario) AS n FROM usuarios u LEFT JOIN empleados e ON e.idempleado = u.idempleado WHERE u.idusuario = ?",
    [id],
  );
  return p?.n || "otra persona";
};

// POST /api/tareas/:id/tomar  -> la primera persona se queda con ella
router.post("/:id(\\d+)/tomar", async (req, res, next) => {
  try {
    const { t } = await tareaVisible(req);
    const r = await consultar(
      `UPDATE tareas SET estado = 'en_curso', idusuario_tomada = ?, tomada_en = NOW()
        WHERE idtarea = ? AND estado = 'pendiente' AND (idusuario_tomada IS NULL OR idusuario_tomada = ?)`,
      [req.usuario.idusuario, t.idtarea, req.usuario.idusuario],
    );
    if (!r.affectedRows) {
      const [x] = await consultar("SELECT estado, idusuario_tomada FROM tareas WHERE idtarea = ?", [t.idtarea]);
      if (x.idusuario_tomada && x.idusuario_tomada !== req.usuario.idusuario) throw new ErrorHttp(409, `Ya la tomó ${await nombreDe(x.idusuario_tomada)}`);
      if (x.estado === "en_curso") return res.json({ ok: true });
      throw new ErrorHttp(409, "Esta tarea ya está cerrada");
    }
    await historial(t.idtarea, "tomada", null, req.usuario.idusuario);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/tareas/:id/soltar  -> la devuelve para que otra persona la tome
router.post("/:id(\\d+)/soltar", async (req, res, next) => {
  try {
    const { t, me } = await tareaVisible(req);
    if (t.idusuario_tomada !== me.id && me.rol !== "admin") throw new ErrorHttp(403, "Solo quien la tomó puede soltarla");
    const r = await consultar("UPDATE tareas SET estado = 'pendiente', idusuario_tomada = NULL, tomada_en = NULL WHERE idtarea = ? AND estado = 'en_curso'", [t.idtarea]);
    if (r.affectedRows) await historial(t.idtarea, "soltada", txt(req.body?.comentario, 300), me.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/tareas/:id/hecha { resultado }
router.post("/:id(\\d+)/hecha", async (req, res, next) => {
  try {
    const { t, me } = await tareaVisible(req);
    if (t.idusuario_tomada && t.idusuario_tomada !== me.id && me.rol !== "admin") throw new ErrorHttp(409, `La tiene ${await nombreDe(t.idusuario_tomada)}`);
    const resultado = txt(req.body?.resultado, 500);
    const r = await consultar(
      `UPDATE tareas SET estado = 'hecha', resultado = ?, idusuario_cierre = ?, cerrada_en = NOW(),
              idusuario_tomada = COALESCE(idusuario_tomada, ?), tomada_en = COALESCE(tomada_en, NOW())
        WHERE idtarea = ? AND estado IN ('pendiente','en_curso')`,
      [resultado, me.id, me.id, t.idtarea],
    );
    if (!r.affectedRows) throw new ErrorHttp(409, "Esta tarea ya estaba cerrada");
    await historial(t.idtarea, "hecha", resultado, me.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/tareas/:id/pasar { destino, comentario }  -> a otro turno / área / persona
router.post("/:id(\\d+)/pasar", async (req, res, next) => {
  try {
    const { t, me } = await tareaVisible(req);
    if (!["pendiente", "en_curso"].includes(t.estado)) throw new ErrorHttp(409, "Esta tarea ya está cerrada");
    const comentario = txt(req.body?.comentario, 400);
    if (!comentario) throw new ErrorHttp(400, "Escribe un comentario: qué se hizo y qué falta");
    const d = await leerDestino(req.body?.destino);
    const fecha = fechaOk(req.body?.fecha);
    await consultar(
      `UPDATE tareas SET destino_tipo = ?, idturno_recepcion = ?, rol_codigo = ?, idusuario_destino = ?, estado = 'pendiente',
              idusuario_tomada = NULL, tomada_en = NULL, pases = pases + 1,
              nota = LEFT(CONCAT(COALESCE(nota, ''), IF(COALESCE(nota, '') = '', '', '\n'), ?), 500)
              ${fecha ? ", fecha_original = COALESCE(fecha_original, fecha), fecha = ?" : ""}
        WHERE idtarea = ?`,
      [d.destino, d.turno, d.rol, d.usuario, `↪ ${comentario}`, ...(fecha ? [fecha] : []), t.idtarea],
    );
    let a = "";
    if (d.destino === "turno") {
      const [x] = await consultar("SELECT nombre FROM turnos_recepcion WHERE idturno_recepcion = ?", [d.turno]);
      a = `turno ${nombreCortoTurno(x?.nombre)}`;
    } else if (d.destino === "usuario") a = await nombreDe(d.usuario);
    else a = { reception: "Recepción", trainer: "Entrenadores", physio: "Fisioterapia", nutritionist: "Nutrición", instructor: "Profesores de clases" }[d.rol] || d.rol;
    await historial(t.idtarea, "pasada", `Pasó a ${a}: ${comentario}`, me.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/tareas/:id/reprogramar { fecha, hora, motivo }
router.post("/:id(\\d+)/reprogramar", async (req, res, next) => {
  try {
    const { t, me } = await tareaVisible(req);
    if (!["pendiente", "en_curso"].includes(t.estado)) throw new ErrorHttp(409, "Esta tarea ya está cerrada");
    const fecha = fechaOk(req.body?.fecha);
    if (!fecha || fecha < hoyLima()) throw new ErrorHttp(400, "Elige la nueva fecha (hoy o después)");
    const motivo = txt(req.body?.motivo, 300);
    if (!motivo) throw new ErrorHttp(400, "Escribe el motivo de la reprogramación");
    const hora = horaOk(req.body?.hora);
    await consultar(
      "UPDATE tareas SET fecha_original = COALESCE(fecha_original, fecha), fecha = ?, hora = ?, reprogramaciones = reprogramaciones + 1 WHERE idtarea = ?",
      [fecha, hora, t.idtarea],
    );
    await historial(t.idtarea, "reprogramada", `Para el ${fBonita(fecha)}${hora ? ` a las ${hora}` : ""}: ${motivo}`, me.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/tareas/:id/comentar { comentario }
router.post("/:id(\\d+)/comentar", async (req, res, next) => {
  try {
    const { t, me } = await tareaVisible(req);
    const c = txt(req.body?.comentario, 400);
    if (!c) throw new ErrorHttp(400, "Escribe el comentario");
    await historial(t.idtarea, "comentario", c, me.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/tareas/:id/anular { motivo } -> quien la creó o administración
router.post("/:id(\\d+)/anular", async (req, res, next) => {
  try {
    const { t, me } = await tareaVisible(req);
    if (me.rol !== "admin" && t.idusuario_creador !== me.id) throw new ErrorHttp(403, "Solo quien la creó o administración puede anularla");
    const motivo = txt(req.body?.motivo, 300) || "Anulada";
    const r = await consultar(
      "UPDATE tareas SET estado = 'cancelada', resultado = ?, idusuario_cierre = ?, cerrada_en = NOW() WHERE idtarea = ? AND estado IN ('pendiente','en_curso')",
      [motivo, me.id, t.idtarea],
    );
    if (r.affectedRows) await historial(t.idtarea, "cancelada", motivo, me.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
