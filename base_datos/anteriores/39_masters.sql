-- =====================================================================
-- 39 · Másters (clases especiales de fin de semana)
-- Ejecutar UNA VEZ en MySQL Workbench (root). Se puede repetir sin problema.
--
--  masters               cada máster: nombre, disciplina, profesor(es), fecha,
--                        hora, precio para socios y precio público (lo pone
--                        administración y puede cambiar cada semana), cupo.
--  master_inscripciones  quién se inscribió durante la semana, si es socio
--                        (precio socio) o no (precio público), si ya pagó,
--                        cómo pagó y si asistió.
-- =====================================================================
USE gestion_radicalgym;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS masters (
  idmaster        INT AUTO_INCREMENT PRIMARY KEY,
  titulo          VARCHAR(100)  NOT NULL,
  iddisciplina    INT           NULL,
  idempleado      INT           NULL COMMENT 'Profesor principal',
  profesor_invitado VARCHAR(120) NULL COMMENT 'Otros profesores o invitados (texto libre)',
  fecha           DATE          NOT NULL,
  hora_inicio     TIME          NOT NULL,
  hora_fin        TIME          NOT NULL,
  precio_socio    DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_publico  DECIMAL(10,2) NOT NULL DEFAULT 0,
  cupo            SMALLINT      NULL COMMENT 'Vacío = sin límite',
  sala            VARCHAR(60)   NULL,
  descripcion     VARCHAR(400)  NULL,
  estado          ENUM('abierto','cerrado','realizado','cancelado') NOT NULL DEFAULT 'abierto',
  idusuario_creador INT         NULL,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_masters_fecha (fecha),
  CONSTRAINT fk_master_disciplina FOREIGN KEY (iddisciplina) REFERENCES disciplinas (iddisciplina) ON DELETE SET NULL,
  CONSTRAINT fk_master_profesor   FOREIGN KEY (idempleado)   REFERENCES empleados (idempleado)     ON DELETE SET NULL,
  CONSTRAINT chk_master_horas  CHECK (hora_fin > hora_inicio),
  CONSTRAINT chk_master_precio CHECK (precio_socio >= 0 AND precio_publico >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS master_inscripciones (
  idinscripcion  INT AUTO_INCREMENT PRIMARY KEY,
  idmaster       INT           NOT NULL,
  idalumno       INT           NULL COMMENT 'Si es alumno del gimnasio',
  nombre         VARCHAR(120)  NOT NULL,
  dni            VARCHAR(15)   NULL,
  celular        VARCHAR(20)   NULL,
  es_socio       TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'Tenía membresía vigente al inscribirse',
  precio         DECIMAL(10,2) NOT NULL DEFAULT 0,
  pagado         TINYINT(1)    NOT NULL DEFAULT 0,
  metodo_pago    ENUM('efectivo','yape_plin','tarjeta','transferencia') NULL,
  pagado_en      DATETIME      NULL,
  asistio        TINYINT(1)    NOT NULL DEFAULT 0,
  origen         ENUM('recepcion','alumno') NOT NULL DEFAULT 'recepcion',
  estado         ENUM('inscrito','anulado') NOT NULL DEFAULT 'inscrito',
  nota           VARCHAR(200)  NULL,
  idusuario      INT           NULL COMMENT 'Quién registró o cobró',
  creada_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_mi_alumno (idalumno),
  KEY ix_mi_master (idmaster, estado),
  CONSTRAINT fk_mi_master FOREIGN KEY (idmaster) REFERENCES masters (idmaster) ON DELETE CASCADE,
  CONSTRAINT fk_mi_alumno FOREIGN KEY (idalumno) REFERENCES alumnos (idalumno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Másters listos' AS resultado,
       (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('masters','master_inscripciones')) AS tablas;
