// Portal del alumno: sus servicios (incluidos en su plan o pagados aparte)
// y los que puede pedir en recepción con su precio.
import React, { useEffect, useState } from "react";
import { api } from "../../api/cliente";

const fechaCorta = (iso) => {
  if (!iso) return "";
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(d)} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"][Number(m) - 1]}`;
};

export default function MisServicios() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api("/servicios/mios").then(setD).catch(() => setD(null));
  }, []);
  if (!d?.conServicios) return null;
  const mios = d.servicios.filter((x) => x.vigente || x.futuro);
  const tengo = new Set(mios.map((x) => x.servicioId));
  const extra = (d.catalogo || []).filter((c) => !tengo.has(c.id));
  if (!mios.length && !extra.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <h3 className="text-lg font-extrabold text-slate-900">🧾 Mis servicios</h3>
      {mios.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {mios.map((x) => (
            <div key={x.id} className="rd-kpi-verde rd-aviso-t rounded-xl border p-3">
              <p className="text-sm font-black">{x.emoji} {x.nombre}</p>
              <p className="text-xs">
                {x.futuro
                  ? `Empieza el ${fechaCorta(x.desde)}`
                  : x.modo === "sesiones"
                    ? `Te quedan ${x.quedan} de ${x.sesiones}`
                    : `Hasta el ${fechaCorta(x.hasta)}`}
                {" · "}
                {x.origen === "plan" ? "incluido en tu plan" : x.origen === "cortesia" ? "cortesía del gimnasio 🎁" : "pagado aparte"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Tu plan no incluye servicios adicionales.</p>
      )}
      {extra.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">También puedes pedir en recepción</p>
          <div className="flex flex-wrap gap-1.5">
            {extra.map((c) => (
              <span key={c.id} className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-700">
                {c.emoji} {c.nombre} · S/ {Number(c.precio).toFixed(2)}
                {c.modo === "periodo" ? ` / ${c.dias} días` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
