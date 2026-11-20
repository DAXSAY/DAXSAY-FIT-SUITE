// Piezas del formulario de contratos: funciones por cargo, horario con
// cálculo automático de horas, reglas de tardanza y la renovación.
import { CampoNumero } from "../common/CampoNumero";
import React, { useState } from "react";
import { Plus, X, RotateCw, CheckCircle2, Clock, Pencil, Save } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { hoyISO } from "../../utils/fecha";
import {
  DURACIONES,
  DIAS_SEMANA,
  FUNCIONES_POR_ROL,
  MODALIDADES,
  REGLAS_TARDANZA_BASE,
  fechaFin,
  horasSemana,
  leerReglas,
  textoReglas,
  descuentoTardanza,
} from "../../utils/contratos";

const fCorta = (f) => (f ? f.split("-").reverse().join("/") : "—");

/** Chips de duración: 1 mes, 3 meses, 6 meses, 1 año */
export const SelectorDuracion = ({ value, onChange }) => (
  <div className="grid grid-cols-4 gap-2">
    {Object.entries(DURACIONES).map(([k, d]) => (
      <button
        key={k}
        type="button"
        onClick={() => onChange(k)}
        className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${value === k ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
      >
        {d.corto}
      </button>
    ))}
  </div>
);

/** Funciones del cargo (selección múltiple + funciones propias) */
export const SelectorFunciones = ({ rol, value = [], onChange }) => {
  const [nueva, setNueva] = useState("");
  const base = FUNCIONES_POR_ROL[rol] || [];
  const opciones = [...base, ...value.filter((f) => !base.includes(f))];
  const alternar = (f) => onChange(value.includes(f) ? value.filter((x) => x !== f) : [...value, f]);
  const agregar = () => {
    const t = nueva.trim();
    if (t.length < 3) return;
    if (!value.includes(t)) onChange([...value, t]);
    setNueva("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {opciones.map((f) => {
          const on = value.includes(f);
          return (
            <button
              key={f}
              type="button"
              onClick={() => alternar(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${on ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-300"}`}
            >
              {on ? "✓ " : ""}
              {f}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="Agregar otra función…"
          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
        />
        <button type="button" onClick={agregar} className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>
      <p className="text-[11px] text-slate-500">{value.length} función(es) elegida(s). Aparecen en el contrato que ve el trabajador.</p>
    </div>
  );
};

/** Modalidad + días + horario. Las horas semanales se calculan solas. */
export const EditorHorario = ({ modalidad, onModalidad, value, onChange }) => {
  const h = value || MODALIDADES[modalidad]?.horario;
  const total = horasSemana(h);
  const alternarDia = (d) => onChange({ ...h, dias: h.dias.includes(d) ? h.dias.filter((x) => x !== d) : [...h.dias, d] });
  const exceso = total > 48;
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(MODALIDADES).map(([k, m]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              onModalidad(k);
              onChange({ ...m.horario });
            }}
            className={`p-2 rounded-xl border text-left cursor-pointer ${modalidad === k ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            <span className="block text-xs font-black">{m.label}</span>
            <span className={`block text-[10px] ${modalidad === k ? "text-blue-100" : "text-slate-500"}`}>{m.sub}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="block text-[11px] font-bold text-slate-600 mb-1">Días de trabajo</span>
          <div className="flex gap-1">
            {DIAS_SEMANA.map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => alternarDia(k)}
                className={`w-8 h-8 rounded-lg text-xs font-black border cursor-pointer ${h.dias.includes(k) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <label className="text-[11px] font-bold text-slate-600">
          Entrada
          <input type="time" value={h.entrada} onChange={(e) => onChange({ ...h, entrada: e.target.value })} className="block mt-1 px-2 py-1.5 rounded-lg border border-slate-300 text-sm bg-white" />
        </label>
        <label className="text-[11px] font-bold text-slate-600">
          Salida
          <input type="time" value={h.salida} onChange={(e) => onChange({ ...h, salida: e.target.value })} className="block mt-1 px-2 py-1.5 rounded-lg border border-slate-300 text-sm bg-white" />
        </label>
        <label className="text-[11px] font-bold text-slate-600">
          Refrigerio (min)
          <CampoNumero type="number" min="0" step="15" value={h.refrigerio || 0} onChange={(e) => onChange({ ...h, refrigerio: Number(e.target.value) })} className="block mt-1 w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-sm bg-white" />
        </label>
        <div className={`ml-auto px-3 py-1.5 rounded-xl text-center ${exceso ? "bg-rose-50 border border-rose-300" : "bg-emerald-50 border border-emerald-200"}`}>
          <span className={`block text-lg font-black ${exceso ? "text-rose-700" : "text-emerald-700"}`}>{total} h</span>
          <span className="block text-[10px] font-bold uppercase text-slate-500">por semana</span>
        </div>
      </div>
      {exceso && <p className="text-[11px] font-bold text-rose-700">La jornada legal máxima es 48 horas semanales.</p>}
    </div>
  );
};

/** Tarjeta con las reglas de descuento por tardanza (editables por administración) */
export const ReglasTardanza = () => {
  const { gymConfig = {}, saveGymConfig, currentUser } = useGym();
  const reglas = leerReglas(gymConfig);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");
  const admin = currentUser?.role === "admin";
  const guardar = async () => {
    setError("");
    try {
      await saveGymConfig({ reglas_tardanza: JSON.stringify(edit) });
      setEdit(null);
    } catch (e) {
      setError(e.message || "No se pudo guardar");
    }
  };
  const ejemplo = (min) => descuentoTardanza(min, edit || reglas, 60);
  const r = edit || reglas;
  const num = (k, paso = 1) => (
    <CampoNumero type="number" min="0" step={paso} value={r[k]} onChange={(e) => setEdit({ ...r, [k]: Number(e.target.value) })} className="w-20 px-2 py-1 rounded-lg border border-slate-300 text-sm font-bold bg-white" />
  );
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" /> Reglas de descuento por tardanza
        </h3>
        {admin && !edit && (
          <button type="button" onClick={() => setEdit({ ...reglas })} className="text-xs font-bold text-blue-700 flex items-center gap-1 cursor-pointer">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        )}
      </div>
      {!edit ? (
        <p className="text-xs text-slate-600">{textoReglas(reglas)}</p>
      ) : (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex items-center gap-2 font-bold text-slate-700">Tolerancia {num("tolerancia")} min</label>
            <label className="flex items-center gap-2 font-bold text-slate-700">Descontar día completo si llega {num("diaCompletoDespues", 5)} min tarde (0 = nunca)</label>
            <label className="flex items-center gap-2 font-bold text-slate-700">Amonestación con más de {num("maxTardanzasMes")} tardanzas al mes</label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700">Pasada la tolerancia:</span>
            {[
              ["por_minuto", "Descuento por minuto"],
              ["monto_fijo", "Monto fijo por tardanza"],
              ["ninguno", "Sin descuento"],
            ].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setEdit({ ...r, modo: k })} className={`px-2.5 py-1 rounded-full font-bold border cursor-pointer ${r.modo === k ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-slate-200 text-slate-700"}`}>
                {l}
              </button>
            ))}
            {r.modo === "por_minuto" && <label className="flex items-center gap-1.5 font-bold">S/ {num("montoMinuto", 0.1)} por minuto</label>}
            {r.modo === "monto_fijo" && <label className="flex items-center gap-1.5 font-bold">S/ {num("montoFijo", 1)} por tardanza</label>}
          </div>
          <p className="text-slate-500">
            Ejemplo (sueldo diario S/ 60): 5 min → S/ {ejemplo(5).toFixed(2)} · 20 min → S/ {ejemplo(20).toFixed(2)} · 45 min → S/ {ejemplo(45).toFixed(2)} · 70 min → S/ {ejemplo(70).toFixed(2)}
          </p>
          {error && <p className="font-bold text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEdit({ ...REGLAS_TARDANZA_BASE })} className="px-3 py-1.5 rounded-lg font-bold text-slate-500 hover:bg-slate-100 cursor-pointer">
              Valores sugeridos
            </button>
            <button type="button" onClick={() => setEdit(null)} className="px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
              Cancelar
            </button>
            <button type="button" onClick={guardar} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black flex items-center gap-1 cursor-pointer">
              <Save className="w-3.5 h-3.5" /> Guardar reglas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Renovación: nueva duración, inicio, cargo, sueldo y funciones */
export const RenovarContrato = ({ contrato, onCerrar, onConfirmar }) => {
  const sigDia = (f) => {
    const d = new Date(`${f}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const inicioSugerido = contrato.endDate && contrato.endDate >= hoyISO() ? sigDia(contrato.endDate) : hoyISO();
  const [o, setO] = useState({
    duracion: contrato.contractType && DURACIONES[contrato.contractType] ? contrato.contractType : "6_months",
    inicio: inicioSugerido,
    titulo: contrato.roleTitle || "",
    sueldo: contrato.monthlySalary || 0,
    funciones: contrato.functions?.length ? contrato.functions : (FUNCIONES_POR_ROL[contrato.role] || []).slice(0, 4),
    notas: contrato.notes || "",
  });
  const [error, setError] = useState("");
  const cambioSueldo = Number(o.sueldo) - Number(contrato.monthlySalary || 0);
  const confirmar = () => {
    if (!o.titulo.trim()) return setError("Escribe el cargo.");
    if (!(Number(o.sueldo) > 0)) return setError("Escribe el sueldo.");
    if (!o.funciones.length) return setError("Elige al menos una función.");
    onConfirmar(o);
  };
  const campo = "w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold";
  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto min-h-full bg-white p-5 sm:p-7 space-y-4 text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-emerald-600" /> Renovar contrato
            </h3>
            <p className="text-xs text-slate-500">
              {contrato.fullName} · <b className="font-mono text-violet-700">{contrato.staffCode}</b> · actual: {contrato.contractDurationLabel} ({fCorta(contrato.startDate)} al {fCorta(contrato.endDate)})
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800">1. Duración del nuevo contrato</p>
          <SelectorDuracion value={o.duracion} onChange={(duracion) => setO({ ...o, duracion })} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600">
              Empieza el
              <input type="date" value={o.inicio} onChange={(e) => setO({ ...o, inicio: e.target.value })} className={`${campo} mt-1`} />
            </label>
            <div className="text-xs font-bold text-slate-600">
              Termina el
              <p className="mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-black text-slate-900">{fCorta(fechaFin(o.inicio, o.duracion))}</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-600">
            2. Cargo (título)
            <input value={o.titulo} onChange={(e) => setO({ ...o, titulo: e.target.value })} className={`${campo} mt-1`} />
          </label>
          <label className="text-xs font-bold text-slate-600">
            3. Sueldo mensual (S/)
            <CampoNumero type="number" min="0" value={o.sueldo} onChange={(e) => setO({ ...o, sueldo: e.target.value })} className={`${campo} mt-1`} />
            {cambioSueldo !== 0 && (
              <span className={`block mt-1 text-[11px] ${cambioSueldo > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {cambioSueldo > 0 ? "Aumento" : "Reducción"} de S/ {Math.abs(cambioSueldo).toFixed(2)} ({Math.round((cambioSueldo / (contrato.monthlySalary || 1)) * 100)}%)
              </span>
            )}
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800">4. Funciones del cargo</p>
          <SelectorFunciones rol={contrato.role} value={o.funciones} onChange={(funciones) => setO({ ...o, funciones })} />
        </div>

        <label className="block text-xs font-bold text-slate-600">
          Notas (opcional)
          <input value={o.notas} onChange={(e) => setO({ ...o, notas: e.target.value })} placeholder="Ej. Pasa al turno tarde desde enero" className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm" />
        </label>

        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          El contrato anterior queda guardado en el historial. El trabajador verá el nuevo contrato con sus funciones en «Mi contrato».
        </p>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Cancelar
          </button>
          <button type="button" onClick={confirmar} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black flex items-center gap-1.5 cursor-pointer">
            <CheckCircle2 className="w-4 h-4" /> Confirmar renovación
          </button>
        </div>
      </div>
    </div>
  );
};
