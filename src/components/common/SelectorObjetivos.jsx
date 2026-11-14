// Elegir uno o varios objetivos con "pastillas" (en vez de una lista desplegable)
import React from "react";
import { Check } from "lucide-react";
import { OBJETIVOS_ALUMNO, listaObjetivos } from "../../utils/objetivos";

export const SelectorObjetivos = ({ value, onChange }) => {
  const elegidos = listaObjetivos(value);
  const alternar = (k) => {
    const n = elegidos.includes(k) ? elegidos.filter((x) => x !== k) : [...elegidos, k];
    onChange((n.length ? n : [k]).join(","));
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {OBJETIVOS_ALUMNO.map(([k, e, l]) => {
          const on = elegidos.includes(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => alternar(k)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-all ${
                on ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-300 text-slate-600 hover:border-blue-400"
              }`}
            >
              {on ? <Check className="w-3.5 h-3.5" /> : <span>{e}</span>}
              {l}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500 mt-1">Puedes marcar varios (ej. bajar de peso + tonificar).</p>
    </div>
  );
};
