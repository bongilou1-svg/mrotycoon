// MRO Tycoon — Map 3D v4
// Clean Bus Manager / Gemini-style aesthetic per user reference.
// Key features:
//   - TWY T horizontal at top, with CURVED yellow J-lines down to each stand
//   - 3 stands jet-bridge connected to a dominant horizontal terminal
//   - Airside service road between stands south edge and terminal top
//   - Landside car loop encircling parking + terminal
//   - Roundabout at SE integrating into the loop
//   - MECS office on left, control tower + access control on right
//   - Future hangar zone (labeled plot, no ghost building) at left
//   - Cargo area at south
//   - Parking with TREES interspersed

window.MAP3D_PALETTES = {
  day: {
    bg1:            "#0F1F36",
    bg2:            "#080F1C",
    grass:          "#0D1E32",
    grassAccent:    "#142B44",
    treeFill:       "#1E3A2A",
    treeShadow:     "#0D1F16",
    forest:         "#0B1A28",
    forestAccent:   "#16304A",
    river:          "#1F3E5A",
    riverEdge:      "#3D6FA0",

    asphalt:        "#162536",
    asphaltOutline: "#2E4869",
    twyCenterline:  "#E8B845",       // bright yellow

    roadFill:       "#1A2A3D",       // car road (slightly lighter than airport asphalt)
    roadOutline:    "#3D5C82",
    roadStripe:     "#E8B845",       // landside is also yellow stripe

    concreteApron:  "#26425F",       // lighter concrete
    concreteApronEdge:"#3D5C82",
    concreteLines:  "#3F5D80",

    standMark:      "#E0E6EE",       // white painted stand markings
    standCurve:     "#E8B845",       // yellow lead-in curve

    bldgRoof:       "#3C5C82",
    bldgSide:       "#1F354E",
    bldgOutline:    "#5E89B8",
    bldgHighlight:  "#7AA8D4",

    terminalRoof:   "#4A6E96",
    terminalSide:   "#22394F",
    terminalGlass:  "#7DC4F0",
    terminalAccent: "#F4A82E",

    mecsRoof:       "#3F6092",
    cargoRoof:      "#2D4F77",
    cargoSide:      "#172A40",
    hangarRoof:     "#33547C",
    hangarSide:     "#1A2D44",
    towerRoof:      "#4F7099",
    towerGlass:     "#8FDCFF",
    gateRoof:       "#28456A",

    ghostBorder:    "#4A6E96",
    ghostFill:      "rgba(60, 100, 145, 0.10)",

    windowLit:      "#F4D77A",
    towerLit:       "#9DDFFF",

    carRoof1:       "#5E89B8",
    carRoof2:       "#3C5C82",
    carRoof3:       "#7AA8D4",
    carRoof4:       "#284969",
    parkingLines:   "#3C5A7C",
    parkingFill:    "#142A45",

    activityGlow:   "#5BC5E8",

    labelPrimary:   "#C8D9EC",
    labelDim:       "#85A2C2",
    labelMute:      "#5A7596",
    labelAccent:    "#F4A82E",

    shadow:         "#000",
    shadowAlpha:    0.5,
  },
  night: {
    bg1:            "#080F1E",
    bg2:            "#030710",
    grass:          "#071424",
    grassAccent:    "#0E1F33",
    treeFill:       "#0D1F18",
    treeShadow:     "#04100A",
    forest:         "#040A14",
    forestAccent:   "#0A1A2E",
    river:          "#0F2540",
    riverEdge:      "#234B6F",

    asphalt:        "#0E1B2A",
    asphaltOutline: "#243C5A",
    twyCenterline:  "#D0A03A",

    roadFill:       "#101F30",
    roadOutline:    "#2C4669",
    roadStripe:     "#D0A03A",

    concreteApron:  "#18304E",
    concreteApronEdge:"#2C4669",
    concreteLines:  "#2E4969",

    standMark:      "#A8C0DA",
    standCurve:     "#D0A03A",

    bldgRoof:       "#2A4969",
    bldgSide:       "#142944",
    bldgOutline:    "#3D618A",
    bldgHighlight:  "#5489BD",

    terminalRoof:   "#345880",
    terminalSide:   "#152A40",
    terminalGlass:  "#5FB0DC",
    terminalAccent: "#FFB840",

    mecsRoof:       "#2C4F7A",
    cargoRoof:      "#1F3D5F",
    cargoSide:      "#0E1F33",
    hangarRoof:     "#234266",
    hangarSide:     "#0E1F33",
    towerRoof:      "#385C84",
    towerGlass:     "#9DE0FF",
    gateRoof:       "#1A3050",

    ghostBorder:    "#3D618A",
    ghostFill:      "rgba(40, 70, 110, 0.12)",

    windowLit:      "#FFE39A",
    towerLit:       "#9DDFFF",

    carRoof1:       "#3F628E",
    carRoof2:       "#2C4969",
    carRoof3:       "#5489BD",
    carRoof4:       "#1F3856",
    parkingLines:   "#2C4669",
    parkingFill:    "#0A1A2C",

    activityGlow:   "#7DDBFF",

    labelPrimary:   "#A8C0DA",
    labelDim:       "#6886A8",
    labelMute:      "#3F587A",
    labelAccent:    "#FFB840",

    shadow:         "#000",
    shadowAlpha:    0.6,
  },
};

// ============================================================
// Geometry
// ============================================================
window.MAP3D_GEOM = (() => {
  const W = 1280, H = 720;

  // TWY T parallel taxiway at top
  const twyT = { x: 40, y: 36, w: W - 80, h: 56 };

  // APRON
  const apron = { x: 380, y: 110, w: 600, h: 200 };

  // 3 stands across apron (jet-bridge nose-in)
  const standW = 168, standH = 158;
  const standGapX = 18;
  const standMargin = (apron.w - 3 * standW - 2 * standGapX) / 2;
  const standY = apron.y + 12;
  const stands = [];
  for (let i = 0; i < 3; i++) {
    stands.push({
      code: `PRKG 0${i + 1}`,
      x: apron.x + standMargin + i * (standW + standGapX),
      y: standY,
      w: standW,
      h: standH,
    });
  }

  // AIRSIDE service road — band south of stands, runs across the apron
  const airsideRoad = {
    x: apron.x + 6, y: standY + standH + 6, w: apron.w - 12, h: 18,
  };

  // TERMINAL — dominant horizontal building below the apron
  const terminal = {
    x: 200, y: 348, w: 880, h: 90, extrude: 16,
  };

  // MECS office — at WEST end of terminal area (kept simple, narrow column)
  const mecsOffice = {
    x: terminal.x, y: terminal.y + 4, w: 90, h: terminal.h - 8, extrude: 14,
  };

  // ACCESS GATE — at EAST end of terminal
  const accessGate = {
    x: terminal.x + terminal.w - 60, y: terminal.y + terminal.h - 28, w: 56, h: 24, extrude: 10,
  };

  // Control tower — east of terminal, free-standing
  const tower = {
    x: 1120, y: 380, w: 22, h: 22, extrude: 60,
  };

  // PARKING — large, below terminal
  const parking = { x: 220, y: 460, w: 840, h: 200 };

  // Trees in parking (deterministic positions, in 3 rows between car rows)
  let rng_s = 0xfeed;
  const rng = () => { rng_s = (rng_s * 9301 + 49297) % 233280; return rng_s / 233280; };
  const trees = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 14; col++) {
      const x = parking.x + 30 + col * ((parking.w - 60) / 14);
      const y = parking.y + 30 + row * ((parking.h - 60) / 3);
      if (rng() > 0.55) {  // 45% chance of tree
        trees.push({
          x: x + (rng() - 0.5) * 8,
          y: y + (rng() - 0.5) * 6,
          r: 4 + rng() * 2,
        });
      }
    }
  }
  // Cars in parking — fill remaining cells (deterministic seeded again)
  rng_s = 0xc0ffee;
  const cars = [];
  const carColors = ['carRoof1', 'carRoof2', 'carRoof3', 'carRoof4'];
  // Cars arranged in 4 rows of ~30 each
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 28; col++) {
      const cx = parking.x + 18 + col * ((parking.w - 36) / 28);
      const cy = parking.y + 12 + row * ((parking.h - 24) / 4);
      // Skip if close to a tree
      const tooClose = trees.some(t => Math.hypot(t.x - cx, t.y - cy) < 14);
      if (!tooClose && rng() > 0.3) {
        cars.push({
          x: cx, y: cy, w: 9, h: 14,
          color: carColors[Math.floor(rng() * 4)],
        });
      }
    }
  }

  // CARGO area — bottom left
  const cargoZone = { x: 50, y: 480, w: 150, h: 180 };
  const cargoBldg = { x: 60, y: 510, w: 130, h: 110, extrude: 18 };
  const cargoTrucks = [
    { x: 95, y: 630, w: 10, h: 18 },
    { x: 115, y: 630, w: 10, h: 18 },
    { x: 135, y: 630, w: 10, h: 18 },
  ];

  // FUTURE HANGAR zone — labeled plot only (no ghost building)
  const hangar = { x: 50, y: 110, w: 320, h: 320 };

  // Houses (rural decor)
  const houses = [
    { x: 110, y: 24, w: 22, h: 14, extrude: 8 },
    { x: 1180, y: 30, w: 20, h: 12, extrude: 7 },
  ];

  // ROADS — landside car loop encircling parking + terminal
  // Coordinates:
  //   - terminal-front road: between airsideRoad and terminal top
  //   - terminal-back road: between terminal bottom and parking top
  //   - parking-west road: vertical, west of parking
  //   - parking-south road: horizontal, south of parking
  //   - parking-east road: vertical, east of parking → connects to roundabout
  //   - roundabout SE corner
  //   - south entry: from canvas bottom to roundabout
  const roundabout = { cx: 1130, cy: 590, rOuter: 28, rInner: 12 };
  const loop = {
    terminalBack: { x1: parking.x - 16, x2: roundabout.cx, y: parking.y - 16, w: 16 },
    parkingWest:  { x: parking.x - 16, y1: parking.y - 16, y2: parking.y + parking.h + 16, w: 16 },
    parkingSouth: { x1: parking.x - 16, x2: roundabout.cx, y: parking.y + parking.h + 16, w: 16 },
    parkingEast:  { x: roundabout.cx, y1: parking.y - 16, y2: roundabout.cy - roundabout.rOuter, w: 16 },
    south:        { x: roundabout.cx, y1: H - 4, y2: roundabout.cy + roundabout.rOuter, w: 22 },
    // Final closing segment: from parkingSouth east end into roundabout
    southToRA:    { x1: roundabout.cx - 1, x2: roundabout.cx + 1, y1: parking.y + parking.h + 16, y2: roundabout.cy + roundabout.rOuter, w: 16 },
  };

  return {
    W, H,
    twyT, apron, stands, airsideRoad,
    terminal, mecsOffice, accessGate, tower,
    parking, cars, trees,
    cargoZone, cargoBldg, cargoTrucks,
    hangar, houses,
    roundabout, loop,
  };
})();

// ============================================================
// Renderer
// ============================================================
window.render3DMap = function render3DMap(mode, opts) {
  opts = opts || {};
  const p = window.MAP3D_PALETTES[mode];
  const g = window.MAP3D_GEOM;
  const id = opts.idPrefix || ("m3d-" + mode);

  const occCodes = new Set(opts.occCodes || []);
  const activeCodes = new Set(opts.activeCodes || []);

  const defs = `
    <defs>
      <radialGradient id="${id}-bg" cx="50%" cy="50%" r="80%">
        <stop offset="0%" stop-color="${p.bg1}"/>
        <stop offset="100%" stop-color="${p.bg2}"/>
      </radialGradient>
      <filter id="${id}-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="b"/>
        <feFlood flood-color="${p.activityGlow}" flood-opacity="0.7"/>
        <feComposite in2="b" operator="in" result="g"/>
        <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="${id}-windowGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="1.2" result="b"/>
        <feFlood flood-color="${p.windowLit}" flood-opacity="0.55"/>
        <feComposite in2="b" operator="in" result="r"/>
        <feMerge><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

  // Extrusion (NW light, shadow SE)
  function extrude(x, y, w, h, eh, roofFill, opts2 = {}) {
    const sideFill = opts2.sideFill || p.bldgSide;
    const outline = opts2.outline || p.bldgOutline;
    const rx = opts2.rx ?? 1.5;
    let out = '';
    out += `<rect x="${x + 3}" y="${y + 4}" width="${w}" height="${h}"
              fill="${p.shadow}" opacity="${p.shadowAlpha}" rx="${rx}"/>`;
    out += `<rect x="${x}" y="${y + h - eh}" width="${w}" height="${eh}"
              fill="${sideFill}" stroke="${outline}" stroke-width="0.5"/>`;
    out += `<line x1="${x}" y1="${y + h - eh}" x2="${x + w}" y2="${y + h - eh}"
              stroke="${p.bldgHighlight}" stroke-width="0.6" opacity="0.5"/>`;
    out += `<rect x="${x}" y="${y - eh}" width="${w}" height="${h}"
              fill="${roofFill}" stroke="${outline}" stroke-width="0.7" rx="${rx}"/>`;
    return out;
  }

  // ============================================================
  // 0. Background terrain
  // ============================================================
  let svg = `<rect x="0" y="0" width="${g.W}" height="${g.H}" fill="url(#${id}-bg)"/>`;
  svg += `<rect x="0" y="0" width="${g.W}" height="${g.H}" fill="${p.grass}" opacity="0.4"/>`;

  // Subtle terrain texture: dark splotches
  let n = 1234567;
  for (let i = 0; i < 50; i++) {
    n = (n * 9301 + 49297) % 233280;
    const x = (n / 233280) * g.W;
    n = (n * 9301 + 49297) % 233280;
    const y = (n / 233280) * g.H;
    n = (n * 9301 + 49297) % 233280;
    const r = 8 + (n / 233280) * 14;
    svg += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}"
              fill="${p.grassAccent}" opacity="0.45"/>`;
  }

  // ============================================================
  // 1. FUTURE HANGAR PLOT (labeled only — no ghost building)
  // ============================================================
  svg += `<rect x="${g.hangar.x}" y="${g.hangar.y}" width="${g.hangar.w}" height="${g.hangar.h}"
    fill="${p.ghostFill}" stroke="${p.ghostBorder}" stroke-width="1.5"
    stroke-dasharray="10 6" opacity="0.65" rx="12"/>`;
  svg += `<text x="${g.hangar.x + g.hangar.w / 2}" y="${g.hangar.y + g.hangar.h / 2 - 14}" text-anchor="middle"
    fill="${p.labelDim}" font-family="IBM Plex Mono, monospace"
    font-size="13" letter-spacing="4" font-weight="500" opacity="0.9">FUTURE EXPANSION</text>`;
  svg += `<text x="${g.hangar.x + g.hangar.w / 2}" y="${g.hangar.y + g.hangar.h / 2 + 6}" text-anchor="middle"
    fill="${p.labelMute}" font-family="IBM Plex Mono, monospace"
    font-size="10" letter-spacing="2" font-weight="500" opacity="0.85">RESERVED FOR FUTURE</text>`;
  svg += `<text x="${g.hangar.x + g.hangar.w / 2}" y="${g.hangar.y + g.hangar.h / 2 + 22}" text-anchor="middle"
    fill="${p.labelMute}" font-family="IBM Plex Mono, monospace"
    font-size="10" letter-spacing="2" font-weight="500" opacity="0.85">TAXIWAY CONNECTION</text>`;
  svg += `<text x="${g.hangar.x + g.hangar.w / 2}" y="${g.hangar.y + g.hangar.h / 2 + 42}" text-anchor="middle"
    fill="${p.labelAccent}" font-family="IBM Plex Mono, monospace"
    font-size="11" letter-spacing="2" font-weight="500" opacity="0.95">(500k €)</text>`;

  // ============================================================
  // 2. CARGO AREA
  // ============================================================
  const cz = g.cargoZone;
  svg += `<rect x="${cz.x}" y="${cz.y}" width="${cz.w}" height="${cz.h}"
    fill="${p.asphalt}" opacity="0.65" rx="3"/>`;
  svg += `<text x="${cz.x + cz.w / 2}" y="${cz.y + 16}" text-anchor="middle"
    fill="${p.labelDim}" font-family="IBM Plex Mono, monospace"
    font-size="11" letter-spacing="3" font-weight="500" opacity="0.9">CARGO AREA</text>`;
  // Cargo building
  const cb = g.cargoBldg;
  svg += extrude(cb.x, cb.y, cb.w, cb.h, cb.extrude, p.cargoRoof, { sideFill: p.cargoSide });
  // Cargo loading bay doors (south face)
  for (let i = 0; i < 4; i++) {
    const dx = cb.x + 14 + i * ((cb.w - 28) / 3);
    svg += `<rect x="${dx}" y="${cb.y + cb.h - 6}" width="14" height="4"
      fill="#0A1626" stroke="${p.bldgOutline}" stroke-width="0.4"/>`;
  }
  // Roof beams
  for (let i = 1; i < 4; i++) {
    const ly = cb.y - cb.extrude + (cb.h / 4) * i;
    svg += `<line x1="${cb.x + 6}" y1="${ly}" x2="${cb.x + cb.w - 6}" y2="${ly}"
      stroke="${p.bldgOutline}" stroke-width="0.4" opacity="0.55"/>`;
  }
  // Cargo trucks
  g.cargoTrucks.forEach(t => {
    svg += `<rect x="${t.x + 1}" y="${t.y + 1}" width="${t.w}" height="${t.h}"
      fill="${p.shadow}" opacity="0.4" rx="1"/>`;
    svg += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}"
      fill="${p.bldgRoof}" stroke="${p.bldgOutline}" stroke-width="0.4" rx="1"/>`;
    // Cab
    svg += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="6"
      fill="${p.bldgHighlight}" opacity="0.7" rx="0.5"/>`;
  });

  // ============================================================
  // 3. ROADS (landside car loop)
  // ============================================================
  const drawRoad = (x, y, w, h) => {
    return `<rect x="${x - 1}" y="${y - 1}" width="${w + 2}" height="${h + 2}"
              fill="${p.roadOutline}" opacity="0.7"/>
            <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.roadFill}"/>`;
  };
  const drawRoadStripe = (x1, y1, x2, y2) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
      stroke="${p.roadStripe}" stroke-width="0.8" stroke-dasharray="8 6" opacity="0.65"/>`;

  const lp = g.loop;
  // Terminal-back / parking-top road (east-west)
  svg += drawRoad(lp.terminalBack.x1, lp.terminalBack.y - lp.terminalBack.w/2, lp.terminalBack.x2 - lp.terminalBack.x1, lp.terminalBack.w);
  svg += drawRoadStripe(lp.terminalBack.x1 + 12, lp.terminalBack.y, lp.terminalBack.x2 - 12, lp.terminalBack.y);
  // Parking-west road (vertical)
  svg += drawRoad(lp.parkingWest.x - lp.parkingWest.w/2, lp.parkingWest.y1, lp.parkingWest.w, lp.parkingWest.y2 - lp.parkingWest.y1);
  svg += drawRoadStripe(lp.parkingWest.x, lp.parkingWest.y1 + 12, lp.parkingWest.x, lp.parkingWest.y2 - 12);
  // Parking-south road (east-west)
  svg += drawRoad(lp.parkingSouth.x1, lp.parkingSouth.y - lp.parkingSouth.w/2, lp.parkingSouth.x2 - lp.parkingSouth.x1, lp.parkingSouth.w);
  svg += drawRoadStripe(lp.parkingSouth.x1 + 12, lp.parkingSouth.y, lp.parkingSouth.x2 - 12, lp.parkingSouth.y);
  // Parking-east road (vertical, connects to roundabout)
  svg += drawRoad(lp.parkingEast.x - lp.parkingEast.w/2, lp.parkingEast.y1, lp.parkingEast.w, lp.parkingEast.y2 - lp.parkingEast.y1);
  svg += drawRoadStripe(lp.parkingEast.x, lp.parkingEast.y1 + 12, lp.parkingEast.x, lp.parkingEast.y2 - 12);
  // South entry (canvas bottom → roundabout)
  svg += drawRoad(lp.south.x - lp.south.w/2, lp.south.y2, lp.south.w, lp.south.y1 - lp.south.y2);
  svg += drawRoadStripe(lp.south.x, lp.south.y2 + 14, lp.south.x, lp.south.y1 - 14);

  // Roundabout
  const ra = g.roundabout;
  svg += `<circle cx="${ra.cx}" cy="${ra.cy}" r="${ra.rOuter}"
    fill="${p.roadFill}" stroke="${p.roadOutline}" stroke-width="1"/>`;
  svg += `<circle cx="${ra.cx}" cy="${ra.cy}" r="${ra.rInner}"
    fill="${p.grass}" stroke="${p.roadOutline}" stroke-width="0.6"/>`;
  // Inner ornament — small tree cluster
  svg += `<circle cx="${ra.cx - 3}" cy="${ra.cy - 2}" r="5" fill="${p.treeFill}" opacity="0.85"/>`;
  svg += `<circle cx="${ra.cx + 3}" cy="${ra.cy + 1}" r="4" fill="${p.treeFill}" opacity="0.8"/>`;

  // ============================================================
  // 4. TWY T
  // ============================================================
  const t = g.twyT;
  svg += `<rect x="${t.x - 1}" y="${t.y - 1}" width="${t.w + 2}" height="${t.h + 2}"
            fill="${p.asphaltOutline}" opacity="0.7"/>`;
  svg += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="${p.asphalt}"/>`;
  // Yellow centerline (single straight line in middle of TWY)
  svg += `<line x1="${t.x + 16}" y1="${t.y + t.h / 2}" x2="${t.x + t.w - 16}" y2="${t.y + t.h / 2}"
            stroke="${p.twyCenterline}" stroke-width="1.5" stroke-dasharray="14 10" opacity="0.85"/>`;
  // TWY T label
  svg += `<rect x="${t.x + t.w/2 - 60}" y="${t.y + t.h/2 - 8}" width="120" height="16"
            fill="${p.bg2}" stroke="${p.bldgOutline}" stroke-width="0.6" rx="2" opacity="0.9"/>`;
  svg += `<text x="${t.x + t.w / 2}" y="${t.y + t.h / 2 + 3}" text-anchor="middle"
            fill="${p.labelPrimary}" font-family="IBM Plex Mono, monospace"
            font-size="10" letter-spacing="4" font-weight="500">TAXIWAY T</text>`;

  // ============================================================
  // 5. CURVED YELLOW J-LINES from TWY T to each stand
  // ============================================================
  // Each line: start at TWY centerline above stand, curve down into stand center
  const standsToTwyCurves = g.stands.map(s => {
    const startX = s.x + s.w / 2;
    const startY = t.y + t.h / 2 + 4;
    const endX = startX;
    const endY = s.y + s.h * 0.5;
    return { startX, startY, endX, endY };
  });

  // ============================================================
  // 6. APRON
  // ============================================================
  const ap = g.apron;
  svg += `<rect x="${ap.x - 1}" y="${ap.y - 1}" width="${ap.w + 2}" height="${ap.h + 2}"
            fill="${p.concreteApronEdge}" opacity="0.7" rx="2"/>`;
  svg += `<rect x="${ap.x}" y="${ap.y}" width="${ap.w}" height="${ap.h}"
            fill="${p.concreteApron}" rx="2"/>`;
  // Concrete panel joints
  for (let i = 1; i < ap.w / 60; i++) {
    const lx = ap.x + i * 60;
    svg += `<line x1="${lx}" y1="${ap.y + 4}" x2="${lx}" y2="${ap.y + ap.h - 4}"
      stroke="${p.concreteLines}" stroke-width="0.4" opacity="0.3"/>`;
  }
  for (let i = 1; i < ap.h / 60; i++) {
    const ly = ap.y + i * 60;
    svg += `<line x1="${ap.x + 4}" y1="${ly}" x2="${ap.x + ap.w - 4}" y2="${ly}"
      stroke="${p.concreteLines}" stroke-width="0.4" opacity="0.3"/>`;
  }

  // ============================================================
  // 7. STAND TAXI ENTRIES (straight asphalt strips from TWY to apron, one per stand)
  // ============================================================
  g.stands.forEach(s => {
    const cx = s.x + s.w / 2;
    const tx = cx - 14;
    const ty = t.y + t.h;
    const th = ap.y - (t.y + t.h);
    svg += `<rect x="${tx - 1}" y="${ty}" width="${28 + 2}" height="${th}"
            fill="${p.asphaltOutline}" opacity="0.7"/>`;
    svg += `<rect x="${tx}" y="${ty}" width="28" height="${th}"
            fill="${p.asphalt}"/>`;
  });

  // ============================================================
  // 8. CURVED J-LINES (yellow, painted) — drawn on top of asphalt
  // ============================================================
  standsToTwyCurves.forEach((c, i) => {
    // Curve: starts at TWY centerline, descends, curves into stand center
    // We use a quadratic bezier for the curve
    const midY = (c.startY + c.endY) / 2;
    const d = `M ${c.startX} ${c.startY}
               L ${c.startX} ${midY - 20}
               Q ${c.startX} ${midY + 10} ${c.endX} ${c.endY}`;
    svg += `<path d="${d}" stroke="${p.standCurve}" stroke-width="1.5"
              stroke-dasharray="8 5" fill="none" opacity="0.85"/>`;
  });

  // ============================================================
  // 9. STANDS (painted markings on apron, with jet bridge stub)
  // ============================================================
  g.stands.forEach((s, i) => {
    const occ = occCodes.has(s.code);
    const active = activeCodes.has(s.code);
    const borderColor = active ? p.activityGlow : (occ ? p.labelAccent : p.standMark);
    const sw = active ? 2 : (occ ? 1.8 : 1.2);
    // Painted stand outline (semi-transparent fill)
    svg += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"
      fill="rgba(60, 100, 145, 0.08)" stroke="${borderColor}" stroke-width="${sw}"
      stroke-dasharray="${occ || active ? 'none' : '8 4'}" rx="2"/>`;
    // Code label
    svg += `<text x="${s.x + 14}" y="${s.y + 22}" fill="${p.labelDim}"
      font-family="IBM Plex Mono, monospace" font-size="12" font-weight="500"
      letter-spacing="2" opacity="0.85">${s.code}</text>`;
    // Nose stop bar (white horizontal)
    const stopY = s.y + s.h * 0.55;
    svg += `<line x1="${s.x + 24}" y1="${stopY}" x2="${s.x + s.w - 24}" y2="${stopY}"
      stroke="${p.standMark}" stroke-width="1" opacity="0.4" stroke-dasharray="5 3"/>`;
    // Jet bridge stub indicator (small line south, painted)
    svg += `<rect x="${s.x + s.w / 2 - 4}" y="${s.y + s.h - 6}" width="8" height="8"
      fill="${p.terminalAccent}" opacity="0.55"/>`;
  });
  // Active glow
  g.stands.forEach((s) => {
    if (!activeCodes.has(s.code)) return;
    svg += `<g filter="url(#${id}-glow)">
      <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"
        fill="none" stroke="${p.activityGlow}" stroke-width="2" rx="2"/>
    </g>`;
  });

  // ============================================================
  // 10. AIRSIDE SERVICE ROAD (yellow-bordered band between stands and terminal)
  // ============================================================
  const sr = g.airsideRoad;
  svg += `<rect x="${sr.x}" y="${sr.y}" width="${sr.w}" height="${sr.h}"
    fill="${p.asphalt}" stroke="${p.asphaltOutline}" stroke-width="0.6"/>`;
  // Yellow side stripes (top and bottom edges)
  svg += `<line x1="${sr.x + 8}" y1="${sr.y + 1.5}" x2="${sr.x + sr.w - 8}" y2="${sr.y + 1.5}"
    stroke="${p.twyCenterline}" stroke-width="1" opacity="0.7"/>`;
  svg += `<line x1="${sr.x + 8}" y1="${sr.y + sr.h - 1.5}" x2="${sr.x + sr.w - 8}" y2="${sr.y + sr.h - 1.5}"
    stroke="${p.twyCenterline}" stroke-width="1" opacity="0.7"/>`;
  // Centerline (dashed)
  svg += `<line x1="${sr.x + 14}" y1="${sr.y + sr.h / 2}" x2="${sr.x + sr.w - 14}" y2="${sr.y + sr.h / 2}"
    stroke="${p.standMark}" stroke-width="0.6" stroke-dasharray="8 5" opacity="0.45"/>`;
  // Label on the road
  svg += `<text x="${sr.x + sr.w / 2}" y="${sr.y + sr.h / 2 + 3}" text-anchor="middle"
    fill="${p.labelMute}" font-family="IBM Plex Mono, monospace"
    font-size="8" letter-spacing="3" font-weight="500" opacity="0.85">SERVICE ROAD (AIRSIDE)</text>`;

  // ============================================================
  // 11. TERMINAL — large dominant horizontal building
  // ============================================================
  const term = g.terminal;
  svg += extrude(term.x, term.y, term.w, term.h, term.extrude, p.terminalRoof, { sideFill: p.terminalSide });
  // Yellow trim at top (jet-bridge facing)
  svg += `<line x1="${term.x + 4}" y1="${term.y - term.extrude + 2}" x2="${term.x + term.w - 4}" y2="${term.y - term.extrude + 2}"
    stroke="${p.terminalAccent}" stroke-width="1" opacity="0.55"/>`;
  // Glass strip
  svg += `<rect x="${term.x + 6}" y="${term.y - term.extrude + 6}" width="${term.w - 12}" height="5"
    fill="${p.terminalGlass}" opacity="0.55" rx="0.5"/>`;
  // Module / gate dividers on roof (8 modules)
  for (let i = 1; i < 8; i++) {
    const dx = term.x + (term.w / 8) * i;
    svg += `<line x1="${dx}" y1="${term.y - term.extrude + 14}" x2="${dx}" y2="${term.y - term.extrude + term.h - 6}"
      stroke="${p.bldgOutline}" stroke-width="0.5" opacity="0.6"/>`;
  }
  // Lit windows (4×8 grid in middle)
  const wW = 14, wH = 5, wGap = 6;
  const winsX = term.x + 100;
  const winsY = term.y - term.extrude + 14;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 12; col++) {
      const wx = winsX + col * (wW + wGap);
      const wy = winsY + row * (wH + 4);
      if (wx + wW < term.x + term.w - 100) {
        svg += `<rect x="${wx}" y="${wy}" width="${wW}" height="${wH}"
          fill="${p.windowLit}" filter="url(#${id}-windowGlow)" opacity="0.9" rx="0.5"/>`;
      }
    }
  }
  // Terminal label
  svg += `<text x="${term.x + term.w / 2}" y="${term.y - term.extrude + term.h / 2 + 16}" text-anchor="middle"
    fill="${p.labelPrimary}" font-family="IBM Plex Mono, monospace"
    font-size="14" letter-spacing="8" font-weight="600" opacity="0.85">TERMINAL</text>`;

  // ============================================================
  // 12. MECS OFFICE — west end of terminal area
  // ============================================================
  const mo = g.mecsOffice;
  svg += extrude(mo.x, mo.y, mo.w, mo.h, mo.extrude, p.mecsRoof);
  // Windows
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const wx = mo.x + 12 + col * 18;
      const wy = mo.y - mo.extrude + 10 + row * 14;
      svg += `<rect x="${wx}" y="${wy}" width="10" height="6"
        fill="${p.windowLit}" filter="url(#${id}-windowGlow)" opacity="0.9" rx="0.5"/>`;
    }
  }
  svg += `<text x="${mo.x + mo.w / 2}" y="${mo.y - mo.extrude + mo.h - 6}" text-anchor="middle"
    fill="${p.labelDim}" font-family="IBM Plex Mono, monospace"
    font-size="9" letter-spacing="2" font-weight="500">MECS OFFICE</text>`;

  // ============================================================
  // 13. ACCESS GATE — east end of terminal area
  // ============================================================
  const ag = g.accessGate;
  svg += extrude(ag.x, ag.y, ag.w, ag.h, ag.extrude, p.gateRoof);
  svg += `<rect x="${ag.x + 4}" y="${ag.y + ag.h - 8}" width="${ag.w - 8}" height="5"
    fill="#0A1626" stroke="${p.bldgOutline}" stroke-width="0.4"/>`;
  svg += `<text x="${ag.x + ag.w / 2}" y="${ag.y - ag.extrude + ag.h / 2 + 2}" text-anchor="middle"
    fill="${p.labelDim}" font-family="IBM Plex Mono, monospace"
    font-size="7" letter-spacing="1.5" font-weight="500">ACCESS</text>`;

  // ============================================================
  // 14. CONTROL TOWER
  // ============================================================
  const tw = g.tower;
  svg += extrude(tw.x, tw.y, tw.w, tw.h, tw.extrude, p.towerRoof, { rx: 2 });
  svg += `<rect x="${tw.x - 4}" y="${tw.y - tw.extrude - 8}" width="${tw.w + 8}" height="10"
    fill="${p.towerGlass}" stroke="${p.bldgOutline}" stroke-width="0.6" opacity="0.85" rx="1.5"/>`;
  svg += `<line x1="${tw.x + tw.w / 2}" y1="${tw.y - tw.extrude - 8}" x2="${tw.x + tw.w / 2}" y2="${tw.y - tw.extrude - 24}"
    stroke="${p.labelDim}" stroke-width="0.9"/>`;
  svg += `<circle cx="${tw.x + tw.w / 2}" cy="${tw.y - tw.extrude - 24}" r="1.6" fill="${p.towerLit}">
    <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
  </circle>`;
  svg += `<text x="${tw.x + tw.w / 2}" y="${tw.y + tw.h + 14}" text-anchor="middle"
    fill="${p.labelDim}" font-family="IBM Plex Mono, monospace"
    font-size="9" letter-spacing="2" font-weight="500">CONTROL TOWER</text>`;

  // ============================================================
  // 15. PARKING LOT with cars + trees
  // ============================================================
  const pk = g.parking;
  svg += `<rect x="${pk.x - 1}" y="${pk.y - 1}" width="${pk.w + 2}" height="${pk.h + 2}"
            fill="${p.parkingLines}" opacity="0.7" rx="3"/>`;
  svg += `<rect x="${pk.x}" y="${pk.y}" width="${pk.w}" height="${pk.h}"
            fill="${p.parkingFill}" rx="3"/>`;
  // Aisle lines (4 rows)
  for (let row = 1; row < 5; row++) {
    const ay = pk.y + (pk.h / 5) * row;
    svg += `<line x1="${pk.x + 14}" y1="${ay}" x2="${pk.x + pk.w - 14}" y2="${ay}"
      stroke="${p.parkingLines}" stroke-width="0.5" opacity="0.55" stroke-dasharray="5 4"/>`;
  }
  // Cars
  g.cars.forEach(car => {
    svg += `<rect x="${car.x + 1}" y="${car.y + 1}" width="${car.w}" height="${car.h}"
      fill="${p.shadow}" opacity="0.4" rx="1"/>`;
    svg += `<rect x="${car.x}" y="${car.y}" width="${car.w}" height="${car.h}"
      fill="${p[car.color]}" stroke="${p.bldgOutline}" stroke-width="0.3" rx="1"/>`;
    svg += `<rect x="${car.x + 1}" y="${car.y + 1.5}" width="${car.w - 2}" height="3"
      fill="${p.bldgHighlight}" opacity="0.5" rx="0.5"/>`;
  });
  // Trees (drawn AFTER cars, on top)
  g.trees.forEach(tr => {
    // Shadow
    svg += `<ellipse cx="${tr.x + 1.5}" cy="${tr.y + 1.5}" rx="${tr.r}" ry="${tr.r * 0.8}"
      fill="${p.shadow}" opacity="0.5"/>`;
    // Trunk
    svg += `<rect x="${tr.x - 0.6}" y="${tr.y - 1}" width="1.2" height="3" fill="${p.treeShadow}"/>`;
    // Canopy
    svg += `<circle cx="${tr.x}" cy="${tr.y}" r="${tr.r}" fill="${p.treeFill}" stroke="${p.treeShadow}" stroke-width="0.4"/>`;
    // Highlight
    svg += `<ellipse cx="${tr.x - tr.r * 0.3}" cy="${tr.y - tr.r * 0.3}" rx="${tr.r * 0.45}" ry="${tr.r * 0.3}"
      fill="${p.grassAccent}" opacity="0.45"/>`;
  });
  // Parking label
  svg += `<text x="${pk.x + pk.w / 2}" y="${pk.y + pk.h + 14}" text-anchor="middle"
    fill="${p.labelDim}" font-family="IBM Plex Mono, monospace"
    font-size="10" letter-spacing="4" font-weight="500" opacity="0.85">PARKING</text>`;

  // ============================================================
  // 16. RURAL HOUSES (decoration)
  // ============================================================
  g.houses.forEach(h => {
    svg += extrude(h.x, h.y, h.w, h.h, h.extrude, p.gateRoof, { rx: 1 });
  });

  // ============================================================
  // 17. Top corner label
  // ============================================================
  svg += `<text x="30" y="708" fill="${p.labelMute}" font-family="IBM Plex Mono, monospace"
    font-size="9" letter-spacing="3" font-weight="500" opacity="0.7">LEAS · ASTURIAS · MRO TYCOON</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.W} ${g.H}"
    width="${g.W}" height="${g.H}" shape-rendering="geometricPrecision"
    text-rendering="optimizeLegibility">
    ${defs}
    ${svg}
  </svg>`;
};
