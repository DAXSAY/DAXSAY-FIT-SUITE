// =====================================================================
// Código del PERSONAL para marcar asistencia: número + guion + cargo.
//   1-COACH  (primer entrenador)     1-NUTRI  (primera nutricionista)
//   2-COACH  (segundo entrenador)    1-FISIO  · 1-RECEP · 1-MANT · 1-GEST
// Empieza con el número y termina en letras, al revés que el alumno
// (DR-12), así nunca se confunden ni se repiten. En recepción basta
// escribir "1-coach", "1-c" o "1c".
// =====================================================================
export const SUFIJO_CARGO = {
  trainer: "COACH",
  nutritionist: "NUTRI",
  physiotherapist: "FISIO",
  receptionist: "RECEP",
  maintenance: "MANT",
  manager: "GEST",
};
export const NOMBRE_SUFIJO = {
  COACH: "Entrenador(a)",
  NUTRI: "Nutrición",
  FISIO: "Fisioterapia",
  RECEP: "Recepción",
  MANT: "Mantenimiento",
  GEST: "Coordinación",
  EXT: "Profesional externo",
  STAFF: "Personal",
};
// Los profesionales externos (cobran por sesión, sin contrato) llevan EXT: 1-EXT, 2-EXT…
const sufijo = (c) => (c?.external ? "EXT" : SUFIJO_CARGO[c?.role] || "STAFF");
const persona = (c) => String(c?.staffId || c?.dni || c?.id);
const numeroDe = (codigo) => Number(String(codigo || "").split("-")[0]) || 0;

/**
 * Devuelve los contratos con su `staffCode`. Respeta los que ya tienen código;
 * a los nuevos les da el siguiente número libre de su cargo (por fecha de inicio).
 * Las renovaciones de una misma persona comparten el código.
 */
export function asignarCodigosPersonal(contratos = []) {
  const porPersona = new Map(); // persona -> código
  const maximo = {}; // sufijo -> mayor número usado
  contratos.forEach((c) => {
    if (!c.staffCode) return;
    porPersona.set(persona(c), c.staffCode);
    const s = String(c.staffCode).split("-")[1];
    maximo[s] = Math.max(maximo[s] || 0, numeroDe(c.staffCode));
  });
  const sinCodigo = contratos
    .filter((c) => !c.staffCode && !porPersona.has(persona(c)))
    .sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")) || String(a.id).localeCompare(String(b.id)));
  sinCodigo.forEach((c) => {
    if (porPersona.has(persona(c))) return;
    const s = sufijo(c);
    maximo[s] = (maximo[s] || 0) + 1;
    porPersona.set(persona(c), `${maximo[s]}-${s}`);
  });
  return contratos.map((c) => (c.staffCode ? c : { ...c, staffCode: porPersona.get(persona(c)) }));
}

/** ¿Parece un código de personal? (1-COACH, 1-c, 2nutri) */
export const esCodigoPersonal = (t) => /^\s*\d{1,4}\s*-?\s*[a-z]{1,6}\s*$/i.test(String(t || ""));

/**
 * Busca a una persona del personal por su código (1-COACH, 1-C, 1c) o DNI.
 * Prefiere el contrato vigente. Devuelve el contrato o null.
 */
export function buscarPersonal(contratos = [], texto) {
  const t = String(texto || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return null;
  const vigentePrimero = (lista) => lista.sort((a, b) => (a.status === "active" ? -1 : 0) - (b.status === "active" ? -1 : 0))[0] || null;
  const m = /^(\d{1,4})-?([A-Z]{1,6})$/.exec(t);
  if (m) {
    const n = Number(m[1]);
    const lista = contratos.filter((c) => {
      const [num, suf] = String(c.staffCode || "").split("-");
      return Number(num) === n && suf && suf.startsWith(m[2]);
    });
    return vigentePrimero(lista);
  }
  if (/^\d{8}$/.test(t)) return vigentePrimero(contratos.filter((c) => String(c.dni) === t));
  return null;
}

/** Registro de ingreso de hoy de esa persona (para no marcar dos veces) */
export const ingresoDeHoy = (asistencias = [], userId, hoy) =>
  asistencias.find((a) => String(a.userId) === String(userId) && a.date === hoy && (a.type || "in") === "in" && a.status !== "falta") || null;
