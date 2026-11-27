// =====================================================================
// Registro de ingreso de caja (Finanzas & Caja)
// Mismo estilo que el registro de gastos: se elige el tipo de ingreso con
// tarjetas, se puede enlazar al alumno, calcular por sesiones y elegir el
// medio de pago. Al final se ve un resumen de lo que entrará a caja.
//
// Servicios de profesionales (personal training, fisioterapia, nutrición):
// el profesional (por su código, ej. 1-COACH) atiende a un socio (por su
// código) o a una persona externa. Se cobra sesiones × precio y a CAJA solo
// entra el % del gimnasio ("derecho de piso", editable); el resto es del
// profesional. Se imprime una boleta con el reparto.
// =====================================================================
import { CampoNumero } from "../common/CampoNumero";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, X, CheckCircle2, Info, Receipt, Printer, UserPlus, Users, Percent, ChevronDown, Search, Download, MessageCircle, BadgeCheck } from "lucide-react";
import { imprimirBoleta, descargarBoletaPdf, boletaPorWhatsApp } from "../../utils/boleta";
import { useGym } from "../../context/GymContext";
import { SelectorAlumno } from "../common/BuscarAlumno";
import { coincidePersonal } from "../../utils/buscarPersona";
import { IconoEmoji } from "../common/IconoEmoji";

export const TIPOS_INGRESO = {
  membership: { icono: "🏋️", titulo: "Membresía / matrícula", sub: "Cuotas, inscripción, carnet", conAlumno: true, concepto: "Pago de membresía" },
  day_pass: { icono: "🎟️", titulo: "Pase del día", sub: "Entrena un día · sin registrar datos", conAlumno: false, concepto: "Pase del día" },
  personal_training: { icono: "🧑‍🏫", titulo: "Personal training", sub: "Entrenador + % del gimnasio", conAlumno: true, sesiones: true, servicio: "trainer", pct: "pct_gym_entrenamiento", quien: "entrenador", concepto: "Personal training" },
  physiotherapy: { icono: "🩺", titulo: "Fisioterapia", sub: "Fisioterapeuta + % del gimnasio", conAlumno: true, sesiones: true, servicio: "physiotherapist", pct: "pct_gym_fisioterapia", quien: "fisioterapeuta", concepto: "Fisioterapia" },
  nutrition: { icono: "🥗", titulo: "Nutrición", sub: "Nutricionista + % del gimnasio", conAlumno: true, sesiones: true, servicio: "nutritionist", pct: "pct_gym_nutricion", quien: "nutricionista", concepto: "Nutrición" },
  other: { icono: "➕", titulo: "Otro ingreso", sub: "Alquiler, eventos, aporte a caja", conAlumno: false, concepto: "" },
};

const AVISO = {
  membership: "Para matricular o renovar a un alumno usa Alumnos / Socios: así su membresía queda activa y el pago enlazado. Aquí registra pagos sueltos (inscripción, carnet, cuota atrasada).",
  day_pass: "Para quien entrena un solo día (visita, turista, sesión suelta). No hace falta registrar sus datos: solo elige el pase y el monto.",
  personal_training: "El entrenador cobra sus sesiones; a caja solo entra el porcentaje del gimnasio (derecho de piso). El resto le corresponde al entrenador.",
  physiotherapy: "Sirve para socios o pacientes externos. A caja entra solo el porcentaje del gimnasio; el resto es del fisioterapeuta.",
  nutrition: "Sirve para socios o personas externas. A caja entra solo el porcentaje del gimnasio; el resto es de la nutricionista.",
};

// Conceptos rápidos por tipo de ingreso (un clic llena el concepto)
const CONCEPTOS_MEMBRESIA = ["Inscripción / matrícula", "Cuota mensual", "Cuota atrasada", "Adelanto de membresía", "Saldo pendiente", "Carnet de acceso", "Reposición de carnet"];
const CONCEPTOS_PASE = ["Pase del día", "Sesión libre", "Clase grupal suelta", "Pase con instructor"];
const MONTOS_PASE = [5, 8, 10, 15, 20];
const OTROS_RAPIDOS = ["Aporte / fondo para caja", "Alquiler de espacio", "Evento / clase especial", "Carnet o tarjeta", "Casillero", "Toalla / candado", "Donación o patrocinio"];

const METODOS = [
  ["efectivo", "💵", "Efectivo"],
  ["yape_plin", "📱", "Yape / Plin"],
];

const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

const NOMBRE_CARGO = { trainer: "Entrenador", physiotherapist: "Fisioterapeuta", nutritionist: "Nutricionista" };

const ChipCodigo = ({ c }) => (
  <span className={`font-mono text-[11px] font-black rounded px-1.5 border ${c.external ? "text-amber-800 bg-amber-50 border-amber-200" : "text-violet-700 bg-violet-50 border-violet-200"}`}>
    {c.staffCode || "—"}
  </span>
);

/** Desplegable con buscador: por nombre, código (1-COACH, 2-EXT) o DNI */
const SelectorProfesional = ({ opciones, value, onChange, quien }) => {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const fuera = (e) => ref.current && !ref.current.contains(e.target) && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);
  const t = q.trim().toLowerCase().replace(/[\s-]+/g, "");
  const lista = opciones.filter((c) => !t || coincidePersonal(c, q));
  const elegir = (c) => {
    onChange(c);
    setAbierto(false);
    setQ("");
  };
  return (
    <div ref={ref} className="relative w-full max-w-md">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-white text-left text-sm cursor-pointer ${value ? "border-emerald-400" : "border-slate-300"}`}
      >
        {value ? (
          <>
            <ChipCodigo c={value} /> <span className="font-bold text-slate-900 truncate">{value.fullName}</span>
          </>
        ) : (
          <span className="text-slate-400">Elige al {quien} (nombre o código)</span>
        )}
        <ChevronDown className={`ml-auto w-4 h-4 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (lista[0]) elegir(lista[0]);
                }
              }}
              placeholder="Buscar: nombre, 1-COACH, 2-EXT o DNI"
              className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto mt-1">
            {lista.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => elegir(c)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm cursor-pointer hover:bg-emerald-50 ${value?.id === c.id ? "bg-emerald-50" : ""}`}
              >
                <ChipCodigo c={c} /> <span className="font-semibold text-slate-800 truncate">{c.fullName}</span>
                {c.external && <span className="ml-auto text-[10px] font-black text-amber-700">EXTERNO</span>}
              </button>
            ))}
            {!lista.length && <p className="text-xs text-slate-500 p-2">Nadie coincide. Si es externo, regístralo abajo.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export const RegistroIngreso = ({ onCerrar, onGuardar }) => {
  const { members = [], staffContracts = [], profesionalesExternos = [], addProfesionalExterno, gymConfig = {}, saveGymConfig, currentUser } = useGym();
  const [hecho, setHecho] = useState(null); // boleta del ingreso recién guardado
  const [nuevoExt, setNuevoExt] = useState(null); // { nombre, dni, celular } al registrar un externo
  // Servicio de profesional
  const [profesional, setProfesional] = useState(null); // contrato del personal
  const [clienteTipo, setClienteTipo] = useState("socio"); // socio | externo
  const [externo, setExterno] = useState({ nombre: "", celular: "" });
  const [pct, setPct] = useState("");
  const [pctGuardado, setPctGuardado] = useState(false);
  const [tipo, setTipo] = useState(null); // sin tipo elegido: lo elige quien registra
  const [monto, setMonto] = useState("");
  const [sesiones, setSesiones] = useState("1");
  const [precioSesion, setPrecioSesion] = useState("");
  const [concepto, setConcepto] = useState("");
  const [conceptoTocado, setConceptoTocado] = useState(false);
  const [metodo, setMetodo] = useState("efectivo");
  const [comprobante, setComprobante] = useState("");
  const [busca, setBusca] = useState("");
  const [alumno, setAlumno] = useState(null);
  const [error, setError] = useState("");

  const T = TIPOS_INGRESO[tipo] || { titulo: "", icono: "", concepto: "" };
  const porSesiones = !!T.sesiones && Number(precioSesion) > 0;
  const cobrado = porSesiones ? Math.round(Number(sesiones || 0) * Number(precioSesion) * 100) / 100 : Number(monto) || 0;
  const esServicio = !!T.servicio;
  const pctDefecto = Number(gymConfig?.[T.pct] ?? 30) || 30;
  const pctNum = esServicio ? Math.min(100, Math.max(0, pct === "" ? pctDefecto : Number(pct))) : 100;
  const total = esServicio ? Math.round(cobrado * pctNum) / 100 : cobrado; // lo que entra a caja
  const paraProfesional = Math.round((cobrado - total) * 100) / 100;
  useEffect(() => {
    setPct("");
    setProfesional(null);
    setNuevoExt(null);
    setPctGuardado(false);
  }, [tipo]);
  const deEseCargo = useMemo(() => {
    const vistos = new Set();
    return [...staffContracts, ...profesionalesExternos].filter(
      (c) => c.role === T.servicio && c.status !== "terminated" && !vistos.has(c.staffCode || c.dni) && vistos.add(c.staffCode || c.dni),
    );
  }, [staffContracts, profesionalesExternos, T.servicio]);
  const nombreProf = profesional?.fullName || "";
  const registrarExterno = () => {
    const nombre = String(nuevoExt?.nombre || "").trim();
    if (nombre.length < 3) return setError("Escribe el nombre del profesional externo.");
    if (nuevoExt.dni && !/^\d{8}$/.test(nuevoExt.dni)) return setError("El DNI debe tener 8 dígitos (o déjalo vacío).");
    const c = addProfesionalExterno({
      fullName: nombre,
      dni: nuevoExt.dni || "",
      phone: nuevoExt.celular || "",
      role: T.servicio,
      roleTitle: `${NOMBRE_CARGO[T.servicio] || "Profesional"} externo`,
    });
    setProfesional(c);
    setNuevoExt(null);
    setError("");
  };
  const nombreCliente = clienteTipo === "socio" ? alumno?.fullName : externo.nombre.trim();

  const sugerido = useMemo(() => {
    const base = T.concepto || "";
    const ses = porSesiones ? ` (${sesiones} ${Number(sesiones) === 1 ? "sesión" : "sesiones"} × ${soles(precioSesion)})` : "";
    if (T.servicio) {
      const prof = profesional ? `${profesional.fullName}${profesional.staffCode ? ` [${profesional.staffCode}]` : ""}` : "—";
      const cli = clienteTipo === "socio" ? (alumno ? `${alumno.fullName} [${alumno.codeLabel}]` : "—") : `${externo.nombre.trim() || "—"} (externo)`;
      return `${base}${ses}: ${prof} → ${cli} · cobrado ${soles(cobrado)} · gimnasio ${pctNum}% = ${soles(total)} · ${T.quien} ${soles(paraProfesional)}`;
    }
    return `${base}${ses}${alumno ? ` — ${alumno.fullName}` : ""}`.trim();
  }, [T, porSesiones, sesiones, precioSesion, alumno, profesional, clienteTipo, externo, cobrado, pctNum, total, paraProfesional]);
  const conceptoFinal = conceptoTocado ? concepto : sugerido;

  const elegirTipo = (k) => {
    setTipo(k);
    setError("");
    if (!TIPOS_INGRESO[k].conAlumno) setAlumno(null);
    if (!TIPOS_INGRESO[k].sesiones) setPrecioSesion("");
    if (!conceptoTocado) setConcepto("");
  };

  const guardar = (e) => {
    e.preventDefault();
    setError("");
    if (!tipo) return setError("Elige de qué es el ingreso.");
    if (esServicio) {
      if (!nombreProf) return setError(`Elige al ${T.quien} que da el servicio.`);
      if (!nombreCliente) return setError(clienteTipo === "socio" ? "Elige al socio (por su código)." : "Escribe el nombre de la persona externa.");
      if (!(cobrado > 0)) return setError("Escribe las sesiones y el precio por sesión.");
    }
    if (!(total > 0) && !(esServicio && cobrado > 0)) return setError("Escribe el monto que entra a caja.");
    if (!conceptoFinal.trim()) return setError("Escribe el concepto del ingreso.");
    const numero = comprobante.trim() || `B-${Date.now().toString().slice(-7)}`;
    onGuardar({
      type: "income",
      category: tipo,
      amount: total,
      paymentMethod: metodo,
      description: conceptoFinal.trim().slice(0, 250),
      receiptNumber: numero,
      relatedMemberId: T.conAlumno && clienteTipo === "socio" ? alumno?.id : undefined,
      relatedMemberName: esServicio ? nombreCliente : alumno?.fullName,
    });
    const cliente = esServicio
      ? `${nombreCliente}${clienteTipo === "socio" && alumno?.codeLabel ? ` (${alumno.codeLabel})` : " (externo)"}`
      : alumno
        ? `${alumno.fullName}${alumno.codeLabel ? ` (${alumno.codeLabel})` : ""}`
        : "";
    setHecho({
      gym: gymConfig?.gym_nombre || "nuestro gimnasio",
      ruc: gymConfig?.gym_ruc,
      direccion: gymConfig?.gym_direccion,
      numero,
      fecha: new Date().toLocaleString("es-PE"),
      concepto: conceptoFinal.trim(),
      cliente,
      profesional: esServicio ? `${nombreProf}${profesional?.staffCode ? ` (${profesional.staffCode})` : ""}` : "",
      lineas: porSesiones ? [{ texto: `${sesiones} ${Number(sesiones) === 1 ? "sesión" : "sesiones"} × ${soles(precioSesion)}`, monto: cobrado }] : [],
      total: esServicio ? cobrado : total,
      metodo: METODOS.find((m) => m[0] === metodo)?.[2],
      reparto: esServicio ? { pct: pctNum, gimnasio: total, quien: T.quien.charAt(0).toUpperCase() + T.quien.slice(1), montoProfesional: paraProfesional } : null,
      celular: esServicio ? (clienteTipo === "socio" ? alumno?.phone : externo.celular) : alumno?.phone,
      entraCaja: total,
    });
  };

  const otroIngreso = () => {
    setHecho(null);
    setMonto("");
    setSesiones("1");
    setPrecioSesion("");
    setConcepto("");
    setConceptoTocado(false);
    setComprobante("");
    setAlumno(null);
    setProfesional(null);
    setExterno({ nombre: "", celular: "" });
  };

  if (hecho) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
        <div className="w-full max-w-md mx-auto min-h-full bg-white p-6 space-y-4 text-slate-800 text-center">
          <BadgeCheck className="w-14 h-14 text-emerald-500 mx-auto" />
          <div>
            <h3 className="text-lg font-black text-slate-900">Ingreso registrado</h3>
            <p className="text-sm text-slate-500">Entró a caja {soles(hecho.entraCaja)} · {hecho.metodo}</p>
          </div>
          <div className="text-left rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1">
            <p className="text-xs font-black uppercase text-slate-500">Boleta N° {hecho.numero}</p>
            <p className="font-bold text-slate-900">{hecho.concepto}</p>
            {hecho.cliente && <p className="text-slate-600">Cliente: {hecho.cliente}</p>}
            {hecho.profesional && <p className="text-slate-600">Profesional: {hecho.profesional}</p>}
            <p className="text-2xl font-black text-emerald-700 pt-1">{soles(hecho.total)}</p>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase">Entregar boleta al cliente</p>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => imprimirBoleta(hecho)} className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-400 text-xs font-bold cursor-pointer">
              <Printer className="w-5 h-5" /> Imprimir
            </button>
            <button type="button" onClick={() => descargarBoletaPdf(hecho)} className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-400 text-xs font-bold cursor-pointer">
              <Download className="w-5 h-5" /> PDF
            </button>
            <button type="button" onClick={() => boletaPorWhatsApp(hecho, hecho.celular)} className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-400 text-emerald-800 text-xs font-bold cursor-pointer">
              <MessageCircle className="w-5 h-5" /> WhatsApp
            </button>
          </div>
          {!hecho.celular && <p className="text-[11px] text-slate-400">Sin celular registrado: WhatsApp te deja elegir el chat.</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={otroIngreso} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
              Registrar otro
            </button>
            <button type="button" onClick={onCerrar} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black cursor-pointer">
              Listo
            </button>
          </div>
        </div>
      </div>
    );
  }

  const campo = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
      <form onSubmit={guardar} className="w-full max-w-3xl mx-auto min-h-full bg-white p-5 sm:p-7 space-y-5 text-slate-800">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Caja & ingresos del gimnasio</span>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Registro de ingreso
            </h3>
          </div>
          <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Tipo */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800">1. ¿De qué es el ingreso? *</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(TIPOS_INGRESO).map(([k, t]) => (
              <button
                key={k}
                type="button"
                onClick={() => elegirTipo(k)}
                className={`text-left rounded-2xl border-2 p-3 cursor-pointer transition-all ${
                  tipo === k ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-emerald-300"
                }`}
              >
                <span className="text-2xl leading-none"><IconoEmoji e={t.icono} /></span>
                <span className={`block mt-1.5 text-sm font-black ${tipo === k ? "text-emerald-800" : "text-slate-900"}`}>{t.titulo}</span>
                <span className="block text-[11px] text-slate-500">{t.sub}</span>
              </button>
            ))}
          </div>
          {AVISO[tipo] && (
            <p className="flex gap-2 text-xs text-sky-900 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
              <Info className="w-4 h-4 shrink-0 text-sky-600" /> {AVISO[tipo]}
            </p>
          )}
        </div>

        {!tipo ? (
          <p className="text-sm font-bold text-slate-500 text-center py-6 rounded-2xl border border-dashed border-slate-300">👆 Elige de qué es el ingreso para continuar.</p>
        ) : (
          <>
        {/* 2. Profesional (servicios) */}
        {esServicio && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-800">2. ¿Qué {T.quien} da el servicio? *</p>
            <div className="flex flex-wrap items-center gap-2">
              <SelectorProfesional opciones={deEseCargo} value={profesional} onChange={setProfesional} quien={T.quien} />
              {!nuevoExt && (
                <button type="button" onClick={() => setNuevoExt({ nombre: "", dni: "", celular: "" })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-amber-400 text-amber-800 text-xs font-bold hover:bg-amber-50 cursor-pointer">
                  <UserPlus className="w-4 h-4" /> Registrar {T.quien} externo
                </button>
              )}
            </div>
            {profesional?.external && (
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <b>{profesional.fullName}</b> es externo. Con el código <b className="font-mono">{profesional.staffCode}</b> marca su entrada en recepción.
              </p>
            )}
            {nuevoExt && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
                <p className="text-xs font-black text-amber-900 uppercase">Nuevo {T.quien} externo · recibirá un código EXT</p>
                <div className="grid sm:grid-cols-3 gap-2">
                  <input value={nuevoExt.nombre} onChange={(e) => setNuevoExt({ ...nuevoExt, nombre: e.target.value })} placeholder="Nombre completo *" className={`${campo} sm:col-span-1`} />
                  <input value={nuevoExt.dni} onChange={(e) => setNuevoExt({ ...nuevoExt, dni: e.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="DNI (opcional)" className={campo} />
                  <input value={nuevoExt.celular} onChange={(e) => setNuevoExt({ ...nuevoExt, celular: e.target.value })} placeholder="Celular (opcional)" className={campo} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setNuevoExt(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white cursor-pointer">Cancelar</button>
                  <button type="button" onClick={registrarExterno} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-black cursor-pointer">Registrar y elegir</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Cliente / alumno */}
        {T.conAlumno && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-800">
              {esServicio ? "3. ¿Para quién es el servicio? *" : <>2. ¿De qué alumno? <span className="font-normal text-slate-500">(opcional)</span></>}
            </p>
            {esServicio && (
              <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1">
                {[["socio", Users, "Socio del gimnasio"], ["externo", UserPlus, "Persona externa"]].map(([k, I, l]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setClienteTipo(k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${clienteTipo === k ? "bg-white text-emerald-800 shadow" : "text-slate-600"}`}
                  >
                    <I className="w-3.5 h-3.5" /> {l}
                  </button>
                ))}
              </div>
            )}
            {(!esServicio || clienteTipo === "socio") && (
              <SelectorAlumno alumnos={members} value={alumno?.id || ""} onChange={(id) => setAlumno(members.find((m) => m.id === id) || null)} vacio={esServicio ? undefined : "-- Sin alumno --"} />
            )}
            {esServicio && clienteTipo === "externo" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={externo.nombre} onChange={(e) => setExterno({ ...externo, nombre: e.target.value })} placeholder="Nombre completo *" className={campo} />
                <input value={externo.celular} onChange={(e) => setExterno({ ...externo, celular: e.target.value })} placeholder="Celular (opcional)" className={campo} />
              </div>
            )}
          </div>
        )}

        {/* 3. Monto */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800">{esServicio ? "4. ¿Cuánto cobra?" : `${T.conAlumno ? "3" : "2"}. ¿Cuánto entra a caja?`} *</p>
          {T.sesiones && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <label className="block text-xs font-bold text-slate-600">
                N° de sesiones
                <CampoNumero type="number" min="1" step="1" value={sesiones} onChange={(e) => setSesiones(e.target.value)} className={`${campo} mt-1`} />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Precio por sesión (S/)
                <CampoNumero type="number" min="0" step="0.1" placeholder="Ej. 40" value={precioSesion} onChange={(e) => setPrecioSesion(e.target.value)} className={`${campo} mt-1`} />
              </label>
              <p className="col-span-2 text-[11px] text-slate-500">Si llenas el precio por sesión, el total se calcula solo. Si no, escribe el monto abajo.</p>
            </div>
          )}
          {tipo === "day_pass" && (
            <div className="flex flex-wrap gap-1.5">
              {MONTOS_PASE.map((n) => (
                <button key={n} type="button" onClick={() => setMonto(String(n))} className={`px-3 py-1.5 rounded-xl border-2 text-sm font-black cursor-pointer ${Number(monto) === n ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"}`}>
                  S/ {n}
                </button>
              ))}
            </div>
          )}
          {porSesiones ? (
            <p className="text-2xl font-black text-slate-800">{soles(cobrado)} <span className="text-sm font-bold text-slate-500">cobrado en total</span></p>
          ) : (
            <div className="flex items-center rounded-xl border-2 border-emerald-300 bg-white px-3 focus-within:ring-2 focus-within:ring-emerald-500 max-w-xs">
              <span className="text-lg font-black text-emerald-700">S/</span>
              <CampoNumero type="number" min="0" step="0.1" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full px-2 py-2.5 text-2xl font-black text-slate-900 bg-transparent focus:outline-none" />
            </div>
          )}
        </div>

        {/* Reparto: % del gimnasio */}
        {esServicio && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Percent className="w-4 h-4 text-emerald-600" /> Para el gimnasio (derecho de piso)</span>
              {[10, 20, 30, 40, 50].map((n) => (
                <button key={n} type="button" onClick={() => setPct(String(n))} className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer border ${pctNum === n ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-700"}`}>
                  {n}%
                </button>
              ))}
              <span className="inline-flex items-center gap-1">
                <CampoNumero type="number" min="0" max="100" step="1" value={pct === "" ? pctDefecto : pct} onChange={(e) => setPct(e.target.value)} className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-sm font-black text-center" />
                <span className="text-sm font-bold text-slate-500">%</span>
              </span>
              {currentUser?.role === "admin" && saveGymConfig && pctNum !== pctDefecto && (
                <button
                  type="button"
                  onClick={async () => {
                    await saveGymConfig({ [T.pct]: pctNum });
                    setPctGuardado(true);
                  }}
                  className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  Usar {pctNum}% siempre para {T.titulo.toLowerCase()}
                </button>
              )}
              {pctGuardado && <span className="text-xs font-bold text-emerald-700">✓ Guardado</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white border-2 border-emerald-300 p-2.5">
                <p className="text-[11px] font-black uppercase text-emerald-700">Gimnasio · entra a caja ({pctNum}%)</p>
                <p className="text-xl font-black text-emerald-700">{soles(total)}</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-2.5">
                <p className="text-[11px] font-black uppercase text-slate-500">Para el {T.quien} ({100 - pctNum}%)</p>
                <p className="text-xl font-black text-slate-800">{soles(paraProfesional)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Medio de pago */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800">{esServicio ? "5" : T.conAlumno ? "4" : "3"}. ¿Cómo pagó?</p>
          <div className="grid grid-cols-2 gap-2">
            {METODOS.map(([k, ic, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMetodo(k)}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-bold cursor-pointer ${metodo === k ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}
              >
                <IconoEmoji e={ic} /> {l}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Detalle */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800">{esServicio ? "6" : T.conAlumno ? "5" : "4"}. Detalle</p>
          {{ membership: CONCEPTOS_MEMBRESIA, day_pass: CONCEPTOS_PASE, other: OTROS_RAPIDOS }[tipo] && (
            <div className="flex flex-wrap gap-1.5">
              {{ membership: CONCEPTOS_MEMBRESIA, day_pass: CONCEPTOS_PASE, other: OTROS_RAPIDOS }[tipo].map((o) => (
                <button key={o} type="button" onClick={() => (setConcepto(o), setConceptoTocado(true))} className="px-2.5 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer">
                  {o}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-xs font-bold text-slate-600 sm:col-span-2">
              Concepto *
              <input
                value={conceptoFinal}
                onChange={(e) => (setConcepto(e.target.value), setConceptoTocado(true))}
                placeholder="Ej. Alquiler del salón para evento de baile"
                className={`${campo} mt-1`}
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              N° de boleta / operación
              <div className="relative mt-1">
                <Receipt className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={comprobante} onChange={(e) => setComprobante(e.target.value)} placeholder="Opcional" className={`${campo} pl-9`} />
              </div>
            </label>
          </div>
        </div>

        {/* Resumen */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-700 space-y-0.5">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Entrará a caja</p>
            <p className="text-3xl font-black text-emerald-700 leading-tight">{soles(total)}</p>
            <p>
              <IconoEmoji e={T.icono} /> {T.titulo} · {METODOS.find((m) => m[0] === metodo)?.[2]}
              {alumno ? ` · ${alumno.fullName}` : ""}
            </p>
            {esServicio && cobrado > 0 && (
              <p className="text-xs text-slate-500">Cobrado {soles(cobrado)} · al {T.quien} {soles(paraProfesional)}</p>
            )}
          </div>
          <CheckCircle2 className={`w-10 h-10 ${total > 0 ? "text-emerald-500" : "text-slate-300"}`} />
        </div>

          </>
        )}

        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Printer className="w-4 h-4" /> Al guardar podrás imprimir, descargar o enviar la boleta
          </span>
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Cancelar
          </button>
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow cursor-pointer flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Registrar entrada en caja
          </button>
        </div>
      </form>
    </div>
  );
};
