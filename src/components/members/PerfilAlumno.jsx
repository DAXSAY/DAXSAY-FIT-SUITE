// =====================================================================
// PERFIL DEL ALUMNO (lo ven administración, recepción, entrenador,
// fisioterapia y nutrición al tocar a un alumno)
// Ordenado en bloques: cabecera con su estado, membresía con barra de días,
// datos personales, contacto de emergencia, ficha deportiva (rutina,
// fisioterapia, dieta, asistencia), entrenador y rutina, y salud.
// =====================================================================
import React from "react";
import { Printer, X } from "lucide-react";
import ServiciosAlumno from "../services/ServiciosAlumno";
import { FichaDeportiva } from "./FichaDeportiva";
import { TelWhatsApp } from "../common/TelWhatsApp";
import { BotonesDescarga } from "../common/BotonesDescarga";
import { IconoEmoji } from "../common/IconoEmoji";
import { fechaCorta, hoyISO } from "../../utils/fecha";
import { textoObjetivos } from "../../utils/objetivos";
import { textoPlazo } from "./DebtDueDate";

const soles = (n) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dias = (a, b) => Math.round((new Date(`${String(b).slice(0, 10)}T12:00:00Z`) - new Date(`${String(a).slice(0, 10)}T12:00:00Z`)) / 86400000);
const edad = (iso) => {
  if (!iso) return null;
  const n = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e -= 1;
  return e > 0 && e < 120 ? e : null;
};
const SEXO = { M: "Masculino", F: "Femenino", masculino: "Masculino", femenino: "Femenino" };

export const estadoDe = (m) =>
  m.status === "frozen"
    ? { e: "❄️", l: "Congelado", t: "azul" }
    : m.status === "active"
      ? { e: "✅", l: "Vigente", t: "verde" }
      : m.status === "expiring_soon"
        ? { e: "⏳", l: "Por vencer", t: "ambar" }
        : m.memberState === "exalumno"
          ? { e: "👋", l: "Exsocio", t: "plomo" }
          : { e: "⏰", l: "Vencido", t: "rojo" };

const Bloque = ({ titulo, emoji, tono = "plomo", derecha, children, className = "" }) => (
  <section className={`rd-kpi-${tono} rd-perfil-bloque rounded-2xl border p-4 space-y-3 ${className}`}>
    <div className="flex items-center justify-between gap-2">
      <h4 className="text-xs font-black uppercase tracking-wider rd-texto-k flex items-center gap-1.5">
        <IconoEmoji e={emoji} /> {titulo}
      </h4>
      {derecha}
    </div>
    {children}
  </section>
);

const Dato = ({ l, v, mono = false, fuerte = false }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
    <span className="text-xs font-bold text-slate-500 shrink-0">{l}</span>
    <span className={`text-sm text-right min-w-0 break-words ${mono ? "font-mono" : ""} ${fuerte ? "font-black text-slate-900" : "font-semibold text-slate-700"}`}>{v || <span className="text-slate-400 font-normal">—</span>}</span>
  </div>
);

export const PerfilAlumno = ({ m, gestiona, trainers = [], routines = [], onCerrar, onCuenta, onCalendario, onEditar, onEntrenador, onRutina }) => {
  const est = estadoDe(m);
  const hoy = hoyISO();
  const ini = m.membershipStartDate ? String(m.membershipStartDate).slice(0, 10) : "";
  const fin = m.membershipEndDate ? String(m.membershipEndDate).slice(0, 10) : "";
  const total = ini && fin ? Math.max(1, dias(ini, fin)) : 0;
  const quedan = fin ? dias(hoy, fin) : null;
  const pct = total ? Math.min(100, Math.max(0, Math.round(((total - Math.max(0, quedan)) / total) * 100))) : 0;
  const anios = edad(m.birthDate);
  const em = m.emergencyContact || {};
  const hayEmergencia = em.name || em.phone;
  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className={`rd-kpi-${est.t} rd-perfil-cab rounded-2xl border p-4 sm:p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="rd-perfil-foto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center text-3xl font-black shrink-0">
              {m.photoUrl ? <img src={m.photoUrl} alt={m.fullName} className="w-full h-full object-cover" /> : m.fullName.charAt(0)}
            </div>
            <div className="min-w-0 space-y-1.5">
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">{m.fullName}</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rd-chip-t px-2 py-0.5 rounded-lg text-xs font-black font-mono">{m.codeLabel}</span>
                <span className="rd-chip-t px-2 py-0.5 rounded-full text-xs font-black inline-flex items-center gap-1">
                  <IconoEmoji e={est.e} /> {est.l}
                </span>
                {m.objective && (
                  <span className="rd-kpi-violeta rd-chip-t px-2 py-0.5 rounded-full text-xs font-black">{textoObjetivos(m.objective)}</span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                DNI <b className="font-mono text-slate-800">{m.dni}</b>
                {anios ? ` · ${anios} años` : ""}
                {SEXO[m.gender] ? ` · ${SEXO[m.gender]}` : ""}
                {m.registrationDate ? ` · socio desde ${fechaCorta(m.registrationDate)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-end sm:self-start print:hidden">
            <button type="button" onClick={() => window.print()} title="Imprimir ficha del socio" className="rd-boton-suave rd-kpi-plomo p-2 rounded-xl cursor-pointer">
              <Printer className="w-4 h-4" />
            </button>
            <BotonesDescarga compacto nombre={`Ficha_${m.codeLabel}_${m.fullName}`} />
            <button type="button" onClick={onCerrar} title="Cerrar" aria-label="Cerrar" className="rd-boton-suave rd-kpi-plomo p-2 rounded-xl cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
          <div className="rd-perfil-mini rounded-xl px-3 py-2.5 col-span-2 lg:col-span-1">
            <p className="text-[11px] font-black uppercase text-slate-500">{quedan == null ? "Membresía" : quedan >= 0 ? "Le quedan" : "Venció hace"}</p>
            <p className="text-xl font-black rd-texto-k leading-tight">{quedan == null ? "Sin plan" : `${Math.abs(quedan)} ${Math.abs(quedan) === 1 ? "día" : "días"}`}</p>
            {total > 0 && (
              <span className="rd-barra-t block h-1.5 rounded-full overflow-hidden mt-1.5">
                <span className="block h-full rounded-full" style={{ width: `${pct}%` }} />
              </span>
            )}
          </div>
          <div className="rd-perfil-mini rounded-xl px-3 py-2.5">
            <p className="text-[11px] font-black uppercase text-slate-500">Plan</p>
            <p className="text-sm font-black text-slate-900 leading-tight">{m.planName || "—"}</p>
            {m.planPrice != null && <p className="text-xs text-slate-500">{soles(m.planPrice)}</p>}
          </div>
          <div className="rd-perfil-mini rounded-xl px-3 py-2.5">
            <p className="text-[11px] font-black uppercase text-slate-500">Saldo</p>
            <p className={`text-sm font-black leading-tight ${m.debt > 0 ? "rd-error-t" : "text-emerald-700"}`}>{m.debt > 0 ? soles(m.debt) : "Al día"}</p>
            {m.debt > 0 && m.debtDueDate && <p className="text-xs text-slate-500">{textoPlazo(m)}</p>}
          </div>
          <div className="rd-perfil-mini rounded-xl px-3 py-2.5 col-span-2 lg:col-span-1">
            <p className="text-[11px] font-black uppercase text-slate-500">Último pago</p>
            <p className="text-sm font-black text-slate-900 leading-tight">{m.lastPaymentAmount ? soles(m.lastPaymentAmount) : "—"}</p>
            {m.lastPaymentDate && <p className="text-xs text-slate-500">{fechaCorta(m.lastPaymentDate)}</p>}
          </div>
        </div>
      </div>

      {/* Membresía · datos personales · emergencia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Bloque
          titulo="Membresía"
          emoji="💳"
          tono="teal"
          derecha={
            gestiona && (
              <button type="button" onClick={onCuenta} className="rd-boton-t px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer print:hidden">
                {m.debt > 0 ? "💰 Cobrar saldo" : "📄 Estado de cuenta"}
              </button>
            )
          }
        >
          <div>
            <Dato l="Plan" v={m.planName} fuerte />
            <Dato l="Inicio" v={fechaCorta(ini)} mono />
            <Dato l="Vence" v={fechaCorta(fin)} mono fuerte />
            <Dato l="Saldo" v={m.debt > 0 ? `${soles(m.debt)}${m.debtDueDate ? ` · hasta ${fechaCorta(m.debtDueDate)}` : ""}` : "Al día"} />
            <Dato l="Matrículas" v={m.enrollmentsCount ? `${m.enrollmentsCount}${m.comebacks ? ` · volvió ${m.comebacks} ${m.comebacks === 1 ? "vez" : "veces"}` : ""}` : ""} />
            {m.freeze?.allowed && <Dato l="Congelamiento" v={m.freeze.current ? "❄️ Congelado ahora" : `Le quedan ${m.freeze.daysLeft} días`} />}
          </div>
        </Bloque>

        <Bloque
          titulo="Datos personales"
          emoji="🪪"
          tono="azul"
          derecha={
            gestiona && (
              <button type="button" onClick={onEditar} className="rd-boton-suave rd-kpi-azul px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer print:hidden">
                ✏️ Editar
              </button>
            )
          }
        >
          <div>
            <Dato l="DNI" v={m.dni} mono />
            <Dato l="Nacimiento" v={m.birthDate ? `${fechaCorta(m.birthDate)}${anios ? ` · ${anios} años` : ""}` : ""} />
            <Dato l="Sexo" v={SEXO[m.gender] || m.gender} />
            <Dato l="Celular" v={m.phone ? gestiona ? <TelWhatsApp tel={m.phone} /> : m.phone : ""} />
            <Dato l="Correo" v={m.email} />
            <Dato l="Dirección" v={m.address} />
          </div>
        </Bloque>

        <Bloque titulo="Contacto de emergencia" emoji="🚨" tono="rosa">
          {hayEmergencia ? (
            <div>
              <Dato l="Nombre" v={em.name} fuerte />
              <Dato l="Parentesco" v={em.relationship} />
              <Dato l="Celular" v={em.phone ? gestiona ? <TelWhatsApp tel={em.phone} /> : em.phone : ""} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No tiene contacto de emergencia registrado.
              {gestiona && (
                <button type="button" onClick={onEditar} className="ml-1 font-black rd-texto-k underline cursor-pointer print:hidden">
                  Agregar
                </button>
              )}
            </p>
          )}
        </Bloque>
      </div>

      {/* Ficha deportiva: rutina de hoy, fisioterapia, dieta y asistencia */}
      <FichaDeportiva member={m} onVerCalendario={onCalendario} />

      {/* Servicios: lo que trae su plan y lo que pagó aparte (medidas, dieta, fisioterapia…) */}
      <ServiciosAlumno idalumno={m.id} nombre={m.fullName} />

      {/* Entrenador y rutina · salud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Bloque titulo="Entrenador y rutina" emoji="🏋️" tono="naranja">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Entrenador personal</span>
            <select value={m.assignedTrainerId || ""} onChange={(e) => onEntrenador(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800">
              <option value="">Sin entrenador asignado</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialization})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Rutina asignada</span>
            <select value={m.assignedRoutineId || ""} onChange={(e) => onRutina(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800">
              <option value="">Sin rutina asignada</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.level})
                </option>
              ))}
            </select>
          </label>
        </Bloque>
        <Bloque titulo="Salud y observaciones" emoji="🩺" tono="violeta">
          <p className="text-sm text-slate-700">{m.medicalNotes || "Sin restricciones médicas reportadas."}</p>
          {m.notes && (
            <p className="text-sm text-slate-700 pt-2 border-t border-slate-100">
              <b>Nota:</b> {m.notes}
            </p>
          )}
        </Bloque>
      </div>
    </div>
  );
};
