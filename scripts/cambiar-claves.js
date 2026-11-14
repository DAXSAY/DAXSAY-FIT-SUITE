// =====================================================================
// ANTES DE USAR EL SISTEMA CON GENTE REAL
//   npm run cambiar-claves
// 1. Cambia el secreto de las sesiones (JWT_SECRET) por uno nuevo y aleatorio.
//    (todas las sesiones abiertas se cierran: cada uno vuelve a entrar).
// 2. Cambia las contraseñas de prueba de los usuarios del personal que
//    todavía usan la contraseña del README por contraseñas aleatorias.
//    Cada persona deberá crear la suya al entrar (aviso "cámbiala por una propia").
// 3. Escribe las contraseñas nuevas SOLO en el archivo CLAVES_NUEVAS.txt de
//    esta carpeta: entrégalas a cada persona y luego BORRA ese archivo.
// No muestra ninguna contraseña en pantalla.
// =====================================================================
import "../servidor/config.js";
import { archivoConfiguracion } from "../servidor/config.js";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../servidor/db.js";

// Usuarios de prueba que trae el sistema y su contraseña conocida (README)
const DE_PRUEBA = {
  admin: "Radical2026!",
  recepcion: "Recep2026!",
  entrenador: "Coach2026!",
  fisioterapia: "Fisio2026!",
  nutricion: "Nutri2026!",
};

// Contraseña legible: 3 palabras cortas + número (fácil de dictar, difícil de adivinar)
const SILABAS = ["ra", "di", "cal", "fu", "er", "za", "mo", "vi", "pe", "so", "ti", "ga", "lu", "no", "be", "ko", "sa", "ve", "ri", "ta"];
const clave = () => {
  const pal = () => Array.from({ length: 3 }, () => SILABAS[crypto.randomInt(SILABAS.length)]).join("");
  const p = `${pal()}-${pal()}-${crypto.randomInt(100, 999)}`;
  return p.charAt(0).toUpperCase() + p.slice(1);
};

async function main() {
  if (!archivoConfiguracion) throw new Error("No se encontró .env ni gestion_radicalgym.env");

  // 1) Secreto de sesión nuevo
  const env = fs.readFileSync(archivoConfiguracion, "utf8");
  const secreto = crypto.randomBytes(48).toString("base64url");
  const nuevoEnv = /^JWT_SECRET=.*$/m.test(env) ? env.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secreto}`) : `${env.trimEnd()}\nJWT_SECRET=${secreto}\n`;
  fs.copyFileSync(archivoConfiguracion, `${archivoConfiguracion}.antes_de_cambiar_claves`);
  fs.writeFileSync(archivoConfiguracion, nuevoEnv);
  console.log(`✔ Secreto de sesión cambiado en ${archivoConfiguracion} (copia anterior: ${archivoConfiguracion}.antes_de_cambiar_claves)`);

  // 2) Contraseñas de prueba
  const lineas = [`CONTRASEÑAS NUEVAS · ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}`, "Entrégalas a cada persona y BORRA este archivo.", ""];
  let cambiadas = 0;
  for (const [usuario, conocida] of Object.entries(DE_PRUEBA)) {
    const [[u]] = await pool.query("SELECT idusuario, clave_hash FROM usuarios WHERE usuario = ?", [usuario]);
    if (!u) continue;
    const hash = String(u.clave_hash || "").replace(/^\$2y\$/, "$2a$");
    if (!(await bcrypt.compare(conocida, hash))) {
      console.log(`· ${usuario}: ya tiene una contraseña propia, no se cambia.`);
      continue;
    }
    const nueva = clave();
    await pool.query("UPDATE usuarios SET clave_hash = ?, debe_cambiar_clave = 1, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE idusuario = ?", [
      await bcrypt.hash(nueva, 10),
      u.idusuario,
    ]);
    lineas.push(`${usuario.padEnd(14)} ${nueva}`);
    cambiadas++;
  }
  // Se cierran todas las sesiones abiertas
  await pool.query("UPDATE sesiones SET fecha_cierre = NOW() WHERE fecha_cierre IS NULL");

  if (cambiadas) {
    fs.writeFileSync("CLAVES_NUEVAS.txt", lineas.join("\r\n") + "\r\n");
    console.log(`✔ ${cambiadas} contraseña(s) de prueba cambiadas. Están en CLAVES_NUEVAS.txt (bórralo después de entregarlas).`);
  } else {
    console.log("✔ Ningún usuario usaba contraseñas de prueba.");
  }
  console.log("Reinicia el sistema (cierra y abre INICIAR_SISTEMA.bat) para que tome el secreto nuevo.");
  await pool.end();
}

main().catch(async (e) => {
  console.error("✖ No se pudo completar:", e.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
