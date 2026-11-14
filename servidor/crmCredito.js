// =====================================================================
// CRM: responsable de cada interesado y crédito de la matrícula
//  * El interesado es del recepcionista que lo registró (responsable).
//  * Las 3 luces: datos registrados, pase libre agendado y visita cumplida.
//    Con las tres, el interesado queda "asegurado" para su responsable.
//  * Si el responsable pasa 15 días sin hacerle seguimiento (30 días si
//    está asegurado con las 3 luces), queda libre: lo toma quien lo atienda después.
//  * Al matricular, la venta se acredita al responsable (metas y
//    proyecciones de su turno), aunque la cobre otro turno.
// Funciona aunque falte el script 26: entonces el responsable es quien
// lo registró y la matrícula no guarda el crédito.
// =====================================================================
import { consultar } from "./db.js";
import { hoyLima, diasEntre } from "./congelamiento.js";

export const DIAS_LIBERAR = 15;
export const DIAS_LIBERAR_ASEGURADO = 30;

const cache = { t: 0, v: null };
/** ¿Ya se ejecutó el script 26 / el 23? (se revisa cada minuto mientras falte) */
export async function columnasCrm() {
  if (cache.v?.responsable && cache.v?.credito && cache.v?.pases) return cache.v;
  if (cache.v && Date.now() - cache.t < 60000) return cache.v;
  const filas = await consultar(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND ((TABLE_NAME = 'prospectos' AND COLUMN_NAME = 'idusuario_responsable')
          OR (TABLE_NAME = 'matriculas' AND COLUMN_NAME IN ('idusuario_credito', 'idprospecto'))
          OR (TABLE_NAME = 'pases_libres' AND COLUMN_NAME = 'idpase'))`,
  );
  const hay = (t, c) => filas.some((f) => f.t === t && f.c === c);
  cache.v = {
    responsable: hay("prospectos", "idusuario_responsable"),
    credito: hay("matriculas", "idusuario_credito") && hay("matriculas", "idprospecto"),
    pases: hay("pases_libres", "idpase"),
  };
  cache.t = Date.now();
  return cache.v;
}

/** Expresión SQL del responsable (alias p = prospectos) */
export const exprResponsable = (col) => (col.responsable ? "COALESCE(p.idusuario_responsable, p.idusuario_registro)" : "p.idusuario_registro");

/** Columnas extra para el SELECT de prospectos: responsable, su turno, luces y última actividad */
export function camposResponsable(col) {
  const R = exprResponsable(col);
  return {
    campos: `,
         ${R} AS id_responsable,
         COALESCE(NULLIF(TRIM(CONCAT(COALESCE(er.nombres, ''), ' ', COALESCE(er.apellidos, ''))), ''), ur.usuario) AS responsable,
         trr.nombre AS turno_responsable,
         (SELECT MAX(sr.fecha) FROM prospecto_seguimientos sr WHERE sr.idprospecto = p.idprospecto AND sr.idusuario = ${R}) AS ult_resp,
         (p.pase_codigo IS NOT NULL OR EXISTS (SELECT 1 FROM prospecto_seguimientos sp WHERE sp.idprospecto = p.idprospecto AND sp.tipo = 'pase')) AS luz_pase,
         (p.pase_usado_en IS NOT NULL
           OR EXISTS (SELECT 1 FROM prospecto_seguimientos sv WHERE sv.idprospecto = p.idprospecto AND sv.tipo = 'visita')
           ${col.pases ? "OR EXISTS (SELECT 1 FROM pases_libres xv WHERE xv.idprospecto = p.idprospecto AND xv.estado = 'usado')" : ""}) AS luz_visita`,
    joins: `
    LEFT JOIN usuarios ur ON ur.idusuario = ${R}
    LEFT JOIN empleados er ON er.idempleado = ur.idempleado
    LEFT JOIN turnos_recepcion trr ON trr.idturno_recepcion = ur.idturno_recepcion`,
  };
}

/** Responsable, luces y si quedó libre, a partir de la fila del SELECT */
export function estadoResponsable(f, hoy = hoyLima()) {
  const luces = { datos: true, pase: !!Number(f.luz_pase), visita: !!Number(f.luz_visita) };
  const asegurado = luces.pase && luces.visita;
  const cerrado = f.estado === "matriculado" || f.estado === "de_baja";
  const ultima = String(f.ult_resp || f.fecha_registro || "").slice(0, 10) || hoy;
  const sinSeguimiento = Math.max(0, diasEntre(ultima, hoy));
  const limite = asegurado ? DIAS_LIBERAR_ASEGURADO : DIAS_LIBERAR;
  const libre = !cerrado && sinSeguimiento >= limite;
  return {
    ownerId: f.id_responsable ? String(f.id_responsable) : "",
    owner: f.responsable || "",
    ownerShift: f.turno_responsable || "",
    lights: luces,
    secured: asegurado,
    lastOwnerActivity: f.ult_resp || f.fecha_registro || "",
    daysWithoutFollowUp: sinSeguimiento,
    free: libre,
    freeInDays: cerrado ? null : Math.max(0, limite - sinSeguimiento),
    protectionDays: limite,
  };
}

const nombreUsuario = async (cx, id) => {
  const [[u]] = await cx.query(
    `SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.nombres, ''), ' ', COALESCE(e.apellidos, ''))), ''), u.usuario) AS n
       FROM usuarios u LEFT JOIN empleados e ON e.idempleado = u.idempleado WHERE u.idusuario = ?`,
    [id],
  );
  return u?.n || "otro usuario";
};

/**
 * Si el interesado quedó libre y lo atiende otra persona, pasa a ser suyo.
 * cx = conexión de la transacción; f = fila del SELECT del prospecto.
 */
export async function tomarSiLibre(cx, f, idusuario) {
  const col = await columnasCrm();
  if (!col.responsable || !f || !idusuario) return false;
  const e = estadoResponsable(f);
  if (!e.free || String(idusuario) === e.ownerId) return false;
  await cx.query("UPDATE prospectos SET idusuario_responsable = ? WHERE idprospecto = ?", [idusuario, f.idprospecto]);
  const nuevo = await nombreUsuario(cx, idusuario);
  await cx.query("INSERT INTO prospecto_seguimientos (idprospecto, tipo, detalle, idusuario) VALUES (?,?,?,?)", [
    f.idprospecto, "responsable",
    `Pasó a ${nuevo}: ${e.owner || "el responsable"} no le hizo seguimiento en ${e.daysWithoutFollowUp} días`.slice(0, 300),
    idusuario,
  ]);
  return true;
}

/** Busca el interesado abierto que corresponde a un alumno nuevo (por id, DNI o celular) */
export async function buscarInteresado(cx, { prospectId, dni, phone }) {
  const col = await columnasCrm();
  const { campos, joins } = camposResponsable(col);
  const base = `SELECT p.* ${campos} FROM prospectos p ${joins}`;
  if (prospectId && /^\d+$/.test(String(prospectId))) {
    const [[f]] = await cx.query(`${base} WHERE p.idprospecto = ?`, [prospectId]);
    if (f) return f;
  }
  const digitos = String(phone || "").replace(/\D/g, "").slice(-9);
  const conDni = /^\d{8}$/.test(String(dni || ""));
  if (!conDni && digitos.length < 9) return null;
  const [[f]] = await cx.query(
    `${base}
      WHERE p.estado NOT IN ('matriculado', 'de_baja') AND p.idalumno IS NULL
        AND (${conDni ? "p.dni = ?" : "0"} OR ${digitos.length === 9 ? "RIGHT(REGEXP_REPLACE(p.celular, '[^0-9]', ''), 9) = ?" : "0"})
      ORDER BY p.fecha_registro DESC LIMIT 1`,
    [...(conDni ? [dni] : []), ...(digitos.length === 9 ? [digitos] : [])],
  );
  return f || null;
}

/**
 * Vincula la matrícula nueva con su interesado del CRM y la acredita al
 * responsable (o a quien matricula, si el interesado estaba libre).
 * Devuelve { prospectId, owner, creditTo, creditToId } o null.
 */
export async function vincularMatricula(cx, { idalumno, idmatricula, prospectId, dni, phone, idusuario }) {
  const col = await columnasCrm();
  const f = await buscarInteresado(cx, { prospectId, dni, phone });
  if (!f) return null;
  const e = estadoResponsable(f);
  const credito = e.free || !e.ownerId ? idusuario : Number(e.ownerId);
  const quien = await nombreUsuario(cx, idusuario);
  const para = String(credito) === String(idusuario) ? quien : e.owner || (await nombreUsuario(cx, credito));
  if (col.credito) {
    await cx.query("UPDATE matriculas SET idprospecto = ?, idusuario_credito = ? WHERE idmatricula = ?", [f.idprospecto, credito, idmatricula]);
  }
  if (col.responsable && e.free && String(credito) !== e.ownerId) {
    await cx.query("UPDATE prospectos SET idusuario_responsable = ? WHERE idprospecto = ?", [credito, f.idprospecto]);
  }
  await cx.query("UPDATE prospectos SET estado = 'matriculado', idalumno = ?, recordatorio_visto = 1 WHERE idprospecto = ?", [idalumno, f.idprospecto]);
  await cx.query("INSERT INTO prospecto_seguimientos (idprospecto, tipo, detalle, idusuario) VALUES (?,?,?,?)", [
    f.idprospecto, "estado",
    `Matriculado por ${quien}${String(credito) !== String(idusuario) ? ` · la venta se acredita a ${para} (seguimiento${e.secured ? ", 3/3 luces" : ""})` : ""}`.slice(0, 300),
    idusuario,
  ]);
  return { prospectId: String(f.idprospecto), owner: e.owner, creditTo: para, creditToId: String(credito), secured: e.secured, wasFree: e.free };
}
