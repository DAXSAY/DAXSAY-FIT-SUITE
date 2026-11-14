// Botones "PDF" y "Foto" que van al lado de cada "Imprimir".
// Capturan el documento que se está viendo (la ventana, la ficha o el
// recuadro marcado con data-descargar) y lo bajan como PDF o como imagen PNG.
import React, { useState } from "react";
import { FileDown, ImageDown, Loader2 } from "lucide-react";

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

async function capturar(el) {
  const html2canvas = (await import("html2canvas")).default;
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
      onclone: (doc) => {
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

export async function descargarComoPDF(el, nombre) {
  const c = await capturar(el);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margen = 24;
  const ancho = W - margen * 2;
  const altoPagina = H - margen * 2;
  const escala = ancho / c.width;
  const altoPx = Math.floor(altoPagina / escala);
  // Se corta la imagen en páginas A4
  for (let y = 0, pag = 0; y < c.height; y += altoPx, pag++) {
    const trozo = document.createElement("canvas");
    trozo.width = c.width;
    trozo.height = Math.min(altoPx, c.height - y);
    trozo.getContext("2d").drawImage(c, 0, y, c.width, trozo.height, 0, 0, c.width, trozo.height);
    if (pag) doc.addPage();
    doc.addImage(trozo.toDataURL("image/jpeg", 0.92), "JPEG", margen, margen, ancho, trozo.height * escala, undefined, "FAST");
  }
  doc.save(`${limpiar(nombre)}.pdf`);
}

export const BotonesDescarga = ({ nombre = "documento", selector, compacto = false, soloFoto = false, className = "" }) => {
  const [trabajando, setTrabajando] = useState("");
  const accion = (tipo) => async (e) => {
    const el = objetivoDe(e.currentTarget, selector);
    if (!el) return;
    setTrabajando(tipo);
    try {
      if (tipo === "pdf") await descargarComoPDF(el, nombre);
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
