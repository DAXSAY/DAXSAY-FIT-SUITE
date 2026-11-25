import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTema } from "../../utils/tema";
import { TAMANOS, tamanoGuardado, cambiarTamano } from "../../utils/tamanoLetra";

// Logo de DAXSAY Fit Suite: lobo de contorno (neón suave en oscuro, pastel en claro)
export const LogoRadical = ({ size = 36, className = "" }) => (
  <img
    src="/logo-daxsay.svg"
    alt="DAXSAY Fit Suite"
    width={size}
    height={size}
    className={`rd-logo shrink-0 select-none ${className.replace(/\bring-\S+/g, "")}`}
    style={{ width: size, height: size }}
    draggable={false}
  />
);
export const LogoDaxsay = LogoRadical;

// Nombre de la marca: DAXSAY Fit Suite
export const NombreRadical = ({ className = "text-base" }) => (
  <span className={`rd-marca font-extrabold ${className}`}>
    DAXSAY<span className="rd-marca-fs"> Fit Suite</span>
  </span>
);
export const NombreDaxsay = NombreRadical;

// Botón sol / luna para cambiar entre modo claro y oscuro (perilla centrada).
// vertical: interruptor de pie (ocupa poco ancho en la barra superior)
export const BotonTema = ({ className = "", compacto = false, vertical = false }) => {
  const [tema, alternar] = useTema();
  const oscuro = tema === "dark";
  const [tirando, setTirando] = React.useState(false);
  const titulo = oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  const accion = () => {
    setTirando(true);
    setTimeout(() => setTirando(false), 650);
    alternar();
  };
  // Cabecera: un foco colgante. Encendido = modo claro · apagado = modo oscuro.
  if (vertical) {
    return (
      <button
        type="button"
        onClick={accion}
        title={titulo}
        aria-label={titulo}
        className={`rd-foco ${oscuro ? "rd-foco-apagado" : "rd-foco-encendido"} ${tirando ? "rd-foco-tiron" : ""} ${className}`}
      >
        <svg viewBox="0 0 28 46" width="26" height="43" aria-hidden="true">
          <line x1="14" y1="0" x2="14" y2="12" className="rd-foco-cable" />
          <g className="rd-foco-cuerpo">
            <circle cx="14" cy="27" r="13" className="rd-foco-halo" />
            <rect x="10.5" y="12" width="7" height="5" rx="1.2" className="rd-foco-rosca" />
            <path d="M14 16.5c-4.6 0-8 3.4-8 7.8 0 2.7 1.3 4.6 2.9 6 .9.8 1.4 1.8 1.4 2.9v.8h7.4v-.8c0-1.1.5-2.1 1.4-2.9 1.6-1.4 2.9-3.3 2.9-6 0-4.4-3.4-7.8-8-7.8z" className="rd-foco-vidrio" />
            <path d="M12 34.6h4M12.4 36.8h3.2" className="rd-foco-base" />
            <path d="M12 26.5l1.2 2 1.6-2.8 1.2 2" className="rd-foco-filamento" />
          </g>
        </svg>
      </button>
    );
  }
  const largo = compacto ? 40 : 50;
  const grosor = compacto ? 22 : 26;
  const perilla = grosor - 6;
  const desplazamiento = oscuro ? largo - perilla - 6 : 0;
  return (
    <button
      type="button"
      onClick={alternar}
      title={titulo}
      aria-label={titulo}
      style={{ width: largo, height: grosor, padding: 2 }}
      className={`relative inline-flex items-center rounded-full border transition-colors cursor-pointer shrink-0 ${
        oscuro ? "bg-marino-900 border-blue-700" : "bg-slate-200 border-slate-300"
      } ${className}`}
    >
      <span
        className={`flex items-center justify-center rounded-full shadow transition-transform duration-300 ${oscuro ? "bg-blue-500 text-marino-950" : "bg-white text-amber-500"}`}
        style={{ width: perilla, height: perilla, transform: `translateX(${desplazamiento}px)` }}
      >
        {oscuro ? <Moon style={{ width: perilla * 0.62, height: perilla * 0.62 }} /> : <Sun style={{ width: perilla * 0.62, height: perilla * 0.62 }} />}
      </span>
    </button>
  );
};

// Firma del sistema (marca de agua): RADICAL funciona con DAXSAY Fit Suite
export const FirmaDaxsay = ({ className = "", claro = false, apilada = false }) => (
  <span className={`inline-flex items-center gap-1.5 select-none ${apilada ? "flex-col gap-0.5" : "whitespace-nowrap"} ${className}`}>
    <span className={`rd-firma-texto flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] ${claro ? "text-slate-400/80" : "text-slate-400"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
      con tecnología
    </span>
    <b className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-400">DAXSAY Fit Suite</b>
  </span>
);

// Botón «Aa»: cambia el tamaño de letra de todo el sistema en este equipo
// (útil en pantallas grandes de 32" o más). Recorre Normal → Mediano → Grande → Muy grande.
export const BotonTamano = ({ className = "" }) => {
  const [k, setK] = React.useState(tamanoGuardado());
  const i = TAMANOS.findIndex((t) => t.k === k);
  const sig = TAMANOS[(i + 1) % TAMANOS.length];
  const actual = TAMANOS[i] || TAMANOS[0];
  return (
    <button
      type="button"
      onClick={() => {
        cambiarTamano(sig.k);
        setK(sig.k);
      }}
      title={`Tamaño de letra: ${actual.etiqueta}. Toca para «${sig.etiqueta}»`}
      aria-label={`Tamaño de letra: ${actual.etiqueta}`}
      className={`rd-boton-tamano ${className}`}
    >
      <span style={{ fontSize: "0.8em" }}>A</span>
      <span style={{ fontSize: "1.15em" }}>A</span>
      <span className="rd-boton-tamano-nivel">{i + 1}</span>
    </button>
  );
};
