// Sistemas de entrenamiento y configuración de un ejercicio.
// El MISMO módulo lo usan el creador de rutinas (entrenador) y los ejercicios
// terapéuticos (fisioterapia): series, repeticiones, descanso con chips,
// esfuerzo y el "Sistema de entrenamiento" (biserie, rest-pause, tempo, HIIT…).
//
// Cada ejercicio guarda `metodo`: { tipo, params, grupo?, resumen }
//  - tipo: clave de SISTEMAS
//  - params: valores propios del sistema (peso, reps, segundos…)
//  - grupo: letra que une ejercicios combinados (A, B…) → se muestran A1, A2
//  - resumen: texto corto ya armado (para imprimir, PDF y la base de datos)
import React, { useMemo, useState } from "react";
import { ChevronDown, Minus, Plus, Settings2, X } from "lucide-react";

// ---------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------
// Colores literales (Tailwind los incluye) y con reglas de modo oscuro en index.css
const COLOR = {
  slate: { chip: "bg-slate-100 text-slate-800 border-slate-300", on: "bg-blue-600 text-white border-blue-600", caja: "bg-slate-50 border-slate-200", texto: "text-slate-700" },
  violet: { chip: "bg-violet-50 text-violet-800 border-violet-200", on: "bg-violet-600 text-white border-violet-600", caja: "bg-violet-50 border-violet-200", texto: "text-violet-700" },
  rose: { chip: "bg-rose-50 text-rose-800 border-rose-200", on: "bg-rose-600 text-white border-rose-600", caja: "bg-rose-50 border-rose-200", texto: "text-rose-700" },
  sky: { chip: "bg-sky-50 text-sky-800 border-sky-200", on: "bg-sky-600 text-white border-sky-600", caja: "bg-sky-50 border-sky-200", texto: "text-sky-700" },
  orange: { chip: "bg-orange-50 text-orange-800 border-orange-200", on: "bg-orange-600 text-white border-orange-600", caja: "bg-orange-50 border-orange-200", texto: "text-orange-700" },
  amber: { chip: "bg-amber-50 text-amber-800 border-amber-200", on: "bg-amber-600 text-white border-amber-600", caja: "bg-amber-50 border-amber-200", texto: "text-amber-700" },
  teal: { chip: "bg-teal-50 text-teal-700 border-teal-200", on: "bg-teal-600 text-white border-teal-600", caja: "bg-teal-50 border-teal-200", texto: "text-teal-700" },
  indigo: { chip: "bg-indigo-50 text-indigo-800 border-indigo-200", on: "bg-indigo-600 text-white border-indigo-600", caja: "bg-indigo-50 border-indigo-200", texto: "text-indigo-700" },
  emerald: { chip: "bg-emerald-50 text-emerald-800 border-emerald-200", on: "bg-emerald-600 text-white border-emerald-600", caja: "bg-emerald-50 border-emerald-200", texto: "text-emerald-700" },
  pink: { chip: "bg-pink-50 text-pink-800 border-pink-200", on: "bg-pink-600 text-white border-pink-600", caja: "bg-pink-50 border-pink-200", texto: "text-pink-700" },
};

export const FAMILIAS = [
  { id: "base", nombre: "Clásico", color: "slate" },
  { id: "combinar", nombre: "Combinar ejercicios", color: "violet" },
  { id: "intensidad", nombre: "Técnicas de intensidad", color: "rose" },
  { id: "fuerza", nombre: "Fuerza y volumen", color: "indigo" },
  { id: "control", nombre: "Tempo y control", color: "sky" },
  { id: "metabolico", nombre: "Funcional / metabólico", color: "orange" },
  { id: "cardio", nombre: "Cardio y resistencia", color: "pink" },
  { id: "potencia", nombre: "Potencia", color: "amber" },
  { id: "terapeutico", nombre: "Terapéutico / rehabilitación", color: "emerald" },
];

// p = parámetro: [clave, etiqueta, tipo ("n" número | "t" texto), valor por defecto, sufijo]
export const SISTEMAS = {
  normal: { nombre: "Series normales", icono: "🏋️", familia: "base", desc: "Series y repeticiones con su descanso. Lo de siempre.", p: [] },
  superserie: {
    nombre: "Superserie", icono: "🔁", familia: "combinar", agrupa: [2, 2],
    desc: "2 ejercicios de músculos opuestos (ej. bíceps + tríceps) seguidos, sin descanso entre ellos.",
    p: [["descansoEntre", "Descanso entre ejercicios", "n", 0, "s"]],
  },
  biserie: {
    nombre: "Biserie", icono: "✌️", familia: "combinar", agrupa: [2, 2],
    desc: "2 ejercicios seguidos sin descanso; se descansa al terminar los dos.",
    p: [["descansoEntre", "Descanso entre ejercicios", "n", 0, "s"]],
  },
  triserie: {
    nombre: "Triserie", icono: "🔺", familia: "combinar", agrupa: [3, 3],
    desc: "3 ejercicios seguidos sin descanso; se descansa al terminar los tres.",
    p: [["descansoEntre", "Descanso entre ejercicios", "n", 0, "s"]],
  },
  circuito: {
    nombre: "Circuito", icono: "🔄", familia: "combinar", agrupa: [4, 8],
    desc: "4 a 6 ejercicios (o más) uno tras otro. Al terminar la vuelta se descansa y se repite.",
    p: [
      ["rondas", "Vueltas", "n", 3, ""],
      ["trabajo", "Trabajo por estación", "n", 40, "s"],
      ["descansoEstacion", "Pausa entre estaciones", "n", 15, "s"],
      ["descansoRonda", "Descanso entre vueltas", "n", 90, "s"],
    ],
  },
  rest_pause: {
    nombre: "Rest-pause", icono: "⏸️", familia: "intensidad",
    desc: "Una serie casi al fallo, pausa corta (10-20 s) y mini-series con el mismo peso.",
    p: [
      ["reps1", "Reps de la 1.ª serie", "t", "8", ""],
      ["pausa", "Pausa", "n", 15, "s"],
      ["mini", "Mini-series", "n", 2, ""],
      ["repsMini", "Reps de cada mini-serie", "t", "3-2", ""],
    ],
  },
  drop_set: {
    nombre: "Drop set", icono: "⬇️", familia: "intensidad",
    desc: "Al llegar al fallo se baja el peso y se sigue sin descanso.",
    p: [
      ["bajadas", "Bajadas", "n", 2, ""],
      ["porcentaje", "Cuánto bajar", "n", 20, "%"],
      ["repsMin", "Reps con el peso mínimo", "t", "al fallo", ""],
    ],
  },
  piramide_asc: {
    nombre: "Pirámide ascendente", icono: "📈", familia: "intensidad",
    desc: "Cada serie sube el peso y baja las repeticiones.",
    p: [["secuencia", "Reps por serie", "t", "12-10-8-6", ""]],
  },
  piramide_desc: {
    nombre: "Pirámide descendente", icono: "📉", familia: "intensidad",
    desc: "Se empieza pesado con pocas reps y cada serie baja el peso y sube las reps.",
    p: [["secuencia", "Reps por serie", "t", "6-8-10-12", ""]],
  },
  cluster: {
    nombre: "Cluster", icono: "🧩", familia: "intensidad",
    desc: "La serie se parte en bloques cortos con micro-pausas para mover más peso.",
    p: [["repsBloque", "Reps por bloque", "n", 3, ""], ["bloques", "Bloques", "n", 4, ""], ["pausa", "Micro-pausa", "n", 20, "s"]],
  },
  parciales: {
    nombre: "21s / parciales", icono: "✂️", familia: "intensidad",
    desc: "7 reps en la mitad baja, 7 en la mitad alta y 7 completas.",
    p: [["esquema", "Esquema", "t", "7 + 7 + 7", ""]],
  },
  negativas: {
    nombre: "Negativas (excéntricas)", icono: "🐢", familia: "control",
    desc: "Se enfatiza la bajada lenta; la subida puede ser con ayuda.",
    p: [["excentrica", "Bajada", "n", 4, "s"], ["ayuda", "Subida", "t", "con ayuda del compañero", ""]],
  },
  positivas: {
    nombre: "Positivas (concéntricas)", icono: "🚀", familia: "control",
    desc: "Se enfatiza la subida con intención y la bajada se controla o se asiste.",
    p: [["concentrica", "Subida", "n", 1, "s"], ["bajada", "Bajada", "t", "controlada", ""]],
  },
  tempo: {
    nombre: "Tempo", icono: "⏱️", familia: "control",
    desc: "Segundos en cada fase: bajada (excéntrica) · pausa abajo (isométrica) · subida (concéntrica) · pausa arriba.",
    p: [["exc", "Bajada", "n", 3, "s"], ["iso", "Pausa abajo", "n", 1, "s"], ["con", "Subida", "n", 1, "s"], ["arriba", "Pausa arriba", "n", 0, "s"]],
  },
  isometrico: {
    nombre: "Isométrico", icono: "🧱", familia: "control",
    desc: "Mantener la posición sin moverse (plancha, sentadilla en pared…).",
    p: [["segundos", "Mantener", "n", 30, "s"], ["posicion", "Posición / ángulo", "t", "", ""]],
  },
  hiit: {
    nombre: "HIIT trabajo / descanso", icono: "🔥", familia: "metabolico",
    desc: "Intervalos de trabajo intenso y descanso corto (ej. 1 min trabajo / 20 s descanso).",
    p: [["trabajo", "Trabajo", "n", 60, "s"], ["descanso", "Descanso", "n", 20, "s"], ["rondas", "Rondas", "n", 6, ""]],
  },
  tabata: {
    nombre: "Tabata", icono: "⚡", familia: "metabolico",
    desc: "8 rondas de 20 s a tope y 10 s de descanso (4 minutos).",
    p: [["trabajo", "Trabajo", "n", 20, "s"], ["descanso", "Descanso", "n", 10, "s"], ["rondas", "Rondas", "n", 8, ""]],
  },
  emom: {
    nombre: "EMOM", icono: "🕐", familia: "metabolico",
    desc: "Cada minuto se hacen las reps indicadas; lo que sobra del minuto es descanso.",
    p: [["minutos", "Minutos", "n", 10, "min"], ["repsMinuto", "Reps por minuto", "t", "10", ""]],
  },
  amrap: {
    nombre: "AMRAP", icono: "♾️", familia: "metabolico",
    desc: "Tantas rondas o reps como se pueda en el tiempo indicado.",
    p: [["minutos", "Tiempo", "n", 12, "min"], ["meta", "Meta", "t", "máximas rondas", ""]],
  },
  pliometria: {
    nombre: "Pliometría / explosivo", icono: "🦘", familia: "potencia",
    desc: "Saltos y lanzamientos a máxima velocidad, con descanso completo.",
    p: [["contactos", "Saltos / contactos", "n", 10, ""], ["altura", "Altura del cajón", "n", "", "cm"], ["descansoCompleto", "Descanso completo", "n", 90, "s"]],
  },
  halterofilia: {
    nombre: "Halterofilia (% 1RM)", icono: "🏅", familia: "potencia",
    desc: "Carga según el máximo (1RM): fases explosivas, recepción y control excéntrico.",
    p: [["pct", "% del 1RM", "n", 75, "%"], ["fase", "Fase / complejo", "t", "tirón + recepción", ""]],
  },
  velocidad: {
    nombre: "Potencia / velocidad", icono: "💨", familia: "potencia",
    desc: "Carga ligera-media movida a la máxima velocidad posible.",
    p: [["pct", "Carga", "n", 40, "% 1RM"], ["intencion", "Indicación", "t", "máxima velocidad en la subida", ""]],
  },
  // ---------- Combinar (más) ----------
  serie_gigante: {
    nombre: "Serie gigante", icono: "🦍", familia: "combinar", agrupa: [4, 6],
    desc: "4 o más ejercicios del MISMO músculo seguidos, sin descanso entre ellos.",
    p: [["rondas", "Vueltas", "n", 3, ""], ["descansoRonda", "Descanso entre vueltas", "n", 120, "s"]],
  },
  superserie_compuesta: {
    nombre: "Superserie compuesta", icono: "🎯", familia: "combinar", agrupa: [2, 2],
    desc: "2 ejercicios del mismo músculo seguidos (ej. press banca + aperturas).",
    p: [["descansoEntre", "Descanso entre ejercicios", "n", 0, "s"]],
  },
  pre_agotamiento: {
    nombre: "Pre-agotamiento", icono: "🔋", familia: "combinar", agrupa: [2, 2],
    desc: "Primero un ejercicio aislado y enseguida uno compuesto del mismo músculo (ej. extensión de cuádriceps + sentadilla).",
    p: [["descansoEntre", "Descanso entre ejercicios", "n", 0, "s"]],
  },
  post_agotamiento: {
    nombre: "Post-agotamiento", icono: "🪫", familia: "combinar", agrupa: [2, 2],
    desc: "Primero el compuesto pesado y luego el aislado para terminar el músculo.",
    p: [["descansoEntre", "Descanso entre ejercicios", "n", 0, "s"]],
  },
  contraste: {
    nombre: "Contraste / complejo (PAP)", icono: "⚡", familia: "combinar", agrupa: [2, 2],
    desc: "Un ejercicio pesado y luego uno explosivo similar (ej. sentadilla + salto al cajón) para potenciar el segundo.",
    p: [["pct", "Carga del pesado", "n", 85, "% 1RM"], ["descansoEntre", "Pausa entre ambos", "n", 30, "s"]],
  },
  // ---------- Intensidad (más) ----------
  forzadas: {
    nombre: "Repeticiones forzadas", icono: "🤝", familia: "intensidad",
    desc: "Al llegar al fallo, el compañero ayuda lo justo para 2-3 repeticiones más.",
    p: [["extra", "Reps forzadas", "t", "2-3", ""]],
  },
  myo_reps: {
    nombre: "Myo-reps", icono: "🔂", familia: "intensidad",
    desc: "Serie de activación de 12-20 reps; luego mini-series de 3-5 reps con 3-5 respiraciones de pausa.",
    p: [["activacion", "Serie de activación", "t", "15", "reps"], ["mini", "Mini-series", "n", 4, ""], ["repsMini", "Reps por mini-serie", "t", "4", ""], ["pausa", "Pausa", "n", 5, "s"]],
  },
  drop_mecanico: {
    nombre: "Drop set mecánico", icono: "🔀", familia: "intensidad",
    desc: "Mismo peso, pero se cambia a una variante más fácil al llegar al fallo (ej. inclinado → plano → declinado).",
    p: [["variantes", "Variantes", "t", "difícil → media → fácil", ""]],
  },
  fallo: {
    nombre: "Serie al fallo", icono: "🧨", familia: "intensidad",
    desc: "La última serie se lleva al fallo técnico (sin perder la técnica).",
    p: [["cual", "Serie al fallo", "t", "la última", ""]],
  },
  uno_y_medio: {
    nombre: "Repeticiones 1½", icono: "1½", familia: "intensidad",
    desc: "Bajada completa, media subida, otra vez abajo y subida completa = 1 rep.",
    p: [["reps", "Reps", "t", "8", ""]],
  },
  // ---------- Fuerza y volumen ----------
  cinco_por_cinco: {
    nombre: "5 × 5", icono: "🖐️", familia: "fuerza",
    desc: "5 series de 5 reps con el mismo peso pesado; descanso largo.",
    p: [["pct", "Carga", "n", 80, "% 1RM"], ["descansoLargo", "Descanso", "n", 180, "s"]],
  },
  gvt: {
    nombre: "Volumen alemán 10 × 10", icono: "🇩🇪", familia: "fuerza",
    desc: "10 series de 10 reps con ~60% del 1RM y 60-90 s de descanso.",
    p: [["pct", "Carga", "n", 60, "% 1RM"]],
  },
  ondulante: {
    nombre: "Ondulante / oleadas", icono: "🌊", familia: "fuerza",
    desc: "Oleadas de repeticiones decrecientes y cargas crecientes (ej. 3-2-1, 3-2-1).",
    p: [["ola", "Oleada", "t", "3-2-1", "reps"], ["olas", "Oleadas", "n", 2, ""]],
  },
  rpe_top: {
    nombre: "Top set + back-off", icono: "🔝", familia: "fuerza",
    desc: "Una serie pesada principal y después series más ligeras (-10/15%).",
    p: [["top", "Serie principal", "t", "1 × 3 @ RPE 8", ""], ["backoff", "Series ligeras", "t", "3 × 5 al -10%", ""]],
  },
  doble_progresion: {
    nombre: "Doble progresión", icono: "📶", familia: "fuerza",
    desc: "Se suben reps dentro del rango; al llegar al tope se sube el peso y se vuelve al mínimo.",
    p: [["rango", "Rango de reps", "t", "8-12", ""], ["subir", "Al llegar al tope", "t", "subir un poco el peso", ""]],
  },
  resistencia_variable: {
    nombre: "Bandas / cadenas", icono: "⛓️", familia: "fuerza",
    desc: "Resistencia que aumenta al subir (bandas elásticas o cadenas sobre la barra).",
    p: [["accesorio", "Accesorio", "t", "banda media", ""]],
  },
  // ---------- Control (más) ----------
  pausa_reps: {
    nombre: "Repeticiones con pausa", icono: "⏯️", familia: "control",
    desc: "Pausa quieta en el punto más difícil (ej. 2 s abajo en la sentadilla), sin rebote.",
    p: [["pausa", "Pausa", "n", 2, "s"], ["donde", "Dónde", "t", "abajo", ""]],
  },
  tut: {
    nombre: "Tiempo bajo tensión", icono: "⌛", familia: "control",
    desc: "La serie dura un tiempo objetivo con movimiento lento y continuo.",
    p: [["segundos", "Duración de la serie", "n", 40, "s"]],
  },
  iso_maximo: {
    nombre: "Isométrico de empuje", icono: "🪨", familia: "control",
    desc: "Empujar o jalar contra algo fijo con máxima intención (isométrico de superación).",
    p: [["segundos", "Empuje", "n", 6, "s"], ["repeticiones", "Repeticiones", "n", 5, ""]],
  },
  // ---------- Metabólico (más) ----------
  for_time: {
    nombre: "Por tiempo (For time)", icono: "🏁", familia: "metabolico",
    desc: "Completar el trabajo lo más rápido posible; se anota el tiempo.",
    p: [["trabajo", "Trabajo", "t", "3 rondas", ""], ["limite", "Tiempo límite", "n", 15, "min"]],
  },
  escalera: {
    nombre: "Escalera", icono: "🪜", familia: "metabolico",
    desc: "Las reps suben (o bajan) cada ronda: 1-2-3-4… o 10-9-8…",
    p: [["secuencia", "Secuencia", "t", "1-2-3-4-5-6-7-8-9-10", ""]],
  },
  chipper: {
    nombre: "Chipper", icono: "🪓", familia: "metabolico",
    desc: "Una lista larga de ejercicios con muchas reps, se hace una sola vez de corrido.",
    p: [["reps", "Reps por ejercicio", "t", "50-40-30-20-10", ""]],
  },
  death_by: {
    nombre: "Death by…", icono: "💀", familia: "metabolico",
    desc: "Minuto 1: 1 rep, minuto 2: 2 reps… hasta no poder completar el minuto.",
    p: [["incremento", "Aumentar por minuto", "n", 1, "rep"]],
  },
  intervalos_dist: {
    nombre: "Intervalos por distancia", icono: "📏", familia: "metabolico",
    desc: "Tramos de distancia a ritmo alto con pausa (ej. 8 × 200 m).",
    p: [["tramos", "Tramos", "n", 8, ""], ["distancia", "Distancia", "n", 200, "m"], ["descanso", "Descanso", "n", 60, "s"]],
  },
  // ---------- Cardio y resistencia ----------
  continuo: {
    nombre: "Continuo zona 2 (LISS)", icono: "🚶", familia: "cardio",
    desc: "Ritmo cómodo y sostenido, se puede conversar (60-70% FC máx).",
    p: [["minutos", "Duración", "n", 30, "min"], ["fc", "Frecuencia cardiaca", "t", "60-70% FC máx", ""]],
  },
  fartlek: {
    nombre: "Fartlek", icono: "🎢", familia: "cardio",
    desc: "Cambios de ritmo libres durante el trabajo continuo.",
    p: [["minutos", "Duración", "n", 25, "min"], ["cambios", "Cambios", "t", "30 s rápido cada 3 min", ""]],
  },
  noruego_4x4: {
    nombre: "Intervalos 4 × 4", icono: "🫀", familia: "cardio",
    desc: "4 bloques de 4 min al 85-95% FC máx con 3 min de recuperación activa.",
    p: [["bloques", "Bloques", "n", 4, ""], ["trabajo", "Trabajo", "n", 4, "min"], ["recuperacion", "Recuperación", "n", 3, "min"]],
  },
  progresivo: {
    nombre: "Progresivo", icono: "📈", familia: "cardio",
    desc: "Se empieza suave y se sube el ritmo cada cierto tiempo.",
    p: [["minutos", "Duración", "n", 20, "min"], ["subir", "Subir ritmo cada", "n", 5, "min"]],
  },
  // ---------- Potencia (más) ----------
  balistico: {
    nombre: "Balístico / lanzamientos", icono: "🏐", familia: "potencia",
    desc: "Lanzar o soltar la carga (balón medicinal, kettlebell swing) a máxima potencia.",
    p: [["reps", "Lanzamientos", "n", 6, ""], ["carga", "Carga", "t", "balón ligero o medio", ""]],
  },
  sprint: {
    nombre: "Sprints / aceleraciones", icono: "🏃", familia: "potencia",
    desc: "Arranques cortos al 100% con recuperación completa.",
    p: [["tramos", "Sprints", "n", 6, ""], ["distancia", "Distancia", "n", 20, "m"], ["descanso", "Descanso", "n", 90, "s"]],
  },
  // ---------- Terapéutico / rehabilitación ----------
  iso_analgesico: {
    nombre: "Isométrico analgésico", icono: "🩹", familia: "terapeutico",
    desc: "Contracciones sostenidas para bajar el dolor del tendón (ej. 5 × 45 s al 70%).",
    p: [["segundos", "Mantener", "n", 45, "s"], ["intensidad", "Intensidad", "t", "70% esfuerzo", ""], ["dolor", "Dolor permitido", "t", "≤ 3/10", ""]],
  },
  excentrico_tendon: {
    nombre: "Excéntrico (tendinopatía)", icono: "🦵", familia: "terapeutico",
    desc: "Solo la bajada, lenta, con la pierna/brazo afectado (protocolo tipo Alfredson: 3 × 15, 2 veces al día).",
    p: [["excentrica", "Bajada", "n", 3, "s"], ["vecesDia", "Veces al día", "n", 2, ""], ["dolor", "Dolor permitido", "t", "≤ 5/10", ""]],
  },
  hsr: {
    nombre: "Carga pesada lenta (HSR)", icono: "🐌", familia: "terapeutico",
    desc: "Peso alto con subida y bajada de 3 s cada una; progresar de 15 a 6 reps.",
    p: [["tempo", "Tempo", "t", "3-0-3", ""], ["fase", "Fase", "t", "15 RM → 6 RM", ""]],
  },
  estiramiento: {
    nombre: "Estiramiento estático", icono: "🧘", familia: "terapeutico",
    desc: "Llevar a tensión suave y sostener, sin rebotes ni dolor.",
    p: [["segundos", "Sostener", "n", 30, "s"], ["lado", "Lado", "t", "ambos", ""]],
  },
  fnp: {
    nombre: "FNP contracción-relajación", icono: "🔁", familia: "terapeutico",
    desc: "Estirar, contraer el músculo 5-6 s contra resistencia, relajar y ganar rango.",
    p: [["contraccion", "Contracción", "n", 6, "s"], ["sostener", "Estiramiento", "n", 20, "s"], ["ciclos", "Ciclos", "n", 3, ""]],
  },
  movilidad: {
    nombre: "Movilidad activa / control", icono: "🌀", familia: "terapeutico",
    desc: "Movimientos lentos y controlados por todo el rango sin dolor (CARs).",
    p: [["reps", "Repeticiones", "t", "5 por lado", ""], ["rango", "Rango", "t", "sin dolor", ""]],
  },
  propiocepcion: {
    nombre: "Equilibrio / propiocepción", icono: "⚖️", familia: "terapeutico",
    desc: "Estabilidad sobre una pierna o superficie inestable; se progresa cerrando los ojos.",
    p: [["segundos", "Mantener", "n", 30, "s"], ["superficie", "Superficie", "t", "piso → colchoneta → bosu", ""], ["ojos", "Ojos", "t", "abiertos", ""]],
  },
  bfr: {
    nombre: "Restricción de flujo (BFR)", icono: "🩸", familia: "terapeutico",
    desc: "Carga muy ligera (20-30%) con oclusión parcial: 30-15-15-15 reps. Solo con supervisión.",
    p: [["esquema", "Esquema", "t", "30-15-15-15", ""], ["pct", "Carga", "n", 25, "% 1RM"], ["presion", "Presión", "t", "40-80% oclusión", ""]],
  },
  activacion: {
    nombre: "Activación / control motor", icono: "🎯", familia: "terapeutico",
    desc: "Activar músculos estabilizadores con poca carga y buena técnica (ej. transverso, glúteo medio).",
    p: [["segundos", "Mantener", "n", 10, "s"], ["reps", "Repeticiones", "n", 10, ""], ["respiracion", "Respiración", "t", "exhalar al activar", ""]],
  },
  respiracion: {
    nombre: "Respiración diafragmática", icono: "🌬️", familia: "terapeutico",
    desc: "Respirar con el abdomen, inhalación nasal y exhalación larga.",
    p: [["ciclos", "Respiraciones", "n", 10, ""], ["ritmo", "Ritmo", "t", "4 s inhalar · 6 s exhalar", ""]],
  },
};

export const DESCANSOS = [30, 45, 60, 90, 120];

// Tipo de sesión por día (ej. sábado funcional)
export const TIPOS_DIA = [
  ["fuerza", "💪", "Fuerza", "indigo"],
  ["hipertrofia", "🏋️", "Hipertrofia", "violet"],
  ["potencia", "⚡", "Potencia", "amber"],
  ["pliometria", "🦘", "Pliometría", "amber"],
  ["halterofilia", "🏅", "Halterofilia", "sky"],
  ["powerlifting", "🔩", "Powerlifting", "indigo"],
  ["calistenia", "🤸‍♂️", "Calistenia", "violet"],
  ["funcional", "🤸", "Funcional", "orange"],
  ["cross", "🔥", "Entrenamiento cruzado (WOD)", "rose"],
  ["hiit", "⏱️", "HIIT / Metabólico", "rose"],
  ["circuito", "🔄", "Circuito", "amber"],
  ["resistencia", "🔋", "Resistencia muscular", "pink"],
  ["cardio", "❤️", "Cardio", "pink"],
  ["velocidad", "💨", "Velocidad y agilidad", "sky"],
  ["deportivo", "⚽", "Específico deportivo", "emerald"],
  ["core", "🎯", "Core", "teal"],
  ["movilidad", "🧘", "Movilidad", "teal"],
  ["flexibilidad", "🤲", "Flexibilidad / estiramiento", "teal"],
  ["equilibrio", "⚖️", "Equilibrio / propiocepción", "sky"],
  ["postura", "🧍", "Postura", "emerald"],
  ["prevencion", "🛡️", "Prevención de lesiones", "emerald"],
  ["rehabilitacion", "🩺", "Rehabilitación", "emerald"],
  ["recuperacion", "🛌", "Recuperación activa", "slate"],
  ["adulto_mayor", "👵", "Adulto mayor", "emerald"],
];
export const tipoDia = (k) => TIPOS_DIA.find((t) => t[0] === k);

// ---------------------------------------------------------------------
// Utilidades (sin React): resumen y grupos
// ---------------------------------------------------------------------

/** Texto corto del sistema, ej. "Rest-pause · 60 kg · 8 reps + 2×(3-2) · pausa 15 s" */
export function resumenMetodo(m) {
  if (!m || !m.tipo || m.tipo === "normal") return "";
  const s = SISTEMAS[m.tipo];
  if (!s) return "";
  const p = { ...Object.fromEntries(s.p.map(([k, , , d]) => [k, d])), ...(m.params || {}) };
  // El peso lo anota el alumno: no se fija en la rutina
  ["peso", "pesoMin", "pesos", "rm"].forEach((k) => delete p[k]);
  const partes = [];
  switch (m.tipo) {
    case "superserie":
    case "biserie":
    case "triserie":
    case "superserie_compuesta":
    case "pre_agotamiento":
    case "post_agotamiento":
      partes.push(Number(p.descansoEntre) > 0 ? `${p.descansoEntre} s entre ejercicios` : "sin descanso entre ejercicios");
      break;
    case "circuito":
      partes.push(`${p.rondas} vueltas`);
      if (p.trabajo) partes.push(`${p.trabajo} s por estación`);
      if (p.descansoEstacion) partes.push(`pausa ${p.descansoEstacion} s`);
      if (p.descansoRonda) partes.push(`descanso ${p.descansoRonda} s entre vueltas`);
      break;
    case "rest_pause":
      if (p.peso) partes.push(`${p.peso} kg`);
      partes.push(`${p.reps1} reps + ${p.mini}×(${p.repsMini})`);
      partes.push(`pausa ${p.pausa} s`);
      break;
    case "drop_set":
      if (p.peso) partes.push(`desde ${p.peso} kg`);
      partes.push(`${p.bajadas} bajada(s) de ${p.porcentaje}%`);
      if (p.pesoMin) partes.push(`hasta ${p.pesoMin} kg`);
      if (p.repsMin) partes.push(`${p.repsMin} con el mínimo`);
      break;
    case "piramide_asc":
    case "piramide_desc":
      partes.push(`reps ${p.secuencia}`);
      if (p.pesos) partes.push(`pesos ${p.pesos} kg`);
      break;
    case "cluster":
      partes.push(`${p.bloques}×${p.repsBloque} reps`, `micro-pausa ${p.pausa} s`);
      if (p.peso) partes.push(`${p.peso} kg`);
      break;
    case "parciales":
      partes.push(p.esquema);
      break;
    case "negativas":
      partes.push(`bajada en ${p.excentrica} s`);
      if (p.ayuda) partes.push(`subida ${p.ayuda}`);
      if (p.peso) partes.push(`${p.peso} kg`);
      break;
    case "positivas":
      partes.push(`subida explosiva (${p.concentrica} s)`);
      if (p.bajada) partes.push(`bajada ${p.bajada}`);
      break;
    case "tempo":
      partes.push(`${p.exc}-${p.iso}-${p.con}-${p.arriba}`, `bajada ${p.exc} s · pausa ${p.iso} s · subida ${p.con} s`);
      break;
    case "isometrico":
      partes.push(`mantener ${p.segundos} s`);
      if (p.posicion) partes.push(p.posicion);
      break;
    case "hiit":
    case "tabata":
      partes.push(`${p.rondas} rondas`, `${p.trabajo} s trabajo / ${p.descanso} s descanso`);
      break;
    case "emom":
      partes.push(`${p.minutos} min`, `${p.repsMinuto} reps cada minuto`);
      break;
    case "amrap":
      partes.push(`${p.minutos} min`, p.meta);
      break;
    case "pliometria":
      partes.push(`${p.contactos} saltos`);
      if (p.altura) partes.push(`cajón ${p.altura} cm`);
      if (p.descansoCompleto) partes.push(`descanso ${p.descansoCompleto} s`);
      break;
    case "halterofilia": {
      partes.push(`${p.pct}% 1RM`);
      const kg = Number(p.rm) > 0 && Number(p.pct) > 0 ? Math.round((Number(p.rm) * Number(p.pct)) / 100 / 2.5) * 2.5 : 0;
      if (kg) partes.push(`≈ ${kg} kg (1RM ${p.rm} kg)`);
      if (p.fase) partes.push(p.fase);
      break;
    }
    case "velocidad":
      partes.push(`${p.pct}% 1RM`);
      if (p.intencion) partes.push(p.intencion);
      break;
    case "serie_gigante":
      partes.push(`${p.rondas} vueltas`, `descanso ${p.descansoRonda} s entre vueltas`);
      break;
    case "contraste":
      partes.push(`pesado al ${p.pct}% 1RM`, `pausa ${p.descansoEntre} s`, "luego explosivo");
      break;
    case "cinco_por_cinco":
      partes.push(p.peso ? `${p.peso} kg` : `${p.pct}% 1RM`, `descanso ${p.descansoLargo} s`);
      break;
    case "gvt":
      partes.push("10 × 10", p.peso ? `${p.peso} kg` : `${p.pct}% 1RM`);
      break;
    default:
      s.p.forEach(([k, l, , , suf]) => p[k] !== "" && p[k] != null && partes.push(`${l.toLowerCase()} ${p[k]}${suf ? ` ${suf}` : ""}`));
  }
  return [s.nombre, ...partes.filter(Boolean)].join(" · ");
}

/** Arma el objeto método con su resumen al día */
export function armarMetodo(tipo, params = {}, grupo) {
  if (!tipo || tipo === "normal") return null;
  const s = SISTEMAS[tipo];
  const base = Object.fromEntries((s?.p || []).map(([k, , , d]) => [k, d]));
  const m = { tipo, params: { ...base, ...params } };
  if (s?.agrupa && grupo) m.grupo = grupo;
  m.resumen = resumenMetodo(m);
  return m;
}

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Etiquetas A1, A2, B1… de los ejercicios combinados de una lista */
export function etiquetasGrupo(lista = []) {
  const cuenta = {};
  return lista.map((ex) => {
    const g = ex?.metodo?.grupo;
    if (!g || !SISTEMAS[ex.metodo.tipo]?.agrupa) return "";
    cuenta[g] = (cuenta[g] || 0) + 1;
    return `${g}${cuenta[g]}`;
  });
}

/**
 * Une (o separa) el ejercicio i con el ejercicio j en el mismo grupo.
 * Devuelve la lista nueva. Todos los del grupo comparten tipo y parámetros.
 */
export function alternarCompanero(lista, i, j) {
  const yo = lista[i];
  const m = yo?.metodo;
  if (!m || !SISTEMAS[m.tipo]?.agrupa) return lista;
  let letra = m.grupo;
  if (!letra) {
    const usadas = new Set(lista.map((x) => x?.metodo?.grupo).filter(Boolean));
    letra = [...LETRAS].find((l) => !usadas.has(l)) || "Z";
  }
  const yaEsta = lista[j]?.metodo?.grupo === letra;
  return lista.map((x, k) => {
    if (k === i) return { ...x, metodo: armarMetodo(m.tipo, m.params, letra) };
    if (k !== j) return x;
    if (yaEsta) return { ...x, metodo: null };
    return { ...x, metodo: armarMetodo(m.tipo, m.params, letra) };
  });
}

/** Cambia el método del ejercicio i y mantiene sincronizado su grupo */
export function cambiarMetodo(lista, i, metodo) {
  const antes = lista[i]?.metodo;
  return lista.map((x, k) => {
    if (k === i) return { ...x, metodo };
    // El resto del grupo copia el sistema y sus parámetros
    if (antes?.grupo && x?.metodo?.grupo === antes.grupo) {
      if (metodo && SISTEMAS[metodo.tipo]?.agrupa) return { ...x, metodo: armarMetodo(metodo.tipo, metodo.params, antes.grupo) };
      return { ...x, metodo: null };
    }
    return x;
  });
}

// ---------------------------------------------------------------------
// Vista (rutina, portal del alumno, impresión, PDF)
// ---------------------------------------------------------------------
export const InsigniaMetodo = ({ metodo, etiqueta, className = "" }) => {
  if (!metodo || !metodo.tipo || metodo.tipo === "normal") return null;
  const s = SISTEMAS[metodo.tipo];
  if (!s) return null;
  const c = COLOR[FAMILIAS.find((f) => f.id === s.familia)?.color || "slate"];
  const texto = metodo.resumen || resumenMetodo(metodo);
  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${c.caja} ${className}`}>
      {etiqueta && <span className={`px-1.5 rounded-md text-[11px] font-black ${c.on}`}>{etiqueta}</span>}
      <span className={`font-bold ${c.texto}`}>
        {s.icono} {texto}
      </span>
    </div>
  );
};

export const InsigniaTipoDia = ({ tipo, className = "" }) => {
  const t = tipoDia(tipo);
  if (!t) return null;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${COLOR[t[3]].chip} ${className}`}>{t[1]} {t[2]}</span>;
};

// ---------------------------------------------------------------------
// Edición
// ---------------------------------------------------------------------
const INP = "w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600";

export const SelectorTipoDia = ({ valor, onChange, readOnly }) => (
  <div className="flex flex-wrap gap-1">
    {TIPOS_DIA.map(([k, ic, l, col]) => {
      const on = valor === k;
      return (
        <button
          key={k}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(on ? "" : k)}
          className={`px-2 py-1 rounded-full border text-[11px] font-bold cursor-pointer transition-colors ${on ? COLOR[col].on : COLOR[col].chip}`}
        >
          {ic} {l}
        </button>
      );
    })}
  </div>
);

/**
 * Configuración de un ejercicio (la misma para entrenador y fisioterapia).
 *  ex        objeto del ejercicio
 *  campos    nombres de las claves en ese objeto: { series, reps, descanso, esfuerzo }
 *  onPatch   (cambios) => void      cambia campos simples del ejercicio
 *  onMetodo  (metodo) => void       cambia el sistema (el padre sincroniza su grupo)
 *  companeros [{ i, nombre, enGrupo }]  otros ejercicios del mismo día (para biserie, circuito…)
 *  onCompanero (i) => void          une / separa un compañero
 *  etiqueta  "A1" si está combinado
 */
export const ConfigEjercicio = ({
  ex,
  campos = { series: "sets", reps: "reps", descanso: "restSeconds", esfuerzo: "rir" },
  onPatch,
  onMetodo,
  companeros = [],
  onCompanero,
  etiqueta,
  repsSugeridas = ["6-8", "8-10", "10-12", "12-15", "15-20", "30 seg", "45 seg", "60 seg"],
  readOnly = false,
  placeholderEsfuerzo = "RIR 1-2",
  familiaInicial = "base",
  onElegirDelBanco, // abre el banco flotante en modo "combinar con este ejercicio"
}) => {
  const metodo = ex.metodo;
  const sis = SISTEMAS[metodo?.tipo || "normal"];
  const [abierto, setAbierto] = useState(false);
  const [famVista, setFamVista] = useState(metodo ? sis?.familia : familiaInicial);
  const [buscar, setBuscar] = useState("");
  const sinT = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const series = Number(ex[campos.series]) || 0;
  const descanso = Number(ex[campos.descanso]);
  const otroDescanso = !DESCANSOS.includes(descanso);
  const listId = useMemo(() => `reps-${Math.random().toString(36).slice(2, 8)}`, []);
  const fam = FAMILIAS.find((f) => f.id === sis?.familia) || FAMILIAS[0];
  const c = COLOR[fam.color];
  const enGrupo = companeros.filter((x) => x.enGrupo).length;
  const [minG, maxG] = sis?.agrupa || [0, 0];

  const setParam = (k, v) => onMetodo(armarMetodo(metodo.tipo, { ...(metodo.params || {}), [k]: v }, metodo.grupo));

  return (
    <div className="space-y-2">
      {/* Series · reps · esfuerzo */}
      <div className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <div>
          <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Series</span>
          <div className="flex items-stretch rounded-lg border border-slate-300 bg-white overflow-hidden">
            <button type="button" disabled={readOnly || series <= 1} onClick={() => onPatch({ [campos.series]: Math.max(1, series - 1) })} className="px-2 text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-40" title="Una serie menos">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="1"
              max="20"
              disabled={readOnly}
              value={ex[campos.series] ?? ""}
              onChange={(e) => onPatch({ [campos.series]: Number(e.target.value) })}
              className="w-full min-w-0 text-center font-black text-sm text-slate-900 bg-transparent py-2 focus:outline-none"
            />
            <button type="button" disabled={readOnly || series >= 20} onClick={() => onPatch({ [campos.series]: series + 1 })} className="px-2 text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-40" title="Una serie más">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <label className="block min-w-0">
          <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Repeticiones o tiempo</span>
          <input disabled={readOnly} value={ex[campos.reps] ?? ""} placeholder="10-12" list={listId} onChange={(e) => onPatch({ [campos.reps]: e.target.value })} className={`${INP} text-center font-bold`} />
          <datalist id={listId}>{repsSugeridas.map((r) => <option key={r} value={r} />)}</datalist>
        </label>
        <label className="block min-w-0">
          <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Esfuerzo (RIR / RPE)</span>
          <input disabled={readOnly} value={ex[campos.esfuerzo] ?? ""} placeholder={placeholderEsfuerzo} onChange={(e) => onPatch({ [campos.esfuerzo]: e.target.value })} className={`${INP} text-center font-bold`} />
        </label>
      </div>

      {/* Descanso con chips */}
      <div>
        <span className="block text-[11px] font-bold text-slate-500 mb-0.5">Descanso entre series</span>
        <div className="flex flex-wrap gap-1">
          {DESCANSOS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={readOnly}
              onClick={() => onPatch({ [campos.descanso]: d })}
              className={`flex-1 min-w-[3rem] py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${descanso === d ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"}`}
            >
              {d < 60 ? `${d}s` : d % 60 ? `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}` : `${d / 60} min`}
            </button>
          ))}
          <label className={`flex items-center gap-1 rounded-lg border px-2 ${otroDescanso ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`} title="Otro tiempo de descanso">
            <input
              type="number"
              min="0"
              step="5"
              disabled={readOnly}
              value={otroDescanso && Number.isFinite(descanso) ? descanso : ""}
              placeholder="otro"
              onChange={(e) => onPatch({ [campos.descanso]: e.target.value === "" ? 0 : Number(e.target.value) })}
              className="w-12 py-1 text-xs font-bold text-center bg-transparent focus:outline-none"
            />
            <span className="text-[11px] text-slate-500">s</span>
          </label>
        </div>
      </div>

      {/* Sistema de entrenamiento */}
      <div className={`rounded-xl border ${metodo ? c.caja : "border-dashed border-slate-300 bg-white"}`}>
        <button type="button" disabled={readOnly} onClick={() => setAbierto((v) => !v)} className="w-full flex items-center gap-2 px-2.5 py-2 text-left cursor-pointer">
          <Settings2 className={`w-4 h-4 shrink-0 ${metodo ? c.texto : "text-slate-400"}`} />
          <span className="flex-1 min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500">Sistema de entrenamiento · personalizar</span>
            <span className={`block text-xs font-bold truncate ${metodo ? c.texto : "text-slate-600"}`}>
              {etiqueta && <span className={`mr-1 px-1.5 rounded-md text-[11px] ${c.on}`}>{etiqueta}</span>}
              {sis.icono} {metodo ? metodo.resumen || resumenMetodo(metodo) : "Series normales (toca para biserie, rest-pause, tempo, HIIT…)"}
            </span>
          </span>
          {metodo && !readOnly && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onMetodo(null);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white"
              title="Volver a series normales"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
        </button>

        {abierto && !readOnly && (
          <div className="px-2.5 pb-2.5 space-y-2.5">
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder={`Buscar entre ${Object.keys(SISTEMAS).length} sistemas (ej. tabata, pirámide, excéntrico)…`}
              className={`${INP} !py-1.5 text-xs`}
            />
            {/* Familias */}
            <div className={`flex flex-wrap gap-1 ${buscar.trim() ? "opacity-40" : ""}`}>
              {FAMILIAS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                  setFamVista(f.id);
                  setBuscar("");
                }}
                  className={`px-2 py-1 rounded-full border text-[11px] font-bold cursor-pointer ${famVista === f.id ? COLOR[f.color].on : COLOR[f.color].chip}`}
                >
                  {f.nombre} <span className="opacity-70">{Object.values(SISTEMAS).filter((x) => x.familia === f.id).length}</span>
                </button>
              ))}
            </div>
            {/* Sistemas de la familia */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {Object.entries(SISTEMAS)
                .filter(([, s]) => (buscar.trim() ? sinT(`${s.nombre} ${s.desc}`).includes(sinT(buscar.trim())) : s.familia === famVista))
                .map(([k, s]) => {
                  const on = (metodo?.tipo || "normal") === k;
                  const col = COLOR[FAMILIAS.find((f) => f.id === s.familia).color];
                  return (
                    <button
                      key={k}
                      type="button"
                      title={s.desc}
                      onClick={() => onMetodo(k === "normal" ? null : armarMetodo(k, metodo?.tipo === k ? metodo.params : {}, metodo?.tipo === k ? metodo.grupo : undefined))}
                      className={`rounded-lg border px-2 py-1.5 text-left cursor-pointer transition-colors ${on ? col.on : `${col.chip} hover:brightness-95`}`}
                    >
                      <span className="block text-xs font-black leading-tight">
                        {s.icono} {s.nombre}
                      </span>
                      {s.agrupa && <span className={`block text-[10px] font-semibold ${on ? "opacity-90" : "opacity-75"}`}>{s.agrupa[0] === s.agrupa[1] ? `${s.agrupa[0]} ejercicios` : `${s.agrupa[0]}+ ejercicios`}</span>}
                    </button>
                  );
                })}
            </div>

            {metodo && (
              <div className="rounded-lg bg-white border border-slate-200 p-2 space-y-2">
                <p className="text-xs text-slate-600">
                  <b className={c.texto}>
                    {sis.icono} {sis.nombre}:
                  </b>{" "}
                  {sis.desc}
                </p>
                {sis.p.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sis.p.map(([k, l, t, d, suf]) => (
                      <label key={k} className="block min-w-0">
                        <span className="block text-[11px] font-bold text-slate-500 truncate" title={l}>
                          {l}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type={t === "n" ? "number" : "text"}
                            min={t === "n" ? 0 : undefined}
                            value={metodo.params?.[k] ?? d ?? ""}
                            onChange={(e) => setParam(k, t === "n" && e.target.value !== "" ? Number(e.target.value) : e.target.value)}
                            className={`${INP} !py-1.5 font-bold`}
                          />
                          {suf && <span className="text-[11px] text-slate-500 shrink-0">{suf}</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-[11px] rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1">
                  ✍️ El alumno anotará en su portal: <b>{filasRegistro({ series: ex[campos.series], reps: ex[campos.reps], metodo }).anota}</b>. El peso no se fija aquí.
                </p>
                {sis.agrupa && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-500">
                      Combinar con ({enGrupo + 1}/{maxG > minG ? `${minG}-${maxG}` : minG} ejercicios){" "}
                      {enGrupo + 1 < minG && <span className="text-rose-600">· elige {minG - enGrupo - 1} más</span>}
                    </p>
                    {companeros.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto pr-1">
                        {companeros.map((x) => (
                          <button
                            key={x.i}
                            type="button"
                            disabled={!x.enGrupo && enGrupo + 1 >= maxG}
                            onClick={() => onCompanero?.(x.i)}
                            title={x.nombre}
                            className={`min-w-0 px-2 py-1 rounded-lg border text-[11px] font-bold text-left truncate cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${x.enGrupo ? c.on : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"}`}
                          >
                            {x.enGrupo ? "✓ " : "+ "}
                            {x.i + 1}. {x.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                    {onElegirDelBanco && enGrupo + 1 < maxG && (
                      <button
                        type="button"
                        onClick={onElegirDelBanco}
                        className={`w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-white text-left text-xs font-bold cursor-pointer hover:border-slate-400 flex items-center gap-1.5 ${c.texto}`}
                      >
                        ＋ Elegir del banco un ejercicio para combinar (ej. músculo antagonista)
                      </button>
                    )}
                    {companeros.length === 0 && !onElegirDelBanco && <p className="text-xs text-slate-500 italic">Agrega más ejercicios a este día para combinarlos.</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// Qué anota el ALUMNO según el sistema (lo usa "Anotar mis pesos")
// Cada fila = una casilla: { etiqueta, objetivo, campo: "reps"|"seg"|"rondas"|"min"|"saltos", kg: bool }
// ---------------------------------------------------------------------
const numero = (v, d) => {
  const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};
const lista = (t) =>
  String(t || "")
    .split(/[-+,/]/)
    .map((x) => x.trim())
    .filter(Boolean);

export function filasRegistro({ series = 3, reps = "", metodo } = {}) {
  const tipo = metodo?.tipo || "normal";
  const s = SISTEMAS[tipo] || SISTEMAS.normal;
  const p = { ...Object.fromEntries((s.p || []).map(([k, , , d]) => [k, d])), ...(metodo?.params || {}) };
  const n = Math.min(Math.max(numero(series, 3), 1), 12);
  const filas = [];
  const add = (etiqueta, objetivo = reps, campo = "reps", kg = true) => filas.push({ etiqueta, objetivo: String(objetivo ?? ""), campo, kg });
  const porSerie = (fn) => {
    for (let i = 1; i <= n; i++) fn(i);
  };
  let anota = "peso (kg) y repeticiones de cada serie";
  switch (tipo) {
    case "rest_pause":
      porSerie((i) => {
        add(`S${i} · principal`, p.reps1);
        const minis = lista(p.repsMini);
        for (let m = 1; m <= numero(p.mini, 2); m++) add(`S${i} · mini ${m}`, minis[m - 1] || minis[minis.length - 1] || "");
      });
      anota = "el peso y las reps de la serie principal y de cada mini-serie (mismo peso)";
      break;
    case "drop_set":
      porSerie((i) => {
        add(`S${i} · inicial`, reps);
        for (let b = 1; b <= numero(p.bajadas, 2); b++) add(`S${i} · bajada ${b}`, b === numero(p.bajadas, 2) ? p.repsMin : "al fallo");
      });
      anota = "el peso y las reps de la serie inicial y de cada bajada";
      break;
    case "cluster":
      porSerie((i) => {
        for (let b = 1; b <= numero(p.bloques, 4); b++) add(`S${i} · bloque ${b}`, p.repsBloque);
      });
      anota = "el peso y las reps de cada bloque";
      break;
    case "myo_reps":
      porSerie((i) => {
        add(`S${i} · activación`, p.activacion);
        for (let m = 1; m <= numero(p.mini, 4); m++) add(`S${i} · mini ${m}`, p.repsMini);
      });
      anota = "el peso y las reps de la serie de activación y de cada mini-serie";
      break;
    case "piramide_asc":
    case "piramide_desc":
      lista(p.secuencia).forEach((r, i) => add(`Serie ${i + 1}`, r));
      anota = "el peso de cada escalón de la pirámide y las reps logradas";
      break;
    case "ondulante":
      for (let o = 1; o <= numero(p.olas, 2); o++) lista(p.ola).forEach((r, i) => add(`Ola ${o} · ${i + 1}`, r));
      anota = "el peso y las reps de cada paso de la oleada";
      break;
    case "cinco_por_cinco":
      for (let i = 1; i <= 5; i++) add(`Serie ${i}`, 5);
      break;
    case "gvt":
      for (let i = 1; i <= 10; i++) add(`Serie ${i}`, 10);
      break;
    case "rpe_top":
      add("Serie principal", lista(p.top)[0] || reps);
      for (let i = 1; i <= 3; i++) add(`Ligera ${i}`, reps);
      anota = "el peso de la serie principal y de las series ligeras";
      break;
    case "bfr":
      lista(p.esquema).forEach((r, i) => add(`Serie ${i + 1}`, r));
      break;
    case "circuito":
    case "serie_gigante":
      for (let v = 1; v <= Math.min(numero(p.rondas, 3), 10); v++) add(`Vuelta ${v}`, reps);
      anota = "el peso y las reps de este ejercicio en cada vuelta";
      break;
    case "isometrico":
    case "iso_analgesico":
    case "iso_maximo":
    case "estiramiento":
    case "propiocepcion":
    case "activacion":
    case "tut":
      porSerie((i) => add(`Serie ${i}`, p.segundos || reps, "seg", tipo === "iso_analgesico" || tipo === "tut"));
      anota = "los segundos que logró mantener en cada serie";
      break;
    case "pliometria":
      porSerie((i) => add(`Serie ${i}`, p.contactos, "saltos", false));
      anota = "los saltos que hizo bien en cada serie";
      break;
    case "movilidad":
    case "fnp":
    case "respiracion":
      porSerie((i) => add(`Serie ${i}`, p.reps || p.ciclos || reps, "reps", false));
      anota = "las repeticiones o ciclos que hizo";
      break;
    case "hiit":
    case "tabata":
      add("Rondas completas", p.rondas, "rondas", false);
      anota = "cuántas rondas completó";
      break;
    case "emom":
      add("Minutos completos", p.minutos, "min", false);
      anota = "cuántos minutos completó";
      break;
    case "amrap":
      add("Rondas logradas", "", "rondas", false);
      anota = "cuántas rondas logró en el tiempo";
      break;
    case "for_time":
    case "chipper":
      add("Tiempo total", p.limite || "", "min", false);
      anota = "el tiempo que tardó";
      break;
    case "death_by":
      add("Último minuto completo", "", "min", false);
      anota = "hasta qué minuto llegó";
      break;
    case "escalera":
      add("Peldaño alcanzado", "", "reps", false);
      anota = "hasta qué peldaño llegó";
      break;
    case "intervalos_dist":
    case "sprint":
      add("Tramos completos", p.tramos, "rondas", false);
      anota = "cuántos tramos completó";
      break;
    case "continuo":
    case "fartlek":
    case "noruego_4x4":
    case "progresivo":
      add("Minutos", p.minutos || p.bloques, "min", false);
      anota = "los minutos que hizo";
      break;
    default:
      porSerie((i) => add(`Serie ${i}`, reps));
      if (SISTEMAS[tipo]?.agrupa) anota = "el peso y las reps de cada serie (alternando con su pareja del grupo)";
  }
  return { filas: filas.slice(0, 40), anota };
}
