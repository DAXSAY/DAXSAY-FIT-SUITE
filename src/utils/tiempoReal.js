// Tiempo real con el servidor (/api/eventos): cuando cualquier usuario guarda
// algo, todas las pantallas abiertas se enteran al instante.
import React from "react";
import { obtenerToken, ORIGEN } from "../api/cliente";

const oyentes = new Set();
let fuente = null;
let reintento = null;

function conectar() {
  clearTimeout(reintento);
  const token = obtenerToken();
  if (!token || typeof EventSource === "undefined" || !oyentes.size) return;
  fuente?.close();
  fuente = new EventSource(`/api/eventos?t=${encodeURIComponent(token)}`);
  fuente.addEventListener("cambio", (e) => {
    let datos = {};
    try {
      datos = JSON.parse(e.data);
    } catch {
      /* aviso sin datos */
    }
    const ajenos = (datos.cambios || []).filter((c) => c.origen !== ORIGEN);
    if (datos.cambios && !ajenos.length) return; // fue esta misma pestaña
    const modulos = ajenos.map((c) => c.modulo);
    oyentes.forEach((fn) => fn(modulos));
  });
  // Si se corta (servidor reiniciado, token renovado, sin red) se vuelve a abrir con el token al día
  fuente.onerror = () => {
    fuente?.close();
    fuente = null;
    reintento = setTimeout(conectar, 4000);
  };
}

/** fn(modulos) se llama cada vez que alguien guarda algo. Devuelve la función para dejar de escuchar. */
export function escucharCambios(fn) {
  oyentes.add(fn);
  if (!fuente) conectar();
  return () => {
    oyentes.delete(fn);
    if (!oyentes.size) {
      fuente?.close();
      fuente = null;
      clearTimeout(reintento);
    }
  };
}

/**
 * Hook: vuelve a cargar cuando otro usuario guarda algo en esos módulos
 * (ej. ["clases","masters"]). Sin lista, ante cualquier cambio.
 */
export function useAlCambiar(modulos, fn) {
  const ref = React.useRef(fn);
  ref.current = fn;
  const clave = Array.isArray(modulos) ? modulos.join(",") : "";
  React.useEffect(() => {
    let espera = null;
    const quitar = escucharCambios((cambiados) => {
      const lista = clave ? clave.split(",") : null;
      if (lista && !cambiados.some((m) => lista.includes(m))) return;
      clearTimeout(espera);
      espera = setTimeout(() => ref.current?.(), 250);
    });
    return () => (clearTimeout(espera), quitar());
  }, [clave]);
}
