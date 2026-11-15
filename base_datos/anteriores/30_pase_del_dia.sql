-- =====================================================================
-- 30 · Pase del día / sesión libre en caja
-- Agrega la categoría 'pase_dia' a los movimientos de caja para separar
-- en reportes lo que pagan las personas que entrenan un solo día.
-- Se puede ejecutar más de una vez.
-- =====================================================================
SET NAMES utf8mb4;
USE gestion_radicalgym;

ALTER TABLE movimientos_caja MODIFY categoria
  ENUM('matricula','pase_dia','venta','entrenamiento_personal','fisioterapia','nutricion',
       'insumos','sueldo','mantenimiento','servicios','alquiler','marketing',
       'averia_equipo','otros') NOT NULL;

SELECT 'Listo: categoría pase_dia disponible en caja' AS resultado;
