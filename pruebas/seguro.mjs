// Candado: estas pruebas CREAN datos (alumnos, ventas, citas…). Solo se ejecutan
// contra una base de PRUEBAS, nunca contra la base real del gimnasio.
import "../servidor/config.js";
import mysql from "mysql2/promise";

export const BASE = (process.env.PRUEBAS_URL || "http://127.0.0.1:4000") + "/api";
const nombre = process.env.DB_NAME || "";
if (!/prueba|demo|test/i.test(nombre) && process.env.PERMITIR_PRUEBAS !== "si") {
  console.error(
    `\n  ALTO: la base configurada es «${nombre}».\n` +
      "  Estas pruebas crean alumnos, ventas y citas de prueba.\n" +
      "  Úsalas solo con una base de pruebas (por ejemplo DB_NAME=gestion_radicalgym_pruebas)\n" +
      "  o, si estás seguro de que es una copia de pruebas, ejecuta con PERMITIR_PRUEBAS=si\n",
  );
  process.exit(1);
}

// Usuarios de prueba del README (cámbialos con PRUEBAS_CLAVES si tu base de pruebas usa otros)
export const USUARIOS = JSON.parse(
  process.env.PRUEBAS_CLAVES ||
    JSON.stringify([["admin", "Radical2026!"], ["recepcion", "Recep2026!"], ["entrenador", "Coach2026!"], ["fisioterapia", "Fisio2026!"], ["nutricion", "Nutri2026!"], ["70900001", "70900001"]]),
);

let cx = null;
/** Consulta directa a la base de pruebas (solo para preparar y revisar las pruebas) */
export async function sql(q, p = []) {
  cx ||= await mysql.createConnection({ host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: nombre });
  const [filas] = await cx.query(q, p);
  return filas;
}
export const valor = async (q, p) => {
  const f = await sql(q, p);
  return f.length ? String(Object.values(f[0])[0]) : "";
};
export const cerrarBase = () => cx?.end();
