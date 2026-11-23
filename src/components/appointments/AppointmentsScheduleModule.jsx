import { TarjetaKpi } from "../common/TarjetaKpi";
import { DisponibilidadTurnos } from "./DisponibilidadTurnos";
import { Activity as CitaActiva, UserX as CitaFalta , CalendarClock } from "lucide-react";
import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  HeartPulse,
  Utensils,
  Share2,
  ShieldAlert,
  Trash2,
  X,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import { hoyISO } from "../../utils/fecha";

import { SelectorAlumno, coincideAlumno } from "../common/BuscarAlumno";
import { AgendaEspecialistas, useHorasAtencion, PARTES_DIA } from "./AgendaEspecialistas";
import { aMin, deMin, corta, rangoCita, seCruzan, HORAS_DIA, rangoTexto, parteDelDia } from "../../utils/horario";
import { IconoEmoji } from "../common/IconoEmoji";
// La agenda muestra siempre el mismo día que el horario de atención de fisioterapia
// y nutrición: de 5 AM a 11 PM, cada hora con sus 4 bloques de 15 minutos.
const HORAS_BASE = HORAS_DIA;
const CUARTOS = [0, 15, 30, 45];
// Estados que dejan libre el turno (no vino, cancelada o pasada a otra fecha)
const LIBERAN = ["falta", "cancelled", "pospuesto"];
const DURACION_LIBRE = 45; // días sin horario configurado: citas de 45 min cada hora

const NOMBRES_DIA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// 7 días seguidos empezando HOY (sin columnas de días que ya pasaron)
// + desplazamiento en bloques de 7 días
const construirSemana = (offset = 0) => {
  const [y, m, d] = hoyISO().split("-").map(Number);
  const inicio = new Date(Date.UTC(y, m - 1, d + offset * 7));
  return Array.from({ length: 7 }, (_, i) => {
    const f = new Date(inicio);
    f.setUTCDate(inicio.getUTCDate() + i);
    const iso = f.toISOString().slice(0, 10);
    const nombre = NOMBRES_DIA[(f.getUTCDay() + 6) % 7];
    return { key: iso, label: nombre, date: iso, dia: f.getUTCDate(), mes: MESES[f.getUTCMonth()], esHoy: offset === 0 && i === 0 };
  });
};

const fechaLarga = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return t.charAt(0).toUpperCase() + t.slice(1); // "Lunes, 16 de noviembre"
};

export const AppointmentsScheduleModule = () => {
  const {
    appointments,
    addAppointment,
    updateAppointmentStatus,
    updateAppointment,
    deleteAppointment,
    members,
    staffContracts,
    staffDirectory,
    currentUser,
  } = useGym();
  const horasAtencion = useHorasAtencion();
  const serviciosDe = (srv) => (srv === "all" || !srv ? ["physiotherapy", "nutrition"] : [srv]);
  // Turnos que publicó el especialista ese día (cada uno con su inicio y su fin).
  // Si no publicó horario, no hay turnos: recepción solo agenda en lo que el especialista abrió.
  const turnosDia = (srv, fecha) => horasAtencion(srv, fecha)?.turnos || [];
  const turnoEn = (srv, fecha, inicio) => {
    const m = aMin(inicio);
    return turnosDia(srv, fecha).find((t) => t.ini === m) || null;
  };
  // Duración de una cita: la del turno elegido (o la más común del día)
  const duracionDe = (srv, fecha, inicio) => turnoEn(srv, fecha, inicio)?.dur || horasAtencion(srv, fecha)?.duracion || DURACION_LIBRE;
  // Inicio de cada turno que se puede agendar ese día
  const horasDelDia = (srv, fecha) => turnosDia(srv, fecha).map((t) => t.inicio);
  const primerLibre = (srv, fecha) => {
    const f = new Date(Date.now() - 5 * 3600e3);
    const ahora = fecha === hoyISO() ? f.getUTCHours() * 60 + f.getUTCMinutes() : -1;
    return turnosDia(srv, fecha).find((t) => t.ini >= ahora && !ocupanTurno(srv, fecha, t.inicio).length)?.inicio || "";
  };
  // Citas que ocupan un turno (las faltas y canceladas lo liberan)
  const ocupanTurno = (srv, fecha, inicio) => {
    const t = turnoEn(srv, fecha, inicio);
    const r = t ? { ini: t.ini, fin: t.fin } : { ini: aMin(inicio), fin: aMin(inicio) + duracionDe(srv, fecha, inicio) };
    return appointments.filter((a) => a.date === fecha && a.serviceType === srv && !LIBERAN.includes(a.status) && seCruzan(rangoCita(a), r));
  };

  // Mode: Staff/Specialist Schedule vs Member/User Portal View
  const [viewMode, setViewMode] = useState("admin_calendar");

  // Calendar Selection State
  const [weekOffset, setWeekOffset] = useState(0);
  const [reprogramandoId, setReprogramandoId] = useState(null);
  const DAYS_OF_WEEK = useMemo(() => construirSemana(weekOffset), [weekOffset]);
  const [selectedDate, setSelectedDate] = useState(hoyISO());
  const selectedDay = DAYS_OF_WEEK.find((d) => d.date === selectedDate)?.key || "";
  const setSelectedDay = () => {};
  const [selectedHour, setSelectedHour] = useState("10:00 AM");
  // Filters
  const [serviceFilter, setServiceFilter] = useState("all");
  const [onlyAvailableFilter, setOnlyAvailableFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [formService, setFormService] = useState("");
  const [formMemberId, setFormMemberId] = useState("");
  const [formStaffName, setFormStaffName] = useState("");
  const [formDate, setFormDate] = useState(hoyISO());
  const [formSlot, setFormSlot] = useState("10:00 AM");
  const [formReason, setFormReason] = useState("");
  const [formRoom, setFormRoom] = useState(
    "Consultorio de Fisioterapia & Rehabilitación",
  );
  const [formNotes, setFormNotes] = useState("");

  // Conflict warning banner state
  const [conflictWarning, setConflictWarning] = useState(null);
  const [detalleHora, setDetalleHora] = useState(false);

  // User Portal Booking State
  const [portalSelectedService, setPortalSelectedService] =
    useState("nutrition");
  const [portalSelectedSlot, setPortalSelectedSlot] = useState("09:00 AM");
  const [portalSelectedDate, setPortalSelectedDate] = useState(hoyISO());
  const [portalStudentName, setPortalStudentName] = useState(currentUser?.fullName || "");
  const [portalStudentPhone, setPortalStudentPhone] = useState("");
  const [portalReason, setPortalReason] = useState("");
  const [portalSuccessMessage, setPortalSuccessMessage] = useState(null);

  // Especialistas reales: contratos de personal + usuario actual (sin nombres ficticios)
  const specialistsFor = (service) => {
    const kw = service === "nutrition" ? ["nutri"] : ["fisio", "physio", "terap"];
    const fromStaff = [
      ...staffDirectory.filter((p) => kw.some((k) => String(p.cargo || "").toLowerCase().includes(k))),
      ...staffContracts.filter((c) => kw.some((k) => String(c.role || "").toLowerCase().includes(k))),
    ]
      .map((p) => p.fullName || p.staffName)
      .filter(Boolean);
    const me =
      currentUser?.fullName &&
      ((service === "nutrition" && currentUser.role === "nutritionist") ||
        (service !== "nutrition" && currentUser.role === "physio"))
        ? [currentUser.fullName]
        : [];
    return Array.from(new Set([...me, ...fromStaff]));
  };
  const availableSpecialists = useMemo(
    () => specialistsFor(formService),
    [formService, staffContracts, staffDirectory, currentUser],
  );

  // Abre el formulario de cita con fecha y hora ya elegidas
  const openBooking = (date, hour, service, memberId, origenId = null) => {
    setReprogramandoId(origenId);
    // Sin tipo preseleccionado: solo fisioterapia o nutrición abren en su propio servicio
    const srv = service || (currentUser?.role === "physio" ? "physiotherapy" : currentUser?.role === "nutritionist" ? "nutrition" : "");
    const d = date || selectedDate;
    const h = hour || selectedHour;
    setFormService(srv);
    setFormDate(d);
    // Primer turno libre dentro de esa hora (si el especialista abrió turnos de 15, 20… min)
    const exacto = srv && horasDelDia(srv, d).find((t) => aMin(t) === aMin(h));
    const enHora = srv ? horasDelDia(srv, d).filter((t) => aMin(t) >= aMin(h) && aMin(t) < aMin(h) + 60) : [];
    setFormSlot(exacto || enHora.find((t) => !ocupanTurno(srv, d, t).length) || (srv ? primerLibre(srv, d) : ""));
    setFormReason("");
    setFormNotes("");
    setFormMemberId(memberId || "");
    setFormStaffName(srv ? specialistsFor(srv)[0] || "" : "");
    setFormRoom(srv === "nutrition" ? "Consultorio de Nutrición" : srv ? "Consultorio de Fisioterapia" : "");
    setConflictWarning(null);
    setIsBookingModalOpen(true);
  };

  // Handle service change in modal
  const handleServiceChange = (service) => {
    setFormService(service);
    setFormStaffName(specialistsFor(service)[0] || "");
    setFormRoom(service === "nutrition" ? "Consultorio de Nutrición" : "Consultorio de Fisioterapia");
    setFormReason("");
    setFormSlot(turnoEn(service, formDate, formSlot) ? formSlot : primerLibre(service, formDate));
  };

  // Helper to extract standard hour string from timeSlot
  const getSlotHour = (timeSlot) => {
    // e.g. "10:00 AM - 10:45 AM" -> "10:00 AM"
    const match = timeSlot.match(/^\d{2}:\d{2}\s*(?:AM|PM)/i);
    return match ? match[0] : timeSlot;
  };

  // Check if an appointment matches a day and hour
  // ¿La cita empieza dentro de esa hora? (las citas pueden empezar a las 6:15, 6:20…)
  const enLaHora = (a, hour) => {
    const r = rangoCita(a);
    const h = aMin(hour);
    return !!r && r.ini >= h && r.ini < h + 60;
  };
  const getAppointmentsForCell = (date, hour) => {
    return appointments.filter((a) => {
      const matchesDate = a.date === date;
      const matchesHour = enLaHora(a, hour);
      const matchesService =
        serviceFilter === "all" || a.serviceType === serviceFilter;
      return matchesDate && matchesHour && matchesService;
    });
  };

  // Appointments for the currently selected slot (Right side list)
  const currentSlotAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchesDate = a.date === selectedDate;
      const matchesHour = enLaHora(a, selectedHour);
      const matchesService =
        serviceFilter === "all" || a.serviceType === serviceFilter;
      const matchesSearch =
        !searchTerm ||
        a.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (members.find((m) => m.id === a.memberId) && coincideAlumno(members.find((m) => m.id === a.memberId), searchTerm)) ||
        a.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.memberDni.includes(searchTerm);
      return matchesDate && matchesHour && matchesService && matchesSearch;
    });
  }, [appointments, selectedDate, selectedHour, serviceFilter, searchTerm]);

  // Conflict Detection function
  const checkScheduleConflict = (memberId, date, hour, excludeAptId, srv = formService) => {
    const r = { ini: aMin(hour), fin: aMin(hour) + duracionDe(srv, date, hour) };
    return appointments.find(
      (a) =>
        a.id !== excludeAptId &&
        a.memberId === memberId &&
        a.date === date &&
        seCruzan(rangoCita(a), r) &&
        !LIBERAN.includes(a.status),
    );
  };

  // Check conflicts live when modal inputs change
  const detectedFormConflict = useMemo(() => {
    if (!formMemberId || !formDate || !formSlot) return null;
    return checkScheduleConflict(formMemberId, formDate, formSlot);
  }, [formMemberId, formDate, formSlot, formService, appointments]);

  // Handle booking creation with strict conflict validation & alert
  const handleCreateBooking = (e) => {
    e.preventDefault();
    if (!formService) {
      setConflictWarning("Primero elige el tipo de cita: Nutrición o Fisioterapia.");
      return;
    }
    const mem = members.find((m) => m.id === formMemberId);
    if (!mem) return;

    // Check for conflict
    const conflict = checkScheduleConflict(mem.id, formDate, formSlot);
    if (conflict) {
      setConflictWarning(
        `¡ALERTA DE CRUCE DE HORARIOS! El alumno ${mem.fullName} ya tiene una cita agendada de ${conflict.serviceType === "nutrition" ? "Nutrición" : "Fisioterapia"} con ${conflict.staffName} el día ${conflict.date} en el horario ${conflict.timeSlot}.`,
      );
      return;
    }

    if (ocupanTurno(formService, formDate, formSlot).length) {
      setConflictWarning("Ese turno ya está tomado por otra cita. Elige otro.");
      return;
    }
    setConflictWarning(null);

    const dur = duracionDe(formService, formDate, formSlot);
    const slotFull = `${formSlot} - ${deMin(aMin(formSlot) + dur)}`;

    const nuevoId = addAppointment({
      ...(reprogramandoId ? { reprogramadaDe: reprogramandoId } : {}),
      serviceType: formService,
      memberId: mem.id,
      memberName: mem.fullName,
      memberDni: mem.dni,
      memberPhone: mem.phone,
      staffId: "staff-assigned",
      staffName: formStaffName,
      date: formDate,
      timeSlot: slotFull,
      durationMinutes: dur,
      status: "por_atender",
      reason:
        formReason.trim() ||
        (formService === "nutrition"
          ? "Control nutricional y cálculo de macros"
          : "Sesión de fisioterapia y rehabilitación"),
      roomOrDesk: formRoom,
      notes: formNotes.trim() || undefined,
      reminderSent: false,
      dayOfWeek: fechaLarga(formDate).split(",")[0],
    });
    // La cita anterior queda como «reprogramada» y apunta a la nueva
    if (reprogramandoId && nuevoId) {
      updateAppointment(reprogramandoId, { status: "pospuesto", reprogramadaA: nuevoId, reprogramadaFecha: formDate, reprogramadaHora: slotFull });
    }
    setReprogramandoId(null);
    setIsBookingModalOpen(false);
  };

  // WhatsApp Reminder Sender
  const sendWhatsAppReminder = (apt) => {
    const serviceName =
      apt.serviceType === "nutrition"
        ? "🥗 Nutrición Deportiva"
        : "🩺 Fisioterapia & Rehabilitación";
    const statusLabels = {
      por_atender: "Por Atender (En Espera)",
      atendiendo: "En Atención Ahora",
      atendido: "Atendido",
      pospuesto: "Cita reprogramada",
      falta: "Inasistencia Registrada",
    };

    const text = encodeURIComponent(
      `*RADICAL - RECORDATORIO Y ESTADO DE CITA*\n` +
        `¡Hola ${apt.memberName}!\n` +
        `📌 *Servicio:* ${serviceName}\n` +
        `👨‍⚕️ *Especialista:* ${apt.staffName}\n` +
        `📅 *Fecha:* ${apt.date} (${apt.dayOfWeek || "Semana en curso"})\n` +
        `⏰ *Horario:* ${apt.timeSlot}\n` +
        `📍 *Ubicación:* ${apt.roomOrDesk}\n` +
        `📋 *Estado Actual:* ${statusLabels[apt.status] || apt.status}\n` +
        `📝 *Motivo:* ${apt.reason}\n\n` +
        `Por favor confirma tu asistencia o acércate a recepción.`,
    );
    const phone = apt.memberPhone ? apt.memberPhone.replace(/\D/g, "") : "";
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  // Status badge style helper
  const getStatusBadge = (status) => {
    switch (status) {
      case "atendiendo":
        return {
          bg: "bg-emerald-500 text-white animate-pulse",
          label: "Atendiendo",
          dot: "bg-white",
        };
      case "por_atender":
        return {
          bg: "bg-blue-100 text-blue-800 border border-blue-300",
          label: "Por Atender",
          dot: "bg-blue-500",
        };
      case "atendido":
        return {
          bg: "bg-slate-100 text-slate-700 border border-slate-300",
          label: "Atendido",
          dot: "bg-slate-500",
        };
      case "pospuesto":
        return {
          bg: "bg-amber-100 text-amber-800 border border-amber-300",
          label: "Reprogramada",
          dot: "bg-amber-500",
        };
      case "falta":
        return {
          bg: "bg-rose-100 text-rose-800 border border-rose-300",
          label: "Falta",
          dot: "bg-rose-500",
        };
      default:
        return {
          bg: "bg-blue-100 text-blue-800 border border-blue-200",
          label: "Programado",
          dot: "bg-blue-500",
        };
    }
  };

  // User Portal: Book from member portal
  const handlePortalSelfBooking = () => {
    const mem =
      members.find((m) =>
        m.fullName.toLowerCase().includes(portalStudentName.toLowerCase()),
      ) || members[0];
    const specialist = specialistsFor(portalSelectedService)[0] || "Por asignar";

    const durP = duracionDe(portalSelectedService, portalSelectedDate, portalSelectedSlot);
    const slotFull = `${portalSelectedSlot} - ${deMin(aMin(portalSelectedSlot) + durP)}`;

    addAppointment({
      serviceType: portalSelectedService,
      memberId: mem?.id || "portal-mem",
      memberName: portalStudentName,
      memberDni: mem?.dni || "",
      memberPhone: portalStudentPhone,
      staffId: "staff-portal",
      staffName: specialist,
      date: portalSelectedDate,
      timeSlot: slotFull,
      durationMinutes: durP,
      status: "por_atender",
      reason: portalReason,
      roomOrDesk:
        portalSelectedService === "nutrition"
          ? "Consultorio de Nutrición"
          : "Consultorio de Fisioterapia",
      notes: "Reservado a través del Portal de Usuario Web",
      reminderSent: false,
      dayOfWeek: fechaLarga(portalSelectedDate).split(",")[0],
    });

    setPortalSuccessMessage(
      `¡Cita agendada con éxito para el ${portalSelectedDate} a las ${portalSelectedSlot}! Se envió la confirmación a recepción.`,
    );
  };

  // User Portal: Send WhatsApp to reception
  const handleSendWhatsAppToReception = () => {
    const sName =
      portalSelectedService === "nutrition"
        ? "Nutrición Deportiva"
        : "Fisioterapia y Rehabilitación";
    const text = encodeURIComponent(
      `*SOLICITUD DE CITA DESDE EL PORTAL DEL ALUMNO*\n` +
        `¡Hola Recepción RADICAL!\n` +
        `Soy el alumno: *${portalStudentName}*\n` +
        `Deseo reservar un turno para: *${sName}*\n` +
        `📅 *Fecha solicitada:* ${portalSelectedDate}\n` +
        `⏰ *Hora deseada:* ${portalSelectedSlot}\n` +
        `📝 *Motivo:* ${portalReason}\n\n` +
        `Por favor confirmar disponibilidad.`,
    );
    window.open(`https://wa.me/51999888777?text=${text}`, "_blank");
  };

  // Counts for KPIs
  const atendiendoCount = appointments.filter(
    (a) => a.status === "atendiendo",
  ).length;
  const porAtenderCount = appointments.filter(
    (a) => a.status === "por_atender",
  ).length;
  const atendidoCount = appointments.filter(
    (a) => a.status === "atendido",
  ).length;
  const pospuestoCount = appointments.filter(
    (a) => a.status === "pospuesto",
  ).length;
  const faltaCount = appointments.filter((a) => a.status === "falta").length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="rd-portada rd-cabecera">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <CalendarDays className="w-4 h-4" />
              <span>Agenda</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Horarios y citas
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Solo se muestran los turnos que publicaron fisioterapia y nutrición. Toca un turno libre para agendar, o una cita para ver al paciente y cambiar su estado.
            </p>
          </div>

          {/* Action buttons & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "horario" ? "admin_calendar" : "horario")}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer ${viewMode === "horario" ? "bg-amber-500 text-white" : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"}`}
            >
              <Clock className="w-4 h-4" />
              <span>{viewMode === "horario" ? "Volver a la agenda" : "Horario de atención"}</span>
            </button>
            {/* La reserva del alumno se hace desde su propio portal (Mis citas) */}
            <button
              onClick={() => {
                openBooking(selectedDate, selectedHour);
              }}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar cita</span>
            </button>
          </div>
        </div>

        {/* Contadores del día (mismo diseño de indicadores que el resto del sistema) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 mt-4 pt-4 border-t border-slate-800">
          <TarjetaKpi titulo="Atendiendo ahora" valor={atendiendoCount} sub="en consulta" icono={CitaActiva} tono="verde" pulso={atendiendoCount > 0} />
          <TarjetaKpi titulo="Por atender" valor={porAtenderCount} sub="citas pendientes" icono={Clock} tono="azul" />
          <TarjetaKpi titulo="Atendidos" valor={atendidoCount} sub="citas cerradas" icono={CheckCircle2} tono="teal" />
          <TarjetaKpi titulo="Reprogramadas" valor={pospuestoCount} sub="movidas a otro turno" icono={AlertCircle} tono="ambar" />
          <TarjetaKpi titulo="Faltas (liberados)" valor={faltaCount} sub="no vinieron" icono={CitaFalta} tono="rojo" />
        </div>
      </div>

      {/* Entrenador: turnos en vivo (libres, por atender, en atención) */}
      {currentUser?.role === "trainer" && <DisponibilidadTurnos titulo="Turnos de hoy en vivo" />}

      {/* Cross Conflict Warning Banner if triggered */}
      {conflictWarning && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 text-xs text-rose-900 shadow-md flex items-start justify-between gap-3 animate-bounce">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold block text-sm">
                Alerta de Cruce de Horarios Detectada
              </strong>
              <p className="mt-0.5 text-rose-800">{conflictWarning}</p>
            </div>
          </div>
          <button
            onClick={() => setConflictWarning(null)}
            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {viewMode === "horario" && <AgendaEspecialistas />}

      {/* ----------------- VIEW 1: GOOGLE CALENDAR STYLE SCHEDULE ----------------- */}
      {viewMode === "admin_calendar" && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* Service Filters */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setServiceFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  serviceFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Todos los Servicios
              </button>
              <button
                onClick={() => setServiceFilter("physiotherapy")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  serviceFilter === "physiotherapy"
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Fisioterapia</span>
              </button>
              <button
                onClick={() => setServiceFilter("nutrition")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  serviceFilter === "nutrition"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Nutrición</span>
              </button>
            </div>

            {/* Filter by Available / Free hours toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOnlyAvailableFilter(!onlyAvailableFilter)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                  onlyAvailableFilter
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-amber-600" />
                <span>Filtrar solo horas disponibles (vacías o por falta)</span>
              </button>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Código del paciente, nombre o especialista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Navegación de semanas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold hover:bg-slate-50 cursor-pointer"
              >
                ← 7 días antes
              </button>
              <button
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedDate(hoyISO());
                }}
                className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold cursor-pointer"
              >
                Hoy
              </button>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold hover:bg-slate-50 cursor-pointer"
              >
                7 días después →
              </button>
            </div>
            <span className="text-base font-extrabold text-slate-800">
              {DAYS_OF_WEEK[0].dia} {DAYS_OF_WEEK[0].mes} – {DAYS_OF_WEEK[6].dia} {DAYS_OF_WEEK[6].mes}{" "}
              {DAYS_OF_WEEK[6].date.slice(0, 4)}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openBooking(selectedDate, selectedHour, "nutrition")}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cita de nutrición
              </button>
              <button
                onClick={() => openBooking(selectedDate, selectedHour, "physiotherapy")}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Cita de fisioterapia
              </button>
            </div>
          </div>

          {/* MAIN TWO-COLUMN GOOGLE CALENDAR GRID & RIGHT PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT / CENTER: GOOGLE CALENDAR GRID (7 COLUMNS) */}
            <div className="lg:col-span-12 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Encabezado y horas dentro del mismo contenedor con scroll: columnas siempre alineadas */}
              <div className="max-h-[78vh] overflow-auto rd-agenda-semana">
              <div className="min-w-[980px]">
              {/* Días de la semana */}
              <div className="grid grid-cols-7 bg-slate-900 text-white border-b border-slate-800 text-center text-xs font-bold sticky top-0 z-10">
                {DAYS_OF_WEEK.map((day) => {
                  const isDaySelected = selectedDay === day.key;
                  return (
                    <button
                      key={day.key}
                      onClick={() => {
                        setSelectedDay(day.key);
                        setSelectedDate(day.date);
                      }}
                      className={`px-1 py-1.5 transition-colors text-center flex flex-col items-center justify-center cursor-pointer border-r border-slate-800 last:border-r-0 ${
                        isDaySelected ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider">{day.esHoy ? "Hoy" : day.label}</span>
                      <span className={`text-xs mt-0.5 px-1.5 rounded-full font-extrabold ${isDaySelected ? "bg-white text-blue-900" : "text-slate-400"}`}>
                        {day.dia} {day.mes}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Turnos publicados por fisioterapia y nutrición: solo esos se pueden agendar */}
              {(() => {
                const srvCal = serviceFilter !== "all" ? serviceFilter : currentUser?.role === "physio" ? "physiotherapy" : currentUser?.role === "nutritionist" ? "nutrition" : "all";
                const servicios = serviciosDe(srvCal);
                const hoy = hoyISO();
                const ahora = (() => {
                  const f = new Date(Date.now() - 5 * 3600e3);
                  return f.getUTCHours() * 60 + f.getUTCMinutes();
                })();
                const q = searchTerm.trim().toLowerCase();
                return (
                  <div className="grid grid-cols-7 divide-x divide-slate-100 items-start">
                    {DAYS_OF_WEEK.map((day) => {
                      const citas = appointments.filter(
                        (a) => a.date === day.date && a.status !== "cancelled" && servicios.includes(a.serviceType),
                      );
                      // Cada turno publicado, con su cita si ya está tomado
                      const items = [];
                      servicios.forEach((srv) =>
                        turnosDia(srv, day.date).forEach((t) => {
                          const c = citas.find((a) => a.serviceType === srv && !LIBERAN.includes(a.status) && seCruzan(rangoCita(a), t));
                          items.push({ srv, ini: t.ini, fin: t.fin, cita: c || null });
                        }),
                      );
                      // Citas fuera de los turnos publicados (antiguas o faltas): también se muestran
                      citas.forEach((a) => {
                        if (items.some((x) => x.cita?.id === a.id)) return;
                        const r = rangoCita(a);
                        if (r) items.push({ srv: a.serviceType, ini: r.ini, fin: r.fin, cita: a });
                      });
                      items.sort((x, y) => x.ini - y.ini || (x.srv === "physiotherapy" ? -1 : 1));
                      const visibles = items.filter((x) => {
                        if (onlyAvailableFilter && x.cita) return false;
                        if (q && x.cita) {
                          const mem = members.find((m) => m.id === x.cita.memberId);
                          return String(x.cita.memberName || "").toLowerCase().includes(q) || (mem && coincideAlumno(mem, q)) || String(x.cita.staffName || "").toLowerCase().includes(q);
                        }
                        return !q;
                      });
                      const libres = items.filter((x) => !x.cita && !(day.date < hoy || (day.date === hoy && x.ini < ahora))).length;
                      return (
                        <div key={day.key} className={`rd-columna-dia p-1.5 min-h-[260px] ${selectedDate === day.date ? "bg-blue-50/40" : ""}`}>
                          <p className="rd-resumen-dia text-[10px] font-bold text-center text-slate-500 mb-1.5">
                            {items.length ? `${libres} ${libres === 1 ? "libre" : "libres"} · ${items.length - libres} ${items.length - libres === 1 ? "tomado" : "tomados"}` : "Sin horario publicado"}
                          </p>
                          {visibles.length === 0 && items.length === 0 && (
                            <div className="rd-sin-turnos rounded-lg border border-dashed border-slate-200 text-[11px] text-slate-400 text-center px-2 py-6 leading-snug">
                              {srvCal === "nutrition" ? "Nutrición" : srvCal === "physiotherapy" ? "Fisioterapia" : "Los especialistas"} no publicaron turnos este día
                            </div>
                          )}
                          {PARTES_DIA.map(([clave, nombre]) => {
                            const deParte = visibles.filter((x) => parteDelDia(x.ini) === clave);
                            if (!deParte.length) return null;
                            return (
                              <div key={clave} className="mb-2">
                                <p className="rd-parte-dia text-[9px] font-black uppercase tracking-wider text-slate-400 px-0.5 mb-1">{nombre}</p>
                                <div className="space-y-1">
                                  {deParte.map((x) => {
                                    const fisio = x.srv === "physiotherapy";
                                    const pasado = day.date < hoy || (day.date === hoy && x.fin <= ahora);
                                    if (x.cita) {
                                      const badge = getStatusBadge(x.cita.status);
                                      return (
                                        <button
                                          type="button"
                                          key={`${x.srv}-${x.ini}-${x.cita.id}`}
                                          onClick={() => {
                                            setSelectedDate(day.date);
                                            setSelectedHour(deMin(x.ini));
                                            setDetalleHora(true);
                                          }}
                                          title={`${x.cita.timeSlot} · ${x.cita.memberName} · ${badge.label}`}
                                          className={`rd-turno-cita w-full text-left rounded-lg border-l-4 border px-1.5 py-1 cursor-pointer ${
                                            x.cita.status === "falta" ? "bg-rose-50 border-rose-200 border-l-rose-400 opacity-80" : x.cita.status === "pospuesto" ? "bg-amber-50 border-amber-200 border-l-amber-400 opacity-80" : fisio ? "bg-cyan-50 border-cyan-200 border-l-cyan-500" : "bg-emerald-50 border-emerald-200 border-l-emerald-500"
                                          }`}
                                        >
                                          <span className="flex items-center justify-between gap-1">
                                            <span className="text-[10px] font-extrabold tabular-nums text-slate-600">{rangoTexto(x.ini, x.fin)}</span>
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dot === "bg-white" ? "bg-emerald-500 animate-pulse" : badge.dot}`} />
                                          </span>
                                          <span className="block text-xs font-extrabold text-slate-900 truncate">{String(x.cita.memberName || "").split(" ").slice(0, 2).join(" ")}</span>
                                          <span className="block text-[10px] font-semibold text-slate-500 truncate">{badge.label}</span>
                                        </button>
                                      );
                                    }
                                    if (pasado) {
                                      return (
                                        <div key={`${x.srv}-${x.ini}`} className="rd-turno-pasado rounded-lg border border-slate-100 px-1.5 py-1 text-[10px] font-bold tabular-nums text-slate-400 line-through decoration-slate-300">
                                          {rangoTexto(x.ini, x.fin)}
                                        </div>
                                      );
                                    }
                                    return (
                                      <button
                                        type="button"
                                        key={`${x.srv}-${x.ini}`}
                                        onClick={() => {
                                          setSelectedDate(day.date);
                                          setSelectedHour(deMin(x.ini));
                                          openBooking(day.date, deMin(x.ini), x.srv);
                                        }}
                                        title={`Agendar ${fisio ? "fisioterapia" : "nutrición"} · ${rangoTexto(x.ini, x.fin)}`}
                                        className={`rd-turno-libre w-full rounded-lg border border-dashed px-1.5 py-1 flex items-center justify-between gap-1 cursor-pointer transition-colors ${fisio ? "rd-libre-fisio" : "rd-libre-nutri"}`}
                                      >
                                        <span className="text-[11px] font-extrabold tabular-nums">{rangoTexto(x.ini, x.fin)}</span>
                                        <span className="text-[9px] font-black uppercase opacity-80">{srvCal === "all" ? (fisio ? "Fisio" : "Nutri") : `${x.fin - x.ini}′`}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Detalle de una hora con citas (pantalla completa) */}
      {viewMode === "admin_calendar" && detalleHora && (
            <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
            <div className="w-full max-w-3xl mx-auto min-h-full bg-white p-5 sm:p-8 space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setDetalleHora(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ← Volver al calendario
                </button>
              </div>
              {/* Header of Active Hour */}
              <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider block">
                    Horario Seleccionado
                  </span>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>
                      {fechaLarga(selectedDate)}, {selectedHour}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-300 block mt-0.5">
                    Fecha: {selectedDate}
                  </span>
                </div>

                <button
                  onClick={() => {
                    openBooking(selectedDate, selectedHour);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Añadir paciente a esta hora"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Agendar</span>
                </button>
              </div>

              {/* Status explanation strip */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-800 block mb-1">
                  Control en tiempo real del especialista:
                </span>
                El nutricionista o fisioterapeuta puede alternar los estados
                tocando los botones de cada paciente.
              </div>

              {/* List of Persons Scheduled for this hour */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                  <span>
                    Personas Agendadas ({currentSlotAppointments.length})
                  </span>
                  {currentSlotAppointments.length === 0 && (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-xs border border-emerald-200">
                      Horario Disponible
                    </span>
                  )}
                </div>

                {currentSlotAppointments.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-xs space-y-2">
                    <CalendarIcon className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="font-bold text-slate-700">
                      Sin personas agendadas para esta hora
                    </p>
                    <p className="text-slate-500 text-xs">
                      Este turno está completamente libre o se liberó por
                      inasistencia previa.
                    </p>
                    <button
                      onClick={() => {
                        openBooking(selectedDate, selectedHour);
                      }}
                      className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agendar Cita Aquí</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {currentSlotAppointments.map((apt) => {
                      const isPhysio = apt.serviceType === "physiotherapy";
                      const badge = getStatusBadge(apt.status);

                      return (
                        <div
                          key={apt.id}
                          className="bg-white rounded-xl border-2 border-slate-200 p-3 shadow-xs space-y-2 hover:border-blue-300 transition-colors"
                        >
                          {/* Patient and Service Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold ${
                                  isPhysio
                                    ? "bg-cyan-100 text-cyan-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {isPhysio ? (
                                  <HeartPulse className="w-3 h-3" />
                                ) : (
                                  <Utensils className="w-3 h-3" />
                                )}
                                <span>
                                  {isPhysio ? "Fisioterapia" : "Nutrición"}
                                </span>
                              </span>
                              <h4 className="font-extrabold text-slate-900 text-xs mt-1">
                                {apt.memberName}
                              </h4>
                              <p className="text-xs text-slate-500">
                                DNI: {apt.memberDni} • Tel:{" "}
                                {apt.memberPhone || "No registrado"}
                              </p>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                          </div>

                          {/* Reason & Specialist */}
                          <div className="bg-slate-50 p-2 rounded-lg text-xs space-y-0.5">
                            <div className="text-slate-800 font-medium">
                              <strong>Motivo:</strong> {apt.reason}
                            </div>
                            <div className="text-slate-600">
                              <strong>Especialista:</strong> {apt.staffName}
                            </div>
                            <div className="text-slate-500 text-xs">
                              <strong>Ubicación:</strong> {apt.roomOrDesk}
                            </div>
                          </div>

                          {apt.status === "pospuesto" && (
                            <div className="rd-aviso-reprog text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-2.5 py-1.5">
                              <strong>Cita reprogramada</strong>
                              {apt.reprogramadaFecha ? ` → ${fechaLarga(apt.reprogramadaFecha)} · ${apt.reprogramadaHora || ""}` : " · falta elegir el nuevo turno"}
                              {apt.estadoPor && <span className="block text-[11px] opacity-80">Por {apt.estadoPor}{apt.estadoRol === "physio" ? " (fisioterapia)" : apt.estadoRol === "nutritionist" ? " (nutrición)" : apt.estadoRol === "reception" ? " (recepción)" : ""}</span>}
                            </div>
                          )}

                          {/* INTERACTIVE STATUS ASSIGNMENT BUTTONS (Nutricionista / Fisio asigna estado actual) */}
                          <div>
                            <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
                              Asignar Estado Actual del Paciente:
                            </span>
                            <div className="grid grid-cols-3 gap-1 text-xs font-bold">
                              <button
                                onClick={() =>
                                  updateAppointmentStatus(apt.id, "atendiendo")
                                }
                                className={`py-1 px-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                                  apt.status === "atendiendo"
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                }`}
                              >
                                Atendiendo
                              </button>

                              <button
                                onClick={() =>
                                  updateAppointmentStatus(apt.id, "por_atender")
                                }
                                className={`py-1 px-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                                  apt.status === "por_atender"
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                    : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                                }`}
                              >
                                Por Atender
                              </button>

                              <button
                                onClick={() =>
                                  updateAppointmentStatus(apt.id, "atendido")
                                }
                                className={`py-1 px-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                                  apt.status === "atendido"
                                    ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                                }`}
                              >
                                Atendido
                              </button>

                              <button
                                onClick={() =>
                                  updateAppointmentStatus(apt.id, "pospuesto")
                                }
                                className={`py-1 px-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                                  apt.status === "pospuesto"
                                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                }`}
                              >
                                Reprogramada
                              </button>

                              <button
                                onClick={() =>
                                  updateAppointmentStatus(apt.id, "falta")
                                }
                                className={`py-1 px-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                                  apt.status === "falta"
                                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                    : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                                }`}
                              >
                                Falta
                              </button>

                              <button
                                onClick={() => sendWhatsAppReminder(apt)}
                                className="py-1 px-1.5 rounded-md border bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 flex items-center justify-center gap-1 cursor-pointer"
                                title="Mandar mensaje WhatsApp"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>Wpp</span>
                              </button>
                            </div>
                          </div>

                          {/* Reprogramar y cancelar */}
                          <div className="pt-1 flex items-center justify-between gap-2">
                            {apt.status !== "atendido" && apt.status !== "atendiendo" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  updateAppointmentStatus(apt.id, "pospuesto");
                                  setDetalleHora(false);
                                  openBooking(apt.date, "", apt.serviceType, apt.memberId, apt.id);
                                }}
                                className="rd-reprogramar text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                              >
                                <CalendarClock className="w-3.5 h-3.5" />
                                <span>Reprogramar a otro turno</span>
                              </button>
                            ) : <span />}
                            <button
                              onClick={() => deleteAppointment(apt.id)}
                              className="text-slate-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Cancelar Cita</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </div>
      )}

      {/* ----------------- VIEW 2: PORTAL DEL ALUMNO / USUARIO ----------------- */}
      {viewMode === "user_portal" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider block">
              Vista Exclusiva del Cliente
            </span>
            <h2 className="text-xl font-extrabold text-slate-900">
              Portal del Alumno: Reserva y Disponibilidad de Horarios
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Consulta en tiempo real las horas libres de Fisioterapia y
              Nutrición Deportiva. Puedes confirmar tu cita de forma directa o
              enviar un mensaje automático por WhatsApp a recepción para agendar
              tu turno.
            </p>
          </div>

          {portalSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{portalSuccessMessage}</span>
              </div>
              <button
                onClick={() => setPortalSuccessMessage(null)}
                className="text-emerald-700 font-bold hover:underline"
              >
                Cerrar
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Booking Form in User Portal */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-cyan-600" />
                <span>Datos de tu Reserva</span>
              </h3>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Especialidad Requerida
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPortalSelectedService("nutrition")}
                    className={`p-3 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      portalSelectedService === "nutrition"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Utensils className="w-4 h-4 mb-1" />
                    <div className="text-xs">Nutrición Deportiva</div>
                    <div className="text-xs opacity-80">
                      Lic. Sofía Valdivia
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPortalSelectedService("physiotherapy")}
                    className={`p-3 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      portalSelectedService === "physiotherapy"
                        ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <HeartPulse className="w-4 h-4 mb-1" />
                    <div className="text-xs">Fisioterapia</div>
                    <div className="text-xs opacity-80">
                      Lic. Diego Morales
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre Completo del Alumno
                </label>
                <input
                  type="text"
                  value={portalStudentName}
                  onChange={(e) => setPortalStudentName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Número de WhatsApp
                </label>
                <input
                  type="text"
                  value={portalStudentPhone}
                  onChange={(e) => setPortalStudentPhone(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha
                  </label>
                  <select
                    value={portalSelectedDate}
                    onChange={(e) => setPortalSelectedDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.date} value={d.date}>
                        {d.label} ({d.dia} {d.mes})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Horario Deseado
                  </label>
                  <select
                    value={portalSelectedSlot}
                    onChange={(e) => setPortalSelectedSlot(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                  >
                    {horasDelDia(portalSelectedService, portalSelectedDate).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motivo de Consulta o Lesión
                </label>
                <textarea
                  rows={2}
                  value={portalReason}
                  onChange={(e) => setPortalReason(e.target.value)}
                  placeholder="Ej. Evaluación de manguito rotador o plan de pérdida de grasa..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handlePortalSelfBooking}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Agendar Directamente</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsAppToReception}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Mandar Mensaje al WhatsApp de Recepción</span>
                </button>
              </div>
            </div>

            {/* Available Hours Matrix in Portal */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Horas Disponibles en {portalSelectedDate}</span>
              </h3>
              <p className="text-slate-500 text-xs">
                Selecciona una franja horaria vacía para asignarla a tu reserva
                de{" "}
                {portalSelectedService === "nutrition"
                  ? "Nutrición"
                  : "Fisioterapia"}
                :
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {horasDelDia(portalSelectedService, portalSelectedDate).length === 0 && (
                  <p className="col-span-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">Ese día no hay atención. Elige otra fecha.</p>
                )}
                {horasDelDia(portalSelectedService, portalSelectedDate).map((hour) => {
                  const isTaken = ocupanTurno(portalSelectedService, portalSelectedDate, hour).length > 0;
                  const isSelected = portalSelectedSlot === hour;

                  return (
                    <button
                      key={hour}
                      disabled={isTaken}
                      onClick={() => setPortalSelectedSlot(hour)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-cyan-600 text-white border-cyan-600 font-extrabold shadow-xs"
                          : isTaken
                            ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed line-through"
                            : "bg-white text-slate-800 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50"
                      }`}
                    >
                      <div className="text-xs font-bold">{hour}</div>
                      <div className="text-xs mt-0.5 font-semibold">
                        {isTaken ? "Ocupado" : "Disponible"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">
                  <IconoEmoji e="📌" /> Reglas de Atención al Alumno:
                </div>
                <div>
                  • Cada cita dura {duracionDe(portalSelectedService, portalSelectedDate)} minutos.
                </div>
                <div>
                  • En caso de no asistir y marcarse falta, el turno queda
                  disponible para otros miembros.
                </div>
                <div>
                  • Si deseas cancelar o reprogramar, notifica con al menos 2
                  horas de anticipación.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- NUEVA CITA: PANTALLA COMPLETA ----------------- */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 rd-velo">
<div className="rd-hoja flex flex-col">
          <div
            className={`text-white px-4 sm:px-8 py-4 flex items-center justify-between gap-4 shrink-0 bg-gradient-to-r ${
              formService === "nutrition" ? "from-emerald-700 to-teal-800" : formService ? "from-cyan-700 to-blue-800" : "from-slate-700 to-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                {formService === "nutrition" ? <Utensils className="w-6 h-6" /> : <HeartPulse className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">Nueva cita</span>
                <h3 className="text-xl font-extrabold">
                  {formService === "nutrition" ? "Consulta de nutrición" : formService ? "Sesión de fisioterapia" : "Elige el tipo de cita"}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 cursor-pointer"
              title="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleCreateBooking} className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Servicio */}
                <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
                  <h4 className="text-base font-extrabold text-slate-900 mb-4">1. ¿Qué tipo de cita?</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        id: "nutrition",
                        t: "Nutrición",
                        d: "Plan de alimentación, control de peso y composición corporal",
                        Icon: Utensils,
                        on: "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100",
                        ic: "bg-emerald-600",
                      },
                      {
                        id: "physiotherapy",
                        t: "Fisioterapia",
                        d: "Evaluación de lesiones, dolor y rehabilitación",
                        Icon: HeartPulse,
                        on: "border-cyan-500 bg-cyan-50 ring-4 ring-cyan-100",
                        ic: "bg-cyan-600",
                      },
                    ].map(({ id, t, d, Icon, on, ic }) => (
                      <button
                        type="button"
                        key={id}
                        onClick={() => handleServiceChange(id)}
                        className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer flex gap-4 items-start ${
                          formService === id ? on : "border-slate-200 hover:border-slate-400 bg-white"
                        }`}
                      >
                        <span className={`w-12 h-12 rounded-xl ${ic} text-white flex items-center justify-center shrink-0`}>
                          <Icon className="w-6 h-6" />
                        </span>
                        <span>
                          <span className="block text-lg font-extrabold text-slate-900">{t}</span>
                          <span className="block text-sm text-slate-500">{d}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 2. Paciente y especialista */}
                <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
                  <h4 className="text-base font-extrabold text-slate-900 mb-4">2. Paciente y especialista</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Alumno *</label>
                      <SelectorAlumno alumnos={members} value={formMemberId} onChange={(id) => setFormMemberId(id)} required />
                      {members.length === 0 && (
                        <p className="text-xs text-amber-700 mt-1">Aún no hay alumnos registrados.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Especialista *</label>
                      <input
                        list="lista-especialistas"
                        value={formStaffName}
                        onChange={(e) => setFormStaffName(e.target.value)}
                        required
                        placeholder={formService === "nutrition" ? "Nutricionista" : "Fisioterapeuta"}
                        className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-white"
                      />
                      <datalist id="lista-especialistas">
                        {availableSpecialists.map((n) => (
                          <option key={n} value={n} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </section>

                {/* 3. Fecha y hora: solo los turnos que publicó el especialista */}
                <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h4 className="text-base font-extrabold text-slate-900">3. Fecha y hora</h4>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      Otra fecha
                      <input
                        type="date"
                        value={formDate}
                        min={hoyISO()}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                        className="text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </label>
                  </div>
                  {!formService ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-sm text-slate-500 text-center">
                      Elige primero el tipo de cita para ver los turnos de atención.
                    </div>
                  ) : (
                    <>
                      {/* Próximos 14 días con sus turnos libres */}
                      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
                        {Array.from({ length: 14 }, (_, k) => {
                          const [y, m, d] = hoyISO().split("-").map(Number);
                          const fd = new Date(Date.UTC(y, m - 1, d + k));
                          const iso = fd.toISOString().slice(0, 10);
                          const lista = turnosDia(formService, iso);
                          const ahoraMin = (() => {
                            const f = new Date(Date.now() - 5 * 3600e3);
                            return f.getUTCHours() * 60 + f.getUTCMinutes();
                          })();
                          const libres = lista.filter((t) => !ocupanTurno(formService, iso, t.inicio).length && !(k === 0 && t.ini < ahoraMin)).length;
                          const sel = iso === formDate;
                          return (
                            <button
                              type="button"
                              key={iso}
                              onClick={() => {
                                setFormDate(iso);
                                setFormSlot("");
                              }}
                              className={`rd-dia-cita shrink-0 w-[4.6rem] rounded-xl border-2 px-1 py-1.5 text-center cursor-pointer transition ${
                                sel ? "bg-blue-600 border-blue-600 text-white shadow" : libres ? "bg-white border-slate-200 text-slate-700 hover:border-blue-400" : "bg-slate-50 border-slate-100 text-slate-400"
                              }`}
                            >
                              <span className="block text-[10px] font-bold uppercase">{k === 0 ? "Hoy" : NOMBRES_DIA[(fd.getUTCDay() + 6) % 7].slice(0, 3)}</span>
                              <span className="block text-lg font-extrabold leading-tight">{fd.getUTCDate()}</span>
                              <span className={`block text-[10px] font-bold ${sel ? "text-white/85" : libres ? "text-emerald-600" : ""}`}>
                                {lista.length ? (libres ? `${libres} ${libres === 1 ? "libre" : "libres"}` : "lleno") : "sin turnos"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-sm font-bold text-slate-700 mt-2 mb-2">{fechaLarga(formDate)}</p>
                      {horasDelDia(formService, formDate).length === 0 ? (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                          {formService === "nutrition" ? "Nutrición" : "Fisioterapia"} no publicó turnos para este día. Elige un día con turnos libres arriba.
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-3 gap-3">
                          {PARTES_DIA.map(([clave, nombre, IconoParte, grad]) => {
                            const ahoraMin = (() => {
                              const f = new Date(Date.now() - 5 * 3600e3);
                              return f.getUTCHours() * 60 + f.getUTCMinutes();
                            })();
                            const deParte = turnosDia(formService, formDate).filter((t) => parteDelDia(t.ini) === clave);
                            return (
                              <div key={clave} className="rd-parte-turnos rounded-xl border border-slate-200 bg-slate-50 p-2">
                                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-600 mb-1.5">
                                  <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${grad} text-white flex items-center justify-center`}>
                                    <IconoParte className="w-3 h-3" />
                                  </span>
                                  {nombre}
                                </p>
                                {deParte.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 py-2 text-center">Sin turnos</p>
                                ) : (
                                  <div className="space-y-1">
                                    {deParte.map((t) => {
                                      const ocupada = ocupanTurno(formService, formDate, t.inicio).length > 0;
                                      const pasado = formDate === hoyISO() && t.ini < ahoraMin;
                                      const sel = aMin(formSlot) === t.ini;
                                      return (
                                        <button
                                          type="button"
                                          key={t.ini}
                                          disabled={ocupada || pasado}
                                          onClick={() => setFormSlot(t.inicio)}
                                          className={`rd-turno-elegir w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border-2 text-left transition ${
                                            sel
                                              ? "bg-blue-600 border-blue-600 text-white shadow cursor-pointer"
                                              : ocupada || pasado
                                                ? "bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed"
                                                : "bg-white border-slate-200 text-slate-800 hover:border-blue-400 cursor-pointer"
                                          }`}
                                        >
                                          <span className={`text-sm font-extrabold tabular-nums ${ocupada || pasado ? "line-through" : ""}`}>{rangoTexto(t.ini, t.fin)}</span>
                                          <span className={`text-[10px] font-bold shrink-0 ${sel ? "text-white/85" : ""}`}>{ocupada ? "Ocupado" : pasado ? "Pasó" : `${t.dur} min`}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                  {detectedFormConflict && (
                    <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>
                        Este alumno ya tiene una cita ese día a esa hora ({detectedFormConflict.staffName}). Elija otro
                        horario.
                      </span>
                    </div>
                  )}
                </section>

                {/* 4. Motivo */}
                <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
                  <h4 className="text-base font-extrabold text-slate-900 mb-4">4. Motivo de la cita</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(formService === "nutrition"
                      ? ["Primera consulta", "Control mensual", "Plan de alimentación", "Evaluación de composición corporal"]
                      : ["Evaluación inicial", "Sesión de tratamiento", "Control de evolución", "Dolor agudo"]
                    ).map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setFormReason(m)}
                        className={`px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer ${
                          formReason === m
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="O escriba el motivo…"
                    className="w-full text-sm p-3 rounded-xl border border-slate-300 bg-white"
                  />
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Notas internas (opcional)"
                    className="w-full mt-3 text-sm p-3 rounded-xl border border-slate-300 bg-white"
                  />
                </section>
              </div>

              {/* Resumen */}
              <aside className="lg:sticky lg:top-6 self-start space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div
                    className={`p-5 text-white ${formService === "nutrition" ? "bg-emerald-600" : formService ? "bg-cyan-700" : "bg-slate-700"}`}
                  >
                    <span className="text-xs font-bold uppercase tracking-widest text-white">Resumen</span>
                    {formService && turnoEn(formService, formDate, formSlot) ? (
                      <>
                        <p className="text-3xl font-black mt-1">{formSlot}</p>
                        <p className="text-sm font-bold text-white/85">hasta {turnoEn(formService, formDate, formSlot).final}</p>
                      </>
                    ) : (
                      <p className="text-xl font-black mt-1">Elige un turno</p>
                    )}
                    <p className="text-sm">{fechaLarga(formDate)}</p>
                  </div>
                  <dl className="p-5 space-y-3 text-sm">
                    {[
                      ["Servicio", formService === "nutrition" ? "Nutrición" : formService ? "Fisioterapia" : "—"],
                      ["Alumno", members.find((m) => m.id === formMemberId)?.fullName || "—"],
                      ["Especialista", formStaffName || "—"],
                      ["Lugar", formRoom],
                      ["Duración", formService && turnoEn(formService, formDate, formSlot) ? `${turnoEn(formService, formDate, formSlot).dur} minutos` : "—"],
                      ["Motivo", formReason || "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="font-bold text-slate-900 text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <button
                  type="submit"
                  disabled={!!detectedFormConflict || !formService || !horasDelDia(formService, formDate).includes(formSlot)}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-extrabold shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> Confirmar cita
                </button>
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="w-full py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
              </aside>
            </div>
          </form>
        </div>
</div>
      )}
    </div>
  );
};
