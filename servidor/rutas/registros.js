// =====================================================================
// Registros de los módulos (rutinas, dietas, fisioterapia, citas, etc.)
// Cada registro se guarda en MySQL en la tabla `registros_app` como JSON,
// con el alumno al que pertenece para poder filtrar (portal del alumno).
// =====================================================================
import { Router } from "express";
import { consultar, transaccion, enFila } from "../db.js";
import { ErrorHttp, tienePermiso } from "../seguridad.js";
import { huella } from "../huella.js";
import {
  sincronizar,
  eliminarSincronizado,
  sincronizacionActiva,
  sincronizarPendientes,
  detalleError,
  ORDEN_MODULOS,
} from "../sincronizacion.js";

const router = Router();

/**
 * modulo -> { permiso: módulo de la app que lo controla,
 *             lectura: módulos que también pueden verlo,
 *             alumno: campo que indica el alumno dueño,
 *             portal: si el alumno ve sus propios registros }
 */
const MODULOS = {
  ejercicios:          { permiso: "routines",      lectura: ["dashboard"] },
  rutinas:             { permiso: "routines",      lectura: ["dashboard", "members"], alumno: "targetStudentId", portal: true },
  asignaciones_rutina: { permiso: "routines",      lectura: ["dashboard", "members"], alumno: "memberId", portal: true, escritura: ["members"] },
  productos:           { permiso: "store",         lectura: ["dashboard", "finance"] },
  reglas_notificacion: { permiso: "alerts",        lectura: ["dashboard"] },
  notificaciones:      { permiso: "alerts",        lectura: ["dashboard"], escritura: ["members", "attendances", "store", "appointments"] },
  clases:              { permiso: "alerts",        lectura: ["dashboard", "attendances", "appointments"] },
  planes_nutricion:    { permiso: "nutrition",     lectura: ["dashboard"], alumno: "targetStudentId", portal: true },
  evaluaciones_corporales: { permiso: "nutrition", lectura: ["dashboard", "routines"], alumno: "memberId", portal: true },
  asistencias:         { permiso: "attendances",   lectura: ["dashboard", "members"], alumno: "memberId", portal: true },
  contratos:           { permiso: "staff",         lectura: ["finance"] },
  planilla:            { permiso: "staff",         lectura: ["finance"], escritura: ["finance"] },
  fisioterapia:        { permiso: "physiotherapy", lectura: ["dashboard"], alumno: "memberId", portal: true },
  plantillas_fisioterapia: { permiso: "physiotherapy", lectura: [] },
  permisos:            { permiso: "attendances",   lectura: ["staff", "dashboard"], escritura: ["staff"] },
  // Horario de atención de fisioterapia y nutrición (lo editan admin, fisio y nutri; recepción lo ve)
  agenda_especialistas: { permiso: "physiotherapy", lectura: ["appointments", "dashboard", "routines", "members"], escritura: ["nutrition"] },
  // Alumnos "por programar" (falta rutina, nutrición o fisioterapia): aviso para el área que corresponde
  programados:         { permiso: "members",       lectura: ["dashboard", "alerts", "appointments", "routines", "nutrition", "physiotherapy"], escritura: ["routines", "nutrition", "physiotherapy", "appointments", "alerts"] },
  citas:               { permiso: "appointments",  lectura: ["dashboard", "physiotherapy", "nutrition"], alumno: "memberId", portal: true },
};

const MAX_BYTES = 900 * 1024; // un registro no debe superar ~900 KB

function validarModulo(m) {
  const cfg = MODULOS[m];
  if (!cfg) throw new ErrorHttp(404, "Módulo de datos desconocido");
  return cfg;
}

/** Id del alumno dueño del registro (solo si existe en la tabla alumnos) */
async function alumnoDe(cfg, datos) {
  if (!cfg.alumno) return null;
  const v = datos?.[cfg.alumno];
  if (v === undefined || v === null || !/^\d+$/.test(String(v))) return null;
  const [a] = await consultar("SELECT idalumno FROM alumnos WHERE idalumno = ?", [Number(v)]);
  return a ? a.idalumno : null;
}

async function idAlumnoDelUsuario(idusuario) {
  const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [idusuario]);
  return u?.idalumno || null;
}

const parsear = (fila) => (typeof fila.datos === "string" ? JSON.parse(fila.datos) : fila.datos);

// Registros borrados (para que las demás pantallas sepan qué quitar sin
// volver a descargar todo). Se crea sola si no existe.
let tablaBorrados = null;
let motivoSinBorrados = null;
async function asegurarBorrados() {
  if (tablaBorrados !== null) return tablaBorrados;
  try {
    // Si ya existe (script 34) basta con leerla: el usuario de la app no necesita permiso CREATE
    try {
      await consultar("SELECT 1 FROM registros_borrados LIMIT 1");
      tablaBorrados = true;
      return true;
    } catch {
      /* no existe: se intenta crear */
    }
    await consultar(`CREATE TABLE IF NOT EXISTS registros_borrados (
      modulo VARCHAR(40) NOT NULL, idregistro VARCHAR(64) NOT NULL,
      fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (modulo, idregistro), INDEX idx_borrados_fecha (fecha)) ENGINE=InnoDB`);
    tablaBorrados = true;
  } catch (e) {
    console.warn("[registros] sin tabla de borrados, se usará la carga completa:", e.message);
    motivoSinBorrados = `${e.code || ""} ${e.message}`;
    tablaBorrados = false;
    setTimeout(() => (tablaBorrados = null), 5 * 60_000); // se vuelve a intentar en 5 min
  }
  return tablaBorrados;
}
asegurarBorrados();

// GET /api/registros  -> todos los módulos que el usuario puede ver
//   { modulo: { registros: [...], editar: bool } }
router.get("/", async (req, res, next) => {
  try {
    const { idusuario, rol } = req.usuario;
    const salida = {};

    if (rol === "student") {
      const idalumno = await idAlumnoDelUsuario(idusuario);
      for (const [m, cfg] of Object.entries(MODULOS)) {
        if (!cfg.portal) continue;
        salida[m] = { registros: [], editar: false };
      }
      if (!idalumno) return res.json(salida);

      const filas = await consultar(
        "SELECT modulo, datos FROM registros_app WHERE idalumno = ? ORDER BY fecha_creacion",
        [idalumno],
      );
      filas.forEach((f) => salida[f.modulo] && salida[f.modulo].registros.push(parsear(f)));

      // Rutinas generales (plantillas) que le fueron asignadas
      const asignadas = salida.asignaciones_rutina.registros.map((a) => String(a.routineId)).filter(Boolean);
      const propias = new Set(salida.rutinas.registros.map((r) => String(r.id)));
      const faltan = asignadas.filter((id) => !propias.has(id));
      if (faltan.length) {
        const marcas = faltan.map(() => "?").join(",");
        const extra = await consultar(
          `SELECT datos FROM registros_app WHERE modulo = 'rutinas' AND idregistro IN (${marcas})`,
          faltan,
        );
        extra.forEach((f) => salida.rutinas.registros.push(parsear(f)));
      }
      // Horario de atención de fisioterapia y nutrición: el alumno lo ve para reservar
      const agenda = await consultar("SELECT datos FROM registros_app WHERE modulo = 'agenda_especialistas'");
      salida.agenda_especialistas = { registros: agenda.map(parsear), editar: false };
      return res.json(salida);
    }

    // ?desde=AAAA-MM-DD HH:MM:SS -> solo lo que cambió (y lo borrado) desde esa hora
    const [{ ahora }] = await consultar("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') AS ahora");
    salida._hora = ahora;
    if (req.query.desde) salida._parcial = { activa: !!(await asegurarBorrados()), motivo: motivoSinBorrados };
    const desde = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(req.query.desde || "")) && (await asegurarBorrados()) ? req.query.desde : null;
    for (const [m, cfg] of Object.entries(MODULOS)) {
      const puedeVer = await tienePermiso(idusuario, [cfg.permiso, ...(cfg.lectura || [])], "ver");
      if (!puedeVer) continue;
      const editar =
        (await tienePermiso(idusuario, [cfg.permiso, ...(cfg.escritura || [])], "crear")) ||
        (await tienePermiso(idusuario, [cfg.permiso, ...(cfg.escritura || [])], "editar"));
      if (desde) {
        // 5 s de margen por si dos guardados caen en el mismo segundo
        const filas = await consultar(
          "SELECT datos FROM registros_app WHERE modulo = ? AND fecha_actualizacion >= DATE_SUB(?, INTERVAL 5 SECOND) ORDER BY fecha_creacion",
          [m, desde],
        );
        const borrados = await consultar(
          "SELECT idregistro FROM registros_borrados WHERE modulo = ? AND fecha >= DATE_SUB(?, INTERVAL 5 SECOND)",
          [m, desde],
        );
        salida[m] = { registros: filas.map(parsear), borrados: borrados.map((b) => b.idregistro), editar, parcial: true };
        continue;
      }
      const filas = await consultar(
        "SELECT datos FROM registros_app WHERE modulo = ? ORDER BY fecha_creacion",
        [m],
      );
      salida[m] = { registros: filas.map(parsear), editar };
    }
    // Quien no ve los contratos igual puede ver EL SUYO (por su DNI de empleado)
    if (!salida.contratos) {
      const [emp] = await consultar(
        "SELECT e.dni FROM usuarios u JOIN empleados e ON e.idempleado = u.idempleado WHERE u.idusuario = ?",
        [idusuario],
      );
      if (emp?.dni) {
        const filas = await consultar(
          "SELECT datos FROM registros_app WHERE modulo = 'contratos' AND JSON_UNQUOTE(JSON_EXTRACT(datos, '$.dni')) = ?",
          [String(emp.dni)],
        );
        salida.mis_contratos = { registros: filas.map(parsear), editar: false };
      }
    }
    res.json(salida);
  } catch (e) {
    next(e);
  }
});

// GET /api/registros/sincronizacion  -> estado de la copia a las tablas (admin)
router.get("/sincronizacion", async (req, res, next) => {
  try {
    if (!(await tienePermiso(req.usuario.idusuario, "users", "ver"))) throw new ErrorHttp(403, "Solo administración");
    if (!sincronizacionActiva()) return res.json({ activa: false, modulos: [], errores: [] });
    const filas = await consultar(
      "SELECT modulo, sync_estado AS estado, COUNT(*) AS n FROM registros_app GROUP BY modulo, sync_estado",
    );
    const modulos = ORDEN_MODULOS.map((m) => {
      const fila = { modulo: m, ok: 0, pendiente: 0, error: 0 };
      filas.filter((f) => f.modulo === m).forEach((f) => (fila[f.estado] = Number(f.n)));
      return fila;
    });
    const errores = await consultar(
      `SELECT modulo, idregistro, sync_detalle AS detalle, sync_fecha AS fecha
         FROM registros_app WHERE sync_estado = 'error' ORDER BY sync_fecha DESC LIMIT 50`,
    );
    res.json({ activa: true, modulos, errores });
  } catch (e) {
    next(e);
  }
});

// POST /api/registros/sincronizacion  -> vuelve a copiar pendientes y errores (admin)
router.post("/sincronizacion", async (req, res, next) => {
  try {
    if (!(await tienePermiso(req.usuario.idusuario, "users", "editar"))) throw new ErrorHttp(403, "Solo administración");
    if (!sincronizacionActiva()) {
      throw new ErrorHttp(400, "Falta ejecutar base_datos/07_sincronizacion_tablas.sql y reiniciar la API");
    }
    res.json(await sincronizarPendientes({ incluirErrores: true }));
  } catch (e) {
    next(e);
  }
});

// PUT /api/registros/:modulo/:id  { datos }  -> crea o actualiza
const guardarRegistro = async (req, res, next) => {
  try {
    if (req.usuario.rol === "student") throw new ErrorHttp(403, "El alumno solo puede consultar sus datos");
    const cfg = validarModulo(req.params.modulo);
    const id = String(req.params.id).slice(0, 64);
    const datos = req.body?.datos;
    if (!datos || typeof datos !== "object") throw new ErrorHttp(400, "Faltan los datos del registro");
    if (String(datos.id) !== id) throw new ErrorHttp(400, "El id del registro no coincide");

    const [existe] = await consultar(
      "SELECT datos FROM registros_app WHERE modulo = ? AND idregistro = ?",
      [req.params.modulo, id],
    );
    // Varias sesiones a la vez: si otra persona cambió el registro desde que
    // esta pantalla lo cargó, no se pisa; se devuelve la versión actual.
    const huellaPrevia = req.body?.huellaPrevia;
    if (existe && huellaPrevia) {
      const actual = parsear(existe);
      if (huella(actual) !== huellaPrevia && huella(actual) !== huella(datos)) {
        return res.status(409).json({ error: "Otra persona modificó este registro hace un momento.", actual });
      }
    }
    const modulosPermiso = [cfg.permiso, ...(cfg.escritura || [])];
    if (!(await tienePermiso(req.usuario.idusuario, modulosPermiso, existe ? "editar" : "crear"))) {
      throw new ErrorHttp(403, "No tienes permiso para guardar en este módulo");
    }

    const json = JSON.stringify(datos);
    if (Buffer.byteLength(json) > MAX_BYTES) throw new ErrorHttp(413, "El registro es demasiado grande");
    const idalumno = await alumnoDe(cfg, datos);

    const modulo = req.params.modulo;
    const sync = await transaccion(async (cx) => {
      await cx.execute(
        `INSERT INTO registros_app (modulo, idregistro, idalumno, datos, creado_por, actualizado_por)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE idalumno = VALUES(idalumno), datos = VALUES(datos),
                                 actualizado_por = VALUES(actualizado_por)`,
        [modulo, id, idalumno, json, req.usuario.idusuario, req.usuario.idusuario],
      );
      if (!sincronizacionActiva()) return null;
      // Copia en su tabla real (citas, rutinas, dietas...). Si la base rechaza
      // por una regla del negocio (p. ej. cruce de citas), no se guarda nada.
      await cx.query("SAVEPOINT copia_tabla");
      try {
        await sincronizar(cx, modulo, id, datos);
        await cx.execute(
          "UPDATE registros_app SET sync_estado = 'ok', sync_detalle = NULL, sync_fecha = NOW() WHERE modulo = ? AND idregistro = ?",
          [modulo, id],
        );
        return "ok";
      } catch (e) {
        if (e.sqlState === "45000") throw e;
        await cx.query("ROLLBACK TO SAVEPOINT copia_tabla");
        await cx.execute(
          "UPDATE registros_app SET sync_estado = 'error', sync_detalle = ?, sync_fecha = NOW() WHERE modulo = ? AND idregistro = ?",
          [detalleError(e), modulo, id],
        );
        console.warn(`[sincronización] ${modulo}/${id}: ${detalleError(e)}`);
        return "error";
      }
    });
    res.json({ ok: true, sincronizado: sync });
  } catch (e) {
    next(e);
  }
};
// Los guardados de un mismo registro se hacen uno tras otro: así la
// comparación de huellas nunca se cruza entre dos pantallas.
router.put("/:modulo/:id", (req, res, next) => enFila(`reg:${req.params.modulo}:${req.params.id}`, () => guardarRegistro(req, res, next)));

// DELETE /api/registros/:modulo/:id
const borrarRegistro = async (req, res, next) => {
  try {
    if (req.usuario.rol === "student") throw new ErrorHttp(403, "El alumno solo puede consultar sus datos");
    const cfg = validarModulo(req.params.modulo);
    if (!(await tienePermiso(req.usuario.idusuario, [cfg.permiso, ...(cfg.escritura || [])], "eliminar"))) {
      // Quien puede editar también puede quitar sus registros (ej. asignaciones)
      if (!(await tienePermiso(req.usuario.idusuario, [cfg.permiso, ...(cfg.escritura || [])], "editar"))) {
        throw new ErrorHttp(403, "No tienes permiso para eliminar en este módulo");
      }
    }
    const modulo = req.params.modulo;
    const id = String(req.params.id).slice(0, 64);
    await transaccion(async (cx) => {
      if (sincronizacionActiva()) {
        await cx.query("SAVEPOINT quitar_tabla");
        try {
          await eliminarSincronizado(cx, modulo, id);
        } catch (e) {
          await cx.query("ROLLBACK TO SAVEPOINT quitar_tabla");
          console.warn(`[sincronización] no se pudo quitar ${modulo}/${id}: ${detalleError(e)}`);
        }
      }
      await cx.execute("DELETE FROM registros_app WHERE modulo = ? AND idregistro = ?", [modulo, id]);
    });
    if (await asegurarBorrados()) {
      await consultar("REPLACE INTO registros_borrados (modulo, idregistro, fecha) VALUES (?, ?, NOW())", [modulo, id]).catch(() => {});
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
router.delete("/:modulo/:id", (req, res, next) => enFila(`reg:${req.params.modulo}:${req.params.id}`, () => borrarRegistro(req, res, next)));

export default router;
