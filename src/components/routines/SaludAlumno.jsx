// Cuidados del alumno (SOLO LECTURA) para el entrenador y el personal:
// lo que indicó fisioterapia (patologías, restricciones, indicaciones) y
// lo que indicó nutrición (plan, comidas, hidratación, suplementos).
// Lo editan solo los especialistas en sus módulos.
import React, { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Droplets, HeartPulse, Lock, Salad, ShieldCheck, Stethoscope } from "lucide-react";
import { api } from "../../api/cliente";
import { CATEGORIAS, LUGARES, textoDosis } from "../indicaciones/Indicaciones";

const ZONA = {
  cervical: "Cervical", dorsal: "Dorsal", lumbar: "Lumbar", hombro: "Hombro", codo: "Codo", muneca: "Muñeca", cadera: "Cadera",
  rodilla: "Rodilla", tobillo: "Tobillo", pie: "Pie", sacro: "Sacro", isquios: "Isquiotibiales", cuadriceps: "Cuádriceps",
};
const zona = (z) => {
  const b = String(z).split("_")[0];
  return ZONA[b] ? `${ZONA[b]}${/_izq/.test(z) ? " izq." : /_der/.test(z) ? " der." : ""}` : String(z).replace(/_/g, " ");
};
const sinDato = (t) => !t || /^sin( restricc|guna| restric)?/i.test(String(t).trim());
const fc = (f) => (f ? String(f).slice(0, 10).split("-").reverse().join("/") : "");

const Chip = ({ children, tono = "rose" }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${
      { rose: "bg-rose-50 border-rose-200 text-rose-800", amber: "bg-amber-50 border-amber-200 text-amber-800", sky: "bg-sky-50 border-sky-200 text-sky-800", emerald: "bg-emerald-50 border-emerald-200 text-emerald-800" }[tono]
    }`}
  >
    {children}
  </span>
);

const Titulo = ({ icono: I, children, color, quien }) => (
  <p className={`flex flex-wrap items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${color}`}>
    <I className="w-3.5 h-3.5" /> {children}
    {quien && <span className="normal-case tracking-normal font-semibold text-slate-500">· {quien}</span>}
  </p>
);

export const SaludAlumno = ({ member, abiertoInicial = true, className = "" }) => {
  const [ficha, setFicha] = useState(null);
  const [ind, setInd] = useState(null);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(abiertoInicial);

  useEffect(() => {
    if (!member?.id) return;
    setFicha(null);
    setInd(null);
    setError("");
    api(`/alumnos/${member.id}/ficha`).then(setFicha).catch((e) => setError(e.message));
    api(`/indicaciones/alumno/${member.id}`).then((d) => setInd(d?.vigente || null)).catch(() => setInd(null));
  }, [member?.id]);

  if (!member) return null;
  const f = ficha?.fisioterapia;
  const d = ficha?.dieta;
  const pn = ficha?.progresoNutricion;
  const restricciones = [ficha?.restriccionesFicha, f?.restriccionesSala].filter((t) => !sinDato(t));
  const zonas = f?.zonas || [];
  const antecedentes = (f?.antecedentes || []).filter((a) => a && !/^sin /i.test(String(a)));
  const postura = f?.postura || [];
  const indEval = f?.indicaciones || [];
  const indItems = ind?.items || [];
  const hayFisio = restricciones.length || zonas.length || Number(f?.dolorEVA) > 0 || antecedentes.length || f?.motivo;
  const resumen =
    !ficha && !error
      ? "Cargando…"
      : error
        ? error
        : [
            hayFisio
              ? [zonas.length && `Zona: ${zonas.map(zona).join(", ")}`, Number(f?.dolorEVA) > 0 && `dolor ${f.dolorEVA}/10`, restricciones.length && "con restricciones"].filter(Boolean).join(" · ") ||
                "con indicaciones de fisioterapia"
              : "Sin patologías registradas",
            d ? `Plan: ${d.titulo}` : "Sin plan de alimentación",
          ].join(" · ");

  return (
    <div className={`rounded-2xl border ${hayFisio ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"} ${className}`}>
      <button type="button" onClick={() => setAbierto((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer">
        {!ficha && !error ? <Stethoscope className="w-4 h-4 text-slate-400 animate-pulse" /> : hayFisio ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
        <span className="flex-1 min-w-0">
          <span className={`flex flex-wrap items-center gap-1.5 text-xs font-black uppercase tracking-wider ${hayFisio ? "text-rose-800" : "text-emerald-800"}`}>
            Cuidados del alumno · fisioterapia y nutrición
            <span className="inline-flex items-center gap-0.5 normal-case tracking-normal text-[10px] font-bold px-1.5 py-px rounded-full bg-white border border-slate-200 text-slate-600">
              <Lock className="w-2.5 h-2.5" /> solo lectura
            </span>
          </span>
          <span className="block text-xs text-slate-600 truncate">{resumen}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && ficha && (
        <div className="px-3 pb-3 grid xl:grid-cols-2 gap-2.5 text-sm">
          {/* ---------- Fisioterapia ---------- */}
          <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2">
            <Titulo icono={HeartPulse} color="text-rose-700" quien={f ? `${f.fisioterapeuta || "Fisioterapia"} · ${fc(f.fecha)}` : ""}>
              Fisioterapia
            </Titulo>
            {!hayFisio && !indItems.length && !indEval.length ? (
              <p className="text-xs text-emerald-800">Sin lesiones, dolor ni restricciones registradas.</p>
            ) : (
              <>
                {f?.motivo && (
                  <p className="text-slate-700 text-xs">
                    <b>Motivo:</b> {f.motivo}
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
                  <p className="text-xs text-slate-700">
                    <b>Antecedentes:</b> {antecedentes.join(", ")}
                  </p>
                )}
                {postura.length > 0 && (
                  <p className="text-xs text-slate-700">
                    <b>Postura:</b> {postura.join(", ")}
                  </p>
                )}
                {restricciones.map((t, i) => (
                  <p key={i} className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs font-bold text-amber-900">
                    ⚠️ {t}
                  </p>
                ))}
                {(indItems.length > 0 || indEval.length > 0) && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-500">Indicaciones a seguir{ind?.by ? ` · ${ind.by}` : ""}</p>
                    <ul className="space-y-1">
                      {indItems.map((it, i) => {
                        const c = CATEGORIAS[it.category];
                        return (
                          <li key={`i${i}`} className="flex items-start gap-1.5 text-xs text-slate-700">
                            <span className={`shrink-0 px-1.5 py-px rounded-md border text-[10px] font-bold ${c?.chip || "bg-slate-50 border-slate-200 text-slate-700"}`}>
                              {c?.emoji} {LUGARES[it.place]?.corto || c?.corto || "Indicación"}
                            </span>
                            <span>
                              <b>{it.name}</b>
                              {textoDosis(it) ? ` · ${textoDosis(it)}` : ""}
                              {it.detail ? ` — ${it.detail}` : ""}
                            </span>
                          </li>
                        );
                      })}
                      {!indItems.length &&
                        indEval.map((x, i) => (
                          <li key={`e${i}`} className="text-xs text-slate-700">
                            • <b>{x.nombre}</b>
                            {x.series ? ` · ${x.series}×${x.reps || ""}${x.segundos ? ` ${x.segundos}s` : ""}` : ""}
                            {x.detalle ? ` — ${x.detalle}` : ""}
                          </li>
                        ))}
                    </ul>
                    {ind?.notes && <p className="text-xs text-slate-600 italic">“{ind.notes}”</p>}
                  </div>
                )}
                {f?.enCasa && (
                  <p className="text-xs text-slate-600">
                    <b>En casa:</b> {f.enCasa}
                  </p>
                )}
              </>
            )}
          </div>

          {/* ---------- Nutrición ---------- */}
          <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2">
            <Titulo icono={Salad} color="text-emerald-700" quien={d ? `${d.nutricionista || "Nutrición"}${d.desde ? ` · desde ${fc(d.desde)}` : ""}` : ""}>
              Alimentación
            </Titulo>
            {pn && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 space-y-1.5">
                <p className="text-xs text-slate-700">
                  {pn.controles === 0 ? (
                    <b>Aún sin controles de medidas</b>
                  ) : pn.controles === 1 ? (
                    <>
                      <b>1.ª sesión de control</b> · {fc(pn.primero?.fecha)}
                    </>
                  ) : (
                    <>
                      <b>{pn.controles} controles</b> · del {fc(pn.primero?.fecha)} al {fc(pn.ultimo?.fecha)}
                    </>
                  )}
                  {pn.planes > 0 && <span className="text-slate-500"> · {pn.planes} plan(es) de alimentación</span>}
                </p>
                {pn.cambio ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      ["Peso", pn.cambio.peso, "kg", pn.ultimo?.peso, true],
                      ["% grasa", pn.cambio.grasa, "%", pn.ultimo?.grasa, true],
                      ["Músculo", pn.cambio.musculo, "kg", pn.ultimo?.musculo, false],
                      ["Cintura", pn.cambio.cintura, "cm", pn.ultimo?.cintura, true],
                    ]
                      .filter(([, c]) => c != null)
                      .map(([l, c, u, actual, bajarEsBueno]) => {
                        const bueno = c === 0 ? null : bajarEsBueno ? c < 0 : c > 0;
                        return (
                          <div key={l} className={`rounded-lg border px-2 py-1 text-center ${bueno == null ? "bg-white border-slate-200" : bueno ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                            <span className="block text-[10px] font-bold text-slate-500">{l}</span>
                            <span className={`block text-sm font-black ${bueno == null ? "text-slate-700" : bueno ? "text-emerald-700" : "text-amber-700"}`}>
                              {c > 0 ? "+" : ""}
                              {c} {u}
                            </span>
                            {actual != null && <span className="block text-[10px] text-slate-500">ahora {actual} {u}</span>}
                          </div>
                        );
                      })}
                  </div>
                ) : pn.primero && (pn.primero.peso || pn.primero.grasa) ? (
                  <p className="text-xs text-slate-600">
                    Medida inicial: {pn.primero.peso ? `${pn.primero.peso} kg` : ""}
                    {pn.primero.grasa ? ` · ${pn.primero.grasa}% grasa` : ""}
                    {pn.primero.cintura ? ` · cintura ${pn.primero.cintura} cm` : ""}. El progreso se verá desde el 2.º control.
                  </p>
                ) : null}
              </div>
            )}
            {!d ? (
              <p className="text-xs text-slate-500">Aún no tiene plan de alimentación. Antes de cargas altas, pregúntale si comió.</p>
            ) : (
              <>
                <p className="text-xs text-slate-800">
                  <b>{d.titulo}</b>
                  {d.objetivo ? ` · ${String(d.objetivo).replace(/_/g, " ")}` : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {d.kcal > 0 && <Chip tono="amber">🔥 {d.kcal} kcal</Chip>}
                  {d.proteinas > 0 && <Chip tono="sky">P {d.proteinas} g</Chip>}
                  {d.carbohidratos > 0 && <Chip tono="sky">C {d.carbohidratos} g</Chip>}
                  {d.grasas > 0 && <Chip tono="sky">G {d.grasas} g</Chip>}
                  {d.agua > 0 && (
                    <Chip tono="emerald">
                      <Droplets className="w-3 h-3 mr-0.5" /> {d.agua} L agua
                    </Chip>
                  )}
                </div>
                {(d.comidas || []).length > 0 && (
                  <ul className="space-y-0.5">
                    {d.comidas.map((m, i) => (
                      <li key={i} className="text-xs text-slate-700">
                        <b className="font-mono text-emerald-700">{m.hora || "—"}</b> {m.nombre}
                        {m.notas ? <span className="text-slate-500"> · {m.notas}</span> : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {d.suplementos?.length > 0 && (
                  <p className="text-xs text-slate-700">
                    <b>Suplementos:</b> {d.suplementos.join(", ")}
                  </p>
                )}
                {d.hidratacion && (
                  <p className="text-xs text-slate-700">
                    <b>Hidratación:</b> {d.hidratacion}
                  </p>
                )}
                {d.recomendaciones && <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-900">💬 {d.recomendaciones}</p>}
              </>
            )}
          </div>
          <p className="xl:col-span-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Lo indicaron fisioterapia y nutrición. Para cambiarlo, el especialista lo actualiza en su módulo.
          </p>
        </div>
      )}
    </div>
  );
};
