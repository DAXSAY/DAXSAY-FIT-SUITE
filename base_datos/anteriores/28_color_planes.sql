-- =====================================================================
-- 28. Color de cada plan (lo elige administración en Planes & Tarifas).
-- Se puede ejecutar más de una vez. Ejecutar como root en MySQL Workbench.
-- =====================================================================
SET NAMES utf8mb4;
USE gestion_radicalgym;
SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'planes' AND column_name = 'color');
SET @sql := IF(@falta, 'ALTER TABLE planes ADD COLUMN color VARCHAR(20) NULL COMMENT ''Color del plan en tarjetas y reportes (plomo, celeste, verde...)''', 'SELECT 1');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
SELECT 'Actualización 28 lista' AS resultado,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'planes' AND column_name = 'color') AS columna_color;
