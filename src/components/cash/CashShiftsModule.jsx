// ============================================================
// CAJA POR TURNOS: apertura, movimientos, arqueo y cierre
// Cada recepcionista abre su caja con el efectivo que recibe, cobra
// (POS, matrículas, renovaciones) y al terminar cuenta el efectivo y
// cierra. El siguiente turno ve lo que dejó el anterior y continúa.
// ============================================================
import { CampoNumero } from "../common/CampoNumero";
import { nombreTurno } from "../../utils/turnos";
import { TarjetaKpi, Anillo } from "../common/TarjetaKpi";
import { Wallet as CjWallet, Coins as CjCoins, TrendingDown as CjDown, Vault as CjVault, ShoppingBag as CjBag, UserPlus as CjUser, Scale as CjScale, Receipt as CjReceipt, Target as CjTarget } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  Vault,
  LockOpen,
  Lock,
  Banknote,
  Smartphone,
  CreditCard,
  ArrowLeftRight,
  Plus,
  Minus,
  Calculator,
  Clock,
  ArrowLeft,
  Printer,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  User,
  CalendarDays,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import { api } from "../../api/cliente";
import { userCan } from "../../config/roles";
import { hoyISO } from "../../utils/fecha";
import { BotonesDescarga } from "../common/BotonesDescarga";

const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
const hora = (dt) => (dt ? String(dt).slice(11, 16) : "—");
const fechaCorta = (dt) => {
  if (!dt) return "—";
  const [a, m, d] = String(dt).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};
const duracion = (desde, hasta) => {
  if (!desde) return "";
  const a = new Date(String(desde).replace(" ", "T"));
  const b = hasta ? new Date(String(hasta).replace(" ", "T")) : new Date();
  const min = Math.max(0, Math.round((b - a) / 60000));
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
};
const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const DENOMINACIONES = [
  { v: 200, t: "billete" }, { v: 100, t: "billete" }, { v: 50, t: "billete" },
  { v: 20, t: "billete" }, { v: 10, t: "billete" }, { v: 5, t: "moneda" },
  { v: 2, t: "moneda" }, { v: 1, t: "moneda" }, { v: 0.5, t: "moneda" },
  { v: 0.2, t: "moneda" }, { v: 0.1, t: "moneda" },
];

const CATEGORIAS = {
  matricula: "Matrícula / renovación",
  pase_dia: "Pase del día",
  venta: "Venta",
  entrenamiento_personal: "Entrenamiento personal",
  fisioterapia: "Fisioterapia",
  nutricion: "Nutrición",
  insumos: "Insumos",
  mantenimiento: "Mantenimiento",
  servicios: "Servicios",
  sueldo: "Sueldo",
  alquiler: "Alquiler",
  marketing: "Marketing",
  averia_equipo: "Avería de equipo",
  otros: "Otros",
};
const CATEGORIAS_TURNO = {
  ingreso: ["otros", "entrenamiento_personal", "fisioterapia", "nutricion"],
  egreso: ["insumos", "mantenimiento", "servicios", "otros"],
};
const METODOS = {
  efectivo: { label: "Efectivo", icon: Banknote },
  yape_plin: { label: "Yape / Plin", icon: Smartphone },
  // Tarjeta y transferencia ya no se usan para cobrar; quedan solo para leer registros antiguos
  tarjeta: { label: "Tarjeta", icon: CreditCard, antiguo: true },
  transferencia: { label: "Transferencia", icon: ArrowLeftRight, antiguo: true },
};

// Pantalla completa reutilizable
const PantallaCompleta = ({ titulo, subtitulo, onVolver, children, acciones }) => (
  <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
    <div className="w-full max-w-6xl mx-auto min-h-full p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onVolver}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900">{titulo}</h2>
            {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
          </div>
        </div>
        {acciones}
      </div>
      {children}
    </div>
  </div>
);

// Indicador de caja con el diseño común (icono grande, fondo de color suave)
const ICONO_KPI = [
  [/abrir/i, CjWallet],
  [/cobros|cobrado/i, CjCoins],
  [/gastos/i, CjDown],
  [/debe haber|esperado|contado/i, CjVault],
  [/ventas/i, CjBag],
  [/matr/i, CjUser],
  [/diferencia/i, CjScale],
];
const Kpi = ({ label, value, tone = "slate", hint, big, icono }) => {
  const I = icono || ICONO_KPI.find(([re]) => re.test(label))?.[1] || CjReceipt;
  const tono = { slate: "plomo", green: "verde", red: "rojo", blue: "teal", amber: "ambar", purple: "violeta" }[tone] || "plomo";
  return <TarjetaKpi titulo={label} texto={value} sub={hint} icono={I} tono={tono} activo={big} />;
};

const Diferencia = ({ valor, texto = "" }) => {
  const v = r2(valor);
  if (Math.abs(v) < 0.01)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" /> Cuadra {texto}
      </span>
    );
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
        v > 0 ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      <AlertTriangle className="w-3.5 h-3.5" /> {v > 0 ? "Sobra" : "Falta"} {soles(Math.abs(v))} {texto}
    </span>
  );
};

// ------------------------------------------------------------
// Tabla de movimientos de un turno
// ------------------------------------------------------------
const TablaMovimientos = ({ movimientos }) =>
  movimientos.length === 0 ? (
    <p className="text-center text-sm text-slate-500 py-8">
      Aún no hay cobros ni gastos en este turno.
    </p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200">
            <th className="py-2 pr-3">Hora</th>
            <th className="py-2 pr-3">Concepto</th>
            <th className="py-2 pr-3">Categoría</th>
            <th className="py-2 pr-3">Método</th>
            <th className="py-2 pr-3">Usuario</th>
            <th className="py-2 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="py-2 pr-3 font-mono text-slate-500">{hora(m.dateTime)}</td>
              <td className="py-2 pr-3 text-slate-800">
                {m.description}
                {m.relatedName && <span className="text-xs text-slate-500 block">{m.relatedName}</span>}
              </td>
              <td className="py-2 pr-3 text-slate-600">{CATEGORIAS[m.category] || m.category}</td>
              <td className="py-2 pr-3 text-slate-600">{METODOS[m.paymentMethod]?.label || m.paymentMethod}</td>
              <td className="py-2 pr-3 text-slate-500">{m.user || "—"}</td>
              <td className={`py-2 text-right font-black ${m.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                {m.type === "income" ? "+" : "−"} {soles(m.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

// Resumen por método de pago
const ResumenMetodos = ({ resumen }) => (
  <div className="grid grid-cols-2 gap-3 rd-metodos-caja">
    {Object.entries(METODOS).filter(([k, m]) => !m.antiguo || (resumen.ingresos[k] || 0) + (resumen.egresos[k] || 0) > 0).map(([k, { label, icon: Icono }]) => (
      <TarjetaKpi
        key={k}
        titulo={label}
        texto={soles(resumen?.ingresos?.[k])}
        sub={resumen?.egresos?.[k] > 0 ? `− ${soles(resumen.egresos[k])} en gastos` : undefined}
        icono={Icono}
        tono={k === "efectivo" ? "verde" : k === "yape" || k === "yape_plin" ? "violeta" : k === "tarjeta" ? "ambar" : "azul"}
      />
    ))}
  </div>
);

// ------------------------------------------------------------
// Formulario: abrir caja
// ------------------------------------------------------------
const AbrirCaja = ({ ultimo, onVolver, onAbierta }) => {
  const { currentUser } = useGym();
  const recibido = ultimo?.nextShiftCash ?? 0;
  const [turnos, setTurnos] = useState([]);
  const [turno, setTurno] = useState("");
  useEffect(() => {
    api("/metas/turnos-recepcion")
      .then((t) => {
        setTurnos(t.filter((x) => x.active));
        const mio = t.find((x) => x.people.some((p) => p.userId === String(currentUser?.id)));
        if (mio) setTurno(mio.id);
      })
      .catch(() => {});
  }, []);
  const [monto, setMonto] = useState(String(recibido.toFixed(2)));
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const dif = r2(Number(monto || 0) - recibido);

  const abrir = async (e) => {
    e.preventDefault();
    setError("");
    if (monto === "" || Number(monto) < 0) return setError("Ingresa el efectivo que cuentas al abrir.");
    if (ultimo && Math.abs(dif) >= 0.01 && obs.trim().length < 3)
      return setError("El efectivo no coincide con lo que dejó el turno anterior: escribe una observación.");
    setEnviando(true);
    try {
      await api("/turnos-caja/abrir", { method: "POST", body: { montoApertura: Number(monto), observacion: obs, turnoRecepcion: turno || undefined } });
      onAbierta();
    } catch (er) {
      setError(er.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaCompleta titulo="Abrir mi caja" subtitulo="Cuenta el efectivo que recibes antes de empezar a cobrar." onVolver={onVolver}>
      <form onSubmit={abrir} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Entrega del turno anterior</h3>
          {ultimo ? (
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                <strong className="text-slate-900">{ultimo.closedBy}</strong> cerró su caja el {fechaCorta(ultimo.closedAt)} a las{" "}
                {hora(ultimo.closedAt)}.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Dejó en caja" value={soles(recibido)} tone="blue" />
                <Kpi label="Entregó a administración" value={soles(ultimo.deliveredCash)} />
              </div>
              {ultimo.closingNote && (
                <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2">
                  Nota del cierre: {ultimo.closingNote}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Es el primer turno registrado: ingresa el fondo de caja con el que empiezas.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          {turnos.length > 0 && (
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Turno (suma a la meta de)</span>
              <select value={turno} onChange={(e) => setTurno(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white">
                <option value="">Sin turno</option>
                {turnos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {nombreTurno(t.name, t.people)} {t.start && `(${t.start} - ${t.end})`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Efectivo que cuentas al abrir (S/)</span>
            <CampoNumero
              type="number"
              min="0"
              step="0.10"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-300 text-2xl font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </label>
          {ultimo && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Frente a lo que dejó el turno anterior:</span>
              <Diferencia valor={dif} />
            </div>
          )}
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Observación {ultimo && Math.abs(dif) >= 0.01 && <span className="text-rose-600">(obligatoria)</span>}</span>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              placeholder="Ej. Se recibió S/ 5 menos porque…"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          <button
            disabled={enviando}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black flex items-center justify-center gap-2 cursor-pointer"
          >
            <LockOpen className="w-5 h-5" /> {enviando ? "Abriendo…" : "Abrir caja e iniciar mi turno"}
          </button>
        </div>
      </form>
    </PantallaCompleta>
  );
};

// ------------------------------------------------------------
// Formulario: ingreso o gasto del turno
// ------------------------------------------------------------
const MovimientoTurno = ({ turno, onVolver, onGuardado }) => {
  const [tipo, setTipo] = useState("egreso");
  const [categoria, setCategoria] = useState("insumos");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [descripcion, setDescripcion] = useState("");
  const [relacionado, setRelacionado] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await api(`/turnos-caja/${turno.id}/movimiento`, {
        method: "POST",
        body: { tipo, categoria, monto: Number(monto), metodoPago: metodo, descripcion, relacionado },
      });
      onGuardado();
    } catch (er) {
      setError(er.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaCompleta
      titulo="Registrar ingreso o gasto del turno"
      subtitulo="Para cobros sueltos o gastos de caja chica. Las ventas y las matrículas se registran solas."
      onVolver={onVolver}
    >
      <form onSubmit={guardar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {[
            ["egreso", "Gasto / salida de dinero", Minus, "rose"],
            ["ingreso", "Ingreso / cobro", Plus, "emerald"],
          ].map(([k, label, Icono, color]) => (
            <button
              type="button"
              key={k}
              onClick={() => {
                setTipo(k);
                setCategoria(CATEGORIAS_TURNO[k][0]);
              }}
              className={`p-4 rounded-xl border-2 font-black flex items-center justify-center gap-2 cursor-pointer ${
                tipo === k
                  ? color === "rose"
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              <Icono className="w-5 h-5" /> {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Monto (S/)</span>
            <CampoNumero
              type="number"
              min="0.1"
              step="0.10"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-300 text-xl font-black"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Categoría</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="mt-1 w-full px-3 py-3 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {CATEGORIAS_TURNO[tipo].map((c) => (
                <option key={c} value={c}>
                  {CATEGORIAS[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <span className="text-sm font-bold text-slate-700">Método</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {Object.entries(METODOS).filter(([, m]) => !m.antiguo).map(([k, { label, icon: Icono }]) => (
              <button
                type="button"
                key={k}
                onClick={() => setMetodo(k)}
                className={`p-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  metodo === k ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                }`}
              >
                <Icono className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Descripción</span>
          <input
            required
            minLength={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={tipo === "egreso" ? "Ej. Compra de bidón de agua y lejía" : "Ej. Clase personalizada Juan"}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Persona o proveedor (opcional)</span>
          <input
            value={relacionado}
            onChange={(e) => setRelacionado(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
        </label>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button
          disabled={enviando}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black cursor-pointer"
        >
          {enviando ? "Guardando…" : "Guardar en mi turno"}
        </button>
      </form>
    </PantallaCompleta>
  );
};

// ------------------------------------------------------------
// Formulario: arqueo y cierre
// ------------------------------------------------------------
const MOTIVOS_DIFERENCIA = [
  "Vuelto mal dado",
  "Cobro que no se registró en el sistema",
  "Gasto pagado que no se registró",
  "Error al contar",
  "Pago por Yape/Plin registrado como efectivo",
  "Otro",
];

const CerrarCaja = ({ turno, onVolver, onCerrada }) => {
  const [efectivo, setEfectivo] = useState("");
  const [yapeApp, setYapeApp] = useState("");
  const [siguiente, setSiguiente] = useState(String(Number(turno.openingCash).toFixed(2)));
  const [confirmar, setConfirmar] = useState(""); // segunda vez que escribe el monto si no cuadra
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const res = turno.summary;
  const contado = r2(efectivo);
  const esperado = r2(turno.expectedCash);
  const dif = r2(contado - esperado);
  const hayDif = efectivo !== "" && Math.abs(dif) >= 0.5;
  const difGrande = Math.abs(dif) >= Math.max(50, esperado * 0.5);
  const yapeSistema = r2(res.ingresos.yape_plin);
  const difYape = yapeApp === "" ? 0 : r2(r2(yapeApp) - yapeSistema);
  const queda = Math.min(r2(siguiente), contado);
  const entrega = r2(contado - queda);

  // Qué se cobró y gastó en el turno (para saber qué se está arqueando)
  const conteo = res.conteo || {};
  const filas = Object.entries(res.porCategoria || {})
    .map(([k, monto]) => {
      const [tipo, cat] = k.split(":");
      return { tipo, cat, monto, n: conteo[k] || 0 };
    })
    .sort((a, b) => (a.tipo === b.tipo ? b.monto - a.monto : a.tipo === "ingreso" ? -1 : 1));

  const cerrar = async (e) => {
    e.preventDefault();
    setError("");
    if (efectivo === "") return setError("Escribe cuánto efectivo hay en caja.");
    if (hayDif) {
      if (r2(confirmar) !== contado) return setError("Vuelve a escribir el efectivo contado para confirmarlo (así se evitan errores como un cero de más).");
      if (!motivo) return setError("Elige el motivo de la diferencia.");
      if (motivo === "Otro" && detalle.trim().length < 3) return setError("Explica brevemente el motivo.");
    }
    if (r2(siguiente) > contado) return setError("No puedes dejar más efectivo del que hay en caja.");
    const partes = [];
    if (hayDif) partes.push(`${dif > 0 ? "Sobrante" : "Faltante"} S/ ${Math.abs(dif).toFixed(2)}: ${motivo}${detalle.trim() ? ` – ${detalle.trim()}` : ""}`);
    if (yapeApp !== "" && Math.abs(difYape) >= 0.5) partes.push(`Yape/Plin en la app S/ ${r2(yapeApp).toFixed(2)} vs sistema S/ ${yapeSistema.toFixed(2)}`);
    setEnviando(true);
    try {
      const cerrado = await api(`/turnos-caja/${turno.id}/cerrar`, {
        method: "POST",
        body: { efectivoContado: contado, efectivoSiguiente: r2(siguiente), detalleConteo: null, observacion: partes.join(" · ") },
      });
      onCerrada(cerrado);
    } catch (er) {
      setError(er.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaCompleta
      titulo="Cierre de caja"
      subtitulo={`Turno de ${turno.openedBy} · desde las ${hora(turno.openedAt)} (${duracion(turno.openedAt)})`}
      onVolver={onVolver}
    >
      <form onSubmit={cerrar} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Lo que pasó en el turno */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4" /> Lo que se movió en tu turno
            </h3>
            {filas.length === 0 ? (
              <p className="text-sm text-slate-500">No hubo cobros ni gastos en este turno.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filas.map((f) => (
                  <div key={`${f.tipo}${f.cat}`} className="flex items-center gap-3 py-2">
                    <span className={`w-2 h-8 rounded-full ${f.tipo === "ingreso" ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-slate-800">{CATEGORIAS[f.cat] || f.cat}</span>
                      <span className="block text-xs text-slate-500">
                        {f.n} {f.n === 1 ? "operación" : "operaciones"} · {f.tipo === "ingreso" ? "cobro" : "gasto"}
                      </span>
                    </span>
                    <strong className={`text-sm ${f.tipo === "ingreso" ? "text-emerald-700" : "text-rose-600"}`}>
                      {f.tipo === "ingreso" ? "+" : "−"} {soles(f.monto)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-[11px] font-black uppercase text-emerald-700">Cobrado en efectivo</p>
                <p className="text-lg font-black text-emerald-800">{soles(res.ingresos.efectivo)}</p>
              </div>
              <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
                <p className="text-[11px] font-black uppercase text-violet-700">Cobrado por Yape / Plin</p>
                <p className="text-lg font-black text-violet-800">{soles(yapeSistema)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <label className="block">
              <span className="text-sm font-black text-slate-800">1. ¿Cuánto efectivo hay en caja ahora? *</span>
              <span className="block text-xs text-slate-500">Cuenta todo el dinero de la caja y escribe el total.</span>
              <CampoNumero
                type="number"
                min="0"
                step="0.10"
                value={efectivo}
                onChange={(e) => {
                  setEfectivo(e.target.value);
                  setConfirmar("");
                }}
                placeholder="0.00"
                autoFocus
                className="mt-1.5 w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 text-2xl font-black"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-slate-800">2. ¿Cuánto dice tu app de Yape / Plin hoy? <span className="font-normal text-slate-500">(opcional)</span></span>
              <span className="block text-xs text-slate-500">Para comprobar que todos los pagos por Yape/Plin se registraron.</span>
              <CampoNumero
                type="number"
                min="0"
                step="0.10"
                value={yapeApp}
                onChange={(e) => setYapeApp(e.target.value)}
                placeholder={yapeSistema.toFixed(2)}
                className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-300 text-lg font-bold"
              />
              {yapeApp !== "" && (
                <span className={`block mt-1 text-xs font-bold ${Math.abs(difYape) < 0.5 ? "text-emerald-700" : "text-amber-700"}`}>
                  {Math.abs(difYape) < 0.5
                    ? "✓ Coincide con lo registrado."
                    : `${difYape > 0 ? "Hay" : "Faltan"} S/ ${Math.abs(difYape).toFixed(2)} ${difYape > 0 ? "más en la app: algún pago no se registró en el sistema" : "en la app respecto al sistema"}.`}
                </span>
              )}
            </label>
          </div>
        </div>

        {/* Resultado y cierre */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 text-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">Resultado</h3>
            <div className="flex justify-between"><span className="text-slate-500">Efectivo al abrir</span><strong>{soles(turno.openingCash)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">+ Cobros en efectivo</span><strong className="text-emerald-600">{soles(res.ingresos.efectivo)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">− Gastos en efectivo</span><strong className="text-rose-600">{soles(res.egresos.efectivo)}</strong></div>
            <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold">Debe haber en caja</span><strong className="text-lg">{soles(esperado)}</strong></div>
            <div className="flex justify-between"><span className="font-bold">Hay en caja</span><strong className="text-lg">{efectivo === "" ? "—" : soles(contado)}</strong></div>
            {efectivo !== "" && (
              <div
                className={`mt-1 p-3 rounded-xl text-sm font-black text-center ${
                  !hayDif ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : dif > 0 ? "bg-amber-50 text-amber-800 border border-amber-300" : "bg-rose-50 text-rose-700 border border-rose-300"
                }`}
              >
                {!hayDif ? "✓ La caja cuadra" : `${dif > 0 ? "Sobran" : "Faltan"} ${soles(Math.abs(dif))}`}
              </div>
            )}
          </div>

          {hayDif && (
            <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-4 space-y-3">
              <p className="text-sm font-black text-amber-900">
                {difGrande ? "⚠️ La diferencia es grande. " : ""}Confirma antes de cerrar
              </p>
              <p className="text-xs text-amber-900">
                El sistema esperaba {soles(esperado)} y escribiste {soles(contado)}. Si fue un error de tipeo (ej. un cero de más), corrígelo arriba.
              </p>
              <label className="block">
                <span className="text-xs font-bold text-amber-900">Vuelve a escribir el efectivo contado</span>
                <CampoNumero
                  type="number"
                  step="0.10"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-xl border-2 text-lg font-black ${
                    confirmar === "" ? "border-amber-300" : r2(confirmar) === contado ? "border-emerald-500" : "border-rose-500"
                  }`}
                />
              </label>
              <div>
                <span className="text-xs font-bold text-amber-900">Motivo de la diferencia</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {MOTIVOS_DIFERENCIA.map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMotivo(m)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${motivo === m ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-amber-300 text-amber-900"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {motivo && (
                  <input
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    placeholder={motivo === "Otro" ? "Explica qué pasó *" : "Detalle (opcional)"}
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-amber-300 text-sm bg-white"
                  />
                )}
              </div>
              <p className="text-[11px] text-amber-800">La diferencia queda registrada en el historial de caja para administración.</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Efectivo que dejas para el siguiente turno</span>
              <CampoNumero
                type="number"
                min="0"
                step="0.10"
                value={siguiente}
                onChange={(e) => setSiguiente(e.target.value)}
                className="mt-1 w-full px-4 py-2 rounded-xl border border-slate-300 text-lg font-black"
              />
            </label>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Entregas a administración</span>
              <strong className="text-blue-700">{soles(entrega)}</strong>
            </div>
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <button
              disabled={enviando}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-60 text-white font-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-5 h-5" /> {enviando ? "Cerrando…" : "Cerrar mi caja"}
            </button>
          </div>
        </div>
      </form>
    </PantallaCompleta>
  );
};

// ------------------------------------------------------------
// Detalle de un turno (cerrado o abierto)
// ------------------------------------------------------------
const DetalleTurno = ({ id, onVolver }) => {
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api(`/turnos-caja/${id}`).then(setT).catch((e) => setError(e.message));
  }, [id]);

  return (
    <PantallaCompleta
      titulo={t ? `Turno #${t.id} · ${t.openedBy}` : "Detalle del turno"}
      subtitulo={t ? `${fechaCorta(t.openedAt)} · ${hora(t.openedAt)} a ${t.closedAt ? hora(t.closedAt) : "en curso"}` : ""}
      onVolver={onVolver}
      acciones={
        <span className="flex items-center gap-1.5">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <BotonesDescarga nombre={t ? `Turno_${t.id}_${t.openedBy}` : "Turno_caja"} />
        </span>
      }
    >
      {error && <p className="text-rose-600 font-bold">{error}</p>}
      {!t ? (
        !error && <p className="text-slate-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Recibió del turno anterior" value={soles(t.receivedCash)} />
            <Kpi label="Contó al abrir" value={soles(t.openingCash)} hint={Math.abs(t.openingDifference) >= 0.01 ? `Diferencia ${soles(t.openingDifference)}` : "Sin diferencia"} />
            <Kpi label="Efectivo esperado" value={soles(t.expectedCash)} tone="blue" />
            <Kpi
              label="Efectivo contado al cerrar"
              value={t.countedCash != null ? soles(t.countedCash) : "—"}
              tone={t.difference == null ? "slate" : Math.abs(t.difference) < 0.01 ? "green" : "red"}
              hint={t.difference != null ? (Math.abs(t.difference) < 0.01 ? "Cuadra" : `Diferencia ${soles(t.difference)}`) : "Turno en curso"}
            />
            <Kpi label="Total cobrado" value={soles(t.summary.totalIngresos)} tone="green" hint={`${t.summary.operaciones} operaciones`} />
            <Kpi label="Total gastos" value={soles(t.summary.totalEgresos)} tone="red" />
            <Kpi label="Entregó a administración" value={t.deliveredCash != null ? soles(t.deliveredCash) : "—"} />
            <Kpi label="Dejó para el siguiente turno" value={t.nextShiftCash != null ? soles(t.nextShiftCash) : "—"} />
          </div>
          <ResumenMetodos resumen={t.summary} />
          {(t.openingNote || t.closingNote) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 space-y-1">
              {t.openingNote && <p><strong>Al abrir:</strong> {t.openingNote}</p>}
              {t.closingNote && <p><strong>Al cerrar ({t.closedBy}):</strong> {t.closingNote}</p>}
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3">Movimientos del turno</h3>
            <TablaMovimientos movimientos={t.movements || []} />
          </div>
        </>
      )}
    </PantallaCompleta>
  );
};

// ------------------------------------------------------------
// Meta del mes del turno (recepción) — resumen
// ------------------------------------------------------------
// Meta de cobro SOLO del turno de quien está en caja (o del usuario de recepción):
// una tarjeta pequeña al costado de la caja
const MetaDelTurno = ({ turnoId }) => {
  const [metas, setMetas] = useState([]);
  useEffect(() => {
    api(`/metas/metas?mes=${hoyISO().slice(0, 7)}`)
      .then((m) => setMetas(m.filter((x) => x.type === "recepcion")))
      .catch(() => setMetas([]));
  }, [turnoId]);
  // Con caja abierta: la meta de ese turno. Sin caja: solo si la persona tiene un único turno (recepción)
  const m = turnoId ? metas.find((x) => x.receptionShiftId === turnoId) : metas.length === 1 ? metas[0] : null;
  if (!m) return null;
  const p = m.progress;
  return (
    <div className="rd-levanta lg:w-80 shrink-0 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 space-y-2">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow"><CjTarget className="w-5 h-5" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] font-black uppercase tracking-wide text-amber-700">Meta de tu turno · mes</span>
          <span className="block text-sm font-black text-slate-900 truncate">{m.name}</span>
        </span>
        <span className="relative">
          <Anillo pct={p.porcentaje} clase={p.cumplida ? "text-emerald-600" : "text-amber-600"} tam={40} />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-800">{p.porcentaje}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${p.cumplida ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${p.porcentaje}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        <div><span className="text-slate-400 font-bold block">Falta</span><strong className="text-rose-600 text-xs">{soles(p.faltante)}</strong></div>
        <div><span className="text-slate-400 font-bold block">Por día</span><strong className="text-xs">{soles(p.necesarioPorDia)}</strong></div>
        <div><span className="text-slate-400 font-bold block">Hoy</span><strong className="text-emerald-600 text-xs">{soles(p.hoy)}</strong></div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// Módulo principal
// ------------------------------------------------------------
export const CashShiftsModule = () => {
  const { currentUser, cashShift, refreshCashShift } = useGym();
  const [vista, setVista] = useState(null); // abrir | cerrar | movimiento | {detalle:id}
  const [historial, setHistorial] = useState([]);
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState("");

  const puedeAbrir = userCan(currentUser, "cash", "crear") || userCan(currentUser, "finance", "crear");
  const puedeCerrar = userCan(currentUser, "cash", "editar") || userCan(currentUser, "finance", "editar");
  const abierto = cashShift?.open || null;
  const ultimo = cashShift?.lastClosed || null;
  const movimientos = cashShift?.openMovements || [];

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      setHistorial(await api(`/turnos-caja?desde=${desde}&hasta=${hasta}`));
    } catch (e) {
      setAviso(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    refreshCashShift();
  }, []);
  useEffect(() => {
    cargarHistorial();
  }, [desde, hasta, cashShift?.open?.id, cashShift?.lastClosed?.id]);

  // Totales del periodo (todos los turnos listados)
  const totales = useMemo(() => {
    const t = { efectivo: 0, yape_plin: 0, tarjeta: 0, transferencia: 0, gastos: 0, diferencia: 0, entregado: 0 };
    historial.forEach((h) => {
      Object.keys(METODOS).forEach((k) => (t[k] += h.summary.ingresos[k] || 0));
      t.gastos += h.summary.totalEgresos || 0;
      t.diferencia += h.difference || 0;
      t.entregado += h.deliveredCash || 0;
    });
    Object.keys(t).forEach((k) => (t[k] = r2(t[k])));
    return t;
  }, [historial]);

  const terminar = (texto) => {
    setVista(null);
    setAviso(texto);
    refreshCashShift();
    setTimeout(() => setAviso(""), 6000);
  };

  if (vista === "abrir")
    return <AbrirCaja ultimo={ultimo} onVolver={() => setVista(null)} onAbierta={() => terminar("Caja abierta. ¡Buen turno!")} />;
  if (vista === "cerrar" && abierto)
    return (
      <CerrarCaja
        turno={abierto}
        onVolver={() => setVista(null)}
        onCerrada={(t) => {
          terminar(`Caja cerrada. Dejaste ${soles(t.nextShiftCash)} para el siguiente turno.`);
          setVista({ detalle: t.id });
        }}
      />
    );
  if (vista === "movimiento" && abierto)
    return <MovimientoTurno turno={abierto} onVolver={() => setVista(null)} onGuardado={() => terminar("Movimiento guardado en el turno.")} />;
  if (vista?.detalle) return <DetalleTurno id={vista.detalle} onVolver={() => setVista(null)} />;

  const mio = abierto && abierto.openedByUserId === String(currentUser?.id);

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="rd-portada rd-cabecera">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
              <Vault className="w-4 h-4" /> Caja
            </span>
            <h1 className="text-2xl font-black mt-1">Arqueo de caja</h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Cada recepcionista abre y cierra su caja. Las ventas y matrículas se suman solas al turno abierto.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refreshCashShift();
                cargarHistorial();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
            </button>
            {abierto ? (
              <>
                {puedeAbrir && (
                  <button
                    onClick={() => setVista("movimiento")}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Ingreso / gasto
                  </button>
                )}
                {puedeCerrar && (
                  <button
                    onClick={() => setVista("cerrar")}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" /> Cerrar caja (arqueo)
                  </button>
                )}
              </>
            ) : (
              puedeAbrir && (
                <button
                  onClick={() => setVista("abrir")}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-black text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <LockOpen className="w-4 h-4" /> Abrir mi caja
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {aviso && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold">{aviso}</div>
      )}
      {cashShift?.unassigned > 0 && userCan(currentUser, "finance", "ver") && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Hay <strong>{cashShift.unassigned}</strong> movimiento(s) de las últimas 24 h registrados con la caja cerrada (no pertenecen a
          ningún turno). Revísalos en Finanzas & Caja.
        </div>
      )}

      {/* Estado actual */}
      {abierto ? (
        <>
          <div className="flex flex-col lg:flex-row gap-3">
          <div className="rd-caja-abierta flex-1 min-w-0 relative overflow-hidden rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg">
                <LockOpen className="w-7 h-7" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-white animate-ping" />
              </div>
              <div>
                <span className="text-xs font-black uppercase text-emerald-600">Caja abierta {mio ? "· tu turno" : ""}</span>
                <h3 className="text-lg font-black text-slate-900">{abierto.openedBy}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Desde las {hora(abierto.openedAt)} del {fechaCorta(abierto.openedAt)} ·{" "}
                  {duracion(abierto.openedAt)}
                </p>
              </div>
            </div>
            {!mio && (
              <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 max-w-md">
                Esta caja la abrió <strong>{abierto.openedBy}</strong>. Si empieza tu turno, ciérrala con el arqueo y luego abre la tuya:
                así cada uno responde por su dinero.
              </p>
            )}
          </div>
          <MetaDelTurno turnoId={abierto.receptionShiftId || null} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              label="Efectivo al abrir"
              value={soles(abierto.openingCash)}
              hint={
                Math.abs(abierto.openingDifference) >= 0.01
                  ? `Recibió ${soles(abierto.receivedCash)} (dif. ${soles(abierto.openingDifference)})`
                  : `Recibido del turno anterior`
              }
            />
            <Kpi label="+ Cobros en efectivo" value={soles(abierto.summary.ingresos.efectivo)} tone="green" />
            <Kpi label="− Gastos en efectivo" value={soles(abierto.summary.egresos.efectivo)} tone="red" />
            <Kpi label="Debe haber en caja" value={soles(abierto.expectedCash)} tone="blue" big />
          </div>
          <ResumenMetodos resumen={abierto.summary} />
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Total cobrado en el turno" value={soles(abierto.summary.totalIngresos)} tone="green" />
            <Kpi label="Ventas" value={abierto.summary.ventas} />
            <Kpi label="Matrículas / renovaciones" value={abierto.summary.matriculas} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3">Movimientos de este turno</h3>
            <TablaMovimientos movimientos={movimientos} />
          </div>
        </>
      ) : (
        <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 min-w-0 bg-white rounded-2xl border-2 border-dashed border-slate-300 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-black uppercase text-slate-500">Caja cerrada</span>
              <h3 className="text-lg font-black text-slate-900">Nadie tiene la caja abierta</h3>
              <p className="text-sm text-slate-500">
                {ultimo
                  ? `Último cierre: ${ultimo.closedBy}, ${fechaCorta(ultimo.closedAt)} a las ${hora(ultimo.closedAt)} · dejó ${soles(
                      ultimo.nextShiftCash,
                    )} en caja.`
                  : "Aún no hay turnos registrados."}{" "}
                Para cobrar en recepción primero abre tu caja.
              </p>
            </div>
          </div>
          {puedeAbrir && (
            <button
              onClick={() => setVista("abrir")}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-2 cursor-pointer"
            >
              <LockOpen className="w-5 h-5" /> Abrir mi caja
            </button>
          )}
        </div>
        <MetaDelTurno turnoId={null} />
        </div>
      )}

      {/* Turnos del periodo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Turnos {desde === hasta && desde === hoyISO() ? "de hoy" : "del periodo"}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300" />
            <span className="text-slate-400">a</span>
            <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-300" />
          </div>
        </div>

        {historial.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-6">No hay turnos en estas fechas.</p>
        ) : (
          <>
            <div className="space-y-2">
              {historial.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setVista({ detalle: h.id })}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 grid grid-cols-2 md:grid-cols-6 gap-3 items-center cursor-pointer"
                >
                  <div className="col-span-2 flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        h.status === "abierto" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-sm text-slate-900 block">{h.openedBy}</strong>
                      <span className="text-xs text-slate-500">
                        {fechaCorta(h.openedAt)} · {hora(h.openedAt)} – {h.closedAt ? hora(h.closedAt) : "en curso"}
                        {h.closedBy && h.closedBy !== h.openedBy ? ` (cerró ${h.closedBy})` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-xs text-slate-400 block">Cobrado</span>
                    <strong className="text-emerald-600">{soles(h.summary.totalIngresos)}</strong>
                  </div>
                  <div className="text-sm">
                    <span className="text-xs text-slate-400 block">Efectivo esperado</span>
                    <strong>{soles(h.expectedCash)}</strong>
                  </div>
                  <div className="text-sm">
                    <span className="text-xs text-slate-400 block">Contado</span>
                    <strong>{h.countedCash != null ? soles(h.countedCash) : "—"}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {h.status === "abierto" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">Abierta</span>
                    ) : (
                      <Diferencia valor={h.difference} />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-3 border-t border-slate-100 text-sm">
              {[
                ["Efectivo", totales.efectivo],
                ["Yape / Plin", totales.yape_plin],
                ["Tarjeta", totales.tarjeta],
                ["Transferencia", totales.transferencia],
                ["Gastos", -totales.gastos],
                ["Entregado a adm.", totales.entregado],
                ["Diferencias", totales.diferencia],
              ].map(([l, v]) => (
                <div key={l} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 font-bold block">{l}</span>
                  <strong className={v < 0 ? "text-rose-600" : "text-slate-900"}>{soles(v)}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
