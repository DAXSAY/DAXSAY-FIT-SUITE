// Resaltado en todos los gráficos del sistema: al pasar el mouse por una
// leyenda (o por una porción/barra) se resalta esa serie y el resto queda
// en gris. Sin mouse encima, todo se ve normal.
let instalado = false;

const series = (envoltura) =>
  envoltura.querySelectorAll(
    ".recharts-line, .recharts-area, .recharts-bar, .recharts-radar, .recharts-scatter, .recharts-pie-sector",
  );

const limpiar = (envoltura) => {
  envoltura.classList.remove("rd-graf-activo");
  envoltura.querySelectorAll(".rd-graf-apagado, .rd-graf-encendido").forEach((e) => e.classList.remove("rd-graf-apagado", "rd-graf-encendido"));
};

export const instalarResaltadoGraficos = () => {
  if (instalado || typeof document === "undefined") return;
  instalado = true;
  document.addEventListener("mouseover", (e) => {
    const item = e.target.closest?.(".recharts-legend-item");
    if (!item) return;
    const envoltura = item.closest(".recharts-wrapper");
    if (!envoltura) return;
    const indice = [...item.parentElement.children].indexOf(item);
    const lista = [...series(envoltura)];
    if (!lista.length) return;
    limpiar(envoltura);
    envoltura.classList.add("rd-graf-activo");
    lista.forEach((s, i) => s.classList.add(i === indice ? "rd-graf-encendido" : "rd-graf-apagado"));
  });
  document.addEventListener("mouseout", (e) => {
    const item = e.target.closest?.(".recharts-legend-item");
    if (!item || item.contains(e.relatedTarget)) return;
    const envoltura = item.closest(".recharts-wrapper");
    if (envoltura) limpiar(envoltura);
  });
};
