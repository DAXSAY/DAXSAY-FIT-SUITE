// =====================================================================
// Croquis del salón de clases grupales
//  - Ver: cada step con su número; libre, reservado, llegó o «el tuyo».
//  - Editar (administración): arrastra en un espacio vacío para dibujar un
//    step o una zona; arrastra un step para moverlo; cámbiale el número o
//    el tamaño; bórralo. Todos ven el mismo croquis.
// Las medidas son casillas de una cuadrícula (por defecto 40 × 28).
// Elementos: steps (con número o letra) y zonas: muro, columna, baranda,
// profesor, consola, puerta, espejo o un texto libre. Nada se superpone:
// si un elemento cae encima de otro, se elige hacia dónde desplazarlos. El tipo de zona se
// reconoce por su texto (por ejemplo «Muro» o «Columna 2»).
// =====================================================================
import React, { useMemo, useRef, useState } from "react";
import { Trash2, Plus, Square, Type, ListOrdered, Undo2, BrickWall, Columns2, Fence, User, Speaker, DoorOpen, RectangleHorizontal, CaseSensitive, LayoutTemplate, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCw, Save } from "lucide-react";

const pct = (v, total) => `${(v / total) * 100}%`;
/** Los steps se dibujan un poco más chicos que su casilla: así respiran y nunca se pegan */
const AIRE = 0.16;
export const cajaStep = (z, ancho, alto) => ({ left: pct(z.x + AIRE, ancho), top: pct(z.y + AIRE, alto), width: pct(z.w - 2 * AIRE, ancho), height: pct(z.h - 2 * AIRE, alto) });
const cajaZona = (z, ancho, alto) => ({ left: pct(z.x, ancho), top: pct(z.y, alto), width: pct(z.w, ancho), height: pct(z.h, alto) });
/** ¿Dos elementos ocupan alguna casilla en común? */
export const chocan = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Pares de elementos que están uno encima del otro */
export const solapados = (lista) => {
  const out = [];
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) if (chocan(lista[i], lista[j])) out.push([lista[i], lista[j]]);
  return out;
};
const estructura = (z) => z.tipo === "zona" && ["muro", "columna"].includes(tipoZona(z.etiqueta));
/**
 * Desplaza en la dirección elegida todo lo que choca con el elemento «ancla»
 * (y, en cadena, lo que esos a su vez empujen). Muros y columnas no se mueven:
 * lo empujado pasa al otro lado. Devuelve la lista nueva o null si no entra.
 */
export function desplazar(lista, ancla, dir, ancho, alto, clave) {
  const L = lista.map((z) => ({ ...z }));
  const fija = (z) => clave(z) === ancla || estructura(z);
  const adelante = { der: (z) => z.x, izq: (z) => -(z.x + z.w), aba: (z) => z.y, arr: (z) => -(z.y + z.h) }[dir];
  for (let vuelta = 0; vuelta < 2000; vuelta++) {
    let movio = false;
    for (const b of L) {
      if (fija(b)) continue;
      const a = L.find((o) => o !== b && chocan(o, b) && (fija(o) || adelante(o) < adelante(b) || (adelante(o) === adelante(b) && L.indexOf(o) < L.indexOf(b))));
      if (!a) continue;
      if (dir === "der") b.x = a.x + a.w;
      if (dir === "izq") b.x = a.x - b.w;
      if (dir === "aba") b.y = a.y + a.h;
      if (dir === "arr") b.y = a.y - b.h;
      if (b.x < 0 || b.y < 0 || b.x + b.w > ancho || b.y + b.h > alto) return null;
      movio = true;
    }
    if (!movio) return L;
  }
  return null;
}

/** Tipos de zona: se reconocen por el texto que tienen */
export const ELEMENTOS = [
  { k: "muro", etiqueta: "Muro", icono: BrickWall, w: 10, h: 1, sinTexto: true },
  { k: "columna", etiqueta: "Columna", icono: Columns2, w: 2, h: 2, sinTexto: true },
  { k: "baranda", etiqueta: "Baranda", icono: Fence, w: 14, h: 1 },
  { k: "profesor", etiqueta: "Profesor", icono: User, w: 10, h: 5 },
  { k: "consola", etiqueta: "Consola", icono: Speaker, w: 5, h: 2 },
  { k: "puerta", etiqueta: "Puerta", icono: DoorOpen, w: 4, h: 1 },
  { k: "espejo", etiqueta: "Espejo", icono: RectangleHorizontal, w: 24, h: 1 },
];
export const tipoZona = (etiqueta) => {
  const t = String(etiqueta || "").toLowerCase();
  if (/muro|pared/.test(t)) return "muro";
  if (/columna|pilar/.test(t)) return "columna";
  if (/baranda/.test(t)) return "baranda";
  if (/instructor|profesor/.test(t)) return "profesor";
  if (/consola|sonido|equipo de m/.test(t)) return "consola";
  if (/puerta|entrada|salida/.test(t)) return "puerta";
  if (/espejo/.test(t)) return "espejo";
  return "zona";
};
/** Dibujo de una zona (muro y columna sin texto) */
const Zona = ({ z, estilo, sel = false, editor = false, mal = false }) => {
  const k = tipoZona(z.etiqueta);
  const sinTexto = k === "muro" || k === "columna";
  return (
    <div
      title={z.etiqueta}
      className={`rd-zona rd-zona-${k} absolute flex items-center justify-center text-[9px] sm:text-xs font-black uppercase tracking-wider overflow-hidden ${sel ? "rd-zona-sel" : ""} ${mal ? "rd-choca" : ""} ${editor ? "cursor-move" : ""}`}
      style={estilo}
    >
      {!sinTexto && <span className="truncate px-0.5">{/^instructor$/i.test(String(z.etiqueta).trim()) ? "Profesor" : z.etiqueta}</span>}
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
      { tipo: "zona", etiqueta: "Profesor", x: 14, y: 17, w: 10, h: 6 },
      { tipo: "zona", etiqueta: "Consola", x: 0, y: 24, w: 5, h: 2 },
    ],
  },
  {
    k: "columnas",
    nombre: "Salón con columnas · ejemplo",
    elementos: () => [
      { tipo: "zona", etiqueta: "Espejo", x: 6, y: 0, w: 28, h: 1 },
      { tipo: "zona", etiqueta: "Profesor", x: 15, y: 2, w: 10, h: 3 },
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
  if (r.debe) return "rd-step rd-step-deuda";
  if (r.externo) return "rd-step rd-step-externo";
  if (r.estado === "asistio") return "rd-step rd-step-llego";
  return "rd-step rd-step-reservado";
};

const Muestra = ({ c, t }) => (
  <span className="flex items-center gap-1.5"><i className={`rd-step ${c} w-5 h-4 rounded inline-block border-2`} /> {t}</span>
);
/** Leyenda de estados del croquis. conExterno: másters (socios y externos comparten el salón) */
export const LeyendaCroquis = ({ conMio = false, conExterno = false, conDeuda = false }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-bold text-slate-600">
    <Muestra c="rd-step-libre" t="Libre" />
    <Muestra c="rd-step-reservado" t={conExterno ? "Socio" : "Reservado"} />
    <Muestra c="rd-step-llego" t={conExterno ? "Socio asistió" : "Asistió"} />
    {conExterno && <Muestra c="rd-step-externo" t="Externo" />}
    {conDeuda && <Muestra c="rd-step-deuda" t="Saldo pendiente" />}
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
      <div className="rd-croquis mx-auto" style={{ minWidth: 320 }}>
        <div className="rd-croquis-pad">
        <div className="relative" style={{ aspectRatio: `${ancho} / ${alto}` }}>
          {steps.map((z) => {
            if (z.tipo === "zona") return <Zona key={z.id} z={z} estilo={cajaZona(z, ancho, alto)} />;
            const r = porStep.get(z.id);
            const sel = seleccionado === z.id;
            return (
              <button
                key={z.id}
                type="button"
                disabled={deshabilitado || !onStep}
                onClick={() => onStep?.(z, r)}
                title={r ? `Step ${z.numero} · ${r.alumno || (r.mia ? "Tu step" : r.estado === "asistio" ? "Asistió" : "Reservado")}${r.externo ? " · externo" : ""}${r.debe ? ` · debe S/ ${Number(r.saldo).toFixed(2)}` : ""}` : `Step ${z.numero} · libre`}
                className={`${claseStep(r, sel)} absolute rounded-md border flex flex-col items-center justify-center leading-none overflow-hidden ${onStep && !deshabilitado ? "cursor-pointer" : "cursor-default"}`}
                style={cajaStep(z, ancho, alto)}
              >
                {/* Dos líneas como máximo para que nada se corte: número (y ✓) y, debajo, el saldo o el nombre */}
                <span className="text-[10px] sm:text-[13px] font-black leading-none whitespace-nowrap">
                  {z.numero}
                  {r?.estado === "asistio" && <span className="text-[9px] sm:text-[10px] ml-0.5">✓</span>}
                </span>
                {r?.debe ? (
                  <span className="text-[8px] sm:text-[10px] font-black leading-tight mt-px whitespace-nowrap">S/{Number(r.saldo).toFixed(0)}</span>
                ) : (
                  nombres && r?.alumno && <span className="hidden md:block text-[9px] font-bold leading-tight mt-px truncate max-w-full px-0.5">{r.alumno.split(" ")[0]}</span>
                )}
              </button>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};

/** Editor del croquis (solo administración) */
const DIRS = [
  ["izq", ArrowLeft, "Desplazar a la izquierda"],
  ["der", ArrowRight, "Desplazar a la derecha"],
  ["arr", ArrowUp, "Desplazar hacia arriba"],
  ["aba", ArrowDown, "Desplazar hacia abajo"],
];
const nombreEl = (z) => (z.tipo === "step" ? `step ${z.numero}` : String(/^instructor$/i.test(z.etiqueta) ? "Profesor" : z.etiqueta || "zona").toLowerCase());

/** Miniatura del elemento que se va a dibujar (forma y tamaño reales) */
const Miniatura = ({ k, w, h }) => {
  const esc = 4; // px por casilla
  const esStep = k === "step" || k === "letra";
  return (
    <span className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5" style={{ minWidth: 56, minHeight: 34 }}>
      <i
        className={`${esStep ? "rd-step rd-step-libre rounded-[3px] border" : `rd-zona rd-zona-${k === "zona" ? "zona" : k}`} inline-block`}
        style={{ width: Math.max(4, w * esc), height: Math.max(4, h * esc) }}
      />
    </span>
  );
};

export const EditorCroquis = ({ croquis, onCambiar, plantillas = [], onGuardarPlantilla, onBorrarPlantilla }) => {
  const { ancho = 40, alto = 28 } = croquis;
  const steps = croquis.steps;
  const lienzo = useRef(null);
  const [herramienta, setHerramienta] = useState(null); // nada elegido hasta que la persona elija
  const [vertical, setVertical] = useState(false);
  const [sel, setSel] = useState(null);
  const [dibujo, setDibujo] = useState(null); // { x0, y0, x1, y1 }
  const [arrastre, setArrastre] = useState(null); // { key, dx, dy }
  const [hover, setHover] = useState(null); // casilla bajo el puntero
  const [historial, setHistorial] = useState([]);
  const [aviso, setAviso] = useState("");
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
  const esStep = herramienta === "step" || herramienta === "letra";
  // Tamaño normal del elemento elegido (girado si se pidió vertical)
  const base = esStep ? { w: 3, h: 2 } : herr ? { w: herr.w, h: herr.h } : { w: 8, h: 2 };
  const tam = vertical && base.w !== base.h ? { w: base.h, h: base.w } : base;
  const nombreHerr = herramienta === "step" ? "Step con número" : herramienta === "letra" ? "Step con letra" : herr ? herr.etiqueta : herramienta === "zona" ? "Texto libre" : "";

  // Plantillas: las de ejemplo y las guardadas por el gimnasio
  const [plantilla, setPlantilla] = useState("");
  const [nombrePlantilla, setNombrePlantilla] = useState("");
  const [guardando, setGuardando] = useState(false);
  const todas = [
    ...plantillas.map((p) => ({ k: `g${p.id}`, id: p.id, nombre: `💾 ${p.nombre} · ${p.steps} steps`, elementos: () => p.elementos, propia: true })),
    ...PLANTILLAS.map((p) => ({ ...p, nombre: `📐 ${p.nombre}` })),
  ];
  const usarPlantilla = () => {
    const p = todas.find((x) => x.k === plantilla);
    if (!p) return;
    const viejos = steps.filter((z) => z.tipo === "step");
    // Reusa los steps que ya existían con el mismo nombre (así no se pierden reservas)
    const nuevos = p.elementos().map((z, i) => {
      const prev = z.tipo === "step" && viejos.find((v) => String(v.numero) === String(z.numero));
      const { id: _id, ...resto } = z; // eslint-disable-line no-unused-vars
      return prev ? { ...resto, id: prev.id } : { ...resto, tmp: `p${Date.now()}${i}` };
    });
    cambiar(nuevos);
    setSel(null);
    setPlantilla("");
  };
  const guardarPlantilla = async () => {
    if (!nombrePlantilla.trim()) return setAviso("Ponle un nombre a la plantilla.");
    setGuardando(true);
    try {
      await onGuardarPlantilla?.(nombrePlantilla.trim(), steps);
      setAviso(`💾 Plantilla «${nombrePlantilla.trim()}» guardada: la puedes usar en cualquier sede.`);
      setNombrePlantilla("");
    } catch (e) {
      setAviso(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const enCasilla = (c) => [...steps].reverse().find((s) => c.x >= s.x && c.x < s.x + s.w && c.y >= s.y && c.y < s.y + s.h);
  const bajar = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const c = celda(e);
    const z = enCasilla(c);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setAviso("");
    if (z) {
      setSel(clave(z));
      setHistorial((h) => [...h.slice(-30), steps]);
      setArrastre({ key: clave(z), dx: c.x - z.x, dy: c.y - z.y });
    } else {
      setSel(null);
      if (!herramienta) return setAviso("👆 Primero elige arriba qué quieres dibujar (step, muro, columna…).");
      setDibujo({ x0: c.x, y0: c.y, x1: c.x, y1: c.y });
    }
  };
  const mover = (e) => {
    const c = celda(e);
    setHover(c);
    if (!arrastre && !dibujo) return;
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
      // Un toque (sin arrastrar) crea el elemento de su tamaño normal (como la sombra)
      if (w === 1 && h === 1) (w = tam.w), (h = tam.h);
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
  const salir = () => (soltar(), setHover(null));
  const editar = (campos) => cambiar(steps.map((z) => (clave(z) === sel ? { ...z, ...campos } : z)));
  const girar = () => {
    if (!elegido) return;
    const w = Math.min(elegido.h, ancho);
    const h = Math.min(elegido.w, alto);
    editar({ w, h, x: Math.min(elegido.x, ancho - w), y: Math.min(elegido.y, alto - h) });
  };
  const borrar = () => (cambiar(steps.filter((z) => clave(z) !== sel)), setSel(null));
  const renumerar = () => {
    let n = 0;
    const orden = [...steps].filter((z) => z.tipo === "step" && /^\d+$/.test(String(z.numero))).sort((a, b) => a.y - b.y || a.x - b.x);
    const num = new Map(orden.map((z) => [clave(z), ++n]));
    cambiar(steps.map((z) => (z.tipo === "step" ? { ...z, numero: num.get(clave(z)) } : z)));
  };
  const agregarFila = () => {
    const ultima = Math.max(0, ...steps.map((z) => z.y + z.h));
    if (ultima + 3 > alto) return setAviso("No queda espacio abajo para otra fila de steps.");
    let n = siguienteNumero();
    const fila = [];
    for (let x = 2; x + 3 <= ancho - 1; x += 4) fila.push({ tmp: `f${Date.now()}${x}`, tipo: "step", numero: n++, x, y: ultima + 1, w: 3, h: 2 });
    cambiar([...steps, ...fila]);
  };

  // Superposiciones: en una casilla no puede haber dos elementos
  const pares = useMemo(() => solapados(steps), [steps]);
  const enConflicto = useMemo(() => new Set(pares.flat().map(clave)), [pares]); // eslint-disable-line react-hooks/exhaustive-deps
  // El elemento que se resuelve: el seleccionado si choca; si no, el primero que choque
  const ancla = elegido && enConflicto.has(clave(elegido)) ? elegido : pares[0]?.[1];
  const tocados = ancla ? steps.filter((z) => z !== ancla && chocan(z, ancla)) : [];
  const sugerida = ancla ? (ancla.h > ancla.w ? ["izq", "der"] : ["arr", "aba"]) : [];
  const resolver = (dir) => {
    const nuevo = desplazar(steps, clave(ancla), dir, ancho, alto, clave);
    if (!nuevo) return setAviso(`No hay espacio para desplazar hacia ${{ izq: "la izquierda", der: "la derecha", arr: "arriba", aba: "abajo" }[dir]}: prueba otra dirección o achica el elemento.`);
    setAviso("");
    cambiar(nuevo);
  };

  const totalSteps = steps.filter((z) => z.tipo === "step").length;
  const enDibujo = dibujo && {
    x: Math.min(dibujo.x0, dibujo.x1),
    y: Math.min(dibujo.y0, dibujo.y1),
    w: Math.abs(dibujo.x1 - dibujo.x0) + 1,
    h: Math.abs(dibujo.y1 - dibujo.y0) + 1,
  };
  // Sombra: dónde y de qué tamaño quedará el elemento antes de soltarlo
  const sombra =
    enDibujo && (enDibujo.w > 1 || enDibujo.h > 1)
      ? enDibujo
      : herramienta && !arrastre && hover && !enCasilla(hover)
        ? { x: Math.min(hover.x, ancho - tam.w), y: Math.min(hover.y, alto - tam.h), w: tam.w, h: tam.h }
        : null;
  const sombraChoca = sombra && steps.some((z) => chocan(z, sombra));

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
          <button key={k} type="button" onClick={() => setHerramienta((x) => (x === k ? null : k))} className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${herramienta === k ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
            <I className="w-3.5 h-3.5" /> {l}
          </button>
        ))}
      </div>

      {/* Vista previa del elemento elegido (nada elegido al entrar) */}
      {herramienta ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-2.5 flex flex-wrap items-center gap-3">
          <Miniatura k={herramienta} w={tam.w} h={tam.h} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800">{nombreHerr}</p>
            <p className="text-[11px] text-slate-500">Tamaño normal: {tam.w} × {tam.h} casillas. Mueve el puntero sobre el salón y verás su sombra; un toque lo coloca, o arrastra para darle otro tamaño. Toca el botón otra vez para soltarlo.</p>
          </div>
          {!esStep && base.w !== base.h && (
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-bold">
              {[[false, "▬ Horizontal"], [true, "▮ Vertical"]].map(([v, l]) => (
                <button key={l} type="button" onClick={() => setVertical(v)} className={`px-3 py-1.5 cursor-pointer ${vertical === v ? "bg-teal-600 text-white" : "bg-white text-slate-600"}`}>{l}</button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 p-2.5 text-xs text-slate-500">👆 Elige arriba qué quieres dibujar y verás su forma y tamaño antes de colocarlo. Sin elegir nada, puedes tocar un elemento para editarlo o arrastrarlo para moverlo.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
        <select value={plantilla} onChange={(e) => setPlantilla(e.target.value)} className="px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 max-w-full">
          <option value="">Empezar desde una plantilla…</option>
          {todas.map((p) => <option key={p.k} value={p.k}>{p.nombre}</option>)}
        </select>
        {plantilla && <button type="button" onClick={usarPlantilla} className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-black cursor-pointer">Usar esta plantilla</button>}
        {plantilla && todas.find((p) => p.k === plantilla)?.propia && onBorrarPlantilla && (
          <button type="button" onClick={() => { const p = todas.find((x) => x.k === plantilla); if (window.confirm(`¿Borrar la plantilla guardada «${p.nombre.replace(/^💾 /, "")}»? El croquis de las sedes no cambia.`)) onBorrarPlantilla(p.id).then(() => setPlantilla("")).catch((e) => setAviso(e.message)); }} className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Borrar plantilla
          </button>
        )}
        {onGuardarPlantilla && (
          <span className="flex items-center gap-1.5 ml-auto">
            <input value={nombrePlantilla} onChange={(e) => setNombrePlantilla(e.target.value)} maxLength={80} placeholder="Nombre, ej. Salón principal" className="w-48 px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800" />
            <button type="button" disabled={guardando || !steps.length} onClick={guardarPlantilla} className="px-3 py-1.5 rounded-xl border border-teal-300 bg-teal-50 text-teal-800 text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-40">
              <Save className="w-3.5 h-3.5" /> Guardar como plantilla
            </button>
          </span>
        )}
      </div>
      {aviso && <p className="text-xs font-bold rounded-xl border p-2.5 rd-kpi-ambar rd-aviso-t">{aviso}</p>}

      <div className="rd-croquis-marco w-full overflow-x-auto">
        {/* La cuadrícula sigue por el margen: el margen mide justo una casilla */}
        <div className="rd-croquis mx-auto overflow-hidden" style={{ minWidth: 420 }}>
          <div className="rd-croquis-pad rd-croquis-editor" style={{ backgroundOrigin: "content-box", backgroundSize: `${100 / ancho}% ${100 / alto}%`, backgroundPosition: "0 0" }}>
          <div
            ref={lienzo}
            className="relative touch-none select-none"
            style={{ aspectRatio: `${ancho} / ${alto}` }}
            onPointerDown={bajar}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerLeave={salir}
          >
            {steps.map((z) => {
              const on = clave(z) === sel;
              const mal = enConflicto.has(clave(z));
              return z.tipo === "zona" ? (
                <Zona key={clave(z)} z={z} estilo={cajaZona(z, ancho, alto)} sel={on} mal={mal} editor />
              ) : (
                <div key={clave(z)} className={`${on ? "rd-step rd-step-sel" : "rd-step rd-step-libre"} ${mal ? "rd-choca" : ""} absolute rounded-md border flex items-center justify-center text-[10px] sm:text-[13px] font-black cursor-move`} style={cajaStep(z, ancho, alto)}>
                  {z.numero}
                </div>
              );
            })}
            {sombra && (
              <div className={`rd-sombra ${sombraChoca ? "rd-sombra-mal" : ""} absolute rounded-md pointer-events-none flex items-center justify-center text-[10px] font-black uppercase`} style={esStep ? cajaStep(sombra, ancho, alto) : cajaZona(sombra, ancho, alto)}>
                {sombra.w >= 3 && sombra.h >= 1 ? (esStep ? (herramienta === "step" ? siguienteNumero() : siguienteLetra()) : herr?.k === "muro" || herr?.k === "columna" ? "" : nombreHerr) : ""}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {ancla && (
        <div className="rd-kpi-rosa rd-aviso-t rounded-2xl border-2 p-3 space-y-2">
          <p className="text-sm font-black">
            ⚠️ {nombreEl(ancla).replace(/^./, (l) => l.toUpperCase())} está encima de {tocados.map(nombreEl).join(", ")}. En una casilla no puede haber dos elementos: ¿hacia dónde los desplazo?
          </p>
          <div className="flex flex-wrap gap-2">
            {DIRS.map(([d, I, l]) => (
              <button key={d} type="button" onClick={() => resolver(d)} className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer border ${sugerida.includes(d) ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-700"}`}>
                <I className="w-4 h-4" /> {l}
              </button>
            ))}
            <button type="button" disabled={!historial.length} onClick={() => (onCambiar(historial[historial.length - 1]), setHistorial((h) => h.slice(0, -1)))} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
              <Undo2 className="w-4 h-4" /> Deshacer
            </button>
          </div>
          <p className="text-[11px]">Los muros y columnas no se mueven: lo que empujes pasa al otro lado. No se puede guardar mientras haya elementos encimados.</p>
        </div>
      )}

      {elegido && (
        <div className="rd-kpi-teal rd-aviso-t rounded-2xl border p-3 flex flex-wrap items-end gap-3">
          <p className="text-xs font-black uppercase tracking-wider w-full">{elegido.tipo === "step" ? `Step ${elegido.numero}` : (() => { const t = ELEMENTOS.find((e) => e.k === tipoZona(elegido.etiqueta))?.etiqueta || "Texto"; return t.toLowerCase() === String(elegido.etiqueta).trim().toLowerCase() ? t : `${t} «${elegido.etiqueta}»`; })()}</p>
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
          <button type="button" onClick={girar} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <RotateCw className="w-3.5 h-3.5" /> Girar
          </button>
          <button type="button" onClick={borrar} className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Quitar
          </button>
        </div>
      )}
    </div>
  );
};
