// Lista de alumnos para el entrenador: quién progresa, quién no anota sus pesos.
import { BarraVolver } from "../common/BarraVolver";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api/cliente";
import { fechaBonita } from "../../utils/progreso";
import ProgresoPesos from "./ProgresoPesos";
import { IconoEmoji } from "../common/IconoEmoji";

export default function PanelProgresoAlumnos() {
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [abierto, setAbierto] = useState(() => {
    try {
      const id = sessionStorage.getItem("radical_abrir_progreso");
      if (id) sessionStorage.removeItem("radical_abrir_progreso");
      return id || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const alAviso = (e) => {
      try {
        sessionStorage.removeItem("radical_abrir_progreso");
      } catch {
        /* nada */
      }
      setAbierto(e.detail);
    };
    window.addEventListener("radical:abrir-progreso", alAviso);
    return () => window.removeEventListener("radical:abrir-progreso", alAviso);
  }, []);

  useEffect(() => {
    if (abierto) return;
    api("/progreso/alumnos")
      .then((l) => {
        setLista(l);
        if (l.some((a) => a.mio)) setFiltro((f) => (f === "todos" ? "mios" : f));
      })
      .catch((e) => setError(e.message));
  }, [abierto]);

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (lista || []).filter((a) => {
      if (filtro === "mios" && !a.mio) return false;
      if (filtro === "pendientes" && !a.sinRegistrar30) return false;
      return !q || a.nombre.toLowerCase().includes(q) || a.codigo.toLowerCase().includes(q);
    });
  }, [lista, buscar, filtro]);

  if (abierto)
    return (
      <div className="space-y-3">
        <BarraVolver onVolver={() => setAbierto(null)} titulo="Progreso del socio" subtitulo="Pesos y series registradas" />
        <ProgresoPesos memberId={abierto} modo="personal" />
      </div>
    );

  if (error) return <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-semibold">{error}</div>;
  if (!lista) return <p className="text-sm text-slate-500 p-6">Cargando socios...</p>;

  const filtros = [
    ["mios", `Mis socios (${lista.filter((a) => a.mio).length})`],
    ["todos", `Todos (${lista.length})`],
    ["pendientes", `Sin anotar (${lista.filter((a) => a.sinRegistrar30).length})`],
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <p className="text-base font-black text-slate-900"><IconoEmoji e="💪" /> Progreso de pesos de los socios</p>
          <p className="text-xs text-slate-500">Busca por nombre o código (DF-1) y entra para ver si sube, se mantiene o baja.</p>
        </div>
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Nombre o código..."
          className="px-3 py-2 rounded-xl border border-slate-300 text-sm w-60"
        />
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {filtros.map(([k, t]) => (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${filtro === k ? "bg-blue-600 shadow text-white" : "text-slate-600"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visibles.map((a) => {
          const cumple = a.asistencias30 ? Math.round(((a.asistencias30 - a.sinRegistrar30) / a.asistencias30) * 100) : null;
          return (
            <button
              key={a.id}
              onClick={() => setAbierto(a.id)}
              className="text-left bg-white rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all p-4 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black text-slate-900 truncate">{a.nombre}</p>
                  <p className="text-xs font-mono text-blue-700">{a.codigo}</p>
                </div>
                {a.sinRegistrar30 > 0 ? (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                    {a.sinRegistrar30} sin anotar
                  </span>
                ) : a.sesiones30 > 0 ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">al día</span>
                ) : null}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-3">En los últimos 30 días</p>
              <div className="grid grid-cols-3 gap-2 mt-1 text-center">
                <div className="rounded-lg bg-slate-50 p-1.5" title="Días que vino al gimnasio (marcó su ingreso)">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Vino</p>
                  <p className="font-black text-slate-900">{a.asistencias30} <span className="text-[10px] font-bold text-slate-500">días</span></p>
                </div>
                <div className="rounded-lg bg-slate-50 p-1.5" title="Sesiones en que se anotaron sus pesos o series">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Anotó pesos</p>
                  <p className="font-black text-slate-900">{a.sesiones30} <span className="text-[10px] font-bold text-slate-500">veces</span></p>
                </div>
                <div className="rounded-lg bg-slate-50 p-1.5" title="De los días que vino, en cuántos se anotaron sus pesos">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Constancia</p>
                  <p className="font-black text-slate-900">{cumple === null ? "—" : `${cumple}%`}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {a.ultimoRegistro ? `Último registro: ${fechaBonita(a.ultimoRegistro)}` : a.tieneRutina ? "Tiene rutina, aún sin pesos" : ""}
              </p>
            </button>
          );
        })}
        {!visibles.length && <p className="text-sm text-slate-500 col-span-full text-center p-8">No hay socios con este filtro.</p>}
      </div>
    </div>
  );
}
