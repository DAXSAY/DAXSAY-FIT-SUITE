-- =====================================================================
-- 41 · Steps en los másters y calificación de las clases
-- Ejecutar UNA VEZ en MySQL Workbench (root). Se puede repetir sin problema.
--
--  master_inscripciones.idstep: el step del croquis que eligió (o le
--  asignó recepción) cada inscrito. Un step solo puede tener una persona
--  por máster: gana quien lo tomó primero.
--  clase_calificaciones: después de su clase o máster el alumno le pone
--  de 1 a 5 estrellas, etiquetas rápidas y un comentario opcional.
--  Administración y recepción ven el promedio por profesor y disciplina.
-- =====================================================================
USE gestion_radicalgym;
SET NAMES utf8mb4;

SET @existe41 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_inscripciones' AND COLUMN_NAME = 'idstep');
SET @sql41 = IF(@existe41 = 0,
  'ALTER TABLE master_inscripciones ADD COLUMN idstep INT NULL COMMENT ''Step del croquis (clase_steps)'' AFTER celular, ADD KEY ix_mi_step (idmaster, idstep)',
  'SELECT 1');
PREPARE st41 FROM @sql41;
EXECUTE st41;
DEALLOCATE PREPARE st41;

CREATE TABLE IF NOT EXISTS clase_calificaciones (
  idcalificacion  INT AUTO_INCREMENT PRIMARY KEY,
  tipo            ENUM('clase','master') NOT NULL,
  idclase_grupal  INT           NULL,
  idmaster        INT           NULL,
  fecha           DATE          NOT NULL COMMENT 'Día de la clase o del máster',
  idalumno        INT           NOT NULL,
  idempleado      INT           NULL COMMENT 'Profesor que dictó',
  iddisciplina    INT           NULL,
  estrellas       TINYINT       NOT NULL,
  etiquetas       VARCHAR(200)  NULL COMMENT 'Etiquetas rápidas separadas por coma',
  comentario      VARCHAR(300)  NULL,
  clave           VARCHAR(40)   NOT NULL COMMENT 'c-<clase>-<fecha> o m-<máster>: una calificación por alumno',
  creada_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_calificacion (idalumno, clave),
  KEY ix_cal_fecha (fecha),
  KEY ix_cal_profesor (idempleado, fecha),
  CONSTRAINT chk_cal_estrellas CHECK (estrellas BETWEEN 1 AND 5),
  CONSTRAINT fk_cal_alumno FOREIGN KEY (idalumno) REFERENCES alumnos (idalumno) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Parte 41 lista' AS resultado,
       (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'master_inscripciones' AND COLUMN_NAME = 'idstep') AS columna_step,
       (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clase_calificaciones') AS tabla_calificaciones;
