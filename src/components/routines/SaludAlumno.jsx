// Patologías, cuidados e indicaciones del alumno, para tenerlos a la vista
// al asignar o editar su rutina (viene de su ficha y de fisioterapia).
import React, { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { api } from "../../api/cliente";
import { EditorIndicaciones } from "../indicaciones/Indicaciones";

const ZONA = {
  cervical: "Cervical", dorsal: "Dorsal", lumbar: "Lumbar", hombro: "Hombro", codo: "Codo", muneca: "Muñeca", cadera: "Cadera",
  rodilla: "Rodilla", tobillo: "Tobillo", pie: "Pie", sacro: "Sacro", isquios: "Isquiotibiales", cuadriceps: "Cuádriceps",
};
const zona = (z) => ZONA[String(z).split("_")[0]] ? `${ZONA[String(z).split("_")[0]]}${/_(izq|der)/.test(z) ? (z.includes("izq") ? " izq." : " der.") : ""}` : String(z).replace(/_/g, " ");
const sinDato = (t) => !t || /^sin( restricc|guna| restric)?/i.test(String(t).trim());

const Chip = ({ children, tono = "rose" }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${
      tono === "rose" ? "bg-rose-50 border-rose-200 text-rose-800" : tono === "amber" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-sky-50 border-sky-200 text-sky-800"
    }`}
  >
    {children}
  </span>
);

export const SaludAlumno = ({ member, abiertoInicial = true, conIndicaciones = true, className = "" }) => {
  const [ficha, setFicha] = useState(null);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [editarInd, setEditarInd] = useState(false);

  useEffect(() => {
    if (!member?.id) return;
    setFicha(null);
    setError("");
    setEditarInd(false);
    api(`/alumnos/${member.id}/ficha`).then(setFicha).catch((e) => setError(e.message));
  }, [member?.id]);

  if (!member) return null;
  const f = ficha?.fisioterapia;
  const restricciones = [ficha?.restriccionesFicha, f?.restriccionesSala].filter((t) => !sinDato(t));
  const zonas = f?.zonas || [];
  const antecedentes = (f?.antecedentes || []).filter((a) => a && !/^sin /i.test(String(a)));
  const postura = f?.postura || [];
  const indicaciones = f?.indicaciones || [];
  const hayAlgo = restricciones.length || zonas.length || Number(f?.dolorEVA) > 0 || antecedentes.length || f?.motivo;

  return (
    <div className={`rounded-2xl border ${hayAlgo ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"} ${className}`}>
      <button type="button" onClick={() => setAbierto((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer">
        {!ficha && !error ? (
          <Stethoscope className="w-4 h-4 text-slate-400 animate-pulse" />
        ) : hayAlgo ? (
          <AlertTriangle className="w-4 h-4 text-rose-600" />
        ) : (
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
        )}
        <span className="flex-1 min-w-0">
          <span className={`block text-xs font-black uppercase tracking-wider ${hayAlgo ? "text-rose-800" : "text-emerald-800"}`}>
            Patologías, cuidados e indicaciones
          </span>
          <span className="block text-xs text-slate-600 truncate">
            {!ficha && !error
              ? "Cargando ficha del alumno…"
              : error
                ? error
                : hayAlgo
                  ? [zonas.length && `Zona: ${zonas.map(zona).join(", ")}`, Number(f?.dolorEVA) > 0 && `dolor ${f.dolorEVA}/10`, restricciones.length && "con restricciones"].filter(Boolean).join(" · ")
                  : "Sin patologías ni restricciones registradas"}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && ficha && (
        <div className="px-3 pb-3 space-y-2.5 text-sm">
          {hayAlgo ? (
            <>
              {f?.motivo && (
                <p className="text-slate-700">
                  <b>Motivo (fisioterapia):</b> {f.motivo}
                  {f.fecha && <span className="text-xs text-slate-500"> · {String(f.fecha).slice(0, 10).split("-").reverse().join("/")}</span>}
                </p>
              )}
              {(zonas.length > 0 || Number(f?.dolorEVA) > 0) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {zonas.map((z) => (
                    <Chip key={z}>🩹 {zona(z)}</Chip>
                  ))}
                  {Number(f?.dolorEVA) > 0 && <Chip tono="amber">Dolor {f.dolorEVA}/10</Chip>}
                  {f?.tonoMuscular && f.tonoMuscular !== "normotono" && <Chip tono="sky">Tono: {f.tonoMuscular}</Chip>}
                </div>
              )}
              {antecedentes.length > 0 && (
                <p className="text-slate-700">
                  <b>Antecedentes:</b> {antecedentes.join(", ")}
                </p>
              )}
              {postura.length > 0 && (
                <p className="text-slate-700">
                  <b>Postura:</b> {postura.join(", ")}
                </p>
              )}
              {restricciones.map((t, i) => (
                <p key={i} className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-900">
                  ⚠️ {t}
                </p>
              ))}
            </>
          ) : (
            <p className="text-xs text-emerald-800">No hay lesiones, dolor ni restricciones en su ficha ni en fisioterapia.</p>
          )}

          {indicaciones.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5" /> Indicaciones de fisioterapia
              </p>
              <div className="flex flex-wrap gap-1.5">
                {indicaciones.map((x, i) => (
                  <Chip key={i} tono="sky">
                    {x.nombre}
                    {x.series ? ` · ${x.series}×${x.reps || x.segundos ? `${x.reps || ""}${x.segundos ? `${x.segundos}s` : ""}` : ""}` : ""}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {conIndicaciones && (
            <div>
              <button type="button" onClick={() => setEditarInd((v) => !v)} className="text-xs font-bold text-blue-700 hover:underline cursor-pointer">
                {editarInd ? "Ocultar indicaciones del alumno" : "Ver / editar indicaciones del alumno (estiramientos, movilidad, cuidados)"}
              </button>
              {editarInd && (
                <div className="mt-2 rounded-xl bg-white border border-slate-200 p-2">
                  <EditorIndicaciones key={member.id} member={member} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
