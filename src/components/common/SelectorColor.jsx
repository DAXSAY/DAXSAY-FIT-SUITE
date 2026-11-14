// Selector de color propio (reemplaza al del navegador, que no sigue el
// diseño del sistema): cuadro de tono/brillo, barra de matiz, código HEX y
// colores sugeridos. Se abre como un panel redondeado junto al botón.
import React, { useEffect, useRef, useState } from "react";
import { Check, Pipette, X } from "lucide-react";

const limitar = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));

export const hexAHsv = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return { h: 184, s: 0.92, v: 0.7 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
};

export const hsvAHex = ({ h, s, v }) => {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return `#${[f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")}`;
};

const SUGERIDOS = ["#0ea7b3", "#2563eb", "#7c3aed", "#db2777", "#e11d48", "#ea580c", "#f59e0b", "#16a34a", "#0f766e", "#475569", "#111827", "#a16207"];

// Arrastre con el mouse o el dedo dentro de un elemento
const useArrastre = (alMover) => {
  const ref = useRef(null);
  const mover = (e) => {
    const r = ref.current.getBoundingClientRect();
    alMover(limitar((e.clientX - r.left) / r.width), limitar((e.clientY - r.top) / r.height));
  };
  return {
    ref,
    onPointerDown: (e) => {
      ref.current.setPointerCapture?.(e.pointerId);
      mover(e);
    },
    onPointerMove: (e) => e.buttons && mover(e),
  };
};

export const PanelColor = ({ valor, onCambiar, onCerrar }) => {
  const [hsv, setHsv] = useState(() => hexAHsv(valor));
  const [texto, setTexto] = useState(() => hsvAHex(hexAHsv(valor)).toUpperCase());
  const hex = hsvAHex(hsv);
  const aplicar = (nuevo) => {
    setHsv(nuevo);
    const h = hsvAHex(nuevo);
    setTexto(h.toUpperCase());
    onCambiar(h);
  };
  const cuadro = useArrastre((x, y) => aplicar({ ...hsv, s: x, v: 1 - y }));
  const barra = useArrastre((x) => aplicar({ ...hsv, h: x * 359.9 }));

  const cuentagotas = async () => {
    try {
      const r = await new window.EyeDropper().open();
      aplicar(hexAHsv(r.sRGBHex));
    } catch {
      /* cancelado */
    }
  };

  return (
    <div className="rd-panel-color w-64 p-3 rounded-2xl border shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Color del plan</span>
        <button type="button" onClick={onCerrar} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 cursor-pointer" title="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tono y brillo */}
      <div
        {...cuadro}
        className="relative h-36 rounded-xl cursor-crosshair touch-none overflow-hidden"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))` }}
      >
        <span
          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)] pointer-events-none"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }}
        />
      </div>

      {/* Matiz */}
      <div className="flex items-center gap-2">
        {"EyeDropper" in window && (
          <button type="button" onClick={cuentagotas} title="Tomar un color de la pantalla" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer shrink-0">
            <Pipette className="w-4 h-4" />
          </button>
        )}
        <div
          {...barra}
          className="relative flex-1 h-3 rounded-full cursor-pointer touch-none"
          style={{ background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
        >
          <span
            className="absolute top-1/2 w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)] pointer-events-none"
            style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }}
          />
        </div>
      </div>

      {/* Código y vista previa */}
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl shrink-0 shadow-inner" style={{ background: hex }} />
        <input
          value={texto}
          onChange={(e) => {
            const t = e.target.value.toUpperCase();
            setTexto(t);
            if (/^#?[0-9A-F]{6}$/.test(t)) {
              const h = t.startsWith("#") ? t : `#${t}`;
              setHsv(hexAHsv(h));
              onCambiar(h.toLowerCase());
            }
          }}
          maxLength={7}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold"
        />
      </div>

      {/* Sugeridos */}
      <div className="grid grid-cols-6 gap-1.5">
        {SUGERIDOS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => aplicar(hexAHsv(c))}
            className={`h-7 rounded-lg cursor-pointer transition-transform hover:scale-110 ${hex.toLowerCase() === c ? "ring-2 ring-offset-1 ring-slate-500" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>

      <button type="button" onClick={onCerrar} className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-1.5">
        <Check className="w-4 h-4" /> Listo
      </button>
    </div>
  );
};

// Botón redondo que abre el panel encima/debajo de sí mismo
export const BotonColor = ({ valor, activo, onCambiar, className = "", children, title }) => {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => caja.current && !caja.current.contains(e.target) && setAbierto(false);
    const esc = (e) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);
  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        title={title}
        onClick={() => setAbierto((v) => !v)}
        className={className}
        style={activo ? { background: valor, borderStyle: "solid", borderColor: "white" } : undefined}
      >
        {children}
      </button>
      {abierto && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2">
          <PanelColor valor={activo ? valor : "#0ea7b3"} onCambiar={onCambiar} onCerrar={() => setAbierto(false)} />
        </div>
      )}
    </div>
  );
};
