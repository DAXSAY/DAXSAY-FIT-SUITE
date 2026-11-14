-- =====================================================================
-- RADICAL - Actualización 24: PROGRESO DE PESOS POR SERIE
-- El alumno anota el peso (y las repeticiones) de cada serie de los
-- ejercicios de SU rutina (la que el entrenador ya le asigna en
-- "Rutinas & Ejercicios"). Puede elegir cualquier día de su rutina y
-- cualquier fecha (si faltó el miércoles y vino el jueves, igual anota).
-- Cada fila guarda una copia de lo planificado (rutina, día, series y
-- repeticiones): si el entrenador cambia la rutina, el historial queda.
-- Alimenta el progreso del alumno, del entrenador y de administración.
-- Ejecutar como root en Workbench. Se puede repetir; no borra datos.
-- =====================================================================
SET NAMES utf8mb4;
USE gestion_radicalgym;

CREATE TABLE IF NOT EXISTS registro_peso_serie (
  idregistro_peso    INT AUTO_INCREMENT PRIMARY KEY,
  idalumno           INT          NOT NULL,
  fecha              DATE         NOT NULL COMMENT 'Día en que entrenó',
  rutina_ref         VARCHAR(64)  NULL COMMENT 'Id de la rutina en el sistema (registros_app)',
  rutina_titulo      VARCHAR(150) NULL,
  dia_rutina         VARCHAR(120) NULL COMMENT 'Día de la rutina que hizo (ej. Día 1 - Pecho)',
  clave_ejercicio    VARCHAR(150) NOT NULL COMMENT 'Código del ejercicio del banco o n:<nombre>',
  nombre_ejercicio   VARCHAR(150) NOT NULL,
  grupo_muscular     VARCHAR(40)  NULL,
  series_plan        TINYINT      NULL COMMENT 'Series que indicó el entrenador ese día',
  reps_plan          VARCHAR(20)  NULL COMMENT 'Repeticiones indicadas (15, 8-12...)',
  serie              TINYINT      NOT NULL,
  peso_kg            DECIMAL(6,2) NOT NULL,
  repeticiones       TINYINT      NULL COMMENT 'Repeticiones que logró',
  registrado_por     ENUM('alumno','personal') NOT NULL DEFAULT 'alumno',
  idusuario_registro INT          NULL,
  fecha_registro     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_peso_serie (idalumno, fecha, clave_ejercicio, serie),
  KEY ix_peso_progreso (idalumno, clave_ejercicio, fecha),
  KEY ix_peso_fecha (idalumno, fecha),
  CONSTRAINT ck_peso_kg    CHECK (peso_kg >= 0 AND peso_kg <= 999.99),
  CONSTRAINT ck_peso_serie CHECK (serie BETWEEN 1 AND 20),
  CONSTRAINT ck_peso_reps  CHECK (repeticiones IS NULL OR repeticiones BETWEEN 0 AND 200),
  CONSTRAINT fk_peso_alumno  FOREIGN KEY (idalumno) REFERENCES alumnos (idalumno) ON DELETE CASCADE,
  CONSTRAINT fk_peso_usuario FOREIGN KEY (idusuario_registro) REFERENCES usuarios (idusuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pesos por serie que anota el alumno (progreso)';

SELECT 'registro_peso_serie lista' AS resultado;
