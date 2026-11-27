// =====================================================================
// Código del PERSONAL para marcar asistencia: número + guion + cargo.
//   1-ENTR   (primer entrenador)     1-NUTRI  (primera nutricionista)
//   2-ENTR   (segundo entrenador)    1-FISIO  · 1-RECEP · 1-MANT · 1-GEST
// (Los códigos antiguos «N-COACH» se muestran y se buscan como «N-ENTR».)
// Empieza con el número y termina en letras, al revés que el alumno
// (DR-12), así nunca se confunden ni se repiten. En recepción basta
// escribir "1-entr", "1-e" o "1e".
// =====================================================================
export const SUFIJO_CARGO = {
  trainer: "ENTR",
  nutritionist: "NUTRI",
  physiotherapist: "FISIO",
  receptionist: "RECEP",
  maintenance: "MANT",
  manager: "GEST",
};
export const NOMBRE_SUFIJO = {
  ENTR: "Entrenador(a)",
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
  // Término unificado: el código del entrenador termina en ENTR (antes COACH)
  contratos = contratos.map((c) => (c.staffCode && /-COACH$/i.test(c.staffCode) ? { ...c, staffCode: c.staffCode.replace(/-COACH$/i, "-ENTR") } : c));
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

/** ¿Parece un código de personal? (1-ENTR, 1-e, 2nutri) */
export const esCodigoPersonal = (t) => /^\s*\d{1,4}\s*-?\s*[a-z]{1,6}\s*$/i.test(String(t || ""));

/**
 * Busca a una persona del personal por su código (1-ENTR, 1-E, 1e) o DNI.
 * Prefiere el contrato vigente. Devuelve el contrato o null.
 */
export function buscarPersonal(contratos = [], texto) {
  const t = String(texto || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return null;
  const vigentePrimero = (lista) => lista.sort((a, b) => (a.status === "active" ? -1 : 0) - (b.status === "active" ? -1 : 0))[0] || null;
  const m = /^(\d{1,4})-?([A-Z]{1,6})$/.exec(t);
  if (m && /^CO/.test(m[2])) m[2] = "ENTR"; // código antiguo 1-ENTR
  if (m) {
    const n = Number(m[1]);
    const lista = contratos.filter((c) => {
      const [num, suf0] = String(c.staffCode || "").split("-");
      const suf = suf0 === "COACH" ? "ENTR" : suf0;
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
