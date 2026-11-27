import { marcarNavegacion } from "./utils/subPestana";
import { TareasDeHoy } from "./components/tasks/TareasDeHoy";
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { GymProvider, useGym } from "./context/GymContext";
import { Header } from "./components/common/Header";
import { Sidebar } from "./components/common/Sidebar";
import { LoginScreen } from "./components/auth/LoginScreen";
import { ChangePasswordScreen } from "./components/auth/ChangePasswordScreen";
import { userCanAccess, getRole, getAllowedTabs } from "./config/roles";

// Specialized modules
import { ShieldAlert, ArrowRight } from "lucide-react";
import { ErrorModulo } from "./components/common/ErrorModulo";

import { AvisoIngreso } from "./components/attendances/AvisoIngreso";
import { CorregirIngreso } from "./components/attendances/CorregirIngreso";
import { AvisoStockBajo } from "./components/store/AvisoStockBajo";
import GuardiaCambios from "./components/common/GuardiaCambios";
import { hayVentanaAbierta, cerrarVentanaSuperior } from "./utils/controlesVentana";
import { moduloDeLaDireccion } from "./utils/ventanas";
import { IconoEmoji } from "./components/common/IconoEmoji";


// Cada módulo se descarga solo cuando se abre (la primera carga es mucho más liviana,
// sobre todo en el celular). Después del ingreso se precargan en segundo plano.
const cargadores = {
  DashboardOverview: () => import("./components/dashboard/DashboardOverview").then((m) => ({ default: m.DashboardOverview })),
  MembersManagement: () => import("./components/members/MembersManagement").then((m) => ({ default: m.MembersManagement })),
  NewMemberModal: () => import("./components/members/NewMemberModal").then((m) => ({ default: m.NewMemberModal })),
  MembershipsPlans: () => import("./components/memberships/MembershipsPlans").then((m) => ({ default: m.MembershipsPlans })),
  FinanceModule: () => import("./components/finance/FinanceModule").then((m) => ({ default: m.FinanceModule })),
  StaffContractsModule: () => import("./components/staff/StaffContractsModule").then((m) => ({ default: m.StaffContractsModule })),
  PhysiotherapyModule: () => import("./components/physiotherapy/PhysiotherapyModule").then((m) => ({ default: m.PhysiotherapyModule })),
  AppointmentsScheduleModule: () => import("./components/appointments/AppointmentsScheduleModule").then((m) => ({ default: m.AppointmentsScheduleModule })),
  NutritionMeasurementsModule: () => import("./components/nutrition_measurements/NutritionMeasurementsModule").then((m) => ({ default: m.NutritionMeasurementsModule })),
  StorePOS: () => import("./components/store/StorePOS").then((m) => ({ default: m.StorePOS })),
  CashShiftsModule: () => import("./components/cash/CashShiftsModule").then((m) => ({ default: m.CashShiftsModule })),
  UsersAccessModule: () => import("./components/users/UsersAccessModule").then((m) => ({ default: m.UsersAccessModule })),
  ReportsModule: () => import("./components/reports/ReportsModule").then((m) => ({ default: m.ReportsModule })),
  GoalsModule: () => import("./components/goals/GoalsModule").then((m) => ({ default: m.GoalsModule })),
  NotificationCenter: () => import("./components/notifications/NotificationCenter").then((m) => ({ default: m.NotificationCenter })),
  AttendanceModule: () => import("./components/attendances/AttendanceModule").then((m) => ({ default: m.AttendanceModule })),
  StudentPortalModule: () => import("./components/student_portal/StudentPortalModule").then((m) => ({ default: m.StudentPortalModule })),
  RoutinesAndExercises: () => import("./components/routines/RoutinesAndExercises").then((m) => ({ default: m.RoutinesAndExercises })),
  CrmModule: () => import("./components/crm/CrmModule").then((m) => ({ default: m.CrmModule })),
  TareasModule: () => import("./components/tasks/TareasModule"),
  ClasesModule: () => import("./components/classes/ClasesModule"),
};
const DashboardOverview = lazy(cargadores.DashboardOverview);
const MembersManagement = lazy(cargadores.MembersManagement);
const NewMemberModal = lazy(cargadores.NewMemberModal);
const MembershipsPlans = lazy(cargadores.MembershipsPlans);
const FinanceModule = lazy(cargadores.FinanceModule);
const StaffContractsModule = lazy(cargadores.StaffContractsModule);
const PhysiotherapyModule = lazy(cargadores.PhysiotherapyModule);
const AppointmentsScheduleModule = lazy(cargadores.AppointmentsScheduleModule);
const NutritionMeasurementsModule = lazy(cargadores.NutritionMeasurementsModule);
const StorePOS = lazy(cargadores.StorePOS);
const CashShiftsModule = lazy(cargadores.CashShiftsModule);
const UsersAccessModule = lazy(cargadores.UsersAccessModule);
const ReportsModule = lazy(cargadores.ReportsModule);
const GoalsModule = lazy(cargadores.GoalsModule);
const NotificationCenter = lazy(cargadores.NotificationCenter);
const AttendanceModule = lazy(cargadores.AttendanceModule);
const StudentPortalModule = lazy(cargadores.StudentPortalModule);
const RoutinesAndExercises = lazy(cargadores.RoutinesAndExercises);
const CrmModule = lazy(cargadores.CrmModule);
const TareasModule = lazy(cargadores.TareasModule);
const ClasesModule = lazy(cargadores.ClasesModule);

let precargado = false;
function precargarModulos() {
  if (precargado) return;
  precargado = true;
  const lista = Object.values(cargadores);
  const siguiente = () => {
    const f = lista.shift();
    if (!f) return;
    f().catch(() => {}).finally(() => (window.requestIdleCallback ? window.requestIdleCallback(siguiente, { timeout: 2000 }) : setTimeout(siguiente, 150)));
  };
  setTimeout(siguiente, 1200);
}

function CargandoModulo() {
  return (
    <div className="rd-cargando-modulo flex items-center justify-center py-24" role="status" aria-live="polite">
      <span className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-blue-500 animate-spin" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

function MainAppContent() {
  const { currentUser, authChecked } = useGym();
  const [activeTab, setTabInterno] = useState(
    () => (currentUser ? getRole(currentUser.role).defaultTab : "dashboard"),
  );
  const tabActual = useRef(activeTab);
  const tabInicio = useRef(activeTab);

  // Navegación entre apartados con historial del navegador:
  // el botón "atrás" vuelve al apartado anterior y nunca saca del sistema.
  const setActiveTab = useCallback((tab) => {
    if (!tab || tab === tabActual.current) return;
    tabActual.current = tab;
    marcarNavegacion(false);
    window.history.pushState({ radical: tab }, "");
    setTabInterno(tab);
    window.scrollTo({ top: 0 });
  }, []);

  // Cualquier pantalla puede pedir ir a otro apartado (ej. abrir la ficha de un alumno)
  useEffect(() => {
    const ir = (e) => e.detail && setActiveTab(e.detail);
    window.addEventListener("radical:ir-modulo", ir);
    return () => window.removeEventListener("radical:ir-modulo", ir);
  }, [setActiveTab]);

  useEffect(() => {
    const alVolver = (e) => {
      const st = e.state;
      // Si hay una ventana abierta, «atrás» solo la cierra y te deja donde estabas
      if (hayVentanaAbierta() && cerrarVentanaSuperior()) {
        // Perfil abierto desde otro apartado (ej. Ver perfil en Fisioterapia):
        // un solo «atrás» lo cierra y regresa a donde estabas
        let desdeOtro = false;
        try {
          desdeOtro = sessionStorage.getItem("radical_perfil_desde") === "1";
          sessionStorage.removeItem("radical_perfil_desde");
        } catch {
          /* nada */
        }
        if (!desdeOtro) {
          window.history.pushState({ radical: tabActual.current }, "");
          return;
        }
      }
      else {
        try {
          sessionStorage.removeItem("radical_perfil_desde");
        } catch {
          /* nada */
        }
      }
      if (!st || st.raiz) {
        // Llegó al inicio del historial: se queda en el apartado principal
        window.history.pushState({ radical: tabInicio.current }, "");
        tabActual.current = tabInicio.current;
        setTabInterno(tabInicio.current);
        return;
      }
      if (st.radical) {
        marcarNavegacion(true);
        tabActual.current = st.radical;
        setTabInterno(st.radical);
      }
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);
  const [cambiarClave, setCambiarClave] = useState(false);
  const [avisoClaveOculto, setAvisoClaveOculto] = useState(false);
  const [avisos, setAvisos] = useState([]);

  // Avisos del sistema (por ejemplo, si algo no se pudo guardar en la base)
  useEffect(() => {
    const escuchar = (e) => {
      const id = Date.now() + Math.random();
      setAvisos((prev) => [...prev.slice(-2), { id, ...e.detail }]);
      setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), 7000);
    };
    const abrirClave = () => setCambiarClave(true);
    window.addEventListener("radicalgym:aviso", escuchar);
    window.addEventListener("radicalgym:cambiar-clave", abrirClave);
    return () => {
      window.removeEventListener("radicalgym:aviso", escuchar);
      window.removeEventListener("radicalgym:cambiar-clave", abrirClave);
    };
  }, []);

  const roleKey = currentUser?.role;

  // Al iniciar sesión (o cambiar de usuario) se abre el módulo principal del rol
  useEffect(() => {
    if (!roleKey) return;
    // Si la base aún no le da acceso al módulo principal, abre el primero permitido
    const base = getRole(roleKey).defaultTab;
    const inicio = userCanAccess(currentUser, base)
      ? base
      : getAllowedTabs(roleKey).find((t) => userCanAccess(currentUser, t)) || base;
    // Ventana abierta para un módulo (?modulo=cash): empieza ahí
    const pedido = moduloDeLaDireccion();
    const arranque = pedido && userCanAccess(currentUser, pedido) ? pedido : inicio;
    tabInicio.current = arranque;
    tabActual.current = arranque;
    window.history.replaceState({ radical: arranque, raiz: true }, "");
    window.history.pushState({ radical: arranque }, "");
    setTabInterno(arranque);
    precargarModulos();
  }, [currentUser?.id]);

  // Verificando la sesión guardada con la API
  if (!authChecked) {
    return (
      <div className="min-h-screen rd-fondo flex flex-col items-center justify-center gap-3 text-slate-500 text-sm font-semibold">
        <img src="/logo-daxsay.svg" alt="DAXSAY Fit Suite" className="rd-logo w-16 h-16 animate-pulse" />
        <span className="rd-marca text-lg">DAXSAY<span className="rd-marca-fs"> Fit Suite</span></span>
        <span className="text-xs">Cargando...</span>
      </div>
    );
  }

  // Sin sesión: pantalla de login
  if (!currentUser) {
    return <LoginScreen />;
  }

  const role = getRole(roleKey);
  const isStudent = roleKey === "student";

  // El alumno con clave temporal debe crear su contraseña antes de entrar
  if (isStudent && currentUser.mustChangePassword) {
    return <ChangePasswordScreen obligatorio />;
  }
  const allowed = userCanAccess(currentUser, activeTab);

  // Mapa de pestañas del alumno a secciones del portal
  const SECCIONES_ALUMNO = {
    mi_membresia: "membership",
    mis_citas: "appointments",
    mis_medidas: "measurements",
    mi_rutina: "routine",
    mi_dieta: "nutrition",
    mi_fisioterapia: "physio",
    mis_asistencias: "attendance",
    mis_clases: "clases",
  };
  const studentSection = SECCIONES_ALUMNO[activeTab] || "membership";

  const renderModule = () => {
    if (!allowed) {
      return (
        <AccessDeniedNotice
          roleTitle={role.label}
          onGoBack={() => setActiveTab(role.defaultTab)}
        />
      );
    }

    if (isStudent) {
      return (
        <StudentPortalModule
          currentSection={studentSection}
          onSectionChange={(sec) => {
            const tabMap = Object.fromEntries(
              Object.entries(SECCIONES_ALUMNO).map(([tab, seccion]) => [seccion, tab]),
            );
            setActiveTab(tabMap[sec] || "mi_membresia");
          }}
        />
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardOverview
            setActiveTab={setActiveTab}
            onOpenNewMemberModal={() => setIsNewMemberModalOpen(true)}
            onOpenQuickSaleModal={() => setActiveTab("store")}
            onOpenNewExpenseModal={() => setActiveTab("finance")}
          />
        );
      case "members":
        return (
          <MembersManagement
            onOpenNewMemberModal={() => setIsNewMemberModalOpen(true)}
          />
        );
      case "staff":
        return <StaffContractsModule />;
      case "memberships":
        return <MembershipsPlans />;
      case "nutrition":
        return <NutritionMeasurementsModule />;
      case "physiotherapy":
        return <PhysiotherapyModule />;
      case "appointments":
        return <AppointmentsScheduleModule />;
      case "attendances":
        return <AttendanceModule />;
      case "store":
        return <StorePOS onAbrirCaja={() => setActiveTab("cash")} />;
      case "cash":
        return <CashShiftsModule />;
      case "users":
        return <UsersAccessModule />;
      case "reports":
        return <ReportsModule />;
      case "goals":
        return <GoalsModule />;
      case "finance":
        return (
          <FinanceModule
            onOpenNewExpenseModal={() => setIsNewExpenseModalOpen(true)}
          />
        );
      case "alerts":
        return <NotificationCenter />;
      case "crm":
        return <CrmModule />;
      case "tasks":
        return <TareasModule />;
      case "classes":
        return <ClasesModule />;
      case "routines":
        return <RoutinesAndExercises />;
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen rd-fondo text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col selection:bg-blue-600 selection:text-white"
    >
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewMemberModal={() => setIsNewMemberModalOpen(true)}
        onOpenQuickSaleModal={() => setActiveTab("store")}
        onOpenNewExpenseModal={() => setActiveTab("finance")}
      />

      <div className="flex-1 flex flex-col md:flex-row w-full mx-auto">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
          {currentUser.mustChangePassword && !avisoClaveOculto && (
            <div className="rd-aviso-clave mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900">
              <span><IconoEmoji e="🔒" /> Usas la contraseña inicial: cámbiala por una propia.</span>
              <span className="flex gap-2">
                <button
                  onClick={() => setCambiarClave(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold cursor-pointer"
                >
                  Cambiar ahora
                </button>
                <button
                  onClick={() => setAvisoClaveOculto(true)}
                  className="px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
                >
                  Más tarde
                </button>
              </span>
            </div>
          )}
          <ErrorModulo key={activeTab}><Suspense fallback={<CargandoModulo />}>{renderModule()}</Suspense></ErrorModulo>
        </main>
      </div>

      {/* Los avisos del CRM pasan por la cinta de la barra superior (sin tarjetas en la esquina) */}
      <AvisoIngreso />
      <CorregirIngreso />
      <GuardiaCambios />
      {userCanAccess(currentUser, "store") && currentUser.role !== "student" && <AvisoStockBajo onAbrir={() => setActiveTab("store")} />}
      {currentUser.role !== "student" && (
        <TareasDeHoy usuarioId={currentUser.id} nombre={currentUser.fullName} onAbrir={() => setActiveTab("tasks")} />
      )}

      {isNewMemberModalOpen && (
        <Suspense fallback={null}>
          <NewMemberModal isOpen={isNewMemberModalOpen} onClose={() => setIsNewMemberModalOpen(false)} />
        </Suspense>
      )}

      {cambiarClave && <ChangePasswordScreen onClose={() => setCambiarClave(false)} />}

      <div className="fixed bottom-4 right-4 z-[70] space-y-2 max-w-sm">
        {avisos.map((a) => (
          <div
            key={a.id}
            className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
              a.tipo === "error" ? "bg-rose-600 text-white" : "bg-slate-900 text-white"
            }`}
          >
            {a.mensaje}
          </div>
        ))}
      </div>
    </div>
  );
}

// Access Denied Component for Restricted Roles
function AccessDeniedNotice({ roleTitle, onGoBack }) {
  return (
    <div className="bg-white rounded-2xl border border-red-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <div>
        <span className="text-xs font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
          Módulo Restringido
        </span>
        <h2 className="text-lg font-black text-slate-900 mt-2">
          Acceso no permitido para {roleTitle}
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Tu usuario no tiene permiso para este módulo. Si lo necesitas,
          solicita el acceso a administración.
        </p>
      </div>
      <button
        type="button"
        onClick={onGoBack}
        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1.5 shadow-sm"
      >
        <span>Volver a tu módulo principal</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <GymProvider>
      <MainAppContent />
    </GymProvider>
  );
}
