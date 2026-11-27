// =====================================================================
// Croquis del salón de clases grupales
//  - Ver: cada step con su número; libre, reservado, llegó o «el tuyo».
//  - Editar (administración): arrastra en un espacio vacío para dibujar un
//    step o una zona; arrastra un step para moverlo; cámbiale el número o
//    el tamaño; bórralo. Todos ven el mismo croquis.
// Las medidas son casillas de una cuadrícula (por defecto 40 × 28).
// =====================================================================
import React, { useMemo, useRef, useState } from "react";
import { Trash2, Plus, Square, Type, ListOrdered, Undo2 } from "lucide-react";

const pct = (v, total) => `${(v / total) * 100}%`;

/** Estado visual de un step según su reserva */
const claseStep = (r, sel) => {
  if (sel) return "rd-step rd-step-sel";
  if (!r) return "rd-step rd-step-libre";
  if (r.mia) return "rd-step rd-step-mio";
  if (r.estado === "asistio") return "rd-step rd-step-llego";
  return "rd-step rd-step-reservado";
};

export const LeyendaCroquis = ({ conMio = false }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-bold text-slate-600">
    <span className="flex items-center gap-1.5"><i className="rd-step rd-step-libre w-4 h-3 rounded inline-block border" /> Libre</span>
    <span className="flex items-center gap-1.5"><i className="rd-step rd-step-reservado w-4 h-3 rounded inline-block border" /> Reservado</span>
    <span className="flex items-center gap-1.5"><i className="rd-step rd-step-llego w-4 h-3 rounded inline-block border" /> Llegó</span>
    {conMio && <span className="flex items-center gap-1.5"><i className="rd-step rd-step-mio w-4 h-3 rounded inline-block border" /> Tu step</span>}
  </div>
);

/**
 * Croquis de solo lectura / para tocar steps.
 * reservas: [{ stepId, estado, mia?, alumno? }] (solo las que ocupan)
 */
export const Croquis = ({ croquis, reservas = [], onStep, seleccionado, nombres = false, deshabilitado = false }) => {
  const { ancho = 40, alto = 28, steps = [] } = croquis || {};
  const porStep = useMemo(() => {
    const m = new Map();
    reservas.filter((r) => r.estado === "reservado" || r.estado === "asistio").forEach((r) => m.set(r.stepId, r));
    return m;
  }, [reservas]);
  return (
    <div className="rd-croquis-marco w-full overflow-x-auto">
      <div className="rd-croquis relative mx-auto" style={{ aspectRatio: `${ancho} / ${alto}`, minWidth: 320 }}>
        {steps.map((z) => {
          const estilo = { left: pct(z.x, ancho), top: pct(z.y, alto), width: pct(z.w, ancho), height: pct(z.h, alto) };
          if (z.tipo === "zona")
            return (
              <div key={z.id} className="rd-zona absolute flex items-center justify-center text-[10px] sm:text-xs font-black uppercase tracking-wider" style={estilo}>
                {z.etiqueta}
              </div>
            );
          const r = porStep.get(z.id);
          const sel = seleccionado === z.id;
          return (
            <button
              key={z.id}
              type="button"
              disabled={deshabilitado || !onStep}
              onClick={() => onStep?.(z, r)}
              title={r ? `Step ${z.numero} · ${r.alumno || (r.mia ? "Tu step" : r.estado === "asistio" ? "Llegó" : "Reservado")}` : `Step ${z.numero} · libre`}
              className={`${claseStep(r, sel)} absolute rounded-md border flex flex-col items-center justify-center leading-none overflow-hidden ${onStep && !deshabilitado ? "cursor-pointer" : "cursor-default"}`}
              style={estilo}
            >
              <span className="text-[10px] sm:text-sm font-black">{z.numero}</span>
              {nombres && r?.alumno && <span className="hidden md:block text-[9px] font-bold truncate max-w-full px-0.5">{r.alumno.split(" ")[0]}</span>}
              {r?.estado === "asistio" && <span className="text-[9px] sm:text-[10px]">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** Editor del croquis (solo administración) */
export const EditorCroquis = ({ croquis, onCambiar }) => {
  const { ancho = 40, alto = 28 } = croquis;
  const steps = croquis.steps;
  const lienzo = useRef(null);
  const [herramienta, setHerramienta] = useState("step");
  const [sel, setSel] = useState(null);
  const [dibujo, setDibujo] = useState(null); // { x0, y0, x1, y1 }
  const [arrastre, setArrastre] = useState(null); // { key, dx, dy }
  const [historial, setHistorial] = useState([]);
  const clave = (z) => z.id ?? z.tmp;
  const elegido = steps.find((z) => clave(z) === sel);

  const cambiar = (nuevos, guardarHist = true) => {
    if (guardarHist) setHistorial((h) => [...h.slice(-30), steps]);
    onCambiar(nuevos);
  };
  const celda = (e) => {
    const r = lienzo.current.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * ancho);
    const y = Math.floor(((e.clientY - r.top) / r.height) * alto);
    return { x: Math.max(0, Math.min(ancho - 1, x)), y: Math.max(0, Math.min(alto - 1, y)) };
  };
  const siguienteNumero = () => Math.max(0, ...steps.filter((z) => z.tipo === "step").map((z) => Number(z.numero) || 0)) + 1;

  const bajar = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const c = celda(e);
    const z = [...steps].reverse().find((s) => c.x >= s.x && c.x < s.x + s.w && c.y >= s.y && c.y < s.y + s.h);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (z) {
      setSel(clave(z));
      setHistorial((h) => [...h.slice(-30), steps]);
      setArrastre({ key: clave(z), dx: c.x - z.x, dy: c.y - z.y });
    } else {
      setSel(null);
      setDibujo({ x0: c.x, y0: c.y, x1: c.x, y1: c.y });
    }
  };
  const mover = (e) => {
    if (!arrastre && !dibujo) return;
    const c = celda(e);
    if (arrastre) {
      cambiar(
        steps.map((z) =>
          clave(z) === arrastre.key
            ? { ...z, x: Math.max(0, Math.min(ancho - z.w, c.x - arrastre.dx)), y: Math.max(0, Math.min(alto - z.h, c.y - arrastre.dy)) }
            : z,
        ),
        false,
      );
    } else setDibujo((d) => ({ ...d, x1: c.x, y1: c.y }));
  };
  const soltar = () => {
    if (dibujo) {
      const x = Math.min(dibujo.x0, dibujo.x1);
      const y = Math.min(dibujo.y0, dibujo.y1);
      let w = Math.abs(dibujo.x1 - dibujo.x0) + 1;
      let h = Math.abs(dibujo.y1 - dibujo.y0) + 1;
      // Un toque (sin arrastrar) crea un step del tamaño normal
      if (w === 1 && h === 1) (w = herramienta === "step" ? 3 : 8), (h = herramienta === "step" ? 2 : 2);
      const nuevo = {
        tmp: `n${Date.now()}`,
        tipo: herramienta,
        numero: herramienta === "step" ? siguienteNumero() : null,
        etiqueta: herramienta === "zona" ? "Zona" : "",
        x: Math.min(x, ancho - w),
        y: Math.min(y, alto - h),
        w: Math.min(w, ancho),
        h: Math.min(h, alto),
      };
      cambiar([...steps, nuevo]);
      setSel(nuevo.tmp);
    }
    setDibujo(null);
    setArrastre(null);
  };
  const editar = (campos) => cambiar(steps.map((z) => (clave(z) === sel ? { ...z, ...campos } : z)));
  const borrar = () => (cambiar(steps.filter((z) => clave(z) !== sel)), setSel(null));
  const renumerar = () => {
    let n = 0;
    const orden = [...steps].filter((z) => z.tipo === "step").sort((a, b) => a.y - b.y || a.x - b.x);
    const num = new Map(orden.map((z) => [clave(z), ++n]));
    cambiar(steps.map((z) => (z.tipo === "step" ? { ...z, numero: num.get(clave(z)) } : z)));
  };
  const agregarFila = () => {
    const ultima = Math.max(0, ...steps.map((z) => z.y + z.h));
    if (ultima + 3 > alto) return;
    let n = siguienteNumero();
    const fila = [];
    for (let x = 2; x + 3 <= ancho - 1; x += 4) fila.push({ tmp: `f${Date.now()}${x}`, tipo: "step", numero: n++, x, y: ultima + 1, w: 3, h: 2 });
    cambiar([...steps, ...fila]);
  };
  const totalSteps = steps.filter((z) => z.tipo === "step").length;
  const enDibujo = dibujo && {
    left: pct(Math.min(dibujo.x0, dibujo.x1), ancho),
    top: pct(Math.min(dibujo.y0, dibujo.y1), alto),
    width: pct(Math.abs(dibujo.x1 - dibujo.x0) + 1, ancho),
    height: pct(Math.abs(dibujo.y1 - dibujo.y0) + 1, alto),
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500 mr-1">Dibujar:</span>
        {[
          ["step", Square, "Step"],
          ["zona", Type, "Zona (profesor, espejo, puerta…)"],
        ].map(([k, I, l]) => (
          <button key={k} type="button" onClick={() => setHerramienta(k)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${herramienta === k ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
            <I className="w-3.5 h-3.5" /> {l}
          </button>
        ))}
        <button type="button" onClick={agregarFila} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Fila de steps
        </button>
        <button type="button" onClick={renumerar} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer">
          <ListOrdered className="w-3.5 h-3.5" /> Renumerar en orden
        </button>
        <button type="button" disabled={!historial.length} onClick={() => (onCambiar(historial[historial.length - 1]), setHistorial((h) => h.slice(0, -1)))} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
          <Undo2 className="w-3.5 h-3.5" /> Deshacer
        </button>
        <span className="ml-auto text-xs font-black text-slate-600">{totalSteps} steps</span>
      </div>
      <p className="text-xs text-slate-500">
        Arrastra en un espacio vacío para dibujar un {herramienta === "step" ? "step" : "recuadro de zona"} (un toque crea uno de tamaño normal). Arrastra un step para moverlo y tócalo para cambiar su número o tamaño.
      </p>

      <div className="rd-croquis-marco w-full overflow-x-auto">
        <div
          ref={lienzo}
          className="rd-croquis rd-croquis-editor relative mx-auto touch-none select-none"
          style={{ aspectRatio: `${ancho} / ${alto}`, minWidth: 420, backgroundSize: `${100 / ancho}% ${100 / alto}%` }}
          onPointerDown={bajar}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerLeave={soltar}
        >
          {steps.map((z) => {
            const on = clave(z) === sel;
            const estilo = { left: pct(z.x, ancho), top: pct(z.y, alto), width: pct(z.w, ancho), height: pct(z.h, alto) };
            return z.tipo === "zona" ? (
              <div key={clave(z)} className={`rd-zona absolute flex items-center justify-center text-[10px] sm:text-xs font-black uppercase tracking-wider cursor-move ${on ? "rd-zona-sel" : ""}`} style={estilo}>
                {z.etiqueta}
              </div>
            ) : (
              <div key={clave(z)} className={`${on ? "rd-step rd-step-sel" : "rd-step rd-step-libre"} absolute rounded-md border flex items-center justify-center text-[10px] sm:text-sm font-black cursor-move`} style={estilo}>
                {z.numero}
              </div>
            );
          })}
          {enDibujo && <div className="absolute rounded-md border-2 border-dashed border-teal-500 bg-teal-500/10 pointer-events-none" style={enDibujo} />}
        </div>
      </div>

      {elegido && (
        <div className="rd-kpi-teal rd-aviso-t rounded-2xl border p-3 flex flex-wrap items-end gap-3">
          <p className="text-xs font-black uppercase tracking-wider w-full">{elegido.tipo === "step" ? `Step ${elegido.numero}` : `Zona «${elegido.etiqueta}»`}</p>
          {elegido.tipo === "step" ? (
            <label className="text-xs font-bold">
              Número
              <input type="number" min={1} max={999} value={elegido.numero ?? ""} onChange={(e) => editar({ numero: e.target.value === "" ? "" : Number(e.target.value) })} className="block mt-0.5 w-20 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800" />
            </label>
          ) : (
            <label className="text-xs font-bold">
              Texto
              <input value={elegido.etiqueta} maxLength={40} onChange={(e) => editar({ etiqueta: e.target.value })} className="block mt-0.5 w-40 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800" />
            </label>
          )}
          <label className="text-xs font-bold">
            Ancho
            <input type="number" min={1} max={ancho} value={elegido.w} onChange={(e) => editar({ w: Math.max(1, Math.min(ancho - elegido.x, Number(e.target.value) || 1)) })} className="block mt-0.5 w-16 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800" />
          </label>
          <label className="text-xs font-bold">
            Alto
            <input type="number" min={1} max={alto} value={elegido.h} onChange={(e) => editar({ h: Math.max(1, Math.min(alto - elegido.y, Number(e.target.value) || 1)) })} className="block mt-0.5 w-16 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800" />
          </label>
          <button type="button" onClick={borrar} className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Quitar
          </button>
        </div>
      )}
    </div>
  );
};
