// Tiempo real: cada pantalla abierta (recepción, fisio, nutri, entrenador,
// alumno) queda escuchando /api/eventos. Cuando alguien guarda algo, el
// servidor avisa a todas y cada una se actualiza al instante.
const clientes = new Set();

export function abrirCanal(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Nginx: no retener los avisos
  });
  res.write("retry: 4000\n\n");
  const cliente = { res, usuario: req.usuario?.idusuario };
  clientes.add(cliente);
  const latido = setInterval(() => res.write(": latido\n\n"), 25000);
  req.on("close", () => {
    clearInterval(latido);
    clientes.delete(cliente);
  });
}

let pendientes = new Map();
let espera = null;
/** Se agrupan los avisos de un mismo instante (un guardado puede tocar varios registros). */
export function avisarCambio(modulo, origen = "") {
  pendientes.set(`${modulo}|${origen}`, { modulo, origen });
  if (espera) return;
  espera = setTimeout(() => {
    const lista = [...pendientes.values()];
    pendientes = new Map();
    espera = null;
    const texto = `event: cambio\ndata: ${JSON.stringify({ cambios: lista, hora: Date.now() })}\n\n`;
    for (const c of clientes) {
      try {
        c.res.write(texto);
      } catch {
        clientes.delete(c);
      }
    }
  }, 150);
}

export const conectados = () => clientes.size;
