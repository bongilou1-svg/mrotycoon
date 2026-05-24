// Candidatos del mercado laboral — Bloque K.
//
// Pool de 5-10 candidatos visible que se refresca cada 7 días ingame. El jugador puede contratarlos
// pagando un signing bonus (= 4 semanas de salario esperado). El candidato se convierte entonces
// en `Mechanic` y se añade al pool del taller.

import type { MechanicCategory, TypeRating } from "./mechanic";

export interface Candidate {
  /** ID estable "CND-NNNNNN". */
  id: string;
  /** Nombre humano. */
  name: string;
  /** Edad (22-58). Afecta personality stub y experiencia. */
  age: number;
  /** Base de licencia. Null = helper. */
  base: MechanicCategory | null;
  /** Type ratings que trae. Vacío en helpers puros. */
  typeRatings: TypeRating[];
  /** Eficiencia base (varía 0.6-1.2 según experiencia). */
  efficiency: number;
  /** Salario semanal que pide. */
  expectedWeeklySalary: number;
  /** Años de experiencia. */
  experienceYears: number;
  /** 3 rasgos de personalidad (stub, flavor en MVP, gameplay en Fase 4). */
  personality: string[];
  /** Minuto ingame en el que apareció en el mercado. */
  generatedAtMinute: number;
  /** Minuto en el que expira del mercado (típicamente +7 días). */
  expiresAtMinute: number;
  /** Fase 5A W2: si true, candidato es Lead Foreman (TMA jefe). No asignable a WOs. */
  isLeadForeman?: boolean;
}
