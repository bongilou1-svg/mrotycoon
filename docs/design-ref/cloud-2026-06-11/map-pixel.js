// MRO Tycoon — pixel art map renderer
// Native pixel scale: 320 × 180. Scaled up 2-4x via image-rendering: pixelated.
// All elements drawn with integer-pixel rects/lines for crisp pixel-art feel.

window.PIXEL_PALETTES = {
  day: {
    // Terrain
    grass:    "#1f3a2c",
    grassDark:"#163025",
    grassHi:  "#2a4d3a",
    earth:    "#3d3624",
    // Asphalt (taxiway / service)
    asphalt:  "#1d2a3e",
    asphaltDark:"#13202f",
    twyLine:  "#e8b845",
    // Concrete (apron, parking lot)
    concrete: "#3a516e",
    concreteDark:"#2d4159",
    concreteLine:"#5675a0",
    // Roads (landside car roads)
    road:     "#2a3548",
    roadDark: "#1d2638",
    roadLine: "#d4b048",
    // Buildings
    bldgRoof: "#456a96",
    bldgSide: "#26405d",
    bldgRoofHi:"#5e89b8",
    bldgDoor: "#0d1424",
    bldgWindow:"#e8c768",
    bldgWindowDark:"#a08545",
    terminalRoof:"#3d5a82",
    terminalRoofHi:"#5e89b8",
    terminalAccent:"#e8a838",
    mecsRoof: "#3d5680",
    cargoRoof:"#2d4566",
    cargoSide:"#1a2a40",
    towerRoof:"#456a96",
    towerCabin:"#a8d8f8",
    // Trees
    tree:     "#1c4030",
    treeHi:   "#2a5840",
    treeShadow:"#0d1f16",
    // Cars (4 variants)
    car1:     "#6a90c0",
    car2:     "#3a5680",
    car3:     "#a86838",
    car4:     "#5e7d9a",
    carWindow:"#b8d0e8",
    // Plane
    planeBody:"#dde4ee",
    planeWing:"#b8c4d4",
    planeShadow:"#0a1424",
    planeCockpit:"#3a6890",
    planeStripe:"#4a8ec4",
    // Mech van (orange)
    vanBody:  "#e8a838",
    vanRoof:  "#c08825",
    vanWindow:"#1d2a3e",
    // Misc
    ghostBorder:"#4a6e96",
    ghostFill:"#1a2638",
    activityGlow:"#7dd0ff",
    fireBeacon:"#ff5848",
    // Text
    text:     "#c8d9ec",
    textDim:  "#7a99bd",
    textMute: "#4a6280",
    textAccent:"#e8a838",
    // Background
    bg:       "#0d1320",
  },
  night: {
    grass:    "#0e1f17",
    grassDark:"#081410",
    grassHi:  "#163025",
    earth:    "#1f1d12",
    asphalt:  "#10182a",
    asphaltDark:"#080e1c",
    twyLine:  "#d0a03a",
    concrete: "#1f3554",
    concreteDark:"#152540",
    concreteLine:"#345878",
    road:     "#15203a",
    roadDark: "#0a1428",
    roadLine: "#b89538",
    bldgRoof: "#2a456a",
    bldgSide: "#152540",
    bldgRoofHi:"#3d6090",
    bldgDoor: "#040810",
    bldgWindow:"#f8d878",
    bldgWindowDark:"#705a25",
    terminalRoof:"#2a3e60",
    terminalRoofHi:"#3d6090",
    terminalAccent:"#e8a838",
    mecsRoof: "#2a3e60",
    cargoRoof:"#1d3050",
    cargoSide:"#0d1a2c",
    towerRoof:"#2a456a",
    towerCabin:"#a8e0ff",
    tree:     "#0d201a",
    treeHi:   "#163828",
    treeShadow:"#040c08",
    car1:     "#3d5680",
    car2:     "#1f2e48",
    car3:     "#6a4525",
    car4:     "#3a4d65",
    carWindow:"#6890b8",
    planeBody:"#b8c4d4",
    planeWing:"#8a98ac",
    planeShadow:"#040810",
    planeCockpit:"#1d4060",
    planeStripe:"#2a5680",
    vanBody:  "#d09a30",
    vanRoof:  "#a07020",
    vanWindow:"#0d1828",
    ghostBorder:"#3d618a",
    ghostFill:"#0e1828",
    activityGlow:"#9de0ff",
    fireBeacon:"#ff7060",
    text:     "#a8c0da",
    textDim:  "#6886a8",
    textMute: "#3a526e",
    textAccent:"#e8a838",
    bg:       "#050810",
  },
};

// Helper — draw a filled rectangle
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
// Draw a 1px line (horizontal or vertical)
function pxLine(ctx, x1, y1, x2, y2, color) {
  ctx.fillStyle = color;
  if (y1 === y2) ctx.fillRect(x1, y1, x2 - x1 + 1, 1);
  else if (x1 === x2) ctx.fillRect(x1, y1, 1, y2 - y1 + 1);
}

// Tiny deterministic RNG so layout is stable
let rs = 0xdead;
function rng() { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; }
function rseed(s) { rs = s; }

// ============================================================
// Sprites — pixel-art primitives, drawn at integer pixel coords
// ============================================================

// Small aircraft top-down, ~14×16 (commercial regional jet style)
// orientation: 'N', 'S', 'E', 'W'. Default nose-south for parked.
function drawPlane(ctx, x, y, p, orient = 'S') {
  // 'orient' rotates the sprite. We define base sprite nose-down (south).
  // Base sprite cells (16w × 18h) — drawn at x,y as top-left.
  // For brevity, only S supported here; other orients applied via canvas rotation.
  ctx.save();
  ctx.translate(x + 8, y + 9);
  const rotMap = { N: Math.PI, S: 0, E: -Math.PI / 2, W: Math.PI / 2 };
  ctx.rotate(rotMap[orient] || 0);
  ctx.imageSmoothingEnabled = false;
  // Shadow
  px(ctx, -7, -8, 14, 16, p.planeShadow + '99');  // semi-transparent shadow
  // Body (vertical fuselage)
  px(ctx, -1, -8, 2, 16, p.planeBody);
  // Cockpit (top — which is south after rotation 0, so it's at -8)
  px(ctx, -1, 6, 2, 2, p.planeCockpit);
  // Wings (horizontal)
  px(ctx, -7, -2, 14, 2, p.planeWing);
  // Wing tips highlight
  px(ctx, -7, -1, 1, 1, p.planeBody);
  px(ctx, 6, -1, 1, 1, p.planeBody);
  // Tail wings
  px(ctx, -3, 4, 6, 1, p.planeWing);
  // Engines (under wings)
  px(ctx, -5, 0, 2, 2, p.planeShadow);
  px(ctx, 3, 0, 2, 2, p.planeShadow);
  // Body stripe
  px(ctx, -1, -3, 2, 1, p.planeStripe);
  ctx.restore();
}

// Pixel car: 4 wide × 6 tall
function drawCar(ctx, x, y, p, colorKey) {
  // Shadow
  px(ctx, x + 1, y + 1, 4, 6, p.planeShadow + '88');
  // Body
  px(ctx, x, y, 4, 6, p[colorKey]);
  // Windshield (front 2 rows)
  px(ctx, x, y + 1, 4, 2, p.carWindow);
  // Roof divider
  px(ctx, x, y + 3, 4, 1, p[colorKey]);
  // Rear window
  px(ctx, x, y + 4, 4, 1, p.carWindow);
  // Roof highlight pixel
  px(ctx, x + 1, y, 2, 1, p[colorKey]);
}

// Pixel tree — 5 wide × 6 tall (round canopy + trunk)
function drawTree(ctx, x, y, p) {
  // Shadow
  px(ctx, x + 1, y + 3, 6, 3, p.treeShadow + 'aa');
  // Canopy (rounded look)
  px(ctx, x + 1, y, 4, 1, p.tree);
  px(ctx, x, y + 1, 6, 3, p.tree);
  px(ctx, x + 1, y + 4, 4, 1, p.tree);
  // Highlight (NW)
  px(ctx, x + 1, y + 1, 2, 1, p.treeHi);
  px(ctx, x + 1, y, 1, 1, p.treeHi);
  // Trunk
  px(ctx, x + 2, y + 4, 2, 1, p.treeShadow);
}

// Extruded building — top-down with fake height. (x, y) top-left of roof, extrude = how many pixels of side wall.
function drawBldg(ctx, x, y, w, h, p, opts = {}) {
  const extrude = opts.extrude ?? 2;
  const roofColor = opts.roof || p.bldgRoof;
  const sideColor = opts.side || p.bldgSide;
  const hiColor = opts.hi || p.bldgRoofHi;
  // Shadow (SE)
  px(ctx, x + 1, y + h + 1, w, extrude + 1, p.planeShadow + 'aa');
  // Side wall (south face, below roof)
  px(ctx, x, y + h, w, extrude, sideColor);
  // Roof
  px(ctx, x, y, w, h, roofColor);
  // Roof NW highlight (1px)
  pxLine(ctx, x, y, x + w - 1, y, hiColor);
  pxLine(ctx, x, y, x, y + h - 1, hiColor);
}

// Draw a row of windows on a roof
function drawWindowRow(ctx, x, y, count, gap, p, lit = true) {
  for (let i = 0; i < count; i++) {
    px(ctx, x + i * (1 + gap), y, 1, 1, lit ? p.bldgWindow : p.bldgWindowDark);
  }
}

// ============================================================
// MAIN RENDER
// ============================================================
window.renderPixelMap = function renderPixelMap(ctx, W, H, mode) {
  const p = window.PIXEL_PALETTES[mode];
  ctx.imageSmoothingEnabled = false;
  rseed(0xface);

  // ============================================================
  // 0. BACKGROUND grass terrain (full canvas)
  // ============================================================
  px(ctx, 0, 0, W, H, p.grass);
  // Subtle dark grass patches
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rng() * W);
    const y = Math.floor(rng() * H);
    const sz = 1 + Math.floor(rng() * 3);
    px(ctx, x, y, sz, sz, p.grassDark);
  }
  // Subtle highlight patches
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rng() * W);
    const y = Math.floor(rng() * H);
    px(ctx, x, y, 2, 1, p.grassHi);
  }

  // ============================================================
  // 1. TAXIWAY T (top of canvas)
  // ============================================================
  const twy = { x: 8, y: 8, w: W - 16, h: 14 };
  px(ctx, twy.x, twy.y, twy.w, twy.h, p.asphalt);
  // Top/bottom edge highlight
  pxLine(ctx, twy.x, twy.y, twy.x + twy.w - 1, twy.y, p.asphaltDark);
  pxLine(ctx, twy.x, twy.y + twy.h - 1, twy.x + twy.w - 1, twy.y + twy.h - 1, p.asphaltDark);
  // Dashed yellow centerline
  for (let xi = twy.x + 2; xi < twy.x + twy.w - 2; xi += 5) {
    px(ctx, xi, twy.y + 6, 3, 1, p.twyLine);
  }
  // Label centered
  ctx.fillStyle = p.text;
  ctx.font = '5px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TWY T', W / 2, twy.y + twy.h / 2 + 0.5);

  // ============================================================
  // 2. APRON (concrete) — single big rect
  // ============================================================
  const apron = { x: 95, y: 28, w: 160, h: 52 };
  px(ctx, apron.x, apron.y, apron.w, apron.h, p.concrete);
  // Concrete panel grid (subtle darker lines every 8 pixels)
  for (let xi = apron.x + 8; xi < apron.x + apron.w; xi += 8) {
    pxLine(ctx, xi, apron.y, xi, apron.y + apron.h - 1, p.concreteDark);
  }
  for (let yi = apron.y + 8; yi < apron.y + apron.h; yi += 8) {
    pxLine(ctx, apron.x, yi, apron.x + apron.w - 1, yi, p.concreteDark);
  }

  // ============================================================
  // 3. STAND TAXI ENTRIES (asphalt strips from TWY down to apron)
  //    + CURVED yellow J-lines
  // ============================================================
  const stands = [
    { code: 'P01', cx: apron.x + 26 },
    { code: 'P02', cx: apron.x + 80 },
    { code: 'P03', cx: apron.x + 134 },
  ];
  stands.forEach(s => {
    // Asphalt strip from TWY bottom to apron top, 10px wide
    px(ctx, s.cx - 5, twy.y + twy.h, 10, apron.y - (twy.y + twy.h), p.asphalt);
    // Yellow guideline (solid line going down, slight curve effect by stair-stepping)
    const startX = s.cx;
    const startY = twy.y + twy.h;
    const endY = apron.y;
    for (let yi = startY; yi < endY; yi++) {
      px(ctx, startX, yi, 1, 1, p.twyLine);
    }
  });

  // ============================================================
  // 4. STANDS — painted markings on apron + parked aircraft
  //    Stand 1: occupied (plane). Stand 2: in service (glow). Stand 3: free.
  // ============================================================
  const standW = 30, standH = 36;
  const standData = stands.map((s, i) => ({
    ...s,
    x: s.cx - standW / 2,
    y: apron.y + 6,
    w: standW,
    h: standH,
    state: ['occupied', 'service', 'free'][i],
  }));
  standData.forEach(sd => {
    // Painted stand outline (white pixels)
    const borderColor =
      sd.state === 'service' ? p.activityGlow :
      sd.state === 'occupied' ? p.textAccent :
      p.textDim;
    // top/bottom borders
    pxLine(ctx, sd.x, sd.y, sd.x + sd.w - 1, sd.y, borderColor);
    pxLine(ctx, sd.x, sd.y + sd.h - 1, sd.x + sd.w - 1, sd.y + sd.h - 1, borderColor);
    // left/right borders
    pxLine(ctx, sd.x, sd.y, sd.x, sd.y + sd.h - 1, borderColor);
    pxLine(ctx, sd.x + sd.w - 1, sd.y, sd.x + sd.w - 1, sd.y + sd.h - 1, borderColor);
    // Lead-in dashed line (vertical center, painted)
    for (let yi = sd.y + 2; yi < sd.y + sd.h * 0.7; yi += 3) {
      px(ctx, sd.cx, yi, 1, 1, p.twyLine);
    }
    // Stand code (tiny, top-left of stand)
    ctx.fillStyle = p.textDim;
    ctx.font = '4px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(sd.code, sd.x + 2, sd.y + 2);
    // Aircraft if occupied or service
    if (sd.state !== 'free') {
      drawPlane(ctx, sd.cx - 8, sd.y + 10, p, 'S');
    }
  });

  // ============================================================
  // 5. SERVICE ROAD (airside, between stands and terminal)
  // ============================================================
  const sr = { x: apron.x, y: apron.y + apron.h, w: apron.w, h: 6 };
  px(ctx, sr.x, sr.y, sr.w, sr.h, p.asphaltDark);
  // Yellow stripes top and bottom
  pxLine(ctx, sr.x + 2, sr.y + 1, sr.x + sr.w - 3, sr.y + 1, p.twyLine);
  pxLine(ctx, sr.x + 2, sr.y + sr.h - 2, sr.x + sr.w - 3, sr.y + sr.h - 2, p.twyLine);

  // ============================================================
  // 6. TERMINAL (long horizontal building)
  // ============================================================
  const term = { x: 60, y: 88, w: 220, h: 22 };
  drawBldg(ctx, term.x, term.y, term.w, term.h, p, {
    roof: p.terminalRoof, hi: p.terminalRoofHi, extrude: 3,
  });
  // Glass / accent strip along TWY-facing edge (top)
  pxLine(ctx, term.x + 2, term.y + 1, term.x + term.w - 3, term.y + 1, p.terminalAccent);
  // Lit windows row 1
  for (let xi = term.x + 6; xi < term.x + term.w - 6; xi += 4) {
    px(ctx, xi, term.y + 4, 2, 1, p.bldgWindow);
  }
  // Lit windows row 2
  for (let xi = term.x + 8; xi < term.x + term.w - 6; xi += 4) {
    px(ctx, xi, term.y + 8, 2, 1, p.bldgWindow);
  }
  // Module dividers
  for (let i = 1; i < 6; i++) {
    const dx = term.x + (term.w / 6) * i;
    pxLine(ctx, dx, term.y + 1, dx, term.y + term.h - 1, p.bldgSide);
  }
  // Label
  ctx.fillStyle = p.text;
  ctx.font = '5px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TERMINAL', term.x + term.w / 2, term.y + term.h - 6);

  // ============================================================
  // 7. MECS OFFICE (left of terminal)
  // ============================================================
  const mecs = { x: 38, y: 86, w: 16, h: 24 };
  drawBldg(ctx, mecs.x, mecs.y, mecs.w, mecs.h, p, {
    roof: p.mecsRoof, hi: p.bldgRoofHi, extrude: 3,
  });
  // Windows grid
  for (let row = 0; row < 4; row++) {
    drawWindowRow(ctx, mecs.x + 3, mecs.y + 3 + row * 4, 4, 2, p, true);
  }
  // Label tiny below
  ctx.fillStyle = p.textDim;
  ctx.font = '3px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MECS', mecs.x + mecs.w / 2, mecs.y + mecs.h + 6);

  // ============================================================
  // 8. CONTROL TOWER (right of terminal, tall narrow)
  // ============================================================
  const tower = { x: 290, y: 84, w: 6, h: 6 };
  // Base (extruded tall — use multiple stacked rects to fake height)
  for (let i = 0; i < 18; i++) {
    px(ctx, tower.x, tower.y + i, tower.w, 1, i % 2 === 0 ? p.bldgRoof : p.bldgSide);
  }
  // Cabin (glass on top)
  px(ctx, tower.x - 1, tower.y - 4, tower.w + 2, 4, p.towerCabin);
  pxLine(ctx, tower.x - 1, tower.y - 4, tower.x + tower.w, tower.y - 4, p.bldgRoofHi);
  // Antenna
  pxLine(ctx, tower.x + 3, tower.y - 4, tower.x + 3, tower.y - 10, p.textDim);
  // Antenna light (blinking — we won't animate static but draw lit)
  px(ctx, tower.x + 3, tower.y - 11, 1, 1, p.activityGlow);
  // Label
  ctx.fillStyle = p.textDim;
  ctx.font = '3px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TWR', tower.x + 3, tower.y + 24);

  // ============================================================
  // 9. ACCESS GATE (small, east of terminal)
  // ============================================================
  const gate = { x: 264, y: 110, w: 12, h: 8 };
  drawBldg(ctx, gate.x, gate.y, gate.w, gate.h, p, {
    roof: p.bldgRoof, extrude: 2,
  });
  // Garage door indicator
  px(ctx, gate.x + 2, gate.y + gate.h - 1, gate.w - 4, 1, p.fireBeacon);

  // ============================================================
  // 10. CAR LOOP — landside roads encircling parking
  // ============================================================
  // Coords for the rectangular loop
  const loop = {
    topY: term.y + term.h + 4,        // between terminal and parking
    leftX: 30,
    rightX: 280,
    bottomY: 168,
    w: 6,
  };
  // Top road (between terminal and parking, drop-off)
  px(ctx, loop.leftX, loop.topY, loop.rightX - loop.leftX, loop.w, p.road);
  // Bottom road
  px(ctx, loop.leftX, loop.bottomY, loop.rightX - loop.leftX, loop.w, p.road);
  // Left road
  px(ctx, loop.leftX, loop.topY, loop.w, loop.bottomY - loop.topY + loop.w, p.road);
  // Right road
  px(ctx, loop.rightX, loop.topY, loop.w, loop.bottomY - loop.topY + loop.w, p.road);
  // Yellow dashed centerlines on each segment
  for (let xi = loop.leftX + 4; xi < loop.rightX; xi += 5) {
    px(ctx, xi, loop.topY + 2, 3, 1, p.roadLine);
    px(ctx, xi, loop.bottomY + 2, 3, 1, p.roadLine);
  }
  for (let yi = loop.topY + 4; yi < loop.bottomY; yi += 5) {
    px(ctx, loop.leftX + 2, yi, 1, 3, p.roadLine);
    px(ctx, loop.rightX + 2, yi, 1, 3, p.roadLine);
  }
  // Roundabout at bottom-right of loop
  const ra = { cx: loop.rightX + 3, cy: loop.bottomY + 3, r: 5 };
  // Outer asphalt ring (circle approximated with rect mask)
  // Easier: draw 9x9 square, then dark center
  px(ctx, ra.cx - 5, ra.cy - 5, 11, 11, p.road);
  px(ctx, ra.cx - 2, ra.cy - 2, 5, 5, p.grass);
  // Decorative tree center
  px(ctx, ra.cx - 1, ra.cy - 1, 3, 3, p.tree);

  // South entry road from canvas bottom up to roundabout
  px(ctx, ra.cx - 3, ra.cy + 3, 6, H - (ra.cy + 3), p.road);
  for (let yi = ra.cy + 6; yi < H - 2; yi += 5) {
    px(ctx, ra.cx, yi, 1, 3, p.roadLine);
  }

  // ============================================================
  // 11. PARKING LOT (cars + trees)
  // ============================================================
  const pk = {
    x: loop.leftX + loop.w + 2,
    y: loop.topY + loop.w + 2,
    w: loop.rightX - (loop.leftX + loop.w) - 4,
    h: loop.bottomY - (loop.topY + loop.w) - 4,
  };
  px(ctx, pk.x, pk.y, pk.w, pk.h, p.asphaltDark);
  // Cars in rows
  rseed(0xc0ffee);
  const carCount = 8;
  const rows = 5;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 28; col++) {
      const cx = pk.x + 3 + col * 4;
      const cy = pk.y + 3 + row * 9;
      if (cx + 4 > pk.x + pk.w) break;
      // 70% fill
      if (rng() < 0.7) {
        const variant = ['car1', 'car2', 'car3', 'car4'][Math.floor(rng() * 4)];
        drawCar(ctx, cx, cy, p, variant);
      }
    }
  }
  // Trees scattered through parking (between rows)
  rseed(0xbeef);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 16; col++) {
      if (rng() < 0.18) {
        const tx = pk.x + 4 + col * 8;
        const ty = pk.y + 1 + row * 9;
        drawTree(ctx, tx, ty, p);
      }
    }
  }

  // ============================================================
  // 12. CARGO AREA (bottom-left)
  // ============================================================
  const cargo = { x: 4, y: 124, w: 22, h: 30 };
  // Zone outline
  px(ctx, cargo.x, cargo.y, cargo.w, cargo.h, p.asphaltDark);
  // Cargo building
  drawBldg(ctx, cargo.x + 2, cargo.y + 4, cargo.w - 4, 16, p, {
    roof: p.cargoRoof, side: p.cargoSide, extrude: 2,
  });
  // Loading bays (south face)
  for (let i = 0; i < 3; i++) {
    px(ctx, cargo.x + 4 + i * 6, cargo.y + 20, 4, 1, p.bldgDoor);
  }
  // Trucks parked south of building
  for (let i = 0; i < 3; i++) {
    drawCar(ctx, cargo.x + 4 + i * 5, cargo.y + 23, p, 'car3');
  }
  // Label
  ctx.fillStyle = p.textDim;
  ctx.font = '3px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CARGO', cargo.x + cargo.w / 2, cargo.y + 2);

  // ============================================================
  // 13. FUTURE EXPANSION (hangar zone — labeled plot only)
  // ============================================================
  const future = { x: 4, y: 28, w: 80, h: 50 };
  px(ctx, future.x, future.y, future.w, future.h, p.ghostFill);
  // Dashed border
  for (let xi = future.x; xi < future.x + future.w; xi += 3) {
    px(ctx, xi, future.y, 2, 1, p.ghostBorder);
    px(ctx, xi, future.y + future.h - 1, 2, 1, p.ghostBorder);
  }
  for (let yi = future.y; yi < future.y + future.h; yi += 3) {
    px(ctx, future.x, yi, 1, 2, p.ghostBorder);
    px(ctx, future.x + future.w - 1, yi, 1, 2, p.ghostBorder);
  }
  // Labels (using normal font for legibility)
  ctx.fillStyle = p.textDim;
  ctx.font = '4px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FUTURE', future.x + future.w / 2, future.y + future.h / 2 - 8);
  ctx.fillText('HANGAR', future.x + future.w / 2, future.y + future.h / 2);
  ctx.fillStyle = p.textAccent;
  ctx.font = '4px "Press Start 2P", monospace';
  ctx.fillText('500k', future.x + future.w / 2, future.y + future.h / 2 + 10);

  // ============================================================
  // 14. Trees lining areas (decorative outside parking)
  // ============================================================
  rseed(0xfade);
  // Left strip
  for (let i = 0; i < 5; i++) {
    drawTree(ctx, 2 + Math.floor(rng() * 4), 86 + i * 8, p);
  }
  // Right strip
  for (let i = 0; i < 4; i++) {
    drawTree(ctx, W - 12 + Math.floor(rng() * 4), 124 + i * 9, p);
  }
  // Some near roundabout entry
  for (let i = 0; i < 6; i++) {
    drawTree(ctx, 290 + Math.floor(rng() * 20) - 10, 110 + i * 8, p);
  }
  // Top corners
  drawTree(ctx, 2, 2, p);
  drawTree(ctx, W - 7, 2, p);

  // ============================================================
  // 15. Mech van (decorative, on service road)
  // ============================================================
  const van = { x: apron.x + 70, y: sr.y - 1 };
  // Shadow
  px(ctx, van.x + 1, van.y + 1, 5, 6, p.planeShadow + 'aa');
  // Body
  px(ctx, van.x, van.y, 5, 7, p.vanBody);
  // Roof divider
  px(ctx, van.x, van.y, 5, 1, p.vanRoof);
  // Windshield (front)
  px(ctx, van.x + 1, van.y + 1, 3, 1, p.vanWindow);
  // Beacon (top center)
  px(ctx, van.x + 2, van.y, 1, 1, p.activityGlow);
};
