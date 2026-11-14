// Exportar lo que se ve en pantalla (ya filtrado) a Excel o PDF y
// enviarlo al WhatsApp del administrador.
// Las librerías se cargan solo cuando se usan, para no hacer lenta la app.

const limpiarNombre = (s) =>
  String(s || "reporte")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);

import { graficoDeGrupo, COLORES_GRAFICO } from "./graficoImagen";

const valorCelda = (v) => (v === null || v === undefined ? "" : v);

// ---------------------------------------------------------------------
// Resumen visual (primera página): tarjetas con los totales y gráficos de
// barras con las agrupaciones más útiles de la tabla, con su leyenda.
// ---------------------------------------------------------------------
export const PALETA = [
  [95, 163, 168], [138, 143, 201], [217, 168, 92], [111, 179, 154], [201, 138, 168],
  [122, 156, 198], [207, 127, 122], [155, 184, 106], [169, 139, 196], [138, 150, 163],
];
const numero = (v) => {
  if (typeof v === "number") return v;
  const t = String(v ?? "").replace(/S\/|%|\s/g, "").replace(/,(?=\d{3}\b)/g, "");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};
const textoDe = (c, f) => valorCelda(c.excel ? c.excel(f) : f[c.key]);

/** Grupos automáticos: columnas de texto con 2 a 12 valores distintos (conteo y suma de la 1.ª columna numérica) */
export function gruposAutomaticos(columnas, filas) {
  if (!filas.length) return [];
  const numericas = columnas.filter((c) => filas.slice(0, 50).every((f) => textoDe(c, f) === "" || numero(textoDe(c, f)) !== null) && filas.some((f) => numero(textoDe(c, f)) !== null));
  const monto = numericas.find((c) => /monto|total|importe|precio|pago|deuda|ingreso|kcal|peso/i.test(c.label)) || null;
  const grupos = [];
  columnas.forEach((c) => {
    if (numericas.includes(c) || /fecha|hora|dni|c[oó]digo|tel|celular|correo|nombre|alumno|detalle|descripci|observ|nota|n[°º]/i.test(c.label)) return;
    const mapa = new Map();
    filas.forEach((f) => {
      const k = String(textoDe(c, f) || "—").slice(0, 40);
      const g = mapa.get(k) || { n: 0, suma: 0 };
      g.n += 1;
      if (monto) g.suma += numero(textoDe(monto, f)) || 0;
      mapa.set(k, g);
    });
    if (mapa.size < 2 || mapa.size > 12) return;
    const datos = [...mapa.entries()].map(([k, g]) => [k, monto ? Math.round(g.suma * 100) / 100 : g.n, g.n]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    grupos.push({ titulo: monto ? `${monto.label} por ${c.label.toLowerCase()}` : `Registros por ${c.label.toLowerCase()}`, datos, unidad: monto ? monto.label : "registros" });
  });
  return grupos.slice(0, 4);
}

/** Dibuja la página de resumen en un PDF de jsPDF (unidad pt). Devuelve la Y final. */
export function dibujarResumen(doc, { titulo, subtitulo = "", kpis = [], grupos = [], y0 = 0 }) {
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  doc.setFillColor(15, 74, 80);
  doc.rect(0, y0, ancho, 64, "F");
  doc.setFillColor(14, 167, 179);
  doc.rect(0, y0 + 64, ancho, 3, "F");
  doc.setTextColor(255);
  doc.setFontSize(17);
  doc.text(titulo, 40, y0 + 30);
  doc.setFontSize(9);
  doc.setTextColor(186, 230, 253);
  doc.text(subtitulo, 40, y0 + 48);
  let y = y0 + 84;
  // Tarjetas
  if (kpis.length) {
    const porFila = Math.min(kpis.length, 5);
    const w = (ancho - 80 - (porFila - 1) * 10) / porFila;
    kpis.forEach(([l, v, col], i) => {
      const x = 40 + (i % porFila) * (w + 10);
      const yy = y + Math.floor(i / porFila) * 60;
      const c = col || PALETA[i % PALETA.length];
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, yy, w, 50, 6, 6, "F");
      doc.setFillColor(...c);
      doc.rect(x, yy + 6, 4, 38, "F");
      doc.setTextColor(100);
      doc.setFontSize(7.5);
      doc.text(String(l).toUpperCase().slice(0, 34), x + 12, yy + 18);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.text(String(v).slice(0, 22), x + 12, yy + 38);
    });
    y += Math.ceil(kpis.length / porFila) * 60 + 10;
  }
  // Gráficos (dona o barras) como imagen, 2 por fila
  const colW = (ancho - 80 - 20) / 2;
  let filaH = 0;
  grupos.forEach((g, gi) => {
    const x = 40 + (gi % 2) * (colW + 20);
    const img = graficoDeGrupo(g, 520);
    const h = (img.alto / img.ancho) * colW;
    if (gi % 2 === 0 && y + h > alto - 40) {
      doc.addPage();
      y = 40;
    }
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x - 2, y - 2, colW + 4, h + 4, 8, 8, "S");
    doc.addImage(img.png, "PNG", x, y, colW, h, undefined, "FAST");
    filaH = Math.max(filaH, h);
    if (gi % 2 === 1 || gi === grupos.length - 1) {
      y += filaH + 16;
      filaH = 0;
    }
  });
  return y;
}

/** Excel (.xlsx) con título, filtros aplicados, tabla y totales */
export async function crearExcel({ titulo, filtros = [], columnas, filas, totales = [] }) {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  libro.creator = "RADICAL";
  libro.created = new Date();
  // Hoja 1: resumen visual (tarjetas de totales y gráficos)
  const res = libro.addWorksheet("Resumen", { properties: { tabColor: { argb: "FF0EA7B3" } }, views: [{ showGridLines: false }] });
  const anchos = [30, 18, 12, 3, 13, 13, 13, 13, 13, 13];
  anchos.forEach((w, i) => (res.getColumn(i + 1).width = w));
  const banda = (fila, texto, opciones) => {
    res.mergeCells(fila, 1, fila, 10);
    const c = res.getCell(fila, 1);
    c.value = texto;
    Object.assign(c, opciones);
  };
  banda(1, titulo, {
    font: { bold: true, size: 16, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F4A50" } },
    alignment: { vertical: "middle", indent: 1 },
  });
  res.getRow(1).height = 32;
  banda(2, `Generado: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}${filtros.length ? `   ·   Filtros: ${filtros.join(" · ")}` : ""}`, {
    font: { size: 9, color: { argb: "FF0F4A50" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE4EFEE" } },
    alignment: { vertical: "middle", indent: 1, wrapText: true },
  });
  res.getRow(2).height = 20;
  // Tarjetas de totales (2 columnas cada una, 5 por fila)
  const tarjetas = [["Registros", filas.length], ...totales];
  const TINTES = ["FFEAF3F3", "FFEEEFF7", "FFF8F0E1", "FFE8F3EE", "FFF6ECF1"];
  const BORDES = ["FF5FA3A8", "FF8A8FC9", "FFD9A85C", "FF6FB39A", "FFC98AA8"];
  let fila = 4;
  tarjetas.forEach(([k, v], i) => {
    const col = [1, 2, 5, 7, 9][i % 5];
    const ancho2 = col === 1 ? 1 : col === 2 ? 2 : 2;
    const f0 = fila + Math.floor(i / 5) * 3;
    const c1 = col;
    const c2 = col + ancho2 - 1;
    if (c2 > c1) {
      res.mergeCells(f0, c1, f0, c2);
      res.mergeCells(f0 + 1, c1, f0 + 1, c2);
    }
    const et = res.getCell(f0, c1);
    const va = res.getCell(f0 + 1, c1);
    et.value = String(k).toUpperCase();
    va.value = v;
    const tinte = { type: "pattern", pattern: "solid", fgColor: { argb: TINTES[i % 5] } };
    const borde = { left: { style: "thick", color: { argb: BORDES[i % 5] } } };
    et.fill = tinte;
    va.fill = tinte;
    et.border = borde;
    va.border = borde;
    et.font = { bold: true, size: 8, color: { argb: "FF475569" } };
    va.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
    et.alignment = { indent: 1 };
    va.alignment = { indent: 1, horizontal: "left" };
  });
  fila += Math.ceil(tarjetas.length / 5) * 3 + 1;
  // Cada agrupación: tabla a la izquierda y su gráfico a la derecha
  gruposAutomaticos(columnas, filas).forEach((g) => {
    const h = res.getRow(fila);
    h.values = [g.titulo, g.unidad === "registros" ? "Cantidad" : g.unidad, g.unidad === "registros" ? "%" : "Registros"];
    [1, 2, 3].forEach((k) => {
      const c = h.getCell(k);
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F8E93" } };
    });
    const total = g.datos.reduce((s2, d) => s2 + Number(d[1] || 0), 0) || 1;
    g.datos.forEach(([l, v, n], k) => {
      const r = res.getRow(fila + 1 + k);
      r.values = [l, v, g.unidad === "registros" ? Math.round((v / total) * 100) / 100 : n];
      if (g.unidad === "registros") r.getCell(3).numFmt = "0%";
      else r.getCell(2).numFmt = '"S/" #,##0.00';
      const color = COLORES_GRAFICO[k % COLORES_GRAFICO.length].replace("#", "FF").toUpperCase();
      r.getCell(1).border = { left: { style: "thick", color: { argb: color } } };
      if (k % 2) [1, 2, 3].forEach((q) => (r.getCell(q).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }));
    });
    const img = graficoDeGrupo(g, 520);
    const id = libro.addImage({ base64: img.png, extension: "png" });
    res.addImage(id, { tl: { col: 4.2, row: fila - 1 }, ext: { width: 480, height: Math.round((img.alto / img.ancho) * 480) } });
    const filasImagen = Math.ceil(((img.alto / img.ancho) * 480) / 20);
    fila += Math.max(g.datos.length + 2, filasImagen + 1) + 1;
  });

  const hoja = libro.addWorksheet("Detalle");
  const n = Math.max(columnas.length, 2);

  const titulo1 = hoja.addRow([titulo]);
  titulo1.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  hoja.addRow([`Generado: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}`]).font = { color: { argb: "FF64748B" } };
  if (filtros.length) hoja.addRow([`Filtros: ${filtros.join(" · ")}`]).font = { italic: true, color: { argb: "FF64748B" } };
  hoja.addRow([]);

  const encabezado = hoja.addRow(columnas.map((c) => c.label));
  encabezado.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
    celda.alignment = { vertical: "middle" };
  });
  filas.forEach((f) => hoja.addRow(columnas.map((c) => valorCelda(c.excel ? c.excel(f) : f[c.key]))));
  hoja.views = [{ state: "frozen", ySplit: encabezado.number }];
  hoja.autoFilter = { from: { row: encabezado.number, column: 1 }, to: { row: encabezado.number, column: columnas.length } };

  if (totales.length) {
    hoja.addRow([]);
    totales.forEach(([k, v]) => {
      const r = hoja.addRow([k, v]);
      r.getCell(1).font = { bold: true };
    });
  }
  columnas.forEach((c, i) => {
    hoja.getColumn(i + 1).width = Math.min(
      45,
      Math.max(c.label.length + 2, ...filas.slice(0, 200).map((f) => String(valorCelda(c.excel ? c.excel(f) : f[c.key])).length + 2)),
    );
  });
  if (n > columnas.length) hoja.getColumn(n).width = 14;

  const datos = await libro.xlsx.writeBuffer();
  return new File([datos], `${limpiarNombre(titulo)}.xlsx`, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** PDF horizontal con la tabla filtrada */
export async function crearPDF({ titulo, filtros = [], columnas, filas, totales = [], gimnasio = "RADICAL", resumen }) {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  // Todos los reportes salen en el mismo tamaño: A4 horizontal
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  // 1) Resumen visual: totales en tarjetas + gráficos con leyenda
  const kpis = [["Registros", filas.length], ...totales.map(([k, v]) => [k, v])];
  const grupos = resumen?.grupos || gruposAutomaticos(columnas, filas);
  dibujarResumen(doc, {
    titulo: `${gimnasio} · ${titulo}`,
    subtitulo: `Resumen visual · ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}${filtros.length ? ` · ${filtros.join(" · ")}` : ""}`.slice(0, 180),
    kpis: resumen?.kpis || kpis,
    grupos,
  });
  // 2) Detalle
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Detalle · ${titulo}`, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}`, 40, 56);
  let y = 70;
  if (filtros.length) {
    const lineas = doc.splitTextToSize(`Filtros: ${filtros.join(" · ")}`, doc.internal.pageSize.getWidth() - 80);
    doc.text(lineas, 40, y);
    y += lineas.length * 11 + 4;
  }
  autoTable(doc, {
    startY: y,
    head: [columnas.map((c) => c.label)],
    body: filas.map((f) => columnas.map((c) => String(valorCelda(c.pdf ? c.pdf(f) : c.excel ? c.excel(f) : f[c.key])))),
    styles: { fontSize: 7.5, cellPadding: 3 },
    headStyles: { fillColor: [15, 74, 80] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });
  if (totales.length) {
    let ty = doc.lastAutoTable.finalY + 18;
    doc.setFontSize(9);
    doc.setTextColor(30);
    totales.forEach(([k, v]) => {
      doc.text(`${k}: ${v}`, 40, ty);
      ty += 12;
    });
  }
  return new File([doc.output("blob")], `${limpiarNombre(titulo)}.pdf`, { type: "application/pdf" });
}

export function descargar(archivo) {
  const url = URL.createObjectURL(archivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Envía el archivo por WhatsApp.
 *  - En celular (y en PC con WhatsApp instalado) abre "Compartir" con el
 *    archivo adjunto: se elige WhatsApp y el chat del administrador.
 *  - Si el navegador no puede adjuntar archivos, lo descarga y abre el chat
 *    del administrador para arrastrar el archivo.
 * Devuelve "compartido" o "descargado".
 */
export async function enviarPorWhatsApp(archivo, numero, texto) {
  try {
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: archivo.name, text: texto });
      return "compartido";
    }
  } catch (e) {
    if (e?.name === "AbortError") return "cancelado";
  }
  descargar(archivo);
  const destino = numero ? `https://wa.me/${numero}` : "https://wa.me/";
  window.open(`${destino}?text=${encodeURIComponent(`${texto}\n(Adjunto: ${archivo.name})`)}`, "_blank", "noopener");
  return "descargado";
}
