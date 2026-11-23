// Pruebas de la API: lectura por rol, escrituras, concurrencia y sincronización
// Uso: npm run pruebas   (solo con una base de PRUEBAS; ver pruebas/README.md)
import { BASE as base, USUARIOS, cerrarBase } from "./seguro.mjs";
const res={ok:0,fallos:[]};
const ok=(c,m)=>{ if(c) res.ok++; else res.fallos.push(m); };
const login=async(u,p)=>{const r=await fetch(base+"/auth/ingresar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario:u,clave:p})}); const j=await r.json(); if(!j.token) throw new Error(u+": "+JSON.stringify(j)); return j.token;};
const mk=(t)=>async(ruta,met="GET",body)=>{const r=await fetch(base+ruta,{method:met,headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined}); let d=null; try{d=await r.json()}catch{}; return {s:r.status,d};};
const T={};
for(const [u,p] of USUARIOS) T[u]=mk(await login(u,p));
// 1) Lecturas: ningún 500 para ningún rol
const GETS=["/alumnos","/planes","/entrenadores","/caja","/registros","/personal","/turnos-caja/actual","/turnos-caja","/usuarios","/tienda/productos","/tienda/ventas","/tienda/resumen","/reportes/deudas","/reportes/congelamientos","/reportes/alumnos","/reportes/matriculas","/reportes/ingresos","/reportes/asistencias","/reportes/integridad","/metas/metas","/metas/objetivos","/metas/logros","/metas/bonos","/metas/proyecciones","/configuracion","/alimentos","/alertas","/indicaciones/catalogo","/mensajes/plantillas","/prospectos","/prospectos/avisos","/prospectos/pases","/prospectos/reporte","/progreso/alumnos","/avisos","/auth/yo","/registros/sincronizacion","/respaldos"];
const lectura={};
for(const [u,api] of Object.entries(T)){ lectura[u]={}; for(const g of GETS){ const r=await api(g); lectura[u][g]=r.s; ok(r.s<500, `${u} GET ${g} -> ${r.s} ${JSON.stringify(r.d).slice(0,120)}`);} }
const A=T.admin, R=T.recepcion;
// 2) Recepción: abre caja, matricula, vende, marca asistencia, cierra caja
const planes=(await A("/planes")).d; const plan=planes[0];
let r=await R("/turnos-caja/actual"); if(!r.d?.open && !r.d?.abierto){ r=await R("/turnos-caja/abrir","POST",{montoApertura:100,observacion:"prueba"}); ok(r.s===200||r.s===201,"abrir caja "+r.s+" "+JSON.stringify(r.d).slice(0,200)); }
const dniBase=71000000+Math.floor(Date.now()/1000)%500*20;
// 10 matrículas en paralelo (códigos de alumno sin choque)
const altas=await Promise.all(Array.from({length:10},(_,i)=>R("/alumnos","POST",{dni:String(dniBase+i),fullName:`Prueba Paralela ${i}`,gender:"M",birthDate:"1995-05-05",phone:"+51987654"+String(100+i),planId:plan.id,planName:plan.name,membershipStartDate:new Date(Date.now()-5*3600e3).toISOString().slice(0,10),paymentMethod:"efectivo"})));
altas.forEach((a,i)=>ok(a.s===200||a.s===201,`alta paralela ${i} -> ${a.s} ${JSON.stringify(a.d).slice(0,200)}`));
const codigos=altas.map(a=>a.d?.code||a.d?.codigo||a.d?.codeLabel).filter(Boolean); ok(new Set(codigos).size===codigos.length,"códigos repetidos "+codigos.join(","));
// venta
const prods=(await R("/tienda/productos")).d; const p0=prods.find(p=>p.stock>2);
r=await R("/tienda/ventas","POST",{items:[{productId:p0.id,quantity:1}],paymentMethod:"efectivo"}); ok(r.s===200||r.s===201,"venta recepcion "+r.s+" "+JSON.stringify(r.d).slice(0,200));
const venta=r.d;
r=await R(`/tienda/ventas/${venta?.id}/anular`,"POST",{motivo:"prueba"}); ok(r.s===403,"recepcion no anula -> "+r.s);
r=await A(`/tienda/ventas/${venta?.id}/anular`,"POST",{motivo:"prueba admin"}); ok(r.s===200,"admin anula -> "+r.s+" "+JSON.stringify(r.d).slice(0,150));
const p1=(await R("/tienda/productos")).d.find(p=>p.id===p0.id); ok(p1.stock===p0.stock,`stock vuelve ${p0.stock}->${p1.stock}`);
// 8 ventas en paralelo: tickets correlativos sin choque
const vs=await Promise.all(Array.from({length:8},()=>R("/tienda/ventas","POST",{items:[{productId:p0.id,quantity:1}],paymentMethod:"efectivo"})));
vs.forEach((v,i)=>ok(v.s===201||v.s===200,`venta paralela ${i} -> ${v.s} ${JSON.stringify(v.d).slice(0,150)}`));
const tickets=vs.map(v=>v.d?.receiptNumber); ok(new Set(tickets).size===tickets.length,"tickets repetidos");
for(const v of vs) await A(`/tienda/ventas/${v.d.id}/anular`,"POST",{motivo:"prueba paralela"});
// asistencia vía registros
const al=altas[0].d; const asis={id:`att-prueba-${Date.now()}`,memberId:al.id,memberName:al.fullName,date:new Date(Date.now()-5*3600e3).toISOString().slice(0,10),time:"08:00",category:"student"};
r=await R(`/registros/asistencias/${asis.id}`,"PUT",{datos:asis}); ok(r.s===200,"asistencia "+r.s+" "+JSON.stringify(r.d).slice(0,200));
// 3) Concurrencia: dos pantallas editan la misma cita
const {huella}=await import("/home/claude/sis/servidor/huella.js");
const cita={id:"apt-prueba-conc",serviceType:"physiotherapy",memberId:al.id,memberName:al.fullName,date:"2099-01-01",timeSlot:"10:00 - 10:45",status:"por_atender",reason:"v1"};
r=await R(`/registros/citas/${cita.id}`,"PUT",{datos:cita}); ok(r.s===200,"cita v1 "+r.s);
const v2={...cita,reason:"v2 recepcion"}, v3={...cita,reason:"v3 admin"};
const [x,y]=await Promise.all([R(`/registros/citas/${cita.id}`,"PUT",{datos:v2,huellaPrevia:huella(cita)}),A(`/registros/citas/${cita.id}`,"PUT",{datos:v3,huellaPrevia:huella(cita)})]);
ok([x.s,y.s].sort().join()==="200,409",`concurrencia -> ${x.s},${y.s}`);
r=await R(`/registros/citas/${cita.id}`,"PUT",{datos:cita.reason?{...cita}:cita,huellaPrevia:huella(cita)}); // con huella vieja -> 409 o 200 si igual
// guardar lo mismo que hay no da conflicto
const actual=(await A("/registros")).d.citas.registros.find(c=>c.id===cita.id);
r=await A(`/registros/citas/${cita.id}`,"PUT",{datos:actual,huellaPrevia:huella(actual)}); ok(r.s===200,"sin falso conflicto -> "+r.s);
// 4) Sincronización parcial: borrar y ver el borrado
const hora=(await A("/registros")).d._hora;
await new Promise(z=>setTimeout(z,1500));
r=await A(`/registros/citas/${cita.id}`,"DELETE"); ok(r.s===200,"borrar cita "+r.s);
const parc=(await A(`/registros?desde=${encodeURIComponent(hora)}`)).d;
ok(parc.citas?.parcial && parc.citas.borrados.includes(cita.id),"parcial con borrado "+JSON.stringify(parc.citas).slice(0,200));
ok((parc.asistencias?.registros||[]).length<50,"parcial pequeña: asistencias "+(parc.asistencias?.registros||[]).length);
// 5) Permisos: el alumno no puede escribir; el entrenador no ve finanzas
r=await T["70900001"](`/registros/citas/x`,"PUT",{datos:{id:"x"}}); ok(r.s===403,"alumno no escribe -> "+r.s);
const cajaEnt=await T.entrenador("/caja"); ok(cajaEnt.s===403||(Array.isArray(cajaEnt.d)&&cajaEnt.d.length===0),"entrenador no ve caja");
ok(lectura["70900001"]["/usuarios"]===403,"alumno /usuarios -> "+lectura["70900001"]["/usuarios"]);
// 6) Avisos de citas para fisio
r=await R(`/registros/citas/apt-aviso`,"PUT",{datos:{id:"apt-aviso",serviceType:"physiotherapy",memberId:al.id,memberName:al.fullName,date:new Date(Date.now()-5*3600e3).toISOString().slice(0,10),timeSlot:"23:00 - 23:45",status:"por_atender",reason:"prueba aviso"}});
const av=(await T.fisioterapia("/avisos")).d.avisos; ok(av.some(a=>a.tipo==="cita"&&/Prueba Paralela 0/.test(a.titulo+a.mensaje)),"fisio recibe aviso de cita");
ok(!(await T.nutricion("/avisos")).d.avisos.some(a=>/apt-aviso/.test(a.id)||/prueba aviso/.test(a.mensaje||"")),"nutrición no ve cita de fisio");
const avAl=(await T["70900001"]("/avisos")).d.avisos; ok(Array.isArray(avAl),"avisos alumno");
await R(`/registros/citas/apt-aviso`,"DELETE");
// 7) Respaldo
r=await A("/respaldos","POST"); ok(r.s===200&&r.d.archivo,"respaldo "+r.s+" "+JSON.stringify(r.d).slice(0,160));
// 8) Login: intentos por equipo
for(let i=0;i<3;i++) await fetch(base+"/auth/ingresar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario:"nutricion",clave:"mala"})}).then(r=>r.json()).then(j=>{ if(i===2) ok(/Te quedan 2 intentos/.test(j.error),"mensaje intentos: "+j.error); });
await login("nutricion","Nutri2026!");
console.log(JSON.stringify({ok:res.ok,fallos:res.fallos},null,1));

await cerrarBase();
if (res.fallos.length) process.exitCode = 1;
