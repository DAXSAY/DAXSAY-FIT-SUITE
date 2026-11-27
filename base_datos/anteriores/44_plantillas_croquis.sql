-- =====================================================================
-- 44 · Plantillas de croquis guardadas y adelantos en másters
--      Administración guarda un salón (steps, muros, columnas…) con un
--      nombre y luego lo usa en cualquier sede como punto de partida.
-- =====================================================================
USE gestion_radicalgym;

CREATE TABLE IF NOT EXISTS croquis_plantillas (
  idplantilla  INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(80)  NOT NULL,
  elementos    MEDIUMTEXT   NOT NULL COMMENT 'JSON: [{tipo, numero, etiqueta, x, y, w, h}]',
  total_steps  INT          NOT NULL DEFAULT 0,
  idusuario    INT          NULL,
  creado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_plantilla_nombre (nombre),
  CONSTRAINT fk_plantilla_usuario FOREIGN KEY (idusuario) REFERENCES usuarios (idusuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Unificar término: la zona del frente del salón se llama «Profesor»
SET SQL_SAFE_UPDATES = 0;
UPDATE clase_steps SET etiqueta = 'Profesor' WHERE tipo = 'zona' AND LOWER(etiqueta) = 'instructor';

-- Másters: adelantos. Se puede dejar parte del pago (ej. S/ 5) y pagar el saldo después
SET @existe44 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_inscripciones' AND COLUMN_NAME = 'monto_pagado');
SET @sql44 = IF(@existe44 = 0,
  'ALTER TABLE master_inscripciones ADD COLUMN monto_pagado DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT ''Lo pagado hasta ahora (adelanto + abonos)'' AFTER pagado',
  'SELECT 1');
PREPARE st44 FROM @sql44;
EXECUTE st44;
DEALLOCATE PREPARE st44;
UPDATE master_inscripciones SET monto_pagado = precio WHERE pagado = 1 AND monto_pagado = 0;

SELECT 'Parte 44 lista' AS resultado, (SELECT COUNT(*) FROM croquis_plantillas) AS plantillas,
       (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_inscripciones' AND COLUMN_NAME = 'monto_pagado') AS columna_abonos;
