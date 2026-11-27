// ============================================================
// ROLES Y PERMISOS DE RADICAL
// Aquí se define qué módulos ve cada rol y en qué orden.
// Para dar o quitar acceso a un módulo, edita solo este archivo.
// ============================================================
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BadgeDollarSign,
  Briefcase,
  Store,
  BellRing,
  Utensils,
  HeartPulse,
  Calendar,
  UserCheck,
  Dumbbell,
  Activity,
  Vault,
  ShieldCheck,
  FileBarChart,
  Trophy,
  CalendarCheck,
  Contact,
  ClipboardList,
  Music,
} from "lucide-react";

// Catálogo de módulos (pestañas) del sistema
export const MODULES = {
  dashboard: { label: "Inicio", code: "DB", icon: LayoutDashboard },
  members: { label: "Alumnos", code: "AL", icon: Users },
  staff: { label: "Contratos", code: "CP", icon: Briefcase },
  memberships: { label: "Planes y tarifas", code: "MB", icon: CreditCard },
  nutrition: { label: "Nutrición y medidas", code: "NM", icon: Utensils },
  physiotherapy: { label: "Fisioterapia", code: "FT", icon: HeartPulse },
  routines: { label: "Rutinas", code: "RT", icon: Dumbbell },
  appointments: { label: "Horarios y citas", code: "HC", icon: Calendar },
  attendances: { label: "Asistencias", code: "AS", icon: UserCheck },
  store: { label: "Ventas", code: "SL", icon: Store },
  cash: { label: "Arqueo de caja", code: "CJ", icon: Vault },
  users: { label: "Usuarios", code: "US", icon: ShieldCheck },
  reports: { label: "Reportes", code: "RP", icon: FileBarChart },
  goals: { label: "Metas y logros", code: "MT", icon: Trophy },
  finance: { label: "Finanzas", code: "FN", icon: BadgeDollarSign },
  alerts: { label: "Notificaciones", code: "NT", icon: BellRing },
  crm: { label: "Interesados (CRM)", code: "CR", icon: Contact },
  tasks: { label: "Tareas entre turnos", code: "TA", icon: ClipboardList },
  classes: { label: "Clases grupales", code: "CG", icon: Music },
  // Portal del alumno
  mi_membresia: { label: "Mi membresía", code: "MB", icon: CreditCard },
  mis_citas: { label: "Avisos y citas", code: "CT", icon: Calendar },
  mis_asistencias: { label: "Mis asistencias", code: "AS", icon: CalendarCheck },
  mis_medidas: { label: "Mis medidas", code: "MD", icon: Activity },
  mi_rutina: { label: "Mi rutina", code: "RT", icon: Dumbbell },
  mi_dieta: { label: "Mi alimentación", code: "DT", icon: Utensils },
  mi_fisioterapia: { label: "Mi fisioterapia", code: "FS", icon: HeartPulse },
  mis_clases: { label: "Clases grupales", code: "CG", icon: Music },
};

// Definición de cada rol: etiqueta, color y grupos de menú
export const ROLES = {
  admin: {
    label: "Administrador",
    short: "Admin",
    color: "purple",
    defaultTab: "dashboard",
    groups: [
      { title: "Gestión & Clientes", tabs: ["dashboard", "reports", "members", "crm", "memberships", "goals"] },
      { title: "Salud & Entrenamiento", tabs: ["routines", "classes", "nutrition", "physiotherapy", "appointments"] },
      { title: "Operativo & Caja", tabs: ["tasks", "cash", "store", "attendances", "finance", "alerts"] },
      { title: "Personal & Accesos", tabs: ["staff", "users"] },
    ],
  },
  trainer: {
    label: "Entrenador",
    short: "Coach",
    color: "orange",
    defaultTab: "routines",
    groups: [
      { title: "Entrenamiento", tabs: ["routines", "classes", "tasks", "appointments", "goals"] },
      { title: "Alumnos & Asistencia", tabs: ["members", "attendances"] },
    ],
  },
  physio: {
    label: "Fisioterapia",
    short: "Fisio",
    color: "azul",
    defaultTab: "physiotherapy",
    groups: [
      { title: "Gabinete de Fisioterapia", tabs: ["physiotherapy", "tasks", "appointments"] },
      { title: "Alumnos", tabs: ["members", "goals"] },
    ],
  },
  nutritionist: {
    label: "Nutrición",
    short: "Nutri",
    color: "rojo",
    defaultTab: "nutrition",
    groups: [
      { title: "Consultorio de Nutrición", tabs: ["nutrition", "tasks", "appointments"] },
      { title: "Alumnos", tabs: ["members", "goals"] },
    ],
  },
  reception: {
    label: "Recepción",
    short: "Recepción",
    color: "green",
    defaultTab: "cash",
    groups: [
      { title: "Clientes", tabs: ["members", "crm", "memberships", "goals"] },
      { title: "Operativo & Caja", tabs: ["tasks", "cash", "store", "attendances"] },
      { title: "Servicios & Avisos", tabs: ["classes", "appointments", "alerts"] },
    ],
  },
  instructor: {
    label: "Profesor de clases",
    short: "Profe",
    color: "orange",
    defaultTab: "classes",
    groups: [{ title: "Clases grupales", tabs: ["classes", "tasks"] }],
  },
  student: {
    label: "Alumno / Socio",
    short: "Alumno",
    color: "teal",
    defaultTab: "mi_membresia",
    groups: [
      { title: "Mi Membresía", tabs: ["mi_membresia", "mis_asistencias", "mis_citas", "mis_clases"] },
      { title: "Entrenamiento & Salud", tabs: ["mi_rutina", "mi_dieta", "mis_medidas", "mi_fisioterapia"] },
    ],
  },
};

// Clases de Tailwind por color (escritas completas para que Tailwind las detecte)
export const ROLE_COLORS = {
  // hex = variable CSS: pastel en modo claro y neón medio en modo oscuro (ver index.css · colores de rol)
  purple: { hex: "var(--rd-rol-morado)", dot: "bg-purple-400", badge: "bg-purple-100 text-purple-700", title: "text-purple-400" },
  green: { hex: "var(--rd-rol-verde)", dot: "bg-green-400", badge: "bg-green-100 text-green-700", title: "text-green-400" },
  orange: { hex: "var(--rd-rol-naranja)", dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700", title: "text-orange-400" },
  azul: { hex: "var(--rd-rol-azul)", dot: "bg-indigo-400", badge: "bg-indigo-100 text-indigo-700", title: "text-indigo-400" },
  rojo: { hex: "var(--rd-rol-rojo)", dot: "bg-rose-400", badge: "bg-rose-100 text-rose-700", title: "text-rose-400" },
  teal: { hex: "var(--rd-rol-turquesa)", dot: "bg-teal-400", badge: "bg-teal-100 text-teal-700", title: "text-teal-400" },
  // Colores anteriores (por si algún dato antiguo los usa)
  sky: { hex: "var(--rd-rol-azul)", dot: "bg-indigo-400", badge: "bg-indigo-100 text-indigo-700", title: "text-indigo-400" },
  lime: { hex: "var(--rd-rol-rojo)", dot: "bg-rose-400", badge: "bg-rose-100 text-rose-700", title: "text-rose-400" },
  blue: { hex: "var(--rd-rol-turquesa)", dot: "bg-blue-400", badge: "bg-blue-100 text-blue-700", title: "text-blue-400" },
  cyan: { hex: "var(--rd-rol-turquesa)", dot: "bg-cyan-400", badge: "bg-cyan-100 text-cyan-700", title: "text-cyan-400" },
  emerald: { hex: "var(--rd-rol-verde)", dot: "bg-emerald-400", badge: "bg-emerald-100 text-emerald-700", title: "text-emerald-400" },
  amber: { hex: "var(--rd-rol-naranja)", dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700", title: "text-amber-400" },
};

export const getRole = (role) => ROLES[role] || ROLES.student;

export const getAllowedTabs = (role) =>
  getRole(role).groups.flatMap((g) => g.tabs);

export const canAccess = (role, tab) => getAllowedTabs(role).includes(tab);

// Permiso real del usuario conectado: el menú de su rol, filtrado por los
// módulos que la base de datos le permite ver (rol_permisos / usuario_permisos)
// «Tareas entre turnos» la usa todo el personal (aunque la base aún no tenga el módulo)
export const userCanAccess = (user, tab) =>
  !!user && canAccess(user.role, tab) && (tab === "tasks" ? user.role !== "student" : !Array.isArray(user.modules) || user.modules.includes(tab));

// Permiso de acción: ver | crear | editar | eliminar
export const userCan = (user, tab, accion = "ver") =>
  userCanAccess(user, tab) && (!user.permissions || !!user.permissions[tab]?.[accion]);
