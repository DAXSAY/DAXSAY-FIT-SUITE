// Actualizaciones de la base que el servidor aplica solo al iniciar (si faltan).
// Son las mismas de base_datos/anteriores/22_pase_con_nombre.sql y 23_pases_libres.sql:
// así el sistema queda al día aunque nadie ejecute el script en Workbench.
// Todo es idempotente: si ya está aplicado, no hace nada.
import { consultar, pool } from "./db.js";

async function existeTabla(nombre) {
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [nombre],
  );
  return Number(f?.n) > 0;
}

async function largoColumna(tabla, columna) {
  const [f] = await consultar(
    `SELECT CHARACTER_MAXIMUM_LENGTH AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tabla, columna],
  );
  return f ? Number(f.n) : null;
}

const CREAR_PASES = `
CREATE TABLE IF NOT EXISTS pases_libres (
  idpase              INT AUTO_INCREMENT PRIMARY KEY,
  idprospecto         INT          NOT NULL,
  codigo              VARCHAR(24)  NOT NULL,
  fecha_visita        DATE         NOT NULL,
  hora_visita         TIME         NULL,
  estado              ENUM('pendiente','usado','no_concretado') NOT NULL DEFAULT 'pendiente',
  motivo_tipo         VARCHAR(30)  NULL,
  motivo              VARCHAR(300) NULL,
  volver_a_llamar     DATE         NULL,
  reprogramaciones    INT          NOT NULL DEFAULT 0,
  usado_en            DATETIME     NULL,
  cerrado_en          DATETIME     NULL,
  idusuario_registro  INT          NULL,
  idusuario_cierre    INT          NULL,
  fecha_registro      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pase_prospecto (idprospecto),
  KEY ix_pase_estado (estado, fecha_visita),
  KEY ix_pase_codigo (codigo),
  CONSTRAINT fk_pase_prospecto FOREIGN KEY (idprospecto) REFERENCES prospectos (idprospecto) ON DELETE CASCADE,
  CONSTRAINT fk_pase_usuario   FOREIGN KEY (idusuario_registro) REFERENCES usuarios (idusuario) ON DELETE SET NULL,
  CONSTRAINT fk_pase_cierre    FOREIGN KEY (idusuario_cierre)   REFERENCES usuarios (idusuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CRM: pases libres entregados y su resultado'`;

const RELLENAR_PASES = `
INSERT INTO pases_libres (idprospecto, codigo, fecha_visita, hora_visita, estado, usado_en, fecha_registro)
SELECT p.idprospecto, p.pase_codigo, p.pase_fecha,
       IF(p.contacto_fecha = p.pase_fecha, p.contacto_hora, NULL),
       IF(p.pase_usado_en IS NOT NULL, 'usado', IF(p.estado = 'de_baja', 'no_concretado', 'pendiente')),
       p.pase_usado_en, p.fecha_actualizacion
  FROM prospectos p
 WHERE p.pase_codigo IS NOT NULL AND p.pase_fecha IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM pases_libres x WHERE x.codigo = p.pase_codigo)`;

async function existeColumna(tabla, columna) {
  const [f] = await consultar(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [tabla, columna],
  );
  return Number(f?.n) > 0;
}

// ===== Renovaciones y exalumnos (script 24) =====
// Cada matrícula guarda cómo entró el alumno:
//   nuevo      = primera vez en el gimnasio
//   renovacion = renovó antes de cumplir el plazo de exalumno (al día siguiente, a la semana…)
//   reingreso  = exalumno recuperado: volvió después del plazo (2, 6, 12 meses…)
// El plazo lo fija gerencia en configuración (dias_exalumno, 30 por defecto).
export const VISTA_ESTADO_ALUMNOS = `
CREATE OR REPLACE VIEW v_estado_alumnos AS
SELECT a.idalumno, a.codigo, a.dni, CONCAT_WS(' ', a.nombres, a.apellidos) AS alumno, a.activo,
       u.fecha_fin AS vence,
       DATEDIFF(CURDATE(), u.fecha_fin) AS dias_vencido,
       CAST(IFNULL((SELECT c.valor FROM configuracion c WHERE c.clave = 'dias_exalumno'), '30') AS UNSIGNED) AS plazo_exalumno,
       CASE
         WHEN u.fecha_fin IS NULL THEN 'sin_matricula'
         WHEN u.fecha_fin >= CURDATE() + INTERVAL 8 DAY THEN 'activo'
         WHEN u.fecha_fin >= CURDATE() THEN 'por_vencer'
         WHEN DATEDIFF(CURDATE(), u.fecha_fin) <= CAST(IFNULL((SELECT c.valor FROM configuracion c WHERE c.clave = 'dias_exalumno'), '30') AS UNSIGNED) THEN 'vencido'
         ELSE 'exalumno'
       END AS estado
  FROM alumnos a
  LEFT JOIN (SELECT idalumno, MAX(fecha_fin) AS fecha_fin FROM matriculas WHERE estado <> 'anulada' GROUP BY idalumno) u
         ON u.idalumno = a.idalumno`;

/** Cómo entra una matrícula según el fin de la anterior y el plazo de exalumno */
export function tipoIngreso(finAnterior, inicio, plazo) {
  if (!finAnterior) return { tipo: "nuevo", dias: null };
  // vencido = días desde que venció (el mismo número que ve recepción: «venció hace N días»)
  const vencido = Math.round((new Date(`${String(inicio).slice(0, 10)}T12:00:00Z`) - new Date(`${String(finAnterior).slice(0, 10)}T12:00:00Z`)) / 86400000);
  return { tipo: vencido > plazo ? "reingreso" : "renovacion", dias: Math.max(0, vencido - 1) };
}

// true cuando la base ya tiene las columnas de tipo de ingreso (script 36)
export const soporte = { tipoIngreso: false };

async function actualizarRenovaciones(hechos) {
  if (!(await existeTabla("matriculas"))) return;
  try {
    await aplicarRenovaciones(hechos);
  } catch (e) {
    console.error(`No se pudo preparar «renovaciones y exalumnos» (${e.code || e.message}). Ejecuta en Workbench la parte 36 de base_datos/gestion_radicalgym.sql.`);
  }
  soporte.tipoIngreso = await existeColumna("matriculas", "tipo_ingreso");
}

async function aplicarRenovaciones(hechos) {
  await pool.query(
    `INSERT IGNORE INTO configuracion (clave, valor, descripcion)
     VALUES ('dias_exalumno', '30', 'Días sin renovar para que un alumno cuente como exalumno (gerencia)')`,
  );
  if (!(await existeColumna("matriculas", "tipo_ingreso"))) {
    await pool.query(
      `ALTER TABLE matriculas
         ADD COLUMN tipo_ingreso ENUM('nuevo','renovacion','reingreso') NOT NULL DEFAULT 'nuevo'
             COMMENT 'nuevo = primera vez · renovacion = volvió dentro del plazo · reingreso = exalumno recuperado' AFTER es_renovacion,
         ADD COLUMN dias_sin_membresia SMALLINT NULL
             COMMENT 'Días que estuvo sin membresía antes de esta matrícula (0 = sin pausa)' AFTER tipo_ingreso`,
    );
    // Se clasifican las matrículas que ya existían, alumno por alumno y en orden
    const [[cfg]] = await pool.query("SELECT valor FROM configuracion WHERE clave = 'dias_exalumno'");
    const plazo = Number(cfg?.valor) || 30;
    const [filas] = await pool.query(
      `SELECT idmatricula, idalumno, DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS ini, DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fin
         FROM matriculas WHERE estado <> 'anulada' ORDER BY idalumno, fecha_inicio, idmatricula`,
    );
    const finDe = new Map();
    for (const f of filas) {
      const { tipo, dias } = tipoIngreso(finDe.get(f.idalumno), f.ini, plazo);
      await pool.query("UPDATE matriculas SET tipo_ingreso = ?, dias_sin_membresia = ?, es_renovacion = ? WHERE idmatricula = ?", [tipo, dias, tipo === "nuevo" ? 0 : 1, f.idmatricula]);
      const prev = finDe.get(f.idalumno);
      if (f.fin && (!prev || f.fin > prev)) finDe.set(f.idalumno, f.fin);
    }
    hechos.push(`matriculas: tipo de ingreso (nuevo / renovación / exalumno recuperado) en ${filas.length} matrículas (script 24)`);
  }
  await pool.query(VISTA_ESTADO_ALUMNOS).catch(() => {}); // la vista la crea el script 36 si el usuario no tiene permiso
}

/** Aplica lo que falte. Devuelve la lista de cambios hechos. */
export async function aplicarActualizaciones() {
  const hechos = [];
  await actualizarRenovaciones(hechos);
  if (!soporte.tipoIngreso) hechos.push("Falta la parte 36 (renovaciones y exalumnos): ejecútala en Workbench");
  if (!(await existeTabla("prospectos"))) return hechos; // falta el script 20: no hay CRM todavía
  const largo = await largoColumna("prospectos", "pase_codigo");
  if (largo != null && largo < 24) {
    await pool.query("ALTER TABLE prospectos MODIFY COLUMN pase_codigo VARCHAR(24) NULL COMMENT 'Código del pase libre / invitación (NOMBRE-XXXXX)'");
    hechos.push("prospectos.pase_codigo ampliado a 24 (script 22)");
  }
  if (!(await existeTabla("pases_libres"))) {
    await pool.query(CREAR_PASES);
    hechos.push("tabla pases_libres creada (script 23)");
  }
  const [r] = await pool.query(RELLENAR_PASES);
  if (r.affectedRows) hechos.push(`${r.affectedRows} pases anteriores copiados a pases_libres`);
  return hechos;
}
