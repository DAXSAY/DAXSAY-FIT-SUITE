// =====================================================================
// Croquis del salón de clases grupales
//  - Ver: cada step con su número; libre, reservado, llegó o «el tuyo».
//  - Editar (administración): arrastra en un espacio vacío para dibujar un
//    step o una zona; arrastra un step para moverlo; cámbiale el número o
//    el tamaño; bórralo. Todos ven el mismo croquis.
// Las medidas son casillas de una cuadrícula (por defecto 40 × 28).
// Elementos: steps (con número o letra) y zonas: muro, columna, baranda,
// instructor, consola, puerta, espejo o un texto libre. El tipo de zona se
// reconoce por su texto (por ejemplo «Muro» o «Columna 2»).
// =====================================================================
import React, { useMemo, useRef, useState } from "react";
import { Trash2, Plus, Square, Type, ListOrdered, Undo2, BrickWall, Columns2, Fence, User, Speaker, DoorOpen, RectangleHorizontal, CaseSensitive, LayoutTemplate } from "lucide-react";

const pct = (v, total) => `${(v / total) * 100}%`;

/** Tipos de zona: se reconocen por el texto que tienen */
export const ELEMENTOS = [
  { k: "muro", etiqueta: "Muro", icono: BrickWall, w: 10, h: 1, sinTexto: true },
  { k: "columna", etiqueta: "Columna", icono: Columns2, w: 2, h: 2, sinTexto: true },
  { k: "baranda", etiqueta: "Baranda", icono: Fence, w: 14, h: 1 },
  { k: "instructor", etiqueta: "Instructor", icono: User, w: 10, h: 5 },
  { k: "consola", etiqueta: "Consola", icono: Speaker, w: 5, h: 2 },
  { k: "puerta", etiqueta: "Puerta", icono: DoorOpen, w: 4, h: 1 },
  { k: "espejo", etiqueta: "Espejo", icono: RectangleHorizontal, w: 24, h: 1 },
];
export const tipoZona = (etiqueta) => {
  const t = String(etiqueta || "").toLowerCase();
  if (/muro|pared/.test(t)) return "muro";
  if (/columna|pilar/.test(t)) return "columna";
  if (/baranda/.test(t)) return "baranda";
  if (/instructor|profesor/.test(t)) return "instructor";
  if (/consola|sonido|equipo de m/.test(t)) return "consola";
  if (/puerta|entrada|salida/.test(t)) return "puerta";
  if (/espejo/.test(t)) return "espejo";
  return "zona";
};
/** Dibujo de una zona (muro y columna sin texto) */
const Zona = ({ z, estilo, sel = false, editor = false }) => {
  const k = tipoZona(z.etiqueta);
  const sinTexto = k === "muro" || k === "columna";
  return (
    <div
      title={z.etiqueta}
      className={`rd-zona rd-zona-${k} absolute flex items-center justify-center text-[9px] sm:text-xs font-black uppercase tracking-wider overflow-hidden ${sel ? "rd-zona-sel" : ""} ${editor ? "cursor-move" : ""}`}
      style={estilo}
    >
      {!sinTexto && <span className="truncate px-0.5">{z.etiqueta}</span>}
    </div>
  );
};

/** Plantillas de salón para empezar rápido (luego se editan) */
const filaSteps = (nums, x0, y, paso = 4) => nums.map((n, i) => ({ tipo: "step", numero: n, x: x0 + i * paso, y, w: 3, h: 2 }));
const rango = (a, b) => (a > b ? Array.from({ length: a - b + 1 }, (_, i) => a - i) : Array.from({ length: b - a + 1 }, (_, i) => a + i));
export const PLANTILLAS = [
  {
    k: "incas",
    nombre: "Sede Los Incas · 46 steps + A–F",
    elementos: () => [
      { tipo: "zona", etiqueta: "Baranda", x: 11, y: 0, w: 17, h: 1 },
      { tipo: "zona", etiqueta: "Muro", x: 39, y: 0, w: 1, h: 26 },
      ...filaSteps(rango(46, 39), 4, 2),
      ...filaSteps(rango(38, 30), 2, 5),
      ...filaSteps(rango(29, 20), 0, 8),
      ...filaSteps(rango(19, 11), 2, 11),
      ...filaSteps(rango(10, 1), 0, 14),
      ...filaSteps(["A", "B", "C"], 1, 17),
      ...filaSteps(["D", "E", "F"], 26, 17),
      { tipo: "zona", etiqueta: "Instructor", x: 14, y: 17, w: 10, h: 6 },
      { tipo: "zona", etiqueta: "Consola", x: 0, y: 24, w: 5, h: 2 },
    ],
  },
  {
    k: "columnas",
    nombre: "Salón con columnas · ejemplo",
    elementos: () => [
      { tipo: "zona", etiqueta: "Espejo", x: 6, y: 0, w: 28, h: 1 },
      { tipo: "zona", etiqueta: "Instructor", x: 15, y: 2, w: 10, h: 3 },
      ...filaSteps(rango(1, 8), 2, 7),
      { tipo: "zona", etiqueta: "Columna", x: 34, y: 7, w: 2, h: 2 },
      ...filaSteps(rango(9, 15), 2, 10),
      { tipo: "zona", etiqueta: "Columna", x: 30, y: 10, w: 2, h: 2 },
      ...filaSteps(rango(16, 23), 2, 13),
      { tipo: "zona", etiqueta: "Muro", x: 0, y: 17, w: 22, h: 1 },
      ...filaSteps(rango(24, 27), 24, 19),
      { tipo: "zona", etiqueta: "Puerta", x: 1, y: 26, w: 5, h: 1 },
      { tipo: "zona", etiqueta: "Consola", x: 33, y: 2, w: 5, h: 2 },
    ],
  },
];

/** Estado visual de un step según su reserva */
const claseStep = (r, sel) => {
  if (sel) return "rd-step rd-step-sel";
  if (!r) return "rd-step rd-step-libre";
  if (r.mia) return "rd-step rd-step-mio";
  if (r.externo) return "rd-step rd-step-externo";
  if (r.estado === "asistio") return "rd-step rd-step-llego";
  return "rd-step rd-step-reservado";
};

const Muestra = ({ c, t }) => (
  <span className="flex items-center gap-1.5"><i className={`rd-step ${c} w-5 h-4 rounded inline-block border-2`} /> {t}</span>
);
/** Leyenda de estados del croquis. conExterno: másters (socios y externos comparten el salón) */
export const LeyendaCroquis = ({ conMio = false, conExterno = false }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-bold text-slate-600">
    <Muestra c="rd-step-libre" t="Libre" />
    <Muestra c="rd-step-reservado" t={conExterno ? "Socio" : "Reservado"} />
    <Muestra c="rd-step-llego" t={conExterno ? "Socio asistió" : "Asistió"} />
    {conExterno && <Muestra c="rd-step-externo" t="Externo" />}
    {conMio && <Muestra c="rd-step-mio" t="Tu step" />}
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
  if (croquis && !steps.some((z) => z.tipo === "step"))
    return (
      <div className="rd-kpi-plomo rd-aviso-t rounded-2xl border p-5 text-center space-y-1">
        <p className="text-3xl">🧱</p>
        <p className="font-black">El salón de esta sede aún no tiene steps</p>
        <p className="text-sm">Administración lo dibuja en Clases grupales › Disciplinas y salón (hay plantillas para empezar rápido).</p>
      </div>
    );
  return (
    <div className="rd-croquis-marco w-full overflow-x-auto">
      <div className="rd-croquis relative mx-auto" style={{ aspectRatio: `${ancho} / ${alto}`, minWidth: 320 }}>
        {steps.map((z) => {
          const estilo = { left: pct(z.x, ancho), top: pct(z.y, alto), width: pct(z.w, ancho), height: pct(z.h, alto) };
          if (z.tipo === "zona") return <Zona key={z.id} z={z} estilo={estilo} />;
          const r = porStep.get(z.id);
          const sel = seleccionado === z.id;
          return (
            <button
              key={z.id}
              type="button"
              disabled={deshabilitado || !onStep}
              onClick={() => onStep?.(z, r)}
              title={r ? `Step ${z.numero} · ${r.alumno || (r.mia ? "Tu step" : r.estado === "asistio" ? "Asistió" : "Reservado")}${r.externo ? " · externo" : ""}` : `Step ${z.numero} · libre`}
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
  const siguienteLetra = () => {
    const usadas = new Set(steps.filter((z) => z.tipo === "step").map((z) => String(z.numero)));
    for (const l of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") if (!usadas.has(l)) return l;
    for (const l of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") for (let n = 1; n < 10; n++) if (!usadas.has(`${l}${n}`)) return `${l}${n}`;
    return "Z9";
  };
  const herr = ELEMENTOS.find((e) => e.k === herramienta);
  const [plantilla, setPlantilla] = useState("");
  const usarPlantilla = () => {
    const p = PLANTILLAS.find((x) => x.k === plantilla);
    if (!p) return;
    const viejos = steps.filter((z) => z.tipo === "step");
    // Reusa los steps que ya existían con el mismo nombre (así no se pierden reservas)
    const nuevos = p.elementos().map((z, i) => {
      const prev = z.tipo === "step" && viejos.find((v) => String(v.numero) === String(z.numero));
      return prev ? { ...z, id: prev.id } : { ...z, tmp: `p${Date.now()}${i}` };
    });
    cambiar(nuevos);
    setSel(null);
    setPlantilla("");
  };

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
      const esStep = herramienta === "step" || herramienta === "letra";
      if (w === 1 && h === 1) (w = esStep ? 3 : herr?.w || 8), (h = esStep ? 2 : herr?.h || 2);
      const nuevo = {
        tmp: `n${Date.now()}`,
        tipo: esStep ? "step" : "zona",
        numero: herramienta === "step" ? siguienteNumero() : herramienta === "letra" ? siguienteLetra() : null,
        etiqueta: esStep ? "" : herr?.etiqueta || "Texto",
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
    const orden = [...steps].filter((z) => z.tipo === "step" && /^\d+$/.test(String(z.numero))).sort((a, b) => a.y - b.y || a.x - b.x);
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
          ["letra", CaseSensitive, "Step con letra"],
          ...ELEMENTOS.map((e) => [e.k, e.icono, e.etiqueta]),
          ["zona", Type, "Texto libre"],
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
      <div className="flex flex-wrap items-center gap-2">
        <LayoutTemplate className="w-4 h-4 text-slate-500" />
        <select value={plantilla} onChange={(e) => setPlantilla(e.target.value)} className="px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700">
          <option value="">Empezar desde una plantilla…</option>
          {PLANTILLAS.map((p) => <option key={p.k} value={p.k}>{p.nombre}</option>)}
        </select>
        {plantilla && <button type="button" onClick={usarPlantilla} className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-black cursor-pointer">Reemplazar el croquis por esta plantilla</button>}
        {plantilla && <span className="text-[11px] text-slate-500">Luego puedes moverlo todo y no se guarda hasta que toques «Guardar croquis».</span>}
      </div>
      <p className="text-xs text-slate-500">
        Elige arriba qué dibujar ({herramienta === "step" ? "step con número" : herramienta === "letra" ? "step con letra" : herr ? herr.etiqueta.toLowerCase() : "texto libre"}) y arrastra en un espacio vacío para darle el tamaño (un toque lo crea de tamaño normal). Arrastra cualquier elemento para moverlo y tócalo para cambiar su nombre o tamaño. Muros y columnas ocupan espacio: ahí no va ningún step.
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
              <Zona key={clave(z)} z={z} estilo={estilo} sel={on} editor />
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
          <p className="text-xs font-black uppercase tracking-wider w-full">{elegido.tipo === "step" ? `Step ${elegido.numero}` : `${ELEMENTOS.find((e) => e.k === tipoZona(elegido.etiqueta))?.etiqueta || "Texto"} «${elegido.etiqueta}»`}</p>
          {elegido.tipo === "step" ? (
            <label className="text-xs font-bold">
              Número o letra
              <input value={elegido.numero ?? ""} maxLength={4} onChange={(e) => { const v = e.target.value.toUpperCase().replace(/[^0-9A-ZÑ]/g, ""); editar({ numero: /^\d+$/.test(v) ? Number(v) : v }); }} className="block mt-0.5 w-20 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800" />
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
