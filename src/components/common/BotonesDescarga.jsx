// Botones "PDF" y "Foto" que van al lado de cada "Imprimir".
// Capturan el documento que se está viendo (la ventana, la ficha o el
// recuadro marcado con data-descargar) y lo bajan como PDF o como imagen PNG.
import React, { useState } from "react";
import { FileDown, ImageDown, Loader2, Printer } from "lucide-react";

const limpiar = (s) =>
  String(s || "documento")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);

const objetivoDe = (boton, selector) =>
  (selector && document.querySelector(selector)) ||
  boton.closest("[data-descargar]") ||
  boton.closest(".rd-hoja") ||
  boton.closest(".fixed.inset-0 > div, .fixed.inset-0 > form") ||
  document.querySelector("main");

// Devuelve el lienzo y, si el documento marca bloques con data-salto, dónde
// termina cada uno (en píxeles del lienzo) para no cortar filas entre páginas.
async function capturar(el, info = {}) {
  const html2canvas = (await import("html2canvas-pro")).default;
  const oscuro = document.documentElement.classList.contains("dark");
  // El documento sale siempre en claro (se imprime y se comparte mejor)
  if (oscuro) document.documentElement.classList.remove("dark");
  try {
    await new Promise((r) => requestAnimationFrame(() => r()));
    return await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: Math.max(el.scrollWidth, 900),
      ignoreElements: (n) => n.dataset?.noCaptura === "1" || n.classList?.contains("print:hidden"),
      onclone: (doc, copia) => {
        if (copia?.dataset?.ancho) {
          copia.style.width = `${copia.dataset.ancho}px`;
          copia.style.maxWidth = "none";
          copia.querySelectorAll(".rd-hr-scroll").forEach((x) => (x.style.overflow = "visible"));
        }
        // Los dibujos usan colores del tema (var(--color-…)); se fijan para que la foto los respete
        const vista = doc.defaultView;
        doc.querySelectorAll("svg *").forEach((n) => {
          [["fill", "fill"], ["stroke", "stroke"], ["stop-color", "stopColor"]].forEach(([attr, prop]) => {
            if ((n.getAttribute(attr) || "").includes("var(")) n.setAttribute(attr, vista.getComputedStyle(n)[prop]);
          });
        });
        doc.querySelectorAll("[class*='overflow-y-auto'], [class*='max-h-']").forEach((x) => {
          x.style.maxHeight = "none";
          x.style.overflow = "visible";
        });
        if (copia) {
          const arriba = copia.getBoundingClientRect().top;
          info.saltos = [...copia.querySelectorAll("[data-salto]")].map((n) => (n.getBoundingClientRect().bottom - arriba) * 2);
        }
      },
    });
  } finally {
    if (oscuro) document.documentElement.classList.add("dark");
  }
}

const bajar = (url, nombre) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export async function descargarComoFoto(el, nombre) {
  const c = await capturar(el);
  bajar(c.toDataURL("image/png"), `${limpiar(nombre)}.png`);
}

async function armarPDF(el) {
  const info = {};
  const c = await capturar(el, info);
  const saltos = (info.saltos || []).filter((v) => v > 0).sort((a, b) => a - b);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margen = 24;
  const ancho = W - margen * 2;
  const altoPagina = H - margen * 2;
  const escala = ancho / c.width;
  const altoPx = Math.floor(altoPagina / escala);
  // Se corta la imagen en páginas A4, en el último bloque completo que entra
  for (let y = 0, pag = 0; y < c.height - 2; pag++) {
    let fin = Math.min(y + altoPx, c.height);
    if (fin < c.height) {
      const corte = saltos.filter((v) => v > y + altoPx * 0.35 && v <= fin).pop();
      if (corte) fin = Math.ceil(corte) + 2;
    }
    const trozo = document.createElement("canvas");
    trozo.width = c.width;
    trozo.height = Math.max(1, Math.min(fin, c.height) - y);
    trozo.getContext("2d").drawImage(c, 0, y, c.width, trozo.height, 0, 0, c.width, trozo.height);
    if (pag) doc.addPage();
    doc.addImage(trozo.toDataURL("image/jpeg", 0.92), "JPEG", margen, margen, ancho, trozo.height * escala, undefined, "FAST");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${pag + 1}`, W - margen, H - 10, { align: "right" });
    y += trozo.height;
  }
  return doc;
}

export async function descargarComoPDF(el, nombre) {
  (await armarPDF(el)).save(`${limpiar(nombre)}.pdf`);
}

// Imprimir: arma el PDF y lo abre en otra pestaña, desde donde se imprime
// (funciona también en navegadores que no tienen vista previa de impresión).
export async function imprimirComoPDF(el, nombre) {
  const ventana = window.open("", "_blank");
  const doc = await armarPDF(el);
  doc.setProperties({ title: nombre });
  doc.autoPrint?.();
  const url = URL.createObjectURL(doc.output("blob"));
  if (ventana && !ventana.closed) {
    ventana.location.href = url;
  } else {
    doc.save(`${limpiar(nombre)}.pdf`);
  }
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

export const BotonesDescarga = ({ nombre = "documento", selector, compacto = false, soloFoto = false, imprimir = false, className = "" }) => {
  const [trabajando, setTrabajando] = useState("");
  const accion = (tipo) => async (e) => {
    const el = objetivoDe(e.currentTarget, selector);
    if (!el) return;
    setTrabajando(tipo);
    try {
      if (tipo === "pdf") await descargarComoPDF(el, nombre);
      else if (tipo === "imprimir") await imprimirComoPDF(el, nombre);
      else await descargarComoFoto(el, nombre);
    } catch (er) {
      alert(`No se pudo generar el archivo: ${er.message}`);
    } finally {
      setTrabajando("");
    }
  };
  const base = `inline-flex items-center gap-1 rounded-lg border text-xs font-bold cursor-pointer disabled:opacity-60 ${compacto ? "px-2 py-1.5" : "px-3 py-2"}`;
  return (
    <span data-no-captura="1" className={`inline-flex items-center gap-1.5 print:hidden ${className}`}>
      {imprimir && <button type="button" onClick={accion("imprimir")} disabled={!!trabajando} title="Imprimir (abre el PDF listo para imprimir)" className={`${base} bg-white border-slate-200 text-slate-700 hover:bg-slate-50`}>
        {trabajando === "imprimir" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
        {!compacto && "Imprimir"}
      </button>}
      {!soloFoto && <button type="button" onClick={accion("pdf")} disabled={!!trabajando} title="Descargar en PDF" className={`${base} bg-white border-rose-200 text-rose-700 hover:bg-rose-50`}>
        {trabajando === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
        {!compacto && "PDF"}
      </button>}
      <button type="button" onClick={accion("foto")} disabled={!!trabajando} title="Descargar como foto (PNG)" className={`${base} bg-white border-sky-200 text-sky-700 hover:bg-sky-50`}>
        {trabajando === "foto" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}
        {!compacto && "Foto"}
      </button>
    </span>
  );
};
