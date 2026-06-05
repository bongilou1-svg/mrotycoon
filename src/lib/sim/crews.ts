// Cuadrillas (crews) — helpers de modelo. La composición es MANUAL (Oficina), pero arrancamos
// con cuadrillas por defecto derivadas de la plantilla inicial para que la partida sea jugable.

import type { Mechanic } from "../types/mechanic.ts";
import type { Crew } from "../types/crew.ts";

/** Paleta de colores de furgoneta por cuadrilla (CIC). Se reparte en orden. */
export const CREW_COLORS = [0xf5b945, 0x3fb950, 0x6dc7ff, 0xa78bfa, 0xff8c69, 0x4ad6c0, 0xe06bd0, 0x9fd356];

/** Todos los IDs de mecánico de una cuadrilla (oficiales + helpers). */
export function crewMemberIds(crew: Crew): string[] {
  return [...crew.officerIds, ...crew.helperIds];
}

/** La cuadrilla a la que pertenece un mecánico, o undefined si está sin cuadrilla. */
export function findCrewOfMechanic(crews: Crew[], mechanicId: string): Crew | undefined {
  return crews.find((c) => c.officerIds.includes(mechanicId) || c.helperIds.includes(mechanicId));
}

/** Siguiente ID libre "CR-N" (max existente + 1, robusto ante borrados). */
export function nextCrewId(crews: Crew[]): string {
  let max = 0;
  for (const c of crews) {
    const n = parseInt(c.id.replace(/^CR-/, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `CR-${max + 1}`;
}

/** Nombre por defecto "Cuadrilla A/B/C…" según cuántas haya. */
export function defaultCrewName(index: number): string {
  // A..Z luego "Cuadrilla 27", etc.
  return index < 26 ? `Cuadrilla ${String.fromCharCode(65 + index)}` : `Cuadrilla ${index + 1}`;
}

/**
 * Forma cuadrillas por defecto desde la plantilla: por turno (mañana/tarde/noche), agrupa cada
 * oficial (B1/B2, NO lead foreman) con hasta 2 helpers del mismo turno, repartiéndolos. Oficiales
 * sin helper quedan como cuadrilla de 1 (el jugador puede añadir). Lead foremen y mecánicos sin
 * turno se omiten. Determinista (orden de la plantilla).
 */
export function buildDefaultCrews(mechanics: Mechanic[]): Crew[] {
  const crews: Crew[] = [];
  const shifts: Array<"morning" | "afternoon" | "night"> = ["morning", "afternoon", "night"];
  for (const shift of shifts) {
    const inShift = mechanics.filter((m) => (m.shift ?? "morning") === shift && !m.isLeadForeman);
    const officers = inShift.filter((m) => m.base === "B1" || m.base === "B2");
    const helpers = inShift.filter((m) => m.base === null);
    let h = 0;
    officers.forEach((off, i) => {
      const remainingOfficers = officers.length - i;
      const per = remainingOfficers > 0 ? Math.min(2, Math.ceil((helpers.length - h) / remainingOfficers)) : 0;
      const crewHelpers: string[] = [];
      for (let k = 0; k < per && h < helpers.length; k++) crewHelpers.push(helpers[h++].id);
      crews.push({
        id: `CR-${crews.length + 1}`,
        name: defaultCrewName(crews.length),
        officerIds: [off.id],
        helperIds: crewHelpers,
        color: CREW_COLORS[crews.length % CREW_COLORS.length],
      });
    });
  }
  return crews;
}

// ── Mutaciones puras (la UI hace game.crews = resultado) ──────────────────────────────

/** Crea una cuadrilla nueva vacía. Devuelve el array nuevo + el id creado. */
export function createCrew(crews: Crew[]): { crews: Crew[]; crewId: string } {
  const id = nextCrewId(crews);
  const crew: Crew = { id, name: defaultCrewName(crews.length), officerIds: [], helperIds: [], color: CREW_COLORS[crews.length % CREW_COLORS.length] };
  return { crews: [...crews, crew], crewId: id };
}

/** Elimina una cuadrilla (sus miembros quedan libres). */
export function deleteCrew(crews: Crew[], crewId: string): Crew[] {
  return crews.filter((c) => c.id !== crewId);
}

/** Renombra una cuadrilla (máx 40 chars). */
export function renameCrew(crews: Crew[], crewId: string, name: string): Crew[] {
  return crews.map((c) => (c.id === crewId ? { ...c, name: name.slice(0, 40) } : c));
}

/** Añade un mecánico como oficial o helper. Valida: no en otra cuadrilla, oficial = base B1/B2,
 *  máx 2 oficiales + 2 helpers, lead foreman no asignable. Devuelve {crews, error?}. */
export function addCrewMember(
  crews: Crew[],
  mechanics: Mechanic[],
  crewId: string,
  mechanicId: string,
  role: "officer" | "helper",
): { crews: Crew[]; error?: string } {
  const crew = crews.find((c) => c.id === crewId);
  if (!crew) return { crews, error: "Cuadrilla no encontrada" };
  const mech = mechanics.find((m) => m.id === mechanicId);
  if (!mech) return { crews, error: "Mecánico no encontrado" };
  if (mech.isLeadForeman) return { crews, error: "El Lead Foreman no se asigna a cuadrillas" };
  if (findCrewOfMechanic(crews, mechanicId)) return { crews, error: "Ese mecánico ya está en una cuadrilla" };
  if (role === "officer") {
    if (mech.base !== "B1" && mech.base !== "B2") return { crews, error: "El oficial debe ser B1 o B2" };
    if (crew.officerIds.length >= 2) return { crews, error: "Máximo 2 oficiales por cuadrilla" };
    return { crews: crews.map((c) => (c.id === crewId ? { ...c, officerIds: [...c.officerIds, mechanicId] } : c)) };
  }
  if (crew.helperIds.length >= 2) return { crews, error: "Máximo 2 helpers por cuadrilla" };
  return { crews: crews.map((c) => (c.id === crewId ? { ...c, helperIds: [...c.helperIds, mechanicId] } : c)) };
}

/** Quita un mecánico de una cuadrilla (de oficiales o helpers). */
export function removeCrewMember(crews: Crew[], crewId: string, mechanicId: string): Crew[] {
  return crews.map((c) =>
    c.id === crewId
      ? { ...c, officerIds: c.officerIds.filter((x) => x !== mechanicId), helperIds: c.helperIds.filter((x) => x !== mechanicId) }
      : c,
  );
}
