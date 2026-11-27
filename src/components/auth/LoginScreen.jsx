import React, { useEffect, useState } from "react";
import { Eye, EyeOff, LogIn, Lock, User, AlertCircle } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { api } from "../../api/cliente";
import { LogoRadical, NombreRadical, BotonTema, FirmaDaxsay } from "../common/Marca";

// Ejemplos cortos que entran completos en el campo, en PC y en celular
const EJEMPLOS_USUARIO = [
  "Administración: tu usuario",
  "Socio: tu DNI · 45678912",
  "Recepción: tu usuario",
  "Profesor: tu usuario",
  "Entrenador: tu usuario",
  "Nutrición: tu usuario",
  "Fisioterapia: tu usuario",
];

export const LoginScreen = () => {
  const { login } = useGym();
  const [username, setUsername] = useState("");
  // El ejemplo del campo va cambiando para que cada quien sepa con qué entra
  const [ejemplo, setEjemplo] = useState(0);
  useEffect(() => {
    if (username) return undefined;
    const t = setInterval(() => setEjemplo((i) => (i + 1) % EJEMPLOS_USUARIO.length), 2600);
    return () => clearInterval(t);
  }, [username]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }
    setLoading(true);
    login(username, password).then((result) => {
      if (!result.success) {
        setError(result.message);
        setLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-white font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Panel izquierdo: marca */}
      <div className="rd-panel-marca hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-marino-800 via-marino-950 to-[#04101e] p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
        <img src="/logo-daxsay.svg" alt="" className="rd-logo absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] max-w-[80%] opacity-[0.07] rounded-full pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-400/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-orange-500/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <LogoRadical size={52} className="ring-2 ring-blue-400/40" />
          <NombreRadical className="text-3xl" />
        </div>

        <div className="relative space-y-4 max-w-md">
          <h1 className="font-['Outfit',sans-serif] text-4xl font-extrabold leading-tight">
            Entrena, mide y <span className="text-blue-300">avanza</span>.
            <span className="rd-sub-marca block text-2xl font-semibold mt-1">Sistema de gestión del gimnasio</span>
          </h1>
          <p className="text-slate-300/90 text-sm leading-relaxed">
            Socios, membresías, rutinas, nutrición, fisioterapia, asistencias,
            ventas y caja en un solo lugar. Cada persona del equipo ve solo lo
            que necesita para su trabajo.
          </p>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-400/70">© {new Date().getFullYear()} DAXSAY Fit Suite</p>
          <FirmaDaxsay claro />
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="relative flex-1 flex items-center justify-center p-6 rd-fondo text-slate-900">
        <div className="absolute top-2 right-6 z-10"><BotonTema vertical /></div>
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-8">
            <LogoRadical size={44} />
            <NombreRadical className="text-2xl" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/5 p-7">
            <h2 className="text-xl font-extrabold text-slate-900">Iniciar sesión</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Personal del gimnasio: con el usuario que te asignó administración. Socios: con su número de DNI.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="username" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Usuario o DNI
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={EJEMPLOS_USUARIO[ejemplo]}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-70 text-white text-sm font-bold rounded-lg rd-brillo transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>

          <OlvideClave usuarioInicial={username} />
          <div className="text-center mt-6"><FirmaDaxsay /></div>
        </div>
      </div>
    </div>
  );
};

/** "¿Olvidaste tu contraseña?": avisa a recepción (sin correos). */
function OlvideClave({ usuarioInicial }) {
  const [abierto, setAbierto] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [estado, setEstado] = useState(null); // { ok, texto }
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!usuario.trim()) return;
    setEnviando(true);
    setEstado(null);
    try {
      const r = await api("/auth/olvide-clave", { method: "POST", body: { usuario: usuario.trim() } });
      setEstado({ ok: true, texto: r.mensaje });
    } catch (err) {
      setEstado({ ok: false, texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto)
    return (
      <p className="text-center text-xs text-slate-400 mt-5">
        <button
          type="button"
          onClick={() => {
            setUsuario(usuarioInicial || "");
            setAbierto(true);
          }}
          className="font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-2 cursor-pointer"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </p>
    );

  return (
    <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm">
      <p className="font-bold text-white">¿Olvidaste tu contraseña?</p>
      {estado?.ok ? (
        <div className="mt-2 space-y-2">
          <p className="text-emerald-300 text-xs leading-relaxed">✓ {estado.texto}</p>
          <p className="text-slate-400 text-xs">Si es urgente, acércate a recepción con tu DNI.</p>
          <button type="button" onClick={() => setAbierto(false)} className="text-xs font-semibold text-blue-400 cursor-pointer">
            Volver al inicio de sesión
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="mt-2 space-y-2">
          <p className="text-slate-400 text-xs">
            Escribe tu usuario (si eres socio, tu DNI). Le llegará un aviso a recepción para que restablezca tu contraseña; luego ingresas con tu DNI y creas una nueva.
          </p>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Usuario o DNI"
            autoFocus
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm"
          />
          {estado && !estado.ok && <p className="text-xs text-rose-300">{estado.texto}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={enviando} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold cursor-pointer">
              {enviando ? "Enviando..." : "Avisar a recepción"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="px-3 py-2 rounded-lg border border-slate-600 text-slate-300 text-xs font-semibold cursor-pointer">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
