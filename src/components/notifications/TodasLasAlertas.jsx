import { TarjetaKpi } from "../common/TarjetaKpi";
// Pestaña "Todas": todas las alertas importantes en orden de prioridad,
// separadas en Clientes (membresías y deudas) y Productos (stock).
import React, { useMemo, useState } from "react";
import { AlertTriangle, Users, Package, MessageCircle, Search, BellRing, Siren } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { enlaceWhatsApp } from "../common/TelWhatsApp";
import { hoyISO } from "../../utils/fecha";
import { IconoEmoji, ConIconos } from "../common/IconoEmoji";

const PRIORIDAD = {
  critica: { orden: 0, etiqueta: "Urgente", chip: "bg-rose-100 text-rose-800 border-rose-300", barra: "bg-rose-500" },
  alta: { orden: 1, etiqueta: "Alta", chip: "bg-orange-100 text-orange-800 border-orange-300", barra: "bg-orange-500" },
  media: { orden: 2, etiqueta: "Media", chip: "bg-amber-100 text-amber-800 border-amber-300", barra: "bg-amber-400" },
};

const fechaCorta = (f) => {
  if (!f) return "—";
  const [a, m, d] = String(f).slice(0, 10).split("-");
  return d ? `${d}/${m}/${a}` : f;
};

const Fila = ({ a }) => {
  const p = PRIORIDAD[a.prioridad];
  return (
    <li className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white pl-4 pr-3 py-2.5 overflow-hidden">
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${p.barra}`} />
      <span className="text-lg shrink-0" aria-hidden><IconoEmoji e={a.emoji} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <b className="truncate text-sm text-slate-900"><ConIconos texto={a.titulo} /></b>
          {a.codigo && <span className="shrink-0 font-mono text-[11px] font-bold text-slate-500">{a.codigo}</span>}
        </div>
        <p className="truncate text-xs text-slate-600"><ConIconos texto={a.detalle} /></p>
      </div>
      <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold ${p.chip}`}>{p.etiqueta}</span>
      {a.telefono && (
        <a href={enlaceWhatsApp(a.telefono, a.mensaje)} target="_blank" rel="noreferrer" title="Escribir por WhatsApp"
          className="shrink-0 w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100">
          <MessageCircle className="w-4 h-4" />
        </a>
      )}
    </li>
  );
};

export const TodasLasAlertas = () => {
  const { members = [], lowStockProducts = [], gymConfig } = useGym();
  const [buscar, setBuscar] = useState("");
  const gym = gymConfig?.name || "el gimnasio";

  const { clientes, productos } = useMemo(() => {
    const hoy = new Date(hoyISO());
    const cl = [];
    members.forEach((m) => {
      if (m.status === "frozen") return;
      const fin = m.membershipEndDate ? new Date(m.membershipEndDate) : null;
      const dias = fin ? Math.ceil((fin - hoy) / 86400000) : null;
      const deuda = Number(m.debt) || 0;
      if (dias !== null && dias < 0 && dias >= -30) {
        cl.push({ id: `v-${m.id}`, emoji: "💔", prioridad: "critica", titulo: m.fullName, codigo: m.codeLabel, telefono: m.phone, peso: dias,
          detalle: `Membresía vencida hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"} · ${m.planName || "sin plan"}`,
          mensaje: `Hola ${m.fullName?.split(" ")[0] || ""}, tu plan en ${gym} venció el ${fechaCorta(m.membershipEndDate)}. ¡Te esperamos para renovar!` });
      } else if (dias !== null && dias >= 0 && dias <= 7) {
        cl.push({ id: `p-${m.id}`, emoji: "⏳", prioridad: dias <= 3 ? "alta" : "media", titulo: m.fullName, codigo: m.codeLabel, telefono: m.phone, peso: dias,
          detalle: dias === 0 ? `Vence hoy · ${m.planName || ""}` : `Vence en ${dias} día${dias === 1 ? "" : "s"} (${fechaCorta(m.membershipEndDate)}) · ${m.planName || ""}`,
          mensaje: `Hola ${m.fullName?.split(" ")[0] || ""}, tu plan en ${gym} vence el ${fechaCorta(m.membershipEndDate)}. ¿Te ayudamos a renovarlo?` });
      }
      if (deuda > 0) {
        cl.push({ id: `d-${m.id}`, emoji: "💳", prioridad: "alta", titulo: m.fullName, codigo: m.codeLabel, telefono: m.phone, peso: -deuda / 1000,
          detalle: `Debe S/ ${deuda.toFixed(2)}${m.debtDueDate ? ` · vence ${fechaCorta(m.debtDueDate)}` : ""}`,
          mensaje: `Hola ${m.fullName?.split(" ")[0] || ""}, te recordamos tu saldo pendiente de S/ ${deuda.toFixed(2)} en ${gym}.` });
      }
    });
    const pr = lowStockProducts.map((p) => {
      const agotado = Number(p.stock) <= 0;
      return { id: `s-${p.id}`, emoji: agotado ? "🚫" : "📦", prioridad: agotado ? "critica" : "alta", titulo: p.name, peso: Number(p.stock) || 0,
        detalle: agotado ? `Agotado · mínimo ${p.minStockAlert ?? 0} u.` : `Quedan ${p.stock} u. · mínimo ${p.minStockAlert ?? 0} u.${p.category ? ` · ${p.category}` : ""}` };
    });
    const ordenar = (l) => l.sort((a, b) => PRIORIDAD[a.prioridad].orden - PRIORIDAD[b.prioridad].orden || a.peso - b.peso);
    return { clientes: ordenar(cl), productos: ordenar(pr) };
  }, [members, lowStockProducts, gym]);

  const q = buscar.trim().toLowerCase();
  const filtrar = (l) => (q ? l.filter((a) => `${a.titulo} ${a.codigo || ""} ${a.detalle}`.toLowerCase().includes(q)) : l);
  const urgentes = [...clientes, ...productos].filter((a) => a.prioridad === "critica").length;
  const cuenta = (l, p) => l.filter((a) => a.prioridad === p).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          [BellRing, "Alertas en total", clientes.length + productos.length, "Todo lo que hay por atender", "text-cyan-600", "from-cyan-500 to-teal-600", clientes.length + productos.length],
          [Siren, "Urgentes", urgentes, "Vencidos y productos agotados", "text-rose-600", "from-rose-500 to-red-600", clientes.length + productos.length],
          [Users, "Clientes por atender", clientes.length, "Membresías por vencer, vencidas y deudas", "text-blue-600", "from-blue-500 to-indigo-600", clientes.length + productos.length],
          [Package, "Productos por reponer", productos.length, "Stock bajo el mínimo o agotado", "text-orange-600", "from-orange-500 to-amber-500", clientes.length + productos.length],
        ].map(([Icono, t, v, d, color, grad, total]) => (
          <TarjetaKpi
            key={t}
            titulo={t}
            valor={v}
            sub={d}
            icono={Icono}
            tono={{ "text-cyan-600": "teal", "text-rose-600": "rojo", "text-blue-600": "azul", "text-orange-600": "ambar" }[color]}
            progreso={total ? (v / total) * 100 : 0}
            pulso={t === "Urgentes" && v > 0}
          />
        ))}
      </div>

      {/* Barra por prioridad */}
      {clientes.length + productos.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
            <span>Por prioridad</span>
            <span>
              <IconoEmoji e="🔴" /> {cuenta([...clientes, ...productos], "critica")} urgentes · <IconoEmoji e="🟠" /> {cuenta([...clientes, ...productos], "alta")} altas · <IconoEmoji e="🟡" /> {cuenta([...clientes, ...productos], "media")} medias
            </span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
            {[["critica", "bg-rose-500"], ["alta", "bg-orange-500"], ["media", "bg-amber-400"]].map(([p, c]) => {
              const n = cuenta([...clientes, ...productos], p);
              return n ? <div key={p} className={c} style={{ width: `${(n / (clientes.length + productos.length)) * 100}%` }} title={`${n} ${PRIORIDAD[p].etiqueta}`} /> : null;
            })}
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar alumno, código o producto…"
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
          <header className="flex items-center justify-between gap-2 mb-3">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-blue-800">
              <Users className="w-4 h-4" /> Clientes ({clientes.length})
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              {cuenta(clientes, "critica")} urgentes · {cuenta(clientes, "alta")} altas · {cuenta(clientes, "media")} medias
            </span>
          </header>
          {filtrar(clientes).length ? (
            <ul className="space-y-2 max-h-[560px] overflow-y-auto pr-1">{filtrar(clientes).map((a) => <Fila key={a.id} a={a} />)}</ul>
          ) : (
            <p className="text-sm text-slate-500 py-6 text-center">Sin alertas de clientes.</p>
          )}
        </section>

        <section className="rounded-2xl border border-orange-200 bg-orange-50/40 p-4">
          <header className="flex items-center justify-between gap-2 mb-3">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-orange-800">
              <Package className="w-4 h-4" /> Productos y stock ({productos.length})
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              {cuenta(productos, "critica")} agotados · {cuenta(productos, "alta")} por reponer
            </span>
          </header>
          {filtrar(productos).length ? (
            <ul className="space-y-2 max-h-[560px] overflow-y-auto pr-1">{filtrar(productos).map((a) => <Fila key={a.id} a={a} />)}</ul>
          ) : (
            <p className="text-sm text-slate-500 py-6 text-center">✓ Todo el stock está por encima de su mínimo.</p>
          )}
        </section>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <AlertTriangle className="w-3.5 h-3.5" /> Orden: primero lo urgente (vencidos y agotados), luego deudas y lo que vence en 3 días o menos, y al final lo que vence en la semana.
      </p>
    </div>
  );
};
