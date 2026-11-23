// Coloca la ventanita (calendario u hora) SIEMPRE debajo del campo.
// Al abrirla, si no entra abajo, se desplaza la página para hacerle espacio
// en vez de ponerla encima de todo.
const desplazable = (el) => {
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
  }
  return document.scrollingElement || document.documentElement;
};

export function ubicarDebajo(caja, campo, alAbrir = false) {
  if (!caja || !campo) return;
  const w = caja.offsetWidth;
  const h = caja.offsetHeight;
  let r = campo.getBoundingClientRect();
  const falta = r.bottom + 6 + h - (window.innerHeight - 8);
  if (alAbrir && falta > 0) {
    const cont = desplazable(campo);
    // no subir el campo por encima del borde de arriba
    const mover = Math.min(falta, Math.max(0, r.top - 64));
    if (mover > 0) {
      cont.scrollTop += mover;
      r = campo.getBoundingClientRect();
    }
  }
  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  caja.style.left = `${left}px`;
  caja.style.top = `${r.bottom + 6}px`;
  // Si la pantalla es muy baja, la ventanita se recorre por dentro
  const libre = window.innerHeight - (r.bottom + 6) - 8;
  caja.style.maxHeight = libre < h && libre > 160 ? `${libre}px` : "";
  caja.style.overflowY = caja.style.maxHeight ? "auto" : "";
}
