-- =====================================================================
-- 36 · PENDIENTES FINALES (una sola vez, en Workbench con root)
-- ---------------------------------------------------------------------
-- 1) Quita los 6 pagos de planilla de prueba: pertenecen a los contratos
--    demo (cnt-demo-1 a 4) que ya se borraron. Solo se borran filas cuyo
--    identificador empieza con «pyr-demo-»; nada más se toca.
-- 2) Aplica la limpieza 33: quita las 4 tablas viejas SOLO si están
--    vacías (si alguna tiene datos, no las toca), los 5 procedimientos
--    sin uso y deja el disparador de asistencias del personal al día.
--
-- ANTES DE EJECUTAR: el sistema ya hace copia diaria en respaldos/.
-- =====================================================================
USE gestion_radicalgym;
SET @modo_seguro = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- ---------- 1) Planilla de prueba ----------
SELECT idregistro, JSON_UNQUOTE(JSON_EXTRACT(datos, '$.period')) AS periodo
  FROM registros_app
 WHERE modulo = 'planilla' AND idregistro LIKE 'pyr-demo-cnt-demo-%';

DELETE FROM registros_app
 WHERE modulo = 'planilla' AND idregistro LIKE 'pyr-demo-cnt-demo-%';

-- ---------- 2) Limpieza 33, con candado ----------
DROP PROCEDURE IF EXISTS sp_limpieza_36;
DELIMITER $$
CREATE PROCEDURE sp_limpieza_36()
BEGIN
  DECLARE n INT DEFAULT 0;
  DECLARE t VARCHAR(64);
  DECLARE fin INT DEFAULT 0;
  DECLARE c CURSOR FOR
    SELECT table_name FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name IN ('clase_inscripciones', 'recuperacion_clave', 'permisos_laborales', 'horarios_empleado');
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin = 1;

  -- ¿Alguna de las tablas viejas tiene filas?
  OPEN c;
  revisar: LOOP
    FETCH c INTO t;
    IF fin = 1 THEN LEAVE revisar; END IF;
    SET @q = CONCAT('SELECT COUNT(*) INTO @filas FROM `', t, '`');
    PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
    SET n = n + @filas;
  END LOOP;
  CLOSE c;

  IF n > 0 THEN
    SELECT CONCAT('No se tocó nada: las tablas viejas tienen ', n, ' filas.') AS resultado;
  ELSE
    -- (al borrar permisos_laborales se va también su disparador)
    DROP TABLE IF EXISTS clase_inscripciones, recuperacion_clave, permisos_laborales, horarios_empleado;
    SELECT 'Limpieza aplicada: las 4 tablas vacías sin uso se quitaron.' AS resultado;
  END IF;
END$$

DELIMITER ;

CALL sp_limpieza_36();
DROP PROCEDURE sp_limpieza_36;

-- Procedimientos que ninguna pantalla ni ruta llama (no guardan datos)
DROP PROCEDURE IF EXISTS sp_asistencia_alumno_registrar;
DROP PROCEDURE IF EXISTS sp_panel_resumen;
DROP PROCEDURE IF EXISTS sp_usuarios_listar;
DROP PROCEDURE IF EXISTS sp_usuario_crear;
DROP PROCEDURE IF EXISTS sp_sesiones_cerrar_usuario;

-- El disparador de asistencias del personal, ya sin depender de horarios_empleado
DROP TRIGGER IF EXISTS trg_asis_empleado_antes_insertar;
DELIMITER $$
CREATE TRIGGER trg_asis_empleado_antes_insertar BEFORE INSERT ON asistencias_empleado
FOR EACH ROW
BEGIN
  IF NEW.hora_entrada IS NOT NULL AND NEW.hora_salida IS NOT NULL THEN
    SET NEW.horas_trabajadas = ROUND(TIME_TO_SEC(TIMEDIFF(NEW.hora_salida, NEW.hora_entrada)) / 3600, 2);
  ELSE
    SET NEW.horas_trabajadas = 0;
  END IF;
END$$
DELIMITER ;

SET SQL_SAFE_UPDATES = @modo_seguro;
