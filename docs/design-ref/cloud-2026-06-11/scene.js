// MRO Tycoon — Three.js airport scene
// Kenney car-kit GLB models on a procedural top-down airport map.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
window.THREE = THREE; // expose for debug

// ============================================================
// Palettes
// ============================================================
const PALETTES = {
  day: {
    sky:          0x0F1A2E,
    fog:          0x1A2C44,
    grass:        0x244A2E,         // green grass
    grassEdge:    0x183520,
    asphalt:      0x1D2A3E,         // taxiway
    asphaltLine:  0xE8B845,         // yellow stripes
    concrete:     0x4A6285,         // apron
    concreteLine: 0x6B83A8,
    road:         0x2A3548,         // car road
    roadLine:     0xD4B048,
    parking:      0x1F2C40,
    runwayLine:   0xE0E6EE,
    terminalRoof: 0x4A6E96,
    terminalSide: 0x223E5A,
    mecsRoof:     0x3D5A82,
    towerCabin:   0x9DDFFF,
    fence:        0x4A5C7A,
    treeFoliage:  0x2A5840,
    treeShadow:   0x12281C,
    treeTrunk:    0x3D2818,
    ambientIntensity: 0.7,
    sunIntensity: 1.2,
    sunColor:     0xfff4d4,
  },
  night: {
    sky:          0x050B16,
    fog:          0x0A1726,
    grass:        0x102818,
    grassEdge:    0x081A0E,
    asphalt:      0x10182A,
    asphaltLine:  0xD0A03A,
    concrete:     0x22405E,
    concreteLine: 0x3A5878,
    road:         0x182336,
    roadLine:     0xB89538,
    parking:      0x131F30,
    runwayLine:   0xD8DEE8,
    terminalRoof: 0x345880,
    terminalSide: 0x152840,
    mecsRoof:     0x2C4F7A,
    towerCabin:   0x9DE0FF,
    fence:        0x2A3C58,
    treeFoliage:  0x152A1C,
    treeShadow:   0x080F08,
    treeTrunk:    0x1F1208,
    ambientIntensity: 0.35,
    sunIntensity: 0.5,
    sunColor:     0x6889B8,
  },
};

let mode = 'day';
let camMode = 'iso';

// ============================================================
// Scene setup
// ============================================================
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
window.__renderer = renderer; window.__scene = scene; // debug
scene.background = new THREE.Color(PALETTES.day.sky);
// Fog removed — was making distant cars invisible at fog distance 60-200
// scene.fog = new THREE.Fog(PALETTES.day.fog, 60, 200);

// Camera
const aspect = window.innerWidth / window.innerHeight;
const camSize = 45; // tighter zoom to make 4x-scaled cars readable
const camera = new THREE.OrthographicCamera(
  -camSize * aspect, camSize * aspect,
  camSize, -camSize, 1, 500
);
function setCamPos() {
  if (camMode === 'iso') {
    camera.position.set(70, 80, 70);
  } else {
    camera.position.set(0, 100, 0.01);  // tiny offset so it's not exactly down (avoids degenerate)
  }
  camera.lookAt(0, 0, 0);
}
setCamPos();

// Lights
const ambient = new THREE.AmbientLight(0xffffff, PALETTES.day.ambientIntensity);
scene.add(ambient);

const sun = new THREE.DirectionalLight(PALETTES.day.sunColor, PALETTES.day.sunIntensity);
sun.position.set(60, 100, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 250;
sun.shadow.bias = -0.0005;
scene.add(sun);

// Fill light from below to soften shadows
const fill = new THREE.HemisphereLight(0x3d5882, 0x1a2a40, 0.4);
scene.add(fill);

// ============================================================
// Ground & airport geometry (procedural — colored boxes)
// ============================================================
function applyPalette(p) {
  scene.background.setHex(p.sky);
  // scene.fog.color.setHex(p.fog);
  ambient.intensity = p.ambientIntensity;
  sun.intensity = p.sunIntensity;
  sun.color.setHex(p.sunColor);
  groundGrass.material.color.setHex(p.grass);
  groundGrassDark.material.color.setHex(p.grassEdge);
  // Update all dynamic materials
  for (const m of dynamicMaterials.values()) m();
}

const dynamicMaterials = new Map();
function colored(name, defaultHex, opts = {}) {
  // Returns a material that auto-updates on palette change. `name` is a key in PALETTES[mode].
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(defaultHex),
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.0,
    ...opts.matOverrides,
  });
  dynamicMaterials.set(name + Math.random(), () => {
    mat.color.setHex(PALETTES[mode][name] ?? defaultHex);
  });
  return mat;
}

// Big grass ground plane
const groundGrass = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 240),
  new THREE.MeshStandardMaterial({ color: PALETTES.day.grass, roughness: 0.95 })
);
groundGrass.rotation.x = -Math.PI / 2;
groundGrass.receiveShadow = true;
scene.add(groundGrass);

// Darker outer grass border
const groundGrassDark = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 320),
  new THREE.MeshStandardMaterial({ color: PALETTES.day.grassEdge, roughness: 0.95 })
);
groundGrassDark.rotation.x = -Math.PI / 2;
groundGrassDark.position.y = -0.05;
groundGrassDark.receiveShadow = true;
scene.add(groundGrassDark);

// Helper: rectangular "patch" laid flat
function patch(x, z, w, h, color, y = 0.01) {
  const mat = new THREE.MeshStandardMaterial({
    color: typeof color === 'string' ? new THREE.Color(color) : color,
    roughness: 0.92, metalness: 0.0
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function paletteMat(key, fallback) {
  const m = new THREE.MeshStandardMaterial({
    color: PALETTES[mode][key] ?? fallback,
    roughness: 0.9,
  });
  dynamicMaterials.set(key + '-' + dynamicMaterials.size, () => {
    m.color.setHex(PALETTES[mode][key] ?? fallback);
  });
  return m;
}

// Patch using palette-keyed material
function paletteP(x, z, w, h, key, y = 0.02) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paletteMat(key, 0x808080));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// ============================================================
// AIRPORT GEOMETRY
// World scale: 1 unit ≈ 1 meter. Map fits within ±90 X, ±50 Z.
// Composition (Z axis: -Z = north / TWY side, +Z = south / parking side):
//   - TWY T: horizontal band at z=-40
//   - Apron with 3 stands at z≈-20
//   - Service road airside at z≈-2
//   - Terminal at z=5
//   - Parking with cars at z=25
//   - Loop roads encircling parking
//   - Future hangar plot to west (-x)
//   - Cargo area to south-west
//   - Control tower at east (+x)
// ============================================================

// TWY T (parallel taxiway, top)
paletteP(0, -42, 160, 12, 'asphalt');
// TWY centerline (dashed yellow) — make as small patches
const lineMat = paletteMat('asphaltLine', 0xE8B845);
for (let x = -76; x < 76; x += 5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.4), lineMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.03, -42);
  scene.add(m);
}

// 3 stand taxi entries (asphalt strips north→south from TWY to apron)
const standXs = [-40, 0, 40];
standXs.forEach(sx => {
  paletteP(sx, -28, 8, 16, 'asphalt');
  // Yellow centerline (continuous)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 16), lineMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(sx, 0.03, -28);
  scene.add(m);
});

// Apron (concrete area)
paletteP(0, -15, 130, 26, 'concrete');
// Concrete panel grid lines (subtle darker rectangles for joint look)
const concLineMat = paletteMat('concreteLine', 0x6B83A8);
for (let x = -60; x <= 60; x += 8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 24), concLineMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.025, -15);
  scene.add(m);
}
for (let z = -25; z <= -5; z += 8) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(120, 0.15), concLineMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, 0.025, z);
  scene.add(m);
}

// 3 painted stand markings (outline rectangles)
standXs.forEach((sx, i) => {
  // White painted border (rectangles for top/bottom/left/right)
  const standW = 22, standH = 18;
  const borderMat = paletteMat('runwayLine', 0xE0E6EE);
  // Border made of 4 thin rects
  const t = 0.3;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(standW, t), borderMat);
  top.rotation.x = -Math.PI / 2; top.position.set(sx, 0.04, -22);
  const bot = new THREE.Mesh(new THREE.PlaneGeometry(standW, t), borderMat);
  bot.rotation.x = -Math.PI / 2; bot.position.set(sx, 0.04, -4);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(t, standH), borderMat);
  left.rotation.x = -Math.PI / 2; left.position.set(sx - standW/2, 0.04, -13);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(t, standH), borderMat);
  right.rotation.x = -Math.PI / 2; right.position.set(sx + standW/2, 0.04, -13);
  scene.add(top, bot, left, right);
});

// Service road airside (between stands and terminal)
paletteP(0, 0, 130, 5, 'asphalt');
// Yellow border stripes
const sideStripeMat = paletteMat('asphaltLine', 0xE8B845);
[-2, 2].forEach(zOff => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(124, 0.3), sideStripeMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, 0.04, zOff);
  scene.add(m);
});

// Landside car loop (drawing each segment)
const roadW = 5;
// Terminal-back road (south of terminal, north of parking)
paletteP(0, 13, 130, roadW, 'road');
// Parking-east + west sides
paletteP(-67, 25, roadW, 30, 'road');
paletteP(67, 25, roadW, 30, 'road');
// Parking-south road
paletteP(0, 42, 130, roadW, 'road');
// South entry road (from canvas south up to roundabout)
paletteP(75, 50, roadW, 16, 'road');

// Roundabout (circular ground patch)
{
  const ra = new THREE.Mesh(
    new THREE.CircleGeometry(7, 32),
    paletteMat('road', 0x2A3548)
  );
  ra.rotation.x = -Math.PI / 2;
  ra.position.set(75, 0.02, 42);
  ra.receiveShadow = true;
  scene.add(ra);
  const center = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 32),
    paletteMat('grass', 0x244A2E)
  );
  center.rotation.x = -Math.PI / 2;
  center.position.set(75, 0.03, 42);
  scene.add(center);
}

// Parking lot ground (asphalt)
paletteP(0, 25, 124, 25, 'parking');
// Parking dividers (3 horizontal lines)
const pkLineMat = paletteMat('concreteLine', 0x6B83A8);
[-5, 0, 5, 10].forEach(zOff => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(118, 0.15), pkLineMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, 0.04, 25 + zOff);
  scene.add(m);
});

// Future hangar plot (dashed border, semi-transparent)
{
  const w = 30, h = 35;
  const x0 = -85, z0 = -22;
  const dashMat = new THREE.LineDashedMaterial({
    color: 0x5e89b8, dashSize: 1.2, gapSize: 0.8, linewidth: 1,
  });
  const pts = [
    new THREE.Vector3(x0, 0.05, z0),
    new THREE.Vector3(x0 + w, 0.05, z0),
    new THREE.Vector3(x0 + w, 0.05, z0 + h),
    new THREE.Vector3(x0, 0.05, z0 + h),
    new THREE.Vector3(x0, 0.05, z0),
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, dashMat);
  line.computeLineDistances();
  scene.add(line);
}

// ============================================================
// BUILDINGS (simple boxes with colored materials)
// ============================================================
function building(x, y, z, w, h, d, roofKey, sideKey) {
  const sideMat = paletteMat(sideKey || 'terminalSide', 0x223E5A);
  const roofMat = paletteMat(roofKey || 'terminalRoof', 0x4A6E96);
  // Side material (vertical faces)
  // Roof material (top face)
  // Use a materials array for BoxGeometry: [+x, -x, +y, -y, +z, -z]
  const mats = [sideMat, sideMat, roofMat, sideMat, sideMat, sideMat];
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  box.position.set(x, y + h / 2, z);
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);
  return box;
}

// Terminal — long horizontal building
const terminal = building(0, 0, 5, 110, 5, 12, 'terminalRoof', 'terminalSide');
// Glass strip on top (TWY-facing side)
{
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(108, 0.3, 1),
    new THREE.MeshStandardMaterial({ color: 0xE8A838, roughness: 0.5, emissive: 0x553300, emissiveIntensity: 0.3 })
  );
  glass.position.set(0, 5.1, -1);
  scene.add(glass);
}
// Terminal lit windows row (small glowing rects)
for (let xi = -50; xi <= 50; xi += 5) {
  const win = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1.4, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xF4D77A, emissive: 0xF4A82E, emissiveIntensity: 0.6 })
  );
  win.position.set(xi, 2.5, 11);
  scene.add(win);
}

// MECS office (left of terminal)
const mecs = building(-72, 0, 5, 14, 6, 12, 'mecsRoof', 'terminalSide');
// MECS windows (grid)
for (let xi = -78; xi <= -66; xi += 3) {
  for (let yi = 1.5; yi < 6; yi += 2) {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xF4D77A, emissive: 0xF4A82E, emissiveIntensity: 0.6 })
    );
    win.position.set(xi, yi, 11);
    scene.add(win);
  }
}

// Control tower (east of terminal) — tall narrow structure
{
  const towerBase = building(82, 0, 5, 4, 18, 4, 'mecsRoof', 'terminalSide');
  // Glass cabin
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(6, 2, 6),
    new THREE.MeshStandardMaterial({
      color: PALETTES[mode].towerCabin, transparent: true, opacity: 0.85,
      roughness: 0.2, metalness: 0.1,
      emissive: 0x4488AA, emissiveIntensity: 0.4
    })
  );
  cabin.position.set(82, 19, 5);
  cabin.castShadow = true;
  scene.add(cabin);
  // Antenna
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 4),
    new THREE.MeshStandardMaterial({ color: 0x7a99bd })
  );
  ant.position.set(82, 22, 5);
  scene.add(ant);
  // Red beacon
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.3),
    new THREE.MeshStandardMaterial({ color: 0xff5848, emissive: 0xff5848, emissiveIntensity: 1.5 })
  );
  beacon.position.set(82, 24.2, 5);
  scene.add(beacon);
}

// Access gate (small, east of terminal road)
building(72, 0, 13, 8, 3, 4, 'mecsRoof', 'terminalSide');

// Cargo building (south-west)
const cargo = building(-72, 0, 38, 16, 4, 10, 'terminalRoof', 'terminalSide');

// Fences around future hangar plot
{
  const fenceMat = paletteMat('fence', 0x4A5C7A);
  const fenceY = 1;
  // 4 segments
  const segs = [
    { x: -85, z: -22, w: 30, d: 0.3 },
    { x: -85, z: 13, w: 30, d: 0.3 },
    { x: -85, z: -4.5, w: 0.3, d: 35 },
    { x: -55, z: -4.5, w: 0.3, d: 35 },
  ];
  segs.forEach(s => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, fenceY, s.d), fenceMat);
    m.position.set(s.x, fenceY / 2, s.z);
    m.castShadow = true;
    scene.add(m);
  });
}

// ============================================================
// TREES (procedural — cone + sphere)
// ============================================================
function tree(x, z) {
  const trunkMat = paletteMat('treeTrunk', 0x3D2818);
  const folMat = paletteMat('treeFoliage', 0x2A5840);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 1.2),
    trunkMat
  );
  trunk.position.set(x, 0.6, z);
  trunk.castShadow = true;
  scene.add(trunk);
  const fol = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 8, 6),
    folMat
  );
  fol.position.set(x, 1.6, z);
  fol.castShadow = true;
  fol.scale.set(1, 0.9, 1);
  scene.add(fol);
}

// Sprinkle trees in parking aisles and around roundabout
const treePositions = [
  // Parking row gaps
  [-50, 22], [-30, 22], [-10, 22], [10, 22], [30, 22], [50, 22],
  [-50, 30], [-30, 30], [-10, 30], [10, 30], [30, 30], [50, 30],
  // Around terminal/airport edges
  [-90, -10], [-90, 0], [-90, 10],
  [90, -10], [90, 5], [90, 20], [90, 35],
  // Inside roundabout
  [75, 42],
  // Around cargo
  [-90, 32], [-90, 42], [-60, 42],
  // North of TWY (rural decor)
  [-70, -50], [-30, -52], [20, -52], [60, -50],
];
treePositions.forEach(([x, z]) => tree(x, z));

// ============================================================
// AIRCRAFT (placeholder mesh — fuselage + wings)
// ============================================================
function aircraft(x, z, rotY = 0) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xF0F4FB, roughness: 0.7 });
  const detailMat = new THREE.MeshStandardMaterial({ color: 0x5489BD, roughness: 0.6 });
  // Fuselage (cylinder lying down)
  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 14, 16),
    bodyMat
  );
  fuselage.rotation.z = Math.PI / 2;
  fuselage.castShadow = true;
  group.add(fuselage);
  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.5, 16), bodyMat);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(7.5, 0, 0);
  nose.castShadow = true;
  group.add(nose);
  // Tail cone
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.5, 16), bodyMat);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-7.5, 0, 0);
  tail.castShadow = true;
  group.add(tail);
  // Main wings (along Z = perpendicular to fuselage)
  const wing = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 16), bodyMat);
  wing.position.set(-0.5, 0, 0);
  wing.castShadow = true;
  group.add(wing);
  // Tail wing horizontal
  const tailW = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 6), bodyMat);
  tailW.position.set(-6.5, 0.2, 0);
  tailW.castShadow = true;
  group.add(tailW);
  // Tail wing vertical
  const tailV = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.5, 0.15), bodyMat);
  tailV.position.set(-6.5, 1.2, 0);
  tailV.castShadow = true;
  group.add(tailV);
  // Engines under wings
  [-3, 3].forEach(zo => {
    const eng = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1.4, 12),
      detailMat
    );
    eng.rotation.z = Math.PI / 2;
    eng.position.set(0, -0.5, zo);
    eng.castShadow = true;
    group.add(eng);
  });
  // Cockpit nose color
  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 12, 8),
    detailMat
  );
  cockpit.position.set(6.5, 0.2, 0);
  group.add(cockpit);
  group.position.set(x, 1.3, z);
  group.rotation.y = rotY;
  scene.add(group);
  return group;
}

// 2 parked aircraft at PRKG 02 (occupied) and PRKG 03 (in service)
// rotY = Math.PI/2 means nose pointing east. We want nose pointing NORTH (toward TWY).
// In our scene -Z is north, so nose should point -Z which is rotY = -Math.PI/2 from default east-pointing.
aircraft(0, -13, -Math.PI / 2);
aircraft(40, -13, -Math.PI / 2);

// ============================================================
// LOAD CARS (Kenney car-kit GLB models)
// ============================================================
// Bulletproof texture loading: pre-load colormap.png from a path that works
// (the sandbox doesn't serve nested folders, so we use the flat copy), then
// assign it to every loaded GLB material.
const texLoader = new THREE.TextureLoader();
let carColormap = null;
const colormapReady = new Promise(res => {
  texLoader.load('assets/cars/colormap.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.flipY = false; // GLB textures use UVs that expect flipY=false
    carColormap = tex;
    console.log('Carkit colormap loaded:', tex.image?.width, 'x', tex.image?.height);
    res(tex);
  }, undefined, (e) => {
    console.error('Failed to load car colormap:', e);
    res(null);
  });
});

const loader = new GLTFLoader();
const carModels = {}; // cache
const carFiles = ['sedan', 'suv', 'hatchback-sports', 'taxi', 'police', 'van', 'delivery'];

async function loadCarModel(name) {
  return new Promise((res, rej) => {
    loader.load(`assets/cars/${name}.glb`, (gltf) => {
      const m = gltf.scene;
      // Cars are ~1.5×2.5 in Kenney units — scale 3.5x for visibility against the airport
      m.scale.setScalar(3.5);
      m.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material && carColormap) {
            c.material.map = carColormap;
            c.material.color = new THREE.Color(0xffffff);
            c.material.needsUpdate = true;
          }
        }
      });
      res(m);
    }, undefined, rej);
  });
}

let totalCars = 0;
async function placeCars() {
  await colormapReady;  // ensure texture is ready before loading GLBs
  await Promise.all(carFiles.map(async (name) => {
    carModels[name] = await loadCarModel(name);
  }));
  console.log('All car models loaded');
  // Debug: log dimensions of first car
  const probe = carModels.sedan.clone(true);
  const bbox = new THREE.Box3().setFromObject(probe);
  console.log('Sedan bbox:', bbox.min, bbox.max, 'size:', bbox.getSize(new THREE.Vector3()));
  window.SCENE_DEBUG = { scene, carModels, sceneChildren: () => scene.children.length };
  await Promise.all(carFiles.map(async (name) => {
    carModels[name] = await loadCarModel(name);
  }));

  // Place cars in parking lot — grid pattern with random model
  // Cars now 3.5x scaled (~9 units long), so we need fewer cars per row + more spacing
  const rows = 3;
  const colsPerRow = 12;
  const startX = -52;
  const startZ = 20;
  const stepX = 9;
  const stepZ = 6;
  let count = 0;
  const rng = (() => { let s = 0xc0ffee; return () => { s = (s*9301+49297)%233280; return s/233280; }; })();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < colsPerRow; col++) {
      if (rng() < 0.20) continue;  // 80% fill
      const carName = carFiles[Math.floor(rng() * carFiles.length)];
      // Skip larger vehicles for compact parking
      const isLarge = ['van', 'delivery', 'police'].includes(carName);
      const finalName = isLarge && rng() > 0.3 ? 'sedan' : carName;
      const inst = carModels[finalName].clone(true);
      const x = startX + col * stepX;
      const z = startZ + row * stepZ;
      inst.position.set(x, 0, z);
      // Alternate facing each row
      inst.rotation.y = row % 2 === 0 ? 0 : Math.PI;
      inst.rotation.y += (rng() - 0.5) * 0.08;
      scene.add(inst);
      count++;
    }
  }

  // A mechanic van on the service road
  const mechVan = carModels.van.clone(true);
  mechVan.position.set(20, 0, 0);
  mechVan.rotation.y = -Math.PI / 2;
  scene.add(mechVan);
  count++;

  // 2 delivery trucks near cargo building
  [-78, -68].forEach((x, i) => {
    const t = carModels.delivery.clone(true);
    t.position.set(x, 0, 45);
    t.rotation.y = Math.PI / 2;
    scene.add(t);
    count++;
  });

  // A police car near the access gate
  const police = carModels.police.clone(true);
  police.position.set(72, 0, 18);
  police.rotation.y = 0;
  scene.add(police);
  count++;

  totalCars = count;
  document.getElementById('loading').classList.add('hidden');
  updateStatus();
  // Force render NOW in case requestAnimationFrame is paused (hidden tab)
  renderer.render(scene, camera);
  window.__camera = camera;
}

// Force re-render when tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderer.render(scene, camera);
});

placeCars().catch(err => {
  console.error(err);
  document.getElementById('loading').textContent = 'Error loading models: ' + err.message;
});

// ============================================================
// UI handlers
// ============================================================
document.getElementById('toolbar').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.mode) {
    mode = btn.dataset.mode;
    document.querySelectorAll('#toolbar [data-mode]').forEach(b =>
      b.classList.toggle('active', b === btn));
    applyPalette(PALETTES[mode]);
  } else if (btn.dataset.cam) {
    camMode = btn.dataset.cam;
    document.querySelectorAll('#toolbar [data-cam]').forEach(b =>
      b.classList.toggle('active', b === btn));
    setCamPos();
  }
});

window.addEventListener('resize', () => {
  const a = window.innerWidth / window.innerHeight;
  camera.left = -camSize * a;
  camera.right = camSize * a;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
renderer.setSize(window.innerWidth, window.innerHeight);

// ============================================================
// Render loop
// ============================================================
let lastT = performance.now();
let frames = 0;
let fps = 0;
function updateStatus() {
  document.getElementById('status').textContent =
    `Cars: ${totalCars} · FPS: ${fps} · Mode: ${mode}`;
}
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  frames++;
  if (now - lastT > 500) {
    fps = Math.round(frames * 1000 / (now - lastT));
    frames = 0; lastT = now;
    updateStatus();
  }
  renderer.render(scene, camera);
}
animate();
// Also keep ticking via setInterval as a safety net for hidden-tab scenarios
setInterval(() => {
  if (document.hidden) renderer.render(scene, camera);
}, 200);
