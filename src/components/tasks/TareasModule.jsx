// =====================================================================
// TAREAS ENTRE TURNOS
// Calendario (primera pantalla), lista y reporte de cumplimiento.
// Una tarea va a un turno de recepción, a un área o a una persona; la
// primera persona que pulsa «Tomar» se queda con ella. Se puede pasar al
// siguiente turno con un comentario o reprogramar, y todo queda en el
// historial. Se actualiza sola en todas las pantallas (tiempo real).
// =====================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Plus, CalendarDays, ListChecks, BarChart3, ArrowLeft, ChevronLeft, ChevronRight, History, Search, MessageCircle } from "lucide-react";
import { api } from "../../api/cliente";
import { escucharCambios } from "../../utils/tiempoReal";
import { CabeceraModulo, AccionCabecera } from "../common/CabeceraModulo";
import { TarjetaKpi } from "../common/TarjetaKpi";
import {
  TIPOS_TAREA, tipoDe, AREAS, textoTurno, textoDestino, emojiDestino, fechaCorta, cuandoTexto, sumarDiasISO, enlaceWhatsapp, ESTADOS, estadoVisible, primerNombre, diaSemana, PLANTILLAS,
} from "./tareasComun";

const campo = "w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800";

/** Carga las tareas y se vuelve a cargar sola cuando alguien guarda algo */
export function useTareas(desde, hasta) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [faltanTablas, setFaltanTablas] = useState(false);
  const cargar = useCallback(async () => {
    try {
      const r = await api(`/tareas?desde=${desde}&hasta=${hasta}`);
      setDatos(r);
      setError("");
      setFaltanTablas(false);
    } catch (e) {
      if (e.status === 503) setFaltanTablas(true);
      setError(e.message);
    }
  }, [desde, hasta]);
  useEffect(() => {
    cargar();
    let t = null;
    const fuera = escucharCambios(() => {
      clearTimeout(t);
      t = setTimeout(cargar, 350);
    });
    const cada = setInterval(cargar, 60000); // para que «atrasada» cambie sola con la hora
    return () => {
      fuera();
      clearTimeout(t);
      clearInterval(cada);
    };
  }, [cargar]);
  return { datos, error, faltanTablas, cargar };
}

// ---------------------------------------------------------------------
// Pequeñas piezas
// ---------------------------------------------------------------------
const Chip = ({ tono = "plomo", children, className = "", title }) => (
  <span title={title} className={`rd-kpi-${tono} rd-chip-t inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap ${className}`}>
    {children}
  </span>
);
const Emo = ({ e }) => <span className="rd-emoji">{e}</span>;

/** Ventana a pantalla completa (igual que el resto del sistema): «Volver», título y,
 *  si se pasa «lado», una columna con el detalle a la izquierda y el formulario a la derecha. */
const Modal = ({ titulo, emoji, subtitulo, onCerrar, children, lado, acciones }) => (
  <div className="fixed inset-0 z-[70] bg-slate-100 overflow-y-auto rd-aparece" role="dialog" aria-label={titulo} data-rd-tam="ancha">
    <div className="w-full mx-auto min-h-full p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCerrar} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              {emoji && <Emo e={emoji} />} {titulo}
            </h2>
            {subtitulo && <p className="text-xs sm:text-sm text-slate-500">{subtitulo}</p>}
          </div>
        </div>
        {acciones}
      </div>
      {lado ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
          <aside className="lg:col-span-2 space-y-4 lg:sticky lg:top-4">{lado}</aside>
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">{children}</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">{children}</div>
      )}
    </div>
  </div>
);

/** Detalle completo de una tarea (columna izquierda de las ventanas) con su historial */
const FichaTarea = ({ t, ctx, recargar = 0 }) => {
  const tipo = tipoDe(t.tipo);
  const est = ESTADOS[estadoVisible(t)];
  const persona = t.alumno || t.prospecto;
  const wa = persona ? enlaceWhatsapp(persona.telefono) : null;
  const [hist, setHist] = useState(null);
  useEffect(() => {
    api(`/tareas/${t.id}/historial`).then(setHist).catch(() => setHist([]));
  }, [t.id, recargar]);
  const Dato = ({ e, l, v }) => (
    <div className="flex items-start gap-2 text-sm">
      <Emo e={e} />
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{l}</p>
        <p className="font-bold text-slate-800 break-words">{v}</p>
      </div>
    </div>
  );
  return (
    <>
      <div className={`rd-kpi-${t.atrasada ? "rojo" : tipo.tono} rd-tarea rounded-2xl border p-5 space-y-4`}>
        <div className="flex items-start gap-3">
          <span className="rd-tarea-ico w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0">
            <Emo e={tipo.emoji} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide rd-texto-k">{tipo.label}</p>
            <p className="font-black text-slate-900 text-base leading-snug">{t.titulo}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Chip tono={est.tono}>
                <Emo e={est.emoji} /> {est.label}
              </Chip>
              {t.desdePortal ? <Chip tono="violeta">📲 Desde el portal</Chip> : t.origen === "auto" && <Chip tono="indigo">🤖 Automática</Chip>}
            </div>
          </div>
        </div>
        {t.nota && <p className="text-sm text-slate-600 whitespace-pre-line bg-white/60 rounded-xl p-3 border border-slate-100">{t.nota}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Dato e="🗓️" l="Cuándo" v={`${cuandoTexto(t.fecha, ctx.hoy)} · ${fechaCorta(t.fecha)}${t.hora ? ` · ${t.hora}` : ""}`} />
          <Dato e={emojiDestino(t.destino)} l="Para" v={textoDestino(t.destino, ctx.turnos)} />
          <Dato e="🙋" l="La tiene" v={t.tomadaPor ? t.tomadaPor.nombre : "Nadie todavía"} />
          <Dato e="🆕" l="La creó" v={t.creador ? t.creador.nombre : "El sistema"} />
          {t.fechaOriginal && <Dato e="📅" l="Fecha original" v={`${fechaCorta(t.fechaOriginal)} · reprogramada ${t.reprogramaciones}×`} />}
          {t.pases > 0 && <Dato e="↪️" l="Pasada" v={`${t.pases} ${t.pases === 1 ? "vez" : "veces"}`} />}
        </div>
        {persona && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-800">
              <Emo e={t.alumno ? "🧑‍🎓" : "🙋"} /> {persona.nombre}
              {t.alumno?.codigo ? ` · ${t.alumno.codigo}` : ""}
            </span>
            {persona.telefono && <span className="text-sm text-slate-500">📱 {persona.telefono}</span>}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="rd-kpi-verde rd-chip-t inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 mb-3">🕓 Historial</p>
        {!hist ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : (
          <LineaHistorial filas={hist} />
        )}
      </div>
    </>
  );
};

/** Botones grandes para elegir (en vez de listas desplegables) */
const Opciones = ({ opciones, valor, onElegir, className = "" }) => (
  <div className={`flex flex-wrap gap-2 ${className}`}>
    {opciones.map((o) => {
      const on = valor === o.k;
      return (
        <button
          key={o.k}
          type="button"
          onClick={() => onElegir(o.k)}
          title={o.title}
          className={`rd-kpi-${o.tono || "teal"} rd-opcion-t ${on ? "rd-opcion-on" : ""} px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer text-left`}
        >
          {o.emoji && <Emo e={o.emoji} />}
          <span>
            {o.label}
            {o.sub && <span className="block text-[10px] font-bold opacity-75">{o.sub}</span>}
          </span>
        </button>
      );
    })}
  </div>
);

const Etiqueta = ({ children }) => <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 mb-1.5">{children}</p>;

// ---------------------------------------------------------------------
// Elegir destino: turno / área / persona
// ---------------------------------------------------------------------
const ElegirDestino = ({ ctx, valor, onCambiar, excluir }) => {
  const [modo, setModo] = useState(valor?.tipo || "turno");
  const turnos = ctx.turnos.filter((t) => t.activo);
  const personas = ctx.personas.filter((p) => String(p.id) !== String(ctx.yo.id) || modo !== "usuario");
  return (
    <div className="space-y-2">
      <Opciones
        valor={modo}
        onElegir={(m) => {
          setModo(m);
          onCambiar(null);
        }}
        opciones={[
          { k: "turno", emoji: "🕒", label: "Un turno", tono: "teal" },
          { k: "rol", emoji: "👥", label: "Un área", tono: "violeta" },
          { k: "usuario", emoji: "👤", label: "Una persona", tono: "azul" },
        ]}
      />
      {modo === "turno" &&
        (turnos.length ? (
          <Opciones
            valor={valor?.tipo === "turno" ? valor.turnoId : null}
            onElegir={(k) => onCambiar({ tipo: "turno", turnoId: k })}
            opciones={turnos
              .filter((t) => !(excluir?.tipo === "turno" && excluir.turnoId === t.id))
              .map((t, i) => ({
                k: t.id,
                emoji: t.id === ctx.turnoActualId ? "🟢" : "🕒",
                label: `Turno ${t.corto}`,
                sub: `${t.inicio || "?"}–${t.fin || "?"}${t.personas.length ? ` · ${t.personas.map((p) => primerNombre(p.nombre)).join(", ")}` : " · sin persona asignada"}`,
                tono: ["teal", "ambar", "violeta", "azul", "rosa", "lima"][i % 6],
              }))}
          />
        ) : (
          <p className="text-xs text-slate-500">No hay turnos de recepción activos. Créalos en Usuarios › Turnos de recepción.</p>
        ))}
      {modo === "rol" && (
        <Opciones
          valor={valor?.tipo === "rol" ? valor.rol : null}
          onElegir={(k) => onCambiar({ tipo: "rol", rol: k })}
          opciones={Object.entries(AREAS).map(([k, a]) => ({ k, emoji: a.emoji, label: a.label, tono: "violeta" }))}
        />
      )}
      {modo === "usuario" && (
        <Opciones
          valor={valor?.tipo === "usuario" ? valor.usuarioId : null}
          onElegir={(k) => onCambiar({ tipo: "usuario", usuarioId: k })}
          opciones={personas.map((p) => ({ k: p.id, emoji: AREAS[p.rol]?.emoji || "🛡️", label: p.nombre, sub: AREAS[p.rol]?.corto || "Administración", tono: "azul" }))}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Nueva tarea
// ---------------------------------------------------------------------
const BuscarPersona = ({ valor, onCambiar }) => {
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) return setRes([]);
    const t = setTimeout(() => api(`/tareas/buscar?q=${encodeURIComponent(q.trim())}`).then(setRes).catch(() => setRes([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  if (valor)
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
        <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Emo e={valor.tipo === "alumno" ? "🧑‍🎓" : "🙋"} /> {valor.nombre}
          <span className="text-xs font-semibold text-slate-500">{valor.detalle}</span>
        </span>
        <button type="button" onClick={() => onCambiar(null)} className="text-xs font-black text-rose-600 cursor-pointer">
          Quitar
        </button>
      </div>
    );
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, DNI o código del alumno o interesado (opcional)" className={`${campo} pl-9`} />
      {res.length > 0 && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto">
          {res.map((r) => (
            <button
              key={`${r.tipo}${r.id}`}
              type="button"
              onClick={() => {
                onCambiar(r);
                setQ("");
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
            >
              <Emo e={r.tipo === "alumno" ? "🧑‍🎓" : "🙋"} />
              <span className="text-sm font-bold text-slate-800">{r.nombre}</span>
              <span className="text-xs text-slate-500">{r.detalle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const NuevaTarea = ({ ctx, fechaInicial, onCerrar, onListo }) => {
  const hoy = ctx.hoy;
  // «tarea»: hay que hacer algo · «comentario»: solo dejar dicho (el siguiente turno lo lee)
  const [modo, setModo] = useState("tarea");
  const [prioridad, setPrioridad] = useState("normal");
  const [tipoTarea, setTipoTarea] = useState("llamada");
  const tipo = modo === "comentario" ? "nota" : tipoTarea;
  const setTipo = setTipoTarea;
  const [titulo, setTitulo] = useState("");
  const [destino, setDestino] = useState(null);
  const [sobre, setSobre] = useState(null);
  const [fecha, setFecha] = useState(fechaInicial && fechaInicial >= hoy ? fechaInicial : hoy);
  const [hora, setHora] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const tituloAuto = `${tipoDe(tipo).label}${sobre ? `: ${sobre.nombre}` : ""}`;
  // Por defecto, el comentario va al turno siguiente
  const siguienteTurno = useMemo(() => {
    const act = (ctx.turnos || []).filter((x) => x.activo).sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
    const i = act.findIndex((x) => x.id === (ctx.turnoActualId || ctx.yo?.turnoId));
    return i >= 0 && act.length > 1 ? act[(i + 1) % act.length] : act[0] || null;
  }, [ctx]);
  const cambiarModo = (m) => {
    setModo(m);
    setError("");
    if (m === "comentario" && !destino) setDestino(siguienteTurno ? { tipo: "turno", turnoId: siguienteTurno.id } : { tipo: "rol", rol: "reception" });
  };
  const guardar = async () => {
    setError("");
    if (modo === "comentario" && !(nota.trim() || titulo.trim())) return setError("Escribe el comentario.");
    if (!destino) return setError(modo === "comentario" ? "Elige quién debe enterarse." : "Elige para quién es la tarea.");
    setGuardando(true);
    try {
      await api("/tareas", {
        method: "POST",
        body: {
          tipo,
          prioridad,
          titulo:
            modo === "comentario"
              ? (titulo.trim() || nota.trim()).slice(0, 160)
              : titulo.trim() || tituloAuto,
          nota: modo === "comentario" && !titulo.trim() && nota.trim().length <= 160 ? "" : nota,
          destino,
          fecha: modo === "comentario" ? hoy : fecha,
          hora: modo === "comentario" ? "" : hora,
          alumnoId: sobre?.tipo === "alumno" ? sobre.id : null,
          prospectoId: sobre?.tipo === "prospecto" ? sobre.id : null,
        },
      });
      onListo();
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  };
  return (
    <Modal
      titulo={modo === "comentario" ? "Nuevo comentario" : "Nueva tarea"}
      emoji={modo === "comentario" ? "🗒️" : "📝"}
      subtitulo={modo === "comentario" ? "Deja dicho lo que pasó para que el siguiente turno lo sepa." : "Elige con botones: qué, sobre quién, para quién y cuándo."}
      onCerrar={onCerrar}
      lado={
        <>
          <div className={`rd-kpi-${tipoDe(tipo).tono} rd-tarea rounded-2xl border p-5 space-y-3`}>
            <p className="text-[11px] font-black uppercase tracking-wide rd-texto-k">👀 Así se verá</p>
            <div className="flex items-start gap-3">
              <span className="rd-tarea-ico w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0">
                <Emo e={tipoDe(tipo).emoji} />
              </span>
              <div className="min-w-0 space-y-1.5">
                <p className="font-black text-slate-900 leading-snug">{modo === "comentario" ? titulo.trim() || nota.trim() || "Tu comentario aparecerá aquí" : titulo.trim() || tituloAuto}</p>
                <div className="flex flex-wrap gap-1.5">
                  {prioridad === "urgente" && <Chip tono="rojo">🔥 Urgente</Chip>}
                  {modo === "comentario" && <Chip tono="indigo">🗒️ Solo para que sepan</Chip>}
                  <Chip tono="plomo">🗓️ {cuandoTexto(fecha, hoy)}{hora ? ` · ${hora}` : ""}</Chip>
                  <Chip tono="teal">
                    <Emo e={emojiDestino(destino)} /> {destino ? textoDestino({ ...destino, usuario: ctx.personas.find((p) => p.id === destino.usuarioId)?.nombre }, ctx.turnos) : "Falta elegir para quién"}
                  </Chip>
                </div>
                {sobre && <p className="text-sm font-bold text-slate-600"><Emo e={sobre.tipo === "alumno" ? "🧑‍🎓" : "🙋"} /> {sobre.nombre} · {sobre.detalle}</p>}
                {nota && modo !== "comentario" && <p className="text-sm text-slate-600">{nota}</p>}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-sm text-slate-600 space-y-2">
            <p className="font-black text-slate-800">💡 Cómo funciona</p>
            <p>• La primera persona que pulsa <b>Tomar</b> se queda con la tarea; nadie más la duplica.</p>
            <p>• Si no se termina en el turno, se <b>pasa al siguiente turno</b> con un comentario.</p>
            <p>• Las tareas de <b>renovación</b> y <b>armar rutina</b> se cierran solas cuando se registra la renovación o se guarda la rutina.</p>
            <p>• Un <b>comentario</b> no pide hacer nada: solo deja dicho lo que pasó. Quien lo lee pulsa <b>Entendido</b>.</p>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          ["tarea", "📝", "Asignar una tarea", "Alguien tiene que hacer algo (llamar, cobrar, armar rutina…)"],
          ["comentario", "🗒️", "Solo dejar un comentario", "Para que el siguiente turno sepa lo que pasó; no pide hacer nada"],
        ].map(([k, e, l, d]) => (
          <button key={k} type="button" onClick={() => cambiarModo(k)} className={`rounded-2xl border p-3 text-left cursor-pointer ${modo === k ? "rd-kpi-teal rd-aviso-t ring-2 ring-teal-400" : "bg-white border-slate-200 text-slate-700"}`}>
            <span className="block text-sm font-black"><Emo e={e} /> {l}</span>
            <span className="block text-[11px] opacity-80">{d}</span>
          </button>
        ))}
      </div>

      {modo === "comentario" ? (
        <>
          <div>
            <Etiqueta>1. ¿Qué pasó?</Etiqueta>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PLANTILLAS.nota.map((x) => (
                <button key={x} type="button" onClick={() => setNota(x)} className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold text-left cursor-pointer ${nota === x ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{x}</button>
              ))}
            </div>
            <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} maxLength={500} placeholder="Ej. Vino una señora a pedir los horarios; dijo que regresa a las 6 p. m. con su hija." className={campo} />
          </div>
          <div>
            <Etiqueta>2. ¿Sobre quién? (opcional)</Etiqueta>
            <BuscarPersona valor={sobre} onCambiar={setSobre} />
          </div>
          <div>
            <Etiqueta>3. ¿Quién debe enterarse?</Etiqueta>
            <ElegirDestino ctx={ctx} valor={destino} onCambiar={setDestino} />
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={prioridad === "urgente"} onChange={(e) => setPrioridad(e.target.checked ? "urgente" : "normal")} /> 🔥 Es importante: que lo lean apenas entren
          </label>
        </>
      ) : (
        <>
          <div>
            <Etiqueta>1. ¿Qué hay que hacer?</Etiqueta>
            <Opciones valor={tipo} onElegir={setTipo} opciones={Object.entries(TIPOS_TAREA).filter(([, t]) => !t.soloComentario).map(([k, t]) => ({ k, emoji: t.emoji, label: t.label, tono: t.tono }))} />
            {PLANTILLAS[tipo] && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PLANTILLAS[tipo].map((x) => (
                  <button key={x} type="button" onClick={() => setTitulo(x)} className={`px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer ${titulo === x ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{x}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Etiqueta>2. ¿Sobre quién? (opcional)</Etiqueta>
            <BuscarPersona valor={sobre} onCambiar={setSobre} />
          </div>
          <div>
            <Etiqueta>3. ¿Para quién es?</Etiqueta>
            <ElegirDestino ctx={ctx} valor={destino} onCambiar={setDestino} />
          </div>
          <div>
            <Etiqueta>4. ¿Cuándo?</Etiqueta>
            <div className="flex flex-wrap items-center gap-2">
              <Opciones
                valor={fecha}
                onElegir={setFecha}
                opciones={[
                  { k: hoy, emoji: "📍", label: "Hoy", tono: "teal" },
                  { k: sumarDiasISO(hoy, 1), emoji: "➡️", label: "Mañana", tono: "azul" },
                  { k: sumarDiasISO(hoy, 2), emoji: "📆", label: `${diaSemana(sumarDiasISO(hoy, 2))} ${fechaCorta(sumarDiasISO(hoy, 2))}`, tono: "violeta" },
                ]}
              />
              <input type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" aria-label="Otra fecha" />
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" aria-label="Hora (opcional)" title="Hora (opcional)" />
            </div>
          </div>
          <div>
            <Etiqueta>5. ¿Qué tan urgente?</Etiqueta>
            <Opciones
              valor={prioridad}
              onElegir={setPrioridad}
              opciones={[
                { k: "normal", emoji: "🟢", label: "Normal", tono: "verde" },
                { k: "urgente", emoji: "🔥", label: "Urgente", tono: "rojo" },
              ]}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <Etiqueta>Título</Etiqueta>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={tituloAuto} className={campo} maxLength={160} />
            </label>
            <label className="block">
              <Etiqueta>Detalle (opcional)</Etiqueta>
              <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Pedir que traiga su DNI" className={campo} maxLength={500} />
            </label>
          </div>
        </>
      )}
      {error && <p className="rd-error-t text-sm font-bold">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
          Cancelar
        </button>
        <button type="button" disabled={guardando} onClick={guardar} className="rd-boton-t px-5 py-2 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50">
          {guardando ? "Guardando…" : modo === "comentario" ? "🗒️ Dejar comentario" : "✅ Asignar tarea"}
        </button>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Acciones de una tarea: hecha, pasar, reprogramar, historial
// ---------------------------------------------------------------------
const RESULTADOS = {
  llamada: ["Contestó y quedó en venir", "No contestó", "Pidió que lo llamen otro día"],
  whatsapp: ["Respondió", "Se le escribió, sin respuesta"],
  renovacion: ["Va a renovar", "No renovará", "No contestó"],
  cobro: ["Pagó", "Pagará después", "No contestó"],
  abandono: ["Vuelve esta semana", "Está de viaje / enfermo", "No contestó"],
  _: ["Listo", "Se hizo con observaciones"],
};

const AccionHecha = ({ t, ctx, onCerrar, onListo }) => {
  const [res, setRes] = useState("");
  const [error, setError] = useState("");
  const enviar = async () => {
    try {
      await api(`/tareas/${t.id}/hecha`, { method: "POST", body: { resultado: res } });
      onListo();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Modal titulo="Marcar como hecha" emoji="✅" subtitulo={t.titulo} onCerrar={onCerrar} lado={<FichaTarea t={t} ctx={ctx} />}>
      <Etiqueta>¿Cómo quedó?</Etiqueta>
      <Opciones valor={res} onElegir={setRes} opciones={(RESULTADOS[t.tipo] || RESULTADOS._).map((x) => ({ k: x, label: x, tono: "verde" }))} />
      <textarea value={res} onChange={(e) => setRes(e.target.value)} rows={4} placeholder="O escribe el resultado" className={campo} maxLength={500} />
      {error && <p className="rd-error-t text-sm font-bold">{error}</p>}
      <div className="flex justify-end">
        <button type="button" onClick={enviar} className="rd-boton-t px-5 py-2 rounded-xl text-sm font-black cursor-pointer">
          ✅ Guardar como hecha
        </button>
      </div>
    </Modal>
  );
};

const AccionPasar = ({ t, ctx, onCerrar, onListo }) => {
  // Por defecto: al siguiente turno (el que empieza después del actual)
  const siguiente = useMemo(() => {
    const act = ctx.turnos.filter((x) => x.activo).sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
    const i = act.findIndex((x) => x.id === (t.destino.turnoId || ctx.turnoActualId || ctx.yo.turnoId));
    return i >= 0 && act.length > 1 ? act[(i + 1) % act.length] : null;
  }, [ctx, t]);
  const [destino, setDestino] = useState(siguiente ? { tipo: "turno", turnoId: siguiente.id } : null);
  const [comentario, setComentario] = useState("");
  const [manana, setManana] = useState(false);
  const [error, setError] = useState("");
  const enviar = async () => {
    try {
      await api(`/tareas/${t.id}/pasar`, { method: "POST", body: { destino, comentario, fecha: manana ? sumarDiasISO(ctx.hoy, 1) : undefined } });
      onListo();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Modal titulo="Pasar a otro turno" emoji="↪️" subtitulo={t.titulo} onCerrar={onCerrar} lado={<FichaTarea t={t} ctx={ctx} />}>
      <div>
        <Etiqueta>¿A quién se la pasas?</Etiqueta>
        <ElegirDestino ctx={ctx} valor={destino} onCambiar={setDestino} excluir={t.destino} />
      </div>
      <label className="block">
        <Etiqueta>Comentario (qué se hizo y qué falta)</Etiqueta>
        <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder="Ej. Lo llamé a las 12, no contestó. Volver a llamar después de las 5 pm." className={campo} maxLength={400} />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
        <input type="checkbox" checked={manana} onChange={(e) => setManana(e.target.checked)} className="w-4 h-4" /> Que lo haga mañana
      </label>
      {error && <p className="rd-error-t text-sm font-bold">{error}</p>}
      <div className="flex justify-end">
        <button type="button" disabled={!destino || !comentario.trim()} onClick={enviar} className="rd-boton-t px-5 py-2 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50">
          ↪️ Pasar tarea
        </button>
      </div>
    </Modal>
  );
};

const AccionReprogramar = ({ t, ctx, onCerrar, onListo }) => {
  const hoy = ctx.hoy;
  const [fecha, setFecha] = useState(sumarDiasISO(hoy, 1));
  const [hora, setHora] = useState(t.hora || "");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const enviar = async () => {
    try {
      await api(`/tareas/${t.id}/reprogramar`, { method: "POST", body: { fecha, hora, motivo } });
      onListo();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Modal titulo="Reprogramar" emoji="📅" subtitulo={t.titulo} onCerrar={onCerrar} lado={<FichaTarea t={t} ctx={ctx} />}>
      <Etiqueta>Nueva fecha</Etiqueta>
      <div className="flex flex-wrap items-center gap-2">
        <Opciones
          valor={fecha}
          onElegir={setFecha}
          opciones={[
            { k: hoy, label: "Más tarde hoy", emoji: "🕐", tono: "teal" },
            { k: sumarDiasISO(hoy, 1), label: "Mañana", emoji: "➡️", tono: "azul" },
            { k: sumarDiasISO(hoy, 2), label: "En 2 días", emoji: "📆", tono: "violeta" },
            { k: sumarDiasISO(hoy, 7), label: "En una semana", emoji: "🗓️", tono: "ambar" },
          ]}
        />
        <input type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" />
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm" />
      </div>
      <label className="block">
        <Etiqueta>Motivo</Etiqueta>
        <Opciones valor={motivo} onElegir={setMotivo} className="mb-2" opciones={["No contestó", "Pidió otro día", "No hubo tiempo en el turno", "Falta información"].map((x) => ({ k: x, label: x, tono: "ambar" }))} />
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="O escribe el motivo" className={campo} maxLength={300} />
      </label>
      {error && <p className="rd-error-t text-sm font-bold">{error}</p>}
      <div className="flex justify-end">
        <button type="button" disabled={!motivo.trim()} onClick={enviar} className="rd-boton-t px-5 py-2 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50">
          📅 Reprogramar
        </button>
      </div>
    </Modal>
  );
};

const ACCION_HIST = {
  creada: ["🆕", "Creada"],
  tomada: ["🙋", "La tomó"],
  soltada: ["↩️", "La soltó"],
  hecha: ["✅", "Hecha"],
  cerrada_auto: ["🤖", "Se cerró sola"],
  pasada: ["↪️", "Pasada"],
  reprogramada: ["📅", "Reprogramada"],
  comentario: ["💬", "Comentario"],
  cancelada: ["🚫", "Anulada"],
};
const LineaHistorial = ({ filas }) =>
  filas.length === 0 ? (
    <p className="text-sm text-slate-500">Sin movimientos.</p>
  ) : (
    <ol className="space-y-3 border-l-2 border-slate-200 ml-2 pl-5">
      {filas.map((h, i) => {
        const [e, l] = ACCION_HIST[h.accion] || ["•", h.accion];
        return (
          <li key={i} className="relative">
            <span className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs">
              <Emo e={e} />
            </span>
            <p className="text-sm font-extrabold text-slate-800">
              {l} <span className="font-semibold text-slate-500">· {h.quien}</span>
              <span className="ml-2 text-[11px] font-semibold text-slate-400">{String(h.fecha).slice(0, 16).replace("T", " ")}</span>
            </p>
            {h.detalle && <p className="text-sm text-slate-600">{h.detalle}</p>}
          </li>
        );
      })}
    </ol>
  );

const Historial = ({ t, ctx, onCerrar }) => {
  const [comentario, setComentario] = useState("");
  const [n, setN] = useState(0);
  const comentar = async () => {
    if (!comentario.trim()) return;
    await api(`/tareas/${t.id}/comentar`, { method: "POST", body: { comentario } }).catch(() => {});
    setComentario("");
    setN((x) => x + 1);
  };
  return (
    <Modal titulo="Detalle e historial" emoji="🕓" subtitulo={t.titulo} onCerrar={onCerrar} lado={<FichaTarea t={t} ctx={ctx} recargar={n} />}>
      <div>
        <Etiqueta>💬 Agregar un comentario</Etiqueta>
        <p className="text-sm text-slate-500 mb-2">Queda en el historial para el siguiente turno: qué se hizo, qué respondió el alumno, qué falta.</p>
        <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder="Ej. Dijo que pasa el sábado por la mañana a renovar." className={campo} maxLength={400} />
        <div className="flex justify-end mt-2">
          <button type="button" onClick={comentar} disabled={!comentario.trim()} className="rd-boton-t px-5 py-2 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50">
            Guardar comentario
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------
// Tarjeta de una tarea
// ---------------------------------------------------------------------
export const TarjetaTarea = ({ t, ctx, onAccion, compacta = false }) => {
  const tipo = tipoDe(t.tipo);
  const est = ESTADOS[estadoVisible(t)];
  const abierta = t.estado === "pendiente" || t.estado === "en_curso";
  const mia = t.tomadaPor?.id === ctx.yo.id;
  const tomadaOtro = t.tomadaPor && !mia;
  const persona = t.alumno || t.prospecto;
  const wa = persona ? enlaceWhatsapp(persona.telefono, `Hola ${primerNombre(persona.nombre)}, te escribimos de ${ctx.gimnasio || "RADICAL"}.`) : null;
  const puedeAnular = abierta && (ctx.yo.rol === "admin" || t.creador?.id === ctx.yo.id);
  const [error, setError] = useState("");
  const esNota = t.tipo === "nota";
  const accion = async (ruta, body = {}) => {
    setError("");
    try {
      await api(`/tareas/${t.id}/${ruta}`, { method: "POST", body });
      onAccion?.("recargar");
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className={`rd-kpi-${t.atrasada ? "rojo" : tipo.tono} rd-tarea rd-aparece ${abierta ? "" : "rd-tarea-cerrada"} rounded-2xl border p-3 sm:p-3.5`}>
      <div className="flex items-start gap-3">
        <span className="rd-tarea-ico w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0">
          <Emo e={tipo.emoji} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={`font-extrabold text-slate-900 text-sm sm:text-[15px] leading-snug ${t.estado === "hecha" ? "line-through decoration-2 opacity-70" : ""}`}>{t.titulo}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {t.prioridad === "urgente" && abierta && <Chip tono="rojo">🔥 Urgente</Chip>}
            {esNota ? (
              <Chip tono={abierta ? "indigo" : "verde"}>{abierta ? "🗒️ Comentario" : "👀 Leído"}</Chip>
            ) : (
              <Chip tono={est.tono}>
                <Emo e={est.emoji} /> {est.label}
              </Chip>
            )}
            <Chip tono="plomo">
              🗓️ {cuandoTexto(t.fecha, ctx.hoy)}
              {t.hora ? ` · ${t.hora}` : ""}
            </Chip>
            <Chip tono="teal" title="Para quién es">
              <Emo e={emojiDestino(t.destino)} /> {textoDestino(t.destino, ctx.turnos)}
            </Chip>
            {t.desdePortal ? <Chip tono="violeta">📲 Pedido desde el portal</Chip> : t.origen === "auto" && <Chip tono="indigo">🤖 Automática</Chip>}
            {t.reprogramaciones > 0 && <Chip tono="ambar">📅 Reprogramada {t.reprogramaciones}×</Chip>}
            {t.pases > 0 && <Chip tono="violeta">↪️ Pasada {t.pases}×</Chip>}
          </div>
          {!compacta && t.nota && <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line">{t.nota}</p>}
          {persona && (
            <p className="text-xs font-bold text-slate-600 flex flex-wrap items-center gap-2">
              <span>
                <Emo e={t.alumno ? "🧑‍🎓" : "🙋"} /> {persona.nombre}
                {t.alumno?.codigo ? ` · ${t.alumno.codigo}` : ""}
              </span>
              {persona.telefono && <span className="text-slate-500">📱 {persona.telefono}</span>}
              {wa && abierta && (
                <a href={wa} target="_blank" rel="noreferrer" className="rd-kpi-verde rd-chip-t inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold">
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              )}
            </p>
          )}
          {(t.tomadaPor || t.resultado) && (
            <p className="text-xs text-slate-500">
              {t.tomadaPor && abierta && (
                <>
                  🙋 La tiene <b className="text-slate-700">{mia ? "tú" : t.tomadaPor.nombre}</b>
                </>
              )}
              {t.estado === "hecha" && (
                <>
                  {esNota ? `👀 Leído por ${t.cerradaPor?.nombre || "—"}` : `✅ ${t.cierreAuto ? "Se cerró sola" : `Hecha por ${t.cerradaPor?.nombre || "—"}`}`}
                  {t.aTiempo === false && " · fuera de fecha"}
                </>
              )}
              {t.resultado && <span className="block text-slate-600 font-semibold">«{t.resultado}»</span>}
            </p>
          )}
          {error && <p className="rd-error-t text-xs font-bold">{error}</p>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {esNota && abierta && (
              <button type="button" onClick={() => accion("hecha", { resultado: "Leído" })} className="rd-boton-t px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer">
                👀 Entendido
              </button>
            )}
            {!esNota && abierta && !t.tomadaPor && (
              <button type="button" onClick={() => accion("tomar")} className="rd-boton-t px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer">
                🙋 Tomar
              </button>
            )}
            {!esNota && abierta && !tomadaOtro && (
              <button type="button" onClick={() => onAccion?.("hecha", t)} className="rd-kpi-verde rd-boton-suave px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer">
                ✅ Hecha
              </button>
            )}
            {abierta && (
              <button type="button" onClick={() => onAccion?.("pasar", t)} className="rd-kpi-violeta rd-boton-suave px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer">
                ↪️ Pasar
              </button>
            )}
            {!esNota && abierta && (
              <button type="button" onClick={() => onAccion?.("reprogramar", t)} className="rd-kpi-ambar rd-boton-suave px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer">
                📅 Reprogramar
              </button>
            )}
            {abierta && mia && (
              <button type="button" onClick={() => accion("soltar")} className="rd-kpi-plomo rd-boton-suave px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer" title="Devolverla para que otra persona la tome">
                ↩️ Soltar
              </button>
            )}
            <button type="button" onClick={() => onAccion?.("historial", t)} className="rd-kpi-plomo rd-boton-suave px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer inline-flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Historial
            </button>
            {puedeAnular && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("¿Anular esta tarea?")) accion("anular");
                }}
                className="rd-kpi-rojo rd-boton-suave px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer"
              >
                🚫 Anular
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Ventanas de acción (se usan desde cualquier lista de tareas) */
export const VentanasTarea = ({ abierta, ctx, onCerrar, onListo }) => {
  if (!abierta) return null;
  const { tipo, t } = abierta;
  const p = { t, ctx, onCerrar, onListo };
  if (tipo === "hecha") return <AccionHecha {...p} />;
  if (tipo === "pasar") return <AccionPasar {...p} />;
  if (tipo === "reprogramar") return <AccionReprogramar {...p} />;
  if (tipo === "historial") return <Historial t={t} ctx={ctx} onCerrar={onCerrar} />;
  return null;
};

// ---------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------
const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const Calendario = ({ mes, setMes, tareas, hoy, dia, setDia }) => {
  const [y, m] = mes.split("-").map(Number);
  const primero = new Date(Date.UTC(y, m - 1, 1));
  const offset = (primero.getUTCDay() + 6) % 7; // semana empieza lunes
  const diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasMes; d++) celdas.push(`${mes}-${String(d).padStart(2, "0")}`);
  while (celdas.length % 7) celdas.push(null);
  const porDia = useMemo(() => {
    const o = {};
    for (const t of tareas) {
      const k = t.atrasada ? (t.fecha < hoy ? t.fecha : t.fecha) : t.fecha;
      const x = (o[k] ||= { hechas: 0, pendientes: 0, atrasadas: 0, reprog: 0, total: 0 });
      x.total += 1;
      if (t.estado === "hecha") x.hechas += 1;
      else if (t.estado === "cancelada") continue;
      else if (t.atrasada) x.atrasadas += 1;
      else x.pendientes += 1;
      if (t.reprogramaciones) x.reprog += 1;
    }
    return o;
  }, [tareas, hoy]);
  const mover = (n) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMes(d.toISOString().slice(0, 7));
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => mover(-1)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center cursor-pointer" aria-label="Mes anterior">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-black text-slate-900">
            {NOMBRES_MES[m - 1]} {y}
          </p>
          <button type="button" onClick={() => (setMes(hoy.slice(0, 7)), setDia(hoy))} className="text-[11px] font-black text-slate-500 hover:underline cursor-pointer">
            Ir a hoy
          </button>
        </div>
        <button type="button" onClick={() => mover(1)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center cursor-pointer" aria-label="Mes siguiente">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-[11px] font-black uppercase text-slate-400 mb-1">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((f, i) => {
          if (!f) return <span key={i} />;
          const x = porDia[f];
          const on = f === dia;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setDia(f)}
              className={`rd-cal-dia ${on ? "rd-cal-on" : ""} ${f === hoy ? "rd-cal-hoy" : ""} ${f < hoy ? "rd-cal-pasado" : ""} min-h-[58px] sm:min-h-[74px] rounded-xl border p-1 sm:p-1.5 text-left flex flex-col cursor-pointer`}
            >
              <span className="text-xs sm:text-sm font-black">{Number(f.slice(8))}</span>
              {x && (
                <span className="mt-auto flex flex-wrap gap-0.5">
                  {x.atrasadas > 0 && <span className="rd-kpi-rojo rd-cal-n">{x.atrasadas}</span>}
                  {x.pendientes > 0 && <span className="rd-kpi-ambar rd-cal-n">{x.pendientes}</span>}
                  {x.hechas > 0 && <span className="rd-kpi-verde rd-cal-n">{x.hechas}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-[11px] font-bold text-slate-500">
        <span className="flex items-center gap-1">
          <span className="rd-kpi-ambar rd-cal-n">n</span> Pendientes
        </span>
        <span className="flex items-center gap-1">
          <span className="rd-kpi-rojo rd-cal-n">n</span> Atrasadas
        </span>
        <span className="flex items-center gap-1">
          <span className="rd-kpi-verde rd-cal-n">n</span> Hechas
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// Reporte de cumplimiento
// ---------------------------------------------------------------------
const Barra = ({ pct }) => (
  <span className="rd-barra-t block h-2 rounded-full overflow-hidden" title={pct == null ? "Sin datos" : `${pct} %`}>
    <span className="block h-full rounded-full" style={{ width: `${pct || 0}%` }} />
  </span>
);
const tonoPct = (p) => (p == null ? "plomo" : p >= 85 ? "verde" : p >= 60 ? "ambar" : "rojo");

const Reporte = ({ hoy }) => {
  const [rango, setRango] = useState("7");
  const [r, setR] = useState(null);
  const [error, setError] = useState("");
  const desde = rango === "mes" ? `${hoy.slice(0, 7)}-01` : sumarDiasISO(hoy, -(Number(rango) - 1));
  useEffect(() => {
    const cargar = () => api(`/tareas/reporte?desde=${desde}&hasta=${hoy}`).then(setR).catch((e) => setError(e.message));
    cargar();
    let t = null;
    const fuera = escucharCambios(() => {
      clearTimeout(t);
      t = setTimeout(cargar, 500);
    });
    return () => (fuera(), clearTimeout(t));
  }, [desde, hoy]);
  if (error) return <p className="rd-error-t font-bold text-sm">{error}</p>;
  if (!r) return <p className="text-sm text-slate-500">Cargando reporte…</p>;
  const g = r.general;
  const Tabla = ({ titulo, emoji, filas, nombre }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2">
        <Emo e={emoji} /> {titulo}
      </h3>
      {filas.length === 0 ? (
        <p className="text-sm text-slate-500">Sin tareas en este periodo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase text-slate-400 text-left">
                <th className="py-1.5 pr-3">{nombre}</th>
                <th className="py-1.5 px-2 text-center">Total</th>
                <th className="py-1.5 px-2 text-center">✅ Hechas</th>
                <th className="py-1.5 px-2 text-center">A tiempo</th>
                <th className="py-1.5 px-2 text-center">⏳ Pend.</th>
                <th className="py-1.5 px-2 text-center">⏰ Atras.</th>
                <th className="py-1.5 px-2 text-center">📅 Reprog.</th>
                <th className="py-1.5 pl-2 w-36">Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.k} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-bold text-slate-800">{f.nombre}</td>
                  <td className="py-2 px-2 text-center font-bold">{f.total}</td>
                  <td className="py-2 px-2 text-center">{f.hechas}</td>
                  <td className="py-2 px-2 text-center">{f.aTiempo}</td>
                  <td className="py-2 px-2 text-center">{f.pendientes}</td>
                  <td className="py-2 px-2 text-center">{f.atrasadas ? <Chip tono="rojo">{f.atrasadas}</Chip> : 0}</td>
                  <td className="py-2 px-2 text-center">{f.reprogramadas}</td>
                  <td className={`py-2 pl-2 rd-kpi-${tonoPct(f.cumplimiento)}`}>
                    <span className="flex items-center gap-2">
                      <Barra pct={f.cumplimiento} />
                      <b className="rd-texto-k text-xs w-9 text-right">{f.cumplimiento == null ? "—" : `${f.cumplimiento}%`}</b>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  return (
    <div className="space-y-4">
      <Opciones
        valor={rango}
        onElegir={setRango}
        opciones={[
          { k: "1", label: "Hoy", emoji: "📍", tono: "teal" },
          { k: "7", label: "Últimos 7 días", emoji: "🗓️", tono: "azul" },
          { k: "30", label: "Últimos 30 días", emoji: "📆", tono: "violeta" },
          { k: "mes", label: "Este mes", emoji: "🗂️", tono: "ambar" },
        ]}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TarjetaKpi titulo="Tareas del periodo" valor={g.total} sub={`${g.auto} se cerraron solas`} emoji="📋" tono="teal" />
        <TarjetaKpi titulo="Hechas" valor={g.hechas} sub={`${g.aTiempo} a tiempo · ${g.tarde} tarde`} emoji="✅" tono="verde" />
        <TarjetaKpi titulo="Atrasadas" valor={g.atrasadas} sub={`${g.pendientes} pendientes en fecha`} emoji="⏰" tono="rojo" alerta={g.atrasadas > 0} />
        <TarjetaKpi titulo="Cumplimiento" valor={g.cumplimiento ?? 0} texto={g.cumplimiento == null ? "—" : undefined} sufijo={g.cumplimiento == null ? "" : "%"} sub={`${g.reprogramadas} reprogramadas · ${g.pasadas} pasadas`} emoji="🎯" tono={tonoPct(g.cumplimiento)} progreso={g.cumplimiento} />
      </div>
      {r.anuncio && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TarjetaKpi titulo="Pidieron renovar en el portal" valor={r.anuncio.solicitudes} sub="eligieron un plan en el anuncio" emoji="📲" tono="violeta" />
          <TarjetaKpi titulo="Renovaron desde el anuncio" valor={r.anuncio.renovaron} sub={r.anuncio.solicitudes ? `${Math.round((r.anuncio.renovaron / r.anuncio.solicitudes) * 100)} % de los pedidos` : "aún sin pedidos"} emoji="🔁" tono="verde" progreso={r.anuncio.solicitudes ? (r.anuncio.renovaron / r.anuncio.solicitudes) * 100 : null} />
          <TarjetaKpi titulo="Pedidos por atender" valor={r.anuncio.pendientes} sub="esperan respuesta de recepción" emoji="⏳" tono="ambar" alerta={r.anuncio.pendientes > 0} />
        </div>
      )}
      <Tabla titulo="Por turno de recepción" emoji="🕒" nombre="Turno" filas={r.porTurno.map((t) => ({ ...t, k: t.turnoId, nombre: textoTurno({ corto: t.nombre, personas: t.personas }) }))} />
      <Tabla titulo="Por área" emoji="👥" nombre="Área" filas={r.porRol.map((t) => ({ ...t, k: t.rol, nombre: AREAS[t.rol]?.corto || "Administración" }))} />
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2">
          <Emo e="🙋" /> Por persona
        </h3>
        {r.porPersona.length === 0 ? (
          <p className="text-sm text-slate-500">Nadie ha tomado tareas en este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase text-slate-400 text-left">
                  <th className="py-1.5 pr-3">Persona</th>
                  <th className="py-1.5 px-2 text-center">Tomadas</th>
                  <th className="py-1.5 px-2 text-center">✅ Hechas</th>
                  <th className="py-1.5 px-2 text-center">A tiempo</th>
                  <th className="py-1.5 px-2 text-center">⏰ Atras.</th>
                  <th className="py-1.5 px-2 text-center">↪️ Pasó</th>
                  <th className="py-1.5 px-2 text-center">📅 Reprog.</th>
                  <th className="py-1.5 px-2 text-center">🆕 Creó</th>
                </tr>
              </thead>
              <tbody>
                {r.porPersona.map((p) => (
                  <tr key={p.usuarioId} className="border-t border-slate-100">
                    <td className="py-2 pr-3">
                      <b className="text-slate-800">{p.nombre}</b>
                      <span className="block text-[11px] text-slate-500">{p.turno ? `Turno ${p.turno}` : AREAS[p.rol]?.corto || "Administración"}</span>
                    </td>
                    <td className="py-2 px-2 text-center">{p.tomadas}</td>
                    <td className="py-2 px-2 text-center font-bold">{p.hechas}</td>
                    <td className="py-2 px-2 text-center">{p.aTiempo}</td>
                    <td className="py-2 px-2 text-center">{p.atrasadas ? <Chip tono="rojo">{p.atrasadas}</Chip> : 0}</td>
                    <td className="py-2 px-2 text-center">{p.pasadas}</td>
                    <td className="py-2 px-2 text-center">{p.reprogramadas}</td>
                    <td className="py-2 px-2 text-center">{p.creadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Tabla titulo="Por tipo de tarea" emoji="🏷️" nombre="Tipo" filas={r.porTipo.map((t) => ({ ...t, k: t.tipo, nombre: `${tipoDe(t.tipo).emoji} ${tipoDe(t.tipo).label}` }))} />
    </div>
  );
};

// ---------------------------------------------------------------------
// Módulo
// ---------------------------------------------------------------------
const FILTROS = [
  { k: "abiertas", label: "Por hacer", emoji: "⏳", tono: "ambar" },
  { k: "atrasadas", label: "Atrasadas", emoji: "⏰", tono: "rojo" },
  { k: "mias", label: "Tomadas por mí", emoji: "🙋", tono: "azul" },
  { k: "comentarios", label: "Comentarios", emoji: "🗒️", tono: "indigo" },
  { k: "hechas", label: "Hechas", emoji: "✅", tono: "verde" },
  { k: "todas", label: "Todas", emoji: "📋", tono: "plomo" },
];

const TareasModule = () => {
  const hoyLocal = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const [vista, setVista] = useState("calendario");
  const [mes, setMes] = useState(hoyLocal.slice(0, 7));
  const [dia, setDia] = useState(hoyLocal);
  const [filtro, setFiltro] = useState("abiertas");
  const [tipoF, setTipoF] = useState("");
  const [buscar, setBuscar] = useState("");
  const [nueva, setNueva] = useState(false);
  const [ventana, setVentana] = useState(null);
  const desde = `${mes}-01`;
  const hasta = sumarDiasISO(`${mes}-01`, 41);
  const { datos, error, faltanTablas, cargar } = useTareas(sumarDiasISO(desde, -7), hasta);
  const ctx = datos;
  const hoy = datos?.hoy || hoyLocal;
  const tareas = datos?.tareas || [];

  const kpi = useMemo(() => {
    const abiertas = tareas.filter((t) => t.estado === "pendiente" || t.estado === "en_curso");
    return {
      hoy: abiertas.filter((t) => t.fecha === hoy && !t.atrasada).length,
      atrasadas: abiertas.filter((t) => t.atrasada).length,
      enCurso: abiertas.filter((t) => t.estado === "en_curso").length,
      hechasHoy: tareas.filter((t) => t.estado === "hecha" && String(t.cerradaEn || "").slice(0, 10) === hoy).length,
      mias: abiertas.filter((t) => t.tomadaPor?.id === datos?.yo.id).length,
    };
  }, [tareas, hoy, datos]);

  const filtrar = (lista) =>
    lista.filter((t) => {
      const abierta = t.estado === "pendiente" || t.estado === "en_curso";
      if (filtro === "abiertas" && !abierta) return false;
      if (filtro === "atrasadas" && !t.atrasada) return false;
      if (filtro === "mias" && !(abierta && t.tomadaPor?.id === datos?.yo.id)) return false;
      if (filtro === "hechas" && t.estado !== "hecha") return false;
      if (filtro === "comentarios" && t.tipo !== "nota") return false;
      if (tipoF && t.tipo !== tipoF) return false;
      if (buscar.trim()) {
        const q = buscar.trim().toLowerCase();
        const txt = `${t.titulo} ${t.nota} ${t.alumno?.nombre || ""} ${t.prospecto?.nombre || ""} ${t.alumno?.codigo || ""}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });

  const onAccion = (tipo, t) => (tipo === "recargar" ? cargar() : setVentana({ tipo, t }));
  const listo = () => {
    setVentana(null);
    setNueva(false);
    cargar();
  };

  // Tareas del día elegido en el calendario (las atrasadas se ven en «hoy»)
  const delDia = tareas
    .filter((t) => t.fecha === dia || (dia === hoy && t.atrasada && t.fecha < hoy))
    .sort((a, b) => Number(b.prioridad === "urgente") - Number(a.prioridad === "urgente") || Number(b.atrasada) - Number(a.atrasada) || String(a.hora || "99").localeCompare(String(b.hora || "99")));

  const lista = filtrar(tareas).sort((a, b) => Number(b.prioridad === "urgente" && b.estado !== "hecha") - Number(a.prioridad === "urgente" && a.estado !== "hecha") || Number(b.atrasada) - Number(a.atrasada) || a.fecha.localeCompare(b.fecha) || String(a.hora || "99").localeCompare(String(b.hora || "99")));
  const grupos = [
    ["⏰ Atrasadas", lista.filter((t) => t.atrasada)],
    ["📍 Hoy", lista.filter((t) => !t.atrasada && t.fecha === hoy)],
    ["➡️ Próximos días", lista.filter((t) => !t.atrasada && t.fecha > hoy)],
    ["🗂️ Días anteriores", lista.filter((t) => !t.atrasada && t.fecha < hoy)],
  ].filter(([, l]) => l.length);

  const miTurno = ctx?.yo.turnoId ? ctx.turnos.find((t) => t.id === ctx.yo.turnoId) : null;
  const turnoAhora = ctx?.turnoActualId ? ctx.turnos.find((t) => t.id === ctx.turnoActualId) : null;

  return (
    <div className="space-y-5">
      <CabeceraModulo
        icono={ClipboardList}
        etiqueta="Operativo"
        titulo="Asignación de tareas"
        descripcion="Lo que hay que hacer hoy, quién lo tomó y qué pasa al siguiente turno. Se actualiza solo en todas las pantallas."
        accion={ctx && <AccionCabecera icono={Plus} onClick={() => setNueva(true)}>Nueva tarea</AccionCabecera>}
        activa={vista}
        onCambiar={setVista}
        pestanas={[
          { k: "calendario", icono: CalendarDays, label: "Calendario", tono: "teal" },
          { k: "lista", icono: ListChecks, label: "Lista", tono: "violet" },
          { k: "reporte", icono: BarChart3, label: "Reporte de cumplimiento", tono: "amber" },
        ]}
      />

      {faltanTablas ? (
        <div className="rd-kpi-ambar rd-aviso-t rounded-2xl border p-5">
          <p className="font-black">🛠️ Falta un paso en la base de datos</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : !ctx ? (
        <p className="text-sm text-slate-500">{error || "Cargando tareas…"}</p>
      ) : (
        <>
          {(miTurno || turnoAhora) && (
            <div className="flex flex-wrap gap-2">
              {miTurno && (
                <Chip tono="teal" className="!text-xs !px-3 !py-1">
                  🧑‍💼 Tu turno: {textoTurno(miTurno)} ({miTurno.inicio}–{miTurno.fin})
                </Chip>
              )}
              {turnoAhora && (
                <Chip tono="verde" className="!text-xs !px-3 !py-1">
                  🟢 Ahora atiende: {textoTurno(turnoAhora)}
                </Chip>
              )}
            </div>
          )}

          {vista !== "reporte" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <TarjetaKpi titulo="Para hoy" valor={kpi.hoy} sub="pendientes en fecha" emoji="📍" tono="teal" onClick={() => (setVista("lista"), setFiltro("abiertas"))} />
              <TarjetaKpi titulo="Atrasadas" valor={kpi.atrasadas} sub="pasó su fecha u hora" emoji="⏰" tono="rojo" alerta={kpi.atrasadas > 0} onClick={() => (setVista("lista"), setFiltro("atrasadas"))} />
              <TarjetaKpi titulo="Tomadas por mí" valor={kpi.mias} sub={`${kpi.enCurso} en curso en total`} emoji="🙋" tono="azul" onClick={() => (setVista("lista"), setFiltro("mias"))} />
              <TarjetaKpi titulo="Hechas hoy" valor={kpi.hechasHoy} sub="cerradas hoy" emoji="✅" tono="verde" onClick={() => (setVista("lista"), setFiltro("hechas"))} />
            </div>
          )}

          {vista === "calendario" && (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
              <div className="xl:col-span-3">
                <Calendario mes={mes} setMes={setMes} tareas={tareas} hoy={hoy} dia={dia} setDia={setDia} />
              </div>
              <div className="xl:col-span-2 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-slate-900">
                    {cuandoTexto(dia, hoy)} · {fechaCorta(dia)}
                    <span className="ml-2 text-xs font-bold text-slate-500">{delDia.length} tarea(s)</span>
                  </h3>
                  {dia >= hoy && (
                    <button type="button" onClick={() => setNueva(dia)} className="rd-boton-t px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer">
                      + Tarea este día
                    </button>
                  )}
                </div>
                {delDia.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    <Emo e="🎉" /> No hay tareas para este día.
                  </div>
                ) : (
                  delDia.map((t) => <TarjetaTarea key={t.id} t={t} ctx={ctx} onAccion={onAccion} />)
                )}
              </div>
            </div>
          )}

          {vista === "lista" && (
            <div className="space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                <Opciones valor={filtro} onElegir={setFiltro} opciones={FILTROS} />
                <div className="relative lg:ml-auto lg:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar tarea o alumno" className={`${campo} pl-9`} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setTipoF("")} className={`rd-kpi-plomo rd-opcion-t ${!tipoF ? "rd-opcion-on" : ""} px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer`}>
                  Todos los tipos
                </button>
                {Object.entries(TIPOS_TAREA)
                  .filter(([k]) => tareas.some((t) => t.tipo === k))
                  .map(([k, t]) => (
                    <button key={k} type="button" onClick={() => setTipoF(k === tipoF ? "" : k)} className={`rd-kpi-${t.tono} rd-opcion-t ${tipoF === k ? "rd-opcion-on" : ""} px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer`}>
                      <Emo e={t.emoji} /> {t.label}
                    </button>
                  ))}
              </div>
              {grupos.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  <Emo e="🎉" /> No hay tareas con este filtro.
                </div>
              ) : (
                grupos.map(([titulo, l]) => (
                  <section key={titulo} className="space-y-2">
                    <h3 className="font-black text-slate-700 text-sm">
                      {titulo} <span className="text-slate-400">({l.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-2.5">
                      {l.map((t) => (
                        <TarjetaTarea key={t.id} t={t} ctx={ctx} onAccion={onAccion} />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          )}

          {vista === "reporte" && <Reporte hoy={hoy} />}

          {nueva && <NuevaTarea ctx={ctx} fechaInicial={typeof nueva === "string" ? nueva : null} onCerrar={() => setNueva(false)} onListo={listo} />}
          <VentanasTarea abierta={ventana} ctx={ctx} onCerrar={() => setVentana(null)} onListo={listo} />
        </>
      )}
    </div>
  );
};

export default TareasModule;
