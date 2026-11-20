import React, { useEffect, useRef, useState } from "react";

/**
 * Campo numérico que se puede escribir con el teclado sin que salte a 0 o al mínimo
 * al borrarlo. Las flechas (del teclado y del campo) siguen funcionando.
 * Mientras el campo está vacío no se avisa al formulario (queda el último número);
 * al salir del campo, si quedó vacío, vuelve a mostrar ese número.
 */
export const CampoNumero = React.forwardRef(function CampoNumero({ value, onChange, onBlur, onFocus, ...rest }, ref) {
  const [texto, setTexto] = useState(value ?? "");
  const enfocado = useRef(false);
  const aceptaVacio = value === "" || value === null || value === undefined;

  useEffect(() => {
    // Desde afuera cambió el valor: se muestra, salvo que sea lo mismo que se está escribiendo
    if (!enfocado.current || Number(texto) !== Number(value) || texto === "") {
      if (!(enfocado.current && texto === "" && !aceptaVacio)) setTexto(value ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      {...rest}
      ref={ref}
      type="number"
      inputMode={String(rest.step || "").includes(".") || rest.step === "any" ? "decimal" : "numeric"}
      value={texto}
      onFocus={(e) => {
        enfocado.current = true;
        onFocus?.(e);
      }}
      onChange={(e) => {
        const v = e.target.value;
        setTexto(v);
        if (v === "" || v === "-") {
          if (aceptaVacio || v === "") {
            if (aceptaVacio) onChange?.(e);
          }
          return;
        }
        onChange?.(e);
      }}
      onBlur={(e) => {
        enfocado.current = false;
        if (texto === "" && !aceptaVacio) setTexto(value ?? "");
        onBlur?.(e);
      }}
    />
  );
});
