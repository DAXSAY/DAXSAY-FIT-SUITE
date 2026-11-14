// Trabajar con varias ventanas a la vez (misma sesión):
// p. ej. en una marcas asistencias y en la otra tienes la caja abierta.
// La sesión se comparte entre pestañas del mismo navegador; cada ventana
// recuerda su propio módulo y todas se actualizan cuando otra guarda algo.

/** Abre un módulo en otra pestaña ("pestana") o en una ventana al lado ("lado"). */
export function abrirEnVentana(tab, modo = "pestana") {
  const url = `${window.location.origin}/?modulo=${encodeURIComponent(tab)}`;
  if (modo === "lado") {
    const w = Math.round((window.screen.availWidth || 1600) / 2);
    const h = window.screen.availHeight || 900;
    const otra = window.open(url, `radical-${tab}`, `popup=yes,width=${w},height=${h},left=${w},top=0`);
    if (otra) {
      try {
        window.moveTo(0, 0);
        window.resizeTo(w, h);
      } catch {
        /* el navegador no deja mover la ventana principal */
      }
      return;
    }
  }
  window.open(url, "_blank", "noopener");
}

/** Módulo pedido en la dirección (?modulo=cash), si hay uno */
export function moduloDeLaDireccion() {
  try {
    return new URLSearchParams(window.location.search).get("modulo");
  } catch {
    return null;
  }
}

// Aviso entre ventanas: cuando una guarda algo, las demás recargan datos al instante
let canal = null;
try {
  canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("radical-sync") : null;
} catch {
  canal = null;
}
export function avisarCambio() {
  try {
    canal?.postMessage({ tipo: "cambio", t: Date.now() });
  } catch {
    /* nada */
  }
}
export function alCambiarEnOtraVentana(fn) {
  if (!canal) return () => {};
  const h = (e) => e.data?.tipo === "cambio" && fn();
  canal.addEventListener("message", h);
  return () => canal.removeEventListener("message", h);
}
