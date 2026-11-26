// =====================================================================
// PROGRESO DE PESOS POR SERIE
//  modo "alumno":   anota sus pesos, ve su cuadro semanal / mensual,
//                   su progreso por ejercicio y descarga PDF / Excel.
//  modo "personal": entrenador, administración y recepción ven el mismo
//                   progreso con alertas (bajó, no registra). El entrenador
//                   (permiso de editar rutinas) también puede anotar.
// =====================================================================
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { api } from "../../api/cliente";
import {
  DIAS_SEMANA, ESTILO_TENDENCIA, UMBRAL, analizarEjercicios, diaSugerido, fechaBonita, kg, lunesDe, masMenos,
  mesBonito, pct, repsBase, resumenGeneral, sumar, tendencia, textoMejor, textoReps, textoSeries,
} from "../../utils/progreso";
import { exportarExcelProgreso, exportarPdfProgreso } from "./exportarProgreso";
import GraficosProgreso from "./GraficosProgreso";
import { filasRegistro, InsigniaMetodo } from "../routines/SistemasEntrenamiento";
import { IconoEmoji } from "../common/IconoEmoji";

// Casillas que anota el alumno según el sistema del ejercicio (rest-pause, drop set, HIIT…)
const UNIDAD = { reps: "reps", seg: "seg", rondas: "rondas", min: "min", saltos: "saltos" };
const plantillaDe = (ex) => filasRegistro({ series: ex.series, reps: ex.reps, metodo: ex.metodo }).filas;

const Chip = ({ t, children }) => {
  const e = ESTILO_TENDENCIA[t] || ESTILO_TENDENCIA.nuevo;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${e.clase}`}>
      <span><IconoEmoji e={e.icono} /></span>
      {children ?? e.texto}
    </span>
  );
};

const Tarjeta = ({ titulo, valor, detalle, tono = "slate" }) => {
  const tonos = {
    slate: "bg-white border-slate-200",
    verde: "bg-emerald-50 border-emerald-200",
    rojo: "bg-rose-50 border-rose-200",
    azul: "bg-blue-50 border-blue-200",
    ambar: "bg-amber-50 border-amber-200",
  };
  return (
    <div className={`rounded-2xl border ${tonos[tono]} p-4`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className="text-2xl font-black text-slate-900 mt-1 leading-tight">{valor}</p>
      {detalle && <p className="text-xs text-slate-500 mt-1">{detalle}</p>}
    </div>
  );
};

const Pestana = ({ activa, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all ${
      activa ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-white"
    }`}
  >
    {children}
  </button>
);

/* ----------------------------- ANOTAR ----------------------------- */
function Anotar({ datos, resumen, fechaInicial, onGuardado, esAlumno }) {
  const plan = datos.plan;
  const hoy = datos.hoy;
  const minimo = datos.diasAtras ? sumar(hoy, -datos.diasAtras) : "2000-01-01";
  const [fecha, setFecha] = useState(fechaInicial || hoy);
  const [dia, setDia] = useState(() => diaSugerido(plan, resumen.sesiones));
  const [valores, setValores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    if (fechaInicial) setFecha(fechaInicial);
  }, [fechaInicial]);

  // Si ya anotó ese día, se abre el día de la rutina que hizo
  useEffect(() => {
    const ya = resumen.sesiones.find((s) => s.fecha === fecha && s.dia);
    if (ya && plan) {
      const i = plan.dias.findIndex((d) => d.nombre === ya.dia);
      if (i >= 0) setDia(i);
    }
  }, [fecha]); // eslint-disable-line react-hooks/exhaustive-deps

  const diaPlan = plan?.dias?.[dia];

  // Valores iniciales: lo ya anotado ese día; si no, casillas vacías según el plan
  useEffect(() => {
    if (!diaPlan) return;
    const nuevo = {};
    for (const ex of diaPlan.ejercicios) {
      const hecho = resumen.sesiones.find((s) => s.fecha === fecha && s.clave === ex.clave);
      const n = Math.max(plantillaDe(ex).length, hecho?.series.length || 0);
      nuevo[ex.clave] = Array.from({ length: n }, (_, i) => {
        const x = hecho?.series.find((y) => y.serie === i + 1);
        return { peso: x ? String(x.peso) : "", reps: x?.reps != null ? String(x.reps) : "" };
      });
    }
    setValores(nuevo);
    setAviso(null);
  }, [fecha, dia, datos]); // eslint-disable-line react-hooks/exhaustive-deps

  const anterior = (clave) => [...resumen.sesiones].reverse().find((s) => s.clave === clave && s.fecha < fecha);

  const cambiar = (clave, i, campo, v) =>
    setValores((prev) => ({ ...prev, [clave]: prev[clave].map((s, j) => (j === i ? { ...s, [campo]: v } : s)) }));

  const repetirAnterior = (ex) => {
    const a = anterior(ex.clave);
    if (!a) return;
    setValores((prev) => ({
      ...prev,
      [ex.clave]: prev[ex.clave].map((s, i) => {
        const x = a.series[i] || a.series[a.series.length - 1];
        return { peso: s.peso || String(x.peso), reps: s.reps || (x.reps != null ? String(x.reps) : "") };
      }),
    }));
  };

  const guardar = async () => {
    setGuardando(true);
    setAviso(null);
    try {
      const ejercicios = diaPlan.ejercicios.map((ex) => ({
        clave: ex.clave,
        nombre: ex.nombre,
        grupo: ex.grupo,
        seriesPlan: ex.series,
        repsPlan: ex.reps,
        series: (valores[ex.clave] || []).map((s, i) => {
          const f = plantillaDe(ex)[i];
          // Sin carga (segundos, rondas, minutos, saltos): el peso se guarda en 0
          const peso = f && !f.kg ? (s.reps === "" ? "" : 0) : s.peso === "" ? "" : s.peso;
          return { peso, reps: s.reps === "" ? "" : Number(s.reps) };
        }),
      }));
      const r = await api(`/progreso/${datos.alumno.id}/sesion`, { method: "PUT", body: { fecha, dia: diaPlan.nombre, ejercicios } });
      setAviso({ ok: true, texto: r.series ? `Guardado: ${r.series} series del ${fechaBonita(fecha)}.` : "Se borró lo anotado de ese día." });
      onGuardado?.();
      window.dispatchEvent(new Event("radical:avisos"));
    } catch (e) {
      setAviso({ ok: false, texto: e.message });
    } finally {
      setGuardando(false);
    }
  };

  if (!plan || !plan.dias.length)
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-base font-bold text-slate-800">{esAlumno ? "Aún no tienes una rutina asignada" : "El alumno aún no tiene rutina asignada"}</p>
        <p className="text-sm text-slate-500 mt-1">Cuando el entrenador la asigne, aquí aparecerán sus ejercicios para anotar los pesos.</p>
      </div>
    );

  const anotadas = Object.values(valores).flat().filter((s) => s.peso !== "" || s.reps !== "").length;
  const totalPlan = diaPlan?.ejercicios.reduce((t, e) => t + plantillaDe(e).length, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Fecha que entrenaste
            <input
              type="date"
              value={fecha}
              min={minimo}
              max={hoy}
              onChange={(e) => e.target.value && setFecha(e.target.value)}
              className="block mt-1 px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900"
            />
          </label>
          <div className="flex gap-1.5">
            {[0, -1, -2].map((n) => {
              const f = sumar(hoy, n);
              return (
                <button
                  key={n}
                  onClick={() => setFecha(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    fecha === f ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-300 text-slate-700"
                  }`}
                >
                  {n === 0 ? "Hoy" : n === -1 ? "Ayer" : fechaBonita(f)}
                </button>
              );
            })}
          </div>
          {datos.asistencias.includes(fecha) && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">✓ Asistencia marcada ese día</span>
          )}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase mb-1.5">¿Qué día de tu rutina hiciste?</p>
          <div className="flex flex-wrap gap-2">
            {plan.dias.map((d, i) => (
              <button
                key={i}
                onClick={() => setDia(i)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border cursor-pointer ${
                  i === dia ? "bg-blue-600 text-white border-blue-600 shadow" : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                }`}
              >
                {d.nombre}
                {i === diaSugerido(plan, resumen.sesiones) && <span className="ml-1.5 text-[10px] font-black opacity-90">• te toca</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Si faltaste un día, no pasa nada: elige el día de la rutina que realmente hiciste y sigue el orden.
          </p>
        </div>
      </div>

      {diaPlan.ejercicios.map((ex) => {
        const ant = anterior(ex.clave);
        const filas = valores[ex.clave] || [];
        const actual = filas.filter((s) => s.peso !== "");
        const mejorHoy = actual.length ? Math.max(...actual.map((s) => Number(s.peso) * (1 + (Number(s.reps) || repsBase(ex.reps) || 1) / 30))) : null;
        const t = ant && mejorHoy ? tendencia(((mejorHoy - ant.fuerza) / ant.fuerza) * 100) : null;
        return (
          <div key={ex.clave} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-base font-extrabold text-slate-900">{ex.nombre}</h4>
                <p className="text-xs text-slate-500">
                  Indicado: <b className="text-slate-800">{ex.series} series × {ex.reps || "—"} reps</b>
                  {ex.notas ? ` · ${ex.notas}` : ""}
                </p>
                {ex.metodo && (
                  <div className="mt-1.5 space-y-1">
                    <InsigniaMetodo metodo={ex.metodo} etiqueta={ex.metodo.grupo || ""} />
                    <p className="text-[11px] text-emerald-700 font-semibold"><IconoEmoji e="✍️" /> Anota {filasRegistro({ series: ex.series, reps: ex.reps, metodo: ex.metodo }).anota}.</p>
                  </div>
                )}
              </div>
              {t && <Chip t={t}>{ESTILO_TENDENCIA[t].texto} vs. la vez pasada</Chip>}
            </div>
            {ant && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                <span>
                  La vez pasada ({fechaBonita(ant.fecha)}): <b>{textoSeries(ant)}</b> · reps {textoReps(ant)}
                </span>
                <button onClick={() => repetirAnterior(ex)} className="ml-auto text-blue-700 font-bold cursor-pointer hover:underline">
                  Usar esos pesos
                </button>
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
              {filas.map((s, i) => {
                const pl = plantillaDe(ex)[i];
                const conKg = !pl || pl.kg;
                const unidad = UNIDAD[pl?.campo] || "reps";
                return (
                <div key={i} className={`rounded-xl border p-1.5 sm:p-2.5 ${s.peso !== "" || (!conKg && s.reps !== "") ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"}`}>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase mb-1 truncate">
                    {pl ? pl.etiqueta.replace(/^serie\s*/i, "S") : `S${i + 1}`}
                    {!pl && <span className="text-amber-600"> · extra</span>}
                    {pl?.objetivo && <span className="normal-case font-semibold text-slate-400"> · {pl.objetivo}</span>}
                  </p>
                  <div className="flex items-center gap-1">
                    {conKg && (<>
                    <input
                      inputMode="decimal"
                      value={s.peso}
                      onChange={(e) => cambiar(ex.clave, i, "peso", e.target.value.replace(/[^0-9.,]/g, ""))}
                      placeholder="kg"
                      className="w-full min-w-0 px-1 py-1.5 sm:px-2 sm:py-2 rounded-lg border border-slate-300 text-base font-black text-slate-900 text-center"
                      aria-label={`${ex.nombre} serie ${i + 1} peso en kg`}
                    />
                    <span className="text-xs text-slate-400 font-bold">×</span>
                    </>)}
                    <input
                      inputMode="numeric"
                      value={s.reps}
                      onChange={(e) => cambiar(ex.clave, i, "reps", e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder={conKg ? String(repsBase(pl?.objetivo || ex.reps) ?? "reps") : unidad}
                      className={`${conKg ? "w-11 sm:w-16" : "w-full"} px-1 py-1.5 sm:px-2 sm:py-2 rounded-lg border border-slate-300 text-base font-bold text-slate-900 text-center`}
                      aria-label={`${ex.nombre} serie ${i + 1} repeticiones`}
                    />
                    {!conKg && <span className="text-xs text-slate-500 font-bold">{unidad}</span>}
                  </div>
                </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-3 text-xs">
              {filas.length < 40 && (
                <button
                  onClick={() => setValores((p) => ({ ...p, [ex.clave]: [...p[ex.clave], { peso: "", reps: "" }] }))}
                  className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  + Serie extra
                </button>
              )}
              {filas.length > plantillaDe(ex).length && (
                <button
                  onClick={() => setValores((p) => ({ ...p, [ex.clave]: p[ex.clave].slice(0, -1) }))}
                  className="font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                >
                  − Quitar serie extra
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div className="sticky bottom-3 z-10 bg-slate-900 text-white rounded-2xl p-3 flex flex-wrap items-center gap-3 shadow-xl">
        <div className="text-sm">
          <b>{anotadas}</b> de {totalPlan} series anotadas · {diaPlan.nombre} · {fechaBonita(fecha)}
          {aviso && <p className={`text-xs mt-0.5 font-semibold ${aviso.ok ? "text-emerald-300" : "text-rose-300"}`}>{aviso.texto}</p>}
        </div>
        <button
          onClick={guardar}
          disabled={guardando}
          className="ml-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black cursor-pointer"
        >
          {guardando ? "Guardando..." : "Guardar sesión"}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- SEMANA ----------------------------- */
function filasEjercicios(plan, sesiones) {
  const vistos = new Map();
  (plan?.dias || []).forEach((d) => d.ejercicios.forEach((e) => !vistos.has(e.clave) && vistos.set(e.clave, e.nombre)));
  sesiones.forEach((s) => !vistos.has(s.clave) && vistos.set(s.clave, s.nombre));
  return [...vistos.entries()].map(([clave, nombre]) => ({ clave, nombre }));
}

function VistaSemana({ datos, resumen, onAnotar }) {
  const [lunes, setLunes] = useState(() => lunesDe(datos.hoy));
  const dias = Array.from({ length: 7 }, (_, i) => sumar(lunes, i));
  const enSemana = resumen.sesiones.filter((s) => s.fecha >= dias[0] && s.fecha <= dias[6]);
  const filas = filasEjercicios(datos.plan, enSemana).filter(
    (f) => enSemana.some((s) => s.clave === f.clave) || (datos.plan?.dias || []).some((d) => d.ejercicios.some((e) => e.clave === f.clave)),
  );
  const primera = resumen.primera ? lunesDe(resumen.primera) : null;
  const numSemana = primera ? Math.floor((new Date(lunes) - new Date(primera)) / (7 * 86400000)) + 1 : null;
  const previaDe = (s) => {
    const lista = resumen.sesiones.filter((x) => x.clave === s.clave && x.fecha < s.fecha);
    return lista[lista.length - 1];
  };
  const semAnt = resumen.sesiones.filter((s) => s.fecha >= sumar(lunes, -7) && s.fecha < lunes);
  const mejor = (arr, clave) => arr.filter((s) => s.clave === clave).reduce((m, s) => (!m || s.fuerza > m.fuerza ? s : m), null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setLunes(sumar(lunes, -7))} className="px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold cursor-pointer">‹</button>
        <div className="flex-1 text-center">
          <p className="text-sm font-black text-slate-900">
            {numSemana && numSemana > 0 ? `Semana ${numSemana}` : "Semana"} · {fechaBonita(dias[0])} al {fechaBonita(dias[6])}
          </p>
          <p className="text-xs text-slate-500">{enSemana.length ? `${new Set(enSemana.map((s) => s.fecha)).size} días entrenados` : "Sin registros esta semana"}</p>
        </div>
        <button
          onClick={() => setLunes(sumar(lunes, 7))}
          disabled={sumar(lunes, 7) > datos.hoy}
          className="px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold cursor-pointer disabled:opacity-40"
        >
          ›
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
              <th className="text-left p-3 sticky left-0 bg-slate-50 w-52">Ejercicio</th>
              {dias.map((d, i) => (
                <th key={d} className={`p-2 text-center ${d === datos.hoy ? "text-blue-700" : ""}`}>
                  {DIAS_SEMANA[i]}
                  <span className="block text-[11px] font-semibold normal-case">{fechaBonita(d)}</span>
                  {datos.asistencias.includes(d) && <span className="block text-[10px] text-emerald-600 normal-case">vino</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave} className="border-t border-slate-100">
                <td className="p-3 font-bold text-slate-800 sticky left-0 bg-white">{f.nombre}</td>
                {dias.map((d) => {
                  const s = enSemana.find((x) => x.fecha === d && x.clave === f.clave);
                  if (!s) {
                    const pendiente = datos.asistencias.includes(d) && !resumen.fechas.includes(d);
                    return (
                      <td key={d} className={`p-2 text-center ${d === datos.hoy ? "bg-blue-50/40" : ""}`}>
                        {pendiente ? (
                          onAnotar ? (
                            <button onClick={() => onAnotar(d)} className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 cursor-pointer">
                              Anotar
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-700">sin anotar</span>
                          )
                        ) : (
                          <span className="text-slate-200">·</span>
                        )}
                      </td>
                    );
                  }
                  const p = previaDe(s);
                  const t = p ? tendencia(((s.fuerza - p.fuerza) / (p.fuerza || 1)) * 100) : "nuevo";
                  return (
                    <td key={d} className={`p-2 text-center align-top ${d === datos.hoy ? "bg-blue-50/40" : ""}`}>
                      <div
                        className="rounded-xl border px-2 py-1.5"
                        style={{ borderColor: `color-mix(in srgb, ${ESTILO_TENDENCIA[t].color} 33%, transparent)`, background: `color-mix(in srgb, ${ESTILO_TENDENCIA[t].color} 5%, transparent)` }}
                        title={`${s.dia || ""} · Plan ${s.seriesPlan || "?"}×${s.repsPlan || "?"} · Fuerza estimada ${kg(s.fuerza)}`}
                      >
                        <p className="text-[12px] font-black text-slate-900 leading-tight">{textoSeries(s)}</p>
                        <p className="text-[11px] text-slate-500">× {textoReps(s)}</p>
                        <p className="text-[11px] font-bold" style={{ color: ESTILO_TENDENCIA[t].color }}>
                          {ESTILO_TENDENCIA[t].icono} {p ? masMenos(s.pesoMax - p.pesoMax) : "inicio"}
                        </p>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {!filas.length && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">Sin ejercicios para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {enSemana.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-black text-slate-900 mb-2">Esta semana vs. la semana anterior (mejor serie)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filas.map((f) => {
              const a = mejor(enSemana, f.clave);
              const b = mejor(semAnt, f.clave);
              if (!a) return null;
              const d = b ? ((a.fuerza - b.fuerza) / (b.fuerza || 1)) * 100 : null;
              return (
                <div key={f.clave} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-700 truncate">{f.nombre}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {b ? textoMejor(b) : "—"} → <b className="text-slate-900">{textoMejor(a)}</b>
                  </span>
                  <Chip t={tendencia(d)}>{b ? pct(d) : "nuevo"}</Chip>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- MES ----------------------------- */
function VistaMes({ datos, resumen }) {
  const [mes, setMes] = useState(datos.hoy.slice(0, 7));
  const moverMes = (n) => {
    const [a, m] = mes.split("-").map(Number);
    const d = new Date(Date.UTC(a, m - 1 + n, 1));
    setMes(d.toISOString().slice(0, 7));
  };
  const inicioMes = `${mes}-01`;
  const semanas = [];
  for (let l = lunesDe(inicioMes); l.slice(0, 7) <= mes; l = sumar(l, 7)) semanas.push(l);
  const enMes = resumen.sesiones.filter((s) => s.fecha.slice(0, 7) === mes);
  const filas = filasEjercicios(null, enMes);
  const ejercicios = analizarEjercicios(resumen.sesiones);
  const [a, m] = mes.split("-").map(Number);
  const mesAnt = new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 7);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => moverMes(-1)} className="px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold cursor-pointer">‹</button>
        <div className="flex-1 text-center">
          <p className="text-sm font-black text-slate-900 capitalize">{mesBonito(mes)}</p>
          <p className="text-xs text-slate-500">{new Set(enMes.map((s) => s.fecha)).size} días entrenados</p>
        </div>
        <button
          onClick={() => moverMes(1)}
          disabled={mes >= datos.hoy.slice(0, 7)}
          className="px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold cursor-pointer disabled:opacity-40"
        >
          ›
        </button>
      </div>
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
              <th className="text-left p-3 w-52">Ejercicio</th>
              {semanas.map((l, i) => (
                <th key={l} className="p-2 text-center">
                  Sem. {i + 1}
                  <span className="block text-[11px] font-semibold normal-case">
                    {fechaBonita(l)} – {fechaBonita(sumar(l, 6))}
                  </span>
                </th>
              ))}
              <th className="p-2 text-center">vs. {mesBonito(mesAnt)}</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const ej = ejercicios.find((e) => e.clave === f.clave);
              const esteMes = ej?.meses.find((x) => x.clave === mes);
              const antes = ej?.meses.find((x) => x.clave === mesAnt);
              const dMes = esteMes && antes ? ((esteMes.mejor.fuerza - antes.mejor.fuerza) / (antes.mejor.fuerza || 1)) * 100 : null;
              let previa = null;
              return (
                <tr key={f.clave} className="border-t border-slate-100">
                  <td className="p-3 font-bold text-slate-800">{f.nombre}</td>
                  {semanas.map((l) => {
                    const sem = ej?.semanas.find((x) => x.clave === l);
                    if (!sem) return <td key={l} className="p-2 text-center text-slate-200">·</td>;
                    const t = previa ? tendencia(((sem.mejor.fuerza - previa) / (previa || 1)) * 100) : "nuevo";
                    previa = sem.mejor.fuerza;
                    return (
                      <td key={l} className="p-2 text-center">
                        <p className="font-black text-slate-900">{textoMejor(sem.mejor)}</p>
                        <p className="text-[11px] text-slate-500">{sem.sesiones.length} sesión{sem.sesiones.length > 1 ? "es" : ""}</p>
                        <p className="text-[11px] font-bold" style={{ color: ESTILO_TENDENCIA[t].color }}>
                          {ESTILO_TENDENCIA[t].icono} {ESTILO_TENDENCIA[t].texto}
                        </p>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    <Chip t={tendencia(dMes)}>{antes ? pct(dMes) : "sin datos"}</Chip>
                  </td>
                </tr>
              );
            })}
            {!filas.length && (
              <tr>
                <td colSpan={semanas.length + 2} className="p-8 text-center text-slate-400">Sin registros en este mes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">En cada semana se muestra la mejor serie (peso × repeticiones).</p>
    </div>
  );
}

/* ----------------------------- POR EJERCICIO ----------------------------- */
function VistaEjercicio({ resumen }) {
  const lista = resumen.ejercicios;
  const [sel, setSel] = useState(lista[0]?.clave || null);
  const ej = lista.find((e) => e.clave === sel) || lista[0];
  if (!ej) return <p className="text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 p-8 text-center">Aún no hay pesos registrados.</p>;
  const corporal = ej.corporal;
  const datosGrafico = ej.sesiones.map((s) =>
    corporal
      ? { fecha: fechaBonita(s.fecha), "Repeticiones totales": s.repsTot }
      : { fecha: fechaBonita(s.fecha), "Fuerza estimada": Math.round(s.fuerza * 10) / 10, "Peso máximo": s.pesoMax },
  );
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-2 space-y-1 max-h-[520px] overflow-y-auto">
        {lista.map((e) => (
          <button
            key={e.clave}
            onClick={() => setSel(e.clave)}
            className={`w-full text-left px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between gap-2 ${
              e.clave === ej.clave ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-700"
            }`}
          >
            <span className="text-sm font-bold truncate">{e.nombre}</span>
            <span style={{ color: e.clave === ej.clave ? "#fff" : ESTILO_TENDENCIA[e.tendencia].color }} className="text-xs font-black">
              {ESTILO_TENDENCIA[e.tendencia].icono}
            </span>
          </button>
        ))}
      </div>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="text-lg font-black text-slate-900">{ej.nombre}</h4>
            <Chip t={ej.tendencia} />
          </div>
          {corporal && (
            <p className="text-xs text-slate-500 mb-2">Ejercicio con peso corporal: el progreso se mide por repeticiones totales.</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Tarjeta titulo="Inicio" valor={corporal ? `${ej.inicio.repsTot} reps` : kg(ej.inicio.pesoMax)} detalle={fechaBonita(ej.inicio.fecha)} />
            <Tarjeta titulo="Última" valor={corporal ? `${ej.ultima.repsTot} reps` : kg(ej.ultima.pesoMax)} detalle={fechaBonita(ej.ultima.fecha)} />
            <Tarjeta titulo="Récord" valor={textoMejor(ej.record)} detalle={fechaBonita(ej.record.fecha)} tono="azul" />
            <Tarjeta
              titulo="Desde el inicio"
              valor={masMenos(ej.deltaTotalKg)}
              detalle={`Fuerza ${pct(ej.deltaTotal)}`}
              tono={tendencia(ej.deltaTotal) === "baja" ? "rojo" : tendencia(ej.deltaTotal) === "sube" ? "verde" : "slate"}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            {[
              ["vs. sesión anterior", ej.deltaSesion, ej.deltaSesionKg],
              ["vs. semana anterior", ej.deltaSemana, ej.deltaSemanaKg],
              ["vs. mes anterior", ej.deltaMes, ej.deltaMesKg],
            ].map(([t, d, k]) => (
              <div key={t} className="rounded-xl bg-slate-50 p-2">
                <p className="text-[11px] font-bold uppercase text-slate-500">{t}</p>
                <p className="text-base font-black" style={{ color: ESTILO_TENDENCIA[tendencia(d)].color }}>
                  {d === null ? "—" : `${ESTILO_TENDENCIA[tendencia(d)].icono} ${pct(d)}`}
                </p>
                <p className="text-[11px] text-slate-500">{k === null ? "" : `peso máx. ${masMenos(k)}`}</p>
              </div>
            ))}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosGrafico} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit={corporal ? "" : " kg"} />
                <Tooltip formatter={(v) => (corporal ? `${v} reps` : `${v} kg`)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {corporal ? (
                  <Line isAnimationActive={false} type="monotone" dataKey="Repeticiones totales" stroke="var(--color-blue-600)" strokeWidth={3} dot={{ r: 3 }} />
                ) : (
                  <>
                    <Line isAnimationActive={false} type="monotone" dataKey="Fuerza estimada" stroke="var(--color-blue-600)" strokeWidth={3} dot={{ r: 3 }} />
                    <Line isAnimationActive={false} type="monotone" dataKey="Peso máximo" stroke="var(--color-emerald-600)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase text-slate-500">
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Día</th>
                <th className="p-2 text-left">Plan</th>
                <th className="p-2 text-left">Pesos por serie</th>
                <th className="p-2 text-left">Reps</th>
                <th className="p-2 text-right">Fuerza est.</th>
                <th className="p-2 text-center">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {[...ej.sesiones].reverse().map((s, i, arr) => {
                const p = arr[i + 1];
                const t = p ? tendencia(((s.fuerza - p.fuerza) / (p.fuerza || 1)) * 100) : "nuevo";
                return (
                  <tr key={s.fecha} className="border-t border-slate-100">
                    <td className="p-2 font-semibold">{fechaBonita(s.fecha)}</td>
                    <td className="p-2 text-slate-500">{s.dia}</td>
                    <td className="p-2 text-slate-500">
                      {s.seriesPlan || "?"}×{s.repsPlan || "?"}
                    </td>
                    <td className="p-2 font-bold">{textoSeries(s)}</td>
                    <td className="p-2">{textoReps(s)}</td>
                    <td className="p-2 text-right">{kg(s.fuerza)}</td>
                    <td className="p-2 text-center">
                      <Chip t={t} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- PRINCIPAL ----------------------------- */
export default function ProgresoPesos({ memberId, modo = "alumno", abrirAnotar = null }) {
  const esAlumno = modo === "alumno";
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [vista, setVista] = useState(null);
  const [fechaAnotar, setFechaAnotar] = useState(null);
  const [exportando, setExportando] = useState("");

  const cargar = useCallback(() => {
    if (!memberId) return;
    setError("");
    api(`/progreso/${memberId}`)
      .then((d) => {
        setDatos(d);
        setVista((v) => v || (d.puedeAnotar && esAlumno ? "anotar" : "graficos"));
      })
      .catch((e) => setError(e.message));
  }, [memberId, esAlumno]);

  useEffect(() => {
    setDatos(null);
    setVista(null);
    cargar();
  }, [cargar]);

  const resumen = useMemo(() => (datos ? resumenGeneral(datos) : null), [datos]);

  // Pedido desde un aviso: abrir "Anotar" en la fecha pendiente
  useEffect(() => {
    if (!abrirAnotar || !datos?.puedeAnotar) return;
    setFechaAnotar(abrirAnotar.fecha || null);
    setVista("anotar");
  }, [abrirAnotar?.n, datos?.puedeAnotar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-semibold">{error}</div>;
  if (!datos || !resumen) return <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">Cargando progreso...</div>;

  const exportar = async (tipo) => {
    setExportando(tipo);
    try {
      if (tipo === "pdf") await exportarPdfProgreso(datos, resumen);
      else await exportarExcelProgreso(datos, resumen);
    } catch (e) {
      alert(`No se pudo generar el archivo: ${e.message}`);
    } finally {
      setExportando("");
    }
  };

  const anotar = (f) => {
    setFechaAnotar(f);
    setVista("anotar");
  };

  const indiceTono = resumen.indice === null ? "slate" : resumen.indice >= UMBRAL ? "verde" : resumen.indice <= -UMBRAL ? "rojo" : "slate";

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white rounded-2xl p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300"><IconoEmoji e="💪" /> Progreso de pesos</p>
          <h2 className="text-2xl font-black mt-0.5">{esAlumno ? "Mi progreso" : datos.alumno.nombre}</h2>
          <p className="text-sm text-slate-300">
            {!esAlumno && <span className="font-mono text-cyan-200 mr-2">{datos.alumno.codigo}</span>}
            {datos.plan ? `Rutina: ${datos.plan.titulo}` : "Sin rutina asignada"}
            {datos.plan?.entrenador ? ` · ${datos.plan.entrenador}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportar("pdf")}
            disabled={!!exportando || !resumen.totalSesiones}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-bold cursor-pointer disabled:opacity-40"
          >
            {exportando === "pdf" ? "Generando..." : "⬇ PDF"}
          </button>
          <button
            onClick={() => exportar("excel")}
            disabled={!!exportando || !resumen.totalSesiones}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black cursor-pointer disabled:opacity-40"
          >
            {exportando === "excel" ? "Generando..." : "⬇ Excel"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tarjeta
          titulo="Fuerza desde el inicio"
          valor={resumen.indice === null ? "—" : pct(resumen.indice)}
          detalle={resumen.primera ? `Promedio de ${esAlumno ? "tus" : "sus"} ejercicios desde el ${fechaBonita(resumen.primera)}` : esAlumno ? "Registra tu primera sesión" : "Aún no registra pesos"}
          tono={indiceTono}
        />
        <Tarjeta
          titulo="Última sesión"
          valor={
            <span className="text-lg">
              <span className="text-emerald-600">▲{resumen.conteo.sube}</span> <span className="text-slate-400">●{resumen.conteo.igual}</span>{" "}
              <span className="text-rose-600">▼{resumen.conteo.baja}</span>
            </span>
          }
          detalle="Ejercicios que subieron, se mantuvieron o bajaron"
        />
        <Tarjeta
          titulo="Sesiones registradas"
          valor={resumen.totalSesiones}
          detalle={`${resumen.semanasEntrenadas} semana${resumen.semanasEntrenadas === 1 ? "" : "s"} · ${(resumen.volumenTotal / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 })} t movidas`}
          tono="azul"
        />
        <Tarjeta
          titulo="Cumplimiento (30 días)"
          valor={resumen.cumplimiento === null ? "—" : `${resumen.cumplimiento} %`}
          detalle={`Anotó en ${resumen.anotoAlVenir} de ${resumen.asistencias30} días que vino`}
          tono={resumen.sinRegistrar.length ? "ambar" : "verde"}
        />
      </div>

      {(resumen.alertas.length > 0 || resumen.sinRegistrar.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resumen.alertas.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-black text-rose-800">▼ {esAlumno ? "Ojo con estos ejercicios" : "Bajó de fuerza"}</p>
              <ul className="mt-1 space-y-0.5 text-sm text-rose-900">
                {resumen.alertas.map((e) => (
                  <li key={e.clave}>
                    <b>{e.nombre}</b>:{" "}
                    {e.deltaSesion !== null && e.deltaSesion <= -UMBRAL
                      ? `${masMenos(e.deltaSesionKg)} (${pct(e.deltaSesion)}) vs. la sesión anterior`
                      : `${masMenos(e.deltaVsMejorKg)} (${pct(e.deltaVsMejor)}) vs. su mejor marca reciente (${fechaBonita(e.mejorReciente.fecha)})`}
                    {e.bajasSeguidas >= 2 ? ` · ${e.bajasSeguidas} sesiones seguidas bajando` : ""}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-rose-700 mt-2">
                {esAlumno
                  ? "Puede ser cansancio, poco descanso o alimentación. Coméntalo con tu entrenador."
                  : "Conversa con el alumno: descanso, alimentación, dolor o técnica."}
              </p>
            </div>
          )}
          {resumen.sinRegistrar.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-800"><IconoEmoji e="✍️" /> {resumen.sinRegistrar.length} día(s) que vino sin anotar pesos</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {resumen.sinRegistrar.slice(-10).map((f) =>
                  datos.puedeAnotar ? (
                    <button key={f} onClick={() => anotar(f)} className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-800 cursor-pointer">
                      {fechaBonita(f)}
                    </button>
                  ) : (
                    <span key={f} className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-800">
                      {fechaBonita(f)}
                    </span>
                  ),
                )}
              </div>
              <p className="text-xs text-amber-700 mt-2">Registrar los pesos es obligatorio: así se ve el progreso real.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {datos.puedeAnotar && (
          <Pestana activa={vista === "anotar"} onClick={() => { setFechaAnotar(null); setVista("anotar"); }}>
            <IconoEmoji e="✍️" /> Anotar pesos
          </Pestana>
        )}
        <Pestana activa={vista === "graficos"} onClick={() => setVista("graficos")}>
          <IconoEmoji e="📈" /> Gráficos
        </Pestana>
        <Pestana activa={vista === "resumen"} onClick={() => setVista("resumen")}>
          <IconoEmoji e="📊" /> Resumen
        </Pestana>
        <Pestana activa={vista === "semana"} onClick={() => setVista("semana")}>
          <IconoEmoji e="📅" /> Semana
        </Pestana>
        <Pestana activa={vista === "mes"} onClick={() => setVista("mes")}>
          <IconoEmoji e="🗓️" /> Mes
        </Pestana>
        <Pestana activa={vista === "ejercicio"} onClick={() => setVista("ejercicio")}>
          <IconoEmoji e="🏋️" /> Por ejercicio
        </Pestana>
      </div>

      {vista === "anotar" && datos.puedeAnotar && (
        <Anotar datos={datos} resumen={resumen} fechaInicial={fechaAnotar} onGuardado={cargar} esAlumno={esAlumno} />
      )}
      {vista === "graficos" && <GraficosProgreso datos={datos} resumen={resumen} />}
      {vista === "resumen" && <VistaResumen resumen={resumen} onVer={() => setVista("ejercicio")} />}
      {vista === "semana" && <VistaSemana datos={datos} resumen={resumen} onAnotar={datos.puedeAnotar ? anotar : null} />}
      {vista === "mes" && <VistaMes datos={datos} resumen={resumen} />}
      {vista === "ejercicio" && <VistaEjercicio resumen={resumen} />}

      <p className="text-[11px] text-slate-400">
        La fuerza estimada compara series distintas (ej. 40 kg × 15 y 45 kg × 10) con la fórmula de Epley: peso × (1 + reps ÷ 30). Se toma la mejor serie de cada
        sesión. Sube o baja si cambia más de {UMBRAL} %.
      </p>
    </div>
  );
}

function VistaResumen({ resumen, onVer }) {
  if (!resumen.ejercicios.length)
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
        Aún no hay pesos registrados. Cuando se anote la primera sesión, aquí verás el progreso de cada ejercicio.
      </div>
    );
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="bg-slate-50 text-xs uppercase text-slate-500">
            <th className="p-3 text-left">Ejercicio</th>
            <th className="p-3 text-left">Última sesión</th>
            <th className="p-3 text-center">vs. anterior</th>
            <th className="p-3 text-center">vs. semana</th>
            <th className="p-3 text-center">vs. mes</th>
            <th className="p-3 text-center">Desde el inicio</th>
            <th className="p-3 text-left">Récord</th>
          </tr>
        </thead>
        <tbody>
          {resumen.ejercicios.map((e) => (
            <tr key={e.clave} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={onVer}>
              <td className="p-3">
                <p className="font-bold text-slate-900">{e.nombre}</p>
                <p className="text-[11px] text-slate-500">{e.sesiones.length} sesiones</p>
              </td>
              <td className="p-3">
                <p className="font-bold">{textoSeries(e.ultima)}</p>
                <p className="text-[11px] text-slate-500">
                  {fechaBonita(e.ultima.fecha)} · × {textoReps(e.ultima)}
                </p>
              </td>
              {[
                [e.deltaSesion, e.deltaSesionKg],
                [e.deltaSemana, e.deltaSemanaKg],
                [e.deltaMes, e.deltaMesKg],
                [e.deltaTotal, e.deltaTotalKg],
              ].map(([d, k], i) => (
                <td key={i} className="p-3 text-center">
                  {d === null ? (
                    <span className="text-slate-300">—</span>
                  ) : (
                    <div>
                      <Chip t={tendencia(d)}>{pct(d)}</Chip>
                      <p className="text-[11px] text-slate-500 mt-0.5">{masMenos(k)}</p>
                    </div>
                  )}
                </td>
              ))}
              <td className="p-3">
                <p className="font-bold">{textoMejor(e.record)}</p>
                <p className="text-[11px] text-slate-500">{fechaBonita(e.record.fecha)}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
