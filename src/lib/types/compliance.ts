// Estado de cumplimiento regulatorio Part-145 — Bloque J.
//
// Cada 60-90 días ingame la "autoridad" hace una auditoría que mira:
//   - WOs MEL expiradas sin reparar (penaliza)
//   - WOs Failed sin justificar (penaliza)
//   - Tasa de WOs completadas late (penaliza si alta)
//   - Tasa de checks A/C/D con overrun (penaliza)
//
// El score se mueve ±10 por auditoría. Por tramo:
//   - >70: operación limpia, sin consecuencias
//   - 30-70: warning, sin multa pero close watch
//   - <30: multa 50k € + suspensión de 1 contrato (random)
//   - <10: GAME OVER por revocación de certificación Part-145
//
// El score arranca a 80/100. Una operación bien llevada lo mantiene >70.

export interface ComplianceState {
  /** Score 0-100. Inicial 80. */
  score: number;
  /** Minuto absoluto de la última auditoría completada. Null si nunca. */
  lastAuditMinute: number | null;
  /** Minuto absoluto programado para la próxima auditoría. */
  nextAuditMinute: number;
  /** Findings humanos del último audit, para mostrar en modal. */
  openFindings: string[];
  /** Total de auditorías realizadas. */
  totalAudits: number;
  /** True si en la última auditoría score <30 → se suspende 1 contrato.
   *  El game.ts ejecuta la suspensión cuando ve esta flag y la limpia. */
  pendingSuspension: boolean;
  /** True cuando ya se emitió la notificación de pre-audit (3 días antes).
   *  Se resetea al ejecutar la auditoría. */
  preAuditNotified: boolean;
}
