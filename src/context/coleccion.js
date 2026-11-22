// Colecciones sincronizadas con MySQL (tabla registros_app)
// Cada cambio en la lista se envía solo a la API: lo nuevo o modificado
// con PUT y lo borrado con DELETE. Así no se pierde nada al cerrar el
// navegador y todos los equipos ven la misma información.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/cliente";
import { huella } from "../utils/huella";

export const avisar = (tipo, mensaje) => {
  try {
    window.dispatchEvent(new CustomEvent("radicalgym:aviso", { detail: { tipo, mensaje } }));
  } catch {
    /* sin ventana */
  }
};

export function useColeccion(modulo) {
  const [items, setItems] = useState([]);
  const sincronizados = useRef(new Map()); // id -> JSON guardado en la base
  const editable = useRef(false);
  const activa = useRef(false);
  const colas = useRef(new Map()); // id -> promesa del último guardado (uno tras otro)
  const pendientes = useRef(new Set()); // ids con un guardado en camino

  /** Carga la lista que llegó de la base (sin reenviarla). */
  const cargar = useCallback((lista, puedeEditar, opciones) => {
    const limpia = (lista || []).filter((x) => x && x.id != null);
    // Carga parcial: solo llegan los registros que cambiaron y los borrados
    if (opciones?.parcial) {
      editable.current = !!puedeEditar;
      activa.current = true;
      const quitar = new Set((opciones.borrados || []).map(String));
      if (!quitar.size && !limpia.length) return;
      setItems((prev) => {
        const lista2 = prev.filter((x) => !(x && quitar.has(String(x.id)) && !pendientes.current.has(String(x.id))));
        quitar.forEach((id) => !pendientes.current.has(id) && sincronizados.current.delete(id));
        const pos = new Map(lista2.map((x, i) => [String(x?.id), i]));
        limpia.forEach((x) => {
          const id = String(x.id);
          if (pendientes.current.has(id)) return; // lo que se está guardando aquí no se pisa
          sincronizados.current.set(id, JSON.stringify(x));
          if (pos.has(id)) lista2[pos.get(id)] = x;
          else {
            lista2.push(x);
            pos.set(id, lista2.length - 1);
          }
        });
        return lista2;
      });
      return;
    }
    // Lo que todavía se está guardando desde esta pantalla no se pisa con la recarga
    if (pendientes.current.size) {
      setItems((prev) => {
        const locales = new Map(prev.filter((x) => x && pendientes.current.has(String(x.id))).map((x) => [String(x.id), x]));
        const mezcla = limpia.map((x) => locales.get(String(x.id)) || x);
        locales.forEach((x, id) => !mezcla.some((y) => String(y.id) === id) && mezcla.unshift(x));
        sincronizados.current = new Map(mezcla.map((x) => [String(x.id), JSON.stringify(x)]));
        return mezcla;
      });
      editable.current = !!puedeEditar;
      activa.current = true;
      return;
    }
    sincronizados.current = new Map(limpia.map((x) => [String(x.id), JSON.stringify(x)]));
    editable.current = !!puedeEditar;
    activa.current = true;
    setItems(limpia);
  }, []);

  /** Al cerrar sesión: vacía la lista sin borrar nada en la base. */
  const reiniciar = useCallback(() => {
    activa.current = false;
    editable.current = false;
    sincronizados.current = new Map();
    setItems([]);
  }, []);

  // Si la base rechaza un cambio, la pantalla vuelve a mostrar lo guardado
  // (así nunca se ve un dato que en realidad no se grabó).
  const restaurar = (id, previo) =>
    setItems((prev) => {
      const sin = prev.filter((x) => String(x?.id) !== id);
      return previo === undefined ? sin : [JSON.parse(previo), ...sin];
    });

  useEffect(() => {
    if (!activa.current) return;
    if (!editable.current) {
      // Sin permiso de escritura: se descartan los cambios locales
      const guardado = [...sincronizados.current.values()];
      const actual = items.filter((x) => x && x.id != null).map((x) => JSON.stringify(x));
      const igual = guardado.length === actual.length && actual.every((j) => guardado.includes(j));
      if (!igual) {
        avisar("error", "No tienes permiso para modificar esta información.");
        setItems(guardado.map((j) => JSON.parse(j)));
      }
      return;
    }
    const actuales = new Map();
    items.forEach((x) => {
      if (x && x.id != null) actuales.set(String(x.id), x);
    });

    actuales.forEach((x, id) => {
      const json = JSON.stringify(x);
      const previo = sincronizados.current.get(id);
      if (previo === json) return;
      sincronizados.current.set(id, json);
      // Se envía la huella de lo que esta pantalla creía guardado: si otra
      // persona lo cambió mientras tanto, la API avisa (409) en vez de pisarlo.
      const huellaPrevia = previo === undefined ? null : huella(JSON.parse(previo));
      pendientes.current.add(id);
      const anterior = colas.current.get(id) || Promise.resolve();
      const envio = anterior
        .catch(() => {})
        .then(() => api(`/registros/${modulo}/${encodeURIComponent(id)}`, { method: "PUT", body: { datos: x, huellaPrevia } }))
        .catch((e) => {
          if (e.status === 409 && e.datos?.actual) {
            // Otra persona lo cambió: se muestra su versión y se avisa
            const actual = e.datos.actual;
            sincronizados.current.set(id, JSON.stringify(actual));
            setItems((prev) => prev.map((y) => (String(y?.id) === id ? actual : y)));
            avisar("error", `${e.datos.error || "Otra persona modificó este registro."} Se cargó su versión; vuelve a aplicar tu cambio si hace falta.`);
            return;
          }
          if (previo === undefined) sincronizados.current.delete(id);
          else sincronizados.current.set(id, previo);
          restaurar(id, previo);
          avisar("error", e.datos?.repetido ? e.message : `No se pudo guardar (${modulo}): ${e.message}`);
        })
        .finally(() => {
          if (colas.current.get(id) === envio) {
            colas.current.delete(id);
            pendientes.current.delete(id);
          }
        });
      colas.current.set(id, envio);
    });

    [...sincronizados.current.keys()].forEach((id) => {
      if (actuales.has(id)) return;
      const previo = sincronizados.current.get(id);
      sincronizados.current.delete(id);
      api(`/registros/${modulo}/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((e) => {
        sincronizados.current.set(id, previo);
        restaurar(id, previo);
        avisar("error", `No se pudo eliminar (${modulo}): ${e.message}`);
      });
    });
  }, [items, modulo]);

  return [items, setItems, cargar, reiniciar];
}
