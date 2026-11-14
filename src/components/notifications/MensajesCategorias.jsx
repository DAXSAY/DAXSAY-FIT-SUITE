// Mensajes predeterminados por categoría (15 por categoría, editables) y envío por WhatsApp
// a los alumnos de cada categoría con el texto ya personalizado.
import { BarraVolver } from "../common/BarraVolver";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Edit3, GripVertical, MessageCircle, Plus, Search, Shuffle, Trash2, X, Users, MousePointerClick } from "lucide-react";
import { api } from "../../api/cliente";
import { useGym } from "../../context/GymContext";
import { userCan } from "../../config/roles";
import { coincideFila } from "../../utils/buscarPersona";

// Ordenadas por importancia: primero lo que hay que atender hoy
export const GRUPOS_MSG = [
  { id: "urgente", label: "Atender primero", clase: "text-rose-700", borde: "border-rose-300 bg-rose-50", on: "border-rose-500 bg-rose-100 ring-2 ring-rose-200" },
  { id: "seguimiento", label: "Seguimiento", clase: "text-amber-700", borde: "border-amber-200 bg-amber-50/60", on: "border-amber-500 bg-amber-100 ring-2 ring-amber-200" },
  { id: "relacion", label: "Fidelizar", clase: "text-emerald-700", borde: "border-emerald-200 bg-emerald-50/60", on: "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-200" },
];
export const CATEGORIAS_MSG = [
  { id: "vencidos", grupo: "urgente", emoji: "💔", label: "Vencidos", desc: "Vencieron hace menos de 30 días" },
  { id: "deuda", grupo: "urgente", emoji: "💳", label: "Deuda pendiente", desc: "Tienen saldo por pagar" },
  { id: "por_vencer", grupo: "urgente", emoji: "⏳", label: "Por vencer", desc: "Vencen en los próximos 7 días" },
  { id: "no_vienen", grupo: "seguimiento", emoji: "🪑", label: "No vienen", desc: "Plan activo y 15+ días sin venir" },
  { id: "congelamiento", grupo: "seguimiento", emoji: "❄️", label: "Regresan", desc: "Vuelven de congelar en ≤ 7 días" },
  { id: "exalumnos", grupo: "seguimiento", emoji: "👋", label: "Exalumnos", desc: "Vencieron hace más de 30 días" },
  { id: "cumpleanos", grupo: "relacion", emoji: "🎂", label: "Cumpleaños", desc: "Cumplen años este mes" },
  { id: "bienvenida", grupo: "relacion", emoji: "🎉", label: "Nuevos", desc: "Inscritos en los últimos 7 días" },
  { id: "renovaron", grupo: "relacion", emoji: "🙌", label: "Renovaron", desc: "Renovaron en los últimos 7 días" },
  { id: "constancia", grupo: "relacion", emoji: "🏆", label: "Constantes", desc: "12 o más asistencias en 30 días" },
];

const VARIABLES = ["nombre", "plan", "fecha_vencimiento", "dias", "deuda", "fecha_limite", "codigo", "fecha_regreso", "asistencias", "gym"];
// Botones del editor: el texto entre llaves se cambia solo por el dato de cada alumno
const ETIQUETAS_VAR = {
  nombre: ["👤", "Nombre"],
  plan: ["📋", "Plan"],
  fecha_vencimiento: ["📅", "Fecha de vencimiento"],
  dias: ["⏱️", "Días"],
  deuda: ["💳", "Deuda S/"],
  fecha_limite: ["🗓️", "Fecha límite de pago"],
  codigo: ["🔢", "Código"],
  fecha_regreso: ["❄️", "Fecha de regreso"],
  asistencias: ["🏋️", "Asistencias del mes"],
  gym: ["🏠", "Nombre del gym"],
};
const fc = (f) => (f ? String(f).slice(0, 10).split("-").reverse().join("/") : "");

export function personalizar(texto, a, gym) {
  const v = {
    nombre: a?.firstName || "",
    plan: a?.plan || "tu plan",
    fecha_vencimiento: fc(a?.endDate) || "—",
    dias: a?.days ?? "",
    deuda: a?.debt != null ? Number(a.debt).toFixed(2) : "",
    fecha_limite: fc(a?.debtDueDate) || "—",
    codigo: a?.codeLabel || "",
    fecha_regreso: fc(a?.returnDate) || "—",
    asistencias: a?.attendances30 ?? "",
    gym: gym || "RADICAL",
  };
  return String(texto || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in v ? String(v[k]) : m));
}

const enlaceWsp = (telefono, texto) => {
  let t = String(telefono || "").replace(/\D/g, "");
  if (t.length === 9) t = `51${t}`;
  return t.length >= 10 ? `https://wa.me/${t}?text=${encodeURIComponent(texto)}` : null;
};

const detalle = (cat, a) =>
  ({
    por_vencer: a.days === 0 ? "Vence hoy" : `Vence en ${a.days} día${a.days === 1 ? "" : "s"}`,
    vencidos: `Venció hace ${a.days} día${a.days === 1 ? "" : "s"}`,
    exalumnos: `Venció hace ${a.days} días`,
    no_vienen: `${a.days} días sin venir`,
    deuda: `Debe S/ ${a.debt.toFixed(2)}${a.debtDueDate ? ` · hasta ${fc(a.debtDueDate)}` : ""}`,
    renovaron: `${a.plan} · hasta ${fc(a.endDate)}`,
    bienvenida: a.days === 0 ? "Se inscribió hoy" : `Inscrito hace ${a.days} día${a.days === 1 ? "" : "s"}`,
    cumpleanos: a.today ? "🎉 ¡Hoy!" : `Cumple el ${a.birthday}`,
    congelamiento: `Vuelve el ${fc(a.returnDate)}`,
    constancia: `${a.attendances30} asistencias en 30 días`,
  })[cat] || "";

// Lo enviado se recuerda solo en este navegador y por día (para no repetir)
const claveEnviados = (hoy) => `radicalgym_msg_enviados_${hoy}`;
const leerEnviados = (hoy) => {
  try {
    return JSON.parse(localStorage.getItem(claveEnviados(hoy)) || "{}");
  } catch {
    return {};
  }
};

export function MensajesCategorias() {
  const { currentUser } = useGym();
  const puedeEditar = userCan(currentUser, "alerts", "editar");
  const [plantillas, setPlantillas] = useState([]);
  const [dest, setDest] = useState({ hoy: "", gym: "", categorias: {} });
  const [cat, setCat] = useState("por_vencer");
  const [selMsg, setSelMsg] = useState(null); // mensaje "en la mano" para tocar y poner
  const [asignados, setAsignados] = useState({}); // "cat:idAlumno" -> id del mensaje
  const [arrastrando, setArrastrando] = useState(null);
  const [encima, setEncima] = useState(null);
  const [buscar, setBuscar] = useState("");
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState("");
  const [enviados, setEnviados] = useState({});
  const [copiado, setCopiado] = useState("");
  const areaTexto = useRef(null);

  const cargar = () =>
    Promise.all([api("/mensajes/plantillas"), api("/mensajes/destinatarios")])
      .then(([p, d]) => {
        setPlantillas(p);
        setDest(d);
        setEnviados(leerEnviados(d.hoy));
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    cargar();
  }, []);

  const mensajes = useMemo(() => plantillas.filter((p) => p.category === cat), [plantillas, cat]);
  const todosCat = dest.categorias[cat] || [];
  const alumnos = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return todosCat.filter((a) => !q || coincideFila({ codeLabel: a.codeLabel, nombre: a.name, dni: a.dni, telefono: a.phone }, q));
  }, [todosCat, buscar]);
  useEffect(() => {
    setSelMsg(null);
    setEditando(null);
    setBuscar("");
  }, [cat]);
  const clave = (a) => `${cat}:${a.id}`;
  const mensajeDe = (a) => mensajes.find((m) => m.id === asignados[clave(a)]) || null;
  const poner = (a, idMsg) => setAsignados((x) => ({ ...x, [clave(a)]: idMsg }));
  const quitarDe = (a) =>
    setAsignados((x) => {
      const n = { ...x };
      delete n[clave(a)];
      return n;
    });
  const ponerATodos = (idMsg) => setAsignados((x) => ({ ...x, ...Object.fromEntries(todosCat.map((a) => [clave(a), idMsg])) }));
  const repartir = () =>
    setAsignados((x) => ({ ...x, ...Object.fromEntries(todosCat.map((a, i) => [clave(a), mensajes[i % mensajes.length]?.id])) }));
  const limpiar = () =>
    setAsignados((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith(`${cat}:`))));
  const conMensaje = todosCat.filter((a) => mensajeDe(a)).length;

  const marcar = (a) => {
    const k = `${cat}:${a.id}`;
    const nuevo = { ...enviados, [k]: true };
    setEnviados(nuevo);
    try {
      localStorage.setItem(claveEnviados(dest.hoy), JSON.stringify(nuevo));
    } catch {
      /* navegador sin almacenamiento */
    }
  };
  const copiar = async (texto, id) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado(""), 1500);
    } catch {
      /* sin permiso de portapapeles */
    }
  };

  // Inserta el dato donde está el cursor (no siempre al final)
  const insertar = (v) => {
    const ta = areaTexto.current;
    const marca = `{{${v}}}`;
    setEditando((e) => {
      const ini = ta ? ta.selectionStart : e.message.length;
      const fin = ta ? ta.selectionEnd : e.message.length;
      const message = e.message.slice(0, ini) + marca + e.message.slice(fin);
      requestAnimationFrame(() => {
        if (!ta) return;
        ta.focus();
        ta.selectionStart = ta.selectionEnd = ini + marca.length;
      });
      return { ...e, message };
    });
  };

  const guardar = async () => {
    setError("");
    if (!editando.title.trim() || !editando.message.trim()) {
      setError("Ponle un título y escribe el mensaje.");
      return;
    }
    try {
      const destino = editando.category || cat;
      const body = { category: destino, title: editando.title.trim(), message: editando.message };
      const r = editando.id ? await api(`/mensajes/plantillas/${editando.id}`, { method: "PUT", body }) : await api("/mensajes/plantillas", { method: "POST", body });
      setPlantillas((ps) => (editando.id ? ps.map((p) => (p.id === r.id ? r : p)) : [r, ...ps]));
      if (destino === cat) setSelMsg(r.id);
      else setCat(destino);
      setEditando(null);
    } catch (e) {
      setError(e.message);
    }
  };
  const quitar = async (m) => {
    if (!window.confirm(`¿Quitar el mensaje "${m.title}"?`)) return;
    await api(`/mensajes/plantillas/${m.id}`, { method: "DELETE" });
    setPlantillas((ps) => ps.filter((p) => p.id !== m.id));
    if (selMsg === m.id) setSelMsg(null);
  };

  const info = CATEGORIAS_MSG.find((c) => c.id === cat);
  const ejemplo = alumnos[0] || { firstName: "María", plan: "Mensual", endDate: dest.hoy, days: 3, debt: 50, debtDueDate: dest.hoy, codeLabel: "MG-12", returnDate: dest.hoy, attendances30: 14 };
  const enviadosCat = todosCat.filter((a) => enviados[`${cat}:${a.id}`]).length;
  const enMano = mensajes.find((m) => m.id === selMsg);

  return (
    <div className="space-y-4">
      {/* Categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1.3fr] gap-3">
        {GRUPOS_MSG.map((g) => (
        <div key={g.id} className="space-y-1.5">
        <p className={`text-[11px] font-black uppercase tracking-wider ${g.clase}`}>{g.label}</p>
        <div className={`grid gap-2 ${g.id === "relacion" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3"}`}>
        {CATEGORIAS_MSG.filter((c) => c.grupo === g.id).map((c) => {
          const n = (dest.categorias[c.id] || []).length;
          const on = c.id === cat;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`text-left rounded-xl border p-2.5 cursor-pointer transition-colors ${on ? g.on : `${g.borde} hover:border-slate-400`}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{c.emoji}</span>
                <span className={`min-w-6 h-6 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${n ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"}`}>{n}</span>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-1">{c.label}</p>
              <p className="text-[11px] text-slate-500 leading-tight">{c.desc}</p>
            </button>
          );
        })}
        </div>
        </div>
        ))}
      </div>
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Mensajes */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900">
              {info?.emoji} Mensajes · {info?.label} <span className="text-slate-400 font-normal">({mensajes.length})</span>
            </h3>
            {puedeEditar && !editando && (
              <button type="button" onClick={() => setEditando({ title: "", message: "", category: cat })} className="text-xs font-bold text-blue-700 flex items-center gap-1 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Nuevo mensaje
              </button>
            )}
          </div>

          {editando && (
            <div className="rounded-xl border-2 border-blue-300 bg-blue-50/40 p-3 space-y-3">
              <BarraVolver onVolver={() => setEditando(null)} titulo={editando.id ? "Editar mensaje" : "Nuevo mensaje"} />
              <div className="grid sm:grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">1. Título (solo lo ves tú)</span>
                  <input value={editando.title} onChange={(e) => setEditando({ ...editando, title: e.target.value })} placeholder="Ej. Recordatorio con cariño" className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">2. ¿Para qué tipo de alumno?</span>
                  <select value={editando.category || cat} onChange={(e) => setEditando({ ...editando, category: e.target.value })} className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm">
                    {CATEGORIAS_MSG.map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.label} — {c.desc}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">3. Escribe el mensaje y toca un dato para ponerlo donde está el cursor</span>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertar(v)}
                      className="px-2 py-1 rounded-lg bg-white border border-blue-200 text-xs font-semibold text-blue-800 cursor-pointer hover:bg-blue-50 hover:border-blue-400"
                      title={`Se cambia por: ${personalizar(`{{${v}}}`, ejemplo, dest.gym)}`}
                    >
                      {ETIQUETAS_VAR[v][0]} {ETIQUETAS_VAR[v][1]}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={areaTexto}
                  value={editando.message}
                  onChange={(e) => setEditando({ ...editando, message: e.target.value })}
                  rows={5}
                  maxLength={1000}
                  placeholder="Ej. ¡Hola  👤 Nombre! Tu plan  📋 Plan vence el  📅 Fecha de vencimiento…"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lo que queda entre llaves, como {"{{nombre}}"}, se cambia solo por el dato real de cada alumno al enviarlo.
                </p>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Así le llega a {ejemplo.firstName || "María"}</span>
                <div className="rounded-xl p-3 bg-[#e5ddd5] dark:bg-[#0b141a]">
                  <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#d9fdd3] text-slate-900 text-sm px-3 py-2 shadow whitespace-pre-wrap">
                    {personalizar(editando.message, ejemplo, dest.gym) || <span className="text-slate-500">Tu mensaje aparecerá aquí…</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={guardar} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold cursor-pointer">Guardar mensaje</button>
                <button type="button" onClick={() => setEditando(null)} className="px-3 py-2 rounded-lg text-slate-600 text-sm cursor-pointer">Cancelar</button>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-600 flex items-start gap-2">
            <GripVertical className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <span>
              <b>Arrastra</b> un mensaje hasta la persona, o <b>tócalo</b> y luego toca «Poner aquí» en cada persona. También puedes usarlo con todos.
            </span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {mensajes.map((m) => {
              const on = selMsg === m.id;
              const usos = todosCat.filter((a) => asignados[clave(a)] === m.id).length;
              return (
                <div
                  key={m.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(m.id));
                    e.dataTransfer.effectAllowed = "copy";
                    setArrastrando(m.id);
                  }}
                  onDragEnd={() => {
                    setArrastrando(null);
                    setEncima(null);
                  }}
                  onClick={() => setSelMsg(on ? null : m.id)}
                  className={`group rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all ${
                    on ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300" : "border-slate-200 hover:border-slate-400"
                  } ${arrastrando === m.id ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      {on && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      <span className="truncate">{m.title}</span>
                      {m.custom && <span className="ml-1 text-[10px] text-blue-600 shrink-0">★ propio</span>}
                      {usos > 0 && <span className="ml-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 shrink-0">{usos} persona(s)</span>}
                    </p>
                    <span className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {todosCat.length > 0 && (
                        <button type="button" title="Usar este mensaje con todos" onClick={() => ponerATodos(m.id)} className="p-1 text-slate-400 hover:text-emerald-700 cursor-pointer">
                          <Users className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button type="button" title="Copiar" onClick={() => copiar(personalizar(m.message, ejemplo, dest.gym), m.id)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                        {copiado === m.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {puedeEditar && (
                        <>
                          <button type="button" title="Editar" onClick={() => setEditando({ id: m.id, title: m.title, message: m.message, category: m.category })} className="p-1 text-slate-400 hover:text-blue-700 cursor-pointer">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" title="Quitar" onClick={() => quitar(m)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{personalizar(m.message, ejemplo, dest.gym)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Destinatarios */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900">
              Para quién <span className="text-slate-400 font-normal">({todosCat.length})</span>
            </h3>
            {todosCat.length > 0 && (
              <span className="text-xs text-slate-500">
                Con mensaje: <b className="text-blue-700">{conMensaje}</b> · Enviados hoy: <b className="text-emerald-700">{enviadosCat}</b> / {todosCat.length}
              </span>
            )}
          </div>
          {todosCat.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={repartir} disabled={!mensajes.length} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <Shuffle className="w-3.5 h-3.5" /> Uno distinto a cada uno
              </button>
              {enMano && (
                <button type="button" onClick={() => ponerATodos(enMano.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer">
                  <Users className="w-3.5 h-3.5" /> «{enMano.title}» a todos
                </button>
              )}
              {conMensaje > 0 && (
                <button type="button" onClick={limpiar} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer">
                  <X className="w-3.5 h-3.5" /> Quitar todos
                </button>
              )}
            </div>
          )}
          {todosCat.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por código o nombre…" className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-300 text-sm" />
            </div>
          )}
          {todosCat.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No hay alumnos en esta categoría por ahora. 🎉</p>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {alumnos.map((a) => {
                const m = mensajeDe(a);
                const texto = m ? personalizar(m.message, a, dest.gym) : "";
                const url = m ? enlaceWsp(a.phone, texto) : null;
                const hecho = enviados[`${cat}:${a.id}`];
                const sobre = encima === a.id;
                return (
                  <div
                    key={a.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      if (encima !== a.id) setEncima(a.id);
                    }}
                    onDragLeave={() => setEncima((x) => (x === a.id ? null : x))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/plain");
                      const msg = mensajes.find((x) => String(x.id) === id);
                      if (msg) poner(a, msg.id);
                      setEncima(null);
                      setArrastrando(null);
                    }}
                    className={`rounded-xl border-2 p-3 transition-all ${
                      sobre ? "border-blue-500 bg-blue-50 scale-[1.01]" : hecho ? "border-emerald-200 bg-emerald-50/40" : m ? "border-slate-200" : "border-dashed border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          <span className="font-mono text-blue-700 mr-1.5">{a.codeLabel}</span>
                          {a.name}
                        </p>
                        <p className="text-[11px] text-slate-500">{detalle(cat, a)}{a.phone ? ` · ${a.phone}` : " · sin celular"}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {m && (
                          <button type="button" title="Copiar mensaje" onClick={() => copiar(texto, `a${a.id}`)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer">
                            {copiado === `a${a.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {!a.phone ? (
                          <span className="px-2 py-1.5 rounded-lg text-[11px] text-slate-400 border border-dashed border-slate-200 flex items-center gap-1">
                            <X className="w-3 h-3" /> Sin celular
                          </span>
                        ) : url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => marcar(a)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${hecho ? "bg-emerald-100 text-emerald-800" : "bg-green-600 text-white hover:bg-green-700"}`}
                          >
                            {hecho ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />} {hecho ? "Enviado" : "WhatsApp"}
                          </a>
                        ) : (
                          <span title="Primero ponle un mensaje" className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-slate-100 text-slate-400">
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </span>
                        )}
                      </div>
                    </div>
                    {m ? (
                      <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2 flex items-start gap-2">
                        <p className="text-[11px] text-slate-600 line-clamp-2 flex-1" title={texto}>
                          <b className="text-blue-700">{m.title}:</b> {texto}
                        </p>
                        <button type="button" title="Quitar mensaje" onClick={() => quitarDe(a)} className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span>{sobre ? "Suelta aquí el mensaje" : "Arrastra un mensaje aquí o"}</span>
                        {enMano ? (
                          <button type="button" onClick={() => poner(a, enMano.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 text-white font-bold cursor-pointer">
                            <MousePointerClick className="w-3 h-3" /> Poner aquí «{enMano.title}»
                          </button>
                        ) : (
                          <select value="" onChange={(e) => { const x = mensajes.find((mm) => String(mm.id) === e.target.value); if (x) poner(a, x.id); }} className="rounded-md border border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-600">
                            <option value="">elige uno…</option>
                            {mensajes.map((x) => (
                              <option key={x.id} value={x.id}>{x.title}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
