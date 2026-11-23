// Selector de hora propio para TODOS los campos de hora del sistema
// (input type="time"): reemplaza la ruedita gris del navegador por una ventanita
// con el diseño del sistema (mismo estilo que el calendario), en modo claro y oscuro.
// El campo sigue siendo el mismo: también se puede escribir la hora con el teclado.

const p2 = (n) => String(n).padStart(2, "0");
let caja = null;
let campo = null;
let meridiano = "AM"; // AM / PM que se está mirando

const esCampo = (el) => el instanceof HTMLInputElement && el.type === "time" && !el.disabled && !el.readOnly;

const aMin = (v) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(v || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const texto = (min) => {
  if (min == null) return "--:--";
  const h = Math.floor(min / 60);
  return `${p2(h % 12 || 12)}:${p2(min % 60)} ${h < 12 ? "AM" : "PM"}`;
};
const ahoraLima = () => {
  const f = new Date(Date.now() - 5 * 3600e3);
  return f.getUTCHours() * 60 + f.getUTCMinutes();
};

function poner(min) {
  if (!campo) return;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(campo, min == null ? "" : `${p2(Math.floor(min / 60))}:${p2(min % 60)}`);
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  campo.dispatchEvent(new Event("change", { bubbles: true }));
}

function cerrar() {
  if (caja) caja.classList.remove("rd-cal-visible");
  campo = null;
}

function ubicar() {
  if (!caja || !campo) return;
  const r = campo.getBoundingClientRect();
  const w = caja.offsetWidth;
  const h = caja.offsetHeight;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  caja.style.left = `${left}px`;
  caja.style.top = `${top}px`;
}

const permitido = (min) => {
  if (!campo || min == null) return true;
  const a = aMin(campo.min);
  const b = aMin(campo.max);
  if (a != null && min < a) return false;
  if (b != null && min > b) return false;
  return true;
};

function boton(contenido, clase, accion, deshabilitado = false, titulo = "") {
  const b = document.createElement("button");
  b.type = "button";
  b.className = clase;
  b.textContent = contenido;
  b.disabled = deshabilitado;
  if (titulo) b.title = titulo;
  b.addEventListener("mousedown", (e) => e.preventDefault()); // no quita el foco del campo
  b.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!deshabilitado) accion();
  });
  return b;
}

function etiqueta(t) {
  const s = document.createElement("p");
  s.className = "rd-hora-etiqueta";
  s.textContent = t;
  return s;
}

function dibujar() {
  if (!caja || !campo) return;
  const valor = aMin(campo.value);
  const base = valor ?? 8 * 60;
  const h24 = Math.floor(base / 60);
  const min = base % 60;
  // Paso de minutos: el del campo (en segundos) o de 5 en 5
  const paso = Math.max(5, Math.round((Number(campo.step) || 300) / 60));
  caja.innerHTML = "";

  // Cabecera: hora elegida + AM / PM
  const cab = document.createElement("div");
  cab.className = "rd-hora-cab";
  const prev = document.createElement("span");
  prev.className = "rd-hora-prev";
  prev.textContent = texto(valor);
  const am = document.createElement("div");
  am.className = "rd-hora-ampm";
  ["AM", "PM"].forEach((m) => {
    am.appendChild(
      boton(m, `rd-hora-mer ${meridiano === m ? "rd-cal-sel" : ""}`, () => {
        meridiano = m;
        if (valor != null) {
          const nuevo = (Math.floor(valor / 60) % 12) * 60 + (valor % 60) + (m === "PM" ? 720 : 0);
          if (permitido(nuevo)) poner(nuevo);
        }
        dibujar();
      }),
    );
  });
  cab.append(prev, am);
  caja.appendChild(cab);

  // Horas 1 a 12 de la mitad del día elegida
  caja.appendChild(etiqueta("Hora"));
  const horas = document.createElement("div");
  horas.className = "rd-cal-rejilla rd-hora-6";
  [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach((h12) => {
    const hh = (h12 % 12) + (meridiano === "PM" ? 12 : 0);
    const candidato = hh * 60 + (valor != null ? min : 0);
    const sel = valor != null && h24 === hh;
    horas.appendChild(
      boton(String(h12), `rd-cal-celda ${sel ? "rd-cal-sel" : ""}`, () => {
        const v = permitido(candidato) ? candidato : hh * 60;
        poner(v);
        dibujar();
      }, !permitido(hh * 60) && !permitido(hh * 60 + 59)),
    );
  });
  caja.appendChild(horas);

  // Minutos
  caja.appendChild(etiqueta("Minutos"));
  const mins = document.createElement("div");
  mins.className = "rd-cal-rejilla rd-hora-6";
  for (let m = 0; m < 60; m += paso) {
    const candidato = h24 * 60 + m;
    const sel = valor != null && min === m;
    mins.appendChild(
      boton(`:${p2(m)}`, `rd-cal-celda ${sel ? "rd-cal-sel" : ""}`, () => {
        poner(candidato);
        dibujar();
      }, !permitido(candidato)),
    );
  }
  caja.appendChild(mins);

  // Pie: Borrar · Ahora · Listo
  const pie = document.createElement("div");
  pie.className = "rd-cal-pie";
  if (!campo.required) pie.appendChild(boton("Borrar", "rd-cal-pie-btn", () => (poner(null), cerrar())));
  const ya = Math.round(ahoraLima() / paso) * paso;
  pie.appendChild(boton("Ahora", "rd-cal-pie-btn", () => {
    meridiano = ya < 720 ? "AM" : "PM";
    poner(ya);
    dibujar();
  }, !permitido(ya)));
  pie.appendChild(boton("Listo", "rd-cal-pie-btn rd-cal-pie-hoy", cerrar));
  caja.appendChild(pie);
  ubicar();
}

function abrir(input) {
  if (!caja) {
    caja = document.createElement("div");
    caja.className = "rd-cal rd-hora";
    caja.setAttribute("role", "dialog");
    caja.setAttribute("aria-label", "Elegir hora");
    caja.addEventListener("mousedown", (e) => e.preventDefault());
    document.body.appendChild(caja);
  }
  campo = input;
  const v = aMin(input.value);
  meridiano = v != null ? (v < 720 ? "AM" : "PM") : "AM";
  dibujar();
  caja.classList.add("rd-cal-visible");
}

let instalado = false;
export function instalarSelectorHora() {
  if (instalado || typeof document === "undefined") return;
  instalado = true;
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target;
      if (caja && caja.contains(el)) return;
      if (esCampo(el)) {
        e.preventDefault(); // sin la ruedita del navegador
        if (campo === el && caja?.classList.contains("rd-cal-visible")) return;
        abrir(el);
        return;
      }
      if (campo) cerrar();
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && campo && caja?.classList.contains("rd-cal-visible")) {
        e.stopPropagation();
        cerrar();
        return;
      }
      if (esCampo(e.target) && (e.key === " " || (e.altKey && e.key === "ArrowDown"))) {
        e.preventDefault();
        abrir(e.target);
      }
      if (e.key === "Tab" && campo) cerrar();
    },
    true,
  );
  // Si se escribe la hora con el teclado, la ventanita se actualiza
  document.addEventListener("input", (e) => {
    if (e.target === campo && caja?.classList.contains("rd-cal-visible")) {
      const v = aMin(campo.value);
      if (v != null) meridiano = v < 720 ? "AM" : "PM";
      dibujar();
    }
  });
  window.addEventListener("scroll", ubicar, true);
  window.addEventListener("resize", ubicar);
}
