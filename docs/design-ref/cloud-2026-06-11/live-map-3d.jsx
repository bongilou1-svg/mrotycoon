// Live Map 3D v2 — playable scale, Bus Manager aesthetic, side panel HUD.

const { useState, useMemo } = React;

const DUR = 16;

// ============================================================
// Background — the 3D city-style map (now with built-in side panel)
// ============================================================
const Map3DBackground = React.memo(({ mode }) => {
  const html = useMemo(() => window.render3DMap(mode, { idPrefix: "m3d-" + mode }), [mode]);
  return (
    <div
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

// ============================================================
// Sprites
// ============================================================
function AircraftSprite({ x, y, rotation, label, idle = false, scale = 0.85 }) {
  const t = useTime();
  const wobble = idle ? Math.sin(t * 1.6) * 0.6 : 0;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation + wobble}) scale(${scale})`}>
      <ellipse cx="2" cy="3" rx="22" ry="6" fill="#000" opacity="0.45" />
      <rect x="-2.5" y="-18" width="5" height="36" fill="#F0F4FB" rx="2.5" />
      <path d="M -22 -1 L 22 -1 L 22 4 L 4 5 L 4 8 L -4 8 L -4 5 L -22 4 Z" fill="#D8E2F0" />
      <path d="M -8 13 L 8 13 L 6 17 L -6 17 Z" fill="#C0CADD" />
      <ellipse cx="0" cy="-15" rx="2.3" ry="3.5" fill="#5489BD" />
      <rect x="-13" y="1" width="3" height="4" fill="#8FA8C7" rx="0.5" />
      <rect x="10" y="1" width="3" height="4" fill="#8FA8C7" rx="0.5" />
      {label && (
        <text x="0" y="28" textAnchor="middle"
          fill="#C8D9EC" fontSize="10"
          fontFamily="IBM Plex Mono, monospace" letterSpacing="1"
          transform={`rotate(${-rotation - wobble})`}>{label}</text>
      )}
    </g>
  );
}

function VanSprite({ x, y, rotation }) {
  const t = useTime();
  const blink = Math.sin(t * 6) > 0;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      <ellipse cx="1" cy="1" rx="7" ry="3" fill="#000" opacity="0.45" />
      <rect x="-5" y="-10" width="10" height="20" fill="#F4A82E" stroke="#B47715" strokeWidth="0.5" rx="1.5" />
      <rect x="-4" y="-9" width="8" height="3.5" fill="#1B344F" rx="0.5" />
      <rect x="-4.5" y="-3" width="1.5" height="6" fill="#1B344F" opacity="0.7" />
      <rect x="3" y="-3" width="1.5" height="6" fill="#1B344F" opacity="0.7" />
      <circle cx="0" cy="-1" r="1.5" fill={blink ? '#5BE89D' : '#3D8060'} />
      <rect x="-3.5" y="8" width="7" height="1.5" fill="#B47715" />
    </g>
  );
}

function MechanicSprite({ x, y, vest = '#F4A82E' }) {
  const t = useTime();
  const bob = Math.sin(t * 8) * 0.4;
  return (
    <g transform={`translate(${x}, ${y + bob})`}>
      <ellipse cx="0" cy="3" rx="3" ry="1" fill="#000" opacity="0.4" />
      <rect x="-2.5" y="-1" width="5" height="6" fill={vest} rx="0.5" />
      <circle cx="0" cy="-3" r="2" fill="#F2D88A" />
    </g>
  );
}

// Aircraft taxi-path trail
function TaxiTrail({ points, color, opacity = 0.45 }) {
  if (points.length < 2) return null;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <path d={d} fill="none" stroke={color} strokeWidth="2"
      strokeDasharray="5 4" opacity={opacity} strokeLinecap="round"/>
  );
}

// ============================================================
// Path helpers
// ============================================================
function samplePath(t, waypoints) {
  if (t <= waypoints[0].t) return { ...waypoints[0] };
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const alpha = span === 0 ? 0 : (t - a.t) / span;
      const x = a.x + (b.x - a.x) * alpha;
      const y = a.y + (b.y - a.y) * alpha;
      let heading;
      if (b.heading !== undefined) {
        const ha = a.heading !== undefined ? a.heading : b.heading;
        heading = ha + shortAngleDiff(ha, b.heading) * alpha;
      } else {
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) heading = a.heading || 0;
        else heading = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
      }
      return { x, y, heading };
    }
  }
  return { ...waypoints[waypoints.length - 1] };
}
function shortAngleDiff(a, b) {
  return ((b - a) % 360 + 540) % 360 - 180;
}

// ============================================================
// SCENE — playable-scale keypoints
// ============================================================
function MROScene3D({ mode }) {
  const t = useTime();
  const p = window.MAP3D_PALETTES[mode];

  // Keypoints derived from MAP3D_GEOM v3
  const KP = {
    runwayY: 70,
    twyTY: 117,
    twyD: { x1: 720, y1: 84, x2: 800, y2: 108 },
    prkg01: { x: 440, y: 240 },
    prkg02: { x: 580, y: 240 },
    prkg03: { x: 720, y: 240 },
    serviceY: 366,
    oficinaMecs: { x: 849, y: 424 },
    mapRightEdge: 970,
  };

  // Aircraft AVS-101: lands RWY 29 → TWY D → TWY T → parks PRKG 01
  const aircraftPath = [
    { t: 0,    x: KP.mapRightEdge + 20, y: KP.runwayY, heading: 270 },
    { t: 1.5,  x: 870,                  y: KP.runwayY, heading: 270 },
    { t: 2.6,  x: 800,                  y: KP.runwayY, heading: 270 },
    { t: 3.6,  x: 760,                  y: KP.runwayY, heading: 270 },
    // Exit via TWY D
    { t: 4.5,  x: KP.twyD.x2,           y: KP.twyD.y2 - 1, heading: 230 },
    // Join TWY T
    { t: 5.0,  x: KP.twyD.x2 - 6,       y: KP.twyTY, heading: 270 },
    // Taxi west on TWY T
    { t: 8.0,  x: KP.prkg01.x + 12,     y: KP.twyTY, heading: 270 },
    // Turn south to enter apron toward PRKG 01
    { t: 8.7,  x: KP.prkg01.x,          y: KP.twyTY + 24, heading: 180 },
    // Approach stand
    { t: 9.8,  x: KP.prkg01.x,          y: KP.prkg01.y, heading: 180 },
    { t: DUR,  x: KP.prkg01.x,          y: KP.prkg01.y, heading: 180 },
  ];

  // Van: leaves OFICINA MECS → service road → PRKG 03
  const vanPath = [
    { t: 0,    x: KP.oficinaMecs.x, y: KP.oficinaMecs.y, heading: 0 },
    { t: 3.5,  x: KP.oficinaMecs.x, y: KP.oficinaMecs.y, heading: 0 },
    { t: 4.3,  x: KP.oficinaMecs.x, y: KP.serviceY + 10, heading: 0 },
    { t: 4.8,  x: KP.oficinaMecs.x - 16, y: KP.serviceY, heading: 270 },
    { t: 6.4,  x: KP.prkg03.x + 20, y: KP.serviceY, heading: 270 },
    { t: 7.0,  x: KP.prkg03.x, y: KP.serviceY - 4, heading: 0 },
    { t: 7.6,  x: KP.prkg03.x, y: KP.prkg03.y + 90, heading: 0 },
    { t: DUR,  x: KP.prkg03.x, y: KP.prkg03.y + 90, heading: 0 },
  ];

  const aircraft = samplePath(t, aircraftPath);
  const van = samplePath(t, vanPath);

  const mechAppear = 7.6, mechWalkEnd = 9.0;
  const mechProg = Math.min(1, Math.max(0, (t - mechAppear) / (mechWalkEnd - mechAppear)));
  const mech1 = { x: KP.prkg03.x - 6 + mechProg * -4, y: (KP.prkg03.y + 88) + mechProg * -20 };
  const mech2 = { x: KP.prkg03.x + 6 + mechProg * 4, y: (KP.prkg03.y + 88) + mechProg * -20 };

  // Sample path trail
  const trailPoints = useMemo(() => {
    const pts = [];
    for (let tt = 0.5; tt <= Math.min(t, 11); tt += 0.25) {
      const s = samplePath(tt, aircraftPath);
      pts.push({ x: s.x, y: s.y });
    }
    return pts;
  }, [Math.floor(t * 4)]);

  // Activity log (will render at panel position)
  const activityLog = (() => {
    if (t < 2)    return "AVS-101 · INBOUND · RWY 29";
    if (t < 4)    return "AVS-101 · TOUCHDOWN";
    if (t < 5.5)  return "AVS-101 · VACATING TWY D";
    if (t < 8.5)  return "AVS-101 · TAXI TWY T";
    if (t < 9.9)  return "AVS-101 · ENTERING APRON";
    return "AVS-101 · PARKED PRKG 01";
  })();
  const activityLog2 = (() => {
    if (t < 3.5)  return "MECS · STANDBY";
    if (t < 4.8)  return "MECS · DISPATCHED";
    if (t < 6.6)  return "MECS · SERVICE ROAD";
    if (t < 7.6)  return "MECS · APPROACH PRKG 03";
    if (t < 9.0)  return "MECS · DEPLOYING";
    return "MECS · WORKING PRKG 03";
  })();

  const showMechs = t >= mechAppear;
  const PANEL_X = 1000;

  return (
    <>
      <Map3DBackground mode={mode} />
      <svg
        viewBox="0 0 1280 720"
        width="1280" height="720"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {/* clip group so sprites don't escape into the panel area */}
        <g clipPath={`url(#m3d-clip-${mode})`}>
          <defs>
            <clipPath id={`m3d-clip-${mode}`}>
              <rect x="0" y="0" width="1000" height="720"/>
            </clipPath>
          </defs>

          {/* Path trail */}
          <TaxiTrail points={trailPoints} color={p.pathTrail} opacity={0.45}/>

          {/* Static parked aircraft */}
          <AircraftSprite x={KP.prkg02.x} y={KP.prkg02.y} rotation={180} idle />
          <AircraftSprite x={KP.prkg03.x} y={KP.prkg03.y} rotation={180} idle />

          {/* Moving aircraft AVS-101 */}
          <AircraftSprite x={aircraft.x} y={aircraft.y} rotation={aircraft.heading} label="AVS-101" />

          {/* Van */}
          <VanSprite x={van.x} y={van.y} rotation={van.heading} />

          {/* Mechanics */}
          {showMechs && (
            <>
              <MechanicSprite x={mech1.x} y={mech1.y} />
              <MechanicSprite x={mech2.x} y={mech2.y} vest="#5BC5E8" />
            </>
          )}
        </g>

        {/* SIDE PANEL — activity log lines (overlaid into panel space) */}
        <g>
          {/* Activity log entry 1 — bright */}
          <rect x={PANEL_X + 16} y={460} width={264 - 32} height={28}
            fill="#0A1726" stroke={p.routeColor} strokeWidth="1" rx="2" opacity="0.95"/>
          <circle cx={PANEL_X + 26} cy={474} r="2.5" fill={p.routeColor}>
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite"/>
          </circle>
          <text x={PANEL_X + 38} y={478} fill="#DCE7F5"
            fontFamily="IBM Plex Mono, monospace" fontSize="9" letterSpacing="1.5"
            fontWeight="500">{activityLog}</text>
          <text x={PANEL_X + 38} y={465} fill="#5A7596"
            fontFamily="IBM Plex Mono, monospace" fontSize="7" letterSpacing="1.5">{"NOW"}</text>

          {/* Activity log entry 2 — dim */}
          <rect x={PANEL_X + 16} y={494} width={264 - 32} height={28}
            fill="#0A1726" stroke="#1F3E5A" strokeWidth="0.8" rx="2" opacity="0.9"/>
          <circle cx={PANEL_X + 26} cy={508} r="2" fill="#5A7596"/>
          <text x={PANEL_X + 38} y={512} fill="#85A2C2"
            fontFamily="IBM Plex Mono, monospace" fontSize="9" letterSpacing="1.5">{activityLog2}</text>
          <text x={PANEL_X + 38} y={499} fill="#5A7596"
            fontFamily="IBM Plex Mono, monospace" fontSize="7" letterSpacing="1.5">{"NOW"}</text>

          {/* Older entries (static, just for context filling) */}
          <rect x={PANEL_X + 16} y={528} width={264 - 32} height={20}
            fill="transparent" rx="2"/>
          <text x={PANEL_X + 26} y={542} fill="#5A7596"
            fontFamily="IBM Plex Mono, monospace" fontSize="8" letterSpacing="1.5">
            03:42 · IB-3412 · BLOCK ON · PRKG 02
          </text>
          <text x={PANEL_X + 26} y={555} fill="#5A7596"
            fontFamily="IBM Plex Mono, monospace" fontSize="8" letterSpacing="1.5">
            03:18 · DELIVERY · GA-HGR · COMPLETE
          </text>
        </g>
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
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        display: 'flex', gap: 6,
        background: '#0A1726', border: '1px solid #1B304C',
        padding: 4, borderRadius: 6,
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: 2,
      }}>
        {['day', 'night'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              background: mode === m ? '#5BC5E8' : 'transparent',
              color: mode === m ? '#0A1726' : '#7A99BD',
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
        background={mode === 'day' ? '#050B14' : '#020610'}
        persistKey="mro-livemap3d-v2"
      >
        <MROScene3D mode={mode} />
      </Stage>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
