// =====================================================================
// Portal del alumno · Clases grupales
//  - Horario de la semana con el disco que dictará cada profesor.
//  - Reservar su step: se abre X minutos antes (lo define administración)
//    y se cierra al empezar la clase. Gana quien reservó primero: si dos
//    tocan el mismo step a la vez, al segundo le sale «Lugar ocupado»,
//    la pantalla se actualiza sola y ve el nombre de quien lo tomó.
// =====================================================================
import React, { useEffect, useRef, useState } from "react";
import { Music, LayoutGrid, X, RefreshCw } from "lucide-react";
import { api } from "../../api/cliente";
import { hoyISO } from "../../utils/fecha";
import { DIAS, diaDe, fechaBonita, sumarDias, estadoVentana, ahoraLima, useCroquis, useSesiones } from "./clasesComun";
import { Croquis, LeyendaCroquis } from "./Croquis";

const textoVentana = (v) =>
  v.estado === "abierta" ? "🟢 Reserva abierta" : v.estado === "pronto" ? `⏰ Reserva desde las ${v.abre}` : v.estado === "en_curso" ? "🏃 En clase" : "Terminó";

/** Croquis para reservar (se actualiza solo cada pocos segundos) */
const Reservar = ({ s, croquis, onCerrar, onCambio }) => {
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const vivo = useRef(true);
  const cargar = () =>
    api(`/clases/reservas?clase=${s.claseId}&fecha=${s.fecha}`)
      .then((d) => vivo.current && setInfo(d))
      .catch((e) => vivo.current && setMsg({ ok: false, texto: e.message }));
  useEffect(() => {
    vivo.current = true;
    cargar();
    const t = setInterval(cargar, 4000);
    return () => ((vivo.current = false), clearInterval(t));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const activas = (info?.reservas || []).filter((r) => r.estado === "reservado" || r.estado === "asistio");
  const mia = activas.find((r) => r.mia);
  const abierta = info?.ventana?.estado === "abierta";
  const tocar = async (z, r) => {
    if (r && !r.mia) return setMsg({ ok: false, texto: `Lugar ocupado: el step ${z.numero} ya es de ${r.alumno || "otra persona"}. Elige otro.` });
    if (r?.mia) return;
    if (!abierta) return setMsg({ ok: false, texto: info?.ventana?.estado === "pronto" ? `La reserva se abre a las ${info.ventana.abre}.` : "La reserva ya cerró." });
    setEnviando(true);
    try {
      const x = await api("/clases/reservas", { method: "POST", body: { clase: s.claseId, fecha: s.fecha, step: z.id } });
      setMsg({ ok: true, texto: `✅ ¡Listo! Reservaste el step ${x.numero}. Te esperamos a las ${s.inicio}.` });
      onCambio?.();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    } finally {
      setEnviando(false);
      cargar();
    }
  };
  const anular = async () => {
    try {
      await api(`/clases/reservas/${mia.id}/estado`, { method: "POST", body: { estado: "cancelado" } });
      setMsg({ ok: true, texto: "Anulaste tu reserva. El step quedó libre." });
      onCambio?.();
      cargar();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    }
  };
  return (
    <div className="fixed inset-0 z-[80] bg-slate-100 overflow-y-auto" data-rd-tam="ancha">
      <div className="w-full max-w-2xl mx-auto min-h-full bg-white p-4 sm:p-6 space-y-3 text-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-black flex items-center gap-2 min-w-0">
            <LayoutGrid className="w-5 h-5 text-teal-600 shrink-0" /> <span className="truncate">{s.emoji} {s.nombre} · {s.inicio}</span>
          </h3>
          <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>
        <div className={`rd-kpi-${s.color} rd-clase-card rounded-2xl p-3 text-sm`}>
          <p className="font-black">🧑‍🏫 {s.profesor}{s.disco ? ` · 🎵 Disco «${s.disco}»` : ""}</p>
          <p className="text-xs">{info ? textoVentana(info.ventana) : "Cargando…"}{info?.ventana?.estado === "abierta" ? ` hasta las ${info.ventana.cierra}` : ""}</p>
        </div>
        {msg && <p className={`text-sm font-bold rounded-xl border p-3 ${msg.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.texto}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <LeyendaCroquis conMio />
          <span className="text-[11px] text-slate-500 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Se actualiza solo</span>
        </div>
        {croquis && <Croquis croquis={croquis} reservas={activas} nombres onStep={tocar} deshabilitado={enviando} />}
        <p className="text-xs text-slate-500">Toca un step libre para reservarlo. Si dos personas tocan el mismo a la vez, se queda quien lo hizo primero.</p>
        {mia && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-black">Tu step: {mia.numero} {mia.estado === "asistio" ? "· ✓ ya llegaste" : ""}</p>
            {mia.estado === "reservado" && (
              <button type="button" onClick={anular} className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer">Anular reserva</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function MisClases() {
  const hoy = hoyISO();
  const { croquis } = useCroquis();
  const { sesiones, error, cargar } = useSesiones(hoy, sumarDias(hoy, 6));
  const [reservar, setReservar] = useState(null);
  const [, setTic] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTic((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const minutos = croquis?.minutosReserva || 30;
  const hora = ahoraLima();
  // Las clases de hoy que ya terminaron no se muestran
  const visibles = (sesiones || []).filter((s) => s.fecha !== hoy || estadoVentana(s, minutos, hoy, hora).estado !== "pasada");
  const dias = [...new Set(visibles.map((s) => s.fecha))];
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Music className="w-5 h-5 text-teal-600" /> Clases grupales</h3>
        <p className="text-sm text-slate-500">
          El horario de la semana y el disco que dictará cada profesor. Puedes reservar tu step desde {minutos} minutos antes de la clase hasta que empiece. Te avisamos 2 horas antes. 🔔
        </p>
      </div>
      {error && <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
      {!sesiones && !error && <p className="text-sm text-slate-500">Cargando clases…</p>}
      {sesiones && !sesiones.length && (
        <div className="rd-kpi-plomo rd-aviso-t rounded-2xl border p-5 text-center">
          <p className="text-3xl">🗓️</p>
          <p className="font-black">Aún no hay clases grupales en el horario</p>
        </div>
      )}
      {dias.map((f) => (
        <div key={f} className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">{f === hoy ? "Hoy" : DIAS[diaDe(f)]} · {fechaBonita(f)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {visibles
              .filter((s) => s.fecha === f)
              .map((s) => {
                const v = estadoVentana(s, minutos, hoy, hora);
                return (
                  <div key={s.id} className={`rd-kpi-${s.color} rd-clase-card rounded-2xl p-3 space-y-1`}>
                    <p className="text-xs font-black">{s.inicio} – {s.fin}</p>
                    <p className="text-base font-black">{s.emoji} {s.nombre}</p>
                    <p className="text-xs">🧑‍🏫 {s.profesor}{s.sala ? ` · 📍 ${s.sala}` : ""}</p>
                    <p className="text-sm">{s.disco ? <b>🎵 Disco «{s.disco}»</b> : <span className="opacity-75">🎵 Disco por anunciar</span>}</p>
                    {s.nota && <p className="text-xs">📝 {s.nota}</p>}
                    {f === hoy && (
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setReservar(s)} className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${v.estado === "abierta" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>
                          {v.estado === "abierta" ? "🎫 Reservar mi step" : "👀 Ver steps"}
                        </button>
                        <span className="text-[11px] font-bold">{v.estado === "pronto" ? `Reserva desde las ${v.abre}` : v.estado === "en_curso" ? "En clase" : ""}</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      {reservar && <Reservar s={reservar} croquis={croquis} onCerrar={() => (setReservar(null), cargar())} onCambio={cargar} />}
    </div>
  );
}
