-- =====================================================================
-- 27. Metas y logros de nutrición y fisioterapia
--  * metas.tipo admite 'nutricion' y 'fisioterapia': administración le pone
--    a cada especialista una meta de logros (objetivos de alumnos cumplidos).
--  * objetivos_alumno.idespecialista: el nutricionista o fisioterapeuta que
--    puso el objetivo. Cuando se cumple, el logro es suyo (y del entrenador).
--  * objetivo_controles: cada nuevo control del alumno (peso, % de grasa,
--    masa muscular, dolor 0-10, grados...). Así se ve el avance aunque la
--    meta todavía no se cumpla (ej. dolor 7 -> 5).
-- Se puede ejecutar más de una vez. Ejecutar como root en MySQL Workbench.
-- =====================================================================
SET NAMES utf8mb4;
SET SQL_SAFE_UPDATES = 0;
USE gestion_radicalgym;

ALTER TABLE metas
  MODIFY COLUMN tipo ENUM('recepcion','entrenador','nutricion','fisioterapia') NOT NULL;

SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'objetivos_alumno' AND column_name = 'idespecialista');
SET @sql := IF(@falta, 'ALTER TABLE objetivos_alumno ADD COLUMN idespecialista INT NULL COMMENT ''Nutricionista o fisioterapeuta que puso el objetivo'' AFTER identrenador', 'SELECT 1');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'objetivos_alumno' AND constraint_name = 'fk_objetivo_especialista');
SET @sql := IF(@falta, 'ALTER TABLE objetivos_alumno ADD CONSTRAINT fk_objetivo_especialista FOREIGN KEY (idespecialista) REFERENCES empleados (idempleado) ON DELETE SET NULL', 'SELECT 1');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- Objetivos que ya existen: el especialista es quien lo creó (o quien lo evaluó)
UPDATE objetivos_alumno o
  LEFT JOIN usuarios u ON u.idusuario = o.creado_por
  LEFT JOIN empleados ec ON ec.idempleado = u.idempleado AND ec.cargo IN ('nutricionista','fisioterapeuta')
  LEFT JOIN empleados ev ON ev.idempleado = o.evaluado_por AND ev.cargo IN ('nutricionista','fisioterapeuta')
   SET o.idespecialista = COALESCE(ec.idempleado, ev.idempleado)
 WHERE o.idespecialista IS NULL;

CREATE TABLE IF NOT EXISTS objetivo_controles (
  idcontrol       INT AUTO_INCREMENT PRIMARY KEY,
  idobjetivo      INT           NOT NULL,
  fecha           DATE          NOT NULL,
  valor           DECIMAL(7,2)  NOT NULL COMMENT 'Mismo tipo de dato que el objetivo (kg, %, EVA 0-10, grados...)',
  observacion     VARCHAR(300)  NULL,
  idempleado      INT           NULL COMMENT 'Quién hizo el control',
  fecha_registro  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_control_objetivo (idobjetivo, fecha),
  CONSTRAINT fk_control_objetivo FOREIGN KEY (idobjetivo) REFERENCES objetivos_alumno (idobjetivo) ON DELETE CASCADE,
  CONSTRAINT fk_control_empleado FOREIGN KEY (idempleado) REFERENCES empleados (idempleado) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Controles intermedios de cada objetivo de alumno';

SELECT 'Actualización 27 lista' AS resultado,
       (SELECT COUNT(*) FROM objetivos_alumno WHERE idespecialista IS NOT NULL) AS objetivos_con_especialista,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'objetivo_controles') AS tabla_controles;
