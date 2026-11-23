// Panel de gráficos del progreso de pesos (tipo dashboard)
// Colores: azul = periodo actual / serie única · ámbar = periodo anterior
// (par validado para modo claro y oscuro) · verde/rojo solo para subió/bajó,
// siempre con ▲ ▼ y el valor escrito (nunca solo color).
import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine, Cell, PieChart, Pie,
  LabelList,
} from "recharts";
import { DIAS_SEMANA, ESTILO_TENDENCIA, diaSemana, fechaBonita, lunesDe, mesBonito, sumar } from "../../utils/progreso";

const AZUL = "var(--color-blue-500)";
const AMBAR = "var(--color-amber-600)";
const VERDE = "var(--color-emerald-600)";
const ROJO = "var(--color-rose-600)";
const GRIS = "#94a3b8";
const EJE = { fontSize: 11, fill: "#94a3b8" };
const REJILLA = "rgba(148,163,184,0.22)";
const corto = (s, n = 16) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));
const r1 = (n) => Math.round(n * 10) / 10;

const Caja = ({ titulo, sub, children, alto = 240 }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4">
    <p className="text-sm font-black text-slate-900">{titulo}</p>
    {sub && <p className="text-xs text-slate-500 mb-2">{sub}</p>}
    <div style={{ height: alto }}>{children}</div>
  </div>
);

const Vacio = ({ texto }) => <div className="h-full flex items-center justify-center text-sm text-slate-400 text-center px-6">{texto}</div>;

const TooltipBonito = ({ active, payload, label, unidad = "kg", titulo }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs text-slate-800">
      <p className="font-black mb-1">{titulo ? titulo(payload[0].payload) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color || p.fill }} />
          {p.name}: <b>{typeof p.value === "number" ? r1(p.value).toLocaleString("es-PE") : p.value}</b> {unidad}
        </p>
      ))}
      {payload[0].payload?.detalle && <p className="text-slate-500 mt-1">{payload[0].payload.detalle}</p>}
    </div>
  );
};

export default function GraficosProgreso({ datos, resumen }) {
  const [rango, setRango] = useState(8); // semanas; 0 = todo
  const [comparar, setComparar] = useState("semana"); // semana | mes

  const g = useMemo(() => {
    const ses = resumen.sesiones;
    if (!ses.length) return null;
    const hoyL = lunesDe(datos.hoy);
    const primera = lunesDe(ses[0].fecha);
    let inicio = rango ? sumar(hoyL, -7 * (rango - 1)) : primera;
    if (inicio < primera) inicio = primera;
    const semanas = [];
    for (let l = inicio; l <= hoyL; l = sumar(l, 7)) semanas.push(l);

    // Base de cada ejercicio: su primera sesión
    const base = new Map();
    for (const s of ses) if (!base.has(s.clave) && s.fuerza > 0) base.set(s.clave, s.fuerza);

    const porSemana = semanas.map((l, i) => {
      const en = ses.filter((s) => s.fecha >= l && s.fecha <= sumar(l, 6));
      const mejores = new Map();
      for (const s of en) if (!mejores.has(s.clave) || s.fuerza > mejores.get(s.clave)) mejores.set(s.clave, s.fuerza);
      const indices = [...mejores.entries()].filter(([k]) => base.get(k)).map(([k, f]) => (f / base.get(k)) * 100);
      return {
        semana: `S${i + 1}`,
        rango: `${fechaBonita(l)} – ${fechaBonita(sumar(l, 6))}`,
        indice: indices.length ? r1(indices.reduce((t, x) => t + x, 0) / indices.length) : null,
        toneladas: r1(en.reduce((t, s) => t + s.volumen, 0) / 1000),
        dias: new Set(en.map((s) => s.fecha)).size,
        detalle: `${new Set(en.map((s) => s.fecha)).size} día(s) entrenados`,
      };
    });

    // Actual vs anterior (semana o mes) por ejercicio: mejor fuerza estimada
    const clavePeriodo = comparar === "semana" ? (f) => lunesDe(f) : (f) => f.slice(0, 7);
    const actual = clavePeriodo(datos.hoy);
    const anterior =
      comparar === "semana"
        ? sumar(actual, -7)
        : new Date(Date.UTC(Number(actual.slice(0, 4)), Number(actual.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7);
    const mejorEn = (clave, per) =>
      ses.filter((s) => s.clave === clave && clavePeriodo(s.fecha) === per).reduce((m, s) => Math.max(m, s.fuerza), 0) || null;
    const comparativa = resumen.ejercicios
      .filter((e) => !e.corporal) // peso corporal no se compara en kg
      .map((e) => ({ clave: e.clave, nombre: corto(e.nombre), completo: e.nombre, anterior: mejorEn(e.clave, anterior), actual: mejorEn(e.clave, actual) }))
      .filter((x) => x.anterior || x.actual);

    const cambios = resumen.ejercicios
      .filter((e) => e.deltaTotal !== null)
      .map((e) => ({ clave: e.clave, nombre: corto(e.nombre, 20), completo: e.nombre, valor: r1(e.deltaTotal), kg: e.deltaTotalKg }))
      .sort((a, b) => b.valor - a.valor);

    const conteo = resumen.conteo;
    const semaforo = [
      { nombre: "Subió", valor: conteo.sube, color: VERDE },
      { nombre: "Se mantiene", valor: conteo.igual, color: GRIS },
      { nombre: "Bajó", valor: conteo.baja, color: ROJO },
      { nombre: "Primer registro", valor: conteo.nuevo, color: AZUL },
    ].filter((x) => x.valor > 0);

    const dias = DIAS_SEMANA.map((d, i) => ({ dia: d, sesiones: resumen.fechas.filter((f) => diaSemana(f) === i).length }));

    return {
      porSemana,
      comparativa,
      cambios,
      semaforo,
      dias,
      etiquetas:
        comparar === "semana"
          ? { anterior: `Semana pasada (${fechaBonita(anterior)})`, actual: `Esta semana (${fechaBonita(actual)})` }
          : { anterior: mesBonito(anterior), actual: mesBonito(actual) },
    };
  }, [datos, resumen, rango, comparar]);

  if (!g)
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
        Cuando se anote la primera sesión aparecerán aquí los gráficos de progreso.
      </div>
    );

  const altoCambios = Math.max(200, g.cambios.length * 30 + 40);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase text-slate-500">Periodo</span>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            [4, "4 semanas"],
            [8, "8 semanas"],
            [12, "12 semanas"],
            [0, "Todo"],
          ].map(([v, t]) => (
            <button
              key={v}
              onClick={() => setRango(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${rango === v ? "bg-blue-600 text-white shadow" : "text-slate-600"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Caja titulo="Índice de fuerza por semana" sub="100 = cómo empezó cada ejercicio. Si la línea sube, está más fuerte.">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={g.porSemana} margin={{ top: 10, right: 16, bottom: 0, left: -14 }}>
              <CartesianGrid stroke={REJILLA} vertical={false} />
              <XAxis dataKey="semana" tick={EJE} tickLine={false} axisLine={false} />
              <YAxis tick={EJE} tickLine={false} axisLine={false} domain={["dataMin - 5", "dataMax + 5"]} allowDecimals={false} />
              <ReferenceLine y={100} stroke={GRIS} strokeDasharray="4 4" label={{ value: "inicio", fill: "#94a3b8", fontSize: 10, position: "insideTopLeft" }} />
              <Tooltip content={<TooltipBonito unidad="" titulo={(p) => `${p.semana} · ${p.rango}`} />} />
              <Line isAnimationActive={false} type="monotone" dataKey="indice" name="Índice de fuerza" stroke={AZUL} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Caja>

        <Caja titulo="Kilos movidos por semana" sub="Volumen total (peso × repeticiones) en toneladas.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={g.porSemana} margin={{ top: 16, right: 8, bottom: 0, left: -14 }} barCategoryGap="30%">
              <CartesianGrid stroke={REJILLA} vertical={false} />
              <XAxis dataKey="semana" tick={EJE} tickLine={false} axisLine={false} />
              <YAxis tick={EJE} tickLine={false} axisLine={false} />
              <Tooltip content={<TooltipBonito unidad="t" titulo={(p) => `${p.semana} · ${p.rango}`} />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
              <Bar isAnimationActive={false} maxBarSize={56} dataKey="toneladas" name="Volumen" fill={AZUL} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="toneladas" position="top" style={{ fontSize: 10, fill: "#94a3b8" }} formatter={(v) => (v ? v : "")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Caja>

        <Caja
          titulo="Comparativa por ejercicio"
          sub="Mejor serie (fuerza estimada) del periodo anterior contra el actual."
          alto={Math.max(240, g.comparativa.length * 26 + 80)}
        >
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-2 -mt-1">
            {[
              ["semana", "Semana vs. semana"],
              ["mes", "Mes vs. mes"],
            ].map(([v, t]) => (
              <button
                key={v}
                onClick={() => setComparar(v)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${comparar === v ? "bg-blue-600 text-white shadow" : "text-slate-600"}`}
              >
                {t}
              </button>
            ))}
          </div>
          {g.comparativa.length ? (
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={g.comparativa} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }} barGap={2}>
                <CartesianGrid stroke={REJILLA} horizontal={false} />
                <XAxis type="number" tick={EJE} tickLine={false} axisLine={false} unit=" kg" />
                <YAxis type="category" dataKey="clave" tick={EJE} tickLine={false} axisLine={false} width={120} interval={0} tickFormatter={(c) => g.comparativa.find((x) => x.clave === c)?.nombre || ""} />
                <Tooltip content={<TooltipBonito titulo={(p) => p.completo} />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
                <Bar isAnimationActive={false} maxBarSize={56} dataKey="anterior" name={g.etiquetas.anterior} fill={AMBAR} radius={[0, 4, 4, 0]} barSize={9} />
                <Bar isAnimationActive={false} maxBarSize={56} dataKey="actual" name={g.etiquetas.actual} fill={AZUL} radius={[0, 4, 4, 0]} barSize={9} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Vacio texto="Sin registros en estos dos periodos." />
          )}
        </Caja>

        <Caja titulo="Cambio desde el inicio" sub="Fuerza estimada de la última sesión contra la primera de cada ejercicio." alto={altoCambios}>
          {g.cambios.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={g.cambios} layout="vertical" margin={{ top: 0, right: 52, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={REJILLA} horizontal={false} />
                <XAxis type="number" tick={EJE} tickLine={false} axisLine={false} unit=" %" />
                <YAxis type="category" dataKey="clave" tick={EJE} tickLine={false} axisLine={false} width={150} interval={0} tickFormatter={(c) => g.cambios.find((x) => x.clave === c)?.nombre || ""} />
                <ReferenceLine x={0} stroke={GRIS} />
                <Tooltip content={<TooltipBonito unidad="%" titulo={(p) => p.completo} />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                <Bar isAnimationActive={false} maxBarSize={56} dataKey="valor" name="Cambio" radius={4} barSize={12}>
                  {g.cambios.map((c) => (
                    <Cell key={c.clave} fill={c.valor >= 2 ? VERDE : c.valor <= -2 ? ROJO : GRIS} />
                  ))}
                  <LabelList
                    dataKey="valor"
                    content={({ x, y, width, height, value }) => {
                      const fin = Math.max(Number(x), Number(x) + Number(width)); // siempre a la derecha (las negativas, junto al cero)
                      return (
                        <text x={fin + 6} y={Number(y) + Number(height) / 2} dy={3.5} fontSize={10} fontWeight={700} fill="#94a3b8">
                          {`${value >= 2 ? "▲" : value <= -2 ? "▼" : "●"} ${value > 0 ? "+" : ""}${value}%`}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Vacio texto="Se necesitan al menos 2 sesiones de un ejercicio para comparar." />
          )}
        </Caja>

        <Caja titulo="Semáforo de la última sesión" sub="Cuántos ejercicios subieron, se mantuvieron o bajaron." alto={220}>
          <div className="flex items-center h-full gap-4">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={g.semaforo} dataKey="valor" nameKey="nombre" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {g.semaforo.map((s) => (
                    <Cell key={s.nombre} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipBonito unidad="ejercicios" titulo={(p) => p.nombre} />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-1.5 text-sm">
              {g.semaforo.map((s) => (
                <li key={s.nombre} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
                  <span className="text-slate-700">
                    {s.nombre === "Subió" ? ESTILO_TENDENCIA.sube.icono : s.nombre === "Bajó" ? ESTILO_TENDENCIA.baja.icono : s.nombre === "Se mantiene" ? "●" : ""} {s.nombre}
                  </span>
                  <b className="text-slate-900">{s.valor}</b>
                </li>
              ))}
            </ul>
          </div>
        </Caja>

        <Caja titulo="Días que entrena" sub="Sesiones registradas por día de la semana." alto={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={g.dias} margin={{ top: 16, right: 8, bottom: 0, left: -20 }} barCategoryGap="30%">
              <CartesianGrid stroke={REJILLA} vertical={false} />
              <XAxis dataKey="dia" tick={EJE} tickLine={false} axisLine={false} />
              <YAxis tick={EJE} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipBonito unidad="sesiones" />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
              <Bar isAnimationActive={false} maxBarSize={56} dataKey="sesiones" name="Sesiones" fill={AZUL} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="sesiones" position="top" style={{ fontSize: 10, fill: "#94a3b8" }} formatter={(v) => (v ? v : "")} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Caja>
      </div>
    </div>
  );
}
