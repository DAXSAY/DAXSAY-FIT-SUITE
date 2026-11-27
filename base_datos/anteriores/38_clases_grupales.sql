-- =====================================================================
-- 38 · Clases grupales
-- Ejecutar UNA VEZ en MySQL Workbench (root). Se puede repetir sin problema.
--
--  disciplinas             Full Body, Fit Complex, Ex Local, X-Box, Baile (editables)
--  disciplina_profesores   qué disciplinas dicta cada profesor
--  clases_grupales         horario semanal: disciplina, día, hora, profesor, sala
--  clase_discos            el disco (coreografía/música) que el profesor dictará
--                          en una clase de una fecha concreta. Lo ven
--                          administración, recepción y los alumnos (recordatorio
--                          2 horas antes en la campanita).
--  clase_steps / clase_reservas: croquis del salón y reservas de step.
--  Rol nuevo «instructor» (Profesor de clases) y 5 profesores con su usuario.
--  Contraseña inicial de los 5: Clase2026!  (el sistema pide cambiarla).
-- =====================================================================
USE gestion_radicalgym;
SET NAMES utf8mb4;
DELIMITER ;

-- Cargo «instructor» para el personal
ALTER TABLE empleados MODIFY cargo ENUM('administrador','entrenador','recepcion','nutricionista','fisioterapeuta','mantenimiento','instructor') NOT NULL;

CREATE TABLE IF NOT EXISTS disciplinas (
  iddisciplina  INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(60)  NOT NULL,
  emoji         VARCHAR(16)  NULL,
  color         VARCHAR(20)  NOT NULL DEFAULT 'teal',
  descripcion   VARCHAR(300) NULL,
  orden         SMALLINT     NOT NULL DEFAULT 0,
  activa        TINYINT(1)   NOT NULL DEFAULT 1,
  creada_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_disciplinas_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disciplina_profesores (
  iddisciplina  INT NOT NULL,
  idempleado    INT NOT NULL,
  PRIMARY KEY (iddisciplina, idempleado),
  CONSTRAINT fk_dp_disciplina FOREIGN KEY (iddisciplina) REFERENCES disciplinas (iddisciplina) ON DELETE CASCADE,
  CONSTRAINT fk_dp_empleado   FOREIGN KEY (idempleado)   REFERENCES empleados (idempleado)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clases_grupales (
  idclase_grupal INT AUTO_INCREMENT PRIMARY KEY,
  iddisciplina   INT          NOT NULL,
  nombre         VARCHAR(80)  NULL COMMENT 'Opcional: si se deja vacío se usa el nombre de la disciplina',
  dia_semana     TINYINT      NOT NULL COMMENT '1=lunes ... 7=domingo',
  hora_inicio    TIME         NOT NULL,
  hora_fin       TIME         NOT NULL,
  idempleado     INT          NULL COMMENT 'Profesor',
  sala           VARCHAR(60)  NULL,
  activa         TINYINT(1)   NOT NULL DEFAULT 1,
  idusuario_creador INT       NULL,
  creada_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_cg_dia (dia_semana, hora_inicio),
  KEY ix_cg_profesor (idempleado),
  CONSTRAINT fk_cg_disciplina FOREIGN KEY (iddisciplina) REFERENCES disciplinas (iddisciplina),
  CONSTRAINT fk_cg_profesor   FOREIGN KEY (idempleado)   REFERENCES empleados (idempleado) ON DELETE SET NULL,
  CONSTRAINT chk_cg_dia   CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT chk_cg_horas CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clase_discos (
  iddisco        INT AUTO_INCREMENT PRIMARY KEY,
  idclase_grupal INT          NOT NULL,
  fecha          DATE         NOT NULL,
  disco          VARCHAR(120) NOT NULL,
  nota           VARCHAR(300) NULL,
  idusuario      INT          NULL COMMENT 'Quién lo registró',
  registrado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_disco_clase_fecha (idclase_grupal, fecha),
  KEY ix_disco_fecha (fecha),
  CONSTRAINT fk_disco_clase FOREIGN KEY (idclase_grupal) REFERENCES clases_grupales (idclase_grupal) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Disciplinas iniciales
INSERT INTO disciplinas (nombre, emoji, color, orden) VALUES
('Full Body',   '💪', 'teal',    1),
('Fit Complex', '🔥', 'naranja', 2),
('Ex Local',    '🦵', 'violeta', 3),
('X-Box',       '🥊', 'rojo',    4),
('Baile',       '💃', 'rosa',    5)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Rol «Profesor de clases»
INSERT INTO roles (codigo, nombre, descripcion, modulo_inicio, es_sistema)
SELECT 'instructor', 'Profesor de clases', 'Clases grupales: su horario y el disco que dictará', 'classes', 1
 WHERE NOT EXISTS (SELECT 1 FROM roles WHERE codigo = 'instructor');

-- Módulos: «Clases grupales» (personal) y «Mis clases» (portal del alumno)
INSERT INTO modulos (codigo, nombre, grupo, icono, orden, activo)
SELECT 'classes', 'Clases grupales', 'Salud & Entrenamiento', 'Music', 75, 1
 WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE codigo = 'classes');
INSERT INTO modulos (codigo, nombre, grupo, icono, orden, activo)
SELECT 'mis_clases', 'Mis Clases Grupales', 'Portal del Alumno', 'Music', 270, 1
 WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE codigo = 'mis_clases');

-- Permisos (ver, crear, editar, eliminar)
INSERT IGNORE INTO rol_permisos (idrol, idmodulo, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.idrol, m.idmodulo, p.ver, p.crear, p.editar, p.eliminar
  FROM (
    SELECT 'admin' rol, 'classes' modulo, 1 ver, 1 crear, 1 editar, 1 eliminar UNION ALL
    SELECT 'reception',  'classes',    1, 1, 1, 0 UNION ALL
    SELECT 'trainer',    'classes',    1, 0, 0, 0 UNION ALL
    SELECT 'instructor', 'classes',    1, 0, 1, 0 UNION ALL
    SELECT 'instructor', 'tasks',      1, 1, 1, 0 UNION ALL
    SELECT 'student',    'mis_clases', 1, 0, 0, 0
  ) p
  JOIN roles r   ON r.codigo = p.rol
  JOIN modulos m ON m.codigo = p.modulo;

-- 5 profesores (uno por disciplina) con su usuario
INSERT INTO empleados (nombres, apellidos, sexo, cargo, titulo_cargo, especialidad, fecha_ingreso)
SELECT 'Profesor', d.nombre, 'M', 'instructor', CONCAT('Profesor de ', d.nombre), d.nombre, CURDATE()
  FROM disciplinas d
 WHERE d.nombre IN ('Full Body','Fit Complex','Ex Local','X-Box','Baile')
   AND NOT EXISTS (SELECT 1 FROM empleados e WHERE e.cargo = 'instructor' AND e.especialidad = d.nombre);

INSERT IGNORE INTO disciplina_profesores (iddisciplina, idempleado)
SELECT d.iddisciplina, e.idempleado
  FROM disciplinas d JOIN empleados e ON e.cargo = 'instructor' AND e.especialidad = d.nombre;

INSERT INTO usuarios (usuario, clave_hash, idrol, idempleado, debe_cambiar_clave)
SELECT u.usuario, '$2y$10$VyuvY0NIRlMNkha7bLnVhObEzKsETz9DUIjlw.ZKK7uKqBRHxEA1m', r.idrol, e.idempleado, 1
  FROM (
    SELECT 'fullbody' usuario, 'Full Body' disciplina UNION ALL
    SELECT 'fitcomplex', 'Fit Complex' UNION ALL
    SELECT 'exlocal',    'Ex Local'    UNION ALL
    SELECT 'xbox',       'X-Box'       UNION ALL
    SELECT 'baile',      'Baile'
  ) u
  JOIN empleados e ON e.cargo = 'instructor' AND e.especialidad = u.disciplina
  JOIN roles r ON r.codigo = 'instructor'
 WHERE NOT EXISTS (SELECT 1 FROM usuarios x WHERE x.usuario = u.usuario)
   AND NOT EXISTS (SELECT 1 FROM usuarios x WHERE x.idempleado = e.idempleado);

-- ---------------------------------------------------------------------
-- Croquis del salón: steps (y zonas como «Profesor», «Espejo», «Puerta»)
-- Medidas en casillas de una cuadrícula (por defecto 40 × 28).
-- Administración los dibuja, mueve, numera y borra; todos ven lo mismo.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clase_steps (
  idstep     INT AUTO_INCREMENT PRIMARY KEY,
  tipo       ENUM('step','zona') NOT NULL DEFAULT 'step',
  numero     INT          NULL COMMENT 'Número visible del step',
  etiqueta   VARCHAR(40)  NULL COMMENT 'Texto de una zona (Profesor, Espejo, Puerta…)',
  x          SMALLINT     NOT NULL DEFAULT 0,
  y          SMALLINT     NOT NULL DEFAULT 0,
  ancho      SMALLINT     NOT NULL DEFAULT 3,
  alto       SMALLINT     NOT NULL DEFAULT 2,
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_steps_activo (activo, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Reservas de step por clase y fecha
--  reservado = el alumno lo separó desde su app (30 min antes de la clase)
--  asistio   = recepción confirmó que llegó (o lo sentó al llegar sin reserva)
--  no_vino   = no llegó: el step queda libre para otra persona
--  cancelado = el alumno o recepción lo anuló
-- «ocupa» vale 1 solo mientras el step está tomado: así un step no se da
-- dos veces y un alumno no tiene dos steps en la misma clase.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clase_reservas (
  idreserva      INT AUTO_INCREMENT PRIMARY KEY,
  idclase_grupal INT        NOT NULL,
  fecha          DATE       NOT NULL,
  idstep         INT        NOT NULL,
  idalumno       INT        NOT NULL,
  estado         ENUM('reservado','asistio','no_vino','cancelado') NOT NULL DEFAULT 'reservado',
  origen         ENUM('alumno','recepcion') NOT NULL DEFAULT 'alumno',
  idusuario      INT        NULL COMMENT 'Quién hizo el último cambio',
  ocupa          TINYINT AS (IF(estado IN ('reservado','asistio'), 1, NULL)) STORED,
  creada_en      DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reserva_step   (idclase_grupal, fecha, idstep, ocupa),
  UNIQUE KEY uq_reserva_alumno (idclase_grupal, fecha, idalumno, ocupa),
  KEY ix_reserva_fecha (fecha),
  KEY ix_reserva_alumno (idalumno),
  CONSTRAINT fk_reserva_clase  FOREIGN KEY (idclase_grupal) REFERENCES clases_grupales (idclase_grupal) ON DELETE CASCADE,
  CONSTRAINT fk_reserva_step   FOREIGN KEY (idstep)         REFERENCES clase_steps (idstep),
  CONSTRAINT fk_reserva_alumno FOREIGN KEY (idalumno)       REFERENCES alumnos (idalumno) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Minutos antes de la clase en que se abre la reserva (se cierra al empezar)
INSERT INTO configuracion (clave, valor, descripcion)
SELECT 'clases_minutos_reserva', '30', 'Clases grupales: minutos antes de la clase en que el alumno puede reservar su step'
 WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave = 'clases_minutos_reserva');

-- Croquis inicial: 45 steps (5 filas de 9), el profesor adelante y el espejo
INSERT INTO clase_steps (tipo, etiqueta, x, y, ancho, alto)
SELECT 'zona', 'Espejo', 0, 0, 40, 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM clase_steps);
INSERT INTO clase_steps (tipo, etiqueta, x, y, ancho, alto)
SELECT 'zona', 'Profesor', 16, 2, 8, 3 FROM DUAL WHERE (SELECT COUNT(*) FROM clase_steps) = 1;
INSERT INTO clase_steps (tipo, numero, x, y, ancho, alto)
SELECT 'step', f.n * 9 + c.n + 1, 2 + c.n * 4, 7 + f.n * 4, 3, 2
  FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) f
  CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
              UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8) c
 WHERE (SELECT COUNT(*) FROM clase_steps WHERE tipo = 'step') = 0;

SELECT 'Clases grupales listas' AS resultado,
       (SELECT COUNT(*) FROM disciplinas) AS disciplinas,
       (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.idrol = u.idrol WHERE r.codigo = 'instructor') AS profesores,
       (SELECT COUNT(*) FROM clase_steps WHERE tipo = 'step' AND activo = 1) AS steps;
