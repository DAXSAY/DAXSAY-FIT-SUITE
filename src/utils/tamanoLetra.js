// Tamaño de letra de TODO el sistema (todo escala desde html font-size).
// Se guarda por equipo: la PC de recepción con pantalla de 32" puede ir en «Grande»
// y la laptop en «Normal». Si nunca se eligió, las pantallas muy anchas suben solas.
const CLAVE = "rd_tamano_letra";
export const TAMANOS = [
  { k: "normal", etiqueta: "Normal", px: 13 },
  { k: "mediano", etiqueta: "Mediano", px: 14.5 },
  { k: "grande", etiqueta: "Grande", px: 16 },
  { k: "muy_grande", etiqueta: "Muy grande", px: 18 },
];

export function tamanoGuardado() {
  try {
    const v = localStorage.getItem(CLAVE);
    if (TAMANOS.some((t) => t.k === v)) return v;
  } catch {}
  const w = window.screen?.width || window.innerWidth;
  return w >= 3000 ? "grande" : w >= 2400 ? "mediano" : "normal";
}

export function aplicarTamano(k) {
  const t = TAMANOS.find((x) => x.k === k) || TAMANOS[0];
  document.documentElement.style.fontSize = `${t.px}px`;
  document.documentElement.dataset.tamano = t.k;
  return t;
}

export function cambiarTamano(k) {
  try {
    localStorage.setItem(CLAVE, k);
  } catch {}
  aplicarTamano(k);
  window.dispatchEvent(new CustomEvent("radical:tamano", { detail: k }));
}
