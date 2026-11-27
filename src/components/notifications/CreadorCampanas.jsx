import React, { useMemo, useState } from "react";
import { Send, Bell, MessageCircle, Mail, Users, Check, Sparkles, ExternalLink } from "lucide-react";
import { enlaceWhatsApp } from "../common/TelWhatsApp";
import { IconoEmoji } from "../common/IconoEmoji";

// Tipos de campaña del gimnasio
const TIPOS = [
  { k: "special_promo", emoji: "🏷️", nombre: "Promoción o descuento", ayuda: "Precio especial por tiempo limitado", titulo: "🔥 Precio especial esta semana", msg: "¡Hola {{nombre}}! Esta semana tu plan {{plan}} tiene precio especial. Acércate a recepción o respóndenos por aquí. 💪" },
  { k: "renewal_reminder", emoji: "🔁", nombre: "Renovación", ayuda: "Recordar renovar antes de vencer", titulo: "Renueva y sigue entrenando", msg: "¡Hola {{nombre}}! Tu plan {{plan}} vence el {{fecha_vencimiento}}. Renueva a tiempo y no pierdas tu progreso. 💪" },
  { k: "reenganche", emoji: "👋", nombre: "Te extrañamos", ayuda: "Para quienes dejaron de venir", titulo: "Te extrañamos en RADICAL", msg: "¡Hola {{nombre}}! Hace tiempo no te vemos. Vuelve esta semana y te ayudamos a retomar tu rutina con una evaluación sin costo." },
  { k: "nuevo_plan", emoji: "🆕", nombre: "Nuevo plan", ayuda: "Lanzamiento de un plan o beneficio", titulo: "Nuevo plan disponible", msg: "¡Hola {{nombre}}! Lanzamos un plan nuevo con entrenador, nutrición y fisioterapia incluidos. Pregunta en recepción." },
  { k: "reto", emoji: "🏆", nombre: "Reto o competencia", ayuda: "Reto 30 días, récord de fuerza, cambio físico", titulo: "Reto de 30 días", msg: "¡Hola {{nombre}}! Empieza el reto de 30 días de RADICAL: entrenas, te medimos y premiamos el mejor cambio. ¿Te inscribimos?" },
  { k: "evaluacion", emoji: "📏", nombre: "Evaluación física", ayuda: "Invitar a medirse (antropometría, bioimpedancia)", titulo: "Evaluación física del mes", msg: "¡Hola {{nombre}}! Agenda tu evaluación física de este mes con nutrición y mira cuánto avanzaste." },
  { k: "tienda", emoji: "🥤", nombre: "Tienda y suplementos", ayuda: "Ofertas de la tienda del gimnasio", titulo: "Ofertas en la tienda", msg: "¡Hola {{nombre}}! Esta semana tenemos descuento en suplementos y bebidas en la tienda del gimnasio." },
  { k: "referidos", emoji: "🤝", nombre: "Trae a un amigo", ayuda: "Beneficio por referir a alguien", titulo: "Entrena con un amigo", msg: "¡Hola {{nombre}}! Trae a un amigo esta semana: él entrena un día gratis y tú ganas un beneficio en tu próxima renovación." },
  { k: "cumpleanos", emoji: "🎂", nombre: "Cumpleaños", ayuda: "Saludo y regalo del mes", titulo: "¡Feliz cumpleaños!", msg: "¡Feliz cumpleaños, {{nombre}}! 🎉 Pasa por recepción por tu regalo de RADICAL." },
  { k: "general_alert", emoji: "📢", nombre: "Aviso general", ayuda: "Horario, feriado, mantenimiento", titulo: "Aviso importante", msg: "¡Hola {{nombre}}! Te informamos que el horario del gimnasio cambia por feriado. Gracias por tu comprensión." },
];

const SEGMENTOS = [
  { k: "all", nombre: "Todos", tono: "teal" },
  { k: "active", nombre: "Activos", tono: "emerald" },
  { k: "expiring_soon", nombre: "Por vencer", tono: "amber" },
  { k: "expired", nombre: "Vencidos", tono: "rose" },
  { k: "frozen", nombre: "Congelados", tono: "sky" },
];

const CANALES = [
  { k: "push", nombre: "Aviso en el sistema", ayuda: "Le llega a su portal del alumno", icono: Bell },
  { k: "whatsapp", nombre: "WhatsApp", ayuda: "Abre el chat con el mensaje listo", icono: MessageCircle },
  { k: "email", nombre: "Correo", ayuda: "Abre Gmail, Outlook o su correo con el mensaje", icono: Mail },
];

const personalizar = (t, m) =>
  String(t || "")
    .replace(/{{nombre}}/g, (m.fullName || "").split(" ")[0])
    .replace(/{{plan}}/g, m.planName || "")
    .replace(/{{fecha_vencimiento}}/g, m.membershipEndDate || "")
    .replace(/{{telefono}}/g, m.phone || "")
    .replace(/{{email}}/g, m.email || "");

const enlaceCorreo = (m, titulo, cuerpo) =>
  `mailto:${encodeURIComponent(m.email || "")}?subject=${encodeURIComponent(personalizar(titulo, m))}&body=${encodeURIComponent(personalizar(cuerpo, m))}`;

export const CreadorCampanas = ({ members = [], sendManualCampaign }) => {
  // Nada preseleccionado: el usuario elige tipo, público y canal a mano
  const [tipo, setTipo] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [segmento, setSegmento] = useState(null);
  const [canales, setCanales] = useState([]);
  const [enviada, setEnviada] = useState(null);

  const cuenta = useMemo(() => {
    const c = { all: members.length };
    SEGMENTOS.slice(1).forEach((s) => (c[s.k] = members.filter((m) => m.status === s.k).length));
    return c;
  }, [members]);
  const destinatarios = !segmento ? [] : segmento === "all" ? members : members.filter((m) => m.status === segmento);
  const t = TIPOS.find((x) => x.k === tipo);

  const elegirTipo = (x) => {
    setTipo(x.k);
    setTitulo(x.titulo);
    setMensaje(x.msg);
  };
  const alternarCanal = (k) => setCanales((cs) => (cs.includes(k) ? cs.filter((c) => c !== k) : [...cs, k]));

  const enviar = (e) => {
    e.preventDefault();
    if (!tipo || !segmento || !canales.length || !titulo.trim() || !mensaje.trim() || !destinatarios.length) return;
    sendManualCampaign({
      title: titulo.trim(),
      message: mensaje.trim(),
      category: tipo,
      targetAudience: segmento,
      specificMemberIds: destinatarios.map((m) => m.id),
      channels: canales,
    });
    setEnviada({ titulo: titulo.trim(), mensaje: mensaje.trim(), lista: destinatarios, canales: [...canales] });
  };

  if (enviada)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check className="w-6 h-6" /></span>
            <div>
              <p className="text-base font-black text-slate-900">Campaña registrada: {enviada.titulo}</p>
              <p className="text-sm text-slate-600">
                {enviada.canales.includes("push") ? `El aviso ya está en el portal de ${enviada.lista.length} alumno(s). ` : ""}
                {enviada.canales.some((c) => c !== "push") ? "Abre cada WhatsApp o correo para enviarlo (el mensaje ya va escrito)." : ""}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setEnviada(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">Nueva campaña</button>
        </div>
        {enviada.canales.some((c) => c !== "push") && (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 max-h-[460px] overflow-y-auto">
            {enviada.lista.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="font-mono text-[11px] font-bold text-slate-500 w-14">{m.codeLabel}</span>
                <span className="flex-1 min-w-[160px] text-sm font-bold text-slate-900 truncate">{m.fullName}</span>
                {enviada.canales.includes("whatsapp") && (
                  <a href={enlaceWhatsApp(m.phone, personalizar(enviada.mensaje, m))} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${m.phone ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : "pointer-events-none opacity-40 border-slate-200 text-slate-400"}`}>
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
                {enviada.canales.includes("email") && (
                  <a href={m.email ? enlaceCorreo(m, enviada.titulo, enviada.mensaje) : undefined} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${m.email ? "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100" : "pointer-events-none opacity-40 border-slate-200 text-slate-400"}`} title={m.email || "Sin correo registrado"}>
                    <Mail className="w-3.5 h-3.5" /> {m.email ? "Correo" : "Sin correo"}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );

  return (
    <form onSubmit={enviar} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-violet-600 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Campañas y promociones</p>
        <h2 className="text-base font-black text-slate-900">Envía un mensaje a un grupo de alumnos</h2>
      </div>

      <section>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500 mb-2">1 · Tipo de campaña</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {TIPOS.map((x) => {
            const on = tipo === x.k;
            return (
              <button key={x.k} type="button" onClick={() => elegirTipo(x)} className={`text-left rounded-xl border p-2.5 cursor-pointer transition ${on ? "border-violet-400 bg-violet-50 ring-2 ring-violet-300/40" : "border-slate-200 bg-white hover:border-violet-300"}`}>
                <span className="text-lg"><IconoEmoji e={x.emoji} /></span>
                <span className="block text-sm font-black text-slate-900 leading-tight mt-0.5">{x.nombre}</span>
                <span className="block text-[11px] text-slate-500 leading-snug">{x.ayuda}</span>
              </button>
            );
          })}
        </div>
        {!tipo && <p className="text-xs font-bold text-violet-700 mt-2">👆 Elige el tipo de campaña para cargar un mensaje de ejemplo.</p>}
      </section>

      <section>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500 mb-2">2 · ¿A quién? <span className="normal-case font-semibold">({cuenta.all} alumnos en total)</span></p>
        <div className="flex flex-wrap gap-2">
          {SEGMENTOS.map((sg) => {
            const on = segmento === sg.k;
            return (
              <button key={sg.k} type="button" onClick={() => setSegmento(sg.k)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold cursor-pointer ${on ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-teal-400"}`}>
                <Users className="w-4 h-4" /> {sg.nombre}
                <span className={`px-1.5 rounded-full text-[11px] font-black ${on ? "bg-white/25" : "bg-slate-100 text-slate-600"}`}>{cuenta[sg.k] || 0}</span>
              </button>
            );
          })}
        </div>
        {!segmento && <p className="text-xs font-bold text-teal-700 mt-2">👆 Elige a qué grupo de alumnos se enviará.</p>}
        <p className="text-[11px] text-slate-500 mt-1.5">
          Activos {cuenta.active} + por vencer {cuenta.expiring_soon} + vencidos {cuenta.expired} + congelados {cuenta.frozen} = {cuenta.active + cuenta.expiring_soon + cuenta.expired + cuenta.frozen} alumnos.
        </p>
      </section>

      <section>
        <p className="text-xs font-black uppercase tracking-wide text-slate-500 mb-2">3 · ¿Por dónde?</p>
        <div className="grid sm:grid-cols-3 gap-2">
          {CANALES.map((c) => {
            const on = canales.includes(c.k);
            const I = c.icono;
            return (
              <button key={c.k} type="button" onClick={() => alternarCanal(c.k)} aria-pressed={on} className={`flex items-center gap-3 rounded-xl border p-3 text-left cursor-pointer ${on ? "border-teal-400 bg-teal-50 ring-2 ring-teal-300/40" : "border-slate-200 bg-white hover:border-teal-300"}`}>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${on ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"}`}><I className="w-4 h-4" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900">{c.nombre}</span>
                  <span className="block text-[11px] text-slate-500">{c.ayuda}</span>
                </span>
                {on && <Check className="w-4 h-4 text-teal-600 ml-auto" />}
              </button>
            );
          })}
        </div>
        {!canales.length && <p className="text-xs font-bold text-teal-700 mt-2">👆 Marca uno o más canales (puedes combinar).</p>}
      </section>

      {!tipo ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-2xl">✉️</p>
          <p className="text-sm font-black text-slate-800">El mensaje aparecerá aquí</p>
          <p className="text-xs text-slate-500">Primero elige el tipo de campaña de arriba; luego podrás editar el título y el texto.</p>
        </div>
      ) : (
      <section className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">4 · Mensaje</p>
          <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (asunto del correo)" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900" />
          <textarea required rows={5} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" />
          <p className="text-[11px] text-slate-500">Puedes usar {"{{nombre}}"}, {"{{plan}}"} y {"{{fecha_vencimiento}}"}: se cambian por los datos de cada alumno.</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Así lo verá {destinatarios[0] ? destinatarios[0].fullName.split(" ")[0] : "el alumno"}</p>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-black text-emerald-800"><IconoEmoji e={t?.emoji} /> {destinatarios[0] ? personalizar(titulo, destinatarios[0]) : titulo}</p>
            <p className="text-sm text-slate-800 mt-1 whitespace-pre-line">{destinatarios[0] ? personalizar(mensaje, destinatarios[0]) : mensaje}</p>
          </div>
        </div>
      </section>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <span className="text-sm text-slate-600">
          {!tipo || !segmento || !canales.length
            ? `Falta elegir: ${[!tipo && "tipo", !segmento && "a quién", !canales.length && "canal"].filter(Boolean).join(", ")}`
            : `${destinatarios.length} alumno(s) · ${canales.map((k) => CANALES.find((c) => c.k === k).nombre).join(", ")}`}
        </span>
        <button type="submit" disabled={!tipo || !segmento || !canales.length || !destinatarios.length} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-extrabold flex items-center gap-2 cursor-pointer">
          <Send className="w-4 h-4" /> Preparar envío
        </button>
      </div>
      <p className="text-[11px] text-slate-500 flex items-center gap-1">
        <ExternalLink className="w-3 h-3" /> WhatsApp y correo se abren uno por uno con el mensaje escrito: nada se envía solo sin que lo confirmes.
      </p>
    </form>
  );
};
