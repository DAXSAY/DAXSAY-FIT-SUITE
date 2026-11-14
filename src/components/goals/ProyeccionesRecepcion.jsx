// =====================================================================
// Proyecciones de recepción (Metas & Logros)
// El recepcionista de turno se proyecta cuánto va a vender, cuántas
// matrículas y cuántas renovaciones hará: por cada día (lunes a domingo)
// y para toda la semana. Cada lunes empieza una semana nueva; las
// anteriores quedan en el cuadro para comparar lo proyectado con lo real.
// =====================================================================
import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Save, CalendarDays, History } from "lucide-react";
import { api } from "../../api/cliente";
import { TarjetaKpi } from "../common/TarjetaKpi";

const soles = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaCorta = (f) => {
  const [, m, d] = String(f).split("-");
  return `${Number(d)}/${Number(m)}`;
};
const sumarDias = (f, n) => {
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const pct = (real, proy) => (proy > 0 ? Math.round((real / proy) * 100) : null);
const colorPct = (p) => (p === null ? "text-slate-400" : p >= 100 ? "text-emerald-600" : p >= 70 ? "text-amber-600" : "text-rose-600");
const barraPct = (p) => (p === null ? "bg-slate-200" : p >= 100 ? "bg-emerald-500" : p >= 70 ? "bg-amber-500" : "bg-rose-500");
const vacio = { monto: "", matriculas: "", renovaciones: "", notas: "" };
const aForm = (p) => (p ? { monto: p.monto ?? "", matriculas: p.matriculas ?? "", renovaciones: p.renovaciones ?? "", notas: p.notas || "" } : vacio);
const input = "w-full px-2 py-1.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500";

const Cumplimiento = ({ real, proy }) => {
  const p = pct(real, proy);
  return (
    <div className="min-w-[70px]">
      <p className={`text-xs font-black ${colorPct(p)}`}>{p === null ? "—" : `${p}%`}</p>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-0.5">
        <div className={`h-full ${barraPct(p)}`} style={{ width: `${Math.min(100, p || 0)}%` }} />
      </div>
    </div>
  );
};

/** Fila editable: monto, matrículas, renovaciones y nota */
const FilaProyeccion = ({ etiqueta, sub, resaltar, editable, valor, real, guardando, onGuardar }) => {
  const [f, setF] = useState(aForm(valor));
  useEffect(() => setF(aForm(valor)), [valor]);
  const cambio = JSON.stringify(f) !== JSON.stringify(aForm(valor));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <tr className={`border-t border-slate-100 align-top ${resaltar ? "bg-blue-50/60" : ""}`}>
      <td className="px-3 py-2 whitespace-nowrap">
        <p className="font-bold text-slate-900">{etiqueta}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </td>
      <td className="px-2 py-2 w-[130px]">
        <input type="number" min="0" step="10" inputMode="decimal" value={f.monto} disabled={!editable} onChange={(e) => set("monto", e.target.value)} placeholder="S/" className={input} />
      </td>
      <td className="px-2 py-2 w-[90px]">
        <input type="number" min="0" step="1" inputMode="numeric" value={f.matriculas} disabled={!editable} onChange={(e) => set("matriculas", e.target.value)} placeholder="0" className={input} />
      </td>
      <td className="px-2 py-2 w-[90px]">
        <input type="number" min="0" step="1" inputMode="numeric" value={f.renovaciones} disabled={!editable} onChange={(e) => set("renovaciones", e.target.value)} placeholder="0" className={input} />
      </td>
      <td className="px-2 py-2 min-w-[160px]">
        <input value={f.notas} maxLength={200} disabled={!editable} onChange={(e) => set("notas", e.target.value)} placeholder={editable ? "Ej.: lunes de mucha afluencia" : ""} className={input} />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm">
        {real ? (
          <>
            <p className="font-bold text-slate-900">{soles(real.monto)}</p>
            <p className="text-xs text-slate-500">{real.matriculas} matr. · {real.renovaciones} renov.</p>
          </>
        ) : (
          <span className="text-xs text-slate-400">Aún no llega</span>
        )}
      </td>
      <td className="px-3 py-2">{real && <Cumplimiento real={real.monto} proy={Number(valor?.monto || 0)} />}</td>
      <td className="px-2 py-2 w-[96px]">
        {editable && (
          <button
            type="button"
            disabled={!cambio || guardando}
            onClick={() => onGuardar(f)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            <Save className="w-3.5 h-3.5" /> {guardando ? "…" : "Guardar"}
          </button>
        )}
      </td>
    </tr>
  );
};

export const ProyeccionesRecepcion = () => {
  const [semana, setSemana] = useState(null); // null = semana actual
  const [turno, setTurno] = useState("");
  const [d, setD] = useState(null);
  // ¿Proyectar la semana completa de una vez o día por día? (se recuerda en este equipo)
  const [modo, setModoEstado] = useState(() => {
    try {
      return localStorage.getItem("radical_proy_modo") || "";
    } catch {
      return "";
    }
  });
  const setModo = (m) => {
    setModoEstado(m);
    try {
      localStorage.setItem("radical_proy_modo", m);
    } catch {
      /* nada */
    }
  };
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(null);
  const [aviso, setAviso] = useState("");

  const cargar = () => {
    const q = new URLSearchParams();
    if (semana) q.set("semana", semana);
    if (turno) q.set("turno", turno);
    api(`/metas/proyecciones?${q}`)
      .then((r) => (setD(r), setError("")))
      .catch((e) => setError(e.message));
  };
  useEffect(cargar, [semana, turno]);

  const guardar = async (dia, f) => {
    setGuardando(dia);
    setAviso("");
    try {
      const r = await api("/metas/proyecciones", { method: "PUT", body: { semana: d.semana.inicio, dia, turno: d.turno.id, ...f } });
      setD(r);
      setAviso(dia === 0 ? "Proyección de la semana guardada." : "Proyección del día guardada.");
    } catch (e) {
      setAviso(e.message);
    } finally {
      setGuardando(null);
    }
  };

  if (error) return <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>;
  if (!d) return <p className="text-sm text-slate-500">Cargando proyecciones…</p>;
  const hoyDia = d.dias.find((x) => x.esHoy);
  const ps = d.semanal.proyeccion;
  // Si no eligió, se muestra lo que ya tiene cargado (días si proyectó algún día)
  const modoVista = modo || (d?.dias?.some((x) => x.proyeccion?.monto != null) ? "dias" : "semana");

  return (
    <div className="space-y-4">
      {/* Semana y turno */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setSemana(sumarDias(d.semana.inicio, -7))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer" title="Semana anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-lg font-black text-slate-900">{d.semana.texto}</p>
          <p className="text-xs text-slate-500">
            Del lunes {fechaCorta(d.semana.inicio)} al domingo {fechaCorta(d.semana.fin)} · {d.turno.nombre}
            {d.semana.actual ? " · semana actual" : d.semana.futura ? " · semana que viene" : ""}
          </p>
        </div>
        <button type="button" onClick={() => setSemana(sumarDias(d.semana.inicio, 7))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer" title="Semana siguiente">
          <ChevronRight className="w-4 h-4" />
        </button>
        {!d.semana.actual && (
          <button type="button" onClick={() => setSemana(null)} className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold cursor-pointer">
            Ir a esta semana
          </button>
        )}
        {d.admin && d.turnos.length > 0 && (
          <label className="ml-auto text-xs font-bold text-slate-600">
            Turno de recepción
            <select value={d.turno.id} onChange={(e) => setTurno(e.target.value)} className="block mt-0.5 px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
              {d.turnos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* La pregunta de cada semana */}
      {(d.faltaHoy || d.faltaSemana) && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> {d.semana.texto}: ¿cuáles son tus proyecciones
            {d.faltaHoy && hoyDia ? ` para hoy ${hoyDia.nombre.toLowerCase()} ${fechaCorta(hoyDia.fecha)}` : ""}
            {d.faltaHoy && d.faltaSemana ? " y" : ""}
            {d.faltaSemana ? " para esta semana" : ""}?
          </p>
          <p className="text-xs text-amber-800 mt-1">Escribe cuánto esperas vender y cuántas matrículas y renovaciones harás. Al final del día y de la semana verás cuánto lograste.</p>
        </div>
      )}

      {/* Meta del mes y lo vendido (mismo estilo que el Dashboard general) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <TarjetaKpi
          titulo="Meta del mes"
          valor={d.meta?.monto || 0}
          decimales={2}
          prefijo="S/ "
          sub={d.meta ? `Del ${fechaCorta(d.meta.desde)} al ${fechaCorta(d.meta.hasta)}` : "Administración aún no la define"}
          tono="ambar"
        />
        <TarjetaKpi
          titulo="Para cumplirla, esta semana"
          valor={d.meta?.sugeridoSemana || 0}
          decimales={2}
          prefijo="S/ "
          sub={d.meta ? `Unos ${soles(d.meta.sugeridoDia)} por día` : "—"}
          tono="azul"
        />
        <TarjetaKpi
          titulo="Proyectado esta semana"
          valor={Number(ps?.monto ?? d.sumaDiaria.monto) || 0}
          decimales={2}
          prefijo="S/ "
          sub={`${ps?.matriculas ?? d.sumaDiaria.matriculas} matrículas · ${ps?.renovaciones ?? d.sumaDiaria.renovaciones} renovaciones`}
          tono="violeta"
          serie={d.dias.map((x) => Number(x.proyeccion?.monto || 0))}
        />
        <TarjetaKpi
          titulo="Vendido esta semana"
          valor={d.semanal.real.monto}
          decimales={2}
          prefijo="S/ "
          sub={`${d.semanal.real.matriculas} matrículas · ${d.semanal.real.renovaciones} renovaciones`}
          tono="verde"
          serie={d.dias.filter((x) => x.real).map((x) => x.real.monto)}
        />
      </div>

      {/* Proyección de la semana + los 7 días */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <div className="px-4 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-blue-600" /> Proyecciones de la semana
          </p>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1" role="tablist" aria-label="Cómo proyectar">
            {[
              ["semana", "Una meta para toda la semana"],
              ["dias", "Personalizar día por día"],
            ].map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setModo(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${modoVista === k ? "bg-white text-blue-800 shadow" : "text-slate-600"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {aviso && <p className="text-xs font-bold text-slate-600">{aviso}</p>}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Proyección</th>
              <th className="text-left px-2 py-2">Venta S/</th>
              <th className="text-left px-2 py-2">Matrículas</th>
              <th className="text-left px-2 py-2">Renovaciones</th>
              <th className="text-left px-2 py-2">Nota</th>
              <th className="text-left px-3 py-2">Real</th>
              <th className="text-left px-3 py-2">Cumplido</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {modoVista === "semana" && (
            <FilaProyeccion
              etiqueta="Toda la semana"
              sub={`${fechaCorta(d.semana.inicio)} – ${fechaCorta(d.semana.fin)}`}
              resaltar
              editable={d.semanal.editable}
              valor={ps}
              real={d.semana.futura ? null : d.semanal.real}
              guardando={guardando === 0}
              onGuardar={(f) => guardar(0, f)}
            />
            )}
            {modoVista === "dias" && d.dias.map((x) => (
              <FilaProyeccion
                key={x.fecha}
                etiqueta={`${x.nombre}${x.esHoy ? " · hoy" : ""}`}
                sub={fechaCorta(x.fecha)}
                resaltar={x.esHoy}
                editable={x.editable}
                valor={x.proyeccion}
                real={x.real}
                guardando={guardando === x.dia}
                onGuardar={(f) => guardar(x.dia, f)}
              />
            ))}
          </tbody>
          {modoVista === "dias" && (
          <tfoot className="bg-slate-50 text-sm">
            <tr className="border-t border-slate-200">
              <td className="px-3 py-2 font-black text-slate-700">Suma de los días</td>
              <td className="px-2 py-2 font-bold">{soles(d.sumaDiaria.monto)}</td>
              <td className="px-2 py-2 font-bold">{d.sumaDiaria.matriculas}</td>
              <td className="px-2 py-2 font-bold">{d.sumaDiaria.renovaciones}</td>
              <td className="px-2 py-2 text-xs text-slate-500">
                {ps?.monto != null && Math.abs(Number(ps.monto) - d.sumaDiaria.monto) >= 1 ? `La proyección semanal es ${soles(ps.monto)}` : ""}
              </td>
              <td className="px-3 py-2 font-bold">{d.semana.futura ? "—" : soles(d.semanal.real.monto)}</td>
              <td className="px-3 py-2">{!d.semana.futura && <Cumplimiento real={d.semanal.real.monto} proy={Number(ps?.monto ?? d.sumaDiaria.monto)} />}</td>
              <td />
            </tr>
          </tfoot>
          )}
        </table>
        <p className="px-4 py-2 text-xs text-slate-500">
          Lo real se toma de la caja de este turno: ingresos cobrados, matrículas nuevas y renovaciones. Las matrículas de interesados del CRM suman al turno de su responsable, aunque las cobre otro turno. {d.admin ? "Administración puede corregir cualquier día." : "Puedes proyectar hoy y los días que vienen; los días pasados quedan guardados."}
        </p>
      </div>

      {/* Cuadro de semanas */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <p className="px-4 pt-4 pb-2 text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <History className="w-4 h-4 text-violet-600" /> Semanas anteriores
        </p>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              {["Semana", "Proyección semanal", "Suma de los días", "Real", "Cumplido", "Matrículas (proy. / real)", "Renovaciones (proy. / real)"].map((h) => (
                <th key={h} className="text-left px-3 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.historial.map((s) => {
              const proy = s.semanal?.monto ?? s.sumaDiaria?.monto ?? null;
              const pm = s.semanal?.matriculas ?? s.sumaDiaria?.matriculas;
              const pr = s.semanal?.renovaciones ?? s.sumaDiaria?.renovaciones;
              return (
                <tr key={s.inicio} onClick={() => setSemana(s.inicio)} className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${s.inicio === d.semana.inicio ? "bg-blue-50/60" : ""}`}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <p className="font-bold text-slate-900">{s.etiqueta}{s.actual ? " · actual" : ""}</p>
                    <p className="text-xs text-slate-500">{fechaCorta(s.inicio)} – {fechaCorta(s.fin)}</p>
                  </td>
                  <td className="px-3 py-2">{s.semanal?.monto != null ? soles(s.semanal.monto) : <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2">{s.sumaDiaria ? `${soles(s.sumaDiaria.monto)} (${s.diasProyectados} días)` : <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2 font-bold">{soles(s.real.monto)}</td>
                  <td className="px-3 py-2">{proy !== null ? <Cumplimiento real={s.real.monto} proy={Number(proy)} /> : <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2">{pm ?? "—"} / {s.real.matriculas}</td>
                  <td className="px-3 py-2">{pr ?? "—"} / {s.real.renovaciones}</td>
                </tr>
              );
            })}
            {!d.historial.length && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">Todavía no hay semanas proyectadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
