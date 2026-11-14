// Documento del contrato del personal (lo ve administración y el propio trabajador)
import React from "react";
import { X, FileText, Clock, Printer } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { leerReglas, textoReglas, textoHorario, horasSemana } from "../../utils/contratos";
import { BotonesDescarga } from "../common/BotonesDescarga";

export const DocumentoContrato = ({ contrato, onCerrar }) => {
  const { attendances = [], gymConfig = {} } = useGym();
  const reglas = leerReglas(gymConfig);
  return (

        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-6xl mx-auto min-h-full bg-white overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
                  Documento Oficial de Recursos Humanos
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Contrato Individual de Trabajo a Plazo Determinado
                </h3>
              </div>
              <button
                onClick={() => onCerrar()}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contract Body Document */}
            <div className="rd-claro bg-white p-5 sm:p-6 space-y-4 text-xs text-slate-800 max-h-[75vh] overflow-y-auto leading-relaxed">
              <div className="text-center pb-3 border-b border-slate-200">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  CONTRATO DE TRABAJO BAJO MODALIDAD DE SERVICIO (
                  {contrato.contractDurationLabel.toUpperCase()})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  GIMNASIO RADICAL GYM FITNESS CENTER S.A.C. • RUC: 20608945123
                </p>
              </div>

              <p>
                Conste por el presente documento el{" "}
                <strong>Contrato Individual de Trabajo</strong> que celebran, de
                una parte,
                <strong> RADICAL GYM FITNESS CENTER S.A.C.</strong>, en adelante{" "}
                <strong>LA EMPRESA</strong>, y de la otra parte
                <strong> Don/Doña {contrato.fullName}</strong>,
                con Documento Nacional de Identidad (DNI) N°{" "}
                <strong>{contrato.dni}</strong>, domiciliado para
                los efectos del presente contrato, en adelante{" "}
                <strong>EL TRABAJADOR</strong>, en los términos y condiciones
                siguientes:
              </p>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p>
                  <strong>CLÁUSULA PRIMERA (OBJETO Y CARGO):</strong> LA EMPRESA
                  contrata los servicios de EL TRABAJADOR para que desempeñe las
                  funciones inherentes al cargo de{" "}
                  <strong>{contrato.roleTitle}</strong> en el
                  Departamento de{" "}
                  <strong>{contrato.department}</strong>.
                </p>

                <p>
                  <strong>CLÁUSULA SEGUNDA (DURACIÓN DEL CONTRATO):</strong> El
                  presente contrato se celebra por un periodo pactado de
                  <strong>
                    {" "}
                    {contrato.contractDurationLabel}
                  </strong>
                  , iniciando sus labores con fecha
                  <strong> {contrato.startDate}</strong> y
                  concluyendo indefectiblemente el
                  <strong> {contrato.endDate}</strong>.
                </p>

                <p>
                  <strong>CLÁUSULA TERCERA (REMUNERACIÓN Y HORAS):</strong> LA
                  EMPRESA abonará a EL TRABAJADOR una remuneración mensual fija
                  de
                  <strong>
                    {" "}
                    S/. {Number(contrato.monthlySalary || 0).toFixed(2)} Soles
                  </strong>{" "}
                  (tarifa proporcional de S/.{" "}
                  {Number(contrato.hourlyRate || 0).toFixed(2)} por hora),
                  sujeta a las deducciones de ley. La jornada laboral pactada
                  comprende{" "}
                  <strong>
                    {contrato.assignedWeeklyHours} horas semanales
                  </strong>{" "}
                  (
                  {contrato.workModality === "full_time"
                    ? "Jornada Completa"
                    : "Jornada Parcial"}
                  ).
                </p>

                <p>
                  <strong>
                    CLÁUSULA CUARTA (HORAS TRABAJADAS REGISTRADAS):
                  </strong>{" "}
                  Las horas trabajadas son registradas mediante el reloj
                  marcador biométrico y de código del gimnasio. En el presente
                  periodo mensual se registran acumuladas{" "}
                  <strong>
                    {contrato.workedHoursThisMonth} horas
                    laboradas
                  </strong>
                  .
                </p>

                <p>
                  <strong>CLÁUSULA QUINTA (MODALIDAD DE PAGO):</strong> La
                  remuneración será abonada vía abono en cuenta bancaria
                  declarada:
                  <strong>
                    {" "}
                    {contrato.bankAccount ||
                      "Abono directo de nómina"}
                  </strong>
                  .
                </p>
              </div>

              {/* Funciones, horario y reglas de tardanza */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p>
                  <strong>CLÁUSULA SEXTA (FUNCIONES):</strong> EL TRABAJADOR se compromete a cumplir las siguientes funciones:
                </p>
                {contrato.functions?.length ? (
                  <ol className="list-decimal pl-6 space-y-0.5">
                    {contrato.functions.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-slate-500 italic">Las propias del cargo de {contrato.roleTitle}.</p>
                )}
                {contrato.schedule?.dias?.length > 0 && (
                  <p>
                    <strong>CLÁUSULA SÉTIMA (HORARIO):</strong> El horario de trabajo es {textoHorario(contrato.schedule)}, sumando{" "}
                    <strong>{horasSemana(contrato.schedule)} horas semanales</strong>.
                  </p>
                )}
                <p>
                  <strong>CLÁUSULA OCTAVA (PUNTUALIDAD):</strong> {textoReglas(reglas)}
                </p>
              </div>

              {contrato.history?.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide mb-2">Contratos anteriores (renovaciones)</h4>
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-1">Periodo</th>
                        <th className="py-1">Cargo</th>
                        <th className="py-1 text-right">Sueldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contrato.history
                        .slice()
                        .reverse()
                        .map((h, n) => (
                          <tr key={n}>
                            <td className="py-1">
                              {h.startDate} al {h.endDate} · {h.contractDurationLabel}
                            </td>
                            <td className="py-1">{h.roleTitle}</td>
                            <td className="py-1 text-right font-bold">S/ {Number(h.monthlySalary || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ANEXO: HISTORIAL DE ASISTENCIAS, HORAS Y ESTADOS (Puntual, Tarde, Falta, Permiso & Motivo) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      Anexo Laboral: Registro de Horas & Asistencias del
                      Colaborador
                    </span>
                  </h4>
                  <span className="text-xs text-slate-500 font-semibold">
                    Auditoría de Puntualidad y Faltas
                  </span>
                </div>

                {(() => {
                  const staffAtts = attendances.filter(
                    (a) =>
                      a.userDni === contrato.dni ||
                      a.userName === contrato.fullName ||
                      a.contractId === contrato.id,
                  );

                  if (staffAtts.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 italic py-2">
                        Sin incidencias registradas en el reloj marcador para
                        este periodo. Jornada regular de{" "}
                        {contrato.assignedWeeklyHours}h semanales.
                      </p>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200 rounded-lg bg-white">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-2.5">Fecha</th>
                            <th className="py-2 px-2.5">Hora Entrada</th>
                            <th className="py-2 px-2.5">Horas Laboradas</th>
                            <th className="py-2 px-2.5">Estado</th>
                            <th className="py-2 px-2.5">
                              Motivo de Incidencia
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {staffAtts.map((att) => {
                            const isPuntual =
                              att.status === "puntual" ||
                              att.status === "on_time" ||
                              att.status === "authorized";
                            const isTarde =
                              att.status === "tarde" || att.status === "late";
                            const isFalta = att.status === "falta";
                            const isPermiso = att.status === "permiso";

                            return (
                              <tr key={att.id} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 font-bold text-slate-900">
                                  {att.date}
                                </td>
                                <td className="py-2 px-2.5">{att.time}</td>
                                <td className="py-2 px-2.5 font-extrabold text-blue-700">
                                  {att.hoursWorked !== undefined
                                    ? `${att.hoursWorked} hrs`
                                    : "8 hrs"}
                                </td>
                                <td className="py-2 px-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${
                                      isPuntual
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                        : isTarde
                                          ? "bg-amber-100 text-amber-800 border-amber-300"
                                          : isFalta
                                            ? "bg-rose-100 text-rose-800 border-rose-300"
                                            : "bg-blue-100 text-blue-800 border-blue-300"
                                    }`}
                                  >
                                    {isPuntual
                                      ? "Puntual"
                                      : isTarde
                                        ? "Tarde"
                                        : isFalta
                                          ? "Falta"
                                          : "Permiso"}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-slate-600">
                                  {att.reason || att.notes || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Signatures Area */}
              <div className="grid grid-cols-2 gap-8 pt-8 pb-4 text-center">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">
                    RADICAL GYM FITNESS CENTER
                  </p>
                  <p className="text-xs text-slate-500">
                    Gerencia General / Recursos Humanos
                  </p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">
                    {contrato.fullName}
                  </p>
                  <p className="text-xs text-slate-500">
                    DNI: {contrato.dni} (Colaborador)
                  </p>
                </div>
              </div>

              {/* Print / Export Bar */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <BotonesDescarga nombre={`Contrato_${contrato?.fullName || ""}`} />
                <button
                  type="button"
                  onClick={() => onCerrar()}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      
  );
};
