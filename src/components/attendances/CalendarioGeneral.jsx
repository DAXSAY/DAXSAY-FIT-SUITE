// =====================================================================
// Primera pantalla de Control de Asistencias: calendario del mes.
// Arriba se elige de quién: Alumnos, Entrenadores o Personal de trabajo.
// Cada día muestra cuántos vinieron (más color = más gente) y al tocarlo
// se ve la lista de ese día con su código y hora.
// =====================================================================
import { TarjetaKpi } from "../common/TarjetaKpi";
import { CalendarCheck, BarChart3, Flame } from "lucide-react";
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, GraduationCap, Dumbbell, Briefcase, Pencil, Search } from "lucide-react";
import { abrirCorreccion } from "./CorregirIngreso";
import { useGym } from "../../context/GymContext";
import { hoyISO } from "../../utils/fecha";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const moverMes = (mes, n) => {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const grupoDe = (a) =>
  a.category === "student" || a.userRole === "student" ? "alumnos" : a.userRole === "trainer" ? "entrenadores" : "personal";

const GRUPOS = [
  { id: "alumnos", nombre: "Alumnos / Socios", icono: GraduationCap, color: "emerald", hex: "16,185,129" },
  { id: "entrenadores", nombre: "Entrenadores", icono: Dumbbell, color: "sky", hex: "14,165,233" },
  { id: "personal", nombre: "Personal de trabajo", icono: Briefcase, color: "violet", hex: "139,92,246" },
];
const BOTON = {
  emerald: "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/30",
  sky: "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-600/30",
  violet: "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-600/30",
};

export const CalendarioGeneral = ({ onVerLista }) => {
  const { attendances = [], members = [], staffContracts = [] } = useGym();
  const hoy = hoyISO();
  const [grupo, setGrupo] = useState("alumnos");
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [dia, setDia] = useState(hoy);
  const g = GRUPOS.find((x) => x.id === grupo);

  // Una sola entrada por persona y día
  const delMes = useMemo(() => {
    const vistos = new Set();
    return attendances.filter((a) => {
      if (!a.date?.startsWith(mes) || (a.type || "in") !== "in" || a.status === "falta" || grupoDe(a) !== grupo) return false;
      const k = `${a.date}|${a.userId}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  }, [attendances, mes, grupo]);
  const conteo = useMemo(() => {
    const c = {};
    delMes.forEach((a) => (c[a.date] = (c[a.date] || 0) + 1));
    return c;
  }, [delMes]);
  const maximo = Math.max(1, ...Object.values(conteo));
  const total = delMes.length;
  const diasConGente = Object.keys(conteo).length;

  const [y, m] = mes.split("-").map(Number);
  const primero = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const diasMes = new Date(y, m, 0).getDate();
  const celdas = [...Array(primero).fill(null), ...Array.from({ length: diasMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`)];

  const codigoDe = (a) => {
    if (grupoDe(a) === "alumnos") return members.find((x) => String(x.id) === String(a.userId))?.codeLabel;
    return a.staffCode || staffContracts.find((c) => c.staffId === a.userId || c.dni === a.userDni)?.staffCode;
  };
  // En la lista del día se ven TODOS los registros (incluso repetidos, para poder corregirlos)
  const [filtro, setFiltro] = useState("");
  const todosDelDia = attendances
    .filter((a) => a.date === dia && (a.type || "in") === "in" && a.status !== "falta" && grupoDe(a) === grupo)
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const veces = {};
  todosDelDia.forEach((a) => (veces[a.userId] = (veces[a.userId] || 0) + 1));
  const repetidos = new Set(Object.keys(veces).filter((k) => veces[k] > 1));
  const q = filtro.trim().toLowerCase();
  const delDia = todosDelDia.filter((a) => !q || `${codigoDe(a) || ""} ${a.userName} ${a.userDni || ""}`.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      {/* ¿De quién? */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {GRUPOS.map((x) => {
          const I = x.icono;
          const activo = grupo === x.id;
          return (
            <button
              key={x.id}
              onClick={() => setGrupo(x.id)}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                activo ? BOTON[x.color] : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${activo ? "bg-white/20" : "bg-slate-100"}`}>
                <I className="w-5 h-5" />
              </span>
              <span className="font-extrabold text-sm">{x.nombre}</span>
            </button>
          );
        })}
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <TarjetaKpi titulo={`Ingresos · ${MESES[m - 1]}`} valor={total} sub={g.nombre.toLowerCase()} icono={g.icono} tono="teal" />
        <TarjetaKpi titulo="Días con asistencia" valor={diasConGente} sub={`de ${diasMes} días del mes`} icono={CalendarCheck} tono="verde" progreso={(diasConGente / diasMes) * 100} />
        <TarjetaKpi titulo="Promedio por día" valor={diasConGente ? Math.round(total / diasConGente) : 0} sub="en los días con gente" icono={BarChart3} tono="violeta" />
        <TarjetaKpi titulo="Día con más gente" valor={diasConGente ? maximo : 0} sub={(() => { const k = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a])[0]; return k ? new Date(`${k}T12:00:00`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric" }) : "—"; })()} icono={Flame} tono="ambar" />
      </div>

      <div className="space-y-3">
        {/* Calendario */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button onClick={() => setMes(moverMes(mes, -1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer" title="Mes anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="text-base font-black text-slate-900">{MESES[m - 1]} {y}</p>
              <p className="text-xs text-slate-500">
                {total} ingresos de {g.nombre.toLowerCase()} · {diasConGente} días con asistencia
              </p>
            </div>
            <button onClick={() => setMes(moverMes(mes, 1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer" title="Mes siguiente">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DIAS.map((d) => (
              <div key={d} className="text-center text-[11px] font-bold uppercase text-slate-400 pb-1">{d}</div>
            ))}
            {celdas.map((f, i) => {
              if (!f) return <div key={`v${i}`} />;
              const n = conteo[f] || 0;
              const sel = f === dia;
              const futuro = f > hoy;
              const fuerza = n ? 0.18 + (n / maximo) * 0.62 : 0;
              return (
                <button
                  key={f}
                  onClick={() => setDia(f)}
                  disabled={futuro}
                  style={n ? { backgroundColor: `color-mix(in srgb, var(--color-${g.color}-500) ${Math.round(fuerza * 100)}%, transparent)` } : undefined}
                  className={`relative h-10 rounded-lg border text-left p-1 transition-all ${futuro ? "opacity-40 cursor-default" : "cursor-pointer hover:scale-[1.03]"} ${
                    sel ? "ring-2 ring-offset-1 ring-slate-900 border-transparent" : "border-slate-200"
                  } ${!n && !futuro ? "bg-slate-50" : ""}`}
                >
                  <span className={`text-[11px] font-bold ${f === hoy ? "bg-slate-900 text-white rounded px-1" : n > 0 ? "text-slate-800 rd-num-cal" : "text-slate-600"}`}>{Number(f.slice(8))}</span>
                  {n > 0 && <span className="absolute bottom-0.5 right-1.5 text-sm font-black text-slate-900 rd-num-cal">{n}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista del día */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Día elegido</p>
          <p className="text-base font-black text-slate-900">
            {(() => {
              const t = new Date(`${dia}T12:00:00`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
              return t.charAt(0).toUpperCase() + t.slice(1);
            })()}
          </p>
          <p className="text-xs text-slate-500 mb-2">
            {new Set(todosDelDia.map((a) => a.userId)).size} {g.nombre.toLowerCase()}
            {repetidos.size > 0 && <b className="text-amber-600"> · {repetidos.size} marcado(s) dos veces</b>}
          </p>
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar código o nombre…" className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-200 text-xs" />
          </div>
          <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1"><Pencil className="w-3 h-3" /> Toca el lápiz para corregir un ingreso mal marcado.</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-1.5 content-start">
            {delDia.length === 0 && <p className="sm:col-span-2 xl:col-span-3 text-sm text-slate-400 py-6 text-center">Nadie registró su ingreso este día.</p>}
            {delDia.map((a) => (
              <div key={a.id} className={`group flex items-center gap-2 p-2 rounded-xl border ${repetidos.has(a.userId) ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}>
                <span className="w-16 shrink-0 font-mono text-[11px] font-bold text-blue-700">{codigoDe(a) || "—"}</span>
                <span className="text-sm font-semibold text-slate-800 truncate flex-1" title={a.notes || ""}>
                  {a.userName}
                  {a.status === "warning" && <span className="ml-1 text-[10px] font-bold text-rose-600">· vencido</span>}
                  {String(a.notes || "").startsWith("Corregido") && <span className="ml-1 text-[10px] font-bold text-amber-600">· corregido</span>}
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap">{a.time}</span>
                <button
                  onClick={() => abrirCorreccion(a)}
                  title="Corregir o eliminar este ingreso"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
