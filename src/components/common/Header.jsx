import { BotonSolicitarPermiso } from "../attendances/SolicitarPermiso";
import { SeccionProgramados, usePendientes } from "./Programados";
import React, { useEffect, useState } from "react";
import {
  CreditCard,
  ShoppingBag,
  Bell,
  Plus,
  Search,
  Download,
  Activity,
  Vault,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { useGym } from "../../context/GymContext";
import { ROLE_COLORS, getRole, userCan, userCanAccess } from "../../config/roles";
import { buscarAlumno } from "../../utils/codigo";
import { esCodigoPase, validarPaseLibre } from "../../utils/pase";
import { esCodigoPersonal, buscarPersonal, ingresoDeHoy, NOMBRE_SUFIJO } from "../../utils/codigoPersonal";
import { mostrarIngreso, avisoAlumno } from "../attendances/AvisoIngreso";
import { abrirCorreccion } from "../attendances/CorregirIngreso";
import { hoyISO } from "../../utils/fecha";
import { useAlertasAdmin, AlertaFechaPago } from "../alerts/AlertasAdmin";
import { LogoRadical, NombreRadical, BotonTema, BotonTamano } from "./Marca";
import { CampanaAvisos, SeccionAvisos, useAvisos } from "./Avisos";
import { CrmCampana } from "../crm/CrmAvisos";
import { PanelLateral, CabeceraPanel, fechaHoyTexto } from "./PanelLateral";
import { CintaAvisos } from "./CintaAvisos";
import { PistaMarcar, TEXTO_MARCAR } from "./PistaMarcar";
import { useMenuMovil, esPantallaAngosta } from "../../utils/menu";
import { candidatosPorCodigo } from "../../utils/buscarPersona";
import { ListaCandidatos } from "./ListaCandidatos";
import { useMenuPlegado } from "../../utils/menu";
import { Menu as IconoMenu } from "lucide-react";
import { TrendingUp as IconoIngreso, TrendingDown as IconoGasto } from "lucide-react";

const fc = (f) => (f ? String(f).slice(0, 10).split("-").reverse().join("/") : "");

export const Header = ({
  activeTab,
  setActiveTab,
  onOpenNewMemberModal,
  onOpenQuickSaleModal,
  onOpenNewExpenseModal,
}) => {
  const {
    renewalAlerts,
    lowStockProducts,
    members,
    exportDataJSON,
    resetToDefaults,
    currentUser,
    logout,
    recordAttendance,
    cashShift,
    attendances = [],
    staffContracts = [],
    todoElPersonal,
    permisos = [],
  } = useGym();
  const role = getRole(currentUser.role);
  const [menuPlegado, alternarMenu] = useMenuPlegado();
  const [, setMenuMovil] = useMenuMovil();
  // Alto de la barra superior: el menú lateral se fija justo debajo
  useEffect(() => {
    const h = document.querySelector(".rd-cabecera-app");
    if (!h) return;
    const medir = () => document.documentElement.style.setProperty("--rd-alto-cabecera", `${h.offsetHeight}px`);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(h);
    return () => ro.disconnect();
  }, []);
  const roleColors = ROLE_COLORS[role.color];
  const isStudent = currentUser.role === "student";
  const can = (tab) => userCanAccess(currentUser, tab);
  const canRegisterMembers = userCan(currentUser, "members", "crear");
  const [showNotifications, setShowNotifications] = useState(false);
  // La cinta de avisos abre este panel
  React.useEffect(() => {
    const abrir = () => setShowNotifications(true);
    window.addEventListener("radical:alertas-panel", abrir);
    return () => window.removeEventListener("radical:alertas-panel", abrir);
  }, []);
  // Accesos rápidos de caja: van a Finanzas y abren el formulario
  const abrirCaja = (que) => {
    try {
      sessionStorage.setItem("radical_abrir_caja", que);
    } catch {
      /* nada */
    }
    setActiveTab("finance");
    setTimeout(() => window.dispatchEvent(new CustomEvent("radical:abrir-caja", { detail: que })), 60);
  };
  const [searchCheckIn, setSearchCheckIn] = useState("");
  const [checkInResult, setCheckInResult] = useState(null);

  const esAdmin = currentUser.role === "admin";
  const alertasAdmin = useAlertasAdmin(esAdmin, 10);
  const nuevasAdmin = alertasAdmin.alertas.filter((a) => !a.seen);
  const avisosRol = useAvisos();
  const pendientesProg = usePendientes({ todos: true });
  const permisosPend = esAdmin ? (permisos || []).filter((p) => p.estado === "pendiente") : [];
  const totalUrgentAlerts =
    renewalAlerts.length + lowStockProducts.length + (esAdmin ? alertasAdmin.pendientes : 0) + avisosRol.avisos.length + pendientesProg.length + permisosPend.length;

  // Quién coincide con lo escrito (código exacto: "2" = alumno 2, 2-COACH, 2-EXT…)
  const candidatosCheckIn = React.useMemo(
    () => (esCodigoPase(searchCheckIn.trim()) ? [] : candidatosPorCodigo(searchCheckIn, members, todoElPersonal || staffContracts)),
    [searchCheckIn, members, todoElPersonal, staffContracts],
  );
  const [elegidoIdx, setElegidoIdx] = useState(0);
  const [verLista, setVerLista] = useState(false);

  const handleQuickCheckIn = async (e, elegidoForzado) => {
    e?.preventDefault?.();
    const texto = searchCheckIn.trim();
    if (!texto) return;
    // Varias personas con el mismo código: se elige de la lista
    let elegido = elegidoForzado || null;
    if (!elegido && !esCodigoPase(texto)) {
      if (candidatosCheckIn.length > 1) {
        elegido = verLista ? candidatosCheckIn[elegidoIdx] : null;
        if (!elegido) {
          setVerLista(true);
          return;
        }
      } else if (candidatosCheckIn.length === 1) elegido = candidatosCheckIn[0];
    }
    setSearchCheckIn("");
    setVerLista(false);
    setElegidoIdx(0);
    const hoy = hoyISO();
    const primer = (n) => String(n || "").trim().split(/\s+/)[0];

    // 1) Pase libre del CRM (lo escribe el lector de QR)
    if (esCodigoPase(texto)) {
      const r = await validarPaseLibre(texto);
      if (r.ok) {
        mostrarIngreso({
          tipo: "pase",
          codigo: texto.toUpperCase(),
          titulo: `¡Bienvenido(a) a tu clase de prueba, ${primer(r.prospecto?.fullName)}!`,
          detalle: `Pase libre válido por hoy${r.prospecto?.planName ? ` · le interesa ${r.prospecto.planName}` : ""}. ¡Disfruta tu entrenamiento!`,
        });
      } else if (/ya se us/i.test(r.mensaje)) {
        mostrarIngreso({ tipo: "repetido", codigo: texto.toUpperCase(), titulo: "Este pase libre ya fue usado", detalle: r.mensaje.replace(/^Pase libre no válido: /, "") });
      } else {
        mostrarIngreso({ tipo: "error", codigo: texto.toUpperCase(), titulo: "Pase libre no válido", detalle: r.mensaje.replace(/^Pase libre no válido: /, "") });
      }
      return;
    }

    // 2) Personal de trabajo: código 1-COACH, 1-NUTRI… (o su DNI si no es de un alumno)
    const hallado = elegido ? (elegido.tipo === "alumno" ? { member: elegido.member } : null) : buscarAlumno(members, texto);
    const personal = elegido
      ? elegido.tipo === "personal"
        ? elegido.contrato
        : null
      : esCodigoPersonal(texto) || (/^\d{8}$/.test(texto) && !hallado)
        ? buscarPersonal(todoElPersonal || staffContracts, texto)
        : null;
    if (personal) {
      const previo = ingresoDeHoy(attendances, personal.staffId, hoy);
      if (previo) {
        mostrarIngreso({ tipo: "repetido", codigo: personal.staffCode, titulo: `${primer(personal.fullName)} ya marcó su entrada hoy`, detalle: `Registrada a las ${previo.time}. No se volvió a registrar.` });
        return;
      }
      const r = recordAttendance({
        userId: personal.staffId,
        userName: personal.fullName,
        userRole: personal.role === "trainer" ? "trainer" : "staff",
        userDni: personal.dni,
        staffCode: personal.staffCode,
        type: "in",
        status: "puntual",
        category: "staff",
        contractId: personal.id,
        checkInMethod: "codigo_personal",
        notes: `Marcación de entrada (${personal.roleTitle})`,
      });
      mostrarIngreso({
        tipo: "personal",
        codigo: personal.staffCode,
        titulo: `¡Buen turno, ${primer(personal.fullName)}!`,
        detalle: `${personal.roleTitle || NOMBRE_SUFIJO[personal.staffCode?.split("-")[1]] || "Personal"} · entrada registrada a las ${r?.record?.time || ""}`,
        accion: r?.record ? { texto: "¿Error? Corregir", fn: () => abrirCorreccion(r.record) } : undefined,
      });
      return;
    }
    if (esCodigoPersonal(texto)) {
      mostrarIngreso({ tipo: "error", codigo: texto.toUpperCase(), titulo: "No hay personal con ese código", detalle: "Revisa el código en Contratos de Personal (ej. 1-COACH, 1-NUTRI)." });
      return;
    }

    // 3) Alumno: código (DR-12 o 12), DNI o nombre
    const m = hallado?.member;
    if (!m) {
      mostrarIngreso({ tipo: "error", titulo: "No se encontró a nadie", detalle: `Ningún alumno ni personal con «${texto}» (código, DNI o nombre).` });
      return;
    }
    const previo = ingresoDeHoy(attendances, m.id, hoy);
    if (previo) {
      mostrarIngreso(avisoAlumno(m, { repetido: previo }));
      return;
    }
    const visitasPrevias = attendances.filter((a) => String(a.userId) === String(m.id)).length;
    const reg = recordAttendance({
      userId: m.id,
      userName: m.fullName,
      userRole: "student",
      userDni: m.dni,
      type: "in",
      status: m.status === "expired" || m.status === "frozen" ? "warning" : "authorized",
      category: "student",
      checkInMethod: "quick_pass",
      membershipPlan: m.planName,
      notes: `Check-in rápido en barra superior (${m.status})`,
    });
    mostrarIngreso({ ...avisoAlumno(m, { visitasPrevias }), accion: reg?.record ? { texto: "¿Error? Corregir", fn: () => abrirCorreccion(reg.record) } : undefined });
  };

  return (
    <header className="rd-cabecera-app sticky top-0 z-30 rd-vidrio border-b border-slate-200/80 pl-4 lg:pl-6 pr-2 lg:pr-3 py-2 text-slate-800 shadow-[0_1px_0_rgba(16,181,167,0.15)] transition-all">
      <div className="w-full mx-auto flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-center justify-between gap-3 md:gap-y-2">
        {/* Brand logo */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (esPantallaAngosta() ? setMenuMovil((v) => !v) : alternarMenu())}
            title={menuPlegado ? "Mostrar el menú" : "Ocultar el menú (solo íconos)"}
            aria-label="Mostrar u ocultar el menú"
            className="flex md:hidden lg:flex w-9 h-9 items-center justify-center rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <IconoMenu className="w-5 h-5" />
          </button>
          <div
            onClick={() => setActiveTab(role.defaultTab)}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <span className="shrink-0 transition-transform group-hover:scale-105" title={`Conectado como ${role.label}`}>
              <LogoRadical size={38} />
            </span>
            <div className="leading-none">
              <NombreRadical className="text-lg" />
              <span className="block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mt-0.5">
                <span className="rd-texto-rol" style={{ "--c": roleColors?.hex }}>{role.label}</span>
              </span>
            </div>
          </div>
          </div>

          {/* Mobile alerts icon */}
          <div className="flex items-center gap-2 md:hidden">
            {can("crm") && <CrmCampana setActiveTab={setActiveTab} />}
            {!can("alerts") && <CampanaAvisos setActiveTab={setActiveTab} />}
            {can("alerts") && (
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              title="Alertas del gimnasio"
              className="relative p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow hover:brightness-110 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {totalUrgentAlerts > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-emerald-700 text-[10px] font-black flex items-center justify-center ring-2 ring-emerald-500">
                  {totalUrgentAlerts > 99 ? "99+" : totalUrgentAlerts}
                </span>
              )}
            </button>
            )}
          </div>
        </div>

        {/* Middle Section: Staff Check-in bar OR Student Quick Navigator */}
        {can("attendances") ? (
          <div className={`w-full relative ${!isStudent && (can("crm") || can("alerts")) ? "md:flex-1 md:min-w-[13rem] lg:flex-none lg:w-[24rem] xl:w-[28rem] 2xl:w-[32rem]" : "md:flex-1 md:max-w-[42rem]"}`}>
            <form onSubmit={handleQuickCheckIn} className="relative">
              <input
                type="text"
                aria-label={TEXTO_MARCAR}
                title={TEXTO_MARCAR}
                value={searchCheckIn}
                onChange={(e) => {
                  setSearchCheckIn(e.target.value);
                  setElegidoIdx(0);
                  setVerLista(true);
                }}
                onKeyDown={(e) => {
                  if (!candidatosCheckIn.length) return;
                  if (e.key === "ArrowDown") (e.preventDefault(), setVerLista(true), setElegidoIdx((i) => Math.min(i + 1, candidatosCheckIn.length - 1)));
                  if (e.key === "ArrowUp") (e.preventDefault(), setElegidoIdx((i) => Math.max(i - 1, 0)));
                  if (e.key === "Escape") setVerLista(false);
                }}
                onFocus={() => setVerLista(true)}
                onBlur={() => setTimeout(() => setVerLista(false), 150)}
                className="rd-campo-checkin w-full pl-9 pr-24 py-2 rounded-xl text-sm font-semibold focus:outline-none transition-all"
              />

              <PistaMarcar visible={!searchCheckIn} corta className="left-9 right-24 text-sm text-slate-400" />
              <UserCheck className="rd-icono-checkin w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="submit"
                className="rd-boton-marcar absolute right-1 top-1 bottom-1 px-3 text-white text-xs font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Marcar
              </button>
            </form>
            {/* A quién se va a marcar */}
            {searchCheckIn.trim() && verLista && (
              <ListaCandidatos
                candidatos={candidatosCheckIn}
                indice={elegidoIdx}
                onIndice={setElegidoIdx}
                onElegir={(c) => handleQuickCheckIn(null, c)}
                pase={esCodigoPase(searchCheckIn.trim())}
              />
            )}

          </div>
        ) : isStudent ? (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab("mis_medidas")}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mis Medidas</span>
            </button>
            <button
              onClick={() => setActiveTab("mi_membresia")}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-600" />
              <span>Mi Membresía</span>
            </button>
          </div>
        ) : (
          <div className="hidden md:block flex-1" />
        )}

        {/* Cinta de avisos (CRM y gimnasio) */}
        {!isStudent && (can("crm") || can("alerts")) && <CintaAvisos verCrm={can("crm")} verGym={can("alerts")} />}
        {/* Pantallas medianas o angostas: la cinta de avisos va en su propia fila */}
        {!isStudent && (can("crm") || can("alerts")) && <CintaAvisos fila verCrm={can("crm")} verGym={can("alerts")} />}

        {/* Accesos rápidos y avisos */}
        <div className="flex items-center gap-1.5 w-full md:w-auto justify-end shrink-0 md:ml-auto">
          {/* Estado de la caja por turnos */}
          {can("cash") && cashShift && (
            <button
              onClick={() => setActiveTab("cash")}
              className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                cashShift.open
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
              }`}
              title={cashShift.open ? `Caja abierta por ${cashShift.open.openedBy}` : "La caja está cerrada"}
            >
              <Vault className="w-3.5 h-3.5" />
              <span>
                {cashShift.open
                  ? `Caja: ${cashShift.open.openedBy.split(" ")[0]} · S/ ${Number(cashShift.open.expectedCash).toFixed(2)}`
                  : "Caja cerrada"}
              </span>
            </button>
          )}

          {/* Venta rápida (admin y recepción) */}
          {can("store") && (
            <button
              onClick={onOpenQuickSaleModal}
              className="flex items-center gap-1 px-2.5 py-1.5 whitespace-nowrap bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Venta rápida en tienda"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">Vender</span>
            </button>
          )}

          {/* Ingreso y gasto de caja (accesos rápidos) */}
          {can("finance") && (
            <>
              <button
                onClick={() => abrirCaja("ingreso")}
                className="flex items-center gap-1 px-2.5 py-1.5 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                title="Registrar ingreso de caja (pase del día, servicios, otros)"
              >
                <IconoIngreso className="w-3.5 h-3.5" />
                <span className="hidden 2xl:inline">Ingreso</span>
              </button>
              <button
                onClick={() => abrirCaja("gasto")}
                className="flex items-center gap-1 px-2.5 py-1.5 whitespace-nowrap bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                title="Registrar gasto de caja"
              >
                <IconoGasto className="w-3.5 h-3.5" />
                <span className="hidden 2xl:inline">Gasto</span>
              </button>
            </>
          )}

          {/* Nuevo alumno (admin y recepción) */}
          {canRegisterMembers && (
            <button
              onClick={onOpenNewMemberModal}
              className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg text-xs font-bold rd-brillo transition-all cursor-pointer"
              title="Matricular a un alumno nuevo"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xl:inline">Nuevo alumno</span>
            </button>
          )}


          {/* Avisos del CRM: icono propio, junto a la campanita */}
          {can("crm") && (
            <div className="hidden md:block">
              <CrmCampana setActiveTab={setActiveTab} />
            </div>
          )}

          {/* Avisos para quien no tiene el centro de alertas (entrenador, alumno...) */}
          {!can("alerts") && (
            <div className="hidden md:block">
              <CampanaAvisos setActiveTab={setActiveTab} />
            </div>
          )}

          {/* Notifications Center button */}
          {can("alerts") && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              data-campana-escritorio
              className="relative p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow hover:brightness-110 cursor-pointer"
              title="Alertas del gimnasio (vencimientos, deudas, stock)"
            >
              <Bell className="w-4 h-4" />
              {totalUrgentAlerts > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-emerald-700 text-[10px] font-black flex items-center justify-center ring-2 ring-emerald-500">
                  {totalUrgentAlerts > 99 ? "99+" : totalUrgentAlerts}
                </span>
              )}
            </button>

            {/* Panel de alertas: mismo tamaño y forma que el del CRM */}
            <PanelLateral abierto={showNotifications} onCerrar={() => setShowNotifications(false)}>
              <CabeceraPanel
                etiqueta="Alertas del gimnasio"
                fecha={fechaHoyTexto()}
                numero={totalUrgentAlerts}
                textoNumero={totalUrgentAlerts === 1 ? "aviso pendiente" : "avisos pendientes"}
                brillo="bg-amber-500/30"
                brillo2="bg-rose-600/25"
                colorEtiqueta="text-amber-300"
                onCerrar={() => setShowNotifications(false)}
                derecha={
                  <div className="text-right text-[11px] font-bold text-white/70 space-y-0.5">
                    <p>{renewalAlerts.filter((a) => a.isExpired).length} vencidos</p>
                    <p>{renewalAlerts.filter((a) => !a.isExpired).length} por vencer</p>
                    <p>{lowStockProducts.length} con poco stock</p>
                  </div>
                }
              />
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-slate-800">
                <SeccionAvisos {...avisosRol} setActiveTab={(tab) => { setActiveTab(tab); setShowNotifications(false); }} />
                <SeccionProgramados todos />
                {esAdmin && permisosPend.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Permisos por aprobar ({permisosPend.length})</p>
                    {permisosPend.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          try {
                            sessionStorage.setItem("radical_vista_asistencias", JSON.stringify("permisos"));
                          } catch {
                            /* nada */
                          }
                          setActiveTab("attendances");
                          setShowNotifications(false);
                        }}
                        className="w-full text-left rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 hover:bg-sky-100 cursor-pointer"
                      >
                        <span className="block text-sm font-bold text-slate-900 truncate">{p.nombre}</span>
                        <span className="block text-[11px] text-slate-600 truncate">
                          {p.desde}{p.hasta && p.hasta !== p.desde ? ` al ${p.hasta}` : ""} · {p.motivo}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {!esAdmin && <BotonSolicitarPermiso />}

                {esAdmin && nuevasAdmin.length > 0 && (
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                        Cambios de fecha de pago ({alertasAdmin.pendientes})
                      </p>
                      <button type="button" onClick={() => alertasAdmin.marcarVista("todas")} className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer">
                        Marcar vistas
                      </button>
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {nuevasAdmin.map((a) => (
                        <AlertaFechaPago key={a.id} alerta={a} onVista={alertasAdmin.marcarVista} compacta />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {renewalAlerts.length === 0 &&
                  lowStockProducts.length === 0 ? (avisosRol.avisos.length ? null : (
                    <p className="text-xs text-slate-500 text-center py-4">
                      ¡Todo al día! No hay vencimientos urgentes ni falta de
                      stock.
                    </p>
                  )) : (
                    <>
                      {[
                        ["Vencidos · renovar", renewalAlerts.filter((a) => a.isExpired), "rose"],
                        ["Por vencer", renewalAlerts.filter((a) => !a.isExpired), "amber"],
                      ].map(([titulo, lista, c]) =>
                        lista.length ? (
                          <div key={titulo} className="space-y-1.5">
                            <p className={`text-[10px] font-black uppercase tracking-wider px-1 ${c === "rose" ? "text-rose-600" : "text-amber-600"}`}>
                              {titulo} ({lista.length})
                            </p>
                            {lista
                              .slice()
                              .sort((a, b) => a.daysLeft - b.daysLeft)
                              .map((alert) => (
                                <button
                                  type="button"
                                  key={alert.memberId}
                                  onClick={() => {
                                    setActiveTab("alerts");
                                    setShowNotifications(false);
                                  }}
                                  className={`w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 border-l-4 ${
                                    c === "rose" ? "border-l-rose-500" : "border-l-amber-400"
                                  } shadow-sm hover:shadow-md hover:-translate-y-px transition-all cursor-pointer`}
                                >
                                  <span
                                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br ${
                                      c === "rose" ? "from-rose-500 to-pink-600" : "from-amber-400 to-orange-500"
                                    }`}
                                  >
                                    {alert.memberName.split(" ").slice(0, 2).map((x) => x[0]).join("")}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-black text-slate-900 truncate">{alert.memberName}</span>
                                    <span className="block text-[11px] text-slate-500 truncate">
                                      {alert.planName} · fin {String(alert.endDate || "").split("-").reverse().join("/")}
                                    </span>
                                  </span>
                                  <span
                                    className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-full ${
                                      c === "rose" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                                    }`}
                                  >
                                    {alert.daysLeft < 0 ? `hace ${Math.abs(alert.daysLeft)} d` : alert.daysLeft === 0 ? "hoy" : `en ${alert.daysLeft} d`}
                                  </span>
                                </button>
                              ))}
                          </div>
                        ) : null,
                      )}

                      {lowStockProducts.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            setActiveTab("store");
                            setShowNotifications(false);
                          }}
                          className="p-2.5 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 text-xs cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span>Bajo Stock: {prod.name}</span>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white border border-yellow-300 text-yellow-800">
                              Quedan: {prod.stock}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

              </div>
              <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveTab("alerts");
                    setShowNotifications(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-white text-sm font-black cursor-pointer shadow-lg shadow-amber-500/30"
                >
                  Ver todas las alertas →
                </button>
                <button onClick={exportDataJSON} className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer" title="Exportar copia de seguridad">
                  <Download className="w-3.5 h-3.5" /> Backup
                </button>
              </div>
            </PanelLateral>
          </div>
          )}

          {/* Tamaño de letra (pantallas grandes) y modo claro / oscuro */}
          <BotonTamano className="hidden sm:inline-flex" />
          <BotonTema vertical className="ml-1" />
        </div>
      </div>
    </header>
  );
};
