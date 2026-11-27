import { CampoNumero } from "../common/CampoNumero";
import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Clock,
  MessageCircle,
  RefreshCw,
  Trash2,
  ChevronRight,
  Dumbbell,
  Phone,
  Mail,
  HeartPulse,
  UserPlus,
  Snowflake,
  Printer,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import { EstadoVacio } from "../common/EstadoVacio";
import { UsersRound, SearchX } from "lucide-react";
import { TelWhatsApp } from "../common/TelWhatsApp";
import { userCan } from "../../config/roles";
import { MemberAccountScreen } from "./MemberAccountScreen";
import { PerfilAlumno } from "./PerfilAlumno";
import { EditMemberScreen } from "./EditMemberScreen";
import { FreezeScreen, FreezeBadge } from "./FreezeScreen";
import { CalendarioAsistencias } from "../attendances/CalendarioAsistencias";
import ProgresoPesos from "../progreso/ProgresoPesos";
import { EditorIndicaciones } from "../indicaciones/Indicaciones";
import { DebtBadge, DebtDueDatePicker } from "./DebtDueDate";
import { fechaCorta, sumarDias, hoyISO } from "../../utils/fecha";
import { textoObjetivos } from "../../utils/objetivos";
import { coincideAlumno } from "../../utils/buscarPersona";
import { BotonesDescarga } from "../common/BotonesDescarga";
import { IconoEmoji, ConIconos } from "../common/IconoEmoji";

export const MembersManagement = ({ onOpenNewMemberModal }) => {
  const {
    members,
    plans,
    trainers,
    routines,
    deleteMember,
    updateMember,
    renewMembership,
    assignTrainerToMember,
    assignRoutineToMember,
    generateWhatsAppLink,
    resetStudentAccess,
    currentUser,
  } = useGym();
  // Recepción y administración gestionan; entrenador, nutrición y fisioterapia solo consultan
  const gestiona = userCan(currentUser, "members", "crear");
  const [accesoInfo, setAccesoInfo] = useState(null);
  const [cuentaDe, setCuentaDe] = useState(null); // estado de cuenta / deuda
  const [congelarDe, setCongelarDe] = useState(null); // congelamiento de membresía
  const [asistenciasDe, setAsistenciasDe] = useState(null); // calendario de asistencias
  const [progresoDe, setProgresoDe] = useState(null); // progreso de pesos por serie
  const [indicacionesDe, setIndicacionesDe] = useState(null); // estiramientos, movilidad y cuidados
  const [renewPaid, setRenewPaid] = useState("");
  const [renewDueDate, setRenewDueDate] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState(null);
  // Abrir la ficha de un alumno pedida desde otra pantalla (ej. "Ver perfil" en Programados)
  useEffect(() => {
    const abrir = (id) => {
      const m = members.find((x) => String(x.id) === String(id));
      if (m) setSelectedMember(m);
    };
    try {
      const id = sessionStorage.getItem("radical_abrir_alumno");
      if (id) {
        sessionStorage.removeItem("radical_abrir_alumno");
        abrir(id);
      }
    } catch {
      /* nada */
    }
    const alPedir = (e) => abrir(e.detail);
    window.addEventListener("radical:abrir-alumno", alPedir);
    return () => window.removeEventListener("radical:abrir-alumno", alPedir);
  }, [members]);
  // Modals inside component
  const [renewingMember, setRenewingMember] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [discountAmount, setDiscountAmount] = useState(0);

  // Edit member modal
  const [editingMember, setEditingMember] = useState(null);

  // Filtered members list
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      coincideAlumno(member, searchTerm) ||
      (searchTerm.trim().length >= 3 && /@/.test(searchTerm) && String(member.email || "").toLowerCase().includes(searchTerm.trim().toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "debt"
        ? member.debt > 0
        : statusFilter === "debt_overdue"
          ? member.debtStatus === "vencida"
          : statusFilter === "frozen"
            ? !!member.freeze?.current
            : statusFilter === "exalumno"
              ? member.memberState === "exalumno"
              : statusFilter === "expired"
                ? member.status === "expired" && member.memberState !== "exalumno"
                : member.status === statusFilter);
    const matchesTrainer =
      trainerFilter === "all" || member.assignedTrainerId === trainerFilter;

    return matchesSearch && matchesStatus && matchesTrainer;
  });

  const getObjectiveLabel = (obj) => {
    switch (obj) {
      case "hipertrofia":
        return "💪 Ganancia Muscular";
      case "perdida_peso":
        return "🔥 Pérdida de Grasa";
      case "fuerza":
        return "⚡ Fuerza Máxima";
      case "tonificacion":
        return "✨ Tonificación";
      case "resistencia":
        return "🏃 Resistencia & Cardio";
      case "salud_rehabilitacion":
        return "🩺 Salud & Postura";
      default:
        return obj;
    }
  };

  const renewTotal = Math.max(0, (plans.find((p) => p.id === selectedPlanId)?.price || 0) - discountAmount);
  const renewLeavesDebt = renewPaid !== "" && Number(renewPaid) < renewTotal - 0.004;

  // Otra pantalla (Nuevo alumno) pide renovar a un alumno que ya existe: mismo código
  useEffect(() => {
    const abrir = (datos) => {
      if (!datos?.id) return;
      setRenewingMember(members.find((m) => String(m.id) === String(datos.id)) || datos);
      window.__rdRenovar = null;
    };
    if (window.__rdRenovar) abrir(window.__rdRenovar);
    const alPedir = (e) => abrir(e.detail);
    window.addEventListener("radical:renovar-alumno", alPedir);
    return () => window.removeEventListener("radical:renovar-alumno", alPedir);
  }, [members]);

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!renewingMember || !selectedPlanId) return;
    if (renewLeavesDebt && !renewDueDate) {
      alert("Indica hasta qué fecha cancelará el saldo pendiente.");
      return;
    }

    const ok = await renewMembership(
      renewingMember.id,
      selectedPlanId,
      paymentMethod,
      discountAmount,
      renewPaid === "" ? undefined : Number(renewPaid),
      renewLeavesDebt ? renewDueDate : undefined,
    );
    if (!ok) return;
    setRenewPaid("");
    setRenewDueDate("");

    setRenewingMember(null);
    setSelectedPlanId("");
    setDiscountAmount(0);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header */}
      <div className="rd-portada rd-cabecera flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-0.5">
            <Users className="w-3.5 h-3.5" />
            <span>Socios</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Socios ({members.length})
          </h1>
          <p className="text-xs text-gray-500">
            Matrículas, vencimientos, entrenador asignado y rutinas.
          </p>
        </div>

        {gestiona && (
        <button
          onClick={onOpenNewMemberModal}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Nuevo socio</span>
        </button>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por Nombre, DNI o Teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-xs text-slate-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-800 text-white"
                : "bg-gray-100 text-slate-600 hover:bg-gray-200"
            }`}
          >
            Todos ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "active"
                ? "bg-green-600 text-white"
                : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
            }`}
          >
            Activos ({members.filter((m) => m.status === "active").length})
          </button>
          <button
            onClick={() => setStatusFilter("expiring_soon")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "expiring_soon"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            Por Vencer (
            {members.filter((m) => m.status === "expiring_soon").length})
          </button>
          <button
            onClick={() => setStatusFilter("expired")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "expired"
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            }`}
          >
            Vencidos ({members.filter((m) => m.status === "expired" && m.memberState !== "exalumno").length})
          </button>
          <button
            onClick={() => setStatusFilter("exalumno")}
            title={`Más de ${members[0]?.exAlumnoDays || 30} días sin renovar (lo fija gerencia en Usuarios › Configuración)`}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "exalumno"
                ? "bg-slate-700 text-white"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-300"
            }`}
          >
            <ConIconos texto="🔁" /> Exsocios ({members.filter((m) => m.memberState === "exalumno").length})
          </button>
          <button
            onClick={() => setStatusFilter("debt")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === "debt"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
            }`}
          >
            Con deuda ({members.filter((m) => m.debt > 0).length})
          </button>
          <button
            onClick={() => setStatusFilter("frozen")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1 ${
              statusFilter === "frozen"
                ? "bg-sky-600 text-white"
                : "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
            }`}
            title="Congelados hoy y congelamientos programados"
          >
            <Snowflake className="w-3 h-3" /> Congelados ({members.filter((m) => m.freeze?.current).length})
          </button>
          {members.some((m) => m.debtStatus === "vencida") && (
            <button
              onClick={() => setStatusFilter("debt_overdue")}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "debt_overdue"
                  ? "bg-rose-800 text-white"
                  : "bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300"
              }`}
            >
              Pago vencido ({members.filter((m) => m.debtStatus === "vencida").length})
            </button>
          )}
        </div>

        {/* Trainer Selector Filter */}
        <div className="w-full md:w-auto">
          <select
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-sm text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="all">Todos los Entrenadores</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Celular: tarjetas en vez de tabla (toca una para abrir su ficha) */}
      <div className="md:hidden space-y-2">
        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200">
            {members.length === 0 ? (
              <EstadoVacio icono={UsersRound} titulo="Aún no hay socios" texto="Matricula al primer socio para empezar." accion="Nuevo socio" onAccion={onOpenNewMemberModal} />
            ) : (
              <EstadoVacio icono={SearchX} titulo="Nadie coincide con la búsqueda" texto="Prueba con otro nombre, código o DNI, o quita los filtros." accion="Quitar filtros" onAccion={() => (setSearchTerm(""), setStatusFilter("all"))} />
            )}
          </div>
        ) : (
          filteredMembers.slice(0, 150).map((member) => {
            const est =
              member.status === "frozen"
                ? ["❄️", "Congelado", "azul"]
                : member.status === "active"
                  ? ["✅", "Vigente", "verde"]
                  : member.status === "expiring_soon"
                    ? ["⏳", "Por vencer", "ambar"]
                    : member.memberState === "exalumno"
                      ? ["👋", "Exsocio", "plomo"]
                      : ["⏰", "Vencido", "rojo"];
            const fin = String(member.membershipEndDate || "").slice(0, 10).split("-").reverse().join("/");
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedMember(member)}
                className={`rd-kpi-${est[2]} rd-tarea w-full text-left rounded-2xl border p-3 flex items-start gap-3 cursor-pointer`}
              >
                <span className="rd-tarea-ico w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0">{member.fullName.charAt(0)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-extrabold text-slate-900 text-sm leading-snug">{member.fullName}</span>
                    <span className="rd-chip-t shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black">
                      <span className="rd-emoji">{est[0]}</span> {est[1]}
                    </span>
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    <b className="font-mono text-slate-700">{member.codeLabel}</b> · {member.planName || "Sin plan"} · vence {fin || "—"}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                    <span className="font-mono text-slate-600">DNI {member.dni}</span>
                    {member.phone && <span className="text-slate-500">📱 {member.phone}</span>}
                    {member.debt > 0 && <span className="rd-error-t font-black">Debe S/ {Number(member.debt).toFixed(2)}</span>}
                  </span>
                </span>
              </button>
            );
          })
        )}
        {filteredMembers.length > 150 && <p className="text-xs text-slate-500 text-center">Se muestran 150 de {filteredMembers.length}. Usa la búsqueda para encontrar al resto.</p>}
      </div>

      {/* Members List Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-4 py-2.5">Socio</th>
                <th className="px-4 py-2.5">DNI / Contacto</th>
                <th className="px-4 py-2.5">Plan Actual</th>
                <th className="px-4 py-2.5">Vencimiento</th>
                <th className="px-4 py-2.5">Entrenador & Rutina</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    {members.length === 0 ? (
                      <EstadoVacio icono={UsersRound} titulo="Aún no hay socios" texto="Matricula al primer socio para empezar." accion="Nuevo socio" onAccion={onOpenNewMemberModal} />
                    ) : (
                      <EstadoVacio icono={SearchX} titulo="Nadie coincide con la búsqueda" texto="Prueba con otro nombre, código o DNI, o quita los filtros." accion="Quitar filtros" onAccion={() => (setSearchTerm(""), setStatusFilter("all"))} />
                    )}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const assignedTrainer = trainers.find(
                    (t) => t.id === member.assignedTrainerId,
                  );
                  const assignedRoutine = routines.find(
                    (r) => r.id === member.assignedRoutineId,
                  );

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      {/* Name & Objective */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600 shrink-0 text-xs">
                            {member.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0 max-w-[220px]">
                            <button
                              onClick={() => setSelectedMember(member)}
                              className="block font-bold text-slate-800 hover:text-blue-600 text-left transition-colors cursor-pointer truncate max-w-full"
                              title={member.fullName}
                            >
                              {member.fullName}
                            </button>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 min-w-0" title={textoObjetivos(member.objective)}>
                              <span className="shrink-0 font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded px-1">{member.codeLabel}</span>
                              <span className="truncate">{textoObjetivos(member.objective, true)}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* DNI & Phone */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p className="font-mono text-slate-800 font-semibold">
                            {member.dni}
                          </p>
                          <p className="text-xs">
                            {gestiona ? <TelWhatsApp tel={member.phone} /> : <span>{member.phone}</span>}
                          </p>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3 min-w-[150px]">
                        <span className="font-semibold text-slate-800 whitespace-nowrap">
                          {member.planName}
                        </span>
                        {member.freeze?.current && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCongelarDe(member);
                            }}
                            className="block mt-0.5 cursor-pointer"
                            title="Ver congelamiento"
                          >
                            <FreezeBadge member={member} compact />
                          </button>
                        )}
                        {member.debt > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCuentaDe(member);
                            }}
                            className="block mt-0.5 cursor-pointer text-left"
                            title="Ver estado de cuenta y cobrar"
                          >
                            <DebtBadge member={member} compact />
                          </button>
                        )}
                      </td>

                      {/* Expiration Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-mono text-slate-800 font-semibold">
                            {String(member.membershipEndDate || "").slice(0, 10).split("-").reverse().join("/")}
                          </p>
                          <p className="text-xs text-gray-400">
                            Inicio: {String(member.membershipStartDate || "").slice(0, 10).split("-").reverse().join("/")}
                          </p>
                        </div>
                      </td>

                      {/* Trainer & Routine */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Dumbbell className="w-3 h-3 text-blue-600" />
                            <span className="truncate max-w-[130px] font-medium">
                              {assignedTrainer
                                ? assignedTrainer.name
                                : "Sin asignar"}
                            </span>
                          </div>
                          {assignedRoutine && (
                            <span className="inline-block text-xs px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded border border-gray-200 truncate max-w-[140px]">
                              {assignedRoutine.title}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            member.status === "frozen"
                              ? "bg-sky-600 text-white border border-sky-600"
                              : member.status === "active"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : member.status === "expiring_soon"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : member.memberState === "exalumno"
                                  ? "bg-slate-100 text-slate-700 border border-slate-300"
                                  : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                          title={member.status === "expired" && member.daysExpired ? `Vencida hace ${member.daysExpired} días` : undefined}
                        >
                          {member.status === "active" && (
                            <UserCheck className="w-3 h-3" />
                          )}
                          {member.status === "expiring_soon" && (
                            <Clock className="w-3 h-3" />
                          )}
                          {member.status === "expired" && (
                            <UserX className="w-3 h-3" />
                          )}
                          {member.status === "frozen" && (
                            <Snowflake className="w-3 h-3" />
                          )}
                          {member.status === "frozen"
                            ? "Congelado"
                            : member.status === "active"
                            ? "Vigente"
                            : member.status === "expiring_soon"
                              ? "Por Vencer"
                              : member.memberState === "exalumno"
                                ? "Exsocio"
                                : "Vencido"}
                        </span>
                        {member.status === "expired" && member.daysExpired > 0 && (
                          <span className="block text-[10px] text-slate-500 mt-0.5">hace {member.daysExpired} d</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Direct Link */}
                          {gestiona && (
                          <a
                            href={generateWhatsAppLink(member)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-green-50 hover:bg-green-600 text-green-700 hover:text-white rounded border border-green-200 transition-colors cursor-pointer"
                            title="Enviar WhatsApp al socio"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                          )}

                          {/* Congelamiento (solo si el plan lo permite o ya tiene uno) */}
                          {gestiona && (member.freeze?.allowed || member.freeze?.current) && (
                            <button
                              onClick={() => setCongelarDe(member)}
                              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                                member.freeze?.current
                                  ? "bg-sky-600 text-white border-sky-600 hover:bg-sky-700"
                                  : "bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border-sky-200"
                              }`}
                              title={
                                member.freeze?.canFreeze
                                  ? `Congelar (quedan ${member.freeze.daysLeft} días)`
                                  : "Congelamiento"
                              }
                            >
                              <Snowflake className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Quick Renew Button */}
                          {gestiona && (
                          <button
                            onClick={() => {
                              setRenewingMember(member);
                              setSelectedPlanId(
                                member.planId || plans[1]?.id || plans[0]?.id,
                              );
                            }}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded font-medium text-xs border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                            title="Renovar membresía"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Renovar</span>
                          </button>
                          )}

                          {/* Profile View */}
                          <button
                            onClick={() => setSelectedMember(member)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded border border-gray-200 transition-colors cursor-pointer"
                            title="Ver ficha completa"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto min-h-full sm:px-8 sm:py-8 bg-white overflow-y-auto p-5 text-slate-800">
            <PerfilAlumno
              m={selectedMember}
              gestiona={gestiona}
              trainers={trainers}
              routines={routines}
              onCerrar={() => setSelectedMember(null)}
              onCuenta={() => {
                setCuentaDe(selectedMember);
                setSelectedMember(null);
              }}
              onCalendario={() => {
                setAsistenciasDe(selectedMember);
                setSelectedMember(null);
              }}
              onEditar={() => {
                setEditingMember(selectedMember);
                setSelectedMember(null);
              }}
              onEntrenador={(id) => {
                assignTrainerToMember(selectedMember.id, id);
                setSelectedMember({ ...selectedMember, assignedTrainerId: id });
              }}
              onRutina={(id) => {
                assignRoutineToMember(selectedMember.id, id);
                setSelectedMember({ ...selectedMember, assignedRoutineId: id });
              }}
            />

            {/* Actions footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200">
              {gestiona ? (
              <button
                onClick={() => {
                  if (
                    confirm(
                      `¿Estás seguro de eliminar al socio ${selectedMember.fullName}?`,
                    )
                  ) {
                    deleteMember(selectedMember.id);
                    setSelectedMember(null);
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Socio
              </button>
              ) : (
                <span className="text-xs text-slate-500">Solo consulta: renovaciones, congelamientos y mensajes los hace recepción.</span>
              )}

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {gestiona && (
                  <button
                    onClick={() => {
                      setEditingMember(selectedMember);
                      setSelectedMember(null);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-md text-xs font-semibold cursor-pointer"
                  >
                    Editar datos
                  </button>
                )}
                {gestiona && (
                <button
                  onClick={async () => {
                    const msg = selectedMember.accessUser
                      ? `¿Restablecer el acceso de ${selectedMember.fullName}? Su contraseña volverá a ser su DNI y deberá cambiarla al ingresar.`
                      : `¿Crear el acceso al portal para ${selectedMember.fullName}? Usuario y contraseña temporal serán su DNI.`;
                    if (!confirm(msg)) return;
                    const r = await resetStudentAccess(selectedMember.id);
                    if (r) setAccesoInfo({ ...r.cuentaNueva, nombre: r.fullName });
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-semibold cursor-pointer"
                  title="Usuario y contraseña del portal del socio"
                >
                  {selectedMember.accessUser ? `Acceso: ${selectedMember.accessUser} · Restablecer` : "Crear acceso al portal"}
                </button>
                )}
                <button
                  onClick={() => {
                    setAsistenciasDe(selectedMember);
                    setSelectedMember(null);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-md text-xs font-semibold cursor-pointer"
                >
                  <IconoEmoji e="📅" /> Asistencias
                </button>
                <button
                  onClick={() => {
                    setProgresoDe(selectedMember);
                    setSelectedMember(null);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 rounded-md text-xs font-semibold cursor-pointer"
                >
                  <IconoEmoji e="💪" /> Progreso de pesos
                </button>
                {(userCan(currentUser, "routines", "editar") || userCan(currentUser, "physiotherapy", "editar")) && (
                  <button
                    onClick={() => {
                      setIndicacionesDe(selectedMember);
                      setSelectedMember(null);
                    }}
                    className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-300 text-violet-800 rounded-md text-xs font-semibold cursor-pointer"
                  >
                    <IconoEmoji e="📋" /> Indicaciones
                  </button>
                )}
                {gestiona && (
                <button
                  onClick={() => {
                    setCongelarDe(selectedMember);
                    setSelectedMember(null);
                  }}
                  className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title={selectedMember.freeze?.rules}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  {selectedMember.freeze?.allowed
                    ? `Congelamiento · quedan ${selectedMember.freeze.daysLeft} días`
                    : "Congelamiento · sin derecho"}
                </button>
                )}
                {gestiona && (
                <>
                <a
                  href={generateWhatsAppLink(selectedMember)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Contactar WhatsApp
                </a>

                <button
                  onClick={() => {
                    setRenewingMember(selectedMember);
                    setSelectedPlanId(selectedMember.planId || plans[1]?.id);
                    setSelectedMember(null);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Renovar Membresía
                </button>
                </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingMember && <EditMemberScreen member={editingMember} onVolver={() => setEditingMember(null)} />}
      {cuentaDe && <MemberAccountScreen member={cuentaDe} onVolver={() => setCuentaDe(null)} />}
      {congelarDe && <FreezeScreen member={congelarDe} onVolver={() => setCongelarDe(null)} />}
      {asistenciasDe && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
            <button
              onClick={() => setAsistenciasDe(null)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-bold cursor-pointer"
            >
              ← Volver
            </button>
            <CalendarioAsistencias memberId={asistenciasDe.id} />
          </div>
        </div>
      )}

      {progresoDe && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
            <button
              onClick={() => setProgresoDe(null)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-bold cursor-pointer"
            >
              ← Volver
            </button>
            <ProgresoPesos memberId={progresoDe.id} modo="personal" />
          </div>
        </div>
      )}

      {indicacionesDe && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIndicacionesDe(null)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-sm font-bold cursor-pointer"
              >
                ← Volver
              </button>
              <div>
                <p className="font-bold text-slate-900">Indicaciones · {indicacionesDe.fullName}</p>
                <p className="text-xs text-slate-500">
                  <span className="font-mono font-bold text-blue-700">{indicacionesDe.codeLabel}</span> · estiramientos, movilidad y cuidados
                </p>
              </div>
            </div>
            <EditorIndicaciones member={indicacionesDe} />
          </div>
        </div>
      )}

      {accesoInfo && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-xl mx-auto min-h-full bg-white p-8 flex flex-col justify-center gap-5 text-slate-800">
            <h3 className="text-2xl font-extrabold text-center">Acceso del socio listo</h3>
            <p className="text-center text-slate-500">{accesoInfo.nombre}</p>
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 space-y-3 text-lg">
              <div className="flex justify-between">
                <span className="text-slate-500">Usuario</span>
                <span className="font-mono font-black">{accesoInfo.usuario}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contraseña temporal</span>
                <span className="font-mono font-black">{accesoInfo.claveTemporal}</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 text-center">
              Al ingresar, el sistema le pedirá crear su propia contraseña.
            </p>
            <button
              onClick={() => setAccesoInfo(null)}
              className="py-3 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Renewal Quick Modal */}
      {renewingMember && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto min-h-full sm:px-8 sm:py-8 bg-white p-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Renovación de Membresía
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Socio: {renewingMember.fullName}
                  {renewingMember.codeLabel && <> · Código <b className="font-mono">{renewingMember.codeLabel}</b> (se mantiene)</>}
                </p>
              </div>
              <button
                onClick={() => setRenewingMember(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Qué tipo de ingreso será: renovación (dentro del plazo) o exalumno recuperado */}
            {(() => {
              const dias = renewingMember.memberState === "activo" || renewingMember.memberState === "por_vencer" ? 0 : Number(renewingMember.daysExpired || 0);
              const plazo = Number(renewingMember.exAlumnoDays || 30);
              const ex = dias > plazo;
              return (
                <div className={`mt-3 rounded-xl border px-3 py-2.5 text-xs ${ex ? "rd-aviso-exsocio bg-slate-50 border-slate-300 text-slate-800" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
                  <p className="font-black text-sm">
                    {ex ? "🔁 Exsocio recuperado" : dias > 0 ? "🔄 Renovación" : "🔄 Renovación anticipada"}
                  </p>
                  <p className="mt-0.5">
                    {dias > 0
                      ? `Su membresía venció hace ${dias} día${dias === 1 ? "" : "s"}${renewingMember.membershipEndDate ? ` (${fechaCorta(renewingMember.membershipEndDate)})` : ""}. ${ex ? `Pasó el plazo de ${plazo} días: cuenta como exsocio que vuelve.` : `Está dentro del plazo de ${plazo} días: cuenta como renovación.`}`
                      : "Su membresía sigue vigente: la nueva empieza al día siguiente de que termine."}
                    {" "}Se renueva con su mismo código; no se crea otro socio.
                  </p>
                </div>
              );
            })()}

            <form onSubmit={handleRenewSubmit} className="space-y-3.5 my-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Seleccionar Plan a Renovar
                </label>
                <div className="space-y-1.5">
                  {plans.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        selectedPlanId === p.id
                          ? "bg-blue-50 border-blue-600 text-blue-900"
                          : "bg-gray-50 border-gray-200 text-slate-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="renewalPlan"
                          value={p.id}
                          checked={selectedPlanId === p.id}
                          onChange={() => setSelectedPlanId(p.id)}
                          className="accent-blue-600"
                        />

                        <div>
                          <p className="text-xs font-bold">{p.name}</p>
                          <p className="text-xs text-gray-500">
                            {p.durationDays} días de acceso ·{" "}
                            <span className={p.freezeDays ? "text-sky-700 font-semibold" : ""}>
                              {p.freezeDays ? `❄️ ${p.freezeDays} días congelamiento` : "sin congelamiento"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-blue-700">
                        S/ {p.price}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    <option value="efectivo"><IconoEmoji e="💵" /> Efectivo</option>
                    <option value="yape_plin"><IconoEmoji e="📱" /> Yape / Plin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descuento (S/)
                  </label>
                  <CampoNumero
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {selectedPlanId && (() => {
                const total = Math.max(0, (plans.find((p) => p.id === selectedPlanId)?.price || 0) - discountAmount);
                const parcial = renewPaid !== "" && Number(renewPaid) < total - 0.004;
                const saldo = Math.max(0, total - (renewPaid === "" ? total : Number(renewPaid || 0)));
                return (
                  <div className="rd-pago-resumen rounded-2xl border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500"><IconoEmoji e="🧾" /> Total a cobrar</span>
                      <span className="text-2xl font-black text-blue-700 font-mono">S/ {total.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setRenewPaid("")} className={`rd-pago-opcion ${!parcial ? "rd-pago-opcion-on" : ""}`}><IconoEmoji e="✅" /> Paga todo hoy</button>
                      <button type="button" onClick={() => setRenewPaid(parcial ? renewPaid : (total / 2).toFixed(2))} className={`rd-pago-opcion ${parcial ? "rd-pago-opcion-on" : ""}`}><IconoEmoji e="💸" /> Paga una parte</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="block text-xs font-bold text-slate-600 mb-1">Paga hoy (S/)</span>
                        <CampoNumero
                          type="number"
                          min="0.1"
                          step="0.10"
                          value={renewPaid}
                          placeholder={total.toFixed(2)}
                          onChange={(e) => setRenewPaid(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-right font-mono font-black text-lg text-slate-800"
                        />
                      </label>
                      <div className={`rounded-xl border px-3 py-2 ${saldo > 0 ? "rd-pago-saldo" : "rd-pago-sin-saldo"}`}>
                        <span className="block text-xs font-bold mb-0.5">{saldo > 0 ? "Queda debiendo" : "Sin saldo pendiente"}</span>
                        <span className="block text-lg font-black font-mono">S/ {saldo.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {selectedPlanId && renewLeavesDebt && (
                <DebtDueDatePicker
                  value={renewDueDate}
                  onChange={setRenewDueDate}
                  membershipEnd={sumarDias(
                    renewingMember.membershipEndDate && renewingMember.membershipEndDate >= hoyISO()
                      ? sumarDias(renewingMember.membershipEndDate, 1)
                      : hoyISO(),
                    plans.find((p) => p.id === selectedPlanId)?.durationDays || 30,
                  )}
                />
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setRenewingMember(null)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Confirmar Renovación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
