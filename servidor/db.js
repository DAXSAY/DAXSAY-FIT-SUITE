// Conexión a MySQL (gestion_radicalgym)
import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "gestion_radicalgym",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL || 15), // conexiones simultáneas a MySQL (varias sesiones a la vez)
  dateStrings: true, // fechas como texto 'AAAA-MM-DD' (evita desfases de zona horaria)
  timezone: "-05:00",
  charset: "utf8mb4",
});

// Hora de Perú en todas las conexiones (NOW(), CURDATE() de turnos, citas, etc.)
pool.on("connection", (conexion) => {
  conexion.query("SET time_zone = '-05:00'");
});

/** Ejecuta una consulta preparada y devuelve las filas. */
export async function consultar(sql, parametros = []) {
  const [filas] = await pool.execute(sql, parametros);
  return filas;
}

/** Llama a un procedimiento almacenado y devuelve sus conjuntos de resultados. */
export async function procedimiento(nombre, parametros = []) {
  const marcas = parametros.map(() => "?").join(",");
  const [resultados] = await pool.query(`CALL ${nombre}(${marcas})`, parametros);
  // mysql2 devuelve [conjunto1, conjunto2, ..., info]; quitamos la info final
  return Array.isArray(resultados) ? resultados.filter(Array.isArray) : [];
}

/** Ejecuta varias consultas dentro de una transacción. */
// Varias personas usando el sistema a la vez: si dos operaciones chocan
// (bloqueo mutuo, espera de bloqueo o dos alumnos nuevos que reciben el mismo
// código al mismo tiempo), la transacción se repite sola hasta 5 veces.
const esChoque = (e) =>
  e?.errno === 1213 || e?.errno === 1205 || (e?.errno === 1062 && /codigo|pase_codigo|token/i.test(String(e?.sqlMessage || e?.message)));

export async function transaccion(fn) {
  for (let intento = 1; ; intento++) {
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const resultado = await fn(conexion);
      await conexion.commit();
      return resultado;
    } catch (e) {
      await conexion.rollback().catch(() => {});
      if (intento < 6 && esChoque(e)) {
        await new Promise((ok) => setTimeout(ok, 60 * intento + Math.random() * 120));
        continue;
      }
      throw e;
    } finally {
      conexion.release();
    }
  }
}

/**
 * Fila de espera en el servidor: las operaciones con la misma clave se hacen
 * una tras otra (p. ej. dos recepcionistas matriculando al mismo tiempo: así
 * los correlativos —código de alumno, ticket— nunca chocan).
 */
const filas = new Map();
export function enFila(clave, fn) {
  const previa = filas.get(clave) || Promise.resolve();
  const actual = previa.catch(() => {}).then(fn);
  const cola = actual.catch(() => {});
  filas.set(clave, cola);
  cola.then(() => filas.get(clave) === cola && filas.delete(clave));
  return actual;
}
