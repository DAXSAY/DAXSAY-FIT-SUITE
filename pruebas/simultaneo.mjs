// Prueba de varias personas usando el sistema a la vez (contenedor de pruebas)
// Uso: npm run pruebas   (solo con una base de PRUEBAS; ver pruebas/README.md)
import { huella } from "../src/utils/huella.js";
import { BASE as base, valor, sql as consulta, cerrarBase } from "./seguro.mjs";
const sql = async (q) => valor(q);
const login = async (u, p) => (await (await fetch(base + "/auth/ingresar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario: u, clave: p }) })).json()).token;
const hacer = (t) => async (x, m = "GET", b) => {
  const r = await fetch(base + x, { method: m, headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { s: r.status, d };
};
const res = []; const ok = (c, m) => { res.push((c ? "OK   " : "FALLA ") + m); };
const A = hacer(await login("admin", "Radical2026!"));
const R = hacer(await login("recepcion", "Recep2026!"));
const F = hacer(await login("fisioterapia", "Fisio2026!"));
const N = hacer(await login("nutricion", "Nutri2026!"));

// 0) cajas abiertas (para poder vender)
for (const X of [A, R]) { const c = await X("/turnos-caja/actual"); if (!c.d?.open && !c.d?.abierto && !c.d?.id) await X("/turnos-caja/abrir", "POST", { montoApertura: 50, observacion: "prueba simultánea" }); }

// Datos de la base de pruebas: dos productos, el fisioterapeuta y la nutricionista
const productos = (await A("/tienda/productos")).d;
const P1 = String(productos[0].id), P2 = String(productos[1].id);
const personal = (await A("/personal")).d;
const FISIO = personal.find((x) => x.cargo === "fisioterapeuta");
const NUTRI = personal.find((x) => x.cargo === "nutricionista");

// 1) Última unidad: dos cajeros venden el mismo producto al mismo tiempo
const stockP2 = await sql(`select stock from productos where idproducto=${P2}`);
await sql(`update productos set stock=1 where idproducto=${P2}`);
const v = await Promise.all([A("/tienda/ventas", "POST", { items: [{ productId: P2, quantity: 1 }], paymentMethod: "efectivo" }), R("/tienda/ventas", "POST", { items: [{ productId: P2, quantity: 1 }], paymentMethod: "efectivo" })]);
const vOk = v.filter((x) => x.s < 300).length;
ok(vOk === 1 && await sql(`select stock from productos where idproducto=${P2}`) === "0", `última unidad: ${vOk} venta aceptada, la otra: ${v.find((x) => x.s >= 300)?.d?.error || "-"} · stock final ${await sql(`select stock from productos where idproducto=${P2}`)}`);
for (const x of v) if (x.s < 300) await A(`/tienda/ventas/${x.d.id}/anular`, "POST", { motivo: "prueba simultánea" });
await sql(`update productos set stock=${Number(stockP2)} where idproducto=${P2}`);

// 2) Dos personas agendan al mismo especialista a la misma hora
const alumnos = (await A("/alumnos")).d.filter((x) => x.status === "active" || x.membershipStatus === "active");
const m1 = alumnos[0], m2 = alumnos[1];
const man = new Date(Date.now() + 86400e3 * 3).toISOString().slice(0, 10);
let dobles = 0;
for (let i = 0; i < 6; i++) {
  const h = 8 + i, ini = `${String(h).padStart(2, "0")}:00`, fin = `${String(h).padStart(2, "0")}:30`;
  const cita = (m, k) => ({ id: `cita-sim-${i}-${k}-${Date.now()}`, memberId: m.id, memberName: m.fullName, serviceType: "physiotherapy", staffId: FISIO.id, staffName: FISIO.fullName, date: man, timeSlot: `${ini} - ${fin}`, durationMinutes: 30, status: "scheduled", reason: "prueba simultánea" });
  const c1 = cita(m1, "a"), c2 = cita(m2, "b");
  const r = await Promise.all([A(`/registros/citas/${c1.id}`, "PUT", { datos: c1 }), R(`/registros/citas/${c2.id}`, "PUT", { datos: c2 })]);
  const buenas = r.filter((x) => x.s < 300).length;
  if (buenas !== 1) dobles++;
  res.push(`     cita ${ini}: aceptadas ${buenas} · ${r.map((x) => x.s + " " + (x.d?.error || "")).join(" | ")}`);
}
const enTabla = await sql(`select count(*) from citas where fecha='${man}' and idempleado=${FISIO.id}`);
ok(dobles === 0, `citas al mismo tiempo: ${6 - dobles}/6 horarios con una sola cita aceptada (en tabla: ${enTabla})`);

// 3) Dos recepciones marcan la asistencia del mismo alumno al mismo tiempo
const hoy = new Date().toISOString().slice(0, 10);
const asis = (k) => ({ id: `att-sim-${k}-${Date.now()}`, userId: m1.id, userName: m1.fullName, userRole: "student", category: "student", type: "in", status: "authorized", checkInMethod: "dni", date: hoy, time: "07:00 a. m.", notes: "prueba simultánea" });
const antes = await sql(`select count(*) from registros_app where modulo='asistencias' and datos like '%"userId":"${m1.id}"%' and datos like '%${hoy}%'`);
const ra = await Promise.all([A(`/registros/asistencias/x1`.replace("x1", (globalThis.a1 = asis("a")).id), "PUT", { datos: globalThis.a1 }), R(`/registros/asistencias/${(globalThis.a2 = asis("b")).id}`, "PUT", { datos: globalThis.a2 })]);
const despues = await sql(`select count(*) from registros_app where modulo='asistencias' and datos like '%"userId":"${m1.id}"%' and datos like '%${hoy}%'`);
const guardadas = await sql("select count(*) from registros_app where idregistro like 'att-sim-%'");
ok(guardadas === "1", `asistencia doble del mismo alumno: quedaron ${guardadas} registros`);
res.push(`     respuestas al marcar dos veces: se guardaron ${Number(despues) - Number(antes)} (${ra.map((x) => x.s + " " + (x.d?.error || "")).join(" | ")})`);

// 4) Dos personas editan el mismo registro: no se pisa
const base1 = { id: `cita-edit-${Date.now()}`, memberId: m1.id, memberName: m1.fullName, serviceType: "nutrition", staffId: NUTRI.id, staffName: NUTRI.fullName, date: man, timeSlot: "15:00 - 15:30", durationMinutes: 30, status: "scheduled", reason: "versión 1" };
await A(`/registros/citas/${base1.id}`, "PUT", { datos: base1 });
const h1 = huella(base1);
const e1 = await N(`/registros/citas/${base1.id}`, "PUT", { datos: { ...base1, reason: "versión de nutrición" }, huellaPrevia: h1 });
const e2 = await R(`/registros/citas/${base1.id}`, "PUT", { datos: { ...base1, reason: "versión de recepción" }, huellaPrevia: h1 });
ok(e1.s === 200 && e2.s === 409 && e2.d?.actual?.reason === "versión de nutrición", `edición cruzada: 1ª ${e1.s}, 2ª ${e2.s} «${e2.d?.error}» → se conserva «${e2.d?.actual?.reason}»`);

// 5) La misma recepcionista abre caja dos veces al mismo tiempo (dos ventanas)
const F2 = hacer(await login("recepcion", "Recep2026!"));
const act = await R("/turnos-caja/actual"); res.push('     caja actual: '+JSON.stringify(act.d).slice(0,80));
const idc = act.d?.open?.id || act.d?.id; if (idc) await R(`/turnos-caja/${idc}/cerrar`, "POST", { efectivoContado: 0, observacion: "prueba simultánea" });
const cajas = await Promise.all([R("/turnos-caja/abrir", "POST", { montoApertura: 0 }), F2("/turnos-caja/abrir", "POST", { montoApertura: 0 })]);
const abiertas = await sql("select count(*) from turnos_caja where estado='abierto'");
ok(abiertas === "1", `caja abierta dos veces a la vez: ${cajas.map((x) => x.s).join(" / ")} · cajas abiertas ${abiertas}`);

// 6) Carga: 6 personas usando a la vez (240 consultas en paralelo)
const usuarios = [A, R, F, N, F2, A];
const rutas = ["/alumnos", "/registros", "/reportes/ingresos", "/tienda/productos", "/prospectos", "/metas/metas", "/turnos-caja", "/avisos"];
const t0 = Date.now(); const tiempos = [];
const todas = await Promise.all(Array.from({ length: 240 }, async (_, i) => { const t = Date.now(); const r = await usuarios[i % 6](rutas[i % rutas.length]); tiempos.push(Date.now() - t); return r.s; }));
tiempos.sort((a, b) => a - b);
const err5 = todas.filter((s) => s >= 500).length;
ok(err5 === 0, `carga 240 consultas simultáneas: ${Date.now() - t0} ms en total · mitad en ${tiempos[120]} ms · 95% en ${tiempos[228]} ms · errores ${err5}`);

// 7) 20 ventas a la vez de varios cajeros (cola de ventas)
const st0 = Number(await sql(`select stock from productos where idproducto=${P1}`));
const vs = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? A : R)("/tienda/ventas", "POST", { items: [{ productId: P1, quantity: 1 }], paymentMethod: "efectivo" })));
const st1 = Number(await sql(`select stock from productos where idproducto=${P1}`));
const buenas = vs.filter((x) => x.s < 300);
ok(buenas.length === 20 && st0 - st1 === 20, `20 ventas simultáneas: ${buenas.length} ok · stock ${st0}→${st1}`);
for (const x of buenas) await A(`/tienda/ventas/${x.d.id}/anular`, "POST", { motivo: "prueba simultánea" });
ok(Number(await sql(`select stock from productos where idproducto=${P1}`)) === st0, "al anularlas el stock vuelve: " + await sql(`select stock from productos where idproducto=${P1}`));

// limpieza de pruebas
await sql("delete from citas where motivo like 'prueba simult%' or motivo like 'versi%'");
await sql("delete from registros_app where idregistro like 'cita-sim-%' or idregistro like 'cita-edit-%' or idregistro like 'att-sim-%'");
console.log(res.join("\n"));
await cerrarBase();
if (res.some((x) => x.startsWith("FALLA"))) process.exitCode = 1;
