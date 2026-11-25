import { CampoNumero } from "../common/CampoNumero";
import { SinSeleccion } from "../common/CabeceraModulo";
import { SeguimientoServicio } from "../common/Programados";
import { AgendaEspecialistas } from "../appointments/AgendaEspecialistas";
import { UsersRound, CalendarDays, AlertTriangle as FiAlerta, ClipboardCheck as FiFicha, CircleDashed as FiSinEval, Flame as FiDolor, Copy } from "lucide-react";
import { CabeceraModulo, AccionCabecera } from "../common/CabeceraModulo";
import { useRecordado } from "../../utils/subPestana";
import React, { useState, useMemo, useEffect } from "react";
import {
  HeartPulse,
  Search,
  AlertTriangle,
  Plus,
  FileText,
  User,
  Calendar,
  Clock,
  Activity,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Share2,
  Dumbbell,
  Trash2,
  Target,
  Eye,
  Download,
  Edit3,
  TrendingUp,
  Check,
  Info,
  ArrowRight,
  X,
  BookmarkPlus,
  BookOpen,
  Layers,
  Save,
  CheckCircle,
  ClipboardList,
  Stethoscope,
  ClipboardCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { useGym } from "../../context/GymContext";
import { TelWhatsApp } from "../common/TelWhatsApp";
import {
  EMPTY_CLINICAL_SCALES,
  normalizeScales,
  romSummary,
  ROM_NORMS,
  PAIN_PHASES,
  Card,
  RedFlagsSection,
  PainSection,
  RomSection,
  MrcSection,
  SpecialTestsSection,
  PalpationSection,
  OdiSection,
  RED_FLAGS,
} from "./ClinicalScalesPanel";
import { hoyISO } from "../../utils/fecha";
import { BodyMapVisual, ZONE_DETAILS, zoneLabel } from "./BodyMapVisual";
import {
  PostureVisualSelector,
  NORMAL_LATERAL,
  NORMAL_KNEES,
  NORMAL_ANKLES,
  derivePostureFindings,
  AUTO_POSTURE_LABELS,
} from "./PosturaEvaluacion";
import { WilliamsVisuals, DEFAULT_WILLIAMS_EXERCISES } from "./WilliamsVisuals";
import { PATOLOGIAS_POR_REGION } from "../../data/patologias";
import {
  EditableTreatments,
  DEFAULT_TREATMENT_ITEMS,
} from "./EditableTreatments";
import { ExercisePrescriptionCard } from "./ExercisePrescriptionCard";
import { textoPlanoFicha } from "./PhysioTextualRecordsView";
import { ChipsFiltro, PanelFiltros, BuscadorFiltro } from "../common/ChipsFiltro";
import { PhysioReportModal } from "./PhysioReportModal";
import { ESTADOS_EVOLUCION, estadoEvolucion, ADHERENCIA, FRECUENCIA_SESIONES, PRONOSTICO } from "./evolucion";
import { api } from "../../api/cliente";
import { SelectorAlumno, CodigoAlumno, coincideAlumno } from "../common/BuscarAlumno";
import { SelectorIndicaciones, sugerirIndicaciones, textoIndicaciones } from "../indicaciones/Indicaciones";
import { ContextoClinico } from "./ContextoClinico";
import { IconoEmoji } from "../common/IconoEmoji";

const PHYSIO_STEPS = [
  { id: "anamnesis", label: "Anamnesis y dolor", icon: ClipboardList },
  { id: "postura", label: "Postura", icon: Eye },
  { id: "exploracion", label: "Exploración física", icon: Stethoscope },
  { id: "plan", label: "Plan de tratamiento", icon: Dumbbell },
  { id: "evolucion", label: "Evolución e indicaciones", icon: ClipboardCheck },
];
const LBL = "block text-xs font-bold text-slate-700 mb-1";
const INP =
  "w-full text-sm px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const COMMON_TREATMENTS = [
  "Terapia manual miofascial / Masoterapia",
  "Reeducación motriz & Ejercicios terapéuticos",
  "Electroterapia TENS (Analgesia)",
  "Crioterapia / Compresas frías",
  "Termoterapia superficial / Compresas calientes",
  "Punción seca de puntos gatillo",
  "Vendaje neuromuscular / Kinesiotaping",
  "Estiramientos miofasciales globales",
];

// Encabezado numerado de cada parte del plan de tratamiento
const PasoPlan = ({ n, titulo, ayuda }) => (
  <div className="flex items-start gap-2.5">
    <span className="w-7 h-7 shrink-0 rounded-full bg-blue-600 text-white text-sm font-black flex items-center justify-center">{n}</span>
    <div>
      <p className="text-sm font-black text-slate-900 leading-tight">{titulo}</p>
      {ayuda && <p className="text-xs text-slate-500">{ayuda}</p>}
    </div>
  </div>
);

const COMMON_ANTECEDENTS = [
  "Hernia discal lumbar o cervical previa",
  "Tendinopatía crónica o fascitis",
  "Intervención quirúrgica ortopédica previa",
  "Esguince grado II o III recurrente",
  "Subluxación o luxación de hombro",
  "Fractura previa en la zona",
  "Enfermedad reumática / artrosis",
  "Embarazo / posparto",
  "Hipertensión / cardiopatía",
  "Diabetes",
];

const COMMON_MEDICATIONS = [
  "Ibuprofeno / Naproxeno (AINEs)",
  "Paracetamol 500mg-1g",
  "Clorzoxazona / Ciclobenzaprina (Relajante muscular)",
  "Infiltración con corticoides reciente",
  "Tramadol / Analgésico opioide suave",
  "Protector gástrico (Omeprazol)",
  "Sin medicación actual",
];

const DEFAULT_FUNCTIONAL_TESTS = [
  { testName: "Test de Spurling (compresión foraminal)", joint: "Columna Cervical", result: "no_evaluado" },
  { testName: "Test de distracción cervical", joint: "Columna Cervical", result: "no_evaluado" },
  { testName: "Test de Adson (desfiladero torácico)", joint: "Columna Cervical", result: "no_evaluado" },
  { testName: "Test de Neer (pinzamiento subacromial)", joint: "Hombro / Manguito", result: "no_evaluado" },
  { testName: "Test de Hawkins-Kennedy (manguito rotador)", joint: "Hombro / Manguito", result: "no_evaluado" },
  { testName: "Test de Jobe (supraespinoso)", joint: "Hombro / Manguito", result: "no_evaluado" },
  { testName: "Test de Speed (tendón bicipital)", joint: "Hombro / Bíceps", result: "no_evaluado" },
  { testName: "Test de Yergason (porción larga del bíceps)", joint: "Hombro / Bíceps", result: "no_evaluado" },
  { testName: "Test de aprehensión (inestabilidad anterior)", joint: "Hombro / Inestabilidad", result: "no_evaluado" },
  { testName: "Test de Cozen (epicondilitis lateral)", joint: "Codo & Antebrazo", result: "no_evaluado" },
  { testName: "Test de Mill (epicondilitis lateral)", joint: "Codo & Antebrazo", result: "no_evaluado" },
  { testName: "Test de golfista (epitrocleítis)", joint: "Codo & Antebrazo", result: "no_evaluado" },
  { testName: "Test de Phalen (túnel carpiano)", joint: "Muñeca & Mano", result: "no_evaluado" },
  { testName: "Signo de Tinel en muñeca (nervio mediano)", joint: "Muñeca & Mano", result: "no_evaluado" },
  { testName: "Test de Finkelstein (De Quervain)", joint: "Muñeca & Pulgar", result: "no_evaluado" },
  { testName: "Signo de Froment (nervio cubital)", joint: "Dedos de la mano", result: "no_evaluado" },
  { testName: "Test de dedo en gatillo (bloqueo en flexión)", joint: "Dedos de la mano", result: "no_evaluado" },
  { testName: "Test de expansión costal", joint: "Columna Dorsal", result: "no_evaluado" },
  { testName: "Test de Lasègue / SLR (radiculopatía L5-S1)", joint: "Columna Lumbar", result: "no_evaluado" },
  { testName: "Test de Slump (tensión neural)", joint: "Columna Lumbar", result: "no_evaluado" },
  { testName: "Test de Schober (movilidad lumbar)", joint: "Columna Lumbar", result: "no_evaluado" },
  { testName: "Test de Gaenslen (sacroilíaca)", joint: "Sacroilíaca", result: "no_evaluado" },
  { testName: "Test de compresión / distracción sacroilíaca", joint: "Sacroilíaca", result: "no_evaluado" },
  { testName: "Test de Thomas (retracción de psoas)", joint: "Cadera / Psoas", result: "no_evaluado" },
  { testName: "Test de Ober (tensor de la fascia lata)", joint: "Cadera / TFL", result: "no_evaluado" },
  { testName: "Test de FABER / Patrick (cadera-sacroilíaca)", joint: "Cadera", result: "no_evaluado" },
  { testName: "Test de FADIR (pinzamiento femoroacetabular)", joint: "Cadera", result: "no_evaluado" },
  { testName: "Signo de Trendelenburg", joint: "Cadera / Glúteo medio", result: "no_evaluado" },
  { testName: "Test de Lachman (LCA)", joint: "Rodilla / Ligamentos", result: "no_evaluado" },
  { testName: "Cajón anterior / posterior de rodilla", joint: "Rodilla / Ligamentos", result: "no_evaluado" },
  { testName: "Estrés en valgo / varo (LCM / LCL)", joint: "Rodilla / Ligamentos", result: "no_evaluado" },
  { testName: "Test de McMurray (meniscos)", joint: "Rodilla / Meniscos", result: "no_evaluado" },
  { testName: "Test de Apley (meniscos)", joint: "Rodilla / Meniscos", result: "no_evaluado" },
  { testName: "Test de Clarke (condromalacia rotuliana)", joint: "Rodilla / Rótula", result: "no_evaluado" },
  { testName: "Cajón anterior de tobillo (LPAA)", joint: "Tobillo & Pie", result: "no_evaluado" },
  { testName: "Test de Thompson (rotura de Aquiles)", joint: "Tobillo & Pie", result: "no_evaluado" },
  { testName: "Squeeze test (sindesmosis)", joint: "Tobillo & Pie", result: "no_evaluado" },
  { testName: "Test de Windlass (fascitis plantar / espolón)", joint: "Talón / Fascia plantar", result: "no_evaluado" },
  { testName: "Test de movilidad del hallux (hallux rigidus / valgus)", joint: "Dedos del pie / Hallux", result: "no_evaluado" },
  { testName: "Test de Mulder (neuroma de Morton)", joint: "Dedos del pie / Hallux", result: "no_evaluado" },
];

const CHIP_FISIO = {
  slate: ["bg-slate-700 border-slate-700", "text-slate-500"],
  amber: ["bg-amber-600 border-amber-600", "text-amber-600"],
  teal: ["bg-teal-600 border-teal-600", "text-teal-600"],
  sky: ["bg-sky-600 border-sky-600", "text-sky-600"],
  rose: ["bg-rose-600 border-rose-600", "text-rose-600"],
};

export const PhysiotherapyModule = () => {
  const {
    members,
    physioRecords,
    physioTemplates,
    addPhysioRecord,
    updatePhysioRecord,
    deletePhysioRecord,
    addPhysioTemplate,
    deletePhysioTemplate,
    staffContracts,
    staffDirectory,
    currentUser,
  } = useGym();

  const [searchTerm, setSearchTerm] = useState("");
  // Filtros de pacientes (se combinan): estado de la atención · nivel de dolor · diagnóstico · parte del cuerpo
  const [filtroFisio, setFiltroFisio] = useState(""); // estado: con_sesiones · sin_eval · lesion_sin_eval · control · vencidos
  const [dolorF, setDolorF] = useState(""); // alto · moderado · leve
  const [diagF, setDiagF] = useState(""); // diagnóstico presuntivo de su última evaluación
  const [parteF, setParteF] = useState(""); // parte del cuerpo con dolor (id de zona)
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  // Modals state
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [reportModalSession, setReportModalSession] = useState(null);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState("anamnesis");

  // TEMPLATES STATE & TOAST
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateCategoryInput, setTemplateCategoryInput] =
    useState("Columna & Tronco");
  const [templateDescInput, setTemplateDescInput] = useState("");
  const [templateAppliedToast, setTemplateAppliedToast] = useState(null);

  // EVOLUTION CHART METRICS VIEW
  const [chartMetricView, setChartMetricView] = useState("both");

  // Main View Switcher ('fichas' or 'textual')
  const [copiadoTexto, setCopiadoTexto] = useState(false);
  const [activeMainView, setActiveMainView] = useRecordado("fisio", "", ["agenda", "textual"]);

  // FORM STATES
  const [formMemberId, setFormMemberId] = useState("");
  const [formDate, setFormDate] = useState(
    () => hoyISO(),
  );
  const [formTime, setFormTime] = useState("10:00 AM");
  const [formPhysioName, setFormPhysioName] = useState("");
  const [formReason, setFormReason] = useState("");
  // 1. ZONA AFECTADA & TRATAMIENTOS EDITABLES
  const [formZones, setFormZones] = useState([]);
  const [formPainEVA, setFormPainEVA] = useState(0);
  const [formClinicalScales, setFormClinicalScales] = useState(EMPTY_CLINICAL_SCALES);
  const [formZoneSides, setFormZoneSides] = useState({});
  const setScales = (patch) => setFormClinicalScales((prev) => ({ ...prev, ...patch }));
  const urgentRedFlag = RED_FLAGS.some(
    (f) => f.urgent && formClinicalScales.redFlags.includes(f.id),
  );
  const stepIndex = Math.max(0, PHYSIO_STEPS.findIndex((st) => st.id === activeModalTab));
  const [selectedTreatments, setSelectedTreatments] = useState([]);
  const [formEditableTreatments, setFormEditableTreatments] = useState(
    DEFAULT_TREATMENT_ITEMS,
  );

  // 2. EVALUACIÓN FÍSICA & VISIÓN LATERAL & RODILLAS/TOBILLOS
  const [formClinicalHistory, setFormClinicalHistory] = useState("");
  const [formMedicalBackground, setFormMedicalBackground] = useState([]);
  const [formPatologias, setFormPatologias] = useState([]); // diagnóstico presuntivo
  const [verTodasPatologias, setVerTodasPatologias] = useState(false);
  const [formCustomBackground, setFormCustomBackground] = useState("");
  const [formMedications, setFormMedications] = useState([]);
  const [formCustomMedication, setFormCustomMedication] = useState("");
  const [formMedicationsText, setFormMedicationsText] = useState("");
  const [formPostureFindings, setFormPostureFindings] = useState([]);
  const [formPostureNotes, setFormPostureNotes] = useState("");
  const [formLateralPosture, setFormLateralPosture] = useState(NORMAL_LATERAL);
  const [formVisualKnees, setFormVisualKnees] = useState(NORMAL_KNEES);
  const [formVisualAnkles, setFormVisualAnkles] = useState(NORMAL_ANKLES);
  const [formVisualComments, setFormVisualComments] = useState("");

  // 3. EVALUACIÓN FUNCIONAL & PROTOCOLO WILLIAMS
  const [formWilliamsEval, setFormWilliamsEval] = useState({
    enabled: false,
    overallTolerance: "buena",
    summaryNotes: "",
    exercises: DEFAULT_WILLIAMS_EXERCISES,
  });

  // 3. EVALUACIÓN FUNCIONAL
  const [formROMStatus, setFormROMStatus] = useState("completo");
  const [formROMDetails, setFormROMDetails] = useState("");
  const [formMobilityQuality, setFormMobilityQuality] = useState(
    "Movilidad disminuida con compensación motora",
  );
  const [formPainPhase, setFormPainPhase] = useState("ninguno");
  const [formDynamicPainEVA, setFormDynamicPainEVA] = useState(0);
  const [formPainNature, setFormPainNature] = useState("");
  const [formFunctionalTests, setFormFunctionalTests] = useState(
    DEFAULT_FUNCTIONAL_TESTS,
  );
  const [formMuscleTone, setFormMuscleTone] = useState("normotono");
  const [formTempEdema, setFormTempEdema] = useState("normotermico");
  const [formTenderZoneNotes, setFormTenderZoneNotes] = useState("");

  // 4. DOSIFICACIÓN DE EJERCICIOS
  const [formCardTitle, setFormCardTitle] = useState(
    "Cartilla de Fortalecimiento & Readaptación Funcional",
  );
  const [formCardFrequency, setFormCardFrequency] = useState(
    "3 veces por semana en días alternos",
  );
  const [formCustomExercises, setFormCustomExercises] = useState([]);

  const [formProgressivePhase, setFormProgressivePhase] = useState(
    "descarga_isometrico",
  );
  const [formMaxKg, setFormMaxKg] = useState(10);
  const [formProgressionCriteria, setFormProgressionCriteria] = useState("");
  const [formAllowedExercises, setFormAllowedExercises] = useState("");
  const [formProhibitedExercises, setFormProhibitedExercises] = useState("");
  const [formPassiveMobility, setFormPassiveMobility] = useState("");
  const [formResistanceDetails, setFormResistanceDetails] = useState("");
  const [formProprioceptionExercises, setFormProprioceptionExercises] =
    useState("Apoyo monopodal y equilibrio en plano estable");
  const [formProprioceptionLevel, setFormProprioceptionLevel] =
    useState("monopodal_estable");
  const [formVestibularEnabled, setFormVestibularEnabled] = useState(false);
  const [formVestibularDetails, setFormVestibularDetails] = useState("");
  const [formPowerStatus, setFormPowerStatus] = useState("contraindicado");
  const [formPowerDetails, setFormPowerDetails] = useState("");

  // 5. OBSERVACIONES ADICIONALES (CRUD: AGREGAR, EDITAR, ELIMINAR)
  const [formAdditionalObservations, setFormAdditionalObservations] = useState([]);
  const [newObservationInput, setNewObservationInput] = useState("");

  // 6. EXPLICACIÓN ENTENDIBLE PARA EL ALUMNO Y EVOLUCIÓN
  const [formPatientFriendlySummary, setFormPatientFriendlySummary] = useState("");
  const [formImprovementStatus, setFormImprovementStatus] =
    useState("en_evaluacion");
  const [formGymRestrictions, setFormGymRestrictions] = useState("");
  const [formHomeIndications, setFormHomeIndications] = useState("");
  // Seguimiento: adherencia, frecuencia, sesiones estimadas, pronóstico y objetivo corto
  const [formAdherencia, setFormAdherencia] = useState("primera");
  const [formFrecuenciaSesiones, setFormFrecuenciaSesiones] = useState("");
  const [formSesionesEstimadas, setFormSesionesEstimadas] = useState("");
  const [formPronostico, setFormPronostico] = useState("");
  const [formObjetivoCorto, setFormObjetivoCorto] = useState("");
  // Indicaciones para el alumno (catálogo: estiramientos 3 x 30 s, movilidad 2 x 15, cuidados…)
  const [formIndicaciones, setFormIndicaciones] = useState([]);
  const [formIndicacionesNotas, setFormIndicacionesNotas] = useState("");
  // El tratamiento del día es opcional (la evaluación dura ~20 min)
  const [formPlanEnabled, setFormPlanEnabled] = useState(false);
  const [verParametros, setVerParametros] = useState(false);
  const [nuevaTecnica, setNuevaTecnica] = useState("");
  const [formEvolutionNotes, setFormEvolutionNotes] = useState("");
  const [formNextAppt, setFormNextAppt] = useState("");

  // Available staff
  const availablePhysios = useMemo(() => {
    const fromContracts = staffContracts
      .filter(
        (c) =>
          c.role.toLowerCase().includes("fisio") ||
          c.role.toLowerCase().includes("nutri") ||
          c.role.toLowerCase().includes("terap"),
      )
      .map((c) => c.staffName);
    const list = [
      ...staffDirectory.filter((p) => String(p.cargo).includes("fisio")).map((p) => p.fullName),
      ...fromContracts,
    ];
    if (currentUser?.fullName) list.unshift(currentUser.fullName);
    return Array.from(new Set(list.filter(Boolean)));
  }, [staffContracts, staffDirectory, currentUser]);

  // Filtered members for sidebar
  // Última sesión de cada alumno (para la tarjeta de la lista)
  const ultimaSesion = useMemo(() => {
    const m = new Map();
    physioRecords.forEach((r) => {
      const a = m.get(r.memberId);
      if (!a || String(r.date || "") > String(a.date || "")) m.set(r.memberId, r);
    });
    return m;
  }, [physioRecords]);
  const sesionesDe = useMemo(() => {
    const m = new Map();
    physioRecords.forEach((r) => m.set(r.memberId, (m.get(r.memberId) || 0) + 1));
    return m;
  }, [physioRecords]);
  const conLesion = (m) => !!(m.medicalNotes && m.medicalNotes.trim());
  // Búsqueda también DENTRO de las fichas: diagnóstico, medicamentos, postura, Williams, restricciones…
  const coincidenciaFicha = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    const mapa = new Map();
    if (t.length < 3) return mapa;
    physioRecords.forEach((r) => {
      if (mapa.has(String(r.memberId))) return;
      const campos = [
        r.consultationReason,
        (r.affectedZones || []).join(", "),
        r.initialMedicalRestrictions,
        r.physicalEvaluation?.medicationsText,
        (r.physicalEvaluation?.medications || []).join(", "),
        r.posturalEvaluation,
        (r.physicalEvaluation?.posturalVisualEvaluation?.postureFindings || []).join(", "),
        r.functionalEvaluation?.williamsEvaluation?.summaryNotes,
        r.gymWorkoutRestrictions,
        r.homeIndications,
        (r.editableTreatments || []).filter((x) => x.applied).map((x) => x.name).join(", "),
        (r.treatmentsApplied || []).join(", "),
      ].filter((x) => typeof x === "string" && x);
      const hit = campos.find((x) => x.toLowerCase().includes(t));
      if (hit) {
        const i = hit.toLowerCase().indexOf(t);
        const ini = Math.max(0, i - 25);
        mapa.set(String(r.memberId), `${ini ? "…" : ""}${hit.slice(ini, i + t.length + 35)}${i + t.length + 35 < hit.length ? "…" : ""}`);
      }
    });
    return mapa;
  }, [physioRecords, searchTerm]);

  const hoyFisio = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  // Estado de la atención de cada paciente
  const ESTADO_FISIO = {
    con_sesiones: (m, u) => !!u,
    sin_eval: (m, u) => !u,
    lesion_sin_eval: (m, u) => !u && conLesion(m),
    control: (m, u) => !!u?.nextAppointmentDate && String(u.nextAppointmentDate) <= hoyFisio,
    vencidos: (m) => m.status === "expired",
  };
  // Nivel de dolor según la EVA de su última evaluación
  const nivelDolor = (u) => {
    const e = Number(u?.painLevelEVA);
    if (!u || !Number.isFinite(e) || e <= 0) return "";
    return e >= 6 ? "alto" : e >= 4 ? "moderado" : "leve";
  };
  // Lo que aparece en las últimas evaluaciones (solo se muestran etiquetas con al menos 1 paciente)
  const { diagnosticosFisio, partesFisio } = useMemo(() => {
    const d = {}, z = {};
    members.forEach((m) => {
      const u = ultimaSesion.get(m.id);
      (u?.pathologies || []).forEach((x) => (d[x] = (d[x] || 0) + 1));
      (u?.affectedZones || []).forEach((x) => (z[x] = (z[x] || 0) + 1));
    });
    const orden = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { diagnosticosFisio: orden(d).slice(0, 14), partesFisio: orden(z).slice(0, 14) };
  }, [members, ultimaSesion]);
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (!searchTerm.trim() && !filtroFisio && !dolorF && !diagF && !parteF) return false; // nada cargado hasta buscar o filtrar
      if (!coincideAlumno(m, searchTerm) && !coincidenciaFicha.has(String(m.id))) return false;
      const ult = ultimaSesion.get(m.id);
      if (filtroFisio && filtroFisio !== "todos" && !ESTADO_FISIO[filtroFisio]?.(m, ult)) return false;
      if (dolorF && nivelDolor(ult) !== dolorF) return false;
      if (diagF && !(ult?.pathologies || []).includes(diagF)) return false;
      if (parteF && !(ult?.affectedZones || []).includes(parteF)) return false;
      return true;
    });
  }, [members, searchTerm, filtroFisio, dolorF, diagF, parteF, ultimaSesion, coincidenciaFicha]);

  // Selected member object
  const selectedMember = useMemo(() => {
    // Nada preseleccionado: solo el alumno que se elija
    return members.find((m) => m.id === selectedMemberId) || null;
  }, [selectedMemberId, filteredMembers, members]);

  // Sessions for active member sorted by date/time desc
  const memberSessions = useMemo(() => {
    if (!selectedMember) return [];
    return physioRecords
      .filter((r) => r.memberId === selectedMember.id)
      .sort(
        (a, b) =>
          new Date(`${b.date} ${b.time}`).getTime() -
          new Date(`${a.date} ${a.time}`).getTime(),
      );
  }, [selectedMember, physioRecords]);

  // CLINICAL PROGRESS COMPUTATION FOR ACTIVE MEMBER
  const progressStats = useMemo(() => {
    if (!memberSessions || memberSessions.length === 0) return null;
    // Sort oldest to newest for progression
    const chronological = [...memberSessions].sort(
      (a, b) =>
        new Date(`${a.date} ${a.time}`).getTime() -
        new Date(`${b.date} ${b.time}`).getTime(),
    );

    const firstSession = chronological[0];
    const latestSession = chronological[chronological.length - 1];
    const initialEVA = firstSession.painLevelEVA;
    const currentEVA = latestSession.painLevelEVA;
    const diffEVA = initialEVA - currentEVA;
    const percentageRelief =
      initialEVA > 0 ? Math.round((diffEVA / initialEVA) * 100) : 0;

    let overallStatus = "en_evaluacion";
    if (chronological.length > 1) {
      if (diffEVA >= 3) overallStatus = "notable_mejora";
      else if (diffEVA > 0) overallStatus = "mejora_leve";
      else if (diffEVA === 0) overallStatus = "estable";
      else overallStatus = "empeoramiento";
    }

    return {
      sessionCount: memberSessions.length,
      initialEVA,
      currentEVA,
      diffEVA,
      percentageRelief,
      overallStatus,
      chronological,
    };
  }, [memberSessions]);

  // Devuelve el % del rango normal (0-100). Usa la goniometría real si existe.
  const getRomScoreOrDegrees = (s) => {
    const pct = s.functionalEvaluation?.rangeOfMotionPercent ??
      romSummary(s.clinicalScales?.rom)?.avg;
    if (pct != null) return Math.min(100, Math.round(pct));
    return Math.round(getLegacyRomDegrees(s) / 1.8);
  };

  const getLegacyRomDegrees = (s) => {
    const romStatus = s.functionalEvaluation?.rangeOfMotionStatus;
    if (romStatus === "completo") return 180;
    if (romStatus === "limitacion_leve") return 145;
    if (romStatus === "limitacion_moderada") return 95;
    if (romStatus === "bloqueo_severo") return 45;

    const text = (s.rangeOfMotion || "").toLowerCase();
    if (
      text.includes("completo") ||
      text.includes("180") ||
      text.includes("100%")
    )
      return 180;
    if (text.includes("leve") || text.includes("140") || text.includes("75%"))
      return 145;
    if (
      text.includes("moderado") ||
      text.includes("90") ||
      text.includes("50%")
    )
      return 95;
    if (
      text.includes("severo") ||
      text.includes("bloqueo") ||
      text.includes("45") ||
      text.includes("25%")
    )
      return 45;

    return Math.max(30, Math.min(180, Math.round(180 - s.painLevelEVA * 14)));
  };

  const evolutionChartData = useMemo(() => {
    if (
      !progressStats ||
      !progressStats.chronological ||
      progressStats.chronological.length === 0
    )
      return [];
    return progressStats.chronological.map((s, idx) => {
      const romPercent = getRomScoreOrDegrees(s);
      const romDeg = romPercent;
      return {
        sessionLabel: `S#${idx + 1}`,
        date: s.date.slice(5),
        fullDate: s.date,
        time: s.time,
        painEVA: s.painLevelEVA,
        romDegrees: romDeg,
        romPercent: romPercent,
        zone: (s.affectedZones || [s.affectedZone])[0] || "Zona",
        reason: s.consultationReason || "Evaluación",
        status: s.improvementStatus || "en_evaluacion",
      };
    });
  }, [progressStats]);

  const handleApplyTemplate = (template) => {
    setFormReason(template.consultationReason || "");
    if (template.affectedZones && template.affectedZones.length > 0) {
      setFormZones(template.affectedZones);
    }
    setFormPainEVA(template.painLevelEVA ?? 5);
    setFormPostureFindings(template.postureFindings || []);
    setFormPostureNotes(template.postureNotes || "");
    setFormROMStatus(template.romStatus || "limitado_leve");
    setFormROMDetails(template.romDetails || "");
    setFormPainPhase(template.painPhase || "final_rango");
    setFormDynamicPainEVA(
      template.dynamicPainEVA ?? template.painLevelEVA ?? 5,
    );
    setFormPainNature(template.painNature || "");
    setFormFunctionalTests(
      template.functionalTests && template.functionalTests.length > 0
        ? template.functionalTests
        : DEFAULT_FUNCTIONAL_TESTS,
    );
    setFormMuscleTone(template.muscleTone || "normotono");
    setFormTempEdema(template.tempEdema || "normotermico");
    setFormTenderZoneNotes(template.tenderNotes || "");
    if (template.exerciseDosage) {
      setFormCardTitle(
        template.exerciseDosage.customCardTitle ||
          "Cartilla de Fortalecimiento",
      );
      setFormCardFrequency(
        template.exerciseDosage.customCardFrequency || "3 veces por semana",
      );
      if (
        template.exerciseDosage.customExercises &&
        template.exerciseDosage.customExercises.length > 0
      ) {
        setFormCustomExercises(template.exerciseDosage.customExercises);
      }
      if (template.exerciseDosage.progressiveLoads) {
        const pl = template.exerciseDosage.progressiveLoads;
        setFormProgressivePhase(pl.phase || "descarga_isometrico");
        setFormMaxKg(pl.maxRecommendedKg || 0);
        setFormProgressionCriteria(pl.progressionCriteria || "");
      }
      if (template.exerciseDosage.exerciseAdaptation) {
        const ea = template.exerciseDosage.exerciseAdaptation;
        setFormAllowedExercises(ea.allowedExercises?.join(", ") || "");
        setFormProhibitedExercises(ea.prohibitedExercises?.join(", ") || "");
      }
      if (template.exerciseDosage.passiveMobility) {
        setFormPassiveMobility(
          template.exerciseDosage.passiveMobility.techniques?.join("; ") || "",
        );
      }
      if (template.exerciseDosage.resistance) {
        setFormResistanceDetails(
          template.exerciseDosage.resistance.details || "",
        );
      }
      if (template.exerciseDosage.proprioception) {
        setFormProprioceptionExercises(
          template.exerciseDosage.proprioception.exercises?.join(", ") || "",
        );
        setFormProprioceptionLevel(
          template.exerciseDosage.proprioception.level || "monopodal_estable",
        );
      }
      if (template.exerciseDosage.vestibular) {
        setFormVestibularEnabled(!!template.exerciseDosage.vestibular.enabled);
        setFormVestibularDetails(
          template.exerciseDosage.vestibular.details || "",
        );
      }
      if (template.exerciseDosage.power) {
        setFormPowerStatus(
          template.exerciseDosage.power.status || "contraindicado",
        );
        setFormPowerDetails(template.exerciseDosage.power.details || "");
      }
    }

    setFormGymRestrictions(template.gymRestrictions || "");
    setFormHomeIndications(template.homeIndications || "");
    setFormPatientFriendlySummary(template.patientFriendlySummary || "");
    if (
      template.additionalObservations &&
      template.additionalObservations.length > 0
    ) {
      setFormAdditionalObservations(template.additionalObservations);
    }

    setSelectedTemplateId(template.id);
    setTemplateAppliedToast(`Plantilla "${template.name}" cargada con éxito`);
    setTimeout(() => setTemplateAppliedToast(null), 3500);

    try {
    } catch (e) {
      // ignore
    }
  };

  const handleSaveCurrentAsTemplate = (e) => {
    e.preventDefault();
    if (!templateNameInput.trim()) return;

    const created = addPhysioTemplate({
      name: templateNameInput.trim(),
      description:
        templateDescInput.trim() ||
        `Configuración personalizada para ${formZones.join(", ")}`,
      category: templateCategoryInput || "Personalizado",
      affectedZones: formZones,
      consultationReason: formReason || "Evaluación personalizada",
      painLevelEVA: formPainEVA,
      postureFindings: formPostureFindings,
      postureNotes: formPostureNotes,
      romStatus: formROMStatus,
      romDetails: formROMDetails,
      painPhase: formPainPhase,
      dynamicPainEVA: formDynamicPainEVA,
      painNature: formPainNature,
      functionalTests: formFunctionalTests,
      muscleTone: formMuscleTone,
      tempEdema: formTempEdema,
      tenderNotes: formTenderZoneNotes,
      exerciseDosage: {
        customCardTitle: formCardTitle,
        customCardFrequency: formCardFrequency,
        customExercises: formCustomExercises,
        progressiveLoads: {
          phase: formProgressivePhase,
          maxRecommendedKg: formMaxKg,
          progressionCriteria: formProgressionCriteria,
        },
        exerciseAdaptation: {
          allowedExercises: formAllowedExercises
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          prohibitedExercises: formProhibitedExercises
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          adaptationNotes: "",
        },
        passiveMobility: {
          techniques: [formPassiveMobility].filter(Boolean),
          notes: "",
        },
        resistance: {
          intensity: "moderada",
          details: formResistanceDetails,
        },
        proprioception: {
          exercises: [formProprioceptionExercises].filter(Boolean),
          level: formProprioceptionLevel,
        },
        vestibular: {
          enabled: formVestibularEnabled,
          details: formVestibularDetails,
        },
        power: {
          status: formPowerStatus,
          details: formPowerDetails,
        },
      },
      gymRestrictions: formGymRestrictions,
      homeIndications: formHomeIndications,
      patientFriendlySummary: formPatientFriendlySummary,
      additionalObservations: formAdditionalObservations,
      isCustom: true,
    });

    setIsSaveTemplateModalOpen(false);
    setTemplateNameInput("");
    setTemplateDescInput("");
    setSelectedTemplateId(created.id);
    setTemplateAppliedToast(`Plantilla "${created.name}" guardada con éxito`);
    setTimeout(() => setTemplateAppliedToast(null), 3500);
  };

  // Toggle zone in multiple selection
  const handleToggleZone = (zone) => {
    if (formZones.includes(zone)) {
      setFormZones(formZones.filter((z) => z !== zone));
      setFormZoneSides(({ [zone]: _omit, ...rest }) => rest);
    } else {
      setFormZones([...formZones, zone]);
    }
  };

  const handleToggleZoneSide = (zone, side) => {
    const cur = formZoneSides[zone] || [];
    const next = cur.includes(side) ? cur.filter((x) => x !== side) : [...cur, side];
    setFormZoneSides({ ...formZoneSides, [zone]: next });
    if (next.length === 0) setFormZones(formZones.filter((z) => z !== zone));
    else if (!formZones.includes(zone)) setFormZones([...formZones, zone]);
  };

  const handleAddCustomZone = (zoneName) => {
    if (!formZones.includes(zoneName)) {
      setFormZones((prev) => [...prev, zoneName]);
    }
  };

  const handleRemoveZone = (zone) => {
    setFormZones((prev) => prev.filter((z) => z !== zone));
  };

  const handleAutoSummary = () => {
    const zonas = formZones.map((z) => zoneLabel(z, formZoneSides[z]).toLowerCase()).join(", ");
    const dolor = formClinicalScales.pain.actual;
    const evitar = formProhibitedExercises.trim();
    const permitidos = formAllowedExercises.trim();
    const partes = [
      zonas ? `En esta evaluación revisamos tu molestia en: ${zonas}.` : "",
      dolor != null ? `Hoy tu dolor fue de ${dolor} sobre 10.` : "",
      evitar ? `Por ahora evita: ${evitar}.` : "",
      permitidos ? `Puedes seguir entrenando: ${permitidos}.` : "",
      formCustomExercises.length
        ? `Realiza tu cartilla de ${formCustomExercises.length} ejercicio(s) ${formCardFrequency || ""}.`.replace(" .", ".")
        : "",
      "Si el dolor aumenta o aparece hormigueo, avísanos antes de tu próximo entrenamiento.",
    ];
    setFormPatientFriendlySummary(partes.filter(Boolean).join(" "));
  };

  // Toggle Posture Finding
  const handleTogglePostureFinding = (finding) => {
    setFormPostureFindings((prev) => {
      if (prev.includes(finding)) {
        return prev.filter((f) => f !== finding);
      } else {
        return [...prev, finding];
      }
    });
  };

  // Functional Test Handlers
  const handleToggleTestResult = (index, result) => {
    setFormFunctionalTests((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], result };
      return copy;
    });
  };

  const handleAddCustomTest = (testName, joint) => {
    if (!testName.trim()) return;
    setFormFunctionalTests((prev) => [
      ...prev,
      {
        testName: testName.trim(),
        joint: joint || "Articulación",
        result: "negativo",
      },
    ]);
  };

  const handleRemoveTest = (index) => {
    setFormFunctionalTests((prev) => prev.filter((_, i) => i !== index));
  };

  // Exercise Handlers
  const handleAddCustomExercise = (ex) => {
    setFormCustomExercises((prev) => [...prev, ex]);
  };

  const handleRemoveCustomExercise = (id) => {
    setFormCustomExercises((prev) => prev.filter((e) => e.id !== id));
  };

  // Observation Handlers (CRUD)
  const handleAddObservation = () => {
    if (!newObservationInput.trim()) return;
    setFormAdditionalObservations((prev) => [
      ...prev,
      newObservationInput.trim(),
    ]);
    setNewObservationInput("");
  };

  const handleEditObservation = (index, newText) => {
    setFormAdditionalObservations((prev) => {
      const copy = [...prev];
      copy[index] = newText;
      return copy;
    });
  };

  const handleRemoveObservation = (index) => {
    setFormAdditionalObservations((prev) => prev.filter((_, i) => i !== index));
  };

  // Open modal for NEW session
  useEffect(() => {
    if (!isNewSessionModalOpen || editingSessionId || !formMemberId || formIndicaciones.length) return;
    let vivo = true;
    api(`/indicaciones/alumno/${formMemberId}`)
      .then((d) => {
        if (!vivo || !d.vigente) return;
        setFormIndicaciones(d.vigente.items.map((i) => ({ ...i, id: i.id || `x${Math.random()}` })));
        setFormIndicacionesNotas(d.vigente.notes || "");
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formMemberId, isNewSessionModalOpen, editingSessionId]);

  const handleOpenNewSession = (targetMember) => {
    setEditingSessionId(null);
    const mem = targetMember || selectedMember || null;
    setFormMemberId(mem ? mem.id : "");
    setFormReason("");
    setFormClinicalHistory(mem?.medicalNotes ? `Restricción en ficha de inscripción: ${mem.medicalNotes}` : "");
    setFormDate(hoyISO());
    setFormTime(
      new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }),
    );
    if (!formPhysioName && currentUser?.fullName) setFormPhysioName(currentUser.fullName);
    setFormZones([]);
    setFormZoneSides({});
    setFormPainEVA(0);
    setFormClinicalScales(EMPTY_CLINICAL_SCALES);
    setFormMedicalBackground([]);
    setFormPatologias([]);
    setFormMedicationsText("");
    setFormPostureFindings([]);
    setFormPostureNotes("");
    setFormLateralPosture(NORMAL_LATERAL);
    setFormVisualKnees(NORMAL_KNEES);
    setFormVisualAnkles(NORMAL_ANKLES);
    setFormVisualComments("");
    setFormFunctionalTests(DEFAULT_FUNCTIONAL_TESTS);
    setFormMuscleTone("normotono");
    setFormTempEdema("normotermico");
    setFormTenderZoneNotes("");
    setFormEditableTreatments(DEFAULT_TREATMENT_ITEMS.map((t) => ({ ...t, applied: false })));
    setFormPlanEnabled(false);
    setVerParametros(false);
    setFormIndicaciones([]);
    setFormIndicacionesNotas("");
    setFormAdherencia("primera");
    setFormFrecuenciaSesiones("");
    setFormSesionesEstimadas("");
    setFormPronostico("");
    setFormObjetivoCorto("");
    setFormCustomExercises([]);
    setFormAllowedExercises("");
    setFormProhibitedExercises("");
    setFormProgressivePhase("descarga_isometrico");
    setFormProgressionCriteria("");
    setFormWilliamsEval((prev) => ({ ...prev, enabled: false }));
    setFormAdditionalObservations([]);
    setFormPatientFriendlySummary("");
    setFormHomeIndications("");
    setFormEvolutionNotes("");
    setFormImprovementStatus("en_evaluacion");
    setFormNextAppt("");
    setActiveModalTab("anamnesis");
    setIsNewSessionModalOpen(true);
  };

  // Open modal for EDITING existing session
  const handleEditSession = (session) => {
    setEditingSessionId(session.id);
    setFormMemberId(session.memberId);
    setFormDate(session.date);
    setFormTime(session.time);
    setFormPhysioName(session.physiotherapistName);
    setFormReason(session.consultationReason || "");
    setFormZones(
      session.affectedZones ||
        (session.affectedZone ? [session.affectedZone] : ["lumbar"]),
    );
    setFormPainEVA(session.painLevelEVA ?? 0);
    setFormClinicalScales(normalizeScales(session.clinicalScales));
    setFormZoneSides(session.affectedZoneSides || {});
    setSelectedTreatments(session.treatmentsApplied || []);

    if (session.editableTreatments && session.editableTreatments.length > 0) {
      setFormEditableTreatments(session.editableTreatments);
    } else if (
      session.treatmentsApplied &&
      session.treatmentsApplied.length > 0
    ) {
      setFormEditableTreatments(
        DEFAULT_TREATMENT_ITEMS.map((t) => ({
          ...t,
          applied: session.treatmentsApplied.includes(t.name),
        })),
      );
    }
    if (session.physicalEvaluation) {
      setFormClinicalHistory(session.physicalEvaluation.history || "");
      setFormMedicalBackground(
        session.physicalEvaluation.medicalAntecedents || ["Sin antecedentes"],
      );
      setFormPatologias(session.physicalEvaluation.pathologies || []);
      setFormMedications(session.physicalEvaluation.medications || []);
      setFormMedicationsText(
        session.physicalEvaluation.medicationsText ||
          (session.physicalEvaluation.medications
            ? session.physicalEvaluation.medications.join(", ")
            : ""),
      );
      if (session.physicalEvaluation.posturalVisualEvaluation) {
        const pve = session.physicalEvaluation.posturalVisualEvaluation;
        setFormPostureFindings((pve.postureFindings || []).filter((f) => !AUTO_POSTURE_LABELS.includes(f)));
        setFormPostureNotes(pve.postureNotes || "");
        if (pve.lateralView) setFormLateralPosture(pve.lateralView);
        if (pve.visualKnees) setFormVisualKnees(pve.visualKnees);
        if (pve.visualAnkles) setFormVisualAnkles(pve.visualAnkles);
        if (pve.visualComments) setFormVisualComments(pve.visualComments);
      }
    }

    if (session.functionalEvaluation) {
      const fe = session.functionalEvaluation;
      setFormROMStatus(fe.rangeOfMotionStatus || "limitado_leve");
      setFormROMDetails(fe.rangeOfMotionDetails || "");
      setFormMobilityQuality(fe.mobilityQuality || "");
      setFormPainPhase(fe.painOnMovement?.movementPhase || "final_rango");
      setFormDynamicPainEVA(
        fe.painOnMovement?.dynamicPainEVA || session.painLevelEVA,
      );
      setFormPainNature(fe.painOnMovement?.painNature || "Punzante");
      if (fe.functionalJointTests && fe.functionalJointTests.length > 0) {
        // Se agregan las pruebas nuevas del catálogo que el registro antiguo no tenía
        const nombres = new Set(fe.functionalJointTests.map((t) => t.testName));
        setFormFunctionalTests([...fe.functionalJointTests, ...DEFAULT_FUNCTIONAL_TESTS.filter((t) => !nombres.has(t.testName))]);
      }
      if (fe.palpationPainZone) {
        setFormMuscleTone(
          fe.palpationPainZone.muscleTone || "contractura_focal",
        );
        setFormTempEdema(
          fe.palpationPainZone.temperatureEdema || "calor_local",
        );
        setFormTenderZoneNotes(fe.palpationPainZone.tenderZoneNotes || "");
      }
      if (fe.williamsEvaluation) {
        setFormWilliamsEval(fe.williamsEvaluation);
      }
    }

    if (session.exerciseDosage) {
      const ed = session.exerciseDosage;
      setFormCardTitle(ed.customCardTitle || "Cartilla Personalizada");
      setFormCardFrequency(ed.customCardFrequency || "3 veces por semana");
      setFormCustomExercises(ed.customExercises || []);
      setFormProgressivePhase(
        ed.progressiveLoads?.phase || "descarga_isometrico",
      );
      setFormMaxKg(ed.progressiveLoads?.maxRecommendedKg || 10);
      setFormProgressionCriteria(
        ed.progressiveLoads?.progressionCriteria || "",
      );
      setFormAllowedExercises(
        ed.exerciseAdaptation?.allowedExercises?.join(", ") || "",
      );
      setFormProhibitedExercises(
        ed.exerciseAdaptation?.prohibitedExercises?.join(", ") || "",
      );
    }

    setFormAdditionalObservations(
      session.additionalObservations || [
        "Observaciones clínicas registradas durante la valoración.",
      ],
    );
    setFormPatientFriendlySummary(
      session.patientFriendlySummary || session.evolutionNotes || "",
    );
    setFormImprovementStatus(session.improvementStatus || "en_evaluacion");
    setFormGymRestrictions(session.gymWorkoutRestrictions || "");
    setFormHomeIndications(session.homeIndications || "");
    setFormEvolutionNotes(session.evolutionNotes || "");
    setFormNextAppt(session.nextAppointmentDate || "");
    setFormIndicaciones(session.studentIndications || []);
    setFormAdherencia(session.followUp?.adherence || "primera");
    setFormFrecuenciaSesiones(session.followUp?.sessionFrequency || "");
    setFormSesionesEstimadas(session.followUp?.estimatedSessions ?? "");
    setFormPronostico(session.followUp?.prognosis || "");
    setFormObjetivoCorto(session.followUp?.shortTermGoal || "");
    setFormIndicacionesNotas(session.studentIndicationsNotes || "");
    setFormPlanEnabled(session.planRegistered ?? (session.treatmentsApplied || []).length > 0);
    setVerParametros(false);

    setActiveModalTab("anamnesis");
    setIsNewSessionModalOpen(true);
  };

  // Save session record (Create or Edit)
  const buildRecordData = (mem) => {
    // --- Datos derivados de las escalas clínicas ---
    const cs = formClinicalScales;
    const romSum = romSummary(cs.rom);
    const romLines = ROM_NORMS.filter((r) => cs.romJoints.includes(r.joint))
      .map((r) => {
        const v = cs.rom[r.id] || {};
        const parts = r.bilateral
          ? [v.izq != null ? `I ${v.izq}°` : null, v.der != null ? `D ${v.der}°` : null]
          : [v.val != null ? `${v.val}°` : null];
        const txt = parts.filter(Boolean).join(" / ");
        return txt ? `${r.joint} ${r.mov.toLowerCase()}: ${txt} (normal ${r.norm}°)` : null;
      })
      .filter(Boolean);
    const painEntries = Object.entries(cs.romPain || {}).filter(
      ([j, p]) => cs.romJoints.includes(j) && p.fase && p.fase !== "ninguno",
    );
    const worstMovPain = painEntries.reduce(
      (acc, [, p]) => ((p.nrs ?? 0) >= (acc.nrs ?? -1) ? p : acc),
      {},
    );
    const painPhaseLabel = (id) => PAIN_PHASES.find((p) => p.id === id)?.label || id;
    const painNow = cs.pain.actual ?? formPainEVA ?? 0;
    const prohibitedText = formProhibitedExercises.trim();
    const allPostureFindings = Array.from(
      new Set([
        ...derivePostureFindings(formLateralPosture, formVisualKnees, formVisualAnkles),
        ...formPostureFindings,
      ]),
    );

    const physicalEval = {
      history:
        formClinicalHistory.trim() ||
        "Sin antecedentes clínicos relevantes reportados.",
      medicalAntecedents: formMedicalBackground,
      pathologies: formPatologias,
      medications: formMedications,
      medicationsText: formMedicationsText.trim() || undefined,
      posturalVisualEvaluation: {
        postureFindings: allPostureFindings,
        postureNotes: formPostureNotes.trim() || undefined,
        primaryView: "lateral",
        lateralView: formLateralPosture,
        visualKnees: formVisualKnees,
        visualAnkles: formVisualAnkles,
        visualComments: formVisualComments.trim() || undefined,
      },
    };

    const functionalEval = {
      rangeOfMotionStatus: romSum ? romSum.status : formROMStatus,
      rangeOfMotionDetails: romLines.length
        ? romLines.join("; ")
        : formROMDetails.trim() || "No se registró goniometría.",
      rangeOfMotionPercent: romSum ? romSum.avg : undefined,
      mobilityQuality: formMobilityQuality.trim() || undefined,
      mobilityPassiveNotes: formPassiveMobility.trim() || undefined,
      painOnMovement: {
        movementPhase: worstMovPain.fase || "ninguno",
        dynamicPainEVA: worstMovPain.nrs ?? 0,
        painNature: painEntries.length
          ? painEntries
              .map(([j, p]) => `${j}: ${painPhaseLabel(p.fase)}${p.nrs != null ? ` (${p.nrs}/10)` : ""}`)
              .join("; ")
          : "Sin dolor al movimiento",
      },
      functionalJointTests: formFunctionalTests,
      palpationPainZone: {
        triggerPoints: [formTenderZoneNotes],
        muscleTone: formMuscleTone,
        temperatureEdema: formTempEdema,
        tenderZoneNotes:
          formTenderZoneNotes.trim() ||
          "Sensibilidad a la palpación en zona afectada.",
      },
      williamsEvaluation: formWilliamsEval,
    };

    const exerciseDosage = {
      customCardTitle:
        formCardTitle.trim() ||
        "Cartilla Personalizada de Fisioterapia & Ejercicios",
      customCardFrequency:
        formCardFrequency.trim() || "3 veces por semana en días alternos",
      customExercises: formPlanEnabled ? formCustomExercises : [],
      progressiveLoads: {
        phase: formProgressivePhase,
        maxRecommendedKg: formMaxKg,
        progressionCriteria:
          formProgressionCriteria.trim() ||
          "Progresión según umbral de dolor EVA",
      },
      exerciseAdaptation: {
        allowedExercises: formAllowedExercises
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        prohibitedExercises: formProhibitedExercises
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        adaptationNotes: "Supervisión en sala por instructores.",
      },
      passiveMobility: {
        techniques: [formPassiveMobility.trim()],
      },
      resistance: {
        intensity: "moderada",
        details: formResistanceDetails.trim(),
      },
      proprioception: {
        exercises: [formProprioceptionExercises.trim()],
        level: formProprioceptionLevel,
      },
      vestibular: {
        enabled: formVestibularEnabled,
        details: formVestibularDetails.trim() || undefined,
      },
      power: {
        status: formPowerStatus,
        details: formPowerDetails.trim() || undefined,
      },
    };

    const primaryZone = formZones[0] || "lumbar";
    const memberPreviousSessions = physioRecords.filter(
      (r) => r.memberId === mem.id && r.id !== editingSessionId,
    );
    const sessionNumber = memberPreviousSessions.length + 1;

    const recordData = {
      memberId: mem.id,
      memberName: mem.fullName,
      memberDni: mem.dni,
      memberPhone: mem.phone,
      date: formDate,
      time: formTime,
      physiotherapistId: "physio-1",
      physiotherapistName: formPhysioName,
      initialMedicalRestrictions:
        mem.medicalNotes ||
        "Sin restricciones reportadas en la ficha de inscripción.",
      consultationReason:
        formReason.trim() ||
        "Evaluación musculoesquelética y prescripción terapéutica",
      affectedZone: primaryZone,
      affectedZones: formZones,
      affectedZoneSides: formZoneSides,
      painLevelEVA: painNow,
      posturalEvaluation:
        allPostureFindings.join(", ") +
        (formPostureNotes ? ` (${formPostureNotes})` : ""),
      rangeOfMotion: romLines.length ? romLines.join("; ") : "Goniometría no registrada",
      functionalTests:
        formFunctionalTests
          .filter((t) => t.result === "positivo" || t.result === "dudoso")
          .map((t) => `${t.testName} (${t.result})`)
          .join(", ") ||
        (formFunctionalTests.some((t) => t.result === "negativo")
          ? `Pruebas ortopédicas negativas (${formFunctionalTests.filter((t) => t.result === "negativo").length} evaluadas).`
          : "Pruebas ortopédicas no evaluadas."),
      treatmentsApplied: formPlanEnabled
        ? formEditableTreatments.filter((t) => t.applied).map((t) => t.name)
        : [],
      editableTreatments: formEditableTreatments,
      planRegistered: formPlanEnabled,
      studentIndications: formIndicaciones,
      studentIndicationsNotes: formIndicacionesNotas.trim(),
      gymWorkoutRestrictions: prohibitedText
        ? `Evitar: ${prohibitedText}`
        : "Sin restricciones específicas en sala.",
      homeIndications:
        [textoIndicaciones(formIndicaciones.filter((i) => i.place === "casa")), formIndicacionesNotas.trim()]
          .filter(Boolean)
          .join(". ") || "",
      evolutionNotes: formEvolutionNotes.trim(),
      sessionNumber: sessionNumber,
      nextAppointmentDate: formNextAppt || undefined,
      physicalEvaluation: physicalEval,
      functionalEvaluation: functionalEval,
      exerciseDosage: exerciseDosage,
      studentReportSentAt: `${formDate} ${formTime}`,
      studentReportDeliveryMethod: "whatsapp",
      additionalObservations: formAdditionalObservations,
      patientFriendlySummary: formPatientFriendlySummary.trim(),
      improvementStatus: formImprovementStatus,
      followUp: {
        adherence: formAdherencia,
        sessionFrequency: formFrecuenciaSesiones,
        estimatedSessions: formSesionesEstimadas === "" ? null : Number(formSesionesEstimadas),
        prognosis: formPronostico,
        shortTermGoal: formObjetivoCorto.trim(),
        previousPain: physioRecords.filter((r) => r.memberId === mem.id && r.id !== editingSessionId).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))[0]?.painLevelEVA ?? null,
      },
      clinicalScales: formClinicalScales,
    };
    return recordData;
  };

  const handleSaveSession = (e) => {
    e.preventDefault();
    const mem = members.find((m) => m.id === formMemberId);
    if (!mem) {
      setActiveModalTab("anamnesis");
      alert("Seleccione el paciente.");
      return;
    }
    if (formZones.length === 0) {
      setActiveModalTab("anamnesis");
      alert("Marque al menos una zona afectada en el mapa corporal.");
      return;
    }

    const recordData = buildRecordData(mem);
    if (formIndicaciones.length) {
      api(`/indicaciones/alumno/${mem.id}`, {
        method: "POST",
        body: {
          items: formIndicaciones.map((x) => ({ ...x, id: /^\d+$/.test(String(x.id)) ? x.id : null })),
          notes: (formIndicacionesNotas.trim() || formPatientFriendlySummary.trim()).slice(0, 500),
        },
      }).catch((er) => alert(`La evaluación se guardó, pero no se pudieron guardar las indicaciones: ${er.message}`));
    }

    if (editingSessionId) {
      updatePhysioRecord(editingSessionId, recordData);
      setEditingSessionId(null);
      const updatedSession = {
        ...recordData,
        id: editingSessionId,
      };
      setReportModalSession(updatedSession);
    } else {
      addPhysioRecord(recordData);
      const createdSession = {
        ...recordData,
        id: `phy-rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      setReportModalSession(createdSession);
    }

    setIsNewSessionModalOpen(false);

    try {
    } catch (e) {
      // ignore
    }
  };

  const handlePreviewCurrentPDF = () => {
    const mem = members.find((m) => m.id === formMemberId);
    if (!mem) {
      alert(
        "Por favor selecciona un alumno para previsualizar o descargar la ficha PDF.",
      );
      return;
    }

    const previewSession = {
      ...buildRecordData(mem),
      id: editingSessionId || `preview-${Date.now()}`,
    };

    setReportModalSession(previewSession);
  };

  return (
    <div className="space-y-6">
      <CabeceraModulo
        icono={HeartPulse}
        etiqueta="Salud"
        titulo="Fisioterapia"
        descripcion="Evaluaciones por zona, evolución del dolor, ejercicios para casa y ficha en PDF."
        accion={<AccionCabecera icono={Plus} onClick={() => handleOpenNewSession()}>Nueva evaluación clínica</AccionCabecera>}
        activa={activeMainView}
        onCambiar={setActiveMainView}
        pestanas={[
          { k: "fichas", icono: Layers, label: "Fichas clínicas e historial", tono: "teal" },
          { k: "seguimiento", icono: UsersRound, label: "Seguimiento", tono: "violet" },
          { k: "agenda", icono: CalendarDays, label: "Horario de atención", tono: "amber" },
        ]}
      />

      {!activeMainView ? (
        <SinSeleccion tema="fisio" texto="Elige una opción de arriba." />
      ) : activeMainView === "seguimiento" ? (
        <SeguimientoServicio tipo="fisioterapia" />
      ) : activeMainView === "agenda" ? (
        <AgendaEspecialistas servicioInicial="fisioterapia" fijo />
      ) : (
        /* MAIN TWO-COLUMN WORKSPACE */
        <div className="space-y-4">
        {/* Filtros: el mismo diseño que el panel de Rutinas */}
        <PanelFiltros
          filas={[
            {
              etiqueta: "Pacientes",
              contenido: (
                <ChipsFiltro
                  valor={filtroFisio}
                  onCambio={setFiltroFisio}
                  opciones={[
                    { k: "todos", emoji: "👥", texto: "Todos", n: members.length },
                    { k: "con_sesiones", emoji: "🩺", texto: "Con evaluación", n: members.filter((m) => ESTADO_FISIO.con_sesiones(m, ultimaSesion.get(m.id))).length },
                    { k: "lesion_sin_eval", emoji: "🚑", texto: "Lesión declarada sin evaluar", n: members.filter((m) => ESTADO_FISIO.lesion_sin_eval(m, ultimaSesion.get(m.id))).length },
                    { k: "control", emoji: "📅", texto: "Control pendiente", n: members.filter((m) => ESTADO_FISIO.control(m, ultimaSesion.get(m.id))).length },
                    { k: "vencidos", emoji: "⏳", texto: "Membresía vencida", n: members.filter((m) => ESTADO_FISIO.vencidos(m)).length },
                  ]}
                />
              ),
            },
            ...(members.some((m) => nivelDolor(ultimaSesion.get(m.id)))
              ? [{
                  etiqueta: "Dolor (EVA)",
                  contenido: (
                    <ChipsFiltro
                      valor={dolorF}
                      onCambio={setDolorF}
                      opciones={[
                        { k: "alto", emoji: "🔴", texto: "Intenso (6–10)", n: members.filter((m) => nivelDolor(ultimaSesion.get(m.id)) === "alto").length },
                        { k: "moderado", emoji: "🟠", texto: "Moderado (4–5)", n: members.filter((m) => nivelDolor(ultimaSesion.get(m.id)) === "moderado").length },
                        { k: "leve", emoji: "🟢", texto: "Leve (1–3)", n: members.filter((m) => nivelDolor(ultimaSesion.get(m.id)) === "leve").length },
                      ]}
                    />
                  ),
                }]
              : []),
            ...(diagnosticosFisio.length
              ? [{
                  etiqueta: "Diagnóstico",
                  contenido: (
                    <ChipsFiltro valor={diagF} onCambio={setDiagF} opciones={diagnosticosFisio.map(([d, n]) => ({ k: d, emoji: "🩻", texto: d, n }))} />
                  ),
                }]
              : []),
            ...(partesFisio.length
              ? [{
                  etiqueta: "Dolor en",
                  contenido: (
                    <ChipsFiltro
                      valor={parteF}
                      onCambio={setParteF}
                      opciones={partesFisio.map(([z, n]) => {
                        const det = ZONE_DETAILS.find((x) => x.id === z);
                        const t = det ? det.short || det.label : String(z);
                        return { k: z, emoji: "📍", texto: t.charAt(0).toUpperCase() + t.slice(1), n };
                      })}
                    />
                  ),
                }]
              : []),
            {
              etiqueta: "Buscar",
              contenido: (
                <BuscadorFiltro
                  valor={searchTerm}
                  onCambio={setSearchTerm}
                  placeholder="Código, nombre, DNI… o lo que dice la ficha (hernia, L4, ibuprofeno)"
                  total={searchTerm.trim() || filtroFisio || dolorF || diagF || parteF ? filteredMembers.length : null}
                />
              ),
            },
          ]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: buscador, filtro y lista (mismo diseño que Nutrición) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-3 self-start">
            <div className="space-y-2.5 max-h-[720px] lg:max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
              {filteredMembers.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                  {searchTerm.trim() || filtroFisio || dolorF || diagF || parteF ? "No hay pacientes con los filtros elegidos." : "Escribe un código, nombre o DNI — o algo de la ficha (diagnóstico, medicamento, postura) — o elige un filtro."}
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedMember?.id === member.id;
                  const ult = ultimaSesion.get(member.id);
                  const n = sesionesDe.get(member.id) || 0;
                  const eva = Number(ult?.painLevelEVA);
                  const chip = ult
                    ? { I: FiFicha, t: ult.consultationReason || (ult.affectedZones || []).join(", ") || "Evaluado", c: "bg-cyan-50 text-cyan-800 border-cyan-200" }
                    : conLesion(member)
                      ? { I: FiAlerta, t: "Lesión declarada · sin evaluar", c: "bg-amber-50 text-amber-800 border-amber-200" }
                      : { I: FiSinEval, t: "Sin evaluación", c: "bg-slate-50 text-slate-600 border-slate-200" };
                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected ? "bg-blue-50/50 border-blue-500 shadow-xs ring-1 ring-blue-500" : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md text-xs font-bold border mb-1.5 ${chip.c}`}>
                            <chip.I className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{chip.t}</span>
                          </span>
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-1">{member.fullName}</h3>
                          {!coincideAlumno(member, searchTerm) && coincidenciaFicha.has(String(member.id)) && coincidenciaFicha.get(String(member.id)) !== chip.t && (
                            <p className="rd-coincide text-[11px] mt-1 line-clamp-2">🔎 En su ficha: «{coincidenciaFicha.get(String(member.id))}»</p>
                          )}
                        </div>
                        {ult && Number.isFinite(eva) ? (
                          <span className={`shrink-0 text-xs font-black px-2 py-1 rounded-md ${eva >= 6 ? "bg-rose-50 text-rose-700" : eva >= 4 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>EVA {eva}/10</span>
                        ) : (
                          <span className="shrink-0 text-xs font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md">—</span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex items-center space-x-1 truncate">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <CodigoAlumno m={member} className="shrink-0" />
                          <span className="truncate">DNI {member.dni}</span>
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">{n ? `${n} ${n === 1 ? "sesión" : "sesiones"}` : "sin sesiones"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE CLIENT CLINICAL VIEW & PROGRESS HISTORY (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedMember ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-5">
                {/* Member Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-3">
                    {selectedMember.photoUrl ? (
                      <img
                        src={selectedMember.photoUrl}
                        alt={selectedMember.fullName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 font-extrabold flex items-center justify-center text-sm">
                        {selectedMember.fullName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-900">
                          {selectedMember.fullName}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            selectedMember.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {selectedMember.status === "active"
                            ? "Membresía Activa"
                            : selectedMember.status === "frozen"
                              ? "Membresía Congelada"
                              : "Membresía Inactiva"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        DNI: {selectedMember.dni} • <TelWhatsApp tel={selectedMember.phone} />{" "}
                        • Plan: {selectedMember.planName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {memberSessions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(textoPlanoFicha(memberSessions[0]));
                          setCopiadoTexto(true);
                          setTimeout(() => setCopiadoTexto(false), 2000);
                        }}
                        className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        title="Copiar la última ficha como texto (para WhatsApp o un informe)"
                      >
                        {copiadoTexto ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiadoTexto ? "¡Copiado!" : "Copiar como texto"}</span>
                      </button>
                    )}
                    {memberSessions.length > 0 && (
                      <button
                        onClick={() => setReportModalSession(memberSessions[0])}
                        className="flex items-center space-x-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 px-3 py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                        title="Ver y descargar la ficha clínica PDF de la última sesión"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-700" />
                        <span>Descargar Ficha PDF</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenNewSession(selectedMember)}
                      className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nueva Sesión con Imágenes</span>
                    </button>
                  </div>
                </div>

                {/* MEDICAL RESTRICTIONS HIGHLIGHT BANNER */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border-l-4 border-amber-500 p-4 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Restricciones Médicas y Lesiones Declaradas en Recepción:
                    </span>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Ficha Alumno
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white/70 p-2.5 rounded-lg border border-amber-200/60">
                    {selectedMember.medicalNotes &&
                    selectedMember.medicalNotes.trim().length > 0
                      ? selectedMember.medicalNotes
                      : "ℹ️ No se registraron restricciones médicas al momento de la inscripción del alumno en recepción."}
                  </p>
                </div>

                {/* CLINICAL PROGRESS & IMPROVEMENTS DASHBOARD FOR THIS STUDENT */}
                {progressStats && progressStats.sessionCount > 0 && (
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-800/40 shadow-md space-y-3.5 rd-panel-oscuro">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-400/30">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                          Evolución Clínica & Mejoras del Alumno (
                          {progressStats.sessionCount}{" "}
                          {progressStats.sessionCount === 1
                            ? "Sesión"
                            : "Sesiones"}
                          )
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            progressStats.overallStatus === "notable_mejora"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                              : progressStats.overallStatus === "mejora_leve"
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"
                                : progressStats.overallStatus === "estable"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                                  : "bg-blue-500/20 text-blue-300 border-blue-400/40"
                          }`}
                        >
                          {progressStats.overallStatus === "notable_mejora"
                            ? "🎉 Notable Mejoría"
                            : progressStats.overallStatus === "mejora_leve"
                              ? "👍 Mejoría Leve"
                              : progressStats.overallStatus === "estable"
                                ? "⚖️ Condición Estable"
                                : "🔍 En Seguimiento Inicial"}
                        </span>
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                        <span className="text-xs text-slate-400 uppercase font-bold block">
                          Dolor Inicial
                        </span>
                        <p className="text-lg font-black text-rose-400 mt-0.5">
                          {progressStats.initialEVA}/10
                        </p>
                        <span className="text-xs text-slate-400">
                          Sesión #1
                        </span>
                      </div>

                      <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                        <span className="text-xs text-slate-400 uppercase font-bold block">
                          Dolor Actual
                        </span>
                        <p className="text-lg font-black text-emerald-400 mt-0.5">
                          {progressStats.currentEVA}/10
                        </p>
                        <span className="text-xs text-slate-400">
                          Última sesión
                        </span>
                      </div>

                      <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                        <span className="text-xs text-slate-400 uppercase font-bold block">
                          Alivio Total
                        </span>
                        <p className="text-lg font-black text-cyan-400 mt-0.5">
                          {progressStats.percentageRelief > 0
                            ? `-${progressStats.percentageRelief}%`
                            : "0%"}
                        </p>
                        <span className="text-xs text-slate-400">
                          Reducción de dolor
                        </span>
                      </div>

                      <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                        <span className="text-xs text-slate-400 uppercase font-bold block">
                          Estado Clínico
                        </span>
                        <p className="text-xs font-bold text-white mt-1.5 truncate">
                          {progressStats.currentEVA <= 2
                            ? "Fase Alta / Mantenimiento"
                            : progressStats.currentEVA <= 5
                              ? "Readaptación Activa"
                              : "Fase Aguda"}
                        </p>
                        <span className="text-xs text-cyan-300">
                          Monitoreado
                        </span>
                      </div>
                    </div>

                    {/* SEGUIMIENTO EVOLUTIVO: GRÁFICO COMPARATIVO DE RANGOS ARTICULARES (ROM) Y DOLOR (EVA) */}
                    <div className="bg-slate-950/80 p-4 rounded-xl border border-indigo-900/60 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest block">
                              Seguimiento Evolutivo Comparativo
                            </span>
                            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.2 rounded">
                              ROM vs EVA
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-white mt-0.5">
                            Evolución: dolor (0-10) vs. rango articular (% de lo normal)
                          </h5>
                        </div>

                        {/* Chart Metric Filter Buttons */}
                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
                          <button
                            type="button"
                            onClick={() => setChartMetricView("both")}
                            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                              chartMetricView === "both"
                                ? "bg-indigo-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Ambos (EVA & ROM)
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartMetricView("eva")}
                            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                              chartMetricView === "eva"
                                ? "bg-rose-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Solo Dolor EVA
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartMetricView("rom")}
                            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                              chartMetricView === "rom"
                                ? "bg-cyan-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Solo Rango ROM
                          </button>
                        </div>
                      </div>

                      {/* Chart Container */}
                      <div className="h-80 sm:h-[420px] w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={evolutionChartData}
                            margin={{
                              top: 10,
                              right: 20,
                              left: -10,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#334155"
                              opacity={0.5}
                            />
                            <XAxis
                              dataKey="date"
                              stroke="#94a3b8"
                              tick={{ fontSize: 13, fill: "#cbd5e1" }}
                              tickLine={false}
                            />

                            {(chartMetricView === "both" ||
                              chartMetricView === "eva") && (
                              <YAxis
                                yAxisId="left"
                                domain={[0, 10]}
                                stroke="var(--color-rose-500)"
                                tick={{ fontSize: 13, fill: "var(--color-rose-500)" }}
                                tickLine={false}
                                label={{
                                  value: "EVA (0-10)",
                                  angle: -90,
                                  position: "insideLeft",
                                  fill: "var(--color-rose-500)",
                                  fontSize: 12,
                                  offset: 12,
                                }}
                              />
                            )}
                            {(chartMetricView === "both" ||
                              chartMetricView === "rom") && (
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 100]}
                                stroke="var(--color-cyan-500)"
                                tick={{ fontSize: 13, fill: "var(--color-cyan-500)" }}
                                tickLine={false}
                                label={{
                                  value: "ROM (% normal)",
                                  angle: 90,
                                  position: "insideRight",
                                  fill: "var(--color-cyan-500)",
                                  fontSize: 12,
                                  offset: 12,
                                }}
                              />
                            )}
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                                        <span className="font-extrabold text-cyan-400">
                                          {data.sessionLabel} • {data.fullDate}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                          {data.time}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-300 font-medium truncate max-w-[200px]">
                                        {data.reason}
                                      </p>
                                      <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="bg-rose-950/40 p-1.5 rounded border border-rose-800/40">
                                          <span className="text-xs text-rose-300 block font-bold">
                                            Nivel Dolor EVA
                                          </span>
                                          <span className="text-sm font-extrabold text-rose-400">
                                            {data.painEVA} / 10
                                          </span>
                                        </div>
                                        <div className="bg-cyan-950/40 p-1.5 rounded border border-cyan-800/40">
                                          <span className="text-xs text-cyan-300 block font-bold">
                                            Rango Articular
                                          </span>
                                          <span className="text-sm font-extrabold text-cyan-400">
                                            {data.romPercent}% del normal
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />

                            <Legend
                              wrapperStyle={{
                                fontSize: "11px",
                                paddingTop: "6px",
                              }}
                              formatter={(value) => (
                                <span className="text-slate-300 font-medium">
                                  {value}
                                </span>
                              )}
                            />

                            {(chartMetricView === "both" ||
                              chartMetricView === "eva") && (
                              <Line isAnimationActive={false}
                                yAxisId="left"
                                type="monotone"
                                dataKey="painEVA"
                                name="Dolor EVA (0-10)"
                                stroke="var(--color-rose-500)"
                                strokeWidth={3}
                                dot={{
                                  r: 4,
                                  fill: "var(--color-rose-500)",
                                  stroke: "#ffffff",
                                  strokeWidth: 1.5,
                                }}
                                activeDot={{ r: 6, fill: "var(--color-rose-500)" }}
                              />
                            )}
                            {(chartMetricView === "both" ||
                              chartMetricView === "rom") && (
                              <Line isAnimationActive={false}
                                yAxisId="right"
                                type="monotone"
                                dataKey="romDegrees"
                                name="Rango articular (% normal)"
                                stroke="var(--color-cyan-500)"
                                strokeWidth={3}
                                dot={{
                                  r: 4,
                                  fill: "var(--color-cyan-500)",
                                  stroke: "#ffffff",
                                  strokeWidth: 1.5,
                                }}
                                activeDot={{ r: 6, fill: "var(--color-cyan-500)" }}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Timeline Chips */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-800/80">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider shrink-0">
                          Hitos de Sesión:
                        </span>
                        {progressStats.chronological.map((s, idx) => {
                          const romDeg = getRomScoreOrDegrees(s);
                          return (
                            <div
                              key={`chrono-${s.id || idx}-${idx}`}
                              className="flex items-center shrink-0"
                            >
                              <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-center min-w-[95px]">
                                <span className="text-xs font-bold text-cyan-400 block">
                                  S#{idx + 1} • {s.date.slice(5)}
                                </span>
                                <div className="flex items-center justify-center gap-1.5 my-0.5">
                                  <span className="text-xs font-black text-rose-400">
                                    {s.painLevelEVA}/10
                                  </span>
                                  <span className="text-slate-500 text-xs">
                                    |
                                  </span>
                                  <span className="text-xs font-black text-cyan-300">
                                    {romDeg}%
                                  </span>
                                </div>
                                <span className="text-xs text-slate-400 block truncate max-w-[85px]">
                                  {(s.affectedZones || [s.affectedZone])[0]}
                                </span>
                              </div>
                              {idx < progressStats.chronological.length - 1 && (
                                <ArrowRight className="w-3.5 h-3.5 text-slate-600 mx-1 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Clinical History of Sessions for this Student */}
                <div>
                  <div className="flex items-center justify-between mb-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span>
                        Sesiones Registradas ({memberSessions.length})
                      </span>
                    </h4>
                    {memberSessions.length > 0 && (
                      <span className="text-xs text-slate-500">
                        Última atención: {memberSessions[0].date}
                      </span>
                    )}
                  </div>

                  {memberSessions.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <HeartPulse className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">
                        Sin sesiones registradas para este alumno
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Haz clic en &quot;Nueva Sesión con Imágenes&quot; para
                        registrar la primera evaluación.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {memberSessions.map((session, idx) => {
                        const isExpanded = expandedSessionId === session.id;
                        const zones = session.affectedZones || [
                          session.affectedZone,
                        ];

                        return (
                          <div
                            key={`session-card-${session.id || idx}-${idx}`}
                            className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-all"
                          >
                            {/* Session Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                  Sesión #
                                  {session.sessionNumber ||
                                    memberSessions.length - idx}
                                </span>
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  {session.date}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {session.time}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs font-medium text-slate-600">
                                  {session.physiotherapistName}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                  Dolor EVA: {session.painLevelEVA}/10
                                </span>
                                {session.improvementStatus && (
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${estadoEvolucion(session.improvementStatus).clase}`}>
                                    {estadoEvolucion(session.improvementStatus).emoji} {estadoEvolucion(session.improvementStatus).l}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Multiple Affected Zones Badges */}
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                Zonas Afectadas Evaluadas ({zones.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {zones.map((zKey, zIdx) => {
                                  const info = ZONE_DETAILS.find(
                                    (item) => item.id === zKey,
                                  );
                                  return (
                                    <span
                                      key={`zone-badge-${session.id || idx}-${zKey}-${zIdx}`}
                                      className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 flex items-center gap-1.5"
                                    >
                                      <Target className="w-3 h-3 text-rose-600" />
                                      <span>{zoneLabel(zKey, session.affectedZoneSides?.[zKey])}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Reason & Posture Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-700 block text-xs uppercase">
                                  Motivo / Diagnóstico:
                                </span>
                                <p className="text-slate-800 truncate">
                                  {session.consultationReason}
                                </p>
                              </div>
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-700 block text-xs uppercase">
                                  Postura Evaluada:
                                </span>
                                <p className="text-slate-800 truncate">
                                  {session.posturalEvaluation ||
                                    "Alineación neutral"}
                                </p>
                              </div>
                            </div>

                            {/* Gym Workout Restrictions Banner */}
                            <div className="bg-rose-50/80 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-900 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="block text-rose-800 text-xs uppercase">
                                  Restricciones en Gimnasio:
                                </strong>
                                <p className="text-slate-800 text-xs font-medium">
                                  {session.gymWorkoutRestrictions}
                                </p>
                              </div>
                            </div>

                            {/* Footer with Actions (Edit, PDF Report, WhatsApp, Delete) */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                              <button
                                onClick={() =>
                                  setExpandedSessionId(
                                    isExpanded ? null : session.id,
                                  )
                                }
                                className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {isExpanded
                                    ? "Ocultar Detalle"
                                    : "Ver Evaluación, Ejercicios & Observaciones"}
                                </span>
                              </button>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleEditSession(session)}
                                  className="flex items-center gap-1 text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer border border-slate-200"
                                  title="Editar esta sesión y sus observaciones"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Editar</span>
                                </button>

                                <button
                                  onClick={() => setReportModalSession(session)}
                                  className="flex items-center gap-1.5 text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer border border-blue-200"
                                  title="Ver ficha clínica, descargar en PDF y compartir"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Reporte PDF</span>
                                </button>

                                <button
                                  onClick={() => setReportModalSession(session)}
                                  className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer border border-emerald-200"
                                  title="Enviar resumen por WhatsApp"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        "¿Estás seguro de eliminar este registro de fisioterapia?",
                                      )
                                    ) {
                                      deletePhysioRecord(session.id);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                                  title="Eliminar registro"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded Clinical Details */}
                            {isExpanded && (
                              <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/80 p-3.5 rounded-xl text-xs">
                                {/* Therapist observations */}
                                {session.additionalObservations &&
                                  session.additionalObservations.length > 0 && (
                                    <div className="space-y-1.5">
                                      <strong className="text-slate-800 text-xs uppercase tracking-wider block">
                                        Observaciones del Fisioterapeuta (
                                        {session.additionalObservations.length}
                                        ):
                                      </strong>
                                      <div className="space-y-1">
                                        {session.additionalObservations.map(
                                          (obs, oIdx) => (
                                            <p
                                              key={`obs-${session.id || idx}-${oIdx}`}
                                              className="bg-white p-2 rounded-lg border border-slate-200 text-slate-700"
                                            >
                                              • {obs}
                                            </p>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Student friendly summary */}
                                {session.patientFriendlySummary && (
                                  <div className="bg-blue-50/80 p-2.5 rounded-lg border border-blue-200 text-blue-900">
                                    <strong className="block text-xs uppercase font-bold mb-0.5">
                                      Explicación para el Alumno:
                                    </strong>
                                    <p className="text-slate-700 leading-relaxed">
                                      {session.patientFriendlySummary}
                                    </p>
                                  </div>
                                )}

                                {/* Exercise dosage cards preview */}
                                {session.exerciseDosage && (
                                  <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                                      <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>
                                        Cartilla de Ejercicios:{" "}
                                        {session.exerciseDosage.customCardTitle}
                                      </span>
                                    </span>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {session.exerciseDosage.customExercises.map(
                                        (ex, exIdx) => (
                                          <div
                                            key={
                                              ex.id
                                                ? `ex-card-${session.id || idx}-${ex.id}`
                                                : `ex-card-${session.id || idx}-${exIdx}`
                                            }
                                            className="bg-white p-2 rounded-lg border border-slate-200 text-xs"
                                          >
                                            <div className="font-bold text-slate-900 flex items-center justify-between">
                                              <span>
                                                {exIdx + 1}. {ex.name}
                                              </span>
                                              <span className="text-emerald-700 font-semibold">
                                                {ex.series}x{ex.repsOrTime}
                                              </span>
                                            </div>
                                            {ex.metodo?.resumen && <p className="text-[11px] font-bold text-violet-700 mt-0.5"><IconoEmoji e="⚙" /> {ex.metodo.resumen}</p>}
                                            {ex.techniqueTips && (
                                              <p className="text-xs text-slate-500 italic mt-0.5">
                                                <IconoEmoji e="💡" /> {ex.techniqueTips}
                                              </p>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
                <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-700">
                  Selecciona un alumno para ver su historial clínico
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR EVALUACIÓN CLÍNICA */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 rd-velo">
          <div className="rd-hoja bg-slate-50 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white px-4 sm:px-8 py-4 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest block">
                    {editingSessionId ? "Editar registro clínico" : "Ficha de valoración fisioterapéutica"}
                  </span>
                  <h3 className="text-lg font-extrabold text-white truncate">
                    {members.find((m) => m.id === formMemberId)?.fullName || "Nueva evaluación"}
                    <span className="text-slate-400 font-semibold text-sm ml-2">
                      {String(formDate || "").split("-").reverse().join("/")} · {formTime}
                    </span>
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Pasos de la evaluación */}
            <div className="bg-white border-b border-slate-200 shrink-0">
              <div className="max-w-[1700px] mx-auto px-4 sm:px-8 flex items-stretch gap-1 overflow-x-auto">
                {PHYSIO_STEPS.map((st, i) => {
                  const active = activeModalTab === st.id;
                  const Icon = st.icon;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setActiveModalTab(st.id)}
                      className={`flex items-center gap-2.5 px-4 py-3.5 border-b-[3px] text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? "border-blue-600 text-blue-900"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                          active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <Icon className="w-4 h-4" />
                      <span>{st.label}</span>
                      {st.id === "anamnesis" && urgentRedFlag && (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Toast Banner */}
            {templateAppliedToast && (
              <div className="bg-emerald-600 text-white text-sm px-4 py-2 font-bold flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>{templateAppliedToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateAppliedToast(null)}
                  className="text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Modal Body / Form */}
            <form
              id="form-evaluacion-fisio"
              onSubmit={handleSaveSession}
              className="flex-1 overflow-y-auto"
            >
              <div className="w-full max-w-[1700px] mx-auto p-3 sm:p-5 space-y-4">
              {/* PASO 1: ANAMNESIS */}
              {activeModalTab === "anamnesis" && (
                <div className="space-y-4">
                  <Card
                    icon={ClipboardList}
                    color="text-blue-700"
                    title="Datos de la consulta"
                    subtitle="Información subjetiva referida por el paciente."
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={LBL}>Paciente *</label>
                        <SelectorAlumno
                          alumnos={members}
                          value={formMemberId}
                          onChange={(id) => setFormMemberId(id)}
                          required
                        />
                        {members.length === 0 && (
                          <p className="text-xs text-amber-700 mt-1">
                            Aún no hay alumnos registrados en el sistema.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className={LBL}>Fecha y hora *</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            required
                            className={INP}
                          />
                          <input
                            type="text"
                            value={formTime}
                            onChange={(e) => setFormTime(e.target.value)}
                            className={`${INP} w-28`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={LBL}>Fisioterapeuta *</label>
                        <input
                          list="lista-fisioterapeutas"
                          value={formPhysioName}
                          onChange={(e) => setFormPhysioName(e.target.value)}
                          required
                          placeholder="Nombre del fisioterapeuta"
                          className={INP}
                        />
                        <datalist id="lista-fisioterapeutas">
                          {availablePhysios.map((p) => (
                            <option key={p} value={p} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className={LBL}>Motivo de consulta *</label>
                        <input
                          type="text"
                          value={formReason}
                          onChange={(e) => setFormReason(e.target.value)}
                          placeholder="Ej. Dolor de hombro derecho al press militar"
                          required
                          className={INP}
                        />
                      </div>
                      <div>
                        <label className={LBL}>Medicación actual</label>
                        <input
                          type="text"
                          value={formMedicationsText}
                          onChange={(e) => setFormMedicationsText(e.target.value)}
                          placeholder="Fármaco, dosis y frecuencia (o «Ninguna»)"
                          className={INP}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className={LBL}>Historia actual y mecanismo de lesión</label>
                      <textarea
                        rows={3}
                        value={formClinicalHistory}
                        onChange={(e) => setFormClinicalHistory(e.target.value)}
                        className={INP}
                        placeholder="¿Cómo y cuándo empezó? Evolución, qué lo agrava y qué lo alivia, tratamientos previos…"
                      />
                    </div>

                    <div className="mt-4">
                      <label className={LBL}>Antecedentes relevantes</label>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_ANTECEDENTS.map((a) => {
                          const on = formMedicalBackground.includes(a);
                          return (
                            <button
                              type="button"
                              key={a}
                              onClick={() =>
                                setFormMedicalBackground((prev) =>
                                  on ? prev.filter((x) => x !== a) : [...prev, a],
                                )
                              }
                              className={`px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-colors ${
                                on
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                              }`}
                            >
                              {on ? "✓ " : ""}
                              {a}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </Card>

                  <BodyMapVisual
                    selectedZones={formZones}
                    zoneSides={formZoneSides}
                    onToggleZone={handleToggleZone}
                    onToggleSide={handleToggleZoneSide}
                    onAddCustomZone={handleAddCustomZone}
                    onRemoveZone={handleRemoveZone}
                  />

                  {/* Diagnóstico presuntivo: patologías por región (primero las de las zonas marcadas) */}
                  <Card icon={Stethoscope} color="text-rose-600" title="Diagnóstico fisioterapéutico presuntivo" subtitle="Elija una o varias patologías. Primero aparecen las de las zonas marcadas en el mapa corporal.">
                    {(() => {
                      const deZona = PATOLOGIAS_POR_REGION.filter((r) => r.zonas.some((z) => formZones.includes(z)));
                      const regiones = verTodasPatologias || !deZona.length ? PATOLOGIAS_POR_REGION : deZona;
                      return (
                        <div className="rd-patologias select-none">
                          {regiones.map((r) => {
                            const tono = PATOLOGIAS_POR_REGION.findIndex((x) => x.region === r.region) % 10;
                            const elegidas = r.items.filter((p) => formPatologias.includes(p)).length;
                            return (
                              <div key={r.region} className={`rd-pat-fila rd-pat-t${tono}`}>
                                <span className="rd-pat-region">
                                  {r.region}
                                  {elegidas > 0 && <b className="rd-pat-cuenta">{elegidas}</b>}
                                </span>
                                <div className="rd-pat-chips">
                                  {r.items.map((p) => {
                                    const on = formPatologias.includes(p);
                                    return (
                                      <button
                                        type="button"
                                        key={p}
                                        aria-pressed={on}
                                        onClick={() => setFormPatologias((prev) => (on ? prev.filter((x) => x !== p) : [...prev, p]))}
                                        className={`rd-pat-chip ${on ? "rd-pat-on" : ""}`}
                                      >
                                        {on ? "✓ " : ""}
                                        {p}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                          {deZona.length > 0 && (
                            <button type="button" onClick={() => setVerTodasPatologias((v) => !v)} className="text-xs font-bold text-rose-700 underline underline-offset-2 cursor-pointer">
                              {verTodasPatologias ? "Ver solo las de las zonas marcadas" : `Ver todas las regiones (${PATOLOGIAS_POR_REGION.length})`}
                            </button>
                          )}
                          {formPatologias.length > 0 && <p className="text-xs text-slate-600">Elegidas: <b>{formPatologias.join(" · ")}</b></p>}
                        </div>
                      );
                    })()}
                  </Card>

                  <ContextoClinico scales={formClinicalScales} set={setScales} />
                  <PainSection scales={formClinicalScales} set={setScales} />
                  <RedFlagsSection scales={formClinicalScales} set={setScales} />
                </div>
              )}

              {/* PASO 2: POSTURA */}
              {activeModalTab === "postura" && (
                <PostureVisualSelector
                  lateralEvaluation={formLateralPosture}
                  onLateralEvaluationChange={setFormLateralPosture}
                  visualKnees={formVisualKnees}
                  onVisualKneesChange={setFormVisualKnees}
                  visualAnkles={formVisualAnkles}
                  onVisualAnklesChange={setFormVisualAnkles}
                  visualComments={formVisualComments}
                  onVisualCommentsChange={setFormVisualComments}
                  selectedFindings={formPostureFindings}
                  onToggleFinding={handleTogglePostureFinding}
                  notes={formPostureNotes}
                  onNotesChange={setFormPostureNotes}
                />
              )}

              {/* PASO 3: EXPLORACIÓN FÍSICA */}
              {activeModalTab === "exploracion" && (
                <div className="space-y-4">
                  <RomSection scales={formClinicalScales} set={setScales} zones={formZones} />
                  <MrcSection scales={formClinicalScales} set={setScales} />
                  <SpecialTestsSection
                    tests={formFunctionalTests}
                    onChange={setFormFunctionalTests}
                    zones={formZones}
                  />
                  <PalpationSection
                    tone={formMuscleTone}
                    onTone={setFormMuscleTone}
                    temp={formTempEdema}
                    onTemp={setFormTempEdema}
                    notes={formTenderZoneNotes}
                    onNotes={setFormTenderZoneNotes}
                  />
                  {(formZones.includes("lumbar") || formClinicalScales.odi.enabled) && (
                    <OdiSection scales={formClinicalScales} set={setScales} />
                  )}
                </div>
              )}

              {/* PASO 4: PLAN DE TRATAMIENTO */}
              {activeModalTab === "plan" && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      [false, "📋", "Solo evaluación", "Hoy se evaluó y no se aplicó tratamiento. Completa abajo las indicaciones para el entrenador y pasa al paso 5."],
                      [true, "🩺", "Sí, apliqué tratamiento", "Registra las técnicas, los ejercicios terapéuticos y el protocolo de Williams."],
                    ].map(([v, ic, t, d]) => {
                      const on = formPlanEnabled === v;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormPlanEnabled(v)}
                          className={`flex items-start gap-3 rounded-2xl border-2 p-3 text-left cursor-pointer transition-colors ${
                            on ? (v ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-800 border-slate-800 text-white") : "bg-white border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <span className="text-2xl leading-none"><IconoEmoji e={ic} /></span>
                          <span className="flex-1">
                            <span className="flex items-center gap-2 text-sm font-black">
                              {t}
                              {on && <span className="px-1.5 py-px rounded-full bg-white/20 text-[10px]">✓ elegido</span>}
                            </span>
                            <span className={`block text-xs mt-0.5 ${on ? "opacity-90" : "text-slate-500"}`}>{d}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {formPlanEnabled ? (
                    <>
                      {/* Resumen del plan: lo que se va registrando */}
                      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-2.5 text-xs">
                        <span className="font-black uppercase tracking-wider text-blue-800">Plan de hoy</span>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-blue-200 font-bold text-slate-700">① {formEditableTreatments.filter((t) => t.applied).length} técnica(s)</span>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-blue-200 font-bold text-slate-700">② {formCustomExercises.length} ejercicio(s)</span>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-blue-200 font-bold text-slate-700">③ Williams: {formWilliamsEval.enabled ? "sí" : "no"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-blue-200 font-bold text-slate-700">④ Indicaciones para el gimnasio</span>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                        <PasoPlan n="1" titulo="Técnicas aplicadas hoy" ayuda="Toca las que usaste. Con «Editar parámetros» anotas dosis o notas." />
                        <div className="flex flex-wrap gap-2">
                          {formEditableTreatments.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              title={t.dosage}
                              onClick={() =>
                                setFormEditableTreatments((prev) => prev.map((x) => (x.id === t.id ? { ...x, applied: !x.applied } : x)))
                              }
                              className={`px-3 py-1.5 rounded-full border text-sm font-semibold cursor-pointer transition-colors ${
                                t.applied ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                              }`}
                            >
                              {t.applied && <Check className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />}
                              {t.name}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={nuevaTecnica}
                            onChange={(e) => setNuevaTecnica(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (!nuevaTecnica.trim()) return;
                                setFormEditableTreatments((prev) => [
                                  ...prev,
                                  { id: `trt-${Date.now()}`, name: nuevaTecnica.trim(), category: "terapia_manual", dosage: "", notes: "", applied: true },
                                ]);
                                setNuevaTecnica("");
                              }
                            }}
                            placeholder="Otra técnica + Enter (ej. Ultrasonido 1 MHz)"
                            className="flex-1 min-w-[220px] text-sm p-2 rounded-xl border border-slate-300"
                          />
                          <button
                            type="button"
                            onClick={() => setVerParametros((v) => !v)}
                            className="text-sm font-semibold text-blue-700 cursor-pointer"
                          >
                            {verParametros ? "Ocultar parámetros" : "Editar parámetros (dosis, notas)"}
                          </button>
                        </div>
                      </div>
                      {verParametros && (
                        <EditableTreatments
                    treatments={formEditableTreatments}
                    onChange={setFormEditableTreatments}
                  />
                      )}
                      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                        <PasoPlan n="2" titulo="Ejercicios terapéuticos" ayuda="Opcional. Elige del banco (derecha) y ajusta series y repeticiones (izquierda). El alumno los verá en su portal." />
                        <div>
                  <ExercisePrescriptionCard
                    exercises={formCustomExercises}
                    onChange={setFormCustomExercises}
                    cardTitle={formCardTitle}
                    onCardTitleChange={setFormCardTitle}
                    cardFrequency={formCardFrequency}
                    onCardFrequencyChange={setFormCardFrequency}
                  />
                        </div>
                      </section>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                    <PasoPlan n="3" titulo="Protocolo de Williams" ayuda="Solo si hay dolor lumbar extensor o facetario." />
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formWilliamsEval.enabled}
                        onChange={(e) =>
                          setFormWilliamsEval((prev) => ({ ...prev, enabled: e.target.checked }))
                        }
                        className="w-5 h-5 accent-blue-600"
                      />
                      <span>
                        <span className="block text-base font-extrabold text-slate-900">
                          Incluir protocolo de Williams (flexión lumbar)
                        </span>
                        <span className="text-sm text-slate-500">
                          Serie de ejercicios para dolor lumbar con componente extensor / facetario.
                        </span>
                      </span>
                    </label>
                    {formWilliamsEval.enabled && (
                      <div className="mt-4">
                        <WilliamsVisuals williamsEval={formWilliamsEval} onChange={setFormWilliamsEval} />
                      </div>
                    )}
                  </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                      Solo evaluación: no se registrará tratamiento. Las indicaciones para el alumno se eligen en el paso 5.
                    </div>
                  )}

                  <div>
                  <Card
                    icon={Dumbbell}
                    color="text-emerald-700"
                    title={`${formPlanEnabled ? "④ " : ""}Indicaciones para el entrenador del gimnasio`}
                    subtitle="Qué puede y qué debe evitar en sala, y la carga máxima. El entrenador lo ve (solo lectura) en Rutinas asignadas."
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className={`${LBL} text-emerald-700`}>Ejercicios permitidos</label>
                        <textarea
                          rows={2}
                          value={formAllowedExercises}
                          onChange={(e) => setFormAllowedExercises(e.target.value)}
                          placeholder="Separados por coma. Ej. Bicicleta, prensa 45° sin dolor, remo en máquina"
                          className={INP}
                        />
                      </div>
                      <div>
                        <label className={`${LBL} text-rose-700`}>Ejercicios a evitar</label>
                        <textarea
                          rows={2}
                          value={formProhibitedExercises}
                          onChange={(e) => setFormProhibitedExercises(e.target.value)}
                          placeholder="Separados por coma. Ej. Press militar, dominadas, fondos"
                          className={INP}
                        />
                      </div>
                      <div>
                        <label className={LBL}>Fase de carga</label>
                        <select
                          value={formProgressivePhase}
                          onChange={(e) => setFormProgressivePhase(e.target.value)}
                          className={INP}
                        >
                          <option value="descarga_isometrico">Fase 1 · Protección / isométricos</option>
                          <option value="carga_controlada">Fase 2 · Carga progresiva controlada</option>
                          <option value="fuerza_funcional">Fase 3 · Fuerza y control funcional</option>
                          <option value="retorno_deportivo">Fase 4 · Retorno al entrenamiento completo</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={LBL}>Carga máx. (kg)</label>
                          <CampoNumero
                            type="number"
                            min="0"
                            value={formMaxKg}
                            onChange={(e) => setFormMaxKg(Number(e.target.value))}
                            className={INP}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={LBL}>Criterio para progresar</label>
                          <input
                            type="text"
                            value={formProgressionCriteria}
                            onChange={(e) => setFormProgressionCriteria(e.target.value)}
                            placeholder="Ej. Dolor ≤ 2/10 durante y 24 h después"
                            className={INP}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                  </div>
                </div>
              )}

              {/* PASO 5: EVOLUCIÓN E INDICACIONES */}
              {activeModalTab === "evolucion" && (
                <div className="space-y-4">
                  <div className="space-y-2 bg-white rounded-2xl border border-slate-200 p-4">
                    <PasoPlan n="1" titulo="Ejercicios e indicaciones para casa" ayuda="Estiramientos 3 × 30 s, movilidad 2 × 15, postura y cuidados. Arriba lo indicado, abajo el catálogo. El alumno lo ve en Mi Rutina y el entrenador en Rutinas asignadas." />
                    <SelectorIndicaciones
                      horizontal
                      items={formIndicaciones}
                      onChange={setFormIndicaciones}
                      sinNotas
                      titulo="Indicado en esta evaluación"
                      sugerencias={sugerirIndicaciones({
                        hallazgos: [
                          ...derivePostureFindings(formLateralPosture, formVisualKnees, formVisualAnkles),
                          ...formPostureFindings,
                        ],
                        zonas: formZones,
                        dolor: formClinicalScales?.pain?.actual ?? formPainEVA,
                      })}
                    />
                  </div>

                  <Card
                    icon={TrendingUp}
                    color="text-blue-700"
                    title="② Evolución, pronóstico y próximo control"
                    subtitle="Compara con la sesión anterior y define cuántas sesiones necesita."
                  >
                    {(() => {
                      const previa = physioRecords
                        .filter((r) => r.memberId === formMemberId && r.id !== editingSessionId)
                        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))[0];
                      const ahora = formClinicalScales?.pain?.actual ?? formPainEVA ?? 0;
                      if (!previa) return null;
                      const dif = (previa.painLevelEVA ?? 0) - ahora;
                      return (
                        <div className={`mb-4 rounded-xl border px-3 py-2 text-sm flex flex-wrap items-center gap-3 ${dif > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : dif < 0 ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                          <span>Sesión anterior ({previa.date}): dolor <b>{previa.painLevelEVA ?? "—"}/10</b></span>
                          <span>→ hoy <b>{ahora}/10</b></span>
                          <span className="font-bold">{dif > 0 ? `Bajó ${dif} punto(s) 👏` : dif < 0 ? `Subió ${-dif} punto(s)` : "Igual"}</span>
                        </div>
                      );
                    })()}
                    <label className={LBL}>Estado respecto a la sesión anterior</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {ESTADOS_EVOLUCION.map((e) => (
                        <button
                          key={e.v}
                          type="button"
                          onClick={() => setFormImprovementStatus(e.v)}
                          title={e.d}
                          className={`px-3 py-1.5 rounded-full border text-sm font-semibold cursor-pointer transition-colors ${
                            formImprovementStatus === e.v ? `${e.clase} ring-2 ring-offset-1 ring-blue-400` : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                          }`}
                        >
                          <IconoEmoji e={e.emoji} /> {e.l}
                          {e.d && <span className="opacity-70 font-normal"> · {e.d}</span>}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className={LBL}>¿Cumple los ejercicios en casa?</label>
                        <div className="flex flex-wrap gap-1.5">
                          {ADHERENCIA.map((a) => (
                            <button key={a.v} type="button" onClick={() => setFormAdherencia(a.v)} className={`px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer ${formAdherencia === a.v ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                              <IconoEmoji e={a.emoji} /> {a.l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={LBL}>Pronóstico</label>
                        <div className="flex flex-wrap gap-1.5">
                          {PRONOSTICO.map((a) => (
                            <button key={a.v} type="button" onClick={() => setFormPronostico(formPronostico === a.v ? "" : a.v)} className={`px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer ${formPronostico === a.v ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                              <IconoEmoji e={a.emoji} /> {a.l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={LBL}>Frecuencia de sesiones recomendada</label>
                        <div className="flex flex-wrap gap-1.5">
                          {FRECUENCIA_SESIONES.map((f) => (
                            <button key={f} type="button" onClick={() => setFormFrecuenciaSesiones(formFrecuenciaSesiones === f ? "" : f)} className={`px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer ${formFrecuenciaSesiones === f ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={LBL}>Sesiones estimadas</label>
                          <CampoNumero type="number" min="1" max="60" value={formSesionesEstimadas} onChange={(e) => setFormSesionesEstimadas(e.target.value)} placeholder="Ej. 8" className={INP} />
                        </div>
                        <div>
                          <label className={LBL}>Próximo control</label>
                          <input type="date" value={formNextAppt} onChange={(e) => setFormNextAppt(e.target.value)} className={INP} />
                        </div>
                      </div>
                      <div className="lg:col-span-2">
                        <label className={LBL}>Objetivo para la próxima sesión</label>
                        <input value={formObjetivoCorto} onChange={(e) => setFormObjetivoCorto(e.target.value)} placeholder="Ej. Dolor ≤ 3/10 al agacharse y flexión de cadera completa" className={INP} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className={LBL}>Respuesta al tratamiento</label>
                      <textarea
                        rows={2}
                        value={formEvolutionNotes}
                        onChange={(e) => setFormEvolutionNotes(e.target.value)}
                        placeholder="Cómo respondió el paciente en la sesión, cambios respecto a la anterior…"
                        className={INP}
                      />
                    </div>
                  </Card>

                  <Card
                    icon={Edit3}
                    color="text-indigo-600"
                    title="③ Observaciones clínicas"
                    subtitle="Hallazgos o notas que saldrán en el informe."
                    right={
                      <span className="text-sm font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full">
                        {formAdditionalObservations.length}
                      </span>
                    }
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Escriba una observación y presione Enter"
                        value={newObservationInput}
                        onChange={(e) => setNewObservationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddObservation();
                          }
                        }}
                        className={INP}
                      />
                      <button
                        type="button"
                        onClick={handleAddObservation}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" /> Agregar
                      </button>
                    </div>
                    <div className="space-y-2 mt-3">
                      {formAdditionalObservations.map((obs, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                        >
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={obs}
                            onChange={(e) => handleEditObservation(idx, e.target.value)}
                            className="flex-1 bg-transparent text-sm text-slate-800 focus:outline-none focus:bg-white rounded px-1.5 py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveObservation(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card
                    icon={Info}
                    color="text-cyan-700"
                    title="④ Explicación para el alumno (opcional)"
                    subtitle="En palabras sencillas: qué tiene y qué debe cuidar. La verá en su portal y en su reporte."
                    right={
                      <button
                        type="button"
                        onClick={handleAutoSummary}
                        className="text-sm font-bold text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-lg border border-cyan-300 hover:bg-cyan-100 cursor-pointer"
                      >
                        Generar a partir de la evaluación
                      </button>
                    }
                  >
                    <textarea
                      rows={4}
                      value={formPatientFriendlySummary}
                      onChange={(e) => setFormPatientFriendlySummary(e.target.value)}
                      placeholder="Explique qué tiene, qué debe evitar y qué hacer en casa…"
                      className={INP}
                    />
                  </Card>

                </div>
              )}

              </div>

              {/* Barra de acciones fija */}
              <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t border-slate-200">
                <div className="max-w-[1700px] mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={stepIndex === 0}
                      onClick={() => setActiveModalTab(PHYSIO_STEPS[stepIndex - 1].id)}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      ← Anterior
                    </button>
                    <button
                      type="button"
                      disabled={stepIndex === PHYSIO_STEPS.length - 1}
                      onClick={() => setActiveModalTab(PHYSIO_STEPS[stepIndex + 1].id)}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
                    >
                      Siguiente →
                    </button>
                    <span className="hidden md:inline text-sm text-slate-500 ml-2">
                      Paso {stepIndex + 1} de {PHYSIO_STEPS.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => setIsNewSessionModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handlePreviewCurrentPDF}
                      className="flex items-center gap-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Vista previa PDF
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      {editingSessionId ? "Guardar cambios" : "Guardar evaluación"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GUARDAR CONFIGURACIÓN ACTUAL COMO NUEVA PLANTILLA */}
      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <div className="w-full max-w-3xl mx-auto min-h-full bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookmarkPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  Guardar como Plantilla de Evaluación
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveCurrentAsTemplate}
              className="p-5 space-y-4 text-xs"
            >
              <p className="text-slate-600">
                Se guardarán las zonas afectadas seleccionadas (
                {formZones.length}), pruebas ortopédicas (
                {formFunctionalTests.length}), dosificación de ejercicios (
                {formCustomExercises.length}) y observaciones para reutilizarlas
                en nuevas fichas clínicas.
              </p>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-xs">
                  Nombre de la Plantilla *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Protocolo Lumbar & Estabilidad Core"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-xs">
                  Categoría Clínica
                </label>
                <select
                  value={templateCategoryInput}
                  onChange={(e) => setTemplateCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                >
                  <option value="Columna & Tronco">
                    Columna & Tronco (Lumbar, Dorsal, Pelvis)
                  </option>
                  <option value="Cervical & Hombro">
                    Cervical & Hombro (Manguito, Trapecio)
                  </option>
                  <option value="Miembro Superior">
                    Miembro Superior (Muñeca, Codo, Mano)
                  </option>
                  <option value="Miembro Inferior">
                    Miembro Inferior (Rodilla, Tobillo, Cadera)
                  </option>
                  <option value="Readaptación Deportiva">
                    Readaptación Deportiva & Retorno a Cargas
                  </option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-xs">
                  Descripción o Criterio Clínico
                </label>
                <textarea
                  rows={2}
                  placeholder="Indicaciones para cuándo aplicar esta plantilla..."
                  value={templateDescInput}
                  onChange={(e) => setTemplateDescInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Plantilla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPORTE CLÍNICO ILUSTRADO & DESCARGA EN PDF */}
      {reportModalSession && (
        <PhysioReportModal
          session={reportModalSession}
          member={members.find((m) => m.id === reportModalSession.memberId)}
          onClose={() => setReportModalSession(null)}
        />
      )}
    </div>
  );
};
