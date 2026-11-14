// =====================================================================
// COPIA DE SEGURIDAD AUTOMÁTICA DE LA BASE DE DATOS
//  - Mientras el sistema está encendido, cada día (a partir de las 23:00,
//    o al encender si la última copia tiene más de 24 h) guarda un archivo
//    .sql con TODA la base: tablas, datos, vistas, procedimientos y triggers.
//  - Se guardan en la carpeta "respaldos" (o RESPALDO_CARPETA del .env).
//    Se conservan las últimas RESPALDO_CONSERVAR copias (30 por defecto).
//  - Para restaurar: MySQL Workbench → Server → Data Import → "Import from
//    Self-Contained File" → elegir el .sql → Start Import.
//  - Consejo: copia esa carpeta a Google Drive / OneDrive o a un USB.
// =====================================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CARPETA_RESPALDOS = path.resolve(RAIZ, process.env.RESPALDO_CARPETA || "respaldos");
const CONSERVAR = Math.max(3, Number(process.env.RESPALDO_CONSERVAR || 30));
const HORA_DIARIA = Number(process.env.RESPALDO_HORA ?? 23); // 23 = 11 p. m.

let enCurso = null;
let ultimoError = null;
let ultimoAviso = null; // p. ej. procedimientos que no se pudieron copiar por permisos

const valorSql = (v) => {
  if (v === null || v === undefined) return "NULL";
  if (Buffer.isBuffer(v)) return v.length ? `X'${v.toString("hex")}'` : "''";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "object") return pool.escape(JSON.stringify(v)); // columnas JSON
  return pool.escape(String(v));
};

const hoyLima = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
const ahoraLima = () => new Date(Date.now() - 5 * 3600_000).toISOString().replace("T", "_").slice(0, 16).replace(":", "-");

/** Lista de copias (más nueva primero) */
export function listarRespaldos() {
  try {
    return fs
      .readdirSync(CARPETA_RESPALDOS)
      .filter((f) => /^respaldo_.*\.sql$/.test(f))
      .map((f) => {
        const st = fs.statSync(path.join(CARPETA_RESPALDOS, f));
        return { archivo: f, bytes: st.size, fecha: st.mtime.toISOString() };
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  } catch {
    return [];
  }
}

export const estadoRespaldos = () => ({
  carpeta: CARPETA_RESPALDOS,
  enCurso: !!enCurso,
  ultimoError,
  ultimoAviso,
  copias: listarRespaldos(),
});

/** Genera una copia completa ahora mismo. Devuelve el nombre del archivo. */
export function hacerRespaldo(motivo = "manual") {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    fs.mkdirSync(CARPETA_RESPALDOS, { recursive: true });
    const nombre = `respaldo_${ahoraLima()}.sql`;
    const temporal = path.join(CARPETA_RESPALDOS, `${nombre}.parcial`);
    const salida = fs.createWriteStream(temporal, { encoding: "utf8" });
    const escribir = (t) => new Promise((ok) => (salida.write(t) ? ok() : salida.once("drain", ok)));
    const cx = await pool.getConnection();
    try {
      const [[{ base }]] = await cx.query("SELECT DATABASE() AS base");
      await escribir(
        `-- Copia de seguridad de ${base} · ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })} (${motivo})\n` +
          `-- Restaurar: MySQL Workbench → Server → Data Import → Import from Self-Contained File\n\n` +
          `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\nSET UNIQUE_CHECKS = 0;\nSET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n` +
          `CREATE DATABASE IF NOT EXISTS \`${base}\` DEFAULT CHARACTER SET utf8mb4;\nUSE \`${base}\`;\n\n`,
      );
      // Lectura consistente de todas las tablas (sin bloquear a los usuarios)
      await cx.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      await cx.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");

      const [tablas] = await cx.query("SHOW FULL TABLES");
      const col = Object.keys(tablas[0] || {})[0];
      const baseTablas = tablas.filter((t) => t.Table_type === "BASE TABLE").map((t) => t[col]);
      const vistas = tablas.filter((t) => t.Table_type === "VIEW").map((t) => t[col]);

      for (const t of baseTablas) {
        const [[crear]] = await cx.query(`SHOW CREATE TABLE \`${t}\``);
        await escribir(`-- Tabla ${t}\nDROP TABLE IF EXISTS \`${t}\`;\n${crear["Create Table"]};\n`);
        const LOTE = 500;
        for (let desde = 0; ; desde += LOTE) {
          const [filas] = await cx.query(`SELECT * FROM \`${t}\` LIMIT ${LOTE} OFFSET ${desde}`);
          if (!filas.length) break;
          const columnas = Object.keys(filas[0]).map((c) => `\`${c}\``).join(", ");
          const valores = filas.map((f) => `(${Object.values(f).map(valorSql).join(", ")})`).join(",\n");
          await escribir(`INSERT INTO \`${t}\` (${columnas}) VALUES\n${valores};\n`);
          if (filas.length < LOTE) break;
        }
        await escribir("\n");
      }
      await cx.query("COMMIT");

      for (const v of vistas) {
        const [[crear]] = await cx.query(`SHOW CREATE VIEW \`${v}\``);
        const sql = String(crear["Create View"]).replace(/DEFINER=`[^`]+`@`[^`]+`\s*/g, "");
        await escribir(`DROP VIEW IF EXISTS \`${v}\`;\n${sql};\n\n`);
      }

      let omitidos = 0;
      await escribir("DELIMITER $$\n");
      for (const tipo of ["PROCEDURE", "FUNCTION"]) {
        const [rutinas] = await cx.query(`SHOW ${tipo} STATUS WHERE Db = ?`, [base]);
        for (const r of rutinas) {
          const [[crear]] = await cx.query(`SHOW CREATE ${tipo} \`${r.Name}\``);
          const sql = String(crear[tipo === "PROCEDURE" ? "Create Procedure" : "Create Function"] || "").replace(/DEFINER=`[^`]+`@`[^`]+`\s*/g, "");
          if (sql) await escribir(`DROP ${tipo} IF EXISTS \`${r.Name}\`$$\n${sql}$$\n\n`);
          else omitidos++;
        }
      }
      const [triggers] = await cx.query("SHOW TRIGGERS");
      for (const tr of triggers) {
        const [[crear]] = await cx.query(`SHOW CREATE TRIGGER \`${tr.Trigger}\``);
        const sql = String(crear["SQL Original Statement"] || "").replace(/DEFINER=`[^`]+`@`[^`]+`\s*/g, "");
        if (sql) await escribir(`DROP TRIGGER IF EXISTS \`${tr.Trigger}\`$$\n${sql}$$\n\n`);
      }
      if (omitidos) await escribir(`-- AVISO: ${omitidos} procedimiento(s) no se copiaron por permisos. Ejecuta base_datos/34_sincronizacion_y_respaldos.sql\n`);
      ultimoAviso = omitidos ? `${omitidos} procedimientos no se copiaron (falta permiso: ejecuta base_datos/34_sincronizacion_y_respaldos.sql). Los datos sí están completos.` : null;
      await escribir("DELIMITER ;\n\nSET FOREIGN_KEY_CHECKS = 1;\nSET UNIQUE_CHECKS = 1;\n-- Fin de la copia\n");
      await new Promise((ok, mal) => salida.end((e) => (e ? mal(e) : ok())));
      fs.renameSync(temporal, path.join(CARPETA_RESPALDOS, nombre));

      // Solo se guardan las últimas copias
      listarRespaldos()
        .slice(CONSERVAR)
        .forEach((c) => fs.rmSync(path.join(CARPETA_RESPALDOS, c.archivo), { force: true }));
      ultimoError = null;
      console.log(`Copia de seguridad lista: ${path.join(CARPETA_RESPALDOS, nombre)}`);
      return nombre;
    } catch (e) {
      ultimoError = `${new Date().toISOString()} · ${e.code || ""} ${e.message}`;
      console.warn(`[respaldo] no se pudo hacer la copia: ${e.message}`);
      try {
        await cx.query("ROLLBACK");
      } catch {
        /* nada */
      }
      salida.destroy();
      fs.rmSync(temporal, { force: true });
      throw e;
    } finally {
      cx.release();
      enCurso = null;
    }
  })();
  return enCurso;
}

/** Programa la copia diaria (se llama al encender la API). */
export function programarRespaldos() {
  if (process.env.RESPALDO_DESACTIVADO === "1") return;
  const revisar = () => {
    const ultima = listarRespaldos()[0];
    const horas = ultima ? (Date.now() - new Date(ultima.fecha).getTime()) / 3600_000 : Infinity;
    const horaLima = new Date(Date.now() - 5 * 3600_000).getUTCHours();
    const deHoy = ultima && new Date(new Date(ultima.fecha).getTime() - 5 * 3600_000).toISOString().slice(0, 10) === hoyLima();
    if (horas > 24 || (horaLima >= HORA_DIARIA && !deHoy)) hacerRespaldo("automática").catch(() => {});
  };
  setTimeout(revisar, 60_000); // un minuto después de encender
  setInterval(revisar, 30 * 60_000).unref?.();
}
