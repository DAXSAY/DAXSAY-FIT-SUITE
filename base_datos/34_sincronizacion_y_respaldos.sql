-- =====================================================================
-- 34 · Actualizaciones rápidas entre pantallas y copias de seguridad
-- Ejecutar UNA VEZ en MySQL Workbench con el usuario administrador (root).
--
-- 1) registros_borrados: guarda qué se borró y cuándo. Así cada pantalla
--    descarga solo lo que cambió (no toda la base cada minuto).
-- 2) Permisos para que la copia de seguridad diaria incluya también
--    vistas, triggers y procedimientos (no solo las tablas y sus datos).
-- =====================================================================
USE gestion_radicalgym;

CREATE TABLE IF NOT EXISTS registros_borrados (
  modulo      VARCHAR(40) NOT NULL,
  idregistro  VARCHAR(64) NOT NULL,
  fecha       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (modulo, idregistro),
  INDEX idx_borrados_fecha (fecha)
) ENGINE=InnoDB COMMENT='Registros eliminados (para la actualización parcial de las pantallas)';

-- Índice para pedir "lo que cambió desde..." rápido
SET @hay := (SELECT COUNT(*) FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'registros_app' AND index_name = 'idx_registros_cambios');
SET @sql := IF(@hay = 0, 'CREATE INDEX idx_registros_cambios ON registros_app (modulo, fecha_actualizacion)', 'SELECT 1');
PREPARE p FROM @sql; EXECUTE p; DEALLOCATE PREPARE p;

-- Permisos para la copia de seguridad (usuario de la aplicación)
GRANT SHOW VIEW, TRIGGER ON gestion_radicalgym.* TO 'radicalgym_app'@'localhost';
-- MySQL 8.0.20 o superior: permite copiar también los procedimientos.
-- (Si tu MySQL es más antiguo y esta línea da error, ignórala.)
GRANT SHOW_ROUTINE ON *.* TO 'radicalgym_app'@'localhost';
FLUSH PRIVILEGES;

SELECT 'Listo: actualizaciones parciales y copias completas activadas' AS resultado;
