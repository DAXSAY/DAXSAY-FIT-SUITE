// =====================================================================
// LICENCIA · módulos contratados (DAXSAY Fit Suite es un sistema general)
//  Cada gimnasio usa solo los servicios de su contrato: uno no tiene
//  clases grupales, otro no tiene fisioterapia… Los módulos se prenden o
//  apagan por PAQUETE (con sus pantallas del personal y del alumno).
//  Solo DAXSAY puede cambiarlos: hace falta la clave maestra (tabla
//  licencia, parte 42). El administrador del gimnasio solo ve qué tiene.
//  Apagar un módulo lo quita del menú de todos, bloquea sus rutas y sus
//  avisos; no borra ningún dato (se puede volver a prender).
// =====================================================================
import { Router } from "express";
import bcrypt from "bcryptjs";
import { consultar } from "../db.js";
import { ErrorHttp } from "../seguridad.js";

const router = Router();

/** Paquetes contratables y los módulos (pestañas) que incluye cada uno */
export const PAQUETES = [
  { k: "clases", nombre: "Clases grupales y másters", emoji: "🎵", modulos: ["classes", "mis_clases"] },
  { k: "fisioterapia", nombre: "Fisioterapia", emoji: "🩺", modulos: ["physiotherapy", "mi_fisioterapia"] },
  { k: "nutricion", nombre: "Nutrición y medidas", emoji: "🥗", modulos: ["nutrition", "mi_dieta", "mis_medidas"] },
  { k: "rutinas", nombre: "Rutinas y entrenamiento", emoji: "🏋️", modulos: ["routines", "mi_rutina"] },
  { k: "citas", nombre: "Horarios y citas", emoji: "📅", modulos: ["appointments"] },
  { k: "ventas", nombre: "Ventas / tienda", emoji: "🛍️", modulos: ["store"] },
  { k: "caja", nombre: "Caja por turnos", emoji: "🏦", modulos: ["cash"] },
  { k: "finanzas", nombre: "Finanzas", emoji: "💲", modulos: ["finance"] },
  { k: "crm", nombre: "Interesados (CRM)", emoji: "📇", modulos: ["crm"] },
  { k: "tareas", nombre: "Asignación de tareas", emoji: "📋", modulos: ["tasks"] },
  { k: "metas", nombre: "Metas y logros", emoji: "🏆", modulos: ["goals"] },
  { k: "contratos", nombre: "Contratos de personal", emoji: "💼", modulos: ["staff"] },
  { k: "reportes", nombre: "Reportes", emoji: "📊", modulos: ["reports"] },
  { k: "notificaciones", nombre: "Notificaciones y WhatsApp", emoji: "🔔", modulos: ["alerts"] },
];
/** Siempre incluidos: lo mínimo para operar un gimnasio */
export const BASE = ["dashboard", "members", "memberships", "users", "attendances", "mi_membresia", "mis_citas", "mis_asistencias"];

let cache = { t: 0, activos: null };
/** Códigos de módulos activos (con caché corta) */
export async function modulosActivos() {
  if (cache.activos && Date.now() - cache.t < 10000) return cache.activos;
  const filas = await consultar("SELECT codigo FROM modulos WHERE activo = 1");
  cache = { t: Date.now(), activos: new Set(filas.map((f) => f.codigo)) };
  return cache.activos;
}
export async function moduloActivo(codigo) {
  return (await modulosActivos()).has(codigo);
}
/** Middleware: la ruta solo responde si el gimnasio contrató ese módulo */
export function requiereModulo(...codigos) {
  return async (req, res, next) => {
    try {
      const act = await modulosActivos();
      if (!codigos.some((c) => act.has(c))) throw new ErrorHttp(403, "Este servicio no está incluido en el plan del gimnasio");
      next();
    } catch (e) {
      next(e);
    }
  };
}

async function hayLicencia() {
  const [f] = await consultar("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'licencia'");
  return Number(f?.n) === 1;
}
async function verificarClave(clave) {
  if (!(await hayLicencia())) throw new ErrorHttp(503, "Falta ejecutar la parte 42 (42_sedes_licencia.sql) en MySQL Workbench.");
  const [l] = await consultar("SELECT clave_hash FROM licencia WHERE id = 1");
  if (!l || !(await bcrypt.compare(String(clave || ""), l.clave_hash))) {
    await new Promise((r) => setTimeout(r, 800)); // frena a quien intente adivinar
    throw new ErrorHttp(403, "Clave maestra DAXSAY incorrecta");
  }
}

const estado = async () => {
  const filas = await consultar("SELECT codigo, activo FROM modulos");
  const act = new Map(filas.map((f) => [f.codigo, !!f.activo]));
  return PAQUETES.map((p) => {
    const existen = p.modulos.filter((m) => act.has(m));
    return { k: p.k, nombre: p.nombre, emoji: p.emoji, activo: existen.length > 0 && existen.some((m) => act.get(m)), disponible: existen.length > 0 };
  });
};

// GET /api/licencia -> paquetes y si están activos (personal)
router.get("/", async (req, res, next) => {
  try {
    if (req.usuario.rol === "student") throw new ErrorHttp(403, "Solo el personal");
    res.json({ paquetes: await estado(), base: BASE, conLicencia: await hayLicencia() });
  } catch (e) {
    next(e);
  }
});

// PUT /api/licencia { clave, activos: ["clases", ...], claveNueva? } (solo administración + clave DAXSAY)
router.put("/", async (req, res, next) => {
  try {
    if (req.usuario.rol !== "admin") throw new ErrorHttp(403, "Solo desde una cuenta de administración");
    const b = req.body || {};
    await verificarClave(b.clave);
    if (Array.isArray(b.activos)) {
      const on = new Set(b.activos);
      for (const p of PAQUETES) {
        const marcas = p.modulos.map(() => "?").join(",");
        await consultar(`UPDATE modulos SET activo = ? WHERE codigo IN (${marcas})`, [on.has(p.k) ? 1 : 0, ...p.modulos]);
      }
      await consultar(`UPDATE modulos SET activo = 1 WHERE codigo IN (${BASE.map(() => "?").join(",")})`, BASE);
      cache = { t: 0, activos: null };
    }
    if (b.claveNueva !== undefined) {
      const n = String(b.claveNueva || "");
      if (n.length < 10) throw new ErrorHttp(400, "La clave maestra nueva debe tener al menos 10 caracteres");
      await consultar("UPDATE licencia SET clave_hash = ? WHERE id = 1", [await bcrypt.hash(n, 10)]);
    }
    res.json({ ok: true, paquetes: await estado() });
  } catch (e) {
    next(e);
  }
});

export default router;
