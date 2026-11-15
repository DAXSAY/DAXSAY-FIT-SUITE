// =====================================================================
// Reporte del CRM, ordenado por preguntas:
//  1. Embudo: preguntaron → pase libre → vinieron → se matricularon
//  2. ¿Cuándo vienen a preguntar? (día, hora y turno)
//  3. ¿De dónde vienen y qué buscan? (cómo nos conocieron y plan)
//  4. Rendimiento del equipo (por responsable)
//  5. ¿Por qué no vinieron?
// Todo es clicable: al tocar una barra o una fila se ve la lista de esas
// personas abajo, se abre su ficha y se descarga en Excel o PDF.
// =====================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { tono } from "../../utils/tonos";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Clock, Compass, Users, AlertTriangle, Filter, X, ShieldCheck, ChevronDown, MousePointerClick } from "lucide-react";
import { api } from "../../api/cliente";
import { hoyISO, fechaCorta } from "../../utils/fecha";
import { Exportar } from "../reports/ReportsModule";
import { resultadoDe } from "./CrmRegistro";
import { Luces } from "./Responsable";
import { TarjetaKpi, serieRango } from "../common/TarjetaKpi";
import { useGym } from "../../context/GymContext";
import { coloresPorNombre } from "../../utils/colorPlan";

const ORIGENES = { visita: "Vino al gimnasio", whatsapp: "WhatsApp", llamada: "Llamada", redes: "Redes sociales", referido: "Referido", web: "Página web", otro: "Otro" };
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const AZUL = "var(--color-blue-600)";
// Un color propio por cada forma en que nos conocieron
const COLOR_ORIGEN = {
  "Vino al gimnasio": "var(--color-teal-600)",
  WhatsApp: "var(--color-green-500)",
  Llamada: "var(--color-blue-500)",
  "Redes sociales": "var(--color-pink-500)",
  Referido: "var(--color-amber-500)",
  "Página web": "var(--color-violet-500)",
  Otro: "#94a3b8",
};
// Colores variados para las demás listas (motivos, etc.)
const VARIADOS = ["var(--color-indigo-500)", "var(--color-orange-500)", "var(--color-teal-500)", "var(--color-rose-600)", "var(--color-lime-500)", "var(--color-purple-500)", "var(--color-sky-500)", "var(--color-yellow-500)"];
const CLARO = "#93c5fd";
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

const diaDe = (p) => {
  const d = new Date(`${String(p.createdAt).slice(0, 10)}T12:00:00Z`).getUTCDay();
  return DIAS[(d + 6) % 7];
};
const horaDe = (p) => Number(String(p.createdAt).slice(11, 13)) || 0;
const pase = (p) => !!p.lights?.pase || !!p.lastPass;
const vino = (p) => !!p.lights?.visita || p.lastPass?.status === "usado";
const motivoDe = (p) =>
  p.lastPass?.reasonLabel || (p.lastPass?.status === "pendiente" ? "Pase vencido, falta registrar el motivo" : p.status === "de_baja" ? p.dropReason || "De baja sin motivo" : "Sin motivo registrado");

const Seccion = ({ titulo, sub, icono: I, children, derecha }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
          <I className="w-4 h-4 text-blue-600" /> {titulo}
        </p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {derecha}
    </div>
    {children}
  </div>
);

/** Lista de barras horizontales clicable */
const Barras = ({ filas, activo, onClick, vacio = "Sin datos en este periodo." }) => {
  if (!filas.length) return <p className="text-sm text-slate-400">{vacio}</p>;
  const max = Math.max(...filas.map((f) => f.total), 1);
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 px-1 pb-0.5">
        <MousePointerClick className="w-3.5 h-3.5" /> Toca una fila para ver la lista de personas
      </p>
      {filas.map((f, i) => {
        const color = f.color || VARIADOS[i % VARIADOS.length];
        const apagado = activo && activo !== f.nombre;
        return (
        <button
          key={f.nombre}
          type="button"
          onClick={() => onClick(f.nombre)}
          className={`w-full text-left rounded-lg px-2 py-1.5 cursor-pointer ${activo === f.nombre ? "bg-blue-50 ring-1 ring-blue-300" : "hover:bg-slate-50"}`}
        >
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-slate-700 truncate flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              {f.nombre}
            </span>
            <span className="whitespace-nowrap">
              <b className="text-slate-900">{f.total}</b>
              {f.extra && <span className="text-xs text-slate-500"> · {f.extra}</span>}
              <ChevronDown className={`inline w-3.5 h-3.5 ml-1 -mt-0.5 transition-transform ${activo === f.nombre ? "rotate-180 text-blue-600" : "text-slate-400"}`} />
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
            <div className="h-full rounded-full" style={{ width: `${(f.total / max) * 100}%`, background: color, opacity: apagado ? 0.35 : 1 }} />
          </div>
        </button>
        );
      })}
    </div>
  );
};

const contar = (lista, clave, orden) => {
  const m = new Map();
  lista.forEach((p) => {
    const k = clave(p);
    m.set(k, (m.get(k) || 0) + 1);
  });
  const filas = [...m.entries()].map(([nombre, total]) => ({ nombre, total }));
  return orden ? orden.map((n) => filas.find((f) => f.nombre === n) || { nombre: n, total: 0 }) : filas.sort((a, b) => b.total - a.total);
};

export const ReporteCrm = ({ onAbrirProspecto }) => {
  const { plans = [] } = useGym();
  const colorPlanes = useMemo(() => coloresPorNombre(plans), [plans]);
  const hoy = hoyISO();
  const [desde, setDesde] = useState(`${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [rep, setRep] = useState(null);
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState("");
  const [cuando, setCuando] = useState("dia");
  const [filtro, setFiltro] = useState(null); // { tipo, valor, texto }
  const detalleRef = useRef(null);

  useEffect(() => {
    setRep(null);
    setFilas(null);
    setFiltro(null);
    Promise.all([api(`/prospectos/reporte?desde=${desde}&hasta=${hasta}`), api(`/prospectos/registro?desde=${desde}&hasta=${hasta}`)])
      .then(([r, g]) => (setRep(r), setFilas(g.filas), setError("")))
      .catch((e) => setError(e.message));
  }, [desde, hasta]);

  const rangos = [
    ["Hoy", hoy, hoy],
    ["Últimos 7 días", (() => { const [y, m, d] = hoy.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - 6)).toISOString().slice(0, 10); })(), hoy],
    ["Este mes", `${hoy.slice(0, 7)}-01`, hoy],
    ["Mes pasado", (() => { const [y, m] = hoy.split("-").map(Number); return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10); })(), (() => { const [y, m] = hoy.split("-").map(Number); return new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10); })()],
    ["Este año", `${hoy.slice(0, 4)}-01-01`, hoy],
  ];

  // Turnos de recepción (del reporte) para ubicar cada registro por su hora
  const turnos = useMemo(
    () =>
      (rep?.turnos || []).map((t) => {
        const [a, b] = t.horario.split("–").map((x) => Number(x.trim().slice(0, 2)));
        return { nombre: t.nombre, horario: t.horario, inicio: a, fin: b || 24 };
      }),
    [rep],
  );
  const turnoDe = (p) => {
    const h = horaDe(p);
    return (turnos.find((t) => (t.inicio <= t.fin ? h >= t.inicio && h < t.fin : h >= t.inicio || h < t.fin)) || { nombre: "Fuera de turno" }).nombre;
  };

  const lista = filas || [];
  const embudo = useMemo(() => {
    const conPase = lista.filter(pase);
    const vinieron = lista.filter(vino);
    const matric = lista.filter((p) => p.status === "matriculado");
    return [
      { clave: "todos", nombre: "Preguntaron", total: lista.length, color: "bg-sky-500", sub: "interesados registrados" },
      { clave: "pase", nombre: "Recibieron pase libre", total: conPase.length, color: "bg-violet-500", sub: `${pct(conPase.length, lista.length)}% de los que preguntaron` },
      { clave: "vino", nombre: "Vinieron a su visita", total: vinieron.length, color: "bg-teal-500", sub: `${pct(vinieron.length, conPase.length)}% de los que tenían pase` },
      { clave: "matriculado", nombre: "Se matricularon", total: matric.length, color: "bg-emerald-500", sub: `${pct(matric.length, lista.length)}% de conversión` },
    ];
  }, [filas]);

  const porDia = useMemo(() => contar(lista, diaDe, DIAS), [filas]);
  const porHora = useMemo(() => {
    const c = contar(lista, (p) => `${String(horaDe(p)).padStart(2, "0")}:00`);
    return Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`)
      .map((n) => c.find((x) => x.nombre === n) || { nombre: n, total: 0 })
      .filter((x, i) => x.total || (i >= 6 && i <= 22));
  }, [filas]);
  const porTurno = useMemo(() => contar(lista, turnoDe, [...turnos.map((t) => t.nombre), ...(lista.some((p) => turnoDe(p) === "Fuera de turno") ? ["Fuera de turno"] : [])]), [filas, turnos]);
  const porOrigen = useMemo(() => contar(lista, (p) => ORIGENES[p.source] || p.source), [filas]);
  const porPlan = useMemo(() => contar(lista, (p) => p.planName || "Aún no sabe"), [filas]);
  const noVinieron = useMemo(() => lista.filter((p) => resultadoDe(p, hoy).clave === "no_vino" || (p.status === "de_baja" && pase(p) && !vino(p))), [filas]);
  const porMotivo = useMemo(() => contar(noVinieron, motivoDe), [noVinieron]);
  const equipo = useMemo(() => {
    const m = new Map();
    lista.forEach((p) => {
      const k = p.owner || "Sin responsable";
      if (!m.has(k)) m.set(k, { nombre: k, turno: p.ownerShift || "", interesados: 0, pases: 0, visitas: 0, matriculados: 0, asegurados: 0, libres: 0 });
      const x = m.get(k);
      x.interesados++;
      if (pase(p)) x.pases++;
      if (vino(p)) x.visitas++;
      if (p.status === "matriculado") x.matriculados++;
      if (p.secured && p.status !== "matriculado") x.asegurados++;
      if (p.free) x.libres++;
    });
    return [...m.values()].sort((a, b) => b.matriculados - a.matriculados || b.interesados - a.interesados);
  }, [filas]);

  const mejor = (f) => f.reduce((a, b) => (b.total > a.total ? b : a), { total: 0 });
  const serie = cuando === "dia" ? porDia : cuando === "hora" ? porHora : porTurno;
  const pico = mejor(serie);

  // Filtro del detalle
  const elegir = (tipo, valor, texto) => {
    setFiltro((f) => (f && f.tipo === tipo && f.valor === valor ? null : { tipo, valor, texto }));
    setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const detalle = useMemo(() => {
    if (!filtro) return [];
    const { tipo, valor } = filtro;
    return lista.filter((p) => {
      if (tipo === "embudo") return valor === "todos" ? true : valor === "pase" ? pase(p) : valor === "vino" ? vino(p) : p.status === "matriculado";
      if (tipo === "dia") return diaDe(p) === valor;
      if (tipo === "hora") return `${String(horaDe(p)).padStart(2, "0")}:00` === valor;
      if (tipo === "turno") return turnoDe(p) === valor;
      if (tipo === "origen") return (ORIGENES[p.source] || p.source) === valor;
      if (tipo === "plan") return (p.planName || "Aún no sabe") === valor;
      if (tipo === "equipo") return (p.owner || "Sin responsable") === valor;
      if (tipo === "motivo") return noVinieron.includes(p) && motivoDe(p) === valor;
      return true;
    });
  }, [filtro, filas, turnos]);

  const columnas = [
    { key: "createdAt", label: "Registro", excel: (p) => `${fechaCorta(p.createdAt)} ${String(p.createdAt).slice(11, 16)}` },
    { key: "fullName", label: "Interesado" },
    { key: "phone", label: "Celular" },
    { key: "planName", label: "Plan de interés", excel: (p) => p.planName || "Aún no sabe" },
    { key: "owner", label: "Responsable", excel: (p) => `${p.owner || ""}${p.ownerShift ? ` · ${p.ownerShift}` : ""}` },
    { key: "resultado", label: "Resultado", excel: (p) => resultadoDe(p, hoy).texto },
    { key: "motivo", label: "Lo que dijo", excel: (p) => [p.lastPass?.reasonLabel && `${p.lastPass.reasonLabel}${p.lastPass.reason ? `: ${p.lastPass.reason}` : ""}`, p.status === "de_baja" && p.dropReason, p.notes].filter(Boolean).join(" · ") },
  ];

  const chip = (k, l) => (
    <button key={k} type="button" onClick={() => setCuando(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${cuando === k ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
      {l}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Periodo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5">
          {rangos.map(([l, a, b], i) => (
            <button key={l} type="button" onClick={() => (setDesde(a), setHasta(b))} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${desde === a && hasta === b ? `${tono(i).activo} shadow-sm` : tono(i).suave}`}>
              {l}
            </button>
          ))}
        </div>
        <label className="text-xs font-bold text-slate-600">
          Desde
          <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && setDesde(e.target.value)} className="block mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Hasta
          <input type="date" value={hasta} min={desde} onChange={(e) => e.target.value && setHasta(e.target.value)} className="block mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" />
        </label>
        <p className="text-xs text-slate-500 ml-auto">Toca cualquier barra, paso o fila para ver la lista de personas.</p>
      </div>

      {error && <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
      {!filas && !error && <p className="text-sm text-slate-500">Cargando reporte…</p>}

      {filas && rep && (
        <>
          {/* 1. Embudo */}
          <Seccion titulo="De la consulta a la matrícula" sub="Cuántos avanzan en cada paso" icono={Filter}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {embudo.map((e) => (
                <TarjetaKpi icono={Users}
                  key={e.clave}
                  titulo={e.nombre}
                  valor={e.total}
                  sub={e.sub}
                  tono={{ todos: "teal", pase: "violeta", vino: "azul", matriculado: "verde" }[e.clave]}
                  serie={serieRango(
                    lista
                      .filter((p) => (e.clave === "todos" ? true : e.clave === "pase" ? pase(p) : e.clave === "vino" ? vino(p) : p.status === "matriculado"))
                      .map((p) => p.createdAt),
                    desde,
                    hasta,
                  )}
                  activo={filtro?.tipo === "embudo" && filtro.valor === e.clave}
                  onClick={() => elegir("embudo", e.clave, e.nombre)}
                  title="Toca para ver quiénes son"
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Pases: {rep.resumen.pasesPendientes} pendientes · {rep.resumen.pasesNoConcretados} no concretados · {rep.resumen.reprogramaciones} reprogramaciones
            </p>
          </Seccion>

          {/* 2. Cuándo */}
          <Seccion
            titulo="¿Cuándo vienen a preguntar?"
            sub={pico.total ? `Más afluencia: ${pico.nombre} (${pico.total} interesado${pico.total === 1 ? "" : "s"})` : "Aún no hay interesados en este periodo"}
            icono={Clock}
            derecha={<div className="flex gap-1.5">{chip("dia", "Por día")}{chip("hora", "Por hora")}{chip("turno", "Por turno")}</div>}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={cuando === "hora" ? 1 : 0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, "Interesados"]} cursor={{ fill: "#eff6ff" }} />
                  <Bar isAnimationActive={false} maxBarSize={56} dataKey="total" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d) => elegir(cuando, d.nombre, `${cuando === "dia" ? "Día" : cuando === "hora" ? "Hora" : "Turno"}: ${d.nombre}`)}>
                    {serie.map((f) => (
                      <Cell key={f.nombre} fill={filtro?.tipo === cuando && filtro.valor === f.nombre ? AZUL : f.nombre === pico.nombre && pico.total ? "var(--color-blue-500)" : CLARO} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {cuando === "turno" && <p className="text-[11px] text-slate-500">Turnos: {turnos.map((t) => `${t.nombre} (${t.horario})`).join(" · ")}</p>}
          </Seccion>

          {/* 3. De dónde y qué buscan */}
          <Seccion titulo="¿De dónde vienen y qué buscan?" icono={Compass}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Cómo nos conocieron</p>
                <Barras filas={porOrigen.map((f) => ({ ...f, color: COLOR_ORIGEN[f.nombre] || "#94a3b8", extra: `${pct(f.total, lista.length)}%` }))} activo={filtro?.tipo === "origen" ? filtro.valor : null} onClick={(v) => elegir("origen", v, `Cómo nos conocieron: ${v}`)} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Plan que les interesa</p>
                <Barras filas={porPlan.map((f) => ({ ...f, color: colorPlanes[f.nombre]?.hex || "#cbd5e1", extra: `${pct(f.total, lista.length)}%` }))} activo={filtro?.tipo === "plan" ? filtro.valor : null} onClick={(v) => elegir("plan", v, `Plan: ${v}`)} />
              </div>
            </div>
          </Seccion>

          {/* 4. Equipo */}
          <Seccion titulo="Rendimiento del equipo" sub="Por responsable del seguimiento (quien registró al interesado o lo tomó cuando quedó libre)" icono={Users}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {["Responsable", "Interesados", "Con pase", "Vinieron", "Matriculados", "Conversión", "Asegurados", "Libres"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {equipo.map((x) => (
                    <tr key={x.nombre} onClick={() => elegir("equipo", x.nombre, `Responsable: ${x.nombre}`)} className={`border-t border-slate-100 cursor-pointer ${filtro?.tipo === "equipo" && filtro.valor === x.nombre ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                      <td className="px-3 py-2">
                        <p className="font-bold text-slate-900">{x.nombre}</p>
                        {x.turno && <p className="text-xs text-slate-500">{x.turno}</p>}
                      </td>
                      <td className="px-3 py-2 font-bold">{x.interesados}</td>
                      <td className="px-3 py-2">{x.pases}</td>
                      <td className="px-3 py-2">{x.visitas}</td>
                      <td className="px-3 py-2 font-bold text-emerald-700">{x.matriculados}</td>
                      <td className="px-3 py-2">
                        <div className="min-w-[80px]">
                          <p className="text-xs font-black">{pct(x.matriculados, x.interesados)}%</p>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${pct(x.matriculados, x.interesados)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">{x.asegurados ? <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><ShieldCheck className="w-3.5 h-3.5" />{x.asegurados}</span> : 0}</td>
                      <td className="px-3 py-2">{x.libres ? <span className="text-amber-700 font-bold">{x.libres}</span> : 0}</td>
                    </tr>
                  ))}
                  {!equipo.length && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-slate-400">Sin interesados en este periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">Asegurados: con datos, pase libre y visita (3 luces), aún por matricular. Libres: 15 días o más sin seguimiento de su responsable.</p>
          </Seccion>

          {/* 5. Por qué no vinieron */}
          <Seccion titulo="¿Por qué no vinieron?" sub={`${noVinieron.length} persona${noVinieron.length === 1 ? "" : "s"} con pase que no vinieron o se dieron de baja`} icono={AlertTriangle}>
            <Barras filas={porMotivo.map((f) => ({ ...f, extra: `${pct(f.total, noVinieron.length)}%` }))} activo={filtro?.tipo === "motivo" ? filtro.valor : null} onClick={(v) => elegir("motivo", v, `No vinieron: ${v}`)} vacio="Nadie dejó de venir en este periodo." />
          </Seccion>

          {/* Detalle */}
          <div ref={detalleRef} className="bg-white rounded-2xl border border-slate-200 overflow-x-auto scroll-mt-4">
            <div className="px-4 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-900">
                {filtro ? `${filtro.texto} · ${detalle.length} persona${detalle.length === 1 ? "" : "s"}` : "Detalle de personas"}
              </p>
              {filtro && (
                <div className="flex flex-wrap items-center gap-2">
                  <Exportar titulo={`CRM · ${filtro.texto}`} filtros={[`Del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`, filtro.texto]} columnas={columnas} filas={detalle} />
                  <button type="button" onClick={() => setFiltro(null)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <X className="w-3.5 h-3.5" /> Quitar
                  </button>
                </div>
              )}
            </div>
            {!filtro ? (
              <p className="px-4 pb-4 text-sm text-slate-400">Elige un paso del embudo, una barra o una fila de arriba para ver aquí quiénes son.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {["Registro", "Interesado", "Plan", "Responsable", "Resultado"].map((h) => (
                      <th key={h} className="text-left px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle.map((p) => {
                    const r = resultadoDe(p, hoy);
                    return (
                      <tr key={p.id} onClick={() => onAbrirProspecto?.(p.id, p)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fechaCorta(p.createdAt)} {String(p.createdAt).slice(11, 16)}</td>
                        <td className="px-3 py-2">
                          <p className="font-bold text-slate-900">{p.fullName}</p>
                          <p className="text-xs text-slate-500">{p.phone}</p>
                        </td>
                        <td className="px-3 py-2">{p.planName || "Aún no sabe"}</td>
                        <td className="px-3 py-2">
                          <p className="text-xs font-bold">{p.owner || "—"}</p>
                          <Luces p={p} compacto />
                        </td>
                        <td className="px-3 py-2">
                          <p className={`font-bold ${r.clave === "matriculado" || r.clave === "vino" ? "text-emerald-700" : r.clave === "no_vino" ? "text-rose-700" : r.clave === "baja" ? "text-slate-500" : "text-amber-700"}`}>{r.texto}</p>
                          {filtro.tipo === "motivo" && p.lastPass?.reason && <p className="text-xs text-slate-500">"{p.lastPass.reason}"</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};
