import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  Briefcase,
  HeartPulse,
  Utensils,
  Dumbbell,
  Store,
  Wrench,
  Trash2,
  X,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import { DocumentoContrato } from "./DocumentoContrato";
import { SelectorDuracion, SelectorFunciones, EditorHorario, ReglasTardanza, RenovarContrato } from "./CamposContrato";
import { DURACIONES, FUNCIONES_POR_ROL, MODALIDADES, etiquetaDuracion, fechaFin, horasSemana, textoHorario } from "../../utils/contratos";
import { coincidePersonal } from "../../utils/buscarPersona";
// Sin confeti: el sistema usa avisos de color en su lugar
const confetti = () => {};

export const StaffContractsModule = () => {
  const {
    staffContracts,
    addStaffContract,
    updateStaffContract,
    renewStaffContract,
    deleteStaffContract,
    attendances,
  } = useGym();

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);
  const [selectedContractForDoc, setSelectedContractForDoc] = useState(null);
  const [renewingContract, setRenewingContract] = useState(null);

  // New Contract Form State
  const [formName, setFormName] = useState("");
  const [formDni, setFormDni] = useState("");
  const [formRole, setFormRole] = useState("trainer");
  const [formRoleTitle, setFormRoleTitle] = useState(
    "Entrenador de Musculación & Sala",
  );
  const [formPhone, setFormPhone] = useState("+51 ");
  const [formEmail, setFormEmail] = useState("");
  const [formContractType, setFormContractType] = useState("6_months");
  const [formStartDate, setFormStartDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }));
  const [formMonthlySalary, setFormMonthlySalary] = useState(2000);
  const [formModality, setFormModality] = useState("full_time");
  const [formSchedule, setFormSchedule] = useState({ ...MODALIDADES.full_time.horario });
  const [formFunctions, setFormFunctions] = useState(FUNCIONES_POR_ROL.trainer.slice(0, 4));
  const formWeeklyHours = horasSemana(formSchedule);
  const [formBankAccount, setFormBankAccount] = useState("BCP: 193-");
  const [formNotes, setFormNotes] = useState("");

  // Fecha de fin según la duración (1 mes, 3, 6 o 12)
  const calculatedEndDate = useMemo(() => fechaFin(formStartDate, formContractType), [formStartDate, formContractType]);

  // Handle Role preset title
  const handleRoleChange = (role) => {
    setFormRole(role);
    setFormFunctions((FUNCIONES_POR_ROL[role] || []).slice(0, 4));
    switch (role) {
      case "trainer":
        setFormRoleTitle("Entrenador de Musculación & Fuerza");
        setFormMonthlySalary(2000);
        break;
      case "physiotherapist":
        setFormRoleTitle("Fisioterapeuta Colegiado & Kinesiólogo");
        setFormMonthlySalary(2600);
        break;
      case "nutritionist":
        setFormRoleTitle("Lic. en Nutrición Deportiva");
        setFormMonthlySalary(2400);
        break;
      case "receptionist":
        setFormRoleTitle("Recepcionista, Caja & Atención");
        setFormMonthlySalary(1400);
        break;
      case "maintenance":
        setFormRoleTitle("Mantenimiento General & Limpieza");
        setFormMonthlySalary(1300);
        break;
      case "manager":
        setFormRoleTitle("Coordinador General de Operaciones");
        setFormMonthlySalary(3200);
        break;
    }
  };

  // Filter staff contracts
  const filteredContracts = useMemo(() => {
    return staffContracts.filter((c) => {
      const matchSearch = coincidePersonal(c, searchTerm);

      const matchRole = roleFilter === "all" || c.role === roleFilter;
      const matchDuration =
        durationFilter === "all" || c.contractType === durationFilter;
      const matchStatus = statusFilter === "all" || c.status === statusFilter;

      return matchSearch && matchRole && matchDuration && matchStatus;
    });
  }, [staffContracts, searchTerm, roleFilter, durationFilter, statusFilter]);

  // KPI Metrics
  const totalStaff = staffContracts.length;
  const count3Months = staffContracts.filter(
    (c) => c.contractType === "3_months" || c.contractType === "1_month",
  ).length;
  const count6Months = staffContracts.filter(
    (c) => c.contractType === "6_months",
  ).length;
  const count1Year = staffContracts.filter(
    (c) => c.contractType === "1_year",
  ).length;
  const totalMonthlyPayroll = staffContracts.reduce(
    (sum, c) => sum + Number(c.monthlySalary || 0),
    0,
  );
  const totalWorkedHours = staffContracts.reduce(
    (sum, c) => sum + Number(c.assignedWeeklyHours || 0),
    0,
  );
  const expiringSoonCount = staffContracts.filter(
    (c) => c.status === "expiring_soon",
  ).length;

  // Submit new contract
  const handleCreateContract = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formDni.trim()) return;

    const label = etiquetaDuracion(formContractType);

    const deptMap = {
      trainer: "Entrenamiento",
      physiotherapist: "Fisioterapia",
      nutritionist: "Nutrición",
      receptionist: "Recepción",
      maintenance: "Operaciones",
      manager: "Operaciones",
    };

    const hourly = formWeeklyHours ? Number((formMonthlySalary / (formWeeklyHours * 4.33)).toFixed(2)) : 0;

    addStaffContract({
      staffId: `stf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: formName.trim(),
      dni: formDni.trim(),
      role: formRole,
      roleTitle: formRoleTitle.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      contractType: formContractType,
      contractDurationLabel: label,
      startDate: formStartDate,
      endDate: calculatedEndDate,
      status: "active",
      monthlySalary: formMonthlySalary,
      hourlyRate: hourly,
      assignedWeeklyHours: formWeeklyHours,
      workedHoursThisMonth: 0,
      workModality: formModality,
      schedule: formSchedule,
      functions: formFunctions,
      department: deptMap[formRole],
      bankAccount: formBankAccount.trim(),
      paymentStatus: "al_dia",
      notes: formNotes.trim() || undefined,
    });

    confetti({ particleCount: 50, spread: 60 });
    setIsNewContractModalOpen(false);
  };

  // Renovación (nueva duración, inicio, cargo, sueldo y funciones)
  const handleConfirmRenewal = (opciones) => {
    if (!renewingContract) return;
    renewStaffContract(renewingContract.id, opciones);
    setRenewingContract(null);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "trainer":
        return {
          bg: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Dumbbell,
          label: "Entrenador",
        };
      case "physiotherapist":
        return {
          bg: "bg-cyan-100 text-cyan-800 border-cyan-200",
          icon: HeartPulse,
          label: "Fisioterapia",
        };
      case "nutritionist":
        return {
          bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          icon: Utensils,
          label: "Nutrición",
        };
      case "receptionist":
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-200",
          icon: Store,
          label: "Recepción",
        };
      case "maintenance":
        return {
          bg: "bg-purple-100 text-purple-800 border-purple-200",
          icon: Wrench,
          label: "Mantenimiento",
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-800 border-slate-200",
          icon: Briefcase,
          label: "Staff",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rd-portada rd-cabecera">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Briefcase className="w-4 h-4" />
              <span>Personal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Contratos y planilla
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Contratos, sueldos, horarios y reglas de tardanza del personal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsNewContractModalOpen(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Contrato de Personal</span>
            </button>
          </div>
        </div>

        {/* HR KPI Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 font-medium block">
              Personal Activo
            </span>
            <span className="text-xl font-extrabold text-white">
              {totalStaff}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 font-medium block">
              Contratos 1–3 meses
            </span>
            <span className="text-xl font-extrabold text-amber-400">
              {count3Months}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 font-medium block">
              Contratos 6 Meses
            </span>
            <span className="text-xl font-extrabold text-cyan-400">
              {count6Months}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 font-medium block">
              Contratos 1 Año
            </span>
            <span className="text-xl font-extrabold text-emerald-400">
              {count1Year}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 font-medium block">
              Horas semanales
            </span>
            <span className="text-xl font-extrabold text-blue-300">
              {totalWorkedHours} h
            </span>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <span className="text-xs text-slate-400 font-medium block">
              Presupuesto Sueldos
            </span>
            <span className="text-xl font-extrabold text-white">
              S/. {totalMonthlyPayroll.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Reglas de tardanza (descuentos) */}
      <ReglasTardanza />

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por colaborador, DNI o cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los cargos</option>
            <option value="trainer">Entrenadores</option>
            <option value="physiotherapist">Fisioterapia</option>
            <option value="nutritionist">Nutrición</option>
            <option value="receptionist">Recepción / Caja</option>
            <option value="maintenance">Mantenimiento</option>
          </select>

          {/* Duration Filter */}
          <select
            value={durationFilter}
            onChange={(e) => setDurationFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las duraciones</option>
            <option value="1_month">Contrato 1 Mes</option>
            <option value="3_months">Contrato 3 Meses</option>
            <option value="6_months">Contrato 6 Meses</option>
            <option value="1_year">Contrato 1 Año</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="expiring_soon">Por Vencer</option>
            <option value="expired">Vencidos</option>
          </select>
        </div>
      </div>

      {/* Contracts Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredContracts.map((contract) => {
          const roleBadge = getRoleBadge(contract.role);
          const RoleIcon = roleBadge.icon;
          const isExpiring = contract.status === "expiring_soon";

          return (
            <div
              key={contract.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all space-y-4 ${
                isExpiring
                  ? "border-amber-400 ring-1 ring-amber-400/50"
                  : "border-slate-200"
              }`}
            >
              {/* Top Row: Photo, Name, Role Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  {contract.photoUrl ? (
                    <img
                      src={contract.photoUrl}
                      alt={contract.fullName}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center shrink-0 text-sm">
                      {contract.fullName.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-900 truncate">
                      {contract.fullName}
                    </h3>
                    {contract.staffCode && (
                      <span
                        title="Código para marcar asistencia en el check-in"
                        className="inline-block mt-0.5 font-mono text-[11px] font-black text-violet-700 bg-violet-50 border border-violet-200 rounded px-1.5 py-px"
                      >
                        {contract.staffCode}
                      </span>
                    )}
                    <p className="text-xs text-slate-500 truncate">
                      {contract.roleTitle}
                    </p>
                    <span className="text-xs text-slate-400">
                      DNI: {contract.dni}
                    </span>
                  </div>
                </div>

                {/* Role Icon Badge */}
                <span
                  className={`p-1.5 rounded-lg border text-xs shrink-0 ${roleBadge.bg}`}
                  title={roleBadge.label}
                >
                  <RoleIcon className="w-4 h-4" />
                </span>
              </div>

              {/* Contract Term Details */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">
                    Tipo de Contrato:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-xs ${DURACIONES[contract.contractType]?.clase || "bg-slate-100 text-slate-700"}`}
                  >
                    {contract.contractDurationLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Vigencia:</span>
                  <span className="font-medium text-slate-800">
                    {contract.startDate} al {contract.endDate}
                  </span>
                </div>

                {/* Expiration Alert */}
                {isExpiring && (
                  <div className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2 py-1 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>
                      ⚠️ Contrato próximo a vencer. Requiere renovación.
                    </span>
                  </div>
                )}
              </div>

              {/* Salary & Hours Worked breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                  <span className="text-xs font-semibold text-blue-800 block">
                    Sueldo Mensual
                  </span>
                  <span className="text-base font-extrabold text-blue-950">
                    S/. {Number(contract.monthlySalary || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-blue-700 block">
                    (S/. {Number(contract.hourlyRate || 0).toFixed(2)}/hora)
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-semibold text-slate-600 block">
                    Jornada
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {Number(contract.assignedWeeklyHours || 0)} h/sem
                  </span>
                  <span className="text-xs text-slate-500 block truncate" title={textoHorario(contract.schedule)}>
                    {contract.schedule?.dias?.length ? `${contract.schedule.entrada}–${contract.schedule.salida} · ${contract.schedule.dias.length} días` : `${contract.functions?.length || 0} funciones`}
                  </span>
                </div>
              </div>

              {/* Payment & Bank info */}
              <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="truncate">
                  Cuenta: {contract.bankAccount || "Efectivo / Recibo"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                    contract.paymentStatus === "al_dia"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {contract.paymentStatus === "al_dia"
                    ? "Pago Al Día"
                    : "Pago Pendiente"}
                </span>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedContractForDoc(contract)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ver Contrato</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRenewingContract(contract)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                    title="Renovar contrato"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Renovar</span>
                  </button>

                  <button
                    onClick={() => deleteStaffContract(contract.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DOCUMENTO DEL CONTRATO */}
      {selectedContractForDoc && <DocumentoContrato contrato={selectedContractForDoc} onCerrar={() => setSelectedContractForDoc(null)} />}

      {/* RENOVAR CONTRATO */}
      {renewingContract && <RenovarContrato contrato={renewingContract} onCerrar={() => setRenewingContract(null)} onConfirmar={handleConfirmRenewal} />}

      {/* NEW CONTRACT REGISTRATION MODAL */}
      {isNewContractModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto min-h-full bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider block">
                  Alta de Personal
                </span>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                  Nuevo Contrato de Personal
                </h3>
              </div>
              <button
                onClick={() => setIsNewContractModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateContract}
              className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto"
            >
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="ej. Lic. Roberto Gómez"
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    DNI / Documento *
                  </label>
                  <input
                    type="text"
                    value={formDni}
                    onChange={(e) => setFormDni(e.target.value)}
                    placeholder="8 dígitos"
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Role & Role Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Departamento / Área *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="trainer">
                      Entrenador de Sala / Musculación
                    </option>
                    <option value="physiotherapist">
                      Fisioterapia & Rehabilitación
                    </option>
                    <option value="nutritionist">Nutrición Deportiva</option>
                    <option value="receptionist">Recepción & Caja</option>
                    <option value="maintenance">
                      Mantenimiento & Limpieza
                    </option>
                    <option value="manager">Coordinación / Gestión</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Título del Cargo *
                  </label>
                  <input
                    type="text"
                    value={formRoleTitle}
                    onChange={(e) => setFormRoleTitle(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Contract Duration: 3 months, 6 months, 1 year */}
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-2">
                <label className="block font-bold text-blue-900">
                  Duración Pactada del Contrato *
                </label>
                <SelectorDuracion value={formContractType} onChange={setFormContractType} />

                <div className="flex items-center justify-between text-xs text-blue-800 pt-1">
                  <span>
                    Fecha de Inicio: <strong>{formStartDate}</strong>
                  </span>
                  <span>
                    Fecha de Fin Estimada: <strong>{calculatedEndDate}</strong>
                  </span>
                </div>
              </div>

              {/* Start Date & Modality */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>

              {/* Sueldo, horario (horas automáticas) y funciones */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Sueldo Mensual (S/.) *
                  </label>
                  <input
                    type="number"
                    value={formMonthlySalary}
                    onChange={(e) => setFormMonthlySalary(Number(e.target.value))}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="sm:col-span-2 text-xs text-slate-500 pb-2">
                  Tarifa por hora calculada: <b className="text-slate-800">S/ {formWeeklyHours ? (formMonthlySalary / (formWeeklyHours * 4.33)).toFixed(2) : "0.00"}</b> ({formWeeklyHours} h por semana)
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800">Jornada y horario *</label>
                <EditorHorario modalidad={formModality} onModalidad={setFormModality} value={formSchedule} onChange={setFormSchedule} />
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800">Funciones del cargo</label>
                <SelectorFunciones rol={formRole} value={formFunctions} onChange={setFormFunctions} />
              </div>

              {/* Bank Account, Phone & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cuenta Bancaria para Depósito
                  </label>
                  <input
                    type="text"
                    value={formBankAccount}
                    onChange={(e) => setFormBankAccount(e.target.value)}
                    placeholder="ej. BCP 193-XXXX-XX"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Teléfono Móvil
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewContractModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Crear y Emitir Contrato</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
