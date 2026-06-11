// Live Map — animated MRO Tycoon scene (v3 — 3-stand apron).
// One commercial landing on RWY 29 → taxi → park at PRKG 01.
// Mechanic van dispatched from OFICINA MECS to PRKG 03 (IN-SERVICE aircraft).

const { useState, useEffect, useMemo, useRef } = React;

const DUR = 16;  // seconds, loops

// ============================================================
// Pre-rendered static background — the schematic from map.js
// ============================================================
const StaticMapBackground = React.memo(({ mode }) => {
  const html = useMemo(() => window.renderMapSVG(mode, { idPrefix: mode }), [mode]);
  return (
    <div
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

// ============================================================
// Sprite primitives — top-down pixel-style silhouettes
// ============================================================

// Aircraft: nose points "north" (-y) at rotation 0. Rotate clockwise
// so rotation=90 → nose east, 180 → south, 270 → west.
function AircraftSprite({ x, y, rotation, label, idle = false }) {
  const t = useTime();
  // Subtle hover/idle wobble for parked planes
  const wobble = idle ? Math.sin(t * 1.6) * 0.6 : 0;
  // Make the aircraft sprite smaller (more pixel-accurate at scale 0.49)
  // 737/A320 class: 35m × 34m → ~17×17 px. We use ~30×26 for legibility.
  const SCALE = 0.65;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation + wobble}) scale(${SCALE})`}>
      {/* Shadow underneath */}
      <ellipse cx="2" cy="3" rx="22" ry="6" fill="#000" opacity="0.35" />
      {/* Fuselage */}
      <rect x="-2.5" y="-18" width="5" height="36" fill="#E8EEF7" rx="2.5" />
      {/* Wings */}
      <path d="M -22 -1 L 22 -1 L 22 4 L 4 5 L 4 8 L -4 8 L -4 5 L -22 4 Z" fill="#D4DCEA" />
      {/* Tail wings */}
      <path d="M -8 13 L 8 13 L 6 17 L -6 17 Z" fill="#C0CADD" />
      {/* Cockpit / nose */}
      <ellipse cx="0" cy="-15" rx="2.3" ry="3.5" fill="#5489BD" />
      {/* Engines under wings */}
      <rect x="-13" y="1" width="3" height="4" fill="#8FA8C7" rx="0.5" />
      <rect x="10" y="1" width="3" height="4" fill="#8FA8C7" rx="0.5" />
      {/* Label */}
      {label && (
        <text
          x="0" y="28" textAnchor="middle"
          fill="#9CB6D2" fontSize="9"
          fontFamily="IBM Plex Mono, monospace" letterSpacing="1"
          transform={`rotate(${-rotation - wobble})`}
        >{label}</text>
      )}
    </g>
  );
}

// Mechanic van — small orange box, nose points "north" at rotation 0
function VanSprite({ x, y, rotation }) {
  const t = useTime();
  // Roof beacon blink
  const blink = Math.sin(t * 6) > 0;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      <ellipse cx="1" cy="1" rx="6" ry="3" fill="#000" opacity="0.4" />
      <rect x="-4.5" y="-9" width="9" height="18" fill="#F4A82E" stroke="#B47715" strokeWidth="0.5" rx="1.5" />
      {/* Windshield */}
      <rect x="-3.5" y="-8" width="7" height="3" fill="#1B344F" rx="0.5" />
      {/* Side windows */}
      <rect x="-4" y="-3" width="1.5" height="6" fill="#1B344F" opacity="0.7" />
      <rect x="2.5" y="-3" width="1.5" height="6" fill="#1B344F" opacity="0.7" />
      {/* Roof beacon */}
      <circle cx="0" cy="0" r="1.3" fill={blink ? '#5BE89D' : '#3D8060'} />
      {/* Rear */}
      <rect x="-3" y="7" width="6" height="1.5" fill="#B47715" />
    </g>
  );
}

// Mechanic walking — tiny figure
function MechanicSprite({ x, y, vest = '#F4A82E' }) {
  const t = useTime();
  const bob = Math.sin(t * 8) * 0.4;
  return (
    <g transform={`translate(${x}, ${y + bob})`}>
      <ellipse cx="0" cy="3" rx="3" ry="1" fill="#000" opacity="0.35" />
      <rect x="-2" y="-1" width="4" height="5" fill={vest} rx="0.5" />
      <circle cx="0" cy="-3" r="1.7" fill="#F2D88A" />
    </g>
  );
}

// HUD callout — top-right activity log
function HUDCallout({ x, y, label, dim }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="-12" width="220" height="22" fill="#0E1B2D"
            stroke={dim ? '#506E91' : '#5BC5E8'} strokeWidth="1" rx="2" opacity="0.92" />
      <circle cx="14" cy="-1" r="3" fill={dim ? '#506E91' : '#5BC5E8'}>
        {!dim && <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />}
      </circle>
      <text x="26" y="3" fill={dim ? '#7A99BD' : '#DCE7F5'}
            fontSize="10" fontFamily="IBM Plex Mono, monospace"
            letterSpacing="2" fontWeight="500">{label}</text>
    </g>
  );
}

// ============================================================
// Path/heading helpers
// ============================================================

// Linear-interp a 2D path through waypoints with time anchors.
// waypoints: [{t, x, y, heading?}, ...]
// At t < first, returns first (and visible=false unless preroll)
// At t > last, returns last
function samplePath(t, waypoints) {
  if (t <= waypoints[0].t) return { ...waypoints[0], _idx: 0, _alpha: 0 };
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const alpha = span === 0 ? 0 : (t - a.t) / span;
      const eased = alpha;  // linear by default
      const x = a.x + (b.x - a.x) * eased;
      const y = a.y + (b.y - a.y) * eased;
      // Heading: prefer explicit on b, else compute from segment direction
      let heading;
      if (b.heading !== undefined) {
        const ha = a.heading !== undefined ? a.heading : b.heading;
        heading = ha + shortAngleDiff(ha, b.heading) * eased;
      } else {
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) heading = a.heading || 0;
        else heading = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
      }
      return { x, y, heading, _idx: i, _alpha: alpha };
    }
  }
  return { ...waypoints[waypoints.length - 1], _idx: waypoints.length - 1, _alpha: 1 };
}

function shortAngleDiff(a, b) {
  let d = ((b - a) % 360 + 540) % 360 - 180;
  return d;
}

// ============================================================
// SCENE — all the choreography
// ============================================================
function MROScene({ mode }) {
  const t = useTime();

  // -- Map keypoints (canvas coords, v3 layout) --
  const KP = {
    runwayY: 103,
    thr11X: 100, thr29X: 1180,
    twyTY: 225,                          // TWY T centerline
    twyC: { x1: 777, y1: 114, x2: 865, y2: 218 },
    twyD: { x1: 933, y1: 114, x2: 1007, y2: 218 },
    prkg01: { x: 766, y: 292 },          // landing destination
    prkg02: { x: 918, y: 292 },          // occupied (static)
    prkg03: { x: 1070, y: 292 },         // IN-SERVICE — mecs target
    serviceY: 364,                       // service road south of stands
    oficinaMecs: { x: 1106, y: 416 },
  };

  // -- AIRCRAFT AVS-101: lands RWY 29 → exit TWY D → TWY T → enter apron → PRKG 01 --
  const aircraftPath = [
    { t: 0,    x: 1280 + 40, y: KP.runwayY, heading: 270 },
    { t: 1.5,  x: 1160,      y: KP.runwayY, heading: 270 },
    { t: 2.6,  x: 1040,      y: KP.runwayY, heading: 270 },
    { t: 3.6,  x: 970,       y: KP.runwayY, heading: 270 },
    // Exit via TWY D (angled SW)
    { t: 4.5,  x: KP.twyD.x2, y: KP.twyD.y2, heading: 230 },
    // Join TWY T centerline
    { t: 5.0,  x: KP.twyD.x2 - 8, y: KP.twyTY, heading: 270 },
    // Taxi west on TWY T toward apron entry
    { t: 8.0,  x: KP.prkg01.x + 14, y: KP.twyTY, heading: 270 },
    // Turn south into apron toward PRKG 01
    { t: 8.7,  x: KP.prkg01.x, y: KP.twyTY + 20, heading: 180 },
    // Park at PRKG 01
    { t: 9.8,  x: KP.prkg01.x, y: KP.prkg01.y, heading: 180 },
    { t: DUR,  x: KP.prkg01.x, y: KP.prkg01.y, heading: 180 },
  ];

  // -- VAN: leaves OFICINA MECS → apron service road → PRKG 03 (IN-SERVICE) --
  const vanPath = [
    { t: 0,    x: KP.oficinaMecs.x, y: KP.oficinaMecs.y, heading: 0 },
    { t: 3.5,  x: KP.oficinaMecs.x, y: KP.oficinaMecs.y, heading: 0 },
    // Drive north out of office
    { t: 4.3,  x: KP.oficinaMecs.x, y: KP.serviceY + 12, heading: 0 },
    // Turn west onto service road
    { t: 4.8,  x: KP.oficinaMecs.x - 12, y: KP.serviceY, heading: 270 },
    // Drive west along service road to PRKG 03
    { t: 6.4,  x: KP.prkg03.x + 18, y: KP.serviceY, heading: 270 },
    // Turn north toward PRKG 03 south edge
    { t: 7.0,  x: KP.prkg03.x, y: KP.serviceY - 8, heading: 0 },
    { t: 7.6,  x: KP.prkg03.x, y: KP.prkg03.y + 28, heading: 0 },
    { t: DUR,  x: KP.prkg03.x, y: KP.prkg03.y + 28, heading: 0 },
  ];

  const aircraft = samplePath(t, aircraftPath);
  const van = samplePath(t, vanPath);

  // -- MECHANICS walking from van to aircraft on PRKG 03 --
  const mechAppear = 7.6;
  const mechWalkEnd = 9.0;
  const mechProg = Math.min(1, Math.max(0, (t - mechAppear) / (mechWalkEnd - mechAppear)));
  const mech1 = {
    x: KP.prkg03.x - 5 + mechProg * -3,
    y: (KP.prkg03.y + 26) + mechProg * -16,
  };
  const mech2 = {
    x: KP.prkg03.x + 5 + mechProg * 3,
    y: (KP.prkg03.y + 26) + mechProg * -16,
  };

  // -- HUD activity log --
  const activityLog = (() => {
    if (t < 2)    return "AVS-101 · INBOUND · RWY 29";
    if (t < 4)    return "AVS-101 · TOUCHDOWN · TDZ 29";
    if (t < 5.5)  return "AVS-101 · VACATING · TWY D";
    if (t < 8.5)  return "AVS-101 · TAXI · TWY T";
    if (t < 9.9)  return "AVS-101 · APRON · PRKG 01";
    return "AVS-101 · PARKED · PRKG 01";
  })();
  const activityLog2 = (() => {
    if (t < 3.5)  return "MECS · STANDBY";
    if (t < 4.8)  return "MECS · DISPATCHED";
    if (t < 6.6)  return "MECS · SERVICE RD · WB";
    if (t < 7.6)  return "MECS · APPROACH · PRKG 03";
    if (t < 9.0)  return "MECS · DEPLOYING";
    return "MECS · WORKING · PRKG 03";
  })();

  // Visibility: hide aircraft once it's about to leave canvas (none here),
  // hide mechanics until they appear
  const showMechs = t >= mechAppear;

  return (
    <>
      <StaticMapBackground mode={mode} />
      <svg
        viewBox="0 0 1280 720"
        width="1280"
        height="720"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {/* STATIC parked aircraft on occupied stands */}
        {/* PRKG 02 — occupied (facing south, nose toward terminal) */}
        <AircraftSprite x={KP.prkg02.x} y={KP.prkg02.y} rotation={180} idle />
        {/* PRKG 03 — IN-SERVICE (aircraft being worked on by mechanics) */}
        <AircraftSprite x={KP.prkg03.x} y={KP.prkg03.y} rotation={180} idle />

        {/* AVS-101 — moving aircraft */}
        <AircraftSprite
          x={aircraft.x} y={aircraft.y} rotation={aircraft.heading}
          label="AVS-101"
        />

        {/* VAN */}
        <VanSprite x={van.x} y={van.y} rotation={van.heading} />

        {/* MECHANICS */}
        {showMechs && (
          <>
            <MechanicSprite x={mech1.x} y={mech1.y} />
            <MechanicSprite x={mech2.x} y={mech2.y} vest="#5BC5E8" />
          </>
        )}

        {/* HUD callouts top-right */}
        <HUDCallout x={1000} y={70} label={activityLog} />
        <HUDCallout x={1000} y={100} label={activityLog2} dim />
      </svg>
    </>
  );
}

// ============================================================
// App
// ============================================================
function App() {
  const [mode, setMode] = useState('day');
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Mode toggle top-left */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        display: 'flex', gap: 6,
        background: '#0E1B2D', border: '1px solid #1B304C',
        padding: 4, borderRadius: 6,
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: 2,
      }}>
        {['day', 'night'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              background: mode === m ? '#5BC5E8' : 'transparent',
              color: mode === m ? '#0E1B2D' : '#7A99BD',
              border: 'none',
              padding: '5px 12px',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              letterSpacing: 'inherit',
              fontWeight: 500,
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: 3,
            }}
          >{m}</button>
        ))}
      </div>

      <Stage
        width={1280}
        height={720}
        duration={DUR}
        background={mode === 'day' ? '#0E1B2D' : '#050B16'}
        persistKey="mro-livemap"
      >
        <MROScene mode={mode} />
      </Stage>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
