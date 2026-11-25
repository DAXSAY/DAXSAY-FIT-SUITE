// Nombre de un turno de recepción para mostrar: «Turno 1 - Mañana» -> «Turno Mañana»
// (con las personas: «Turno Mañana · Ana, Rosa»). Sirve para 3, 4, 5... turnos.
export const nombreCortoTurno = (n) => String(n || "").replace(/^\s*turno\s*\d*\s*[-–·:]?\s*/i, "").trim() || String(n || "");
export const nombreTurno = (n, personas = []) => {
  const gente = (personas || []).map((p) => String(p.name || p.nombre || "").trim().split(/\s+/)[0]).filter(Boolean);
  return `Turno ${nombreCortoTurno(n)}${gente.length ? ` · ${gente.join(", ")}` : ""}`;
};
