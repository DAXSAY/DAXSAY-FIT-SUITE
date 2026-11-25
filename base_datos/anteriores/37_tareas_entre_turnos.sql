-- =====================================================================
-- 37 · Tareas entre turnos
-- Ejecutar UNA VEZ en MySQL Workbench (root). Se puede repetir sin problema.
--
-- Una tarea es algo que alguien del gimnasio debe hacer (llamar, cobrar,
-- avisar una renovación, armar una rutina...). Se dirige a:
--   turno   = a un turno de recepción (Mañana, Tarde, o los que se agreguen)
--   rol     = a todo un rol (entrenadores, fisioterapia, nutrición, recepción)
--   usuario = a una persona concreta
-- La primera persona que pulsa «Tomar» se queda con ella. Se puede pasar
-- a otro turno con un comentario o reprogramar; todo queda en el historial.
-- Las tareas automáticas llevan una «clave_auto» única: nunca se duplican
-- aunque varias pantallas estén abiertas a la vez.
-- Además: los turnos de recepción guardan su número de WhatsApp (opcional).
-- =====================================================================
USE gestion_radicalgym;
DELIMITER ;

CREATE TABLE IF NOT EXISTS tareas (
  idtarea            INT AUTO_INCREMENT PRIMARY KEY,
  tipo               VARCHAR(20)  NOT NULL DEFAULT 'otro',
  titulo             VARCHAR(160) NOT NULL,
  nota               VARCHAR(500) NULL,
  destino_tipo       ENUM('turno','rol','usuario') NOT NULL DEFAULT 'rol',
  idturno_recepcion  INT NULL,
  rol_codigo         VARCHAR(20)  NULL,
  idusuario_destino  INT NULL,
  idalumno           INT NULL,
  idprospecto        INT NULL,
  fecha              DATE NOT NULL,
  hora               TIME NULL,
  estado             ENUM('pendiente','en_curso','hecha','cancelada') NOT NULL DEFAULT 'pendiente',
  resultado          VARCHAR(500) NULL,
  origen             ENUM('manual','auto') NOT NULL DEFAULT 'manual',
  clave_auto         VARCHAR(80)  NULL,
  referencia         VARCHAR(40)  NULL,
  idusuario_creador  INT NULL,
  idusuario_tomada   INT NULL,
  tomada_en          DATETIME NULL,
  idusuario_cierre   INT NULL,
  cerrada_en         DATETIME NULL,
  cierre_auto        TINYINT(1) NOT NULL DEFAULT 0,
  reprogramaciones   INT NOT NULL DEFAULT 0,
  pases              INT NOT NULL DEFAULT 0,
  fecha_original     DATE NULL,
  creada_en          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tareas_clave_auto (clave_auto),
  KEY ix_tareas_fecha_estado (fecha, estado),
  KEY ix_tareas_alumno (idalumno),
  KEY ix_tareas_turno (idturno_recepcion),
  KEY ix_tareas_destino (idusuario_destino),
  CONSTRAINT fk_tareas_turno   FOREIGN KEY (idturno_recepcion) REFERENCES turnos_recepcion (idturno_recepcion) ON DELETE SET NULL,
  CONSTRAINT fk_tareas_alumno  FOREIGN KEY (idalumno)          REFERENCES alumnos (idalumno)                   ON DELETE CASCADE,
  CONSTRAINT fk_tareas_destino FOREIGN KEY (idusuario_destino) REFERENCES usuarios (idusuario)                 ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tarea_historial (
  idhistorial  INT AUTO_INCREMENT PRIMARY KEY,
  idtarea      INT NOT NULL,
  accion       VARCHAR(20)  NOT NULL,
  detalle      VARCHAR(500) NULL,
  idusuario    INT NULL,
  fecha        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_tarea_historial_tarea (idtarea),
  CONSTRAINT fk_tarea_historial_tarea FOREIGN KEY (idtarea) REFERENCES tareas (idtarea) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WhatsApp de cada turno (para el anuncio de renovación del portal del alumno)
SET @hay := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'turnos_recepcion' AND COLUMN_NAME = 'whatsapp');
SET @sql := IF(@hay = 0, 'ALTER TABLE turnos_recepcion ADD COLUMN whatsapp VARCHAR(20) NULL AFTER hora_fin', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Módulo «Tareas» en el catálogo (lo ve todo el personal)
INSERT INTO modulos (codigo, nombre, grupo, icono, orden, activo)
SELECT 'tasks', 'Tareas entre turnos', 'Operativo & Caja', 'ClipboardList', 92, 1
 WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE codigo = 'tasks');

INSERT INTO rol_permisos (idrol, idmodulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.idrol, m.idmodulo, 1, 1, 1, IF(r.codigo = 'admin', 1, 0)
  FROM roles r JOIN modulos m ON m.codigo = 'tasks'
 WHERE r.codigo IN ('admin','reception','trainer','physio','nutritionist')
   AND NOT EXISTS (SELECT 1 FROM rol_permisos rp WHERE rp.idrol = r.idrol AND rp.idmodulo = m.idmodulo);

SELECT 'Listo: tareas entre turnos y WhatsApp por turno' AS resultado;
