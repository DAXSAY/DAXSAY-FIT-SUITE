// Descarga del progreso de pesos en PDF y Excel (mismos cálculos que la pantalla)
import { descargar, dibujarResumen } from "../../utils/exportar";
import { ESTILO_TENDENCIA, DIAS_SEMANA, diaSemana, fechaBonita, filasDetalle, kg, lunesDe, masMenos, pct, textoMejor, textoReps, textoSeries, tendencia } from "../../utils/progreso";

const limpio = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const nombreArchivo = (datos, ext) => `Progreso_${limpio(datos.alumno.nombre)}_${datos.hoy}.${ext}`;
const ahora = () => new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });
const t = (d) => (d === null || d === undefined ? "—" : `${ESTILO_TENDENCIA[tendencia(d)].texto} ${pct(d)}`);

function filasResumen(resumen) {
  return resumen.ejercicios.map((e) => ({
    ejercicio: e.nombre,
    sesiones: e.sesiones.length,
    inicio: `${kg(e.inicio.pesoMax)} (${fechaBonita(e.inicio.fecha)})`,
    ultima: `${textoSeries(e.ultima)} × ${textoReps(e.ultima)} (${fechaBonita(e.ultima.fecha)})`,
    record: textoMejor(e.record),
    vsAnterior: t(e.deltaSesion),
    vsSemana: t(e.deltaSemana),
    vsMes: t(e.deltaMes),
    total: e.deltaTotal === null ? "—" : `${masMenos(e.deltaTotalKg)} · ${pct(e.deltaTotal)}`,
  }));
}

export async function exportarPdfProgreso(datos, resumen) {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();

  // Página 1: resumen visual (tarjetas + gráficos con leyenda)
  const r1 = (n) => Math.round(n * 10) / 10;
  const ej = resumen.ejercicios.filter((e) => e.deltaTotal !== null && e.deltaTotal !== undefined && Number.isFinite(e.deltaTotal));
  dibujarResumen(doc, {
    titulo: "RADICAL · Progreso de pesos",
    subtitulo: `${datos.alumno.nombre} (${datos.alumno.codigo}) · ${datos.plan ? `Rutina: ${datos.plan.titulo}` : "Sin rutina"} · Generado: ${ahora()}`,
    kpis: [
      ["Fuerza desde el inicio", resumen.indice === null ? "—" : pct(resumen.indice), resumen.indice > 0 ? [16, 185, 129] : [239, 68, 68]],
      ["Sesiones registradas", String(resumen.totalSesiones)],
      ["Semanas entrenadas", String(resumen.semanasEntrenadas)],
      ["Cumplimiento 30 días", resumen.cumplimiento === null ? "—" : `${resumen.cumplimiento} %`],
      ["Última sesión", `+${resumen.conteo.sube}  =${resumen.conteo.igual}  -${resumen.conteo.baja}`],
    ],
    grupos: [
      { titulo: "Mejora de fuerza desde el inicio (%)", datos: ej.map((e) => [e.nombre, r1(e.deltaTotal)]).sort((a, b) => b[1] - a[1]), unidad: "%" },
      { titulo: "Sesiones por ejercicio", datos: resumen.ejercicios.map((e) => [e.nombre, e.sesiones.length]).sort((a, b) => b[1] - a[1]), unidad: "registros" },
    ].filter((g) => g.datos.length),
  });
  doc.addPage();
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text("Detalle por ejercicio", 40, 40);

  autoTable(doc, {
    startY: 54,
    head: [["Ejercicio", "Sesiones", "Inicio", "Última sesión", "Récord", "vs. anterior", "vs. semana", "vs. mes", "Desde el inicio"]],
    body: filasResumen(resumen).map((f) => [f.ejercicio, f.sesiones, f.inicio, f.ultima, f.record, f.vsAnterior, f.vsSemana, f.vsMes, f.total]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
    didParseCell: (c) => {
      if (c.section !== "body" || c.column.index < 5) return;
      const v = String(c.cell.raw || "");
      if (v.startsWith("Progresó") || v.startsWith("+")) c.cell.styles.textColor = [5, 150, 105];
      if (v.startsWith("Bajó") || v.startsWith("-")) c.cell.styles.textColor = [225, 29, 72];
    },
  });

  // Cuadro de las últimas 4 semanas: ejercicios x días
  const hoyLunes = lunesDe(datos.hoy);
  for (let k = 3; k >= 0; k--) {
    const lunes = new Date(`${hoyLunes}T12:00:00Z`);
    lunes.setUTCDate(lunes.getUTCDate() - 7 * k);
    const l = lunes.toISOString().slice(0, 10);
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${l}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const ses = resumen.sesiones.filter((s) => s.fecha >= dias[0] && s.fecha <= dias[6]);
    if (!ses.length) continue;
    const nombres = [...new Map(ses.map((s) => [s.clave, s.nombre])).entries()];
    doc.addPage();
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`Semana del ${fechaBonita(dias[0])} al ${fechaBonita(dias[6])}`, 40, 40);
    autoTable(doc, {
      startY: 54,
      head: [["Ejercicio", ...dias.map((d) => `${DIAS_SEMANA[diaSemana(d)]} ${fechaBonita(d)}`)]],
      body: nombres.map(([clave, nombre]) => [
        nombre,
        ...dias.map((d) => {
          const s = ses.find((x) => x.fecha === d && x.clave === clave);
          return s ? `${textoSeries(s)}\n× ${textoReps(s)}` : "";
        }),
      ]),
      styles: { fontSize: 7.5, cellPadding: 3, valign: "middle" },
      headStyles: { fillColor: [30, 41, 59], fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 140, fontStyle: "bold" } },
      margin: { left: 40, right: 40 },
    });
  }

  // Detalle serie por serie
  doc.addPage();
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Detalle serie por serie", 40, 40);
  autoTable(doc, {
    startY: 54,
    head: [["Fecha", "Día de rutina", "Ejercicio", "Plan", "Serie", "Peso (kg)", "Reps", "Fuerza est. (kg)"]],
    body: filasDetalle([...resumen.sesiones].reverse()).map((f) => [fechaBonita(f.fecha), f.dia, f.ejercicio, f.plan, f.serie, f.peso, f.reps, f.fuerza]),
    styles: { fontSize: 7.5, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Fuerza estimada = peso × (1 + reps ÷ 30), mejor serie de cada sesión · Página ${i} de ${paginas}`, 40, doc.internal.pageSize.getHeight() - 20);
  }
  descargar(new File([doc.output("blob")], nombreArchivo(datos, "pdf"), { type: "application/pdf" }));
}

export async function exportarExcelProgreso(datos, resumen) {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  libro.creator = "RADICAL";
  libro.created = new Date();
  const encabezar = (fila) =>
    fila.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      c.alignment = { vertical: "middle", wrapText: true };
    });

  // 1) Resumen
  const h1 = libro.addWorksheet("Resumen");
  h1.addRow([`RADICAL · Progreso de pesos · ${datos.alumno.nombre} (${datos.alumno.codigo})`]).font = { bold: true, size: 14 };
  h1.addRow([`${datos.plan ? `Rutina: ${datos.plan.titulo}` : "Sin rutina"} · Generado: ${ahora()}`]).font = { color: { argb: "FF64748B" } };
  h1.addRow([
    `Fuerza desde el inicio: ${resumen.indice === null ? "—" : pct(resumen.indice)} · Sesiones: ${resumen.totalSesiones} · Cumplimiento 30 días: ${
      resumen.cumplimiento === null ? "—" : `${resumen.cumplimiento} %`
    }`,
  ]);
  h1.addRow([]);
  const cols1 = [
    ["Ejercicio", "ejercicio", 30], ["Sesiones", "sesiones", 10], ["Inicio", "inicio", 20], ["Última sesión", "ultima", 40],
    ["Récord", "record", 16], ["vs. anterior", "vsAnterior", 20], ["vs. semana", "vsSemana", 20], ["vs. mes", "vsMes", 20], ["Desde el inicio", "total", 22],
  ];
  encabezar(h1.addRow(cols1.map((c) => c[0])));
  filasResumen(resumen).forEach((f) => {
    const r = h1.addRow(cols1.map((c) => f[c[1]]));
    [6, 7, 8, 9].forEach((i) => {
      const v = String(r.getCell(i).value || "");
      if (v.startsWith("Progresó") || v.startsWith("+")) r.getCell(i).font = { color: { argb: "FF059669" }, bold: true };
      if (v.startsWith("Bajó") || v.startsWith("-")) r.getCell(i).font = { color: { argb: "FFE11D48" }, bold: true };
    });
  });
  cols1.forEach((c, i) => (h1.getColumn(i + 1).width = c[2]));

  // 2) Semanal: ejercicios x días (todas las semanas con registros)
  const h2 = libro.addWorksheet("Semanal");
  const semanas = [...new Set(resumen.sesiones.map((s) => lunesDe(s.fecha)))].sort().reverse();
  h2.getColumn(1).width = 30;
  for (let i = 2; i <= 8; i++) h2.getColumn(i).width = 20;
  semanas.forEach((l) => {
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${l}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const ses = resumen.sesiones.filter((s) => s.fecha >= dias[0] && s.fecha <= dias[6]);
    h2.addRow([`Semana del ${fechaBonita(dias[0])} al ${fechaBonita(dias[6])}`]).font = { bold: true, size: 12 };
    encabezar(h2.addRow(["Ejercicio", ...dias.map((d) => `${DIAS_SEMANA[diaSemana(d)]} ${fechaBonita(d)}`)]));
    [...new Map(ses.map((s) => [s.clave, s.nombre])).entries()].forEach(([clave, nombre]) => {
      const r = h2.addRow([
        nombre,
        ...dias.map((d) => {
          const s = ses.find((x) => x.fecha === d && x.clave === clave);
          return s ? `${textoSeries(s)} × ${textoReps(s)}` : "";
        }),
      ]);
      r.alignment = { wrapText: true, vertical: "middle" };
      r.getCell(1).font = { bold: true };
    });
    h2.addRow([]);
  });

  // 3) Detalle serie por serie (para filtrar y graficar)
  const h3 = libro.addWorksheet("Detalle por serie");
  const cols3 = [
    ["Fecha", "fecha", 12], ["Semana (lunes)", "semana", 14], ["Día de rutina", "dia", 22], ["Ejercicio", "ejercicio", 30], ["Plan", "plan", 10],
    ["Serie", "serie", 8], ["Peso (kg)", "peso", 10], ["Reps", "reps", 8], ["Fuerza estimada (kg)", "fuerza", 18],
  ];
  const cab = h3.addRow(cols3.map((c) => c[0]));
  encabezar(cab);
  filasDetalle(resumen.sesiones).forEach((f) => h3.addRow(cols3.map((c) => f[c[1]])));
  cols3.forEach((c, i) => (h3.getColumn(i + 1).width = c[2]));
  h3.views = [{ state: "frozen", ySplit: 1 }];
  h3.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols3.length } };

  const buffer = await libro.xlsx.writeBuffer();
  descargar(new File([buffer], nombreArchivo(datos, "xlsx"), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}
