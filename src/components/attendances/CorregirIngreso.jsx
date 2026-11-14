// =====================================================================
// Corregir un ingreso mal marcado: si en recepción se escribió "1" en vez
// de "11", aquí se cambia a la persona correcta (se conserva la hora) o
// se elimina el ingreso. Se abre desde el aviso de check-in ("Corregir")
// o desde la lista del día en Control de Asistencias.
// =====================================================================
import React, { useEffect, useSyncExternalStore, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, X, ArrowRight } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { SelectorAlumno, CodigoAlumno } from "../common/BuscarAlumno";
import { ingresoDeHoy } from "../../utils/codigoPersonal";
import { mostrarIngreso } from "./AvisoIngreso";

let abierto = null;
const oyentes = new Set();
const avisar = () => oyentes.forEach((f) => f());
/** Abre la ventana para corregir ese registro de asistencia */
export const abrirCorreccion = (registro) => {
  abierto = registro;
  avisar();
};
const cerrar = () => {
  abierto = null;
  avisar();
};

export const CorregirIngreso = () => {
  const registro = useSyncExternalStore((f) => (oyentes.add(f), () => oyentes.delete(f)), () => abierto);
  const { members = [], attendances = [], updateAttendance, deleteAttendance } = useGym();
  const [nuevoId, setNuevoId] = useState("");
  const [error, setError] = useState("");
  const [seguro, setSeguro] = useState(false);
  useEffect(() => {
    setNuevoId("");
    setError("");
    setSeguro(false);
  }, [registro?.id]);
  if (!registro) return null;
  const esAlumno = registro.category === "student" || registro.userRole === "student";
  const antes = members.find((m) => String(m.id) === String(registro.userId));
  const nuevo = members.find((m) => String(m.id) === String(nuevoId));

  const guardar = () => {
    if (!nuevo) return setError("Elige al alumno correcto.");
    const ya = ingresoDeHoy(attendances.filter((a) => a.id !== registro.id), nuevo.id, registro.date);
    if (ya) return setError(`${nuevo.fullName} ya tiene un ingreso ese día (${ya.time}). Elimina este registro en su lugar.`);
    updateAttendance(registro.id, {
      userId: nuevo.id,
      userName: nuevo.fullName,
      userDni: nuevo.dni,
      membershipPlan: nuevo.planName,
      status: nuevo.status === "expired" || nuevo.status === "frozen" ? "warning" : registro.status === "warning" ? "puntual" : registro.status,
      notes: `Corregido: se había marcado a ${registro.userName}${antes?.codeLabel ? ` (${antes.codeLabel})` : ""}`,
    });
    mostrarIngreso({ tipo: "ok", codigo: nuevo.codeLabel, titulo: "Ingreso corregido", detalle: `${registro.userName} → ${nuevo.fullName} · ${registro.time}` });
    cerrar();
  };
  const eliminar = () => {
    if (!seguro) return setSeguro(true); // segundo toque confirma
    deleteAttendance(registro.id);
    mostrarIngreso({ tipo: "repetido", titulo: "Ingreso eliminado", detalle: `${registro.userName} · ${registro.time}` });
    cerrar();
  };

  return createPortal(
    <div className="fixed inset-0 z-[85] bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4" onMouseDown={cerrar}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 rd-aparece">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase text-amber-600 flex items-center gap-1">
              <Pencil className="w-3.5 h-3.5" /> Corregir ingreso
            </p>
            <p className="text-lg font-black text-slate-900">¿Se marcó a la persona equivocada?</p>
          </div>
          <button onClick={cerrar} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center gap-2 text-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Se registró</span>
          {antes ? <CodigoAlumno m={antes} /> : registro.staffCode && <span className="font-mono text-[11px] font-bold text-violet-700">{registro.staffCode}</span>}
          <b className="text-slate-900 truncate flex-1">{registro.userName}</b>
          <span className="text-xs text-slate-500 whitespace-nowrap">{registro.date?.split("-").reverse().join("/")} · {registro.time}</span>
        </div>
        {esAlumno ? (
          <div>
            <span className="block text-xs font-bold text-slate-600 mb-1.5">Debió ser (escribe su código, nombre o DNI):</span>
            <SelectorAlumno alumnos={members.filter((m) => String(m.id) !== String(registro.userId))} value={nuevoId} onChange={setNuevoId} />
            {nuevo && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                {registro.userName} <ArrowRight className="w-3 h-3" /> <b className="text-emerald-700">{nuevo.fullName}</b> · se mantiene la hora {registro.time}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-600">Para el personal, elimina este registro y vuelve a marcar con el código correcto (ej. 1-COACH).</p>
        )}
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <div className="flex flex-wrap justify-between gap-2 pt-1">
          <button onClick={eliminar} className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-bold cursor-pointer inline-flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" /> {seguro ? "¿Seguro? Toca otra vez" : "Eliminar ingreso"}
          </button>
          {esAlumno && (
            <button onClick={guardar} disabled={!nuevo} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-black cursor-pointer">
              Guardar corrección
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
