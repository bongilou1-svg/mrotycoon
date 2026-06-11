// MRO Tycoon — schematic map renderer v3
// LEAS / OVD (Asturias) per AIP-ENAIRE — adapted for the MRO game.
// Scale 0.49 px/m. Canvas 1280×720. RWY 11 (left) / 29 (right).
//
// Distribution (per user reference):
//   - RWY 11/29 along the top
//   - TWY T parallel just below
//   - 2 rapid exits from runway to TWY T (right side)
//   - APRON: single concrete rectangle, RIGHT side, with 3 generous jet-bridge stands
//   - Terminal: small, south of apron
//   - Mecs office + Fire station: right of terminal
//   - Parking lot: south of terminal (no cars, only lot markings)
//   - Future hangar zone: LEFT side, accessed by TWY spur

window.MAP_PALETTES = {
  day: {
    bg:              "#0E1B2D",
    grass:           "#0F2237",
    apron:           "#142A47",
    apronShadowAlpha: 0.55,
    runwayFill:      "#1B3556",
    runwayEdge:      "#2D547F",
    taxiwayFill:     "#1B3045",
    taxiwayEdge:     "#2D547F",
    apronTwy:        "#1A314F",
    auxCenterline:   "#E8EEF7",
    runwayCenterline: "#F2F4F7",
    runwayCLEnd:     "#F0C56A",
    taxiwayCenterline: "#C9A848",
    standFreeFill:   "#1B344F",
    standFreeBorder: "#3E76AE",
    standOccFill:    "#2A4866",
    standOccBorder:  "#E8B14A",
    standJBFill:     "#23415E",
    standJBBorder:   "#5489BD",
    hangarBorder:    "#4A6E96",
    hangarFill:      "rgba(40, 80, 120, 0.13)",
    terminalFill:    "#1F3A5C",
    terminalBorder:  "#42699A",
    mecsOfficeFill:  "#243F63",
    mecsOfficeBorder:"#5489BD",
    fireStationFill: "#3D1E1E",
    fireStationBorder:"#A65555",
    officeWindow:    "#F4D77A",
    fireBeacon:      "#E84A4A",
    parkingLines:    "#3A567B",
    parkingFill:     "rgba(25, 50, 80, 0.35)",
    activityGlow:    "#5BC5E8",
    activityGlowAlpha: 0.55,
    labelPrimary:    "#B8CFE6",
    labelDim:        "#7A99BD",
    labelMute:       "#506E91",
    amber:           "#F4A82E",
  },
  night: {
    bg:              "#050B16",
    grass:           "#081424",
    apron:           "#0A1726",
    apronShadowAlpha: 0.65,
    runwayFill:      "#112338",
    runwayEdge:      "#1F3A5C",
    taxiwayFill:     "#0E1F33",
    taxiwayEdge:     "#1F3A5C",
    apronTwy:        "#0F2034",
    auxCenterline:   "#C7D5E8",
    runwayCenterline: "#E2E8F1",
    runwayCLEnd:     "#E6A93C",
    taxiwayCenterline: "#B89538",
    standFreeFill:   "#11253D",
    standFreeBorder: "#4682BD",
    standOccFill:    "#1B3656",
    standOccBorder:  "#FFC04A",
    standJBFill:     "#16304E",
    standJBBorder:   "#5C9AD4",
    hangarBorder:    "#3D618A",
    hangarFill:      "rgba(20, 50, 90, 0.18)",
    terminalFill:    "#142B47",
    terminalBorder:  "#3D618A",
    mecsOfficeFill:  "#1A3354",
    mecsOfficeBorder:"#5489BD",
    fireStationFill: "#2A1414",
    fireStationBorder:"#8A4040",
    officeWindow:    "#FFE39A",
    fireBeacon:      "#FF6B6B",
    parkingLines:    "#2C4666",
    parkingFill:     "rgba(15, 30, 50, 0.45)",
    activityGlow:    "#7DDBFF",
    activityGlowAlpha: 0.75,
    labelPrimary:    "#9CB6D2",
    labelDim:        "#5F7B9C",
    labelMute:       "#3F587A",
    amber:           "#FFB840",
  },
};

window.MAP_GEOM = (() => {
  const W = 1280, H = 720;
  const SCALE = 0.49;
  const m = (meters) => meters * SCALE;

  // RUNWAY 11/29 — 2205m × 45m
  const runway = { x: 100, y: 92, w: m(2205), h: m(45) };

  // TWY T parallel — full length, 168m CL-to-CL from runway
  const twyT = {
    x: runway.x,
    y: runway.y + runway.h / 2 + m(168) - m(23) / 2,
    w: runway.w,
    h: m(23),
  };

  // 2 rapid exits (angled) on the right half of the runway
  // TWY C — ~1383m east of THR 11 (real INT C position)
  const twyC = {
    x1: runway.x + m(1383),
    x2: runway.x + m(1383) + m(180),
    y1: runway.y + runway.h,
    y2: twyT.y,
    w:  m(32.5),
  };
  // TWY D — ~1700m east of THR 11
  const twyD = {
    x1: runway.x + m(1700),
    x2: runway.x + m(1700) + m(150),
    y1: runway.y + runway.h,
    y2: twyT.y,
    w:  m(23),
  };

  // APRON — single rectangle, right-center, generous size for 3 jet-bridge stands
  const apron = {
    x: 680,
    y: twyT.y + twyT.h + 6,
    w: 460,
    h: 140,
  };

  // 3 stands inside apron (PRKG 01, 02, 03), each spacious enough for A330-class
  const standGapX = 16;
  const standMarginX = 18;
  const standY = apron.y + 18;
  const standH = 78;
  const standW = (apron.w - standMarginX * 2 - standGapX * 2) / 3;  // ~136
  const stands = [];
  for (let i = 0; i < 3; i++) {
    stands.push({
      code: `PRKG 0${i + 1}`,
      x: apron.x + standMarginX + i * (standW + standGapX),
      y: standY,
      w: standW,
      h: standH,
    });
  }

  // TERMINAL — small yellow building south of apron, narrower
  const terminal = {
    x: apron.x + 50,
    y: apron.y + apron.h + 22,
    w: apron.w - 130,
    h: 38,
  };

  // MECHANIC OFFICE — right of terminal
  const mecsOffice = {
    x: terminal.x + terminal.w + 18,
    y: terminal.y - 4,
    w: 56,
    h: terminal.h + 8,
  };

  // FIRE STATION — right of mecs office
  const fireStation = {
    x: mecsOffice.x + mecsOffice.w + 12,
    y: mecsOffice.y,
    w: 48,
    h: mecsOffice.h,
  };

  // PARKING LOT — below terminal complex (just lines, no cars)
  const parking = {
    x: terminal.x - 10,
    y: terminal.y + terminal.h + 20,
    w: (fireStation.x + fireStation.w) - (terminal.x - 10),
    h: 145,
  };

  // FUTURE HANGAR ZONE — left of apron, dashed
  const hangar = {
    x: 80,
    y: apron.y - 6,
    w: 580,
    h: 350,
  };
  // 2 sub-zones inside hangar area (Stage 3 smaller north, Stage 4 larger south)
  const hangarStage3 = {
    x: hangar.x + 30,
    y: hangar.y + 36,
    w: hangar.w - 60,
    h: 100,
  };
  const hangarStage4 = {
    x: hangar.x + 30,
    y: hangar.y + 36 + 100 + 20,
    w: hangar.w - 60,
    h: hangar.h - 36 - 100 - 20 - 24,
  };

  // TWY G — hangar access spur from TWY T south to hangar zone top
  const twyG = {
    x: hangar.x + hangar.w / 2 - m(23) / 2,
    y: twyT.y + twyT.h,
    w: m(23),
    h: hangar.y - (twyT.y + twyT.h) + 4,
  };

  return {
    W, H, SCALE,
    runway, twyT, twyC, twyD, twyG,
    apron, stands,
    terminal, mecsOffice, fireStation, parking,
    hangar, hangarStage3, hangarStage4,
  };
})();

// ============================================================
// Renderer
// ============================================================
window.renderMapSVG = function renderMapSVG(mode, opts) {
  opts = opts || {};
  const p = window.MAP_PALETTES[mode];
  const g = window.MAP_GEOM;
  const id = opts.idPrefix || mode;

  // Demo states for the 3 stands
  const occCodes  = new Set(opts.occCodes  || ["PRKG 02"]);
  const activeCodes = new Set(opts.activeCodes || ["PRKG 03"]);

  // Filters ---------------------------------------------------------------
  const filters = `
    <filter id="${id}-buildingShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>
    </filter>
    <filter id="${id}-smallShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.55"/>
    </filter>
    <filter id="${id}-apronInner" x="-2%" y="-2%" width="104%" height="104%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="5"/>
      <feOffset dx="0" dy="3" result="blurred"/>
      <feComposite in="blurred" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="inverse"/>
      <feFlood flood-color="#000" flood-opacity="${p.apronShadowAlpha}" result="flood"/>
      <feComposite in="flood" in2="inverse" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shadow"/></feMerge>
    </filter>
    <filter id="${id}-cyanGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feFlood flood-color="${p.activityGlow}" flood-opacity="${p.activityGlowAlpha}"/>
      <feComposite in2="blur" operator="in" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-windowGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="1.4" result="blur"/>
      <feFlood flood-color="${p.officeWindow}" flood-opacity="0.55"/>
      <feComposite in2="blur" operator="in" result="r"/>
      <feMerge><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-fireBeacon" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="${p.fireBeacon}" flood-opacity="0.85"/>
      <feComposite in2="blur" operator="in" result="r"/>
      <feMerge><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  `;

  let svg = `<rect x="0" y="0" width="${g.W}" height="${g.H}" fill="${p.bg}"/>`;

  // Corner brackets
  const brk = (x, y, dx, dy) => `<path d="M ${x} ${y + dy*16} L ${x} ${y} L ${x + dx*16} ${y}"
    stroke="${p.labelMute}" stroke-width="1" fill="none" opacity="0.5"/>`;
  svg += brk(14, 14, 1, 1) + brk(g.W - 14, 14, -1, 1)
       + brk(14, g.H - 14, 1, -1) + brk(g.W - 14, g.H - 14, -1, -1);

  // Top-left identification
  svg += `<text x="30" y="32" fill="${p.labelDim}" font-family="IBM Plex Mono, monospace"
    font-size="11" letter-spacing="3" font-weight="500">LEAS · OVD · ASTURIAS</text>`;
  svg += `<text x="30" y="46" fill="${p.labelMute}" font-family="IBM Plex Mono, monospace"
    font-size="9" letter-spacing="2">43°33′49″N · 06°02′05″W · ELEV 127m</text>`;

  // ----- FUTURE HANGAR ZONE -----
  // Outer dashed box
  svg += `<rect x="${g.hangar.x}" y="${g.hangar.y}" width="${g.hangar.w}" height="${g.hangar.h}"
    fill="${p.hangarFill}" stroke="${p.hangarBorder}" stroke-width="1.5"
    stroke-dasharray="10 6" rx="14"/>`;
  // Header label
  svg += `<text x="${g.hangar.x + g.hangar.w / 2}" y="${g.hangar.y + 20}" text-anchor="middle"
    fill="${p.labelDim}" font-family="IBM Plex Mono, monospace" font-size="11"
    letter-spacing="4" font-weight="500">ZONA FUTUROS HANGARES — MRO</text>`;
  // Stage 3 sub-zone
  const drawSubStage = (s, name, cost) => {
    let out = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"
      fill="none" stroke="${p.hangarBorder}" stroke-width="0.8"
      stroke-dasharray="3 5" opacity="0.6" rx="6"/>`;
    // Internal hangar footprint placeholder
    out += `<rect x="${s.x + 24}" y="${s.y + 16}" width="${s.w - 48}" height="${s.h - 30}"
      fill="rgba(0,0,0,0.15)" stroke="${p.hangarBorder}" stroke-width="0.6"
      stroke-dasharray="2 3" opacity="0.5" rx="3"/>`;
    out += `<text x="${s.x + s.w / 2}" y="${s.y + s.h / 2 - 4}" text-anchor="middle"
      fill="${p.labelDim}" font-family="IBM Plex Mono, monospace" font-size="13"
      letter-spacing="3" font-weight="500">${name}</text>`;
    out += `<text x="${s.x + s.w / 2}" y="${s.y + s.h / 2 + 14}" text-anchor="middle"
      fill="${p.amber}" font-family="IBM Plex Mono, monospace" font-size="11"
      letter-spacing="1.5" font-weight="500">${cost}</text>`;
    return out;
  };
  svg += drawSubStage(g.hangarStage3, "STAGE 3 · HANGAR", "500k €");
  svg += drawSubStage(g.hangarStage4, "STAGE 4 · HANGAR DOBLE", "1.5M €");

  // ----- TWY G (hangar access spur) -----
  svg += `<rect x="${g.twyG.x}" y="${g.twyG.y}" width="${g.twyG.w}" height="${g.twyG.h}"
    fill="${p.taxiwayFill}" stroke="${p.taxiwayEdge}" stroke-width="0.8"/>`;
  svg += `<line x1="${g.twyG.x + g.twyG.w / 2}" y1="${g.twyG.y + 4}"
    x2="${g.twyG.x + g.twyG.w / 2}" y2="${g.twyG.y + g.twyG.h - 4}"
    stroke="${p.taxiwayCenterline}" stroke-width="1.2" stroke-dasharray="10 8" opacity="0.7"/>`;
  svg += `<text x="${g.twyG.x + g.twyG.w + 6}" y="${g.twyG.y + 14}" fill="${p.labelMute}"
    font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="2">TWY G</text>`;

  // ----- RUNWAY -----
  const r = g.runway;
  svg += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"
    fill="${p.runwayFill}" stroke="${p.runwayEdge}" stroke-width="1.2"/>`;
  // Side stripes
  svg += `<line x1="${r.x + 6}" y1="${r.y + 2.5}" x2="${r.x + r.w - 6}" y2="${r.y + 2.5}"
    stroke="${p.runwayCenterline}" stroke-width="0.8" opacity="0.35"/>`;
  svg += `<line x1="${r.x + 6}" y1="${r.y + r.h - 2.5}" x2="${r.x + r.w - 6}" y2="${r.y + r.h - 2.5}"
    stroke="${p.runwayCenterline}" stroke-width="0.8" opacity="0.35"/>`;
  // Centerline
  const clY = r.y + r.h / 2;
  const cl600End = r.x + r.w - 18;
  const cl1305End = cl600End - 600 * g.SCALE;
  svg += `<line x1="${r.x + 18}" y1="${clY}" x2="${cl1305End}" y2="${clY}"
    stroke="${p.runwayCenterline}" stroke-width="1.8" stroke-dasharray="14 10"/>`;
  svg += `<line x1="${cl1305End}" y1="${clY}" x2="${cl600End}" y2="${clY}"
    stroke="${p.runwayCLEnd}" stroke-width="1.8" stroke-dasharray="14 10" opacity="0.85"/>`;
  // TDZ markings on RWY 29 (900m white)
  const tdzStart = r.x + r.w - 900 * g.SCALE - 20;
  for (let i = 0; i < 8; i++) {
    const tdzX = tdzStart + (cl600End - tdzStart) * (i / 8);
    svg += `<line x1="${tdzX}" y1="${r.y + 4}" x2="${tdzX + 14}" y2="${r.y + 4}"
      stroke="${p.runwayCenterline}" stroke-width="1.2" opacity="0.4"/>`;
    svg += `<line x1="${tdzX}" y1="${r.y + r.h - 4}" x2="${tdzX + 14}" y2="${r.y + r.h - 4}"
      stroke="${p.runwayCenterline}" stroke-width="1.2" opacity="0.4"/>`;
  }
  // Designators inside runway
  svg += `<text x="${r.x + 20}" y="${clY + 4}" fill="${p.labelDim}"
    font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="2" font-weight="500">11</text>`;
  svg += `<text x="${r.x + r.w - 20}" y="${clY + 4}" fill="${p.labelDim}"
    font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="2"
    font-weight="500" text-anchor="end">29</text>`;
  // Green thresholds
  svg += `<line x1="${r.x + 1}" y1="${r.y}" x2="${r.x + 1}" y2="${r.y + r.h}"
    stroke="#5BE89D" stroke-width="2" opacity="0.8"/>`;
  svg += `<line x1="${r.x + r.w - 1}" y1="${r.y}" x2="${r.x + r.w - 1}" y2="${r.y + r.h}"
    stroke="#5BE89D" stroke-width="2" opacity="0.8"/>`;
  // External labels
  svg += `<text x="${r.x + 14}" y="${r.y - 6}" fill="${p.labelDim}"
    font-family="IBM Plex Mono, monospace" font-size="10" letter-spacing="2.5">THR 11</text>`;
  svg += `<text x="${r.x + r.w - 14}" y="${r.y - 6}" fill="${p.labelDim}"
    font-family="IBM Plex Mono, monospace" font-size="10" letter-spacing="2.5"
    text-anchor="end">THR 29</text>`;
  svg += `<text x="${r.x + r.w / 2}" y="${r.y - 6}" fill="${p.labelMute}"
    font-family="IBM Plex Mono, monospace" font-size="10" letter-spacing="3"
    text-anchor="middle">RWY 11/29  ·  2205 × 45 m</text>`;

  // ----- TWY T -----
  const t = g.twyT;
  svg += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}"
    fill="${p.taxiwayFill}" stroke="${p.taxiwayEdge}" stroke-width="0.8"/>`;
  svg += `<line x1="${t.x + 8}" y1="${t.y + t.h / 2}" x2="${t.x + t.w - 8}" y2="${t.y + t.h / 2}"
    stroke="${p.taxiwayCenterline}" stroke-width="1.2" stroke-dasharray="10 8" opacity="0.7"/>`;
  svg += `<text x="${t.x + 6}" y="${t.y - 4}" fill="${p.labelMute}"
    font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="2.5">TWY T</text>`;
  svg += `<text x="${r.x + 30}" y="${t.y - 4}" fill="${p.labelMute}"
    font-family="IBM Plex Mono, monospace" font-size="8" letter-spacing="1.5">T-2</text>`;
  svg += `<text x="${r.x + r.w - 30}" y="${t.y - 4}" fill="${p.labelMute}"
    font-family="IBM Plex Mono, monospace" font-size="8" letter-spacing="1.5"
    text-anchor="end">T-1</text>`;

  // ----- RAPID EXITS (TWY C, TWY D) -----
  const drawAngledTwy = (twy, name) => {
    const dx = twy.x2 - twy.x1, dy = twy.y2 - twy.y1;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    const hw = twy.w / 2;
    const path = `M ${twy.x1 + nx * hw} ${twy.y1 + ny * hw}
                  L ${twy.x2 + nx * hw} ${twy.y2 + ny * hw}
                  L ${twy.x2 - nx * hw} ${twy.y2 - ny * hw}
                  L ${twy.x1 - nx * hw} ${twy.y1 - ny * hw} Z`;
    let out = `<path d="${path}" fill="${p.taxiwayFill}" stroke="${p.taxiwayEdge}" stroke-width="0.8"/>`;
    out += `<line x1="${twy.x1}" y1="${twy.y1}" x2="${twy.x2}" y2="${twy.y2}"
      stroke="${p.taxiwayCenterline}" stroke-width="1.2" stroke-dasharray="10 8" opacity="0.7"/>`;
    out += `<text x="${twy.x2 + 6}" y="${twy.y1 + 12}" fill="${p.labelMute}"
      font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="2">${name}</text>`;
    return out;
  };
  svg += drawAngledTwy(g.twyC, "TWY C");
  svg += drawAngledTwy(g.twyD, "TWY D");

  // ----- APRON -----
  const ap = g.apron;
  svg += `<rect x="${ap.x}" y="${ap.y}" width="${ap.w}" height="${ap.h}"
    fill="${p.apron}" filter="url(#${id}-apronInner)"/>`;
  // Apron subtle border
  svg += `<rect x="${ap.x + 3}" y="${ap.y + 3}" width="${ap.w - 6}" height="${ap.h - 6}"
    fill="none" stroke="${p.labelMute}" stroke-width="0.8"
    stroke-dasharray="3 4" opacity="0.35"/>`;

  // Service road along south edge of apron (where vans drive)
  const serviceRoadY = ap.y + ap.h - 16;
  svg += `<rect x="${ap.x + 6}" y="${serviceRoadY}" width="${ap.w - 12}" height="10"
    fill="${p.apronTwy}" opacity="0.85"/>`;
  // Yellow centerline on service road
  svg += `<line x1="${ap.x + 12}" y1="${serviceRoadY + 5}" x2="${ap.x + ap.w - 12}" y2="${serviceRoadY + 5}"
    stroke="${p.taxiwayCenterline}" stroke-width="0.9" stroke-dasharray="6 5" opacity="0.55"/>`;

  // ----- STANDS -----
  g.stands.forEach((s) => {
    const occ = occCodes.has(s.code);
    const fill = occ ? p.standOccFill : p.standJBFill;
    const border = occ ? p.standOccBorder : p.standJBBorder;
    const sw = occ ? 2 : 1.5;

    // Shadow + rect
    svg += `<g filter="url(#${id}-smallShadow)">
      <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"
        fill="${fill}" stroke="${border}" stroke-width="${sw}" rx="3"/>
    </g>`;

    // Corner ticks
    const tickL = 8;
    const tickC = occ ? border : p.labelMute;
    const tickOp = occ ? 0.55 : 0.4;
    const tk = (x, y, dx, dy) => `<path d="M ${x} ${y + dy * tickL} L ${x} ${y} L ${x + dx * tickL} ${y}"
      stroke="${tickC}" stroke-width="0.9" fill="none" opacity="${tickOp}"/>`;
    svg += tk(s.x + 6, s.y + 6, 1, 1);
    svg += tk(s.x + s.w - 6, s.y + 6, -1, 1);
    svg += tk(s.x + 6, s.y + s.h - 6, 1, -1);
    svg += tk(s.x + s.w - 6, s.y + s.h - 6, -1, -1);

    // Code label top-left
    svg += `<text x="${s.x + 12}" y="${s.y + 22}" fill="${p.labelPrimary}"
      font-family="IBM Plex Mono, monospace" font-size="13" font-weight="500" letter-spacing="1.5">${s.code}</text>`;
    // Status label top-right
    const status = occ ? "OCC" : "FREE";
    const statusColor = occ ? p.amber : p.labelDim;
    svg += `<text x="${s.x + s.w - 12}" y="${s.y + 22}" fill="${statusColor}"
      font-family="IBM Plex Mono, monospace" font-size="10" font-weight="500"
      letter-spacing="2" text-anchor="end" opacity="0.9">${status}</text>`;

    // "Stop bar" line (where the nose stops) — visual horizontal line in middle of stand
    const stopY = s.y + s.h * 0.62;
    svg += `<line x1="${s.x + 18}" y1="${stopY}" x2="${s.x + s.w - 18}" y2="${stopY}"
      stroke="${p.runwayCenterline}" stroke-width="1" opacity="0.4" stroke-dasharray="6 3"/>`;
    // Centerline guidance (vertical, where aircraft taxis in)
    svg += `<line x1="${s.x + s.w / 2}" y1="${s.y + 4}" x2="${s.x + s.w / 2}" y2="${stopY - 2}"
      stroke="${p.taxiwayCenterline}" stroke-width="0.9" stroke-dasharray="3 4" opacity="0.55"/>`;
    // Jet bridge stub indicator (small bar at south edge of stand, pointing toward terminal)
    const jbX = s.x + s.w / 2 - 8;
    const jbY = s.y + s.h - 4;
    svg += `<rect x="${jbX}" y="${jbY}" width="16" height="6" fill="${border}" opacity="0.85" rx="0.5"/>`;
    svg += `<rect x="${jbX + 4}" y="${jbY + 6}" width="8" height="4" fill="${border}" opacity="0.55"/>`;
  });

  // Activity glow on active stand
  g.stands.forEach((s) => {
    if (!activeCodes.has(s.code)) return;
    svg += `<g filter="url(#${id}-cyanGlow)">
      <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"
        fill="none" stroke="${p.activityGlow}" stroke-width="2.5" rx="3"/>
    </g>`;
    svg += `<circle cx="${s.x + 12}" cy="${s.y + s.h - 12}" r="3" fill="${p.activityGlow}"/>`;
    svg += `<text x="${s.x + 22}" y="${s.y + s.h - 8}" fill="${p.activityGlow}"
      font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="2" font-weight="500">IN SERVICE</text>`;
  });

  // ----- TERMINAL (yellow accent) -----
  const term = g.terminal;
  svg += `<g filter="url(#${id}-buildingShadow)">
    <rect x="${term.x}" y="${term.y}" width="${term.w}" height="${term.h}"
      fill="${p.terminalFill}" stroke="${p.terminalBorder}" stroke-width="1" rx="1.5"/>
  </g>`;
  // Subtle yellow accent line along terminal top (where jet bridges attach)
  svg += `<line x1="${term.x + 4}" y1="${term.y + 1}" x2="${term.x + term.w - 4}" y2="${term.y + 1}"
    stroke="${p.amber}" stroke-width="1" opacity="0.5"/>`;
  // Module dividers
  const moduleCount = 5;
  for (let i = 1; i < moduleCount; i++) {
    const dx = term.x + (term.w / moduleCount) * i;
    svg += `<line x1="${dx}" y1="${term.y + 3}" x2="${dx}" y2="${term.y + term.h - 3}"
      stroke="${p.terminalBorder}" stroke-width="0.6" opacity="0.6"/>`;
  }
  svg += `<text x="${term.x + term.w / 2}" y="${term.y + term.h / 2 + 4}" text-anchor="middle"
    fill="${p.labelDim}" font-family="IBM Plex Mono, monospace"
    font-size="10" letter-spacing="3" font-weight="500">TERMINAL · 8,700 m²</text>`;

  // ----- MECS OFFICE (right of terminal) -----
  const mo = g.mecsOffice;
  svg += `<g filter="url(#${id}-buildingShadow)">
    <rect x="${mo.x}" y="${mo.y}" width="${mo.w}" height="${mo.h}"
      fill="${p.mecsOfficeFill}" stroke="${p.mecsOfficeBorder}" stroke-width="1.2" rx="2"/>
  </g>`;
  // 4 lit windows
  const wW = 9, wH = 6, wGap = 4;
  const winsX = mo.x + (mo.w - (wW * 2 + wGap)) / 2;
  const winsY = mo.y + 5;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      svg += `<rect x="${winsX + col * (wW + wGap)}" y="${winsY + row * (wH + wGap)}"
        width="${wW}" height="${wH}" fill="${p.officeWindow}"
        filter="url(#${id}-windowGlow)" opacity="0.95" rx="0.8"/>`;
    }
  }
  svg += `<text x="${mo.x + mo.w / 2}" y="${mo.y + mo.h - 4}" text-anchor="middle"
    fill="${p.labelDim}" font-family="IBM Plex Mono, monospace"
    font-size="8" letter-spacing="2" font-weight="500">MECS</text>`;

  // ----- FIRE STATION (right of mecs office) -----
  const fs = g.fireStation;
  svg += `<g filter="url(#${id}-buildingShadow)">
    <rect x="${fs.x}" y="${fs.y}" width="${fs.w}" height="${fs.h}"
      fill="${p.fireStationFill}" stroke="${p.fireStationBorder}" stroke-width="1.2" rx="2"/>
  </g>`;
  // Garage door indicator (large opening on bottom)
  svg += `<rect x="${fs.x + 6}" y="${fs.y + fs.h - 18}" width="${fs.w - 12}" height="14"
    fill="#1A0606" stroke="${p.fireStationBorder}" stroke-width="0.5"/>`;
  // 3 vertical lines indicating garage door panels
  for (let i = 1; i < 4; i++) {
    const dx = fs.x + 6 + (fs.w - 12) / 4 * i;
    svg += `<line x1="${dx}" y1="${fs.y + fs.h - 17}" x2="${dx}" y2="${fs.y + fs.h - 5}"
      stroke="${p.fireStationBorder}" stroke-width="0.4" opacity="0.7"/>`;
  }
  // Red beacon on roof (with glow)
  svg += `<g filter="url(#${id}-fireBeacon)">
    <circle cx="${fs.x + fs.w / 2}" cy="${fs.y + 5}" r="2" fill="${p.fireBeacon}"/>
  </g>`;
  svg += `<text x="${fs.x + fs.w / 2}" y="${fs.y + 14}" text-anchor="middle"
    fill="${p.fireStationBorder}" font-family="IBM Plex Mono, monospace"
    font-size="8" letter-spacing="2" font-weight="600">SEI</text>`;

  // ----- PARKING LOT (red zone — just lines, no cars) -----
  const pk = g.parking;
  svg += `<rect x="${pk.x}" y="${pk.y}" width="${pk.w}" height="${pk.h}"
    fill="${p.parkingFill}" stroke="${p.parkingLines}" stroke-width="0.8"
    stroke-dasharray="6 4" rx="3"/>`;
  // Internal parking aisles — 3 rows of parking spaces
  const rows = 4;
  const colsPerRow = 24;
  const aislePadY = 12;
  const innerY = pk.y + aislePadY;
  const innerH = pk.h - aislePadY * 2;
  const rowH = innerH / rows;
  const spaceW = (pk.w - 24) / colsPerRow;
  for (let row = 0; row < rows; row++) {
    const ry = innerY + rowH * row + rowH / 2;
    // Aisle horizontal line
    svg += `<line x1="${pk.x + 12}" y1="${ry}" x2="${pk.x + pk.w - 12}" y2="${ry}"
      stroke="${p.parkingLines}" stroke-width="0.6" opacity="0.5"/>`;
    // Vertical space lines (perpendicular to aisle)
    for (let col = 0; col < colsPerRow; col++) {
      const cx = pk.x + 12 + col * spaceW;
      const halfH = rowH * 0.35;
      svg += `<line x1="${cx}" y1="${ry - halfH}" x2="${cx}" y2="${ry + halfH}"
        stroke="${p.parkingLines}" stroke-width="0.5" opacity="0.45"/>`;
    }
  }
  svg += `<text x="${pk.x + 12}" y="${pk.y + 12}" fill="${p.labelMute}"
    font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="2.5">PARKING · 380 plazas</text>`;

  // ----- Scale bar + North arrow -----
  const scaleBarLen = 200 * g.SCALE;
  const sbX = 30, sbY = g.H - 36;
  svg += `<line x1="${sbX}" y1="${sbY}" x2="${sbX + scaleBarLen}" y2="${sbY}"
    stroke="${p.labelDim}" stroke-width="1.2"/>`;
  svg += `<line x1="${sbX}" y1="${sbY - 4}" x2="${sbX}" y2="${sbY + 4}"
    stroke="${p.labelDim}" stroke-width="1.2"/>`;
  svg += `<line x1="${sbX + scaleBarLen}" y1="${sbY - 4}" x2="${sbX + scaleBarLen}" y2="${sbY + 4}"
    stroke="${p.labelDim}" stroke-width="1.2"/>`;
  svg += `<text x="${sbX + scaleBarLen / 2}" y="${sbY + 16}" text-anchor="middle"
    fill="${p.labelMute}" font-family="IBM Plex Mono, monospace"
    font-size="9" letter-spacing="2">200 m</text>`;

  const nX = g.W - 50, nY = 60;
  svg += `<circle cx="${nX}" cy="${nY}" r="14" fill="none" stroke="${p.labelMute}" stroke-width="1"/>`;
  svg += `<path d="M ${nX} ${nY - 10} L ${nX - 4} ${nY + 6} L ${nX} ${nY + 3} L ${nX + 4} ${nY + 6} Z"
    fill="${p.labelDim}"/>`;
  svg += `<text x="${nX}" y="${nY - 18}" text-anchor="middle" fill="${p.labelDim}"
    font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="2">N</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.W} ${g.H}"
    width="${g.W}" height="${g.H}" shape-rendering="geometricPrecision"
    text-rendering="optimizeLegibility">
    <defs>${filters}</defs>
    ${svg}
  </svg>`;
};
