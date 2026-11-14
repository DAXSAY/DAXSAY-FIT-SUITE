// =====================================================================
// Colores de los planes: cada plan tiene su color (lo elige administración
// al crear o editar el plan). Si aún no tiene, se usa el de su posición por
// precio, igual que antes. Los mismos colores se usan en los reportes.
// Las clases de Tailwind se escriben completas para que Tailwind las incluya.
// =====================================================================
export const PALETA = {
  plomo: { nombre: "Plomo", hex: "#64748b", acento: "from-slate-600 to-slate-800", borde: "border-slate-300", suave: "bg-slate-50", texto: "text-slate-700" },
  celeste: { nombre: "Celeste", hex: "#0ea5e9", acento: "from-sky-500 to-blue-700", borde: "border-sky-300", suave: "bg-sky-50", texto: "text-sky-700" },
  indigo: { nombre: "Índigo", hex: "#6366f1", acento: "from-indigo-500 to-violet-700", borde: "border-indigo-300", suave: "bg-indigo-50", texto: "text-indigo-700" },
  verde: { nombre: "Verde", hex: "#10b981", acento: "from-emerald-500 to-teal-700", borde: "border-emerald-300", suave: "bg-emerald-50", texto: "text-emerald-700" },
  naranja: { nombre: "Naranja", hex: "#f59e0b", acento: "from-amber-500 to-orange-700", borde: "border-amber-300", suave: "bg-amber-50", texto: "text-amber-700" },
  rojo: { nombre: "Rojo", hex: "#ef4444", acento: "from-rose-500 to-red-700", borde: "border-rose-300", suave: "bg-rose-50", texto: "text-rose-700" },
  rosa: { nombre: "Rosa", hex: "#ec4899", acento: "from-pink-500 to-fuchsia-700", borde: "border-pink-300", suave: "bg-pink-50", texto: "text-pink-700" },
  morado: { nombre: "Morado", hex: "#8b5cf6", acento: "from-violet-500 to-purple-800", borde: "border-violet-300", suave: "bg-violet-50", texto: "text-violet-700" },
  turquesa: { nombre: "Turquesa", hex: "#14b8a6", acento: "from-teal-400 to-cyan-700", borde: "border-teal-300", suave: "bg-teal-50", texto: "text-teal-700" },
  negro: { nombre: "Negro", hex: "#1e293b", acento: "from-zinc-800 to-black", borde: "border-zinc-400", suave: "bg-zinc-50", texto: "text-zinc-800" },
};
// Orden de respaldo (por precio, de menor a mayor), igual que antes de poder elegirlo
const POR_POSICION = ["plomo", "celeste", "indigo", "verde", "naranja", "rosa", "turquesa", "morado", "rojo", "negro"];

// Oscurece un color #rrggbb (para el degradado del color personalizado)
const oscurecer = (hex, f = 0.35) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (x) => Math.max(0, Math.round(x * (1 - f))).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
};
export const esColorLibre = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ""));
const colorLibre = (hex) => ({
  nombre: "Personalizado",
  hex,
  acento: "",
  estilo: { backgroundImage: `linear-gradient(135deg, ${hex}, ${oscurecer(hex)})` },
  borde: "border-slate-300",
  suave: "bg-slate-50",
  texto: "text-slate-700",
});

/** Color de un plan: el elegido (de la paleta o personalizado), o el de su posición por precio */
export const colorDePlan = (plan, indice = 0) =>
  esColorLibre(plan?.color) ? colorLibre(plan.color) : PALETA[plan?.color] || PALETA[POR_POSICION[Math.min(indice, POR_POSICION.length - 1)]];

/** Mapa nombre del plan -> color, ordenando como en Planes & Tarifas (por precio) */
export const coloresPorNombre = (planes = []) => {
  const m = {};
  [...planes].sort((a, b) => a.price - b.price).forEach((p, i) => (m[p.name] = colorDePlan(p, i)));
  return m;
};
