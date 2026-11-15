-- =====================================================================
-- 29. El alumno puede tener VARIOS objetivos (ej. bajar de peso + tonificar).
-- Se cambia ENUM por SET: los valores que ya existen siguen valiendo.
-- Se puede ejecutar más de una vez. Ejecutar como root en MySQL Workbench.
-- =====================================================================
SET NAMES utf8mb4;
USE gestion_radicalgym;
ALTER TABLE alumnos
  MODIFY objetivo SET('hipertrofia','perdida_peso','fuerza','resistencia','tonificacion','rehabilitacion') NOT NULL DEFAULT 'tonificacion';
SELECT 'Actualización 29 lista' AS resultado, COLUMN_TYPE AS tipo
  FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alumnos' AND COLUMN_NAME = 'objetivo';
