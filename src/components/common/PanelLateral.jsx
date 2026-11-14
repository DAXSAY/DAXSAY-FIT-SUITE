// =====================================================================
// Panel lateral de avisos: el mismo tamaño y forma para el CRM y para las
// notificaciones generales. Tarjeta con bordes redondeados, separada del
// borde de la pantalla, sobre la página oscurecida.
// =====================================================================
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export const CLASE_PANEL =
  "relative w-full max-w-[27rem] h-[calc(100%-1.5rem)] my-3 mr-3 ml-3 sm:ml-0 rounded-2xl overflow-hidden bg-slate-100 shadow-2xl flex flex-col rd-panel-crm ring-1 ring-black/5";

export const PanelLateral = ({ abierto, onCerrar, children }) => {
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto]);
  if (!abierto) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] cursor-default" />
      <aside className={CLASE_PANEL}>{children}</aside>
    </div>,
    document.body,
  );
};

/** Cabecera oscura con brillo de color, igual en ambos paneles */
export const CabeceraPanel = ({ etiqueta, fecha, numero, textoNumero, brillo = "bg-orange-500/30", brillo2 = "bg-fuchsia-600/25", colorEtiqueta = "text-orange-300", onCerrar, derecha }) => (
  <div className="relative overflow-hidden rd-cabecera-panel px-5 pt-5 pb-4 bg-[#0b1626] text-white shrink-0">
    <div className={`absolute -top-16 -right-10 w-56 h-56 rounded-full ${brillo} blur-3xl`} />
    <div className={`absolute -bottom-20 -left-10 w-48 h-48 rounded-full ${brillo2} blur-3xl`} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${colorEtiqueta}`}>{etiqueta}</p>
        {fecha && <p className="text-sm text-white/70 mt-0.5">{fecha}</p>}
      </div>
      <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer" title="Cerrar">
        <X className="w-5 h-5" />
      </button>
    </div>
    <div className="relative flex items-end justify-between mt-4 gap-4">
      <div>
        <p className="text-5xl font-black leading-none">{numero}</p>
        <p className="text-xs font-bold text-white/70 mt-1">{textoNumero}</p>
      </div>
      {derecha}
    </div>
  </div>
);

export const fechaHoyTexto = () => {
  const t = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Lima" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
