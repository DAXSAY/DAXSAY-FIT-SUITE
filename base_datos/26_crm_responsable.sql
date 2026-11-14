-- =====================================================================
-- 26. CRM: responsable de cada interesado y a quién se acredita la matrícula
--  * prospectos.idusuario_responsable: el recepcionista que lo registró
--    (se le puede reasignar; queda en el historial).
--  * matriculas.idprospecto: de qué interesado del CRM salió la matrícula.
--  * matriculas.idusuario_credito: a quién se le acredita la venta en metas y
--    proyecciones (el responsable), aunque la haya cobrado otro turno.
-- Se puede ejecutar más de una vez. Ejecutar como root en MySQL Workbench.
-- =====================================================================
SET NAMES utf8mb4;
SET SQL_SAFE_UPDATES = 0; -- Workbench bloquea UPDATE masivos por defecto
USE gestion_radicalgym;

-- Responsable del interesado
SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'prospectos' AND column_name = 'idusuario_responsable');
SET @sql := IF(@falta, 'ALTER TABLE prospectos ADD COLUMN idusuario_responsable INT NULL COMMENT ''Recepcionista responsable del seguimiento'' AFTER idusuario_registro', 'SELECT 1');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'prospectos' AND constraint_name = 'fk_prospecto_responsable');
SET @sql := IF(@falta, 'ALTER TABLE prospectos ADD CONSTRAINT fk_prospecto_responsable FOREIGN KEY (idusuario_responsable) REFERENCES usuarios (idusuario) ON DELETE SET NULL', 'SELECT 1');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
UPDATE prospectos SET idusuario_responsable = idusuario_registro WHERE idusuario_responsable IS NULL AND idusuario_registro IS NOT NULL;

-- Nuevo tipo de registro en el historial: cambio de responsable
ALTER TABLE prospecto_seguimientos
  MODIFY COLUMN tipo ENUM('nota','llamada','whatsapp','visita','estado','pase','agenda','responsable') NOT NULL DEFAULT 'nota';

-- De qué interesado salió la matrícula y a quién se acredita
SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'matriculas' AND column_name = 'idprospecto');
SET @sql := IF(@falta, 'ALTER TABLE matriculas ADD COLUMN idprospecto INT NULL COMMENT ''Interesado del CRM del que salió'' ', 'SELECT 1');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'matriculas' AND column_name = 'idusuario_credito');
SET @sql := IF(@falta, 'ALTER TABLE matriculas ADD COLUMN idusuario_credito INT NULL COMMENT ''Recepcionista al que se acredita la venta (metas)'' ', 'SELECT 1');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'matriculas' AND constraint_name = 'fk_matricula_prospecto');
SET @sql := IF(@falta, 'ALTER TABLE matriculas ADD CONSTRAINT fk_matricula_prospecto FOREIGN KEY (idprospecto) REFERENCES prospectos (idprospecto) ON DELETE SET NULL', 'SELECT 1');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;
SET @falta := (SELECT COUNT(*) = 0 FROM information_schema.table_constraints
  WHERE table_schema = DATABASE() AND table_name = 'matriculas' AND constraint_name = 'fk_matricula_credito');
SET @sql := IF(@falta, 'ALTER TABLE matriculas ADD CONSTRAINT fk_matricula_credito FOREIGN KEY (idusuario_credito) REFERENCES usuarios (idusuario) ON DELETE SET NULL', 'SELECT 1');
PREPARE paso FROM @sql; EXECUTE paso; DEALLOCATE PREPARE paso;

-- Matrículas que ya salieron del CRM: la primera matrícula del alumno se
-- vincula a su interesado y se acredita a su responsable
UPDATE matriculas m
  JOIN (SELECT idalumno, MIN(idmatricula) AS idm FROM matriculas WHERE es_renovacion = 0 GROUP BY idalumno) x ON x.idm = m.idmatricula
  JOIN prospectos p ON p.idalumno = m.idalumno
   SET m.idprospecto = p.idprospecto,
       m.idusuario_credito = COALESCE(p.idusuario_responsable, p.idusuario_registro)
 WHERE m.idprospecto IS NULL;

SELECT 'Actualización 26 lista' AS resultado,
       (SELECT COUNT(*) FROM prospectos WHERE idusuario_responsable IS NOT NULL) AS interesados_con_responsable,
       (SELECT COUNT(*) FROM matriculas WHERE idprospecto IS NOT NULL) AS matriculas_del_crm;
