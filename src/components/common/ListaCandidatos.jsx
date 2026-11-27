// Lista bajo un campo de marcación: muestra a QUIÉN se va a marcar.
// Si varias personas tienen el mismo código (alumno 2, 2-ENTR, 2-EXT…),
// se elige con el mouse o con las flechas + Enter.
// Se dibuja flotando sobre la página (portal), así ninguna tarjeta la recorta.
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconoEmoji } from "./IconoEmoji";

const ESTILO = {
  alumno: "bg-blue-100 text-blue-800",
  personal: "bg-violet-100 text-violet-800",
  externo: "bg-amber-100 text-amber-800",
};

export const ListaCandidatos = ({ candidatos = [], indice = 0, onIndice, onElegir, pase = false }) => {
  const marca = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const medir = () => {
      const caja = marca.current?.parentElement;
      if (!caja) return;
      const r = caja.getBoundingClientRect();
      // Mismo ancho que el campo donde se marca
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 260) });
    };
    medir();
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, []);

  const lista = (
    <div
      style={pos ? { position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 80 } : { display: "none" }}
      className="rd-lista-checkin rounded-xl border shadow-xl overflow-hidden text-left"
    >
      {pase ? (
        <p className="px-3 py-2 text-xs font-semibold text-violet-700"><IconoEmoji e="🎟️" /> Pase libre: presiona Enter para validarlo</p>
      ) : candidatos.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-500">Nadie tiene ese código. Escribe el número exacto, el DNI completo o el nombre.</p>
      ) : (
        <>
          <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            {candidatos.length === 1 ? "Se marcará a" : `${candidatos.length} personas con ese código · elige una`}
          </p>
          {candidatos.map((c, i) => (
            <button
              key={c.clave}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onElegir(c)}
              onMouseEnter={() => onIndice?.(i)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer ${i === indice ? "bg-blue-50" : ""}`}
            >
              <span className={`shrink-0 min-w-[58px] text-center px-1.5 py-0.5 rounded-md text-[10px] font-black ${ESTILO[c.tipo === "alumno" ? "alumno" : c.externo ? "externo" : "personal"]}`}>
                {c.codigo}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-slate-800 truncate">{c.nombre}</span>
                <span className="block text-[10px] text-slate-500 truncate">{c.detalle}</span>
              </span>
              {i === indice && <span className="text-[10px] font-bold text-slate-400 shrink-0">Enter ↵</span>}
            </button>
          ))}
        </>
      )}
    </div>
  );
  return (
    <>
      <span ref={marca} className="hidden" />
      {createPortal(lista, document.body)}
    </>
  );
};
