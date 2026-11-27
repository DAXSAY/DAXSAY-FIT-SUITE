-- =====================================================================
-- 40 · Másters en caja, porcentaje del gimnasio y tareas con prioridad
-- Ejecutar UNA VEZ en MySQL Workbench (root). Se puede repetir sin problema.
--
--  - movimientos_caja: categoría «master» (lo que se cobra en los másters
--    entra a Ingresos y al arqueo del turno; el pago al profesor sale como
--    egreso de la misma categoría).
--  - masters: % del gimnasio (el resto es del profesor) y pago al profesor.
--  - configuracion: pct_gym_masters (% por defecto, editable).
--  - tareas: prioridad (normal / urgente).
--  - módulo «tasks» se llama ahora «Asignación de tareas».
-- =====================================================================
USE gestion_radicalgym;
SET NAMES utf8mb4;

ALTER TABLE movimientos_caja MODIFY categoria ENUM('matricula','pase_dia','venta','entrenamiento_personal','fisioterapia','nutricion','insumos','sueldo','mantenimiento','servicios','alquiler','marketing','averia_equipo','otros','master') NOT NULL;

DROP PROCEDURE IF EXISTS sp_parte40_columnas;
DELIMITER $$
CREATE PROCEDURE sp_parte40_columnas()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'masters' AND COLUMN_NAME = 'pct_gym') THEN
    ALTER TABLE masters ADD COLUMN pct_gym DECIMAL(5,2) NOT NULL DEFAULT 50 COMMENT '% de lo recaudado para el gimnasio; el resto es del profesor' AFTER precio_publico;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'masters' AND COLUMN_NAME = 'pagado_profesor') THEN
    ALTER TABLE masters ADD COLUMN pagado_profesor DECIMAL(10,2) NULL COMMENT 'Monto entregado al profesor' AFTER pct_gym,
                        ADD COLUMN pagado_profesor_en DATETIME NULL AFTER pagado_profesor;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_inscripciones' AND COLUMN_NAME = 'idmovimiento') THEN
    ALTER TABLE master_inscripciones ADD COLUMN idmovimiento INT NULL COMMENT 'Ingreso en caja' AFTER pagado_en;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tareas' AND COLUMN_NAME = 'prioridad') THEN
    ALTER TABLE tareas ADD COLUMN prioridad ENUM('normal','urgente') NOT NULL DEFAULT 'normal' AFTER tipo;
  END IF;
END$$
DELIMITER ;
CALL sp_parte40_columnas();
DROP PROCEDURE IF EXISTS sp_parte40_columnas;

INSERT INTO configuracion (clave, valor, descripcion)
SELECT 'pct_gym_masters', '50', 'Másters: % de lo recaudado que queda para el gimnasio (el resto es del profesor)'
 WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave = 'pct_gym_masters');

UPDATE modulos SET nombre = 'Asignación de tareas' WHERE codigo = 'tasks';

SELECT 'Parte 40 lista' AS resultado,
       (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND
          ((TABLE_NAME = 'masters' AND COLUMN_NAME IN ('pct_gym','pagado_profesor','pagado_profesor_en'))
        OR (TABLE_NAME = 'master_inscripciones' AND COLUMN_NAME = 'idmovimiento')
        OR (TABLE_NAME = 'tareas' AND COLUMN_NAME = 'prioridad'))) AS columnas_nuevas;
