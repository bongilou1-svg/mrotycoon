// Vendored from ~/.claude/skills/guided-tour/tour.js (2026-07-01) — motor GuidedTour VERBATIM.
// NO editar aquí: la lógica reactiva (gate/cond) vive en APP_JS como wrapper. Re-vendorizar si la skill cambia.
/* =============================================================================
   GuidedTour — motor genérico de tour guiado + tooltips para CUALQUIER app/juego.
   Vanilla JS, sin dependencias, CSS autoinyectado, theme-able con CSS vars.

   USO MÍNIMO
   ----------
     const tour = GuidedTour.create({
       storageKey: 'miapp_tour',        // arranca solo la 1ª visita; omítelo para no persistir
       onNavigate: v => showView(v),    // cómo cambiar de pantalla/tab (opcional)
       steps: [
         { target:null, title:'Bienvenido', body:'Te enseño la app en 1 min.',
           note:{kind:'demo', text:'Los datos son de ejemplo.'} },   // target null = tarjeta centrada
         { target:'#chart', view:'home', title:'1 · El gráfico', body:'Aquí ves el precio en vivo.',
           note:{kind:'real', text:'Se calcula de verdad.'} },
         { target:()=>document.querySelector('.cta'), title:'Empieza aquí', body:'Pulsa para lanzar.' },
       ],
     });
     document.querySelector('#help').onclick = () => tour.start();   // botón «?» para repetir

     // tooltips (independientes del tour):
     GuidedTour.tooltips({ glossary:{ 'sharpe':'Rentabilidad ajustada al riesgo.', 'drawdown':'La peor caída.' } });
     // ...y/o pon data-tip="texto" en cualquier elemento del HTML.

   Devuelve: { start(), startAt(i), next(), prev(), end(), isOpen() }
   ============================================================================= */
(function (global) {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const LABELS = {
    es: { skip:'Saltar', prev:'Anterior', next:'Siguiente', done:'Terminar' },
    en: { skip:'Skip',   prev:'Back',     next:'Next',      done:'Done' },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const clamp = (v,a,b) => Math.max(a, Math.min(v, b));

  // ---- CSS (autoinyectado una vez). Todo theme-able con var(--tour-*) y buenos fallbacks. ----
  const CSS = `
#gt-tt{position:fixed;z-index:2147483000;max-width:260px;pointer-events:none;opacity:0;transform:translateY(4px);
  background:var(--tour-surface,#1c2640);color:var(--tour-text,#e8edf7);border:1px solid var(--tour-line,rgba(255,255,255,.14));
  font:500 12px/1.5 var(--tour-font,system-ui,-apple-system,sans-serif);padding:9px 12px;border-radius:10px;
  box-shadow:0 12px 34px rgba(0,0,0,.5);transition:opacity .14s,transform .14s}
#gt-tt.show{opacity:1;transform:none}
#gt-tt .gt-tth{display:block;font-weight:700;font-size:11.5px;color:var(--tour-accent,#52c6f5);margin-bottom:3px}
#gt-tt::after{content:"";position:absolute;left:var(--gt-ax,50%);width:9px;height:9px;background:var(--tour-surface,#1c2640);
  border:1px solid var(--tour-line,rgba(255,255,255,.14));transform:translateX(-50%) rotate(45deg)}
#gt-tt.above::after{bottom:-5px;border-top:none;border-left:none}
#gt-tt.below::after{top:-5px;border-bottom:none;border-right:none}
.gt-i{display:inline-grid;place-items:center;width:14px;height:14px;border-radius:50%;border:1px solid currentColor;
  font:400 9px/1 var(--tour-mono,ui-monospace,monospace);cursor:help;margin-left:5px;vertical-align:middle;opacity:.65;user-select:none}
.gt-i:hover,.gt-i:focus-visible{opacity:1}
#gt-tour{position:fixed;inset:0;z-index:2147482000;display:none}
#gt-tour.on{display:block}
.gt-catch{position:fixed;inset:0;background:transparent}
.gt-spot{position:fixed;border-radius:12px;pointer-events:none;border:2px solid var(--tour-accent,#52c6f5);
  box-shadow:0 0 0 9999px var(--tour-scrim,rgba(5,8,16,.76));transition:all .32s cubic-bezier(.2,.8,.25,1)}
.gt-pop{position:fixed;width:328px;max-width:calc(100vw - 32px);z-index:1;
  background:var(--tour-surface,#161e30);color:var(--tour-text,#e8edf7);border:1px solid var(--tour-line,rgba(255,255,255,.14));
  border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.6);padding:17px 18px;
  font:400 13px/1.55 var(--tour-font,system-ui,-apple-system,sans-serif);transition:all .32s cubic-bezier(.2,.8,.25,1)}
.gt-top{display:flex;align-items:center;gap:9px;margin-bottom:9px;letter-spacing:.05em;
  font:500 11px/1 var(--tour-mono,ui-monospace,monospace);color:var(--tour-muted,#8a94b0)}
.gt-dots{display:flex;gap:4px;margin-left:auto}
.gt-dots i{width:5px;height:5px;border-radius:50%;background:var(--tour-line,rgba(255,255,255,.16));transition:.2s}
.gt-dots i.on{background:var(--tour-accent,#52c6f5);width:14px;border-radius:3px}
.gt-pop h4{margin:0 0 7px;font:700 16px/1.2 var(--tour-head,var(--tour-font,system-ui,sans-serif));letter-spacing:-.2px}
.gt-pop p{margin:0;color:var(--tour-muted,#aab3cc)}
.gt-note{margin-top:11px;font-size:11.5px;line-height:1.45;padding:8px 10px;border-radius:9px;border:1px solid var(--tour-line,rgba(255,255,255,.12))}
.gt-note.ok{border-color:rgba(55,226,154,.4);color:var(--tour-ok,#37e29a)}
.gt-note.warn{border-color:rgba(255,182,39,.4);color:var(--tour-warn,#ffb627)}
.gt-note.info{color:var(--tour-muted,#aab3cc)}
.gt-foot{display:flex;align-items:center;gap:8px;margin-top:15px}
.gt-sp{flex:1}
.gt-btn{padding:8px 14px;border-radius:9px;cursor:pointer;transition:.15s;
  font:600 13px/1 var(--tour-font,system-ui,sans-serif);border:1px solid var(--tour-line,rgba(255,255,255,.16));
  background:transparent;color:var(--tour-text,#e8edf7)}
.gt-btn:hover{border-color:var(--tour-accent,#52c6f5)}
.gt-primary{background:var(--tour-accent,#52c6f5);color:var(--tour-on-accent,#06121d);border:none}
.gt-primary:hover{filter:brightness(1.05)}
.gt-ghost{border:none;background:none;color:var(--tour-muted,#8a94b0);padding-left:4px;padding-right:4px}
.gt-btn:disabled{opacity:.35;cursor:default}
@media(prefers-reduced-motion:reduce){.gt-spot,.gt-pop,#gt-tt{transition:none}}
@media(max-width:640px){.gt-pop{width:calc(100vw - 24px)}}
`;
  let cssDone = false;
  function injectCSS(){ if (cssDone) return; cssDone = true;
    const s = document.createElement('style'); s.id = 'gt-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  /* ---------------------------------------------------------------------------
     TOOLTIPS — flotante, delegado. Se portalla a <body>, así NO se recorta
     dentro de tarjetas con overflow:hidden (bug clásico de los ::after).
     --------------------------------------------------------------------------- */
  let TT = null, ttHideT = null, ttBound = false;
  function ensureTT(){ if (TT) return TT; injectCSS(); TT = document.createElement('div'); TT.id = 'gt-tt'; TT.setAttribute('role','tooltip'); document.body.appendChild(TT); return TT; }
  function showTip(el){
    const tip = el.getAttribute('data-tip'); if (!tip) return;
    ensureTT(); clearTimeout(ttHideT);
    const title = el.getAttribute('data-tip-title');
    TT.innerHTML = (title ? `<b class="gt-tth">${esc(title)}</b>` : '') + esc(tip);
    TT.classList.add('show');
    const r = el.getBoundingClientRect(), tr = TT.getBoundingClientRect(), gap = 10, vw = innerWidth;
    let top = r.top - tr.height - gap, cls = 'above';
    if (top < 8) { top = r.bottom + gap; cls = 'below'; }
    const left = clamp(r.left + r.width/2 - tr.width/2, 8, vw - tr.width - 8);
    TT.style.top = top + 'px'; TT.style.left = left + 'px';
    TT.classList.remove('above','below'); TT.classList.add(cls);
    TT.style.setProperty('--gt-ax', clamp(r.left + r.width/2 - left, 12, tr.width - 12) + 'px');
  }
  function hideTip(){ ttHideT = setTimeout(() => TT && TT.classList.remove('show'), 60); }
  function bindTipEvents(){ if (ttBound) return; ttBound = true;
    const near = e => e.target && e.target.closest && e.target.closest('[data-tip]');
    document.addEventListener('mouseover', e => { const el = near(e); if (el) showTip(el); });
    document.addEventListener('mouseout',  e => { const el = near(e); if (el) hideTip(); });
    document.addEventListener('focusin',   e => { const el = near(e); if (el) showTip(el); });
    document.addEventListener('focusout',  e => { const el = near(e); if (el) hideTip(); });
    document.addEventListener('keydown',   e => { if (e.key === 'Escape' && TT) TT.classList.remove('show'); });
    addEventListener('scroll', () => { if (TT) TT.classList.remove('show'); }, true);
  }

  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[:.]/g,'').replace(/\s+/g,' ').trim();
  function tooltips(opts){
    opts = opts || {}; injectCSS(); bindTipEvents(); ensureTT();
    if (opts.glossary){
      tooltips._sel = opts.bindSelectors || '.lbl,.mk,.dmk,.k,.stat .lbl,.mcell .mk,.iss-row .muted,label,th';
      tooltips._map = {}; for (const k in opts.glossary) tooltips._map[norm(k)] = opts.glossary[k];
      bindGlossary(opts.root || document);
    }
    return tooltips;
  }
  function bindGlossary(root){
    const map = tooltips._map; if (!map) return;
    (root || document).querySelectorAll(tooltips._sel).forEach(el => {
      if (el.dataset.tip || el.querySelector('.gt-i')) return;                 // ya tiene tooltip
      const clone = el.cloneNode(true); clone.querySelectorAll('.gt-i,[data-tip]').forEach(x => x.remove());
      const label = clone.textContent, t = map[norm(label)];
      if (t){
        const b = document.createElement('span'); b.className = 'gt-i'; b.tabIndex = 0; b.setAttribute('role','button');
        b.setAttribute('aria-label', label.trim() + ': ' + t); b.setAttribute('data-tip', t); b.textContent = 'i';
        el.appendChild(b);
      }
    });
  }
  tooltips.refresh = bindGlossary;   // vuelve a enlazar tras render dinámico: GuidedTour.tooltips.refresh(nodo)

  /* ---------------------------------------------------------------------------
     TOUR
     --------------------------------------------------------------------------- */
  function create(cfg){
    cfg = cfg || {}; injectCSS(); bindTipEvents();
    const L = cfg.labels || LABELS[cfg.lang || 'es'] || LABELS.es;
    const steps = cfg.steps || [];
    const pad = cfg.pad != null ? cfg.pad : 8;
    let i = -1, curEl = null, opener = null, root, spot, pop, reT = null, syncing = false;
    const els = {};
    const isOn = () => root && root.classList.contains('on');

    function build(){
      if (root) return;
      root = document.createElement('div'); root.id = 'gt-tour'; root.setAttribute('aria-hidden','true');
      root.innerHTML =
        '<div class="gt-catch"></div><div class="gt-spot" id="gt-spot"></div>' +
        '<div class="gt-pop" id="gt-pop" role="dialog" aria-modal="true" aria-label="' + esc(cfg.ariaLabel || 'Tour guiado') + '">' +
          '<div class="gt-top"><span id="gt-count"></span><span class="gt-dots" id="gt-dots"></span></div>' +
          '<h4 id="gt-title"></h4><p id="gt-body"></p><div class="gt-note" id="gt-note" hidden></div>' +
          '<div class="gt-foot"><button class="gt-btn gt-ghost" id="gt-skip">' + esc(L.skip) + '</button><span class="gt-sp"></span>' +
          '<button class="gt-btn" id="gt-prev">' + esc(L.prev) + '</button>' +
          '<button class="gt-btn gt-primary" id="gt-next"></button></div>' +
        '</div>';
      document.body.appendChild(root);
      spot = root.querySelector('#gt-spot'); pop = root.querySelector('#gt-pop');
      ['count','dots','title','body','note','skip','prev','next'].forEach(k => els[k] = root.querySelector('#gt-' + k));
      els.next.onclick = next; els.prev.onclick = prev; els.skip.onclick = end;
      addEventListener('resize', () => { if (isOn()){ clearTimeout(reT); reT = setTimeout(sync, 120); } });
      addEventListener('scroll', () => { if (isOn() && !syncing){ syncing = true; requestAnimationFrame(() => { syncing = false; sync(); }); } }, true);
      document.addEventListener('keydown', e => {
        if (!isOn()) return;
        if (e.key === 'Escape') end();
        else if (e.key === 'ArrowRight') next();          // Enter lo maneja el botón enfocado (evita doble avance)
        else if (e.key === 'ArrowLeft') prev();
      });
    }
    function resolve(t){ if (!t) return null; return typeof t === 'function' ? t() : document.querySelector(t); }
    function at(n){
      i = n; const st = steps[n];
      if (st.view && cfg.onNavigate) cfg.onNavigate(st.view);
      if (typeof st.on === 'function') st.on();
      els.count.textContent = (n + 1) + ' / ' + steps.length;
      els.dots.innerHTML = steps.map((_, k) => '<i class="' + (k === n ? 'on' : '') + '"></i>').join('');
      els.title.textContent = st.title || ''; els.body.textContent = st.body || '';
      const nt = st.note;
      if (nt){
        const tone = nt.tone || (nt.kind === 'real' ? 'ok' : nt.kind === 'demo' ? 'warn' : 'info');
        els.note.hidden = false; els.note.className = 'gt-note ' + tone;
        els.note.textContent = (nt.prefix != null ? nt.prefix : (tone === 'ok' ? '✓ ' : tone === 'warn' ? '◐ ' : 'ℹ ')) + nt.text;
      } else els.note.hidden = true;
      els.prev.disabled = n === 0;
      els.next.textContent = n === steps.length - 1 ? L.done : L.next;
      requestAnimationFrame(() => requestAnimationFrame(() => place(st)));    // deja asentar el cambio de vista/layout
    }
    function place(st){
      curEl = resolve(st.target);
      if (!curEl){                                                            // sin objetivo → tarjeta centrada, sin foco
        spot.style.opacity = '0';
        pop.style.left = Math.round(innerWidth/2 - pop.offsetWidth/2) + 'px';
        pop.style.top  = Math.round(innerHeight/2 - pop.offsetHeight/2) + 'px';
        return;
      }
      curEl.scrollIntoView({ block:'center', behavior: RM ? 'auto' : 'smooth' });
      requestAnimationFrame(sync);
    }
    function sync(){
      if (!curEl) return;
      const r = curEl.getBoundingClientRect();
      spot.style.opacity = '1';
      spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px';
      spot.style.width = (r.width + pad*2) + 'px'; spot.style.height = (r.height + pad*2) + 'px';
      const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 16; let left, top;
      if (r.right + gap + pw < innerWidth - 8){ left = r.right + gap; top = clamp(r.top, 8, innerHeight - ph - 8); }        // derecha
      else if (r.left - gap - pw > 8){ left = r.left - gap - pw; top = clamp(r.top, 8, innerHeight - ph - 8); }            // izquierda
      else if (r.bottom + gap + ph < innerHeight - 8){ top = r.bottom + gap; left = clamp(r.left, 8, innerWidth - pw - 8); } // debajo
      else { top = Math.max(8, r.top - gap - ph); left = clamp(r.left, 8, innerWidth - pw - 8); }                          // encima
      pop.style.left = Math.round(left) + 'px'; pop.style.top = Math.round(top) + 'px';
    }
    function start(n){
      build(); opener = document.activeElement;
      root.classList.add('on'); root.setAttribute('aria-hidden','false');
      at(n || 0); els.next.focus(); if (cfg.onStart) cfg.onStart();
    }
    function end(){
      if (!isOn()) return;
      root.classList.remove('on'); root.setAttribute('aria-hidden','true'); curEl = null;
      if (cfg.storageKey) { try { localStorage.setItem(cfg.storageKey, 'done'); } catch (e) {} }
      if (opener && opener.focus) opener.focus(); if (cfg.onEnd) cfg.onEnd();
    }
    function next(){ if (i >= steps.length - 1) end(); else at(i + 1); }
    function prev(){ if (i > 0) at(i - 1); }

    // autoarranque en la 1ª visita (si hay storageKey y no está 'done')
    if (cfg.autoStart !== false){
      let seen = false;
      if (cfg.storageKey) { try { seen = localStorage.getItem(cfg.storageKey) === 'done'; } catch (e) {} }
      if (!seen) setTimeout(() => start(0), cfg.autoDelay != null ? cfg.autoDelay : 700);
    }
    // resync(): re-resuelve el target del paso actual (por si su panel se reconstruyó) y re-posiciona
    // el foco SIN re-scrollear. Añadido para hosts con paneles dinámicos (mrotycoon). — vendored ext.
    function resync(){ if (!isOn()) return; const st = steps[i]; if (!st) return; const el = resolve(st.target); if (el !== curEl) curEl = el; if (curEl) sync(); }
    return { start: () => start(0), startAt: start, next, prev, end, isOpen: isOn, steps, resync };
  }

  global.GuidedTour = { create, tooltips, reduceMotion: RM };
})(window);
