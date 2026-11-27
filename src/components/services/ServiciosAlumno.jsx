// =====================================================================
// Servicios del alumno: lo que trae su plan y lo que compró aparte
// (medidas, dieta, evaluación nutricional, fisioterapia, entrenador…).
//  - Muestra si está vigente, hasta cuándo, sesiones que le quedan y la
//    última vez que se le hizo (dieta, control de medidas…).
//  - Recepción / administración le agregan un servicio: pagado (entra a
//    caja) o de cortesía (solo administración).
//  - Modo compacto para Nutrición y Fisioterapia: solo los de ese módulo.
// =====================================================================
import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../../api/cliente";
import { useGym } from "../../context/GymContext";
import { useAlCambiar } from "../../utils/tiempoReal";

const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
const fechaCorta = (iso) => {
  if (!iso) return "";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(d)} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"][Number(m) - 1]}${a !== String(new Date().getFullYear()) ? ` ${a}` : ""}`;
};
const ORIGEN = { plan: "Incluido en su plan", compra: "Pagado aparte", cortesia: "Cortesía" };
const METODOS = [["efectivo", "💵 Efectivo"], ["yape_plin", "📱 Yape / Plin"], ["tarjeta", "💳 Tarjeta"], ["transferencia", "🏦 Transferencia"]];

/** Texto del estado de un servicio */
const estadoTexto = (x) => {
  if (x.futuro) return `Empieza el ${fechaCorta(x.desde)}`;
  if (x.modo === "sesiones") return `${x.quedan} de ${x.sesiones} sesión${x.sesiones === 1 ? "" : "es"} disponible${x.quedan === 1 ? "" : "s"}`;
  const fin = x.hasta ? `hasta el ${fechaCorta(x.hasta)}` : "";
  const ult = x.codigo === "dieta" ? (x.ultimaVez ? `dieta del ${fechaCorta(x.ultimaVez)}` : "aún sin dieta") : x.codigo === "medidas" ? (x.ultimaVez ? `último control ${fechaCorta(x.ultimaVez)}` : "aún sin control") : "";
  return [fin, ult].filter(Boolean).join(" · ");
};

const FormAgregar = ({ idalumno, nombre, catalogo, esAdmin, onListo, onCerrar }) => {
  const [f, setF] = useState({ servicio: null, cantidad: 1, cortesia: false, metodo: "efectivo", nota: "" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const s = catalogo.find((x) => x.id === f.servicio);
  const total = s && !f.cortesia ? s.precio * f.cantidad : 0;
  const guardar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const r = await api(`/servicios/alumno/${idalumno}`, { method: "POST", body: f });
      onListo(`✅ ${r.servicio} para ${nombre.split(" ")[0]}: ${r.hasta ? `del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}` : `${r.sesiones} sesión${r.sesiones === 1 ? "" : "es"}`}${r.cortesia ? " (cortesía)" : ` · ${soles(r.total)} a caja`}`);
    } catch (er) {
      setError(er.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/40 flex items-center justify-center p-3" onClick={onCerrar}>
      <form onSubmit={guardar} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 text-slate-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-black">➕ Agregar servicio a {nombre.split(" ")[0]}</h3>
          <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold">¿Qué servicio?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {catalogo.map((x) => (
              <button key={x.id} type="button" onClick={() => setF((v) => ({ ...v, servicio: x.id }))} className={`rounded-xl border p-2.5 text-left cursor-pointer ${f.servicio === x.id ? "border-teal-500 ring-2 ring-teal-400/40 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
                <p className="text-sm font-black">{x.emoji} {x.nombre}</p>
                <p className="text-xs text-slate-500">{soles(x.precio)} · {x.modo === "periodo" ? `${x.dias} días` : `${x.sesiones} sesión${x.sesiones === 1 ? "" : "es"}`}</p>
              </button>
            ))}
          </div>
          {!f.servicio && <p className="text-xs font-bold text-teal-700">👆 Elige un servicio</p>}
        </div>
        {s && (
          <>
            <label className="block text-sm">
              <span className="font-bold">{s.modo === "periodo" ? "¿Cuántos periodos?" : "¿Cuántas veces?"}</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[1, 2, 3, 4, 6].map((n) => (
                  <button key={n} type="button" onClick={() => setF((v) => ({ ...v, cantidad: n }))} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${f.cantidad === n ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                    {s.modo === "periodo" ? `${n} × ${s.dias} días` : `${n * s.sesiones} sesión${n * s.sesiones === 1 ? "" : "es"}`}
                  </button>
                ))}
              </div>
              {s.modo === "periodo" && <span className="block text-[11px] text-slate-500 mt-1">Si ya lo tiene vigente, el nuevo empieza al día siguiente de que termine.</span>}
            </label>
            {esAdmin && (
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={f.cortesia} onChange={(e) => setF((v) => ({ ...v, cortesia: e.target.checked }))} /> 🎁 De cortesía (sin cobrar)
              </label>
            )}
            {!f.cortesia && (
              <div className="space-y-1">
                <p className="text-sm font-bold">Forma de pago</p>
                <div className="flex flex-wrap gap-1.5">
                  {METODOS.map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setF((v) => ({ ...v, metodo: k }))} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${f.metodo === k ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
                  ))}
                </div>
              </div>
            )}
            <label className="block text-sm">
              <span className="font-bold">Nota <span className="font-normal text-slate-500">(opcional)</span></span>
              <input value={f.nota} onChange={(e) => setF((v) => ({ ...v, nota: e.target.value }))} maxLength={200} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            </label>
          </>
        )}
        {error && <p className="text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
        <button disabled={!s || enviando} className="w-full px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-black cursor-pointer">
          {!s ? "Elige un servicio" : f.cortesia ? "Dar de cortesía" : `Cobrar ${soles(total)} y agregar`}
        </button>
      </form>
    </div>
  );
};

/**
 * idalumno, nombre: el alumno
 * modulos: si se pasa (ej. ["nutrition"]) solo muestra esos servicios (modo compacto)
 */
export default function ServiciosAlumno({ idalumno, nombre = "", modulos = null, compacto = false }) {
  const { currentUser } = useGym();
  const rol = currentUser?.role;
  const [datos, setDatos] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [agregar, setAgregar] = useState(false);
  const [msg, setMsg] = useState(null);
  const vende = rol === "admin" || rol === "reception";
  const cargar = () => {
    if (!idalumno) return;
    api(`/servicios/alumno/${idalumno}`).then(setDatos).catch(() => setDatos({ conServicios: false }));
  };
  useEffect(() => {
    cargar();
    api("/servicios/catalogo").then((d) => setCatalogo(d.servicios || [])).catch(() => {});
  }, [idalumno]); // eslint-disable-line react-hooks/exhaustive-deps
  useAlCambiar(["servicios", "registros"], cargar);
  if (!datos || !datos.conServicios) return null;
  const delModulo = (x) => !modulos || modulos.includes(catalogo.find((c) => c.id === x.servicioId)?.modulo);
  const lista = datos.servicios.filter(delModulo).filter((x) => x.vigente || x.futuro);
  const usar = async (x) => {
    try {
      const r = await api(`/servicios/alumno/${idalumno}/usar`, { method: "POST", body: { servicio: x.servicioId } });
      setMsg({ ok: true, texto: `✅ ${x.nombre} registrada. Le quedan ${r.quedan}.` });
      cargar();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    }
  };
  const ofrecer = catalogo.filter((c) => c.activo !== false && (!modulos || modulos.includes(c.modulo)));
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 ${compacto ? "p-3" : "p-4"} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-800">🧾 Servicios {compacto ? "de este socio" : ""}</p>
          {!compacto && <p className="text-xs text-slate-500">{datos.plan ? `Plan ${datos.plan.nombre} hasta el ${fechaCorta(datos.plan.hasta)}.` : "Sin membresía vigente."} Lo incluido en el plan más lo que pagó aparte.</p>}
        </div>
        {vende && ofrecer.length > 0 && (
          <button type="button" onClick={() => (setAgregar(true), setMsg(null))} className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-black flex items-center gap-1 cursor-pointer print:hidden"><Plus className="w-3.5 h-3.5" /> Agregar servicio</button>
        )}
      </div>
      {msg && <p className={`text-sm font-bold rounded-xl border p-2.5 ${msg.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.texto}</p>}
      {!lista.length ? (
        <p className="text-sm text-slate-500">
          {modulos ? "No tiene este servicio en su plan ni pagado aparte." : "No tiene servicios adicionales."}
          {vende && ofrecer.length > 0 && " Puedes agregárselo con «Agregar servicio»."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {lista.map((x) => {
            const alerta = !x.futuro && !x.hechoEnPeriodo;
            return (
              <div key={x.id} className={`rounded-xl border p-2.5 space-y-0.5 ${x.futuro ? "border-dashed border-slate-300" : alerta ? "rd-kpi-ambar rd-aviso-t" : "rd-kpi-verde rd-aviso-t"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black min-w-0">{x.emoji} {x.nombre}</p>
                  <span className="text-[10px] font-black uppercase whitespace-nowrap px-1.5 py-0.5 rounded-full bg-white/70 text-slate-600">{x.origen === "plan" ? "📦 plan" : x.origen === "cortesia" ? "🎁 cortesía" : "💵 pagado"}</span>
                </div>
                <p className="text-xs">{estadoTexto(x)}</p>
                <p className="text-[11px] opacity-80">{x.origen === "plan" ? `${ORIGEN.plan} (${x.plan})` : `${ORIGEN[x.origen]} · desde ${fechaCorta(x.desde)}`}</p>
                {x.modo === "sesiones" && x.codigo !== "fisioterapia" && x.vigente && rol !== "student" && (
                  <button type="button" onClick={() => usar(x)} className="mt-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-bold cursor-pointer print:hidden">✓ Marcar como atendida</button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!compacto && datos.historial.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-slate-500">Historial de servicios ({datos.historial.length})</summary>
          <div className="mt-2 divide-y divide-slate-100">
            {datos.historial.map((h) => (
              <div key={h.id} className={`py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs ${h.estado === "anulado" ? "line-through opacity-50" : ""}`}>
                <span className="font-bold text-slate-700">{h.emoji} {h.nombre}</span>
                <span className="text-slate-500">{h.hasta ? `${fechaCorta(h.desde)} → ${fechaCorta(h.hasta)}` : `${h.sesiones} sesión${h.sesiones === 1 ? "" : "es"} · ${fechaCorta(h.desde)}`} · {h.origen === "cortesia" ? "cortesía" : soles(h.precio)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
      {agregar && (
        <FormAgregar
          idalumno={idalumno}
          nombre={nombre}
          catalogo={ofrecer}
          esAdmin={rol === "admin"}
          onCerrar={() => setAgregar(false)}
          onListo={(t) => (setAgregar(false), setMsg({ ok: true, texto: t }), cargar())}
        />
      )}
    </div>
  );
}
