import { ubicarDebajo } from "./ubicarVentanita";
// Calendario propio para TODOS los campos de fecha y de mes del sistema
// (input type="date" y type="month"): reemplaza el cuadro gris del navegador
// por uno con el diseño del sistema, en español, en modo claro y oscuro.
// El campo sigue siendo el mismo (se puede escribir la fecha con el teclado);
// solo cambia la ventanita que se abre para elegir.

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const p2 = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${p2(m + 1)}-${p2(d)}`;
const hoyISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

let caja = null; // la ventanita
let campo = null; // input abierto
let vista = { y: 2026, m: 0 }; // mes que se ve
let modoAnios = false;

const esCampo = (el) => el instanceof HTMLInputElement && (el.type === "date" || el.type === "month") && !el.disabled && !el.readOnly;

function poner(valor) {
  if (!campo) return;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(campo, valor);
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  campo.dispatchEvent(new Event("change", { bubbles: true }));
}

function cerrar() {
  if (caja) caja.classList.remove("rd-cal-visible");
  campo?.classList.remove("rd-campo-activo");
  campo = null;
}

function ubicar(alAbrir = false) {
  ubicarDebajo(caja, campo, alAbrir);
}

function dentroDeLimites(valor) {
  if (!campo) return true;
  if (campo.min && valor < campo.min.slice(0, valor.length)) return false;
  if (campo.max && valor > campo.max.slice(0, valor.length)) return false;
  return true;
}

function boton(texto, clase, accion, deshabilitado = false) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = clase;
  b.textContent = texto;
  b.disabled = deshabilitado;
  b.addEventListener("mousedown", (e) => e.preventDefault()); // no quita el foco del campo
  b.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!deshabilitado) accion();
  });
  return b;
}

function dibujar() {
  if (!caja || !campo) return;
  const esMes = campo.type === "month";
  const valor = campo.value || "";
  const hoy = hoyISO();
  caja.innerHTML = "";

  // Cabecera: ‹  Noviembre 2026  ›
  const cab = document.createElement("div");
  cab.className = "rd-cal-cab";
  const atras = boton("‹", "rd-cal-flecha", () => {
    if (esMes || modoAnios) vista.y -= modoAnios ? 12 : 1;
    else if (--vista.m < 0) (vista.m = 11), vista.y--;
    dibujar();
  });
  const titulo = boton(esMes ? String(vista.y) : modoAnios ? `${vista.y - 5} – ${vista.y + 6}` : `${MESES[vista.m]} ${vista.y}`, "rd-cal-titulo", () => {
    modoAnios = !modoAnios;
    dibujar();
  });
  const adelante = boton("›", "rd-cal-flecha", () => {
    if (esMes || modoAnios) vista.y += modoAnios ? 12 : 1;
    else if (++vista.m > 11) (vista.m = 0), vista.y++;
    dibujar();
  });
  cab.append(atras, titulo, adelante);
  caja.appendChild(cab);

  const cuerpo = document.createElement("div");
  if (modoAnios) {
    cuerpo.className = "rd-cal-rejilla rd-cal-3";
    for (let y = vista.y - 5; y <= vista.y + 6; y++) {
      const b = boton(String(y), `rd-cal-celda ${String(y) === valor.slice(0, 4) ? "rd-cal-sel" : ""}`, () => {
        vista.y = y;
        modoAnios = false;
        dibujar();
      });
      cuerpo.appendChild(b);
    }
  } else if (esMes) {
    cuerpo.className = "rd-cal-rejilla rd-cal-3";
    MES_CORTO.forEach((n, m) => {
      const v = `${vista.y}-${p2(m + 1)}`;
      const b = boton(n, `rd-cal-celda ${v === valor ? "rd-cal-sel" : ""} ${v === hoy.slice(0, 7) ? "rd-cal-hoy" : ""}`, () => {
        poner(v);
        cerrar();
      }, !dentroDeLimites(v));
      cuerpo.appendChild(b);
    });
  } else {
    cuerpo.className = "rd-cal-rejilla rd-cal-7";
    DIAS.forEach((d) => {
      const s = document.createElement("span");
      s.className = "rd-cal-dia";
      s.textContent = d;
      cuerpo.appendChild(s);
    });
    const primero = (new Date(vista.y, vista.m, 1).getDay() + 6) % 7; // lunes = 0
    const total = new Date(vista.y, vista.m + 1, 0).getDate();
    for (let i = 0; i < primero; i++) cuerpo.appendChild(document.createElement("span"));
    for (let d = 1; d <= total; d++) {
      const v = iso(vista.y, vista.m, d);
      const b = boton(String(d), `rd-cal-celda ${v === valor ? "rd-cal-sel" : ""} ${v === hoy ? "rd-cal-hoy" : ""}`, () => {
        poner(v);
        cerrar();
      }, !dentroDeLimites(v));
      cuerpo.appendChild(b);
    }
  }
  caja.appendChild(cuerpo);

  // Pie: Borrar · Hoy / Este mes
  const pie = document.createElement("div");
  pie.className = "rd-cal-pie";
  if (!campo.required) pie.appendChild(boton("Borrar", "rd-cal-pie-btn", () => (poner(""), cerrar())));
  const hoyV = esMes ? hoy.slice(0, 7) : hoy;
  pie.appendChild(boton(esMes ? "Este mes" : "Hoy", "rd-cal-pie-btn rd-cal-pie-hoy", () => (poner(hoyV), cerrar()), !dentroDeLimites(hoyV)));
  caja.appendChild(pie);
  ubicar();
}

function abrir(input) {
  if (!caja) {
    caja = document.createElement("div");
    caja.className = "rd-cal";
    caja.setAttribute("role", "dialog");
    caja.setAttribute("aria-label", "Elegir fecha");
    caja.addEventListener("mousedown", (e) => e.preventDefault());
    document.body.appendChild(caja);
  }
  campo?.classList.remove("rd-campo-activo");
  campo = input;
  input.classList.add("rd-campo-activo");
  modoAnios = false;
  const base = input.value || (input.type === "month" ? hoyISO().slice(0, 7) : hoyISO());
  vista = { y: Number(base.slice(0, 4)) || new Date().getFullYear(), m: (Number(base.slice(5, 7)) || 1) - 1 };
  dibujar();
  caja.classList.add("rd-cal-visible");
  ubicar(true);
}

let instalado = false;
export function instalarSelectorFecha() {
  if (instalado || typeof document === "undefined") return;
  instalado = true;
  // Al tocar el campo no se marca la parte de la hora/fecha en color:
  // el navegador no deja cambiar ese sombreado, así que no se le da el foco
  // por clic y se elige en la ventanita (con Tab se sigue pudiendo escribir).
  document.addEventListener(
    "mousedown",
    (e) => {
      if (!esCampo(e.target)) return;
      e.preventDefault();
      if (document.activeElement === e.target) e.target.blur();
    },
    true,
  );
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target;
      if (caja && caja.contains(el)) return;
      if (esCampo(el)) {
        e.preventDefault(); // sin el cuadro del navegador
        if (campo === el && caja?.classList.contains("rd-cal-visible")) return;
        abrir(el);
        return;
      }
      cerrar();
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && campo) {
        e.stopPropagation();
        cerrar();
        return;
      }
      if (esCampo(e.target) && (e.key === " " || (e.altKey && e.key === "ArrowDown"))) {
        e.preventDefault();
        abrir(e.target);
      }
      if (e.key === "Tab") cerrar();
    },
    true,
  );
  // Si el campo cambia por teclado, el calendario se actualiza
  document.addEventListener("input", (e) => {
    if (e.target === campo && caja?.classList.contains("rd-cal-visible")) {
      const v = campo.value;
      if (v) vista = { y: Number(v.slice(0, 4)), m: (Number(v.slice(5, 7)) || 1) - 1 };
      dibujar();
    }
  });
  window.addEventListener("scroll", () => ubicar(), true);
  window.addEventListener("resize", () => ubicar());
}
