# Base de datos `gestion_radicalgym`

Base MySQL 8 de Radical Gym. Toma el diseño de Darío (tablas en español, `idalumno` / `idempleado`, numeración desde 1000, triggers de negocio) **sin spinning**, con fisioterapia ampliada y un sistema completo de usuarios y permisos.

## Instalación (un solo script)

Abre **`gestion_radicalgym.sql`** en MySQL Workbench y ejecútalo completo (⚡). Crea la base con **todas** las tablas, triggers, procedimientos, catálogos (alimentos, ejercicios, planes, mensajes), roles, permisos y los usuarios del personal.

> ⚠️ Borra y vuelve a crear la base. Para no perder datos, saca antes una copia desde el sistema (Inicio → «Hacer copia ahora»); la copia también es un solo archivo `.sql` con tablas y registros, y se restaura igual.

La carpeta `anteriores/` guarda los scripts sueltos de antes (01 a 36) solo como referencia, por si alguna base antigua necesita una actualización puntual. Para instalar no hacen falta.

### Herramientas (no son actualizaciones)

- `anteriores/verificar_integridad.sql`: solo lectura. Revisa que todo lo registrado en el sistema esté sincronizado y cuadrado (registros de la app copiados a sus tablas, cobros en caja, abonos, ventas, stock contra kárdex, alumnos con código y usuario). En cada fila, "problemas = 0" es lo correcto.
- `anteriores/36_pendientes_finales.sql`: para bases instaladas antes de la limpieza 33. Borra los 6 pagos de planilla de contratos demo (`pyr-demo-…`), quita las 4 tablas viejas **solo si están vacías**, los 5 procedimientos sin uso y deja al día el disparador de asistencias del personal. Ejecútalo una vez en Workbench con root.
- `anteriores/99_reiniciar_para_produccion.sql`: **borra todos los datos de prueba y demostración** (alumnos, matrículas, asistencias, ventas, caja, CRM...) y deja la configuración, los planes, los catálogos y los usuarios del personal. Úsalo una sola vez, antes de empezar con datos reales, y saca un respaldo antes.

## Usuarios de prueba

| Rol | Usuario | Contraseña |
|---|---|---|
| Administración | `admin` | `Radical2026!` |
| Entrenador | `entrenador` | `Coach2026!` |
| Fisioterapia | `fisioterapia` | `Fisio2026!` |
| Nutrición | `nutricion` | `Nutri2026!` |
| Recepción | `recepcion` | `Recep2026!` |

La base arranca **sin datos de demostración**, lista para datos reales. El personal viene con nombres genéricos ("Entrenador Principal", etc.); reemplázalos por los nombres reales. Los alumnos reciben su cuenta al registrarse: **usuario = DNI** y **clave temporal = DNI**; el sistema les pide cambiarla en su primer ingreso. Recepción o administración pueden restablecerla desde la ficha del alumno.

Para el personal, el administrador crea **una cuenta por persona** en *Usuarios & Accesos* (por ejemplo, una por cada recepcionista). El sistema genera una clave temporal y pide cambiarla en el primer ingreso.

Las contraseñas están cifradas con **bcrypt**. Cámbialas antes de usar datos reales.

## Estructura (53 tablas)

| Área | Tablas |
|---|---|
| **Seguridad** | `roles`, `modulos`, `rol_permisos`, `usuarios`, `usuario_permisos`, `sesiones`, `historial_accesos`, `recuperacion_clave`, `auditoria` |
| Personas | `empleados`, `alumnos`, `planes`, `configuracion` |
| Membresías | `matriculas` (con `precio_total` y `fecha_limite_pago` para deudas), `pagos_matricula`, `congelamientos`, `asistencias_alumno` |
| Personal | `contratos`, `horarios_empleado`, `asistencias_empleado`, `permisos_laborales`, `planilla` |
| Citas | `citas` |
| Nutrición | `alimentos` (catálogo; el nutricionista agrega los suyos), `dietas`, `dieta_platos`, `dieta_comidas`, `dieta_alimentos`, `medidas` |
| Fisioterapia | `tecnicas_fisioterapia`, `plantillas_fisioterapia`, `sesiones_fisioterapia`, `sesion_zonas`, `sesion_tecnicas` |
| Entrenamiento | `ejercicios`, `rutinas`, `rutina_dias`, `rutina_ejercicios` |
| Tienda y caja | `productos`, `ventas`, `venta_detalle`, `turnos_caja`, `movimientos_caja`, `movimientos_inventario` (kárdex) |
| Avisos | `reglas_notificacion`, `notificaciones`, `clases`, `clase_inscripciones` |
| Registros del sistema | `registros_app` (rutinas, asignaciones, dietas, evaluaciones, fisioterapia, citas, asistencias, productos, avisos, contratos, planilla; en JSON y con el alumno dueño) |

## Sincronización sistema ↔ tablas

Las pantallas guardan cada registro completo en `registros_app` (JSON). En la **misma operación**, la API lo copia a su tabla real, así todo queda como historial consultable desde Workbench:

| En el sistema | Tablas donde queda |
|---|---|
| Citas | `citas` |
| Rutinas y su asignación | `rutinas`, `rutina_dias`, `rutina_ejercicios` (con código, nombre y GIF del banco) y `alumnos.idrutina` |
| Dietas | `dietas`, `dieta_comidas`, `dieta_alimentos` |
| Medidas | `medidas` (IMC e índices los calcula el trigger) |
| Fisioterapia | `sesiones_fisioterapia`, `sesion_zonas`, `sesion_tecnicas`, `tecnicas_fisioterapia` |
| Asistencias | `asistencias_alumno` y `asistencias_empleado` |
| Productos, contratos, planilla | `productos`, `contratos` (crea al trabajador en `empleados` si no existe), `planilla` |
| Clases y avisos | `clases`, `reglas_notificacion`, `notificaciones`, `plantillas_fisioterapia` |

- Cada fila guarda `idregistro_app` (el id del registro en el sistema). Editar o eliminar en el sistema actualiza o elimina la fila.
- Las reglas de la base se aplican: por ejemplo, si un especialista ya tiene una cita en ese horario, la cita **no se guarda** y el sistema muestra el aviso.
- `registros_app.sync_estado` indica si cada registro está copiado (`ok`), por copiar (`pendiente`) o con `error` (y el motivo en `sync_detalle`). El administrador lo ve en el Dashboard ("Base de datos") y puede volver a copiar.
- La planilla pagada no genera un segundo egreso en caja: el sistema ya registra ese pago.

Ejemplo de consulta: `SELECT a.nombres, c.fecha, c.hora_inicio, c.servicio, c.estado FROM citas c JOIN alumnos a USING (idalumno) ORDER BY c.fecha DESC;`

## Metas, logros y bonos

- `turnos_recepcion`: Turno 1, Turno 2… Cada recepcionista tiene su turno (`usuarios.idturno_recepcion`) y cada caja que abre queda marcada con ese turno (`turnos_caja.idturno_recepcion`).
- `metas`: administración asigna una meta en soles a un turno de recepción (por mes o fechas) o una meta de logros a un entrenador, con su bono. El avance de recepción suma todos los ingresos de las cajas de ese turno; el sistema muestra lo que falta en el mes, la semana y el día.
- `objetivos_alumno`: nutrición o fisioterapia registra el objetivo del alumno (ej. bajar de 90 a 85 kg, dolor EVA 7 → 2) y, en el siguiente control, marca si se consiguió. Si se consigue, el entrenador del alumno gana un logro (mancuerna). Nutrición solo evalúa los suyos y fisioterapia los suyos.
- `bonos`: al cumplirse una meta, administración aprueba el bono y luego lo marca como pagado (queda como egreso en caja).

## Deudas de alumnos

- Si el alumno paga menos que el precio (matrícula o renovación), queda una deuda y **es obligatorio indicar hasta cuándo la cancelará** (`fecha_limite_pago`, de hoy a 6 meses). Si una matrícula antigua no tiene fecha, se usa el fin de la membresía.
- Deuda = `precio_total - monto - pagos_matricula`. Los abonos se aplican de la matrícula más antigua a la más reciente y entran a caja como "Pago de saldo".
- Al abonar una parte se puede fijar una nueva fecha para el resto; recepción o administración también pueden reprogramarla desde el estado de cuenta.
- Estados: **Vencida** (pasó la fecha), **Por vencer** (3 días o menos), **En plazo**.
- El alumno ve su saldo y la fecha límite en su portal. *Reportes → Deudas y pendientes* muestra gráficos (por estado, antigüedad, mayores deudores, por plan), los saldos cobrados y exporta a Excel/PDF/WhatsApp.

## Nutrición: platos y catálogo

- Cada dieta tiene los platos que el nutricionista asigne (uno, tres, siete…), en `dieta_platos`: nombre, hora, modelo, % de verduras/proteína/carbohidratos/grasas (suma 100) y porciones con la mano (palmas, puños, manos ahuecadas, pulgares).
- `alimentos`: valores por 100 g (Tablas Peruanas de Composición de Alimentos CENAN/INS 2017 y USDA), categoría, ícono, porción habitual y medida casera. `es_propio = 1` son los que agregó nutrición; ocultar no borra (las dietas que lo usan no cambian).
- Cada alimento de una dieta queda enlazado a su ficha del catálogo (`dieta_alimentos.idalimento`), con gramos, kcal y macros.

Para publicar en internet ver `../DESPLIEGUE.md`.

## Congelamiento de membresías

- Cada plan dice si permite congelar y cómo (Planes & Tarifas): `congelamiento_dias` (0 = no permite), `congelamiento_partes` (1 = todo de una vez) y `congelamiento_min_dias` (mínimo por congelamiento). Ej.: promoción S/150 → sin congelamiento; anual S/900 → 30 días en hasta 2 partes de mínimo 15 (30 seguidos o 15 + 15).
- Al vender o renovar, la matrícula copia las reglas del plan: si después se cambia el plan, el alumno conserva lo que compró.
- **Todo o nada**: no se congela de a pocos. La última parte usa todos los días que quedan y nunca puede quedar un saldo menor al mínimo.
- Cada congelamiento tiene fecha de inicio y de fin (hoy o programado hasta 60 días antes); al día siguiente del fin el alumno se reactiva solo. La membresía (y las renovaciones ya pagadas) se alarga los mismos días.
- El derecho caduca cuando vence la membresía.
- **Volvió antes**: se reactiva hoy, el vencimiento se acorta por los días no usados y esos días se pierden. **Anular**: deshace todo y devuelve los días (recepción solo si aún no empezó; si ya empezó, solo administración).
- Mientras está congelado, el check-in le niega el ingreso.
- Se ve en Alumnos (filtro "Congelados", insignia y botón ❄️), en el centro de notificaciones (quién vuelve y quién empieza), en el portal del alumno y en *Reportes → Congelamientos* (historial con gráficos y "días por usar y caducidad"), exportable a Excel/PDF/WhatsApp.

## Reportes

Administración filtra alumnos (vencidos, por vencer, con deuda, por plan, sexo, edad, entrenador, inscritos hoy o en un mes, sin asistir, cumpleaños…), matrículas y paquetes más comprados, ingresos y egresos por turno, asistencias y metas. Lo filtrado se exporta a Excel o PDF y se envía al WhatsApp del administrador (configurable en Usuarios & Accesos > Configuración).

## Tienda (POS)

- Los productos viven en `productos`. Cada venta crea una fila en `ventas` y sus líneas en `venta_detalle`; la base toma el precio, **descuenta el stock bloqueando el producto** (dos cajas vendiendo a la vez no se pisan: si no alcanza, la segunda recibe "Stock insuficiente") y registra el ingreso en caja dentro del turno abierto.
- Ticket correlativo `T001-000001`, `T001-000002`… (uso interno; no es comprobante electrónico SUNAT).
- **Anular venta** (administración): devuelve el stock y retira el ingreso de la caja. Solo ventas del turno abierto; lo de un turno cerrado se devuelve como gasto en "Caja por Turnos".
- **Kárdex** (`movimientos_inventario`): stock inicial, ingresos de mercadería (con costo), ventas, anulaciones, mermas y ajustes por inventario físico, con el stock resultante y quién lo hizo. Recepción puede registrar ingresos; mermas y ajustes, administración.
- Reporte: total vendido, ticket promedio, ganancia estimada, productos más vendidos, ventas por método de pago e inventario valorizado.

## Caja por turnos (arqueo)

1. La recepcionista entra y **abre su caja** contando el efectivo que recibe. El sistema le muestra cuánto dejó el turno anterior y pide una observación si no coincide.
2. Mientras su turno está abierto, cada venta del POS, matrícula, renovación o gasto se asocia solo a su turno (trigger `trg_movimientos_caja_turno`).
3. Al terminar **cierra la caja**: cuenta billetes y monedas, el sistema calcula lo que debía haber (apertura + cobros en efectivo − gastos en efectivo) y muestra si sobra o falta. Indica cuánto deja para el siguiente turno y cuánto entrega a administración.
4. Solo puede haber **una caja abierta** a la vez (`uq_turno_abierto`). Recepción no puede cobrar con la caja cerrada.
5. Yape/Plin, tarjeta y transferencia se registran por separado: no se cuentan en el efectivo.

## Cómo funcionan los permisos

1. Cada **rol** tiene permisos por **módulo** en `rol_permisos`: ver, crear, editar y eliminar.
2. Un usuario puede tener **excepciones** en `usuario_permisos`, por ejemplo dar Finanzas a una recepcionista concreta. La excepción manda sobre el rol.
3. `CALL sp_usuario_permisos(idusuario)` devuelve los módulos que ve ese usuario.
4. Los códigos de rol y de módulo son los mismos de `src/config/roles.js`.

## Login (lo hará el backend)

1. `CALL sp_login_buscar('usuario')`: devuelve el hash y el estado de la cuenta.
2. El backend compara la clave con bcrypt.
3. `CALL sp_login_registrar('usuario', exitoso, token_id, horas, ip, dispositivo)`: registra el intento y, si fue correcto, abre la sesión y devuelve los permisos.
   - A los **5 intentos fallidos** la cuenta se bloquea 15 minutos.
   - Todo intento queda en `historial_accesos`.

Otros procedimientos: `sp_sesion_validar`, `sp_sesion_cerrar`, `sp_sesiones_cerrar_usuario`, `sp_usuario_crear`, `sp_usuario_cambiar_clave`, `sp_usuario_restablecer_clave`, `sp_usuario_desbloquear`, `sp_usuarios_listar`, `sp_estados_actualizar` (correr 1 vez al día), `sp_asistencia_alumno_registrar`, `sp_panel_resumen`.

## Reglas automáticas (triggers)

- **Matrícula:** calcula la fecha de fin y el monto según el plan, fija el estado y registra el ingreso en caja. Si se anula, se retira de caja.
- **Venta:** valida el stock, calcula subtotales y total, descuenta el stock, registra el ingreso en caja y avisa cuando hay stock bajo.
- **Medidas:** calcula el IMC con su clasificación, el índice cintura/cadera y el índice cintura/talla.
- **Dietas:** calcula las kcal y los macros desde el catálogo de alimentos, y el total de la dieta.
- **Fisioterapia:** numera las sesiones por alumno.
- **Citas:** impide cruces de horario del profesional.
- **Personal:**
  - Asistencia: puntual o tarde (10 minutos de tolerancia) y horas trabajadas.
  - Permisos aprobados: marcan los días.
  - Planilla: calcula el neto y registra el egreso en caja al pagar.
- **Seguridad:**
  - Auditoría de usuarios.
  - Al cambiar la clave se reinician los intentos fallidos.
  - Al desactivar un usuario se cierran sus sesiones.
  - Si un empleado o un alumno se da de baja, su cuenta se desactiva.
  - Los roles base no se pueden borrar.

## Diferencias con la base de Darío

- Sin spinning: 4 tablas, sus triggers y la categoría de caja.
- **Seguridad nueva:** roles y módulos en tablas, permisos por acción y por usuario, sesiones, historial de accesos, bloqueo por intentos fallidos y recuperación de clave.
- **Fisioterapia ampliada:** evaluación física y funcional y dosificación de ejercicios en JSON, plantillas clínicas, vínculo con la cita y envío del reporte.
- `permisos` pasa a llamarse `permisos_laborales`, para no confundirlo con los permisos de acceso.
- Citas también para entrenamiento personal; clases con inscripciones; alimentos con macros.

## Conexión con la app

La API de Node (`servidor/`) se conecta con el usuario MySQL `radicalgym_app`. Ese usuario solo tiene permisos SELECT, INSERT, UPDATE, DELETE y EXECUTE sobre esta base, y su clave está en el archivo `gestion_radicalgym.env` (no se sube a GitHub). Si reinstalas la base, ese usuario se mantiene.
