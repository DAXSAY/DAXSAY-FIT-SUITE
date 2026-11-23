// Turnos de fisioterapia y nutrición en vivo: libres, reservados, en atención
// o atendidos. Sin nombres: lo ve el alumno, el entrenador y recepción. Se
// actualiza al instante cuando el especialista o recepción cambian algo.
import React, { useEffect, useMemo, useState } from "react";
import { Stethoscope, Apple, Radio } from "lucide-react";
import { api } from "../../api/cliente";
import { escucharCambios } from "../../utils/tiempoReal";
import { useHorasAtencion } from "./AgendaEspecialistas";
import { rangoCita, seCruzan, rangoTexto } from "../../utils/horario";
import { hoyISO } from "../../utils/fecha";

const LIBERAN = ["falta", "cancelled", "cancelada", "pospuesto"];
const SERV = [
  { k: "physiotherapy", nombre: "Fisioterapia", icono: Stethoscope },
  { k: "nutrition", nombre: "Nutrición", icono: Apple },
];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const masDias = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const minAhora = () => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  return Number(p.find((x) => x.type === "hour").value) * 60 + Number(p.find((x) => x.type === "minute").value);
};

const ESTADO = {
  libre: { txt: "Libre", cls: "rd-disp-libre" },
  reservado: { txt: "Por atender", cls: "rd-disp-reservado" },
  atendiendo: { txt: "En atención", cls: "rd-disp-atendiendo" },
  atendido: { txt: "Atendido", cls: "rd-disp-atendido" },
  pasado: { txt: "Pasó", cls: "rd-disp-pasado" },
};

export function DisponibilidadTurnos({ titulo = "Turnos de fisioterapia y nutrición", dias = 7 }) {
  const horasDe = useHorasAtencion();
  const hoy = hoyISO();
  const [fecha, setFecha] = useState(hoy);
  const [srv, setSrv] = useState("physiotherapy");
  const [citas, setCitas] = useState([]);
  const [ahora, setAhora] = useState(minAhora());

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      api(`/registros/ocupacion?desde=${hoy}&dias=${dias}`)
        .then((r) => vivo && setCitas(r.citas || []))
        .catch(() => {});
    cargar();
    const quitar = escucharCambios(cargar); // al instante cuando alguien guarda
    const t = setInterval(() => {
      setAhora(minAhora());
      cargar();
    }, 60000);
    return () => {
      vivo = false;
      quitar();
      clearInterval(t);
    };
  }, [hoy, dias]);

  const listaDias = useMemo(() => Array.from({ length: dias }, (_, i) => masDias(hoy, i)), [hoy, dias]);
  const turnos = useMemo(() => {
    const ag = horasDe(srv, fecha);
    return (ag?.turnos || []).map((t) => {
      const c = citas.find((x) => x.serviceType === srv && x.date === fecha && !LIBERAN.includes(x.status) && seCruzan(rangoCita(x), t));
      let estado = "libre";
      if (c) estado = c.status === "atendiendo" ? "atendiendo" : c.status === "atendido" ? "atendido" : "reservado";
      else if (fecha === hoy && t.fin <= ahora) estado = "pasado";
      return { ...t, estado };
    });
  }, [horasDe, srv, fecha, citas, ahora, hoy]);

  const cuenta = (e) => turnos.filter((t) => t.estado === e).length;
  const libresDe = (f) => {
    const ag = horasDe(srv, f);
    return (ag?.turnos || []).filter(
      (t) => !citas.some((x) => x.serviceType === srv && x.date === f && !LIBERAN.includes(x.status) && seCruzan(rangoCita(x), t)) && !(f === hoy && t.fin <= ahora),
    ).length;
  };

  return (
    <section className="rd-disp rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-600" /> {titulo}
          <span className="rd-disp-vivo">EN VIVO</span>
        </h3>
        <div className="flex gap-1">
          {SERV.map((s) => (
            <button key={s.k} type="button" onClick={() => setSrv(s.k)} className={`rd-disp-srv ${srv === s.k ? "rd-disp-srv-on" : ""}`}>
              <s.icono className="w-3.5 h-3.5" /> {s.nombre}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {listaDias.map((f) => {
          const d = new Date(`${f}T12:00:00`);
          const n = libresDe(f);
          return (
            <button key={f} type="button" onClick={() => setFecha(f)} className={`rd-disp-dia ${fecha === f ? "rd-disp-dia-on" : ""}`}>
              <span className="text-[10px] font-bold uppercase">{f === hoy ? "Hoy" : DIAS[d.getDay()]}</span>
              <span className="text-base font-black leading-none">{d.getDate()}</span>
              <span className="text-[10px] font-semibold">{horasDe(srv, f)?.turnos?.length ? `${n} libres` : "sin horario"}</span>
            </button>
          );
        })}
      </div>
      {turnos.length ? (
        <>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
            {["libre", "reservado", "atendiendo", "atendido"].map((e) => (
              <span key={e} className={`rd-disp-ley ${ESTADO[e].cls}`}>
                {ESTADO[e].txt}: {cuenta(e)}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {turnos.map((t) => (
              <div key={t.ini} className={`rd-disp-turno ${ESTADO[t.estado].cls}`}>
                <span className="font-extrabold tabular-nums">{rangoTexto(t.ini, t.fin)}</span>
                <span className="text-[10px] font-bold uppercase">{ESTADO[t.estado].txt}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500 py-3 text-center">El especialista aún no publicó turnos para este día.</p>
      )}
    </section>
  );
}

export default DisponibilidadTurnos;
