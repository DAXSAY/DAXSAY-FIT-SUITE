// Hoja de la rutina para imprimir, PDF o foto: siempre en claro, ordenada como
// un documento (cabecera del gimnasio, datos del alumno y una tabla por día).
import React from "react";
import { CalendarDays, Dumbbell, Target, User, UserCheck, Layers, Timer, Flame, MapPin, Phone } from "lucide-react";
import { useGym } from "../../context/GymContext";
import { ExerciseThumb } from "./ExerciseBank";
import { InsigniaMetodo, InsigniaTipoDia, etiquetasGrupo } from "./SistemasEntrenamiento";
import { textoNivelRutina, textoObjetivoRutina } from "../../utils/rutinas";
import { sinEmoji } from "../common/IconoEmoji";

const hoyLargo = () =>
  new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" });
const descansoTxt = (s) => {
  const n = Number(s);
  if (!n) return "—";
  return n >= 60 ? `${Math.floor(n / 60)} min${n % 60 ? ` ${n % 60} s` : ""}` : `${n} s`;
};

function Dato({ icono: I, etiqueta, valor }) {
  return (
    <div className="rd-hr-dato">
      <I className="w-4 h-4 shrink-0" strokeWidth={2.2} />
      <div className="min-w-0">
        <p className="rd-hr-dato-et">{etiqueta}</p>
        <p className="rd-hr-dato-val">{valor || "—"}</p>
      </div>
    </div>
  );
}

export function HojaRutina({ rutina }) {
  const { gymConfig = {} } = useGym();
  const gym = gymConfig.gym_nombre || "RADICAL";
  const dias = rutina.days || [];
  const totalEj = dias.reduce((a, d) => a + (d.exercises?.length || 0), 0);
  return (
    <article className="rd-hoja-rutina rd-claro" data-descargar data-ancho="820">
      {/* Cabecera del gimnasio */}
      <header className="rd-hr-cab" data-salto>
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo-radical.png" alt="" className="w-14 h-14 rounded-full object-cover bg-white shrink-0" crossOrigin="anonymous" />
          <div className="min-w-0">
            <p className="rd-hr-gym">{gym}</p>
            <p className="rd-hr-sub">Plan de entrenamiento personalizado</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="rd-hr-doc">RUTINA DE ENTRENAMIENTO</p>
          <p className="rd-hr-sub">Emitida el {hoyLargo()}</p>
        </div>
      </header>

      {/* Título y datos */}
      <section className="rd-hr-intro" data-salto>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {rutina.level && <span className="rd-hr-chip rd-hr-chip-a">{sinEmoji(textoNivelRutina(rutina.level))}</span>}
          {rutina.objective && <span className="rd-hr-chip rd-hr-chip-b">{sinEmoji(textoObjetivoRutina(rutina.objective))}</span>}
        </div>
        <h1 className="rd-hr-titulo">{rutina.title}</h1>
        {rutina.description && <p className="rd-hr-desc">{rutina.description}</p>}
        <div className="rd-hr-datos">
          <Dato icono={User} etiqueta="Alumno" valor={rutina.targetStudentName || "Uso general"} />
          <Dato icono={UserCheck} etiqueta="Entrenador" valor={rutina.trainerName || rutina.creadaPor} />
          <Dato icono={CalendarDays} etiqueta="Días por semana" valor={`${dias.length} ${dias.length === 1 ? "día" : "días"}`} />
          <Dato icono={Dumbbell} etiqueta="Ejercicios" valor={`${totalEj} en total`} />
        </div>
      </section>

      {/* Un bloque por día */}
      {dias.map((dia, i) => {
        const etq = etiquetasGrupo(dia.exercises || []);
        return (
          <section key={i} className="rd-hr-dia">
            <div className="rd-hr-dia-cab" data-salto>
              <span className="rd-hr-dia-num">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <h2 className="rd-hr-dia-tit">{sinEmoji(dia.dayName) || `Día ${i + 1}`}</h2>
                {dia.focus && <p className="rd-hr-dia-foco">{dia.focus}</p>}
              </div>
              <InsigniaTipoDia tipo={dia.tipo} />
            </div>
            <div className="rd-hr-scroll"><table className="rd-hr-tabla">
              <thead>
                <tr data-salto>
                  <th className="w-8">#</th>
                  <th className="w-[68px]">Ejercicio</th>
                  <th />
                  <th className="w-16 text-center">Series</th>
                  <th className="w-20 text-center">Reps</th>
                  <th className="w-20 text-center">Descanso</th>
                  <th className="w-20 text-center">Intensidad</th>
                  <th className="w-10 text-center">Hecho</th>
                </tr>
              </thead>
              <tbody>
                {(dia.exercises || []).map((ex, k) => (
                  <tr key={k} data-salto>
                    <td className="rd-hr-c-n text-center font-black text-slate-400">{etq[k] || k + 1}</td>
                    <td className="rd-hr-c-img">
                      <ExerciseThumb ex={{ ...ex, name: ex.exerciseName }} className="w-14 h-14 rounded-lg border border-slate-200" />
                    </td>
                    <td className="rd-hr-c-ej">
                      <p className="rd-hr-ej">{ex.exerciseName}</p>
                      {ex.notes && <p className="rd-hr-nota">{ex.notes}</p>}
                      <InsigniaMetodo metodo={ex.metodo} etiqueta={etq[k]} className="mt-1" />
                    </td>
                    <td data-et="Series" className="rd-hr-c-d text-center rd-hr-num">{ex.sets || "—"}</td>
                    <td data-et="Reps" className="rd-hr-c-d text-center rd-hr-num">{ex.reps || "—"}</td>
                    <td data-et="Descanso" className="rd-hr-c-d text-center">{descansoTxt(ex.restSeconds)}</td>
                    <td data-et="Intensidad" className="rd-hr-c-d text-center text-amber-700 font-bold">{ex.rir || "—"}</td>
                    <td className="rd-hr-c-ok text-center">
                      <span className="rd-hr-check" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </section>
        );
      })}

      {/* Indicaciones y pie */}
      <section className="rd-hr-indic" data-salto>
        <div>
          <p className="rd-hr-indic-tit"><Flame className="w-3.5 h-3.5" /> Antes de empezar</p>
          <p>Calienta 5 a 10 minutos y haz 1 o 2 series de aproximación con poco peso.</p>
        </div>
        <div>
          <p className="rd-hr-indic-tit"><Timer className="w-3.5 h-3.5" /> Descanso e intensidad</p>
          <p>Respeta los descansos. RIR = repeticiones que te quedan en reserva al terminar la serie.</p>
        </div>
        <div>
          <p className="rd-hr-indic-tit"><Target className="w-3.5 h-3.5" /> Progreso</p>
          <p>Anota tus pesos en el portal del alumno. Si algo duele, avisa a tu entrenador.</p>
        </div>
      </section>
      <footer className="rd-hr-pie" data-salto>
        <div className="rd-hr-firma">
          <span />
          <p>Firma del entrenador</p>
        </div>
        <div className="text-right text-[11px] text-slate-500 space-y-0.5">
          {gymConfig.gym_direccion && <p className="flex items-center justify-end gap-1"><MapPin className="w-3 h-3" /> {gymConfig.gym_direccion}</p>}
          {gymConfig.gym_whatsapp && <p className="flex items-center justify-end gap-1"><Phone className="w-3 h-3" /> {gymConfig.gym_whatsapp}</p>}
          <p className="flex items-center justify-end gap-1"><Layers className="w-3 h-3" /> {gym} · con tecnología DAXSAY Fit Suite</p>
        </div>
      </footer>
    </article>
  );
}

export default HojaRutina;
