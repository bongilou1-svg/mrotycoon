#!/usr/bin/env node
// claude-render · triangulate.mjs
// Convierte un punto que marcas EN UNA FOTO (px sobre la imagen) a coordenada normalizada
// OSM [0..1] del juego, usando 2+ puntos de referencia conocidos (stands/terminal cuya coord
// OSM sí conocemos). Resuelve la transformación afín foto→mundo por mínimos cuadrados.
//
// Uso:
//   node triangulate.mjs --ref "px,py=nx,ny" --ref "px,py=nx,ny" [...] --point "px,py"
//   (mínimo 2 refs para escala+traslación 1:1; 3+ para afín completa con rotación/shear)
//
// Ej: marcas en tu foto el stand 351 (lo ves en px 690,470) y sabes que su coord OSM es
//     0.477,0.559 → eso es un --ref. Con 3 refs, --point "x,y" te da la coord OSM del punto.
//
// Salida: la coord normalizada [nx, ny] del --point, lista para meter en el código.

function parsePair(s){ const [a,b]=s.split(/[ ,]+/).map(Number); return [a,b]; }

const refs = [];
let point = null;
for (let i=2;i<process.argv.length;i++){
  if (process.argv[i]==="--ref"){ const [l,r]=process.argv[++i].split("="); refs.push({ px: parsePair(l), nrm: parsePair(r) }); }
  else if (process.argv[i]==="--point"){ point = parsePair(process.argv[++i]); }
}
if (refs.length < 2 || !point){ console.error("Uso: --ref \"px,py=nx,ny\" (x2+) --point \"px,py\""); process.exit(1); }

// Afín: nx = a*px + b*py + c ; ny = d*px + e*py + f. Resolvemos por mínimos cuadrados (normal eqs).
// Construimos A (n×3) y resolvemos para [a,b,c] (x) y [d,e,f] (y) por separado.
function solve3(rows, targets){
  // rows: [[px,py,1],...]  targets: [nx,...]   → mínimos cuadrados AtA x = At b
  const ata=[[0,0,0],[0,0,0],[0,0,0]], atb=[0,0,0];
  for (let k=0;k<rows.length;k++){ const r=rows[k];
    for (let i=0;i<3;i++){ atb[i]+=r[i]*targets[k]; for (let j=0;j<3;j++) ata[i][j]+=r[i]*r[j]; } }
  // Gauss 3x3
  const M=ata.map((row,i)=>[...row,atb[i]]);
  for (let c=0;c<3;c++){
    let piv=c; for(let r=c+1;r<3;r++) if(Math.abs(M[r][c])>Math.abs(M[piv][c])) piv=r;
    [M[c],M[piv]]=[M[piv],M[c]];
    const d=M[c][c]||1e-9;
    for(let j=c;j<4;j++) M[c][j]/=d;
    for(let r=0;r<3;r++) if(r!==c){ const f=M[r][c]; for(let j=c;j<4;j++) M[r][j]-=f*M[c][j]; }
  }
  return [M[0][3],M[1][3],M[2][3]];
}
const rows = refs.map(r=>[r.px[0], r.px[1], 1]);
const cx = solve3(rows, refs.map(r=>r.nrm[0]));
const cy = solve3(rows, refs.map(r=>r.nrm[1]));
const nx = cx[0]*point[0]+cx[1]*point[1]+cx[2];
const ny = cy[0]*point[0]+cy[1]*point[1]+cy[2];

// Error de ajuste sobre las refs (para saber si la triangulación es fiable).
let err=0; for(const r of refs){ const ex=cx[0]*r.px[0]+cx[1]*r.px[1]+cx[2], ey=cy[0]*r.px[0]+cy[1]*r.px[1]+cy[2]; err+=Math.hypot(ex-r.nrm[0], ey-r.nrm[1]); }
err/=refs.length;

console.log(JSON.stringify({ normalized: [Number(nx.toFixed(4)), Number(ny.toFixed(4))], fitErrorNorm: Number(err.toFixed(4)), refs: refs.length }, null, 2));
