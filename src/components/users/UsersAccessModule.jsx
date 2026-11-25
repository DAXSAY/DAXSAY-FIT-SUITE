// ============================================================
// USUARIOS & ACCESOS (solo administración)
// Una cuenta por persona: cada recepcionista, entrenador, etc. entra
// con su propio usuario, así la caja por turnos sabe quién abrió y
// quién cerró. Las cuentas de alumnos se crean desde su ficha.
// ============================================================
import { TarjetaKpi } from "../common/TarjetaKpi";
import { nombreTurno } from "../../utils/turnos";
import { ShieldCheck as IcShield, User as IcUser, Dumbbell as IcDumbbell, HeartPulse as IcHeart, Apple as IcApple, KeyRound as IcKey, Building2 as IcBuilding, Phone as IcPhone, Clock as IcClock, Users as IcUsers, Plus as IcPlus, Info as IcInfo, CalendarClock as IcCalendario } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  UserPlus,
  ArrowLeft,
  KeyRound,
  Power,
  Search,
  Copy,
  CheckCircle2,
  Pencil,
  Share2,
  Lock,
  X,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import { api } from "../../api/cliente";
import { userCan, ROLES } from "../../config/roles";
import { coincideAlumno } from "../../utils/buscarPersona";

const ROLES_PERSONAL = ["admin", "reception", "trainer", "physio", "nutritionist"];
const COLOR_ROL = {
  admin: "var(--rd-rol-morado)",
  reception: "var(--rd-rol-verde)",
  trainer: "var(--rd-rol-naranja)",
  physio: "var(--rd-rol-azul)",
  nutritionist: "var(--rd-rol-rojo)",
};
const fecha = (dt) => (dt ? `${String(dt).slice(8, 10)}/${String(dt).slice(5, 7)}/${String(dt).slice(0, 4)} ${String(dt).slice(11, 16)}` : "Nunca");
const sugerirUsuario = (n, a) =>
  `${n.trim().split(/\s+/)[0] || ""}${a.trim() ? "." + a.trim().split(/\s+/)[0] : ""}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");

const Pantalla = ({ titulo, subtitulo, onVolver, children }) => (
  <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
    <div className="w-full max-w-3xl mx-auto min-h-full p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onVolver}
          className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <div>
          <h2 className="text-lg font-black text-slate-900">{titulo}</h2>
          {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
        </div>
      </div>
      {children}
    </div>
  </div>
);

// Tarjeta con las credenciales para entregar al trabajador
const Credenciales = ({ datos, onListo }) => {
  const [copiado, setCopiado] = useState(false);
  const texto = `RADICAL - tu acceso al sistema\nUsuario: ${datos.usuario}\nContraseña temporal: ${datos.clave}\nAl ingresar el sistema te pedirá cambiarla.`;
  return (
    <Pantalla titulo="Credenciales listas" subtitulo="Entrégalas a la persona. Por seguridad no se volverán a mostrar." onVolver={onListo}>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          <div>
            <h3 className="font-black text-slate-900">{datos.nombre}</h3>
            <p className="text-sm text-slate-500">{datos.rol}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase block">Usuario</span>
            <strong className="text-xl font-mono">{datos.usuario}</strong>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase block">Contraseña temporal</span>
            <strong className="text-xl font-mono">{datos.clave}</strong>
          </div>
        </div>
        <p className="text-sm text-slate-500">En su primer ingreso el sistema le pedirá crear una contraseña propia.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(texto);
              setCopiado(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-4 h-4" /> {copiado ? "Copiado" : "Copiar"}
          </button>
          {datos.telefono && (
            <a
              href={`https://wa.me/51${datos.telefono.replace(/\D/g, "").slice(-9)}?text=${encodeURIComponent(texto)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" /> Enviar por WhatsApp
            </a>
          )}
          <button onClick={onListo} className="ml-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm cursor-pointer">
            Listo
          </button>
        </div>
      </div>
    </Pantalla>
  );
};

// Formulario de alta / edición
const FormUsuario = ({ usuario, onVolver, onGuardado, esUnoMismo }) => {
  const editar = !!usuario;
  const [f, setF] = useState({
    nombres: usuario?.firstName || "",
    apellidos: usuario?.lastName || "",
    dni: usuario?.dni || "",
    telefono: usuario?.phone || "",
    correo: usuario?.email || "",
    titulo: usuario?.title || "",
    rol: usuario?.role || "reception",
    usuario: usuario?.username || "",
    clave: "",
    turnoRecepcion: usuario?.receptionShiftId || "",
    especialidad: usuario?.specialty || "",
    horario: usuario?.schedule || "",
    colegiatura: usuario?.license || "",
    biografia: usuario?.bio || "",
  });
  const [turnos, setTurnos] = useState([]);
  useEffect(() => {
    api("/metas/turnos-recepcion").then(setTurnos).catch(() => setTurnos([]));
  }, []);
  const [usuarioTocado, setUsuarioTocado] = useState(editar);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const cambiar = (k) => (e) => {
    const v = e.target.value;
    setF((p) => {
      const n = { ...p, [k]: v };
      if (!usuarioTocado && (k === "nombres" || k === "apellidos")) n.usuario = sugerirUsuario(n.nombres, n.apellidos);
      return n;
    });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      if (editar) {
        await api(`/usuarios/${usuario.id}`, { method: "PUT", body: f });
        onGuardado(null);
      } else {
        const r = await api("/usuarios", { method: "POST", body: f });
        onGuardado({
          nombre: r.fullName,
          rol: ROLES[r.role]?.label || r.roleName,
          usuario: r.username,
          clave: r.claveTemporal,
          telefono: f.telefono,
        });
      }
    } catch (er) {
      setError(er.message);
    } finally {
      setEnviando(false);
    }
  };

  const campo = "mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <Pantalla
      titulo={editar ? `Editar a ${usuario.fullName}` : "Nuevo usuario del personal"}
      subtitulo="Cada trabajador debe tener su propia cuenta (por ejemplo, una por recepcionista y turno)."
      onVolver={onVolver}
    >
      <form onSubmit={guardar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Nombres *</span>
            <input required value={f.nombres} onChange={cambiar("nombres")} className={campo} />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Apellidos *</span>
            <input required value={f.apellidos} onChange={cambiar("apellidos")} className={campo} />
          </label>
          {!editar && (
            <label className="block">
              <span className="text-sm font-bold text-slate-700">DNI</span>
              <input value={f.dni} onChange={cambiar("dni")} maxLength={8} inputMode="numeric" className={campo} />
            </label>
          )}
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Celular *</span>
            <input required value={f.telefono} onChange={cambiar("telefono")} className={campo} />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Correo</span>
            <input type="email" value={f.correo} onChange={cambiar("correo")} className={campo} />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Cargo visible (opcional)</span>
            <input value={f.titulo} onChange={cambiar("titulo")} placeholder="Ej. Recepción turno mañana" className={campo} />
          </label>
        </div>

        <div>
          <span className="text-sm font-bold text-slate-700">Área / rol *</span>
          <div className="mt-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ROLES_PERSONAL.map((r) => (
              <button
                type="button"
                key={r}
                disabled={esUnoMismo}
                onClick={() => setF({ ...f, rol: r })}
                className={`p-2.5 rounded-xl border text-sm font-bold cursor-pointer disabled:cursor-not-allowed ${
                  f.rol === r ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                }`}
              >
                {ROLES[r]?.label || r}
              </button>
            ))}
          </div>
        </div>

        {f.rol === "reception" && (
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Turno de recepción (para sus metas) *</span>
            <select required value={f.turnoRecepcion} onChange={cambiar("turnoRecepcion")} className={campo}>
              <option value="">Elegir turno…</option>
              {turnos.filter((t) => t.active).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.start && `(${t.start} - ${t.end})`}
                </option>
              ))}
            </select>
          </label>
        )}
        {["trainer", "physio", "nutritionist"].includes(f.rol) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Especialidad</span>
              <input value={f.especialidad} onChange={cambiar("especialidad")} placeholder="Ej. Hipertrofia y fuerza" className={campo} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Horario de atención</span>
              <input value={f.horario} onChange={cambiar("horario")} placeholder="Ej. Lun a Sáb 6:00 - 14:00" className={campo} />
            </label>
            {f.rol !== "trainer" && (
              <label className="block">
                <span className="text-sm font-bold text-slate-700">N° de colegiatura</span>
                <input value={f.colegiatura} onChange={cambiar("colegiatura")} className={campo} />
              </label>
            )}
            <label className="block sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Presentación (la ven los alumnos)</span>
              <textarea rows={2} value={f.biografia} onChange={cambiar("biografia")} className={campo} />
            </label>
          </div>
        )}

        {!editar && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Usuario para ingresar *</span>
              <input
                required
                value={f.usuario}
                onChange={(e) => {
                  setUsuarioTocado(true);
                  setF({ ...f, usuario: e.target.value.toLowerCase() });
                }}
                className={`${campo} font-mono`}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Contraseña temporal</span>
              <input value={f.clave} onChange={cambiar("clave")} placeholder="Vacío = se genera una segura" className={`${campo} font-mono`} />
            </label>
          </div>
        )}

        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button disabled={enviando} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black cursor-pointer">
          {enviando ? "Guardando…" : editar ? "Guardar cambios" : "Crear usuario"}
        </button>
      </form>
    </Pantalla>
  );
};

// ------------------------------------------------------------
// Configuración del gimnasio
// ------------------------------------------------------------
// Bloque con título para la configuración (fuera del formulario para no perder el foco al escribir)
const Seccion = ({ icono: I, titulo, sub, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-5">
    <div className="flex items-center gap-2.5 mb-4">
      <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><I className="w-4 h-4" /></span>
      <div>
        <h3 className="text-sm font-black text-slate-900">{titulo}</h3>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </div>
    {children}
  </section>
);

const ConfiguracionGimnasio = () => {
  const { gymConfig, saveGymConfig } = useGym();
  const [f, setF] = useState({
    gym_nombre: gymConfig.gym_nombre || "",
    gym_whatsapp: gymConfig.gym_whatsapp || "",
    admin_whatsapp: gymConfig.admin_whatsapp || "",
    gym_direccion: gymConfig.gym_direccion || "",
    gym_ruc: gymConfig.gym_ruc || "",
    dias_exalumno: gymConfig.dias_exalumno || "30",
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const campo = "mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm";
  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await saveGymConfig(f);
      setMsg("Configuración guardada.");
    } catch (er) {
      setError(er.message);
    }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const completos = ["gym_nombre", "gym_ruc", "gym_direccion", "gym_whatsapp", "admin_whatsapp"].filter((k) => String(f[k] || "").trim()).length;
  return (
    <form onSubmit={guardar} className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Seccion icono={IcBuilding} titulo="Datos del gimnasio" sub="Salen en tickets, reportes y documentos en PDF.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block"><span className="text-sm font-bold text-slate-700">Nombre del gimnasio</span><input value={f.gym_nombre} onChange={set("gym_nombre")} className={campo} /></label>
            <label className="block"><span className="text-sm font-bold text-slate-700">RUC</span><input value={f.gym_ruc} onChange={set("gym_ruc")} inputMode="numeric" placeholder="11 dígitos" className={campo} /></label>
            <label className="block sm:col-span-2"><span className="text-sm font-bold text-slate-700">Dirección</span><input value={f.gym_direccion} onChange={set("gym_direccion")} placeholder="Av. ..., distrito, ciudad" className={campo} /></label>
          </div>
        </Seccion>
        <Seccion icono={IcPhone} titulo="WhatsApp" sub="Números a los que escriben los alumnos y llegan los reportes.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">WhatsApp de recepción</span>
              <input value={f.gym_whatsapp} onChange={set("gym_whatsapp")} placeholder="9XX XXX XXX" inputMode="tel" className={campo} />
              <span className="text-xs text-slate-500">Los alumnos escriben aquí desde su portal.</span>
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">WhatsApp del administrador / dueño</span>
              <input value={f.admin_whatsapp} onChange={set("admin_whatsapp")} placeholder="9XX XXX XXX" inputMode="tel" className={campo} />
              <span className="text-xs text-slate-500">A este número se envían los reportes.</span>
            </label>
          </div>
        </Seccion>
        <Seccion icono={IcCalendario} titulo="Vencimientos" sub="Desde cuándo un alumno que no renueva cuenta como exalumno (para reportes y avisos).">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-4 items-start">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Días sin renovar</span>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" min="1" max="365" value={f.dias_exalumno} onChange={set("dias_exalumno")} className={`${campo} !mt-0 w-24 text-center font-black`} />
                <span className="text-sm text-slate-600">días</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {[15, 30, 60, 90].map((n) => (
                  <button key={n} type="button" onClick={() => setF({ ...f, dias_exalumno: String(n) })} className={`px-2 py-0.5 rounded-full border text-[11px] font-bold cursor-pointer ${String(f.dias_exalumno) === String(n) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                    {n} d
                  </button>
                ))}
              </div>
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1.5">
              <p><b>✅ Activo:</b> su membresía está vigente.</p>
              <p><b>⏳ Vencido:</b> del día siguiente al vencimiento hasta {f.dias_exalumno || 30} días. Si renueva aquí, cuenta como <b>renovación</b>.</p>
              <p><b>🔁 Exalumno:</b> más de {f.dias_exalumno || 30} días sin renovar. Si vuelve, cuenta como <b>exalumno recuperado</b>.</p>
              <p className="text-slate-500">En los dos casos se renueva con el <b>mismo código</b> del alumno: el DNI lo identifica y nunca se crea otro.</p>
            </div>
          </div>
        </Seccion>
        <div className="flex flex-wrap items-center gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black cursor-pointer">Guardar configuración</button>
          {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        </div>
      </div>

      {/* Vista previa */}
      <aside className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">Así se ve en tickets y mensajes</p>
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
            <img src="/logo-daxsay.svg" alt="" className="rd-logo w-14 h-14 mx-auto mb-2" />
            <p className="text-base font-black text-slate-900 tracking-wide">{f.gym_nombre || "Nombre del gimnasio"}</p>
            <p className="text-xs text-slate-500">{f.gym_ruc ? `RUC ${f.gym_ruc}` : "RUC sin registrar"}</p>
            <p className="text-xs text-slate-500 mt-0.5">{f.gym_direccion || "Dirección sin registrar"}</p>
            <div className="mt-3 pt-3 border-t border-dashed border-slate-200 space-y-1 text-xs">
              <p className="flex items-center justify-center gap-1.5 text-slate-600"><IcPhone className="w-3.5 h-3.5" /> Recepción: <b>{f.gym_whatsapp || "—"}</b></p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-black text-slate-900">Datos completos</p>
            <span className="text-sm font-black text-blue-600">{completos}/5</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(completos / 5) * 100}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {completos === 5 ? "Todo listo: tickets y reportes salen con los datos del gimnasio." : "Completa lo que falta para que tickets y reportes salgan con todos los datos."}
          </p>
        </div>
      </aside>
    </form>
  );
};

// ------------------------------------------------------------
// Turnos fijos de recepción
// ------------------------------------------------------------
const aMinT = (t) => {
  const [h, m] = String(t || "").split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};
const fmtT = (t) => {
  const m = aMinT(t);
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const COLORES_TURNO = ["from-amber-400 to-orange-500", "from-sky-500 to-blue-600", "from-violet-500 to-indigo-600", "from-emerald-500 to-teal-600"];

const TurnosRecepcion = () => {
  const [turnos, setTurnos] = useState([]);
  const [nuevo, setNuevo] = useState({ name: "", start: "", end: "", whatsapp: "" });
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState("");
  const cargar = () => api("/metas/turnos-recepcion").then(setTurnos).catch((e) => setError(e.message));
  useEffect(() => {
    cargar();
  }, []);
  const guardar = async (t) => {
    setError("");
    try {
      await api(`/metas/turnos-recepcion/${t.id}`, { method: "PUT", body: t });
      setGuardado(t.id);
      setTimeout(() => setGuardado(""), 2000);
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };
  const crear = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/metas/turnos-recepcion", { method: "POST", body: nuevo });
      setNuevo({ name: "", start: "", end: "", whatsapp: "" });
      cargar();
    } catch (er) {
      setError(er.message);
    }
  };
  const cambiar = (i, k, v) => setTurnos(turnos.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const campo = "px-3 py-2 rounded-xl border border-slate-300 text-sm";
  // Línea de tiempo de 5 AM a 11 PM
  const T0 = 5 * 60, T1 = 23 * 60;
  const pos = (m) => `${Math.max(0, Math.min(100, ((m - T0) / (T1 - T0)) * 100))}%`;
  const activos = turnos.filter((t) => t.active);
  const cubre = activos.length ? [Math.min(...activos.map((t) => aMinT(t.start) ?? T1)), Math.max(...activos.map((t) => aMinT(t.end) ?? T0))] : null;
  const personas = turnos.reduce((a, t) => a + (t.people?.length || 0), 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-3">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Turnos activos", activos.length, IcClock],
            ["Recepcionistas asignadas", personas, IcUsers],
            ["Atención en recepción", cubre ? `${fmtT(`${Math.floor(cubre[0] / 60)}:${cubre[0] % 60}`)} – ${fmtT(`${Math.floor(cubre[1] / 60)}:${cubre[1] % 60}`)}` : "—", IcBuilding],
          ].map(([t, v, I]) => (
            <div key={t} className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><I className="w-4 h-4" /></span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 truncate">{t}</p>
                <p className="text-base font-black text-slate-900 truncate">{v}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Turnos */}
        {turnos.map((t, i) => {
          const a = aMinT(t.start), b = aMinT(t.end);
          return (
            <div key={t.id} className={`bg-white rounded-2xl border border-slate-200 p-4 ${t.active ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-end gap-3">
                <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${COLORES_TURNO[i % COLORES_TURNO.length]} text-white flex items-center justify-center shrink-0 shadow`}>
                  <IcClock className="w-5 h-5" />
                </span>
                <label className="flex-1 min-w-[180px] text-xs font-bold text-slate-500">
                  Nombre del turno
                  <input value={t.name} onChange={(e) => cambiar(i, "name", e.target.value)} className={`${campo} w-full mt-0.5 font-bold text-slate-900`} />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Desde
                  <input type="time" value={t.start} onChange={(e) => cambiar(i, "start", e.target.value)} className={`${campo} block mt-0.5`} />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Hasta
                  <input type="time" value={t.end} onChange={(e) => cambiar(i, "end", e.target.value)} className={`${campo} block mt-0.5`} />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  WhatsApp del turno
                  <input value={t.whatsapp || ""} onChange={(e) => cambiar(i, "whatsapp", e.target.value)} placeholder="9XX XXX XXX" inputMode="tel" className={`${campo} block mt-0.5 w-36`} title="Número al que escriben los alumnos en este horario (anuncio de renovación)" />
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 pb-2.5 cursor-pointer">
                  <input type="checkbox" checked={t.active} onChange={(e) => cambiar(i, "active", e.target.checked)} className="w-4 h-4" /> Activo
                </label>
                <button onClick={() => guardar(turnos[i])} className="mb-0.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer">
                  {guardado === t.id ? "Guardado" : "Guardar"}
                </button>
              </div>
              {/* línea de tiempo */}
              <div className="mt-3">
                <div className="relative h-2.5 rounded-full bg-slate-100">
                  {a != null && b != null && b > a && (
                    <span className={`absolute top-0 h-full rounded-full bg-gradient-to-r ${COLORES_TURNO[i % COLORES_TURNO.length]}`} style={{ left: pos(a), width: `calc(${pos(b)} - ${pos(a)})` }} />
                  )}
                </div>
                <div className="relative h-4 text-[10px] font-bold text-slate-400 mt-1">
                  {[[5, "5 AM"], [9, "9 AM"], [13, "1 PM"], [17, "5 PM"], [21, "9 PM"], [23, "11 PM"]].map(([h, x]) => (
                    <span key={x} className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: pos(h * 60) }}>{x}</span>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Personas:</span>
                {t.people?.length ? (
                  t.people.map((p) => (
                    <span key={p.id || p.name} className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">{String(p.name || "?")[0]}</span>
                      {p.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Nadie asignado aún (se elige en el usuario de cada recepcionista)</span>
                )}
              </div>
            </div>
          );
        })}
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      </div>

      <aside className="space-y-4">
        <form onSubmit={crear} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><IcPlus className="w-4 h-4 text-blue-600" /> Nuevo turno</h3>
          <label className="block text-xs font-bold text-slate-600">Nombre<input required value={nuevo.name} onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })} placeholder="Turno 3 - Noche" className={`${campo} w-full mt-0.5`} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-600">Desde<input type="time" value={nuevo.start} onChange={(e) => setNuevo({ ...nuevo, start: e.target.value })} className={`${campo} w-full mt-0.5`} /></label>
            <label className="block text-xs font-bold text-slate-600">Hasta<input type="time" value={nuevo.end} onChange={(e) => setNuevo({ ...nuevo, end: e.target.value })} className={`${campo} w-full mt-0.5`} /></label>
          </div>
          <label className="block text-xs font-bold text-slate-600">WhatsApp del turno (opcional)<input value={nuevo.whatsapp} onChange={(e) => setNuevo({ ...nuevo, whatsapp: e.target.value })} placeholder="9XX XXX XXX" inputMode="tel" className={`${campo} w-full mt-0.5`} /></label>
          <button className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black cursor-pointer">Agregar turno</button>
        </form>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2 text-sm text-slate-600">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><IcInfo className="w-4 h-4 text-blue-600" /> Cómo funcionan</h3>
          <p>Cada recepcionista pertenece a un turno; se elige en su usuario.</p>
          <p>Las metas de recepción se asignan por turno y suman todo lo cobrado en las cajas que abren las personas de ese turno.</p>
          <p>En Arqueo de caja cada quien ve solo la meta de su turno.</p>
          <p>Las <b>tareas entre turnos</b> funcionan con todos los turnos activos: si agregas un 3.º, 4.º o 5.º turno, aparece solo para recibir y pasar tareas.</p>
          <p>Se muestran como «Turno Mañana · nombre de la recepcionista».</p>
        </div>
      </aside>
    </div>
  );
};

// ------------------------------------------------------------
// SOCIOS: acceso de cada alumno al portal (usuario = DNI).
// Las claves están cifradas y nadie puede leerlas; desde aquí se
// restablecen al instante (a su DNI, una temporal o una que elijas).
// ------------------------------------------------------------
const SociosAccesos = ({ puedeEditar, onCredenciales }) => {
  const [lista, setLista] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [abierto, setAbierto] = useState(null); // socio al que se le restablece
  const [modo, setModo] = useState("dni");
  const [propia, setPropia] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = () =>
    api("/usuarios/socios")
      .then(setLista)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  useEffect(() => {
    cargar();
  }, []);

  const estado = (a) =>
    !a.hasAccount ? "sin" : !a.active ? "off" : a.locked ? "bloq" : a.mustChangePassword ? "temp" : "ok";
  const ESTADO = {
    sin: ["Sin cuenta", "bg-slate-100 text-slate-600 border-slate-200"],
    off: ["Desactivada", "bg-slate-100 text-slate-500 border-slate-200"],
    bloq: ["Bloqueada (intentos fallidos)", "bg-rose-50 text-rose-700 border-rose-200"],
    temp: ["Clave temporal (aún no la cambia)", "bg-amber-50 text-amber-700 border-amber-200"],
    ok: ["Usa su propia clave", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  };
  const t = buscar.trim().toLowerCase();
  const vistos = lista.filter(
    (a) =>
      (filtro === "todos" || estado(a) === filtro) &&
      (!t || coincideAlumno(a, t) || String(a.username || "").toLowerCase() === t),
  );
  const cuenta = (k) => lista.filter((a) => estado(a) === k).length;

  const restablecer = async () => {
    setError("");
    try {
      const r = await api(`/usuarios/socios/${abierto.id}/clave`, { method: "POST", body: { modo, clave: propia } });
      const a = abierto;
      setAbierto(null);
      setPropia("");
      await cargar();
      onCredenciales({ nombre: a.fullName, rol: `Alumno · ${a.codeLabel}`, usuario: r.usuario, clave: r.claveTemporal, telefono: a.phone });
    } catch (e) {
      setError(e.message);
    }
  };
  const cambiarEstado = async (a) => {
    setError("");
    try {
      await api(`/usuarios/socios/${a.id}/estado`, { method: "PUT", body: { activo: !a.active } });
      setMensaje(a.active ? `${a.fullName} ya no puede entrar al portal.` : `${a.fullName} puede volver a entrar al portal.`);
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900 flex items-start gap-2">
        <Lock className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Por seguridad las contraseñas se guardan <b>cifradas</b>: nadie puede leerlas, ni administración. Si un alumno no puede entrar,
          restablécela aquí y se aplica <b>al instante</b>: su usuario es su DNI y al ingresar el sistema le pedirá crear su propia clave.
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[["todos", "Todos", lista.length], ["ok", "Con su clave", cuenta("ok")], ["temp", "Clave temporal", cuenta("temp")], ["bloq", "Bloqueados", cuenta("bloq")], ["sin", "Sin cuenta", cuenta("sin") + cuenta("off")]].map(([k, l, n]) => (
          <button
            key={k}
            onClick={() => setFiltro(filtro === k ? "todos" : k)}
            className={`text-left bg-white rounded-2xl border p-3 cursor-pointer ${filtro === k ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"}`}
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase block">{l}</span>
            <span className={`text-xl font-black ${k === "bloq" && n ? "text-rose-600" : "text-slate-900"}`}>{n}</span>
          </button>
        ))}
      </div>
      {mensaje && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold">{mensaje}</div>}
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por código (12 o DR-12), nombre o DNI…" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm" />
        </div>
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Alumno</th>
                <th className="py-2.5 px-3">Usuario</th>
                <th className="py-2.5 px-3">Último ingreso</th>
                <th className="py-2.5 px-3">Estado de la clave</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Cargando…</td></tr>
              )}
              {vistos.map((a) => {
                const [txt, cls] = ESTADO[estado(a)];
                return (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{a.codeLabel || "—"}</td>
                    <td className="py-2.5 px-3">
                      <strong className="text-slate-900 block">{a.fullName}</strong>
                      <span className="text-xs text-slate-500">DNI {a.dni || "—"}{a.phone ? ` · ${a.phone}` : ""}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{a.username || "—"}</td>
                    <td className="py-2.5 px-3 text-slate-500">{a.hasAccount ? fecha(a.lastAccess) : "—"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold ${cls}`}>{txt}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {puedeEditar && (
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => {
                              setAbierto(a);
                              setModo("dni");
                              setPropia("");
                            }}
                            title={a.hasAccount ? "Restablecer contraseña" : "Crear su cuenta"}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 cursor-pointer inline-flex items-center gap-1"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> {a.hasAccount ? "Restablecer" : "Crear cuenta"}
                          </button>
                          {a.hasAccount && (
                            <button
                              onClick={() => cambiarEstado(a)}
                              title={a.active ? "Quitar acceso al portal" : "Dar acceso al portal"}
                              className={`p-2 rounded-lg cursor-pointer ${a.active ? "hover:bg-rose-50" : "hover:bg-emerald-50"}`}
                            >
                              <Power className={`w-4 h-4 ${a.active ? "text-rose-600" : "text-emerald-600"}`} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!cargando && vistos.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay alumnos con ese filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAbierto(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase text-amber-600 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" /> Restablecer acceso</p>
                <p className="text-lg font-black text-slate-900">{abierto.fullName}</p>
                <p className="text-xs text-slate-500">{abierto.codeLabel} · usuario: <b className="font-mono">{abierto.dni}</b></p>
              </div>
              <button onClick={() => setAbierto(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-2">
              {[
                ["dni", "Volver a su DNI", "La clave será su número de DNI, como al matricularse."],
                ["temporal", "Clave temporal al azar", "El sistema crea una clave para que se la dictes o envíes."],
                ["propia", "Escribir una clave", "Tú eliges la clave (8 o más caracteres, con letras y números)."],
              ].map(([k, l, d]) => (
                <label key={k} className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer ${modo === k ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                  <input type="radio" checked={modo === k} onChange={() => setModo(k)} className="mt-1 accent-blue-600" />
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{l}</span>
                    <span className="block text-xs text-slate-500">{d}</span>
                  </span>
                </label>
              ))}
              {modo === "propia" && (
                <input value={propia} onChange={(e) => setPropia(e.target.value)} placeholder="Nueva clave" autoComplete="new-password" className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-mono" />
              )}
            </div>
            <p className="text-[11px] text-slate-500">Se cierran sus sesiones abiertas y, al entrar, el sistema le pedirá crear su propia contraseña.</p>
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setAbierto(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
              <button onClick={restablecer} disabled={modo === "propia" && propia.length < 8} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-black cursor-pointer">
                Restablecer ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const UsersAccessModule = () => {
  const { currentUser } = useGym();
  const [pestana, setPestana] = useState("usuarios");
  const [datos, setDatos] = useState({ usuarios: [], cuentasAlumnos: { total: 0, activas: 0 } });
  const [buscar, setBuscar] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [vista, setVista] = useState(null); // nuevo | {editar} | {credenciales}
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const puedeCrear = userCan(currentUser, "users", "crear");
  const puedeEditar = userCan(currentUser, "users", "editar");

  const cargar = () =>
    api("/usuarios")
      .then(setDatos)
      .catch((e) => setError(e.message));
  useEffect(() => {
    cargar();
  }, []);

  const lista = useMemo(
    () =>
      datos.usuarios.filter(
        (u) =>
          (filtroRol === "todos" || u.role === filtroRol) &&
          `${u.fullName} ${u.username} ${u.dni}`.toLowerCase().includes(buscar.toLowerCase()),
      ),
    [datos, buscar, filtroRol],
  );

  const accion = async (fn, ok) => {
    setError("");
    try {
      const r = await fn();
      if (ok) setMensaje(ok);
      await cargar();
      return r;
    } catch (e) {
      setError(e.message);
    }
  };

  const restablecer = async (u) => {
    if (!window.confirm(`¿Restablecer la contraseña de ${u.fullName}? Se cerrarán sus sesiones abiertas.`)) return;
    const r = await accion(() => api(`/usuarios/${u.id}/clave`, { method: "POST", body: {} }));
    if (r) setVista({ credenciales: { nombre: u.fullName, rol: ROLES[u.role]?.label, usuario: r.usuario, clave: r.claveTemporal, telefono: u.phone } });
  };

  if (vista === "nuevo" || vista?.editar)
    return (
      <FormUsuario
        usuario={vista?.editar}
        esUnoMismo={vista?.editar?.id === String(currentUser?.id)}
        onVolver={() => setVista(null)}
        onGuardado={(cred) => {
          cargar();
          setVista(cred ? { credenciales: cred } : null);
          if (!cred) setMensaje("Datos actualizados.");
        }}
      />
    );
  if (vista?.credenciales) return <Credenciales datos={vista.credenciales} onListo={() => setVista(null)} />;

  const porRol = (r) => datos.usuarios.filter((u) => u.role === r && u.active).length;

  return (
    <div className="space-y-5">
      <div className="rd-portada rd-cabecera flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Seguridad
          </span>
          <h1 className="text-2xl font-black mt-1">Usuarios y accesos</h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Crea una cuenta para cada trabajador. Así cada recepcionista abre y cierra su propia caja y queda registrado quién hizo
            cada cobro.
          </p>
        </div>
        {puedeCrear && (
          <button
            onClick={() => setVista("nuevo")}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Nuevo usuario
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
        {ROLES_PERSONAL.map((r, i) => (
          <TarjetaKpi
            key={r}
            titulo={ROLES[r]?.label}
            valor={porRol(r)}
            sub="activos · toca para filtrar"
            icono={[IcShield, IcUser, IcDumbbell, IcHeart, IcApple][i] || IcUser}
            tono={["violeta", "teal", "ambar", "rojo", "verde"][i] || "azul"}
            activo={filtroRol === r}
            onClick={() => setFiltroRol(filtroRol === r ? "todos" : r)}
          />
        ))}
        <TarjetaKpi titulo="Alumnos con acceso" valor={datos.cuentasAlumnos.activas} sub="ver credenciales →" icono={IcKey} tono="azul" onClick={() => setPestana("socios")} />
      </div>

      <div className="flex gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 w-fit">
        {[["usuarios", "Usuarios del personal"], ["socios", "Socios (alumnos)"], ["turnos", "Turnos de recepción"], ["config", "Configuración del gimnasio"]].map(([k, l]) => (
          <button key={k} onClick={() => setPestana(k)} className={`px-3 py-2 rounded-lg text-sm font-bold cursor-pointer ${pestana === k ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {l}
          </button>
        ))}
      </div>
      {pestana === "config" && <ConfiguracionGimnasio />}
      {pestana === "turnos" && <TurnosRecepcion />}
      {pestana === "socios" && <SociosAccesos puedeEditar={puedeEditar} onCredenciales={(c) => setVista({ credenciales: c })} />}
      {pestana === "usuarios" && <>
      {mensaje && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold">{mensaje}</div>}
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre, usuario o DNI…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200">
                <th className="py-2 pr-3">Trabajador</th>
                <th className="py-2 pr-3">Usuario</th>
                <th className="py-2 pr-3">Área</th>
                <th className="py-2 pr-3">Último ingreso</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((u) => {
                const yo = u.id === String(currentUser?.id);
                return (
                  <tr key={u.id} className={`border-b border-slate-100 ${u.active ? "" : "opacity-60"}`}>
                    <td className="py-3 pr-3">
                      <strong className="text-slate-900 block">{u.fullName}{yo && <span className="text-xs text-blue-600"> (tú)</span>}</strong>
                      <span className="text-xs text-slate-500">{[u.title, u.dni && `DNI ${u.dni}`, u.phone].filter(Boolean).join(" · ") || "—"}</span>
                    </td>
                    <td className="py-3 pr-3 font-mono text-slate-700">{u.username}</td>
                    <td className="py-3 pr-3">
                      <span className="rd-chip-rol px-2 py-0.5 rounded-full text-xs font-black" style={{ "--c": COLOR_ROL[u.role] || "var(--color-slate-400)" }}>
                        {ROLES[u.role]?.label || u.roleName}
                      </span>
                      {u.receptionShift && <span className="block text-xs text-slate-500 mt-0.5">{nombreTurno(u.receptionShift)}</span>}
                    </td>
                    <td className="py-3 pr-3 text-slate-500">{fecha(u.lastAccess)}</td>
                    <td className="py-3 pr-3">
                      {!u.active ? (
                        <span className="text-xs font-black text-slate-500">Desactivado</span>
                      ) : u.locked ? (
                        <span className="text-xs font-black text-rose-600">Bloqueado temporalmente</span>
                      ) : u.mustChangePassword ? (
                        <span className="text-xs font-black text-amber-600">Clave temporal</span>
                      ) : (
                        <span className="text-xs font-black text-emerald-600">Activo</span>
                      )}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {puedeEditar && (
                        <div className="inline-flex gap-1">
                          <button onClick={() => setVista({ editar: u })} title="Editar" className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                            <Pencil className="w-4 h-4 text-slate-600" />
                          </button>
                          <button onClick={() => restablecer(u)} title="Restablecer contraseña" className="p-2 rounded-lg hover:bg-amber-50 cursor-pointer">
                            <KeyRound className="w-4 h-4 text-amber-600" />
                          </button>
                          {!yo && (
                            <button
                              onClick={() =>
                                accion(
                                  () => api(`/usuarios/${u.id}`, { method: "PUT", body: { activo: !u.active } }),
                                  u.active ? `${u.fullName} ya no puede ingresar.` : `${u.fullName} puede volver a ingresar.`,
                                )
                              }
                              title={u.active ? "Desactivar" : "Activar"}
                              className={`p-2 rounded-lg cursor-pointer ${u.active ? "hover:bg-rose-50" : "hover:bg-emerald-50"}`}
                            >
                              <Power className={`w-4 h-4 ${u.active ? "text-rose-600" : "text-emerald-600"}`} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No hay usuarios con ese filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>}
    </div>
  );
};
