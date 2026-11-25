// «Tus tareas de hoy»: al entrar al sistema, el personal ve lo que le toca
// hoy y lo atrasado (una vez por día y por persona). Se puede abrir de nuevo
// desde el módulo de Tareas.
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../api/cliente";
import { tipoDe, textoDestino, textoTurno, cuandoTexto, primerNombre } from "./tareasComun";

const clave = (id, hoy) => `rd_tareas_hoy_${id}_${hoy}`;
const consultas = new Map();

export const TareasDeHoy = ({ usuarioId, nombre, onAbrir }) => {
  const [datos, setDatos] = useState(null);
  useEffect(() => {
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    try {
      if (localStorage.getItem(clave(usuarioId, hoy))) return;
    } catch {
      /* sin almacenamiento: se muestra igual */
    }
    let vivo = true;
    // Una sola consulta por persona y día aunque la pantalla se vuelva a montar
    const k = `${usuarioId}_${hoy}`;
    if (!consultas.has(k)) consultas.set(k, api("/tareas/hoy").catch(() => null));
    consultas.get(k).then((r) => {
      if (!vivo || !r) return;
      if (r.tareas?.length) setDatos(r);
      else
        try {
          localStorage.setItem(clave(usuarioId, r.hoy), "1");
        } catch {
          /* nada */
        }
    });
    return () => {
      vivo = false;
    };
  }, [usuarioId]);
  if (!datos) return null;
  const cerrar = () => {
    try {
      localStorage.setItem(clave(usuarioId, datos.hoy), "1");
    } catch {
      /* nada */
    }
    consultas.clear();
    setDatos(null);
  };
  const atrasadas = datos.tareas.filter((t) => t.atrasada);
  const mias = datos.tareas.filter((t) => t.tomadaPor?.id === datos.yo.id);
  const turno = datos.yo.turnoId ? datos.turnos.find((t) => t.id === datos.yo.turnoId) : null;
  const ver = datos.tareas.slice(0, 7);
  return (
    <div className="fixed inset-0 z-[75] rd-velo items-start sm:items-center justify-center overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl rd-aparece overflow-hidden">
        <div className="rd-kpi-teal rd-tareas-hoy-cab px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest opacity-80">📋 Tus tareas de hoy</p>
            <h3 className="text-lg font-black">¡Hola, {primerNombre(nombre || datos.yo.nombre)}!</h3>
            <p className="text-sm font-semibold opacity-90">
              {turno ? `${textoTurno(turno)} · ` : ""}
              {datos.tareas.length} por hacer{atrasadas.length ? ` · ${atrasadas.length} atrasada(s)` : ""}
              {mias.length ? ` · ${mias.length} ya son tuyas` : ""}
            </p>
          </div>
          <button type="button" onClick={cerrar} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 cursor-pointer shrink-0" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
          {ver.map((t) => {
            const tipo = tipoDe(t.tipo);
            return (
              <li key={t.id} className={`rd-kpi-${t.atrasada ? "rojo" : tipo.tono} px-5 py-2.5 flex items-center gap-3`}>
                <span className="rd-tarea-ico w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                  <span className="rd-emoji">{tipo.emoji}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-900 truncate">{t.titulo}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {t.atrasada ? <b className="rd-texto-k">⏰ Atrasada · </b> : null}
                    {cuandoTexto(t.fecha, datos.hoy)}
                    {t.hora ? ` ${t.hora}` : ""} · {textoDestino(t.destino, datos.turnos)}
                    {t.tomadaPor ? ` · la tiene ${t.tomadaPor.id === datos.yo.id ? "tú" : primerNombre(t.tomadaPor.nombre)}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {datos.tareas.length > ver.length && <p className="px-5 pt-2 text-xs font-bold text-slate-500">y {datos.tareas.length - ver.length} más…</p>}
        <div className="px-5 py-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={cerrar} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Ver luego
          </button>
          <button
            type="button"
            onClick={() => {
              cerrar();
              onAbrir();
            }}
            className="rd-boton-t px-5 py-2 rounded-xl text-sm font-black cursor-pointer"
          >
            📋 Ver mis tareas
          </button>
        </div>
      </div>
    </div>
  );
};
