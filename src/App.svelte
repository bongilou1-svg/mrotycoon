<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { getGame, tick, setSpeed, acceptOffer, rejectOffer, assign } from "$lib/stores/game";
  import { formatClock, getWeek } from "$lib/sim/time.ts";
  import type { Speed } from "$lib/sim/time.ts";
  import type { WorkOrderInstance } from "$lib/types";

  let activeTab = $state<"hangar" | "mechanics" | "contracts" | "economy">("hangar");
  let selectedWoId = $state<string | null>(null);
  let manualCertifier = $state<string>("");
  let manualHelpers = $state<string[]>([]);

  // Game loop: cada 100ms real avanza N min ingame según speed
  let timerId: ReturnType<typeof setInterval> | null = null;
  const STEP_PER_TICK = 1; // 1 min ingame por tick a 1x; speed multiplica
  let realTicks = $state(0);

  onMount(() => {
    timerId = setInterval(() => {
      const g = getGame();
      if (g.clock.speed === 0) return;
      tick(STEP_PER_TICK * g.clock.speed);
      realTicks++;
    }, 100);
  });

  onDestroy(() => {
    if (timerId !== null) clearInterval(timerId);
  });

  let g = $derived(getGame());

  let activeWos = $derived(g.workOrders.filter((w) => w.phase !== "Completed" && w.phase !== "Failed"));
  let recentTxs = $derived(g.economy.ledger.slice(-25).reverse());

  let selectedWo = $derived(selectedWoId ? g.workOrders.find((w) => w.instanceId === selectedWoId) ?? null : null);
  let selectedTemplate = $derived(selectedWo ? g.templates.find((t) => t.id === selectedWo.templateId) : null);
  let selectedAirplane = $derived(selectedWo ? g.airplanes.find((a) => a.instanceId === selectedWo.airplaneInstanceId) : null);

  let eligibleCerts = $derived.by(() => {
    if (!selectedTemplate || !selectedAirplane || !selectedWo || selectedWo.assignedMechanicIds.length > 0) return [];
    return g.mechanics.filter((m) =>
      m.state === "Idle" &&
      m.base === selectedTemplate.requiredCategory &&
      m.typeRatings.some(
        (r) => r.model === selectedAirplane.model && r.engineVariant === selectedAirplane.engineVariant && r.category === selectedTemplate.requiredCategory,
      ),
    );
  });
  let eligibleHelps = $derived.by(() => {
    if (!selectedWo) return [];
    return g.mechanics.filter((m) => m.state === "Idle" && m.id !== manualCertifier);
  });

  function openWo(id: string) {
    selectedWoId = id;
    manualCertifier = "";
    manualHelpers = [];
  }

  function closeWo() {
    selectedWoId = null;
  }

  function doAssign() {
    if (!selectedWoId || !manualCertifier) return;
    const r = assign(selectedWoId, manualCertifier, manualHelpers);
    if (r.ok) closeWo();
  }

  function toggleHelper(id: string) {
    if (manualHelpers.includes(id)) manualHelpers = manualHelpers.filter((h) => h !== id);
    else if (manualHelpers.length < 2) manualHelpers = [...manualHelpers, id];
  }

  function speedBtn(s: Speed) { setSpeed(s); }

  function airlineName(id: string): string {
    return g.airlines.find((a) => a.id === id)?.name ?? id;
  }

  function airplaneByInstanceId(instanceId: string) {
    return g.airplanes.find((a) => a.instanceId === instanceId);
  }

  function slaPct(wo: WorkOrderInstance, nowMin: number): number {
    const margin = wo.slaMinute - nowMin;
    const totalWindow = wo.slaMinute - wo.emissionMinute;
    if (totalWindow <= 0) return 0;
    return Math.max(0, Math.min(100, (margin / totalWindow) * 100));
  }

  function phasePct(wo: WorkOrderInstance): number {
    const tpl = g.templates.find((t) => t.id === wo.templateId);
    if (!tpl) return 0;
    const ratios = g.balance.phaseDurationRatios;
    const phaseDur = {
      ToPlane: 0, Inspection: tpl.durationMinutes * ratios.inspection,
      MainTask: tpl.durationMinutes * ratios.mainTask, Test: tpl.durationMinutes * ratios.test,
      Rework: tpl.durationMinutes * ratios.rework, Completed: 0, Failed: 0,
    }[wo.phase] || 1;
    return Math.min(100, (wo.phaseElapsedMinutes / phaseDur) * 100);
  }
</script>

<div class="app">
  <header class="hud">
    <div class="hud-left">
      <span class="brand">MRO Tycoon</span>
      <span class="ver">v0.1.0-alpha · Bloque D</span>
    </div>
    <div class="hud-center">
      <span class="clock">{formatClock(g.clock.minute)}</span>
      <span class="week">Semana {getWeek(g.clock.minute)}</span>
    </div>
    <div class="hud-right">
      <div class="kpi">💰 <strong class:neg={g.economy.balance < 0}>{g.economy.balance.toLocaleString()} €</strong></div>
      <div class="kpi">⭐ <strong>{Math.round(Object.values(g.reputation.perAirline).reduce((s,v)=>s+v,0) / Math.max(1, Object.keys(g.reputation.perAirline).length))}</strong>/100</div>
      <div class="speeds">
        <button class:active={g.clock.speed === 0} onclick={() => speedBtn(0)} title="Pausa">⏸</button>
        <button class:active={g.clock.speed === 1} onclick={() => speedBtn(1)}>1×</button>
        <button class:active={g.clock.speed === 2} onclick={() => speedBtn(2)}>2×</button>
        <button class:active={g.clock.speed === 5} onclick={() => speedBtn(5)}>5×</button>
      </div>
    </div>
  </header>

  <div class="body">
    <aside class="sidebar">
      <button class:active={activeTab === "hangar"} onclick={() => activeTab = "hangar"}>🏭 Hangar <span class="badge">{activeWos.length}</span></button>
      <button class:active={activeTab === "mechanics"} onclick={() => activeTab = "mechanics"}>⚙️ Mecánicos</button>
      <button class:active={activeTab === "contracts"} onclick={() => activeTab = "contracts"}>📋 Contratos <span class="badge">{g.contracts.filter(c => c.status === "offered").length}</span></button>
      <button class:active={activeTab === "economy"} onclick={() => activeTab = "economy"}>💼 Economía</button>
    </aside>

    <main class="panel">
      {#if g.gameOver.isOver}
        <div class="game-over">
          <h1>🛑 GAME OVER</h1>
          <p>{g.gameOver.reason === "bankruptcy" ? "Bancarrota" : "Reputación cero"}</p>
        </div>
      {:else if activeTab === "hangar"}
        <h2>Hangar — Stands & WOs activas</h2>
        {#if activeWos.length === 0}
          <p class="muted">No hay WOs activas. Espera a que llegue un avión (acelera con 5×).</p>
        {:else}
          <div class="wo-grid">
            {#each activeWos as wo}
              {@const tpl = g.templates.find((t) => t.id === wo.templateId)}
              {@const ap = airplaneByInstanceId(wo.airplaneInstanceId)}
              {@const margin = wo.slaMinute - g.clock.minute}
              <article class="wo-card" class:aog={tpl?.isAOG} onclick={() => openWo(wo.instanceId)}>
                <header class="wo-head">
                  <span class="wo-id">{wo.instanceId}</span>
                  {#if tpl?.isAOG}<span class="aog-badge">🛑 AOG</span>{/if}
                  <span class="wo-phase phase-{wo.phase}">{wo.phase}</span>
                </header>
                <div class="wo-desc">{tpl?.description ?? "?"}</div>
                <div class="wo-meta">
                  <span>✈️ {ap?.registration} ({ap?.model})</span>
                  <span>ATA {tpl?.ata}</span>
                  <span>{tpl?.requiredCategory}</span>
                  <span>{tpl?.durationMinutes}min</span>
                </div>
                <div class="bar-wrap">
                  <span class="bar-label">Progreso fase</span>
                  <div class="bar"><div class="fill primary" style:width="{phasePct(wo)}%"></div></div>
                </div>
                <div class="bar-wrap">
                  <span class="bar-label" class:bad={margin < 0}>SLA {margin >= 0 ? `+${margin}m` : `${margin}m ¡tarde!`}</span>
                  <div class="bar"><div class="fill" class:good={margin > 10} class:warn={margin <= 10 && margin > 0} class:bad={margin <= 0} style:width="{slaPct(wo, g.clock.minute)}%"></div></div>
                </div>
                <div class="wo-team">
                  {#if wo.assignedMechanicIds.length === 0}
                    <span class="muted">⚠️ sin asignar (click)</span>
                  {:else}
                    {#each wo.assignedMechanicIds as mid, i}
                      {@const m = g.mechanics.find((mm) => mm.id === mid)}
                      <span class="chip">{i === 0 ? "🪪" : "🤝"} {m?.name ?? mid}</span>
                    {/each}
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        {/if}

      {:else if activeTab === "mechanics"}
        <h2>Mecánicos ({g.mechanics.length})</h2>
        <table>
          <thead><tr><th>ID</th><th>Nombre</th><th>Base</th><th>Ratings</th><th>Eff</th><th>Estado</th><th>Asignado</th><th>Salario</th></tr></thead>
          <tbody>
            {#each g.mechanics as m}
              <tr>
                <td class="mono">{m.id}</td>
                <td>{m.name}</td>
                <td>{m.base ?? "Helper"}</td>
                <td class="mono">{m.typeRatings.map((r) => `${r.model}/${r.engineVariant}/${r.category}`).join(", ") || "—"}</td>
                <td class="mono">{m.efficiency}</td>
                <td><span class="state state-{m.state}">{m.state}</span></td>
                <td class="mono">{m.assignedWoInstanceId ?? "—"}</td>
                <td class="mono">{m.weeklySalary.toLocaleString()} €/sem</td>
              </tr>
            {/each}
          </tbody>
        </table>

      {:else if activeTab === "contracts"}
        <h2>Contratos</h2>
        <h3>Activos</h3>
        {#each g.contracts.filter(c => c.status === "active") as c}
          <article class="contract-card">
            <header><strong>{airlineName(c.airlineId)}</strong> · {c.id}</header>
            <div class="kvs">
              <span>Cuota semanal: <strong>{c.baseFeePerWeek.toLocaleString()} €</strong></span>
              <span>€/min WO: <strong>{c.paymentPerWOMinute}</strong></span>
              <span>Penalty: <strong>{c.penaltyPerLateMinute} €/min</strong></span>
              <span>Rep. min.: <strong>{c.minReputation}</strong></span>
              <span>Aviones/día: <strong>{c.expectedLandingsPerDay}</strong></span>
            </div>
          </article>
        {/each}

        <h3>Ofertas</h3>
        {#each g.contracts.filter(c => c.status === "offered") as c}
          <article class="contract-card offer">
            <header><strong>{airlineName(c.airlineId)}</strong> · {c.id} · expira en {c.expiresAtMinute ? Math.max(0, c.expiresAtMinute - g.clock.minute) : 0}m</header>
            <div class="kvs">
              <span>Cuota semanal: <strong>{c.baseFeePerWeek.toLocaleString()} €</strong></span>
              <span>€/min WO: <strong>{c.paymentPerWOMinute}</strong></span>
              <span>Penalty: <strong>{c.penaltyPerLateMinute} €/min</strong></span>
              <span>Rep. min.: <strong>{c.minReputation}</strong></span>
            </div>
            <div class="actions">
              <button class="primary" onclick={() => acceptOffer(c.id)}>Aceptar</button>
              <button onclick={() => rejectOffer(c.id)}>Rechazar</button>
            </div>
          </article>
        {/each}
        {#if g.contracts.filter(c => c.status === "offered").length === 0}
          <p class="muted">No hay ofertas pendientes.</p>
        {/if}

      {:else if activeTab === "economy"}
        <h2>Economía</h2>
        <div class="econ-grid">
          <div class="card-mini">
            <div class="lbl">Balance</div>
            <div class="big" class:neg={g.economy.balance < 0}>{g.economy.balance.toLocaleString()} €</div>
          </div>
          <div class="card-mini">
            <div class="lbl">Δ desde inicio</div>
            <div class="big" class:neg={g.economy.balance < g.balance.startingBalance}>{(g.economy.balance - g.balance.startingBalance).toLocaleString()} €</div>
          </div>
          <div class="card-mini">
            <div class="lbl">Transacciones</div>
            <div class="big">{g.economy.ledger.length}</div>
          </div>
          <div class="card-mini">
            <div class="lbl">Semanas neg.</div>
            <div class="big" class:neg={g.economy.negativeStreakWeeks > 0}>{g.economy.negativeStreakWeeks}/2</div>
          </div>
        </div>
        <h3>Últimas 25 transacciones</h3>
        <table>
          <thead><tr><th>Tiempo</th><th>Tipo</th><th>Descripción</th><th>Cantidad</th></tr></thead>
          <tbody>
            {#each recentTxs as t}
              <tr>
                <td class="mono">{formatClock(t.minute)}</td>
                <td>{t.type}</td>
                <td>{t.description}</td>
                <td class="mono" class:pos={t.amount > 0} class:neg={t.amount < 0}>{t.amount > 0 ? "+" : ""}{t.amount.toLocaleString()} €</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </main>

    <aside class="notifs">
      <h3>Notificaciones</h3>
      {#each g.notifications.slice(-12).reverse() as n (n.id)}
        <div class="notif notif-{n.type}">
          <span class="t">{formatClock(n.minute)}</span>
          <span>{n.text}</span>
        </div>
      {/each}
      {#if g.notifications.length === 0}
        <p class="muted">—</p>
      {/if}
    </aside>
  </div>

  {#if selectedWo && selectedTemplate && selectedAirplane}
    <div class="modal-back" onclick={closeWo} role="presentation">
      <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
        <header class="modal-head">
          <h3>{selectedWo.instanceId} — {selectedTemplate.description}</h3>
          <button class="close" onclick={closeWo}>×</button>
        </header>
        <div class="modal-body">
          <div class="kvs">
            <span>ATA: <strong>{selectedTemplate.ata}</strong></span>
            <span>Categoría requerida: <strong>{selectedTemplate.requiredCategory}</strong></span>
            <span>Duración: <strong>{selectedTemplate.durationMinutes} min</strong></span>
            <span>Severidad: <strong>{selectedTemplate.severity}</strong></span>
            <span>SLA: <strong>{selectedWo.slaMinute - g.clock.minute}m restantes</strong></span>
            <span>Avión: <strong>{selectedAirplane.registration} ({selectedAirplane.model}/{selectedAirplane.engineVariant})</strong></span>
          </div>
          {#if selectedTemplate.isAOG}<div class="alert aog-alert">🛑 AOG · penalty ×5 · no diferible</div>{/if}

          {#if selectedWo.assignedMechanicIds.length > 0}
            <h4>Ya asignados:</h4>
            <ul>{#each selectedWo.assignedMechanicIds as id, i}
              {@const m = g.mechanics.find((mm) => mm.id === id)}
              <li>{i === 0 ? "🪪 Certifier" : "🤝 Helper"}: {m?.name}</li>
            {/each}</ul>
          {:else}
            <h4>Asignar mecánicos</h4>
            <label>Certifier (con type rating válido):</label>
            <select bind:value={manualCertifier}>
              <option value="">— elegir —</option>
              {#each eligibleCerts as m}
                <option value={m.id}>{m.name} · {m.base} · eff {m.efficiency}</option>
              {/each}
            </select>
            {#if eligibleCerts.length === 0}<p class="muted">Ningún certifier disponible (todos ocupados o sin rating).</p>{/if}

            <label>Helpers (máx 2):</label>
            <div class="helper-list">
              {#each eligibleHelps as h}
                <label class="helper-item">
                  <input type="checkbox" checked={manualHelpers.includes(h.id)} onchange={() => toggleHelper(h.id)} disabled={!manualHelpers.includes(h.id) && manualHelpers.length >= 2} />
                  {h.name} · {h.base ?? "Helper"} · eff {h.efficiency}
                </label>
              {/each}
            </div>

            <button class="primary" onclick={doAssign} disabled={!manualCertifier}>Asignar</button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(html), :global(body), :global(#app) { margin: 0; padding: 0; height: 100vh; width: 100vw; overflow: hidden; }
  :global(body) { background: var(--bg); color: var(--text); font: 14px/1.5 "Inter", system-ui, sans-serif; }
  .app { display: flex; flex-direction: column; height: 100vh; }

  .hud { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 1rem; background: var(--panel-bg); border-bottom: 1px solid var(--border); flex-shrink: 0; height: 48px; }
  .hud-left, .hud-right { display: flex; gap: 0.5rem; align-items: center; }
  .hud-center { display: flex; gap: 1rem; align-items: center; }
  .brand { font-weight: 600; color: var(--accent); }
  .ver { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); }
  .clock { font-family: var(--font-mono); font-size: 1.05rem; }
  .week { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); }
  .kpi { font-size: 0.85rem; color: var(--text-muted); }
  .kpi strong { color: var(--text); font-family: var(--font-mono); }
  .kpi strong.neg { color: var(--danger); }
  .speeds { display: flex; gap: 0.2rem; margin-left: 0.5rem; }
  .speeds button { padding: 0.2rem 0.5rem; font-size: 0.8rem; }
  .speeds button.active { background: var(--accent-dim); border-color: var(--accent); }

  .body { display: grid; grid-template-columns: 180px 1fr 280px; flex: 1; min-height: 0; }
  .sidebar { background: var(--panel-bg); border-right: 1px solid var(--border); padding: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .sidebar button { text-align: left; padding: 0.5rem 0.75rem; border: 1px solid transparent; background: transparent; }
  .sidebar button:hover { background: var(--panel-bg-hover); }
  .sidebar button.active { background: var(--accent-dim); border-color: var(--accent); }
  .badge { float: right; background: var(--accent); color: white; padding: 0 6px; border-radius: 10px; font-size: 0.7rem; }

  .panel { overflow-y: auto; padding: 1rem 1.5rem; }
  .panel h2 { font-size: 1rem; margin: 0 0 1rem; font-weight: 600; }
  .panel h3 { font-size: 0.85rem; margin: 1rem 0 0.5rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

  .wo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 0.75rem; }
  .wo-card { background: var(--panel-bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.75rem 1rem; cursor: pointer; transition: border-color 0.12s; }
  .wo-card:hover { border-color: var(--accent); }
  .wo-card.aog { border-color: var(--aog); background: linear-gradient(to bottom, rgba(255,59,59,0.08), var(--panel-bg)); }
  .wo-head { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.3rem; }
  .wo-id { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); }
  .wo-phase { font-size: 0.7rem; padding: 1px 6px; border-radius: 3px; background: var(--bg); border: 1px solid var(--border); }
  .phase-Inspection, .phase-Test { color: var(--accent); border-color: var(--accent-dim); }
  .phase-MainTask, .phase-Rework { color: var(--warning); border-color: var(--warning); }
  .phase-ToPlane { color: var(--text-muted); }
  .aog-badge { font-size: 0.7rem; padding: 1px 6px; background: var(--aog); color: white; border-radius: 3px; font-weight: 700; }
  .wo-desc { font-size: 0.88rem; margin-bottom: 0.4rem; }
  .wo-meta { display: flex; gap: 0.6rem; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.5rem; font-family: var(--font-mono); }
  .bar-wrap { display: flex; align-items: center; gap: 0.5rem; margin: 0.2rem 0; }
  .bar-label { font-size: 0.72rem; color: var(--text-muted); width: 5.5rem; flex-shrink: 0; }
  .bar-label.bad { color: var(--danger); }
  .bar { flex: 1; height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden; }
  .fill { height: 100%; background: var(--accent); transition: width 0.4s; }
  .fill.primary { background: var(--accent); }
  .fill.good { background: var(--success); }
  .fill.warn { background: var(--warning); }
  .fill.bad { background: var(--danger); }
  .wo-team { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.4rem; }
  .chip { font-size: 0.7rem; padding: 1px 6px; background: var(--bg); border: 1px solid var(--border); border-radius: 999px; }
  .muted { color: var(--text-muted); font-size: 0.85rem; }

  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  th { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase; font-weight: 500; letter-spacing: 0.05em; }
  td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border); }
  tr:hover { background: rgba(255,255,255,0.02); }
  .mono { font-family: var(--font-mono); color: var(--text-muted); }
  .mono.pos { color: var(--success); }
  .mono.neg { color: var(--danger); }
  .state { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 0.7rem; }
  .state-Idle { background: rgba(63,185,80,0.15); color: var(--success); }
  .state-Working { background: rgba(77,163,255,0.15); color: var(--accent); }
  .state-ToPlane, .state-Returning { background: rgba(210,153,34,0.15); color: var(--warning); }

  .contract-card { background: var(--panel-bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 0.5rem; }
  .contract-card.offer { border-color: var(--accent-dim); }
  .contract-card header { font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--text-muted); }
  .contract-card header strong { color: var(--text); }
  .kvs { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.85rem; color: var(--text-muted); }
  .kvs strong { color: var(--text); font-family: var(--font-mono); }
  .actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }

  .econ-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.5rem; margin-bottom: 1rem; }
  .card-mini { background: var(--panel-bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.75rem 1rem; }
  .card-mini .lbl { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .card-mini .big { font-family: var(--font-mono); font-size: 1.4rem; color: var(--accent); }
  .card-mini .big.neg { color: var(--danger); }

  .notifs { background: var(--panel-bg); border-left: 1px solid var(--border); padding: 0.75rem 1rem; overflow-y: auto; }
  .notifs h3 { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin: 0 0 0.5rem; letter-spacing: 0.05em; }
  .notif { display: flex; gap: 0.5rem; padding: 0.3rem 0; font-size: 0.78rem; border-bottom: 1px solid var(--border); }
  .notif .t { font-family: var(--font-mono); color: var(--text-subtle); font-size: 0.7rem; flex-shrink: 0; }
  .notif-info { color: var(--text-muted); }
  .notif-success { color: var(--success); }
  .notif-warning { color: var(--warning); }
  .notif-danger { color: var(--danger); }

  .modal-back { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
  .modal { background: var(--modal-bg); border: 1px solid var(--border-strong); border-radius: var(--radius-lg); max-width: 600px; width: 90%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
  .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
  .modal-head h3 { margin: 0; font-size: 0.95rem; }
  .close { background: transparent; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; padding: 0 0.5rem; }
  .close:hover { color: var(--text); }
  .modal-body { padding: 1rem; overflow-y: auto; }
  .modal-body h4 { font-size: 0.85rem; margin: 1rem 0 0.5rem; }
  .modal-body label { display: block; font-size: 0.8rem; color: var(--text-muted); margin: 0.5rem 0 0.25rem; }
  .modal-body select { width: 100%; padding: 0.4rem; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); }
  .helper-list { display: flex; flex-direction: column; gap: 0.25rem; }
  .helper-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer; }
  .alert { padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); margin: 0.5rem 0; font-size: 0.85rem; }
  .aog-alert { background: rgba(255,59,59,0.15); border: 1px solid var(--aog); color: var(--aog); }

  .game-over { text-align: center; padding: 4rem 2rem; }
  .game-over h1 { font-size: 3rem; color: var(--danger); margin-bottom: 1rem; }
</style>
