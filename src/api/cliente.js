import { avisarCambio } from "../utils/ventanas";
// Cliente de la API de RADICAL (servidor/index.js)
const CLAVE_TOKEN = "radicalgym_token";

export const obtenerToken = () => {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
};

export const guardarToken = (token) => {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* sin almacenamiento disponible */
  }
};

// Se ejecuta cuando la API responde 401 (sesión vencida o cerrada)
let alExpirarSesion = () => {};
export const alPerderSesion = (fn) => {
  alExpirarSesion = fn;
};

// Identificador de esta pestaña: el aviso en tiempo real de un guardado propio se ignora
export const ORIGEN = Math.random().toString(36).slice(2, 12);

export async function api(ruta, { method = "GET", body } = {}) {
  const token = obtenerToken();
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Origen": ORIGEN,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Verifica que la API esté encendida (npm run dev).");
  }

  // Otra ventana del mismo navegador se entera de que algo cambió
  if (method !== "GET" && respuesta.ok) avisarCambio();
  const renovado = respuesta.headers.get("X-Nuevo-Token");
  if (renovado && obtenerToken()) guardarToken(renovado);

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    /* respuesta sin JSON */
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401 && ruta !== "/auth/ingresar") alExpirarSesion();
    // 500 sin mensaje de la API = el proxy de Vite no la alcanzó (está arrancando o apagada)
    if (respuesta.status === 502 || respuesta.status === 504 || (respuesta.status === 500 && !datos?.error)) {
      throw new Error("La API no responde. Verifica que esté encendida (npm run dev).");
    }
    const err = new Error(datos?.error || `Error ${respuesta.status}`);
    err.status = respuesta.status;
    err.datos = datos;
    throw err;
  }
  return datos;
}
