/* ===========================================================================
   MRO TYCOON — Paneles Oficina + Schedule (maqueta) · mismo lenguaje CIC
   =========================================================================== */

/* ---------- helpers compartidos ---------- */
const stateMeta = {
  Working:{c:"var(--accent)", l:"En trabajo"}, ToPlane:{c:"var(--cyan)", l:"En tránsito"},
  Returning:{c:"var(--cyan)", l:"Regresando"}, Idle:{c:"var(--ok)", l:"Disponible"},
  OffShift:{c:"var(--dim)", l:"Fuera de turno"}, Training:{c:"var(--base)", l:"Formación"},
};
const moralCls = m => m>=70?"ok":m>=40?"warn":"bad";
const fmtEur = n => n.toLocaleString("es-ES");

/* =====================================================================
   OFICINA
   ===================================================================== */
let officeSub = "team";
function renderOfficePanel(){
  const mechs = ROSTER;
  const counts = { Working:0, ToPlane:0, Idle:0, OffShift:0, Training:0 };
  mechs.forEach(m=>{ counts[m.state]=(counts[m.state]||0)+1; });
  const totalSal = mechs.reduce((s,m)=>s+m.salary,0);
  const avgMoral = Math.round(mechs.reduce((s,m)=>s+m.moral,0)/mechs.length);
  const tiles = [
    {cls:"c-ground", num:`${mechs.length}/5`, lbl:"👥 Plantilla"},
    {cls:"c-progress", num:counts.Working, lbl:"⚙ En trabajo", led:"var(--accent)"},
    {cls:"c-unassigned", num:counts.ToPlane, lbl:"🚐 En tránsito", led:"var(--cyan)"},
    {cls:"c-closed", num:counts.Idle, lbl:"✅ Disponibles", led:"var(--ok)"},
    {cls:"c-aog", num:`${avgMoral}`, lbl:"🙂 Moral media", led:avgMoral>=70?"var(--ok)":"var(--warn)"},
    {cls:"c-progress", num:`${(totalSal/1000).toFixed(1)}k`, lbl:"💼 €/sem", led:null},
  ];
  const tilesHtml = tiles.map(t=>`<div class="tile ${t.cls}"><div class="tnum">${t.num}</div>
    <div class="tlbl">${t.led?`<span class="led" style="color:${t.led};background:${t.led}"></span>`:""}${t.lbl}</div></div>`).join("");

  const subs = [["team","👷 Equipo"],["hiring","🤝 Contratación · 2"],["management","⚙ Management"]];
  const subBar = `<div class="vswitch" style="margin-top:.2rem">${subs.map(([k,l])=>`<button data-office-sub="${k}" class="${officeSub===k?'active':''}">${l}</button>`).join("")}</div>`;

  let body;
  if (officeSub==="hiring") body = officeHiring();
  else if (officeSub==="management") body = officeManagement();
  else body = officeTeam(mechs);

  return `<div class="main-head">
      <div class="eyebrow">Gestión · Recursos humanos</div>
      <div class="title-row"><div><h1>Oficina</h1>
        <div class="sub">SEDE MRO · OVD/LEAS · los técnicos esperan aquí y viajan al stand (~2 min)</div></div>
        ${subBar}</div>
    </div>
    <div class="office-sit"><div class="sitbar"><div class="sit-tiles">${tilesHtml}</div></div></div>
    <div class="feed-wrap scroll">${body}</div>`;
}

function officeTeam(mechs){
  // coverage strip
  const cov = renderCoverage(mechs);
  const cards = mechs.map(m=>{
    const sm = stateMeta[m.state]||{c:"var(--muted)",l:m.state};
    return `<article class="mcard" data-mech="${m.id}">
      <div class="mcard-top">
        <span class="mc-av">${initials(m.n)}</span>
        <div class="mc-id"><div class="mc-name">${esc(m.n)}</div><div class="mc-base mono">${m.id} · ${m.c}</div></div>
        <span class="mc-state" style="color:${sm.c};border-color:${sm.c}55;background:${sm.c}1a"><span class="led" style="background:${sm.c}"></span>${sm.l}</span>
      </div>
      <div class="mc-task">${m.task?`<span class="mono" style="color:var(--accent-2)">${esc(m.assign)}</span> · ${esc(m.task)}`:`<span style="color:var(--dim)">Sin asignación · ${m.shift}</span>`}</div>
      <div class="mc-bars">
        <div class="mc-metric"><span class="mk">Moral</span><div class="mc-bar"><div class="mc-fill ${moralCls(m.moral)}" style="width:${m.moral}%"></div></div><span class="mv mono">${m.moral}</span></div>
        <div class="mc-metric"><span class="mk">Eff</span><span class="mv mono" style="color:${m.eff>=1.1?'var(--ok)':m.eff<1?'var(--warn)':'var(--text)'}">${m.eff.toFixed(2)}×</span></div>
      </div>
      <div class="mc-foot">
        <span class="tag shift-${m.shift}">${m.shift==='morning'?'☀ mañana':m.shift==='afternoon'?'🌅 tarde':m.shift==='night'?'🌙 noche':'💤 libre'}</span>
        <span class="mono" style="color:var(--muted);font-size:.7rem">${fmtEur(m.salary)} €/sem${m.night?' ×1.5':''}</span>
      </div>
    </article>`;
  }).join("");
  return cov + `<div class="grp-head g-progress" style="margin-top:1.1rem"><span class="gdot"></span>Técnicos<span class="gline"></span><span class="gcount">${mechs.length}/5</span></div>
    <div class="mgrid">${cards}</div>`;
}

/* coverage: 24h banda por turnos, legible (no "mar de rojo") + marcador NOW */
function renderCoverage(mechs){
  const byShift = {morning:0, afternoon:0, night:0};
  mechs.forEach(m=>{ if(m.shift in byShift && m.state!=="OffShift") byShift[m.shift]++; });
  // contar también offshift como plantilla del turno (capacidad nominal)
  const nominal = {morning:0, afternoon:0, night:0};
  mechs.forEach(m=>{ if(m.shift in nominal) nominal[m.shift]++; });
  const bands = [
    {k:"morning", l:"Mañana", h:"06–14", n:nominal.morning, c:"var(--warn)"},
    {k:"afternoon", l:"Tarde", h:"14–22", n:nominal.afternoon, c:"var(--accent)"},
    {k:"night", l:"Noche", h:"22–06", n:nominal.night, c:"var(--base)"},
  ];
  const nowPct = (HUD.time/1440)*100;
  return `<div class="cov">
    <div class="cov-head"><span class="ck">Cobertura 24h</span><span class="cov-now-lbl mono">▾ ahora ${hhmm(HUD.time)}</span></div>
    <div class="cov-track">
      <div class="cov-band" style="flex:8" data-shift="morning"><div class="cb-fill" style="background:linear-gradient(180deg,${bands[0].c}33,${bands[0].c}11)"></div><span class="cb-l">☀ Mañana <b class="${nominal.morning===0?'zero':''}">${nominal.morning}</b></span></div>
      <div class="cov-band" style="flex:8" data-shift="afternoon"><div class="cb-fill" style="background:linear-gradient(180deg,${bands[1].c}33,${bands[1].c}11)"></div><span class="cb-l">🌅 Tarde <b class="${nominal.afternoon===0?'zero':''}">${nominal.afternoon}</b></span></div>
      <div class="cov-band" style="flex:8" data-shift="night"><div class="cb-fill" style="background:linear-gradient(180deg,${bands[2].c}22,${bands[2].c}08)"></div><span class="cb-l">🌙 Noche <b class="${nominal.night===0?'zero':''}">${nominal.night}</b></span></div>
      <div class="cov-now" style="left:${nowPct}%"></div>
    </div>
    <div class="cov-legend"><span><b class="zero">0</b> sin cobertura</span><span class="dim">·</span><span>Sin contrato de pernocta nocturna, la noche puede ir a 0 sin penalización</span></div>
  </div>`;
}

function officeHiring(){
  return `<div class="grp-head g-progress"><span class="gdot"></span>Pool de candidatos<span class="gline"></span><span class="gcount">${CANDIDATES.length}</span></div>
  <div class="mgrid">${CANDIDATES.map(c=>`<article class="mcard cand" data-cand="${c.id}">
    <div class="mcard-top"><span class="mc-av" style="background:linear-gradient(135deg,#2a4a2a,#16301a);color:#7fdc9a">${initials(c.n)}</span>
      <div class="mc-id"><div class="mc-name">${esc(c.n)}</div><div class="mc-base mono">${c.age}a · ${c.exp}y exp · ${c.c}</div></div>
      <span class="mc-state" style="color:var(--ok);border-color:#27512f;background:var(--ok-bg)">caduca ${c.expDays}d</span></div>
    <div class="mc-task">${c.traits.map(t=>`<span class="tag" style="color:var(--base);border-color:#42367a">${esc(t)}</span>`).join(" ")}</div>
    <div class="mc-foot"><span class="mono" style="font-size:.72rem;color:var(--muted)">Eff ${c.eff.toFixed(2)}× · ${fmtEur(c.salary)} €/sem · bonus ${fmtEur(c.bonus)} €</span>
      <button class="btn primary" style="flex:none;padding:.32rem .7rem" data-act="hire">Contratar</button></div>
  </article>`).join("")}</div>`;
}
function officeManagement(){
  const rows = [
    {k:"Auto-asignación de WOs triviales", v:"Activado", on:true, d:"El TMA asigna callouts Minor sin tu intervención."},
    {k:"Diferir MEL automáticamente", v:"Nunca", on:false, d:"Mantienes el control de cada decisión de diferido."},
    {k:"Llamada a hora extra automática", v:"Desactivado", on:false, d:"No saca técnicos de turno sin tu OK."},
    {k:"Auto-pausa en eventos críticos", v:"Activado", on:true, d:"El juego pausa al emitir un AOG / Critical."},
  ];
  return `<div class="grp-head g-scheduled"><span class="gdot"></span>Normas de la casa<span class="gline"></span></div>
  <div class="mgmt">${rows.map(r=>`<div class="mgmt-row"><div><div class="mgmt-k">${r.k}</div><div class="mgmt-d">${r.d}</div></div>
    <span class="toggle ${r.on?'on':''}" data-act="toggle"><i></i></span></div>`).join("")}</div>`;
}

/* =====================================================================
   SCHEDULE
   ===================================================================== */
let schedFilter = "all";
function renderSchedulePanel(){
  const flights = FLIGHTS.filter(f=> schedFilter==="all"?true:f.type===schedFilter);
  const arr = FLIGHTS.filter(f=>f.type==="arrival").length;
  const dep = FLIGHTS.filter(f=>f.type==="departure").length;
  const handled = FLIGHTS.filter(f=>f.handled).length;
  const leads = FLIGHTS.length - handled;
  const nextMov = FLIGHTS.filter(f=>f.min>=HUD.time).sort((a,b)=>a.min-b.min)[0];
  const tiles = [
    {cls:"c-ground", num:FLIGHTS.length, lbl:"✈ Movimientos"},
    {cls:"c-closed", num:arr, lbl:"🛬 Llegadas", led:"var(--ok)"},
    {cls:"c-unassigned", num:dep, lbl:"🛫 Salidas", led:"var(--warn)"},
    {cls:"c-progress", num:handled, lbl:"🟢 Contratados", led:"var(--accent)"},
    {cls:"c-aog", num:leads, lbl:"○ Leads (sin contrato)", led:"var(--dim)"},
    {cls:"c-progress", num:nextMov?hhmm(nextMov.min):"—", lbl:"📡 Próximo mov.", led:null},
  ];
  const tilesHtml = tiles.map(t=>`<div class="tile ${t.cls}"><div class="tnum" style="${typeof t.num==='string'&&t.num.includes(':')?'font-size:1.2rem':''}">${t.num}</div>
    <div class="tlbl">${t.led?`<span class="led" style="color:${t.led};background:${t.led}"></span>`:""}${t.lbl}</div></div>`).join("");
  const subs = [["all","Todos"],["arrival","🛬 ARR"],["departure","🛫 DEP"]];
  const subBar = `<div class="vswitch" style="margin-top:.2rem">${subs.map(([k,l])=>`<button data-sched-filter="${k}" class="${schedFilter===k?'active':''}">${l}</button>`).join("")}</div>`;

  const rows = flights.sort((a,b)=>a.min-b.min).map(f=>{
    const al = alOf(f.al); const past = f.min < HUD.time;
    const next = nextMov && f.id===nextMov.id;
    const isArr = f.type==="arrival";
    return `<div class="frow ${past?'past':''} ${next?'next':''} ${f.handled?'handled':'lead'}" data-flight="${f.id}">
      <div class="ftime mono">${hhmm(f.min)}${f.done?' <span class="fchk">✓</span>':''}</div>
      <div class="ftype ${isArr?'arr':'dep'}">${isArr?'ARR':'DEP'}</div>
      <div class="fmain">
        <span class="fcs mono">${esc(f.cs)}</span>
        <span class="froute mono">${isArr?'←':'→'} ${esc(f.remote)}</span>
        <span class="fmodel mono">${esc(f.model)}</span>
        ${f.overnight?'<span class="fov">🌙 pernocta</span>':''}
      </div>
      <div class="fop"><span class="al-dot" style="background:${al.color}"></span><span class="${f.handled?'op-h':'op-l'}">${esc(al.name)}</span><span class="op-code mono">${esc(f.al)}</span></div>
      <div class="fstatus">${f.handled?`<span class="st-pill ok">${f.done?'Cerrado':past?'En tierra':'Programado'}</span>`:`<span class="st-pill lead">Lead · sin habilitación</span>`}</div>
    </div>`;
  }).join("");

  return `<div class="main-head">
      <div class="eyebrow">Operación · Programación del día</div>
      <div class="title-row"><div><h1>Schedule</h1>
        <div class="sub">${AP_META.name} (${AP_META.iata}/${AP_META.icao}) · Día ${AP_META.day} · ${AP_META.dayName}</div></div>
        ${subBar}</div>
    </div>
    <div class="office-sit"><div class="sitbar"><div class="sit-tiles">${tilesHtml}</div>
      <div class="sit-summary"><span class="sig" style="color:var(--accent);border-color:var(--accent);background:var(--accent-bg)">CONTRATADOS</span> <span class="reg">Volotea</span> y <span class="reg">Vueling</span> generan trabajo MRO · el resto son <b>leads</b> comerciales (rep para captarlos)</div></div></div>
    <div class="feed-wrap scroll"><div class="ftable">
      <div class="frow fhead"><div>Hora</div><div>Tipo</div><div>Vuelo · Ruta · Modelo</div><div>Operador</div><div>Estado</div></div>
      ${rows}
    </div></div>`;
}

/* =====================================================================
   DRAWERS (mecánico + vuelo) — delegados desde renderDrawer()
   ===================================================================== */
function renderMechDrawer(m){
  const sm = stateMeta[m.state]||{c:"var(--muted)",l:m.state};
  const ev = m.assign ? EVENTS.find(e=>e.id===m.assign) : null;
  return `<div class="dw-head"><div class="dw-rail" style="background:${sm.c};box-shadow:0 0 14px ${sm.c}"></div>
      <button class="dw-close" data-close>✕</button>
      <div class="dw-eyebrow">👷 Técnico · ${m.c}${m.c!=="Helper"?" certified":""}</div>
      <div class="dw-title"><span class="reg" style="font-family:var(--disp)">${esc(m.n)}</span><span class="type">${m.id} · ${m.age} años · ${m.exp}y exp.</span></div>
      <div class="dw-sub"><span class="mc-state" style="color:${sm.c};border-color:${sm.c}55;background:${sm.c}1a"><span class="led" style="background:${sm.c}"></span>${sm.l}</span></div>
    </div>
    <div class="dw-body">
      <div class="dw-kpis">
        <div class="kpi ${m.eff>=1.1?'ok':''}"><div class="kl">Eficiencia</div><div class="kv">${m.eff.toFixed(2)}×</div></div>
        <div class="kpi ${moralCls(m.moral)}"><div class="kl">Moral</div><div class="kv">${m.moral}</div></div>
        <div class="kpi acc"><div class="kl">Salario</div><div class="kv">${(m.salary/1000).toFixed(1)}k</div></div>
        <div class="kpi"><div class="kl">Turno</div><div class="kv" style="font-size:.8rem">${m.shift}</div></div>
      </div>
      <div class="dw-sec">Type ratings</div>
      <ul class="dw-list">${m.ratings.map(r=>`<li><span class="ico">✦</span>${esc(r)}</li>`).join("")}</ul>
      <div class="dw-sec">Asignación actual</div>
      ${ev?`<div class="linkcard" data-evt="${ev.id}" style="cursor:pointer"><div class="lk-ic" style="background:${ledColor(ev)}22;color:${ledColor(ev)}">${ev.icon}</div>
        <div><div class="lk-t">${esc(ev.wo||ev.id)}</div><div class="lk-v">${esc(ev.reg)} · ${esc((ev.desc||"").split("—")[0])}</div></div><span class="lk-go">›</span></div>`
        :`<div class="dw-amm" style="color:var(--dim)">Sin asignación activa — ${m.shift==='afternoon'||m.state==='OffShift'?'fuera de turno':'disponible en oficina'}.</div>`}
      <div class="dw-sec">Contrato</div>
      <ul class="dw-list"><li><span class="ico">⏱</span>Antigüedad ${m.exp} años · indemnización estimada <b style="margin-left:.3rem;color:var(--warn)">${fmtEur(m.sev)} €</b></li></ul>
      <div class="dw-actions"><button class="btn primary" data-act="train">🎓 Formar</button><button class="btn" data-act="shift">Cambiar turno</button><button class="btn warn" data-act="fire">👋 Despedir</button></div>
    </div>`;
}
function renderFlightDrawer(f){
  const al = alOf(f.al); const isArr=f.type==="arrival";
  const ev = EVENTS.find(e=>e.reg===f.reg && !isClosed(e));
  return `<div class="dw-head"><div class="dw-rail" style="background:${f.handled?'var(--accent)':'var(--dim)'}"></div>
      <button class="dw-close" data-close>✕</button>
      <div class="dw-eyebrow">${isArr?'🛬 Llegada':'🛫 Salida'} · ${esc(f.cs)}</div>
      <div class="dw-title"><span class="reg">${esc(f.reg)}</span><span class="type">${esc(f.model)}/${esc(f.eng)} · ${esc(al.name)}</span></div>
      <div class="dw-sub">${isArr?'Procedente de':'Con destino'} <b>${esc(f.remote)}</b> · ${hhmm(f.min)} · ${AP_META.iata}</div>
    </div>
    <div class="dw-body">
      <div class="dw-kpis">
        <div class="kpi acc"><div class="kl">Hora</div><div class="kv">${hhmm(f.min)}</div></div>
        <div class="kpi"><div class="kl">Tipo</div><div class="kv" style="font-size:.8rem">${isArr?'ARR':'DEP'}</div></div>
        <div class="kpi ${f.handled?'ok':''}"><div class="kl">Operador</div><div class="kv" style="font-size:.8rem">${esc(f.al)}</div></div>
        <div class="kpi ${f.overnight?'warn':''}"><div class="kl">Pernocta</div><div class="kv" style="font-size:.8rem">${f.overnight?'Sí 🌙':'No'}</div></div>
      </div>
      <div class="dw-sec">Estado comercial</div>
      <div class="dw-amm">${f.handled
        ? `Operador <b>contratado</b> (${esc(al.name)}). Este movimiento genera trabajo MRO: callouts en turnaround y, si pernocta, daily check nocturno.`
        : `<span style="color:var(--warn)">Lead comercial</span> — ${esc(al.name)} opera en OVD pero <b>no tienes contrato</b>. Sube reputación para recibir una oferta.`}</div>
      <div class="dw-sec">Aeronave</div>
      <div class="linkcard" data-link="airplane"><div class="lk-ic" style="background:var(--accent-bg);color:var(--accent)">✈</div><div><div class="lk-t">Matrícula</div><div class="lk-v">${esc(f.reg)} · ${esc(f.model)}/${esc(f.eng)}</div></div><span class="lk-go">›</span></div>
      ${ev?`<div class="dw-sec">Trabajo asociado ahora</div><div class="linkcard" data-evt="${ev.id}" style="cursor:pointer"><div class="lk-ic" style="background:${ledColor(ev)}22;color:${ledColor(ev)}">${ev.icon}</div><div><div class="lk-t">${esc(ev.wo||ev.id)}</div><div class="lk-v">${esc((ev.desc||"").split("—")[0])}</div></div><span class="lk-go">›</span></div>`:""}
    </div>`;
}
