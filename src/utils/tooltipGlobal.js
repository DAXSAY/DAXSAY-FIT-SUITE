// Tooltips y avisos de formulario con el diseño del sistema.
// - Cualquier elemento con title="..." muestra un globo redondeado propio
//   (en vez del cuadro negro del navegador).
// - Los campos obligatorios ya no muestran "Please fill out this field":
//   al enviar, sale un aviso propio en español junto al campo.

let globo = null;
let aviso = null;
let timerAviso = null;

const crear = (clase) => {
  const el = document.createElement("div");
  el.className = clase;
  el.setAttribute("role", "tooltip");
  document.body.appendChild(el);
  return el;
};

const ubicar = (el, ancla, abajo = false) => {
  const r = ancla.getBoundingClientRect();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = abajo ? r.bottom + 8 : r.top - h - 8;
  if (top < 8) top = r.bottom + 8;
  if (top + h > window.innerHeight - 8) top = r.top - h - 8;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
};

const textoDe = (el) => el.getAttribute("data-rd-tip") || "";

function mostrar(ancla) {
  const t = textoDe(ancla);
  if (!t) return;
  globo = globo || crear("rd-globo");
  globo.textContent = t;
  globo.classList.add("rd-globo-visible");
  ubicar(globo, ancla);
}
const ocultar = () => globo && globo.classList.remove("rd-globo-visible");

// Pasa el title a data-rd-tip (un title vacío apaga el cuadro negro y el
// mensaje de validación que el navegador muestra al pasar el mouse)
function preparar(el) {
  if (!el || el.nodeType !== 1) return;
  const t = el.getAttribute("title");
  if (t) {
    el.setAttribute("data-rd-tip", t);
    el.setAttribute("title", "");
    if (!el.getAttribute("aria-label") && !el.textContent.trim()) el.setAttribute("aria-label", t);
  } else if (t === null && el.matches("input, select, textarea")) {
    el.setAttribute("title", "");
  }
}

const MENSAJES = {
  valueMissing: "Completa este campo",
  typeMismatch: "Revisa el formato",
  patternMismatch: "Revisa el formato",
  tooShort: "Es muy corto",
  tooLong: "Es muy largo",
  rangeUnderflow: "El valor es muy bajo",
  rangeOverflow: "El valor es muy alto",
  stepMismatch: "Revisa el valor",
  badInput: "Revisa el valor",
};

function mostrarAviso(campo) {
  const v = campo.validity;
  const clave = Object.keys(MENSAJES).find((k) => v[k]);
  const visible = campo.offsetParent ? campo : campo.parentElement;
  aviso = aviso || crear("rd-globo rd-globo-aviso");
  aviso.textContent = `⚠ ${MENSAJES[clave] || "Revisa este campo"}`;
  aviso.classList.add("rd-globo-visible");
  ubicar(aviso, visible, true);
  campo.classList.add("rd-campo-error");
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => aviso.classList.remove("rd-globo-visible"), 2800);
  const quitar = () => {
    campo.classList.remove("rd-campo-error");
    aviso.classList.remove("rd-globo-visible");
  };
  campo.addEventListener("input", quitar, { once: true });
  campo.addEventListener("change", quitar, { once: true });
}

export function instalarTooltipGlobal() {
  if (typeof document === "undefined" || window.__rdTooltip) return;
  window.__rdTooltip = true;

  document.addEventListener(
    "mouseover",
    (e) => {
      const el = e.target.closest?.("[title], [data-rd-tip]");
      if (!el) return ocultar();
      preparar(el);
      if (textoDe(el)) mostrar(el);
    },
    true,
  );
  document.addEventListener("mouseout", (e) => {
    const el = e.target.closest?.("[data-rd-tip]");
    if (el && !el.contains(e.relatedTarget)) ocultar();
  }, true);
  document.addEventListener("mousedown", ocultar, true);
  window.addEventListener("scroll", ocultar, true);

  // Un solo aviso a la vez: el primer campo inválido del formulario
  let ultimoInvalido = 0;
  document.addEventListener(
    "invalid",
    (e) => {
      e.preventDefault();
      const ahora = Date.now();
      if (ahora - ultimoInvalido < 300) return;
      ultimoInvalido = ahora;
      const campo = e.target;
      try {
        campo.focus({ preventScroll: false });
      } catch {
        /* no enfocable */
      }
      mostrarAviso(campo);
    },
    true,
  );

  // Campos nuevos en pantalla: sin cuadro negro de validación
  const obs = new MutationObserver((lista) => {
    for (const m of lista) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches?.("input, select, textarea")) preparar(n);
        n.querySelectorAll?.("input, select, textarea").forEach(preparar);
      });
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll("input, select, textarea").forEach(preparar);
}
