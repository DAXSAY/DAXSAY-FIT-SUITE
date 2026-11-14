// Huella de un registro: el mismo cálculo en la API y en la pantalla.
// Sirve para saber si alguien más cambió el registro mientras yo lo editaba
// (varias sesiones a la vez: recepción, administración, entrenadores…).
// JSON "estable": las claves ordenadas (MySQL reordena las claves del JSON).
export const jsonEstable = (v) => {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(jsonEstable).join(",")}]`;
  return `{${Object.keys(v)
    .filter((k) => v[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${jsonEstable(v[k])}`)
    .join(",")}}`;
};

// FNV-1a de 53 bits (rápido, sin librerías)
export const huella = (v) => {
  const s = jsonEstable(v);
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822507);
  }
  return ((h2 >>> 0) * 2 ** 21 + ((h1 >>> 0) & 0x1fffff)).toString(36);
};
