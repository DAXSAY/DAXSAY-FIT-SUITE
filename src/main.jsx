import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { aplicarTema, temaGuardado } from "./utils/tema";
import { aplicarTamano, tamanoGuardado } from "./utils/tamanoLetra";
import { instalarResaltadoGraficos } from "./utils/graficos";
import { instalarControlesVentanas } from "./utils/controlesVentana";
import { instalarTooltipGlobal } from "./utils/tooltipGlobal";
import { instalarSelectorFecha } from "./utils/selectorFecha";
import { instalarSelectorHora } from "./utils/selectorHora";

// Aplica el modo claro/oscuro guardado antes de pintar (evita parpadeo)
aplicarTema(temaGuardado());
aplicarTamano(tamanoGuardado());
instalarResaltadoGraficos();
instalarControlesVentanas();
instalarTooltipGlobal();
instalarSelectorFecha();
instalarSelectorHora();

// Campos numéricos: al entrar NO se sombrea el valor (sin selección azul);
// la primera tecla que escribe un número reemplaza lo que había (como antes).
document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (el instanceof HTMLInputElement && el.type === "number") el.dataset.rdReemplazar = "1";
});
document.addEventListener(
  "beforeinput",
  (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) || el.type !== "number" || el.dataset.rdReemplazar !== "1") return;
    delete el.dataset.rdReemplazar;
    if (e.inputType === "insertText" && el.value !== "") el.value = "";
  },
  true,
);
document.addEventListener(
  "keydown",
  (e) => {
    const el = e.target;
    if (el instanceof HTMLInputElement && el.dataset.rdReemplazar === "1" && /^(Arrow|Backspace|Delete|Home|End)/.test(e.key)) delete el.dataset.rdReemplazar;
  },
  true,
);
document.addEventListener(
  "input",
  (e) => {
    const el = e.target;
    if (el instanceof HTMLInputElement && el.type === "number" && /^-?0\d/.test(el.value)) {
      el.value = el.value.replace(/^(-?)0+(?=\d)/, "$1");
    }
  },
  true,
);

// Imagen que no carga (borrada o sin internet): se muestra un recuadro neutro
const IMAGEN_RESPALDO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" rx="12" fill="#e2eef1"/><g fill="none" stroke="#0ea7b3" stroke-width="5" stroke-linecap="round"><path d="M52 60h56"/><path d="M44 46v28M36 52v16M116 46v28M124 52v16"/></g><text x="80" y="102" font-family="sans-serif" font-size="11" fill="#5b7a88" text-anchor="middle">Imagen no disponible</text></svg>',
  );
document.addEventListener(
  "error",
  (e) => {
    const el = e.target;
    if (el instanceof HTMLImageElement && !el.dataset.respaldo && !el.src.startsWith("data:")) {
      el.dataset.respaldo = "1";
      el.src = IMAGEN_RESPALDO;
    }
  },
  true,
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
