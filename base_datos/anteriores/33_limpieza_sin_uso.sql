-- =====================================================================
-- 33 · LIMPIEZA: tablas y procedimientos que el sistema ya no usa
-- ---------------------------------------------------------------------
-- Revisión completa (servidor, pantallas y scripts):
--   · clase_inscripciones  → ninguna pantalla ni ruta la usa.
--   · recuperacion_clave   → la recuperación de contraseña la atiende
--                            recepción (alertas), no esta tabla.
--   · permisos_laborales   → los permisos del personal se guardan desde
--                            Asistencias › Permisos (registros_app).
--   · horarios_empleado    → los horarios salen del contrato de cada
--                            trabajador; esta tabla siempre estuvo vacía.
--   · 5 procedimientos que ninguna ruta llama.
-- Se conservan sp_usuario_desbloquear y sp_usuario_restablecer_clave
-- como herramientas de emergencia desde Workbench.
--
-- ANTES DE EJECUTAR: haz una copia (Administración › Backup, o
-- Server › Data Export en Workbench). Borrar tablas no se puede deshacer.
-- =====================================================================
USE gestion_radicalgym;

-- 1) Mira cuántas filas tiene cada una (deberían ser 0)
SELECT 'clase_inscripciones' AS tabla, COUNT(*) AS filas FROM clase_inscripciones
UNION ALL SELECT 'recuperacion_clave', COUNT(*) FROM recuperacion_clave
UNION ALL SELECT 'permisos_laborales', COUNT(*) FROM permisos_laborales
UNION ALL SELECT 'horarios_empleado', COUNT(*) FROM horarios_empleado;

-- 2) Disparadores que dependen de esas tablas
DROP TRIGGER IF EXISTS trg_permlab_despues_actualizar;
DROP TRIGGER IF EXISTS trg_asis_empleado_antes_insertar;

DELIMITER $$
-- Igual que antes, pero sin buscar en horarios_empleado:
-- el estado (puntual/tarde) lo calcula el sistema con el horario del contrato.
CREATE TRIGGER trg_asis_empleado_antes_insertar BEFORE INSERT ON asistencias_empleado
FOR EACH ROW
BEGIN
  IF NEW.hora_entrada IS NOT NULL AND NEW.hora_salida IS NOT NULL THEN
    SET NEW.horas_trabajadas = ROUND(TIME_TO_SEC(TIMEDIFF(NEW.hora_salida, NEW.hora_entrada)) / 3600, 2);
  ELSE
    SET NEW.horas_trabajadas = 0;
  END IF;
END $$
DELIMITER ;

-- 3) Tablas sin uso
DROP TABLE IF EXISTS clase_inscripciones;
DROP TABLE IF EXISTS recuperacion_clave;
DROP TABLE IF EXISTS permisos_laborales;
DROP TABLE IF EXISTS horarios_empleado;

-- 4) Procedimientos que ninguna pantalla usa
DROP PROCEDURE IF EXISTS sp_asistencia_alumno_registrar;
DROP PROCEDURE IF EXISTS sp_panel_resumen;
DROP PROCEDURE IF EXISTS sp_usuarios_listar;
DROP PROCEDURE IF EXISTS sp_usuario_crear;
DROP PROCEDURE IF EXISTS sp_sesiones_cerrar_usuario;

-- 5) Comprobación
SELECT COUNT(*) AS tablas FROM information_schema.tables WHERE table_schema = DATABASE();
SELECT 'Limpieza terminada' AS resultado;
