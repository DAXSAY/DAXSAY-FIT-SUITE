// Tonos variados (no arcoíris): para diferenciar botones, barras y tarjetas
// sin que todo sea del mismo celeste. Clases literales para que Tailwind las incluya.
export const TONOS = [
  { id: "teal", barra: "bg-teal-500", activo: "bg-teal-600 text-white border-teal-600", suave: "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100", texto: "text-teal-700", borde: "border-l-teal-500", punto: "bg-teal-500" },
  { id: "violet", barra: "bg-violet-500", activo: "bg-violet-600 text-white border-violet-600", suave: "bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100", texto: "text-violet-700", borde: "border-l-violet-500", punto: "bg-violet-500" },
  { id: "amber", barra: "bg-amber-500", activo: "bg-amber-600 text-white border-amber-600", suave: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100", texto: "text-amber-700", borde: "border-l-amber-500", punto: "bg-amber-500" },
  { id: "rose", barra: "bg-rose-500", activo: "bg-rose-600 text-white border-rose-600", suave: "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100", texto: "text-rose-700", borde: "border-l-rose-500", punto: "bg-rose-500" },
  { id: "sky", barra: "bg-sky-500", activo: "bg-sky-600 text-white border-sky-600", suave: "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100", texto: "text-sky-700", borde: "border-l-sky-500", punto: "bg-sky-500" },
  { id: "emerald", barra: "bg-emerald-500", activo: "bg-emerald-600 text-white border-emerald-600", suave: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100", texto: "text-emerald-700", borde: "border-l-emerald-500", punto: "bg-emerald-500" },
  { id: "orange", barra: "bg-orange-500", activo: "bg-orange-600 text-white border-orange-600", suave: "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100", texto: "text-orange-700", borde: "border-l-orange-500", punto: "bg-orange-500" },
  { id: "indigo", barra: "bg-indigo-500", activo: "bg-indigo-600 text-white border-indigo-600", suave: "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100", texto: "text-indigo-700", borde: "border-l-indigo-500", punto: "bg-indigo-500" },
];
export const tono = (i) => TONOS[((i % TONOS.length) + TONOS.length) % TONOS.length];
