// Aviso de "cambios sin guardar" para TODAS las ventanas flotantes del sistema.
// Funciona sin tocar cada formulario: mira los campos de la ventana abierta y,
// si la persona escribió algo y quiere cerrar (X, Cancelar, Cerrar, clic fuera
// o tecla Esc), pregunta antes de perder lo escrito.
import React, { useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";

const VENTANA = ".rd-velo, .fixed.inset-0";
// Botones que guardan o avanzan: después de usarlos, lo que hay en pantalla ya está guardado
const GUARDA = /guardar|registrar|crear|asignar|confirmar|aplicar|siguiente|seguir|enviar|cobrar|vender|agregar|añadir|actualizar|programar|agendar|aprobar|solicitar|matricular|renovar|pagar|abrir caja|cerrar caja|listo/i;
const CIERRA = /^(cancelar|cerrar|descartar|salir)$/i;

const ventanaDe = (el) => {
  const v = el?.closest?.(VENTANA);
  return v && v.querySelector("input, select, textarea") ? v : null;
};
const campos = (v) =>
  [...v.querySelectorAll("input, select, textarea")].filter(
    (c) =>
      !c.disabled &&
      c.type !== "search" &&
      c.type !== "hidden" &&
      c.type !== "file" &&
      !c.closest("[data-sin-guardia]") &&
      !/^buscar/i.test(c.getAttribute("placeholder") || ""),
  );
const foto = (v) => campos(v).map((c) => (c.type === "checkbox" || c.type === "radio" ? (c.checked ? "1" : "0") : c.value)).join("\u0001");

/** ¿El clic es para cerrar la ventana? */
const esCierre = (objetivo, v) => {
  if (objetivo === v) return true; // clic en el fondo oscuro
  const b = objetivo.closest("button, a, [role=button]");
  if (!b || !v.contains(b)) return false;
  const texto = (b.innerText || "").trim();
  if (CIERRA.test(texto) || /^(←\s*)?volver$/i.test(texto) || /^[✕×]$/.test(texto)) return true;
  if (b.dataset.rdCtrl === "cerrar" || b.dataset.rdCtrl === "volver") return true;
  const etiqueta = `${b.getAttribute("aria-label") || ""} ${b.getAttribute("title") || ""}`;
  if (/cerrar|close/i.test(etiqueta)) return true;
  // Botón solo con la "X"
  return !texto && !!b.querySelector("svg.lucide-x, svg.lucide-circle-x, svg.lucide-arrow-left");
};

export default function GuardiaCambios() {
  const base = useRef(new WeakMap()); // ventana -> foto al empezar a editar
  const permitir = useRef(false);
  const [pregunta, setPregunta] = useState(null); // { seguir: () => void }

  useEffect(() => {
    const sucia = (v) => base.current.has(v) && base.current.get(v) !== foto(v);
    const marcar = (e) => {
      if (!e.isTrusted) return;
      const v = ventanaDe(e.target);
      if (v && !base.current.has(v) && e.target.matches?.("input, select, textarea, label, label *")) base.current.set(v, foto(v));
    };
    const alClic = (e) => {
      if (permitir.current) return;
      const v = ventanaDe(e.target);
      if (!v) return;
      const b = e.target.closest?.("button");
      if (b && GUARDA.test((b.innerText || "").trim())) {
        // Se guardó / se avanzó: lo que quede luego en la ventana se vuelve a medir
        setTimeout(() => base.current.delete(v), 0);
        return;
      }
      if (!esCierre(e.target, v) || !sucia(v)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const objetivo = e.target;
      setPregunta({
        seguir: () => {
          base.current.delete(v);
          permitir.current = true;
          objetivo.click();
          permitir.current = false;
        },
      });
    };
    const alTecla = (e) => {
      if (e.key !== "Escape" || permitir.current || !e.isTrusted) return;
      const abiertas = [...document.querySelectorAll(VENTANA)].filter((v) => v.querySelector("input, select, textarea"));
      const v = abiertas[abiertas.length - 1];
      if (!v || !sucia(v)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setPregunta({
        seguir: () => {
          base.current.delete(v);
          permitir.current = true;
          (document.activeElement || document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          permitir.current = false;
        },
      });
    };
    // Cerrar la pestaña del navegador con una ventana a medio llenar
    const alSalir = (e) => {
      const hay = [...document.querySelectorAll(VENTANA)].some((v) => sucia(v));
      if (hay) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("focusin", marcar, true);
    document.addEventListener("pointerdown", marcar, true);
    document.addEventListener("click", alClic, true);
    window.addEventListener("keydown", alTecla, true);
    window.addEventListener("beforeunload", alSalir);
    return () => {
      document.removeEventListener("focusin", marcar, true);
      document.removeEventListener("pointerdown", marcar, true);
      document.removeEventListener("click", alClic, true);
      window.removeEventListener("keydown", alTecla, true);
      window.removeEventListener("beforeunload", alSalir);
    };
  }, []);

  useEffect(() => {
    if (!pregunta) return;
    const tecla = (e) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setPregunta(null);
      }
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [pregunta]);

  if (!pregunta) return null;
  return (
    <div className="rd-guardia fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="rd-guardia-titulo" data-sin-guardia>
      <div className="w-full max-w-sm rounded-2xl bg-white border border-amber-200 shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <TriangleAlert className="w-5 h-5" />
          </span>
          <div>
            <h3 id="rd-guardia-titulo" className="font-black text-slate-900">Tienes cambios sin guardar</h3>
            <p className="text-sm text-slate-600 mt-1">Si cierras esta ventana se perderá lo que escribiste.</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" autoFocus onClick={() => setPregunta(null)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer">
            Seguir editando
          </button>
          <button
            type="button"
            onClick={() => {
              const p = pregunta;
              setPregunta(null);
              setTimeout(() => p.seguir(), 0);
            }}
            className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold cursor-pointer"
          >
            Cerrar sin guardar
          </button>
        </div>
      </div>
    </div>
  );
}
