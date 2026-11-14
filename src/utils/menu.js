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

// Menú en celular (pantalla angosta): se abre y cierra con el botón ☰
const EVENTO_MOVIL = "radical:menu-movil";
let abiertoMovil = false;
export const useMenuMovil = () => {
  const [abierto, setAbierto] = useState(abiertoMovil);
  useEffect(() => {
    const sync = (e) => setAbierto(e.detail);
    window.addEventListener(EVENTO_MOVIL, sync);
    return () => window.removeEventListener(EVENTO_MOVIL, sync);
  }, []);
  const poner = (v) => {
    abiertoMovil = typeof v === "function" ? v(abiertoMovil) : !!v;
    window.dispatchEvent(new CustomEvent(EVENTO_MOVIL, { detail: abiertoMovil }));
  };
  return [abierto, poner];
};
export const esPantallaAngosta = () => typeof window !== "undefined" && window.innerWidth < 768;
