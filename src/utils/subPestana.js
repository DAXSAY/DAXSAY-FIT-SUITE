import { useEffect, useState } from "react";

// Recuerda la pestaña (o filtro) de un apartado durante la sesión: al volver
// con «atrás» (botón, teclado o gesto del mouse) se ve lo mismo que antes.
export function useRecordado(clave, inicial) {
  const k = `radical_vista_${clave}`;
  const [valor, setValor] = useState(() => {
    try {
      const v = sessionStorage.getItem(k);
      return v === null ? inicial : JSON.parse(v);
    } catch {
      return inicial;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(k, JSON.stringify(valor));
    } catch {
      /* sin almacenamiento */
    }
  }, [k, valor]);
  return [valor, setValor];
}
