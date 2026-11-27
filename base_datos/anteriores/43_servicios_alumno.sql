-- =====================================================================
-- 43 · Servicios por alumno (medidas, dieta, evaluación nutricional,
--      fisioterapia, entrenador…)
-- Ejecutar UNA VEZ en MySQL Workbench (root). Se puede repetir sin problema.
--
--  servicios          catálogo con su precio (lo pone administración).
--                     modo «periodo»: vale X días (ej. control de medidas
--                     mensual). modo «sesiones»: N atenciones (ej. una
--                     evaluación nutricional o una sesión de fisioterapia).
--  plan_servicios     qué servicios trae cada plan (mientras dure la
--                     membresía; los de sesiones, cuántas por membresía).
--  alumno_servicios   servicios comprados aparte o de cortesía: un alumno
--                     puede tener 2 meses solo medidas y al tercero sumar
--                     la dieta, o pagar una fisioterapia suelta.
--  servicio_usos      cada sesión usada (para descontar las que quedan).
-- Los planes con «incluye nutrición / fisioterapia / entrenador» pasan
-- a tener esos servicios incluidos.
-- =====================================================================
USE gestion_radicalgym;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS servicios (
  idservicio   INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(40)   NOT NULL,
  nombre       VARCHAR(80)   NOT NULL,
  emoji        VARCHAR(16)   NULL,
  descripcion  VARCHAR(200)  NULL,
  modo         ENUM('periodo','sesiones') NOT NULL DEFAULT 'periodo',
  dias         SMALLINT      NOT NULL DEFAULT 30 COMMENT 'Modo periodo: cuántos días vale',
  sesiones     SMALLINT      NOT NULL DEFAULT 1  COMMENT 'Modo sesiones: cuántas atenciones trae',
  precio       DECIMAL(10,2) NOT NULL DEFAULT 0,
  categoria_caja VARCHAR(30) NOT NULL DEFAULT 'otros' COMMENT 'Categoría del ingreso en caja',
  modulo       VARCHAR(40)   NULL COMMENT 'Módulo relacionado (nutrition, physiotherapy…)',
  activo       TINYINT(1)    NOT NULL DEFAULT 1,
  orden        SMALLINT      NOT NULL DEFAULT 0,
  UNIQUE KEY uq_servicio_codigo (codigo),
  CONSTRAINT chk_serv_valores CHECK (precio >= 0 AND dias BETWEEN 1 AND 400 AND sesiones BETWEEN 1 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO servicios (codigo, nombre, emoji, descripcion, modo, dias, sesiones, precio, categoria_caja, modulo, orden) VALUES
 ('medidas',      'Control de medidas',        '📈', 'Bioimpedancia (balanza) y medidas con centímetro', 'periodo', 30, 1, 20, 'nutricion', 'nutrition', 1),
 ('dieta',        'Plan de alimentación',      '🥗', 'Dieta personalizada y sus ajustes',                'periodo', 30, 1, 60, 'nutricion', 'nutrition', 2),
 ('eval_nutri',   'Evaluación nutricional',    '🍎', 'Consulta de evaluación con el nutricionista',      'sesiones', 30, 1, 50, 'nutricion', 'nutrition', 3),
 ('fisioterapia', 'Sesión de fisioterapia',    '🩺', 'Una sesión con el fisioterapeuta',                 'sesiones', 30, 1, 50, 'fisioterapia', 'physiotherapy', 4),
 ('entrenador',   'Entrenador personal',       '🏋️', 'Acompañamiento de un entrenador',                  'periodo', 30, 1, 150, 'entrenamiento_personal', 'routines', 5);

CREATE TABLE IF NOT EXISTS plan_servicios (
  idplan      INT      NOT NULL,
  idservicio  INT      NOT NULL,
  cantidad    SMALLINT NOT NULL DEFAULT 1 COMMENT 'Modo sesiones: cuántas por membresía',
  PRIMARY KEY (idplan, idservicio),
  CONSTRAINT fk_ps_plan     FOREIGN KEY (idplan)     REFERENCES planes (idplan)       ON DELETE CASCADE,
  CONSTRAINT fk_ps_servicio FOREIGN KEY (idservicio) REFERENCES servicios (idservicio) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Los planes que ya decían «incluye…» quedan con esos servicios
INSERT IGNORE INTO plan_servicios (idplan, idservicio, cantidad)
SELECT p.idplan, s.idservicio, 1 FROM planes p JOIN servicios s ON s.codigo IN ('medidas','dieta','eval_nutri') WHERE p.incluye_nutricion = 1;
INSERT IGNORE INTO plan_servicios (idplan, idservicio, cantidad)
SELECT p.idplan, s.idservicio, 1 FROM planes p JOIN servicios s ON s.codigo = 'fisioterapia' WHERE p.incluye_fisioterapia = 1;
INSERT IGNORE INTO plan_servicios (idplan, idservicio, cantidad)
SELECT p.idplan, s.idservicio, 1 FROM planes p JOIN servicios s ON s.codigo = 'entrenador' WHERE p.incluye_entrenador = 1;

CREATE TABLE IF NOT EXISTS alumno_servicios (
  idalumno_servicio INT AUTO_INCREMENT PRIMARY KEY,
  idalumno     INT           NOT NULL,
  idservicio   INT           NOT NULL,
  origen       ENUM('compra','cortesia') NOT NULL DEFAULT 'compra',
  desde        DATE          NOT NULL,
  hasta        DATE          NULL COMMENT 'Modo periodo',
  sesiones     SMALLINT      NULL COMMENT 'Modo sesiones',
  precio       DECIMAL(10,2) NOT NULL DEFAULT 0,
  metodo_pago  VARCHAR(20)   NULL,
  idmovimiento INT           NULL COMMENT 'Ingreso en caja',
  nota         VARCHAR(200)  NULL,
  estado       ENUM('activo','anulado') NOT NULL DEFAULT 'activo',
  idusuario    INT           NULL,
  creado_en    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_as_alumno (idalumno, estado),
  KEY ix_as_servicio (idservicio, desde),
  CONSTRAINT fk_as_alumno   FOREIGN KEY (idalumno)   REFERENCES alumnos (idalumno)     ON DELETE CASCADE,
  CONSTRAINT fk_as_servicio FOREIGN KEY (idservicio) REFERENCES servicios (idservicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicio_usos (
  iduso        INT AUTO_INCREMENT PRIMARY KEY,
  idalumno     INT          NOT NULL,
  idservicio   INT          NOT NULL,
  idmatricula  INT          NULL COMMENT 'Si salió de lo incluido en su plan',
  idalumno_servicio INT     NULL COMMENT 'Si salió de lo comprado aparte',
  fecha        DATE         NOT NULL,
  nota         VARCHAR(200) NULL,
  idusuario    INT          NULL,
  creado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_uso_alumno (idalumno, idservicio),
  CONSTRAINT fk_uso_alumno FOREIGN KEY (idalumno) REFERENCES alumnos (idalumno) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Parte 43 lista' AS resultado,
       (SELECT COUNT(*) FROM servicios) AS servicios,
       (SELECT COUNT(*) FROM plan_servicios) AS incluidos_en_planes;
