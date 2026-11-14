// =====================================================================
// Cinta de avisos en la barra superior: los avisos pasan de derecha a
// izquierda sin parar, para que recepción los vea de reojo.
//   rojo/naranja = CRM (a quién llamar, quién viene con pase, quién no vino)
//   verde        = avisos del gimnasio (vencidos, deudas, poco stock)
// Si hay contactos del CRM sin atender, cada 5 minutos la cinta destella
// y muestra un recordatorio, hasta que se atiendan.
// Tocar un aviso abre su panel (CRM o alertas).
// =====================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Users } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { useAvisosCrm } from "../crm/CrmAvisos";

const ACCION = { llamada: "Llamar a", whatsapp: "Escribir a", visita: "Recibe a" };
const primer = (n) => String(n || "").trim().split(/\s+/).slice(0, 2).join(" ");
const CINCO_MIN = 5 * 60 * 1000;

export const CintaAvisos = ({ fila = false, verCrm = true, verGym = true }) => {
  const d = useAvisosCrm();
  const { renewalAlerts = [], lowStockProducts = [] } = useGym();
  const [destello, setDestello] = useState(false);

  const items = useMemo(() => {
    const l = [];
    if (verCrm) {
      d.ahora.forEach((p) =>
        l.push({ k: `a${p.id}`, tipo: "crm", fuerte: true, texto: `⏰ ${p.contactTime || "Ahora"} · ${ACCION[p.contactType] || "Contactar a"} ${primer(p.fullName)}${p.passCode ? ` · pase ${p.passCode}` : ""}` }),
      );
      d.noVinieron.forEach((p) => l.push({ k: `n${p.id}`, tipo: "crm", texto: `❗ ${primer(p.fullName)} no vino con su pase · reprogramar` }));
      d.hoy
        .filter((p) => !p.reminderSeen && p.status !== "matriculado" && !d.ahora.some((x) => x.id === p.id))
        .forEach((p) => l.push({ k: `h${p.id}`, tipo: "crm", texto: `📅 ${p.contactTime || "Hoy"} · ${primer(p.fullName)}${p.passCode ? ` · pase libre` : ""}` }));
    }
    if (verGym) {
      [...renewalAlerts]
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 8)
        .forEach((a) =>
          l.push({
            k: `r${a.memberId}`,
            tipo: "gym",
            texto: a.daysLeft < 0 ? `🔁 ${primer(a.memberName)} venció hace ${Math.abs(a.daysLeft)}d · renovar` : a.daysLeft === 0 ? `⏳ ${primer(a.memberName)} vence hoy` : `⏳ ${primer(a.memberName)} vence en ${a.daysLeft}d`,
          }),
        );
      lowStockProducts.slice(0, 4).forEach((p) => l.push({ k: `s${p.id}`, tipo: "gym", texto: `📦 Poco stock: ${p.name} (quedan ${p.stock})` }));
    }
    return l;
  }, [d, renewalAlerts, lowStockProducts, verCrm, verGym]);

  // Recordatorio cada 5 minutos mientras haya contactos del CRM sin atender
  const pendientes = verCrm ? d.ahora.length : 0;
  useEffect(() => {
    if (!pendientes) return;
    const destellar = () => {
      setDestello(true);
      setTimeout(() => setDestello(false), 8000);
    };
    destellar();
    const id = setInterval(destellar, CINCO_MIN);
    return () => clearInterval(id);
  }, [pendientes]);

  const crm = items.filter((x) => x.tipo === "crm");
  const gym = items.filter((x) => x.tipo === "gym");
  if (!items.length) {
    return (
      <div className={`${fila ? "hidden" : "hidden lg:flex"} flex-1 min-w-0 items-center justify-center text-xs font-semibold text-slate-400`}>
        ✓ Sin avisos pendientes
      </div>
    );
  }
  const abrir = (tipo) => window.dispatchEvent(new Event(tipo === "crm" ? "radical:crm-panel" : "radical:alertas-panel"));

  return (
    <div
      className={`${fila ? "flex lg:hidden w-full basis-full order-last" : "hidden lg:flex flex-1 min-w-[12rem]"} items-center gap-1.5 rounded-xl pl-1.5 pr-1 py-0.5 transition-all ${
        destello ? "rd-destello ring-2 ring-rose-500 rd-cinta-fondo-alerta" : "rd-cinta-fondo"
      }`}
    >
      {/* Campana que "suena" (sin texto) */}
      <span
        title={destello ? "Hay contactos del CRM pendientes" : "Avisos del CRM"}
        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${destello ? "bg-rose-600 text-white" : "rd-cinta-etiqueta"}`}
      >
        <BellRing className={`w-4 h-4 rd-campana ${destello ? "rd-campana-fuerte" : ""}`} />
      </span>

      {verCrm && (
        <Carril
          titulo="CRM"
          icono={<Users className="w-3 h-3" />}
          tono="crm"
          items={crm}
          vacio="Sin contactos pendientes"
          onAbrir={() => abrir("crm")}
        />
      )}
      {verCrm && verGym && <span className="w-px self-stretch my-1 rd-cinta-divisor shrink-0" />}
      {verGym && (
        <Carril
          titulo="Gym"
          icono={<BellRing className="w-3 h-3" />}
          tono="gym"
          items={gym}
          vacio="Sin alertas del gimnasio"
          onAbrir={() => abrir("gym")}
        />
      )}
    </div>
  );
};

// Un carril de la cinta: avanza solo, se pausa al pasar el mouse y se puede
// arrastrar a izquierda o derecha para volver a leer un aviso. Al soltar,
// sigue avanzando a los 2 segundos.
const VELOCIDAD = 22; // píxeles por segundo
const Carril = ({ titulo, icono, tono, items, vacio, onAbrir }) => {
  const caja = useRef(null);
  const estado = useRef({ pausa: false, arrastre: null, movio: false, retomar: 0, pos: 0 });

  useEffect(() => {
    const el = caja.current;
    if (!el || !items.length) return;
    let previo = performance.now();
    let id;
    const paso = (t) => {
      const dt = (t - previo) / 1000;
      previo = t;
      const st = estado.current;
      const mitad = el.scrollWidth / 2;
      // La posición se lleva con decimales (scrollLeft redondea y se quedaba quieto)
      if (!st.pausa && !st.arrastre && Date.now() > st.retomar && mitad > 0) {
        st.pos += VELOCIDAD * Math.min(dt, 0.1);
        if (st.pos >= mitad) st.pos -= mitad;
        el.scrollLeft = st.pos;
      } else {
        st.pos = el.scrollLeft;
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [items.length]);

  const envolver = (el) => {
    const mitad = el.scrollWidth / 2;
    if (el.scrollLeft < 1) el.scrollLeft += mitad;
    else if (el.scrollLeft >= mitad) el.scrollLeft -= mitad;
    estado.current.pos = el.scrollLeft;
  };
  const alBajar = (e) => {
    const el = caja.current;
    estado.current.arrastre = { x: e.clientX, inicio: el.scrollLeft };
    estado.current.movio = false;
  };
  const alMover = (e) => {
    const st = estado.current;
    if (!st.arrastre) return;
    const dx = e.clientX - st.arrastre.x;
    if (Math.abs(dx) > 4 && !st.movio) {
      st.movio = true;
      caja.current.setPointerCapture?.(e.pointerId);
    }
    if (st.movio) {
      caja.current.scrollLeft = st.arrastre.inicio - dx;
      envolver(caja.current);
      st.arrastre = { x: e.clientX, inicio: caja.current.scrollLeft };
    }
  };
  const alSoltar = () => {
    const st = estado.current;
    st.arrastre = null;
    st.retomar = Date.now() + 1200;
    setTimeout(() => (st.movio = false), 50);
  };
  const alRueda = (e) => {
    const el = caja.current;
    el.scrollLeft += e.deltaY || e.deltaX;
    envolver(el);
    estado.current.retomar = Date.now() + 2000;
  };

  const chip = (it, copia) => (
    <button
      key={`${copia}${it.k}`}
      type="button"
      onClick={() => {
        if (estado.current.movio) return; // fue un arrastre, no un clic
        onAbrir();
      }}
      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap cursor-pointer ${
        it.fuerte ? "bg-gradient-to-r from-rose-600 to-orange-500 text-white" : tono === "crm" ? "rd-chip-crm" : "rd-chip-gym"
      }`}
    >
      {it.texto}
    </button>
  );

  return (
    <div className="flex-1 min-w-0 flex items-center gap-1.5" title={`Avisos de ${titulo}`}>
      {items.length ? (
        <div
          ref={caja}
          onMouseLeave={() => {
            if (estado.current.arrastre) alSoltar();
          }}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onWheel={alRueda}
          className="flex-1 min-w-0 overflow-hidden rd-cinta-mascara select-none cursor-grab active:cursor-grabbing"
          style={{ touchAction: "pan-y" }}
        >
          <div className="inline-flex gap-1.5 py-0.5">
            {items.map((it) => chip(it, "a"))}
            <span className="w-6 shrink-0" />
            {items.map((it) => chip(it, "b"))}
            <span className="w-6 shrink-0" />
          </div>
        </div>
      ) : (
        <span className="flex-1 min-w-0 truncate text-[11px] font-semibold text-slate-400">✓ {vacio}</span>
      )}
    </div>
  );
};
