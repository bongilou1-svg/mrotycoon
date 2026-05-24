// Fase 5D · ThreeDriver: render 3D ortográfico isométrico real (alternativa Pixi).
//
// Misma API pública que PixiDriver — el UI driver elige cuál instanciar según el skin.
//
// MVP: cubos low-poly para hangares + oficina, pavimento plano texturizado por color,
// aviones como Group de 3 boxes (fuselaje + alas + cola), vans como box, sombras
// proyectadas con DirectionalLight. Cámara ortográfica ligeramente inclinada (~30°).
// Sin texturas externas — todo color sólido / vertex.
//
// Motion paths (taxi avión, furgo mec) conservados, interpolados en world space.

import * as THREE from "three";
import type { RenderState } from "./types.ts";

type Theme = "three";

export type ThreeDriverCallbacks = {
  onBuildClick?: () => void;
};

// ---------- Mapping sim id → slot ----------
type SlotPos = { col: number; row: number; label: string };
const SIM_TO_SLOT: Record<string, SlotPos> = {
  "H1-S1": { col: 0, row: 0, label: "351" },
  "H1-S2": { col: 1, row: 0, label: "451" },
  "H1-S3": { col: 2, row: 0, label: "551" },
  "R1":    { col: 0, row: 1, label: "352" },
  "H2-S1": { col: 1, row: 1, label: "452" },
};
const ALL_SLOTS: Array<SlotPos> = [
  { col: 0, row: 0, label: "351" }, { col: 1, row: 0, label: "451" }, { col: 2, row: 0, label: "551" },
  { col: 0, row: 1, label: "352" }, { col: 1, row: 1, label: "452" }, { col: 2, row: 1, label: "552" },
];

function airlineColor(airlineId: string): number {
  let h = 0;
  for (let i = 0; i < airlineId.length; i++) h = ((h << 5) - h + airlineId.charCodeAt(i)) | 0;
  const palette = [0xff9f43, 0x4da3ff, 0xa78bfa, 0x3fb950, 0xd29922, 0xf85149];
  return palette[Math.abs(h) % palette.length];
}

// ---------- Coords pixel → world ----------
// Convertimos las coords pixel del layout (igual que Pixi) a world units dividiendo /10.
// 1 world unit ≈ 10 px. La escena queda con W*0.1 × H*0.1 world units.
const PX = 0.1; // factor

type Pt = { x: number; y: number };

function lerpPath(pts: Pt[], t: number): { pos: Pt; segIdx: number } {
  if (pts.length === 0) return { pos: { x: 0, y: 0 }, segIdx: 0 };
  if (pts.length === 1) return { pos: pts[0], segIdx: 0 };
  const N = pts.length - 1;
  const clamped = Math.max(0, Math.min(1, t));
  const seg = clamped * N;
  const i = Math.min(N - 1, Math.floor(seg));
  const localT = seg - i;
  return {
    pos: {
      x: pts[i].x + (pts[i + 1].x - pts[i].x) * localT,
      y: pts[i].y + (pts[i + 1].y - pts[i].y) * localT,
    },
    segIdx: i,
  };
}

function pathHeading(pts: Pt[], t: number): number {
  if (pts.length < 2) return 0;
  const { segIdx } = lerpPath(pts, t);
  const a = pts[segIdx];
  const b = pts[segIdx + 1];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export class ThreeDriver {
  readonly kind = "three" as const;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private target: HTMLElement | null = null;
  private staticBuilt = false;
  private dynamicGroup: THREE.Group | null = null;
  private callbacks: ThreeDriverCallbacks = {};
  private resizeObserver: ResizeObserver | null = null;
  private lastState: RenderState | null = null;
  private W = 0;
  private H = 0;

  // Layout coords (pixel space) cacheado tras mount + resize.
  private layout: {
    W: number; H: number;
    runwayY: number; runwayH: number;
    taxiwayY: number; taxiwayH: number;
    apronX: number; apronY: number; apronW: number; apronH: number;
    hzX: number; hzY: number; hzW: number; hzH: number;
    gridX: number; gridY: number; gridW: number; gridH: number;
    calleW: number; calleAuxH: number; perimH: number;
    colW: number; rowH: number;
    colX: number[]; rowYs: number[]; calleAuxY: number; perimY: number;
    officeX: number; officeY: number; officeW: number; officeH: number;
  } | null = null;

  setCallbacks(cb: ThreeDriverCallbacks): void { this.callbacks = cb; }
  setTheme(_t: string): void { /* ThreeDriver solo tiene un theme propio */ }
  getTheme(): string { return "three"; }
  isMounted(): boolean { return this.renderer !== null; }

  async mount(target: HTMLElement): Promise<void> {
    if (this.renderer) return;
    this.target = target;
    const w = target.clientWidth || 800;
    const h = target.clientHeight || 600;
    this.W = w; this.H = h;
    this.computeLayout();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x4a6b3a, 1); // hierba verde
    target.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4a6b3a);
    scene.fog = new THREE.Fog(0x4a6b3a, w * PX * 1.5, w * PX * 3);
    this.scene = scene;

    // Cámara ortho ligeramente inclinada (top-down con tilt ~30°)
    const aspect = w / h;
    const viewSize = w * PX;
    const camera = new THREE.OrthographicCamera(
      -viewSize / 2 * aspect / aspect, viewSize / 2 * aspect / aspect, // left, right (aspect cancels)
      viewSize / 2 / aspect, -viewSize / 2 / aspect, // top, bottom
      0.1, 200,
    );
    // Posicionamos la cámara mirando al centro de la escena desde arriba con un tilt
    const cx = w * PX / 2;
    const cz = h * PX / 2;
    camera.position.set(cx, 50, cz + 25);
    camera.lookAt(cx, 0, cz);
    this.camera = camera;

    // Luces
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(cx + 30, 60, cz - 20);
    dir.target.position.set(cx, 0, cz);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -viewSize;
    dir.shadow.camera.right = viewSize;
    dir.shadow.camera.top = viewSize;
    dir.shadow.camera.bottom = -viewSize;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 150;
    scene.add(dir);
    scene.add(dir.target);

    this.dynamicGroup = new THREE.Group();
    scene.add(this.dynamicGroup);

    this.buildStaticGeometry();
    this.staticBuilt = true;

    // Click handler para hangar zone
    renderer.domElement.addEventListener("pointerdown", this.handlePointerDown);

    // ResizeObserver para mantener proporciones cuando cambie el tamaño del host
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(target);

    this.render();
  }

  private handleResize = (): void => {
    if (!this.renderer || !this.target || !this.camera) return;
    const w = this.target.clientWidth, h = this.target.clientHeight;
    if (w === this.W && h === this.H) return;
    this.W = w; this.H = h;
    this.renderer.setSize(w, h);
    this.computeLayout();
    const viewSize = w * PX;
    const aspect = w / h;
    this.camera.left = -viewSize / 2 * aspect / aspect;
    this.camera.right = viewSize / 2 * aspect / aspect;
    this.camera.top = viewSize / 2 / aspect;
    this.camera.bottom = -viewSize / 2 / aspect;
    const cx = w * PX / 2, cz = h * PX / 2;
    this.camera.position.set(cx, 50, cz + 25);
    this.camera.lookAt(cx, 0, cz);
    this.camera.updateProjectionMatrix();
    // Reconstruir estática (mismas dimensiones derivadas)
    if (this.scene) {
      // Limpia hijos estáticos (no el dynamicGroup ni luces)
      const keep: THREE.Object3D[] = [];
      for (const child of this.scene.children) {
        if (child instanceof THREE.Light || child === this.dynamicGroup || (child as THREE.Object3D).type === "Object3D") keep.push(child);
      }
      // Easier: tirar la scene entera y rehacer
      this.scene.children.slice().forEach((c) => {
        if (c === this.dynamicGroup) return;
        if (c instanceof THREE.Light) return;
        this.scene!.remove(c);
        disposeObject(c);
      });
    }
    this.buildStaticGeometry();
    if (this.lastState) this.apply(this.lastState);
    else this.render();
  };

  private computeLayout(): void {
    const W = this.W, H = this.H;
    const runwayY = 28, runwayH = 22;
    const taxiwayY = runwayY + runwayH + 14, taxiwayH = 18;
    const connectorY2 = taxiwayY + taxiwayH + 28;
    const apronX = 30;
    const apronY = connectorY2 + 4;
    const apronW = W - 60;
    const apronH = H - apronY - 24;
    const hzX = apronX + 12, hzY = apronY + 12;
    const hzW = apronW * 0.22, hzH = apronH - 24;
    const gridX = hzX + hzW + 24, gridY = apronY + 12;
    const gridW = apronX + apronW - gridX - 12, gridH = apronH - 24;
    const calleW = 22, calleAuxH = 26, perimH = 22;
    const colW = (gridW - 3 * calleW) / 3;
    const rowH = (gridH - calleAuxH - perimH) / 2;
    const colX = [gridX, gridX + colW + calleW, gridX + 2 * (colW + calleW)];
    const rowYs = [gridY, gridY + rowH + calleAuxH];
    const calleAuxY = gridY + rowH;
    const perimY = gridY + 2 * rowH + calleAuxH;
    const officeW = 90, officeH = 64;
    const officeX = apronX + apronW - officeW - 14;
    const officeY = apronY + apronH - officeH - 14;
    this.layout = {
      W, H, runwayY, runwayH, taxiwayY, taxiwayH,
      apronX, apronY, apronW, apronH,
      hzX, hzY, hzW, hzH,
      gridX, gridY, gridW, gridH,
      calleW, calleAuxH, perimH, colW, rowH,
      colX, rowYs, calleAuxY, perimY,
      officeX, officeY, officeW, officeH,
    };
  }

  private buildStaticGeometry(): void {
    if (!this.scene || !this.layout) return;
    const L = this.layout;
    // Pavimento del apron
    const apron = makeBox(L.apronW * PX, 0.05, L.apronH * PX, 0x5a6068);
    apron.position.set((L.apronX + L.apronW / 2) * PX, 0.025, (L.apronY + L.apronH / 2) * PX);
    apron.receiveShadow = true;
    this.scene.add(apron);
    // Pista
    const runway = makeBox((L.apronW - 20) * PX, 0.06, L.runwayH * PX, 0x1f2229);
    runway.position.set((L.apronX + 10 + (L.apronW - 20) / 2) * PX, 0.03, (L.runwayY + L.runwayH / 2) * PX);
    runway.receiveShadow = true;
    this.scene.add(runway);
    // Taxiway
    const taxi = makeBox((L.apronW - 20) * PX, 0.06, L.taxiwayH * PX, 0x3a3e48);
    taxi.position.set((L.apronX + 10 + (L.apronW - 20) / 2) * PX, 0.03, (L.taxiwayY + L.taxiwayH / 2) * PX);
    taxi.receiveShadow = true;
    this.scene.add(taxi);
    // Conectores verticales (3)
    for (let i = 0; i < 3; i++) {
      const cx = L.colX[i] + L.colW + L.calleW / 2;
      const len = (L.gridY - L.taxiwayY - L.taxiwayH) + 12;
      const c = makeBox(16 * PX, 0.06, len * PX, 0x3a3e48);
      c.position.set(cx * PX, 0.03, (L.taxiwayY + L.taxiwayH + len / 2) * PX);
      c.receiveShadow = true;
      this.scene.add(c);
    }
    // Callecitas verticales
    for (let i = 0; i < 3; i++) {
      const cx = L.colX[i] + L.colW;
      const c = makeBox(L.calleW * PX, 0.06, (L.gridH - L.perimH) * PX, 0x52576a);
      c.position.set((cx + L.calleW / 2) * PX, 0.03, (L.gridY + (L.gridH - L.perimH) / 2) * PX);
      c.receiveShadow = true;
      this.scene.add(c);
    }
    // Calle aux horizontal
    const aux = makeBox(L.gridW * PX, 0.06, L.calleAuxH * PX, 0x494e58);
    aux.position.set((L.gridX + L.gridW / 2) * PX, 0.03, (L.calleAuxY + L.calleAuxH / 2) * PX);
    aux.receiveShadow = true;
    this.scene.add(aux);
    // Perimetral inferior
    const perim = makeBox(L.gridW * PX, 0.06, L.perimH * PX, 0x52576a);
    perim.position.set((L.gridX + L.gridW / 2) * PX, 0.03, (L.perimY + L.perimH / 2) * PX);
    perim.receiveShadow = true;
    this.scene.add(perim);
    // Stands (slot floor) — los 6
    for (const slot of ALL_SLOTS) {
      const sx = L.colX[slot.col] + 14;
      const sy = L.rowYs[slot.row] + 14;
      const sw = L.colW - 28;
      const sh = L.rowH - 28;
      const m = makeBox(sw * PX, 0.05, sh * PX, 0x4a4f5a);
      m.position.set((sx + sw / 2) * PX, 0.075, (sy + sh / 2) * PX);
      m.receiveShadow = true;
      this.scene.add(m);
    }
    // Hangar zone box (1 edificio grande con tejado)
    // Cuerpo
    const hzBody = makeBox(L.hzW * PX, 6, L.hzH * PX, 0x6b7280);
    hzBody.position.set((L.hzX + L.hzW / 2) * PX, 3, (L.hzY + L.hzH / 2) * PX);
    hzBody.castShadow = true; hzBody.receiveShadow = true;
    hzBody.userData.isBuildHangar = true;
    this.scene.add(hzBody);
    // Tejado (banda más clara superior)
    const roof = makeBox(L.hzW * PX, 1.5, L.hzH * PX, 0x9aa1ad);
    roof.position.set((L.hzX + L.hzW / 2) * PX, 6.75, (L.hzY + L.hzH / 2) * PX);
    roof.castShadow = true;
    this.scene.add(roof);
    // Portón frontal (apoyado en cara mirando hacia el grid)
    const doorW = L.hzW * 0.25, doorH = 4, doorD = 0.3;
    const door = makeBox(doorD, doorH, doorW * PX, 0x1f2229);
    door.position.set((L.hzX + L.hzW) * PX + 0.05, doorH / 2, (L.hzY + L.hzH / 2) * PX);
    door.castShadow = true;
    this.scene.add(door);

    // Oficina mecs (caja con tejado)
    const ob = makeBox(L.officeW * PX, 4, L.officeH * PX, 0xd4a574);
    ob.position.set((L.officeX + L.officeW / 2) * PX, 2, (L.officeY + L.officeH / 2) * PX);
    ob.castShadow = true; ob.receiveShadow = true;
    this.scene.add(ob);
    const oroof = makeBox(L.officeW * PX, 1.2, L.officeH * PX, 0x8a6e3e);
    oroof.position.set((L.officeX + L.officeW / 2) * PX, 4.6, (L.officeY + L.officeH / 2) * PX);
    oroof.castShadow = true;
    this.scene.add(oroof);
    // Puerta marrón oscura frontal
    const odoor = makeBox(0.2, 2.5, 4 * PX, 0x4a2c10);
    odoor.position.set(L.officeX * PX - 0.05, 1.25, (L.officeY + L.officeH * 0.85) * PX);
    this.scene.add(odoor);
    // Antena
    const antG = new THREE.CylinderGeometry(0.05, 0.05, 4, 6);
    const antM = new THREE.MeshStandardMaterial({ color: 0x2a2e36 });
    const ant = new THREE.Mesh(antG, antM);
    ant.position.set((L.officeX + L.officeW - 4) * PX, 6.5, (L.officeY + 4) * PX);
    ant.castShadow = true;
    this.scene.add(ant);
    const ballG = new THREE.SphereGeometry(0.4, 8, 8);
    const ballM = new THREE.MeshStandardMaterial({ color: 0xe85d75, emissive: 0xe85d75, emissiveIntensity: 0.3 });
    const ball = new THREE.Mesh(ballG, ballM);
    ball.position.set((L.officeX + L.officeW - 4) * PX, 8.7, (L.officeY + 4) * PX);
    this.scene.add(ball);
  }

  apply(state: RenderState): void {
    if (!this.scene || !this.renderer || !this.camera || !this.dynamicGroup || !this.layout) return;
    this.lastState = state;
    const L = this.layout;

    // Color de cielo según día/noche
    const skyDay = 0x4a6b3a, skyNight = 0x0a1020;
    const skyColor = state.timeOfDay === "day" ? skyDay : skyNight;
    this.scene.background = new THREE.Color(skyColor);
    this.renderer.setClearColor(skyColor, 1);
    (this.scene.fog as THREE.Fog).color.setHex(skyColor);

    // Limpia dinámicos
    this.dynamicGroup.children.slice().forEach((c) => {
      this.dynamicGroup!.remove(c);
      disposeObject(c);
    });

    // Index lookups
    const apByStand = new Map<string, typeof state.airplanes[number]>();
    for (const ap of state.airplanes) if (ap.standId) apByStand.set(ap.standId, ap);

    // Stand-resident aviones
    for (const ap of state.airplanes) {
      if (!ap.standId || ap.taxiing) continue;
      const slot = SIM_TO_SLOT[ap.standId];
      if (!slot) continue;
      const sx = L.colX[slot.col] + L.colW / 2;
      const sy = L.rowYs[slot.row] + L.rowH / 2;
      const plane = makeAirplane(Math.min(L.colW, L.rowH) * 0.5, airlineColor(ap.airlineId));
      plane.position.set(sx * PX, 0.5, sy * PX);
      plane.rotation.y = 0; // nariz al norte por defecto
      this.dynamicGroup.add(plane);
    }

    // Aviones taxiing
    for (const ap of state.airplanes) {
      if (!ap.taxiing || !ap.standId) continue;
      const slot = SIM_TO_SLOT[ap.standId];
      if (!slot) continue;
      const sx = L.colX[slot.col] + L.colW / 2;
      const sy = L.rowYs[slot.row] + L.rowH / 2;
      const calleCx = L.colX[slot.col] + L.colW + L.calleW / 2;
      const path: Pt[] = [
        { x: calleCx, y: L.taxiwayY + L.taxiwayH / 2 },
        { x: calleCx, y: L.gridY - 4 },
        slot.row === 0 ? { x: calleCx, y: sy } : { x: calleCx, y: L.calleAuxY + L.calleAuxH / 2 },
        { x: sx, y: sy },
      ];
      const { pos } = lerpPath(path, ap.taxiProgress);
      const heading = pathHeading(path, ap.taxiProgress);
      const plane = makeAirplane(7, 0x4ade80);
      plane.position.set(pos.x * PX, 0.5, pos.y * PX);
      // En three.js Y-up: heading en plano XZ → rotación Y = -heading + π/2
      plane.rotation.y = -heading - Math.PI / 2;
      this.dynamicGroup.add(plane);
    }

    // Mecs ToPlane/Returning como vans
    const officeCenter: Pt = { x: L.officeX + L.officeW / 2, y: L.officeY + L.officeH / 2 };
    const perimEntryY = L.perimY + L.perimH / 2;
    const calleAuxCenterY = L.calleAuxY + L.calleAuxH / 2;
    for (const m of state.mechanics) {
      if (!m.destStandId) continue;
      if (m.state !== "ToPlane" && m.state !== "Returning") continue;
      const slot = SIM_TO_SLOT[m.destStandId];
      if (!slot) continue;
      const sx = L.colX[slot.col] + L.colW / 2;
      const sy = L.rowYs[slot.row] + L.rowH / 2;
      const calleCx = L.colX[slot.col] + L.colW + L.calleW / 2;
      const path: Pt[] = [
        officeCenter,
        { x: L.officeX - 6, y: perimEntryY },
        { x: calleCx, y: perimEntryY },
        slot.row === 0 ? { x: calleCx, y: calleAuxCenterY } : { x: calleCx, y: L.rowYs[1] + L.rowH / 2 },
        { x: sx, y: sy },
      ];
      const tForward = m.state === "ToPlane" ? m.progress : (1 - m.progress);
      const { pos } = lerpPath(path, tForward);
      const heading = pathHeading(path, tForward);
      const van = makeVan(m.state === "Returning");
      van.position.set(pos.x * PX, 0.5, pos.y * PX);
      van.rotation.y = -heading - Math.PI / 2;
      this.dynamicGroup.add(van);
    }

    this.render();
  }

  private render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  private handlePointerDown = (ev: PointerEvent): void => {
    if (!this.renderer || !this.camera || !this.layout) return;
    // Convert click coords a normalized device coords y raycast a la geometría hzBody
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mx, my), this.camera);
    if (!this.scene) return;
    const hits = raycaster.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      if (h.object.userData?.isBuildHangar) {
        if (this.callbacks.onBuildClick) this.callbacks.onBuildClick();
        return;
      }
    }
  };

  destroy(): void {
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
    if (this.renderer) {
      this.renderer.domElement.removeEventListener("pointerdown", this.handlePointerDown);
      if (this.target && this.renderer.domElement.parentNode === this.target) {
        this.target.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
    if (this.scene) {
      this.scene.children.slice().forEach((c) => disposeObject(c));
      this.scene.clear();
    }
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.dynamicGroup = null;
    this.target = null;
    this.staticBuilt = false;
    this.lastState = null;
    this.callbacks = {};
  }
}

function disposeObject(o: THREE.Object3D): void {
  o.traverse((child: any) => {
    if (child.geometry) child.geometry.dispose?.();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose?.());
      else child.material.dispose?.();
    }
  });
}

function makeBox(w: number, h: number, d: number, color: number): THREE.Mesh {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 });
  const mesh = new THREE.Mesh(g, m);
  return mesh;
}

function makeAirplane(size: number, color: number): THREE.Group {
  const grp = new THREE.Group();
  const fuseG = new THREE.BoxGeometry(size * 0.16, 0.4, size * 0.85);
  const fuseM = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
  const fuse = new THREE.Mesh(fuseG, fuseM);
  fuse.castShadow = true;
  grp.add(fuse);
  const wingG = new THREE.BoxGeometry(size * 1.05, 0.2, size * 0.18);
  const wing = new THREE.Mesh(wingG, fuseM);
  wing.castShadow = true;
  grp.add(wing);
  const tailG = new THREE.BoxGeometry(size * 0.42, 0.25, size * 0.10);
  const tail = new THREE.Mesh(tailG, fuseM);
  tail.position.z = size * 0.85 / 2 - size * 0.10 * 1.6;
  tail.castShadow = true;
  grp.add(tail);
  // Cabina más oscura
  const cabG = new THREE.BoxGeometry(size * 0.14, 0.45, size * 0.18);
  const cabM = new THREE.MeshStandardMaterial({ color: 0x1a1f29, roughness: 0.3 });
  const cab = new THREE.Mesh(cabG, cabM);
  cab.position.z = -size * 0.85 / 2 + size * 0.10;
  cab.castShadow = true;
  grp.add(cab);
  // 2 motores
  const engG = new THREE.CylinderGeometry(size * 0.06, size * 0.06, size * 0.20, 8);
  const engM = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.5 });
  const eng1 = new THREE.Mesh(engG, engM);
  eng1.rotation.x = Math.PI / 2;
  eng1.position.set(-size * 0.32, 0, 0);
  eng1.castShadow = true;
  grp.add(eng1);
  const eng2 = new THREE.Mesh(engG, engM);
  eng2.rotation.x = Math.PI / 2;
  eng2.position.set(size * 0.32, 0, 0);
  eng2.castShadow = true;
  grp.add(eng2);
  return grp;
}

function makeVan(returning: boolean): THREE.Group {
  const grp = new THREE.Group();
  const color = returning ? 0x8a92a6 : 0xe85d75;
  const bodyG = new THREE.BoxGeometry(0.8, 0.7, 2.0);
  const bodyM = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const body = new THREE.Mesh(bodyG, bodyM);
  body.castShadow = true;
  grp.add(body);
  // Cabina vidrio
  const cabG = new THREE.BoxGeometry(0.7, 0.6, 0.5);
  const cabM = new THREE.MeshStandardMaterial({ color: 0xc5e6ff, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.9 });
  const cab = new THREE.Mesh(cabG, cabM);
  cab.position.set(0, 0.1, -0.7);
  cab.castShadow = true;
  grp.add(cab);
  // Ruedas
  const wG = new THREE.CylinderGeometry(0.18, 0.18, 0.18, 8);
  const wM = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
  const wheelOffsets = [
    [-0.4, -0.35, -0.7], [0.4, -0.35, -0.7],
    [-0.4, -0.35, 0.7],  [0.4, -0.35, 0.7],
  ];
  for (const [x, y, z] of wheelOffsets) {
    const w = new THREE.Mesh(wG, wM);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    w.castShadow = true;
    grp.add(w);
  }
  return grp;
}
