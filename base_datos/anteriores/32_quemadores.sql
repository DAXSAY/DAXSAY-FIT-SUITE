-- =====================================================================
-- 32 · Categoría de tienda: quemadores / termogénicos
-- Se puede ejecutar más de una vez.
-- =====================================================================
SET NAMES utf8mb4;
USE gestion_radicalgym;

ALTER TABLE productos MODIFY categoria
  ENUM('bebidas','suplementos','quemadores','snacks','accesorios','ropa') NOT NULL;

SELECT 'Listo: categoría quemadores / termogénicos' AS resultado;
