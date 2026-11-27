// =====================================================================
// Búsqueda por código en todo el sistema (check-in, nutrición, fisio,
// rutinas, alumnos, CRM, usuarios…).
// Reglas:
//   · "1"            → SOLO quien tiene el número 1: el alumno 1 y el
//                      personal 1-ENTR, 1-EXT, 1-NUTRI… (nunca 12, 41 o 111)
//   · "DR-12" / "dr12" → el alumno 12          · "1-coach" / "1c" → personal
//   · 8 cifras       → DNI exacto (alumnos y personal)
//   · 6-7 cifras     → DNI que empieza así
//   · texto (3+)     → nombre, sin importar tildes ni mayúsculas
// =====================================================================

export const sinTildes = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const TIPO_PERSONAL = { ENTR: "Entrenador", COACH: "Entrenador", NUTRI: "Nutrición", FISIO: "Fisioterapia", RECEP: "Recepción", MANT: "Mantenimiento", GEST: "Coordinación", EXT: "Externo", STAFF: "Personal" };

/** Clasifica lo escrito */
export function tipoDeBusqueda(texto) {
  const t = String(texto || "").trim();
  if (!t) return { tipo: "vacio" };
  const digitos = t.replace(/[\s+()-]/g, "");
  if (/^\d{9,12}$/.test(digitos) && !/^\d{8}$/.test(t)) return { tipo: "telefono", valor: digitos.slice(-9) };
  if (/^\d{8}$/.test(t)) return { tipo: "dni", valor: t };
  if (/^\d{6,7}$/.test(t)) return { tipo: "dni_parcial", valor: t };
  const soloNumero = /^#?\s*(\d{1,5})$/.exec(t);
  if (soloNumero) return { tipo: "numero", n: Number(soloNumero[1]) };
  const alumno = /^([a-zñ]{1,3})\s*-?\s*(\d{1,5})$/i.exec(t);
  if (alumno) return { tipo: "codigo_alumno", n: Number(alumno[2]), letras: sinTildes(alumno[1]).toUpperCase() };
  const personal = /^(\d{1,4})\s*-?\s*([a-z]{1,6})$/i.exec(t);
  if (personal) return { tipo: "codigo_personal", n: Number(personal[1]), sufijo: personal[2].toUpperCase() };
  return { tipo: "nombre", q: sinTildes(t) };
}

const numeroAlumno = (m) => Number(m?.code);
const numeroPersonal = (c) => Number(String(c?.staffCode || "").split("-")[0]);
const sufijoPersonal = (c) => { const x = String(c?.staffCode || "").split("-")[1] || ""; return x === "COACH" ? "ENTR" : x; };

/** ¿El alumno coincide con lo escrito? (para filtrar listas de alumnos) */
export function coincideAlumno(m, texto) {
  const b = tipoDeBusqueda(texto);
  switch (b.tipo) {
    case "vacio":
      return true;
    case "numero":
    case "codigo_alumno":
      return numeroAlumno(m) === b.n;
    case "dni":
      return String(m?.dni || "") === b.valor;
    case "dni_parcial":
      return String(m?.dni || "").startsWith(b.valor);
    case "codigo_personal":
      return false;
    case "telefono":
      return String(m?.phone || "").replace(/\D/g, "").endsWith(b.valor);
    default: {
      const nombre = sinTildes(m?.fullName || m?.name || m?.memberName);
      return b.q.length >= 2 && (nombre.includes(b.q) || sinTildes(m?.codeLabel).replace("-", "") === b.q.replace("-", ""));
    }
  }
}

/** Filtra una lista de alumnos con la regla común (los que empiezan igual van primero) */
export function filtrarAlumnos(lista = [], texto) {
  const b = tipoDeBusqueda(texto);
  const r = lista.filter((m) => coincideAlumno(m, texto));
  if (b.tipo === "nombre") r.sort((a, c) => Number(sinTildes(c.fullName).startsWith(b.q)) - Number(sinTildes(a.fullName).startsWith(b.q)));
  return r;
}

/** Una sola persona del personal por contrato (prefiere el vigente) */
const unicos = (contratos) => {
  const mapa = new Map();
  // Un contrato terminado o anulado ya no marca asistencia
  contratos.filter((c) => c.status !== "terminated" && c.status !== "annulled").forEach((c) => {
    const k = String(c.staffId || c.dni || c.id);
    const prev = mapa.get(k);
    if (!prev || (c.status === "active" && prev.status !== "active")) mapa.set(k, c);
  });
  return [...mapa.values()];
};

/**
 * Todas las personas que coinciden (alumnos + personal), listas para elegir.
 * @returns [{ clave, tipo: "alumno"|"personal", codigo, nombre, detalle, member?, contrato? }]
 */
export function candidatosPorCodigo(texto, members = [], contratos = [], max = 8) {
  const b = tipoDeBusqueda(texto);
  if (b.tipo === "vacio") return [];
  const alumnos = filtrarAlumnos(members, texto).map((m) => ({
    clave: `a${m.id}`,
    tipo: "alumno",
    codigo: m.codeLabel || (m.code != null ? String(m.code) : ""),
    nombre: m.fullName,
    detalle: `Socio${m.planName ? ` · ${m.planName}` : ""}`,
    member: m,
  }));
  const personal = unicos(contratos)
    .filter((c) => {
      if (!c.staffCode) return false;
      switch (b.tipo) {
        case "numero":
          return numeroPersonal(c) === b.n;
        case "codigo_personal":
          return numeroPersonal(c) === b.n && sufijoPersonal(c).startsWith(/^CO/.test(b.sufijo) ? "ENTR" : b.sufijo);
        case "dni":
          return String(c.dni || "") === b.valor;
        case "dni_parcial":
          return String(c.dni || "").startsWith(b.valor);
        case "nombre":
          return b.q.length >= 3 && sinTildes(c.fullName).includes(b.q);
        default:
          return false;
      }
    })
    .map((c) => ({
      clave: `p${c.staffId || c.id}`,
      tipo: "personal",
      codigo: c.staffCode,
      nombre: c.fullName,
      detalle: c.roleTitle || TIPO_PERSONAL[sufijoPersonal(c)] || "Personal",
      externo: sufijoPersonal(c) === "EXT",
      contrato: c,
    }));
  return [...alumnos, ...personal].slice(0, max);
}

/** ¿La persona del personal coincide? "1" = 1-ENTR, 1-EXT…; "1c"; DNI; nombre o cargo */
export function coincidePersonal(c, texto) {
  const b = tipoDeBusqueda(texto);
  const num = Number(String(c?.staffCode || "").split("-")[0]);
  const suf = String(c?.staffCode || "").split("-")[1] || "";
  switch (b.tipo) {
    case "vacio":
      return true;
    case "numero":
      return num === b.n;
    case "codigo_personal":
      return num === b.n && suf.startsWith(b.sufijo);
    case "codigo_alumno":
      return false;
    case "dni":
      return String(c?.dni || "") === b.valor;
    case "dni_parcial":
      return String(c?.dni || "").startsWith(b.valor);
    case "telefono":
      return String(c?.phone || "").replace(/\D/g, "").endsWith(b.valor);
    default:
      return b.q.length >= 2 && sinTildes(`${c?.fullName} ${c?.roleTitle || ""} ${c?.department || ""}`).includes(b.q);
  }
}

/** Filtro genérico para filas con { codigo, nombre, dni, telefono } (reportes, mensajes) */
export function coincideFila({ code, codeLabel, nombre, dni, telefono, extra = "" }, texto) {
  return coincideAlumno({ code: code ?? Number(String(codeLabel || "").split("-")[1]), codeLabel, fullName: `${nombre || ""} ${extra}`, dni, phone: telefono }, texto);
}
