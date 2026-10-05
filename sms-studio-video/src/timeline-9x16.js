/* 9:16 master timeline (1080×1920) — mobile-first composition, desktop-first story.

   Two real instances of the app run side by side:
     D — the device: a desktop monitor (1280×800), later desktop → laptop → phone,
         always shown whole.
     Z — the magnifier: the same desktop layout in the same state, shown inside a lens
         card at 1.6–3× so the desktop UI stays readable on a phone.
   No simulated interfaces: everything inside a screen or a lens is the real app.
   The engine (forward-only seek, captions, typing, app-state sync) is shared via kit.js. */
(async function () {
  const $ = (id) => document.getElementById(id);
  const BRAND = Kit.initGsap();
  const CAM = 'sine.inOut';
  const FPS = 30;
  const SW = 1080, SH = 1920;
  const VW = 1280, VH = 800;                  // desktop viewport of both instances

  /* =====================================================================
     SETUP (runs once)
     ===================================================================== */
  const SRC = '../source/sms-studio.html';
  $('dFrame').style.width = VW + 'px'; $('dFrame').style.height = VH + 'px';
  $('zFrame').style.width = VW + 'px'; $('zFrame').style.height = VH + 'px';
  const D = AppBridge.create();
  await D.load($('dFrame'), SRC);
  const Z = AppBridge.create();
  await Z.load($('zFrame'), SRC);
  D.setSize(VW, VH); Z.setSize(VW, VH);
  for (const w of [400, 500, 700]) await document.fonts.load(`${w} 80px Heebo`, 'אבג abc 123');
  await document.fonts.ready;

  const DEMO = window.DEMO_TEXT;
  const N = DEMO.length;
  const ENC = Z.win.encodeSms(DEMO);          // the app's own function
  const raf = () => new Promise(r => Z.win.requestAnimationFrame(() => r()));

  /* ---------- measurements on the real app (desktop layout, 1280×800) ---------- */
  const M = {};
  M.brandImg = D.rect('.brand img');
  M.headerH = D.rect('.global-header').h;
  Z.setText(DEMO);
  await raf();
  M.ta = Z.rect('#messageInput');
  M.gen = Z.rect('.generated-container');
  M.copy = Z.rect('#copyOutputBtn');
  M.phone = Z.rect('.phone-preview');
  M.bubble = Z.rect('#smsPreview');
  M.saveImg = Z.rect('#saveImageBtn');
  M.outHTML = Z.$('#outputBox').innerHTML;   // exactly what renderOutput() produced
  try {                                       // the app's own PNG export
    const blob = await Z.win.makePng();
    $('pngImg').src = URL.createObjectURL(blob);
    await $('pngImg').decode();
  } catch (e) { console.warn('makePng failed', e); }
  // The file name the app's own saveImage() would use (date fixed for a deterministic frame).
  $('dlName').textContent = `0005_${Z.win.slug(window.DEMO_TITLE)}_2026-10-05.png`;
  Z.setText('');
  D.setSize(390, 844);                        // phone layout geometry (end of scene 7)
  await raf(); await raf();
  M.navP = D.rect('.mobile-nav button[data-view="preview"]');
  D.setSize(VW, VH);
  await raf(); await raf();

  /* ---------- geometry ---------- */
  const screenOf = (g) => ({ x: g.cx - g.W * g.k / 2, y: g.cy - g.H * g.k / 2, w: g.W * g.k, h: g.H * g.k });
  const devPt = (r, g) => { const s = screenOf(g); return { x: s.x + r.x * g.k, y: s.y + r.y * g.k, w: r.w * g.k, h: r.h * g.k, cx: s.x + (r.x + r.w / 2) * g.k, cy: s.y + (r.y + r.h / 2) * g.k }; };
  const LENS = { maxW: 960, maxH: 720, cy: 1480 };
  const lensBox = (R) => { const s = Math.min(LENS.maxW / R.rw, LENS.maxH / R.rh), w = R.rw * s, h = R.rh * s; return { s, x: 540 - w / 2, y: LENS.cy - h / 2, w, h }; };
  const lensPt = (r, R) => { const b = lensBox(R); return { x: b.x + (r.x - R.rx) * b.s, y: b.y + (r.y - R.ry) * b.s, w: r.w * b.s, h: r.h * b.s, cx: b.x + (r.x + r.w / 2 - R.rx) * b.s, cy: b.y + (r.y + r.h / 2 - R.ry) * b.s }; };

  // Devices (screen centre on stage, scale k of the real viewport) and chrome.
  const MON = { bez: 12, rad: 8, stand: 1, base: 0, notch: 0 };
  const HERO = { W: VW, H: VH, k: 0.76, cx: 540, cy: 1040, ...MON };
  const TOP = { W: VW, H: VH, k: 0.70, cx: 540, cy: 690, ...MON };
  const DESK = { W: 1920, H: 1080, k: 0.48, cx: 540, cy: 1010, ...MON };
  const LAP = { W: 1280, H: 800, k: 0.72, cx: 540, cy: 1040, bez: 16, rad: 10, stand: 0, base: 1, notch: 0 };
  const PHONE = { W: 390, H: 844, k: 1.6, cx: 540, cy: 1170, bez: 22, rad: 66, stand: 0, base: 0, notch: 1 };

  // Lens regions (css px of the desktop layout).
  const R_TYPE = { rx: M.ta.x - 10, ry: M.ta.y - 36, rw: M.ta.w + 20, rh: (M.gen.y + M.gen.h) - (M.ta.y - 36) + 10 };
  const R_BUB = { rx: M.phone.x - 4, ry: M.phone.y + 13, rw: M.phone.w + 8, rh: 304 };
  const R_OUT = { rx: M.gen.x - 10, ry: M.gen.y - 10, rw: M.gen.w + 20, rh: M.gen.h + 21 };
  const R_COPY = { rx: M.gen.x - 10, ry: M.gen.y - 10, rw: M.gen.w + 20, rh: VH - M.gen.y + 10 };   // includes the app's toast
  const R_ICONS = { rx: 14, ry: 140, rw: 320, rh: 230 };

  /* ---------- captions ---------- */
  const caption = (lines, o) => Kit.caption($('captions'), SW, lines, { x: 1000, ...o });
  const CAP = {
    c1: caption(['כל Enter,', 'שורה מיותרת.'], { y: 790, size: 132 }),
    c2: caption(['עוד ניסיון.', 'ועוד אחד.'], { y: 790, size: 132 }),
    c3: caption(['מעכשיו,', 'לא מנחשים.'], { y: 800, size: 128, white: true, center: true }),
    c4a: caption(['מנסחים...'], { y: 160, size: 110 }),
    c4b: caption(['...ורואים', 'בזמן אמת.'], { y: 120, size: 100 }),
    c5: caption(['המבנה נשמר.', 'בדיוק.'], { y: 110, size: 100 }),
    c6: caption(['מעתיקים. מדביקים.', 'נגמר.'], { y: 130, size: 100 }),
    c7: caption(['שומרים כתמונה.', 'ומשתפים.'], { y: 130, size: 100 }),
    cD: caption(['בדסקטופ.'], { y: 210, size: 128 }),
    cL: caption(['בלפטופ.'], { y: 210, size: 128 }),
    cP: caption(['בנייד.'], { y: 210, size: 128 })
  };

  /* ---------- scene schedule ---------- */
  const W2 = 5.0, s3 = 8.35, s4 = 14.6, s5 = s4 + 9.8, SPLIT = s5 + 1.5, s6 = SPLIT + 6.25;
  const CLICK = s6 + 1.55, s6b = CLICK + 3.5, s7 = s6b + 5.35, s8 = s7 + 7.5, E0 = s8 + 1.5;
  const DURATION = Math.round((E0 + 4.0) * 30) / 30;
  const TYPE_START = s4 + 1.3, TYPE_DUR = 7.8;
  const TY = Kit.typing(DEMO, TYPE_START, TYPE_DUR);

  /* ---------- scene 3: logo + title ---------- */
  const logo = $('logoImg'), title = $('logoTitle');
  logo.src = D.logoSrc;                       // extracted from .brand img in the real app
  $('endLogo').src = D.logoSrc;
  await logo.decode(); await $('endLogo').decode();
  const LOGO_W = 520, TITLE_PX = 128, TITLE_CAP = 0.86;
  logo.style.width = LOGO_W + 'px';
  const logoH = LOGO_W * (M.brandImg.h / M.brandImg.w);
  title.style.fontSize = TITLE_PX + 'px';
  title.style.lineHeight = '1.12';
  title.innerHTML = 'עורך מסרונים'.split(' ').map(w => `<span class="w" style="display:inline-block;opacity:0">${w}</span>`).join(' ');
  const titleW = title.offsetWidth, titleH = title.offsetHeight;
  const brandS = devPt(M.brandImg, HERO);
  const logoC = { x: 540 - LOGO_W / 2, y: 820 - logoH / 2, scale: 1 };
  const logoHdr = { x: brandS.x, y: brandS.y, scale: brandS.w / LOGO_W };
  const titleC = { x: 540 - titleW / 2, y: 1090 - titleH / 2, scale: 1 };
  const titleCap = { x: 1000 - titleW * TITLE_CAP, y: 150, scale: TITLE_CAP };
  const heroScr = screenOf(HERO);

  /* ---------- scene 5: written lines on top, what is sent below ---------- */
  const lines = DEMO.split('\n');
  $('spTopBody').innerHTML = lines.map(l => `<div class="sp-line">${l ? l.replace(/&/g, '&amp;').replace(/</g, '&lt;') : '&nbsp;'}</div>`).join('');
  $('spOut').innerHTML = M.outHTML;
  const breaks = [];
  { let i = 0; while (i < lines.length - 1) { let j = i + 1, run = 1; while (j < lines.length - 1 && lines[j] === '') { j++; run++; } breaks.push({ line: i, run }); i = j; } }
  const singles = breaks.filter(b => b.run % 2 === 1);   // odd runs -> a \n tag in the output
  const tokens = [...$('spOut').querySelectorAll('.output-token')];
  if (tokens.length !== singles.length || tokens.length !== (ENC.match(/\\n/g) || []).length) console.warn('token mismatch');
  const lineEls = [...$('spTopBody').querySelectorAll('.sp-line')];
  const MARK_X = 104;                         // ↵ markers sit at the line ends (left side, RTL)
  breaks.forEach((b) => {
    const r = lineEls[b.line].getBoundingClientRect();
    const m = document.createElement('div');
    m.className = 'sp-mark' + (b.run % 2 ? '' : ' dbl');
    m.textContent = b.run % 2 ? '↵' : '↵↵';
    m.style.left = MARK_X + 'px';
    m.style.top = (r.bottom - 28 - 20) + 'px';
    $('spMarks').appendChild(m);
    b.mark = m; b.y = r.bottom - 28;
  });
  const wireEls = singles.map((b, k) => {
    const tok = tokens[k];
    const tr = tok.getBoundingClientRect();
    const bx = 22 + k * 8, x0 = MARK_X, y0 = b.y, yg = tr.bottom + 11, tx = tr.left + tr.width / 2;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M${x0},${y0} H${bx + 10} Q${bx},${y0} ${bx},${y0 + 10} V${yg - 10} Q${bx},${yg} ${bx + 10},${yg} H${tx - 14} Q${tx},${yg} ${tx},${tr.bottom + 1}`);
    $('spWires').appendChild(p);
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.strokeDashoffset = String(len);
    tok.style.opacity = '0';
    return { p, len, tok, b };
  });

  /* ---------- scene 6 / 6b geometry ---------- */
  const copyS = lensPt(M.copy, R_COPY);
  const bubS = lensPt(M.bubble, R_BUB);
  const dlS = lensPt(M.saveImg, R_ICONS);
  const img = $('pngImg');
  const PNG_W = 620, PNG_H = PNG_W * img.naturalHeight / img.naturalWidth;
  $('pngCard').style.width = PNG_W + 'px';
  const pngC = { left: 540 - PNG_W / 2, top: 600 };
  const chatIc = (() => { const r = $('shChat').querySelector('.ic').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; })();
  const navPS = devPt(M.navP, PHONE);

  /* =====================================================================
     BUILD: the timeline itself (tweens only)
     ===================================================================== */
  const A0 = {                                // state of the app (both instances)
    chars: 0, focus: 0, caret: 0, copied: 0, toast: 0, toastMsg: 0, view: 1, drawer: 0, tag: 0, bub: 1, scrollY: 0,
    bContext: 0, bLibrary: 0, bEditor: 0, bPreview: 0, hNavE: 0, hNavP: 0
  };
  const G0 = { ...HERO, o: 1, co: 0, s: 1, blur: 0, pulse: 0, notchW: 150, notchH: 36 };   // device D
  const L0 = { o: 1, cs: 1, ...R_TYPE };      // lens (o/cs: the card itself; #lensLayer fades whole scenes)
  const S = {};

  function build() {
    const A = S.A = { ...A0 }, G = S.G = { ...G0 }, L = S.L = { ...L0 };
    const tl = gsap.timeline({ paused: true, defaults: { ease: BRAND, lazy: false } });
    const { ft, capIn, capOut } = Kit.tweens(tl, BRAND);
    const twA = (from, to, at, dur, ease = BRAND) => tl.fromTo(A, from, { ...to, duration: dur, ease, immediateRender: false }, at);
    const twG = (from, to, at, dur, ease = CAM) => tl.fromTo(G, from, { ...to, duration: dur, ease, immediateRender: false }, at);
    const twL = (from, to, at, dur, ease = CAM) => tl.fromTo(L, from, { ...to, duration: dur, ease, immediateRender: false }, at);
    const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k]]));
    const GEO = ['W', 'H', 'k', 'cx', 'cy', 'bez', 'rad', 'stand', 'base', 'notch'];
    const REG = ['rx', 'ry', 'rw', 'rh'];
    // Moving the lens between distant regions: shrink-fade out, jump, grow-fade in.
    const swap = (from, to, at) => {
      twL({ o: 1, cs: 1 }, { o: 0, cs: 0.94 }, at, 0.22, 'power2.in');
      twL({ ...from }, { ...to }, at + 0.22, 0.01, 'none');
      twL({ o: 0, cs: 0.94 }, { o: 1, cs: 1 }, at + 0.25, 0.45, BRAND);
    };
    const click = (ring, pt, at) => ft(ring, { x: pt.cx, y: pt.cy, scale: 0.25, opacity: 1 }, { x: pt.cx, y: pt.cy, scale: 1.25, opacity: 0, duration: 0.55, ease: 'power2.out' }, at);
    const press = (at) => {
      ft('#cursor', { scale: 1 }, { scale: 0.84, duration: 0.08, ease: 'power2.out' }, at - 0.06);
      ft('#cursor', { scale: 0.84 }, { scale: 1, duration: 0.16, ease: 'power2.out' }, at + 0.04);
    };
    const tap = (pt, at) => {
      ft('#tapDot', { x: pt.cx, y: pt.cy, scale: 0.4, opacity: 0 }, { x: pt.cx, y: pt.cy, scale: 1, opacity: 1, duration: 0.16, ease: 'power2.out' }, at);
      ft('#tapDot', { scale: 1, opacity: 1 }, { scale: 1.5, opacity: 0, duration: 0.42, ease: 'power2.out' }, at + 0.2);
    };

    /* ---------------- SCENE 1 — the pain, in words only (0–5) ---------------- */
    ft('#bg', { scale: 1 }, { scale: 1.06, duration: W2 + 1, ease: 'none' }, 0);
    capIn(CAP.c1, 0.25, { stagger: 0.1 });
    ft(CAP.c1, { scale: 1 }, { scale: 1.03, duration: 2.6, ease: 'none' }, 0.25);
    capOut(CAP.c1, 2.45);
    capIn(CAP.c2, 2.7, { stagger: 0.09 });
    tl.to(CAP.c2, { keyframes: { x: [0, -10, 9, -6, 4, -2, 0] }, duration: 0.36, ease: 'none' }, 3.75);
    ft(CAP.c2, { scale: 1 }, { scale: 1.03, duration: 1.0, ease: 'power1.out' }, 4.3);

    /* ---------------- SCENE 2 — the turn (5–8.35) ---------------- */
    tl.set('#wipe', { opacity: 1 }, 0);
    ft('#wipe', { clipPath: 'circle(0px at 540px 960px)' }, { clipPath: 'circle(1150px at 540px 960px)', duration: 0.85, ease: 'power2.in' }, W2);
    tl.set(CAP.c2, { opacity: 0 }, W2 + 0.9);
    capIn(CAP.c3, W2 + 0.95, { stagger: 0.14 });
    capOut(CAP.c3, W2 + 2.95);

    /* ---------------- SCENE 3 — the reveal (8.35–14.6) ---------------- */
    tl.fromTo(logo, { ...logoC, x: logoC.x + LOGO_W * 0.04, y: logoC.y + logoH * 0.04, scale: 0.92, opacity: 0, filter: 'blur(8px)' },
      { ...logoC, opacity: 1, filter: 'blur(0px)', duration: 0.7, immediateRender: true }, s3);
    tl.set(title, { ...titleC, opacity: 1 }, 0);
    title.querySelectorAll('.w').forEach((w, i) => ft(w, { opacity: 0, y: 20, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.62 }, s3 + 0.6 + i * 0.14));
    // The blue screen collapses into the monitor's header bar; the logo flies into it,
    // the title becomes the caption; the monitor's frame forms around the real app.
    const MORPH = s3 + 2.1, MD = 0.95;
    tl.set('#devLayer', { opacity: 1 }, MORPH);
    tl.set('#headerBlue', { opacity: 0 }, 0);
    tl.set('#wipe', { opacity: 0 }, MORPH);
    tl.set('#headerBlue', { opacity: 1 }, MORPH);
    ft('#headerBlue', { left: 0, top: 0, width: SW, height: SH, borderRadius: '0px 0px 0px 0px' },
      { left: heroScr.x, top: heroScr.y, width: heroScr.w, height: M.headerH * HERO.k, borderRadius: `${HERO.rad}px ${HERO.rad}px 0px 0px`, duration: MD, ease: 'power3.inOut' }, MORPH);
    ft(logo, { ...logoC }, { ...logoHdr, duration: MD, ease: 'power3.inOut' }, MORPH);
    // The title steps aside as the screen collapses, then settles as the caption.
    ft(title.querySelectorAll('.w'), { opacity: 1, y: 0, filter: 'blur(0px)' }, { opacity: 0, y: -14, filter: 'blur(5px)', duration: 0.25, ease: 'power2.in', stagger: 0.03 }, MORPH);
    tl.set(title, { ...titleCap, color: '#2D3396' }, MORPH + 0.32);
    title.querySelectorAll('.w').forEach((w, i) => ft(w, { opacity: 0, y: 20, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.62 }, MORPH + 0.55 + i * 0.12));
    ft('#logoLayer', { opacity: 1 }, { opacity: 0, duration: 0.2, ease: 'none' }, MORPH + MD + 0.02);
    twG({ co: 0 }, { co: 1 }, MORPH + 0.35, 0.6, 'power1.out');
    twA({ bContext: 0 }, { bContext: 1 }, MORPH + 0.6, 0.6);
    twA({ bLibrary: 0 }, { bLibrary: 1 }, MORPH + 0.8, 0.65);
    twA({ bEditor: 0 }, { bEditor: 1 }, MORPH + 1.0, 0.65);
    twA({ bPreview: 0 }, { bPreview: 1 }, MORPH + 1.2, 0.65);
    twG({ cy: HERO.cy }, { cy: HERO.cy - 14 }, MORPH + 1.9, s4 - MORPH - 1.9, 'none');

    /* ---------------- SCENE 4 — writing (14.6–24.4) ---------------- */
    ft(title.querySelectorAll('.w'), { opacity: 1, y: 0, filter: 'blur(0px)' }, { opacity: 0, y: -14, filter: 'blur(5px)', duration: 0.3, ease: 'power2.in', stagger: 0.03 }, s4);
    twG({ ...pick(HERO, GEO), cy: HERO.cy - 14 }, pick(TOP, GEO), s4, 0.9);
    ft('#lensLayer', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none' }, s4 + 0.55);
    twL({ cs: 0.92 }, { cs: 1 }, s4 + 0.55, 0.6, BRAND);
    twA({ focus: 0, caret: 0 }, { focus: 1, caret: 1 }, s4 + 1.0, 0.01, 'none');
    twA({ chars: 0 }, { chars: N }, TYPE_START, TYPE_DUR, TY.ease);
    capIn(CAP.c4a, s4 + 1.4);
    capOut(CAP.c4a, s4 + 4.6);
    swap(R_TYPE, R_BUB, s4 + 4.75);                          // the preview phone shows it live
    capIn(CAP.c4b, s4 + 5.2);
    capOut(CAP.c4b, s4 + 9.5);

    /* ---------------- SCENE 5 — the magic (24.4–32.15) ---------------- */
    twA({ focus: 1, caret: 1 }, { focus: 0, caret: 0 }, s5, 0.01, 'none');
    swap(R_BUB, R_OUT, s5);
    ft(['#devLayer', '#lensLayer'], { opacity: 1, scale: 1, filter: 'blur(0px)' }, { opacity: 0, scale: 0.97, filter: 'blur(10px)', duration: 0.55, ease: 'power2.in' }, SPLIT);
    ft('#split', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none' }, SPLIT + 0.2);
    ft('#spTop', { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65 }, SPLIT + 0.25);
    ft('#spBottom', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65 }, SPLIT + 0.35);
    breaks.forEach((b, i) => ft(b.mark, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4 }, SPLIT + 0.6 + i * 0.05));
    const POP0 = SPLIT + 1.2, POP_GAP = 0.56;
    wireEls.forEach((w, k) => {
      const at = POP0 + k * POP_GAP;
      ft(lineEls[w.b.line], { backgroundColor: 'rgba(95,154,229,0)' }, { backgroundColor: 'rgba(95,154,229,0.13)', duration: 0.3, ease: 'none' }, at - 0.05);
      ft(w.b.mark, { scale: 1, backgroundColor: '#E6EFFC', color: '#5F9AE5' }, { scale: 1.12, backgroundColor: '#5F9AE5', color: '#FFFFFF', duration: 0.25 }, at - 0.05);
      ft(w.p, { strokeDashoffset: w.len }, { strokeDashoffset: 0, duration: 0.42, ease: 'power2.inOut' }, at);
      ft(w.tok, { opacity: 0, scale: 0.35 }, { opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(3)' }, at + 0.37);
      ft(w.tok, { boxShadow: '0 0 0 0px rgba(95,154,229,0.75)' }, { boxShadow: '0 0 0 18px rgba(95,154,229,0)', duration: 0.8, ease: 'power2.out' }, at + 0.4);
      ft(w.b.mark, { scale: 1.12 }, { scale: 1, duration: 0.3 }, at + 0.35);
    });
    capIn(CAP.c5, SPLIT + 3.8);
    capOut(CAP.c5, SPLIT + 6.25);

    /* ---------------- SCENE 6 — copy (32.15–37.2) ---------------- */
    ft('#split', { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power2.in' }, s6);
    tl.set(L, { ...R_COPY }, s6 + 0.1);
    ft(['#devLayer', '#lensLayer'], { opacity: 0, scale: 1.03, filter: 'blur(8px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.6 }, s6 + 0.2);
    ft('#cursor', { x: 860, y: 1900, opacity: 0 }, { x: copyS.cx - 8, y: copyS.cy - 6, opacity: 1, duration: 0.85 }, s6 + 0.6);
    press(CLICK);
    click('#clickRing', copyS, CLICK);
    twA({ copied: 0 }, { copied: 1 }, CLICK + 0.02, 0.01, 'none');      // the app's own "הועתק ✓"
    ft('#copyBurst', { left: copyS.x, top: copyS.y, width: copyS.w, height: copyS.h, opacity: 0.95 },
      { left: copyS.x - 22, top: copyS.y - 22, width: copyS.w + 44, height: copyS.h + 44, opacity: 0, duration: 0.6, ease: 'power2.out' }, CLICK + 0.03);
    twA({ toast: 0 }, { toast: 1 }, CLICK + 0.05, 0.3);
    twA({ toast: 1 }, { toast: 0 }, CLICK + 1.3, 0.2, 'power1.in');
    ft('#cursor', { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'none' }, CLICK + 0.35);
    capIn(CAP.c6, 0, { times: [CLICK + 0.1, CLICK + 1.0, CLICK + 1.95] });
    capOut(CAP.c6, CLICK + 3.45);
    // ...and the message arrives on the preview phone, exactly as written.
    swap(R_COPY, R_BUB, CLICK + 0.85);
    twA({ bub: 1 }, { bub: 0 }, CLICK + 0.85, 0.01, 'none');
    twA({ copied: 1 }, { copied: 0 }, CLICK + 1.0, 0.01, 'none');
    twA({ bub: 0 }, { bub: 1 }, CLICK + 1.6, 0.55);
    ft('#checkBadge', { left: bubS.x - 40, top: bubS.y + bubS.h - 44, scale: 0, opacity: 0 },
      { left: bubS.x - 40, top: bubS.y + bubS.h - 44, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)' }, CLICK + 1.95);

    /* ---------------- SCENE 6b — save as image, share (37.2–42.55) ---------------- */
    ft('#checkBadge', { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'none' }, s6b);
    swap(R_BUB, R_ICONS, s6b);
    capIn(CAP.c7, 0, { times: [s6b + 1.3, s6b + 1.42, s6b + 2.7] });
    capOut(CAP.c7, s6b + 5.0);
    ft('#cursor', { x: 860, y: 1900, opacity: 0, scale: 1 }, { x: dlS.cx - 8, y: dlS.cy - 6, opacity: 1, duration: 0.65 }, s6b + 0.55);
    press(s6b + 1.25);
    click('#skyRing', dlS, s6b + 1.25);
    ft('#lensLayer', { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power2.in' }, s6b + 1.4);
    ft('#devLayer', { opacity: 1 }, { opacity: 0.22, duration: 0.45, ease: 'power1.out' }, s6b + 1.4);
    // The app's own exported image (makePng), saved under the app's own file name.
    ft('#pngCard', { left: dlS.cx - PNG_W / 2, top: dlS.cy - PNG_H / 2, scale: 0.1, rotation: 0, opacity: 0 },
      { left: pngC.left, top: pngC.top, scale: 1, rotation: -2.5, opacity: 1, duration: 0.65 }, s6b + 1.45);
    ft('#dlChip', { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, s6b + 1.75);
    ft('#shareSheet', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, s6b + 2.45);
    ft('#cursor', { x: dlS.cx - 8, y: dlS.cy - 6 }, { x: chatIc.cx - 8, y: chatIc.cy - 6, duration: 0.6 }, s6b + 2.85);
    press(s6b + 3.5);
    click('#skyRing', chatIc, s6b + 3.5);
    ft('#pngCard', { left: pngC.left, top: pngC.top, scale: 1, rotation: -2.5, opacity: 1 },
      { left: chatIc.cx - PNG_W / 2, top: chatIc.cy - PNG_H / 2, scale: 0.12, rotation: 0, opacity: 0, duration: 0.55, ease: 'power3.in' }, s6b + 3.6);
    ft('#sentPill', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)' }, s6b + 4.05);
    ft('#cursor', { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'none' }, s6b + 3.8);
    ft(['#dlChip', '#shareSheet', '#sentPill'], { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power2.in' }, s6b + 5.0);

    /* ---------------- SCENE 7 — desktop → laptop → phone (42.55–50.05) ---------------- */
    ft('#devLayer', { opacity: 0.22 }, { opacity: 1, duration: 0.5, ease: 'power1.out' }, s7);
    twG(pick(TOP, GEO), pick(DESK, GEO), s7, 0.9);
    capIn(CAP.cD, s7 + 0.5);
    capOut(CAP.cD, s7 + 2.15);
    const MORPH_EASE = 'power3.inOut';
    const T1 = s7 + 2.25, T1D = 1.1;                         // no breakpoint: the desktop layout reflows
    twG(pick(DESK, GEO), pick(LAP, GEO), T1, T1D, MORPH_EASE);
    capIn(CAP.cL, s7 + 3.1);
    capOut(CAP.cL, s7 + 4.45);
    const T2 = s7 + 4.55, T2D = 1.1;                         // crosses 1200px and 900px: masked by a pulse
    twG(pick(LAP, GEO), pick(PHONE, GEO), T2, T2D, MORPH_EASE);
    const xa = Kit.crossTime(T2, T2D, LAP.W, PHONE.W, 1199.5, MORPH_EASE);
    const xb = Kit.crossTime(T2, T2D, LAP.W, PHONE.W, 899.5, MORPH_EASE);
    twG({ pulse: 0 }, { pulse: 1 }, xa - 0.16, 0.16, 'power2.in');
    twG({ pulse: 1 }, { pulse: 0 }, xb, 0.3, 'power2.out');
    capIn(CAP.cP, s7 + 5.4);
    capOut(CAP.cP, s7 + 7.3);
    // Phone: writing view, then preview — bottom nav highlighted on each switch.
    twA({ hNavE: 0 }, { hNavE: 1 }, s7 + 5.75, 0.75, 'power1.out');
    tap(navPS, s7 + 6.35);
    twA({ view: 1 }, { view: 2 }, s7 + 6.5, 0.01, 'none');
    twA({ hNavP: 0 }, { hNavP: 1 }, s7 + 6.5, 0.75, 'power1.out');

    /* ---------------- SCENE 8 — montage + end card (50.05–end) ---------------- */
    const punch = (at) => twG({ s: 0.965 }, { s: 1 }, at, 0.4, BRAND);
    twA({ view: 2, drawer: 0 }, { view: 1, drawer: 1 }, s8, 0.01, 'none');            // versions
    punch(s8);
    twA({ view: 1, drawer: 1, tag: 0 }, { view: 0, drawer: 0, tag: 1 }, s8 + 0.5, 0.01, 'none');   // tags
    punch(s8 + 0.5);
    twA({ tag: 1 }, { tag: 0 }, s8 + 1.0, 0.01, 'none');                               // serial numbers
    punch(s8 + 1.0);
    tl.set('#endWipe', { opacity: 1 }, 0);
    ft('#endWipe', { clipPath: 'circle(0px at 540px 1170px)' }, { clipPath: 'circle(1300px at 540px 1170px)', duration: 0.6, ease: 'power2.in' }, E0);
    tl.set('#devLayer', { opacity: 0 }, E0 + 0.62);
    tl.set('#endcard', { opacity: 1 }, E0 + 0.55);
    document.querySelectorAll('#endWords .w').forEach((w, i) => ft(w, { opacity: 0, y: 26, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.65 }, E0 + 0.65 + i * 0.42));
    ft('#endLogo', { opacity: 0, scale: 0.92, y: 16, filter: 'blur(6px)' }, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.7 }, E0 + 1.95);
    ft('#endLine', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, E0 + 2.45);
    tl.set({}, {}, DURATION);
    return tl;
  }

  /* =====================================================================
     SYNC: proxies -> devices, lens and both real app instances
     ===================================================================== */
  const PANELS = [['.context-header', 'bContext', 0, -18], ['.library', 'bLibrary', 70, 0], ['.editor', 'bEditor', 0, 46], ['.preview', 'bPreview', -70, 0]];
  const syncD = Kit.makeAppSync({ B: D, text: DEMO, typing: TY, panels: PANELS,
    halos: [['navE', '.mobile-nav button[data-view="editor"]', 'hNavE'], ['navP', '.mobile-nav button[data-view="preview"]', 'hNavP']] });
  const syncZ = Kit.makeAppSync({ B: Z, text: DEMO, typing: TY, panels: PANELS });
  const el = Object.fromEntries(['devD', 'dNeck', 'dFoot', 'dBase', 'dBody', 'dScreen', 'dWrap', 'dNotch', 'lensLayer', 'lensCone', 'lensHi', 'lensCard', 'zWrap', 'lensPoly', 'lensL1', 'lensL2'].map(id => [id, $(id)]));
  const px = (v) => v.toFixed(2) + 'px';
  const box = (e, x, y, w, h) => { e.style.left = px(x); e.style.top = px(y); e.style.width = px(w); e.style.height = px(h); };

  function sync(t) {
    const { A, G, L } = S;
    // Real apps first (layout), then everything positioned around them.
    syncD({ ...A, W: G.W, H: G.H }, t);
    if (parseFloat(el.lensLayer.style.opacity || getComputedStyle(el.lensLayer).opacity) > 0) syncZ({ ...A, W: VW, H: VH }, t);

    // Device D: screen, bezel, monitor stand / laptop base / phone notch.
    const sc = screenOf(G), bz = G.bez;
    box(el.dScreen, sc.x, sc.y, sc.w, sc.h);
    el.dScreen.style.borderRadius = px(G.rad);
    el.dWrap.style.width = G.W + 'px'; el.dWrap.style.height = G.H + 'px';
    el.dWrap.style.transform = `scale(${G.k.toFixed(5)})`;
    box(el.dBody, sc.x - bz, sc.y - bz, sc.w + 2 * bz, sc.h + 2 * bz);
    el.dBody.style.borderRadius = px(G.rad + bz);
    el.dBody.style.opacity = String(G.co);
    const neckW = 0.12 * sc.w, neckH = 0.10 * sc.h, footW = 0.40 * sc.w;
    box(el.dNeck, G.cx - neckW / 2, sc.y + sc.h + bz - 2, neckW, neckH);
    box(el.dFoot, G.cx - footW / 2, sc.y + sc.h + bz - 2 + neckH, footW, 16);
    el.dNeck.style.opacity = el.dFoot.style.opacity = String(G.co * G.stand);
    const baseW = (sc.w + 2 * bz) * 1.1, baseH = 0.042 * sc.w;
    box(el.dBase, G.cx - baseW / 2, sc.y + sc.h + bz - 2, baseW, baseH);
    el.dBase.style.opacity = String(G.co * G.base);
    box(el.dNotch, G.cx - G.notchW / 2, sc.y - 1, G.notchW, G.notchH);
    el.dNotch.style.borderRadius = `0 0 ${px(G.notchH * 0.6)} ${px(G.notchH * 0.6)}`;
    el.dNotch.style.opacity = String(G.co * G.notch);
    el.devD.style.transformOrigin = `${px(G.cx)} ${px(G.cy)}`;
    const dScale = G.s * (1 - 0.035 * G.pulse);
    el.devD.style.transform = dScale !== 1 ? `scale(${dScale.toFixed(5)})` : '';
    const blur = G.blur + 7 * G.pulse;
    el.devD.style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : '';

    // Lens: magnified region of the second instance, linked to the same region on the monitor.
    const lb = lensBox(L);
    const cw = lb.w * L.cs, ch = lb.h * L.cs, cx0 = 540 - cw / 2, cy0 = LENS.cy - ch / 2;
    box(el.lensCard, cx0, cy0, cw, ch);
    el.lensCard.style.opacity = el.lensHi.style.opacity = el.lensCone.style.opacity = String(L.o);
    el.zWrap.style.transform = `scale(${L.cs.toFixed(5)}) translate(${px(-L.rx * lb.s)}, ${px(-L.ry * lb.s)}) scale(${lb.s.toFixed(5)})`;
    const hi = devPt({ x: L.rx, y: L.ry, w: L.rw, h: L.rh }, G);
    box(el.lensHi, hi.x - 3, hi.y - 3, hi.w + 6, hi.h + 6);
    const hb = hi.y + hi.h + 3;
    el.lensPoly.setAttribute('points', `${hi.x - 3},${hb} ${hi.x + hi.w + 3},${hb} ${cx0 + cw},${cy0} ${cx0},${cy0}`);
    [[el.lensL1, hi.x - 3, cx0], [el.lensL2, hi.x + hi.w + 3, cx0 + cw]].forEach(([ln, x1, x2]) => {
      ln.setAttribute('x1', x1); ln.setAttribute('y1', hb); ln.setAttribute('x2', x2); ln.setAttribute('y2', cy0);
    });
  }

  /* =====================================================================
     SEEK
     ===================================================================== */
  const scenes = [
    { t: 0, name: '1 · הכאב' }, { t: W2, name: '2 · המפנה' }, { t: s3, name: '3 · החשיפה' },
    { t: s4, name: '4 · כתיבה' }, { t: s5, name: '5 · הקסם' }, { t: s6, name: '6 · העתקה' },
    { t: s6b, name: '7 · תמונה ושיתוף' }, { t: s7, name: '8 · דסקטופ ← נייד' }, { t: s8, name: '9 · סיום' }
  ];
  const seekCtl = Kit.installSeek({
    stageEl: $('stage'), build, sync, duration: DURATION, fps: FPS, scenes,
    debug: { get A() { return S.A; }, get G() { return S.G; }, get L() { return S.L; }, M, ENC, D, Z }
  });

  // Warm-up: paint a later frame once so frame 0 is rasterized the same way as every other frame.
  window.seek(1);
  await raf(); await raf();
  window.seek(0);
  await raf(); await raf();
  seekCtl.hideVeil($('veil'));
  window.__ready = true;
  window.dispatchEvent(new Event('stage-ready'));
})().catch(e => { console.error(e); window.__error = String(e && e.stack || e); });
