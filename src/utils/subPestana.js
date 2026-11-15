import { useEffect, useState } from "react";

// Recuerda la pestaña (o filtro) de un apartado durante la sesión: al volver
// con «atrás» (botón, teclado o gesto del mouse) se ve lo mismo que antes.
// noRecordar: valores que no se recuerdan (p. ej. "agenda": al entrar al módulo
// se ve la pantalla principal y el horario solo al tocar su pestaña).
export function useRecordado(clave, inicial, noRecordar = []) {
  const k = `radical_vista_${clave}`;
  const [valor, setValor] = useState(() => {
    try {
      const v = sessionStorage.getItem(k);
      const x = v === null ? inicial : JSON.parse(v);
      return noRecordar.includes(x) ? inicial : x;
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
