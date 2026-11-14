// Aviso breve (toast) abajo a la derecha. Desaparece solo en unos segundos.
export function avisoBreve(texto, tipo = "ok", ms = 3200) {
  if (typeof document === "undefined") return;
  let caja = document.getElementById("rd-avisos-breves");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "rd-avisos-breves";
    caja.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none";
    document.body.appendChild(caja);
  }
  const el = document.createElement("div");
  el.className = `rd-aviso-breve rd-aviso-breve-${tipo}`;
  el.textContent = texto;
  caja.appendChild(el);
  setTimeout(() => el.classList.add("rd-aviso-breve-sale"), ms);
  setTimeout(() => el.remove(), ms + 400);
}
