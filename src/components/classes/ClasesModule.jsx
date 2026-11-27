// =====================================================================
// CLASES GRUPALES (personal)
//  Horario     · semana con las clases de cada día (vacío al empezar).
//                Administración y recepción crean, cambian y quitan clases.
//  Steps       · las clases de hoy con su croquis: quién reservó, ✓ llegó,
//                ✗ no vino, y sentar a quien llega sin reservar picando su
//                código (marca asistencia y reserva el step a la vez).
//  Discos      · el profesor anota el disco de cada clase y lo envía;
//                administración y recepción lo ven como reporte y lo descargan.
//  Disciplinas · (administración) disciplinas, profesores, croquis y
//                minutos para reservar.
// =====================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Music, CalendarDays, LayoutGrid, Disc3, Settings2, Plus, ChevronLeft, ChevronRight, X, Pencil, Trash2, Check, Send, Users, Clock, Save, BarChart3, Star } from "lucide-react";
import { api } from "../../api/cliente";
import { useGym } from "../../context/GymContext";
import { CabeceraModulo, AccionCabecera, SinSeleccion } from "../common/CabeceraModulo";
import { TarjetaKpi } from "../common/TarjetaKpi";
import { Exportar } from "../reports/ReportsModule";
import { buscarAlumno } from "../../utils/codigo";
import { ingresoDeHoy } from "../../utils/codigoPersonal";
import { hoyISO } from "../../utils/fecha";
import { DIAS, DIAS_CORTO, COLORES, diaDe, lunesDe, fechaBonita, sumarDias, aMin, deMin, estadoVentana, useDatosClases, useCroquis, useSesiones, nombreSede } from "./clasesComun";
import { Croquis, EditorCroquis, LeyendaCroquis } from "./Croquis";
import Masters from "./Masters";
import Calificaciones from "./Calificaciones";

const GESTIONA = ["admin", "reception"];
const campo = "mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800";

const Ventana = ({ titulo, icono: I = Music, onCerrar, children, ancha = false }) => (
  <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto" data-rd-tam={ancha ? "ancha" : undefined}>
    <div className="w-full max-w-2xl mx-auto min-h-full bg-white p-5 sm:p-6 space-y-4 text-slate-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-black flex items-center gap-2 min-w-0">
          <I className="w-5 h-5 text-teal-600 shrink-0" /> <span className="truncate">{titulo}</span>
        </h3>
        <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Cerrar">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Error = ({ texto }) => (texto ? <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{texto}</p> : null);

// ---------------------------------------------------------------------
// Formulario de clase (nueva / editar)
// ---------------------------------------------------------------------
const FormClase = ({ datos, inicial, onListo, onCerrar }) => {
  const editando = !!inicial?.id;
  const [f, setF] = useState(() => ({
    disciplinaId: inicial?.disciplinaId || "",
    nombre: inicial?.id && inicial.nombre !== inicial.disciplina ? inicial.nombre : "",
    dias: inicial?.dia ? [inicial.dia] : [],
    inicio: inicial?.inicio || "18:00",
    fin: inicial?.fin || "19:00",
    profesorId: inicial?.profesorId || "",
    sala: inicial?.sala || "",
    sedeId: inicial?.sedeId || datos.sedes?.[0]?.id || null,
  }));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const disc = datos.disciplinas.filter((d) => d.activa || d.id === f.disciplinaId);
  const elegida = datos.disciplinas.find((d) => d.id === f.disciplinaId);
  const profes = useMemo(() => {
    const deLa = datos.profesores.filter((p) => elegida?.profesores.includes(p.id));
    return [...deLa, ...datos.profesores.filter((p) => !deLa.includes(p))];
  }, [datos.profesores, elegida]);
  const elegirDisciplina = (d) => {
    setF((x) => ({ ...x, disciplinaId: d.id, profesorId: x.profesorId && d.profesores.includes(Number(x.profesorId)) ? x.profesorId : d.profesores[0] || x.profesorId }));
  };
  const duracion = (min) => set("fin", deMin(aMin(f.inicio) + min));
  const toggleDia = (d) => set("dias", editando ? [d] : f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d].sort());

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    if (!f.disciplinaId) return setError("Elige la disciplina");
    if (!f.dias.length) return setError("Elige al menos un día");
    setGuardando(true);
    try {
      const cuerpo = { ...f, profesorId: Number(f.profesorId) || null };
      if (editando) await api(`/clases/${inicial.id}`, { method: "PUT", body: { ...cuerpo, dia: f.dias[0] } });
      else await api("/clases", { method: "POST", body: cuerpo });
      onListo();
    } catch (er) {
      setError(er.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Ventana titulo={editando ? "Editar clase" : "Nueva clase grupal"} icono={CalendarDays} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">1 · Disciplina 🎵</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {disc.map((d) => (
              <button key={d.id} type="button" onClick={() => elegirDisciplina(d)} className={`rd-kpi-${d.color} rounded-xl border px-3 py-2.5 text-left cursor-pointer ${f.disciplinaId === d.id ? "rd-clase-card ring-2 ring-offset-1 ring-teal-400" : "bg-white border-slate-200 text-slate-700"}`}>
                <span className="text-lg mr-1">{d.emoji}</span>
                <span className="text-sm font-black">{d.nombre}</span>
              </button>
            ))}
          </div>
          <label className="block text-sm">
            <span className="font-bold text-slate-700">Nombre de la clase (opcional)</span>
            <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={80} placeholder={elegida ? `Si lo dejas vacío: ${elegida.nombre}` : "Ej. Full Body Intenso"} className={campo} />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">2 · Horario 🕕</p>
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1.5">{editando ? "Día" : "Días (puedes elegir varios)"}</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button key={d} type="button" onClick={() => toggleDia(d)} className={`rounded-xl border py-2 text-xs font-black cursor-pointer ${f.dias.includes(d) ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                  {DIAS_CORTO[d]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-bold text-slate-700">Empieza</span>
              <input type="time" value={f.inicio} onChange={(e) => set("inicio", e.target.value)} className={campo} />
            </label>
            <label className="block text-sm">
              <span className="font-bold text-slate-700">Termina</span>
              <input type="time" value={f.fin} onChange={(e) => set("fin", e.target.value)} className={campo} />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[45, 50, 60, 90].map((m) => (
              <button key={m} type="button" onClick={() => duracion(m)} className={`px-3 py-1 rounded-full border text-xs font-bold cursor-pointer ${aMin(f.fin) - aMin(f.inicio) === m ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">3 · Profesor y lugar 🧑‍🏫</p>
          {(datos.sedes || []).length > 1 && (
            <div className="space-y-1">
              <span className="text-sm font-bold text-slate-700">Sede</span>
              <div className="flex flex-wrap gap-1.5">
                {datos.sedes.map((x) => (
                  <button key={x.id} type="button" onClick={() => set("sedeId", x.id)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${f.sedeId === x.id ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>📍 {x.nombre}</button>
                ))}
              </div>
            </div>
          )}
          <label className="block text-sm">
            <span className="font-bold text-slate-700">Profesor</span>
            <select value={f.profesorId} onChange={(e) => set("profesorId", e.target.value ? Number(e.target.value) : "")} className={campo}>
              <option value="">Sin profesor por ahora</option>
              {profes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {elegida?.profesores.includes(p.id) ? ` · dicta ${elegida.nombre}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-bold text-slate-700">Sala (opcional)</span>
            <input value={f.sala} onChange={(e) => set("sala", e.target.value)} maxLength={60} placeholder="Ej. Salón de baile" className={campo} />
          </label>
        </div>

        <Error texto={error} />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
          <button disabled={guardando} className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-black cursor-pointer">
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : `✅ Crear clase${f.dias.length > 1 ? `s (${f.dias.length} días)` : ""}`}
          </button>
        </div>
      </form>
    </Ventana>
  );
};

// ---------------------------------------------------------------------
// Anotar el disco de una sesión
// ---------------------------------------------------------------------
const FormDisco = ({ sesion, onListo, onCerrar }) => {
  const [disco, setDisco] = useState(sesion.disco || "");
  const [nota, setNota] = useState(sesion.nota || "");
  const [error, setError] = useState("");
  const guardar = async (e) => {
    e.preventDefault();
    try {
      await api("/clases/discos", { method: "POST", body: { claseId: sesion.claseId, fecha: sesion.fecha, disco, nota } });
      onListo();
    } catch (er) {
      setError(er.message);
    }
  };
  return (
    <Ventana titulo={`Disco · ${sesion.nombre}`} icono={Disc3} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <p className="text-sm text-slate-600">
          {fechaBonita(sesion.fecha)} · {sesion.inicio}–{sesion.fin} · {sesion.profesor}
        </p>
        <label className="block text-sm">
          <span className="font-bold text-slate-700">Disco que se dictará</span>
          <input autoFocus value={disco} onChange={(e) => setDisco(e.target.value)} maxLength={120} placeholder="Ej. Ayahuasca" className={campo} />
        </label>
        <label className="block text-sm">
          <span className="font-bold text-slate-700">Nota para los alumnos (opcional)</span>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={300} placeholder="Ej. Traer toalla y agua" className={campo} />
        </label>
        <p className="text-xs text-slate-500">Si lo dejas vacío, se quita el disco de esta clase.</p>
        <Error texto={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
          <button className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-black cursor-pointer">🎵 Guardar disco</button>
        </div>
      </form>
    </Ventana>
  );
};

// ---------------------------------------------------------------------
// Detalle de una sesión del horario
// ---------------------------------------------------------------------
const DetalleSesion = ({ s, puedeGestionar, puedeDisco, onEditar, onQuitar, onDisco, onSteps, onCerrar }) => (
  <Ventana titulo={`${s.emoji} ${s.nombre}`} onCerrar={onCerrar}>
    <div className={`rd-kpi-${s.color} rd-clase-card rounded-2xl p-4 space-y-1`}>
      <p className="text-sm font-black">{DIAS[diaDe(s.fecha)]} {fechaBonita(s.fecha).split(" ").slice(1).join(" ")} · {s.inicio} – {s.fin}</p>
      <p className="text-sm">🧑‍🏫 {s.profesor}{s.sala ? ` · 📍 ${s.sala}` : ""}</p>
      <p className="text-sm">🎵 {s.disco ? <b>Disco «{s.disco}»</b> : <span className="opacity-80">Aún sin disco</span>}</p>
      {s.nota && <p className="text-xs opacity-90">📝 {s.nota}</p>}
      {s.registradoPor && <p className="text-[11px] opacity-80">Anotado por {s.registradoPor} · {s.registradoEn}</p>}
      {(s.reservados > 0 || s.asistieron > 0) && <p className="text-xs font-bold">🎫 {s.reservados} reservados · ✓ {s.asistieron} llegaron</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      {s.fecha === hoyISO() && (
        <button type="button" onClick={onSteps} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
          <LayoutGrid className="w-4 h-4" /> Reservas
        </button>
      )}
      {puedeDisco && (
        <button type="button" onClick={onDisco} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
          <Disc3 className="w-4 h-4" /> {s.disco ? "Cambiar disco" : "Anotar disco"}
        </button>
      )}
      {puedeGestionar && (
        <>
          <button type="button" onClick={onEditar} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
            <Pencil className="w-4 h-4" /> Editar clase
          </button>
          <button type="button" onClick={onQuitar} className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
            <Trash2 className="w-4 h-4" /> Quitar del horario
          </button>
        </>
      )}
    </div>
    {puedeGestionar && <p className="text-xs text-slate-500">«Quitar del horario» quita la clase de todas las semanas ({DIAS[diaDe(s.fecha)].toLowerCase()} {s.inicio}).</p>}
  </Ventana>
);

// ---------------------------------------------------------------------
// Horario semanal
// ---------------------------------------------------------------------
const Horario = ({ datos, recargar, yo, onSteps }) => {
  const hoy = hoyISO();
  const [lunes, setLunes] = useState(lunesDe(hoy));
  const domingo = sumarDias(lunes, 6);
  const { sesiones, error, cargar } = useSesiones(lunes, domingo);
  const [filtro, setFiltro] = useState(0);
  const sedes = datos.sedes || [];
  const [sede, setSede] = useState(() => {
    try {
      return Number(localStorage.getItem("rd_sede_clases")) || null;
    } catch {
      return null;
    }
  });
  const sedeOk = sedes.length > 1 ? (sedes.some((x) => x.id === sede) ? sede : sedes[0].id) : null;
  const elegirSede = (id) => {
    setSede(id);
    try {
      localStorage.setItem("rd_sede_clases", String(id));
    } catch {
      /* sin almacenamiento */
    }
  };
  const [nueva, setNueva] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [disco, setDisco] = useState(null);
  const gestiona = GESTIONA.includes(yo.rol);
  const lista = (sesiones || []).filter((s) => (!filtro || s.disciplinaId === filtro) && (!sedeOk || (s.sedeId ?? sedes[0]?.id) === sedeOk));
  const refrescar = () => (cargar(), recargar());
  const quitar = async (s) => {
    if (!window.confirm(`¿Quitar ${s.nombre} del ${DIAS[diaDe(s.fecha)].toLowerCase()} ${s.inicio} de todas las semanas?`)) return;
    await api(`/clases/${s.claseId}`, { method: "DELETE" });
    setAbierta(null);
    refrescar();
  };
  const puedeDisco = (s) => gestiona || (yo.rol === "instructor" && s.profesorId === yo.empleadoId);

  return (
    <div className="space-y-4">
      {sedes.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 mr-1">📍 Sede:</span>
          {sedes.map((x) => (
            <button key={x.id} type="button" onClick={() => elegirSede(x.id)} className={`px-4 py-2 rounded-xl border text-sm font-black cursor-pointer ${sedeOk === x.id ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{x.nombre}</button>
          ))}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setLunes(sumarDias(lunes, -7))} className="p-2 rounded-xl border border-slate-200 cursor-pointer" aria-label="Semana anterior"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-black text-slate-800 min-w-[170px] text-center">
          {fechaBonita(lunes)} – {fechaBonita(domingo)}
        </p>
        <button type="button" onClick={() => setLunes(sumarDias(lunes, 7))} className="p-2 rounded-xl border border-slate-200 cursor-pointer" aria-label="Semana siguiente"><ChevronRight className="w-4 h-4" /></button>
        {lunes !== lunesDe(hoy) && (
          <button type="button" onClick={() => setLunes(lunesDe(hoy))} className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">Esta semana</button>
        )}
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          <button type="button" onClick={() => setFiltro(0)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${!filtro ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-600"}`}>Todas</button>
          {datos.disciplinas.filter((d) => d.activa).map((d) => (
            <button key={d.id} type="button" onClick={() => setFiltro(filtro === d.id ? 0 : d.id)} className={`rd-kpi-${d.color} px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${filtro === d.id ? "rd-clase-card" : "bg-white border-slate-200 text-slate-600"}`}>
              {d.emoji} {d.nombre}
            </button>
          ))}
        </div>
      </div>

      {error && <Error texto={error} />}
      {!sesiones && !error && <p className="text-sm text-slate-500">Cargando horario…</p>}
      {sesiones && !datos.clases.length && !sesiones.length && (
        <div className="rd-kpi-teal rd-aviso-t rounded-2xl border p-5 text-center space-y-2">
          <p className="text-3xl">🗓️</p>
          <p className="font-black">El horario de clases grupales está vacío</p>
          <p className="text-sm">{gestiona ? "Toca «+» en el día que quieras o «Nueva clase» para armarlo. Se repite cada semana." : "Administración o recepción arman el horario."}</p>
        </div>
      )}
      {sesiones && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const fecha = sumarDias(lunes, d - 1);
            const delDia = lista.filter((s) => s.fecha === fecha);
            return (
              <div key={d} className={`rd-dia-col rounded-2xl p-2.5 space-y-2 min-h-[120px] ${fecha === hoy ? "rd-dia-hoy" : ""}`}>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                    {DIAS[d]} <span className="font-bold text-slate-400 normal-case">{Number(fecha.slice(8))}</span>
                    {fecha === hoy && <span className="ml-1 text-teal-600 normal-case">· hoy</span>}
                  </p>
                  {gestiona && (
                    <button type="button" onClick={() => setNueva({ dia: d })} className="w-6 h-6 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center cursor-pointer hover:bg-slate-50" title={`Nueva clase el ${DIAS[d].toLowerCase()}`}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {delDia.map((s) => (
                  <button key={s.id} type="button" onClick={() => setAbierta(s)} className={`rd-kpi-${s.color} rd-clase-card w-full text-left rounded-xl px-2.5 py-2 cursor-pointer`}>
                    <p className="text-[11px] font-black">{s.inicio} – {s.fin}</p>
                    <p className="text-sm font-black leading-tight">{s.emoji} {s.nombre}</p>
                    <p className="text-[11px] opacity-90 truncate">🧑‍🏫 {s.profesor}</p>
                    <p className="text-[11px] truncate">{s.disco ? <b>🎵 {s.disco}</b> : <span className="opacity-70">🎵 sin disco</span>}</p>
                    {(s.reservados > 0 || s.asistieron > 0) && <p className="text-[10px] font-bold">🎫 {s.reservados + s.asistieron} en steps</p>}
                  </button>
                ))}
                {!delDia.length && <p className="text-[11px] text-slate-400 text-center pt-3">Sin clases</p>}
              </div>
            );
          })}
        </div>
      )}

      {nueva && <FormClase datos={datos} inicial={nueva.id ? nueva : { dia: nueva.dia, sedeId: sedeOk }} onCerrar={() => setNueva(null)} onListo={() => (setNueva(null), refrescar())} />}
      {abierta && (
        <DetalleSesion
          s={abierta}
          puedeGestionar={gestiona}
          puedeDisco={puedeDisco(abierta)}
          onCerrar={() => setAbierta(null)}
          onEditar={() => (setNueva({ ...abierta, id: abierta.claseId, dia: diaDe(abierta.fecha) }), setAbierta(null))}
          onQuitar={() => quitar(abierta)}
          onDisco={() => (setDisco(abierta), setAbierta(null))}
          onSteps={() => (onSteps(abierta.claseId), setAbierta(null))}
        />
      )}
      {disco && <FormDisco sesion={disco} onCerrar={() => setDisco(null)} onListo={() => (setDisco(null), cargar())} />}
      {gestiona && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setNueva({ dia: diaDe(hoy) })} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" /> Nueva clase
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Steps y reservas de las clases de hoy
// ---------------------------------------------------------------------
const Steps = ({ yo, claseInicial, sedes = [] }) => {
  const hoy = hoyISO();
  const { members = [], attendances = [], recordAttendance } = useGym();
  const { sesiones: todasSesiones } = useSesiones(hoy, hoy);
  const [sedeVer, setSedeVer] = useState(() => {
    try {
      return Number(localStorage.getItem("rd_sede_clases")) || null;
    } catch {
      return null;
    }
  });
  const sedeOk = sedes.length > 1 ? (sedes.some((x) => x.id === sedeVer) ? sedeVer : sedes[0].id) : null;
  const sesiones = todasSesiones && (sedeOk ? todasSesiones.filter((s) => (s.sedeId ?? sedes[0]?.id) === sedeOk || s.claseId === claseInicial) : todasSesiones);
  const [claseId, setClaseId] = useState(claseInicial || null);
  const { croquis, cargarCroquis } = useCroquis((sesiones || []).find((s) => s.claseId === claseId)?.sedeId || null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(null); // { z, r }
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const entrada = useRef(null);
  const sesion = (sesiones || []).find((s) => s.claseId === claseId);

  useEffect(() => {
    if (!claseId && sesiones?.length) {
      const ahora = aMin(new Date().toLocaleTimeString("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" }));
      const proxima = sesiones.find((s) => aMin(s.fin) > ahora) || sesiones[sesiones.length - 1];
      setClaseId(proxima.claseId);
    }
  }, [sesiones, claseId]);
  const cargar = () => {
    if (!claseId) return;
    api(`/clases/reservas?clase=${claseId}&fecha=${hoy}`)
      .then((d) => (setInfo(d), setError("")))
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    setInfo(null);
    cargar();
    const t = setInterval(() => (cargar(), cargarCroquis()), 20000);
    return () => clearInterval(t);
  }, [claseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activas = (info?.reservas || []).filter((r) => r.estado === "reservado" || r.estado === "asistio");
  const marcarAsistencia = (m) => {
    if (ingresoDeHoy(attendances, m.id, hoy)) return false;
    recordAttendance?.({
      userId: m.id,
      userName: m.fullName,
      userRole: "student",
      userDni: m.dni,
      type: "in",
      status: m.status === "expired" || m.status === "frozen" ? "warning" : "authorized",
      category: "student",
      checkInMethod: "quick_pass",
      membershipPlan: m.planName,
      notes: `Ingreso a clase grupal: ${sesion?.nombre || ""} ${sesion?.inicio || ""}`,
    });
    return true;
  };
  const sentar = async (e) => {
    e.preventDefault();
    const hallado = buscarAlumno(members, codigo.trim());
    const m = hallado?.member;
    if (!m) return setMensaje({ ok: false, texto: `No se encontró ningún alumno con «${codigo}»` });
    try {
      const r = await api("/clases/reservas", { method: "POST", body: { clase: claseId, fecha: hoy, step: step.z.id, alumno: Number(m.id), estado: "asistio" } });
      const marco = marcarAsistencia(m);
      setMensaje({ ok: true, texto: `✅ ${marco ? "Asistencia marcada · " : ""}Step ${r.numero} reservado para ${m.fullName}` });
      setStep(null);
      setCodigo("");
      cargar();
    } catch (er) {
      setMensaje({ ok: false, texto: er.message });
    }
  };
  const cambiarEstado = async (r, estado) => {
    try {
      await api(`/clases/reservas/${r.id}/estado`, { method: "POST", body: { estado } });
      if (estado === "asistio") {
        const m = members.find((x) => Number(x.id) === Number(r.alumnoId));
        const marco = m ? marcarAsistencia(m) : false;
        setMensaje({ ok: true, texto: `✓ ${r.alumno} llegó · step ${r.numero}${marco ? " · asistencia marcada" : ""}` });
      } else setMensaje({ ok: true, texto: estado === "no_vino" ? `✗ ${r.alumno} no vino: el step ${r.numero} quedó libre` : `Step ${r.numero} liberado` });
      setStep(null);
      cargar();
    } catch (er) {
      setMensaje({ ok: false, texto: er.message });
    }
  };

  if (!sesiones) return <p className="text-sm text-slate-500">Cargando clases de hoy…</p>;
  if (!sesiones.length)
    return (
      <div className="rd-kpi-plomo rd-aviso-t rounded-2xl border p-5 text-center">
        <p className="text-3xl">🧘</p>
        <p className="font-black">Hoy no hay clases grupales en el horario</p>
      </div>
    );
  const v = sesion ? estadoVentana(sesion, croquis?.minutosReserva || 30) : null;
  return (
    <div className="space-y-4">
      {sedes.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 mr-1">📍 Sede:</span>
          {sedes.map((x) => (
            <button key={x.id} type="button" onClick={() => { setSedeVer(x.id); setClaseId(null); setInfo(null); try { localStorage.setItem("rd_sede_clases", String(x.id)); } catch { /* sin almacenamiento */ } }} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${sedeOk === x.id ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{x.nombre}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto p-1.5 -mx-1.5">
        {sesiones.map((s) => (
          <button key={s.id} type="button" onClick={() => (setClaseId(s.claseId), setMensaje(null))} className={`rd-kpi-${s.color} shrink-0 rounded-xl border px-3 py-2 text-left cursor-pointer ${s.claseId === claseId ? "rd-clase-card ring-2 ring-teal-400" : "bg-white border-slate-200 text-slate-700"}`}>
            <p className="text-[11px] font-black">{s.inicio} – {s.fin}</p>
            <p className="text-sm font-black">{s.emoji} {s.nombre}</p>
          </button>
        ))}
      </div>

      {sesion && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <TarjetaKpi titulo="Steps" valor={(croquis?.steps || []).filter((z) => z.tipo === "step").length} sub="en el croquis" emoji="🧱" tono="teal" />
          <TarjetaKpi titulo="Reservados" valor={activas.filter((r) => r.estado === "reservado").length} sub="por confirmar" emoji="🎫" tono="ambar" />
          <TarjetaKpi titulo="Llegaron" valor={activas.filter((r) => r.estado === "asistio").length} sub="confirmados" emoji="✅" tono="verde" />
          <TarjetaKpi titulo="Reserva del alumno" valor={0} texto={v?.estado === "abierta" ? "Abierta" : v?.estado === "pronto" ? `Desde ${v.abre}` : v?.estado === "en_curso" ? "En clase" : "Cerrada"} sub={`${croquis?.minutosReserva || 30} min antes`} emoji="⏰" tono="violeta" />
        </div>
      )}

      {mensaje && <p className={`text-sm font-bold rounded-xl border p-3 ${mensaje.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{mensaje.texto}</p>}
      <Error texto={error} />

      {sesion && croquis && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-800">
              {sesion.emoji} {sesion.nombre} · {sesion.inicio} · 🧑‍🏫 {sesion.profesor}
              {sesion.disco && <span className="font-bold text-teal-700"> · 🎵 {sesion.disco}</span>}
            </p>
            <LeyendaCroquis />
          </div>
          <p className="text-xs text-slate-500">Toca un step libre para sentar a quien llegó sin reservar (picas su código y se marca su asistencia). Toca un step reservado para confirmar ✓ o ✗.</p>
          <Croquis croquis={croquis} reservas={activas} nombres onStep={(z, r) => (setStep({ z, r }), setCodigo(""), setMensaje(null), setTimeout(() => entrada.current?.focus(), 80))} seleccionado={step?.z.id} />
          {activas.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {activas.map((r) => (
                <button key={r.id} type="button" onClick={() => setStep({ z: { id: r.stepId, numero: r.numero }, r })} className="text-left rounded-xl border border-slate-200 px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 flex items-center gap-2">
                  <b className="w-7 text-center">{r.numero}</b>
                  <span className="truncate flex-1">{r.alumno}</span>
                  <span className={r.estado === "asistio" ? "text-emerald-700 font-black" : "text-amber-700 font-bold"}>{r.estado === "asistio" ? "✓ Llegó" : `Reservó ${r.hora}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step && (
        <Ventana titulo={`Step ${step.z.numero}`} icono={LayoutGrid} onCerrar={() => setStep(null)}>
          {!step.r ? (
            <form onSubmit={sentar} className="space-y-3">
              <p className="text-sm text-slate-600">Step libre. Pica el código (o DNI) de quien llegó: se marca su asistencia de hoy y se le reserva este step.</p>
              <input ref={entrada} autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código o DNI del alumno" className={`${campo} text-lg font-black tracking-wider`} />
              {mensaje && !mensaje.ok && <Error texto={mensaje.texto} />}
              <button className="w-full px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-black cursor-pointer">Enter · Reservar step {step.z.numero}</button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                <b>{step.r.alumno}</b> · {step.r.estado === "asistio" ? "ya llegó ✓" : `reservó a las ${step.r.hora}`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {step.r.estado !== "asistio" && (
                  <button type="button" onClick={() => cambiarEstado(step.r, "asistio")} className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer">
                    <Check className="w-4 h-4" /> Llegó
                  </button>
                )}
                {step.r.estado !== "asistio" ? (
                  <button type="button" onClick={() => cambiarEstado(step.r, "no_vino")} className="px-4 py-3 rounded-xl bg-rose-600 text-white text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer">
                    <X className="w-4 h-4" /> No vino (liberar)
                  </button>
                ) : (
                  <button type="button" onClick={() => cambiarEstado(step.r, "cancelado")} className="px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer">
                    <X className="w-4 h-4" /> Liberar step
                  </button>
                )}
              </div>
            </div>
          )}
        </Ventana>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Discos: el profesor anota; administración y recepción ven el reporte
// ---------------------------------------------------------------------
const MisDiscos = () => {
  const hoy = hoyISO();
  // Sábado y domingo se anotan los discos de la próxima semana
  const finde = diaDe(hoy) >= 6;
  const [semana, setSemana] = useState(finde ? 1 : 0);
  const desde = semana ? lunesDe(sumarDias(hoy, 7)) : hoy;
  const hasta = semana ? sumarDias(desde, 6) : sumarDias(lunesDe(hoy), 6);
  const { sesiones, error, cargar } = useSesiones(desde, hasta, "&mias=1");
  const [borrador, setBorrador] = useState({});
  const [msg, setMsg] = useState(null);
  useEffect(() => setBorrador({}), [sesiones]);
  const valor = (s, k) => borrador[s.id]?.[k] ?? s[k] ?? "";
  const cambiar = (s, k, v) => setBorrador((b) => ({ ...b, [s.id]: { ...(b[s.id] || { disco: s.disco, nota: s.nota }), [k]: v } }));
  const cambiados = (sesiones || []).filter((s) => borrador[s.id] && (borrador[s.id].disco !== s.disco || borrador[s.id].nota !== s.nota));
  const enviar = async () => {
    try {
      const r = await api("/clases/discos", { method: "POST", body: { discos: cambiados.map((s) => ({ claseId: s.claseId, fecha: s.fecha, disco: borrador[s.id].disco, nota: borrador[s.id].nota })) } });
      setMsg({ ok: true, texto: `✅ ${r.guardados} disco${r.guardados === 1 ? "" : "s"} enviado${r.guardados === 1 ? "" : "s"} a administración y recepción. Los alumnos lo verán en su recordatorio.` });
      cargar();
    } catch (er) {
      setMsg({ ok: false, texto: er.message });
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {["Esta semana", "Próxima semana"].map((l, i) => (
          <button key={l} type="button" onClick={() => setSemana(i)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${semana === i ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
        ))}
        <p className="text-xs text-slate-500">Escribe el disco de cada clase (un disco por día) y pulsa «Enviar». 📅 Sábado y domingo anota los de la próxima semana.</p>
      </div>
      <Error texto={error} />
      {msg && <p className={`text-sm font-bold rounded-xl border p-3 ${msg.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.texto}</p>}
      {!sesiones ? (
        <p className="text-sm text-slate-500">Cargando tus clases…</p>
      ) : !sesiones.length ? (
        <div className="rd-kpi-plomo rd-aviso-t rounded-2xl border p-5 text-center">
          <p className="font-black">No tienes clases asignadas en estas fechas</p>
          <p className="text-sm">Administración o recepción te asignan en el horario.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <TarjetaKpi titulo="Tus clases" valor={sesiones.length} sub={semana ? "próxima semana" : "esta semana"} emoji="🗓️" tono="teal" />
            <TarjetaKpi titulo="Con disco" valor={sesiones.filter((s) => s.disco).length} sub="ya enviados" emoji="🎵" tono="verde" />
            <TarjetaKpi titulo="Faltan" valor={sesiones.filter((s) => !s.disco).length} sub="sin disco" emoji="⏳" tono="ambar" />
          </div>
          {sesiones.map((s) => (
            <div key={s.id} className={`rd-kpi-${s.color} rd-clase-card rounded-2xl p-3 grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] gap-2 items-center`}>
              <div>
                <p className="text-xs font-black">{fechaBonita(s.fecha)} · {s.inicio}</p>
                <p className="text-sm font-black">{s.emoji} {s.nombre}</p>
                <p className="text-[11px] font-bold">{s.disco ? (borrador[s.id] && borrador[s.id].disco !== s.disco ? "✏️ Cambio sin enviar" : "✅ Enviado") : "⏳ Falta el disco"}</p>
              </div>
              <input value={valor(s, "disco")} onChange={(e) => cambiar(s, "disco", e.target.value)} maxLength={120} placeholder="🎵 Disco (ej. Ayahuasca)" className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 min-w-0" />
              <input value={valor(s, "nota")} onChange={(e) => cambiar(s, "nota", e.target.value)} maxLength={300} placeholder="Nota (opcional)" className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 min-w-0" />
            </div>
          ))}
          <div className="flex justify-end">
            <button type="button" disabled={!cambiados.length} onClick={enviar} className="px-5 py-2.5 rounded-xl bg-teal-600 disabled:opacity-50 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
              <Send className="w-4 h-4" /> Enviar {cambiados.length ? `${cambiados.length} disco${cambiados.length === 1 ? "" : "s"}` : "discos"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ReporteDiscos = ({ datos, puedeEditar }) => {
  const hoy = hoyISO();
  const rangos = [
    ["Esta semana", lunesDe(hoy), sumarDias(lunesDe(hoy), 6)],
    ["Próxima semana", sumarDias(lunesDe(hoy), 7), sumarDias(lunesDe(hoy), 13)],
    ["Semana pasada", sumarDias(lunesDe(hoy), -7), sumarDias(lunesDe(hoy), -1)],
    ["Este mes", `${hoy.slice(0, 7)}-01`, sumarDias(`${sumarDias(`${hoy.slice(0, 7)}-28`, 4).slice(0, 7)}-01`, -1)],
  ];
  const [r, setR] = useState(0);
  const [disc, setDisc] = useState("");
  const [prof, setProf] = useState("");
  const [estado, setEstado] = useState("todos");
  const [editar, setEditar] = useState(null);
  const [, desde, hasta] = rangos[r];
  const { sesiones, error, cargar } = useSesiones(desde, hasta);
  const filas = (sesiones || []).filter(
    (s) => (!disc || s.disciplinaId === Number(disc)) && (!prof || s.profesorId === Number(prof)) && (estado === "todos" || (estado === "con" ? !!s.disco : !s.disco)),
  );
  const columnas = [
    { key: "fecha", label: "Fecha", excel: (s) => fechaBonita(s.fecha) },
    { key: "hora", label: "Hora", excel: (s) => `${s.inicio} – ${s.fin}` },
    { key: "nombre", label: "Clase", excel: (s) => s.nombre },
    { key: "profesor", label: "Profesor" },
    { key: "disco", label: "Disco", excel: (s) => s.disco || "Sin disco" },
    { key: "nota", label: "Nota" },
    { key: "reservas", label: "Steps", excel: (s) => `${s.reservados + s.asistieron}${s.asistieron ? ` (${s.asistieron} llegaron)` : ""}` },
    { key: "registradoPor", label: "Anotado por", excel: (s) => (s.registradoPor ? `${s.registradoPor} · ${s.registradoEn}` : "") },
  ];
  const filtros = [`Del ${fechaBonita(desde)} al ${fechaBonita(hasta)} (${rangos[r][0]})`, disc && `Disciplina: ${datos.disciplinas.find((d) => d.id === Number(disc))?.nombre}`, prof && `Profesor: ${datos.profesores.find((p) => p.id === Number(prof))?.nombre}`, estado !== "todos" && (estado === "con" ? "Con disco" : "Sin disco")].filter(Boolean);
  const conDisco = filas.filter((s) => s.disco).length;
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">🎵 Discos de los profesores</p>
          <Exportar titulo="Clases grupales · Discos" filtros={filtros} columnas={columnas} filas={filas} totales={[["Clases", filas.length], ["Con disco", conDisco], ["Sin disco", filas.length - conDisco]]} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rangos.map(([l], i) => (
            <button key={l} type="button" onClick={() => setR(i)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${r === i ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={disc} onChange={(e) => setDisc(e.target.value)} className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-sm">
            <option value="">Todas las disciplinas</option>
            {datos.disciplinas.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.nombre}</option>)}
          </select>
          <select value={prof} onChange={(e) => setProf(e.target.value)} className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-sm">
            <option value="">Todos los profesores</option>
            {datos.profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-sm">
            <option value="todos">Con y sin disco</option>
            <option value="con">Solo con disco</option>
            <option value="sin">Solo sin disco</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TarjetaKpi titulo="Clases" valor={filas.length} sub="en el periodo" emoji="🗓️" tono="teal" />
        <TarjetaKpi titulo="Con disco" valor={conDisco} sub="ya enviado" emoji="🎵" tono="verde" />
        <TarjetaKpi titulo="Sin disco" valor={filas.length - conDisco} sub="falta anotar" emoji="⏳" tono="ambar" alerta={filas.length - conDisco > 0} />
        <TarjetaKpi titulo="En steps" valor={filas.reduce((a, s) => a + s.reservados + s.asistieron, 0)} sub="reservas y llegadas" emoji="🎫" tono="violeta" />
      </div>
      <Error texto={error} />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="md:hidden divide-y divide-slate-100">
          {filas.map((s) => (
            <button key={s.id} type="button" disabled={!puedeEditar} onClick={() => setEditar(s)} className="w-full text-left px-3 py-2.5">
              <p className="text-xs font-black text-slate-500">{fechaBonita(s.fecha)} · {s.inicio}</p>
              <p className="text-sm font-black text-slate-900">{s.emoji} {s.nombre} · <span className="font-bold text-slate-600">{s.profesor}</span></p>
              <p className="text-sm">{s.disco ? <b className="text-teal-700">🎵 {s.disco}</b> : <span className="text-amber-700 font-bold">Sin disco</span>}</p>
            </button>
          ))}
          {!filas.length && <p className="px-3 py-8 text-center text-sm text-slate-400">{sesiones ? "No hay clases con estos filtros." : "Cargando…"}</p>}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>{["Fecha", "Hora", "Clase", "Profesor", "Disco", "Nota", "Steps", "Anotado por"].map((h) => <th key={h} className="text-left font-black px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filas.map((s) => (
                <tr key={s.id} onClick={() => puedeEditar && setEditar(s)} className={`border-t border-slate-100 ${puedeEditar ? "cursor-pointer hover:bg-slate-50" : ""}`}>
                  <td className="px-3 py-2 whitespace-nowrap">{fechaBonita(s.fecha)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{s.inicio} – {s.fin}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-bold">{s.emoji} {s.nombre}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{s.profesor}</td>
                  <td className="px-3 py-2">{s.disco ? <b className="text-teal-700">{s.disco}</b> : <span className="text-amber-700 font-bold">Sin disco</span>}</td>
                  <td className="px-3 py-2 text-slate-600 min-w-[140px]">{s.nota || "—"}</td>
                  <td className="px-3 py-2">{s.reservados + s.asistieron || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{s.registradoPor ? `${s.registradoPor} · ${s.registradoEn.slice(5)}` : "—"}</td>
                </tr>
              ))}
              {!filas.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">{sesiones ? "No hay clases con estos filtros." : "Cargando…"}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {editar && <FormDisco sesion={editar} onCerrar={() => setEditar(null)} onListo={() => (setEditar(null), cargar())} />}
    </div>
  );
};

// ---------------------------------------------------------------------
// Reporte de asistencia a clases (cuántos vinieron por disciplina)
// ---------------------------------------------------------------------
const ReporteAsistencia = ({ datos }) => {
  const hoy = hoyISO();
  const finMes = (iso) => sumarDias(`${sumarDias(`${iso.slice(0, 7)}-28`, 4).slice(0, 7)}-01`, -1);
  const mesPasado = sumarDias(`${hoy.slice(0, 7)}-01`, -1);
  const rangos = [
    ["Hoy", hoy, hoy],
    ["Esta semana", lunesDe(hoy), sumarDias(lunesDe(hoy), 6)],
    ["Este mes", `${hoy.slice(0, 7)}-01`, finMes(hoy)],
    ["Mes pasado", `${mesPasado.slice(0, 7)}-01`, mesPasado],
    ["Últimos 30 días", sumarDias(hoy, -29), hoy],
  ];
  const [r, setR] = useState(2);
  const [disc, setDisc] = useState("");
  const [prof, setProf] = useState("");
  const [rep, setRep] = useState(null);
  const [error, setError] = useState("");
  const [, desde, hasta] = rangos[r];
  useEffect(() => {
    setRep(null);
    api(`/clases/reporte?desde=${desde}&hasta=${hasta}`).then((d) => (setRep(d.filas), setError(""))).catch((e) => setError(e.message));
  }, [desde, hasta]);
  const lista = (rep || []).filter((f) => (!disc || f.disciplinaId === Number(disc)) && (!prof || f.profesor === prof));
  const profes = [...new Set((rep || []).map((f) => f.profesor))].sort();
  const porDisc = useMemo(() => {
    const m = new Map();
    lista.forEach((f) => {
      const k = f.disciplinaId;
      if (!m.has(k)) m.set(k, { nombre: f.disciplina, emoji: f.emoji, color: f.color, llegaron: 0, reservas: 0, noVino: 0 });
      const x = m.get(k);
      if (f.estado === "asistio") x.llegaron++;
      if (f.estado === "no_vino") x.noVino++;
      if (f.origen === "alumno") x.reservas++;
    });
    return [...m.values()].sort((a, b) => b.llegaron - a.llegaron);
  }, [lista]);
  const porSesion = useMemo(() => {
    const m = new Map();
    lista.forEach((f) => {
      const k = `${f.claseId}|${f.fecha}`;
      if (!m.has(k)) m.set(k, { id: k, fecha: f.fecha, inicio: f.inicio, fin: f.fin, clase: f.clase, emoji: f.emoji, disciplina: f.disciplina, profesor: f.profesor, llegaron: 0, reservaron: 0, noVino: 0, sinReserva: 0 });
      const x = m.get(k);
      if (f.estado === "asistio") x.llegaron++;
      if (f.estado === "no_vino") x.noVino++;
      if (f.origen === "alumno") x.reservaron++;
      if (f.estado === "asistio" && f.origen === "recepcion") x.sinReserva++;
    });
    return [...m.values()].sort((a, b) => (b.fecha + b.inicio).localeCompare(a.fecha + a.inicio));
  }, [lista]);
  const llegaron = lista.filter((f) => f.estado === "asistio").length;
  const reservaron = lista.filter((f) => f.origen === "alumno").length;
  const noVino = lista.filter((f) => f.estado === "no_vino").length;
  const max = Math.max(1, ...porDisc.map((d) => d.llegaron));
  const columnas = [
    { key: "fecha", label: "Fecha", excel: (x) => fechaBonita(x.fecha) },
    { key: "hora", label: "Hora", excel: (x) => `${x.inicio} – ${x.fin}` },
    { key: "clase", label: "Clase" },
    { key: "disciplina", label: "Disciplina" },
    { key: "profesor", label: "Profesor" },
    { key: "llegaron", label: "Vinieron" },
    { key: "reservaron", label: "Reservaron en la app" },
    { key: "sinReserva", label: "Llegaron sin reservar" },
    { key: "noVino", label: "Reservaron y no vinieron" },
  ];
  const filtros = [`Del ${fechaBonita(desde)} al ${fechaBonita(hasta)} (${rangos[r][0]})`, disc && `Disciplina: ${datos.disciplinas.find((d) => d.id === Number(disc))?.nombre}`, prof && `Profesor: ${prof}`].filter(Boolean);
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-slate-600">📊 Asistencia a clases grupales</p>
          <Exportar titulo="Clases grupales · Asistencia" filtros={filtros} columnas={columnas} filas={porSesion} totales={[["Vinieron", llegaron], ["Reservaron en la app", reservaron], ["No vinieron", noVino], ...porDisc.map((d) => [d.nombre, d.llegaron])]} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rangos.map(([l], i) => (
            <button key={l} type="button" onClick={() => setR(i)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${r === i ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select value={disc} onChange={(e) => setDisc(e.target.value)} className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-sm">
            <option value="">Todas las disciplinas</option>
            {datos.disciplinas.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.nombre}</option>)}
          </select>
          <select value={prof} onChange={(e) => setProf(e.target.value)} className="px-2 py-2 rounded-xl border border-slate-200 bg-white text-sm">
            <option value="">Todos los profesores</option>
            {profes.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <Error texto={error} />
      {!rep ? (
        !error && <p className="text-sm text-slate-500">Cargando reporte…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <TarjetaKpi titulo="Vinieron" valor={llegaron} sub={`en ${porSesion.length} clase${porSesion.length === 1 ? "" : "s"}`} emoji="✅" tono="verde" />
            <TarjetaKpi titulo="Reservaron en la app" valor={reservaron} sub="separaron su step" emoji="📱" tono="azul" />
            <TarjetaKpi titulo="No vinieron" valor={noVino} sub="reservaron y faltaron" emoji="❌" tono="rojo" />
            <TarjetaKpi titulo="Promedio por clase" valor={porSesion.length ? Math.round((llegaron / porSesion.length) * 10) / 10 : 0} decimales={1} sub="personas que vinieron" emoji="👥" tono="violeta" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
            <p className="text-sm font-black text-slate-800">¿Cuántos vinieron a cada disciplina?</p>
            {!porDisc.length && <p className="text-sm text-slate-400">Aún no hay asistencias en este periodo.</p>}
            {porDisc.map((d) => (
              <div key={d.nombre} className={`rd-kpi-${d.color}`}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-bold text-slate-700">{d.emoji} {d.nombre}</span>
                  <span className="whitespace-nowrap"><b className="text-slate-900">{d.llegaron}</b><span className="text-xs text-slate-500"> vinieron · {d.reservas} reservaron · {d.noVino} faltaron</span></span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                  <div className="h-full rounded-full" style={{ width: `${(d.llegaron / max) * 100}%`, background: "var(--k)" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="md:hidden divide-y divide-slate-100">
              {porSesion.map((x) => (
                <div key={x.id} className="px-3 py-2.5">
                  <p className="text-xs font-black text-slate-500">{fechaBonita(x.fecha)} · {x.inicio}</p>
                  <p className="text-sm font-black text-slate-900">{x.emoji} {x.clase} · <span className="font-bold text-slate-600">{x.profesor}</span></p>
                  <p className="text-xs"><b className="text-emerald-700">{x.llegaron} vinieron</b> · {x.reservaron} reservaron · {x.noVino} faltaron</p>
                </div>
              ))}
              {!porSesion.length && <p className="px-3 py-8 text-center text-sm text-slate-400">Sin datos en este periodo.</p>}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>{["Fecha", "Hora", "Clase", "Profesor", "Vinieron", "Reservaron (app)", "Sin reservar", "No vinieron"].map((h) => <th key={h} className="text-left font-black px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {porSesion.map((x) => (
                    <tr key={x.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 whitespace-nowrap">{fechaBonita(x.fecha)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{x.inicio} – {x.fin}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold">{x.emoji} {x.clase}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{x.profesor}</td>
                      <td className="px-3 py-2 font-black text-emerald-700">{x.llegaron}</td>
                      <td className="px-3 py-2">{x.reservaron}</td>
                      <td className="px-3 py-2">{x.sinReserva}</td>
                      <td className="px-3 py-2 text-rose-700">{x.noVino}</td>
                    </tr>
                  ))}
                  {!porSesion.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Sin datos en este periodo.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Disciplinas, profesores, croquis (administración)
// ---------------------------------------------------------------------
const FormDisciplina = ({ datos, inicial, onListo, onCerrar }) => {
  const [f, setF] = useState(() => ({ nombre: "", emoji: "🎵", color: "teal", descripcion: "", activa: true, profesores: [], ...(inicial || {}) }));
  const [error, setError] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (inicial?.id) await api(`/clases/disciplinas/${inicial.id}`, { method: "PUT", body: f });
      else await api("/clases/disciplinas", { method: "POST", body: f });
      onListo();
    } catch (er) {
      setError(er.message);
    }
  };
  return (
    <Ventana titulo={inicial?.id ? `Editar ${inicial.nombre}` : "Nueva disciplina"} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
          <label className="block text-sm"><span className="font-bold text-slate-700">Emoji</span><input value={f.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={8} className={`${campo} text-center text-lg`} /></label>
          <label className="block text-sm"><span className="font-bold text-slate-700">Nombre *</span><input autoFocus value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={60} className={campo} /></label>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700 mb-1.5">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {COLORES.map((c) => (
              <button key={c} type="button" onClick={() => set("color", c)} className={`rd-kpi-${c} rd-clase-card w-9 h-9 rounded-xl cursor-pointer ${f.color === c ? "ring-2 ring-offset-1 ring-slate-500" : ""}`} title={c} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700 mb-1.5">Profesores que la dictan</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {datos.profesores.map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm cursor-pointer">
                <input type="checkbox" checked={f.profesores.includes(p.id)} onChange={(e) => set("profesores", e.target.checked ? [...f.profesores, p.id] : f.profesores.filter((x) => x !== p.id))} />
                <span className="truncate">{p.nombre}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="block text-sm"><span className="font-bold text-slate-700">Descripción (opcional)</span><input value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} maxLength={300} className={campo} /></label>
        {inicial?.id && (
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={f.activa} onChange={(e) => set("activa", e.target.checked)} /> Activa (se puede elegir en el horario)</label>
        )}
        <Error texto={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
          <button className="px-5 py-2 rounded-xl bg-teal-600 text-white text-sm font-black cursor-pointer">Guardar</button>
        </div>
      </form>
    </Ventana>
  );
};

/** Agregar o cambiar un profesor: nombre, celular, disciplinas y su usuario */
const FormProfesor = ({ datos, inicial, onListo, onCerrar }) => {
  const [nombre0, ...resto] = (inicial?.nombre || "").split(" ");
  const [f, setF] = useState({
    nombres: inicial ? inicial.nombres ?? nombre0 : "",
    apellidos: inicial ? inicial.apellidos ?? resto.join(" ") : "",
    telefono: inicial?.telefono || "",
    disciplinas: inicial?.disciplinas || [],
    crearUsuario: true,
    usuario: "",
  });
  const [error, setError] = useState("");
  const [listo, setListo] = useState(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const clasesDe = inicial ? datos.clases.filter((c) => c.profesorId === inicial.id).length : 0;
  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (inicial) {
        await api(`/clases/profesores/${inicial.id}`, { method: "PUT", body: f });
        onListo(`✅ ${f.nombres} actualizado`);
      } else {
        const r = await api("/clases/profesores", { method: "POST", body: f });
        if (r.usuario) setListo(r);
        else onListo(`✅ ${f.nombres} agregado`);
      }
    } catch (er) {
      setError(er.message);
    }
  };
  const desactivar = async () => {
    setError("");
    try {
      await api(`/clases/profesores/${inicial.id}`, { method: "PUT", body: { activo: false } });
      onListo(`${inicial.nombre} quedó desactivado`);
    } catch (er) {
      setError(er.message);
    }
  };
  if (listo)
    return (
      <Ventana titulo="Profesor agregado" icono={Users} onCerrar={() => onListo(`✅ ${f.nombres} agregado`)}>
        <div className="rd-kpi-verde rd-aviso-t rounded-2xl border p-4 space-y-1">
          <p className="font-black">✅ {f.nombres} ya puede entrar al sistema</p>
          <p className="text-sm">Usuario: <b className="font-mono">{listo.usuario}</b></p>
          <p className="text-sm">Contraseña inicial: <b className="font-mono">{listo.clave}</b> (al entrar se le pide cambiarla)</p>
        </div>
        <button type="button" onClick={() => onListo(`✅ ${f.nombres} agregado`)} className="w-full px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-black cursor-pointer">Listo</button>
      </Ventana>
    );
  return (
    <Ventana titulo={inicial ? `Profesor · ${inicial.nombre}` : "Nuevo profesor"} icono={Users} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="font-bold text-slate-700">Nombre</span>
            <input value={f.nombres} onChange={(e) => set("nombres", e.target.value)} maxLength={80} placeholder="Ej. Mauricio" className={campo} autoFocus />
          </label>
          <label className="text-sm">
            <span className="font-bold text-slate-700">Apellidos <span className="font-normal text-slate-500">(opcional)</span></span>
            <input value={f.apellidos} onChange={(e) => set("apellidos", e.target.value)} maxLength={80} className={campo} />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-bold text-slate-700">Celular <span className="font-normal text-slate-500">(opcional)</span></span>
            <input value={f.telefono} onChange={(e) => set("telefono", e.target.value)} maxLength={20} inputMode="tel" placeholder="9xx xxx xxx" className={campo} />
          </label>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold text-slate-700">¿Qué disciplinas dicta? <span className="font-normal text-slate-500">(puede ser más de una)</span></p>
          <div className="flex flex-wrap gap-1.5">
            {datos.disciplinas.filter((d) => d.activa).map((d) => {
              const on = f.disciplinas.includes(d.id);
              return (
                <button key={d.id} type="button" onClick={() => set("disciplinas", on ? f.disciplinas.filter((x) => x !== d.id) : [...f.disciplinas, d.id])} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${on ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                  {d.emoji} {d.nombre}
                </button>
              );
            })}
          </div>
        </div>
        {!inicial && (
          <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={f.crearUsuario} onChange={(e) => set("crearUsuario", e.target.checked)} /> Darle usuario para entrar (ve sus clases y anota sus discos)
            </label>
            {f.crearUsuario && (
              <label className="text-xs font-bold text-slate-600 block">
                Usuario <span className="font-normal">(si lo dejas vacío se crea con su nombre)</span>
                <input value={f.usuario} onChange={(e) => set("usuario", e.target.value.toLowerCase().replace(/\s/g, ""))} maxLength={40} placeholder={(f.nombres || "nombre").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ".")} className={campo} />
              </label>
            )}
          </div>
        )}
        {inicial && (
          <p className="text-xs text-slate-500">
            {inicial.usuario ? <>Entra con el usuario <b className="font-mono">{inicial.usuario}</b>. </> : "No tiene usuario para entrar. "}
            Tiene {clasesDe} clase{clasesDe === 1 ? "" : "s"} en el horario.
          </p>
        )}
        <Error texto={error} />
        <div className="flex flex-wrap justify-between gap-2">
          {inicial ? (
            <button type="button" onClick={desactivar} className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-bold cursor-pointer">Desactivar profesor</button>
          ) : <span />}
          <button disabled={!f.nombres.trim()} className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
            <Save className="w-4 h-4" /> {inicial ? "Guardar cambios" : "Agregar profesor"}
          </button>
        </div>
      </form>
    </Ventana>
  );
};

/** Sedes del gimnasio: cada una con su horario y su salón */
const Sedes = ({ datos, recargar }) => {
  const [nueva, setNueva] = useState("");
  const [editar, setEditar] = useState(null); // { id, nombre }
  const [msg, setMsg] = useState(null);
  const [todas, setTodas] = useState(null);
  const cargar = () => api("/clases/sedes").then((d) => setTodas(d)).catch(() => setTodas({ conSedes: false, sedes: [] }));
  useEffect(() => {
    cargar();
  }, []);
  const ok = (texto) => (setMsg({ ok: true, texto }), cargar(), recargar());
  const fallo = (e) => setMsg({ ok: false, texto: e.message });
  const crear = (e) => {
    e.preventDefault();
    api("/clases/sedes", { method: "POST", body: { nombre: nueva } }).then(() => (setNueva(""), ok(`✅ Sede «${nueva}» creada. Ahora dibuja su salón abajo.`))).catch(fallo);
  };
  const guardar = (x, cambios) => api(`/clases/sedes/${x.id}`, { method: "PUT", body: { nombre: x.nombre, ...cambios } });
  if (!todas) return null;
  if (!todas.conSedes)
    return (
      <div className="rd-kpi-ambar rd-aviso-t rounded-2xl border p-4 text-sm">
        <b>📍 Sedes:</b> para manejar varias sedes (cada una con su horario y su salón) ejecuta la parte 42 (42_sedes_licencia.sql) en MySQL Workbench.
      </div>
    );
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div>
        <p className="text-sm font-black text-slate-800">📍 Sedes</p>
        <p className="text-xs text-slate-500">Cada sede tiene su propio horario de clases, sus másters y su croquis de steps. Si el gimnasio tiene una sola, déjala con su nombre.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {todas.sedes.map((x) =>
          editar?.id === x.id ? (
            <form key={x.id} onSubmit={(e) => (e.preventDefault(), guardar({ ...x, nombre: editar.nombre }).then(() => (setEditar(null), ok("✅ Sede renombrada"))).catch(fallo))} className="flex items-center gap-1.5">
              <input value={editar.nombre} onChange={(e) => setEditar({ ...editar, nombre: e.target.value })} maxLength={80} autoFocus className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm" />
              <button className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-black cursor-pointer">Guardar</button>
              <button type="button" onClick={() => setEditar(null)} className="px-2 py-1.5 rounded-xl text-xs font-bold text-slate-500 cursor-pointer">Cancelar</button>
            </form>
          ) : (
            <span key={x.id} className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm font-bold ${x.activa ? "border-slate-200 text-slate-800" : "border-dashed border-slate-300 text-slate-400"}`}>
              📍 {x.nombre}
              <button type="button" onClick={() => setEditar({ id: x.id, nombre: x.nombre })} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer" title="Renombrar"><Pencil className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => guardar(x, { activa: !x.activa }).then(() => ok(x.activa ? `${x.nombre} quedó desactivada` : `✅ ${x.nombre} activa otra vez`)).catch(fallo)} className="px-1.5 py-0.5 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100 cursor-pointer">{x.activa ? "Desactivar" : "Activar"}</button>
            </span>
          ),
        )}
      </div>
      <form onSubmit={crear} className="flex flex-wrap items-center gap-2">
        <input value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={80} placeholder="Nombre de la nueva sede (ej. Sede Norte)" className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        <button disabled={!nueva.trim()} className="px-4 py-2 rounded-xl bg-teal-600 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Agregar sede</button>
      </form>
      {msg && <p className={`text-sm font-bold rounded-xl border p-3 ${msg.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.texto}</p>}
    </div>
  );
};

const Configuracion = ({ datos, recargar }) => {
  const sedes = datos.sedes || [];
  const [sedeSalon, setSedeSalon] = useState(sedes[0]?.id || null);
  const sedeOk = sedes.some((x) => x.id === sedeSalon) ? sedeSalon : sedes[0]?.id || null;
  const { croquis, setCroquis, cargarCroquis } = useCroquis(sedeOk);
  const [borrador, setBorrador] = useState(null);
  const [minutos, setMinutos] = useState(30);
  const [msg, setMsg] = useState(null);
  const [disc, setDisc] = useState(null);
  const [profe, setProfe] = useState(null);
  const [aviso, setAviso] = useState("");
  useEffect(() => {
    if (croquis) (setBorrador(croquis.steps), setMinutos(croquis.minutosReserva));
  }, [croquis]);
  const sinGuardar = croquis && borrador && (JSON.stringify(borrador) !== JSON.stringify(croquis.steps) || Number(minutos) !== croquis.minutosReserva);
  const guardar = async () => {
    try {
      const r = await api("/clases/croquis", { method: "PUT", body: { sede: sedeOk, steps: borrador, minutosReserva: Number(minutos) } });
      setCroquis((c) => ({ ...c, steps: r.steps, minutosReserva: r.minutosReserva }));
      setMsg({ ok: true, texto: `✅ Croquis${sedes.length > 1 ? ` de ${sedes.find((x) => x.id === sedeOk)?.nombre}` : ""} guardado. Ya lo ven recepción, los profesores y los alumnos.${r.liberados ? ` ⚠️ ${r.liberados} inscrito${r.liberados === 1 ? "" : "s"} de másters ${r.liberados === 1 ? "quedó" : "quedaron"} sin step: dales otro en Másters.` : ""}` });
    } catch (er) {
      setMsg({ ok: false, texto: er.message });
    }
  };
  return (
    <div className="space-y-5">
      <Sedes datos={datos} recargar={recargar} />
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-slate-800">🎵 Disciplinas</p>
          <button type="button" onClick={() => setDisc({})} className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-black flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Nueva disciplina</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          {datos.disciplinas.map((d) => (
            <button key={d.id} type="button" onClick={() => setDisc(d)} className={`rd-kpi-${d.color} rd-clase-card rounded-xl p-3 text-left cursor-pointer ${d.activa ? "" : "opacity-50"}`}>
              <p className="text-base font-black">{d.emoji} {d.nombre}</p>
              <p className="text-xs opacity-90">{d.profesores.length ? datos.profesores.filter((p) => d.profesores.includes(p.id)).map((p) => p.nombre).join(", ") : "Sin profesor"}</p>
              {!d.activa && <p className="text-[11px] font-black">Desactivada</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-black text-slate-800">🧑‍🏫 Profesores</p>
            <p className="text-xs text-slate-500">Toca un profesor para cambiar su nombre o sus disciplinas. Una disciplina puede tener varios profesores. Para cambiar quién dicta una clase, edítala en el Horario.</p>
          </div>
          <button type="button" onClick={() => setProfe({})} className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-black flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Nuevo profesor</button>
        </div>
        {aviso && <p className="text-sm font-bold rounded-xl border p-3 rd-kpi-verde rd-aviso-t">{aviso}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {datos.profesores.map((p) => {
            const n = datos.clases.filter((c) => c.profesorId === p.id).length;
            return (
              <button key={p.id} type="button" onClick={() => setProfe(p)} className="rounded-xl border border-slate-200 px-3 py-2 text-left cursor-pointer hover:bg-slate-50 space-y-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-black text-slate-800">{p.nombre}</span>
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">{n} clase{n === 1 ? "" : "s"}</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {p.disciplinas.length ? (
                    datos.disciplinas.filter((d) => p.disciplinas.includes(d.id)).map((d) => <span key={d.id} className={`rd-kpi-${d.color} rd-clase-card px-2 py-0.5 rounded-full text-[10px] font-black`}>{d.emoji} {d.nombre}</span>)
                  ) : (
                    <span className="text-[11px] text-slate-400">Sin disciplina</span>
                  )}
                </span>
                <span className="block text-[11px] text-slate-500 font-mono">{p.usuario ? `👤 ${p.usuario}` : "sin usuario"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-800">🧱 Croquis del salón (steps){sedes.length > 1 ? ` · ${sedes.find((x) => x.id === sedeOk)?.nombre}` : ""}</p>
            <p className="text-xs text-slate-500">Lo que guardes aquí lo ven todos: recepción, profesores y la app de los alumnos.</p>
            {sedes.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sedes.map((x) => (
                  <button key={x.id} type="button" disabled={!!sinGuardar && x.id !== sedeOk} title={sinGuardar && x.id !== sedeOk ? "Guarda o descarta los cambios antes de cambiar de sede" : ""} onClick={() => (setSedeSalon(x.id), setMsg(null))} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer disabled:opacity-40 ${sedeOk === x.id ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>📍 {x.nombre}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3 space-y-2">
          <p className="text-sm font-black text-slate-800"><Clock className="inline w-4 h-4 -mt-0.5" /> ¿Desde cuándo reservan los alumnos por la app?</p>
          <p className="text-xs text-slate-600">La reserva se abre este tiempo antes de cada clase y se cierra al empezar. El primero que toma un step se lo queda. Vale para todas las sedes.</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {[[15, "15 min"], [30, "30 min"], [60, "1 hora"], [120, "2 horas"], [360, "6 horas"], [720, "12 horas"], [1440, "24 horas"]].map(([n, l]) => (
              <button key={n} type="button" onClick={() => setMinutos(n)} className={`px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer ${Number(minutos) === n ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{l}</button>
            ))}
            <span className="flex items-center gap-1 text-xs font-bold text-slate-600 ml-1">
              u otro: <input type="number" min={5} max={1440} value={minutos} onChange={(e) => setMinutos(e.target.value)} className="w-20 px-2 py-1 rounded-lg border border-slate-200 bg-white text-sm" /> min
            </span>
          </div>
          {Number(minutos) !== croquis?.minutosReserva && <p className="text-[11px] font-bold text-violet-700">Toca «Guardar» abajo para aplicar el nuevo tiempo.</p>}
        </div>
        {borrador ? <EditorCroquis croquis={{ ...croquis, steps: borrador }} onCambiar={setBorrador} /> : <p className="text-sm text-slate-500">Cargando croquis…</p>}
        {msg && <p className={`text-sm font-bold rounded-xl border p-3 ${msg.ok ? "rd-kpi-verde rd-aviso-t" : "text-rose-700 bg-rose-50 border-rose-200"}`}>{msg.texto}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {sinGuardar && <button type="button" onClick={() => (cargarCroquis(), setMsg(null))} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Descartar cambios</button>}
          <button type="button" disabled={!sinGuardar} onClick={guardar} className="px-5 py-2 rounded-xl bg-teal-600 disabled:opacity-50 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
            <Save className="w-4 h-4" /> Guardar cambios
          </button>
        </div>
      </div>
      {profe && <FormProfesor datos={datos} inicial={profe.id ? profe : null} onCerrar={() => setProfe(null)} onListo={(t) => (setProfe(null), setAviso(t), recargar())} />}
      {disc && <FormDisciplina datos={datos} inicial={disc.id ? disc : null} onCerrar={() => setDisc(null)} onListo={() => (setDisc(null), recargar())} />}
    </div>
  );
};

// ---------------------------------------------------------------------
// Módulo
// ---------------------------------------------------------------------
export default function ClasesModule() {
  const { datos, error, faltanTablas, cargar } = useDatosClases();
  const yo = datos?.yo || {};
  const esProfe = yo.rol === "instructor";
  const [vista, setVista] = useState(null);
  const [claseSteps, setClaseSteps] = useState(null);
  // Sin pestaña elegida al entrar (como el resto de módulos)
  const v = vista;
  const pestanas = [
    { k: "horario", icono: CalendarDays, label: "Horario", tono: "teal" },
    { k: "steps", icono: LayoutGrid, label: "Reservas", tono: "violet" },
    { k: "discos", icono: Disc3, label: esProfe ? "Mis discos" : "Discos", tono: "amber" },
    { k: "masters", icono: Star, label: "Másters", tono: "amber" },
    { k: "reporte", icono: BarChart3, label: "Asistencia", tono: "teal" },
    ...(["admin", "reception", "instructor"].includes(yo.rol) ? [{ k: "calificaciones", icono: Star, label: "Calificaciones", tono: "amber" }] : []),
    ...(yo.rol === "admin" ? [{ k: "config", icono: Settings2, label: "Disciplinas y salón", tono: "rose" }] : []),
  ];
  return (
    <div className="space-y-5">
      <CabeceraModulo
        icono={Music}
        etiqueta="Salud & Entrenamiento"
        titulo="Clases grupales"
        descripcion={esProfe ? "Tus clases de la semana y el disco que dictarás. Lo que envíes lo ven administración, recepción y los alumnos." : "Horario semanal, steps del salón con sus reservas y los discos que dictará cada profesor."}
        accion={GESTIONA.includes(yo.rol) && v && v !== "horario" && <AccionCabecera icono={CalendarDays} onClick={() => setVista("horario")}>Ver horario</AccionCabecera>}
        activa={v}
        onCambiar={(k) => (setVista(k), setClaseSteps(null))}
        pestanas={pestanas}
      />
      {faltanTablas ? (
        <div className="rd-kpi-ambar rd-aviso-t rounded-2xl border p-5">
          <p className="font-black">🛠️ Falta un paso en la base de datos</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : !datos ? (
        <p className="text-sm text-slate-500">{error || "Cargando clases grupales…"}</p>
      ) : (
        <>
          {!v && <SinSeleccion tema="clases" texto={esProfe ? "Elige una opción de arriba: «Mis discos» para anotar lo que dictarás o «Calificaciones» para ver cómo califican tus clases." : "Elige una opción de arriba: horario, reservas, discos, másters, asistencia o calificaciones."} />}
          {v === "horario" && <Horario datos={datos} recargar={cargar} yo={yo} onSteps={(id) => (setClaseSteps(id), setVista("steps"))} />}
          {v === "steps" && <Steps yo={yo} claseInicial={claseSteps} sedes={datos.sedes} />}
          {v === "discos" && (esProfe ? <MisDiscos /> : <ReporteDiscos datos={datos} puedeEditar={GESTIONA.includes(yo.rol)} />)}
          {v === "masters" && <Masters datos={datos} rol={yo.rol} />}
          {v === "reporte" && <ReporteAsistencia datos={datos} />}
          {v === "calificaciones" && <Calificaciones datos={datos} esProfe={esProfe} />}
          {v === "config" && yo.rol === "admin" && <Configuracion datos={datos} recargar={cargar} />}
        </>
      )}
    </div>
  );
}
