-- =====================================================================
-- EXTRA · Horario y profesores de DYNAMIC · Sede Los Incas
-- (sacado de la foto del horario impreso: lunes a viernes, 7 bloques)
--
-- OJO: REEMPLAZA el horario de clases grupales que tengas ahora.
--  1. Agrega los 11 profesores (si ya existen con ese nombre no los repite)
--     y les da su disciplina. Una disciplina queda con varios profesores.
--  2. Les crea usuario con su nombre en minúsculas (mauricio, carmen…)
--     y la contraseña inicial Clase2026! (al entrar se les pide cambiarla).
--  3. Crea la sede «Sede Los Incas» (renombra «Sede principal» si es la única),
--     desactiva las clases que tenga esa sede (no se borran: quedan en el
--     historial de reservas y reportes) y carga las 35 clases de la foto.
--  4. Quita de las disciplinas a los 5 profesores genéricos de la parte 38
--     («Profesor Full Body», etc.) y los desactiva junto con sus usuarios.
-- Cada clase dura 1 hora. Todo se puede cambiar después desde el sistema:
--  Clases grupales › Horario (clases) y › Disciplinas y salón (profesores).
-- El croquis del salón se carga desde Disciplinas y salón › plantilla
-- «Sede Los Incas · 46 steps + A–F».
-- Requiere la parte 42 (sedes). Se puede ejecutar más de una vez.
-- =====================================================================
USE gestion_radicalgym;
SET NAMES utf8mb4;

-- 1) Profesores
INSERT INTO empleados (nombres, apellidos, sexo, cargo, titulo_cargo, especialidad, fecha_ingreso)
SELECT p.nombre, '', p.sexo, 'instructor', 'Profesor de clases grupales', p.disc, CURDATE()
  FROM (
  SELECT 'Mauricio' AS nombre, 'M' AS sexo, 'Full Body' AS disc UNION ALL
  SELECT 'Carmen' AS nombre, 'F' AS sexo, 'Full Body' AS disc UNION ALL
  SELECT 'Nicol' AS nombre, 'F' AS sexo, 'Full Body' AS disc UNION ALL
  SELECT 'Mery' AS nombre, 'F' AS sexo, 'Full Body' AS disc UNION ALL
  SELECT 'Claudia' AS nombre, 'F' AS sexo, 'X-Box' AS disc UNION ALL
  SELECT 'Benjamin' AS nombre, 'M' AS sexo, 'Baile' AS disc UNION ALL
  SELECT 'Rafael' AS nombre, 'M' AS sexo, 'Baile' AS disc UNION ALL
  SELECT 'Pamela' AS nombre, 'F' AS sexo, 'Ex Local' AS disc UNION ALL
  SELECT 'Daniela' AS nombre, 'F' AS sexo, 'Ex Local' AS disc UNION ALL
  SELECT 'Lucy' AS nombre, 'F' AS sexo, 'Fit Complex' AS disc UNION ALL
  SELECT 'Rina' AS nombre, 'F' AS sexo, 'Fit Complex' AS disc
  ) p
 WHERE NOT EXISTS (SELECT 1 FROM empleados e WHERE e.cargo = 'instructor' AND e.nombres = p.nombre AND e.activo = 1);

INSERT IGNORE INTO disciplina_profesores (iddisciplina, idempleado)
SELECT d.iddisciplina, e.idempleado
  FROM (
  SELECT 'Mauricio' AS nombre, 'M' AS sexo, 'Full Body' AS disc UNION ALL
  SELECT 'Carmen' AS nombre, 'F' AS sexo, 'Full Body' AS disc UNION ALL
  SELECT 'Nicol' AS nombre, 'F' AS sexo, 'Full Body' AS disc UNION ALL
  SELECT 'Mery' AS nombre, 'F' AS sexo, 'Full Body' AS disc UNION ALL
  SELECT 'Claudia' AS nombre, 'F' AS sexo, 'X-Box' AS disc UNION ALL
  SELECT 'Benjamin' AS nombre, 'M' AS sexo, 'Baile' AS disc UNION ALL
  SELECT 'Rafael' AS nombre, 'M' AS sexo, 'Baile' AS disc UNION ALL
  SELECT 'Pamela' AS nombre, 'F' AS sexo, 'Ex Local' AS disc UNION ALL
  SELECT 'Daniela' AS nombre, 'F' AS sexo, 'Ex Local' AS disc UNION ALL
  SELECT 'Lucy' AS nombre, 'F' AS sexo, 'Fit Complex' AS disc UNION ALL
  SELECT 'Rina' AS nombre, 'F' AS sexo, 'Fit Complex' AS disc
  ) p
  JOIN disciplinas d ON d.nombre = p.disc
  JOIN empleados e ON e.cargo = 'instructor' AND e.nombres = p.nombre AND e.activo = 1;

-- 2) Usuarios (contraseña inicial: Clase2026!)
INSERT INTO usuarios (usuario, clave_hash, idrol, idempleado, debe_cambiar_clave)
SELECT LOWER(e.nombres), '$2y$10$VyuvY0NIRlMNkha7bLnVhObEzKsETz9DUIjlw.ZKK7uKqBRHxEA1m', r.idrol, e.idempleado, 1
  FROM empleados e
  JOIN roles r ON r.codigo = 'instructor'
 WHERE e.cargo = 'instructor' AND e.activo = 1 AND e.apellidos = ''
   AND e.nombres IN ('Mauricio', 'Carmen', 'Nicol', 'Mery', 'Claudia', 'Benjamin', 'Rafael', 'Pamela', 'Daniela', 'Lucy', 'Rina')
   AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.idempleado = e.idempleado)
   AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.usuario = LOWER(e.nombres));

-- 3) Sede y horario de la foto (reemplaza el horario de esa sede)
UPDATE sedes SET nombre = 'Sede Los Incas'
 WHERE nombre = 'Sede principal' AND (SELECT n FROM (SELECT COUNT(*) AS n FROM sedes) x) = 1;
INSERT INTO sedes (nombre, orden) SELECT 'Sede Los Incas', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM sedes WHERE nombre = 'Sede Los Incas');
SET @incas = (SELECT idsede FROM sedes WHERE nombre = 'Sede Los Incas');

UPDATE clases_grupales SET activa = 0 WHERE activa = 1 AND (idsede = @incas OR idsede IS NULL);

INSERT INTO clases_grupales (iddisciplina, dia_semana, hora_inicio, hora_fin, idempleado, idsede)
SELECT d.iddisciplina, h.dia, h.ini, h.fin, e.idempleado, @incas
  FROM (
  SELECT 1 AS dia, '06:00' AS ini, '07:00' AS fin, 'Full Body' AS disc, 'Mauricio' AS prof UNION ALL
  SELECT 2 AS dia, '06:00' AS ini, '07:00' AS fin, 'Full Body' AS disc, 'Carmen' AS prof UNION ALL
  SELECT 3 AS dia, '06:00' AS ini, '07:00' AS fin, 'Full Body' AS disc, 'Mauricio' AS prof UNION ALL
  SELECT 4 AS dia, '06:00' AS ini, '07:00' AS fin, 'Full Body' AS disc, 'Carmen' AS prof UNION ALL
  SELECT 5 AS dia, '06:00' AS ini, '07:00' AS fin, 'Full Body' AS disc, 'Mauricio' AS prof UNION ALL
  SELECT 1 AS dia, '07:00' AS ini, '08:00' AS fin, 'X-Box' AS disc, 'Claudia' AS prof UNION ALL
  SELECT 2 AS dia, '07:00' AS ini, '08:00' AS fin, 'X-Box' AS disc, 'Claudia' AS prof UNION ALL
  SELECT 3 AS dia, '07:00' AS ini, '08:00' AS fin, 'X-Box' AS disc, 'Claudia' AS prof UNION ALL
  SELECT 4 AS dia, '07:00' AS ini, '08:00' AS fin, 'X-Box' AS disc, 'Claudia' AS prof UNION ALL
  SELECT 5 AS dia, '07:00' AS ini, '08:00' AS fin, 'X-Box' AS disc, 'Claudia' AS prof UNION ALL
  SELECT 1 AS dia, '08:00' AS ini, '09:00' AS fin, 'Baile' AS disc, 'Benjamin' AS prof UNION ALL
  SELECT 2 AS dia, '08:00' AS ini, '09:00' AS fin, 'Ex Local' AS disc, 'Pamela' AS prof UNION ALL
  SELECT 3 AS dia, '08:00' AS ini, '09:00' AS fin, 'Baile' AS disc, 'Benjamin' AS prof UNION ALL
  SELECT 4 AS dia, '08:00' AS ini, '09:00' AS fin, 'Ex Local' AS disc, 'Pamela' AS prof UNION ALL
  SELECT 5 AS dia, '08:00' AS ini, '09:00' AS fin, 'Baile' AS disc, 'Benjamin' AS prof UNION ALL
  SELECT 1 AS dia, '09:00' AS ini, '10:00' AS fin, 'Full Body' AS disc, 'Nicol' AS prof UNION ALL
  SELECT 2 AS dia, '09:00' AS ini, '10:00' AS fin, 'Fit Complex' AS disc, 'Lucy' AS prof UNION ALL
  SELECT 3 AS dia, '09:00' AS ini, '10:00' AS fin, 'Full Body' AS disc, 'Nicol' AS prof UNION ALL
  SELECT 4 AS dia, '09:00' AS ini, '10:00' AS fin, 'Fit Complex' AS disc, 'Lucy' AS prof UNION ALL
  SELECT 5 AS dia, '09:00' AS ini, '10:00' AS fin, 'Full Body' AS disc, 'Nicol' AS prof UNION ALL
  SELECT 1 AS dia, '17:00' AS ini, '18:00' AS fin, 'Baile' AS disc, 'Rafael' AS prof UNION ALL
  SELECT 2 AS dia, '17:00' AS ini, '18:00' AS fin, 'Full Body' AS disc, 'Mery' AS prof UNION ALL
  SELECT 3 AS dia, '17:00' AS ini, '18:00' AS fin, 'Baile' AS disc, 'Rafael' AS prof UNION ALL
  SELECT 4 AS dia, '17:00' AS ini, '18:00' AS fin, 'Full Body' AS disc, 'Mauricio' AS prof UNION ALL
  SELECT 5 AS dia, '17:00' AS ini, '18:00' AS fin, 'Baile' AS disc, 'Rafael' AS prof UNION ALL
  SELECT 1 AS dia, '18:00' AS ini, '19:00' AS fin, 'Full Body' AS disc, 'Mauricio' AS prof UNION ALL
  SELECT 2 AS dia, '18:00' AS ini, '19:00' AS fin, 'Ex Local' AS disc, 'Daniela' AS prof UNION ALL
  SELECT 3 AS dia, '18:00' AS ini, '19:00' AS fin, 'Full Body' AS disc, 'Mauricio' AS prof UNION ALL
  SELECT 4 AS dia, '18:00' AS ini, '19:00' AS fin, 'Ex Local' AS disc, 'Daniela' AS prof UNION ALL
  SELECT 5 AS dia, '18:00' AS ini, '19:00' AS fin, 'Full Body' AS disc, 'Mauricio' AS prof UNION ALL
  SELECT 1 AS dia, '19:00' AS ini, '20:00' AS fin, 'Fit Complex' AS disc, 'Rina' AS prof UNION ALL
  SELECT 2 AS dia, '19:00' AS ini, '20:00' AS fin, 'Baile' AS disc, 'Rafael' AS prof UNION ALL
  SELECT 3 AS dia, '19:00' AS ini, '20:00' AS fin, 'Fit Complex' AS disc, 'Rina' AS prof UNION ALL
  SELECT 4 AS dia, '19:00' AS ini, '20:00' AS fin, 'Baile' AS disc, 'Rafael' AS prof UNION ALL
  SELECT 5 AS dia, '19:00' AS ini, '20:00' AS fin, 'Fit Complex' AS disc, 'Rina' AS prof
  ) h
  JOIN disciplinas d ON d.nombre = h.disc
  LEFT JOIN empleados e ON e.cargo = 'instructor' AND e.nombres = h.prof AND e.activo = 1 AND e.apellidos = '';

-- 4) Profesores genéricos de la parte 38 fuera de las disciplinas
DELETE dp FROM disciplina_profesores dp JOIN empleados e ON e.idempleado = dp.idempleado
 WHERE e.cargo = 'instructor' AND e.nombres = 'Profesor';
UPDATE usuarios u JOIN empleados e ON e.idempleado = u.idempleado
   SET u.activo = 0
 WHERE e.cargo = 'instructor' AND e.nombres = 'Profesor';
UPDATE empleados e
   SET e.activo = 0
 WHERE e.cargo = 'instructor' AND e.nombres = 'Profesor'
   AND NOT EXISTS (SELECT 1 FROM clases_grupales c WHERE c.activa = 1 AND c.idempleado = e.idempleado);

SELECT 'Horario Sede Los Incas cargado' AS resultado,
       (SELECT COUNT(*) FROM clases_grupales WHERE activa = 1) AS clases,
       (SELECT COUNT(DISTINCT idempleado) FROM clases_grupales WHERE activa = 1) AS profesores;
