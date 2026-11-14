-- =====================================================================
-- 35 · Objetivos del alumno ampliados (la misma lista que las rutinas)
-- Ejecutar una vez en MySQL Workbench. No borra datos: solo agrega opciones.
-- Antes: hipertrofia, pérdida de peso, fuerza, resistencia, tonificación, rehabilitación
-- Ahora también: recomposición, potencia, acondicionamiento, funcional, movilidad,
--                postura y core, adulto mayor y rendimiento deportivo.
-- =====================================================================
USE gestion_radicalgym;

ALTER TABLE alumnos MODIFY objetivo
  SET('hipertrofia','perdida_peso','fuerza','resistencia','tonificacion','rehabilitacion',
      'recomposicion','potencia','acondicionamiento','funcional','movilidad','postura','adulto_mayor','deportivo')
  NOT NULL DEFAULT 'tonificacion';

ALTER TABLE rutinas MODIFY objetivo
  ENUM('hipertrofia','perdida_peso','fuerza','resistencia','tonificacion','rehabilitacion',
       'recomposicion','potencia','acondicionamiento','funcional','movilidad','postura','adulto_mayor','deportivo')
  NOT NULL;

SELECT 'Listo: objetivos ampliados en alumnos y rutinas' AS resultado;
