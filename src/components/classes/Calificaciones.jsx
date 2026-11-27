// =====================================================================
// CALIFICACIONES de las clases grupales y másters (personal)
//  - Promedio de estrellas, cuántos calificaron, % de clases bien
//    calificadas (4 o 5 ⭐) y comentarios.
//  - Ranking por profesor y por disciplina, y lo que más mencionan.
//  - El profesor ve solo las suyas y sin el nombre del alumno.
// =====================================================================
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api/cliente";
import { TarjetaKpi } from "../common/TarjetaKpi";
import { Exportar } from "../reports/ReportsModule";
import { hoyISO } from "../../utils/fecha";
import { fechaBonita, sumarDias, lunesDe } from "./clasesComun";

export const Estrellas = ({ n, tam = "text-sm" }) => (
  <span className={`${tam} whitespace-nowrap tracking-tight`} aria-label={`${n} de 5 estrellas`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={i <= Math.round(n) ? "text-amber-500" : "text-slate-300"}>★</span>
    ))}
  </span>
);
const prom = (l) => (l.length ? Math.round((l.reduce((a, x) => a + x.estrellas, 0) / l.length) * 10) / 10 : 0);

const agrupar = (lista, clave, nombre) => {
  const m = new Map();
  lista.forEach((f) => {
    const k = f[clave] ?? nombre(f);
    if (!m.has(k)) m.set(k, { nombre: nombre(f), emoji: f.emoji, color: f.color, filas: [] });
    m.get(k).filas.push(f);
  });
  return [...m.values()].map((g) => ({ ...g, promedio: prom(g.filas), total: g.filas.length })).sort((a, b) => b.promedio - a.promedio || b.total - a.total);
};

export default function Calificaciones({ datos, esProfe }) {
  const hoy = hoyISO();
  const rangos = [
    ["Esta semana", lunesDe(hoy), sumarDias(lunesDe(hoy), 6)],
    ["Últimos 30 días", sumarDias(hoy, -29), hoy],
    ["Últimos 90 días", sumarDias(hoy, -89), hoy],
    ["Este año", `${hoy.slice(0, 4)}-01-01`, hoy],
  ];
  const [r, setR] = useState(1);
  const [disc, setDisc] = useState("");
  const [prof, setProf] = useState("");
  const [estr, setEstr] = useState(0);
  const [rep, setRep] = useState(null);
  const [anonimo, setAnonimo] = useState(false);
  const [error, setError] = useState("");
  const [, desde, hasta] = rangos[r];
  useEffect(() => {
    setRep(null);
    api(`/calificaciones?desde=${desde}&hasta=${hasta}`)
      .then((d) => (setRep(d.filas), setAnonimo(!!d.anonimo), setError("")))
      .catch((e) => setError(e.message));
  }, [desde, hasta]);
  const base = (rep || []).filter((f) => (!disc || f.disciplinaId === Number(disc)) && (!prof || f.profesor === prof));
  const lista = base.filter((f) => !estr || f.estrellas === estr);
  const profes = [...new Set((rep || []).map((f) => f.profesor))].sort();
  const porProfe = useMemo(() => agrupar(base, "profesorId", (f) => f.profesor), [base]);
  const porDisc = useMemo(() => agrupar(base, "disciplinaId", (f) => f.disciplina), [base]);
  const etiquetas = useMemo(() => {
    const m = new Map();
    base.forEach((f) => f.etiquetas.forEach((e) => m.set(e, (m.get(e) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [base]);
  const dist = [5, 4, 3, 2, 1].map((n) => [n, base.filter((f) => f.estrellas === n).length]);
  const buenas = base.filter((f) => f.estrellas >= 4).length;
  const conComentario = base.filter((f) => f.comentario).length;
  const columnas = [
    { key: "fecha", label: "Fecha", excel: (x) => fechaBonita(x.fecha) },
    { key: "clase", label: "Clase" },
    { key: "disciplina", label: "Disciplina" },
    { key: "profesor", label: "Profesor" },
    { key: "estrellas", label: "Estrellas", excel: (x) => `${x.estrellas} de 5` },
    { key: "etiquetas", label: "Etiquetas", excel: (x) => x.etiquetas.join(", ") },
    { key: "comentario", label: "Comentario" },
    ...(anonimo ? [] : [{ key: "alumno", label: "Alumno" }]),
  ];
  const filtros = [`Del ${fechaBonita(desde)} al ${fechaBonita(hasta)} (${rangos[r][0]})`, disc && `Disciplina: ${datos.disciplinas.find((d) => d.id === Number(disc))?.nombre}`, prof && `Profesor: ${prof}`, estr && `${estr} estrellas`].filter(Boolean);
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">⭐ {esProfe ? "Cómo califican tus clases" : "Calificación de las clases"}</p>
          <Exportar titulo="Clases grupales · Calificaciones" filtros={filtros} columnas={columnas} filas={lista} totales={[["Calificaciones", base.length], ["Promedio", `${prom(base)} de 5`], ["4 o 5 estrellas", buenas], ...porProfe.map((p) => [p.nombre, `${p.promedio} ⭐ (${p.total})`])]} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rangos.map(([l], i) => (
            <button key={l} type="button" onClick={() => setR(i)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${r === i ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <div className={`grid grid-cols-1 ${esProfe ? "" : "sm:grid-cols-2"} gap-2`}>
          <select value={disc} onChange={(e) => setDisc(e.target.value)} className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-sm">
            <option value="">Todas las disciplinas</option>
            {datos.disciplinas.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.nombre}</option>)}
          </select>
          {!esProfe && (
            <select value={prof} onChange={(e) => setProf(e.target.value)} className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-sm">
              <option value="">Todos los profesores</option>
              {profes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
        {anonimo && <p className="text-[11px] text-slate-500">🔒 Ves tus calificaciones sin el nombre del alumno, para que opinen con confianza.</p>}
      </div>
      {error && <p className="text-sm font-bold rounded-xl border p-3 rd-kpi-ambar rd-aviso-t">{error}</p>}
      {!rep ? (
        !error && <p className="text-sm text-slate-500">Cargando calificaciones…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <TarjetaKpi titulo="Promedio" valor={prom(base)} decimales={1} sub={<Estrellas n={prom(base)} />} emoji="⭐" tono="ambar" />
            <TarjetaKpi titulo="Calificaciones" valor={base.length} sub="de los alumnos" emoji="🗳️" tono="teal" />
            <TarjetaKpi titulo="Les gustó" valor={base.length ? Math.round((buenas / base.length) * 100) : 0} sufijo="%" sub="4 o 5 estrellas" emoji="😍" tono="verde" />
            <TarjetaKpi titulo="Comentarios" valor={conComentario} sub="escritos por alumnos" emoji="💬" tono="violeta" />
          </div>

          {!base.length ? (
            <div className="rd-kpi-ambar rd-aviso-t rounded-2xl border p-5 text-center space-y-1">
              <p className="text-3xl">⭐</p>
              <p className="font-black">Aún no hay calificaciones en este periodo</p>
              <p className="text-sm">Al terminar cada clase o máster, a los alumnos les llega un aviso para calificarla (tienen 7 días).</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                  <p className="text-sm font-black text-slate-800">Estrellas</p>
                  {dist.map(([n, c]) => (
                    <button key={n} type="button" onClick={() => setEstr(estr === n ? 0 : n)} className={`w-full flex items-center gap-2 text-sm rounded-lg px-1 cursor-pointer ${estr === n ? "ring-2 ring-amber-400" : ""}`}>
                      <span className="w-10 text-left font-black text-slate-700">{n} ★</span>
                      <span className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${base.length ? (c / base.length) * 100 : 0}%` }} /></span>
                      <span className="w-8 text-right font-bold text-slate-600">{c}</span>
                    </button>
                  ))}
                  <p className="text-[11px] text-slate-500">Toca una fila para ver solo esos comentarios.</p>
                </div>
                {!esProfe && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                    <p className="text-sm font-black text-slate-800">🧑‍🏫 Por profesor</p>
                    {porProfe.map((p, i) => (
                      <div key={p.nombre} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-bold text-slate-700">{i === 0 && porProfe.length > 1 ? "🏆 " : ""}{p.nombre}</span>
                        <span className="whitespace-nowrap"><Estrellas n={p.promedio} tam="text-xs" /> <b className="text-slate-900">{p.promedio}</b><span className="text-xs text-slate-500"> ({p.total})</span></span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                  <p className="text-sm font-black text-slate-800">🎵 Por disciplina</p>
                  {porDisc.map((d) => (
                    <div key={d.nombre} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate font-bold text-slate-700">{d.emoji} {d.nombre}</span>
                      <span className="whitespace-nowrap"><Estrellas n={d.promedio} tam="text-xs" /> <b className="text-slate-900">{d.promedio}</b><span className="text-xs text-slate-500"> ({d.total})</span></span>
                    </div>
                  ))}
                  {etiquetas.length > 0 && (
                    <>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500 pt-2">Lo que más dicen</p>
                      <div className="flex flex-wrap gap-1">
                        {etiquetas.slice(0, 8).map(([e, n]) => <span key={e} className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">{e} · {n}</span>)}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <p className="px-4 pt-3 text-sm font-black text-slate-800">💬 Opiniones {estr ? `de ${estr} estrellas` : "recientes"} <span className="font-semibold text-slate-500">({lista.length})</span></p>
                <div className="divide-y divide-slate-100">
                  {lista.slice(0, 200).map((f) => (
                    <div key={f.id} className="px-4 py-3 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="text-sm font-black text-slate-900 min-w-0">{f.emoji} {f.clase} <span className="font-semibold text-slate-500">· {fechaBonita(f.fecha)}{f.inicio ? ` ${f.inicio}` : ""}{esProfe ? "" : ` · ${f.profesor}`}</span></p>
                        <Estrellas n={f.estrellas} />
                      </div>
                      {f.comentario && <p className="text-sm text-slate-700">“{f.comentario}”</p>}
                      <div className="flex flex-wrap items-center gap-1">
                        {f.etiquetas.map((e) => <span key={e} className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{e}</span>)}
                        <span className="text-[11px] text-slate-400 ml-auto">— {f.alumno}</span>
                      </div>
                    </div>
                  ))}
                  {!lista.length && <p className="px-4 py-8 text-center text-sm text-slate-400">Nada con este filtro.</p>}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
