// Mensajes de WhatsApp del CRM (archivo liviano: lo usa también la barra superior)
import { hoyISO } from "../../utils/fecha";

const fCorta = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");

/** Primer nombre de quien atiende (recepcionista conectada) */
export const primerNombre = (t) => String(t || "").trim().split(/\s+/)[0] || "";
/** "soy Margot de RADICAL" (o "te escribe recepción de RADICAL" si la cuenta aún tiene nombre genérico) */
export const presentacion = (quien, gym) => {
  const n = primerNombre(quien);
  if (!n || /^(recepci[oó]n|administra|admin|entrenador|nutrici|fisioterap|usuario)/i.test(n)) return `te escribe recepción de *${gym}*`;
  return `soy ${n} de *${gym}*`;
};

/** Mensaje de WhatsApp para el interesado, firmado por quien lo atiende */
export const mensajeWhatsApp = (p, gym = "RADICAL", quien = "") => {
  const nombre = primerNombre(p.fullName);
  const yo = presentacion(quien, gym);
  const plan = p.planName ? `el plan *${p.planName}*${p.planPrice ? ` (S/ ${p.planPrice})` : ""}` : "nuestros planes";
  const vinoHoy = p.source === "visita" && String(p.createdAt || "").slice(0, 10) === hoyISO();
  const inicio = vinoHoy ? `Gracias por visitarnos hoy y preguntar por ${plan}.` : `Gracias por tu interés en ${plan}.`;
  if (p.passCode) {
    const hora = p.contactDate === p.passDate && p.contactTime ? ` a las ${p.contactTime}` : "";
    return `Hola ${nombre} 👋, ${yo}. ${inicio}\n\n🎟️ Aquí tienes tu *pase libre* para conocer el gimnasio y entrenar gratis:\nCódigo: *${p.passCode}*\nVálido el ${fCorta(p.passDate)}${hora}.\n\nMuestra el QR (o el código) en recepción al llegar. Cualquier duda o consulta, escríbenos por aquí. ¡Te esperamos! 💪`;
  }
  return `Hola ${nombre} 👋, ${yo}. ${inicio}\n¿Te ayudamos a separar tu matrícula o prefieres venir a conocer el gimnasio con un pase libre? 💪`;
};

/** Para quien no vino con su pase: invitarlo a reprogramar */
export const mensajeReprogramar = (p, gym = "RADICAL", quien = "") => {
  const yo = presentacion(quien, gym);
  return `Hola ${primerNombre(p.fullName)} 👋, ${yo}. Te esperábamos el ${fCorta(p.passDate)} con tu pase libre *${p.passCode}* 😊. ¿Te lo reprogramamos para otro día? Dinos qué día y hora te queda mejor.`;
};

