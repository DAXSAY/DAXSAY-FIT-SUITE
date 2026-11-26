-- =====================================================================
-- REVISIÓN COMPLETA DE INTEGRIDAD (solo lectura: no cambia nada)
-- Devuelve una sola tabla: sección · revisión · cantidad · estado
-- «OK» = cantidad 0 (o lo esperado). «REVISAR» = hay algo que mirar.
-- =====================================================================
USE gestion_radicalgym;

SELECT seccion, revision, cantidad, IF(cantidad = 0, 'OK', 'REVISAR') AS estado FROM (
  -- ---------- Alumnos y cuentas ----------
  SELECT '1 Alumnos' AS seccion, 'DNI repetido entre alumnos' AS revision, (SELECT COUNT(*) FROM (SELECT dni FROM alumnos GROUP BY dni HAVING COUNT(*) > 1) x) AS cantidad
  UNION ALL SELECT '1 Alumnos', 'Alumno activo sin ninguna matrícula', (SELECT COUNT(*) FROM alumnos a WHERE a.activo = 1 AND NOT EXISTS (SELECT 1 FROM matriculas m WHERE m.idalumno = a.idalumno))
  UNION ALL SELECT '1 Alumnos', 'Alumno activo sin cuenta del portal', (SELECT COUNT(*) FROM alumnos a WHERE a.activo = 1 AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.idalumno = a.idalumno))
  UNION ALL SELECT '1 Alumnos', 'Cuenta de alumno sin ficha de alumno', (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.idrol = u.idrol WHERE r.codigo = 'student' AND (u.idalumno IS NULL OR NOT EXISTS (SELECT 1 FROM alumnos a WHERE a.idalumno = u.idalumno)))
  UNION ALL SELECT '1 Alumnos', 'Usuario del personal sin empleado', (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.idrol = u.idrol WHERE r.codigo <> 'student' AND u.usuario <> 'admin' AND u.idempleado IS NULL)
  UNION ALL SELECT '1 Alumnos', 'Entrenador asignado que no existe', (SELECT COUNT(*) FROM alumnos a WHERE a.identrenador IS NOT NULL AND NOT EXISTS (SELECT 1 FROM empleados e WHERE e.idempleado = a.identrenador))
  -- ---------- Matrículas y pagos ----------
  UNION ALL SELECT '2 Matrículas', 'Fecha de fin antes del inicio', (SELECT COUNT(*) FROM matriculas WHERE fecha_fin < fecha_inicio)
  UNION ALL SELECT '2 Matrículas', 'Pagado mayor que el precio', (SELECT COUNT(*) FROM matriculas m WHERE m.precio_total IS NOT NULL AND m.monto > m.precio_total + 0.01)
  UNION ALL SELECT '2 Matrículas', 'Pago suelto sin matrícula', (SELECT COUNT(*) FROM pagos_matricula p WHERE NOT EXISTS (SELECT 1 FROM matriculas m WHERE m.idmatricula = p.idmatricula))
  UNION ALL SELECT '2 Matrículas', 'Matrícula con plan inexistente', (SELECT COUNT(*) FROM matriculas m WHERE NOT EXISTS (SELECT 1 FROM planes p WHERE p.idplan = m.idplan))
  UNION ALL SELECT '2 Matrículas', 'Congelamiento de otra persona (alumno distinto a su matrícula)', (SELECT COUNT(*) FROM congelamientos c JOIN matriculas m ON m.idmatricula = c.idmatricula WHERE m.idalumno <> c.idalumno)
  -- ---------- Caja y ventas ----------
  UNION ALL SELECT '3 Caja y ventas', 'Más de una caja abierta a la vez', (SELECT GREATEST(COUNT(*) - 1, 0) FROM turnos_caja WHERE estado = 'abierto')
  UNION ALL SELECT '3 Caja y ventas', 'Venta sin productos (detalle vacío)', (SELECT COUNT(*) FROM ventas v WHERE v.anulada = 0 AND NOT EXISTS (SELECT 1 FROM venta_detalle d WHERE d.idventa = v.idventa))
  UNION ALL SELECT '3 Caja y ventas', 'Total de venta distinto a la suma del detalle', (SELECT COUNT(*) FROM ventas v WHERE v.anulada = 0 AND ABS(v.total - (SELECT COALESCE(SUM(d.subtotal), 0) FROM venta_detalle d WHERE d.idventa = v.idventa)) > 0.01)
  UNION ALL SELECT '3 Caja y ventas', 'Venta hecha por un usuario que no existe', (SELECT COUNT(*) FROM ventas v WHERE v.idusuario IS NOT NULL AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.idusuario = v.idusuario))
  UNION ALL SELECT '3 Caja y ventas', 'Movimiento de caja de un alumno que no existe', (SELECT COUNT(*) FROM movimientos_caja mc WHERE mc.idalumno IS NOT NULL AND NOT EXISTS (SELECT 1 FROM alumnos a WHERE a.idalumno = mc.idalumno))
  UNION ALL SELECT '3 Caja y ventas', 'Movimiento de caja de un empleado que no existe', (SELECT COUNT(*) FROM movimientos_caja mc WHERE mc.idempleado IS NOT NULL AND NOT EXISTS (SELECT 1 FROM empleados e WHERE e.idempleado = mc.idempleado))
  UNION ALL SELECT '3 Caja y ventas', 'Producto con stock negativo', (SELECT COUNT(*) FROM productos WHERE stock < 0)
  -- ---------- Asistencias ----------
  UNION ALL SELECT '4 Asistencias', 'Entrada repetida el mismo día', (SELECT COUNT(*) FROM (SELECT idalumno, fecha FROM asistencias_alumno WHERE tipo = 'entrada' GROUP BY idalumno, fecha HAVING COUNT(*) > 1) x)
  UNION ALL SELECT '4 Asistencias', 'Asistencia con fecha futura', (SELECT COUNT(*) FROM asistencias_alumno WHERE fecha > CURDATE())
  -- ---------- Copias a tablas (registros de la app) ----------
  UNION ALL SELECT '5 Registros', 'Registros con ERROR al copiarse a su tabla', (SELECT COUNT(*) FROM registros_app WHERE sync_estado = 'error')
  UNION ALL SELECT '5 Registros', 'Registros pendientes de copiar', (SELECT COUNT(*) FROM registros_app WHERE sync_estado = 'pendiente')
  UNION ALL SELECT '5 Registros', 'Registro de un alumno que no existe', (SELECT COUNT(*) FROM registros_app r WHERE r.idalumno IS NOT NULL AND NOT EXISTS (SELECT 1 FROM alumnos a WHERE a.idalumno = r.idalumno))
  UNION ALL SELECT '5 Registros', 'Rutinas: diferencia entre la app y su tabla', (SELECT ABS((SELECT COUNT(*) FROM registros_app WHERE modulo = 'rutinas') - (SELECT COUNT(*) FROM rutinas WHERE idregistro_app IS NOT NULL)))
  UNION ALL SELECT '5 Registros', 'Dietas: diferencia entre la app y su tabla', (SELECT ABS((SELECT COUNT(*) FROM registros_app WHERE modulo = 'planes_nutricion') - (SELECT COUNT(*) FROM dietas WHERE idregistro_app IS NOT NULL)))
  UNION ALL SELECT '5 Registros', 'Fisioterapia: diferencia entre la app y su tabla', (SELECT ABS((SELECT COUNT(*) FROM registros_app WHERE modulo = 'fisioterapia') - (SELECT COUNT(*) FROM sesiones_fisioterapia WHERE idregistro_app IS NOT NULL)))
  -- ---------- CRM, tareas ----------
  UNION ALL SELECT '6 CRM y tareas', 'Interesado matriculado sin alumno enlazado', (SELECT COUNT(*) FROM prospectos WHERE estado = 'matriculado' AND idalumno IS NULL)
  UNION ALL SELECT '6 CRM y tareas', 'Pase libre de un interesado que no existe', (SELECT COUNT(*) FROM pases_libres pl WHERE NOT EXISTS (SELECT 1 FROM prospectos p WHERE p.idprospecto = pl.idprospecto))
  UNION ALL SELECT '6 CRM y tareas', 'Tarea de un interesado que no existe', (SELECT COUNT(*) FROM tareas t WHERE t.idprospecto IS NOT NULL AND NOT EXISTS (SELECT 1 FROM prospectos p WHERE p.idprospecto = t.idprospecto))
  UNION ALL SELECT '6 CRM y tareas', 'Tarea tomada/cerrada por un usuario que no existe', (SELECT COUNT(*) FROM tareas t WHERE (t.idusuario_tomada IS NOT NULL AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.idusuario = t.idusuario_tomada)) OR (t.idusuario_cierre IS NOT NULL AND NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.idusuario = t.idusuario_cierre)))
  UNION ALL SELECT '6 CRM y tareas', 'Tareas abiertas de alumnos dados de baja', (SELECT COUNT(*) FROM tareas t JOIN alumnos a ON a.idalumno = t.idalumno WHERE a.activo = 0 AND t.estado IN ('pendiente','en_curso'))
  -- ---------- Tablas sin uso (informativo) ----------
  UNION ALL SELECT '7 Tablas', 'Tablas vacías (informativo)', (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_ROWS = 0)
  UNION ALL SELECT '7 Tablas', 'Tablas de respaldo temporales (resp*)', (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'resp%')
  UNION ALL SELECT '7 Tablas', 'Total de tablas (informativo)', (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE')
) r
ORDER BY seccion, revision;
