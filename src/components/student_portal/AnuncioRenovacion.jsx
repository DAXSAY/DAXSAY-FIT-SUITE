// Anuncio de renovación del portal del alumno: a pantalla completa cuando le
// quedan 2 días o menos, o cuando su plan ya venció (o es exalumno). Muestra
// los planes vigentes; al elegir uno se abre WhatsApp con el mensaje listo al
// turno de recepción que atiende en ese momento y recepción recibe la tarea.
// Se puede cerrar con la ✕ (vuelve a salir al día siguiente) y abrir de nuevo
// con el evento «radical:renovar» (botón «Renovar» del portal).
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../api/cliente";

const clave = (vence) => `rd_anuncio_renovar_${vence}_${new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })}`;
const TONOS = ["teal", "violeta", "azul", "ambar", "rosa", "verde"];
const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
const duracion = (d) => (d % 30 === 0 && d >= 30 ? `${d / 30} ${d / 30 === 1 ? "mes" : "meses"}` : `${d} ${d === 1 ? "día" : "días"}`);

export const AnuncioRenovacion = () => {
  const [datos, setDatos] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState("anuncio"); // anuncio | planes | listo
  const [enviando, setEnviando] = useState("");
  const [listo, setListo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    api("/portal-renovacion")
      .then((r) => {
        if (!vivo || !r?.mostrar) return;
        setDatos(r);
        let visto = false;
        try {
          visto = !!localStorage.getItem(clave(r.vence));
        } catch {
          /* sin almacenamiento */
        }
        if (!visto) setAbierto(true);
      })
      .catch(() => {});
    const abrir = () => {
      setPaso("planes");
      setAbierto(true);
    };
    window.addEventListener("radical:renovar", abrir);
    return () => {
      vivo = false;
      window.removeEventListener("radical:renovar", abrir);
    };
  }, []);

  if (!datos || !abierto) return null;
  const cerrar = () => {
    try {
      localStorage.setItem(clave(datos.vence), "1");
    } catch {
      /* nada */
    }
    setAbierto(false);
    setPaso("anuncio");
    setListo(null);
  };
  const elegir = async (p) => {
    setError("");
    setEnviando(p.id);
    // La ventana se abre en el mismo clic (si no, el navegador del celular la bloquea)
    const ventana = window.open("", "_blank");
    try {
      const r = await api("/portal-renovacion/solicitud", { method: "POST", body: { planId: p.id } });
      if (r.whatsapp) {
        if (ventana) ventana.location.href = r.whatsapp;
        else window.location.href = r.whatsapp;
      } else ventana?.close();
      setListo({ ...r, plan: p });
      setPaso("listo");
    } catch (e) {
      ventana?.close();
      setError(e.message);
    } finally {
      setEnviando("");
    }
  };

  const titulo =
    datos.tipo === "exalumno"
      ? `¡Te extrañamos, ${datos.nombre.split(" ")[0]}!`
      : datos.tipo === "vencido"
        ? "Tu plan ya venció"
        : datos.dias === 0
          ? "Tu plan vence HOY"
          : `Tu plan vence en ${datos.dias} ${datos.dias === 1 ? "día" : "días"}`;
  const subtitulo =
    datos.tipo === "exalumno"
      ? `Han pasado ${datos.dias} días desde tu último plan. Vuelve a entrenar con tu mismo código: tu rutina y tu progreso siguen guardados.`
      : datos.tipo === "vencido"
        ? `Venció hace ${datos.dias} ${datos.dias === 1 ? "día" : "días"}. Renueva para volver a ver tu rutina, tu alimentación y tu progreso.`
        : "Renueva ahora y sigue entrenando sin cortar tu avance. Elige tu plan y escríbenos por WhatsApp en un toque.";
  const emoji = datos.tipo === "exalumno" ? "🐺" : datos.tipo === "vencido" ? "⏰" : "🔥";

  return (
    <div className="fixed inset-0 z-[120] rd-velo items-start sm:items-center justify-center overflow-y-auto" role="dialog" aria-label="Renueva tu plan">
      <div className={`rd-kpi-${datos.tipo === "por_vencer" ? "teal" : datos.tipo === "vencido" ? "rojo" : "violeta"} rd-anuncio w-full max-w-3xl rounded-3xl border shadow-2xl rd-aparece overflow-hidden relative`}>
        <button type="button" onClick={cerrar} aria-label="Cerrar" title="Cerrar" className="absolute right-3 top-3 z-10 w-9 h-9 rounded-full flex items-center justify-center rd-anuncio-x cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        {paso === "anuncio" && (
          <div className="rd-anuncio-portada px-6 sm:px-10 py-10 sm:py-14 text-center space-y-4">
            <div className="text-6xl sm:text-7xl rd-emoji rd-anuncio-latido">{emoji}</div>
            <p className="text-xs font-black uppercase tracking-[0.25em] rd-texto-k">{datos.gimnasio}</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">{titulo}</h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">{subtitulo}</p>
            {datos.planActual && (
              <p className="text-xs font-bold text-slate-500">
                Tu último plan: <b className="text-slate-700">{datos.planActual}</b> · {datos.tipo === "por_vencer" ? "vence" : "venció"} el {datos.vence.split("-").reverse().join("/")}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button type="button" onClick={() => setPaso("planes")} className="rd-boton-t px-7 py-3.5 rounded-2xl text-base font-black cursor-pointer">
                💳 Ver planes
              </button>
              <button type="button" onClick={cerrar} className="px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-black/5 cursor-pointer">
                Ahora no
              </button>
            </div>
          </div>
        )}

        {paso === "planes" && (
          <div className="px-5 sm:px-8 py-7 space-y-4">
            <div className="pr-10">
              <p className="text-xs font-black uppercase tracking-widest rd-texto-k">💳 Planes y tarifas</p>
              <h2 className="text-2xl font-black text-slate-900">Elige tu plan</h2>
              <p className="text-sm text-slate-600">
                Al elegir, se abre WhatsApp con tu mensaje listo para <b>{datos.contacto.aQuien}</b>
                {datos.contacto.fueraDeHorario ? " (ahora estamos fuera del horario de recepción)" : ""}.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {datos.planes.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={!!enviando}
                  onClick={() => elegir(p)}
                  className={`rd-kpi-${TONOS[i % TONOS.length]} rd-anuncio-plan text-left rounded-2xl border p-4 cursor-pointer disabled:opacity-60 relative`}
                >
                  {(p.destacado || p.actual) && (
                    <span className="absolute right-3 top-3 rd-chip-t px-2 py-0.5 rounded-full text-[10px] font-black">{p.actual ? "Tu plan" : "⭐ Recomendado"}</span>
                  )}
                  <p className="font-black text-slate-900 pr-20">{p.nombre}</p>
                  <p className="text-2xl font-black rd-texto-k">{soles(p.precio)}</p>
                  <p className="text-xs font-bold text-slate-500">{duracion(p.dias)}{p.incluye.length ? ` · incluye ${p.incluye.join(", ")}` : ""}</p>
                  {p.caracteristicas.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {p.caracteristicas.map((c) => (
                        <li key={c} className="text-xs text-slate-600">✓ {c}</li>
                      ))}
                    </ul>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1.5 rd-boton-t px-3 py-1.5 rounded-xl text-xs font-black">
                    {enviando === p.id ? "Abriendo WhatsApp…" : "💬 Elegir y escribir por WhatsApp"}
                  </span>
                </button>
              ))}
            </div>
            {error && <p className="rd-error-t text-sm font-bold">{error}</p>}
          </div>
        )}

        {paso === "listo" && listo && (
          <div className="px-6 sm:px-10 py-10 text-center space-y-3">
            <div className="text-6xl rd-emoji">✅</div>
            <h2 className="text-2xl font-black text-slate-900">¡Listo! Ya avisamos a recepción</h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Elegiste <b>{listo.plan.nombre}</b> ({soles(listo.plan.precio)}). {listo.aQuien} ya tiene tu pedido
              {listo.whatsapp ? " y se abrió WhatsApp con tu mensaje." : ". Acércate a recepción para completar tu renovación."}
            </p>
            {listo.whatsapp && (
              <a href={listo.whatsapp} target="_blank" rel="noreferrer" className="inline-flex rd-boton-t px-6 py-3 rounded-2xl text-sm font-black">
                💬 Abrir WhatsApp otra vez
              </a>
            )}
            <div>
              <button type="button" onClick={cerrar} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-black/5 cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
