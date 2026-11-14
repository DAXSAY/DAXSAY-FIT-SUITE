// Dibuja gráficos como imagen PNG (para meterlos en Excel y PDF).
// Dona: pocas categorías (hasta 6). Barras horizontales: más categorías.

// Tonos suaves (documentos claros, sin colores chillones)
export const COLORES_GRAFICO = ["#5fa3a8", "#8a8fc9", "#d9a85c", "#6fb39a", "#c98aa8", "#7a9cc6", "#cf7f7a", "#9bb86a", "#a98bc4", "#8a96a3", "#d9956a", "#6aaea6"];

const FUENTE = '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
const formatear = (v, unidad) =>
  unidad && unidad !== "registros" && /monto|total|importe|precio|pago|deuda|ingreso|saldo|cobrado|vendido/i.test(unidad)
    ? `S/ ${Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : Number(v).toLocaleString("es-PE");

const lienzo = (ancho, alto, escala = 2) => {
  const c = document.createElement("canvas");
  c.width = ancho * escala;
  c.height = alto * escala;
  const x = c.getContext("2d");
  x.scale(escala, escala);
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, ancho, alto);
  return [c, x];
};

const recortar = (x, t, max) => {
  let s = String(t);
  while (s.length > 3 && x.measureText(s).width > max) s = s.slice(0, -2);
  return s === String(t) ? s : `${s.trim()}…`;
};

/** Dona con leyenda a la derecha. datos: [[etiqueta, valor], ...] */
export function donaPNG({ titulo, datos, unidad, ancho = 520, alto = 270 }) {
  const [c, x] = lienzo(ancho, alto);
  const lista = datos.filter((d) => Number(d[1]) > 0).slice(0, 8);
  const total = lista.reduce((s, d) => s + Number(d[1]), 0) || 1;
  x.fillStyle = "#0f172a";
  x.font = `700 14px ${FUENTE}`;
  x.fillText(recortar(x, titulo, ancho - 24), 14, 24);
  const cx = 130;
  const cy = 150;
  const r = 92;
  let ang = -Math.PI / 2;
  lista.forEach((d, i) => {
    const a = (Number(d[1]) / total) * Math.PI * 2;
    x.beginPath();
    x.moveTo(cx, cy);
    x.arc(cx, cy, r, ang, ang + a);
    x.closePath();
    x.fillStyle = COLORES_GRAFICO[i % COLORES_GRAFICO.length];
    x.fill();
    x.strokeStyle = "#ffffff";
    x.lineWidth = 2;
    x.stroke();
    ang += a;
  });
  x.beginPath();
  x.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
  x.fillStyle = "#ffffff";
  x.fill();
  x.textAlign = "center";
  x.fillStyle = "#64748b";
  x.font = `600 10px ${FUENTE}`;
  x.fillText("TOTAL", cx, cy - 6);
  x.fillStyle = "#0f172a";
  x.font = `800 14px ${FUENTE}`;
  x.fillText(recortar(x, formatear(total, unidad), r), cx, cy + 12);
  x.textAlign = "left";
  // Leyenda
  const lx = 250;
  let ly = 62;
  lista.forEach((d, i) => {
    x.fillStyle = COLORES_GRAFICO[i % COLORES_GRAFICO.length];
    x.beginPath();
    x.roundRect(lx, ly - 9, 11, 11, 3);
    x.fill();
    x.fillStyle = "#334155";
    x.font = `600 11px ${FUENTE}`;
    x.fillText(recortar(x, d[0], 150), lx + 18, ly);
    x.fillStyle = "#0f172a";
    x.font = `700 11px ${FUENTE}`;
    const pct = `${Math.round((Number(d[1]) / total) * 100)}%`;
    x.textAlign = "right";
    x.fillText(pct, ancho - 14, ly);
    x.textAlign = "left";
    x.fillStyle = "#64748b";
    x.font = `500 10px ${FUENTE}`;
    x.fillText(recortar(x, formatear(d[1], unidad), 120), lx + 18, ly + 13);
    ly += 27;
  });
  return c.toDataURL("image/png");
}

/** Barras horizontales con valor al final */
export function barrasPNG({ titulo, datos, unidad, ancho = 520, alto }) {
  const lista = datos.slice(0, 12);
  const h = alto || 46 + lista.length * 24;
  const [c, x] = lienzo(ancho, h);
  x.fillStyle = "#0f172a";
  x.font = `700 14px ${FUENTE}`;
  x.fillText(recortar(x, titulo, ancho - 24), 14, 24);
  const max = Math.max(...lista.map((d) => Math.abs(Number(d[1]))), 1);
  const ex = 150;
  const bw = ancho - ex - 100;
  lista.forEach((d, i) => {
    const y = 42 + i * 24;
    x.fillStyle = "#334155";
    x.font = `600 11px ${FUENTE}`;
    x.fillText(recortar(x, d[0], ex - 20), 14, y + 13);
    x.fillStyle = "#f1f5f9";
    x.beginPath();
    x.roundRect(ex, y + 2, bw, 15, 4);
    x.fill();
    x.fillStyle = COLORES_GRAFICO[i % COLORES_GRAFICO.length];
    x.beginPath();
    x.roundRect(ex, y + 2, Math.max(3, (Math.abs(Number(d[1])) / max) * bw), 15, 4);
    x.fill();
    x.fillStyle = "#0f172a";
    x.font = `700 11px ${FUENTE}`;
    x.fillText(recortar(x, formatear(d[1], unidad), 92), ex + bw + 8, y + 13);
  });
  return c.toDataURL("image/png");
}

/** Elige el gráfico adecuado para un grupo { titulo, datos, unidad } */
export const graficoDeGrupo = (g, ancho = 520) => {
  const positivos = g.datos.filter((d) => Number(d[1]) > 0);
  return positivos.length >= 2 && positivos.length <= 6 && g.datos.every((d) => Number(d[1]) >= 0)
    ? { png: donaPNG({ ...g, ancho }), ancho, alto: 270 }
    : (() => {
        const alto = 46 + Math.min(g.datos.length, 12) * 24;
        return { png: barrasPNG({ ...g, ancho, alto }), ancho, alto };
      })();
};
