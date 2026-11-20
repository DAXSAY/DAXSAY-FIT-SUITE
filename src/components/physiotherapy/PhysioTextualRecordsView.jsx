import { williamsElegidos, textoRespuestaWilliams, textoToleranciaWilliams } from "./WilliamsVisuals";
import React, { useState, useMemo } from "react";
import { etiquetaPostura } from "./PosturaEvaluacion";
import { FileText, Search, Copy, Check, Share2 } from "lucide-react";

export const PhysioTextualRecordsView = ({
  records = [],
  members = [],
  onSelectSessionToEdit,
  onOpenReportModal,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(
    records[0]?.id || null,
  );

  // Filter records based on textual search
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter((r) => {
      const matchName = String(r.memberName || "").toLowerCase().includes(term);
      const matchDni = String(r.memberDni || "").includes(term);
      const matchReason = r.consultationReason?.toLowerCase().includes(term);
      const matchMeds =
        r.physicalEvaluation?.medicationsText?.toLowerCase().includes(term) ||
        r.physicalEvaluation?.medications?.some((m) =>
          m.toLowerCase().includes(term),
        );
      const matchPosture =
        r.posturalEvaluation?.toLowerCase().includes(term) ||
        r.physicalEvaluation?.posturalVisualEvaluation?.postureFindings?.some(
          (p) => p.toLowerCase().includes(term),
        );
      const matchWilliams =
        r.functionalEvaluation?.williamsEvaluation?.summaryNotes
          ?.toLowerCase()
          .includes(term);
      const matchRestrictions = r.gymWorkoutRestrictions
        ?.toLowerCase()
        .includes(term);
      const matchPhysio = r.physiotherapistName?.toLowerCase().includes(term);

      return (
        matchName ||
        matchDni ||
        matchReason ||
        matchMeds ||
        matchPosture ||
        matchWilliams ||
        matchRestrictions ||
        matchPhysio
      );
    });
  }, [records, searchTerm]);

  const activeRecord = useMemo(() => {
    return (
      records.find((r) => r.id === selectedRecordId) ||
      filteredRecords[0] ||
      records[0] ||
      null
    );
  }, [records, selectedRecordId, filteredRecords]);

  // Generate plain textual representation
  const generatePlainTextRecord = (r) => {
    const lat = r.physicalEvaluation?.posturalVisualEvaluation?.lateralView;
    const knees = r.physicalEvaluation?.posturalVisualEvaluation?.visualKnees;
    const ankles = r.physicalEvaluation?.posturalVisualEvaluation?.visualAnkles;
    const williams = r.functionalEvaluation?.williamsEvaluation;
    const medsText =
      r.physicalEvaluation?.medicationsText ||
      r.physicalEvaluation?.medications?.join(", ") ||
      "Sin medicación reportada";

    let out = `================================================================================\n`;
    out += `FICHA CLÍNICA DE FISIOTERAPIA & REHABILITACIÓN FUNCIONAL\n`;
    out += `================================================================================\n\n`;
    out += `PACIENTE: ${r.memberName.toUpperCase()}\n`;
    out += `DNI: ${r.memberDni} | TELÉFONO: ${r.memberPhone || "No registrado"}\n`;
    out += `FECHA DE ATENCIÓN: ${r.date} a las ${r.time} (Sesión #${r.sessionNumber || 1})\n`;
    out += `PROFESIONAL A CARGO: ${r.physiotherapistName}\n\n`;
    out += `--------------------------------------------------------------------------------\n`;
    out += `1. MOTIVO DE CONSULTA & DIAGNÓSTICO:\n`;
    out += `${r.consultationReason}\n`;
    out += `• Zonas Afectadas: ${r.affectedZones?.join(", ") || r.affectedZone || "Lumbar"}\n`;
    out += `• Nivel de Dolor Inicial (EVA): ${r.painLevelEVA}/10\n`;
    if (r.initialMedicalRestrictions) {
      out += `• Antecedentes Médicos de Inscripción: ${r.initialMedicalRestrictions}\n`;
    }
    out += `\n--------------------------------------------------------------------------------\n`;
    out += `2. MEDICAMENTOS & FARMACOTERAPIA ACTUAL:\n`;
    out += `${medsText}\n`;
    out += `\n--------------------------------------------------------------------------------\n`;
    out += `3. EVALUACIÓN POSTURAL & BIOMECÁNICA (INCLUYE VISIÓN LATERAL & RODILLAS/TOBILLOS):\n`;
    out += `• Resumen Postural: ${r.posturalEvaluation || "Sin alteraciones severas"}\n`;
    if (lat) {
      out += `• VISIÓN LATERAL (SAGITAL):\n`;
      out += `  - Cabeza: ${etiquetaPostura("headPosition", lat.headPosition)}\n`;
      out += `  - Columna Cervical: ${etiquetaPostura("cervicalSpine", lat.cervicalSpine)}\n`;
      out += `  - Columna Dorsal: ${etiquetaPostura("thoracicSpine", lat.thoracicSpine)}\n`;
      out += `  - Columna Lumbar: ${etiquetaPostura("lumbarSpine", lat.lumbarSpine)}\n`;
      if (lat.shoulderPosition) out += `  - Hombros: ${etiquetaPostura("shoulderPosition", lat.shoulderPosition)}\n`;
      if (lat.abdomen) out += `  - Abdomen: ${etiquetaPostura("abdomen", lat.abdomen)}\n`;
      out += `  - Pelvis (Báscula): ${etiquetaPostura("pelvisTilt", lat.pelvisTilt)}\n`;
      out += `  - Rodillas Sagital: ${etiquetaPostura("kneeSagittal", lat.kneeSagittal)}\n`;
      out += `  - Línea de Plomada: ${etiquetaPostura("plumbLineDeviation", lat.plumbLineDeviation)}\n`;
      if (lat.notes) out += `  - Notas de Visión Lateral: ${lat.notes}\n`;
    }
    if (knees) {
      out += `• EVALUACIÓN VISUAL DE RODILLAS:\n`;
      out += `  - Alineación Frontal: ${etiquetaPostura("frontalAlignment", knees.frontalAlignment)}\n`;
      out += `  - Tracking Patelar: ${etiquetaPostura("patellarTracking", knees.patellarTracking)}\n`;
      out += `  - Inflamación / Derrame: ${etiquetaPostura("effusionInflammation", knees.effusionInflammation)}\n`;
      if (knees.details) out += `  - Detalles de Rodillas: ${knees.details}\n`;
    }
    if (ankles) {
      out += `• EVALUACIÓN VISUAL DE TOBILLO Y PIE:\n`;
      out += `  - Alineación Retropié: ${etiquetaPostura("hindfootAlignment", ankles.hindfootAlignment)}\n`;
      out += `  - Arco Plantar: ${etiquetaPostura("plantarArch", ankles.plantarArch)}\n`;
      if (ankles.forefoot) out += `  - Dedos y antepié: ${etiquetaPostura("forefoot", ankles.forefoot)}\n`;
      out += `  - Tendón de Aquiles: ${etiquetaPostura("achillesTendon", ankles.achillesTendon)}\n`;
      if (ankles.details) out += `  - Detalles de Tobillo: ${ankles.details}\n`;
    }
    if (r.physicalEvaluation?.posturalVisualEvaluation?.visualComments) {
      out += `• Comentarios Visuales Generales: ${r.physicalEvaluation.posturalVisualEvaluation.visualComments}\n`;
    }
    out += `\n--------------------------------------------------------------------------------\n`;
    out += `4. EVALUACIÓN FUNCIONAL & PROTOCOLO DE WILLIAMS:\n`;
    out += `• Rango Articular (ROM): ${r.rangeOfMotion}\n`;
    if (williams && williams.enabled) {
      out += `• PROTOCOLO DE FLEXIÓN DE WILLIAMS (COLUMNA LUMBO-SACRA):\n`;
      out += `  - Tolerancia Global: ${textoToleranciaWilliams(williams.overallTolerance)}\n`;
      williamsElegidos(williams).forEach((w) => {
        out += `  [Ej #${w.number}] ${w.name}: ${textoRespuestaWilliams(w.executionStatus)} | Dolor EVA: ${w.painEVA}/10 | ${w.clinicalComment || ""}\n`;
      });
      if (williams.summaryNotes)
        out += `  - Conclusión Williams: ${williams.summaryNotes}\n`;
    }
    out += `\n--------------------------------------------------------------------------------\n`;
    out += `5. TRATAMIENTO & TÉCNICAS APLICADAS:\n`;
    if (r.editableTreatments && r.editableTreatments.length > 0) {
      r.editableTreatments
        .filter((t) => t.applied)
        .forEach((t, i) => {
          out += `[${i + 1}] ${t.name} (${t.category})\n    Dosificación: ${t.dosage}\n    ${t.notes ? `Nota: ${t.notes}\n` : ""}`;
        });
    } else {
      out += `${r.treatmentsApplied?.join(", ") || "Terapia manual y ejercicios terapéuticos"}\n`;
    }
    out += `\n--------------------------------------------------------------------------------\n`;
    out += `6. CARTILLA DE EJERCICIOS DOSIFICADOS:\n`;
    if (r.exerciseDosage && r.exerciseDosage.customExercises.length > 0) {
      out += `Título: ${r.exerciseDosage.customCardTitle} (${r.exerciseDosage.customCardFrequency})\n`;
      r.exerciseDosage.customExercises.forEach((ex, i) => {
        out += `${i + 1}. ${ex.name} - ${ex.series} series x ${ex.repsOrTime} (Descanso: ${ex.restSeconds}s)${ex.metodo?.resumen ? ` · ${ex.metodo.resumen}` : ""}\n`;
        out += `   Indicación Técnica: ${ex.techniqueTips}\n`;
        if (ex.commentsWithImages && ex.commentsWithImages.length > 0) {
          ex.commentsWithImages.forEach((c) => {
            out += `   [Pauta con Foto]: ${c.imageTitle ? `${c.imageTitle}: ` : ""}${c.comment}\n`;
          });
        }
      });
    }
    out += `\n--------------------------------------------------------------------------------\n`;
    out += `7. RESTRICCIONES EN EL GIMNASIO / SALA DE PESAS:\n`;
    out += `${r.gymWorkoutRestrictions || "Adaptación según escala de dolor."}\n\n`;
    out += `8. PAUTAS EN CASA:\n`;
    out += `${r.homeIndications || "Seguir las indicaciones del fisioterapeuta."}\n\n`;
    if (r.nextAppointmentDate) {
      out += `PRÓXIMO CONTROL / CITA: ${r.nextAppointmentDate}\n`;
    }
    out += `================================================================================\n`;
    out += `CENTRO DE FISIOTERAPIA & RENDIMIENTO DEPORTIVO\n`;
    out += `================================================================================\n`;
    return out;
  };

  // Misma información de la ficha, en secciones para mostrarla con diseño
  const seccionesFicha = (r) => {
    const pv = r.physicalEvaluation?.posturalVisualEvaluation || {};
    const lat = pv.lateralView;
    const knees = pv.visualKnees;
    const ankles = pv.visualAnkles;
    const williams = r.functionalEvaluation?.williamsEvaluation;
    const med = r.physicalEvaluation?.medicationsText || r.physicalEvaluation?.medications?.join(", ") || "Sin medicación reportada";
    const filas = (...xs) => xs.filter((x) => x && x[1] !== undefined && x[1] !== null && x[1] !== "");
    const postura = [];
    if (lat)
      postura.push({
        sub: "Vista lateral",
        filas: filas(
          ["Cabeza", etiquetaPostura("headPosition", lat.headPosition)],
          ["Columna cervical", etiquetaPostura("cervicalSpine", lat.cervicalSpine)],
          ["Columna dorsal", etiquetaPostura("thoracicSpine", lat.thoracicSpine)],
          ["Columna lumbar", etiquetaPostura("lumbarSpine", lat.lumbarSpine)],
          lat.shoulderPosition && ["Hombros", etiquetaPostura("shoulderPosition", lat.shoulderPosition)],
          lat.abdomen && ["Abdomen", etiquetaPostura("abdomen", lat.abdomen)],
          ["Pelvis", etiquetaPostura("pelvisTilt", lat.pelvisTilt)],
          ["Rodillas (lateral)", etiquetaPostura("kneeSagittal", lat.kneeSagittal)],
          ["Línea de plomada", etiquetaPostura("plumbLineDeviation", lat.plumbLineDeviation)],
          lat.notes && ["Notas", lat.notes],
        ),
      });
    if (knees)
      postura.push({
        sub: "Rodillas",
        filas: filas(
          ["Alineación frontal", etiquetaPostura("frontalAlignment", knees.frontalAlignment)],
          ["Recorrido de la rótula", etiquetaPostura("patellarTracking", knees.patellarTracking)],
          ["Inflamación", etiquetaPostura("effusionInflammation", knees.effusionInflammation)],
          knees.details && ["Detalles", knees.details],
        ),
      });
    if (ankles)
      postura.push({
        sub: "Tobillo y pie",
        filas: filas(
          ["Retropié", etiquetaPostura("hindfootAlignment", ankles.hindfootAlignment)],
          ["Arco plantar", etiquetaPostura("plantarArch", ankles.plantarArch)],
          ankles.forefoot && ["Dedos y antepié", etiquetaPostura("forefoot", ankles.forefoot)],
          ["Tendón de Aquiles", etiquetaPostura("achillesTendon", ankles.achillesTendon)],
          ankles.details && ["Detalles", ankles.details],
        ),
      });
    const trat = r.editableTreatments?.length
      ? r.editableTreatments.filter((t) => t.applied).map((t) => [t.name, `${t.dosage || ""}${t.notes ? ` · ${t.notes}` : ""}`, t.category])
      : (r.treatmentsApplied || ["Terapia manual y ejercicios terapéuticos"]).map((t) => [t, ""]);
    return [
      { n: 1, titulo: "Motivo de consulta y diagnóstico", tono: "rose", texto: r.consultationReason, filas: filas(["Zonas", r.affectedZones?.join(", ") || r.affectedZone], ["Antecedentes", r.initialMedicalRestrictions]) },
      { n: 2, titulo: "Medicamentos", tono: "violet", texto: med },
      { n: 3, titulo: "Evaluación postural", tono: "sky", texto: r.posturalEvaluation || "Sin alteraciones severas", grupos: postura, extra: pv.visualComments },
      {
        n: 4,
        titulo: "Evaluación funcional",
        tono: "teal",
        filas: filas(["Rango articular", r.rangeOfMotion], williams?.enabled && ["Protocolo de Williams", textoToleranciaWilliams(williams.overallTolerance)]),
        lista: williams?.enabled ? williamsElegidos(williams).map((w) => [`${w.number}. ${w.name}`, `${textoRespuestaWilliams(w.executionStatus)} · dolor ${w.painEVA}/10${w.clinicalComment ? ` · ${w.clinicalComment}` : ""}`]) : [],
        extra: williams?.enabled ? williams.summaryNotes : "",
      },
      { n: 5, titulo: "Tratamiento aplicado", tono: "emerald", lista: trat },
      {
        n: 6,
        titulo: r.exerciseDosage?.customCardTitle ? `Ejercicios · ${r.exerciseDosage.customCardTitle}` : "Ejercicios para casa",
        tono: "amber",
        texto: r.exerciseDosage?.customCardFrequency || "",
        lista: (r.exerciseDosage?.customExercises || []).map((ex) => [ex.name, `${ex.series} × ${ex.repsOrTime} · descanso ${ex.restSeconds} s${ex.metodo?.resumen ? ` · ${ex.metodo.resumen}` : ""}${ex.techniqueTips ? ` — ${ex.techniqueTips}` : ""}`]),
      },
      { n: 7, titulo: "Restricciones en el gimnasio", tono: "rose", texto: r.gymWorkoutRestrictions || "Adaptación según escala de dolor." },
      { n: 8, titulo: "Pautas en casa", tono: "emerald", texto: r.homeIndications || "Seguir las indicaciones del fisioterapeuta." },
    ];
  };

  const handleCopyText = (r) => {
    const text = generatePlainTextRecord(r);
    navigator.clipboard.writeText(text);
    setCopiedId(r.id);
    try {
    } catch (e) {}
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-600" /> Busca en diagnósticos, medicamentos, postura, Williams y restricciones.
        </p>
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por texto, diagnóstico, medicamento, Williams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Main Grid: Left List + Right Textual Terminal Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Alumnos & Evaluaciones List */}
        <div className="lg:col-span-4 space-y-2 max-h-[800px] overflow-y-auto pr-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 pb-1 flex items-center justify-between">
            <span>Evaluaciones Encontradas ({filteredRecords.length})</span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-cyan-400 text-xs hover:underline cursor-pointer"
              >
                Limpiar filtro
              </button>
            )}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-slate-500 text-xs">
              No se encontraron evaluaciones que coincidan con "{searchTerm}".
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const isSelected = activeRecord?.id === rec.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecordId(rec.id)}
                  className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? "bg-teal-50 border-teal-400 shadow-md ring-2 ring-teal-400/30 text-slate-900"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? "bg-teal-100 text-teal-800 border-teal-300"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      Sesión #{rec.sessionNumber || 1}
                    </span>
                    <span
                      className={`text-xs font-mono ${isSelected ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {rec.date}
                    </span>
                  </div>

                  <div>
                    <h4
                      className="text-xs font-black text-slate-900"
                    >
                      {rec.memberName}
                    </h4>
                    <p
                      className={`text-xs line-clamp-1 ${isSelected ? "text-teal-700" : "text-slate-600"}`}
                    >
                      {rec.consultationReason}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span
                      className={
                        isSelected ? "text-slate-400" : "text-slate-500"
                      }
                    >
                      DNI: {rec.memberDni}
                    </span>
                    <span className="font-bold text-amber-500">
                      EVA: {rec.painLevelEVA}/10
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Full Textual Record Inspector */}
        <div className="lg:col-span-8">
          {activeRecord ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 text-slate-800 space-y-4">
              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-xs text-teal-600 font-black uppercase tracking-wider block">
                    Ficha clínica
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {activeRecord.memberName} · Sesión #
                    {activeRecord.sessionNumber || 1}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeRecord.date} | {activeRecord.time} ·{" "}
                    {activeRecord.physiotherapistName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(activeRecord)}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    {copiedId === activeRecord.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>¡Texto Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar como texto</span>
                      </>
                    )}
                  </button>

                  {onOpenReportModal && (
                    <button
                      type="button"
                      onClick={() => onOpenReportModal(activeRecord)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Ver Reporte Visual</span>
                    </button>
                  )}

                  {onSelectSessionToEdit && (
                    <button
                      type="button"
                      onClick={() => onSelectSessionToEdit(activeRecord)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Editar Ficha
                    </button>
                  )}
                </div>
              </div>

              {/* Ficha con diseño (el texto plano solo se usa al copiar) */}
              <FichaConDiseno r={activeRecord} secciones={seccionesFicha(activeRecord)} />
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              Selecciona una evaluación de la lista para ver su ficha clínica
              textual completa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const TONOS_FICHA = {
  rose: "bg-rose-50 border-rose-200 text-rose-700",
  violet: "bg-violet-50 border-violet-200 text-violet-700",
  sky: "bg-sky-50 border-sky-200 text-sky-700",
  teal: "bg-teal-50 border-teal-200 text-teal-700",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
};

const PUNTOS = { rose: "bg-rose-400", violet: "bg-violet-400", sky: "bg-sky-400", teal: "bg-teal-400", emerald: "bg-emerald-400", amber: "bg-amber-400" };

const Filas = ({ filas }) =>
  filas?.length ? (
    <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
      {filas.map(([k, v]) => (
        <div key={k} className="flex gap-2 text-sm min-w-0">
          <dt className="text-slate-500 shrink-0">{k}:</dt>
          <dd className="font-semibold text-slate-800 min-w-0">{v}</dd>
        </div>
      ))}
    </dl>
  ) : null;

/** Ficha clínica con secciones, colores y la escala de dolor visible */
const FichaConDiseno = ({ r, secciones }) => {
  const eva = Number(r.painLevelEVA) || 0;
  const tonoEva = eva >= 7 ? "bg-rose-500" : eva >= 4 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
      <div className="grid sm:grid-cols-3 gap-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Paciente</p>
          <p className="text-sm font-black text-slate-900">{r.memberName}</p>
          <p className="text-xs text-slate-500">DNI {r.memberDni} · {r.memberPhone || "sin teléfono"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Atención</p>
          <p className="text-sm font-black text-slate-900">{r.date} · {r.time}</p>
          <p className="text-xs text-slate-500">Sesión #{r.sessionNumber || 1} · {r.physiotherapistName}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Dolor inicial (EVA)</p>
          <p className="text-sm font-black text-slate-900">{eva}/10</p>
          <div className="mt-1.5 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className={`h-full rounded-full ${tonoEva}`} style={{ width: `${eva * 10}%` }} />
          </div>
        </div>
      </div>
      {secciones.map((sec) => {
        if (!sec.texto && !sec.filas?.length && !sec.lista?.length && !sec.grupos?.length) return null;
        return (
          <section key={sec.n} className="rounded-2xl border border-slate-200 bg-white p-3.5">
            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <span className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-black ${TONOS_FICHA[sec.tono]}`}>{sec.n}</span>
              {sec.titulo}
            </h4>
            {sec.texto && <p className="mt-1.5 text-sm text-slate-700">{sec.texto}</p>}
            <Filas filas={sec.filas} />
            {sec.grupos?.map((g) => (
              <div key={g.sub} className="mt-2.5 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-600">{g.sub}</p>
                <Filas filas={g.filas} />
              </div>
            ))}
            {sec.lista?.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {sec.lista.map(([a, b, c], i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${PUNTOS[sec.tono]}`} />
                    <span className="min-w-0">
                      <b className="text-slate-900">{a}</b>
                      {c && <span className="ml-1.5 text-[11px] text-slate-500">({c})</span>}
                      {b && <span className="text-slate-600"> — {b}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {sec.extra && <p className="mt-2 text-xs text-slate-600 italic">{sec.extra}</p>}
          </section>
        );
      })}
      {r.nextAppointmentDate && (
        <p className="rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">Próximo control: {r.nextAppointmentDate}</p>
      )}
    </div>
  );
};
