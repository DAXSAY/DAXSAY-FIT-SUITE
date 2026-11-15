// =====================================================================
// Buscador de alumnos por CÓDIGO (12 o DR-12), nombre, DNI o celular.
// Se usa en nutrición, fisioterapia y donde haga falta elegir un alumno,
// para que todos los módulos hablen con el mismo código del alumno.
// =====================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { coincideAlumno as coincideComun } from "../../utils/buscarPersona";

const sinTildes = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** ¿El alumno coincide con lo buscado? Regla común del sistema (utils/buscarPersona):
 *  "12" = solo el alumno 12 · "dr-12" · DNI de 8 cifras · celular · nombre */
export const coincideAlumno = (m, q) => coincideComun(m, q);

/** Orden: primero quien coincide exacto por código */
const puntaje = (m, q) => {
  const t = sinTildes(q).trim();
  if (m.code != null && String(m.code) === t) return 0;
  if (sinTildes(m.codeLabel).replace("-", "") === t.replace("-", "")) return 0;
  if (sinTildes(m.fullName).startsWith(t)) return 1;
  return 2;
};

/** Etiqueta del código, lista para mostrar al lado del nombre */
export const CodigoAlumno = ({ m, className = "" }) =>
  m?.codeLabel ? (
    <span className={`inline-block font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-px ${className}`}>
      {m.codeLabel}
    </span>
  ) : null;

/**
 * Selector con búsqueda. value = id del alumno ("" = ninguno).
 * vacio: texto de la opción "ninguno" (si se permite quitar la selección).
 */
export const SelectorAlumno = ({ alumnos = [], value, onChange, placeholder = "Código, nombre o DNI…", vacio, required, className = "" }) => {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [marca, setMarca] = useState(0);
  const caja = useRef(null);
  const elegido = alumnos.find((m) => String(m.id) === String(value));

  const lista = useMemo(
    () => alumnos.filter((m) => coincideAlumno(m, texto)).sort((a, b) => puntaje(a, texto) - puntaje(b, texto)).slice(0, 40),
    [alumnos, texto],
  );
  useEffect(() => setMarca(0), [texto]);
  useEffect(() => {
    const fuera = (e) => caja.current && !caja.current.contains(e.target) && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const elegir = (m) => {
    onChange(m ? m.id : "");
    setTexto("");
    setAbierto(false);
  };

  return (
    <div ref={caja} className={`relative ${className}`}>
      {elegido && !abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="w-full flex items-center gap-2 text-left bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-blue-400"
        >
          <CodigoAlumno m={elegido} />
          <span className="font-semibold text-slate-900 truncate flex-1">{elegido.fullName}</span>
          <span className="text-xs text-slate-500 whitespace-nowrap">DNI {elegido.dni}</span>
          {vacio !== undefined && (
            <span
              role="button"
              title="Quitar"
              onClick={(e) => {
                e.stopPropagation();
                elegir(null);
              }}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            autoFocus={abierto && !!elegido}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setAbierto(true);
            }}
            // La lista sale solo si la persona hace clic en el campo o escribe (no al recibir el foco solo)
            onMouseDown={() => setAbierto(true)}
            onBlur={(e) => !caja.current?.contains(e.relatedTarget) && setTimeout(() => setAbierto(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setMarca((i) => Math.min(i + 1, lista.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setMarca((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); if (lista[marca]) elegir(lista[marca]); }
              if (e.key === "Escape") setAbierto(false);
            }}
            placeholder={elegido ? `${elegido.codeLabel || ""} ${elegido.fullName}` : vacio || placeholder}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
          />
          {required && <input tabIndex={-1} required value={value || ""} onChange={() => {}} aria-hidden="true" className="absolute inset-0 opacity-0 pointer-events-none" />}
        </div>
      )}
      {abierto && (
        <div className="absolute z-40 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl p-1">
          {vacio !== undefined && (
            <button type="button" onClick={() => elegir(null)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 cursor-pointer">
              {vacio}
            </button>
          )}
          {lista.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Ningún alumno con «{texto}».</p>}
          {lista.map((m, i) => (
            <button
              type="button"
              key={m.id}
              onMouseEnter={() => setMarca(i)}
              onClick={() => elegir(m)}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm cursor-pointer ${i === marca ? "bg-blue-50" : ""}`}
            >
              <span className="w-16 shrink-0"><CodigoAlumno m={m} /></span>
              <span className="font-semibold text-slate-900 truncate flex-1">{m.fullName}</span>
              <span className="text-xs text-slate-500 whitespace-nowrap">{m.dni}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
