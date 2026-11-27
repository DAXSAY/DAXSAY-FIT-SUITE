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
import { DIAS, diaDe, fechaBonita, sumarDias, estadoVentana, ahoraLima, useCroquis, useSesiones, nombreSede } from "./clasesComun";
import { Croquis, LeyendaCroquis } from "./Croquis";
import { VentanaStep } from "./StepsMaster";

const textoVentana = (v) =>
  v.estado === "abierta" ? "🟢 Reserva abierta" : v.estado === "pronto" ? `⏰ Reserva desde las ${v.abre}` : v.estado === "en_curso" ? "🏃 En clase" : "Terminó";

/** Croquis para reservar (se actualiza solo cada pocos segundos) */
const Reservar = ({ s, onCerrar, onCambio }) => {
  const { croquis } = useCroquis(s.sedeId);
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

/** Calificar las clases y másters a los que fue (tiene 7 días) */
const CalificarClases = () => {
  const [datos, setDatos] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [f, setF] = useState({ estrellas: 0, etiquetas: [], comentario: "" });
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cargar = () => api("/calificaciones/pendientes").then(setDatos).catch(() => setDatos({ pendientes: [], etiquetas: [] }));
  useEffect(() => {
    cargar();
  }, []);
  if (!datos || (!datos.pendientes.length && !msg)) return null;
  const abrir = (p, n) => (setAbierta(p.clave), setF({ estrellas: n, etiquetas: [], comentario: "" }), setMsg(null));
  const enviar = async (p) => {
    setEnviando(true);
    try {
      await api("/calificaciones", { method: "POST", body: { clave: p.clave, ...f } });
      setMsg({ ok: true, texto: `🙌 ¡Gracias! Calificaste ${p.titulo} con ${f.estrellas} estrella${f.estrellas === 1 ? "" : "s"}.` });
      setAbierta(null);
      cargar();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    } finally {
      setEnviando(false);
    }
  };
  const CARAS = ["", "😞 Mala", "😕 Regular", "🙂 Buena", "😃 Muy buena", "🤩 ¡Excelente!"];
  return (
    <div className="space-y-2">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">⭐ Califica tus clases</p>
      {msg && <p className={`text-sm font-bold rounded-xl border p-3 ${msg.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.texto}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {datos.pendientes.map((p) => {
          const on = abierta === p.clave;
          return (
            <div key={p.clave} className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{p.emoji} {p.titulo}</p>
                  <p className="text-xs text-slate-500">{DIAS[diaDe(p.fecha)]} {fechaBonita(p.fecha).split(" ").slice(1).join(" ")} · {p.inicio} · 🧑‍🏫 {p.profesor}{p.disco ? ` · 🎵 ${p.disco}` : ""}</p>
                </div>
                <div className="flex" role="radiogroup" aria-label="Estrellas">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => abrir(p, n)} aria-label={`${n} estrellas`} className={`text-2xl leading-none px-0.5 cursor-pointer transition-transform hover:scale-110 ${on && n <= f.estrellas ? "text-amber-500" : "text-slate-300 hover:text-amber-300"}`}>★</button>
                  ))}
                </div>
              </div>
              {on && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <p className="text-sm font-black text-amber-700">{CARAS[f.estrellas]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {datos.etiquetas.map((e) => {
                      const sel = f.etiquetas.includes(e);
                      return (
                        <button key={e} type="button" onClick={() => setF((x) => ({ ...x, etiquetas: sel ? x.etiquetas.filter((y) => y !== e) : [...x.etiquetas, e] }))} className={`px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer ${sel ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{e}</button>
                      );
                    })}
                  </div>
                  <textarea value={f.comentario} onChange={(e) => setF((x) => ({ ...x, comentario: e.target.value }))} maxLength={300} rows={2} placeholder="Cuéntanos algo más (opcional)…" className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800" />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setAbierta(null)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
                    <button type="button" disabled={enviando} onClick={() => enviar(p)} className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-black cursor-pointer">Enviar calificación</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500">Tu opinión ayuda a mejorar las clases. Tienes 7 días después de cada clase para calificarla.</p>
    </div>
  );
};

/** Másters del fin de semana: precio según si es socio, inscribirse desde la app */
const MastersAlumno = () => {
  const [lista, setLista] = useState(null);
  const [msg, setMsg] = useState(null);
  const [elegir, setElegir] = useState(null);
  const cargar = () =>
    api("/masters")
      .then((d) => setLista(d.masters))
      .catch(() => setLista([]));
  useEffect(() => {
    cargar();
  }, []);
  if (!lista || !lista.length) return null;
  const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
  const accion = async (m, tipo) => {
    try {
      if (tipo === "inscribir") return setElegir(m);
      {
        await api(`/masters/inscripciones/${m.miInscripcion.id}`, { method: "POST", body: { accion: "anular" } });
        setMsg({ ok: true, texto: "Anulaste tu inscripción." });
      }
      cargar();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">🌟 Másters del fin de semana</p>
      {msg && <p className={`text-sm font-bold rounded-xl border p-3 ${msg.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.texto}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {lista.map((m) => (
          <div key={m.id} className={`rd-kpi-${m.color} rd-clase-card rounded-2xl p-3 space-y-1`}>
            <p className="text-xs font-black">{DIAS[diaDe(m.fecha)]} {fechaBonita(m.fecha).split(" ").slice(1).join(" ")} · {m.inicio} – {m.fin}</p>
            <p className="text-base font-black">{m.emoji} {m.titulo}</p>
            <p className="text-xs">🧑‍🏫 {m.profesor}{m.sala ? ` · 📍 ${m.sala}` : ""}</p>
            {m.descripcion && <p className="text-xs">📝 {m.descripcion}</p>}
            <p className="text-sm">
              💰 <b>{soles(m.miPrecio)}</b>
              {m.soySocio ? <span className="text-xs"> · precio socio (externos {soles(m.precioPublico)})</span> : <span className="text-xs"> · con membresía vigente pagas {soles(m.precioSocio)}</span>}
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              {m.miInscripcion ? (
                <>
                  <span className="text-xs font-black">{m.miInscripcion.pagado ? "✅ Inscrito y pagado" : `📝 Inscrito · paga ${soles(m.miInscripcion.precio)} en recepción`}{m.miInscripcion.step ? ` · 🧱 Step ${m.miInscripcion.step}` : ""}</span>
                  <button type="button" onClick={() => setElegir(m)} className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-bold cursor-pointer">🧱 {m.miInscripcion.step ? "Cambiar step" : "Elegir step"}</button>
                  {!m.miInscripcion.pagado && <button type="button" onClick={() => accion(m, "anular")} className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-bold cursor-pointer">Anular</button>}
                </>
              ) : m.estado !== "abierto" ? (
                <span className="text-xs font-bold">🔒 Inscripciones cerradas</span>
              ) : m.lleno ? (
                <span className="text-xs font-bold">Cupo lleno</span>
              ) : (
                <button type="button" onClick={() => accion(m, "inscribir")} className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-black cursor-pointer">🌟 Elegir step e inscribirme</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {elegir && (
        <VentanaStep
          master={elegir}
          conMio
          titulo={elegir.miInscripcion ? "Cambiar mi step" : "Elige tu step"}
          miStepId={elegir.miInscripcion?.stepId}
          boton={elegir.miInscripcion ? "Cambiarme al" : "Inscribirme en el"}
          sinStep={elegir.miInscripcion ? "" : "🌟 Inscribirme sin step"}
          onCerrar={() => (setElegir(null), cargar())}
          onGuardar={async (step) => {
            if (elegir.miInscripcion) {
              const r = await api(`/masters/inscripciones/${elegir.miInscripcion.id}`, { method: "POST", body: { accion: "step", step } });
              setMsg({ ok: true, texto: `✅ Te cambiaste al step ${r.step}.` });
            } else {
              const r = await api(`/masters/${elegir.id}/inscribir`, { method: "POST", body: { step } });
              setMsg({ ok: true, texto: `✅ ¡Te inscribiste en ${elegir.titulo}${r.step ? ` en el step ${r.step}` : ""}! Paga ${soles(r.precio)} en recepción antes del máster para asegurar tu lugar.` });
            }
            setElegir(null);
            cargar();
          }}
        />
      )}
    </div>
  );
};

export default function MisClases() {
  const hoy = hoyISO();
  const { croquis } = useCroquis();
  const { sesiones, error, cargar } = useSesiones(hoy, sumarDias(hoy, 6));
  const [reservar, setReservar] = useState(null);
  const [sedes, setSedes] = useState([]);
  const [sede, setSede] = useState(() => {
    try {
      return Number(localStorage.getItem("rd_sede_clases")) || null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    api("/clases/sedes").then((d) => setSedes(d.sedes || [])).catch(() => {});
  }, []);
  const elegirSede = (id) => {
    setSede(id);
    try {
      id ? localStorage.setItem("rd_sede_clases", String(id)) : localStorage.removeItem("rd_sede_clases");
    } catch {
      /* sin almacenamiento */
    }
  };
  const [, setTic] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTic((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const minutos = croquis?.minutosReserva || 30;
  const hora = ahoraLima();
  // Las clases de hoy que ya terminaron no se muestran
  const sedeOk = sedes.length > 1 && sedes.some((x) => x.id === sede) ? sede : null;
  const visibles = (sesiones || []).filter((s) => (!sedeOk || (s.sedeId ?? sedes[0]?.id) === sedeOk) && (s.fecha !== hoy || estadoVentana(s, minutos, hoy, hora).estado !== "pasada"));
  const dias = [...new Set(visibles.map((s) => s.fecha))];
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Music className="w-5 h-5 text-teal-600" /> Clases grupales</h3>
        <p className="text-sm text-slate-500">
          El horario de la semana y el disco que dictará cada profesor. Puedes reservar tu step desde {minutos} minutos antes de la clase hasta que empiece. Te avisamos 2 horas antes. 🔔
        </p>
      </div>
      {sedes.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 mr-1">📍 Sede:</span>
          {[{ id: null, nombre: "Todas" }, ...sedes].map((x) => (
            <button key={x.id ?? "todas"} type="button" onClick={() => elegirSede(x.id)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${sedeOk === x.id ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{x.nombre}</button>
          ))}
        </div>
      )}
      <CalificarClases />
      <MastersAlumno />
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
                    <p className="text-xs">🧑‍🏫 {s.profesor}{nombreSede(sedes, s.sedeId) ? ` · 📍 ${nombreSede(sedes, s.sedeId)}` : s.sala ? ` · 📍 ${s.sala}` : ""}</p>
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
      {reservar && <Reservar s={reservar} onCerrar={() => (setReservar(null), cargar())} onCambio={cargar} />}
    </div>
  );
}
