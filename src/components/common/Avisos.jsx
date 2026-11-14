// Avisos de la campanita según el rol (ver servidor/rutas/avisos.js):
//  recepción / administración: "olvidó su contraseña" -> Restablecer (queda su DNI)
//  entrenador: alumnos que no anotan sus pesos -> Ver progreso
//  alumno: "no olvides anotar tu progreso" -> Anotar ahora
import { PanelLateral, CabeceraPanel, fechaHoyTexto } from "./PanelLateral";
import React, { useCallback, useEffect, useState } from "react";
import { Bell, KeyRound, X, MessageCircle } from "lucide-react";
import { api } from "../../api/cliente";
import { useGym } from "../../context/GymContext";
import { enlaceWhatsApp } from "./TelWhatsApp";

const claveOcultos = (id) => `radical_avisos_ocultos_${id || "x"}`;
const leerOcultos = (id) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(claveOcultos(id)) || "[]"));
  } catch {
    return new Set();
  }
};

/** Avisos del usuario conectado (se actualizan cada 2 minutos) */
export function useAvisos() {
  const { currentUser } = useGym();
  const uid = currentUser?.id;
  const [todos, setTodos] = useState([]);
  const [ocultos, setOcultos] = useState(() => leerOcultos(uid));

  const cargar = useCallback(() => {
    api("/avisos")
      .then((r) => setTodos(r.avisos || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!uid) return undefined;
    setOcultos(leerOcultos(uid));
    cargar();
    const t = setInterval(cargar, 120000);
    window.addEventListener("radical:avisos", cargar);
    return () => {
      clearInterval(t);
      window.removeEventListener("radical:avisos", cargar);
    };
  }, [uid, cargar]);

  const ocultar = (id) => {
    setOcultos((prev) => {
      const s = new Set(prev);
      s.add(id);
      try {
        localStorage.setItem(claveOcultos(uid), JSON.stringify([...s].slice(-200)));
      } catch {
        /* sin almacenamiento */
      }
      return s;
    });
  };

  const avisos = todos.filter((a) => a.fijo || !ocultos.has(a.id));
  return { avisos, cargar, ocultar };
}

const mensajeRestablecida = (nombre, gym) =>
  `Hola ${String(nombre || "").split(" ")[0]}, te saluda recepción de ${gym}. Ya restablecimos tu contraseña del portal: ingresa con tu DNI como usuario y como contraseña, y el sistema te pedirá crear una nueva. 💪`;

/** Ejecuta la acción de un aviso (navegar o restablecer) */
export function useAccionAviso(setActiveTab, recargar) {
  const { gymConfig } = useGym();
  const gym = gymConfig?.gym_nombre || "RADICAL";
  const [hecho, setHecho] = useState(null);

  const ejecutar = async (a) => {
    const ac = a.accion || {};
    if (ac.tipo === "restablecer") {
      if (!confirm("¿Confirmaste que es el alumno (en persona o llamando a su celular)?\n\nSu contraseña volverá a ser su DNI y deberá crear una nueva al ingresar.")) return;
      try {
        const r = await api(`/avisos/clave/${ac.idalerta}/restablecer`, { method: "POST" });
        setHecho({ ...r, mensaje: mensajeRestablecida(r.nombre, gym) });
        recargar();
      } catch (e) {
        alert(e.message);
      }
    } else if (ac.tipo === "atendida") {
      try {
        await api(`/avisos/clave/${ac.idalerta}/atendida`, { method: "POST" });
        recargar();
      } catch (e) {
        alert(e.message);
      }
    } else if (ac.tipo === "abrir_progreso") {
      try {
        sessionStorage.setItem("radical_abrir_progreso", ac.idalumno);
      } catch {
        /* nada */
      }
      setActiveTab?.("goals");
      window.dispatchEvent(new CustomEvent("radical:abrir-progreso", { detail: ac.idalumno }));
    } else if (ac.tipo === "proyecciones") {
      try {
        sessionStorage.setItem("radical_abrir_proyecciones", "1");
      } catch {
        /* nada */
      }
      setActiveTab?.("goals");
      window.dispatchEvent(new CustomEvent("radical:abrir-proyecciones"));
    } else if (ac.tipo === "anotar") {
      try {
        sessionStorage.setItem("radical_anotar_pesos", ac.fecha || "");
      } catch {
        /* nada */
      }
      setActiveTab?.("mi_rutina");
      window.dispatchEvent(new CustomEvent("radical:anotar-pesos", { detail: ac.fecha || "" }));
    } else if (ac.tipo === "ir" && ac.tab) {
      setActiveTab?.(ac.tab);
    }
  };
  return { ejecutar, hecho, cerrarHecho: () => setHecho(null) };
}

const ETIQUETA_IR = {
  routines: "Ver rutina", mi_rutina: "Ver rutina", appointments: "Ver agenda", mis_citas: "Ver mis citas",
  nutrition: "Ver dieta", mi_dieta: "Ver mi dieta", physiotherapy: "Ver ficha", mi_fisioterapia: "Ver mi plan",
};
const ETIQUETA = { restablecer: "Restablecer (DNI)", atendida: "Marcar atendida", abrir_progreso: "Ver progreso", anotar: "Anotar ahora", proyecciones: "Escribir proyecciones", ir: "Ver rutina" };
const ESTILO = {
  olvido_clave: "border-violet-200 bg-violet-50",
  pesos_alumno: "border-amber-200 bg-amber-50",
  pesos_sin_anotar: "border-amber-200 bg-amber-50",
  pesos_incompletos: "border-blue-200 bg-blue-50",
  rutina_actualizada: "border-sky-200 bg-sky-50",
};

/** Lista de avisos (dentro de una campanita) */
export function ListaAvisos({ avisos, onOcultar, onAccion, hecho, onCerrarHecho, vacio = true }) {
  return (
    <div className="space-y-2">
      {hecho && (
        <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 space-y-1.5">
          <p className="font-bold">✓ Contraseña de {hecho.nombre} restablecida: usuario y contraseña = su DNI.</p>
          <div className="flex gap-2">
            {hecho.telefono && (
              <a
                href={enlaceWhatsApp(hecho.telefono, hecho.mensaje)}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Avisarle por WhatsApp
              </a>
            )}
            <button type="button" onClick={onCerrarHecho} className="ml-auto text-emerald-700 font-semibold cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      )}
      {avisos.map((a) => (
        <div key={a.id} className={`p-2.5 rounded-lg border text-xs ${ESTILO[a.tipo] || "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-start gap-2">
            <p className="flex-1 font-bold text-slate-900">{a.titulo}</p>
            {!a.fijo && (
              <button type="button" onClick={() => onOcultar(a.id)} title="Ocultar" className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-slate-600 mt-0.5 leading-snug">{a.mensaje}</p>
          {a.accion && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onAccion(a)}
                className={`px-2.5 py-1 rounded-lg text-white font-bold cursor-pointer ${a.accion.tipo === "restablecer" ? "bg-violet-600 hover:bg-violet-500" : "bg-blue-600 hover:bg-blue-500"}`}
              >
                {a.accion.etiqueta || (a.accion.tipo === "ir" ? ETIQUETA_IR[a.accion.tab] || "Abrir" : ETIQUETA[a.accion.tipo]) || "Abrir"}
              </button>
              {a.accion.tipo === "restablecer" && (
                <>
                  {a.accion.telefono && (
                    <a href={`tel:${a.accion.telefono}`} className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold">
                      Llamar
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onAccion({ ...a, accion: { ...a.accion, tipo: "atendida" } })}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-600 font-semibold cursor-pointer"
                    title="No era el alumno o ya se resolvió"
                  >
                    Descartar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
      {vacio && !avisos.length && !hecho && <p className="text-xs text-slate-500 text-center py-4">No tienes avisos pendientes. ¡Todo al día!</p>}
    </div>
  );
}

/** Campanita propia para quien no tiene el centro de alertas (entrenador, alumno...) */
export function CampanaAvisos({ setActiveTab }) {
  const { avisos, cargar, ocultar } = useAvisos();
  const { ejecutar, hecho, cerrarHecho } = useAccionAviso(setActiveTab, cargar);
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative p-2 rounded-lg bg-slate-100/80 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
        title="Avisos"
      >
        <Bell className="w-4 h-4" />
        {avisos.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-xs font-extrabold flex items-center justify-center animate-pulse">
            {avisos.length}
          </span>
        )}
      </button>
      <PanelLateral abierto={abierto} onCerrar={() => setAbierto(false)}>
        <CabeceraPanel
          etiqueta="Tus avisos"
          fecha={fechaHoyTexto()}
          numero={avisos.length}
          textoNumero={avisos.length === 1 ? "aviso pendiente" : "avisos pendientes"}
          brillo="bg-sky-500/30"
          brillo2="bg-violet-600/25"
          colorEtiqueta="text-sky-300"
          onCerrar={() => setAbierto(false)}
        />
        <div className="flex-1 overflow-y-auto p-3 text-slate-800">
          <ListaAvisos
            avisos={avisos}
            onOcultar={ocultar}
            onAccion={(a) => {
              ejecutar(a);
              if (a.accion?.tipo !== "restablecer" && a.accion?.tipo !== "atendida") setAbierto(false);
            }}
            hecho={hecho}
            onCerrarHecho={cerrarHecho}
          />
        </div>
      </PanelLateral>
    </div>
  );
}

/** Sección para el centro de alertas de recepción / administración */
export function SeccionAvisos({ avisos, cargar, ocultar, setActiveTab }) {
  const { ejecutar, hecho, cerrarHecho } = useAccionAviso(setActiveTab, cargar);
  if (!avisos.length && !hecho) return null;
  return (
    <div className="mb-3 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700 flex items-center gap-1">
        <KeyRound className="w-3.5 h-3.5" /> Solicitudes y avisos ({avisos.length})
      </p>
      <div className="max-h-60 overflow-y-auto pr-1">
        <ListaAvisos avisos={avisos} onOcultar={ocultar} onAccion={ejecutar} hecho={hecho} onCerrarHecho={cerrarHecho} vacio={false} />
      </div>
    </div>
  );
}

/** Franja de recordatorio dentro del portal del alumno */
export function RecordatorioPesos({ setActiveTab }) {
  const { avisos, cargar, ocultar } = useAvisos();
  const { ejecutar } = useAccionAviso(setActiveTab, cargar);
  const a = avisos.find((x) => x.tipo === "pesos_sin_anotar" || x.tipo === "pesos_incompletos");
  if (!a) return null;
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 flex flex-wrap items-center gap-3">
      <span className="text-2xl">💪</span>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-black text-amber-900">{a.titulo}</p>
        <p className="text-xs text-amber-800">{a.mensaje}</p>
      </div>
      <button type="button" onClick={() => ejecutar(a)} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black cursor-pointer">
        Anotar ahora
      </button>
      <button type="button" onClick={() => ocultar(a.id)} className="text-xs font-semibold text-amber-700 cursor-pointer">
        Luego
      </button>
    </div>
  );
}
