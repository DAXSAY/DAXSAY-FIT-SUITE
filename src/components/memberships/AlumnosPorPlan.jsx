// =====================================================================
// ALUMNOS POR PLAN
// Elige uno o varios planes (Pase diario, Mensual, Trimestral...) y ve a
// todas las personas que están en ese plan, con su estado (activo, por
// vencer, vencido, congelado, exalumno), fechas, saldo y teléfono.
// Se puede buscar, filtrar por estado y exportar a Excel / PDF / WhatsApp.
// =====================================================================
import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { Exportar } from "../reports/ReportsModule";
import { colorDePlan } from "../../utils/colorPlan";

const soles = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoyLima = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
const dias = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);
const fecha = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");

const ESTADOS = {
  activo: { label: "Activo", emoji: "✅", tono: "verde" },
  por_vencer: { label: "Por vencer", emoji: "⏳", tono: "ambar" },
  vencido: { label: "Vencido", emoji: "⏰", tono: "rojo" },
  congelado: { label: "Congelado", emoji: "❄️", tono: "azul" },
  exalumno: { label: "Exalumno", emoji: "👋", tono: "plomo" },
};

export const AlumnosPorPlan = ({ planesIniciales = [] }) => {
  const { plans, members, gymConfig } = useGym();
  const plazo = Number(gymConfig?.dias_exalumno) || 30;
  const hoy = hoyLima();
  const ordenados = useMemo(() => [...plans].sort((a, b) => Number(a.durationDays) - Number(b.durationDays) || a.price - b.price), [plans]);
  const [elegidos, setElegidos] = useState(planesIniciales.length ? planesIniciales : ordenados.slice(0, 1).map((p) => p.id));
  const [estado, setEstado] = useState("vigentes");
  const [buscar, setBuscar] = useState("");
  const [orden, setOrden] = useState("vence");

  // Situación de cada alumno según su último plan
  const conEstado = useMemo(
    () =>
      members.map((m) => {
        const fin = m.membershipEndDate ? String(m.membershipEndDate).slice(0, 10) : "";
        const quedan = fin ? dias(hoy, fin) : null;
        let e = "activo";
        if (m.status === "frozen") e = "congelado";
        else if (quedan == null || quedan < 0) e = quedan != null && -quedan > plazo ? "exalumno" : "vencido";
        else if (quedan <= 7) e = "por_vencer";
        return { ...m, _estado: e, _quedan: quedan, _fin: fin };
      }),
    [members, hoy, plazo],
  );
  const porPlan = useMemo(() => {
    const o = {};
    for (const m of conEstado) {
      const k = m.planId || `n:${m.planName}`;
      const x = (o[k] ||= { total: 0, vigentes: 0 });
      x.total += 1;
      if (m._estado === "activo" || m._estado === "por_vencer" || m._estado === "congelado") x.vigentes += 1;
    }
    return o;
  }, [conEstado]);

  const delPlan = conEstado.filter((m) => elegidos.includes(m.planId));
  const cuenta = (e) => delPlan.filter((m) => m._estado === e).length;
  const filas = delPlan
    .filter((m) => {
      if (estado === "vigentes" && !["activo", "por_vencer", "congelado"].includes(m._estado)) return false;
      if (estado !== "vigentes" && estado !== "todos" && m._estado !== estado) return false;
      const q = buscar.trim().toLowerCase();
      if (q && !`${m.fullName} ${m.dni} ${m.codeLabel} ${m.phone}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) =>
      orden === "nombre" ? a.fullName.localeCompare(b.fullName) : orden === "deuda" ? Number(b.debt || 0) - Number(a.debt || 0) : String(a._fin).localeCompare(String(b._fin)),
    )
    .map((m) => ({
      id: m.id,
      codigo: m.codeLabel,
      alumno: m.fullName,
      dni: m.dni,
      telefono: m.phone || "",
      plan: m.planName,
      inicio: fecha(m.membershipStartDate),
      vence: fecha(m._fin),
      quedan: m._quedan == null ? "—" : m._quedan >= 0 ? `${m._quedan} días` : `venció hace ${-m._quedan}`,
      saldo: Number(m.debt || 0),
      estadoTxt: ESTADOS[m._estado].label,
      _e: m._estado,
    }));
  const deuda = filas.reduce((s, f) => s + f.saldo, 0);
  const nombresPlanes = ordenados.filter((p) => elegidos.includes(p.id)).map((p) => p.name);
  const alternar = (id) => setElegidos((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const columnas = [
    { key: "codigo", label: "Código" },
    { key: "alumno", label: "Alumno" },
    { key: "dni", label: "DNI" },
    { key: "telefono", label: "Teléfono" },
    { key: "plan", label: "Plan" },
    { key: "inicio", label: "Inicio" },
    { key: "vence", label: "Vence" },
    { key: "quedan", label: "Le quedan" },
    { key: "saldo", label: "Saldo", excel: (f) => f.saldo },
    { key: "estadoTxt", label: "Estado" },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 items-start">
      {/* Planes para elegir */}
      <aside className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 space-y-2 xl:sticky xl:top-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">💳 Elige uno o varios planes</p>
          <button type="button" onClick={() => setElegidos(elegidos.length === ordenados.length ? [] : ordenados.map((p) => p.id))} className="text-xs font-black text-slate-500 hover:underline cursor-pointer">
            {elegidos.length === ordenados.length ? "Ninguno" : "Todos"}
          </button>
        </div>
        {ordenados.map((p, i) => {
          const on = elegidos.includes(p.id);
          const c = porPlan[p.id] || { total: 0, vigentes: 0 };
          const t = colorDePlan(p, i);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => alternar(p.id)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3 cursor-pointer transition ${on ? "border-slate-400 bg-slate-50 shadow-sm" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] font-black ${on ? "bg-slate-800 border-slate-800 text-white" : "border-slate-300"}`}>{on ? "✓" : ""}</span>
              <span className={`w-2.5 h-9 rounded-full bg-gradient-to-b ${t.acento}`} style={t.estilo} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-slate-800 truncate">{p.name}</span>
                <span className="block text-[11px] font-bold text-slate-500">
                  {soles(p.price)} · {c.vigentes} vigentes · {c.total} en total
                </span>
              </span>
            </button>
          );
        })}
      </aside>

      <div className="xl:col-span-3 space-y-4">
        {/* Resumen del plan elegido */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            ["vigentes", "👥", "Vigentes", cuenta("activo") + cuenta("por_vencer") + cuenta("congelado"), "teal"],
            ["activo", "✅", "Activos", cuenta("activo"), "verde"],
            ["por_vencer", "⏳", "Por vencer", cuenta("por_vencer"), "ambar"],
            ["vencido", "⏰", "Vencidos", cuenta("vencido"), "rojo"],
            ["exalumno", "👋", "Exalumnos", cuenta("exalumno"), "plomo"],
            ["todos", "📋", "Todos", delPlan.length, "violeta"],
          ].map(([k, e, l, n, tono]) => (
            <button
              key={k}
              type="button"
              onClick={() => setEstado(k)}
              className={`rd-kpi-${tono} rd-opcion-t ${estado === k ? "rd-opcion-on" : ""} rounded-2xl px-3 py-2.5 text-left cursor-pointer`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-black">{l}</span>
                <span className="rd-emoji">{e}</span>
              </span>
              <span className="block text-2xl font-black leading-tight">{n}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 justify-between">
            <div>
              <p className="font-black text-slate-900">
                {nombresPlanes.length ? nombresPlanes.join(" · ") : "Elige un plan a la izquierda"}
              </p>
              <p className="text-xs font-bold text-slate-500">
                {filas.length} persona(s) · saldo pendiente {soles(deuda)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre, DNI o código" className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-sm w-56" />
              </div>
              <select value={orden} onChange={(e) => setOrden(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold" aria-label="Ordenar">
                <option value="vence">Ordenar: vence primero</option>
                <option value="nombre">Ordenar: nombre</option>
                <option value="deuda">Ordenar: mayor saldo</option>
              </select>
            </div>
          </div>
          <Exportar
            titulo={`Alumnos del plan: ${nombresPlanes.join(", ") || "—"}`}
            filtros={[`Estado: ${{ vigentes: "Vigentes", todos: "Todos" }[estado] || ESTADOS[estado]?.label}`, buscar && `Búsqueda: ${buscar}`].filter(Boolean)}
            columnas={columnas}
            filas={filas}
            totales={[["Saldo pendiente", soles(deuda)]]}
          />
          <div className="overflow-x-auto max-h-[62vh] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  {columnas.map((c) => (
                    <th key={c.key} className={`py-2.5 px-3 whitespace-nowrap font-black ${c.key === "saldo" ? "text-right" : ""}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => {
                  const e = ESTADOS[f._e];
                  const tel = String(f.telefono).replace(/\D/g, "");
                  return (
                    <tr key={f.id} className={`border-b border-slate-100 ${i % 2 ? "bg-slate-50/50" : ""}`}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-600">{f.codigo}</td>
                      <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap">{f.alumno}</td>
                      <td className="py-2 px-3 text-slate-600">{f.dni}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {tel.length >= 9 ? (
                          <a href={`https://wa.me/${tel.length === 9 ? `51${tel}` : tel}`} target="_blank" rel="noreferrer" className="rd-kpi-verde rd-chip-t inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold">
                            💬 {f.telefono}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{f.plan}</td>
                      <td className="py-2 px-3 text-slate-600">{f.inicio}</td>
                      <td className="py-2 px-3 text-slate-700 font-bold">{f.vence}</td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{f.quedan}</td>
                      <td className={`py-2 px-3 text-right tabular-nums font-bold ${f.saldo > 0 ? "rd-error-t" : "text-slate-500"}`}>{soles(f.saldo)}</td>
                      <td className="py-2 px-3">
                        <span className={`rd-kpi-${e.tono} rd-chip-t inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold whitespace-nowrap`}>
                          <span className="rd-emoji">{e.emoji}</span> {e.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={columnas.length} className="py-10 text-center text-slate-500">
                      {elegidos.length ? "No hay alumnos con este filtro." : "Elige un plan para ver a sus alumnos."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
