// =====================================================================
// Boleta (comprobante interno) para cualquier ingreso de caja:
// membresías, pase del día, servicios de profesionales, otros.
// Se puede imprimir, descargar en PDF o enviar por WhatsApp.
// No es un comprobante electrónico de SUNAT: es la constancia del gimnasio.
// =====================================================================
import { jsPDF } from "jspdf";
import { enlaceWhatsApp } from "../components/common/TelWhatsApp";
import { IconoEmoji } from "../components/common/IconoEmoji";

const S = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * b = { gym, ruc, direccion, numero, fecha, concepto, cliente, metodo, total,
 *       lineas?: [{ texto, monto }], reparto?: { pct, gimnasio, quien, profesional, montoProfesional } }
 */
export function imprimirBoleta(b) {
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return false;
  const fila = (l, v) => `<tr><td>${l}</td><td style="text-align:right"><b>${v}</b></td></tr>`;
  const lineas = (b.lineas || []).map((l) => fila(esc(l.texto), S(l.monto))).join("");
  const rep = b.reparto
    ? `<hr><table>${fila(`Gimnasio (${b.reparto.pct}%)`, S(b.reparto.gimnasio))}${fila(`${esc(b.reparto.quien)} (${100 - b.reparto.pct}%)`, S(b.reparto.montoProfesional))}</table>`
    : "";
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Boleta ${esc(b.numero)}</title>
  <style>body{font-family:Arial,sans-serif;margin:18px;color:#111;font-size:13px}h1{font-size:18px;margin:0;text-align:center;letter-spacing:2px;color:#0ea7b3}
  .c{text-align:center;color:#555;font-size:11px}hr{border:none;border-top:1px dashed #999;margin:10px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}
  .t{font-size:16px}.n{font-size:11px;color:#555;margin-top:12px;text-align:center}</style></head><body>
  <h1>${esc(b.gym || "RADICAL")}</h1><p class="c">${b.ruc ? `RUC ${esc(b.ruc)} · ` : ""}${esc(b.direccion || "")}</p><hr>
  <p><b>BOLETA N° ${esc(b.numero)}</b><br>${esc(b.fecha)}</p><hr>
  <table>${fila("Concepto", esc(b.concepto))}${b.cliente ? fila("Cliente", esc(b.cliente)) : ""}${b.profesional ? fila("Profesional", esc(b.profesional)) : ""}${lineas}</table><hr>
  <table>${fila('<span class="t">TOTAL</span>', `<span class="t">${S(b.total)}</span>`)}${fila("Medio de pago", esc(b.metodo))}</table>${rep}
  <p class="n">Constancia interna de pago · Gracias por tu preferencia <IconoEmoji e="💪" /></p><script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
  return true;
}

/** PDF tamaño ticket (80 mm) */
export function pdfBoleta(b) {
  const filasExtra = (b.lineas?.length || 0) + (b.reparto ? 3 : 0) + (b.profesional ? 1 : 0);
  const doc = new jsPDF({ unit: "mm", format: [80, 120 + filasExtra * 6] });
  let y = 10;
  const centro = (t, tam = 9, negrita = false, color = [17, 17, 17]) => {
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.setFontSize(tam);
    doc.setTextColor(...color);
    doc.splitTextToSize(String(t), 70).forEach((l) => {
      doc.text(l, 40, y, { align: "center" });
      y += tam * 0.45;
    });
  };
  const linea = () => {
    doc.setDrawColor(170);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y, 75, y);
    y += 4;
  };
  const fila = (izq, der, negrita = false) => {
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.setFontSize(negrita ? 10 : 8.5);
    doc.setTextColor(17, 17, 17);
    const partes = doc.splitTextToSize(String(izq), 44);
    doc.text(partes, 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(der), 75, y, { align: "right" });
    y += Math.max(1, partes.length) * 4 + 1;
  };
  centro(b.gym || "RADICAL", 15, true, [14, 167, 179]);
  y += 1;
  if (b.ruc || b.direccion) centro(`${b.ruc ? `RUC ${b.ruc} · ` : ""}${b.direccion || ""}`, 7.5, false, [90, 90, 90]);
  y += 1;
  linea();
  centro(`BOLETA N° ${b.numero}`, 10, true);
  centro(b.fecha, 8, false, [90, 90, 90]);
  y += 1;
  linea();
  fila("Concepto", "");
  y -= 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const c = doc.splitTextToSize(String(b.concepto || ""), 70);
  doc.text(c, 5, y);
  y += c.length * 4 + 1;
  if (b.cliente) fila("Cliente", b.cliente);
  if (b.profesional) fila("Profesional", b.profesional);
  (b.lineas || []).forEach((l) => fila(l.texto, S(l.monto)));
  linea();
  fila("TOTAL", S(b.total), true);
  fila("Medio de pago", b.metodo || "");
  if (b.reparto) {
    linea();
    fila(`Gimnasio (${b.reparto.pct}%)`, S(b.reparto.gimnasio));
    fila(`${b.reparto.quien} (${100 - b.reparto.pct}%)`, S(b.reparto.montoProfesional));
  }
  y += 3;
  centro("Constancia interna de pago · ¡Gracias!", 7.5, false, [90, 90, 90]);
  return doc;
}

export function descargarBoletaPdf(b) {
  pdfBoleta(b).save(`Boleta_${b.numero}.pdf`);
}

export const textoBoleta = (b) =>
  [
    `*${b.gym || "RADICAL"}* · Boleta N° ${b.numero}`,
    b.fecha,
    `Concepto: ${b.concepto}`,
    b.cliente ? `Cliente: ${b.cliente}` : "",
    `*Total: ${S(b.total)}* (${b.metodo})`,
    "¡Gracias por tu pago! 💪",
  ]
    .filter(Boolean)
    .join("\n");

/** Abre WhatsApp con el resumen de la boleta (al celular del cliente si lo hay) */
export function boletaPorWhatsApp(b, celular) {
  const texto = textoBoleta(b);
  window.open(celular ? enlaceWhatsApp(celular, texto) : `https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
}
