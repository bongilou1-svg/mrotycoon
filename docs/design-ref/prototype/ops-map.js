/* ===========================================================================
   MRO TYCOON — Panel Mapa (overlay universal sobre el OSM real de OVD)
   Reutiliza datos (EVENTS/FLIGHTS/AIRLINES/ROSTER) y el cajón de detalle.
   Posiciones de stands/aviones en % sobre la imagen del apron → al portar a
   Pixi, estas coords salen de las parking_positions reales del OSM.
   =========================================================================== */

/* Stands sobre el apron de OVD (códigos airport-style, estado y ocupante). */
const STANDS = [
  { code:"351", x:42.5, y:58, state:"aog",        evt:"WI-2042" }, // EC-NQM PTU
  { code:"451", x:48,   y:57, state:"unassigned", evt:"WI-2045" }, // EC-KCU fuel pump
  { code:"551", x:53.5, y:59, state:"working",    evt:"WI-2039" }, // EC-MBD FCV test
  { code:"352", x:59,   y:63, state:"unassigned", evt:"WI-2044" }, // EC-OKG brake crit
  { code:"452", x:49.5, y:69, state:"working",    evt:"DC-EC-NQN" }, // EC-NQN daily
  { code:"552", x:43.5, y:70, state:"free",       evt:null },
];
/* Aviones / furgo en movimiento por el apron. */
const MOVERS = [
  { kind:"plane", reg:"EI-DEK", al:"EI", x:63, y:46, evt:"WI-2041", label:"→ 551 taxi" },
  { kind:"plane", reg:"EC-MES", al:"VY", x:69, y:58, evt:"WI-2047", label:"→ 452 taxi" },
  { kind:"van",   reg:null,     al:null, x:62, y:75, mech:"M-003",  label:"· Marta → EI-DEK" },
];
const STATE_COLOR = { aog:"var(--aog)", unassigned:"var(--warn)", working:"var(--accent)", closing:"var(--cyan)", free:"var(--dim)" };
const STATE_LBL   = { aog:"AOG", unassigned:"Sin asignar", working:"Trabajando", closing:"Cerrando check", free:"Libre" };
const standEvent = s => s.evt ? EVENTS.find(e=>e.id===s.evt) : null;

function renderMapPanel(){
  return `<div class="map-stage">
    <div class="map-canvas"></div>
    <div class="map-scrim-grid"></div>
    ${mapZones()}
    ${mapMarkers()}
    ${mapHud()}
    ${mapLegend()}
    ${mapControls()}
    ${mapMini()}
  </div>`;
}

function mapZones(){
  const z = (x,y,t,sub)=>`<div class="mk" style="left:${x}%;top:${y}%;z-index:3">
    <div style="text-align:center;pointer-events:none">
      <div style="font:600 .6rem var(--disp);letter-spacing:.12em;text-transform:uppercase;color:var(--dim);white-space:nowrap;text-shadow:0 1px 4px #000">${t}</div>
      ${sub?`<div style="font:.58rem var(--mono);color:var(--muted)">${sub}</div>`:""}
    </div></div>`;
  return z(31,62,"Espacio hangares","Stage 3 · 500k € · Stage 4 · 1.5M €")
       + z(65,71,"Oficina mec.","")
       + `<div class="mk" style="left:50%;top:30%;z-index:3"><div style="font:600 .62rem var(--mono);color:var(--accent-2);letter-spacing:.1em;text-shadow:0 1px 4px #000;pointer-events:none">PISTA 11/29</div></div>`;
}

function mapMarkers(){
  let h = "";
  for (const s of STANDS){
    const e = standEvent(s);
    const occ = s.state==="free" ? "libre" : (e?.reg || "ocupado");
    h += `<div class="mk" style="left:${s.x}%;top:${s.y}%">
      <div class="stand st-${s.state} ${s.state==="aog"?"aog":""}" data-stand="${s.code}" title="Stand ${s.code} · ${STATE_LBL[s.state]}">
        <div class="pad"><span class="led"></span><span class="code">${s.code}</span></div>
        <span class="occ ${s.state==="free"?"free":""}">${esc(occ)}</span>
      </div></div>`;
  }
  for (const m of MOVERS){
    if (m.kind==="van"){
      h += `<div class="mk" style="left:${m.x}%;top:${m.y}%"><div class="mover van" data-mech="${m.mech}" title="Furgo de mecánicos">
        <div class="glyph">🚐</div><span class="tag">furgo <small>${esc(m.label)}</small></span></div></div>`;
    } else {
      const al = alOf(m.al);
      h += `<div class="mk" style="left:${m.x}%;top:${m.y}%"><div class="mover" data-evt="${m.evt}" style="--mc:${al.color}" title="${esc(m.reg)}">
        <div class="glyph">✈</div><span class="tag mono">${esc(m.reg)} <small>${esc(m.label)}</small></span>
        <span class="al-stripe" style="background:${al.color}"></span></div></div>`;
    }
  }
  return h;
}

function mapHud(){
  const onGround = STANDS.filter(s=>s.state!=="free");
  const deps = FLIGHTS.filter(f=>f.type==="departure" && f.min>=HUD.time).sort((a,b)=>a.min-b.min).slice(0,3);
  const arrs = FLIGHTS.filter(f=>f.type==="arrival"   && f.min>=HUD.time).sort((a,b)=>a.min-b.min).slice(0,3);
  const aogE = EVENTS.find(e=>e.aog && !isClosed(e));
  const row = (t,cs,rt,attr,color)=>`<div class="mapov-row" ${attr}>
    ${color?`<span class="dot" style="background:${color};box-shadow:0 0 6px ${color}"></span>`:""}
    <span class="t">${t}</span><span class="cs">${cs}</span>${rt?`<span class="rt">${rt}</span>`:""}</div>`;

  let ground = onGround.length
    ? onGround.map(s=>{const e=standEvent(s);return row(s.code, `<span class="mono">${esc(e?.reg||"—")}</span>`, STATE_LBL[s.state], `data-stand="${s.code}"`, STATE_COLOR[s.state]);}).join("")
    : `<div class="mapov-empty">Sin aviones en stand</div>`;
  let depH = deps.length ? deps.map(f=>row(hhmm(f.min), `<span class="mono">${esc(f.cs)}</span>`, "→ "+esc(f.remote), `data-flight="${f.id}"`)).join("") : `<div class="mapov-empty">Sin salidas próximas</div>`;
  let arrH = arrs.length ? arrs.map(f=>row(hhmm(f.min), `<span class="mono">${esc(f.cs)}</span>`, "← "+esc(f.remote), `data-flight="${f.id}"`)).join("") : `<div class="mapov-empty">Sin llegadas próximas</div>`;

  return `<div class="mapov">
    <div class="mapov-head"><span class="apt">OVD <small>· LEAS</small></span><span class="dn">${HUD.dayNight} Día</span></div>
    ${aogE?`<div class="mapov-sum"><span class="sig">AOG</span><span><b>${esc(aogE.reg)}</b> (PTU) en stand <b>351</b> bloquea salida</span></div>`:""}
    <div class="mapov-sec"><h4>🅿️ En tierra · ${onGround.length}</h4>${ground}</div>
    <div class="mapov-sep"></div>
    <div class="mapov-sec"><h4>🛫 Próximas salidas</h4>${depH}</div>
    <div class="mapov-sep"></div>
    <div class="mapov-sec"><h4>🛬 Próximas llegadas</h4>${arrH}</div>
  </div>`;
}

function mapLegend(){
  const items = [["aog","AOG"],["unassigned","Sin asignar"],["working","Trabajando"],["closing","Cerrando check"],["free","Libre"]];
  return `<div class="map-legend">${items.map(([k,l])=>`<span class="lg"><span class="led" style="color:${STATE_COLOR[k]};background:${STATE_COLOR[k]}"></span>${l}</span>`).join("")}</div>`;
}
function mapControls(){
  return `<div class="map-ctrl">
    <div class="zoom"><button data-act="zoom-in">+</button><button data-act="zoom-out">−</button><button data-act="zoom-fit" title="Encajar">⤢</button></div>
    <div class="pill">${HUD.dayNight} Día · 08:40</div>
  </div>`;
}
function mapMini(){
  return `<div class="map-mini"><div class="mm-bg"></div><span class="mm-label">OVD/LEAS</span>
    <div class="mm-view"></div>
    ${STANDS.map(s=>`<span class="mm-dot" style="left:${(s.x*0.42+30).toFixed(0)}%;top:${(s.y*0.4+34).toFixed(0)}%;background:${STATE_COLOR[s.state]};box-shadow:0 0 5px ${STATE_COLOR[s.state]}"></span>`).join("")}
  </div>`;
}

/* ---- Cajón de detalle del stand ---- */
function renderStandDrawer(s){
  const e = standEvent(s);
  const al = e ? alOf(e.al) : null;
  const c = STATE_COLOR[s.state];
  const occBlock = s.state==="free"
    ? `<div class="dw-amm" style="color:var(--dim)">Stand <b>libre</b> — listo para recibir un avión o asignar un A-check en plataforma.</div>`
    : `<div class="linkcard" data-link="airplane"><div class="lk-ic" style="background:${al.color}22;color:${al.color}">✈</div>
        <div><div class="lk-t">Ocupado por</div><div class="lk-v">${esc(e.reg)} · ${esc(e.model)}/${esc(e.eng)} · ${esc(al.name)}</div></div><span class="lk-go">›</span></div>`;
  const workBlock = e ? `<div class="dw-sec">Trabajo en curso</div>
      <div class="linkcard" data-evt="${e.id}" style="cursor:pointer"><div class="lk-ic" style="background:${ledColor(e)}22;color:${ledColor(e)}">${e.icon}</div>
        <div><div class="lk-t">${esc(e.wo||e.id)}</div><div class="lk-v">${esc((e.desc||"").split("—")[0])}</div></div><span class="lk-go">›</span></div>` : "";
  return `<div class="dw-head"><div class="dw-rail" style="background:${c};box-shadow:0 0 14px ${c}"></div>
      <button class="dw-close" data-close>✕</button>
      <div class="dw-eyebrow">▣ Stand · plataforma OVD</div>
      <div class="dw-title"><span class="reg">${esc(s.code)}</span><span class="type">${STATE_LBL[s.state]}</span></div>
      <div class="dw-sub"><span class="mc-state" style="color:${c};border-color:${c}55;background:${c}1a"><span class="led" style="background:${c}"></span>${STATE_LBL[s.state]}</span></div>
    </div>
    <div class="dw-body">
      <div class="dw-sec">Ocupación</div>
      ${occBlock}
      ${workBlock}
      <div class="dw-sec">Acciones</div>
      <div class="dw-actions">
        ${s.state==="free"?`<button class="btn primary" data-act="assign-stand">Asignar avión</button>`
          :`<button class="btn primary" data-act="focus">Seguir en mapa</button><button class="btn" data-act="release">Liberar</button>`}
      </div>
    </div>`;
}
