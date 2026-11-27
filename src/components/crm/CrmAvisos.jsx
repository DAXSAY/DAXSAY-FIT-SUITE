// =====================================================================
// Avisos del CRM
//  * Icono propio (naranja) junto a la campanita general, con su contador.
//  * Cada aviso nuevo entra como tarjeta deslizándose, se queda unos
//    segundos y se va sola (si pasas el mouse encima, espera). Se ven
//    máximo 2 a la vez; las demás esperan su turno en la cola.
//  * Al tocar el icono se abre el panel con TODOS los avisos del CRM,
//    ordenados: Ahora · No vinieron · Agenda de hoy · Se liberan.
// =====================================================================
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Contact, X, Phone, MessageCircle, Footprints, Ticket, AlertTriangle, CalendarClock, Check, CalendarDays, Unlock, ArrowRight, BellRing,
} from "lucide-react";
import { createPortal } from "react-dom";
import { api } from "../../api/cliente";
import { useGym } from "../../context/GymContext";
import { mensajeWhatsApp, mensajeReprogramar } from "./mensajesCrm";
import { enlaceWhatsApp } from "../common/TelWhatsApp";
import { CLASE_PANEL } from "../common/PanelLateral";
import { IconoEmoji } from "../common/IconoEmoji";

const DURACION = 3500; // milisegundos que cada tarjeta se queda en pantalla
const MAX_TARJETAS = 2;
const ICONO = { llamada: Phone, whatsapp: MessageCircle, visita: Footprints };
const ACCION = { llamada: "Llamar a", whatsapp: "Escribir a", visita: "Recibir a" };
const fCorta = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");

// ---------------------------------------------------------------------
// Estado compartido: una sola consulta para el icono, las tarjetas y el panel
// ---------------------------------------------------------------------
const VACIO = { ahora: [], noVinieron: [], hoy: [], seLiberan: [], cargado: false };
let estado = VACIO;
const oyentes = new Set();
let reloj = null;
const emitir = () => oyentes.forEach((f) => f());
export const recargarAvisosCrm = () =>
  api("/prospectos/avisos")
    .then((d) => {
      estado = { ahora: d.ahora || [], noVinieron: d.noVinieron || [], hoy: d.hoy || [], seLiberan: d.seLiberan || [], cargado: true };
      emitir();
    })
    .catch(() => {});
const suscribir = (f) => {
  oyentes.add(f);
  if (oyentes.size === 1) {
    recargarAvisosCrm();
    reloj = setInterval(recargarAvisosCrm, 60000);
    window.addEventListener("radical:crm-cambio", recargarAvisosCrm);
    window.addEventListener("radical:crm", recargarAvisosCrm);
  }
  return () => {
    oyentes.delete(f);
    if (!oyentes.size) {
      clearInterval(reloj);
      window.removeEventListener("radical:crm-cambio", recargarAvisosCrm);
      window.removeEventListener("radical:crm", recargarAvisosCrm);
    }
  };
};
export const useAvisosCrm = () => useSyncExternalStore(suscribir, () => estado);

const claveDe = (tipo, p) => (tipo === "noVino" ? `nv-${p.id}-${p.passDate}` : `${tipo}-${p.id}-${p.contactDate}-${p.contactTime}`);

const notificar = (titulo, cuerpo) => {
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification(titulo, { body: cuerpo, icon: "/icono-192.png" });
  } catch {
    /* sin notificaciones del navegador */
  }
};

/** Abrir la ficha del interesado en el CRM */
const abrirFicha = (p, setActiveTab) => {
  try {
    sessionStorage.setItem("radical_crm_abrir", p.id);
  } catch {
    /* nada */
  }
  setActiveTab?.("crm");
  window.dispatchEvent(new CustomEvent("radical:crm-abrir", { detail: p.id }));
};
const marcarListo = async (p) => {
  try {
    await api(`/prospectos/${p.id}/recordatorio-visto`, { method: "POST" });
  } catch {
    /* se reintenta luego */
  }
  recargarAvisosCrm();
  window.dispatchEvent(new Event("radical:crm"));
};

// ---------------------------------------------------------------------
// Contenido de un aviso (se usa en la tarjeta y en el panel)
// ---------------------------------------------------------------------
const textoAviso = (tipo, p) => {
  if (tipo === "noVino")
    return {
      titulo: `${p.fullName} no vino con su pase`,
      detalle: `Pase ${p.passCode} del ${fCorta(p.passDate)}${p.contactDate === p.passDate && p.contactTime ? ` a las ${p.contactTime}` : ""}. Llámalo y reprográmale la visita.`,
      tono: "rose",
      icono: AlertTriangle,
    };
  if (tipo === "libera")
    return {
      titulo: `${p.fullName} se libera en ${p.freeInDays} día${p.freeInDays === 1 ? "" : "s"}`,
      detalle: `Lleva ${p.daysWithoutFollowUp} días sin seguimiento. Si no lo contactas, otro recepcionista lo puede tomar.`,
      tono: "slate",
      icono: Unlock,
    };
  const conPase = p.contactType === "visita" && p.passCode;
  return {
    titulo: conPase ? `A las ${p.contactTime} viene ${p.fullName}` : `${p.contactTime} · ${ACCION[p.contactType] || "Contactar a"} ${p.fullName}`,
    detalle: conPase
      ? `Trae su pase libre ${p.passCode}${p.planName ? ` · le interesa ${p.planName}` : ""}. Valida su QR en recepción.`
      : `${p.planName ? `Le interesa ${p.planName}. ` : ""}${p.passCode ? "" : "Si acepta venir, genérale su pase libre."}`,
    tono: "orange",
    icono: conPase ? Ticket : ICONO[p.contactType] || Phone,
  };
};
const TONOS = {
  orange: { barra: "from-orange-500 to-amber-400", borde: "border-orange-200", icono: "bg-orange-100 text-orange-600" },
  rose: { barra: "from-rose-600 to-pink-500", borde: "border-rose-200", icono: "bg-rose-100 text-rose-600" },
  slate: { barra: "from-slate-600 to-slate-500", borde: "border-slate-200", icono: "bg-slate-100 text-slate-600" },
  blue: { barra: "from-blue-600 to-cyan-500", borde: "border-blue-200", icono: "bg-blue-100 text-blue-600" },
};

const Acciones = ({ tipo, p, setActiveTab, alHacer }) => {
  const { gymConfig, currentUser } = useGym();
  const gym = gymConfig?.gym_nombre || "nuestro gimnasio";
  const quien = currentUser?.fullName || "";
  const btn = "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer";
  return (
    <div className="flex flex-wrap gap-1.5">
      <a href={`tel:${p.phone}`} className={`${btn} bg-blue-600 text-white`}>
        <Phone className="w-3.5 h-3.5" /> Llamar
      </a>
      <a
        href={enlaceWhatsApp(p.phone, tipo === "noVino" ? mensajeReprogramar(p, gym, quien) : mensajeWhatsApp(p, gym, quien))}
        target="_blank"
        rel="noreferrer"
        className={`${btn} bg-emerald-600 text-white`}
      >
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
      <button type="button" onClick={() => (abrirFicha(p, setActiveTab), alHacer?.())} className={`${btn} bg-violet-600 text-white`}>
        {tipo === "noVino" ? <CalendarClock className="w-3.5 h-3.5" /> : !p.passCode ? <Ticket className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
        {tipo === "noVino" ? "Reprogramar" : !p.passCode ? "Generar pase" : "Ver ficha"}
      </button>
      {tipo === "ahora" && (
        <button type="button" onClick={() => (marcarListo(p), alHacer?.())} className={`${btn} ml-auto bg-emerald-50 border border-emerald-200 text-emerald-700`}>
          <Check className="w-3.5 h-3.5" /> Listo
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Tarjetas que entran, se quedan unos segundos y se van
// ---------------------------------------------------------------------
const Tarjeta = ({ item, onSalir, setActiveTab }) => {
  const [fase, setFase] = useState("entra"); // entra -> visible -> sale
  const [pausa, setPausa] = useState(false);
  const restante = useRef(DURACION);
  const inicio = useRef(0);
  const t = textoAviso(item.tipo, item.p);
  const tono = TONOS[t.tono];
  const I = t.icono;

  useEffect(() => {
    const a = requestAnimationFrame(() => setFase("visible"));
    return () => cancelAnimationFrame(a);
  }, []);
  useEffect(() => {
    if (fase !== "visible" || pausa) return undefined;
    inicio.current = Date.now();
    const id = setTimeout(() => setFase("sale"), restante.current);
    return () => {
      clearTimeout(id);
      restante.current = Math.max(800, restante.current - (Date.now() - inicio.current));
    };
  }, [fase, pausa]);
  useEffect(() => {
    if (fase !== "sale") return undefined;
    const id = setTimeout(onSalir, 450);
    return () => clearTimeout(id);
  }, [fase]);

  return (
    <div
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      className={`bg-white rounded-2xl border ${tono.borde} shadow-2xl overflow-hidden transition-all duration-500 ease-out ${
        fase === "visible" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[110%]"
      }`}
    >
      <div className={`h-1 bg-gradient-to-r ${tono.barra}`}>
        <div
          className="h-full bg-white/60"
          style={{ width: fase === "visible" && !pausa ? "0%" : "100%", transition: fase === "visible" && !pausa ? `width ${restante.current}ms linear` : "none" }}
        />
      </div>
      <div className="p-3 flex gap-3">
        <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${tono.icono}`}>
          <I className="w-4.5 h-4.5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-black text-slate-900 leading-tight">{t.titulo}</p>
            <button type="button" onClick={() => setFase("sale")} className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          {t.detalle && <p className="text-xs text-slate-600">{t.detalle}</p>}
          <Acciones tipo={item.tipo} p={item.p} setActiveTab={setActiveTab} alHacer={() => setFase("sale")} />
        </div>
      </div>
    </div>
  );
};

export const CrmToasts = ({ setActiveTab }) => {
  const d = useAvisosCrm();
  const { gymConfig } = useGym();
  const gym = gymConfig?.gym_nombre || "DAXSAY Fit Suite";
  const vistos = useRef(null);
  const [cola, setCola] = useState([]);
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch {
      /* nada */
    }
  }, []);

  // Cada aviso nuevo entra a la cola una sola vez por sesión
  useEffect(() => {
    if (!d.cargado) return;
    const items = [...d.ahora.map((p) => ({ tipo: "ahora", p })), ...d.noVinieron.map((p) => ({ tipo: "noVino", p }))].map((x) => ({ ...x, clave: claveDe(x.tipo, x.p) }));
    if (vistos.current === null) {
      // Primera carga: si hay muchos, un resumen en vez de 15 tarjetas seguidas
      let guardados = [];
      try {
        guardados = JSON.parse(sessionStorage.getItem("radical_crm_vistos") || "[]");
      } catch {
        /* nada */
      }
      vistos.current = new Set(guardados);
      const nuevos = items.filter((x) => !vistos.current.has(x.clave));
      nuevos.forEach((x) => vistos.current.add(x.clave));
      if (nuevos.length > 3) setResumen(nuevos.length);
      else setCola(nuevos);
    } else {
      const nuevos = items.filter((x) => !vistos.current.has(x.clave));
      nuevos.forEach((x) => {
        vistos.current.add(x.clave);
        const t = textoAviso(x.tipo, x.p);
        notificar(`${gym} · ${t.titulo}`, t.detalle);
      });
      if (nuevos.length) setCola((c) => [...c, ...nuevos]);
    }
    try {
      sessionStorage.setItem("radical_crm_vistos", JSON.stringify([...vistos.current].slice(-300)));
    } catch {
      /* nada */
    }
  }, [d]);

  const visibles = cola.slice(0, MAX_TARJETAS);
  if (!visibles.length && !resumen) return null;
  return (
    <div className="fixed top-28 md:top-20 right-4 z-30 w-[22rem] max-w-[calc(100vw-2rem)] space-y-2 pointer-events-none">
      {resumen && (
        <div className="pointer-events-auto rd-aparece bg-slate-900 text-white rounded-2xl shadow-2xl p-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-black">Tienes {resumen} avisos del CRM</p>
            <p className="text-xs text-slate-300">Están todos en el icono naranja de arriba.</p>
          </div>
          <button
            type="button"
            onClick={() => (setResumen(null), window.dispatchEvent(new Event("radical:crm-panel")))}
            className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-black cursor-pointer"
          >
            Ver
          </button>
          <button type="button" onClick={() => setResumen(null)} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {visibles.map((x) => (
        <div key={x.clave} className="pointer-events-auto">
          <Tarjeta item={x} setActiveTab={setActiveTab} onSalir={() => setCola((c) => c.filter((y) => y.clave !== x.clave))} />
        </div>
      ))}
      {cola.length > MAX_TARJETAS && (
        <p className="pointer-events-auto text-right text-[11px] font-bold text-slate-500">+{cola.length - MAX_TARJETAS} en espera</p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Icono del CRM y panel con todos los avisos
// ---------------------------------------------------------------------
const SECCIONES = [
  ["ahora", "Ahora", BellRing],
  ["noVino", "No vinieron", AlertTriangle],
  ["hoy", "Agenda de hoy", CalendarDays],
  ["libera", "Se liberan", Unlock],
];

// Color de cada sección del panel
const COLOR_SECCION = {
  ahora: { punto: "bg-orange-500", activo: "bg-orange-500 text-white shadow-orange-500/40", linea: "border-l-orange-500", avatar: "from-orange-500 to-amber-400", chip: "bg-orange-50 text-orange-700 border-orange-200" },
  noVino: { punto: "bg-rose-500", activo: "bg-rose-500 text-white shadow-rose-500/40", linea: "border-l-rose-500", avatar: "from-rose-500 to-pink-500", chip: "bg-rose-50 text-rose-700 border-rose-200" },
  hoy: { punto: "bg-sky-500", activo: "bg-sky-500 text-white shadow-sky-500/40", linea: "border-l-sky-500", avatar: "from-sky-500 to-blue-600", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  libera: { punto: "bg-violet-500", activo: "bg-violet-500 text-white shadow-violet-500/40", linea: "border-l-violet-500", avatar: "from-violet-500 to-purple-600", chip: "bg-violet-50 text-violet-700 border-violet-200" },
};
const iniciales = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

// Fila compacta: el mismo diseño que las alertas del gimnasio
// (iniciales · nombre y detalle · una sola etiqueta de tiempo · botones pequeños)
const diasDesde = (iso) => {
  if (!iso) return null;
  const hoy = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }) + "T12:00:00");
  return Math.round((hoy - new Date(`${String(iso).slice(0, 10)}T12:00:00`)) / 86400000);
};
const FilaPanel = ({ tipo, p, setActiveTab, onCerrar }) => {
  const { gymConfig, currentUser } = useGym();
  const c = COLOR_SECCION[tipo];
  const hecho = tipo === "hoy" && (p.reminderSeen || p.status === "matriculado");
  const gym = gymConfig?.gym_nombre || "nuestro gimnasio";
  const quien = currentUser?.fullName || "";
  // Una sola marca de tiempo (sin repetir la fecha en el texto)
  const d = tipo === "noVino" ? diasDesde(p.passDate) : null;
  const tiempo =
    tipo === "noVino" ? (d == null ? fCorta(p.passDate) : d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} d`) : tipo === "libera" ? `en ${p.freeInDays} d` : p.contactTime || "—";
  const detalle =
    tipo === "noVino"
      ? [p.passCode && `🎟️ ${p.passCode}`, p.planName].filter(Boolean).join(" · ")
      : tipo === "libera"
        ? `${p.daysWithoutFollowUp} días sin seguimiento${p.planName ? ` · ${p.planName}` : ""}`
        : [`${ACCION[p.contactType] || "Contactar a"} ${String(p.fullName || "").split(" ")[0]}`, p.passCode ? `🎟️ ${p.passCode}` : p.planName].filter(Boolean).join(" · ");
  const mini = "w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0";
  return (
    <div className={`rd-fila-crm flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 border-l-4 ${c.linea} shadow-sm ${hecho ? "opacity-55" : ""}`}>
      <span className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br ${c.avatar}`}>{iniciales(p.fullName)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black text-slate-900 truncate">{p.fullName}</span>
        <span className="block text-[11px] text-slate-500 truncate">{detalle || "—"}</span>
      </span>
      {hecho ? (
        <span className="shrink-0 text-[10px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Hecho</span>
      ) : (
        <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-full border ${c.chip}`}>{tiempo}</span>
      )}
      {!hecho && (
        <span className="flex items-center gap-1 shrink-0">
          <a
            href={enlaceWhatsApp(p.phone, tipo === "noVino" ? mensajeReprogramar(p, gym, quien) : mensajeWhatsApp(p, gym, quien))}
            target="_blank"
            rel="noreferrer"
            title="WhatsApp"
            className={`${mini} bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>
          <a href={`tel:${p.phone}`} title="Llamar" className={`${mini} bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100`}>
            <Phone className="w-3.5 h-3.5" />
          </a>
          {tipo === "ahora" ? (
            <button type="button" onClick={() => marcarListo(p)} title="Listo" className={`${mini} bg-emerald-600 text-white hover:bg-emerald-700`}>
              <Check className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (abrirFicha(p, setActiveTab), onCerrar?.())}
              title={tipo === "noVino" ? "Reprogramar" : !p.passCode ? "Generar pase" : "Ver ficha"}
              className={`${mini} bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100`}
            >
              {tipo === "noVino" ? <CalendarClock className="w-3.5 h-3.5" /> : !p.passCode ? <Ticket className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </span>
      )}
    </div>
  );
};

export const CrmCampana = ({ setActiveTab }) => {
  const d = useAvisosCrm();
  const [abierto, setAbierto] = useState(false);
  const [seccion, setSeccion] = useState("ahora");
  const boton = React.useRef(null);
  useEffect(() => {
    // Hay una campana para celular y otra para pantalla grande: abre solo la que se ve
    const abrir = () => boton.current?.offsetParent && setAbierto(true);
    window.addEventListener("radical:crm-panel", abrir);
    return () => window.removeEventListener("radical:crm-panel", abrir);
  }, []);
  const listas = { ahora: d.ahora, noVino: d.noVinieron, hoy: d.hoy, libera: d.seLiberan };
  const pendientes = d.ahora.length + d.noVinieron.length;
  const hechosHoy = d.hoy.filter((p) => p.reminderSeen || p.status === "matriculado").length;
  const abrirPanel = () => {
    setSeccion(d.ahora.length ? "ahora" : d.noVinieron.length ? "noVino" : d.hoy.length ? "hoy" : d.seLiberan.length ? "libera" : "ahora");
    setAbierto(true);
    recargarAvisosCrm();
  };
  const hoyCrudo = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Lima" });
  const hoyTexto = hoyCrudo.charAt(0).toUpperCase() + hoyCrudo.slice(1);

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={abrirPanel}
        title="Avisos del CRM"
        className="relative p-2 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow hover:brightness-110 cursor-pointer"
      >
        <Contact className="w-4 h-4" />
        {pendientes > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-rose-600 text-[10px] font-black flex items-center justify-center ring-2 ring-rose-500">
            {pendientes > 99 ? "99+" : pendientes}
          </span>
        )}
      </button>

      {abierto && createPortal(
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button type="button" aria-label="Cerrar" onClick={() => setAbierto(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] cursor-default" />
          <aside className={CLASE_PANEL}>
            {/* Cabecera */}
            <div className="relative overflow-hidden rd-cabecera-panel px-5 pt-5 pb-4 bg-[#0b1626] text-white">
              <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-orange-500/30 blur-3xl" />
              <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-fuchsia-600/25 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Avisos del CRM</p>
                  <p className="text-sm text-white/70 mt-0.5">{hoyTexto}</p>
                </div>
                <button type="button" onClick={() => setAbierto(false)} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer" title="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative flex items-end justify-between mt-4 gap-4">
                <div>
                  <p className="text-5xl font-black leading-none">{pendientes}</p>
                  <p className="text-xs font-bold text-white/70 mt-1">{pendientes === 1 ? "persona por atender ahora" : "personas por atender ahora"}</p>
                </div>
                <div className="flex-1 max-w-[11rem]">
                  <div className="flex justify-between text-[11px] font-bold text-white/70 mb-1">
                    <span>Agenda de hoy</span>
                    <span>{hechosHoy}/{d.hoy.length}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all" style={{ width: `${d.hoy.length ? (hechosHoy / d.hoy.length) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
            {/* Pestañas */}
            <div className="px-3 py-2.5 bg-white border-b border-slate-200 grid grid-cols-4 gap-1.5">
              {SECCIONES.map(([k, l, I]) => {
                const on = seccion === k;
                const n = listas[k].length;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSeccion(k)}
                    className={`relative rounded-xl px-1 py-2 text-center cursor-pointer transition-all ${on ? `${COLOR_SECCION[k].activo} shadow-lg` : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    <I className="w-4 h-4 mx-auto" />
                    <p className="text-[10px] font-black leading-tight mt-1">{l}</p>
                    {n > 0 && (
                      <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${on ? "bg-white text-slate-900" : `${COLOR_SECCION[k].punto} text-white`}`}>
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2 space-y-1.5">
              {d.cargado && listas[seccion].length > 0 && (
                <p className={`text-[10px] font-black uppercase tracking-wider px-1 ${seccion === "noVino" ? "text-rose-600" : seccion === "hoy" ? "text-sky-600" : seccion === "libera" ? "text-violet-600" : "text-orange-600"}`}>
                  {{ ahora: "Ahora · por contactar", noVino: "No vinieron · reprogramar", hoy: "Agenda de hoy", libera: "Se liberan · dar seguimiento" }[seccion]} ({listas[seccion].length})
                </p>
              )}
              {!d.cargado && <p className="text-sm text-slate-500 p-2">Cargando…</p>}
              {d.cargado && !listas[seccion].length && (
                <div className="text-center py-14">
                  <span className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="w-8 h-8" />
                  </span>
                  <p className="text-sm font-black text-slate-800 mt-3">¡Todo al día!</p>
                  <p className="text-xs text-slate-500 mt-1 px-8">
                    {seccion === "ahora" ? "No hay contactos pendientes ahora." : seccion === "noVino" ? "Ningún pase libre vencido sin cerrar." : seccion === "hoy" ? "No hay nada agendado para hoy." : "Ningún interesado tuyo está por liberarse."}
                  </p>
                </div>
              )}
              {listas[seccion].map((p) => (
                <FilaPanel key={`${seccion}-${p.id}`} tipo={seccion} p={p} setActiveTab={setActiveTab} onCerrar={() => setAbierto(false)} />
              ))}
            </div>
            <div className="p-3 border-t border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => (setActiveTab?.("crm"), setAbierto(false))}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:brightness-110 text-white text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/30"
              >
                Abrir el CRM <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
};
