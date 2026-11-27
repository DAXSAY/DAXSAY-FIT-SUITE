// Datos comunes de la asignación de tareas (tipos, áreas, textos)
export const TIPOS_TAREA = {
  llamada: { emoji: "📞", label: "Llamar", tono: "azul" },
  whatsapp: { emoji: "💬", label: "WhatsApp", tono: "verde" },
  visita: { emoji: "🚶", label: "Vendrá a visitar", tono: "azul" },
  renovacion: { emoji: "🔁", label: "Renovación", tono: "teal" },
  cobro: { emoji: "💰", label: "Cobrar saldo", tono: "ambar" },
  pase_libre: { emoji: "🎟️", label: "Pase libre", tono: "violeta" },
  rutina: { emoji: "🏋️", label: "Armar rutina", tono: "naranja" },
  seguimiento: { emoji: "📈", label: "Seguimiento", tono: "indigo" },
  fisio: { emoji: "🩺", label: "Fisioterapia", tono: "rosa" },
  abandono: { emoji: "🚶", label: "No viene", tono: "rojo" },
  nutricion: { emoji: "🥗", label: "Nutrición", tono: "lima" },
  equipo: { emoji: "🔧", label: "Máquina / equipo", tono: "naranja" },
  entrega: { emoji: "📦", label: "Entregar / guardar algo", tono: "violeta" },
  limpieza: { emoji: "🧹", label: "Orden / limpieza", tono: "plomo" },
  otro: { emoji: "📌", label: "Otro", tono: "plomo" },
  nota: { emoji: "🗒️", label: "Comentario", tono: "indigo", soloComentario: true },
};

/** Frases rápidas para no escribir todo (se pueden editar) */
export const PLANTILLAS = {
  nota: [
    "Vino a pedir información y horarios; dijo que vendrá por la tarde",
    "Llamó preguntando por precios; no dejó datos",
    "Un socio olvidó un objeto; está guardado en recepción",
    "Se acabó un insumo (papel, jabón, agua)",
    "Hay una máquina con falla; avisar a mantenimiento",
    "Todo tranquilo en el turno, sin novedades",
  ],
  visita: ["Vendrá hoy por la tarde a conocer el gimnasio", "Vendrá mañana con un amigo", "Vendrá a pagar su matrícula"],
  llamada: ["Llamar para confirmar su visita", "Llamar para recordar su renovación"],
  whatsapp: ["Enviar horarios y precios por WhatsApp", "Enviar su rutina por WhatsApp"],
  equipo: ["Revisar máquina que hace ruido", "Cambiar cable de la polea", "Reportar al técnico"],
  entrega: ["Entregar llaves del casillero", "Entregar el pedido de la tienda", "Guardar el objeto olvidado"],
  cobro: ["Cobrar saldo pendiente de su matrícula"],
};
export const tipoDe = (t) => TIPOS_TAREA[t] || TIPOS_TAREA.otro;

export const AREAS = {
  reception: { emoji: "🛎️", label: "Recepción (todos los turnos)", corto: "Recepción" },
  trainer: { emoji: "🏋️", label: "Entrenadores", corto: "Entrenadores" },
  physio: { emoji: "🩺", label: "Fisioterapia", corto: "Fisioterapia" },
  nutritionist: { emoji: "🥗", label: "Nutrición", corto: "Nutrición" },
  instructor: { emoji: "🎵", label: "Profesores de clases grupales", corto: "Profesores" },
};

export const primerNombre = (n) => String(n || "").trim().split(/\s+/)[0] || "";

/** «Turno Mañana · Ana, Rosa» */
export const textoTurno = (t, conPersonas = true) => {
  if (!t) return "Turno";
  const gente = conPersonas && t.personas?.length ? ` · ${t.personas.map((p) => primerNombre(p.nombre)).join(", ")}` : "";
  return `Turno ${t.corto || t.nombre}${gente}`;
};

/** Para quién es la tarea, en palabras */
export const textoDestino = (d, turnos = []) => {
  if (!d) return "";
  if (d.tipo === "turno") return textoTurno(turnos.find((t) => t.id === d.turnoId));
  if (d.tipo === "rol") return AREAS[d.rol]?.label || d.rol;
  return d.usuario || "Una persona";
};
export const emojiDestino = (d) => (d?.tipo === "turno" ? "🕒" : d?.tipo === "rol" ? AREAS[d.rol]?.emoji || "👥" : "👤");

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const fechaCorta = (iso) => {
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
};
export const diaSemana = (iso) => DIAS[new Date(`${String(iso).slice(0, 10)}T12:00:00`).getDay()];
export const sumarDiasISO = (iso, n) => {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const cuandoTexto = (iso, hoy) => {
  if (iso === hoy) return "Hoy";
  if (iso === sumarDiasISO(hoy, 1)) return "Mañana";
  if (iso === sumarDiasISO(hoy, -1)) return "Ayer";
  return `${diaSemana(iso)} ${fechaCorta(iso)}`;
};

/** Enlace de WhatsApp (Perú: 9 dígitos -> +51) */
export const enlaceWhatsapp = (tel, texto = "") => {
  const d = String(tel || "").replace(/\D/g, "");
  if (d.length < 9) return null;
  const n = d.length === 9 ? `51${d}` : d;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
};

export const ESTADOS = {
  pendiente: { label: "Pendiente", tono: "ambar", emoji: "⏳" },
  en_curso: { label: "En curso", tono: "azul", emoji: "🙋" },
  hecha: { label: "Hecha", tono: "verde", emoji: "✅" },
  cancelada: { label: "Anulada", tono: "plomo", emoji: "🚫" },
  atrasada: { label: "Atrasada", tono: "rojo", emoji: "⏰" },
};
export const estadoVisible = (t) => (t.atrasada ? "atrasada" : t.estado);
