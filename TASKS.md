# MRO Tycoon — TASKS (post-pivot línea pura)

> Backlog vivo tras cierre F5D + pivot MRO línea pura (2026-05-24).
> Anterior backlog F5A archivado en `docs/CIERRE_fase5a.md` (todo ✅).
> Estado vivo en `STATUS.md`. Brief modelo de negocio en `STATUS.md § Parking · Modelo HH + Tiers`.

---

## 🎯 Sprint actual — Modelo HH + criba WO callout/mpd

| # | Bloque | Estado | Esfuerzo |
|---|---|---|---|
| **HH-A** | Modelo HH base (bookHours/actualHours/hourlyRateEur + KPI eficiencia) | ✅ DONE 2026-05-24 | 1.5-2h |
| **WO-K** | Criba 100 WOs A320/A321 en callout vs mpd | ✅ DONE 2026-05-24 | 1h |
| **WO-K2** | Integrar campo `kind: "callout"\|"mpd"` en `WorkOrder` type + adapters de generación | 🟡 PDTE | 1h |
| **HH-B** | Tiers contrato 1-4 refactor (line/A-check/C-check/D-check) — gating de tipo de trabajo enviado | 🟡 PDTE | 1-1.5h |
| **HH-C** | Findings durante daily check (prob % sub-WO al ejecutar) | 🟡 PDTE | 1.5h |
| **HH-D** | Subscription HH/mes por aerolínea (reemplaza weekly fee fijo) | 🟡 PDTE | 30min |
| **AOG-T** | Decisión threshold AOG 3h vs 6h vs por tier | 🟡 DUDA | 5min decisión + 30min impl |

---

## 🛩️ Backlog — Datasets WO por tipo de avión

Hoy: 100 WOs hardcoded A320/A321 (CFM56 + V2500). Cada nuevo tipo de avión requiere su propio dataset realista para preservar el USP autenticidad.

| Modelo | Engines típicos | Estado dataset | Prioridad | Notas |
|---|---|---|---|---|
| **A320** | CFM56-5B / V2500-A5 | ✅ 100 WOs (Fase 2 portadas, reescritas realistas 5e) | — | Base |
| **A321** | CFM56-5B / V2500-A5 | ✅ comparte dataset A320 (95% solapamiento) | — | Add ~5 WOs A321-only (flaps, jettison valve) |
| **A319** | CFM56-5B / V2500-A5 | 🟡 reuse A320 dataset | low | Solo diff: 1 puerta menos, fuel tank menor |
| **B737-800** | CFM56-7B | 🔴 0 WOs | **alta** (vuela en OVD: VY 738) | Sistemas distintos: leading-edge slats vs Krueger flaps, no PTU, sin sidestick |
| **B737 MAX 8** | LEAP-1B | 🔴 0 WOs | **alta** (VY MAX 8) | Como 738 + MCAS + nuevos engines |
| **ATR 72-600** | PW127 turboprop | 🔴 0 WOs | **alta** (V7 Volotea ATR72) | Turboprop = nuevo ATA chapter set (61 propellers, 76 engine controls turboprop) |
| **E190 / E195** | CF34-10E | 🟡 0 WOs | media | Ya hay alguna lead Air Nostrum en OVD |
| **A330** | Trent 700 / CF6 / PW4000 | 🟡 0 WOs | media-baja | Tier 4 endgame, hangar mayor obligatorio |
| **B777 / B787** | GE90 / GEnx / Trent 1000 | 🟡 0 WOs | baja | Endgame premium, wide-body |

**Task pendiente concreta — WO datasets multi-modelo**:

- [ ] **WO-DS-737**: dataset 80-100 WOs realistas B737-800 con engine CFM56-7B. ATA chapters: ajustar (no PTU = 0 WOs ATA 29 PTU; sidestick → yoke; leading edge slats → Krueger flaps en B737). Fuentes: B737 AMM real, MPD CFM56-7B. **Esfuerzo: 4-6h** (research + redacción AMM-grade).
- [ ] **WO-DS-ATR72**: dataset 60-80 WOs ATR72-600 turboprop. ATA 61 (propellers PW127) introduce capítulo nuevo. Fuentes: ATR 72 AMM, PW Canada MPD. **Esfuerzo: 4-6h**.
- [ ] **WO-DS-E190**: dataset 60-80 WOs E190/E195. **Esfuerzo: 3-5h**.
- [ ] **WO-DS-A330**: dataset 80-100 WOs A330 (wide-body, distintos sistemas hyd + fuel + landing gear). **Esfuerzo: 5-7h**.

**Criterio cuando se ejecute**: misma estructura JSON que `workorders.json` actual + campo `kind` ya integrado. Cada WO con AMM ref real, P/N real, severity coherente con criticidad sistema, splitting callout/mpd ~50/50.

---

## 📋 Parking-import desde STATUS.md (deuda viva)

Sin esfuerzo de planning aquí — son los items grandes del Parking. Cuando alguno se promueva a sprint, se mueve arriba.

- **Tier upgrade timing más rápido** (Iberia 60d → 30d) — tuning económico fino
- **Tiempo tránsito oficina→stand variable por distancia** — solo cuando entre multi-aeropuerto
- **Fase 2 evitable/no evitable Full** (state machine vs heurística post-hoc actual)
- **Click-to-detail histórico drill-down**
- **Dashboard KPIs ampliado** (heatmap stands, ratios per-aerolínea)
- **Drive pipeline Dev↔Design** (memory ref ya existe)

---

## ⛔ Bloqueos

- **Tauri Windows GNU**: bug Rust 1.95 + proc-macros. Documentado en `docs/TAURI_BLOQUEADO.md`. Workaround pendiente: instalar MSVC toolchain.
- **MCP homelab-runner timeout** (sesión 2026-05-13): histórico, puede haberse resuelto.

---

## Notas

- Disciplina pre-Fase 6: cada bloque HH → tests → auto-playtest → bundle antes de mergear.
- Cada nuevo dataset WO por modelo requiere review humano antes de mergear — la autenticidad es el USP, errores AMM destruyen credibilidad.
- AOG threshold: hoy 6h. Dani dice 3h en briefing oral. Resolver antes de seguir balancing.
