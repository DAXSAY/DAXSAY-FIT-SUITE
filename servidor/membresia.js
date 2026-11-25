// ¿El alumno tiene membresía vigente hoy? Rutina, alimentación, fisioterapia y
// medidas son privilegios del alumno matriculado: si su membresía venció, el
// portal le muestra «Membresía caducada · Renovar» y el servidor no entrega esos datos.
import { consultar } from "./db.js";

// Módulos del portal que solo ve un alumno con membresía vigente
export const SOLO_VIGENTES = ["rutinas", "asignaciones_rutina", "planes_nutricion", "evaluaciones_corporales", "fisioterapia"];

/** { vigente, fin } · congelar alarga el fin, así que un alumno congelado sigue vigente */
export async function membresiaVigente(idalumno) {
  const [f] = await consultar(
    `SELECT DATE_FORMAT(MAX(fecha_fin), '%Y-%m-%d') AS fin, MAX(fecha_fin) >= CURDATE() AS vigente
       FROM matriculas WHERE idalumno = ? AND estado <> 'anulada'`,
    [idalumno],
  );
  return { vigente: !!Number(f?.vigente), fin: f?.fin || null };
}
