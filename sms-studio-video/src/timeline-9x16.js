/* 9:16 master timeline (1080×1920) — same story as the 16:9 cut, composed for phones:
   a caption band on top, the real app in its mobile layout inside an "app card",
   a top/bottom split in scene 5, and the three devices stacked in the frame.
   The engine (forward-only seek, sync, captions, typing) is shared via kit.js. */
(async function () {
  const $ = (id) => document.getElementById(id);
  const BRAND = Kit.initGsap();
  const CAM = 'sine.inOut';
  const FPS = 30;
  const DURATION = 55.9;
  const SW = 1080, SH = 1920;

  /* =====================================================================
     SETUP (runs once)
     ===================================================================== */
  Legacy.build($('legacy'), { portrait: true });
  const taBox = (() => { const r = Legacy.ta.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })();
  const VW = 390, VH = 700;                   // the app's mobile viewport inside the card
  $('appFrame').style.width = VW + 'px';
  $('appFrame').style.height = VH + 'px';
  const B = await AppBridge.load($('appFrame'), '../source/sms-studio.html');
  B.setSize(VW, VH);
  for (const w of [400, 500, 700]) await document.fonts.load(`${w} 80px Heebo`, 'אבג abc 123');
  for (const w of [400, 700]) await document.fonts.load(`${w} 20px Arimo`, 'אבג abc 123');
  await document.fonts.ready;

  const DEMO = window.DEMO_TEXT;
  const N = DEMO.length;
  const ENC = B.win.encodeSms(DEMO);          // the app's own function
  const raf = () => new Promise(r => B.win.requestAnimationFrame(() => r()));

  /* ---------- the app card ---------- */
  const S0 = 2.15;                            // card scale: 390 css px -> 838.5 stage px
  const CARD = { x: (SW - VW * S0) / 2, y: 350, w: VW * S0, h: VH * S0, r: 46 };
  const camFull = { cx: VW / 2, cy: VH / 2, s: S0 };
  const toCard = (r, c, card = CARD) => ({
    x: card.x + card.w / 2 + (r.x - c.cx) * c.s, y: card.y + card.h / 2 + (r.y - c.cy) * c.s, w: r.w * c.s, h: r.h * c.s,
    cx: card.x + card.w / 2 + (r.cx - c.cx) * c.s, cy: card.y + card.h / 2 + (r.cy - c.cy) * c.s });
  const toDev = (r, W, H, k, dx, dy) => ({ x: 540 + dx + (r.x - W / 2) * k, y: 960 + dy + (r.y - H / 2) * k, w: r.w * k, h: r.h * k,
    cx: 540 + dx + (r.cx - W / 2) * k, cy: 960 + dy + (r.cy - H / 2) * k });
  const shift = (r, dy) => ({ ...r, y: r.y + dy, cy: r.cy + dy });

  /* ---------- measurements on the real app (mobile layout) ---------- */
  const M = {};
  M.brandImg = B.rect('.brand img');
  M.brandTitle = B.rect('.brand-title');
  M.brandTitleSize = parseFloat(B.win.getComputedStyle(B.$('.brand-title')).fontSize);
  M.headerH = B.rect('.global-header').h;
  B.setText(DEMO);
  await raf();
  M.gen = B.rect('.generated-container');
  M.out = B.rect('#outputBox');
  M.copy = B.rect('#copyOutputBtn');
  M.navE = B.rect('.mobile-nav button[data-view="editor"]');
  M.navP = B.rect('.mobile-nav button[data-view="preview"]');
  M.outHTML = B.$('#outputBox').innerHTML;   // exactly what renderOutput() produced
  M.outFont = B.win.getComputedStyle(B.$('#outputBox')).fontSize;
  M.outLine = B.win.getComputedStyle(B.$('#outputBox')).lineHeight;
  try {                                       // the app's own PNG export (closing montage)
    const blob = await B.win.makePng();
    $('pngImg').src = URL.createObjectURL(blob);
    await $('pngImg').decode();
  } catch (e) { console.warn('makePng failed', e); }
  B.win.setView('preview'); await raf();
  M.bubble = B.rect('#smsPreview');
  M.saveImg = B.rect('#saveImageBtn');
  B.win.setView('editor');
  B.setText('');
  await raf(); await raf();

  /* ---------- captions (band on top, right-aligned) ---------- */
  const caption = (lines, o) => Kit.caption($('captions'), SW, lines, { x: 1000, ...o });
  const CAP = {
    c1: caption(['כל Enter,', 'שורה מיותרת.'], { y: 140, size: 100 }),
    c2: caption(['עוד ניסיון.', 'ועוד אחד.'], { y: 140, size: 100 }),
    c3: caption(['מעכשיו,', 'לא מנחשים.'], { y: 800, size: 128, white: true, center: true }),
    c4a: caption(['מנסחים...'], { y: 150, size: 104 }),
    c4b: caption(['...ורואים', 'בזמן אמת.'], { y: 92, size: 100 }),
    c5: caption(['המבנה נשמר.', 'בדיוק.'], { y: 110, size: 100 }),
    c6: caption(['מעתיקים.', 'מדביקים.', 'נגמר.'], { y: 40, size: 92, lineHeight: '1.05' }),
    cL: caption(['במחשב.'], { y: 200, size: 128 }),
    cT: caption(['בטאבלט.'], { y: 200, size: 128 }),
    cP: caption(['בנייד.'], { y: 200, size: 128 })
  };

  /* ---------- typing schedule ---------- */
  const TYPE_START = 18.9, TYPE_DUR = 7.8;
  const TY = Kit.typing(DEMO, TYPE_START, TYPE_DUR);

  /* ---------- scene 3: logo + title ---------- */
  const logo = $('logoImg'), title = $('logoTitle');
  logo.src = B.logoSrc;                       // extracted from .brand img in the real app
  $('endLogo').src = B.logoSrc;
  await logo.decode(); await $('endLogo').decode();
  const LOGO_W = 520, TITLE_PX = 128;
  logo.style.width = LOGO_W + 'px';
  const logoH = LOGO_W * (M.brandImg.h / M.brandImg.w);
  title.style.fontSize = TITLE_PX + 'px';
  title.style.lineHeight = '1';
  title.innerHTML = 'עורך מסרונים'.split(' ').map(w => `<span class="w" style="display:inline-block;opacity:0">${w}</span>`).join(' ');
  const titleW = title.offsetWidth, titleH = title.offsetHeight;
  const brandS = toCard(M.brandImg, camFull), brandT = toCard(M.brandTitle, camFull);
  const logoC = { x: 540 - LOGO_W / 2, y: 790 - logoH / 2, scale: 1 };
  const logoHdr = { x: brandS.x, y: brandS.y, scale: brandS.w / LOGO_W };
  const tK = (M.brandTitleSize * S0) / TITLE_PX;
  const titleC = { x: 540 - titleW / 2, y: 1080 - titleH / 2, scale: 1 };
  const titleHdr = { x: brandT.x + brandT.w - titleW * tK, y: brandT.cy - (titleH * tK) / 2, scale: tK };

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
    const d = `M${x0},${y0} H${bx + 10} Q${bx},${y0} ${bx},${y0 + 10} V${yg - 10} Q${bx},${yg} ${bx + 10},${yg} H${tx - 14} Q${tx},${yg} ${tx},${tr.bottom + 1}`;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    $('spWires').appendChild(p);
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.strokeDashoffset = String(len);
    tok.style.opacity = '0';
    return { p, len, tok, b };
  });

  /* ---------- scene 6 geometry ---------- */
  const SCROLL = 120;                         // the page scrolls so the output box sits mid-screen
  // Close framing: the top edge falls above the panel title, the bottom just above the nav,
  // so the app's toast (fixed above the nav) stays in frame.
  const camCopy = { cx: VW / 2, cy: 13 + CARD.h / 2 / 2.4, s: 2.4 };
  const camGen = camCopy;
  const copyS = toCard(shift(M.copy, -SCROLL), camCopy);
  const outS = toCard(shift(M.out, -SCROLL), camCopy);
  const fly = $('flyCard');
  fly.innerHTML = M.outHTML;
  fly.style.width = M.out.w + 'px';
  fly.style.fontSize = M.outFont;
  fly.style.lineHeight = M.outLine;
  const flyEndScale = (taBox.w - 24) / M.out.w;
  const bubS = toCard(M.bubble, camFull);

  /* ---------- scene 7/8 geometry ---------- */
  const PH = { W: 390, H: 844, k: 1.6, dx: 0, dy: 230 };
  const navPDev = toDev(M.navP, PH.W, PH.H, PH.k, PH.dx, PH.dy);
  navPDev.cy += (PH.H - VH) * PH.k;           // the nav sits at the bottom of the taller phone viewport
  const camSaveImg = { cx: VW / 2, cy: VH / 2, s: S0 };
  const sImg = toCard(M.saveImg, camSaveImg);
  const pngW = 600;
  $('pngCard').style.width = pngW + 'px';

  /* =====================================================================
     BUILD: the timeline itself (tweens only)
     ===================================================================== */
  const P0 = {
    legacyT: 0, clockMin: 0, clockSec: 0, legacyMode: 0, pasteText: 0, pasteLines: 0,
    chars: 0, focus: 0, caret: 0, copied: 0, toast: 0, view: 1, drawer: 0, tag: 0,
    W: VW, H: VH, devMode: 0, devK: 0.66, devX: 0, devY: 0, scrollY: 0,
    cardOn: 1, cardX: CARD.x, cardY: CARD.y, cardW: CARD.w, cardH: CARD.h, cardR: CARD.r,
    clipOn: 0, clipT: 0, clipR: 0, clipB: 0, clipL: 0, clipRad: 0,
    bub: 1, pulse: 0, rigS: 1, rigO: 0, rigBlur: 0,
    bContext: 0, bEditor: 0, bNav: 0,
    hSave: 0, hNavE: 0, hNavP: 0, hSaveImg: 0
  };
  const DEV0 = { on: 0, bezel: 18, radius: 12, base: 1, notch: 0, notchW: 180, notchH: 40 };
  const S = {};

  function build() {
    const P = S.P = { ...P0 }, cam = S.cam = { ...camFull }, dev = S.dev = { ...DEV0 };
    const tl = gsap.timeline({ paused: true, defaults: { ease: BRAND, lazy: false } });
    const { ft, capIn, capOut } = Kit.tweens(tl, BRAND);
    const set = (vals, at) => tl.set(P, vals, at);
    const tw = (from, to, at, dur, ease = BRAND) => tl.fromTo(P, from, { ...to, duration: dur, ease, immediateRender: false }, at);
    const camSet = (to, at) => tl.set(cam, to, at);
    const camTw = (from, to, at, dur, ease = CAM) => tl.fromTo(cam, from, { ...to, duration: dur, ease, immediateRender: false }, at);
    const tap = (pt, at, dur = 0.42) => {
      ft('#tapDot', { x: pt.cx, y: pt.cy, scale: 0.4, opacity: 0 }, { x: pt.cx, y: pt.cy, scale: 1, opacity: 1, duration: 0.16, ease: 'power2.out' }, at);
      ft('#tapDot', { scale: 1, opacity: 1 }, { scale: 1.5, opacity: 0, duration: dur, ease: 'power2.out' }, at + 0.2);
    };

    /* ---------------- SCENE 1 — the pain (0–8) ---------------- */
    tl.fromTo('#legacyLayer', { opacity: 1, scale: 1.035 }, { scale: 1, duration: 1.4, ease: 'power2.out', immediateRender: true }, 0);
    tw({ legacyT: 0 }, { legacyT: 8 }, 0, 8, 'none');
    tw({ clockMin: 0, clockSec: 0 }, { clockMin: 46, clockSec: 360 * 16 }, 0, 8, 'power3.in');
    capIn(CAP.c1, 0.7);
    capOut(CAP.c1, 2.85);
    capIn(CAP.c2, 3.1);

    /* ---------------- SCENE 2 — the turn (8–12) ---------------- */
    ft('#flash', { opacity: 0.55 }, { opacity: 0, duration: 0.45, ease: 'power2.out' }, 8.0);
    ft('#legacyLayer', { filter: 'grayscale(0) brightness(1)', scale: 1 },
      { filter: 'grayscale(1) brightness(0.93)', scale: 1.03, duration: 1.2, ease: 'power1.out' }, 8.0);
    ft(CAP.c2, { scale: 1 }, { scale: 1.02, duration: 1.2, ease: 'power1.out' }, 8.0);
    tl.set('#wipe', { opacity: 1 }, 0);
    ft('#wipe', { clipPath: 'circle(0px at 540px 960px)' }, { clipPath: 'circle(1150px at 540px 960px)', duration: 0.85, ease: 'power2.in' }, 8.5);
    tl.set('#legacyLayer', { opacity: 0 }, 9.4);
    tl.set(CAP.c2, { opacity: 0 }, 9.4);
    capIn(CAP.c3, 9.45, { stagger: 0.14 });
    capOut(CAP.c3, 11.45);

    /* ---------------- SCENE 3 — the reveal (12–18) ---------------- */
    tl.fromTo(logo, { ...logoC, x: logoC.x + LOGO_W * 0.04, y: logoC.y + logoH * 0.04, scale: 0.92, opacity: 0, filter: 'blur(8px)' },
      { ...logoC, opacity: 1, filter: 'blur(0px)', duration: 0.7, immediateRender: true }, 11.85);
    tl.set(title, { ...titleC, opacity: 1 }, 0);
    title.querySelectorAll('.w').forEach((w, i) => ft(w, { opacity: 0, y: 20, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.62 }, 12.45 + i * 0.14));
    // The blue screen collapses into the header of the app card; logo and title fly into their slots.
    const MORPH = 14.15, MORPH_D = 0.9;
    tl.set('#headerBlue', { opacity: 0 }, 0);
    tl.set('#wipe', { opacity: 0 }, MORPH);
    tl.set('#headerBlue', { opacity: 1 }, MORPH);
    set({ rigO: 1 }, MORPH);
    ft('#headerBlue', { left: 0, top: 0, width: SW, height: SH, borderRadius: '0px 0px 0px 0px' },
      { left: CARD.x, top: CARD.y, width: CARD.w, height: M.headerH * S0, borderRadius: `${CARD.r}px ${CARD.r}px 0px 0px`, duration: MORPH_D, ease: 'power3.inOut' }, MORPH);
    ft(logo, { ...logoC }, { ...logoHdr, duration: MORPH_D, ease: 'power3.inOut' }, MORPH);
    ft(title, { ...titleC }, { ...titleHdr, duration: MORPH_D, ease: 'power3.inOut' }, MORPH);
    ft('#logoLayer', { opacity: 1 }, { opacity: 0, duration: 0.2, ease: 'none' }, MORPH + MORPH_D + 0.02);
    tw({ bContext: 0 }, { bContext: 1 }, MORPH + 0.6, 0.6);
    tw({ bEditor: 0 }, { bEditor: 1 }, MORPH + 0.85, 0.65);
    tw({ bNav: 0 }, { bNav: 1 }, MORPH + 1.1, 0.6);
    camTw(camFull, { ...camFull, s: 2.2 }, 15.95, 2.0);

    /* ---------------- SCENE 4 — writing (18–28) ---------------- */
    const camA = { cx: VW / 2, cy: CARD.h / 2 / 2.35, s: 2.35 };   // text box + output, close (top edge on the header)
    camTw({ ...camFull, s: 2.2 }, camA, 17.95, 1.35);
    set({ focus: 1, caret: 1 }, 18.55);
    tw({ chars: 0 }, { chars: N }, TYPE_START, TYPE_DUR, TY.ease);
    tw({ hSave: 0 }, { hSave: 1 }, TYPE_START + 0.1, 0.9, 'power1.out');
    capIn(CAP.c4a, 19.5);
    capOut(CAP.c4a, 22.4);
    // Switch to the preview tab while typing continues: the bubble keeps growing.
    camTw(camA, camFull, 22.0, 0.6);
    tap(toCard(M.navP, camFull), 22.62);
    set({ view: 2 }, 22.75);
    tw({ hNavP: 0 }, { hNavP: 1 }, 22.75, 0.75, 'power1.out');
    capIn(CAP.c4b, 23.0);
    capOut(CAP.c4b, 27.3);
    tap(toCard(M.navE, camFull), 27.15);
    set({ view: 1 }, 27.3);
    tw({ hNavE: 0 }, { hNavE: 1 }, 27.3, 0.75, 'power1.out');

    /* ---------------- SCENE 5 — the magic (28–36) ---------------- */
    set({ focus: 0, caret: 0 }, 27.8);
    tw({ scrollY: 0 }, { scrollY: SCROLL }, 27.95, 1.25, 'power2.inOut');
    camTw(camFull, camGen, 27.95, 1.3);
    const SPLIT = 29.35;
    ft('#appLayer', { opacity: 1, scale: 1, filter: 'blur(0px)' }, { opacity: 0, scale: 0.97, filter: 'blur(10px)', duration: 0.55, ease: 'power2.in' }, SPLIT);
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
    capIn(CAP.c5, 33.15);
    capOut(CAP.c5, 35.6);

    /* ---------------- SCENE 6 — copy (36–42.4) ---------------- */
    ft('#split', { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 35.6);
    camSet(camCopy, 35.7);
    ft('#appLayer', { opacity: 0, scale: 1.03, filter: 'blur(8px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.6 }, 35.8);
    const CLICK = 37.2;
    tap(copyS, CLICK - 0.14, 0.5);
    ft('#clickRing', { x: copyS.cx, y: copyS.cy, scale: 0.25, opacity: 1 }, { x: copyS.cx, y: copyS.cy, scale: 1.25, opacity: 0, duration: 0.55, ease: 'power2.out' }, CLICK);
    set({ copied: 2 }, CLICK + 0.02);
    ft('#copyBurst', { left: copyS.x, top: copyS.y, width: copyS.w, height: copyS.h, borderRadius: 14, opacity: 0.95 },
      { left: copyS.x - 22, top: copyS.y - 22, width: copyS.w + 44, height: copyS.h + 44, borderRadius: 30, opacity: 0, duration: 0.6, ease: 'power2.out' }, CLICK + 0.03);
    tw({ toast: 0 }, { toast: 1 }, CLICK + 0.05, 0.3);
    tw({ toast: 1 }, { toast: 0 }, 38.55, 0.2, 'power1.in');
    capIn(CAP.c6, 0, { times: [CLICK + 0.1, 39.1, 41.05] });
    capOut(CAP.c6, 42.05);

    // The text card lifts off the output box and flies into the old system.
    ft(fly, { x: outS.x, y: outS.y, scale: camCopy.s, opacity: 0, boxShadow: '0 0px 0px rgba(30,40,72,0)' },
      { x: outS.x - 6, y: outS.y - 16, scale: camCopy.s * 1.03, opacity: 1, boxShadow: '0 30px 70px rgba(30,40,72,0.28)', duration: 0.32, ease: 'power2.out' }, 38.0);
    ft(fly, { x: outS.x - 6, y: outS.y - 16, scale: camCopy.s * 1.03 }, { x: taBox.x + 12, y: taBox.y + 12, scale: flyEndScale, duration: 0.75, ease: 'power3.inOut' }, 38.32);
    ft(fly, { opacity: 1 }, { opacity: 0, duration: 0.18, ease: 'none' }, 39.07);
    ft('#appLayer', { opacity: 1, scale: 1, filter: 'blur(0px)' }, { opacity: 0, scale: 0.95, filter: 'blur(8px)', duration: 0.55, ease: 'power2.in' }, 38.05);
    set({ legacyMode: 1 }, 37.9);
    tl.set('#legacyLayer', { filter: 'grayscale(0) brightness(1)', scale: 1 }, 37.9);
    tl.set('#lgClock', { opacity: 0 }, 37.9);
    ft('#legacyLayer', { opacity: 0, x: 260 }, { opacity: 1, x: 0, duration: 0.7 }, 38.0);
    tw({ pasteText: 0 }, { pasteText: 1 }, 39.08, 0.2, 'none');
    tw({ pasteLines: 0 }, { pasteLines: 1 }, 39.15, 0.65, 'power1.out');
    ft('#legacyLayer', { opacity: 1, x: 0 }, { opacity: 0, x: -260, duration: 0.4, ease: 'power2.in' }, 40.45);

    // The real app's phone preview receives the message.
    set({ view: 2, scrollY: 0, copied: 0, bub: 0 }, 40.3);
    camSet(camFull, 40.3);
    ft('#appLayer', { opacity: 0, x: 200, scale: 1, filter: 'blur(0px)' }, { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)', duration: 0.6 }, 40.55);
    tw({ bub: 0 }, { bub: 1 }, 40.85, 0.55);
    ft('#checkBadge', { left: bubS.x - 36, top: bubS.y + bubS.h - 40, scale: 0, opacity: 0 },
      { left: bubS.x - 36, top: bubS.y + bubS.h - 40, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)' }, 41.2);
    ft(['#checkBadge', '#appLayer'], { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 42.05);

    /* ---------------- SCENE 7 — responsive (42.4–50.4) ---------------- */
    const D0 = 42.45;
    set({ devMode: 1, W: 1440, H: 900, devK: 0.66, devX: 0, devY: 60, view: 1, cardOn: 0 }, D0);
    tl.set(dev, { on: 1, bezel: 18, radius: 12, base: 1, notch: 0 }, D0);
    tl.set('#bgApp', { opacity: 1 }, D0);
    tl.set('#appLayer', { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }, D0);
    tw({ rigO: 0, rigS: 0.94, rigBlur: 6 }, { rigO: 1, rigS: 1, rigBlur: 0 }, D0, 0.7);
    tw({ devK: 0.66 }, { devK: 0.675 }, D0 + 0.7, 1.7, 'none');
    capIn(CAP.cL, D0 + 0.5);
    capOut(CAP.cL, 44.8);
    const MORPH_EASE = 'power3.inOut';
    // Laptop -> tablet (crosses the 1200px breakpoint).
    const T1 = 44.9, T1D = 1.1;
    tw({ W: 1440, H: 900, devK: 0.675, devY: 60 }, { W: 1024, H: 768, devK: 0.92, devY: 80 }, T1, T1D, MORPH_EASE);
    tl.fromTo(dev, { bezel: 18, radius: 12, base: 1 }, { bezel: 24, radius: 30, base: 0, duration: T1D, ease: MORPH_EASE, immediateRender: false }, T1);
    const x1 = Kit.crossTime(T1, T1D, 1440, 1024, 1199.5, MORPH_EASE);
    tw({ pulse: 0 }, { pulse: 1 }, x1 - 0.16, 0.16, 'power2.in');
    tw({ pulse: 1 }, { pulse: 0 }, x1, 0.28, 'power2.out');
    capIn(CAP.cT, 45.75);
    capOut(CAP.cT, 47.05);
    // Tablet -> phone (crosses the 900px breakpoint).
    const T2 = 47.15, T2D = 1.1;
    tw({ W: 1024, H: 768, devK: 0.92, devY: 80 }, { W: PH.W, H: PH.H, devK: PH.k, devY: PH.dy }, T2, T2D, MORPH_EASE);
    tl.fromTo(dev, { bezel: 24, radius: 30, notch: 0 }, { bezel: 22, radius: 78, notch: 1, duration: T2D, ease: MORPH_EASE, immediateRender: false }, T2);
    const x2 = Kit.crossTime(T2, T2D, 1024, PH.W, 899.5, MORPH_EASE);
    tw({ pulse: 0 }, { pulse: 1 }, x2 - 0.16, 0.16, 'power2.in');
    tw({ pulse: 1 }, { pulse: 0 }, x2, 0.3, 'power2.out');
    capIn(CAP.cP, 48.0);
    capOut(CAP.cP, 49.9);
    // Phone: setView('editor'), then setView('preview') — bottom nav highlighted on each switch.
    set({ view: 1 }, 48.35);
    tw({ hNavE: 0 }, { hNavE: 1 }, 48.35, 0.75, 'power1.out');
    tap(navPDev, 48.98);
    set({ view: 2 }, 49.12);
    tw({ hNavP: 0 }, { hNavP: 1 }, 49.12, 0.75, 'power1.out');

    /* ---------------- SCENE 8 — montage + end card (50.4–55.9) ---------------- */
    const C1 = 50.4;
    set({ devMode: 0, cardOn: 1, W: VW, H: VH, view: 1, drawer: 1, scrollY: 0, pulse: 0, rigO: 1, rigS: 1, rigBlur: 0 }, C1);
    tl.set(dev, { on: 0 }, C1);
    tl.set('#bgApp', { opacity: 0 }, C1);
    camTw(camFull, { ...camFull, s: 2.26, cy: 340 }, C1, 0.5, 'none');                                       // versions
    set({ drawer: 0, view: 0, tag: 1 }, C1 + 0.5);
    camTw({ cx: VW / 2, cy: 330, s: 2.3 }, { cx: VW / 2, cy: 322, s: 2.4 }, C1 + 0.5, 0.5, 'none');            // tags
    set({ tag: 0 }, C1 + 1.0);
    camTw({ cx: 250, cy: 420, s: 2.9 }, { cx: 255, cy: 428, s: 3.05 }, C1 + 1.0, 0.5, 'none');                // serial numbers
    set({ view: 2 }, C1 + 1.5);
    camTw(camSaveImg, { ...camSaveImg, s: 2.22, cy: 345 }, C1 + 1.5, 0.5, 'none');                            // save image
    tw({ hSaveImg: 0 }, { hSaveImg: 1 }, C1 + 1.5, 0.5, 'power1.out');
    ft('#pngCard', { left: sImg.cx - pngW / 2, top: sImg.cy, scale: 0.12, rotation: 0, opacity: 0 },
      { left: 540 - pngW / 2, top: 700, scale: 1, rotation: -4, opacity: 1, duration: 0.42 }, C1 + 1.55);
    const E0 = 52.4;
    tl.set('#pngCard', { opacity: 0 }, E0);
    tl.set('#endcard', { opacity: 1 }, E0);
    set({ rigO: 0 }, E0);
    document.querySelectorAll('#endWords .w').forEach((w, i) => ft(w, { opacity: 0, y: 26, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.65 }, E0 + 0.15 + i * 0.42));
    ft('#endLogo', { opacity: 0, scale: 0.92, y: 16, filter: 'blur(6px)' }, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.7 }, E0 + 1.55);
    ft('#endLine', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, E0 + 2.05);
    tl.set({}, {}, DURATION);
    return tl;
  }

  /* =====================================================================
     SYNC + SEEK (shared engine in kit.js)
     ===================================================================== */
  const sync = Kit.makeSync({
    B, S, stageW: SW, stageH: SH, text: DEMO, typing: TY, encoded: ENC,
    els: { appWrap: $('appWrap'), chrome: $('deviceChrome'), base: $('laptopBase'), notch: $('deviceNotch'), rig: $('rig'), card: $('appCard') },
    panels: [['.context-header', 'bContext', 0, -18], ['.editor', 'bEditor', 0, 46], ['.mobile-nav', 'bNav', 0, 40]],
    halos: [['save', '#saveBtn', 'hSave'], ['navE', '.mobile-nav button[data-view="editor"]', 'hNavE'],
      ['navP', '.mobile-nav button[data-view="preview"]', 'hNavP'], ['saveImg', '#saveImageBtn', 'hSaveImg']]
  });
  const scenes = Kit.SCENES.map(s => ({ ...s, t: s.t >= 42 ? s.t + 0.4 : s.t }));
  const seekCtl = Kit.installSeek({
    stageEl: $('stage'), build, sync, duration: DURATION, fps: FPS, scenes,
    debug: { get P() { return S.P; }, get cam() { return S.cam; }, M, ENC, B, CARD }
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
