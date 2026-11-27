// «Tus tareas de hoy»: al entrar al sistema, el personal ve lo que le toca
// hoy y lo atrasado (una vez por día y por persona). Se puede abrir de nuevo
// desde el módulo de Tareas.
import React, { useEffect, useState } from "react";
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
  const urg = (a, b) => Number(b.prioridad === "urgente") - Number(a.prioridad === "urgente");
  const comentarios = datos.tareas.filter((t) => t.tipo === "nota").sort(urg);
  const tareas = datos.tareas.filter((t) => t.tipo !== "nota");
  const atrasadas = tareas.filter((t) => t.atrasada).sort(urg);
  const deHoy = tareas.filter((t) => !t.atrasada).sort(urg);
  const mias = tareas.filter((t) => t.tomadaPor?.id === datos.yo.id);
  const turno = datos.yo.turnoId ? datos.turnos.find((t) => t.id === datos.yo.turnoId) : null;
  const ahora = datos.turnoActualId ? datos.turnos.find((t) => t.id === datos.turnoActualId) : null;
  const MAX = 12;
  const Fila = ({ t }) => {
    const tipo = tipoDe(t.tipo);
    return (
      <li className={`rd-kpi-${t.atrasada ? "rojo" : tipo.tono} rd-tarea rounded-2xl border p-3.5 flex items-start gap-3`}>
        <span className="rd-tarea-ico w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0">
          <span className="rd-emoji">{tipo.emoji}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-[15px] font-extrabold text-slate-900 leading-snug">
            {t.prioridad === "urgente" && <span className="rd-kpi-rojo rd-chip-t inline-block mr-1.5 px-2 py-0.5 rounded-full text-[10px] font-black align-middle">🔥 Urgente</span>}
            {t.titulo}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.tipo === "nota" ? <b className="rd-texto-k">🗒️ Comentario de {primerNombre(t.creador?.nombre) || "otro turno"} · </b> : t.atrasada ? <b className="rd-texto-k">⏰ Atrasada · </b> : null}
            {cuandoTexto(t.fecha, datos.hoy)}
            {t.hora ? ` ${t.hora}` : ""} · {textoDestino(t.destino, datos.turnos)}
            {t.tomadaPor ? ` · la tiene ${t.tomadaPor.id === datos.yo.id ? "tú" : primerNombre(t.tomadaPor.nombre)}` : ""}
          </p>
          {t.nota && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{t.nota}</p>}
        </div>
      </li>
    );
  };
  const Grupo = ({ titulo, lista }) =>
    lista.length ? (
      <section className="space-y-2.5">
        <h3 className="font-black text-slate-700">
          {titulo} <span className="text-slate-400">({lista.length})</span>
        </h3>
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {lista.slice(0, MAX).map((t) => (
            <Fila key={t.id} t={t} />
          ))}
        </ul>
        {lista.length > MAX && <p className="text-xs font-bold text-slate-500">y {lista.length - MAX} más en el módulo de Tareas…</p>}
      </section>
    ) : null;
  const Cuenta = ({ tono, emoji, n, l }) => (
    <div className={`rd-kpi-${tono} rd-tarea rounded-2xl border px-4 py-3 flex items-center gap-3`}>
      <span className="rd-tarea-ico w-10 h-10 rounded-xl flex items-center justify-center text-lg">
        <span className="rd-emoji">{emoji}</span>
      </span>
      <div>
        <p className="text-2xl font-black rd-texto-k leading-none">{n}</p>
        <p className="text-xs font-bold text-slate-500">{l}</p>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[75] bg-slate-100 overflow-y-auto rd-aparece" role="dialog" aria-label="Tus tareas de hoy" data-rd-tam="ancha">
      <div className="w-full mx-auto min-h-full p-4 sm:p-6 space-y-5">
        <div className="rd-kpi-teal rd-tareas-hoy-cab rounded-2xl border px-5 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest opacity-80">📋 Tus tareas de hoy</p>
            <h2 className="text-2xl font-black">¡Hola, {primerNombre(nombre || datos.yo.nombre)}!</h2>
            <p className="text-sm font-semibold opacity-90">
              {turno ? `${textoTurno(turno)} (${turno.inicio}–${turno.fin})` : "Esto es lo que hay por hacer"}
              {ahora && (!turno || ahora.id !== turno.id) ? ` · Ahora atiende: ${textoTurno(ahora)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={cerrar} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white/70 hover:bg-white text-slate-700 border border-slate-200 cursor-pointer">
              Ver luego
            </button>
            <button
              type="button"
              onClick={() => {
                cerrar();
                try {
                  sessionStorage.setItem("rd_tareas_vista", "lista");
                } catch {
                  /* nada */
                }
                onAbrir();
              }}
              className="rd-boton-t px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer"
            >
              📋 Ver mis tareas
            </button>
          </div>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${comentarios.length ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3`}>
          {comentarios.length > 0 && <Cuenta tono="indigo" emoji="🗒️" n={comentarios.length} l="Comentarios para ti" />}
          <Cuenta tono="teal" emoji="📍" n={deHoy.length} l="Para hoy" />
          <Cuenta tono="rojo" emoji="⏰" n={atrasadas.length} l="Atrasadas" />
          <Cuenta tono="azul" emoji="🙋" n={mias.length} l="Ya son tuyas" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <Grupo titulo="🗒️ Para que sepas (comentarios del turno anterior)" lista={comentarios} />
          <Grupo titulo="⏰ Atrasadas: empieza por aquí" lista={atrasadas} />
          <Grupo titulo="📍 Para hoy" lista={deHoy} />
        </div>
      </div>
    </div>
  );
};
