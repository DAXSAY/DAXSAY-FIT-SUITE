import { CampoNumero } from "../common/CampoNumero";
import { Pestanas } from "../common/CabeceraModulo";
import { useRecordado } from "../../utils/subPestana";
import React, { useState, useMemo } from "react";
import { PistaMarcar, TEXTO_MARCAR } from "../common/PistaMarcar";
import {
  FileCheck2,
  UserCheck,
  Calendar,
  Clock,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Trash2,
  GraduationCap,
  ArrowRightCircle,
  Info,
  Briefcase,
  X,
  CalendarDays,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
// Sin confeti: el sistema usa avisos de color en su lugar
const confetti = () => {};
import { buscarAlumno } from "../../utils/codigo";
import { CalendarioAsistencias } from "./CalendarioAsistencias";
import { CalendarioPersonal } from "./CalendarioPersonal";
import { PermisosPersonal } from "./PermisosPersonal";
import { CalendarioGeneral } from "./CalendarioGeneral";
import { esCodigoPase, validarPaseLibre } from "../../utils/pase";

import { hoyISO } from "../../utils/fecha";
import { esCodigoPersonal, buscarPersonal, ingresoDeHoy } from "../../utils/codigoPersonal";
import { mostrarIngreso, avisoAlumno } from "./AvisoIngreso";
import { abrirCorreccion } from "./CorregirIngreso";
import { SelectorAlumno } from "../common/BuscarAlumno";
import { filtrarAlumnos } from "../../utils/buscarPersona";
import { candidatosPorCodigo } from "../../utils/buscarPersona";
import { ListaCandidatos } from "../common/ListaCandidatos";

const fc = (f) => (f ? String(f).slice(0, 10).split("-").reverse().join("/") : "");

export const AttendanceModule = () => {
  const {
    attendances,
    recordAttendance,
    deleteAttendance,
    members,
    staffContracts,
    todoElPersonal,
    permisos = [],
    currentUser,
  } = useGym();

  // Primary Tab Separation: Personal de Trabajo vs Alumnos
  const [activeTab, setActiveTab] = useRecordado("asistencias", "inicio");
  const permisosPendientes = permisos.filter((p) => p.estado === "pendiente").length;

  // Search & Filters
  const [filterDate, setFilterDate] = useState(hoyISO());
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick punch input state
  const [quickInput, setQuickInput] = useState("");
  const [lastPunchResult, setLastPunchResult] = useState(null);

  // Manual Staff Check-In Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [modalStaffId, setModalStaffId] = useState(staffContracts[0]?.id || "");
  const [modalStaffStatus, setModalStaffStatus] = useState("puntual");
  const [modalStaffTime, setModalStaffTime] = useState("08:00 AM");
  const [modalStaffHours, setModalStaffHours] = useState(8);
  const [modalStaffReason, setModalStaffReason] = useState("");
  const [modalStaffNotes, setModalStaffNotes] = useState("");

  // Manual Student Check-In Modal
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [modalStudentId, setModalStudentId] = useState(members[0]?.id || "");
  const [modalStudentNotes, setModalStudentNotes] = useState("");

  // Separate Records by Category
  const staffRecords = useMemo(() => {
    return attendances.filter((a) => {
      const isStaff =
        a.category === "staff" ||
        a.userRole === "trainer" ||
        a.userRole === "staff" ||
        a.userRole === "admin" ||
        staffContracts.some(
          (s) => s.fullName === a.userName || s.dni === a.userDni,
        );
      const matchDate = !filterDate || a.date === filterDate;
      const matchStatus =
        filterStatus === "all" ||
        a.status === filterStatus ||
        (filterStatus === "puntual" &&
          (a.status === "puntual" ||
            a.status === "on_time" ||
            a.status === "authorized")) ||
        (filterStatus === "tarde" &&
          (a.status === "tarde" || a.status === "late")) ||
        (filterStatus === "falta" && a.status === "falta") ||
        (filterStatus === "permiso" && a.status === "permiso");
      const matchSearch =
        !searchQuery ||
        a.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.userDni.includes(searchQuery) ||
        (a.reason &&
          a.reason.toLowerCase().includes(searchQuery.toLowerCase()));

      return isStaff && matchDate && matchStatus && matchSearch;
    });
  }, [attendances, staffContracts, filterDate, filterStatus, searchQuery]);

  const studentRecords = useMemo(() => {
    return attendances.filter((a) => {
      const isStudent = a.category === "student" || a.userRole === "student";
      const matchDate = !filterDate || a.date === filterDate;
      const matchSearch =
        !searchQuery ||
        a.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.userDni.includes(searchQuery);

      return isStudent && matchDate && matchSearch;
    });
  }, [attendances, filterDate, searchQuery]);

  // Statistics for Staff
  const staffStats = useMemo(() => {
    const today = attendances.filter(
      (a) => a.category === "staff" || a.userRole !== "student",
    );
    const puntual = today.filter(
      (a) =>
        a.status === "puntual" ||
        a.status === "on_time" ||
        a.status === "authorized",
    ).length;
    const tarde = today.filter(
      (a) => a.status === "tarde" || a.status === "late",
    ).length;
    const falta = today.filter((a) => a.status === "falta").length;
    const permiso = today.filter((a) => a.status === "permiso").length;

    return { total: today.length, puntual, tarde, falta, permiso };
  }, [attendances]);

  // Handle Quick Scanner / Punch
  const candidatosPunch = React.useMemo(
    () => (esCodigoPase(quickInput.trim()) ? [] : candidatosPorCodigo(quickInput, members, todoElPersonal || staffContracts)),
    [quickInput, members, todoElPersonal, staffContracts],
  );
  const [punchIdx, setPunchIdx] = React.useState(0);
  const [verPunch, setVerPunch] = React.useState(false);

  const handleQuickPunch = (e, elegidoForzado) => {
    e?.preventDefault?.();
    if (!quickInput.trim()) return;

    const texto = quickInput.trim();
    let elegido = elegidoForzado || null;
    if (!elegido && !esCodigoPase(texto)) {
      if (candidatosPunch.length > 1) {
        elegido = verPunch ? candidatosPunch[punchIdx] : null;
        if (!elegido) return setVerPunch(true);
      } else if (candidatosPunch.length === 1) elegido = candidatosPunch[0];
    }
    const hoy = hoyISO();
    const primer = (n) => String(n || "").trim().split(/\s+/)[0];
    setQuickInput("");
    setVerPunch(false);
    setPunchIdx(0);

    // Pase libre del CRM (QR de invitación)
    if (esCodigoPase(texto)) {
      validarPaseLibre(texto).then((r) => {
        const usado = !r.ok && /ya se us/i.test(r.mensaje);
        mostrarIngreso(
          r.ok
            ? { tipo: "pase", codigo: texto.toUpperCase(), titulo: `¡Bienvenido(a) a tu clase de prueba, ${primer(r.prospecto?.fullName)}!`, detalle: `Pase libre válido por hoy${r.prospecto?.planName ? ` · le interesa ${r.prospecto.planName}` : ""}.` }
            : { tipo: usado ? "repetido" : "error", codigo: texto.toUpperCase(), titulo: usado ? "Este pase libre ya fue usado" : "Pase libre no válido", detalle: r.mensaje.replace(/^Pase libre no válido: /, "") },
        );
        setLastPunchResult({
          success: r.ok,
          name: r.prospecto?.fullName || texto.toUpperCase(),
          role: "Invitado (pase libre)",
          status: r.ok ? "Pase libre" : usado ? "Ya usado" : "No válido",
          planOrRole: r.prospecto?.planName || "Prueba gratis",
          message: r.mensaje,
        });
      });
      return;
    }

    // 1. Personal: código 1-COACH / 1-NUTRI…, o DNI si no es de un alumno
    const hallado = elegido ? (elegido.tipo === "alumno" ? { member: elegido.member } : null) : buscarAlumno(members, texto);
    const foundStaff = elegido
      ? elegido.tipo === "personal"
        ? elegido.contrato
        : null
      : esCodigoPersonal(texto) || (/^\d{8}$/.test(texto) && !hallado)
        ? buscarPersonal(todoElPersonal || staffContracts, texto)
        : null;

    if (foundStaff) {
      const previo = ingresoDeHoy(attendances, foundStaff.staffId, hoy);
      if (previo) {
        mostrarIngreso({ tipo: "repetido", codigo: foundStaff.staffCode, titulo: `${primer(foundStaff.fullName)} ya marcó su entrada hoy`, detalle: `Registrada a las ${previo.time}. No se volvió a registrar.` });
        setLastPunchResult({ success: false, name: foundStaff.fullName, role: "Personal de Trabajo", status: "Ya marcó", planOrRole: foundStaff.roleTitle, message: `Ya marcó su entrada hoy a las ${previo.time}.` });
        return;
      }
      const r = recordAttendance({
        userId: foundStaff.staffId,
        userName: foundStaff.fullName,
        userRole: foundStaff.role === "trainer" ? "trainer" : "staff",
        userDni: foundStaff.dni,
        staffCode: foundStaff.staffCode,
        type: "in",
        status: "puntual",
        category: "staff",
        contractId: foundStaff.id,
        scheduledTime: "08:00 AM - 04:00 PM",
        hoursWorked: 8,
        checkInMethod: "codigo_personal",
        notes: `Marcación de entrada para ${foundStaff.roleTitle}`,
      });
      mostrarIngreso({ tipo: "personal", codigo: foundStaff.staffCode, titulo: `¡Buen turno, ${primer(foundStaff.fullName)}!`, detalle: `${foundStaff.roleTitle} · entrada registrada a las ${r?.record?.time || ""}` });
      setLastPunchResult({
        success: true,
        name: foundStaff.fullName,
        role: "Personal de Trabajo",
        status: "Puntual",
        planOrRole: foundStaff.roleTitle,
        message: `¡Asistencia registrada para ${foundStaff.fullName}! Estado: Puntual.`,
      });
      setActiveTab("inicio");
      return;
    }
    if (esCodigoPersonal(texto)) {
      mostrarIngreso({ tipo: "error", codigo: texto.toUpperCase(), titulo: "No hay personal con ese código", detalle: "Revisa el código en Contratos de Personal (ej. 1-COACH, 1-NUTRI)." });
      return;
    }

    // 2. Alumno
    const foundMember = hallado?.member;

    if (foundMember) {
      const previo = ingresoDeHoy(attendances, foundMember.id, hoy);
      if (previo) {
        mostrarIngreso(avisoAlumno(foundMember, { repetido: previo }));
        setLastPunchResult({ success: false, name: foundMember.fullName, role: "Alumno / Socio", status: "Ya marcó", planOrRole: foundMember.planName, message: `Ya registró su ingreso hoy a las ${previo.time}. No se volvió a registrar.` });
        setActiveTab("inicio");
        return;
      }
      const visitasPrevias = attendances.filter((a) => String(a.userId) === String(foundMember.id)).length;
      const isFrozen = foundMember.status === "frozen";
      const isExpired = foundMember.status === "expired" || isFrozen;
      const reg = recordAttendance({
        userId: foundMember.id,
        userName: foundMember.fullName,
        userRole: "student",
        userDni: foundMember.dni,
        type: "in",
        status: isExpired ? "warning" : "puntual",
        category: "student",
        checkInMethod: "qr_app",
        membershipPlan: foundMember.planName,
        notes: isFrozen
          ? `❄️ Membresía congelada hasta ${fc(foundMember.freeze?.current?.endDate)}`
          : isExpired
          ? "⛔ Membresía Vencida"
          : "Ingreso regular a sala de entrenamiento",
      });
      mostrarIngreso({ ...avisoAlumno(foundMember, { visitasPrevias }), accion: reg?.record ? { texto: "¿Error? Corregir", fn: () => abrirCorreccion(reg.record) } : undefined });
      setLastPunchResult({
        success: !isExpired,
        name: foundMember.fullName,
        role: "Alumno / Socio",
        status: isFrozen ? "Congelado" : isExpired ? "Vencido" : "Autorizado",
        planOrRole: foundMember.planName,
        message: isFrozen
          ? `❄️ ${foundMember.fullName} tiene la membresía congelada hasta el ${fc(foundMember.freeze?.current?.endDate)}. Si regresó antes, termina el congelamiento en Alumnos.`
          : isExpired
          ? `¡Atención! Membresía de ${foundMember.fullName} se encuentra vencida.`
          : `¡Acceso concedido a ${foundMember.fullName}!`,
      });
      setActiveTab("inicio");
      return;
    }

    mostrarIngreso({ tipo: "error", titulo: "No se encontró a nadie", detalle: `Ningún alumno ni personal con «${texto}» (código, DNI o nombre).` });
  };

  // Submit Manual Staff Attendance
  const handleSaveStaffAttendance = (e) => {
    e.preventDefault();
    const staff =
      staffContracts.find((s) => s.id === modalStaffId) || staffContracts[0];
    if (!staff) return;

    recordAttendance({
      userId: staff.staffId,
      userName: staff.fullName,
      userRole: staff.role === "trainer" ? "trainer" : "staff",
      userDni: staff.dni,
      type: "in",
      status: modalStaffStatus,
      category: "staff",
      contractId: staff.id,
      scheduledTime: `${modalStaffTime} - Jornada Asignada`,
      hoursWorked: modalStaffHours,
      reason: modalStaffReason.trim() || undefined,
      checkInMethod: "dni_manual",
      notes:
        modalStaffNotes.trim() ||
        `Registro manual en contrato: ${staff.contractDurationLabel}`,
    });

    confetti({ particleCount: 40, spread: 60 });
    setIsStaffModalOpen(false);
    setModalStaffReason("");
    setModalStaffNotes("");
  };

  // Submit Manual Student Attendance
  const handleSaveStudentAttendance = (e) => {
    e.preventDefault();
    const mem = members.find((m) => m.id === modalStudentId) || members[0];
    if (!mem) return;
    const previo = ingresoDeHoy(attendances, mem.id, hoyISO());
    if (previo) {
      mostrarIngreso(avisoAlumno(mem, { repetido: previo }));
      setIsStudentModalOpen(false);
      return;
    }

    recordAttendance({
      userId: mem.id,
      userName: mem.fullName,
      userRole: "student",
      userDni: mem.dni,
      type: "in",
      status: mem.status === "expired" || mem.status === "frozen" ? "warning" : "puntual",
      category: "student",
      checkInMethod: "dni_manual",
      membershipPlan: mem.planName,
      notes: modalStudentNotes.trim() || "Ingreso manual por recepción",
    });

    mostrarIngreso(avisoAlumno(mem, { visitasPrevias: 1 }));
    setIsStudentModalOpen(false);
    setModalStudentNotes("");
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv =
      "ID,Categoria,Fecha,Hora,Usuario,DNI,Estado,HorarioProgramado,HorasTrabajadas,Motivo,Notas\n";
    const list = activeTab === "staffCalendar" ? staffRecords : studentRecords;
    list.forEach((r) => {
      csv += `"${r.id}","${r.category || "general"}","${r.date}","${r.time}","${r.userName}","${r.userDni}","${r.status}","${r.scheduledTime || ""}","${r.hoursWorked || 0}","${r.reason || ""}","${r.notes || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asistencias_${activeTab}_radicalgym_${filterDate}.csv`;
    link.click();
  };

  // Status Badge for Staff
  const getStaffStatusBadge = (status) => {
    switch (status) {
      case "puntual":
      case "on_time":
      case "authorized":
        return {
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
          label: "Puntual",
          icon: CheckCircle2,
        };
      case "tarde":
      case "late":
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-300",
          label: "Tarde",
          icon: Clock,
        };
      case "falta":
        return {
          bg: "bg-rose-100 text-rose-800 border-rose-300",
          label: "Falta",
          icon: XCircle,
        };
      case "permiso":
        return {
          bg: "bg-blue-100 text-blue-800 border-blue-300",
          label: "Permiso",
          icon: Info,
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-800 border-slate-300",
          label: status,
          icon: CheckCircle2,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rd-portada rd-cabecera">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Personal y alumnos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Asistencias
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Ingresos de alumnos, puntualidad del personal y permisos.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => {
                if (activeTab === "staffCalendar") setIsStaffModalOpen(true);
                else setIsStudentModalOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {activeTab === "staffCalendar"
                  ? "Registrar Asistencia Personal"
                  : "Registrar Ingreso Alumno"}
              </span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Quick Punch Bar in Banner */}
        <form
          onSubmit={handleQuickPunch}
          className="mt-5 pt-4 border-t border-slate-800 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <PistaMarcar visible={!quickInput} className="left-10 right-4 text-sm text-slate-400" />
            <input
              type="text"
              aria-label={TEXTO_MARCAR}
              title={TEXTO_MARCAR}
              value={quickInput}
              onChange={(e) => (setQuickInput(e.target.value), setPunchIdx(0), setVerPunch(true))}
              onKeyDown={(e) => {
                if (!candidatosPunch.length) return;
                if (e.key === "ArrowDown") (e.preventDefault(), setVerPunch(true), setPunchIdx((i) => Math.min(i + 1, candidatosPunch.length - 1)));
                if (e.key === "ArrowUp") (e.preventDefault(), setPunchIdx((i) => Math.max(i - 1, 0)));
                if (e.key === "Escape") setVerPunch(false);
              }}
              onFocus={() => setVerPunch(true)}
              onBlur={() => setTimeout(() => setVerPunch(false), 150)}
              className="rd-campo-marcar w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-all"
            />
            {quickInput.trim() && verPunch && (
              <ListaCandidatos
                candidatos={candidatosPunch}
                indice={punchIdx}
                onIndice={setPunchIdx}
                onElegir={(c) => handleQuickPunch(null, c)}
                pase={esCodigoPase(quickInput.trim())}
              />
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>Marcar</span>
            <ArrowRightCircle className="w-4 h-4" />
          </button>
        </form>

        {lastPunchResult && (
          <div
            className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
              lastPunchResult.success
                ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200"
                : "bg-rose-950/70 border-rose-500/50 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>{lastPunchResult.name}</strong> ({lastPunchResult.role})
                — {lastPunchResult.message}
              </span>
            </div>
            <button
              onClick={() => setLastPunchResult(null)}
              className="text-white/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <Pestanas
        activa={activeTab}
        onCambiar={setActiveTab}
        pestanas={[
          { k: "inicio", icono: CalendarDays, label: "Calendario", tono: "teal" },
          { k: "calendar", icono: CalendarDays, label: "Historial de un alumno", tono: "emerald" },
          { k: "staffCalendar", icono: CalendarDays, label: "Puntualidad del personal", tono: "violet" },
          { k: "permisos", icono: FileCheck2, label: "Permisos", badge: permisosPendientes || null, tono: "amber" },
        ]}
      />

      {/* ---------------- CALENDARIO GENERAL (primera pantalla) ---------------- */}
      {activeTab === "inicio" && (
        <CalendarioGeneral
          onVerLista={(tab, dia) => {
            setFilterDate(dia);
          }}
        />
      )}

      {/* ---------------- CALENDARIO DE ASISTENCIAS POR ALUMNO ---------------- */}
      {activeTab === "calendar" && <PanelCalendario members={members} />}

      {/* ---------------- CALENDARIO DEL PERSONAL ---------------- */}
      {activeTab === "staffCalendar" && <CalendarioPersonal />}

      {/* ---------------- PERMISOS DEL PERSONAL ---------------- */}
      {activeTab === "permisos" && <PermisosPersonal />}

      {/* ---------------- SECTION 1: PERSONAL DE TRABAJO ---------------- */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          {/* Staff KPI Indicators for states */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase block">
                  Puntuales Hoy
                </span>
                <span className="text-2xl font-extrabold text-emerald-950">
                  {staffStats.puntual}
                </span>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-700 uppercase block">
                  Tardanzas
                </span>
                <span className="text-2xl font-extrabold text-amber-950">
                  {staffStats.tarde}
                </span>
                <span className="text-xs text-amber-600 block mt-0.5">
                  Sujeto a descuento
                </span>
              </div>
              <Clock className="w-6 h-6 text-amber-600" />
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-700 uppercase block">
                  Faltas Injustificadas
                </span>
                <span className="text-2xl font-extrabold text-rose-950">
                  {staffStats.falta}
                </span>
                <span className="text-xs text-rose-600 block mt-0.5">
                  Descuento de jornada
                </span>
              </div>
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-700 uppercase block">
                  Permisos Autorizados
                </span>
                <span className="text-2xl font-extrabold text-blue-950">
                  {staffStats.permiso}
                </span>
                <span className="text-xs text-blue-600 block mt-0.5">
                  Justificados
                </span>
              </div>
              <Info className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="font-bold text-slate-800 bg-transparent focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="puntual">Puntual</option>
                <option value="tarde">Tarde</option>
                <option value="falta">Falta</option>
                <option value="permiso">Permiso</option>
              </select>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por colaborador, DNI o motivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">Colaborador / Cargo</th>
                    <th className="py-3 px-3">DNI</th>
                    <th className="py-3 px-3">Hora Marcación</th>
                    <th className="py-3 px-3">Horario en Contrato</th>
                    <th className="py-3 px-3 text-center">Horas Efectivas</th>
                    <th className="py-3 px-3">Estado de Asistencia</th>
                    <th className="py-3 px-4">Motivo / Justificación</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 text-center text-slate-400"
                      >
                        No se encontraron registros de asistencia de personal
                        para la fecha seleccionada.
                      </td>
                    </tr>
                  ) : (
                    staffRecords.map((rec) => {
                      const badge = getStaffStatusBadge(rec.status);
                      const BadgeIcon = badge.icon;
                      const staffContract = staffContracts.find(
                        (s) =>
                          s.dni === rec.userDni || s.fullName === rec.userName,
                      );

                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900">
                              {rec.userName}
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                              {staffContract
                                ? staffContract.roleTitle
                                : rec.userRole}{" "}
                              •{" "}
                              {staffContract?.contractDurationLabel ||
                                "Contrato Vigente"}
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600">
                            {rec.userDni}
                          </td>

                          <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>{rec.time}</span>
                            </div>
                            <span className="text-xs text-slate-400 block">
                              {rec.date}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-medium">
                            {rec.scheduledTime ||
                            staffContract?.assignedWeeklyHours
                              ? `${staffContract?.assignedWeeklyHours}h sem`
                              : "08:00 AM - 04:00 PM"}
                          </td>

                          <td className="py-3 px-3 text-center font-extrabold text-blue-700">
                            {rec.hoursWorked !== undefined
                              ? `${rec.hoursWorked} hrs`
                              : "8 hrs"}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold border ${badge.bg}`}
                            >
                              <BadgeIcon className="w-3.5 h-3.5" />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            {rec.reason ? (
                              <div className="text-slate-800 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-xs font-medium">
                                <strong>Motivo:</strong> {rec.reason}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">
                                Sin incidencias registradas
                              </span>
                            )}
                            {rec.notes && (
                              <span className="text-xs text-slate-500 block mt-0.5">
                                {rec.notes}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => deleteAttendance(rec.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                              title="Eliminar marcación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SECTION 2: ALUMNOS / SOCIOS ---------------- */}
      {activeTab === "students" && (
        <div className="space-y-4">
          {/* Table for Students */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Marcaciones de Alumnos ({studentRecords.length})
              </span>
              <span className="text-slate-500">
                Validación de membresía y control de torniquete / QR
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">Hora / Fecha</th>
                    <th className="py-3 px-4">Alumno</th>
                    <th className="py-3 px-3">DNI</th>
                    <th className="py-3 px-3">Plan de Membresía</th>
                    <th className="py-3 px-3">Estado de Acceso</th>
                    <th className="py-3 px-3">Método</th>
                    <th className="py-3 px-4">Observaciones</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 text-center text-slate-400"
                      >
                        No se encontraron ingresos de alumnos registrados para
                        esta fecha.
                      </td>
                    </tr>
                  ) : (
                    studentRecords.map((rec) => {
                      const isWarning =
                        rec.status === "warning" ||
                        (rec.notes && rec.notes.includes("venc"));
                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>{rec.time}</span>
                            </div>
                            <span className="text-xs text-slate-400 block">
                              {rec.date}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-extrabold text-slate-900">
                            {rec.userName}
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600">
                            {rec.userDni}
                          </td>

                          <td className="py-3 px-3 text-slate-700 font-medium">
                            {rec.membershipPlan || "Plan Regular"}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                                isWarning
                                  ? "bg-amber-50 text-amber-800 border-amber-300"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
                              }`}
                            >
                              {isWarning ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {isWarning
                                  ? "Atención / Vencimiento"
                                  : "Acceso Concedido"}
                              </span>
                            </span>
                          </td>

                          <td className="py-3 px-3 uppercase text-xs font-bold text-slate-500">
                            {rec.checkInMethod}
                          </td>

                          <td className="py-3 px-4 text-slate-600 text-xs">
                            {rec.notes || "Ingreso regular a sala de pesas"}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => deleteAttendance(rec.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: REGISTRAR ASISTENCIA DE PERSONAL ---------------- */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto min-h-full bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider block">
                  Control Laboral & Horas de Trabajo
                </span>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                  Registrar Asistencia de Personal
                </h3>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveStaffAttendance}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Colaborador / Personal de Trabajo *
                </label>
                <select
                  value={modalStaffId}
                  onChange={(e) => setModalStaffId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                >
                  {staffContracts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} — {s.roleTitle} ({s.contractDurationLabel})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status selection with Puntual, Tarde, Falta, Permiso */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Estado de Asistencia *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      id: "puntual",
                      label: "Puntual",
                      bg: "bg-emerald-50 text-emerald-800 border-emerald-300",
                    },
                    {
                      id: "tarde",
                      label: "Tarde",
                      bg: "bg-amber-50 text-amber-800 border-amber-300",
                    },
                    {
                      id: "falta",
                      label: "Falta",
                      bg: "bg-rose-50 text-rose-800 border-rose-300",
                    },
                    {
                      id: "permiso",
                      label: "Permiso",
                      bg: "bg-blue-50 text-blue-800 border-blue-300",
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setModalStaffStatus(item.id)}
                      className={`py-2 px-3 rounded-xl border text-center font-extrabold transition-all cursor-pointer ${
                        modalStaffStatus === item.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400"
                          : item.bg
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Hora de Entrada *
                  </label>
                  <input
                    type="text"
                    value={modalStaffTime}
                    onChange={(e) => setModalStaffTime(e.target.value)}
                    placeholder="08:00 AM"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Horas Trabajadas Hoy *
                  </label>
                  <CampoNumero
                    type="number"
                    step="0.5"
                    min="0"
                    max="16"
                    value={modalStaffHours}
                    onChange={(e) => setModalStaffHours(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Motivo (Especially for Tarde, Falta, Permiso) */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Motivo de Incidencia / Justificación{" "}
                  {modalStaffStatus !== "puntual" && (
                    <span className="text-rose-600">*</span>
                  )}
                </label>
                <input
                  type="text"
                  required={modalStaffStatus !== "puntual"}
                  value={modalStaffReason}
                  onChange={(e) => setModalStaffReason(e.target.value)}
                  placeholder={
                    modalStaffStatus === "tarde"
                      ? "Ej. Retraso de 20 minutos por congestión vehicular en Av. Javier Prado"
                      : modalStaffStatus === "permiso"
                        ? "Ej. Cita médica en Essalud autorizada por jefatura con constancia"
                        : modalStaffStatus === "falta"
                          ? "Ej. Inasistencia injustificada sin aviso previo"
                          : "Opcional si es puntual"
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Observaciones adicionales para nómina
                </label>
                <textarea
                  rows={2}
                  value={modalStaffNotes}
                  onChange={(e) => setModalStaffNotes(e.target.value)}
                  placeholder="Se evaluará descuento correspondiente en liquidación de fin de mes..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Marcación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL: REGISTRAR INGRESO ALUMNO ---------------- */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto min-h-full bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider block">
                  Acceso de Miembros
                </span>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                  Registrar Ingreso de Alumno
                </h3>
              </div>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveStudentAttendance}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Seleccionar Alumno *
                </label>
                <SelectorAlumno alumnos={members} value={modalStudentId} onChange={(id) => setModalStudentId(id)} required />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Notas de Recepción
                </label>
                <input
                  type="text"
                  value={modalStudentNotes}
                  onChange={(e) => setModalStudentNotes(e.target.value)}
                  placeholder="Ingreso regular a sala de musculación..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <PreviaIngreso alumno={members.find((m) => String(m.id) === String(modalStudentId))} asistencias={attendances} />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validar Ingreso</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/** Vista previa al registrar un ingreso: estado del alumno elegido y los últimos ingresos de hoy */
const PreviaIngreso = ({ alumno, asistencias = [] }) => {
  const hoy = hoyISO();
  const deHoy = asistencias.filter((a) => a.date === hoy && a.userRole === "student").slice(-6).reverse();
  const suyas = alumno ? asistencias.filter((a) => String(a.userId) === String(alumno.id) || a.userName === alumno.fullName).slice(-5).reverse() : [];
  const estado = !alumno ? null : alumno.status === "expired" ? ["Membresía vencida", "bg-rose-50 text-rose-800 border-rose-200"] : alumno.status === "frozen" ? ["Congelado", "bg-sky-50 text-sky-800 border-sky-200"] : alumno.status === "expiring_soon" ? ["Por vencer", "bg-amber-50 text-amber-800 border-amber-200"] : ["Activo", "bg-emerald-50 text-emerald-800 border-emerald-200"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">Estado del alumno</span>
        {alumno ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <b className="text-sm text-slate-900 truncate">{alumno.fullName}</b>
              <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold ${estado[1]}`}>{estado[0]}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
              <dt className="text-slate-500">Código</dt><dd className="font-bold text-slate-800 text-right">{alumno.codeLabel || "—"}</dd>
              <dt className="text-slate-500">Plan</dt><dd className="font-bold text-slate-800 text-right truncate">{alumno.planName || "—"}</dd>
              <dt className="text-slate-500">Vence</dt><dd className="font-bold text-slate-800 text-right">{fc(alumno.membershipEndDate) || "—"}</dd>
              <dt className="text-slate-500">Deuda</dt><dd className={`font-bold text-right ${Number(alumno.debt) > 0 ? "text-rose-700" : "text-emerald-700"}`}>{Number(alumno.debt) > 0 ? `S/ ${Number(alumno.debt).toFixed(2)}` : "Al día"}</dd>
            </dl>
            <div>
              <span className="block text-[11px] font-bold text-slate-500 mb-1">Últimas asistencias</span>
              {suyas.length ? (
                <div className="flex flex-wrap gap-1">{suyas.map((a) => <span key={a.id} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">{fc(a.date)}</span>)}</div>
              ) : (
                <p className="text-[11px] text-slate-500">Sin asistencias registradas.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-slate-500">Elige al alumno para ver su plan, vencimiento, deuda y últimas asistencias antes de validar.</p>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">Ingresos de hoy ({asistencias.filter((a) => a.date === hoy && a.userRole === "student").length})</span>
        {deHoy.length ? (
          <ul className="divide-y divide-slate-200">
            {deHoy.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
                <span className="truncate text-slate-800 font-semibold">{a.userName || a.memberName || "Alumno"}</span>
                <span className="shrink-0 font-mono text-slate-500">{String(a.time || a.checkIn || "").slice(0, 5)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-slate-500">Todavía no hay ingresos registrados hoy.</p>
        )}
      </div>
    </div>
  );
};

/** Busca al alumno (código, DNI o nombre) y muestra su calendario de asistencias */
const PanelCalendario = ({ members }) => {
  const [texto, setTexto] = React.useState("");
  const [elegido, setElegido] = React.useState(null);
  const sugerencias = React.useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return [];
    return filtrarAlumnos(members, texto).slice(0, 8);
  }, [texto, members]);
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <p className="text-sm font-extrabold text-slate-900">¿De qué alumno quieres ver el historial?</p>
        <p className="text-xs text-slate-500">Escribe su código (ej. 12 o DR-12), nombre o DNI. Verás mes por mes qué días vino y cuáles faltó.</p>
        <SelectorAlumno alumnos={members} value={elegido?.id || ""} onChange={(id) => setElegido(members.find((m) => m.id === id) || null)} />
      </div>
      {elegido ? (
        <CalendarioAsistencias key={elegido.id} memberId={elegido.id} />
      ) : (
        <p className="text-sm text-slate-500 text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
          Elige un alumno para ver en el calendario qué días vino y qué días no.
        </p>
      )}
    </div>
  );
};
