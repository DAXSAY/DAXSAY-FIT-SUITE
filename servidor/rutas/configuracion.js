// Configuración del gimnasio (nombre, WhatsApp del gimnasio y del administrador...)
import { Router } from "express";
import { consultar } from "../db.js";
import { ErrorHttp, requierePermiso } from "../seguridad.js";

const router = Router();
const CLAVES = [
  "gym_nombre", "gym_whatsapp", "admin_whatsapp", "gym_direccion", "gym_ruc",
  // % que queda para el gimnasio ("derecho de piso") en servicios de profesionales
  "pct_gym_entrenamiento", "pct_gym_fisioterapia", "pct_gym_nutricion", "pct_gym_masters",
  // Reglas de descuento por tardanza del personal (JSON)
  "reglas_tardanza",
  // Días sin renovar para que un alumno cuente como exalumno (gerencia)
  "dias_exalumno",
];

// GET /api/configuracion  -> todos los usuarios conectados (el portal usa el WhatsApp)
router.get("/", async (req, res, next) => {
  try {
    const filas = await consultar("SELECT clave, valor FROM configuracion");
    const datos = Object.fromEntries(filas.map((f) => [f.clave, f.valor || ""]));
    // El alumno no necesita el número del administrador
    if (req.usuario.rol === "student") delete datos.admin_whatsapp;
    res.json(datos);
  } catch (e) {
    next(e);
  }
});

// PUT /api/configuracion  { gym_nombre, gym_whatsapp, admin_whatsapp, ... }  (administración)
router.put("/", requierePermiso("users", "editar"), async (req, res, next) => {
  try {
    const d = req.body || {};
    for (const clave of CLAVES) {
      if (d[clave] === undefined) continue;
      let valor = String(d[clave] ?? "").trim().slice(0, 500);
      if (clave.startsWith("pct_gym_")) {
        const n = Number(valor);
        if (!Number.isFinite(n) || n < 0 || n > 100) throw new ErrorHttp(400, "El porcentaje debe estar entre 0 y 100");
        valor = String(Math.round(n * 10) / 10);
      }
      if (clave === "dias_exalumno") {
        const n = Math.round(Number(valor));
        if (!Number.isFinite(n) || n < 1 || n > 365) throw new ErrorHttp(400, "Los días para exsocio deben estar entre 1 y 365");
        valor = String(n);
      }
      if (clave === "reglas_tardanza" && valor) {
        try {
          const r = JSON.parse(valor);
          if (!r || typeof r !== "object") throw new Error();
        } catch {
          throw new ErrorHttp(400, "Las reglas de tardanza no son válidas");
        }
      }
      if (clave.endsWith("whatsapp") && valor) {
        valor = valor.replace(/[^\d]/g, "");
        if (valor.length === 9) valor = `51${valor}`; // celular peruano sin código
        if (valor.length < 9) throw new ErrorHttp(400, "Número de WhatsApp no válido");
      }
      await consultar(
        `INSERT INTO configuracion (clave, valor, actualizado_por) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_por = VALUES(actualizado_por)`,
        [clave, valor, req.usuario.idusuario],
      );
    }
    const filas = await consultar("SELECT clave, valor FROM configuracion");
    res.json(Object.fromEntries(filas.map((f) => [f.clave, f.valor || ""])));
  } catch (e) {
    next(e);
  }
});

export default router;
