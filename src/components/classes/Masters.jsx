// =====================================================================
// MÁSTERS (personal): clases especiales de sábado y domingo con costo
//  - Administración crea el máster: nombre, disciplina, profesor, fecha,
//    hora, precio socio y precio público (cambian cada semana), cupo.
//  - Recepción inscribe durante la semana (alumno por código/DNI o persona
//    externos), cobra, marca asistencia y descarga la lista.
// =====================================================================
import React, { useEffect, useMemo, useState } from "react";
import { Star, Plus, X, Pencil, Check, Search, UserPlus, Wallet } from "lucide-react";
import { api } from "../../api/cliente";
import { useGym } from "../../context/GymContext";
import { TarjetaKpi } from "../common/TarjetaKpi";
import { Exportar } from "../reports/ReportsModule";
import { buscarAlumno } from "../../utils/codigo";
import { hoyISO } from "../../utils/fecha";
import { DIAS, diaDe, fechaBonita, sumarDias, aMin, deMin, nombreSede } from "./clasesComun";
import { Croquis, LeyendaCroquis } from "./Croquis";
import { BuscarSocio } from "./BuscarSocio";
import { useStepsMaster, ElegirStep, VentanaStep } from "./StepsMaster";
import { useAlCambiar } from "../../utils/tiempoReal";

const campo = "mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800";
const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
const METODOS = [
  ["efectivo", "💵 Efectivo"],
  ["yape_plin", "📱 Yape/Plin"],
  ["tarjeta", "💳 Tarjeta"],
  ["transferencia", "🏦 Transferencia"],
];
const nombreMetodo = (k) => METODOS.find((m) => m[0] === k)?.[1].replace(/^\S+\s/, "") || "";
const proximoFinde = () => {
  const h = hoyISO();
  const d = diaDe(h);
  return d >= 6 ? h : sumarDias(h, 6 - d);
};
const ESTADOS = { abierto: "🟢 Inscripciones abiertas", cerrado: "🔒 Inscripciones cerradas", realizado: "✅ Realizado", cancelado: "❌ Cancelado" };

const Ventana = ({ titulo, onCerrar, children }) => (
  <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
    <div className="w-full max-w-2xl mx-auto min-h-full bg-white p-5 sm:p-6 space-y-4 text-slate-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-black flex items-center gap-2 min-w-0">
          <Star className="w-5 h-5 text-amber-500 shrink-0" /> <span className="truncate">{titulo}</span>
        </h3>
        <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Cerrar"><X className="w-5 h-5" /></button>
      </div>
      {children}
    </div>
  </div>
);
const Aviso = ({ m }) => (m ? <p className={`text-sm font-bold rounded-xl border p-3 ${m.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{m.texto}</p> : null);

// ---------------------------------------------------------------------
// Crear / editar máster (administración)
// ---------------------------------------------------------------------
/** Próximos sábados y domingos (los másters solo se dictan el fin de semana) */
const findes = (n = 4) => {
  const out = [];
  let f = proximoFinde();
  while (out.length < n * 2) {
    if (diaDe(f) >= 6) out.push(f);
    f = sumarDias(f, 1);
  }
  return out;
};

const FormMaster = ({ datos, inicial, pctDefecto = 50, onListo, onCerrar }) => {
  const [f, setF] = useState(() => ({
    titulo: "",
    disciplinaId: "",
    profesorId: "",
    invitado: "",
    fecha: "",
    inicio: "",
    fin: "",
    precioSocio: "",
    precioPublico: "",
    cupo: "",
    descripcion: "",
    estado: "abierto",
    pctGym: pctDefecto,
    sedeId: datos.sedes?.length === 1 ? datos.sedes[0].id : null,
    ...(inicial || {}),
  }));
  const [conLimite, setConLimite] = useState(inicial?.id ? !!inicial?.cupo : null); // al crear, se elige
  const { currentUser, saveGymConfig } = useGym();
  const [pctFijado, setPctFijado] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const desc = f.precioPublico > 0 && f.precioSocio !== "" ? Math.round((1 - Number(f.precioSocio) / Number(f.precioPublico)) * 100) : null;
  const guardar = async (e) => {
    e.preventDefault();
    if (!f.fecha) return setMsg({ ok: false, texto: "Elige la fecha del máster (sábado o domingo)" });
    if (!f.inicio || !f.fin) return setMsg({ ok: false, texto: "Escribe la hora de inicio y de fin" });
    if ((datos.sedes?.length || 0) > 1 && !f.sedeId) return setMsg({ ok: false, texto: "Elige la sede" });
    if (conLimite === null) return setMsg({ ok: false, texto: "Elige si el máster tiene límite de personas" });
    try {
      const cuerpo = { ...f, cupo: conLimite ? f.cupo : "", profesorId: Number(f.profesorId) || null, disciplinaId: Number(f.disciplinaId) || null };
      if (inicial?.id) await api(`/masters/${inicial.id}`, { method: "PUT", body: cuerpo });
      else await api("/masters", { method: "POST", body: cuerpo });
      onListo();
    } catch (er) {
      setMsg({ ok: false, texto: er.message });
    }
  };
  const elegirDisc = (d) => setF((x) => ({ ...x, disciplinaId: d.id, profesorId: x.profesorId || d.profesores[0] || "", titulo: x.titulo || `Máster de ${d.nombre}` }));
  return (
    <Ventana titulo={inicial?.id ? "Editar máster" : "Nuevo máster"} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">1 · ¿Qué máster es? 🌟</p>
          <div className="flex flex-wrap gap-1.5">
            {datos.disciplinas.filter((d) => d.activa).map((d) => (
              <button key={d.id} type="button" onClick={() => elegirDisc(d)} className={`rd-kpi-${d.color} px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${Number(f.disciplinaId) === d.id ? "rd-clase-card" : "bg-white border-slate-200 text-slate-600"}`}>
                {d.emoji} {d.nombre}
              </button>
            ))}
          </div>
          {(datos.sedes || []).length > 1 && (
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-700">Sede (su salón y sus steps)</span>
              <div className="flex flex-wrap gap-1.5">
                {datos.sedes.map((x) => (
                  <button key={x.id} type="button" onClick={() => set("sedeId", x.id)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${f.sedeId === x.id ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>📍 {x.nombre}</button>
                ))}
              </div>
            </div>
          )}
          <label className="block text-sm"><span className="font-bold text-slate-700">Nombre del máster *</span><input value={f.titulo} onChange={(e) => set("titulo", e.target.value)} maxLength={100} placeholder="Ej. Máster Full Body Navideño" className={campo} /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-bold text-slate-700">Profesor</span>
              <select value={f.profesorId || ""} onChange={(e) => set("profesorId", e.target.value)} className={campo}>
                <option value="">Por confirmar</option>
                {datos.profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <label className="block text-sm"><span className="font-bold text-slate-700">Profesor invitado / otros (opcional)</span><input value={f.invitado} onChange={(e) => set("invitado", e.target.value)} maxLength={120} placeholder="Ej. Entrenador invitado de Lima" className={campo} /></label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">2 · ¿Qué sábado o domingo? 📅</p>
          <p className="text-xs text-slate-500">Los másters se dictan solo los fines de semana: elige el día.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[...new Set([...findes(4), ...(inicial?.fecha ? [inicial.fecha] : [])])].sort().map((fe) => (
              <button key={fe} type="button" onClick={() => set("fecha", fe)} className={`px-2 py-2 rounded-xl border text-xs font-black cursor-pointer ${f.fecha === fe ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                {DIAS[diaDe(fe)]} {Number(fe.slice(8))}/{Number(fe.slice(5, 7))}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm min-w-0"><span className="font-bold text-slate-700">Empieza</span><input type="time" value={f.inicio} onChange={(e) => set("inicio", e.target.value)} className={campo} /></label>
            <label className="block text-sm min-w-0"><span className="font-bold text-slate-700">Termina</span><input type="time" value={f.fin} onChange={(e) => set("fin", e.target.value)} className={campo} /></label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs font-bold text-slate-500 self-center">Dura:</span>
            {[60, 90, 120].map((m) => (
              <button key={m} type="button" onClick={() => set("fin", deMin(aMin(f.inicio) + m))} className={`px-3 py-1 rounded-full border text-xs font-bold cursor-pointer ${aMin(f.fin) - aMin(f.inicio) === m ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{m === 60 ? "1 h" : m === 90 ? "1 h 30" : "2 h"}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">3 · Precio 💰</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm min-w-0">
              <span className="font-bold text-slate-700">⭐ Precio para socios (S/) *</span>
              <span className="block text-[11px] text-slate-500">Socios con plan vigente</span>
              <input type="number" min={0} step="0.5" value={f.precioSocio} onChange={(e) => set("precioSocio", e.target.value)} placeholder="Ej. 30" className={campo} />
            </label>
            <label className="block text-sm min-w-0">
              <span className="font-bold text-slate-700">🎟️ Precio para externos (S/) *</span>
              <span className="block text-[11px] text-slate-500">Externos y socios sin plan vigente</span>
              <input type="number" min={0} step="0.5" value={f.precioPublico} onChange={(e) => set("precioPublico", e.target.value)} placeholder="Ej. 45" className={campo} />
            </label>
          </div>
          {desc !== null && desc >= 0 && <p className="text-xs font-bold text-emerald-700">Los socios ahorran {soles(f.precioPublico - f.precioSocio)} ({desc}% de descuento).</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">4 · ¿Cómo se reparte lo recaudado? 🤝</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">Para el gimnasio:</span>
            {[30, 40, 50, 60, 70].map((n) => (
              <button key={n} type="button" onClick={() => set("pctGym", n)} className={`px-2.5 py-1 rounded-lg border text-xs font-black cursor-pointer ${Number(f.pctGym) === n ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{n}%</button>
            ))}
            <input type="number" min={0} max={100} value={f.pctGym} onChange={(e) => set("pctGym", e.target.value)} className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-sm font-black text-center" aria-label="Porcentaje del gimnasio" /> %
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rd-kpi-verde rd-aviso-t rounded-xl border p-2.5"><p className="text-[11px] font-black uppercase">🏋️ Gimnasio {Number(f.pctGym) || 0}%</p><p className="font-black">De cada S/ 100 → {soles(Number(f.pctGym) || 0)}</p></div>
            <div className="rd-kpi-violeta rd-aviso-t rounded-xl border p-2.5"><p className="text-[11px] font-black uppercase">🧑‍🏫 Profesor {100 - (Number(f.pctGym) || 0)}%</p><p className="font-black">De cada S/ 100 → {soles(100 - (Number(f.pctGym) || 0))}</p></div>
          </div>
          {currentUser?.role === "admin" && saveGymConfig && Number(f.pctGym) !== Number(pctDefecto) && !pctFijado && (
            <button type="button" onClick={async () => (await saveGymConfig({ pct_gym_masters: Number(f.pctGym) }), setPctFijado(true))} className="text-xs font-bold text-teal-700 underline cursor-pointer">
              Usar {f.pctGym}% siempre para los próximos másters
            </button>
          )}
          {pctFijado && <p className="text-xs font-bold text-emerald-700">✅ Desde ahora los másters nuevos empiezan con {f.pctGym}%.</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">5 · ¿Cuántas personas pueden entrar? 👥</p>
          <div className="grid grid-cols-2 gap-2">
            {[[false, "Sin límite", "Entran todos los que se inscriban"], [true, "Con límite", "Se cierra al llenarse"]].map(([k, l, d]) => (
              <button key={l} type="button" onClick={() => setConLimite(k)} className={`rounded-xl border p-2.5 text-left cursor-pointer ${conLimite === k ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-700"}`}>
                <span className="block text-sm font-black">{l}</span>
                <span className="block text-[11px] opacity-80">{d}</span>
              </button>
            ))}
          </div>
          {conLimite && (
            <label className="block text-sm"><span className="font-bold text-slate-700">Máximo de personas</span><input type="number" min={1} value={f.cupo ?? ""} onChange={(e) => set("cupo", e.target.value)} placeholder="Ej. 45 (los steps del salón)" className={campo} /></label>
          )}
          <label className="block text-sm"><span className="font-bold text-slate-700">Indicaciones para los socios (opcional)</span><input value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} maxLength={400} placeholder="Ej. Traer toalla y agua" className={campo} /></label>
          {inicial?.id && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ESTADOS).map(([k, l]) => (
                <button key={k} type="button" onClick={() => set("estado", k)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${f.estado === k ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
              ))}
            </div>
          )}
        </div>
        <Aviso m={msg} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
          <button className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black cursor-pointer">{inicial?.id ? "Guardar cambios" : "🌟 Publicar máster"}</button>
        </div>
      </form>
    </Ventana>
  );
};

// ---------------------------------------------------------------------
// Reservar un lugar en el máster (recepción)
// ---------------------------------------------------------------------
const FormInscribir = ({ master, onListo, onCerrar, stepInicial = null }) => {
  const { members = [] } = useGym();
  const [modo, setModo] = useState(null); // socio o externo: lo elige recepción
  const [codigo, setCodigo] = useState("");
  const [p, setP] = useState({ nombre: "", dni: "", celular: "" });
  const [pago, setPago] = useState(null); // todo | adelanto | despues
  const [adelanto, setAdelanto] = useState("");
  const [metodo, setMetodo] = useState(null);
  const [step, setStep] = useState(stepInicial);
  const { info: pasos } = useStepsMaster(master.id, 6000);
  const [msg, setMsg] = useState(null);
  const hallado = modo === "alumno" && codigo.trim().length >= 1 ? buscarAlumno(members, codigo.trim())?.member : null;
  const guardar = async (e) => {
    e.preventDefault();
    try {
      const body = modo === "alumno" ? { alumnoId: Number(hallado?.id) } : p;
      if (modo === "alumno" && !hallado) return setMsg({ ok: false, texto: "Busca al socio por su código o DNI" });
      if (!modo) return setMsg({ ok: false, texto: "Elige si es socio o externo" });
      if (!pago) return setMsg({ ok: false, texto: "Elige cómo paga: todo, adelanto o después" });
      if (pago !== "despues" && !metodo) return setMsg({ ok: false, texto: "Elige con qué paga (efectivo, Yape/Plin…)" });
      if (pago === "adelanto" && !(Number(adelanto) > 0)) return setMsg({ ok: false, texto: "Escribe cuánto dejó de adelanto" });
      const r = await api(`/masters/${master.id}/inscribir`, { method: "POST", body: { ...body, pagado: pago === "todo", adelanto: pago === "adelanto" ? Number(adelanto) : 0, metodo, step } });
      onListo(`✅ Reserva de ${r.nombre}${r.step ? ` en el step ${r.step}` : " (sin step)"} · ${r.socio ? "precio socio" : "precio externo"} ${soles(r.precio)}${r.pagado ? " · pagado" : r.adelanto ? ` · adelanto ${soles(r.adelanto)} · saldo ${soles(r.saldo)}` : " · por cobrar"}`);
    } catch (er) {
      setMsg({ ok: false, texto: er.message });
    }
  };
  return (
    <Ventana titulo={`Reservar · ${master.titulo}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["alumno", "⭐ Socio", "Registrado: se busca por código o DNI"],
            ["externo", "🎟️ Externo", "Invitado sin registro en el sistema"],
          ].map(([k, l, d]) => (
            <button key={k} type="button" onClick={() => (setModo(k), setMsg(null))} className={`rounded-xl border-2 p-2.5 text-left cursor-pointer ${modo === k ? (k === "externo" ? "bg-violet-600 border-violet-600 text-white" : "bg-teal-600 border-teal-600 text-white") : "bg-white border-slate-200 text-slate-700"}`}>
              <span className="block text-sm font-black">{l}</span>
              <span className="block text-[11px] opacity-80">{d}</span>
            </button>
          ))}
        </div>
        {modo === "alumno" ? (
          <BuscarSocio members={members} value={codigo} onChange={(t) => (setCodigo(t), setMsg(null))} detalleVigente={`precio socio ${soles(master.precioSocio)}`} detalleVencido={`precio externo ${soles(master.precioPublico)}`} />
        ) : modo === "externo" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-sm sm:col-span-3"><span className="font-bold text-slate-700">Nombre completo *</span><input autoFocus value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} maxLength={120} className={campo} /></label>
            <label className="block text-sm"><span className="font-bold text-slate-700">DNI</span><input value={p.dni} onChange={(e) => setP({ ...p, dni: e.target.value })} inputMode="numeric" maxLength={15} className={campo} /></label>
            <label className="block text-sm sm:col-span-2"><span className="font-bold text-slate-700">Celular</span><input value={p.celular} onChange={(e) => setP({ ...p, celular: e.target.value })} inputMode="tel" maxLength={20} className={campo} /></label>
            <p className="text-xs text-slate-500 sm:col-span-3">Paga el precio externo: {soles(master.precioPublico)}. Se mostrará en morado en el croquis.</p>
          </div>
        ) : (
          <p className="rd-kpi-plomo rd-aviso-t rounded-xl border p-3 text-xs font-bold">👆 Elige arriba si la reserva es de un socio o de un externo.</p>
        )}
        <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-bold text-slate-700">🧱 Step (sitio) <span className="font-semibold text-slate-500">— opcional, también se puede asignar después</span></p>
          <ElegirStep info={pasos} seleccionado={step} onElegir={(z) => setStep((x) => (x === z.id ? null : z.id))} />
          {step && <p className="text-xs font-bold text-amber-700">Elegido: step {pasos?.croquis?.steps?.find((z) => z.id === step)?.numero} (tócalo otra vez para quitarlo)</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-bold text-slate-700">💰 Pago</p>
          <div className="grid grid-cols-3 gap-1.5">
            {[["todo", "Pagó todo"], ["adelanto", "Dejó adelanto"], ["despues", "Paga después"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setPago(k)} className={`px-2 py-2 rounded-xl border text-xs font-bold cursor-pointer ${pago === k ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
            ))}
          </div>
          {pago === "adelanto" && (
            <label className="block text-xs font-bold text-slate-600">Monto del adelanto (S/)
              <input type="number" min={0.5} step="0.5" value={adelanto} onChange={(e) => setAdelanto(e.target.value)} placeholder="Ej. 5" className={campo} />
            </label>
          )}
          {pago && pago !== "despues" && (
            <div className="flex flex-wrap gap-1.5">
              {METODOS.map(([k, l]) => (
                <button key={k} type="button" onClick={() => setMetodo(k)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${metodo === k ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
              ))}
            </div>
          )}
        </div>
        <Aviso m={msg} />
        <button className={`w-full px-5 py-3 rounded-xl text-white text-sm font-black cursor-pointer ${modo === "externo" ? "bg-violet-600 hover:bg-violet-700" : "bg-teal-600 hover:bg-teal-700"}`}>✅ Reservar{modo === "alumno" && hallado ? ` a ${hallado.fullName.split(" ")[0]}` : modo === "externo" && p.nombre.trim() ? ` a ${p.nombre.trim().split(" ")[0]} (externo)` : ""}</button>
      </form>
    </Ventana>
  );
};

// ---------------------------------------------------------------------
// Ficha de una reserva: se abre desde el croquis o desde la lista.
// Muestra lo pagado y el saldo; cobra todo o un abono, asistencia y step.
// ---------------------------------------------------------------------
const FichaReserva = ({ i, m, gestiona, onCerrar, onAccion, onStep }) => {
  const saldo = i.saldo ?? (i.pagado ? 0 : i.precio);
  const [monto, setMonto] = useState(""); // lo escribe recepción (o toca «Todo el saldo»)
  const n = Number(monto);
  const valido = n > 0 && n <= saldo + 0.001;
  return (
    <Ventana titulo={`${i.step ? `Step ${i.step} · ` : ""}${i.nombre}`} onCerrar={onCerrar}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5 text-xs font-black">
          <span className={`px-2 py-0.5 rounded-full text-white ${i.alumnoId ? "bg-teal-600" : "bg-violet-600"}`}>{i.socio ? "⭐ Socio" : i.alumnoId ? "⭐ Socio sin plan vigente" : "🎟️ Externo"}</span>
          {i.step ? <span className="px-2 py-0.5 rounded-full border border-slate-300 text-slate-700">🧱 Step {i.step}</span> : <span className="px-2 py-0.5 rounded-full border border-slate-300 text-slate-500">Sin step</span>}
          {i.asistio && <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white">✓ Asistió</span>}
          {i.origen === "alumno" && <span className="px-2 py-0.5 rounded-full border border-slate-300 text-slate-600">📱 Desde la app</span>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rd-kpi-plomo rd-aviso-t rounded-xl border p-2.5"><p className="text-[11px] font-black uppercase">Precio</p><p className="text-base font-black">{soles(i.precio)}</p></div>
          <div className="rd-kpi-verde rd-aviso-t rounded-xl border p-2.5"><p className="text-[11px] font-black uppercase">Pagado</p><p className="text-base font-black">{soles(i.montoPagado ?? (i.pagado ? i.precio : 0))}</p></div>
          <div className={`${saldo > 0 ? "rd-kpi-rosa" : "rd-kpi-verde"} rd-aviso-t rounded-xl border p-2.5`}><p className="text-[11px] font-black uppercase">Saldo</p><p className="text-base font-black">{saldo > 0 ? soles(saldo) : "Al día ✓"}</p></div>
        </div>
        {gestiona && saldo > 0 && (
          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <label className="block text-xs font-bold text-slate-600">Monto a cobrar (todo el saldo o una parte)
              <input type="number" min={0.5} step="0.5" max={saldo} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder={`Saldo: ${soles(saldo)}`} className={campo} />
            </label>
            <button type="button" onClick={() => setMonto(String(saldo))} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50">Todo el saldo · {soles(saldo)}</button>
            <p className="text-xs font-bold text-slate-600">Cobrar {valido ? soles(n) : ""} con:</p>
            <div className="grid grid-cols-2 gap-2">
              {METODOS.map(([k, l]) => (
                <button key={k} type="button" disabled={!valido} onClick={() => onAccion(i, "pagar", { metodo: k, monto: n })} className="rounded-xl border border-slate-200 py-2.5 text-sm font-black cursor-pointer hover:bg-emerald-50 disabled:opacity-40">{l}</button>
              ))}
            </div>
            {monto !== "" && !valido && <p className="text-xs font-bold text-rose-700">El monto debe ser mayor a 0 y como máximo {soles(saldo)}.</p>}
          </div>
        )}
        {gestiona && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => (onAccion(i, i.asistio ? "no_asistio" : "asistio"), onCerrar())} className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${i.asistio ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}><Check className="w-3.5 h-3.5" /> {i.asistio ? "Quitar asistencia" : "Asistió"}</button>
            {String(m.fecha) >= hoyISO() && <button type="button" onClick={onStep} className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold cursor-pointer">🧱 {i.step ? "Cambiar step" : "Dar step"}</button>}
            <button type="button" onClick={() => window.confirm(`¿Anular la reserva de ${i.nombre}?${(i.montoPagado || 0) > 0 ? ` Se le devuelve ${soles(i.montoPagado)} (sale de caja).` : ""}`) && (onAccion(i, "anular"), onCerrar())} className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer">Anular</button>
          </div>
        )}
      </div>
    </Ventana>
  );
};

// ---------------------------------------------------------------------
// Detalle de un máster: inscritos, cobros, asistencia y descarga
// ---------------------------------------------------------------------
const DetalleMaster = ({ m, rol, sedes = [], onCambio, onEditar }) => {
  const [lista, setLista] = useState(null);
  const [msg, setMsg] = useState(null);
  const [inscribir, setInscribir] = useState(false);
  const [cobrar, setCobrar] = useState(null);
  const [busca, setBusca] = useState("");
  const [paraStep, setParaStep] = useState(null);
  const [stepInicial, setStepInicial] = useState(null);
  const { info: sala, cargar: cargarSala } = useStepsMaster(m.id, 8000);
  const gestiona = rol === "admin" || rol === "reception";
  const cargar = () => api(`/masters/${m.id}/inscritos`).then((d) => setLista(d.inscritos)).catch((e) => setMsg({ ok: false, texto: e.message }));
  useAlCambiar(["masters"], () => (cargar(), onCambio()));
  useEffect(() => {
    setLista(null);
    setMsg(null);
    cargar();
  }, [m.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const accion = async (i, accion, extra = {}) => {
    try {
      const r = await api(`/masters/inscripciones/${i.id}`, { method: "POST", body: { accion, ...extra } });
      setMsg({ ok: true, texto: accion === "pagar" ? `💰 Cobrado a ${i.nombre} · ${soles(r.cobrado ?? i.saldo ?? i.precio)}${r.saldo > 0 ? ` · aún debe ${soles(r.saldo)}` : " · pagado completo"}` : accion === "anular" ? `Inscripción de ${i.nombre} anulada` : accion === "asistio" ? `✓ ${i.nombre} asistió` : `${i.nombre}: sin asistencia` });
      setCobrar(null);
      cargar();
      cargarSala();
      onCambio();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    }
  };
  const pagarProfesor = async (metodo) => {
    try {
      const r = await api(`/masters/${m.id}/pago-profesor`, { method: "POST", body: { metodo } });
      setMsg({ ok: true, texto: `💸 Pago al profesor registrado: ${soles(r.monto)} (sale de caja como egreso)` });
      onCambio();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    }
  };
  const activos = (lista || []).filter((i) => i.estado === "inscrito");
  const vistos = activos.filter((i) => !busca.trim() || `${i.nombre} ${i.dni} ${i.codigo} ${i.celular}`.toLowerCase().includes(busca.trim().toLowerCase()));
  const columnas = [
    { key: "nombre", label: "Nombre" },
    { key: "dni", label: "DNI" },
    { key: "celular", label: "Celular" },
    { key: "step", label: "Step", excel: (i) => (i.step ? `Step ${i.step}` : "Sin step") },
    { key: "tipo", label: "Tipo", excel: (i) => (i.socio ? "Socio" : i.alumnoId ? "Socio sin plan vigente" : "Externo") },
    { key: "precio", label: "Precio", excel: (i) => soles(i.precio) },
    { key: "pago", label: "Pago", excel: (i) => (i.pagado ? `Pagado · ${nombreMetodo(i.metodo)}` : i.montoPagado > 0 ? `Adelanto ${soles(i.montoPagado)}` : "Por cobrar") },
    { key: "saldo", label: "Saldo", excel: (i) => (i.saldo > 0 ? soles(i.saldo) : "") },
    { key: "asistio", label: "Asistió", excel: (i) => (i.asistio ? "Sí" : "") },
    { key: "origen", label: "Inscrito por", excel: (i) => (i.origen === "alumno" ? "App del socio" : "Recepción") },
  ];
  return (
    <div className="space-y-4">
      <div className={`rd-kpi-${m.color} rd-clase-card rounded-2xl p-4 flex flex-wrap items-start justify-between gap-3`}>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider">{ESTADOS[m.estado]}</p>
          <p className="text-xl font-black">{m.emoji} {m.titulo}</p>
          <p className="text-sm">📅 {DIAS[diaDe(m.fecha)]} {fechaBonita(m.fecha).split(" ").slice(1).join(" ")} · {m.inicio} – {m.fin}{nombreSede(sedes, m.sedeId) ? ` · 📍 ${nombreSede(sedes, m.sedeId)}` : m.sala ? ` · 📍 ${m.sala}` : ""}</p>
          <p className="text-sm">🧑‍🏫 {m.profesor}</p>
          <p className="text-sm font-bold">💰 Socio {soles(m.precioSocio)} · Externo {soles(m.precioPublico)}{m.cupo ? ` · Cupo ${m.cupo}` : ""}</p>
          {m.descripcion && <p className="text-xs mt-1">📝 {m.descripcion}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {gestiona && m.estado === "abierto" && (
            <button type="button" onClick={() => (setStepInicial(null), setInscribir(true))} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer"><UserPlus className="w-4 h-4" /> Reservar</button>
          )}
          {rol === "admin" && (
            <button type="button" onClick={onEditar} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Pencil className="w-4 h-4" /> Editar / precio</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TarjetaKpi titulo="Reservas" valor={m.inscritos} sub={`${m.inscritos - (m.externos || 0)} socio${m.inscritos - (m.externos || 0) === 1 ? "" : "s"} · ${m.externos || 0} externo${m.externos === 1 ? "" : "s"}${m.cupo ? ` · de ${m.cupo}` : ""}`} emoji="🙋" tono="teal" />
        <TarjetaKpi titulo="Recaudado" valor={m.recaudado} prefijo="S/ " decimales={2} sub={`${m.pagados} pagaron`} emoji="💰" tono="verde" />
        <TarjetaKpi titulo="Por cobrar" valor={m.porCobrar} prefijo="S/ " decimales={2} sub={`${m.inscritos - m.pagados} con saldo${m.conAdelanto ? ` · ${m.conAdelanto} con adelanto` : ""}`} emoji="⏳" tono="ambar" />
        <TarjetaKpi titulo="Asistieron" valor={m.asistieron} sub="el día del máster" emoji="✅" tono="violeta" />
      </div>

      {/* Reparto de lo recaudado */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-slate-800">🤝 Reparto de lo recaudado</p>
          <p className="text-[11px] text-slate-500">Cada cobro entra a Ingresos y a la caja del turno como «Máster».</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rd-kpi-verde rd-aviso-t rounded-xl border p-3">
            <p className="text-[11px] font-black uppercase">🏋️ Gimnasio {m.pctGym}%</p>
            <p className="text-lg font-black">{soles((m.recaudado * m.pctGym) / 100)}</p>
          </div>
          <div className="rd-kpi-violeta rd-aviso-t rounded-xl border p-3">
            <p className="text-[11px] font-black uppercase">🧑‍🏫 Profesor {100 - m.pctGym}%</p>
            <p className="text-lg font-black">{soles((m.recaudado * (100 - m.pctGym)) / 100)}</p>
            <p className="text-[11px]">{m.profesor}</p>
          </div>
          <div className="rd-kpi-plomo rd-aviso-t rounded-xl border p-3">
            <p className="text-[11px] font-black uppercase">💸 Entregado al profesor</p>
            <p className="text-lg font-black">{soles(m.pagadoProfesor)}</p>
            <p className="text-[11px]">{m.pagadoProfesorEn ? `Último pago: ${m.pagadoProfesorEn}` : "Aún no se le paga"}</p>
          </div>
        </div>
        {gestiona && (() => {
          const falta = Math.round(((m.recaudado * (100 - m.pctGym)) / 100 - m.pagadoProfesor) * 100) / 100;
          return falta > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Pagar al profesor {soles(falta)} con:</span>
              {METODOS.map(([k, l]) => (
                <button key={k} type="button" onClick={() => window.confirm(`¿Registrar el pago de ${soles(falta)} a ${m.profesor}? Sale de caja como egreso.`) && pagarProfesor(k)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold cursor-pointer hover:bg-violet-50">{l}</button>
              ))}
            </div>
          ) : null;
        })()}
      </div>
      <Aviso m={msg} />

      {/* Reservas del máster: el croquis siempre visible, socios y externos juntos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-slate-800">🎫 Reservas del salón <span className="font-semibold text-slate-500">· {activos.filter((i) => i.step).length} con step · {activos.filter((i) => !i.step).length} sin step</span></p>
          {sala?.conSteps && (
            <span className="text-xs font-black flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white">⭐ {sala.socios ?? 0} socio{sala.socios === 1 ? "" : "s"}</span>
              <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white">🎟️ {sala.externos ?? 0} externo{sala.externos === 1 ? "" : "s"}</span>
              <span className="px-2 py-0.5 rounded-full border border-slate-300 text-slate-600">{Math.max(0, sala.libres)} libre{sala.libres === 1 ? "" : "s"}</span>
            </span>
          )}
        </div>
        {!sala ? (
          <p className="text-xs text-slate-500">Cargando croquis…</p>
        ) : !sala.conSteps ? (
          <p className="text-xs text-slate-500">Falta ejecutar la parte 41 (41_steps_masters_calificaciones.sql) en MySQL Workbench.</p>
        ) : (
          <>
            <LeyendaCroquis conExterno conDeuda={gestiona} />
            <p className="text-xs text-slate-500">{gestiona && m.estado === "abierto" ? "Toca un step libre para reservarlo; toca uno ocupado para ver la reserva, cobrar el saldo o marcar su asistencia. Se actualiza solo." : "Toca un step ocupado para ver de quién es. Se actualiza solo."}</p>
            <Croquis
              croquis={sala.croquis}
              reservas={sala.reservas}
              nombres
              onStep={(z, r) => {
                if (r) {
                  const ins = (lista || []).find((x) => x.id === r.inscripcionId);
                  if (ins) return setCobrar(ins);
                  return setMsg({ ok: true, texto: `Step ${z.numero}: ${r.alumno} · ${r.externo ? "🎟️ externo" : "⭐ socio"}` });
                }
                if (gestiona && m.estado === "abierto") return setStepInicial(z.id), setInscribir(true);
                setMsg({ ok: true, texto: `Step ${z.numero}: libre.` });
              }}
            />
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2">
          <p className="w-full text-sm font-black text-slate-800">📋 Reservados <span className="font-semibold text-slate-500">· {activos.length}</span></p>
          <label className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar reservado…" className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-200 text-sm" />
          </label>
          <Exportar titulo={`Máster · ${m.titulo}`} filtros={[`${fechaBonita(m.fecha)} · ${m.inicio} – ${m.fin}`, `Profesor: ${m.profesor}`, `Socio ${soles(m.precioSocio)} · Externo ${soles(m.precioPublico)}`]} columnas={columnas} filas={vistos} totales={[["Inscritos", vistos.length], ["Pagaron", vistos.filter((i) => i.pagado).length], ["Recaudado", soles(vistos.reduce((a, i) => a + (i.montoPagado ?? (i.pagado ? i.precio : 0)), 0))], ["Por cobrar", soles(vistos.reduce((a, i) => a + (i.saldo ?? (i.pagado ? 0 : i.precio)), 0))]]} />
        </div>
        {!lista ? (
          <p className="px-4 pb-4 text-sm text-slate-500">Cargando reservas…</p>
        ) : !vistos.length ? (
          <p className="px-4 pb-6 text-center text-sm text-slate-400">{activos.length ? "Nadie coincide con la búsqueda." : "Aún no hay reservas. Toca un step libre del croquis o «Reservar»."}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {vistos.map((i) => (
              <div key={i.id} className="px-3 sm:px-4 py-2.5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{i.nombre} {i.codigo && <span className="text-xs text-slate-400">· {i.codigo}</span>}</p>
                  <p className="text-xs text-slate-500">
                    {i.socio ? "⭐ Socio" : i.alumnoId ? "Socio sin plan vigente" : <b className="text-violet-700">🎟️ Externo</b>} · {soles(i.precio)} · {i.pagado ? <b className="text-emerald-700">Pagado ({nombreMetodo(i.metodo)})</b> : i.montoPagado > 0 ? <b className="text-rose-700">Adelanto {soles(i.montoPagado)} · debe {soles(i.saldo)}</b> : <b className="text-rose-700">Debe {soles(i.saldo ?? i.precio)}</b>}
                    {" · "}{i.step ? <b className="text-amber-700">🧱 Step {i.step}</b> : <span className="text-slate-400">sin step</span>}
                    {i.origen === "alumno" && " · 📱 desde la app"}
                    {i.asistio && <b className="text-emerald-700"> · ✓ Asistió</b>}
                  </p>
                </div>
                {gestiona && (
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setParaStep(i)} className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold cursor-pointer">🧱 {i.step ? "Cambiar step" : "Dar step"}</button>
                    {!i.pagado && <button type="button" onClick={() => setCobrar(i)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center gap-1 cursor-pointer"><Wallet className="w-3.5 h-3.5" /> Cobrar {soles(i.saldo ?? i.precio)}</button>}
                    <button type="button" onClick={() => accion(i, i.asistio ? "no_asistio" : "asistio")} className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer ${i.asistio ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}><Check className="w-3.5 h-3.5" /> Asistió</button>
                    <button type="button" onClick={() => window.confirm(`¿Anular la inscripción de ${i.nombre}?`) && accion(i, "anular")} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer">Anular</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {inscribir && <FormInscribir master={m} stepInicial={stepInicial} onCerrar={() => setInscribir(false)} onListo={(t) => (setInscribir(false), setMsg({ ok: true, texto: t }), cargar(), cargarSala(), onCambio())} />}
      {paraStep && (
        <VentanaStep
          master={m}
          titulo={`Step de ${paraStep.nombre.split(" ")[0]}`}
          miStepId={paraStep.stepId}
          permitirQuitar
          boton="Asignar"
          onCerrar={() => setParaStep(null)}
          onGuardar={async (step) => {
            const r = await api(`/masters/inscripciones/${paraStep.id}`, { method: "POST", body: { accion: "step", step } });
            setParaStep(null);
            setMsg({ ok: true, texto: r.step ? `🧱 ${paraStep.nombre} quedó en el step ${r.step}` : `${paraStep.nombre} quedó sin step` });
            cargar();
            cargarSala();
          }}
        />
      )}
      {cobrar && <FichaReserva i={cobrar} m={m} gestiona={gestiona} onCerrar={() => setCobrar(null)} onAccion={accion} onStep={() => (setParaStep(cobrar), setCobrar(null))} />}
    </div>
  );
};

export default function Masters({ datos, rol }) {
  const [ver, setVer] = useState("proximos");
  const [lista, setLista] = useState(null);
  const [pctDef, setPctDef] = useState(50);
  const [error, setError] = useState("");
  const [elegido, setElegido] = useState(null);
  const [form, setForm] = useState(null);
  const cargar = () =>
    api(`/masters?ver=${ver}`)
      .then((d) => (setLista(d.masters), setPctDef(d.pctDefecto ?? 50), setError("")))
      .catch((e) => setError(e.message));
  useEffect(() => {
    setLista(null);
    cargar();
  }, [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const actual = useMemo(() => (lista || []).find((m) => m.id === elegido) || null, [lista, elegido]); // nada elegido al entrar
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex flex-wrap items-center gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-600 mr-2">🌟 Másters de fin de semana</p>
        {[["proximos", "Próximos"], ["pasados", "Historial (ya dictados)"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => (setVer(k), setElegido(null))} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${ver === k ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
        ))}
        {rol === "admin" && (
          <button type="button" onClick={() => setForm({})} className="sm:ml-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" /> Nuevo máster</button>
        )}
      </div>
      {error && <p className="text-sm font-bold rounded-xl border p-3 rd-kpi-ambar rd-aviso-t">{error}</p>}
      {!lista && !error && <p className="text-sm text-slate-500">Cargando másters…</p>}
      {lista && !lista.length && (
        <div className="rd-kpi-ambar rd-aviso-t rounded-2xl border p-5 text-center space-y-1">
          <p className="text-3xl">🌟</p>
          <p className="font-black">{ver === "proximos" ? "No hay másters programados" : "Aún no hay másters pasados"}</p>
          {ver === "proximos" && <p className="text-sm">{rol === "admin" ? "Crea el máster del sábado o domingo con su precio y los socios se irán inscribiendo." : "Administración los publica con su precio."}</p>}
        </div>
      )}
      {lista && lista.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto p-1.5 -mx-1.5">
            {lista.map((m) => (
              <button key={m.id} type="button" onClick={() => setElegido(m.id)} className={`rd-kpi-${m.color} shrink-0 rounded-xl border px-3 py-2 text-left cursor-pointer ${actual?.id === m.id ? "rd-clase-card ring-2 ring-amber-400" : "bg-white border-slate-200 text-slate-700"}`}>
                <p className="text-[11px] font-black">{fechaBonita(m.fecha)} · {m.inicio}</p>
                <p className="text-sm font-black">{m.emoji} {m.titulo}</p>
                <p className="text-[11px]">🙋 {m.inscritos}{m.cupo ? `/${m.cupo}` : ""} · 💰 {soles(m.recaudado)}</p>
              </button>
            ))}
          </div>
          {!actual && lista?.length > 0 && <p className="rd-kpi-plomo rd-aviso-t rounded-2xl border p-4 text-sm font-bold text-center">👆 Elige un máster para ver sus reservas, cobros y el croquis.</p>}
          {actual && <DetalleMaster key={actual.id} m={actual} rol={rol} sedes={datos.sedes} onCambio={cargar} onEditar={() => setForm(actual)} />}
        </>
      )}
      {form && <FormMaster datos={datos} pctDefecto={pctDef} inicial={form.id ? form : null} onCerrar={() => setForm(null)} onListo={() => (setForm(null), cargar())} />}
    </div>
  );
}
