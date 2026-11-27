// =====================================================================
// AVISOS DE LA CAMPANITA (según el rol)
//  - Recepción y administración: alumnos que olvidaron su contraseña
//    (desde "¿Olvidaste tu contraseña?" del inicio de sesión). Se
//    restablece con un botón: la contraseña vuelve a ser su DNI.
//  - Entrenador: alumnos que vinieron y no anotaron sus pesos, o que
//    dejaron la sesión a medias.
//  - Alumno: recordatorio de anotar sus pesos ("ayer anotaste 2 de 20 series").
//  - Recepción: si aún no escribió sus proyecciones de hoy o de la semana.
//  - Entrenador: "Lograste que..." y avances en los controles de nutrición y fisioterapia.
// =====================================================================
import { Router } from "express";
import { consultar } from "../db.js";
import { ErrorHttp } from "../seguridad.js";
import { hoyLima, sumarDias } from "../congelamiento.js";
import { codigoAlumno } from "../codigoAlumno.js";
import { crearOCambiarCuenta } from "./alumnos.js";
import { rutinaDe, planDe } from "./progreso.js";
import { avisosClases } from "./clases.js";

const router = Router();
const DIAS_REVISION = 7; // se revisan los últimos 7 días (sin contar hoy)

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fBonita = (iso) => {
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
};
const cuando = (iso, hoy) => (iso === sumarDias(hoy, -1) ? "ayer" : `el ${fBonita(iso)}`);

let hayTablaPesos = null;
async function tablaPesos() {
  if (hayTablaPesos !== null) return hayTablaPesos;
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'registro_peso_serie'",
  );
  hayTablaPesos = Number(f?.n) > 0;
  return hayTablaPesos;
}

/** Días que vino sin anotar y sesiones a medias de un alumno */
async function pendientesDe(idalumno, desde, hasta) {
  const [asis, regs, rutina] = await Promise.all([
    consultar(
      "SELECT DISTINCT fecha FROM asistencias_alumno WHERE idalumno = ? AND tipo = 'entrada' AND fecha BETWEEN ? AND ? ORDER BY fecha",
      [idalumno, desde, hasta],
    ),
    consultar(
      `SELECT fecha, dia_rutina, COUNT(*) AS series
         FROM registro_peso_serie WHERE idalumno = ? AND fecha BETWEEN ? AND ?
        GROUP BY fecha, dia_rutina ORDER BY fecha`,
      [idalumno, desde, hasta],
    ),
    rutinaDe(idalumno),
  ]);
  const plan = planDe(rutina);
  if (!plan || !plan.dias.length) return { plan: null, sinAnotar: [], incompletas: [] };
  const conRegistro = new Set(regs.map((r) => r.fecha));
  const sinAnotar = asis.map((a) => a.fecha).filter((f) => !conRegistro.has(f));
  const incompletas = regs
    .map((r) => {
      const dia = plan.dias.find((d) => d.nombre === r.dia_rutina);
      const total = dia ? dia.ejercicios.reduce((t, e) => t + e.series, 0) : 0;
      return { fecha: r.fecha, dia: r.dia_rutina, hechas: Number(r.series), total };
    })
    .filter((x) => x.total && x.hechas < x.total);
  return { plan, sinAnotar, incompletas };
}

async function avisosClave(req) {
  const esAdmin = req.usuario.rol === "admin";
  if (!esAdmin && req.usuario.rol !== "reception") return [];
  const filas = await consultar(
    `SELECT al.idalerta, al.mensaje, al.fecha, al.idalumno, a.telefono, a.codigo, a.nombres, a.apellidos, u.usuario
       FROM alertas_administracion al
       LEFT JOIN alumnos a ON a.idalumno = al.idalumno
       LEFT JOIN usuarios u ON u.idusuario = al.idusuario_origen
      WHERE al.tipo = 'olvido_clave' AND al.vista = 0 ${esAdmin ? "" : "AND al.idalumno IS NOT NULL"}
      ORDER BY al.fecha DESC LIMIT 30`,
  );
  return filas.map((f) => ({
    id: `clave-${f.idalerta}`,
    tipo: "olvido_clave",
    nivel: "alto",
    titulo: f.idalumno ? `🔑 ${f.nombres} ${f.apellidos} olvidó su contraseña` : `🔑 ${f.usuario} (personal) olvidó su contraseña`,
    mensaje: f.idalumno
      ? `Código ${codigoAlumno(f.codigo, f.nombres, f.apellidos)}. Confirma que es el alumno (en persona o llamando a su celular) y restablece: su contraseña será su DNI.`
      : "Restablécela en Usuarios & Accesos y márcala como atendida.",
    fecha: f.fecha,
    accion: { tipo: f.idalumno ? "restablecer" : "atendida", idalerta: f.idalerta, telefono: f.telefono || "" },
    fijo: true, // no se oculta hasta atenderlo
  }));
}

async function avisosEntrenador(req, hoy) {
  if (req.usuario.rol !== "trainer" || !(await tablaPesos())) return [];
  const [yo] = await consultar("SELECT idempleado FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  const desde = sumarDias(hoy, -DIAS_REVISION);
  const hasta = sumarDias(hoy, -1);
  // Sus alumnos; si aún no tiene alumnos asignados, todos los que tienen rutina
  const [{ n: propios }] = await consultar("SELECT COUNT(*) AS n FROM alumnos WHERE activo = 1 AND identrenador = ?", [yo?.idempleado || 0]);
  const alumnos = await consultar(
    `SELECT a.idalumno, a.codigo, a.nombres, a.apellidos
       FROM alumnos a
      WHERE a.activo = 1 ${Number(propios) ? "AND a.identrenador = ?" : ""}
        AND EXISTS (SELECT 1 FROM registros_app r WHERE r.idalumno = a.idalumno AND r.modulo IN ('asignaciones_rutina', 'rutinas'))
        AND EXISTS (SELECT 1 FROM asistencias_alumno s WHERE s.idalumno = a.idalumno AND s.tipo = 'entrada' AND s.fecha BETWEEN ? AND ?)`,
    Number(propios) ? [yo.idempleado, desde, hasta] : [desde, hasta],
  );
  const lista = [];
  for (const a of alumnos.slice(0, 60)) {
    const p = await pendientesDe(a.idalumno, desde, hasta);
    if (!p.plan || (!p.sinAnotar.length && !p.incompletas.length)) continue;
    const partes = [];
    if (p.sinAnotar.length) {
      partes.push(`vino ${p.sinAnotar.length} día${p.sinAnotar.length > 1 ? "s" : ""} sin anotar pesos (${p.sinAnotar.map(fBonita).join(", ")})`);
    }
    if (p.incompletas.length) {
      const x = p.incompletas[p.incompletas.length - 1];
      partes.push(`${cuando(x.fecha, hoy)} anotó solo ${x.hechas} de ${x.total} series`);
    }
    lista.push({
      id: `pesos-${a.idalumno}-${hasta}-${p.sinAnotar.length}-${p.incompletas.length}`,
      tipo: "pesos_alumno",
      nivel: p.sinAnotar.length >= 3 ? "alto" : "medio",
      titulo: `💪 ${a.nombres} ${a.apellidos} no está anotando sus pesos`,
      mensaje: `${codigoAlumno(a.codigo, a.nombres, a.apellidos)}: ${partes.join(" y ")}. Recuérdale que es obligatorio.`,
      fecha: hasta,
      accion: { tipo: "abrir_progreso", idalumno: String(a.idalumno) },
      peso: p.sinAnotar.length * 10 + p.incompletas.length,
    });
  }
  return lista.sort((x, y) => y.peso - x.peso).slice(0, 25);
}

async function avisosAlumno(req, hoy) {
  if (req.usuario.rol !== "student" || !(await tablaPesos())) return [];
  const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  if (!u?.idalumno) return [];
  const hasta = sumarDias(hoy, -1);
  const p = await pendientesDe(u.idalumno, sumarDias(hoy, -DIAS_REVISION), hasta);
  if (!p.plan) return [];
  const lista = [];
  const inc = p.incompletas.filter((x) => x.fecha >= sumarDias(hoy, -3));
  for (const x of inc.slice(-2)) {
    lista.push({
      id: `inc-${x.fecha}-${x.hechas}`,
      tipo: "pesos_incompletos",
      nivel: "medio",
      titulo: "✍️ Completa tus pesos",
      mensaje: `${cuando(x.fecha, hoy).replace(/^./, (c) => c.toUpperCase())} anotaste solo ${x.hechas} de ${x.total} series de ${x.dia}. ¡No lo dejes a medias! Así verás tu progreso real.`,
      fecha: x.fecha,
      accion: { tipo: "anotar", fecha: x.fecha },
    });
  }
  if (p.sinAnotar.length) {
    const ult = p.sinAnotar[p.sinAnotar.length - 1];
    lista.push({
      id: `sin-${p.sinAnotar.join("_")}`,
      tipo: "pesos_sin_anotar",
      nivel: p.sinAnotar.length >= 2 ? "alto" : "medio",
      titulo: "💪 No olvides anotar tu progreso",
      mensaje:
        p.sinAnotar.length === 1
          ? `${cuando(ult, hoy).replace(/^./, (c) => c.toUpperCase())} viniste a entrenar pero no anotaste tus pesos. Tienes hasta un mes para completarlo.`
          : `Viniste ${p.sinAnotar.length} días sin anotar tus pesos (${p.sinAnotar.map(fBonita).join(", ")}). Anótalos para que tu entrenador vea cómo avanzas.`,
      fecha: ult,
      accion: { tipo: "anotar", fecha: ult },
    });
  }
  return lista;
}

// Recepción: la pregunta de cada semana sobre sus proyecciones (Metas & Logros)
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
async function avisosProyeccion(req, hoy) {
  if (req.usuario.rol !== "reception") return [];
  const [t] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyecciones_recepcion'",
  );
  if (!Number(t?.n)) return [];
  const [u] = await consultar("SELECT idturno_recepcion FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  if (!u?.idturno_recepcion) return [];
  const dow = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  const lunes = sumarDias(hoy, 1 - (dow || 7));
  const diaHoy = dow || 7;
  const filas = await consultar(
    "SELECT dia FROM proyecciones_recepcion WHERE idturno_recepcion = ? AND semana_inicio = ? AND dia IN (0, ?)",
    [u.idturno_recepcion, lunes, diaHoy],
  );
  const faltaSemana = !filas.some((f) => f.dia === 0);
  const faltaHoy = !filas.some((f) => f.dia === diaHoy);
  if (!faltaSemana && !faltaHoy) return [];
  const n = Math.floor((Number(lunes.slice(8, 10)) - 1) / 7) + 1;
  const semana = `Semana ${n} de ${MESES_LARGOS[Number(lunes.slice(5, 7)) - 1]}`;
  const para = [faltaHoy ? `para hoy ${DIAS_LARGOS[dow]} ${Number(hoy.slice(8, 10))}` : "", faltaSemana ? "para esta semana" : ""].filter(Boolean).join(" y ");
  return [
    {
      id: `proyeccion-${lunes}-${faltaHoy ? hoy : "semana"}`,
      tipo: "proyeccion",
      nivel: "medio",
      titulo: `📈 ${semana}: ¿cuáles son tus proyecciones ${para}?`,
      mensaje: "Escribe cuánto esperas vender y cuántas matrículas y renovaciones harás. Al final verás cuánto lograste.",
      fecha: `${hoy} 00:00:00`,
      accion: { tipo: "proyecciones" },
    },
  ];
}

// Entrenador: "Lograste que..." cuando nutrición o fisioterapia confirman que su
// alumno cumplió el objetivo, y avisos de avance en cada control (ej. dolor 7 -> 5)
const UNIDAD = (u) => (u ? ` ${u}` : "");
const num = (v) => (v === null || v === undefined ? "" : String(Number(v)));
const AREA_TXT = { nutricion: "Nutrición", fisioterapia: "Fisioterapia" };
async function avisosLogrosEntrenador(req, hoy) {
  if (req.usuario.rol !== "trainer") return [];
  const [yo] = await consultar("SELECT idempleado FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  if (!yo?.idempleado) return [];
  const desde = sumarDias(hoy, -7);
  const logrados = await consultar(
    `SELECT o.idobjetivo, o.area, o.descripcion, o.valor_inicial, o.valor_final, o.unidad, o.fecha_evaluacion, a.idalumno, a.nombres, a.apellidos
       FROM objetivos_alumno o JOIN alumnos a ON a.idalumno = o.idalumno
      WHERE o.estado = 'conseguida' AND o.fecha_evaluacion >= ?
        AND (o.identrenador = ? OR (o.identrenador IS NULL AND a.identrenador = ?))
      ORDER BY o.fecha_evaluacion DESC LIMIT 20`,
    [desde, yo.idempleado, yo.idempleado],
  );
  const lista = logrados.map((o) => {
    const cambio = o.valor_inicial != null && o.valor_final != null ? ` (${num(o.valor_inicial)} → ${num(o.valor_final)}${UNIDAD(o.unidad)})` : "";
    return {
      id: `logro-${o.idobjetivo}`,
      tipo: "logro_alumno",
      nivel: "medio",
      titulo: `🏆 ¡Lograste que ${o.nombres} cumpliera su objetivo!`,
      mensaje: `${AREA_TXT[o.area] || ""}: ${o.descripcion}${cambio}. Ganaste una mancuerna.`,
      fecha: o.fecha_evaluacion,
    };
  });
  const [t] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'objetivo_controles'",
  );
  if (Number(t?.n)) {
    const controles = await consultar(
      `SELECT k.idcontrol, k.fecha, k.valor, o.area, o.descripcion, o.unidad, o.valor_inicial, o.valor_meta, a.nombres,
              (SELECT k2.valor FROM objetivo_controles k2 WHERE k2.idobjetivo = k.idobjetivo AND (k2.fecha < k.fecha OR (k2.fecha = k.fecha AND k2.idcontrol < k.idcontrol))
                ORDER BY k2.fecha DESC, k2.idcontrol DESC LIMIT 1) AS anterior
         FROM objetivo_controles k JOIN objetivos_alumno o ON o.idobjetivo = k.idobjetivo JOIN alumnos a ON a.idalumno = o.idalumno
        WHERE k.fecha >= ? AND o.estado = 'en_proceso'
          AND (o.identrenador = ? OR (o.identrenador IS NULL AND a.identrenador = ?))
        ORDER BY k.fecha DESC LIMIT 20`,
      [desde, yo.idempleado, yo.idempleado],
    );
    controles.forEach((k) => {
      const previo = k.anterior != null ? Number(k.anterior) : k.valor_inicial != null ? Number(k.valor_inicial) : null;
      if (previo === null || k.valor_meta == null) return;
      // ¿se acercó a la meta? (sirve para bajar peso, subir masa o bajar dolor)
      const mejora = Math.abs(Number(k.valor_meta) - Number(k.valor)) < Math.abs(Number(k.valor_meta) - previo);
      if (!mejora) return;
      lista.push({
        id: `avance-${k.idcontrol}`,
        tipo: "avance_alumno",
        nivel: "medio",
        titulo: `📈 ${k.nombres} va mejorando`,
        mensaje: `${AREA_TXT[k.area] || ""}: ${k.descripcion}. Pasó de ${num(previo)} a ${num(k.valor)}${UNIDAD(k.unidad)} (meta ${num(k.valor_meta)}${UNIDAD(k.unidad)}).`,
        fecha: k.fecha,
      });
    });
  }
  return lista;
}

// GET /api/avisos -> { avisos: [...] }
// Rutinas actualizadas: el alumno se entera de que su rutina cambió, y
// administración / entrenadores ven qué rutinas cambió otra persona.
const parsearDatos = (d) => {
  try {
    return typeof d === "string" ? JSON.parse(d) : d || {};
  } catch {
    return {};
  }
};
async function avisosRutinas(req, hoy) {
  const rol = req.usuario.rol;
  if (rol === "student") {
    const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
    if (!u?.idalumno) return [];
    const filas = await consultar(
      `SELECT datos FROM registros_app
        WHERE modulo = 'rutinas' AND (idalumno = ? OR idregistro IN (
              SELECT JSON_UNQUOTE(JSON_EXTRACT(datos, '$.routineId')) FROM registros_app
               WHERE modulo = 'asignaciones_rutina' AND idalumno = ?))`,
      [u.idalumno, u.idalumno],
    );
    const desde = sumarDias(hoy, -7);
    return filas
      .map((f) => parsearDatos(f.datos))
      .filter((r) => r.actualizadaEn && String(r.actualizadaEn).slice(0, 10) >= desde)
      .map((r) => ({
        id: `rutina-${r.id}-${r.actualizadaEn}`,
        tipo: "rutina_actualizada",
        nivel: "medio",
        titulo: "🔄 Tu rutina fue actualizada",
        mensaje: `${r.actualizadaPor || "Tu entrenador"} actualizó «${r.title || "tu rutina"}»${r.ultimoCambio ? `: ${r.ultimoCambio}` : ""}. Revísala antes de entrenar.`,
        fecha: r.actualizadaEn,
        accion: { tipo: "ir", tab: "mi_rutina" },
      }));
  }
  if (rol !== "admin" && rol !== "trainer") return [];
  const filas = await consultar("SELECT idregistro, datos FROM registros_app WHERE modulo = 'rutinas'");
  const asign = await consultar("SELECT JSON_UNQUOTE(JSON_EXTRACT(datos, '$.routineId')) AS rid, COUNT(*) AS n FROM registros_app WHERE modulo = 'asignaciones_rutina' GROUP BY rid");
  const porRutina = Object.fromEntries(asign.map((a) => [String(a.rid), Number(a.n)]));
  const desde = sumarDias(hoy, -3);
  return filas
    .map((f) => parsearDatos(f.datos))
    .filter((r) => r.actualizadaEn && String(r.actualizadaEn).slice(0, 10) >= desde && String(r.actualizadaPorId) !== String(req.usuario.idusuario))
    .map((r) => {
      const n = Math.max(porRutina[String(r.id)] || 0, r.targetStudentId ? 1 : 0);
      return {
        id: `rutina-equipo-${r.id}-${r.actualizadaEn}`,
        tipo: "rutina_actualizada",
        nivel: "bajo",
        titulo: `🔄 ${r.actualizadaPor || "Alguien"} actualizó «${r.title || "una rutina"}»`,
        mensaje: `${r.ultimoCambio ? `${r.ultimoCambio}. ` : ""}${n ? `Se avisó a ${n} alumno(s) que la tienen asignada.` : "Aún no está asignada a ningún alumno."}`,
        fecha: r.actualizadaEn,
        accion: { tipo: "ir", tab: "routines" },
      };
    });
}


// ---------------------------------------------------------------------
// Avisos de AGENDA y CAMBIOS hechos por otra persona:
//  - Fisioterapia / Nutrición: "Nueva cita: Juan Pérez · 15 nov 10:00" y
//    "Hoy atiendes a…" (para saber a quién atiende y a qué hora).
//  - Entrenador / admin: rutina asignada a un alumno por otra persona.
//  - Nutrición / admin: plan de dieta cambiado por otra persona.
//  - Alumno: cita agendada, dieta o plan de fisioterapia actualizados.
// ---------------------------------------------------------------------
const nombreUsuario = async (id) => {
  if (!id) return "Alguien";
  const [u] = await consultar(
    `SELECT COALESCE(CONCAT(e.nombres, ' ', e.apellidos), CONCAT(a.nombres, ' ', a.apellidos), u.usuario) AS nombre
       FROM usuarios u LEFT JOIN empleados e ON e.idempleado = u.idempleado LEFT JOIN alumnos a ON a.idalumno = u.idalumno
      WHERE u.idusuario = ?`,
    [id],
  );
  return u?.nombre || "Alguien";
};
const hora = (cita) => String(cita.timeSlot || "").split(" - ")[0] || "";
const fechaYhora = (cita, hoy) =>
  `${cita.date === hoy ? "hoy" : cita.date === sumarDias(hoy, 1) ? "mañana" : fBonita(cita.date)} ${hora(cita)}`.trim();
const ESTADOS_ACTIVOS = new Set(["por_atender", "confirmada", "pendiente", "programada", undefined, null, ""]);

async function avisosAgendaYCambios(req, hoy) {
  const { rol, idusuario } = req.usuario;
  const yo = String(idusuario);
  const avisos = [];
  const nombres = new Map();
  const quien = async (id) => {
    if (!nombres.has(id)) nombres.set(id, await nombreUsuario(id));
    return nombres.get(id);
  };
  const recientes = sumarDias(hoy, -3);

  // ----- Citas -----
  const servicio = rol === "physio" ? "physiotherapy" : rol === "nutritionist" ? "nutrition" : null;
  if (servicio || rol === "student") {
    let filas;
    if (rol === "student") {
      const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [idusuario]);
      if (!u?.idalumno) filas = [];
      else
        filas = await consultar(
          `SELECT datos, creado_por, actualizado_por, fecha_creacion, fecha_actualizacion FROM registros_app
            WHERE modulo = 'citas' AND idalumno = ? AND JSON_UNQUOTE(JSON_EXTRACT(datos, '$.date')) >= ?`,
          [u.idalumno, hoy],
        );
    } else {
      filas = await consultar(
        `SELECT datos, creado_por, actualizado_por, fecha_creacion, fecha_actualizacion FROM registros_app
          WHERE modulo = 'citas' AND JSON_UNQUOTE(JSON_EXTRACT(datos, '$.date')) >= ?`,
        [hoy],
      );
    }
    const [miNombre] = rol === "student" ? [null] : await consultar(
      `SELECT CONCAT(e.nombres, ' ', e.apellidos) AS nombre FROM usuarios u LEFT JOIN empleados e ON e.idempleado = u.idempleado WHERE u.idusuario = ?`,
      [idusuario],
    );
    const mio = (c) => {
      if (rol === "student") return true;
      const tipo = c.serviceType === "nutrition" ? "nutrition" : "physiotherapy";
      if (tipo !== servicio) return false;
      // Si la cita nombra a otro especialista del mismo servicio, no es mía
      const n = String(miNombre?.nombre || "").toLowerCase();
      const s = String(c.staffName || "").toLowerCase();
      return !s || !n || s === "por asignar" || s.includes(n.split(" ")[0]) || n.includes(s.split(" ")[0]);
    };
    const citasHoy = [];
    for (const f of filas) {
      const c = parsearDatos(f.datos);
      if (!c?.date || !ESTADOS_ACTIVOS.has(c.status) || !mio(c)) continue;
      const servicioTxt = c.serviceType === "nutrition" ? "Nutrición" : "Fisioterapia";
      const creadaPorOtro = String(f.creado_por) !== yo;
      const creada = String(f.fecha_creacion?.toISOString?.() ?? f.fecha_creacion).slice(0, 10);
      const cambiada = String(f.fecha_actualizacion?.toISOString?.() ?? f.fecha_actualizacion).slice(0, 10);
      if (c.date === hoy) citasHoy.push(c);
      if (creadaPorOtro && creada >= recientes) {
        avisos.push({
          id: `cita-nueva-${c.id}`,
          tipo: "cita",
          nivel: c.date === hoy ? "alto" : "medio",
          titulo: rol === "student" ? `📅 Tienes cita de ${servicioTxt}` : `📅 Nueva cita: ${c.memberName || "Alumno"}`,
          mensaje:
            rol === "student"
              ? `${fechaYhora(c, hoy)} con ${c.staffName || "el especialista"}${c.roomOrDesk ? ` · ${c.roomOrDesk}` : ""}.`
              : `${fechaYhora(c, hoy)} · ${c.reason || servicioTxt}. Agendada por ${await quien(f.creado_por)}.`,
          fecha: c.date,
          accion: { tipo: "ir", tab: rol === "student" ? "mis_citas" : "appointments" },
        });
      } else if (String(f.actualizado_por) !== yo && cambiada >= recientes && cambiada > creada) {
        avisos.push({
          id: `cita-cambio-${c.id}-${cambiada}`,
          tipo: "cita",
          nivel: "medio",
          titulo: `✏️ Cita modificada: ${rol === "student" ? servicioTxt : c.memberName || "Alumno"}`,
          mensaje: `Ahora es ${fechaYhora(c, hoy)}. Cambio hecho por ${await quien(f.actualizado_por)}.`,
          fecha: c.date,
          accion: { tipo: "ir", tab: rol === "student" ? "mis_citas" : "appointments" },
        });
      }
    }
    if (rol !== "student" && citasHoy.length) {
      citasHoy.sort((a, b) => hora(a).localeCompare(hora(b)));
      avisos.push({
        id: `citas-hoy-${hoy}-${citasHoy.length}`,
        tipo: "cita",
        nivel: "alto",
        titulo: `🗓️ Hoy atiendes ${citasHoy.length} cita(s)`,
        mensaje: citasHoy.map((c) => `${hora(c)} ${c.memberName || "Alumno"}`).join(" · "),
        fecha: hoy,
        accion: { tipo: "ir", tab: "appointments" },
      });
    }
  }

  // ----- Rutinas asignadas por otra persona (entrenador / admin) -----
  if (rol === "trainer" || rol === "admin") {
    const filas = await consultar(
      `SELECT datos, creado_por, fecha_creacion FROM registros_app
        WHERE modulo = 'asignaciones_rutina' AND fecha_creacion >= ? AND creado_por <> ?`,
      [recientes, idusuario],
    );
    for (const f of filas) {
      const a = parsearDatos(f.datos);
      const [al] = /^\d+$/.test(String(a.memberId)) ? await consultar("SELECT CONCAT(nombres, ' ', apellidos) AS nombre FROM alumnos WHERE idalumno = ?", [a.memberId]) : [];
      const [ru] = a.routineId ? await consultar("SELECT datos FROM registros_app WHERE modulo = 'rutinas' AND idregistro = ?", [String(a.routineId)]) : [];
      const tituloRutina = ru ? parsearDatos(ru.datos)?.title : a.routineTitle;
      avisos.push({
        id: `asignacion-${a.id || a.routineId}-${a.memberId}`,
        tipo: "rutina_asignada",
        nivel: "bajo",
        titulo: `🏋️ Rutina asignada a ${al?.nombre || a.memberName || "un alumno"}`,
        mensaje: `${await quien(f.creado_por)} le asignó ${tituloRutina ? `«${tituloRutina}»` : "una rutina"}.`,
        fecha: String(f.fecha_creacion?.toISOString?.() ?? f.fecha_creacion).slice(0, 10),
        accion: { tipo: "ir", tab: "routines" },
      });
    }
  }

  // ----- Dietas y planes de fisioterapia cambiados por otra persona -----
  const vigilar = [];
  if (rol === "nutritionist" || rol === "admin") vigilar.push(["planes_nutricion", "nutrition", "🥗", "plan de dieta", "planes de dieta"]);
  if (rol === "physio" || rol === "admin") vigilar.push(["fisioterapia", "physiotherapy", "🩺", "ficha de fisioterapia", "fichas de fisioterapia"]);
  for (const [modulo, tab, icono, nombre, plural] of vigilar) {
    const filas = await consultar(
      `SELECT idregistro, datos, actualizado_por, fecha_actualizacion FROM registros_app
        WHERE modulo = ? AND fecha_actualizacion >= ? AND actualizado_por <> ? ORDER BY fecha_actualizacion DESC`,
      [modulo, recientes, idusuario],
    );
    // Se agrupan por persona: muchos cambios seguidos se muestran en un solo aviso
    const porPersona = new Map();
    for (const f of filas) {
      if (!porPersona.has(f.actualizado_por)) porPersona.set(f.actualizado_por, []);
      porPersona.get(f.actualizado_por).push(f);
    }
    for (const [persona, lista] of porPersona) {
      const nombres = [];
      for (const f of lista.slice(0, 4)) {
        const d = parsearDatos(f.datos);
        let alumno = d.memberName || d.targetStudentName;
        const idAl = d.memberId ?? d.targetStudentId;
        if (!alumno && /^\d+$/.test(String(idAl))) {
          const [al] = await consultar("SELECT CONCAT(nombres, ' ', apellidos) AS nombre FROM alumnos WHERE idalumno = ?", [idAl]);
          alumno = al?.nombre;
        }
        nombres.push(alumno || d.title || d.name || "Alumno");
      }
      const fecha = String(lista[0].fecha_actualizacion?.toISOString?.() ?? lista[0].fecha_actualizacion).slice(0, 10);
      const varios = lista.length > 1;
      avisos.push({
        id: `${modulo}-cambio-${persona}-${fecha}-${lista.length}`,
        tipo: "cambio",
        nivel: "bajo",
        titulo: `${icono} ${await quien(persona)} actualizó ${varios ? `${lista.length} ${plural}` : `una ${nombre}`.replace(/^una plan/, "un plan")}`,
        mensaje: `${nombres.join(", ")}${lista.length > nombres.length ? ` y ${lista.length - nombres.length} más` : ""}.`,
        fecha,
        accion: { tipo: "ir", tab },
      });
    }
  }
  if (rol === "student") {
    const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [idusuario]);
    if (u?.idalumno) {
      const filas = await consultar(
        `SELECT modulo, idregistro, actualizado_por, fecha_actualizacion FROM registros_app
          WHERE idalumno = ? AND modulo IN ('planes_nutricion','fisioterapia') AND fecha_actualizacion >= ? AND actualizado_por <> ?`,
        [u.idalumno, sumarDias(hoy, -7), idusuario],
      );
      for (const f of filas) {
        const dieta = f.modulo === "planes_nutricion";
        const fecha = String(f.fecha_actualizacion?.toISOString?.() ?? f.fecha_actualizacion).slice(0, 10);
        avisos.push({
          id: `alumno-${f.modulo}-${f.idregistro}-${fecha}`,
          tipo: "cambio",
          nivel: "medio",
          titulo: dieta ? "🥗 Tu dieta fue actualizada" : "🩺 Tu plan de fisioterapia fue actualizado",
          mensaje: `${await quien(f.actualizado_por)} hizo cambios. Revísalos en tu portal.`,
          fecha,
          accion: { tipo: "ir", tab: dieta ? "mi_dieta" : "mi_fisioterapia" },
        });
      }
    }
  }
  return avisos;
}

// ----- Evolución en fisioterapia (última sesión de cada alumno) -----
//  entrenador/admin: recaída, empeoramiento o derivación (14 días) -> ajustar la rutina
//  alumno: mejoría, alta o recaída en su última sesión (7 días) -> mensaje propio
//  fisioterapia/admin: control pendiente (fecha de próximo control vencida y sin sesión nueva)
const EVOL = {
  notable_mejora: ["🎉", "Mejoría notable"], mejora_moderada: ["😊", "Mejoría moderada"], mejora_leve: ["👍", "Mejoría leve"],
  estable: ["⚖️", "Estable"], recaida: ["🔁", "Recaída"], empeoramiento: ["⚠️", "Empeoramiento"], derivacion: ["🏥", "Derivado a médico"], alta: ["🏆", "Alta"],
};
async function avisosEvolucionFisio(req, hoy) {
  const { rol, idusuario } = req.usuario;
  if (!["trainer", "admin", "physio", "student"].includes(rol)) return [];
  let miAlumno = null;
  if (rol === "student") {
    const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [idusuario]);
    if (!u?.idalumno) return [];
    miAlumno = String(u.idalumno);
  }
  const filas = await consultar(
    `SELECT r.idregistro, r.datos, CONCAT(a.nombres, ' ', a.apellidos) AS nombre
       FROM registros_app r LEFT JOIN alumnos a ON a.idalumno = r.idalumno
      WHERE r.modulo = 'fisioterapia' ${miAlumno ? "AND r.idalumno = ?" : ""}`,
    miAlumno ? [miAlumno] : [],
  );
  const ultima = new Map();
  for (const f of filas) {
    const d = parsearDatos(f.datos);
    if (!d?.memberId) continue;
    const k = String(d.memberId);
    const clave = `${d.date || ""}${d.time || ""}`;
    if (!ultima.has(k) || clave > ultima.get(k).clave) ultima.set(k, { clave, d, nombre: f.nombre || d.memberName || "Alumno", id: f.idregistro });
  }
  const avisos = [];
  for (const [idAl, { d, nombre, id }] of ultima) {
    const [emo, txt] = EVOL[d.improvementStatus] || [];
    const fecha = String(d.date || hoy).slice(0, 10);
    if ((rol === "trainer" || rol === "admin") && ["recaida", "empeoramiento", "derivacion"].includes(d.improvementStatus) && fecha >= sumarDias(hoy, -14)) {
      avisos.push({
        id: `fisio-evol-${id}-${d.improvementStatus}`,
        tipo: "fisio_evolucion",
        nivel: "alto",
        titulo: `${emo} Fisioterapia: ${nombre} · ${txt}`,
        mensaje: "Revisa sus indicaciones de fisioterapia y ajusta la carga de su rutina.",
        fecha,
        accion: { tipo: "ir", tab: "routines" },
      });
    }
    if ((rol === "physio" || rol === "admin") && d.nextAppointmentDate && String(d.nextAppointmentDate).slice(0, 10) <= hoy && d.improvementStatus !== "alta") {
      avisos.push({
        id: `fisio-control-${id}`,
        tipo: "fisio_control",
        nivel: String(d.nextAppointmentDate).slice(0, 10) < hoy ? "alto" : "medio",
        titulo: `📅 Control pendiente: ${nombre}`,
        mensaje: `Su próximo control era el ${fBonita(String(d.nextAppointmentDate).slice(0, 10))}. Ábrelo con «Sesión de control».`,
        fecha: String(d.nextAppointmentDate).slice(0, 10),
        accion: { tipo: "ir", tab: "physiotherapy" },
      });
    }
    if (rol === "student" && txt && fecha >= sumarDias(hoy, -7)) {
      const bueno = ["notable_mejora", "mejora_moderada", "mejora_leve"].includes(d.improvementStatus);
      const malo = ["recaida", "empeoramiento", "derivacion"].includes(d.improvementStatus);
      if (!bueno && !malo && d.improvementStatus !== "alta") continue;
      avisos.push({
        id: `fisio-mio-${id}-${d.improvementStatus}`,
        tipo: "fisio_evolucion",
        nivel: malo ? "alto" : "medio",
        titulo: d.improvementStatus === "alta" ? "🏆 ¡Alta en fisioterapia!" : bueno ? `${emo} ¡Vas mejorando! ${txt}` : `${emo} Fisioterapia: ${txt}`,
        mensaje:
          d.improvementStatus === "alta"
            ? "Cumpliste tu objetivo de rehabilitación. ¡Felicitaciones!"
            : bueno
              ? `Tu dolor bajó a ${d.painLevelEVA ?? "—"}/10. Sigue con tus ejercicios en casa.`
              : "Sigue las indicaciones de tu fisioterapeuta y avisa a tu entrenador antes de entrenar.",
        fecha,
        accion: { tipo: "ir", tab: "mi_fisioterapia" },
      });
    }
  }
  return avisos;
}

router.get("/", async (req, res, next) => {
  try {
    const hoy = hoyLima();
    const grupos = await Promise.all([
      avisosClave(req).catch(() => []),
      avisosEntrenador(req, hoy),
      avisosAlumno(req, hoy),
      avisosProyeccion(req, hoy).catch(() => []),
      avisosLogrosEntrenador(req, hoy).catch(() => []),
      avisosRutinas(req, hoy).catch(() => []),
      avisosAgendaYCambios(req, hoy).catch((e) => (console.warn("[avisos agenda]", e.message), [])),
      avisosEvolucionFisio(req, hoy).catch((e) => (console.warn("[avisos fisio]", e.message), [])),
      avisosClases(req, hoy).catch((e) => (console.warn("[avisos clases]", e.message), [])),
    ]);
    res.json({ hoy, avisos: grupos.flat() });
  } catch (e) {
    next(e);
  }
});

// POST /api/avisos/clave/:id/restablecer -> contraseña del alumno = su DNI
router.post("/clave/:id/restablecer", async (req, res, next) => {
  try {
    const esAdmin = req.usuario.rol === "admin";
    if (!esAdmin && req.usuario.rol !== "reception") throw new ErrorHttp(403, "Solo recepción o administración pueden restablecer contraseñas");
    const [al] = await consultar(
      `SELECT al.idalerta, al.idalumno, a.dni, a.activo, CONCAT(a.nombres, ' ', a.apellidos) AS nombre, a.telefono
         FROM alertas_administracion al JOIN alumnos a ON a.idalumno = al.idalumno
        WHERE al.idalerta = ? AND al.tipo = 'olvido_clave' AND al.vista = 0`,
      [req.params.id],
    );
    if (!al) throw new ErrorHttp(404, "La solicitud ya fue atendida o no existe");
    if (!al.activo) throw new ErrorHttp(409, "El alumno está dado de baja");
    const cuenta = await crearOCambiarCuenta(null, al.idalumno, al.dni, req.usuario.idusuario);
    await consultar(
      "UPDATE alertas_administracion SET vista = 1, fecha_vista = NOW(), idusuario_vista = ? WHERE idalerta = ?",
      [req.usuario.idusuario, al.idalerta],
    );
    res.json({ ok: true, nombre: al.nombre, telefono: al.telefono || "", usuario: cuenta.usuario });
  } catch (e) {
    next(e);
  }
});

// POST /api/avisos/clave/:id/atendida -> se descarta sin restablecer (no era él, o ya se hizo)
router.post("/clave/:id/atendida", async (req, res, next) => {
  try {
    const esAdmin = req.usuario.rol === "admin";
    if (!esAdmin && req.usuario.rol !== "reception") throw new ErrorHttp(403, "Sin permiso");
    const r = await consultar(
      `UPDATE alertas_administracion SET vista = 1, fecha_vista = NOW(), idusuario_vista = ?
        WHERE idalerta = ? AND tipo = 'olvido_clave' AND vista = 0 ${esAdmin ? "" : "AND idalumno IS NOT NULL"}`,
      [req.usuario.idusuario, req.params.id],
    );
    if (!r.affectedRows) throw new ErrorHttp(404, "La solicitud ya fue atendida o no existe");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
