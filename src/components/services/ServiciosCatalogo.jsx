// =====================================================================
// Servicios sueltos y sus precios (administración / gerencia)
//  Lo que un alumno puede pagar aparte cuando su plan no lo incluye:
//  control de medidas, dieta, evaluación nutricional, fisioterapia…
//  También: después de cuántos días avisar si un servicio incluido o
//  pagado no se le hizo.
// =====================================================================
import React, { useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";
import { api } from "../../api/cliente";

const campo = "w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800";
const CATEGORIAS = [["nutricion", "Nutrición"], ["fisioterapia", "Fisioterapia"], ["entrenamiento_personal", "Entrenamiento personal"], ["otros", "Otros"]];

const Fila = ({ s, onGuardado }) => {
  const [f, setF] = useState(s);
  const [msg, setMsg] = useState("");
  const cambio = JSON.stringify(f) !== JSON.stringify(s);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const guardar = async () => {
    try {
      await api(`/servicios/catalogo/${s.id}`, { method: "PUT", body: f });
      setMsg("✅");
      onGuardado();
    } catch (e) {
      setMsg(e.message);
    }
  };
  return (
    <div className={`rounded-xl border p-3 space-y-2 ${f.activo ? "border-slate-200" : "border-dashed border-slate-300 opacity-70"}`}>
      <div className="flex items-center gap-2">
        <input value={f.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={4} className="w-12 shrink-0 px-1 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-center" aria-label="Emoji" />
        <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={80} className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 font-bold" aria-label="Nombre" />
        <label className="flex items-center gap-1 text-xs font-bold text-slate-600 whitespace-nowrap">
          <input type="checkbox" checked={f.activo} onChange={(e) => set("activo", e.target.checked)} /> Se ofrece
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-slate-600">
        <label>
          Precio (S/)
          <input type="number" min={0} step="0.5" value={f.precio} onChange={(e) => set("precio", e.target.value)} className={campo} />
        </label>
        <label>
          Tipo
          <select value={f.modo} onChange={(e) => set("modo", e.target.value)} className={campo}>
            <option value="periodo">Por tiempo</option>
            <option value="sesiones">Por sesiones</option>
          </select>
        </label>
        {f.modo === "periodo" ? (
          <label>
            Vale (días)
            <input type="number" min={1} max={400} value={f.dias} onChange={(e) => set("dias", e.target.value)} className={campo} />
          </label>
        ) : (
          <label>
            Sesiones
            <input type="number" min={1} max={100} value={f.sesiones} onChange={(e) => set("sesiones", e.target.value)} className={campo} />
          </label>
        )}
        <label>
          En caja como
          <select value={f.categoria} onChange={(e) => set("categoria", e.target.value)} className={campo}>
            {CATEGORIAS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
      </div>
      {(cambio || msg) && (
        <div className="flex items-center justify-end gap-2">
          {msg && <span className={`text-xs font-bold ${msg === "✅" ? "text-emerald-600" : "text-rose-600"}`}>{msg === "✅" ? "Guardado" : msg}</span>}
          {cambio && <button type="button" onClick={guardar} className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-black flex items-center gap-1 cursor-pointer"><Save className="w-3.5 h-3.5" /> Guardar</button>}
        </div>
      )}
    </div>
  );
};

export default function ServiciosCatalogo() {
  const [datos, setDatos] = useState(null);
  const [nuevo, setNuevo] = useState(null);
  const [dias, setDias] = useState(7);
  const [msg, setMsg] = useState("");
  const cargar = () => api("/servicios/catalogo").then((d) => (setDatos(d), setDias(d.diasAviso || 7))).catch(() => setDatos({ conServicios: false }));
  useEffect(() => {
    cargar();
  }, []);
  if (!datos) return null;
  if (!datos.conServicios)
    return (
      <div className="rd-kpi-ambar rd-aviso-t rounded-2xl border p-4 text-sm">
        <b>🧾 Servicios por socio:</b> para vender medidas, dieta, evaluación o fisioterapia aparte de los planes, ejecuta la parte 43 (43_servicios_alumno.sql) en MySQL Workbench.
      </div>
    );
  const crear = async (e) => {
    e.preventDefault();
    try {
      await api("/servicios/catalogo", { method: "POST", body: nuevo });
      setNuevo(null);
      cargar();
    } catch (er) {
      setMsg(er.message);
    }
  };
  const guardarDias = async () => {
    try {
      await api("/servicios/ajustes", { method: "PUT", body: { diasAviso: Number(dias) } });
      setMsg("✅ Guardado");
    } catch (er) {
      setMsg(er.message);
    }
  };
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">🧾 Servicios aparte y sus precios</h3>
          <p className="text-xs text-slate-500 max-w-2xl">Lo que un socio paga aparte si su plan no lo incluye (o quiere más). Ej.: 2 meses solo control de medidas y al tercero suma la dieta. Qué incluye cada plan se elige al editar el plan.</p>
        </div>
        <button type="button" onClick={() => setNuevo({ nombre: "", emoji: "⭐", modo: "sesiones", dias: 30, sesiones: 1, precio: 0, categoria: "otros" })} className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-black flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Nuevo servicio</button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {datos.servicios.map((s) => <Fila key={`${s.id}-${s.precio}-${s.nombre}-${s.activo}`} s={s} onGuardado={cargar} />)}
      </div>
      {nuevo && (
        <form onSubmit={crear} className="rounded-xl border border-teal-300 p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-bold text-slate-600">
          <label className="sm:col-span-2">Nombre<input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} maxLength={80} placeholder="Ej. Masaje deportivo" className={campo} autoFocus /></label>
          <label>Precio (S/)<input type="number" min={0} step="0.5" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} className={campo} /></label>
          <label>
            Tipo
            <select value={nuevo.modo} onChange={(e) => setNuevo({ ...nuevo, modo: e.target.value })} className={campo}>
              <option value="sesiones">Por sesiones</option>
              <option value="periodo">Por tiempo</option>
            </select>
          </label>
          <div className="sm:col-span-4 flex justify-end gap-2">
            <button type="button" onClick={() => setNuevo(null)} className="px-3 py-1.5 rounded-lg text-slate-600 cursor-pointer">Cancelar</button>
            <button disabled={!nuevo.nombre.trim()} className="px-4 py-1.5 rounded-lg bg-teal-600 disabled:opacity-40 text-white font-black cursor-pointer">Crear</button>
          </div>
        </form>
      )}
      <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-600">
          🔔 Avisar al personal si un servicio incluido o pagado no se hace en
          <span className="flex items-center gap-1.5 mt-1">
            <input type="number" min={1} max={90} value={dias} onChange={(e) => setDias(e.target.value)} className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800" /> días
          </span>
        </label>
        <button type="button" onClick={guardarDias} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">Guardar</button>
        {msg && <span className="text-xs font-bold text-slate-600">{msg}</span>}
      </div>
    </section>
  );
}
