import { CampoNumero } from "../common/CampoNumero";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CreditCard,
  Plus,
  Check,
  X,
  Edit3,
  Users,
  Sparkles,
  Dumbbell,
  Utensils,
  HeartPulse,
  LayoutGrid,
  Table2,
  TrendingUp,
  Snowflake,
  Archive,
  RotateCcw,
} from "lucide-react";
import { api } from "../../api/cliente";
import { useGym } from "../../context/GymContext";
import { userCan } from "../../config/roles";
import { PALETA, colorDePlan, esColorLibre } from "../../utils/colorPlan";
import { AlumnosPorPlan } from "./AlumnosPorPlan";
import { BotonColor } from "../common/SelectorColor";
import { Search } from "lucide-react";

// Cada plan tiene su color (lo elige administración); si no, el de su posición por precio

const soles = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const meses = (dias) => Math.max(1, Math.round(Number(dias || 30) / 30));
const duracionTexto = (dias) => {
  const d = Number(dias || 0);
  if (d < 28) return d === 1 ? "1 día" : `${d} días`;
  const m = Math.round(d / 30);
  return m === 1 ? "1 mes" : m === 12 ? "1 año" : `${m} meses`;
};

const VACIO = {
  name: "",
  durationDays: 30,
  price: "",
  description: "",
  includesTrainer: false,
  includesNutrition: false,
  includesPhysio: false,
  popular: false,
  color: "",
  featuresStr: "",
  freezeDays: 0,
  freezeParts: 1,
  freezeMinDays: 0,
};

// Beneficios frecuentes de un plan (se marcan con un toque; se pueden agregar otros)
const BENEFICIOS_BASE = [
  "Acceso ilimitado a sala de pesas",
  "Acceso a zona de cardio",
  "Clases grupales incluidas",
  "Evaluación física inicial",
  "Rutina personalizada",
  "Seguimiento de progreso mensual",
  "Asesoría de entrenador en sala",
  "Plan nutricional básico",
  "Consulta de nutrición",
  "Evaluación de fisioterapia",
  "Evaluación de composición corporal (bioimpedancia)",
  "Acceso a la app del alumno",
  "Casillero",
  "Toalla",
  "Duchas y vestidores",
  "Estacionamiento",
  "Wi-Fi",
  "Invitado gratis 1 vez al mes",
  "Congelamiento de membresía",
  "Descuento en suplementos de la tienda",
  "Horario libre (todo el día)",
  "Acceso a todas las sedes",
];

// Normaliza para buscar sin tildes ni mayúsculas
const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// ¿Coincide lo escrito? Primero por texto; si no, por letras en orden dentro de una palabra ("acs" → acceso)
const coincide = (b, q) => {
  const t = norm(b);
  if (t.split(/[^a-z0-9ñ]+/).some((w) => w.startsWith(q))) return 3;
  if (t.includes(q)) return 2;
  return t.split(/[^a-z0-9ñ]+/).some((w) => {
    let i = 0;
    for (const c of w) if (c === q[i]) i++;
    return i === q.length && w[0] === q[0];
  })
    ? 1
    : 0;
};

const SelectorBeneficios = ({ value = [], onChange, uso = {} }) => {
  const [busca, setBusca] = useState("");
  const [verTodos, setVerTodos] = useState(false);
  const q = norm(busca.trim());
  // Los más usados en los planes van primero
  const opciones = [...new Set([...Object.keys(uso), ...BENEFICIOS_BASE])]
    .filter((b) => !value.includes(b))
    .map((b) => ({ b, n: uso[b] || 0, m: q ? coincide(b, q) : 1 }))
    .filter((o) => o.m > 0)
    .sort((a, b) => b.m - a.m || b.n - a.n || a.b.localeCompare(b.b, "es"));
  const LIMITE = 12;
  const visibles = q || verTodos ? opciones : opciones.slice(0, LIMITE);
  const quitar = (b) => onChange(value.filter((x) => x !== b));
  const poner = (b) => {
    if (!value.includes(b)) onChange([...value, b]);
    setBusca("");
  };
  const alEnter = () => {
    const t = busca.trim();
    if (!t) return;
    const exacto = opciones.find((o) => norm(o.b) === q);
    poner(exacto ? exacto.b : opciones.length && q.length < 25 && opciones[0].m >= 2 ? opciones[0].b : t);
  };
  const nuevo = busca.trim() && (q.length >= 4 || !opciones.length) && !opciones.some((o) => norm(o.b) === q) && !value.some((v) => norm(v) === q);

  return (
    <div className="space-y-2">
      <span className="block text-sm font-bold text-slate-700">
        Beneficios <span className="font-normal text-slate-500">({value.length} elegidos)</span>
      </span>

      {/* Elegidos */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => quitar(b)}
              title="Quitar"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 border border-blue-600 text-white text-xs font-semibold cursor-pointer hover:bg-blue-700"
            >
              <Check className="w-3 h-3" /> {b} <X className="w-3 h-3 opacity-70" />
            </button>
          ))}
        </div>
      )}

      {/* Buscador con autocompletado */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), alEnter())}
          placeholder="Busca un beneficio: «acceso», «clases», «nutri»… (Enter para agregar)"
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {nuevo && (
          <button
            type="button"
            onClick={() => poner(busca.trim())}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-emerald-500 bg-emerald-50 text-emerald-700 text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Crear «{busca.trim()}»
          </button>
        )}
        {visibles.map(({ b, n }) => (
          <button
            key={b}
            type="button"
            onClick={() => poner(b)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border bg-white border-slate-300 text-slate-600 text-xs font-semibold cursor-pointer hover:border-blue-400 hover:text-blue-700"
          >
            <Plus className="w-3 h-3" /> {b}
            {n > 0 && <span className="ml-0.5 px-1 rounded bg-slate-100 text-slate-500 text-[10px] font-black" title={`Lo usan ${n} plan(es)`}>{n}</span>}
          </button>
        ))}
        {q && !visibles.length && !nuevo && <span className="text-xs text-slate-400">Ya está elegido.</span>}
      </div>
      {!q && opciones.length > LIMITE && (
        <button type="button" onClick={() => setVerTodos((v) => !v)} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
          {verTodos ? "Ver solo los más usados" : `Ver todos (${opciones.length})`}
        </button>
      )}
    </div>
  );
};

/** Texto de las reglas de congelamiento (igual que el servidor) */
export const textoCongelamiento = (p) => {
  const total = Number(p?.freezeDays || 0);
  const partes = Number(p?.freezeParts || 1);
  if (!total) return "Sin congelamiento";
  if (partes <= 1) return `Congelamiento único de ${total} días`;
  return `Congelamiento fraccionado: ${total} días en hasta ${partes} periodos (mínimo ${Number(p.freezeMinDays || 0) || Math.floor(total / partes)} días c/u)`;
};

/** Mismo control que el servidor, para avisar antes de guardar */
const errorCongelamiento = (f) => {
  const total = Number(f.freezeDays || 0);
  if (!total) return "";
  if (total < 0 || total > 365) return "Los días deben estar entre 0 y 365";
  const partes = Number(f.freezeParts || 1);
  if (partes === 1) return "";
  const min = Number(f.freezeMinDays || 0);
  if (min < 1) return "Indica el mínimo de días por congelamiento";
  if (min * partes > total) return `Con ${partes} periodos de mínimo ${min} días se necesitan ${min * partes} días`;
  return "";
};

export const MembershipsPlans = () => {
  const { plans, members, addPlan, updatePlan, deletePlan, reactivatePlan, currentUser } = useGym();
  const puedeEditar = userCan(currentUser, "memberships", "editar");
  const puedeCrear = userCan(currentUser, "memberships", "crear");
  const puedeEliminar = userCan(currentUser, "memberships", "eliminar");

  const [vista, setVista] = useState("tarjetas");
  const [planesVer, setPlanesVer] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [editando, setEditando] = useState(null); // null | "nuevo" | plan
  const [form, setForm] = useState(VACIO);

  const ordenados = useMemo(() => [...plans].sort((a, b) => a.price - b.price), [plans]);

  // Precio mensual de referencia: el plan de ~1 mes más barato
  const mensualRef = useMemo(() => {
    const m = ordenados.find((p) => p.durationDays >= 28 && p.durationDays <= 31);
    return m ? m.price : null;
  }, [ordenados]);

  const activosPorPlan = useMemo(() => {
    const c = {};
    members.forEach((m) => {
      if (m.status === "active" || m.status === "expiring_soon") c[m.planId] = (c[m.planId] || 0) + 1;
    });
    return c;
  }, [members]);
  const totalActivos = Object.values(activosPorPlan).reduce((a, b) => a + b, 0);
  const ingresoMensual = ordenados.reduce(
    (s, p) => s + (activosPorPlan[p.id] || 0) * (p.durationDays >= 28 ? p.price / meses(p.durationDays) : 0),
    0,
  );

  const abrirNuevo = () => {
    setForm(VACIO);
    setEditando("nuevo");
  };
  const abrirEditar = (p) => {
    setForm({ ...VACIO, ...p, featuresStr: (p.features || []).join("\n") });
    setEditando(p);
  };
  const guardar = async (e) => {
    e.preventDefault();
    const datos = {
      name: form.name.trim(),
      durationDays: Number(form.durationDays),
      durationMonths: Math.round(Number(form.durationDays) / 30),
      price: Number(form.price),
      description: form.description,
      includesTrainer: form.includesTrainer,
      includesNutrition: form.includesNutrition,
      includesPhysio: form.includesPhysio,
      popular: form.popular,
      color: form.color || "",
      features: form.featuresStr.split("\n").map((f) => f.trim()).filter(Boolean),
      freezeDays: Number(form.freezeDays || 0),
      freezeParts: Number(form.freezeDays || 0) ? Number(form.freezeParts || 1) : 1,
      freezeMinDays: Number(form.freezeDays || 0) ? (Number(form.freezeParts || 1) === 1 ? Number(form.freezeDays) : Number(form.freezeMinDays || 0)) : 0,
    };
    if (!datos.name || !datos.price || errorCongelamiento(form)) return;
    if (editando === "nuevo") await addPlan(datos);
    else await updatePlan(editando.id, datos);
    setEditando(null);
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  // Esc cierra el editor de plan; mientras está abierto, la página de atrás no se desplaza
  useEffect(() => {
    if (!editando) return;
    const tecla = (e) => e.key === "Escape" && setEditando(null);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [editando]);
  // Planes dados de baja (ej. de temporada): se guardan y se pueden reactivar
  const [baja, setBaja] = useState(null);
  const [archivados, setArchivados] = useState([]);
  const [verArchivados, setVerArchivados] = useState(false);
  const cargarArchivados = () =>
    puedeEditar &&
    api("/planes?todos=1")
      .then((l) => setArchivados(Array.isArray(l) ? l.filter((x) => x.archived) : []))
      .catch(() => {});
  useEffect(() => {
    cargarArchivados();
  }, [plans.length]);
  const confirmarBaja = async () => {
    const ok = await deletePlan(baja.id);
    setBaja(null);
    if (ok) cargarArchivados();
  };
  const reactivar = async (p) => {
    try {
      await reactivatePlan(p.id);
      cargarArchivados();
    } catch (e) {
      alert(e.message);
    }
  };

  const posForm = ordenados.filter((p) => p.id !== editando?.id && p.price < Number(form.price || 0)).length;
  const colorForm = colorDePlan(form, posForm);

  const Tarjeta = ({ p, i, preview = false }) => {
    const t = colorDePlan(p, i);
    const porMes = p.durationDays >= 28 ? p.price / meses(p.durationDays) : null;
    const ahorro =
      mensualRef && porMes && p.durationDays > 31 ? Math.round((1 - porMes / mensualRef) * 100) : null;
    const activos = activosPorPlan[p.id] || 0;
    const sel = seleccion === p.id;
    return (
      <div
        onClick={() => !preview && setSeleccion(sel ? null : p.id)}
        className={`relative bg-white rounded-xl border flex flex-col overflow-hidden transition-all duration-200 ${
          preview ? "" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
        } ${t.borde} ${p.popular ? "border-2 shadow-lg" : ""} ${sel ? "ring-4 ring-blue-200" : ""}`}
      >
        <div className={`relative bg-gradient-to-br ${t.acento} text-white px-4 pt-3 pb-4 h-[196px] flex flex-col`} style={t.estilo}>
          {/* fila fija para la etiqueta, así todas las cabeceras miden lo mismo */}
          <div className="h-6 flex items-center justify-between gap-2">
            {p.popular ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/20 rounded-md px-2 py-0.5">
                <Sparkles className="w-3 h-3" /> Más elegido
              </span>
            ) : (
              <span />
            )}
            {!preview && (puedeEditar || puedeEliminar) && (
              <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {puedeEditar && (
                  <button onClick={() => abrirEditar(p)} className="p-1.5 rounded-md bg-white/15 hover:bg-white/30 cursor-pointer" title="Editar">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {puedeEliminar && (
                  <button
                    onClick={() => setBaja(p)}
                    className="p-1.5 rounded-md bg-white/15 hover:bg-rose-500 cursor-pointer"
                    title="Dar de baja / eliminar"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <h3 className="text-lg font-extrabold leading-tight truncate mt-1" title={p.name}>{p.name || "Nombre del plan"}</h3>
          <p className="text-xs text-white/80">{duracionTexto(p.durationDays)} de acceso</p>
          <div className="mt-auto flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-3xl font-black tracking-tight">{soles(p.price)}</span>
            <span className="text-xs text-white/80">total</span>
          </div>
          {/* Debajo del precio del paquete: cuánto sale al mes y al día */}
          <div className="mt-1 h-[38px] leading-tight whitespace-nowrap">
            {porMes && p.durationDays > 31 && (
              <p className="text-sm font-bold text-white/90 flex items-center gap-1.5">
                {soles(porMes)} al mes
                {ahorro > 0 && <span className="bg-emerald-600 text-white rounded-md px-1.5 py-0.5 text-[10px] font-black leading-none">Ahorra {ahorro}%</span>}
              </p>
            )}
            {Number(p.durationDays) > 0 && <p className="text-xs font-semibold text-white/75">{soles(p.price / Number(p.durationDays))} al día</p>}
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-3">
          <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.7em]">{p.description || "\u00a0"}</p>
          <div className="flex flex-wrap gap-2">
            {[
              [p.includesTrainer, Dumbbell, "Entrenador"],
              [p.includesNutrition, Utensils, "Nutrición"],
              [p.includesPhysio, HeartPulse, "Fisioterapia"],
            ].map(([on, Icon, l]) => (
              <span
                key={l}
                className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1 border ${
                  on ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {l}
              </span>
            ))}
          </div>
          <div
            className={`flex items-start gap-2 text-xs font-bold rounded-xl px-3 py-2 border ${
              Number(p.freezeDays || 0) ? "bg-sky-50 text-sky-800 border-sky-200" : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
            <Snowflake className="w-4 h-4 shrink-0" /> {textoCongelamiento(p)}
          </div>
          <ul className="space-y-2 flex-1">
            {(p.features || []).map((f, k) => (
              <li key={k} className="flex gap-2 text-sm text-slate-700">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          {!preview && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Users className="w-4 h-4" /> Alumnos activos
                </span>
                <span className="font-black text-slate-900">{activos}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${t.acento}`}
                  style={{ ...t.estilo, width: `${totalActivos ? (activos / totalActivos) * 100 : 0}%` }}
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlanesVer([p.id]);
                  setVista("alumnos");
                }}
                className="mt-3 w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="w-4 h-4" /> Ver alumnos de este plan
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Encabezado */}
      <div className="rd-portada rd-cabecera">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-300 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" /> Membresías
            </span>
            <h1 className="text-2xl font-extrabold mt-1">Planes y tarifas</h1>
            <p className="text-sm text-slate-300">Precios, beneficios y ahorro de cada plan.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Planes", ordenados.length],
              ["Alumnos activos", totalActivos],
              ["Ingreso mensual aprox.", soles(ingresoMensual)],
            ].map(([t, v]) => (
              <div key={t} className="bg-white/10 rounded-2xl px-4 py-3">
                <span className="block text-xs text-slate-300">{t}</span>
                <span className="text-lg font-black">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-white/10">
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => setVista("tarjetas")}
              className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer ${vista === "tarjetas" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <LayoutGrid className="w-4 h-4" /> Tarjetas
            </button>
            <button
              onClick={() => setVista("comparar")}
              className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer ${vista === "comparar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Table2 className="w-4 h-4" /> Comparar
            </button>
            <button
              onClick={() => {
                setPlanesVer([]);
                setVista("alumnos");
              }}
              className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer ${vista === "alumnos" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Users className="w-4 h-4" /> Alumnos por plan
            </button>
          </div>
          {puedeCrear && (
            <button
              onClick={abrirNuevo}
              className="ml-auto px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nuevo plan
            </button>
          )}
        </div>
      </div>

      {ordenados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Aún no hay planes registrados.
        </div>
      ) : vista === "alumnos" ? (
        <AlumnosPorPlan key={planesVer.join(",")} planesIniciales={planesVer} />
      ) : vista === "tarjetas" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch">
          {ordenados.map((p, i) => (
            <Tarjeta key={p.id} p={p} i={i} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-4 text-slate-500 font-bold">Comparación</th>
                {ordenados.map((p) => (
                  <th key={p.id} className={`p-4 text-center ${p.popular ? "bg-blue-50 text-blue-900" : "text-slate-900"}`}>
                    <span className="block font-extrabold">{p.name}</span>
                    {p.popular && <span className="text-xs font-bold text-blue-600">Más elegido</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Precio total", (p) => <b>{soles(p.price)}</b>],
                ["Duración", (p) => duracionTexto(p.durationDays)],
                ["Precio por mes", (p) => (p.durationDays >= 28 ? soles(p.price / meses(p.durationDays)) : "—")],
                [
                  "Ahorro vs. mensual",
                  (p) => {
                    const pm = p.durationDays >= 28 ? p.price / meses(p.durationDays) : null;
                    const a = mensualRef && pm && p.durationDays > 31 ? Math.round((1 - pm / mensualRef) * 100) : null;
                    return a > 0 ? <span className="font-bold text-emerald-700">{a}%</span> : "—";
                  },
                ],
                ["Entrenador", (p) => (p.includesTrainer ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <X className="w-5 h-5 text-slate-300 mx-auto" />)],
                ["Nutrición", (p) => (p.includesNutrition ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <X className="w-5 h-5 text-slate-300 mx-auto" />)],
                ["Fisioterapia", (p) => (p.includesPhysio ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <X className="w-5 h-5 text-slate-300 mx-auto" />)],
                ["Congelamiento", (p) => (Number(p.freezeDays || 0) ? <span className="text-xs font-bold text-sky-700">{textoCongelamiento(p)}</span> : <span className="text-xs text-slate-400">No</span>)],
                ["Alumnos activos", (p) => activosPorPlan[p.id] || 0],
              ].map(([t, f]) => (
                <tr key={t} className="border-t border-slate-100">
                  <td className="p-4 font-semibold text-slate-700">{t}</td>
                  {ordenados.map((p) => (
                    <td key={p.id} className={`p-4 text-center ${p.popular ? "bg-blue-50/50" : ""}`}>
                      {f(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Planes dados de baja */}
      {puedeEditar && archivados.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <button onClick={() => setVerArchivados((v) => !v)} className="w-full flex items-center justify-between gap-2 cursor-pointer">
            <span className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <Archive className="w-4 h-4 text-slate-500" /> Planes dados de baja ({archivados.length})
            </span>
            <span className="text-xs font-bold text-blue-600">{verArchivados ? "Ocultar" : "Ver"}</span>
          </button>
          {verArchivados && (
            <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {archivados.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className={`w-2.5 h-10 rounded-full bg-gradient-to-b ${colorDePlan(p, 0).acento}`} style={colorDePlan(p, 0).estilo} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {soles(p.price)} · {duracionTexto(p.durationDays)}
                      {p.activeMembers > 0 && <b className="text-emerald-700"> · {p.activeMembers} alumno(s) aún lo usan</b>}
                    </p>
                  </div>
                  <button onClick={() => reactivar(p)} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer">
                    <RotateCcw className="w-3.5 h-3.5" /> Reactivar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {baja && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={() => setBaja(null)}>
          <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-3 rd-aparece">
            <p className="text-xs font-bold uppercase text-rose-600 flex items-center gap-1"><Archive className="w-3.5 h-3.5" /> Dar de baja el plan</p>
            <p className="text-lg font-black text-slate-900">{baja.name}</p>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>• Deja de aparecer para nuevas matrículas y renovaciones.</li>
              <li>
                • <b>{activosPorPlan[baja.id] || 0} alumno(s)</b> que ya lo compraron lo conservan: siguen marcando asistencia hasta que venza.
              </li>
              <li>• Queda guardado en «Planes dados de baja» y puedes <b>reactivarlo</b> cuando quieras (ideal para planes de temporada).</li>
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBaja(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
              <button onClick={confirmarBaja} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black cursor-pointer">Dar de baja</button>
            </div>
          </div>
        </div>
      )}

      {/* Crear / editar plan: pantalla completa con vista previa */}
      {editando && createPortal(
        <div className="fixed inset-0 z-[70] rd-velo">
<div className="rd-hoja overflow-y-auto overscroll-contain bg-slate-50">
          <div className="bg-slate-900 text-white px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-lg font-extrabold">{editando === "nuevo" ? "Nuevo plan" : `Editar: ${editando.name}`}</h2>
            <button onClick={() => setEditando(null)} className="p-2 rounded-lg hover:bg-white/10 cursor-pointer" title="Cerrar">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="max-w-6xl mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
            <form onSubmit={guardar} className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <label className="block">
                <span className="block text-sm font-bold text-slate-700 mb-1.5">Nombre del plan *</span>
                <input value={form.name} onChange={set("name")} required placeholder="Ej. Trimestral Pro" className="w-full p-3 rounded-xl border border-slate-300 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-bold text-slate-700 mb-1.5">Precio total (S/) *</span>
                  <CampoNumero type="number" min="1" step="0.5" value={form.price} onChange={set("price")} required className="w-full p-3 rounded-xl border border-slate-300 text-sm" />
                </label>
                <label className="block">
                  <span className="block text-sm font-bold text-slate-700 mb-1.5">Duración</span>
                  <select value={form.durationDays} onChange={set("durationDays")} className="w-full p-3 rounded-xl border border-slate-300 text-sm">
                    {[
                      [1, "1 día"],
                      [7, "1 semana"],
                      [15, "15 días"],
                      [30, "1 mes"],
                      [60, "2 meses"],
                      [90, "3 meses"],
                      [180, "6 meses"],
                      [360, "1 año"],
                    ].map(([d, l]) => (
                      <option key={d} value={d}>
                        {l}
                      </option>
                    ))}
                    {![1, 7, 15, 30, 60, 90, 180, 360].includes(Number(form.durationDays)) && (
                      <option value={form.durationDays}>{duracionTexto(form.durationDays)}</option>
                    )}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="block text-sm font-bold text-slate-700 mb-1.5">Descripción</span>
                <input value={form.description} onChange={set("description")} placeholder="Para quién es este plan" className="w-full p-3 rounded-xl border border-slate-300 text-sm" />
              </label>
              <SelectorBeneficios
                value={form.featuresStr.split("\n").map((f) => f.trim()).filter(Boolean)}
                onChange={(l) => setForm({ ...form, featuresStr: l.join("\n") })}
                uso={plans.flatMap((p) => p.features || []).reduce((m, b) => ((m[b] = (m[b] || 0) + 1), m), {})}
              />
              <fieldset className="rounded-xl border-2 border-sky-200 bg-sky-50/50 p-4 space-y-3">
                <legend className="px-1 text-sm font-extrabold text-sky-800 flex items-center gap-1.5">
                  <Snowflake className="w-4 h-4" /> Congelamiento
                </legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["no", "Sin congelamiento"],
                    ["uno", "Congelamiento único"],
                    ["partes", "Congelamiento fraccionado"],
                  ].map(([k, l]) => {
                    const modo = !Number(form.freezeDays || 0) ? "no" : Number(form.freezeParts || 1) > 1 ? "partes" : "uno";
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            freezeDays: k === "no" ? 0 : k === "partes" ? Math.max(Number(form.freezeDays || 0), 30) : Number(form.freezeDays || 0) || 15,
                            freezeParts: k === "partes" ? Math.max(2, Number(form.freezeParts || 2)) : 1,
                            freezeMinDays: k === "partes" ? Number(form.freezeMinDays || 0) || 15 : 0,
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                          modo === k ? "bg-sky-600 text-white border-sky-600" : "bg-white text-sky-800 border-sky-300 hover:bg-sky-100"
                        }`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
                {Number(form.freezeDays || 0) > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block">
                      <span className="block text-xs font-bold text-slate-700 mb-1">Total de días</span>
                      <CampoNumero type="number" min="1" max="365" value={form.freezeDays} onChange={set("freezeDays")} className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white" />
                    </label>
                    {Number(form.freezeParts || 1) > 1 && (
                      <>
                        <label className="block">
                          <span className="block text-xs font-bold text-slate-700 mb-1">Máx. de periodos</span>
                          <CampoNumero type="number" min="2" max="12" value={form.freezeParts} onChange={set("freezeParts")} className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white" />
                        </label>
                        <label className="block">
                          <span className="block text-xs font-bold text-slate-700 mb-1">Mínimo por parte</span>
                          <CampoNumero type="number" min="1" value={form.freezeMinDays} onChange={set("freezeMinDays")} className="w-full p-2.5 rounded-xl border border-slate-300 text-sm bg-white" />
                        </label>
                      </>
                    )}
                  </div>
                )}
                {errorCongelamiento(form) ? (
                  <p className="text-xs font-bold text-rose-600">{errorCongelamiento(form)}</p>
                ) : (
                  <p className="text-xs text-sky-900">
                    <b>{textoCongelamiento(form)}.</b>{" "}
                    {Number(form.freezeDays || 0) > 0 &&
                      "Se usa en un solo periodo continuo. Si el alumno retoma antes, los días no usados se pierden. El beneficio vence junto con la membresía."}
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Si cambias estas reglas, los alumnos que ya compraron el plan conservan las condiciones con las que lo compraron.
                </p>
              </fieldset>
              <div>
                <span className="block text-sm font-bold text-slate-700 mb-1.5">Color del plan</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PALETA).map(([k, c]) => (
                    <button
                      type="button"
                      key={k}
                      title={c.nombre}
                      onClick={() => setForm({ ...form, color: k })}
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${c.acento} cursor-pointer transition-transform hover:scale-110 ${
                        colorForm === c ? "ring-4 ring-offset-2 ring-slate-400 scale-110" : ""
                      }`}
                    />
                  ))}
                  {esColorLibre(form.color) && (
                    <span
                      title={`Color personalizado ${form.color.toUpperCase()}`}
                      className="rd-plan-libre w-9 h-9 rounded-full ring-4 ring-offset-2 ring-slate-400 scale-110"
                      style={colorDePlan({ color: form.color }).estilo}
                    />
                  )}
                  {/* El «+» siempre está: para probar otro color cuando quieras */}
                  <BotonColor
                    title="Elegir otro color"
                    valor={esColorLibre(form.color) ? form.color : "#0ea7b3"}
                    activo={false}
                    onCambiar={(c) => setForm((f) => ({ ...f, color: c }))}
                    className="relative w-9 h-9 rounded-full cursor-pointer flex items-center justify-center border-2 border-dashed border-slate-400 text-slate-500 hover:scale-110 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                  </BotonColor>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {esColorLibre(form.color)
                    ? "Color personalizado: se ajusta solo a pastel en modo claro y a neón suave en modo oscuro."
                    : form.color
                      ? `Elegido: ${PALETA[form.color]?.nombre}.`
                      : `Automático por precio (${colorForm.nombre}).`}{" "}
                  Toca «+» para elegir cualquier color. También se usa en los reportes del CRM.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ["includesTrainer", "Incluye entrenador"],
                  ["includesNutrition", "Incluye nutrición"],
                  ["includesPhysio", "Incluye fisioterapia"],
                  ["popular", "Marcar como más elegido"],
                ].map(([k, l]) => (
                  <label key={k} className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer text-sm font-semibold ${form[k] ? "border-blue-500 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-700"}`}>
                    <input type="checkbox" checked={!!form[k]} onChange={set(k)} className="w-4 h-4 accent-blue-600" />
                    {l}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditando(null)} className="px-5 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold cursor-pointer">
                  Guardar plan
                </button>
              </div>
            </form>
            <div className="lg:col-span-2">
              <span className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Vista previa</span>
              <Tarjeta
                preview
                i={posForm}
                p={{
                  ...form,
                  price: Number(form.price || 0),
                  durationDays: Number(form.durationDays),
                  features: form.featuresStr.split("\n").map((f) => f.trim()).filter(Boolean),
                }}
              />
            </div>
          </div>
        </div>
</div>,
        document.body,
      )}
    </div>
  );
};
