// Estado vacío de listas y tablas: ícono, mensaje y (opcional) una acción
import React from "react";
import { Inbox } from "lucide-react";

export const EstadoVacio = ({ icono: Icono = Inbox, titulo = "No hay registros", texto, accion, onAccion }) => (
  <div className="flex flex-col items-center justify-center text-center gap-2 py-10 px-4">
    <span className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
      <Icono className="w-6 h-6" />
    </span>
    <p className="text-sm font-bold text-slate-700">{titulo}</p>
    {texto && <p className="text-xs text-slate-500 max-w-sm">{texto}</p>}
    {accion && onAccion && (
      <button type="button" onClick={onAccion} className="mt-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer">
        {accion}
      </button>
    )}
  </div>
);
