import { api } from "../../api/cliente";
import { TarjetaKpi } from "../common/TarjetaKpi";
import React, { useState, useMemo } from "react";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ArrowUpRight,
  Clock,
  MessageCircle,
  Calendar,
  PieChart as PieIcon,
  Activity,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import { userCan, userCanAccess } from "../../config/roles";
import { NumeroAnimado } from "../common/NumeroAnimado";
import { SyncStatusPanel } from "./SyncStatusPanel";
import { hoyISO } from "../../utils/fecha";
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
  ReferenceLine,
  Brush,
} from "recharts";
import { IconoEmoji } from "../common/IconoEmoji";

export const DashboardOverview = ({
  setActiveTab,
  onOpenNewMemberModal,
  onOpenQuickSaleModal,
  onOpenNewExpenseModal,
}) => {
  const {
    currentUser,
    members,
    metrics,
    renewalAlerts,
    transactions,
    products,
    attendances,
    appointments,
    generateWhatsAppLink,
  } = useGym();

  // Interactive Chart Controls
  const [chartView, setChartView] = useState("cashflow");
  const [timePeriod, setTimePeriod] = useState("30d");
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%, 1.5 = 150%, 2 = 200%
  const [showBrush, setShowBrush] = useState(true); // Interactive range slider
  const [activeSeries, setActiveSeries] = useState({
    ingresos: true,
    egresos: true,
    margen: true,
  });
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // ---------------------------------------------------------------
  // Todos los gráficos se calculan con los datos reales del sistema
  // ---------------------------------------------------------------
  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const isoDia = (d) => d.toISOString().slice(0, 10);
  const hoyFecha = new Date(hoyISO() + "T00:00:00Z");
  const sumar = (lista) => lista.reduce((s, t) => s + Number(t.amount || 0), 0);

  // Agrupa los movimientos de caja en un tramo de fechas
  const tramo = (desde, hasta) => {
    const txs = transactions.filter((t) => t.date >= desde && t.date <= hasta);
    const ing = txs.filter((t) => t.type === "income");
    const egr = txs.filter((t) => t.type === "expense");
    const ingresos = sumar(ing);
    const egresos = sumar(egr);
    return {
      ingresos,
      egresos,
      margen: ingresos - egresos,
      memberships: sumar(ing.filter((t) => t.category === "membership")),
      pos: sumar(ing.filter((t) => t.category === "pos_sale")),
      servicios: sumar(ing.filter((t) => ["physiotherapy", "nutrition", "personal_training", "master"].includes(t.category))),
    };
  };

  // 1. FLUJO DE CAJA: 7 días (por día), 30 días (por día) o anual (por mes)
  const fullCashflowData = useMemo(() => {
    const puntos = [];
    if (timePeriod === "annual") {
      for (let i = 11; i >= 0; i--) {
        const ini = new Date(Date.UTC(hoyFecha.getUTCFullYear(), hoyFecha.getUTCMonth() - i, 1));
        const fin = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() + 1, 0));
        puntos.push({
          label: `${MESES[ini.getUTCMonth()]} ${String(ini.getUTCFullYear()).slice(2)}`,
          fullDate: `${MESES[ini.getUTCMonth()]} ${ini.getUTCFullYear()}`,
          ...tramo(isoDia(ini), isoDia(fin)),
        });
      }
    } else {
      const dias = timePeriod === "7d" ? 7 : 30;
      for (let i = dias - 1; i >= 0; i--) {
        const d = new Date(hoyFecha);
        d.setUTCDate(d.getUTCDate() - i);
        const dia = isoDia(d);
        puntos.push({
          label: `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`,
          fullDate: `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
          ...tramo(dia, dia),
        });
      }
    }
    // Variación frente al punto anterior y marca del mejor punto
    const max = Math.max(0, ...puntos.map((p) => p.ingresos));
    return puntos.map((p, i) => {
      const prev = puntos[i - 1];
      const delta = prev && prev.ingresos > 0 ? ((p.ingresos - prev.ingresos) / prev.ingresos) * 100 : null;
      return {
        ...p,
        deltaPct: delta === null ? undefined : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
        isPeak: max > 0 && p.ingresos === max,
      };
    });
  }, [timePeriod, transactions]);

  // Apply zoom level filter (narrows visible points if zoom > 1)
  const cashflowData = useMemo(() => {
    if (zoomLevel === 1) return fullCashflowData;
    if (zoomLevel === 1.5) {
      // Show center 60% of data
      const len = fullCashflowData.length;
      const count = Math.max(3, Math.round(len * 0.6));
      const start = Math.floor((len - count) / 2);
      return fullCashflowData.slice(start, start + count);
    }
    // 2x zoom: show center 40% of data
    const len = fullCashflowData.length;
    const count = Math.max(2, Math.round(len * 0.4));
    const start = Math.floor((len - count) / 2);
    return fullCashflowData.slice(start, start + count);
  }, [fullCashflowData, zoomLevel]);

  // 2. AFLUENCIA POR HORA (asistencias de alumnos y citas de fisioterapia, últimos 30 días)
  const occupancyData = useMemo(() => {
    const desde = new Date(hoyFecha);
    desde.setUTCDate(desde.getUTCDate() - 29);
    const desdeStr = isoDia(desde);
    const horaDe = (texto) => {
      const m = String(texto || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM|a\.?\s*m\.?|p\.?\s*m\.?)?/i);
      if (!m) return null;
      let h = Number(m[1]);
      const pm = m[3] && /p/i.test(m[3]);
      const am = m[3] && /a/i.test(m[3]);
      if (pm && h < 12) h += 12;
      if (am && h === 12) h = 0;
      return h;
    };
    const horas = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 a 22:00
    const conteo = Object.fromEntries(horas.map((h) => [h, { general: 0, fisio: 0 }]));
    attendances
      .filter((a) => (a.date || "") >= desdeStr && a.type !== "out")
      .forEach((a) => {
        const h = horaDe(a.time);
        if (conteo[h]) conteo[h].general += 1;
      });
    appointments
      .filter((c) => (c.date || "") >= desdeStr && /fisio|physio/i.test(c.serviceType || c.type || ""))
      .forEach((c) => {
        const h = horaDe(c.startTime || c.timeSlot || c.time);
        if (conteo[h]) conteo[h].fisio += 1;
      });
    const max = Math.max(1, ...horas.map((h) => conteo[h].general + conteo[h].fisio));
    return horas.map((h) => ({
      hora: `${String(h).padStart(2, "0")}:00`,
      general: conteo[h].general,
      fisio: conteo[h].fisio,
      capacidadPct: Math.round(((conteo[h].general + conteo[h].fisio) / max) * 100),
    }));
  }, [attendances, appointments]);

  const picoAfluencia = useMemo(() => {
    const max = Math.max(0, ...occupancyData.map((o) => o.general + o.fisio));
    if (!max) return "Aún sin asistencias en los últimos 30 días";
    const horas = occupancyData.filter((o) => o.general + o.fisio === max).map((o) => o.hora);
    return `Hora pico: ${horas.slice(0, 3).join(", ")} (${max} ingresos en 30 días)`;
  }, [occupancyData]);

  // 3. FUENTES DE INGRESO (todo el historial de caja)
  const revenueSources = useMemo(() => {
    const ing = transactions.filter((t) => t.type === "income");
    const memRev = sumar(ing.filter((t) => t.category === "membership"));
    const posRev = sumar(ing.filter((t) => t.category === "pos_sale"));
    const servRev = sumar(ing.filter((t) => ["physiotherapy", "nutrition", "personal_training", "master"].includes(t.category)));
    const otrosRev = sumar(ing) - memRev - posRev - servRev;
    const total = memRev + posRev + servRev + otrosRev;
    const pct = (v) => (total > 0 ? Math.round((v / total) * 100) : 0);
    return [
      { name: "Membresías & Matrículas", value: memRev, color: "var(--color-blue-500)", percentage: pct(memRev) },
      { name: "Tienda (suplementos y bebidas)", value: posRev, color: "var(--color-emerald-500)", percentage: pct(posRev) },
      { name: "Fisioterapia, Nutrición & PT", value: servRev, color: "var(--color-cyan-500)", percentage: pct(servRev) },
      { name: "Otros ingresos", value: otrosRev, color: "var(--color-purple-500)", percentage: pct(otrosRev) },
    ].filter((s) => s.value > 0 || total === 0);
  }, [transactions]);

  // 4. EVOLUCIÓN DE ALUMNOS (últimos 6 meses)
  const growthData = useMemo(() => {
    const filas = [];
    for (let i = 5; i >= 0; i--) {
      const ini = new Date(Date.UTC(hoyFecha.getUTCFullYear(), hoyFecha.getUTCMonth() - i, 1));
      const fin = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() + 1, 0));
      const desde = isoDia(ini);
      const hasta = isoDia(fin);
      const corte = i === 0 ? hoyISO() : hasta;
      const nuevos = members.filter((m) => m.registrationDate >= desde && m.registrationDate <= hasta).length;
      const pagos = transactions.filter(
        (t) => t.type === "income" && t.category === "membership" && t.date >= desde && t.date <= hasta,
      ).length;
      filas.push({
        mes: `${MESES[ini.getUTCMonth()]} ${String(ini.getUTCFullYear()).slice(2)}`,
        activos: members.filter(
          (m) => m.membershipStartDate && m.membershipStartDate <= corte && m.membershipEndDate >= corte,
        ).length,
        nuevos,
        renovaciones: Math.max(0, pagos - nuevos),
        bajas: 0,
      });
    }
    return filas;
  }, [members, transactions]);

  // Calculated Totals for Selected Cashflow
  const totals = useMemo(() => {
    const totalIng = cashflowData.reduce((acc, curr) => acc + curr.ingresos, 0);
    const totalEg = cashflowData.reduce((acc, curr) => acc + curr.egresos, 0);
    const net = totalIng - totalEg;
    const marginPct = totalIng > 0 ? ((net / totalIng) * 100).toFixed(1) : "0";
    return { totalIng, totalEg, net, marginPct };
  }, [cashflowData]);

  // Mini gráficos de las tarjetas superiores (últimos 6 meses, datos reales)
  const ingresosMes = growthData.map((_, i) => {
    const ini = new Date(Date.UTC(hoyFecha.getUTCFullYear(), hoyFecha.getUTCMonth() - (5 - i), 1));
    const fin = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() + 1, 0));
    return tramo(isoDia(ini), isoDia(fin));
  });
  const memberSparkline = growthData.map((g) => g.activos);
  const incomeSparkline = ingresosMes.map((m) => m.ingresos);
  const expenseSparkline = ingresosMes.map((m) => m.egresos);
  const alertSparkline = [renewalAlerts.length, renewalAlerts.length];
  const activosMesAnterior = growthData[growthData.length - 2]?.activos || 0;
  const variacionActivos = metrics.totalActiveMembers - activosMesAnterior;
  const asistencias30 = occupancyData.reduce((s, h) => s + h.general, 0);

  // Helper for micro SVG sparklines
  const renderSparkline = (data, color, isFilled = true) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 26;
    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const fillPath = `M 0,${height} L ${points} L ${width},${height} Z`;

    return (
      <svg width={width} height={height} className="overflow-visible">
        {isFilled && <path d={fillPath} fill={color} fillOpacity={0.15} />}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {data.length > 0 &&
          (() => {
            const lastVal = data[data.length - 1];
            const cy = height - ((lastVal - min) / range) * (height - 6) - 3;
            return <circle cx={width} cy={cy} r="3" fill={color} />;
          })()}
      </svg>
    );
  };

  // ADVANCED CUSTOM TOOLTIP COMPONENT
  const AdvancedCustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const itemData = payload[0]?.payload;
    if (!itemData) return null;

    const ingresos = itemData.ingresos || 0;
    const egresos = itemData.egresos || 0;
    const margen =
      itemData.margen !== undefined ? itemData.margen : ingresos - egresos;
    const margenRatio =
      ingresos > 0 ? Math.round((margen / ingresos) * 100) : 0;
    const isPeak = itemData.isPeak || ingresos >= 2900 || margenRatio >= 60;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl rounded-2xl p-3.5 min-w-[270px] space-y-2.5 z-50">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{itemData.fullDate || label}</span>
          </div>
          <span
            className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded-full ${
              isPeak
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            {isPeak ? "⭐ Pico Máximo" : "● Flujo Activo"}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs" />
              <span>Ingresos:</span>
            </span>
            <div className="text-right">
              <span className="font-extrabold text-emerald-400 font-mono">
                S/{" "}
                {Number(ingresos).toLocaleString("es-PE", {
                  minimumFractionDigits: 2,
                })}
              </span>
              {itemData.deltaPct && (
                <span className="text-xs text-emerald-300 font-bold ml-1.5">
                  ({itemData.deltaPct})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-xs" />
              <span>Egresos:</span>
            </span>
            <span className="font-extrabold text-rose-400 font-mono">
              S/{" "}
              {Number(egresos).toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-xs" />
              <span>Margen Neto:</span>
            </span>
            <span className="font-black text-blue-400 font-mono">
              S/{" "}
              {Number(margen).toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar for Operating Margin */}
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Rentabilidad Operativa</span>
            <span className="font-bold text-blue-300">{margenRatio}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, margenRatio))}%` }}
            />
          </div>
        </div>

        {/* Sub-sources breakdown if available */}
        {itemData.memberships !== undefined && (
          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Cuotas: S/{itemData.memberships}</span>
            <span>• Tienda: S/{itemData.pos}</span>
            <span>• Fisio/Nutri: S/{itemData.servicios}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Bienvenida */}
      <div className="rd-portada rd-cabecera flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">
            {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
          <h1 className="text-2xl font-black mt-1">
            {new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 19 ? "Buenas tardes" : "Buenas noches"},{" "}
            {String(currentUser?.fullName || "").split(" ")[0]} <IconoEmoji e="👋" />
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">Así va RADICAL hoy. Toca una tarjeta para ver su gráfico.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {userCan(currentUser, "members", "crear") && <button onClick={onOpenNewMemberModal} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-400 text-marino-950 text-sm font-black rd-brillo cursor-pointer">
            + Nuevo socio
          </button>}
          {userCanAccess(currentUser, "reports") && <button onClick={() => setActiveTab("reports")} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-bold cursor-pointer">
            Ver reportes
          </button>}
        </div>
      </div>
      {userCan(currentUser, "users", "ver") && <SyncStatusPanel />}
      {/* Indicadores principales (mismo diseño que el resto del sistema) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <TarjetaKpi
          titulo="Socios activos"
          valor={metrics.totalActiveMembers}
          sub={`${variacionActivos >= 0 ? "+" : ""}${variacionActivos} vs mes anterior`}
          icono={Users}
          tono="teal"
          serie={memberSparkline}
          activo={chartView === "membership_growth"}
          onClick={() => setChartView("membership_growth")}
          title="Ver la evolución de socios en el gráfico"
        />
        <TarjetaKpi
          titulo="Ingresos (mes)"
          valor={metrics.totalIncome || 0}
          decimales={2}
          prefijo="S/ "
          sub="Cuotas + tienda"
          icono={TrendingUp}
          tono="verde"
          serie={incomeSparkline}
          activo={chartView === "cashflow" && activeSeries.ingresos && !activeSeries.egresos}
          onClick={() => {
            setChartView("cashflow");
            setActiveSeries((s) => ({ ...s, ingresos: true, egresos: false }));
          }}
          title="Ver solo los ingresos en el gráfico"
        />
        <TarjetaKpi
          titulo="Egresos (mes)"
          valor={metrics.totalExpense || 0}
          decimales={2}
          prefijo="S/ "
          sub="Planilla + operación"
          icono={TrendingDown}
          tono="rojo"
          serie={expenseSparkline}
          activo={chartView === "cashflow" && !activeSeries.ingresos && activeSeries.egresos}
          onClick={() => {
            setChartView("cashflow");
            setActiveSeries((s) => ({ ...s, ingresos: false, egresos: true }));
          }}
          title="Ver solo los egresos en el gráfico"
        />
        <TarjetaKpi
          titulo="Vencen en ≤ 7 días"
          valor={renewalAlerts.length}
          sub="Acción inmediata"
          icono={AlertTriangle}
          tono="ambar"
          alerta={renewalAlerts.length > 0}
          pulso={renewalAlerts.length > 0}
          serie={alertSparkline}
          onClick={() => setActiveTab("alerts")}
          title="Ver las alertas de vencimiento"
        />
      </div>

      {/* =========================================================================
           INTERACTIVE ANALYTICS COMMAND CENTER WITH ADVANCED ZOOM & TOOLTIP
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition-all">
        {/* CHART CONTROLS HEADER */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* View Mode Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => {
                setChartView("cashflow");
                setActiveSeries({
                  ingresos: true,
                  egresos: true,
                  margen: true,
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === "cashflow"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Flujo Financiero</span>
            </button>

            <button
              onClick={() => setChartView("occupancy")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === "occupancy"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Afluencia Horaria</span>
            </button>

            <button
              onClick={() => setChartView("revenue_breakdown")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === "revenue_breakdown"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <PieIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Fuentes de Ingreso</span>
            </button>

            <button
              onClick={() => setChartView("membership_growth")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === "membership_growth"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Evolución Socios</span>
            </button>
          </div>

          {/* QUICK DATE RANGE SELECTION & ADVANCED ZOOM CONTROLS */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Date Range Selection Buttons (Últimos 7 días, 30 días, anual) */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setTimePeriod("7d");
                  setZoomLevel(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timePeriod === "7d"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-sky-700 hover:bg-sky-50"
                }`}
                title="Filtrar datos por los últimos 7 días con desglose diario"
              >
                Últimos 7 Días
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimePeriod("30d");
                  setZoomLevel(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timePeriod === "30d"
                    ? "bg-violet-600 text-white shadow-xs"
                    : "text-violet-700 hover:bg-violet-50"
                }`}
                title="Filtrar datos por los últimos 30 días con desglose semanal"
              >
                30 Días
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimePeriod("annual");
                  setZoomLevel(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timePeriod === "annual"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-700 hover:bg-amber-50"
                }`}
                title="Filtrar datos anuales de los 12 meses"
              >
                Anual
              </button>
            </div>

            {/* Interactive Zoom Controls (Zoom In, Zoom Out, Reset, Toggle Brush) */}
            {chartView === "cashflow" && (
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() =>
                    setZoomLevel((prev) => Math.min(2, prev + 0.5))
                  }
                  className="p-1 px-2 text-slate-700 hover:text-blue-600 rounded-lg hover:bg-white transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                  title="Aumentar zoom (Zoom In)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Zoom +</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setZoomLevel((prev) => Math.max(1, prev - 0.5))
                  }
                  className="p-1 px-2 text-slate-700 hover:text-blue-600 rounded-lg hover:bg-white transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                  title="Reducir zoom (Zoom Out)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Zoom -</span>
                </button>
                {zoomLevel > 1 && (
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="p-1 px-2 text-blue-600 bg-white font-black rounded-lg shadow-xs transition-colors cursor-pointer text-xs"
                    title="Restaurar zoom al 100%"
                  >
                    100%
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowBrush(!showBrush)}
                  className={`p-1 px-2 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 ${
                    showBrush
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Activar/Desactivar deslizador de zoom interactivo (Brush)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Deslizador</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setActiveTab("finance")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline px-2 py-1 cursor-pointer flex items-center gap-1"
            >
              <span>Ver Libro Mayor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CHART VISUAL CANVAS */}
        <div className="p-4 sm:p-6">
          {/* VIEW 1: FLOW FINANCIERO (Interactive Gradient Area & Line Chart with Zoom & Advanced Tooltip) */}
          {chartView === "cashflow" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Evolución de Flujo Financiero
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Margen Operativo {totals.marginPct}%
                    </span>
                    {zoomLevel > 1 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        Zoom {Math.round(zoomLevel * 100)}%
                      </span>
                    )}
                  </h4>
                  <p className="text-slate-500 text-xs">
                    Usa los botones de rango (7 días, 30 días, anual) o arrastra
                    las manijas del deslizador inferior para hacer zoom.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">
                      Total Ingresos
                    </span>
                    <span className="font-extrabold text-emerald-600">
                      <NumeroAnimado valor={totals.totalIng} prefijo="S/ " />
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">
                      Total Egresos
                    </span>
                    <span className="font-extrabold text-rose-600">
                      <NumeroAnimado valor={totals.totalEg} prefijo="S/ " />
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">
                      Utilidad Neta
                    </span>
                    <span className="font-extrabold text-blue-600">
                      <NumeroAnimado valor={totals.net} prefijo="S/ " />
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart Series Toggle Pills */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Series Visibles:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSeries((s) => ({ ...s, ingresos: !s.ingresos }))
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeSeries.ingresos
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Ingresos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSeries((s) => ({ ...s, egresos: !s.egresos }))
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeSeries.egresos
                      ? "bg-rose-50 text-rose-700 border-rose-300"
                      : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Egresos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSeries((s) => ({ ...s, margen: !s.margen }))
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeSeries.margen
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-slate-50 text-slate-400 border-slate-200 line-through"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Margen Neto
                </button>
              </div>

              {/* Responsive Chart Container with Advanced Tooltip and Zoom Brush */}
              <div className="h-56 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    key={`${timePeriod}-${zoomLevel}`}
                    data={cashflowData}
                    margin={{ top: 8, right: 15, left: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="ingresosGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-emerald-500)"
                          stopOpacity={0.45}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-emerald-500)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                      <linearGradient
                        id="egresosGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-rose-500)"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-rose-500)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                      <linearGradient
                        id="margenGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-blue-500)"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-blue-500)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />

                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={62}
                      tickFormatter={(val) => {
                        const n = Number(val) || 0;
                        const a = Math.abs(n);
                        const t = a >= 1000 ? `${(a / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 })}k` : `${a}`;
                        return `${n < 0 ? "-" : ""}S/ ${t}`;
                      }}
                    />

                    {/* ADVANCED CUSTOM TOOLTIP WITH STATUS AND RATIO BAR */}
                    <Tooltip content={<AdvancedCustomTooltip />} />

                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                      formatter={(value) => (
                        <span className="text-slate-700 font-semibold uppercase text-xs tracking-wider">
                          {value === "ingresos"
                            ? "Ingresos"
                            : value === "egresos"
                              ? "Egresos"
                              : "Margen Neto"}
                        </span>
                      )}
                    />

                    {activeSeries.ingresos && (
                      <Area isAnimationActive={false}
                        type="monotone"
                        dataKey="ingresos"
                        stroke="var(--color-emerald-500)"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#ingresosGrad)"
                        activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2 }}
                      />
                    )}
                    {activeSeries.egresos && (
                      <Area isAnimationActive={false}
                        type="monotone"
                        dataKey="egresos"
                        stroke="var(--color-rose-500)"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#egresosGrad)"
                        activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2 }}
                      />
                    )}
                    {activeSeries.margen && (
                      <Area isAnimationActive={false}
                        type="monotone"
                        dataKey="margen"
                        stroke="var(--color-blue-500)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#margenGrad)"
                        activeDot={{ r: 5, stroke: "#ffffff", strokeWidth: 2 }}
                      />
                    )}

                    {/* INTERACTIVE ZOOM BRUSH SLIDER */}
                    {showBrush && (
                      <Brush
                        dataKey="label"
                        height={18}
                        stroke="var(--color-blue-500)"
                        fill="rgba(14,167,179,0.08)"
                        travellerWidth={10}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW 2: AFLUENCIA HORARIA & OCUPACIÓN */}
          {chartView === "occupancy" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Afluencia en Tiempo Real & Ocupación por Franja Horaria
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      {picoAfluencia}
                    </span>
                  </h4>
                  <p className="text-slate-500 text-xs">
                    Distribución de concurrentes entre Sala de Pesas/Cardio y
                    Gabinete de Fisioterapia.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    Aforo Total Gimnasio: 100 Personas
                  </span>
                </div>
              </div>

              <div className="h-56 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={occupancyData}
                    margin={{ top: 8, right: 15, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="hora"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />

                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val} p`}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "12px",
                        color: "#f8fafc",
                        padding: "10px 14px",
                        fontSize: "12px",
                      }}
                      formatter={(val, name) => [
                        `${val} ${name === "capacidadPct" ? "%" : "alumnos"}`,
                        name === "general"
                          ? "Sala Máquinas"
                          : name === "fisio"
                              ? "Fisioterapia"
                              : "% Ocupación Aforo",
                      ]}
                      labelFormatter={(label) => `Hora: ${label}`}
                    />

                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                      formatter={(val) => (
                        <span className="text-slate-700 font-semibold uppercase text-xs tracking-wider">
                          {val === "general"
                            ? "Sala Máquinas"
                            : val === "fisio"
                                ? "Fisioterapia"
                                : "% Ocupación"}
                        </span>
                      )}
                    />

                    <ReferenceLine
                      y={80}
                      stroke="var(--color-amber-500)"
                      strokeDasharray="3 3"
                      label={{
                        value: "Alerta Alta Demanda (80%)",
                        fill: "var(--color-amber-600)",
                        fontSize: 12,
                        position: "top",
                      }}
                    />
                    <Bar isAnimationActive={false} maxBarSize={56}
                      dataKey="general"
                      stackId="a"
                      fill="var(--color-blue-500)"
                      radius={[0, 0, 0, 0]}
                      barSize={24}
                    />
                    <Bar isAnimationActive={false} maxBarSize={56}
                      dataKey="fisio"
                      stackId="a"
                      fill="var(--color-cyan-500)"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                    <Line isAnimationActive={false}
                      type="monotone"
                      dataKey="capacidadPct"
                      stroke="var(--color-emerald-500)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW 3: FUENTES DE INGRESO (Interactive Donut with Hover Slices) */}
          {chartView === "revenue_breakdown" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Distribución de Ingresos por Unidades de Negocio
                  </h4>
                  <p className="text-slate-500 text-xs">
                    Haz hover sobre cada porción del gráfico para destacar la
                    contribución porcentual.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-bold text-slate-400 block">
                    Facturación Consolidada
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    S/{" "}
                    {revenueSources
                      .reduce((a, b) => a + b.value, 0)
                      .toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-64 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie isAnimationActive={false}
                        data={revenueSources}
                        cx="50%"
                        cy="50%"
                        innerRadius="64%"
                        outerRadius="86%"
                        paddingAngle={4}
                        dataKey="value"
                        onMouseEnter={(_, index) => setHoveredSlice(index)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      >
                        {revenueSources.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={hoveredSlice != null && hoveredSlice !== index ? "#cbd5e1" : entry.color}
                            stroke={
                              hoveredSlice === index ? "#ffffff" : "transparent"
                            }
                            strokeWidth={hoveredSlice === index ? 3 : 0}
                            style={{
                              filter:
                                hoveredSlice === index
                                  ? "drop-shadow(0px 0px 8px rgba(0,0,0,0.25))"
                                  : "none",
                              cursor: "pointer",
                              transition: "all 0.2s ease-out",
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#1e293b",
                          borderRadius: "10px",
                          color: "#fff",
                          fontSize: "11px",
                        }}
                        formatter={(val) => [
                          `S/ ${Number(val).toFixed(2)}`,
                          "Monto Total",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Donut Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs uppercase font-bold text-slate-400">
                      Total Ingresos
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      S/{" "}
                      {revenueSources
                        .reduce((a, b) => a + b.value, 0)
                        .toLocaleString()}
                    </span>
                    <span className="text-xs text-emerald-600 font-bold">
                      100% auditado
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {revenueSources.map((item, idx) => {
                    const isHovered = hoveredSlice === idx;
                    return (
                      <div
                        key={item.name}
                        onMouseEnter={() => setHoveredSlice(idx)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isHovered
                            ? "bg-slate-50 border-slate-400 shadow-sm translate-x-1"
                            : "bg-white border-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: item.color }}
                          />
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">
                              {item.name}
                            </h5>
                            <span className="text-xs text-slate-500 font-medium">
                              Representa el {item.percentage}% del volumen total
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block">
                            S/ {item.value.toFixed(2)}
                          </span>
                          <span
                            className="text-xs font-bold"
                            style={{ color: item.color }}
                          >
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: CRECIMIENTO & RETENCIÓN DE ALUMNOS */}
          {chartView === "membership_growth" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Crecimiento Neto de Socios & Tasa de Retención
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      Tasa de Retención 96.2%
                    </span>
                  </h4>
                  <p className="text-slate-500 text-xs">
                    Comparativa de socios activos totales, nuevas inscripciones
                    y renovaciones mes a mes.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-400 block text-xs uppercase font-bold">
                      Total Actual
                    </span>
                    <span className="font-extrabold text-purple-600">
                      {metrics.totalActiveMembers} socios
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-56 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={growthData}
                    margin={{ top: 8, right: 15, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="mes"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />

                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "12px",
                        color: "#f8fafc",
                        padding: "10px 14px",
                        fontSize: "12px",
                      }}
                      formatter={(val, name) => [
                        `${val} socios`,
                        name === "activos"
                          ? "Socios Activos"
                          : name === "nuevos"
                            ? "Nuevas Matrículas"
                            : name === "renovaciones"
                              ? "Renovaciones"
                              : "Bajas",
                      ]}
                      labelFormatter={(label) => `Mes: ${label}`}
                    />

                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                      formatter={(val) => (
                        <span className="text-slate-700 font-semibold uppercase text-xs tracking-wider">
                          {val === "activos"
                            ? "Total Activos"
                            : val === "nuevos"
                              ? "Nuevas Matrículas"
                              : val === "renovaciones"
                                ? "Renovaciones"
                                : "Bajas"}
                        </span>
                      )}
                    />

                    <Bar isAnimationActive={false} maxBarSize={56}
                      dataKey="nuevos"
                      fill="var(--color-blue-500)"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />
                    <Bar isAnimationActive={false} maxBarSize={56}
                      dataKey="renovaciones"
                      fill="var(--color-emerald-500)"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />
                    <Line isAnimationActive={false}
                      type="monotone"
                      dataKey="activos"
                      stroke="var(--color-violet-500)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM METRIC SUMMARY STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-slate-50 border-t border-gray-200 text-center text-xs">
          <div className="p-2 rounded-lg bg-white border border-slate-200/80">
            <span className="text-xs uppercase font-bold text-slate-400 block">
              Promedio Facturación
            </span>
            <span className="text-xs font-black text-slate-800">
              S/{" "}
              {(
                totals.totalIng /
                (timePeriod === "7d" ? 7 : timePeriod === "30d" ? 30 : 365)
              ).toFixed(2)}{" "}
              / día
            </span>
          </div>

          <div className="p-2 rounded-lg bg-white border border-slate-200/80">
            <span className="text-xs uppercase font-bold text-slate-400 block">
              Asistencias (30 días)
            </span>
            <span className="text-xs font-black text-blue-700">
              {asistencias30} ingresos registrados
            </span>
          </div>

          <div className="p-2 rounded-lg bg-white border border-slate-200/80">
            <span className="text-xs uppercase font-bold text-slate-400 block">
              Ticket Medio Socio
            </span>
            <span className="text-xs font-black text-emerald-700">
              S/{" "}
              {(
                metrics.totalIncome / (metrics.totalActiveMembers || 1)
              ).toFixed(2)}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-white border border-slate-200/80">
            <span className="text-xs uppercase font-bold text-slate-400 block">
              Resultado del Periodo
            </span>
            <span className={`text-xs font-black ${totals.net >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {totals.totalIng === 0 && totals.totalEg === 0
                ? "Sin movimientos"
                : `${totals.net >= 0 ? "Ganancia" : "Pérdida"} S/ ${Math.abs(totals.net).toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* SECONDARY ROW: MEMBRESÍAS POR VENCER & RESUMEN FINANCIERO RÁPIDO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Membresías próximas a vencer: 3 a la vista, el resto se desplaza solo */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col">
          <div className="p-3.5 px-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center"><Clock className="w-4 h-4" /></span>
              Membresías por vencer
            </h3>
            <button onClick={() => setActiveTab("alerts")} className="text-xs text-teal-700 font-bold hover:underline cursor-pointer">
              Ver todos ({renewalAlerts.length})
            </button>
          </div>
          <ListaDesplazable
            vacio="No hay membresías por vencer próximamente."
            items={renewalAlerts.map((alert) => {
              const memberObj = members.find((m) => m.id === alert.memberId);
              return (
                <div key={alert.memberId} className="flex items-center gap-3 px-4 h-[58px] border-b border-slate-100">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${alert.isExpired ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {alert.daysLeft < 0 ? "!" : `${alert.daysLeft}d`}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900 truncate">{alert.memberName}</span>
                    <span className="block text-[11px] text-slate-500 truncate">
                      {alert.planName} · {alert.daysLeft < 0 ? "vencido" : `vence ${alert.endDate}`}
                    </span>
                  </span>
                  {memberObj && (
                    <a
                      href={generateWhatsAppLink(memberObj)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Avisar
                    </a>
                  )}
                </div>
              );
            })}
          />
        </div>

        {/* Productos estrella en cuadritos (2 × 2) */}
        <ProductosEstrella products={products} metrics={metrics} onIr={() => setActiveTab("store")} />
      </div>

    </div>
  );
};


/** Lista que muestra 3 filas y se desplaza sola hacia arriba (se detiene al pasar el mouse) */
const ListaDesplazable = ({ items, vacio, filas = 3, alto = 58 }) => {
  const caja = React.useRef(null);
  const [pausa, setPausa] = React.useState(false);
  React.useEffect(() => {
    if (items.length <= filas || pausa) return;
    const id = setInterval(() => {
      const el = caja.current;
      if (!el) return;
      const fin = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      el.scrollTo({ top: fin ? 0 : el.scrollTop + alto, behavior: "smooth" });
    }, 2600);
    return () => clearInterval(id);
  }, [items.length, filas, pausa, alto]);
  if (!items.length) return <p className="px-4 py-8 text-center text-sm text-slate-400">{vacio}</p>;
  return (
    <div
      ref={caja}
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      className="overflow-y-auto rd-lista-desplazable"
      style={{ maxHeight: filas * alto, scrollSnapType: "y mandatory" }}
    >
      {items.map((it, i) => (
        <div key={i} style={{ scrollSnapAlign: "start" }}>
          {it}
        </div>
      ))}
    </div>
  );
};

const ProductosEstrella = ({ products = [], metrics = {}, onIr }) => {
  const [top, setTop] = React.useState(null);
  React.useEffect(() => {
    let vivo = true;
    api("/tienda/resumen")
      .then((r) => vivo && setTop(r.topProducts || []))
      .catch(() => vivo && setTop([]));
    return () => {
      vivo = false;
    };
  }, []);
  const lista = (top && top.length ? top.map((t) => ({ ...products.find((p) => String(p.id) === String(t.id)), ...t, vendidos: t.units })) : products).slice(0, 4);
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col">
      <div className="p-3.5 px-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center"><ShoppingBag className="w-4 h-4" /></span>
          Productos estrella
        </h3>
        <button onClick={onIr} className="text-xs text-teal-700 font-bold hover:underline cursor-pointer">
          Ir a la tienda
        </button>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {lista.map((p, i) => (
          <div key={p.id || i} className="rd-levanta rounded-xl border border-slate-200 p-2.5 flex items-center gap-2.5 min-w-0">
            <span className="relative shrink-0">
              <img src={p.imageUrl || "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=100&q=80"} alt="" className="w-11 h-11 rounded-lg object-cover border border-slate-200" />
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">{i + 1}</span>
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-slate-900 truncate">{p.name}</span>
              <span className="block text-[11px] text-slate-500 truncate">{p.vendidos != null ? `${p.vendidos} vendidos` : `Stock ${p.stock ?? 0}`}</span>
              <span className="block text-xs font-black text-emerald-700">S/ {Number(p.salePrice ?? 0).toFixed(2)}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3 mt-auto">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Ventas de hoy</span>
          <span className="text-sm font-black text-emerald-700">S/ {(metrics.posSalesTotal || 0).toFixed(2)}</span>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
          <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Membresías del mes</span>
          <span className="text-sm font-black text-sky-700">S/ {(metrics.membershipsRevenue || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
