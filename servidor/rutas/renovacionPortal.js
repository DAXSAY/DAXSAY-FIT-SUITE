// =====================================================================
// ANUNCIO DE RENOVACIÓN EN EL PORTAL DEL ALUMNO
// Cuando a un alumno le quedan 2 días o menos, o su plan ya venció (o es
// exalumno), su portal le muestra un anuncio a pantalla completa con los
// planes vigentes de «Planes y tarifas». Al elegir uno:
//  - se abre WhatsApp con un mensaje listo al número del turno de
//    recepción que está atendiendo en ese momento (fuera de horario, al de
//    administración);
//  - se crea (o se actualiza) una tarea de renovación para ese turno: la
//    primera persona que pulsa «Tomar» se queda con ella y se cierra sola
//    cuando se registra la renovación. Las tareas que nacen del anuncio
//    llevan referencia = 'portal' para contarlas en el reporte.
// =====================================================================
import { Router } from "express";
import { consultar } from "../db.js";
import { ErrorHttp } from "../seguridad.js";
import { hoyLima } from "../congelamiento.js";
import { codigoAlumno } from "../codigoAlumno.js";
import { situacionAlumno } from "./alumnos.js";
import { tablasListas, historial, columnaWhatsappTurno, nombreCortoTurno, horaLima } from "./tareas.js";

const router = Router();
const DIAS_AVISO = 2;
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);
const soloDigitos = (v) => String(v || "").replace(/\D/g, "");
const numeroWa = (v) => {
  const d = soloDigitos(v);
  if (d.length < 9) return null;
  return d.length === 9 ? `51${d}` : d;
};

async function miAlumno(req) {
  if (req.usuario.rol !== "student") throw new ErrorHttp(403, "Solo para alumnos");
  const [u] = await consultar(
    `SELECT a.idalumno, a.codigo, a.nombres, a.apellidos,
            (SELECT MAX(m.fecha_fin) FROM matriculas m WHERE m.idalumno = a.idalumno AND m.estado <> 'anulada') AS fin,
            (SELECT p.nombre FROM matriculas m JOIN planes p ON p.idplan = m.idplan
              WHERE m.idalumno = a.idalumno AND m.estado <> 'anulada' ORDER BY m.fecha_fin DESC LIMIT 1) AS plan_actual
       FROM usuarios u JOIN alumnos a ON a.idalumno = u.idalumno WHERE u.idusuario = ?`,
    [req.usuario.idusuario],
  );
  if (!u) throw new ErrorHttp(404, "Tu cuenta no está vinculada a un alumno");
  return u;
}

/** A quién se escribe ahora: el turno de recepción abierto (con su WhatsApp) o administración */
async function contactoActual() {
  const wa = await columnaWhatsappTurno();
  const ahora = horaLima();
  const turnos = await consultar(
    `SELECT idturno_recepcion, nombre, hora_inicio, hora_fin${wa ? ", whatsapp" : ""} FROM turnos_recepcion WHERE activo = 1 ORDER BY hora_inicio`,
  );
  const turno = turnos.find((t) => t.hora_inicio && t.hora_fin && String(t.hora_inicio).slice(0, 5) <= ahora && ahora < String(t.hora_fin).slice(0, 5)) || null;
  const cfg = Object.fromEntries((await consultar("SELECT clave, valor FROM configuracion WHERE clave IN ('admin_whatsapp','gym_whatsapp','gym_nombre')")).map((c) => [c.clave, c.valor]));
  const delTurno = turno ? numeroWa(turno.whatsapp) : null;
  const admin = numeroWa(cfg.admin_whatsapp) || numeroWa(cfg.gym_whatsapp);
  return {
    turno,
    numero: delTurno || admin,
    aQuien: delTurno ? `Turno ${nombreCortoTurno(turno.nombre)}` : turno ? "Recepción" : "Administración",
    fueraDeHorario: !turno,
    gimnasio: cfg.gym_nombre || "el gimnasio",
  };
}

function estadoAnuncio(fin, plazo) {
  const hoy = hoyLima();
  if (!fin) return null;
  const f = String(fin).slice(0, 10);
  const s = situacionAlumno(f, plazo);
  const quedan = diasEntre(hoy, f);
  if (s.memberState === "exalumno") return { tipo: "exalumno", dias: s.daysExpired, vence: f };
  if (s.memberState === "vencido") return { tipo: "vencido", dias: s.daysExpired, vence: f };
  if (quedan >= 0 && quedan <= DIAS_AVISO) return { tipo: "por_vencer", dias: quedan, vence: f };
  return null;
}

// GET /api/portal-renovacion -> ¿mostrar el anuncio? + planes + a quién se escribe
router.get("/", async (req, res, next) => {
  try {
    const al = await miAlumno(req);
    const [p] = await consultar("SELECT valor FROM configuracion WHERE clave = 'dias_exalumno'");
    const estado = estadoAnuncio(al.fin, Number(p?.valor) || 30);
    if (!estado) return res.json({ mostrar: false });
    const [planes, c] = await Promise.all([consultar("SELECT * FROM planes WHERE activo = 1 ORDER BY precio"), contactoActual()]);
    res.json({
      mostrar: true,
      ...estado,
      nombre: al.nombres,
      planActual: al.plan_actual || "",
      gimnasio: c.gimnasio,
      contacto: { aQuien: c.aQuien, fueraDeHorario: c.fueraDeHorario, hayNumero: !!c.numero },
      planes: planes.map((f) => ({
        id: String(f.idplan),
        nombre: f.nombre,
        precio: Number(f.precio),
        dias: f.duracion_dias > 0 ? f.duracion_dias : f.duracion_meses * 30,
        descripcion: f.descripcion || "",
        destacado: !!f.destacado,
        color: f.color || "",
        incluye: [f.incluye_entrenador && "Entrenador", f.incluye_nutricion && "Nutrición", f.incluye_fisioterapia && "Fisioterapia"].filter(Boolean),
        caracteristicas: f.caracteristicas ? f.caracteristicas.split("|").filter(Boolean).slice(0, 4) : [],
        actual: f.nombre === al.plan_actual,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/portal-renovacion/solicitud { planId } -> tarea para recepción + enlace de WhatsApp
router.post("/solicitud", async (req, res, next) => {
  try {
    const al = await miAlumno(req);
    const [plan] = await consultar("SELECT idplan, nombre, precio FROM planes WHERE idplan = ? AND activo = 1", [Number(req.body?.planId) || 0]);
    if (!plan) throw new ErrorHttp(400, "Elige uno de los planes vigentes");
    const c = await contactoActual();
    const nombre = `${al.nombres} ${al.apellidos}`.trim();
    const codigo = codigoAlumno(al.codigo, al.nombres, al.apellidos);
    const precio = Number(plan.precio).toFixed(2);
    const texto = `Hola, soy ${nombre} (${codigo}). Quiero renovar con el plan ${plan.nombre} (S/ ${precio}). ¿Me ayudan, por favor?`;

    let tarea = null;
    if (await tablasListas()) {
      const hoy = hoyLima();
      const nota = `🔔 Eligió el plan ${plan.nombre} (S/ ${precio}) en el anuncio del portal y escribió por WhatsApp a ${c.aQuien}. Confírmale y registra su renovación: la tarea se cierra sola.`;
      const destino = c.turno ? { tipo: "turno", turno: c.turno.idturno_recepcion, rol: null } : { tipo: "rol", turno: null, rol: "reception" };
      // Si ya hay una tarea de renovación abierta para el alumno, se actualiza (no se duplica)
      const [abierta] = await consultar(
        "SELECT idtarea FROM tareas WHERE idalumno = ? AND tipo = 'renovacion' AND estado IN ('pendiente','en_curso') ORDER BY idtarea DESC LIMIT 1",
        [al.idalumno],
      );
      if (abierta) {
        await consultar(
          `UPDATE tareas SET titulo = ?, nota = ?, referencia = 'portal', fecha = ?, hora = NULL,
                  destino_tipo = IF(idusuario_tomada IS NULL, ?, destino_tipo),
                  idturno_recepcion = IF(idusuario_tomada IS NULL, ?, idturno_recepcion),
                  rol_codigo = IF(idusuario_tomada IS NULL, ?, rol_codigo)
            WHERE idtarea = ?`,
          [`Quiere renovar: ${nombre}`.slice(0, 160), nota, hoy, destino.tipo, destino.turno, destino.rol, abierta.idtarea],
        );
        await historial(abierta.idtarea, "comentario", `Desde el portal: eligió ${plan.nombre} (S/ ${precio})`, null);
        tarea = String(abierta.idtarea);
      } else {
        const r = await consultar(
          `INSERT IGNORE INTO tareas (tipo, titulo, nota, destino_tipo, idturno_recepcion, rol_codigo, idalumno, fecha, origen, clave_auto, referencia)
           VALUES ('renovacion', ?, ?, ?, ?, ?, ?, ?, 'auto', ?, 'portal')`,
          [`Quiere renovar: ${nombre}`.slice(0, 160), nota, destino.tipo, destino.turno, destino.rol, al.idalumno, hoy, `portal:${al.idalumno}:${hoy}:${plan.idplan}`],
        );
        if (r.affectedRows) {
          await historial(r.insertId, "creada", `El alumno la pidió desde el anuncio del portal: ${plan.nombre} (S/ ${precio})`, null);
          tarea = String(r.insertId);
        }
      }
    }
    res.json({
      ok: true,
      tarea,
      aQuien: c.aQuien,
      fueraDeHorario: c.fueraDeHorario,
      whatsapp: c.numero ? `https://wa.me/${c.numero}?text=${encodeURIComponent(texto)}` : null,
      mensaje: texto,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
