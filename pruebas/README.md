# Pruebas automáticas de DAXSAY Fit Suite

Revisan que el sistema siga funcionando después de cada cambio.

> **Importante:** estas pruebas **crean datos** (alumnos "Prueba Paralela", ventas que luego se anulan, citas, asistencias).
> Úsalas solo con una **base de datos de pruebas**, nunca con la base real del gimnasio.
> Si el nombre de la base (`DB_NAME` en `.env`) no contiene "prueba", "demo" o "test", las pruebas se detienen solas.

## Cómo correrlas

1. Ten una base de pruebas instalada con `base_datos/gestion_radicalgym.sql` y los datos de demostración.
2. En `.env` (o en un `.env` aparte para pruebas) pon `DB_NAME=gestion_radicalgym_pruebas`.
3. Enciende el sistema (`npm run dev` o `npm start`).
4. En otra terminal:

```bash
npm run pruebas
```

Si estás seguro de que la base configurada es una copia de pruebas con otro nombre:

```bash
# Windows (PowerShell)
$env:PERMITIR_PRUEBAS="si"; npm run pruebas
```

## Qué revisan

**`api.mjs`** (267 comprobaciones)
- Los 6 usuarios (administrador, recepción, entrenador, fisioterapia, nutrición y alumno) abren las 38 consultas del sistema sin errores del servidor.
- Abrir caja, matricular 10 alumnos a la vez, vender, anular, marcar asistencias, permisos por rol, respaldo y bloqueo por intentos fallidos.

**`simultaneo.mjs`** (varias personas a la vez)
- Dos cajeros venden la última unidad al mismo tiempo: solo una venta pasa y el stock nunca queda negativo.
- Dos personas agendan al mismo especialista a la misma hora: solo entra una cita.
- Dos computadoras marcan el ingreso del mismo alumno en el mismo segundo: se guarda uno solo.
- Dos personas editan el mismo registro: la segunda recibe "Otra persona modificó este registro" y no pisa el cambio.
- La caja no se puede abrir dos veces a la vez.
- 240 consultas simultáneas sin errores y 20 ventas simultáneas con el stock exacto.

Si algo falla, la terminal muestra `FALLA` con el detalle y el comando termina con error.

## Usuarios de prueba

Por defecto usan los del README del proyecto. Si tu base de pruebas tiene otras contraseñas:

```bash
PRUEBAS_CLAVES='[["admin","OtraClave"],["recepcion","..."]]' npm run pruebas
```
