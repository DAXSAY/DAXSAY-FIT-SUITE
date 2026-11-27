// =====================================================================
// SERVICIOS POR ALUMNO (parte 43)
//  Medidas (bioimpedancia + centímetro), dieta, evaluación nutricional,
//  fisioterapia, entrenador… Cada uno puede venir:
//   · incluido en su plan (lo decide gerencia al crear el plan), o
//   · comprado aparte al precio que pone administración, o
//   · de cortesía.
//  Un alumno puede tener 2 meses solo medidas y al tercero sumar la dieta:
//  cada compra tiene su propio desde / hasta (o sus sesiones).
//  Lo hecho se lee de los registros reales (dietas, medidas, sesiones de
//  fisioterapia); la evaluación nutricional se marca al atenderla.
//  Si un servicio incluido o pagado no se le hace en N días, avisa al
//  personal para hacerle seguimiento.
// =====================================================================
import { Router } from "express";
import { consultar } from "../db.js";
import { ErrorHttp, exigirCajaAbierta } from "../seguridad.js";
import { hoyLima, sumarDias } from "../congelamiento.js";
import { modulosActivos } from "./licencia.js";

const router = Router();
const STAFF = ["admin", "reception", "trainer", "nutritionist", "physio"];
const VENDE = ["admin", "reception"];
const CATEGORIAS = ["nutricion", "fisioterapia", "entrenamiento_personal", "otros"];
const METODOS = ["efectivo", "yape_plin", "tarjeta", "transferencia"];
const txt = (v, n) => String(v ?? "").trim().slice(0, n);
const iso = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);
const fechaOk = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

let hay = { v: null, t: 0 };
export async function tablaServicios() {
  if (hay.v === true || Date.now() - hay.t < 20000) return hay.v;
  const [f] = await consultar("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alumno_servicios'");
  hay = { v: Number(f?.n) === 1, t: Date.now() };
  return hay.v;
}
async function exigirTabla() {
  if (!(await tablaServicios())) throw new ErrorHttp(503, "Falta ejecutar la parte 43 (43_servicios_alumno.sql) en MySQL Workbench para manejar servicios por alumno.");
}
const exigir = (req, roles, msg) => {
  if (!roles.includes(req.usuario.rol)) throw new ErrorHttp(403, msg || "No tienes permiso para esta acción");
};
async function diasAviso() {
  const [c] = await consultar("SELECT valor FROM configuracion WHERE clave = 'servicio_dias_aviso'");
  const n = Number(c?.valor);
  return n >= 1 && n <= 90 ? n : 7;
}

/** Catálogo (solo los servicios cuyo módulo el gimnasio tiene contratado) */
async function catalogo(todos = false) {
  const act = await modulosActivos();
  const filas = await consultar(`SELECT * FROM servicios ${todos ? "" : "WHERE activo = 1"} ORDER BY orden, nombre`);
  return filas
    .filter((s) => !s.modulo || act.has(s.modulo))
    .map((s) => ({
      id: s.idservicio,
      codigo: s.codigo,
      nombre: s.nombre,
      emoji: s.emoji || "⭐",
      descripcion: s.descripcion || "",
      modo: s.modo,
      dias: Number(s.dias),
      sesiones: Number(s.sesiones),
      precio: Number(s.precio),
      categoria: s.categoria_caja,
      modulo: s.modulo || "",
      activo: !!s.activo,
    }));
}

// ---------------------------------------------------------------------
// Qué servicios tiene un alumno hoy (y su historial)
// ---------------------------------------------------------------------
/** Fechas en que el alumno usó un servicio de sesiones */
async function eventosUso(idalumno, s) {
  const manual = (await consultar("SELECT fecha FROM servicio_usos WHERE idalumno = ? AND idservicio = ? ORDER BY fecha, iduso", [idalumno, s.id])).map((f) => iso(f.fecha));
  if (s.codigo !== "fisioterapia") return manual;
  const reales = (await consultar("SELECT fecha FROM sesiones_fisioterapia WHERE idalumno = ? ORDER BY fecha", [idalumno]).catch(() => [])).map((f) => iso(f.fecha));
  return [...manual, ...reales].sort();
}
/** Última vez que se hizo un servicio de periodo (dieta, medidas…) */
async function ultimaVez(idalumno, codigo, mat) {
  if (codigo === "dieta") return iso((await consultar("SELECT MAX(fecha) AS f FROM dietas WHERE idalumno = ?", [idalumno]).catch(() => [{}]))[0]?.f);
  if (codigo === "medidas") return iso((await consultar("SELECT MAX(fecha) AS f FROM medidas WHERE idalumno = ?", [idalumno]).catch(() => [{}]))[0]?.f);
  if (codigo === "entrenador") return mat?.identrenador ? iso(mat.fecha_inicio) : null;
  return null;
}

export async function serviciosDeAlumno(idalumno, hoy = hoyLima()) {
  const cat = await catalogo(true);
  const porId = new Map(cat.map((s) => [s.id, s]));
  const [mat] = await consultar(
    `SELECT m.*, p.nombre AS plan FROM matriculas m JOIN planes p ON p.idplan = m.idplan
      WHERE m.idalumno = ? AND m.estado IN ('activa','por_vencer','congelada') AND m.fecha_inicio <= ? AND (m.fecha_fin IS NULL OR m.fecha_fin >= ?)
      ORDER BY m.fecha_fin DESC LIMIT 1`,
    [idalumno, hoy, hoy],
  );
  const incluidos = mat ? await consultar("SELECT * FROM plan_servicios WHERE idplan = ?", [mat.idplan]) : [];
  const compras = await consultar("SELECT * FROM alumno_servicios WHERE idalumno = ? AND estado = 'activo' ORDER BY desde, idalumno_servicio", [idalumno]);
  const fuentes = [];
  for (const ps of incluidos) {
    const s = porId.get(ps.idservicio);
    if (!s) continue;
    fuentes.push({ s, origen: "plan", ref: mat.idmatricula, plan: mat.plan, desde: iso(mat.fecha_inicio), hasta: iso(mat.fecha_fin), cupo: s.modo === "sesiones" ? Number(ps.cantidad) || 1 : null });
  }
  for (const c of compras) {
    const s = porId.get(c.idservicio);
    if (!s) continue;
    fuentes.push({ s, origen: c.origen, ref: c.idalumno_servicio, desde: iso(c.desde), hasta: iso(c.hasta), cupo: s.modo === "sesiones" ? Number(c.sesiones) || 1 : null, precio: Number(c.precio), pagado: !!c.idmovimiento, nota: c.nota || "" });
  }
  // Sesiones usadas: se reparten primero en lo del plan y luego en lo comprado
  const usos = new Map();
  for (const s of cat.filter((x) => x.modo === "sesiones")) {
    const mias = fuentes.filter((f) => f.s.id === s.id).sort((a, b) => (a.origen === "plan" ? -1 : b.origen === "plan" ? 1 : a.desde.localeCompare(b.desde)));
    if (!mias.length) continue;
    mias.forEach((f) => usos.set(f, 0));
    for (const fecha of await eventosUso(idalumno, s)) {
      const f = mias.find((x) => fecha >= x.desde && (!x.hasta || x.origen !== "plan" || fecha <= x.hasta) && usos.get(x) < x.cupo);
      if (f) usos.set(f, usos.get(f) + 1);
    }
  }
  const lista = [];
  for (const f of fuentes) {
    const usadas = f.s.modo === "sesiones" ? usos.get(f) || 0 : null;
    const quedan = f.s.modo === "sesiones" ? Math.max(0, f.cupo - usadas) : null;
    const vigente = f.s.modo === "periodo" ? f.desde <= hoy && (!f.hasta || f.hasta >= hoy) : quedan > 0 && (f.origen !== "plan" || !f.hasta || f.hasta >= hoy);
    const futuro = f.desde > hoy;
    const ultima = f.s.modo === "periodo" ? await ultimaVez(idalumno, f.s.codigo, mat) : null;
    lista.push({
      id: `${f.origen}-${f.ref}-${f.s.id}`,
      ref: f.ref,
      servicioId: f.s.id,
      codigo: f.s.codigo,
      nombre: f.s.nombre,
      emoji: f.s.emoji,
      modo: f.s.modo,
      origen: f.origen,
      plan: f.plan || "",
      desde: f.desde,
      hasta: f.hasta,
      sesiones: f.cupo,
      usadas,
      quedan,
      vigente,
      futuro,
      ultimaVez: ultima,
      hechoEnPeriodo: f.s.modo === "periodo" ? !!ultima && ultima >= f.desde : usadas > 0,
      precio: f.precio ?? null,
      nota: f.nota || "",
    });
  }
  const historial = (
    await consultar(
      `SELECT x.*, s.nombre, s.emoji, s.modo FROM alumno_servicios x JOIN servicios s ON s.idservicio = x.idservicio
        WHERE x.idalumno = ? ORDER BY x.desde DESC, x.idalumno_servicio DESC LIMIT 60`,
      [idalumno],
    )
  ).map((x) => ({
    id: x.idalumno_servicio,
    nombre: x.nombre,
    emoji: x.emoji || "⭐",
    modo: x.modo,
    origen: x.origen,
    desde: iso(x.desde),
    hasta: iso(x.hasta),
    sesiones: x.sesiones,
    precio: Number(x.precio),
    estado: x.estado,
    nota: x.nota || "",
  }));
  return { hoy, plan: mat ? { nombre: mat.plan, desde: iso(mat.fecha_inicio), hasta: iso(mat.fecha_fin) } : null, servicios: lista, historial };
}

// ---------------------------------------------------------------------
// Catálogo y planes
// ---------------------------------------------------------------------
router.get("/catalogo", async (req, res, next) => {
  try {
    if (!(await tablaServicios())) return res.json({ conServicios: false, servicios: [], planes: {} });
    const servicios = await catalogo(req.usuario.rol === "admin");
    const ps = await consultar("SELECT * FROM plan_servicios");
    const planes = {};
    ps.forEach((x) => (planes[x.idplan] = planes[x.idplan] || []).push({ id: x.idservicio, cantidad: x.cantidad }));
    res.json({ conServicios: true, servicios, planes, diasAviso: await diasAviso() });
  } catch (e) {
    next(e);
  }
});
const datosServicio = (b) => {
  const nombre = txt(b.nombre, 80);
  if (!nombre) throw new ErrorHttp(400, "Escribe el nombre del servicio");
  const modo = b.modo === "sesiones" ? "sesiones" : "periodo";
  const dias = Math.round(Number(b.dias) || 30);
  const sesiones = Math.round(Number(b.sesiones) || 1);
  const precio = Math.round(Number(b.precio) * 100) / 100;
  if (!(precio >= 0)) throw new ErrorHttp(400, "El precio no es válido");
  if (!(dias >= 1 && dias <= 400)) throw new ErrorHttp(400, "Los días deben estar entre 1 y 400");
  if (!(sesiones >= 1 && sesiones <= 100)) throw new ErrorHttp(400, "Las sesiones deben estar entre 1 y 100");
  return { nombre, emoji: txt(b.emoji, 16) || "⭐", descripcion: txt(b.descripcion, 200) || null, modo, dias, sesiones, precio, categoria: CATEGORIAS.includes(b.categoria) ? b.categoria : "otros" };
};
router.post("/catalogo", async (req, res, next) => {
  try {
    await exigirTabla();
    exigir(req, ["admin"], "Solo administración crea servicios");
    const d = datosServicio(req.body || {});
    const codigo = `s${Date.now().toString(36)}`;
    const [o] = await consultar("SELECT COALESCE(MAX(orden),0)+1 AS n FROM servicios");
    const r = await consultar(
      "INSERT INTO servicios (codigo, nombre, emoji, descripcion, modo, dias, sesiones, precio, categoria_caja, orden) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [codigo, d.nombre, d.emoji, d.descripcion, d.modo, d.dias, d.sesiones, d.precio, d.categoria, o.n],
    );
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) {
    next(e);
  }
});
router.put("/catalogo/:id(\\d+)", async (req, res, next) => {
  try {
    await exigirTabla();
    exigir(req, ["admin"], "Solo administración cambia los servicios y sus precios");
    const d = datosServicio(req.body || {});
    await consultar("UPDATE servicios SET nombre=?, emoji=?, descripcion=?, modo=?, dias=?, sesiones=?, precio=?, categoria_caja=?, activo=? WHERE idservicio=?", [
      d.nombre, d.emoji, d.descripcion, d.modo, d.dias, d.sesiones, d.precio, d.categoria, req.body?.activo === false ? 0 : 1, Number(req.params.id),
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router.put("/ajustes", async (req, res, next) => {
  try {
    exigir(req, ["admin"], "Solo administración");
    const n = Math.round(Number(req.body?.diasAviso));
    if (!(n >= 1 && n <= 90)) throw new ErrorHttp(400, "Los días deben estar entre 1 y 90");
    await consultar(
      `INSERT INTO configuracion (clave, valor, descripcion, actualizado_por) VALUES ('servicio_dias_aviso', ?, 'Servicios: días sin hacerse un servicio incluido o pagado antes de avisar', ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_por = VALUES(actualizado_por)`,
      [String(n), req.usuario.idusuario],
    );
    res.json({ ok: true, diasAviso: n });
  } catch (e) {
    next(e);
  }
});
// PUT /api/servicios/planes/:idplan { servicios: [{ id, cantidad }] }
router.put("/planes/:idplan(\\d+)", async (req, res, next) => {
  try {
    await exigirTabla();
    exigir(req, ["admin"], "Solo administración arma los planes");
    const idplan = Number(req.params.idplan);
    const lista = (Array.isArray(req.body?.servicios) ? req.body.servicios : []).map((x) => ({ id: Number(x.id), cantidad: Math.max(1, Math.min(100, Math.round(Number(x.cantidad) || 1))) })).filter((x) => x.id);
    await consultar("DELETE FROM plan_servicios WHERE idplan = ?", [idplan]);
    for (const x of lista) await consultar("INSERT IGNORE INTO plan_servicios (idplan, idservicio, cantidad) SELECT ?, idservicio, ? FROM servicios WHERE idservicio = ?", [idplan, x.cantidad, x.id]);
    // Mantiene al día las marcas «incluye…» del plan (las usan tarjetas y reportes)
    await consultar(
      `UPDATE planes p SET
         incluye_nutricion    = EXISTS (SELECT 1 FROM plan_servicios ps JOIN servicios s ON s.idservicio = ps.idservicio WHERE ps.idplan = p.idplan AND s.modulo = 'nutrition'),
         incluye_fisioterapia = EXISTS (SELECT 1 FROM plan_servicios ps JOIN servicios s ON s.idservicio = ps.idservicio WHERE ps.idplan = p.idplan AND s.modulo = 'physiotherapy'),
         incluye_entrenador   = EXISTS (SELECT 1 FROM plan_servicios ps JOIN servicios s ON s.idservicio = ps.idservicio WHERE ps.idplan = p.idplan AND s.codigo = 'entrenador')
       WHERE p.idplan = ?`,
      [idplan],
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// Servicios de un alumno
// ---------------------------------------------------------------------
async function alumnoDe(req) {
  const [u] = await consultar("SELECT idalumno FROM usuarios WHERE idusuario = ?", [req.usuario.idusuario]);
  return u?.idalumno || null;
}
router.get("/mios", async (req, res, next) => {
  try {
    if (!(await tablaServicios())) return res.json({ conServicios: false, servicios: [], historial: [] });
    const yo = await alumnoDe(req);
    if (!yo) throw new ErrorHttp(403, "Solo para alumnos");
    res.json({ conServicios: true, ...(await serviciosDeAlumno(yo)), catalogo: (await catalogo()).map(({ id, nombre, emoji, precio, modo, dias, sesiones, descripcion }) => ({ id, nombre, emoji, precio, modo, dias, sesiones, descripcion })) });
  } catch (e) {
    next(e);
  }
});
router.get("/alumno/:id(\\d+)", async (req, res, next) => {
  try {
    exigir(req, STAFF, "Solo el personal");
    if (!(await tablaServicios())) return res.json({ conServicios: false, servicios: [], historial: [] });
    res.json({ conServicios: true, ...(await serviciosDeAlumno(Number(req.params.id))) });
  } catch (e) {
    next(e);
  }
});

// POST /api/servicios/alumno/:id { servicio, cantidad?, cortesia?, metodo?, desde?, nota?, precio? }
router.post("/alumno/:id(\\d+)", async (req, res, next) => {
  try {
    await exigirTabla();
    exigir(req, VENDE, "Solo recepción y administración agregan servicios");
    const idalumno = Number(req.params.id);
    const b = req.body || {};
    const [al] = await consultar("SELECT idalumno, nombres, apellidos FROM alumnos WHERE idalumno = ?", [idalumno]);
    if (!al) throw new ErrorHttp(404, "No existe ese alumno");
    const s = (await catalogo()).find((x) => x.id === Number(b.servicio));
    if (!s) throw new ErrorHttp(400, "Elige un servicio");
    const cortesia = !!b.cortesia;
    if (cortesia && req.usuario.rol !== "admin") throw new ErrorHttp(403, "Solo administración da servicios de cortesía");
    const cantidad = Math.max(1, Math.min(12, Math.round(Number(b.cantidad) || 1)));
    let unitario = s.precio;
    if (b.precio !== undefined && b.precio !== "" && req.usuario.rol === "admin") {
      unitario = Math.round(Number(b.precio) * 100) / 100;
      if (!(unitario >= 0)) throw new ErrorHttp(400, "El precio no es válido");
    }
    const total = cortesia ? 0 : Math.round(unitario * cantidad * 100) / 100;
    const hoy = hoyLima();
    let desde = fechaOk(b.desde) || hoy;
    let hasta = null;
    let sesiones = null;
    if (s.modo === "periodo") {
      // Si ya lo tiene vigente, el nuevo empieza al día siguiente de que termine
      const yaTiene = (await serviciosDeAlumno(idalumno, hoy)).servicios.filter((x) => x.servicioId === s.id && x.hasta && x.hasta >= desde);
      if (yaTiene.length && !fechaOk(b.desde)) desde = sumarDias(yaTiene.map((x) => x.hasta).sort().pop(), 1);
      hasta = sumarDias(desde, s.dias * cantidad - 1);
    } else sesiones = s.sesiones * cantidad;
    const metodo = METODOS.includes(b.metodo) ? b.metodo : "efectivo";
    let idmov = null;
    if (total > 0) {
      await exigirCajaAbierta(req);
      const nombre = `${al.nombres} ${al.apellidos}`.trim();
      const det = s.modo === "periodo" ? `del ${desde} al ${hasta}` : `${sesiones} sesión${sesiones === 1 ? "" : "es"}`;
      const m = await consultar(
        `INSERT INTO movimientos_caja (tipo, categoria, monto, descripcion, metodo_pago, idalumno, nombre_relacionado, idusuario_registro)
         VALUES ('ingreso', ?, ?, ?, ?, ?, ?, ?)`,
        [s.categoria, total, `${s.nombre} · ${nombre} (${det})`.slice(0, 255), metodo, idalumno, nombre, req.usuario.idusuario],
      );
      idmov = m.insertId;
    }
    const r = await consultar(
      `INSERT INTO alumno_servicios (idalumno, idservicio, origen, desde, hasta, sesiones, precio, metodo_pago, idmovimiento, nota, idusuario)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [idalumno, s.id, cortesia ? "cortesia" : "compra", desde, hasta, sesiones, total, total > 0 ? metodo : null, idmov, txt(b.nota, 200) || null, req.usuario.idusuario],
    );
    res.status(201).json({ ok: true, id: r.insertId, servicio: s.nombre, desde, hasta, sesiones, total, cortesia });
  } catch (e) {
    next(e);
  }
});

// POST /api/servicios/alumno/:id/usar { servicio, fecha?, nota? } -> marca una sesión usada (evaluación, etc.)
router.post("/alumno/:id(\\d+)/usar", async (req, res, next) => {
  try {
    await exigirTabla();
    exigir(req, STAFF, "Solo el personal");
    const idalumno = Number(req.params.id);
    const b = req.body || {};
    const s = (await catalogo()).find((x) => x.id === Number(b.servicio));
    if (!s || s.modo !== "sesiones") throw new ErrorHttp(400, "Ese servicio no es por sesiones");
    if (s.codigo === "fisioterapia") throw new ErrorHttp(400, "Las sesiones de fisioterapia se descuentan solas al registrar la sesión en Fisioterapia");
    const fecha = fechaOk(b.fecha) || hoyLima();
    const antes = (await serviciosDeAlumno(idalumno)).servicios.filter((x) => x.servicioId === s.id && x.vigente);
    if (!antes.length) throw new ErrorHttp(409, `No le quedan sesiones de ${s.nombre}: agrégale una (S/ ${s.precio.toFixed(2)}) o revisa su plan`);
    await consultar("INSERT INTO servicio_usos (idalumno, idservicio, fecha, nota, idusuario) VALUES (?,?,?,?,?)", [idalumno, s.id, fecha, txt(b.nota, 200) || null, req.usuario.idusuario]);
    const quedan = (await serviciosDeAlumno(idalumno)).servicios.filter((x) => x.servicioId === s.id && x.vigente).reduce((a, x) => a + x.quedan, 0);
    res.json({ ok: true, quedan });
  } catch (e) {
    next(e);
  }
});

// POST /api/servicios/compra/:id/anular (administración: si se cobró, sale la devolución de caja)
router.post("/compra/:id(\\d+)/anular", async (req, res, next) => {
  try {
    await exigirTabla();
    exigir(req, ["admin"], "Solo administración anula servicios");
    const [x] = await consultar("SELECT x.*, s.nombre, s.categoria_caja FROM alumno_servicios x JOIN servicios s ON s.idservicio = x.idservicio WHERE x.idalumno_servicio = ?", [Number(req.params.id)]);
    if (!x || x.estado === "anulado") throw new ErrorHttp(404, "Ese servicio no existe o ya está anulado");
    if (x.idmovimiento && Number(x.precio) > 0 && req.body?.devolver !== false) {
      await consultar(
        `INSERT INTO movimientos_caja (tipo, categoria, monto, descripcion, metodo_pago, idalumno, idusuario_registro)
         VALUES ('egreso', 'otros', ?, ?, ?, ?, ?)`,
        [Number(x.precio), `Devolución · ${x.nombre} (servicio anulado)`.slice(0, 255), x.metodo_pago || "efectivo", x.idalumno, req.usuario.idusuario],
      );
    }
    await consultar("UPDATE alumno_servicios SET estado = 'anulado' WHERE idalumno_servicio = ?", [x.idalumno_servicio]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// Avisos de seguimiento: servicio incluido o pagado que no se le hace
// ---------------------------------------------------------------------
const QUIEN_VE = { nutrition: ["admin", "reception", "nutritionist"], physiotherapy: ["admin", "reception", "physio"], routines: ["admin", "reception"], "": ["admin", "reception"] };
const IR = { nutrition: "nutrition", physiotherapy: "physiotherapy", routines: "members", "": "members" };
export async function pendientesSeguimiento(hoy = hoyLima()) {
  const umbral = await diasAviso();
  const cat = await catalogo();
  const alumnos = await consultar(
    `SELECT DISTINCT a.idalumno FROM alumnos a
      WHERE a.idalumno IN (SELECT m.idalumno FROM matriculas m JOIN plan_servicios ps ON ps.idplan = m.idplan
                            WHERE m.estado IN ('activa','por_vencer') AND m.fecha_inicio <= ? AND (m.fecha_fin IS NULL OR m.fecha_fin >= ?))
         OR a.idalumno IN (SELECT x.idalumno FROM alumno_servicios x WHERE x.estado = 'activo' AND x.desde <= ? AND (x.hasta IS NULL OR x.hasta >= ?))`,
    [hoy, hoy, hoy, hoy],
  );
  const nombres = new Map(
    (alumnos.length ? await consultar(`SELECT idalumno, nombres, apellidos FROM alumnos WHERE idalumno IN (${alumnos.map(() => "?").join(",")})`, alumnos.map((a) => a.idalumno)) : []).map((a) => [a.idalumno, `${a.nombres} ${a.apellidos}`.trim()]),
  );
  const pend = [];
  for (const { idalumno } of alumnos) {
    const { servicios } = await serviciosDeAlumno(idalumno, hoy);
    for (const x of servicios) {
      if (!x.vigente || x.futuro) continue;
      const s = cat.find((c) => c.id === x.servicioId);
      if (!s) continue;
      const desde = x.desde;
      const dias = diasEntre(desde, hoy);
      let motivo = null;
      if (x.modo === "periodo") {
        if (!x.ultimaVez || x.ultimaVez < desde) {
          if (dias >= umbral) motivo = `${dias} días sin ${s.codigo === "medidas" ? "su control de medidas" : s.codigo === "dieta" ? "su dieta" : s.codigo === "entrenador" ? "entrenador asignado" : "atenderlo"}`;
        } else if (s.codigo === "medidas" && diasEntre(x.ultimaVez, hoy) >= s.dias) motivo = `le toca su control (último hace ${diasEntre(x.ultimaVez, hoy)} días)`;
      } else if (!x.usadas && dias >= umbral) motivo = `${dias} días y aún no usa ${x.sesiones === 1 ? "su sesión" : `sus ${x.sesiones} sesiones`}`;
      if (motivo) pend.push({ idalumno, alumno: nombres.get(idalumno) || "Alumno", servicio: s, origen: x.origen, plan: x.plan, motivo });
    }
  }
  return pend;
}
export async function avisosServicios(req, hoy) {
  if (!(await tablaServicios())) return [];
  const rol = req.usuario.rol;
  if (!["admin", "reception", "nutritionist", "physio"].includes(rol)) return [];
  const pend = (await pendientesSeguimiento(hoy)).filter((p) => (QUIEN_VE[p.servicio.modulo] || QUIEN_VE[""]).includes(rol));
  const grupos = new Map();
  pend.forEach((p) => (grupos.get(p.servicio.id) || grupos.set(p.servicio.id, []).get(p.servicio.id)).push(p));
  return [...grupos.values()].map((l) => {
    const s = l[0].servicio;
    const incl = l.filter((p) => p.origen === "plan").length;
    return {
      id: `servicio-${s.id}-${hoy}-${l.length}`,
      tipo: "servicio_pendiente",
      nivel: incl ? "alto" : "medio",
      titulo: `${s.emoji} ${l.length === 1 ? `${l[0].alumno.split(" ")[0]} tiene` : `${l.length} alumnos tienen`} «${s.nombre}» sin atender`,
      mensaje: l
        .slice(0, 5)
        .map((p) => `${p.alumno}: ${p.motivo}${p.origen === "plan" ? ` (incluido en ${p.plan})` : p.origen === "cortesia" ? " (cortesía)" : " (lo pagó)"}`)
        .join(" · ") + (l.length > 5 ? ` · y ${l.length - 5} más` : ""),
      fecha: hoy,
      accion: { tipo: "ir", tab: IR[s.modulo] || "members", etiqueta: "Hacer seguimiento" },
    };
  });
}

// GET /api/servicios/pendientes -> lista completa para el seguimiento
router.get("/pendientes", async (req, res, next) => {
  try {
    exigir(req, ["admin", "reception", "nutritionist", "physio"], "Solo el personal");
    if (!(await tablaServicios())) return res.json({ pendientes: [] });
    const rol = req.usuario.rol;
    const l = (await pendientesSeguimiento()).filter((p) => (QUIEN_VE[p.servicio.modulo] || QUIEN_VE[""]).includes(rol));
    res.json({ pendientes: l.map((p) => ({ idalumno: p.idalumno, alumno: p.alumno, servicio: p.servicio.nombre, emoji: p.servicio.emoji, origen: p.origen, plan: p.plan, motivo: p.motivo })) });
  } catch (e) {
    next(e);
  }
});

export default router;
