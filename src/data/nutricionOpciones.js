// Opciones de los planes de nutrición: objetivos, suplementos y porciones por peso.

// ajuste = kcal sobre el gasto diario (TDEE); prot = g de proteína por kg; grasa = % de las kcal
export const OBJETIVOS_NUTRI = [
  { id: "perdida_peso", emoji: "🔥", label: "Pérdida de grasa / déficit", ajuste: -450, prot: 2.0, grasa: 0.25, color: "amber" },
  { id: "grasa_visceral", emoji: "🎯", label: "Bajar grasa visceral / abdominal", ajuste: -400, prot: 2.0, grasa: 0.3, color: "orange" },
  { id: "recomposicion", emoji: "⚖️", label: "Recomposición corporal", ajuste: -150, prot: 2.2, grasa: 0.25, color: "teal" },
  { id: "hipertrofia", emoji: "💪", label: "Hipertrofia / ganar músculo", ajuste: 350, prot: 2.0, grasa: 0.25, color: "emerald" },
  { id: "aumento_peso", emoji: "📈", label: "Aumento de peso (bajo peso)", ajuste: 500, prot: 1.8, grasa: 0.3, color: "lime" },
  { id: "fuerza", emoji: "🏋️", label: "Fuerza y rendimiento", ajuste: 300, prot: 2.0, grasa: 0.25, color: "indigo" },
  { id: "resistencia", emoji: "🏃", label: "Resistencia / deportes de fondo", ajuste: 200, prot: 1.6, grasa: 0.25, color: "sky" },
  { id: "tonificacion", emoji: "✨", label: "Tonificación / definición", ajuste: -250, prot: 2.0, grasa: 0.25, color: "violet" },
  { id: "salud_rehabilitacion", emoji: "🩺", label: "Salud y mantenimiento", ajuste: 0, prot: 1.4, grasa: 0.3, color: "slate" },
  { id: "control_glucemico", emoji: "🩸", label: "Control de glucosa / resistencia a la insulina", ajuste: -250, prot: 1.6, grasa: 0.35, color: "rose" },
  { id: "presion_arterial", emoji: "❤️", label: "Presión arterial (estilo DASH)", ajuste: -150, prot: 1.4, grasa: 0.27, color: "red" },
  { id: "colesterol", emoji: "🫀", label: "Colesterol y triglicéridos", ajuste: -200, prot: 1.4, grasa: 0.25, color: "pink" },
  { id: "digestivo", emoji: "🌿", label: "Salud digestiva", ajuste: 0, prot: 1.4, grasa: 0.3, color: "green" },
  { id: "embarazo_lactancia", emoji: "🤰", label: "Embarazo / lactancia", ajuste: 350, prot: 1.5, grasa: 0.3, color: "fuchsia" },
  { id: "adulto_mayor", emoji: "👵", label: "Adulto mayor (masa muscular)", ajuste: 0, prot: 1.5, grasa: 0.3, color: "cyan" },
];

export const objetivoNutri = (id) => OBJETIVOS_NUTRI.find((o) => o.id === id) || OBJETIVOS_NUTRI.find((o) => o.id === "salud_rehabilitacion");

export const COLOR_OBJETIVO = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  teal: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  lime: { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  slate: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  pink: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
};

/** Mifflin-St Jeor + objetivo -> calorías y macros */
export function calcularTdee({ sexo = "M", peso = 70, talla = 170, edad = 30, actividad = 1.55, objetivo = "salud_rehabilitacion" }) {
  const o = objetivoNutri(objetivo);
  const bmr = 10 * peso + 6.25 * talla - 5 * edad + (sexo === "F" ? -161 : 5);
  const tdee = Math.round(bmr * actividad);
  const kcal = Math.max(1200, tdee + o.ajuste);
  const proteinas = Math.round(peso * o.prot);
  const grasas = Math.round((kcal * o.grasa) / 9);
  const carbohidratos = Math.max(0, Math.round((kcal - proteinas * 4 - grasas * 9) / 4));
  return { bmr: Math.round(bmr), tdee, kcal, proteinas, grasas, carbohidratos, agua: Number((peso * 0.035).toFixed(1)) };
}

export const ACTIVIDADES = [
  [1.2, "Sedentario"],
  [1.375, "Ligera (1-3 días)"],
  [1.55, "Moderada (3-5 días)"],
  [1.725, "Alta (6-7 días)"],
  [1.9, "Muy alta (2 turnos / físico)"],
];

export const SUPLEMENTOS_BASE = [
  "Proteína whey (1 scoop post-entreno)",
  "Proteína vegetal",
  "Creatina monohidratada 3-5 g/día",
  "Cafeína 100-200 mg pre-entreno",
  "Pre-entreno",
  "BCAA / aminoácidos esenciales",
  "Glutamina 5 g",
  "Beta-alanina 3-5 g",
  "Citrulina malato 6 g",
  "Electrolitos / bebida isotónica",
  "Multivitamínico",
  "Vitamina D3",
  "Omega 3 (EPA/DHA)",
  "Magnesio",
  "Zinc",
  "Hierro (con indicación)",
  "Calcio",
  "Vitamina C",
  "Colágeno hidrolizado",
  "Ganador de peso (gainer)",
  "Fibra (psyllium)",
  "Probióticos",
  "Melatonina (sueño)",
  "Ashwagandha",
  "Quemador / termogénico (con indicación)",
  "L-carnitina",
];

// Porciones por peso (g) para quien prefiere pesar: crudo vs cocido
export const PORCIONES_PESO = [
  { grupo: "Pechuga de pollo", crudo: "120 g", cocido: "≈ 90 g", aporta: "≈ 27 g proteína" },
  { grupo: "Pescado blanco", crudo: "150 g", cocido: "≈ 115 g", aporta: "≈ 27 g proteína" },
  { grupo: "Carne de res magra", crudo: "120 g", cocido: "≈ 85 g", aporta: "≈ 26 g proteína" },
  { grupo: "Huevo entero", crudo: "2 unidades (≈ 100 g)", cocido: "—", aporta: "≈ 13 g proteína" },
  { grupo: "Claras de huevo", crudo: "200 g (≈ 6 claras)", cocido: "—", aporta: "≈ 22 g proteína" },
  { grupo: "Atún en agua (escurrido)", crudo: "—", cocido: "1 lata ≈ 120 g", aporta: "≈ 28 g proteína" },
  { grupo: "Arroz blanco", crudo: "60 g", cocido: "≈ 180 g (1 taza)", aporta: "≈ 47 g carbohidratos" },
  { grupo: "Fideos / pasta", crudo: "70 g", cocido: "≈ 160 g", aporta: "≈ 50 g carbohidratos" },
  { grupo: "Avena", crudo: "40 g", cocido: "—", aporta: "≈ 24 g carbohidratos" },
  { grupo: "Quinua", crudo: "50 g", cocido: "≈ 140 g", aporta: "≈ 30 g carbohidratos" },
  { grupo: "Papa", crudo: "200 g", cocido: "≈ 180 g", aporta: "≈ 35 g carbohidratos" },
  { grupo: "Camote", crudo: "150 g", cocido: "≈ 140 g", aporta: "≈ 30 g carbohidratos" },
  { grupo: "Menestras (lentejas, frejoles)", crudo: "50 g", cocido: "≈ 130 g", aporta: "≈ 25 g carbohidratos · 12 g proteína" },
  { grupo: "Pan integral", crudo: "1 rebanada ≈ 30 g", cocido: "—", aporta: "≈ 13 g carbohidratos" },
  { grupo: "Palta", crudo: "50 g (¼)", cocido: "—", aporta: "≈ 7 g grasa" },
  { grupo: "Aceite de oliva", crudo: "10 ml (2 cdtas)", cocido: "—", aporta: "≈ 9 g grasa" },
  { grupo: "Maní / almendras", crudo: "20 g", cocido: "—", aporta: "≈ 10 g grasa" },
  { grupo: "Verduras", crudo: "150-200 g", cocido: "≈ 1 taza", aporta: "fibra, vitaminas" },
  { grupo: "Fruta", crudo: "150 g", cocido: "—", aporta: "≈ 15-20 g carbohidratos" },
];

export const CONSEJOS_MANO = [
  ["✋", "La palma es tu medida de proteína: sin contar los dedos y del grosor de la mano."],
  ["✊", "Un puño de verduras por comida como mínimo; mientras más colores, mejor."],
  ["🤲", "Mano ahuecada para arroz, fideos, menestras o cereales ya cocidos."],
  ["👍", "Un pulgar de grasa: aceite, palta, maní, mantequilla de maní."],
  ["🍽️", "Si entrenas ese día, suma ½ a 1 mano ahuecada extra de carbohidrato en la comida de después."],
  ["🔁", "¿Hambre seguido? Sube primero verduras y proteína antes que carbohidratos."],
  ["⚖️", "Revisa cada 2-3 semanas: si no bajas, quita ½ mano de carbohidrato o ½ pulgar de grasa en 1-2 comidas."],
  ["🧒", "Tu mano crece contigo: las porciones se ajustan solas al tamaño de cada persona."],
];
