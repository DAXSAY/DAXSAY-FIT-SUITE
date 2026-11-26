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
import { Clock, Compass, Users, AlertTriangle, Filter, X, ShieldCheck, ChevronDown, MousePointerClick, Search, CalendarDays, ListChecks } from "lucide-react";
import { ConIconos } from "../common/IconoEmoji";
import { api } from "../../api/cliente";
import { hoyISO, fechaCorta } from "../../utils/fecha";
import { Exportar } from "../reports/ReportsModule";
import { resultadoDe, COLUMNAS, RESULTADOS, ESTADOS, queQuedo, loQueDijo, fechaHora } from "./CrmRegistro";
import { Luces, situacion } from "./Responsable";
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
  const [plan, setPlan] = useState("");
  const [responsable, setResponsable] = useState("");
  const [resultado, setResultado] = useState("todos");
  const [busca, setBusca] = useState("");
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
    ["Ayer", (() => { const [y, m, d] = hoy.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10); })(), (() => { const [y, m, d] = hoy.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10); })()],
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

  // Filtros: todo lo de abajo (indicadores, gráficos, lista y descargas) usa la misma lista
  const base = filas || [];
  const planes = useMemo(() => [...new Set(base.map((p) => p.planName || "Aún no sabe"))].sort(), [filas]);
  const responsables = useMemo(() => [...new Set(base.map((p) => p.owner).filter(Boolean))].sort(), [filas]);
  const sinResultado = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return base.filter((p) => {
      if (plan && (p.planName || "Aún no sabe") !== plan) return false;
      if (responsable && p.owner !== responsable) return false;
      return !q || `${p.fullName} ${p.phone} ${p.dni} ${p.notes} ${p.dropReason} ${p.lastPass?.reason || ""}`.toLowerCase().includes(q);
    });
  }, [filas, plan, responsable, busca]);
  const lista = useMemo(() => (resultado === "todos" ? sinResultado : sinResultado.filter((p) => resultadoDe(p, hoy).clave === resultado)), [sinResultado, resultado, hoy]);
  const cuenta = (k) => (k === "todos" ? sinResultado.length : sinResultado.filter((p) => resultadoDe(p, hoy).clave === k).length);
  const hayFiltros = plan || responsable || resultado !== "todos" || busca.trim();
  const limpiar = () => (setPlan(""), setResponsable(""), setResultado("todos"), setBusca(""), setFiltro(null));
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
  }, [lista]);

  const porDia = useMemo(() => contar(lista, diaDe, DIAS), [lista]);
  const porHora = useMemo(() => {
    const c = contar(lista, (p) => `${String(horaDe(p)).padStart(2, "0")}:00`);
    return Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`)
      .map((n) => c.find((x) => x.nombre === n) || { nombre: n, total: 0 })
      .filter((x, i) => x.total || (i >= 6 && i <= 22));
  }, [lista]);
  const porTurno = useMemo(() => contar(lista, turnoDe, [...turnos.map((t) => t.nombre), ...(lista.some((p) => turnoDe(p) === "Fuera de turno") ? ["Fuera de turno"] : [])]), [lista, turnos]);
  const porOrigen = useMemo(() => contar(lista, (p) => ORIGENES[p.source] || p.source), [lista]);
  const porPlan = useMemo(() => contar(lista, (p) => p.planName || "Aún no sabe"), [lista]);
  const noVinieron = useMemo(() => lista.filter((p) => resultadoDe(p, hoy).clave === "no_vino" || (p.status === "de_baja" && pase(p) && !vino(p))), [lista]);
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
  }, [lista]);

  const mejor = (f) => f.reduce((a, b) => (b.total > a.total ? b : a), { total: 0 });
  const serie = cuando === "dia" ? porDia : cuando === "hora" ? porHora : porTurno;
  const pico = mejor(serie);

  // Filtro del detalle
  const elegir = (tipo, valor, texto) => {
    setFiltro((f) => (f && f.tipo === tipo && f.valor === valor ? null : { tipo, valor, texto }));
    setTimeout(() => detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const detalle = useMemo(() => {
    if (!filtro) return lista;
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
  }, [filtro, lista, turnos]);

  const columnas = COLUMNAS;
  const nombreRango = rangos.find(([, a, b]) => a === desde && b === hasta)?.[0];
  const filtrosTexto = [
    `Registrados del ${fechaCorta(desde)} al ${fechaCorta(hasta)}${nombreRango ? ` (${nombreRango})` : ""}`,
    resultado !== "todos" ? `Resultado: ${RESULTADOS.find((r) => r[0] === resultado)[1]}` : "",
    plan ? `Plan: ${plan}` : "",
    responsable ? `Responsable: ${responsable}` : "",
    busca.trim() ? `Búsqueda: "${busca.trim()}"` : "",
    filtro ? filtro.texto : "",
  ].filter(Boolean);
  const totales = [
    ["Interesados", detalle.length],
    ["Con pase libre", detalle.filter(pase).length],
    ["Vinieron", detalle.filter(vino).length],
    ["Se matricularon", detalle.filter((p) => p.status === "matriculado").length],
    ["No vinieron", detalle.filter((p) => resultadoDe(p, hoy).clave === "no_vino").length],
  ];
  const colorResultado = (r) => (r.clave === "matriculado" || r.clave === "vino" ? "text-emerald-700" : r.clave === "no_vino" ? "text-rose-700" : r.clave === "baja" ? "text-slate-500" : "text-amber-700");

  const chip = (k, l) => (
    <button key={k} type="button" onClick={() => setCuando(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${cuando === k ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
      {l}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Periodo, filtros y descargas: todo lo de abajo usa esta misma selección */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-blue-600" /> Periodo y filtros
          </p>
          {filas && <Exportar titulo="Interesados (CRM)" filtros={filtrosTexto} columnas={columnas} filas={detalle} totales={totales} />}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rangos.map(([l, a, b], i) => (
            <button key={l} type="button" onClick={() => (setDesde(a), setHasta(b))} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${desde === a && hasta === b ? `${tono(i).activo} shadow-sm` : tono(i).suave}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-[auto_auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-2 sm:gap-3 items-end">
          <label className="text-xs font-bold text-slate-600 min-w-0">
            Desde
            <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && setDesde(e.target.value)} className="block w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600 min-w-0">
            Hasta
            <input type="date" value={hasta} min={desde} onChange={(e) => e.target.value && setHasta(e.target.value)} className="block w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600 min-w-0">
            Plan de interés
            <select value={plan} onChange={(e) => (setPlan(e.target.value), setFiltro(null))} className="block w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="">Todos</option>
              {planes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600 min-w-0">
            Responsable
            <select value={responsable} onChange={(e) => (setResponsable(e.target.value), setFiltro(null))} className="block w-full mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="">Todos</option>
              {responsables.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="relative col-span-2 lg:col-span-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={(e) => (setBusca(e.target.value), setFiltro(null))} placeholder="Buscar nombre, celular, DNI o lo que dijo…" className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-200 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {RESULTADOS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => (setResultado(k), setFiltro(null))} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${resultado === k ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
              {l} ({filas ? cuenta(k) : "…"})
            </button>
          ))}
          {hayFiltros && (
            <button type="button" onClick={limpiar} className="px-3 py-1.5 rounded-full text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 flex items-center gap-1 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Quitar filtros
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500">Los indicadores, gráficos, la lista y las descargas (Excel, PDF, Foto, WhatsApp) usan exactamente estos filtros. Toca una barra para afinar la lista.</p>
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

          {/* Lista de personas (lo mismo que se descarga) */}
          <div ref={detalleRef} className="bg-white rounded-2xl border border-slate-200 scroll-mt-4 overflow-hidden">
            <div className="px-3 sm:px-4 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-blue-600" /> {filtro ? filtro.texto : "Registro de interesados"} · {detalle.length} persona{detalle.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-slate-500">Toca una persona para abrir su ficha.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Exportar titulo={`Interesados (CRM)${filtro ? ` · ${filtro.texto}` : ""}`} filtros={filtrosTexto} columnas={columnas} filas={detalle} totales={totales} />
                {filtro && (
                  <button type="button" onClick={() => setFiltro(null)} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer">
                    <X className="w-3.5 h-3.5" /> Quitar barra
                  </button>
                )}
              </div>
            </div>

            {/* Celular: tarjetas */}
            <div className="md:hidden divide-y divide-slate-100">
              {detalle.slice(0, 300).map((p) => {
                const r = resultadoDe(p, hoy);
                return (
                  <button key={p.id} type="button" onClick={() => onAbrirProspecto?.(p.id, p)} className="w-full text-left px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{p.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{p.phone} · {p.planName || "Aún no sabe"}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${ESTADOS[p.status]?.chip || ""}`}>{ESTADOS[p.status]?.label || p.status}</span>
                    </div>
                    <p className={`text-xs font-bold mt-1 ${colorResultado(r)}`}>{r.texto}</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[11px] text-slate-500 truncate">{fechaHora(p.createdAt)} · {p.owner || "Sin responsable"}</span>
                      <Luces p={p} compacto />
                    </div>
                  </button>
                );
              })}
              {!detalle.length && <p className="px-3 py-8 text-center text-sm text-slate-400">No hay interesados con estos filtros.</p>}
            </div>

            {/* PC: tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {["Registro", "Interesado", "Plan de interés", "Estado", "Qué quedó", "Resultado", "Lo que dijo / notas", "Responsable"].map((h) => (
                      <th key={h} className="text-left font-black px-3 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle.slice(0, 500).map((p) => {
                    const r = resultadoDe(p, hoy);
                    const s = situacion(p);
                    return (
                      <tr key={p.id} onClick={() => onAbrirProspecto?.(p.id, p)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer align-top">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fechaHora(p.createdAt)}</td>
                        <td className="px-3 py-2 min-w-[160px]">
                          <p className="font-bold text-slate-900">{p.fullName}</p>
                          <p className="text-xs text-slate-500">{p.phone}{p.dni ? ` · DNI ${p.dni}` : ""} · {ORIGENES[p.source] || p.source}</p>
                        </td>
                        <td className="px-3 py-2 min-w-[120px]">
                          <p>{p.planName || "Aún no sabe"}</p>
                          {p.objective && <p className="text-xs text-slate-500">{p.objective}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${ESTADOS[p.status]?.chip || ""}`}><ConIconos texto={ESTADOS[p.status]?.label || p.status} /></span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 min-w-[120px]">{queQuedo(p) || <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-2 min-w-[140px]">
                          <p className={`font-bold ${colorResultado(r)}`}>{r.texto}</p>
                          {p.lastPass && <p className="text-xs text-slate-500">Pase {p.lastPass.code}{p.passes > 1 ? ` · ${p.passes} pases` : ""}</p>}
                        </td>
                        <td className="px-3 py-2 text-slate-700 min-w-[160px] max-w-[280px]">{loQueDijo(p) || <span className="text-slate-400">—</span>}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <p className="text-xs font-bold text-slate-800">{p.owner || "—"}</p>
                          {p.ownerShift && <p className="text-[11px] text-slate-500">{p.ownerShift}</p>}
                          <div className="mt-1 flex items-center gap-1.5">
                            <Luces p={p} compacto />
                            {s && !["Matriculado", "De baja"].includes(s.texto) && <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-black ${s.tono}`}>{s.texto}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!detalle.length && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-400">No hay interesados con estos filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {detalle.length > 500 && <p className="text-xs text-slate-500 p-2 bg-slate-50">Se muestran 500 de {detalle.length}. La descarga incluye todos.</p>}
          </div>
        </>
      )}
    </div>
  );
};
