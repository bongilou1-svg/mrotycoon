// Spec sheet — wires up mockups, palette, shadow previews, line previews

(function () {
  // 1) Mockups -------------------------------------------------------------
  document.getElementById("mockup-day-frame").insertAdjacentHTML(
    "afterbegin", window.renderMapSVG("day", { idPrefix: "day" })
  );
  document.getElementById("mockup-night-frame").insertAdjacentHTML(
    "afterbegin", window.renderMapSVG("night", { idPrefix: "night" })
  );

  // 2) Palette grid --------------------------------------------------------
  const pd = window.MAP_PALETTES.day;
  const pn = window.MAP_PALETTES.night;
  const paletteRows = [
    { role: "Background mapa", desc: "Lo más oscuro · no es negro puro", k: "bg" },
    { role: "Grass / terreno",  desc: "Norte y sur del aeropuerto · −1% sobre BG", k: "grass" },
    { role: "Apron",            desc: "Concrete strip al sur de TWY T · inner-shadow", k: "apron" },
    { role: "Runway · fill",    desc: "Asfalto principal · igual luminancia que TWY", k: "runwayFill" },
    { role: "Runway · borde",   desc: "Trazo 1.2 px cool-blue", k: "runwayEdge" },
    { role: "Taxiway · fill",   desc: "TWY T, C, D, G — mismo tono, leve −2% vs runway", k: "taxiwayFill" },
    { role: "Taxiway · borde",  desc: "Trazo 0.8 px", k: "taxiwayEdge" },
    { role: "Service road / apron taxi", desc: "Banda sur del apron donde transitan vans / GSE", k: "apronTwy" },
    { role: "Centerline runway · 1305 m", desc: "Blanco frío · dash 14/10", k: "runwayCenterline", strokeOnly: true },
    { role: "Centerline runway · últimos 600 m", desc: "Tinte ámbar/rojo · dash 14/10", k: "runwayCLEnd", strokeOnly: true },
    { role: "Centerline taxiway", desc: "Ámbar técnico · dash 10/8", k: "taxiwayCenterline", strokeOnly: true },
    { role: "Stand · fill libre", desc: "Más claro que apron. Borde cool.", k: "standFreeFill" },
    { role: "Stand · borde libre", desc: "Sólido 1.2 px", k: "standFreeBorder" },
    { role: "Stand jet-bridge · fill", desc: "PRKG 01-03 — leve tono más cálido", k: "standJBFill" },
    { role: "Stand jet-bridge · borde", desc: "Sólido 1.2 px · más luminoso", k: "standJBBorder" },
    { role: "Stand · fill ocupado", desc: "+8% luminancia sobre libre", k: "standOccFill" },
    { role: "Stand · borde ocupado", desc: "Sólido 1.8 px ámbar", k: "standOccBorder" },
    { role: "Zona hangares · borde", desc: "Dashed 10/6 · rx 14 · Stage 3 / Stage 4", k: "hangarBorder", dashed: true },
    { role: "Terminal · fill", desc: "Edificio terminal sur · módulos divididos", k: "terminalFill" },
    { role: "Terminal · borde", desc: "Sólido 1 px", k: "terminalBorder" },
    { role: "Oficina mecs · fill", desc: "Highlight sobre terminal · ventanas iluminadas", k: "mecsOfficeFill" },
    { role: "Oficina · ventanas iluminadas", desc: "Cálido · día opaco, noche con glow", k: "officeWindow" },
    { role: "Glow actividad", desc: "Cyan blanquecino · solo en pulse de IN-SERVICE", k: "activityGlow" },
    { role: "Texto · primario", desc: "Códigos de stand, headers", k: "labelPrimary" },
    { role: "Texto · dim", desc: "Sub-labels, designators (THR 11 / 29)", k: "labelDim" },
    { role: "Texto · mute", desc: "Etiquetas TWY, scale bar, notas técnicas", k: "labelMute" },
    { role: "Acento ámbar técnico", desc: "Estado ocupado · costos · aviso", k: "amber" },
  ];

  const grid = document.getElementById("palette-grid");
  let html = `
    <div class="col-head">Role</div>
    <div class="col-head">Day</div>
    <div class="col-head">Night</div>
  `;
  paletteRows.forEach(r => {
    const dayVal = pd[r.k], nightVal = pn[r.k];
    const sw = (val) => {
      const style = r.strokeOnly
        ? `background: #0A1626; border-color: rgba(255,255,255,0.06);`
        : `background: ${val};`;
      const dashedCls = r.dashed ? " dashed" : "";
      const inner = r.strokeOnly
        ? `<svg width="36" height="36"><line x1="2" y1="18" x2="34" y2="18" stroke="${val}" stroke-width="2" stroke-dasharray="${r.k.includes('runway') ? '8 5' : '4 3'}" /></svg>`
        : (r.dashed
          ? `<div style="position:absolute;inset:0;border:1.5px dashed ${val};"></div>`
          : "");
      return `<div class="swatch-cell">
        <div class="swatch${dashedCls}" style="${style}">${inner}</div>
        <div class="swatch-meta">
          <div class="hex">${val.length > 7 ? val : val.toUpperCase()}</div>
          <div class="note">${r.strokeOnly ? "STROKE" : (r.dashed ? "DASHED" : "FILL")}</div>
        </div>
      </div>`;
    };
    html += `
      <div class="role">
        ${r.role}
        <div class="desc">${r.desc}</div>
      </div>
      ${sw(dayVal)}
      ${sw(nightVal)}
    `;
  });
  grid.innerHTML = html;

  // 3) Shadow previews -----------------------------------------------------
  const standPreview = (parentId, mode) => {
    const p = window.MAP_PALETTES[mode];
    const id = "prev-" + parentId;
    const svg = `
      <svg width="320" height="80" viewBox="0 0 320 80">
        <defs>
          <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.55"/>
          </filter>
        </defs>
        <rect x="0" y="0" width="320" height="80" fill="${p.apron}"/>
        <g filter="url(#${id}-shadow)">
          <rect x="100" y="22" width="120" height="36" fill="${p.standFreeFill}"
                stroke="${p.standFreeBorder}" stroke-width="1.2" rx="2"/>
        </g>
        <text x="160" y="44" fill="${p.labelPrimary}" font-family="IBM Plex Mono, monospace"
              font-size="11" text-anchor="middle" letter-spacing="2">PRKG 05</text>
      </svg>`;
    document.getElementById(parentId).innerHTML = svg;
  };
  standPreview("preview-sh01", "day");

  const officePreview = () => {
    const p = window.MAP_PALETTES.night;
    const svg = `
      <svg width="320" height="80" viewBox="0 0 320 80">
        <defs>
          <filter id="prev-office-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>
          </filter>
          <filter id="prev-window-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.4" result="blur"/>
            <feFlood flood-color="${p.officeWindow}" flood-opacity="0.55"/>
            <feComposite in2="blur" operator="in" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="320" height="80" fill="${p.apron}"/>
        <g filter="url(#prev-office-shadow)">
          <rect x="118" y="18" width="84" height="48" fill="${p.mecsOfficeFill}"
                stroke="${p.mecsOfficeBorder}" stroke-width="1.4" rx="2"/>
        </g>
        <g>
          <rect x="132" y="26" width="12" height="7" fill="${p.officeWindow}" filter="url(#prev-window-glow)" rx="1"/>
          <rect x="149" y="26" width="12" height="7" fill="${p.officeWindow}" filter="url(#prev-window-glow)" rx="1"/>
          <rect x="166" y="26" width="12" height="7" fill="${p.officeWindow}" filter="url(#prev-window-glow)" rx="1"/>
          <rect x="183" y="26" width="12" height="7" fill="${p.officeWindow}" filter="url(#prev-window-glow)" rx="1"/>
        </g>
      </svg>`;
    document.getElementById("preview-sh02").innerHTML = svg;
  };
  officePreview();

  const apronPreview = () => {
    const p = window.MAP_PALETTES.day;
    const svg = `
      <svg width="320" height="80" viewBox="0 0 320 80">
        <defs>
          <filter id="prev-apron-inner" x="-2%" y="-2%" width="104%" height="104%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="5"/>
            <feOffset dx="0" dy="3" result="blurred"/>
            <feComposite in="blurred" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="inverse"/>
            <feFlood flood-color="#000" flood-opacity="0.55" result="flood"/>
            <feComposite in="flood" in2="inverse" operator="in" result="shadow"/>
            <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shadow"/></feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="320" height="80" fill="${p.bg}"/>
        <rect x="20" y="10" width="280" height="60" fill="${p.apron}" filter="url(#prev-apron-inner)"/>
      </svg>`;
    document.getElementById("preview-sh03").innerHTML = svg;
  };
  apronPreview();

  const glowPreview = () => {
    const p = window.MAP_PALETTES.night;
    const svg = `
      <svg width="320" height="80" viewBox="0 0 320 80">
        <defs>
          <filter id="prev-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feFlood flood-color="${p.activityGlow}" flood-opacity="0.75"/>
            <feComposite in2="blur" operator="in" result="g"/>
            <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="320" height="80" fill="${p.apron}"/>
        <g filter="url(#prev-glow)">
          <rect x="100" y="22" width="120" height="36" fill="none"
                stroke="${p.activityGlow}" stroke-width="2" rx="2"/>
        </g>
        <circle cx="108" cy="30" r="2.5" fill="${p.activityGlow}"/>
        <text x="120" y="44" fill="${p.activityGlow}" font-family="IBM Plex Mono, monospace"
              font-size="10" letter-spacing="1.5" font-weight="500">PRKG 09 · IN SERVICE</text>
      </svg>`;
    document.getElementById("preview-sh04").innerHTML = svg;
  };
  glowPreview();

  // 4) Lines table ---------------------------------------------------------
  const lines = [
    {
      name: "Runway 11/29",
      width: "22 px alto (45 m × 0.49) · borde 1.2 px",
      color: "#2D547F (día) / #1F3A5C (noche)",
      cl: { dash: "14 / 10", w: 1.8, color: "#F2F4F7" },
    },
    {
      name: "Runway centerline · últimos 600 m",
      width: "1.8 px sobre el centerline base",
      color: "#F0C56A / #E6A93C (warning tint)",
      cl: { dash: "14 / 10", w: 1.8, color: "#F0C56A" },
    },
    {
      name: "TWY T (paralela)",
      width: "11 px (23 m × 0.49) · borde 0.8 px",
      color: "#2D547F / #1F3A5C",
      cl: { dash: "10 / 8", w: 1.2, color: "#C9A848" },
    },
    {
      name: "TWY C / D (rapid exits angulados)",
      width: "16 / 11 px · trazo 0.8 px",
      color: "#2D547F / #1F3A5C",
      cl: { dash: "10 / 8", w: 1.2, color: "#C9A848" },
    },
    {
      name: "TWY G (hangar spur)",
      width: "11 px (23 m × 0.49)",
      color: "#2D547F / #1F3A5C",
      cl: { dash: "10 / 8", w: 1.2, color: "#C9A848" },
    },
    {
      name: "Service road apron",
      width: "10 px · sin borde",
      color: "fill #1A314F / #0F2034",
      cl: { dash: "6 / 5", w: 0.9, color: "#C9A848" },
    },
    {
      name: "Stand · borde libre",
      width: "1.2 px sólido · rx 2",
      color: "#3E76AE / #4682BD",
      cl: null,
    },
    {
      name: "Stand jet-bridge · borde",
      width: "1.2 px sólido + marcador",
      color: "#5489BD / #5C9AD4",
      cl: null,
    },
    {
      name: "Stand · borde ocupado",
      width: "1.8 px sólido ámbar",
      color: "#E8B14A / #FFC04A",
      cl: null,
    },
    {
      name: "Zona hangares (Stage 3/4)",
      width: "1.5 px dashed · rx 14",
      color: "#4A6E96 / #3D618A",
      cl: { dash: "10 / 6", w: 1.5, color: "#4A6E96" },
    },
    {
      name: "Apron · borde interior",
      width: "0.8 px dashed · inset 3 px",
      color: "#506E91 @ 0.35 alpha",
      cl: { dash: "3 / 4", w: 0.8, color: "#506E91" },
    },
  ];
  const tbody = document.getElementById("lines-tbody");
  let trHtml = "";
  lines.forEach(l => {
    let preview = "";
    if (l.cl) {
      preview = `<svg width="130" height="22" viewBox="0 0 130 22">
        <line x1="6" y1="11" x2="124" y2="11" stroke="${l.cl.color}"
              stroke-width="${l.cl.w}" stroke-dasharray="${l.cl.dash.replace(' / ', ' ')}"/>
      </svg>`;
    } else if (l.name.includes("borde libre")) {
      preview = `<svg width="130" height="22" viewBox="0 0 130 22">
        <rect x="6" y="4" width="118" height="14" fill="#1B344F" stroke="#3E76AE" stroke-width="1.2" rx="2"/>
      </svg>`;
    } else if (l.name.includes("jet-bridge")) {
      preview = `<svg width="130" height="22" viewBox="0 0 130 22">
        <rect x="6" y="4" width="118" height="14" fill="#23415E" stroke="#5489BD" stroke-width="1.2" rx="2"/>
        <rect x="60" y="16" width="10" height="5" fill="#5489BD"/>
      </svg>`;
    } else if (l.name.includes("ocupado")) {
      preview = `<svg width="130" height="22" viewBox="0 0 130 22">
        <rect x="6" y="4" width="118" height="14" fill="#2A4866" stroke="#E8B14A" stroke-width="1.8" rx="2"/>
      </svg>`;
    } else {
      preview = `<svg width="130" height="22" viewBox="0 0 130 22">
        <rect x="6" y="4" width="118" height="14" fill="#1A314F"/>
      </svg>`;
    }
    trHtml += `
      <tr>
        <td>${l.name}</td>
        <td class="mono">${l.width}</td>
        <td class="mono">${l.color}</td>
        <td class="mono">${l.cl ? `dash ${l.cl.dash} · ${l.cl.w} px` : "—"}</td>
        <td style="text-align:right"><div class="line-preview" style="display:inline-block">${preview}</div></td>
      </tr>`;
  });
  tbody.innerHTML = trHtml;
})();
