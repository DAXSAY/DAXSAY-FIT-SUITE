import React, { useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, FileText } from "lucide-react";
import { useMenuPlegado } from "../../utils/menu";
import { DocumentoContrato } from "../staff/DocumentoContrato";
import { useGym } from "../../context/GymContext";
import { MODULES, ROLE_COLORS, getRole, userCanAccess } from "../../config/roles";
import { FirmaDaxsay } from "./Marca";

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const {
    renewalAlerts,
    lowStockProducts,
    currentUser,
    appointments,
    staffContracts,
    members,
    logout,
    misContratos = [],
  } = useGym();
  const [verContrato, setVerContrato] = useState(false);
  const [plegado] = useMenuPlegado();
  const miContrato = misContratos.find((c) => c.status === "active") || misContratos[0];

  const role = getRole(currentUser.role);
  const colors = ROLE_COLORS[role.color];
  const isStudent = currentUser.role === "student";
  const isAdmin = currentUser.role === "admin";

  const scheduledCount = appointments.filter((a) => a.status === "scheduled").length;
  const expiringContractsCount = staffContracts.filter(
    (c) => c.status === "expiring_soon",
  ).length;

  // Contadores (badges) que se muestran junto a algunos módulos
  const badges = {
    staff: expiringContractsCount,
    store: lowStockProducts.length,
    alerts: renewalAlerts.length,
    appointments: scheduledCount,
    mis_citas: scheduledCount,
  };

  const currentMember = isStudent
    ? members.find((m) => m.id === currentUser.memberId)
    : null;

  const renderNavButton = (tabId) => {
    const item = MODULES[tabId];
    if (!item) return null;
    const Icon = item.icon;
    const isActive = activeTab === tabId;
    const badge = badges[tabId];

    return (
      <button
        key={tabId}
        onClick={() => setActiveTab(tabId)}
        title={plegado ? item.label : undefined}
        className={`relative w-full flex items-center ${plegado ? "lg:justify-center lg:px-0" : ""} justify-between gap-2 px-2.5 py-2 rounded-lg text-xs lg:text-sm transition-all text-left cursor-pointer ${
          isActive
            ? "bg-gradient-to-r from-blue-500/25 to-blue-500/5 text-white font-semibold ring-1 ring-blue-400/40 shadow-[0_0_18px_-6px_rgba(38,194,205,0.7)]"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-blue-400" />}
          <Icon
            className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-300" : "text-slate-400"}`}
          />
          <span className={`truncate text-xs ${plegado ? "lg:hidden" : ""}`}>{item.label}</span>
        </div>
        {badge > 0 && (
          <span
            className={`px-1.5 text-[10px] leading-4 font-extrabold rounded-full bg-amber-500 text-slate-950 ${
              plegado ? "lg:absolute lg:top-0.5 lg:right-0.5 lg:px-1 lg:text-[9px]" : ""
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      style={{ "--rd-rol": colors.hex }}
      className={`w-full ${plegado ? "lg:w-[60px]" : "lg:w-[212px]"} transition-[width] duration-200 rd-menu rd-menu-fijo bg-gradient-to-b from-marino-900 via-marino-950 to-[#050e1a] text-white border-r border-white/5 flex flex-col shrink-0 shadow-xl select-none relative overflow-hidden`}
    >
      <div className="pointer-events-none absolute -top-20 -left-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl" />
      <div className={`relative flex-1 min-h-0 lg:overflow-y-auto ${plegado ? "p-3 lg:px-2 lg:py-3" : "p-3 lg:p-4"} space-y-4`}>

        {/* Grupos de menú según el rol */}
        {role.groups
          .map((g) => ({ ...g, tabs: g.tabs.filter((t) => userCanAccess(currentUser, t)) }))
          .filter((g) => g.tabs.length > 0)
          .map((group, gi) => (
          <div key={group.title} className={gi > 0 ? "pt-3 border-t border-white/10" : ""}>
            <div
              className={`rd-menu-titulo text-xs font-bold uppercase tracking-wider px-2 pb-1.5 ${colors.title} ${plegado ? "lg:hidden" : ""}`}
            >
              {group.title}
            </div>
            <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
              {group.tabs.map(renderNavButton)}
            </nav>
          </div>
        ))}

        {/* Resumen de membresía (solo alumnos) */}
        {isStudent && currentMember && !plegado && (
          <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Tu membresía actual
            </span>
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-bold text-white truncate">
                {currentMember.planName}
              </span>
              <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded shrink-0">
                {currentMember.status === "frozen"
                  ? "CONGELADO"
                  : currentMember.status === "active"
                  ? "ACTIVO"
                  : currentMember.status === "expired"
                    ? "VENCIDO"
                    : "POR VENCER"}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Vence: {String(currentMember.membershipEndDate || "").slice(0, 10).split("-").reverse().join("/")}
            </p>
          </div>
        )}
      </div>

      {/* Pie fijo: quién usa el sistema, su cargo y cerrar sesión */}
      <div className={`relative shrink-0 border-t border-white/10 ${plegado ? "p-1.5" : "px-2.5 py-2"}`}>
        <div className={`rd-menu-usuario rounded-lg ${plegado ? "p-1" : "px-2 py-1.5"}`} style={{ borderLeft: `3px solid ${colors.hex}` }}>
          <div className={`flex items-center gap-2 ${plegado ? "lg:justify-center" : ""}`}>
            <div
              title={`${currentUser.fullName} · ${role.label}`}
              className="rd-chip-rol w-7 h-7 rounded-full overflow-hidden font-black text-xs flex items-center justify-center shrink-0"
              style={{ "--c": colors.hex }}
            >
              {currentUser.photoUrl ? <img src={currentUser.photoUrl} alt={currentUser.fullName} className="w-full h-full object-cover" /> : currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            <div className={`min-w-0 flex-1 ${plegado ? "lg:hidden" : ""}`}>
              <div className="text-white text-[11px] font-bold truncate leading-tight">{currentUser.fullName}</div>
              <span className="rd-chip-rol inline-block mt-0.5 px-1.5 rounded-full text-[9px] font-black uppercase tracking-wide leading-[14px]" style={{ "--c": colors.hex }}>
                {role.label}
              </span>
            </div>
          </div>
          {miContrato && (
            <button
              onClick={() => setVerContrato(true)}
              title="Mi contrato"
              className="mt-1.5 w-full h-7 flex items-center justify-center gap-1 px-2 text-[11px] font-bold text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 rounded-lg cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> <span className={plegado ? "lg:hidden" : ""}>Mi contrato</span>
            </button>
          )}
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="rd-boton-salir mt-1.5 w-full h-7 flex items-center justify-center gap-1.5 px-2 text-[11px] font-bold rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> <span className={plegado ? "lg:hidden" : ""}>Cerrar sesión</span>
          </button>
          {verContrato && miContrato && createPortal(<DocumentoContrato contrato={miContrato} onCerrar={() => setVerContrato(false)} />, document.body)}
        </div>
        <div className={`text-center pt-1.5 scale-90 origin-top ${plegado ? "lg:hidden" : ""}`}>
          <FirmaDaxsay claro apilada />
        </div>
      </div>
    </aside>
  );
};
