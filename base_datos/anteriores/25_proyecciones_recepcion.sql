-- =====================================================================
-- 25. Proyecciones de recepción (Metas & Logros)
-- Cada turno de recepción se proyecta cuánto va a vender, cuántas
-- matrículas y cuántas renovaciones hará: un número por cada día de la
-- semana (lunes a domingo) y uno para la semana completa. Cada lunes
-- empieza una semana nueva; las anteriores quedan guardadas para
-- comparar lo proyectado con lo real.
-- Ejecutar como root en MySQL Workbench.
-- =====================================================================
SET NAMES utf8mb4;
USE gestion_radicalgym;

CREATE TABLE IF NOT EXISTS proyecciones_recepcion (
  idproyeccion        INT AUTO_INCREMENT PRIMARY KEY,
  idturno_recepcion   INT           NOT NULL,
  semana_inicio       DATE          NOT NULL COMMENT 'Lunes de la semana',
  dia                 TINYINT       NOT NULL COMMENT '0 = proyección de toda la semana; 1 = lunes ... 7 = domingo',
  monto               DECIMAL(10,2) NULL COMMENT 'Soles que espera vender',
  matriculas          SMALLINT      NULL COMMENT 'Matrículas nuevas que espera',
  renovaciones        SMALLINT      NULL COMMENT 'Renovaciones que espera',
  notas               VARCHAR(200)  NULL,
  idusuario           INT           NULL COMMENT 'Quién la escribió por última vez',
  fecha_registro      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_proyeccion (idturno_recepcion, semana_inicio, dia),
  KEY ix_proyeccion_semana (semana_inicio),
  CONSTRAINT fk_proy_turno   FOREIGN KEY (idturno_recepcion) REFERENCES turnos_recepcion (idturno_recepcion) ON DELETE CASCADE,
  CONSTRAINT fk_proy_usuario FOREIGN KEY (idusuario)         REFERENCES usuarios (idusuario)                 ON DELETE SET NULL,
  CONSTRAINT chk_proy_dia    CHECK (dia BETWEEN 0 AND 7),
  CONSTRAINT chk_proy_valores CHECK ((monto IS NULL OR monto >= 0) AND (matriculas IS NULL OR matriculas >= 0) AND (renovaciones IS NULL OR renovaciones >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Proyecciones diarias y semanales de cada turno de recepción';

SELECT 'Actualización 25 lista' AS resultado,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'proyecciones_recepcion') AS tabla_nueva;
