-- =====================================================================
-- 31 · Contratos de 1 mes
-- Agrega la duración '1_mes' a los contratos del personal.
-- Se puede ejecutar más de una vez.
-- =====================================================================
SET NAMES utf8mb4;
USE gestion_radicalgym;

ALTER TABLE contratos MODIFY tipo ENUM('1_mes','3_meses','6_meses','1_anio','indefinido') NOT NULL;

SELECT 'Listo: contratos de 1 mes disponibles' AS resultado;
