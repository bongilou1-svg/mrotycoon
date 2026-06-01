/* ===========================================================================
   MRO TYCOON — Operaciones · Event Tracking · app de la maqueta
   Render vanilla (mismo stack que el build real → portable por Dev Claude).
   =========================================================================== */
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ataName = n => ATA[n] ? `ATA ${n} · ${ATA[n]}` : `ATA ${n}`;
const alOf = c => AIRLINES[c] || {name:c||"—", color:"#5a6577"};

let variant = "triage";      // triage | tele | board
let filter = null;           // null | aog | unassigned | risk | progress | closed
let openId = null;

/* ---- helpers de estado ---- */
const isClosed = e => e.assign?.state==="done" || e.phase==="Completed" || e.phase==="Failed"
  || (e.kind==="event" && e.window && e.window[1] < HUD.time);
function groupOf(e){
  if (isClosed(e)) return "closed";
  if (e.aog) return "aog";
  if (e.assign?.state==="deferred" || e.kind==="event") return "scheduled";
  if (e.assign?.state==="unassigned") return "risk";
  return "progress";
}
function slaInfo(e){
  const m = e.slaMin;
  if (m==null) return {none:true};
  const pct = Math.max(4, Math.min(100, (m/120)*100));
  let c = "var(--ok)";
  if (m<=0) c="var(--bad)"; else if (m<=30) c="var(--bad)"; else if (m<=60) c="var(--warn)"; else if (m<=90) c="var(--accent)";
  return {pct, color:c, mins:m, overdue:m<=0};
}
const sevClass = e => e.aog ? "sev-aog" : `sev-${e.sev||"Minor"}`;
const ledColor = e => {
  const g = groupOf(e);
  return g==="aog"?"var(--aog)":g==="risk"?"var(--warn)":g==="progress"?"var(--accent)":g==="closed"?"var(--ok)":"var(--base)";
};

/* ---- asignación → pill ---- */
function asgPill(e){
  const a = e.assign||{}; const names = (a.team||[]).map(id=>MECHS[id]?.n.split(" ")[0]).join(", ");
  if (a.state==="unassigned"){
    const crit = e.aog || e.sev==="Critical" || (e.slaMin!=null&&e.slaMin<=45);
    return `<span class="asg unassigned ${crit?'crit':''}"><span class="led" style="background:currentColor;box-shadow:0 0 7px currentColor"></span>SIN ASIGNAR${a.hint?` · ${esc(a.hint)}`:""}</span>`;
  }
  if (a.state==="working") return `<span class="asg working"><span class="led" style="background:currentColor"></span>EQUIPO · ${esc(names)}</span>`;
  if (a.state==="travel")  return `<span class="asg travel"><span class="led" style="background:currentColor"></span>EN TRÁNSITO · ${esc(names)}</span>`;
  if (a.state==="done")    return `<span class="asg done"><span class="led" style="background:currentColor"></span>CERRADO · ${esc(names)}</span>`;
  if (a.state==="deferred")return `<span class="asg deferred"><span class="led" style="background:currentColor"></span>DIFERIDO · MEL ${esc(e.melCat)} (${e.melDays}d)</span>`;
  return "";
}

/* ---- phase stepper ---- */
const PHASES = [["ToPlane","Travel"],["Inspection","T-shoot"],["MainTask","Fix"],["Test","Test"],["Completed","Release"]];
function stepper(e){
  if (e.kind==="event") return "";
  if (e.phase==="Deferred") return `<div class="stepwrap"><div class="steps"><div class="step" style="flex:1;background:var(--base)"></div></div><div class="steplbls"><span class="on" style="color:var(--base)">📋 Diferido (MEL ${esc(e.melCat)})</span></div></div>`;
  if (e.kind==="daily" && e.subtasks){
    const done=e.subtasks.filter(s=>s.done).length;
    let s=`<div class="stepwrap"><div class="steps">`;
    e.subtasks.forEach(st=>{ const cls=st.done?"done":st.active?"active":""; s+=`<div class="step ${cls}" style="--sp:${st.pct||50}%"></div>`; });
    s+=`</div><div class="steplbls"><span>Daily check</span><span class="on">${done}/${e.subtasks.length} subtareas</span></div></div>`;
    return s;
  }
  let curIdx = PHASES.findIndex(p=>p[0]===e.phase);
  if (e.phase==="Rework") curIdx = 2;
  if (e.phase==="Completed") curIdx = 4;
  let s=`<div class="stepwrap"><div class="steps">`;
  PHASES.forEach((p,i)=>{ let cls=i<curIdx?"done":i===curIdx?(e.phase==="Completed"?"done":"active"):""; s+=`<div class="step ${cls}" style="--sp:${e.phasePct||0}%"></div>`; });
  const curLbl = PHASES[curIdx]?.[1]||"";
  s+=`</div><div class="steplbls">${PHASES.map((p,i)=>`<span class="${i===curIdx?'on':''}">${p[1]}</span>`).join("")}</div></div>`;
  return s;
}

/* ========================= SITUATION BAR ============================== */
function renderSitbar(){
  const open = EVENTS.filter(e=>!isClosed(e) && e.kind!=="event");
  const ground = new Set(open.filter(e=>e.stand && e.stand!=="—").map(e=>e.reg)).size;
  const aog = EVENTS.filter(e=>e.aog && !isClosed(e)).length;
  const unassigned = EVENTS.filter(e=>e.assign?.state==="unassigned").length;
  const risk = open.filter(e=>e.slaMin!=null && e.slaMin<=45).length;
  const progress = open.filter(e=>["working","travel"].includes(e.assign?.state)).length;
  const closed = EVENTS.filter(e=>isClosed(e) && e.kind!=="event").length;
  const tiles = [
    {k:"ground", cls:"c-ground", num:ground, lbl:"🅿️ En tierra", led:null},
    {k:"aog", cls:"c-aog", num:aog, lbl:"AOG", led:"var(--aog)", pulse:aog>0},
    {k:"unassigned", cls:"c-unassigned", num:unassigned, lbl:"Sin asignar", led:"var(--warn)"},
    {k:"risk", cls:"c-risk", num:risk, lbl:"SLA en riesgo", led:"var(--bad)", pulse:risk>0},
    {k:"progress", cls:"c-progress", num:progress, lbl:"En curso", led:"var(--accent)"},
    {k:"closed", cls:"c-closed", num:closed, lbl:"Cerradas hoy", led:"var(--ok)"},
  ];
  const tilesHtml = tiles.map(t=>`
    <div class="tile ${t.cls} ${filter===t.k?'sel':''}" data-tile="${t.k}">
      <div class="tnum">${t.num}</div>
      <div class="tlbl">${t.led?`<span class="led ${t.pulse?'pulse':''}" style="color:${t.led};background:${t.led}"></span>`:""}${t.lbl}</div>
    </div>`).join("");
  // summary
  const aogE = EVENTS.find(e=>e.aog && !isClosed(e));
  const crit = EVENTS.filter(e=>e.assign?.state==="unassigned" && (e.sev==="Critical"||e.sev==="Major") && e.slaMin<=45);
  let sum = "";
  if (aogE) sum += `<span class="sig">PRIORIDAD</span> <b>AOG</b> en <span class="reg">${aogE.reg}</span> (PTU) bloquea <b>${aogE.flight}</b>`;
  if (crit.length) sum += ` · <b>${crit.length} callout${crit.length>1?'s':''}</b> sin técnico con SLA &lt;45 min`;
  return `<div class="sitbar">
    <div class="sit-tiles">${tilesHtml}</div>
    <div class="sit-summary">${sum||"Operación estable — sin alertas activas."}</div>
  </div>`;
}

/* ========================= FEED · VARIANT A (TRIAGE) ================= */
const GROUPS = [
  {k:"aog", lbl:"AOG · Atención inmediata", cls:"g-aog"},
  {k:"risk", lbl:"En riesgo · Sin asignar", cls:"g-risk"},
  {k:"progress", lbl:"En curso", cls:"g-progress"},
  {k:"scheduled", lbl:"Programado / diferido", cls:"g-scheduled"},
  {k:"closed", lbl:"Cerrado hoy", cls:"g-closed"},
];
function visibleEvents(){
  let list = EVENTS.slice();
  if (filter){
    if (filter==="ground") list = list.filter(e=>!isClosed(e)&&e.kind!=="event");
    else if (filter==="risk") list = list.filter(e=>!isClosed(e)&&e.slaMin!=null&&e.slaMin<=45);
    else if (filter==="progress") list = list.filter(e=>["working","travel"].includes(e.assign?.state));
    else if (filter==="closed") list = list.filter(e=>isClosed(e)&&e.kind!=="event");
    else list = list.filter(e=>groupOf(e)===filter || (filter==="aog"&&e.aog) || (filter==="unassigned"&&e.assign?.state==="unassigned"));
  }
  return list;
}
function evCard(e){
  const al = alOf(e.al); const sla = slaInfo(e);
  const ring = sla.none
    ? `<div class="evt-side no-sla">SIN<br>SLA</div>`
    : `<div class="evt-side ${sla.overdue?'overdue':''}">
        <div class="ring" style="--p:${sla.pct};--c:${sla.color}"><div class="rv"><b>${sla.overdue?'+':''}${Math.abs(sla.mins)}m</b><s>SLA</s></div></div>
        <div class="sla-lbl">${e.flight&&e.flight!=="—"?esc(e.flight):"&nbsp;"}</div>
      </div>`;
  const tags = [
    e.ata!=null?`<span class="tag ata">ATA ${e.ata}</span>`:"",
    e.cat?`<span class="tag cat">${esc(e.cat)}</span>`:"",
    e.sev&&e.sev!=="Minor"?`<span class="tag sev-${e.sev}">${esc(e.sev)}</span>`:"",
    e.stand&&e.stand!=="—"?`<span class="tag stand">Stand <b>${esc(e.stand)}</b></span>`:"",
  ].join("");
  return `<article class="evt ${sevClass(e)} st-${groupOf(e)}${e.phase==="Deferred"?' st-deferred':''}" data-evt="${e.id}">
    <div class="rail"></div>
    <div class="evt-main">
      <div class="evt-top">
        <span class="evt-led" style="background:${ledColor(e)};box-shadow:0 0 8px ${ledColor(e)}"></span>
        <span class="evt-kind">${e.icon}</span>
        ${e.reg?`<span class="evt-reg">${esc(e.reg)}</span><span class="evt-type">${esc(e.model)}/${esc(e.eng)}</span>
        <span class="al-tab"><span class="al-dot" style="background:${al.color}"></span>${esc(al.name)}</span>`:`<span class="evt-reg" style="font-family:var(--disp)">${esc(e.desc.split("—")[0])}</span>`}
        <span class="evt-time mono">${hhmm(e.emit)}</span>
      </div>
      <div class="evt-desc">${e.wo?`<span class="wo-ref">${esc(e.wo)}</span> `:""}${esc(e.desc)}</div>
      <div class="evt-tags">${tags}${asgPill(e)}</div>
      ${stepper(e)}
    </div>
    ${ring}
  </article>`;
}
function feedTriage(){
  const list = visibleEvents();
  let h = "";
  for (const g of GROUPS){
    const items = list.filter(e=>groupOf(e)===g.k);
    if (!items.length) continue;
    h += `<div class="grp-head ${g.cls}"><span class="gdot"></span>${g.lbl}<span class="gline"></span><span class="gcount">${items.length}</span></div>`;
    h += `<div class="feed">${items.map(evCard).join("")}</div>`;
  }
  return h || `<div class="empty">Sin eventos en este filtro.</div>`;
}

/* ========================= FEED · VARIANT B (TELEMETRY) ============= */
function teleRow(e){
  const al=alOf(e.al); const sla=slaInfo(e);
  const slaCell = sla.none ? `<div class="slabar"><div class="sl-top"><span>—</span></div></div>`
    : `<div class="slabar"><div class="sl-top"><span>SLA</span><span style="color:${sla.color}">${sla.overdue?'+':''}${Math.abs(sla.mins)}m</span></div>
       <div class="sl-track"><div class="sl-fill" style="width:${sla.pct}%;background:${sla.color}"></div></div></div>`;
  let curIdx = PHASES.findIndex(p=>p[0]===e.phase); if(e.phase==="Completed")curIdx=4; if(e.phase==="Rework")curIdx=2;
  const dots = e.kind==="event"||e.phase==="Deferred" ? "" : `<div class="tdots">${PHASES.map((p,i)=>`<i class="${i<curIdx?'done':i===curIdx?'active':''}"></i>`).join("")}</div>`;
  return `<div class="trow ${sevClass(e)} st-${groupOf(e)}" data-evt="${e.id}" style="--c:${ledColor(e)}">
    <span class="tled" style="background:${ledColor(e)};box-shadow:0 0 8px ${ledColor(e)}"></span>
    <span class="ttime">${hhmm(e.emit)}</span>
    <span class="treg">${esc(e.reg||"—")}<small>${e.model?esc(e.model):esc(e.al||"")}</small></span>
    <span class="tdesc">${e.wo?`<span class="wo-ref">${esc(e.wo)}</span>`:""}${esc(e.desc)}</span>
    ${slaCell}
    <span>${asgPill(e)}</span>
    ${dots}
  </div>`;
}
function feedTele(){
  const list = visibleEvents().sort((a,b)=>{
    const ord={aog:0,risk:1,progress:2,scheduled:3,closed:4};
    return (ord[groupOf(a)]-ord[groupOf(b)]) || ((a.slaMin??9999)-(b.slaMin??9999));
  });
  return list.length?`<div class="tele">${list.map(teleRow).join("")}</div>`:`<div class="empty">Sin eventos en este filtro.</div>`;
}

/* ========================= FEED · VARIANT C (BOARD) ================= */
function bCard(e){
  const al=alOf(e.al);
  return `<div class="bcard ${sevClass(e)}" data-evt="${e.id}" style="--c:${ledColor(e)}">
    <div class="bc-top"><span class="evt-led" style="background:${ledColor(e)};box-shadow:0 0 7px ${ledColor(e)}"></span>
      <span class="bc-reg">${esc(e.reg||"—")}</span>
      ${e.al?`<span class="al-dot" style="background:${al.color}"></span>`:""}
      <span class="bc-time">${hhmm(e.emit)}</span></div>
    <div class="bc-desc">${e.wo?`<span class="wo-ref" style="color:var(--accent-2);font-family:var(--mono);font-size:.7rem">${esc(e.wo)}</span> `:""}${esc(e.desc)}</div>
    <div class="bc-foot">${e.sev&&e.sev!=="Minor"?`<span class="tag sev-${e.sev}">${esc(e.sev)}</span>`:`<span class="tag ata">ATA ${e.ata??"—"}</span>`}${asgPill(e)}</div>
  </div>`;
}
function feedBoard(){
  const list = visibleEvents();
  const cols = [
    {k:"unassigned", cls:"unassigned", lbl:"Sin asignar", color:"var(--warn)", items:list.filter(e=>!isClosed(e)&&(e.assign?.state==="unassigned"))},
    {k:"progress", cls:"progress", lbl:"En curso", color:"var(--accent)", items:list.filter(e=>!isClosed(e)&&["working","travel","deferred"].includes(e.assign?.state))},
    {k:"closed", cls:"closed", lbl:"Cerrado / evento", color:"var(--ok)", items:list.filter(e=>isClosed(e)||e.kind==="event")},
  ];
  return `<div class="board">${cols.map(c=>`
    <div class="col ${c.cls}"><div class="col-head"><span class="cdot" style="background:${c.color};color:${c.color}"></span>${c.lbl}<span class="cn">${c.items.length}</span></div>
    <div class="col-body">${c.items.map(bCard).join("")||`<div class="empty" style="padding:1.2rem">—</div>`}</div></div>`).join("")}</div>`;
}

/* ========================= RENDER FEED AREA ========================= */
function renderFeed(){
  const host = document.getElementById("feed-area");
  host.innerHTML = variant==="triage"?feedTriage():variant==="tele"?feedTele():feedBoard();
}

/* ========================= DRAWER (WO detail) ====================== */
function renderDrawer(){
  const scrim = document.getElementById("scrim"), dw = document.getElementById("drawer");
  if (!openId){ scrim.classList.remove("open"); dw.classList.remove("open"); dw.style.transition="none"; dw.style.transform="translateX(102%)"; void dw.offsetWidth; return; }
  scrim.classList.add("open");
  dw.classList.add("open");
  dw.style.transition = "none";   // la transición se congela en este entorno → commit instantáneo
  dw.style.transform = "none";
  void dw.offsetWidth;
  if (typeof ROSTER!=="undefined"){ const m=ROSTER.find(x=>x.id===openId); if(m){ dw.innerHTML=renderMechDrawer(m); return; } }
  if (typeof FLIGHTS!=="undefined"){ const f=FLIGHTS.find(x=>x.id===openId); if(f){ dw.innerHTML=renderFlightDrawer(f); return; } }
  if (typeof STANDS!=="undefined" && openId[0]==="S"){ const s=STANDS.find(x=>("S-"+x.code)===openId); if(s){ dw.innerHTML=renderStandDrawer(s); return; } }
  const e = EVENTS.find(x=>x.id===openId);
  if (!e){ scrim.classList.remove("open"); dw.classList.remove("open"); dw.style.transition="none"; dw.style.transform="translateX(102%)"; void dw.offsetWidth; return; }
  const al=alOf(e.al); const sla=slaInfo(e); const railColor=ledColor(e);
  const kpis = e.kind==="event" ? "" : `<div class="dw-kpis">
    <div class="kpi ${sla.none?'':sla.overdue?'bad':sla.mins<=45?'warn':'ok'}"><div class="kl">SLA</div><div class="kv">${sla.none?"—":(sla.overdue?'+':'')+Math.abs(sla.mins)+'m'}</div></div>
    <div class="kpi acc"><div class="kl">Fee</div><div class="kv">${(e.fee||0).toLocaleString("es-ES")}€</div></div>
    <div class="kpi ${e.penalty?'bad':''}"><div class="kl">Penalty/d</div><div class="kv">${e.penalty?'-'+e.penalty.toLocaleString("es-ES")+'€':'—'}</div></div>
    <div class="kpi"><div class="kl">Cat</div><div class="kv">${esc(e.cat||"—")}</div></div>
  </div>`;
  // phase timeline
  let tl = "";
  if (e.kind==="daily" && e.subtasks){
    tl = `<div class="dw-sec">Subtareas del paquete</div><div class="tl">${e.subtasks.map(s=>{
      const cls=s.done?"done":s.active?"active":"pending";
      return `<div class="tl-step ${cls}"><div class="tl-node">${s.done?'✓':s.active?'▸':'·'}</div><div class="tl-name">${esc(s.t)}</div><div class="tl-meta">${esc(s.id)}${s.active?` · ${s.pct}%`:""}</div></div>`;
    }).join("")}</div>`;
  } else if (e.kind!=="event" && e.phase!=="Deferred"){
    let curIdx=PHASES.findIndex(p=>p[0]===e.phase); if(e.phase==="Completed")curIdx=4; if(e.phase==="Rework")curIdx=2;
    tl = `<div class="dw-sec">Progreso de fases</div><div class="tl">${PHASES.map((p,i)=>{
      const cls=i<curIdx?"done":i===curIdx&&e.phase!=="Completed"?"active":i===curIdx?"done":"pending";
      const meta=i<curIdx?"completada":i===curIdx?(e.phase==="Completed"?"completada":`${e.phasePct||0}%`):"pendiente";
      return `<div class="tl-step ${cls}"><div class="tl-node">${i<curIdx||e.phase==="Completed"?'✓':i===curIdx?'▸':i+1}</div><div class="tl-name">${p[1]}</div><div class="tl-meta">${meta}</div></div>`;
    }).join("")}</div>`;
  }
  const team = (e.assign?.team||[]).map(id=>{const m=MECHS[id];return `<div class="mchip"><span class="av">${initials(m.n)}</span>${esc(m.n)}<span class="cat">${m.c}</span></div>`;}).join("");
  const parts = (e.parts||[]).length?`<div class="dw-sec">Parts requeridas</div><ul class="dw-list">${e.parts.map(p=>`<li><span class="ico">⬡</span>${esc(p)}</li>`).join("")}</ul>`:"";
  const tools = (e.tools||[]).length?`<div class="dw-sec">Tooling</div><ul class="dw-list">${e.tools.map(t=>`<li><span class="ico">⚒</span>${esc(t)}</li>`).join("")}</ul>`:"";
  const links = e.reg?`<div class="linkrow">
      <div class="linkcard" data-link="airplane"><div class="lk-ic" style="background:${railColor}22;color:${railColor}">✈</div><div><div class="lk-t">Avión</div><div class="lk-v">${esc(e.reg)}</div></div><span class="lk-go">›</span></div>
      <div class="linkcard" data-link="airline"><div class="lk-ic" style="background:${al.color}22;color:${al.color}">◆</div><div><div class="lk-t">Operador</div><div class="lk-v">${esc(al.name)}</div></div><span class="lk-go">›</span></div>
      ${e.stand&&e.stand!=="—"?`<div class="linkcard" data-link="stand"><div class="lk-ic" style="background:#1a2433;color:var(--muted)">▣</div><div><div class="lk-t">Stand</div><div class="lk-v">${esc(e.stand)}</div></div><span class="lk-go">›</span></div>`:""}
    </div>`:"";
  let actions = "";
  if (e.assign?.state==="unassigned") actions = `<button class="btn primary" data-act="assign">Asignar equipo</button><button class="btn warn" data-act="defer">Diferir (MEL)</button>`;
  else if (e.assign?.state==="deferred") actions = `<button class="btn primary" data-act="repair">Reparar ya</button>`;
  else if (!isClosed(e) && e.kind!=="event") actions = `<button class="btn" data-act="reassign">Reasignar</button><button class="btn warn" data-act="hold">Poner en espera</button>`;

  dw.innerHTML = `
    <div class="dw-head"><div class="dw-rail" style="background:${railColor};box-shadow:0 0 14px ${railColor}"></div>
      <button class="dw-close" data-close>✕</button>
      <div class="dw-eyebrow">${e.icon} ${e.kind==="daily"?"Daily check · pernocta":e.kind==="event"?"Evento operativo":e.aog?"AOG · Work Order":"Work Order"}${e.wo?` · ${esc(e.wo)}`:""}</div>
      <div class="dw-title"><span class="reg">${esc(e.reg||"Pista 11/29")}</span>${e.model?`<span class="type">${esc(e.model)}/${esc(e.eng)} · ${esc(al.name)}</span>`:""}</div>
      <div class="dw-sub">${esc(e.desc)}</div>
    </div>
    <div class="dw-body">
      ${kpis}
      ${e.amm?`<div class="dw-sec">${e.ata!=null?ataName(e.ata):"Referencia"}</div><div class="dw-amm">${esc(e.descFull||e.desc)}<br><span class="ammref">${esc(e.amm)}</span></div>`:""}
      ${tl}
      ${team?`<div class="dw-sec">Equipo asignado</div><div class="team">${team}</div>`:(e.assign?.state==="unassigned"?`<div class="dw-sec">Equipo</div><div class="dw-amm" style="color:var(--warn)">⚠ Sin técnico asignado — ${esc(e.assign.hint||"")}</div>`:"")}
      ${parts}${tools}${links}
      ${actions?`<div class="dw-actions">${actions}</div>`:""}
    </div>`;
}

/* ========================= STATIC CHROME =========================== */
/* ---- panel router ---- */
let activePanel = "operations";
function operationsMain(){
  return `<div class="main-head">
    <div class="eyebrow">Centro de control · Tiempo real</div>
    <div class="title-row"><div><h1>Operaciones</h1>
      <div class="sub">EVENT TRACKING · feed cronológico unificado — OVD/LEAS</div></div>
      <div class="vswitch">
        <button data-variant="triage" class="${variant==='triage'?'active':''}"><span class="vk">A</span>Triaje</button>
        <button data-variant="tele" class="${variant==='tele'?'active':''}"><span class="vk">B</span>Telemetría</button>
        <button data-variant="board" class="${variant==='board'?'active':''}"><span class="vk">C</span>Tablero</button>
      </div></div></div>
    <div id="sitbar-host"></div>
    <div class="feed-wrap scroll" id="feed-area"></div>`;
}
function renderMain(){
  const main=document.getElementById("main");
  if (activePanel==="operations"){ main.innerHTML=operationsMain(); rerender(); }
  else if (activePanel==="office"){ main.innerHTML=renderOfficePanel(); }
  else if (activePanel==="schedule"){ main.innerHTML=renderSchedulePanel(); }
  else if (activePanel==="map"){ main.innerHTML=renderMapPanel(); }
  else { main.innerHTML=`<div class="main-head"><div class="eyebrow">Próximamente</div><div class="title-row"><div><h1 style="text-transform:capitalize">${activePanel}</h1></div></div></div><div class="empty">Este panel no entra en esta pasada — el sistema CIC se propagaría igual aquí.</div>`; }
  document.querySelectorAll("[data-panel]").forEach(b=>b.classList.toggle("active", b.dataset.panel===activePanel));
}

function renderHud(){
  document.getElementById("hud").innerHTML = `
    <div class="hud-brand"><div class="hud-mark">M</div>
      <span class="hud-name">MRO <b>TYCOON</b></span><span class="hud-ver">v0.6 · línea</span></div>
    <div class="hud-clock"><span>Día ${HUD.day} · ${hhmm(HUD.time)}</span><span class="dn">${HUD.dayNight}</span><span class="wk">Semana ${HUD.week}</span></div>
    <div class="hud-spacer"></div>
    <div class="hud-stat money"><div><div class="lbl">Balance</div><div class="val">💰 ${HUD.balance}</div></div></div>
    <div class="hud-stat rep"><div><div class="lbl">Reputación</div><div class="val">⭐ ${HUD.rep}/100</div></div></div>
    <div class="hud-stat cmp"><div><div class="lbl">Part-145</div><div class="val">🛡 ${HUD.compliance}/100</div></div></div>
    <div class="hud-sep"></div>
    <div class="hud-tools"><button class="icbtn">💾</button><button class="icbtn">📂</button><button class="icbtn">🆕</button></div>
    <div class="speeds"><button>⏸</button><button class="active">1×</button><button>2×</button><button>5×</button></div>`;
}
function renderNav(){
  const items = [
    {g:"Operación"},
    {t:"Mapa", ic:"🗺", k:"map"},
    {t:"Operaciones", ic:"📡", k:"operations", badge:"6", hot:true, active:true},
    {t:"Schedule", ic:"📅", k:"schedule", badge:"38"},
    {t:"Production Planning", ic:"📋", k:"planning", badge:"4", amb:true},
    {g:"Gestión"},
    {t:"Oficina", ic:"🏢", k:"office", badge:"1"},
    {t:"Contratos", ic:"📄", k:"contracts", badge:"2"},
    {t:"Hangares", ic:"🏗", k:"hangars", dis:true},
    {g:"Análisis"},
    {t:"Dashboard", ic:"📊", k:"dashboard"},
    {t:"Economía", ic:"💼", k:"economy"},
  ];
  document.getElementById("nav").innerHTML = items.map(it=>{
    if (it.g) return `<div class="nav-grp">${it.g}</div>`;
    const b = it.badge?`<span class="nbadge ${it.hot?'hot':it.amb?'amb':''}">${it.badge}</span>`:"";
    return `<button data-panel="${it.k}" class="${it.k===activePanel?'active':''} ${it.dis?'dis':''}"><span class="ic">${it.ic}</span>${it.t}${b}</button>`;
  }).join("") + `<div class="nav-foot"><span class="dot">●</span> SYNC · OVD/LEAS<br>873 tests · save v9</div>`;
}
function renderLog(){
  document.getElementById("log-list").innerHTML = LOG.map(l=>`
    <div class="lentry ${l.lvl}"><div class="lgrid"><span class="lt">${l.t}</span><span class="lx"></span><span class="lbody">${l.h.replace(/(EC-\w+|EI-\w+|V\d{4,5}|VY\d{3,4}|EI\d{3})/g,'<span class="reg">$1</span>')}</span></div></div>`).join("");
}

/* ========================= WIRING ================================== */
function rerender(){ const sb=document.getElementById("sitbar-host"); if(!sb)return; sb.innerHTML = renderSitbar(); renderFeed();
  document.querySelectorAll("[data-variant]").forEach(b=>b.classList.toggle("active", b.dataset.variant===variant)); }

document.addEventListener("click", ev=>{
  const variantBtn = ev.target.closest("[data-variant]");
  if (variantBtn){ variant = variantBtn.dataset.variant; rerender(); return; }
  const tile = ev.target.closest("[data-tile]");
  if (tile){ filter = filter===tile.dataset.tile?null:tile.dataset.tile; rerender(); return; }
  const panel = ev.target.closest("[data-panel]");
  if (panel){ if(panel.classList.contains("dis"))return; activePanel=panel.dataset.panel; openId=null; renderDrawer(); renderMain(); return; }
  const osub = ev.target.closest("[data-office-sub]");
  if (osub){ officeSub=osub.dataset.officeSub; renderMain(); return; }
  const sfil = ev.target.closest("[data-sched-filter]");
  if (sfil){ schedFilter=sfil.dataset.schedFilter; renderMain(); return; }
  const mech = ev.target.closest("[data-mech]");
  if (mech){ openId=mech.dataset.mech; renderDrawer(); return; }
  const flight = ev.target.closest("[data-flight]");
  if (flight){ openId=flight.dataset.flight; renderDrawer(); return; }
  const stand = ev.target.closest("[data-stand]");
  if (stand){ openId="S-"+stand.dataset.stand; renderDrawer(); return; }
  if (ev.target.closest("[data-close]") || ev.target.id==="scrim"){ openId=null; renderDrawer(); return; }
  const link = ev.target.closest("[data-link]");
  if (link){ flash(`(maqueta) Abriría la ficha de ${link.dataset.link}`); return; }
  const act = ev.target.closest("[data-act]");
  if (act){ flash(`(maqueta) Acción: ${act.dataset.act}`); return; }
  const card = ev.target.closest("[data-evt]");
  if (card){ openId = card.dataset.evt; renderDrawer(); return; }
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape"&&openId){openId=null;renderDrawer();} });

let flashT;
function flash(msg){
  let el=document.getElementById("flash"); if(!el){el=document.createElement("div");el.id="flash";
    el.style.cssText="position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:200;background:#15212f;border:1px solid var(--line-2);color:var(--text);padding:.5rem .9rem;border-radius:8px;font:.8rem var(--disp);box-shadow:0 8px 24px rgba(0,0,0,.5)";document.body.appendChild(el);}
  el.textContent=msg; el.style.opacity="1"; clearTimeout(flashT); flashT=setTimeout(()=>el.style.opacity="0",1600);
}

renderHud(); renderNav(); renderLog(); renderMain();
