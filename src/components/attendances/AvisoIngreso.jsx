// =====================================================================
// Aviso grande de ingreso: franja de color arriba de la pantalla al marcar
// asistencia (alumno, pase libre o personal). Se ve de lejos:
//   verde   = bienvenido / acceso autorizado
//   violeta = pase libre (clase de prueba)
//   azul    = personal de trabajo
//   ámbar   = ya marcó hoy (no se vuelve a registrar) o por vencer
//   rojo    = acceso denegado (vencido, congelado, no encontrado)
// =====================================================================
import React, { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Ticket, BadgeCheck, Clock, XCircle, X } from "lucide-react";
import { textoObjetivos } from "../../utils/objetivos";

let actual = null;
// Corto para que, si llegan varios seguidos, no haya que esperar: 1.5 s (los de atención, 3 s).
// Al pasar el mouse encima se queda mientras se lee o se corrige.
const duracion = (a) => (a.tipo === "repetido" || a.tipo === "error" ? 3000 : 1500);
let reloj = null;
const oyentes = new Set();
const avisarCambio = () => oyentes.forEach((f) => f());

/** Muestra el aviso. tipo: ok | pase | personal | repetido | alerta | error */
export function mostrarIngreso(aviso) {
  actual = { ...aviso, id: Date.now() };
  clearTimeout(reloj);
  reloj = setTimeout(() => {
    actual = null;
    avisarCambio();
  }, duracion(aviso));
  avisarCambio();
}
const cerrar = () => {
  clearTimeout(reloj);
  actual = null;
  avisarCambio();
};

const ESTILO = {
  ok: { fondo: "from-emerald-500 via-emerald-600 to-green-700", icono: CheckCircle2, sombra: "shadow-emerald-500/50" },
  pase: { fondo: "from-violet-500 via-fuchsia-600 to-purple-700", icono: Ticket, sombra: "shadow-fuchsia-500/50" },
  personal: { fondo: "from-sky-500 via-blue-600 to-indigo-700", icono: BadgeCheck, sombra: "shadow-sky-500/50" },
  repetido: { fondo: "from-amber-400 via-amber-500 to-orange-600", icono: Clock, sombra: "shadow-amber-500/50" },
  alerta: { fondo: "from-amber-400 via-amber-500 to-orange-600", icono: Clock, sombra: "shadow-amber-500/50" },
  error: { fondo: "from-rose-500 via-red-600 to-red-700", icono: XCircle, sombra: "shadow-rose-500/50" },
};

export const AvisoIngreso = () => {
  const aviso = useSyncExternalStore(
    (f) => (oyentes.add(f), () => oyentes.delete(f)),
    () => actual,
  );
  useEffect(() => {
    if (!aviso) return;
    const tecla = (e) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aviso]);
  if (!aviso) return null;
  const e = ESTILO[aviso.tipo] || ESTILO.ok;
  const I = e.icono;
  const ms = duracion(aviso);
  return createPortal(
    <div className="fixed inset-x-0 top-2 z-[80] flex justify-center px-3 pointer-events-none">
      <div
        key={aviso.id}
        role="status"
        onMouseEnter={() => clearTimeout(reloj)}
        onMouseLeave={() => (reloj = setTimeout(cerrar, 1200))}
        className={`rd-ingreso pointer-events-auto w-full max-w-xl rounded-xl bg-gradient-to-r ${e.fondo} text-white shadow-xl ${e.sombra} ring-2 ring-white/25 overflow-hidden`}
      >
        <div className="flex items-center gap-3 px-3.5 py-2">
          <I className="w-6 h-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-black leading-tight truncate">{aviso.titulo}</p>
            {aviso.detalle && <p className="text-xs font-semibold text-white/90 truncate">{aviso.detalle}</p>}
          </div>
          {aviso.codigo && <span className="shrink-0 font-mono text-sm font-black bg-white/20 rounded-lg px-2 py-0.5">{aviso.codigo}</span>}
          {aviso.accion && (
            <button
              onClick={() => {
                aviso.accion.fn();
                cerrar();
              }}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white text-slate-900 text-xs font-black cursor-pointer hover:bg-white/90"
            >
              {aviso.accion.texto}
            </button>
          )}
          <button onClick={cerrar} className="p-1 rounded-lg hover:bg-white/20 cursor-pointer shrink-0" title="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="h-1 bg-white/25">
          <div className="rd-ingreso-barra h-full bg-white/80" style={{ animationDuration: `${ms}ms` }} />
        </div>
      </div>
    </div>,
    document.body,
  );
};

const primerNombre = (n) => String(n || "").trim().split(/\s+/)[0] || "";

/** Aviso para un alumno. visitasPrevias: cuántas veces vino antes */
export function avisoAlumno(m, { repetido, visitasPrevias = 1 } = {}) {
  const fecha = (f) => (f ? String(f).slice(0, 10).split("-").reverse().join("/") : "");
  if (repetido) {
    return { tipo: "repetido", codigo: m.codeLabel, titulo: `${primerNombre(m.fullName)} ya marcó su ingreso hoy`, detalle: `Registrado a las ${repetido.time}. No se volvió a registrar.` };
  }
  if (m.status === "frozen") return { tipo: "error", codigo: m.codeLabel, titulo: `${primerNombre(m.fullName)}: membresía congelada`, detalle: `Vuelve el ${fecha(m.freeze?.current?.returnDate)}. Si regresó antes, termina el congelamiento en Alumnos.` };
  if (m.status === "expired") return { tipo: "error", codigo: m.codeLabel, titulo: `Acceso denegado: membresía vencida`, detalle: `${m.fullName} · venció el ${fecha(m.membershipEndDate)}. Pásalo por caja para renovar.` };
  const saludo = visitasPrevias > 0 ? `¡Bienvenido(a) de nuevo, ${primerNombre(m.fullName)}!` : `¡Bienvenido(a) a RADICAL, ${primerNombre(m.fullName)}!`;
  if (m.status === "expiring_soon") return { tipo: "alerta", codigo: m.codeLabel, titulo: saludo, detalle: `Su membresía vence el ${fecha(m.membershipEndDate)}. Recuérdale renovar.` };
  const obj = m.objective ? ` · ${textoObjetivos(m.objective, true)}` : "";
  return { tipo: "ok", codigo: m.codeLabel, titulo: saludo, detalle: `${m.planName || "Membresía"} · vigente hasta el ${fecha(m.membershipEndDate)}${obj}` };
}
