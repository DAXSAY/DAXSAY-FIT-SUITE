-- =====================================================================
-- 42 · Sedes y licencia de módulos (DAXSAY Fit Suite general)
-- Ejecutar UNA VEZ en MySQL Workbench (root). Se puede repetir sin problema.
--
--  sedes: un gimnasio puede tener varias sedes. Cada clase grupal, cada
--         máster y cada croquis de steps pertenece a una sede. Se crea
--         «Sede principal» con todo lo que ya existe (luego se renombra).
--  licencia: clave maestra de DAXSAY para activar o apagar los módulos
--         contratados por el gimnasio (clases grupales, fisioterapia,
--         nutrición…). Solo DAXSAY la conoce; el gimnasio no puede
--         activarse módulos que no contrató.
--         Clave inicial: DAXSAY-Licencia-2026  (cámbiala desde el panel)
-- =====================================================================
USE gestion_radicalgym;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS sedes (
  idsede     INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(80)  NOT NULL,
  direccion  VARCHAR(160) NULL,
  activa     TINYINT(1)   NOT NULL DEFAULT 1,
  orden      SMALLINT     NOT NULL DEFAULT 0,
  creada_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sede_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO sedes (nombre, orden) SELECT 'Sede principal', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sedes);

SET @e = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clases_grupales' AND COLUMN_NAME = 'idsede');
SET @q = IF(@e = 0, 'ALTER TABLE clases_grupales ADD COLUMN idsede INT NULL COMMENT ''Sede'' AFTER idempleado, ADD KEY ix_clases_grupales_sede (idsede)', 'SELECT 1');
PREPARE st42 FROM @q;
EXECUTE st42;
DEALLOCATE PREPARE st42;
UPDATE clases_grupales SET idsede = (SELECT MIN(idsede) FROM sedes) WHERE idsede IS NULL;

SET @e = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clase_steps' AND COLUMN_NAME = 'idsede');
SET @q = IF(@e = 0, 'ALTER TABLE clase_steps ADD COLUMN idsede INT NULL COMMENT ''Sede'' AFTER tipo, ADD KEY ix_clase_steps_sede (idsede)', 'SELECT 1');
PREPARE st42 FROM @q;
EXECUTE st42;
DEALLOCATE PREPARE st42;
UPDATE clase_steps SET idsede = (SELECT MIN(idsede) FROM sedes) WHERE idsede IS NULL;

SET @e = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'masters' AND COLUMN_NAME = 'idsede');
SET @q = IF(@e = 0, 'ALTER TABLE masters ADD COLUMN idsede INT NULL COMMENT ''Sede'' AFTER iddisciplina, ADD KEY ix_masters_sede (idsede)', 'SELECT 1');
PREPARE st42 FROM @q;
EXECUTE st42;
DEALLOCATE PREPARE st42;
UPDATE masters SET idsede = (SELECT MIN(idsede) FROM sedes) WHERE idsede IS NULL;

CREATE TABLE IF NOT EXISTS licencia (
  id              TINYINT      NOT NULL PRIMARY KEY,
  clave_hash      VARCHAR(100) NOT NULL COMMENT 'Clave maestra DAXSAY (bcrypt)',
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO licencia (id, clave_hash) VALUES (1, '$2a$10$GW7t5jPFi7K0eYiv0Zv/wu8qW5jqkQeru8zKhQHpTG6n/ldoSTB0q');

SELECT 'Parte 42 lista' AS resultado,
       (SELECT COUNT(*) FROM sedes) AS sedes,
       (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'idsede' AND TABLE_NAME IN ('clases_grupales','clase_steps','masters')) AS columnas_sede,
       (SELECT COUNT(*) FROM licencia) AS licencia;
