import { useEffect, useRef } from "react";
// Todas las ventanas que se abren (fichas, formularios, reportes…) tienen
// los MISMOS controles: «← Volver» a la izquierda y «✕» para cerrar.
// Si una ventana trae solo uno de los dos, aquí se agrega el que falta (los
// dos hacen lo mismo: cerrar y volver a donde estabas). La tecla Esc y el
// botón «atrás» del navegador también cierran la ventana de encima.

const ES_X = (b) =>
  !!b.querySelector("svg.lucide-x, svg.lucide-circle-x, svg[class*='lucide-x ']") ||
  /^[✕×xX]$/.test((b.textContent || "").trim()) ||
  /^cerrar$/i.test(b.getAttribute("title") || "") ||
  /^cerrar$/i.test(b.getAttribute("aria-label") || "");
const ES_VOLVER = (b) =>
  /(^|\s)(←\s*)?volver\b/i.test((b.textContent || "").trim()) || !!b.querySelector("svg.lucide-arrow-left, svg.lucide-chevron-left");
const ES_CANCELAR = (b) => /^(cancelar|cerrar)$/i.test((b.textContent || "").trim());

const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

/** Ventanas abiertas (la de más arriba al final) */
const ventanas = () =>
  [...document.querySelectorAll(".fixed.inset-0")].filter(
    (v) => visible(v) && !v.closest("[data-sin-controles]") && v.querySelector("button") && v.id !== "rd-avisos-breves",
  );

// Botones de la ventana (sin el fondo oscuro clicable, que también "cierra")
const botonesDe = (v) =>
  [...v.querySelectorAll("button")].filter((b) => {
    if (!visible(b) || b.disabled) return false;
    if (/\binset-0\b/.test(b.className)) return false;
    const r = b.getBoundingClientRect();
    return r.width < window.innerWidth * 0.6 || r.height < 200;
  });

function cerradorDe(v) {
  const bs = botonesDe(v);
  return bs.find((b) => ES_X(b) && !/^(volver|cerrar)$/.test(b.dataset.rdCtrl || "")) || bs.find((b) => ES_VOLVER(b) && !/^(volver|cerrar)$/.test(b.dataset.rdCtrl || "")) || bs.find(ES_CANCELAR) || null;
}

const crear = (tipo, onClick) => {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.rdCtrl = tipo;
  b.className = tipo === "volver" ? "rd-ctrl-volver" : "rd-ctrl-cerrar";
  b.title = tipo === "volver" ? "Volver" : "Cerrar";
  b.setAttribute("aria-label", b.title);
  b.innerHTML = tipo === "volver" ? "<span aria-hidden='true'>←</span> Volver" : "<span aria-hidden='true'>✕</span>";
  b.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return b;
};

// Tarjeta visible de la ventana (no el fondo de pantalla completa)
// Panel de la ventana que contiene al botón (el hijo directo de la ventana; no el fondo oscuro)
function hojaDe(v, ref) {
  const marcada = v.querySelector(".rd-hoja");
  if (marcada && (!ref || marcada.contains(ref))) return marcada;
  let el = ref;
  while (el && el.parentElement && el.parentElement !== v) el = el.parentElement;
  return el && el.parentElement === v ? el : v.firstElementChild;
}

function tarjetaDe(v, ref) {
  const anchoV = v.getBoundingClientRect().width;
  // 1) La tarjeta redondeada más cercana al botón, si no ocupa toda la pantalla
  let el = ref?.parentElement;
  while (el && el !== v) {
    const r = el.getBoundingClientRect();
    if (r.width < anchoV * 0.8 && r.height > 120 && /rounded/.test(el.className)) return el;
    el = el.parentElement;
  }
  // 2) Si no, la hoja principal de la ventana
  return hojaDe(v, ref);
}

function completar(v) {
  const bs = botonesDe(v);
  const x = bs.find((b) => ES_X(b) && !/^(volver|cerrar)$/.test(b.dataset.rdCtrl || ""));
  const volver = bs.find((b) => ES_VOLVER(b) && !/^(volver|cerrar)$/.test(b.dataset.rdCtrl || ""));
  const cerrador = x || volver || bs.find(ES_CANCELAR);
  if (!cerrador) return;
  // Mismo aspecto en todas las ventanas: la ✕ (solo ícono) y «← Volver»
  if (x && !(x.textContent || "").trim().replace(/[✕×]/g, "") && !x.classList.contains("rd-ctrl-cerrar")) x.classList.add("rd-ctrl-cerrar", "rd-ctrl-unificado");
  if (volver && (volver.textContent || "").trim().length <= 24 && !volver.classList.contains("rd-ctrl-volver")) volver.classList.add("rd-ctrl-volver", "rd-ctrl-unificado");
  const cerrar = () => cerradorDe(v)?.click();
  // Falta «Volver»: se pone justo antes de la X, en la misma barra
  // Falta «Volver»: va al inicio de la barra de título (a la izquierda), como en el resto del sistema
  if (!volver && x && !v.querySelector("[data-rd-ctrl='volver']")) {
    const hoja = hojaDe(v, x);
    const anchoHoja = hoja ? hoja.getBoundingClientRect().width : 0;
    let fila = x.parentElement;
    while (fila && fila !== hoja && fila.getBoundingClientRect().width < anchoHoja * 0.8) fila = fila.parentElement;
    const b = crear("volver", cerrar);
    if (fila && fila !== hoja && getComputedStyle(fila).display.includes("flex")) {
      b.style.flexShrink = "0";
      const grupo = fila.firstElementChild;
      if (grupo && grupo !== x && !grupo.contains(x) && getComputedStyle(grupo).display.includes("flex")) grupo.insertBefore(b, grupo.firstChild);
      else fila.insertBefore(b, fila.firstChild);
    } else x.parentElement.insertBefore(b, x);
  }
  // Falta la X: va en la misma barra que «Volver», pegada a la derecha
  if (!x && volver && !v.querySelector("[data-rd-ctrl='cerrar']")) {
    const hoja = hojaDe(v, volver);
    const anchoHoja = hoja ? hoja.getBoundingClientRect().width : 0;
    let fila = volver.parentElement;
    while (fila && fila !== hoja && fila.getBoundingClientRect().width < anchoHoja * 0.8) fila = fila.parentElement;
    if (fila && fila !== hoja && getComputedStyle(fila).display.includes("flex")) {
      const b = crear("cerrar", cerrar);
      b.style.marginLeft = "auto";
      fila.appendChild(b);
      return;
    }
  }
  // Si no hay barra, la X va en la esquina superior derecha de la tarjeta
  if (!x && (volver || cerrador) && !v.querySelector("[data-rd-ctrl='cerrar']")) {
    const hoja = tarjetaDe(v, cerrador);
    if (hoja && !hoja.querySelector(":scope > [data-rd-ctrl='cerrar']")) {
      if (getComputedStyle(hoja).position === "static") hoja.style.position = "relative";
      const b = crear("cerrar", cerrar);
      b.classList.add("rd-ctrl-esquina");
      hoja.appendChild(b);
    }
  }
  // Solo «Cancelar» al final: se agrega «Volver» arriba a la izquierda
  if (!x && !volver) {
    const hoja = tarjetaDe(v, cerrador);
    if (hoja && !hoja.querySelector(":scope > [data-rd-ctrl='volver']")) {
      if (getComputedStyle(hoja).position === "static") hoja.style.position = "relative";
      const b = crear("volver", cerrar);
      b.classList.add("rd-ctrl-esquina-izq");
      hoja.appendChild(b);
    }
  }
}

// Pantallas internas de un módulo (editor de rutinas, progreso de un alumno…):
// se registran aquí para que el botón «atrás» del navegador las cierre.
const pilaInternas = [];
export function useAtras(activo, onCerrar) {
  const ref = useRef(onCerrar);
  ref.current = onCerrar;
  useEffect(() => {
    if (!activo) return;
    const entrada = () => ref.current?.();
    pilaInternas.push(entrada);
    return () => {
      const i = pilaInternas.lastIndexOf(entrada);
      if (i >= 0) pilaInternas.splice(i, 1);
    };
  }, [activo]);
}

/** Cierra la ventana de más arriba (o la pantalla interna abierta). Devuelve true si cerró algo. */
export function cerrarVentanaSuperior({ incluirInternas = true } = {}) {
  const lista = ventanas();
  const v = lista[lista.length - 1];
  const c = v && cerradorDe(v);
  if (c) {
    c.click();
    return true;
  }
  if (incluirInternas && pilaInternas.length) {
    pilaInternas[pilaInternas.length - 1]();
    return true;
  }
  return false;
}

let instalado = false;
export function instalarControlesVentanas() {
  if (instalado || typeof document === "undefined") return;
  instalado = true;
  let pendiente = false;
  const revisar = () => {
    pendiente = false;
    ventanas().forEach(completar);
  };
  new MutationObserver(() => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(revisar);
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.value) return; // Esc en un campo con texto no cierra
    if (cerrarVentanaSuperior({ incluirInternas: false })) e.preventDefault();
  });
}

export const hayVentanaAbierta = () => ventanas().length > 0 || pilaInternas.length > 0;
