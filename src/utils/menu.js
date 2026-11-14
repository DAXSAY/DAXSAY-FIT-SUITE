// Menú lateral plegado (solo íconos). Se recuerda en este equipo y se
// comparte entre la barra superior (botón) y el menú lateral.
import { useEffect, useState } from "react";

const CLAVE = "radical_menu_plegado";
const EVENTO = "radical:menu-plegado";

const leer = () => {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
};

export const useMenuPlegado = () => {
  const [plegado, setPlegado] = useState(leer);
  useEffect(() => {
    const sync = (e) => setPlegado(e.detail);
    window.addEventListener(EVENTO, sync);
    return () => window.removeEventListener(EVENTO, sync);
  }, []);
  const alternar = () => {
    const nuevo = !leer();
    try {
      localStorage.setItem(CLAVE, nuevo ? "1" : "0");
    } catch {
      /* sin almacenamiento */
    }
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: nuevo }));
  };
  return [plegado, alternar];
};
