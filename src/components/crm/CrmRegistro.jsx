// =====================================================================
// Registro de interesados (CRM)
// Base de datos de todas las personas que preguntaron por el gimnasio:
// sus datos, el plan que les interesa, qué quedaron en hacer y cómo
// terminó (vino, no vino y por qué, se matriculó o se dio de baja).
// Se filtra por fechas y se descarga en Excel o PDF, o se envía al
// WhatsApp del administrador.
// =====================================================================
import React, { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { api } from "../../api/cliente";
import { hoyISO, fechaCorta } from "../../utils/fecha";
import { Exportar } from "../reports/ReportsModule";
import { Luces, LUCES, lucesEncendidas, situacion } from "./Responsable";

const ESTADOS = {
  nuevo: { label: "Nuevo", chip: "bg-sky-100 text-sky-800 border-sky-200" },
  seguimiento: { label: "En seguimiento", chip: "bg-amber-100 text-amber-800 border-amber-200" },
  pase_entregado: { label: "Pase libre entregado", chip: "bg-violet-100 text-violet-800 border-violet-200" },
  matriculado: { label: "Matriculado", chip: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  de_baja: { label: "De baja", chip: "bg-slate-200 text-slate-700 border-slate-300" },
};
const ORIGENES = { visita: "Vino al gimnasio", whatsapp: "WhatsApp", llamada: "Llamada", redes: "Redes sociales", referido: "Referido", web: "Página web", otro: "Otro" };
const CONTACTO = { llamada: "Llamada", whatsapp: "WhatsApp", visita: "Visita" };

const fechaHora = (v) => (v ? `${fechaCorta(v)} ${String(v).slice(11, 16)}`.trim() : "");

/** Qué quedó en hacer: la cita o el contacto agendado */
const queQuedo = (p) =>
  p.contactType && p.contactDate ? `${CONTACTO[p.contactType] || p.contactType} el ${fechaCorta(p.contactDate)}${p.contactTime ? ` a las ${p.contactTime}` : ""}` : "";

/** Cómo terminó: una sola clave para filtrar y un texto para leer */
export const resultadoDe = (p, hoy = hoyISO()) => {
  const x = p.lastPass;
  if (p.status === "matriculado") return { clave: "matriculado", texto: "Se matriculó" };
  if (p.status === "de_baja") return { clave: "baja", texto: "De baja" };
  if (x?.status === "usado") return { clave: "vino", texto: "Vino con su pase" };
  if (x?.status === "no_concretado") return { clave: "no_vino", texto: x.callBackDate ? `No vino · volver a llamar el ${fechaCorta(x.callBackDate)}` : "No vino" };
  if (x?.status === "pendiente" && x.date < hoy) return { clave: "no_vino", texto: "No vino (pase vencido, falta registrar el motivo)" };
  if (x?.status === "pendiente") return { clave: "pendiente", texto: `Pase para el ${fechaCorta(x.date)}${x.time ? ` ${x.time}` : ""}` };
  if (p.contactDate && p.contactDate < hoy) return { clave: "pendiente", texto: "Contacto vencido, sin respuesta" };
  if (p.contactDate) return { clave: "pendiente", texto: "Por contactar" };
  return { clave: "pendiente", texto: "Sin contacto agendado" };
};

/** Lo que dijo: motivo de no venir o de baja, y las notas */
const loQueDijo = (p) =>
  [
    p.lastPass?.reasonLabel ? `${p.lastPass.reasonLabel}${p.lastPass.reason ? `: ${p.lastPass.reason}` : ""}` : "",
    p.status === "de_baja" && p.dropReason ? p.dropReason : "",
    p.notes,
  ]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" · ");

const COLUMNAS = [
  { key: "createdAt", label: "Registro", excel: (p) => fechaHora(p.createdAt) },
  { key: "fullName", label: "Interesado", excel: (p) => `${p.fullName}${p.dni ? ` (DNI ${p.dni})` : ""}` },
  { key: "phone", label: "Celular" },
  { key: "planName", label: "Plan de interés", excel: (p) => p.planName || "Aún no sabe" },
  { key: "objective", label: "Objetivo" },
  { key: "source", label: "Cómo se enteró", excel: (p) => ORIGENES[p.source] || p.source },
  { key: "status", label: "Estado", excel: (p) => ESTADOS[p.status]?.label || p.status },
  { key: "agenda", label: "Qué quedó", excel: queQuedo },
  { key: "pase", label: "Pase libre", excel: (p) => (p.lastPass ? `${p.lastPass.code} · ${fechaCorta(p.lastPass.date)}${p.passes > 1 ? ` (${p.passes} pases)` : ""}` : "") },
  { key: "resultado", label: "Resultado", excel: (p) => resultadoDe(p).texto },
  { key: "dijo", label: "Lo que dijo / notas", excel: loQueDijo },
  { key: "owner", label: "Responsable", excel: (p) => `${p.owner || ""}${p.ownerShift ? ` · ${p.ownerShift}` : ""}` },
  { key: "luces", label: "Luces", excel: (p) => `${lucesEncendidas(p)}/3 · ${LUCES.filter(([k]) => p.lights?.[k]).map(([, l]) => l).join(", ")}${p.secured ? " · Asegurado" : p.free ? " · Libre" : ""}` },
  { key: "registeredBy", label: "Registrado por" },
];

const RESULTADOS = [
  ["todos", "Todos"],
  ["pendiente", "Pendientes"],
  ["vino", "Vinieron"],
  ["no_vino", "No vinieron"],
  ["matriculado", "Se matricularon"],
  ["baja", "De baja"],
];

export const RegistroCrm = ({ onAbrirProspecto }) => {
  const hoy = hoyISO();
  const [desde, setDesde] = useState(`${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("todos");
  const [plan, setPlan] = useState("");
  const [busca, setBusca] = useState("");
  const [responsable, setResponsable] = useState("");

  useEffect(() => {
    setDatos(null);
    api(`/prospectos/registro?desde=${desde}&hasta=${hasta}`)
      .then((d) => (setDatos(d), setError("")))
      .catch((e) => setError(e.message));
  }, [desde, hasta]);

  const rangos = [
    ["Hoy", hoy, hoy],
    ["Últimos 7 días", (() => { const [y, m, d] = hoy.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - 6)).toISOString().slice(0, 10); })(), hoy],
    ["Este mes", `${hoy.slice(0, 7)}-01`, hoy],
    ["Mes pasado", (() => { const [y, m] = hoy.split("-").map(Number); return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10); })(), (() => { const [y, m] = hoy.split("-").map(Number); return new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10); })()],
    ["Este año", `${hoy.slice(0, 4)}-01-01`, hoy],
  ];

  const filas = datos?.filas || [];
  const planes = useMemo(() => [...new Set(filas.map((p) => p.planName || "Aún no sabe"))].sort(), [filas]);
  const responsables = useMemo(() => [...new Set(filas.map((p) => p.owner).filter(Boolean))].sort(), [filas]);
  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return filas.filter((p) => {
      if (resultado !== "todos" && resultadoDe(p, hoy).clave !== resultado) return false;
      if (plan && (p.planName || "Aún no sabe") !== plan) return false;
      if (responsable && p.owner !== responsable) return false;
      return !q || `${p.fullName} ${p.phone} ${p.dni} ${p.notes} ${p.dropReason} ${p.lastPass?.reason || ""}`.toLowerCase().includes(q);
    });
  }, [filas, resultado, plan, responsable, busca, hoy]);
  const cuenta = (k) => (k === "todos" ? filas.length : filas.filter((p) => resultadoDe(p, hoy).clave === k).length);

  const filtrosTexto = [
    `Registrados del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`,
    resultado !== "todos" ? `Resultado: ${RESULTADOS.find((r) => r[0] === resultado)[1]}` : "",
    plan ? `Plan: ${plan}` : "",
    responsable ? `Responsable: ${responsable}` : "",
    busca.trim() ? `Búsqueda: "${busca.trim()}"` : "",
  ].filter(Boolean);
  const totales = [
    ["Interesados", visibles.length],
    ["Se matricularon", visibles.filter((p) => p.status === "matriculado").length],
    ["Vinieron con pase", visibles.filter((p) => p.lastPass?.status === "usado").length],
    ["No vinieron", visibles.filter((p) => resultadoDe(p, hoy).clave === "no_vino").length],
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-blue-600" /> Registro de interesados
          </p>
          <Exportar titulo="Registro de interesados (CRM)" filtros={filtrosTexto} columnas={COLUMNAS} filas={visibles} totales={totales} />
        </div>
        <p className="text-xs text-slate-500">
          Todas las personas que preguntaron por el gimnasio en las fechas elegidas: qué plan les interesa, qué quedaron en hacer y cómo terminó. Se filtra por la fecha en que se registraron.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {rangos.map(([l, a, b]) => (
              <button key={l} type="button" onClick={() => (setDesde(a), setHasta(b))} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${desde === a && hasta === b ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
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
          <label className="text-xs font-bold text-slate-600">
            Plan de interés
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="block mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="">Todos</option>
              {planes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Responsable
            <select value={responsable} onChange={(e) => setResponsable(e.target.value)} className="block mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="">Todos</option>
              {responsables.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nombre, celular, DNI o lo que dijo…" className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-200 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RESULTADOS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setResultado(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${resultado === k ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
              {l} ({datos ? cuenta(k) : "…"})
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
      {!datos && !error && <p className="text-sm text-slate-500">Cargando registro…</p>}
      {datos && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                {["Registro", "Interesado", "Plan de interés", "Estado", "Qué quedó", "Resultado", "Lo que dijo / notas", "Responsable"].map((h) => (
                  <th key={h} className="text-left font-black px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.slice(0, 500).map((p) => {
                const r = resultadoDe(p, hoy);
                return (
                  <tr key={p.id} onClick={() => onAbrirProspecto?.(p.id, p)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fechaHora(p.createdAt)}</td>
                    <td className="px-3 py-2">
                      <p className="font-bold text-slate-900">{p.fullName}</p>
                      <p className="text-xs text-slate-500">{p.phone}{p.dni ? ` · DNI ${p.dni}` : ""} · {ORIGENES[p.source] || p.source}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p>{p.planName || "Aún no sabe"}</p>
                      {p.objective && <p className="text-xs text-slate-500">{p.objective}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${ESTADOS[p.status]?.chip || ""}`}>{ESTADOS[p.status]?.label || p.status}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{queQuedo(p) || <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-2">
                      <p className={`font-bold ${r.clave === "matriculado" || r.clave === "vino" ? "text-emerald-700" : r.clave === "no_vino" ? "text-rose-700" : r.clave === "baja" ? "text-slate-500" : "text-amber-700"}`}>{r.texto}</p>
                      {p.lastPass && <p className="text-xs text-slate-500">Pase {p.lastPass.code}{p.passes > 1 ? ` · ${p.passes} pases` : ""}</p>}
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-[280px]">{loQueDijo(p) || <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <p className="text-xs font-bold text-slate-800">{p.owner || "—"}</p>
                      {p.ownerShift && <p className="text-[11px] text-slate-500">{p.ownerShift}</p>}
                      <div className="mt-1 flex items-center gap-1.5">
                        <Luces p={p} compacto />
                        {situacion(p) && !["Matriculado", "De baja"].includes(situacion(p).texto) && (
                          <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-black ${situacion(p).tono}`}>{situacion(p).texto}</span>
                        )}
                      </div>
                      {p.registeredBy && p.registeredBy !== p.owner && <p className="text-[10px] text-slate-400 mt-0.5">Registró: {p.registeredBy}</p>}
                    </td>
                  </tr>
                );
              })}
              {!visibles.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">No hay interesados registrados con estos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
          {visibles.length > 500 && <p className="text-xs text-slate-500 p-2 bg-slate-50">Se muestran 500 de {visibles.length}. La descarga incluye todos.</p>}
        </div>
      )}
    </div>
  );
};
