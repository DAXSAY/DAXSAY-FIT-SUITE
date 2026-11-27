// Datos y utilidades comunes de las clases grupales
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/cliente";
import { hoyISO, sumarDias } from "../../utils/fecha";

export const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const DIAS_CORTO = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const COLORES = ["teal", "verde", "azul", "indigo", "violeta", "rosa", "rojo", "naranja", "ambar", "lima", "plomo"];

/** 1=lunes … 7=domingo */
export const diaDe = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
};
export const lunesDe = (iso) => sumarDias(iso, 1 - diaDe(iso));
export const fechaBonita = (iso) => {
  const [, m, d] = String(iso).split("-");
  return `${DIAS_CORTO[diaDe(iso)]} ${Number(d)} ${MESES[Number(m) - 1]}`;
};
export const aMin = (h) => {
  const [a, b] = String(h || "0:0").split(":").map(Number);
  return a * 60 + (b || 0);
};
export const deMin = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const ahoraLima = () => new Date().toLocaleTimeString("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });
export const hoy = () => hoyISO();
export { sumarDias };

/** Ventana de reserva de una sesión, calculada en pantalla (el servidor también la valida) */
export const estadoVentana = (s, minutos = 30, fechaHoy = hoyISO(), hora = ahoraLima()) => {
  const ini = aMin(s.inicio);
  const abre = ini - minutos;
  // Minutos absolutos: la ventana puede abrir el día anterior (hasta 24 h antes)
  const dia = (f) => Math.round(Date.parse(`${f}T00:00:00Z`) / 86400000);
  const t0 = dia(s.fecha) * 1440 + ini;
  const tFin = dia(s.fecha) * 1440 + aMin(s.fin);
  const ya = dia(fechaHoy) * 1440 + aMin(hora);
  const txt = `${abre < 0 ? "el día anterior a las " : ""}${deMin(((abre % 1440) + 1440) % 1440)}`;
  const estado = ya >= tFin ? "pasada" : ya >= t0 ? "en_curso" : ya >= t0 - minutos ? "abierta" : "pronto";
  return { estado, abre: txt };
};

/** Disciplinas, profesores y horario (GET /api/clases) */
export function useDatosClases() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [faltanTablas, setFaltanTablas] = useState(false);
  const cargar = useCallback(() => {
    api("/clases")
      .then((d) => (setDatos(d), setError(""), setFaltanTablas(false)))
      .catch((e) => (setError(e.message), setFaltanTablas(/parte 38/i.test(e.message))));
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);
  return { datos, error, faltanTablas, cargar };
}

/** Croquis del salón de una sede (GET /api/clases/croquis?sede=) */
export function useCroquis(sedeId = null) {
  const [croquis, setCroquis] = useState(null);
  const cargar = useCallback(() => {
    api(`/clases/croquis${sedeId ? `?sede=${sedeId}` : ""}`)
      .then(setCroquis)
      .catch(() => setCroquis((c) => c || { ancho: 40, alto: 28, steps: [], minutosReserva: 30 }));
  }, [sedeId]);
  useEffect(() => {
    cargar();
  }, [cargar]);
  return { croquis, setCroquis, cargarCroquis: cargar };
}

/** Sesiones (clase + fecha) de un rango con su disco */
export function useSesiones(desde, hasta, extra = "") {
  const [ses, setSes] = useState(null);
  const [error, setError] = useState("");
  const cargar = useCallback(() => {
    if (!desde || !hasta) return;
    api(`/clases/sesiones?desde=${desde}&hasta=${hasta}${extra}`)
      .then((d) => (setSes(d.sesiones), setError("")))
      .catch((e) => setError(e.message));
  }, [desde, hasta, extra]);
  useEffect(() => {
    setSes(null);
    cargar();
  }, [cargar]);
  return { sesiones: ses, error, cargar };
}

/** Nombre de la sede (solo si el gimnasio tiene más de una) */
export const nombreSede = (sedes, id) => ((sedes || []).length > 1 ? (sedes.find((x) => x.id === id)?.nombre || "") : "");
