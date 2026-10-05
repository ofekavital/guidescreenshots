/* Master timeline — one paused GSAP timeline, driven by window.seek(t).

   Determinism: the timeline only ever plays forward. A backward seek restores the
   stage's inline styles from a snapshot, rebuilds the timeline from scratch and
   renders forward to t, so a frame never depends on where the playhead came from.

   Stage elements are tweened directly. The real app inside the iframe is driven
   through the proxy objects (P, cam, dev), which sync() applies after every seek. */
(async function () {
  const $ = (id) => document.getElementById(id);
  const BRAND = Kit.initGsap();
  const CAM = 'sine.inOut';
  const FPS = 30;
  const DURATION = 55.5;
  const SW = 1920, SH = 1080;

  /* =====================================================================
     SETUP (runs once): load the app, measure it, build every DOM element.
     ===================================================================== */
  Legacy.build($('legacy'));
  const taBox = (() => { const r = Legacy.ta.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })();
  const B = await AppBridge.load($('appFrame'), '../source/sms-studio.html');
  for (const w of [400, 500, 700]) await document.fonts.load(`${w} 80px Heebo`, 'אבג abc 123');
  for (const w of [400, 700]) await document.fonts.load(`${w} 20px Arimo`, 'אבג abc 123');
  await document.fonts.ready;

  const DEMO = window.DEMO_TEXT;
  const N = DEMO.length;
  const ENC = B.win.encodeSms(DEMO);          // the app's own function
  const raf = () => new Promise(r => B.win.requestAnimationFrame(() => r()));

  /* ---------- measurements on the real app ---------- */
  const M = {};
  M.brandImg = B.rect('.brand img');
  M.brandTitle = B.rect('.brand-title');
  M.brandTitleSize = parseFloat(B.win.getComputedStyle(B.$('.brand-title')).fontSize);
  M.headerH = B.rect('.global-header').h;
  B.setText(DEMO);                            // full text for the remaining measurements
  await raf();
  M.gen = B.rect('.generated-container');
  M.out = B.rect('#outputBox');
  M.copy = B.rect('#copyOutputBtn');
  M.phone = B.rect('.phone-preview');
  M.phoneRadius = parseFloat(B.win.getComputedStyle(B.$('.phone-preview')).borderTopLeftRadius) || 32;
  M.bubble = B.rect('#smsPreview');
  M.saveImg = B.rect('#saveImageBtn');
  M.outHTML = B.$('#outputBox').innerHTML;   // exactly what renderOutput() produced
  M.outFont = B.win.getComputedStyle(B.$('#outputBox')).fontSize;
  M.outLine = B.win.getComputedStyle(B.$('#outputBox')).lineHeight;
  try {                                       // the app's own PNG export (closing montage)
    const blob = await B.win.makePng();
    $('pngImg').src = URL.createObjectURL(blob);
    await $('pngImg').decode();
  } catch (e) { console.warn('makePng failed', e); }
  B.setSize(390, 844);                        // mobile layout geometry
  await raf(); await raf();
  M.navPreview = B.rect('.mobile-nav button[data-view="preview"]');
  B.setSize(1920, 1080);
  B.setText('');
  await raf(); await raf();

  /* ---------- helpers ---------- */
  const toStage = (r, c) => ({ x: 960 + (r.x - c.cx) * c.s, y: 540 + (r.y - c.cy) * c.s, w: r.w * c.s, h: r.h * c.s,
    cx: 960 + (r.cx - c.cx) * c.s, cy: 540 + (r.cy - c.cy) * c.s });
  const caption = (lines, o) => Kit.caption($('captions'), SW, lines, { x: 1830, ...o });

  /* ---------- captions ---------- */
  const CAP = {
    c1: caption(['כל Enter,', 'שורה מיותרת.'], { x: 1830, y: 330, size: 92 }),
    c2: caption(['עוד ניסיון.', 'ועוד אחד.'], { x: 1830, y: 330, size: 92 }),
    c3: caption(['מעכשיו, לא מנחשים.'], { y: 470, size: 110, white: true, center: true }),
    c4a: caption(['מנסחים...'], { x: 1830, y: 900, size: 76, pill: true }),
    c4b: caption(['...ורואים בזמן אמת.'], { x: 1830, y: 900, size: 76, pill: true }),
    c5: caption(['המבנה נשמר. בדיוק.'], { x: 1820, y: 92, size: 92 }),
    c6: caption(['מעתיקים. מדביקים. נגמר.'], { x: 1830, y: 930, size: 84 }),
    cL: caption(['במחשב.'], { x: 1830, y: 470, size: 100 }),
    cT: caption(['בטאבלט.'], { x: 1830, y: 470, size: 100 }),
    cP: caption(['בנייד.'], { x: 1830, y: 470, size: 100 })
  };

  /* ---------- typing schedule (app) ---------- */
  const TYPE_START = 18.9, TYPE_DUR = 7.8;
  const TY = Kit.typing(DEMO, TYPE_START, TYPE_DUR);

  /* ---------- scene 3: logo + title ---------- */
  const logo = $('logoImg'), title = $('logoTitle');
  logo.src = B.logoSrc;                       // extracted from .brand img in the real app
  $('endLogo').src = B.logoSrc;
  await logo.decode(); await $('endLogo').decode();
  const LOGO_W = 430;
  logo.style.width = LOGO_W + 'px';
  const logoH = LOGO_W * (M.brandImg.h / M.brandImg.w);
  title.style.fontSize = '112px';
  title.style.lineHeight = '1';
  title.innerHTML = 'עורך מסרונים'.split(' ').map(w => `<span class="w" style="display:inline-block;opacity:0">${w}</span>`).join(' ');
  const titleW = title.offsetWidth, titleH = title.offsetHeight;
  const logoC = { x: 960 - LOGO_W / 2, y: 405 - logoH / 2, scale: 1 };
  const logoHdr = { x: M.brandImg.x, y: M.brandImg.y, scale: M.brandImg.w / LOGO_W };
  const tK = M.brandTitleSize / 112;
  const titleC = { x: 960 - titleW / 2, y: 690 - titleH / 2, scale: 1 };
  const titleHdr = { x: M.brandTitle.x + M.brandTitle.w - titleW * tK, y: M.brandTitle.cy - (titleH * tK) / 2, scale: tK };

  /* ---------- scene 5: split screen from the demo text and the app's own output ---------- */
  const lines = DEMO.split('\n');
  $('spLeftBody').innerHTML = lines.map(l => `<div class="sp-line">${l ? l.replace(/&/g, '&amp;').replace(/</g, '&lt;') : '&nbsp;'}</div>`).join('');
  $('spRightBody').innerHTML = M.outHTML;
  const breaks = [];                          // runs of '\n' after each written line
  { let i = 0; while (i < lines.length - 1) { let j = i + 1, run = 1; while (j < lines.length - 1 && lines[j] === '') { j++; run++; } breaks.push({ line: i, run }); i = j; } }
  const singles = breaks.filter(b => b.run % 2 === 1);   // odd runs -> a \n tag in the output
  const tokens = [...$('spRightBody').querySelectorAll('.output-token')];
  const tokenCount = (ENC.match(/\\n/g) || []).length;
  if (tokens.length !== singles.length || tokens.length !== tokenCount) console.warn('token mismatch', tokens.length, singles.length, tokenCount);
  const lineEls = [...$('spLeftBody').querySelectorAll('.sp-line')];
  const MARK_X = 938;
  breaks.forEach((b) => {
    const r = lineEls[b.line].getBoundingClientRect();
    const m = document.createElement('div');
    m.className = 'sp-mark' + (b.run % 2 ? '' : ' dbl');
    m.textContent = b.run % 2 ? '↵' : '↵↵';
    m.style.left = MARK_X + 'px';
    m.style.top = (r.top + r.height / 2 - 18) + 'px';
    if (!(b.run % 2)) { m.style.width = '56px'; m.style.left = (MARK_X - 6) + 'px'; m.style.fontSize = '20px'; }
    $('spMarks').appendChild(m);
    b.mark = m; b.y = r.top + r.height / 2;
  });
  const wireEls = singles.map((b, k) => {
    const tok = tokens[k];
    const tr = tok.getBoundingClientRect();
    const x0 = MARK_X + 44, y0 = b.y, yg = tr.bottom + 9, tx = tr.left + tr.width / 2;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M${x0},${y0} C${x0 + 40},${y0} ${x0 + 30},${yg} ${x0 + 90},${yg} L${tx - 16},${yg} Q${tx},${yg} ${tx},${tr.bottom + 1}`);
    $('spWires').appendChild(p);
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.strokeDashoffset = String(len);
    tok.style.opacity = '0';
    return { p, len, tok, b };
  });

  /* ---------- scene 6 geometry ---------- */
  const camCopy1 = { cx: M.gen.cx, cy: 560, s: 1.62 };   // centred on the copy button
  const camCopy = { cx: M.gen.cx, cy: 720, s: 1.5 };     // pans down as the toast appears
  const copyS = toStage(M.copy, camCopy1);
  const fly = $('flyCard');
  fly.innerHTML = M.outHTML;
  fly.style.width = M.out.w + 'px';
  fly.style.fontSize = M.outFont;
  fly.style.lineHeight = M.outLine;
  const outS = toStage(M.out, camCopy);
  const LG = 0.86;                                         // old-system window scale in scene 6
  const lgS = (x, y) => ({ x: 640 + (x - 640) * LG - 30, y: 540 + (y - 540) * LG + 40 });
  const taTL = lgS(taBox.x, taBox.y);
  const flyEndScale = (taBox.w * LG - 20) / M.out.w;
  const PH_STAGE = { x: 1515, y: 585 }, PH_S = 1.2;
  const camPhone = { cx: M.phone.cx - (PH_STAGE.x - 960) / PH_S, cy: M.phone.cy - (PH_STAGE.y - 540) / PH_S, s: PH_S };
  const bubS = toStage(M.bubble, camPhone);

  /* ---------- scene 7/8 geometry ---------- */
  const phoneCam = { cx: 390 / 2 + 150 / 0.92, cy: 844 / 2, s: 0.92 };
  const navP = toStage(M.navPreview, phoneCam);
  const camSaveImg = { cx: 510, cy: 380, s: 1.9 };
  const sImg = toStage(M.saveImg, camSaveImg);
  const pngW = 360;
  $('pngCard').style.width = pngW + 'px';

  /* =====================================================================
     BUILD: the timeline itself (tweens only — no DOM creation).
     ===================================================================== */
  const P0 = {
    legacyT: 0, clockMin: 0, clockSec: 0, legacyMode: 0, pasteText: 0, pasteLines: 0,
    chars: 0, focus: 0, caret: 0, copied: 0, toast: 0, view: 1, drawer: 0, tag: 0,
    W: 1920, H: 1080, devMode: 0, devK: 0.6, devX: 0, devY: 0,
    clipOn: 0, clipT: 0, clipR: 0, clipB: 0, clipL: 0, clipRad: 0,
    bub: 1, pulse: 0, rigS: 1, rigO: 0, rigBlur: 0,
    bContext: 0, bLibrary: 0, bEditor: 0, bPreview: 0,
    hSave: 0, hNavE: 0, hNavP: 0, hSaveImg: 0
  };
  const CAM0 = { cx: 960, cy: 540, s: 1 };
  const DEV0 = { on: 0, bezel: 14, radius: 10, base: 1, notch: 0 };
  const S = {};                               // current proxies (fresh on every rebuild)

  function build() {
    const P = S.P = { ...P0 }, cam = S.cam = { ...CAM0 }, dev = S.dev = { ...DEV0 };
    const tl = gsap.timeline({ paused: true, defaults: { ease: BRAND, lazy: false } });
    const { ft, capIn, capOut } = Kit.tweens(tl, BRAND);

    const set = (vals, at) => tl.set(P, vals, at);
    const tw = (from, to, at, dur, ease = BRAND) => tl.fromTo(P, from, { ...to, duration: dur, ease, immediateRender: false }, at);
    const camSet = (to, at) => tl.set(cam, to, at);
    const camTw = (from, to, at, dur, ease = CAM) => tl.fromTo(cam, from, { ...to, duration: dur, ease, immediateRender: false }, at);
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
    ft('#wipe', { clipPath: 'circle(0px at 960px 540px)' }, { clipPath: 'circle(1150px at 960px 540px)', duration: 0.85, ease: 'power2.in' }, 8.5);
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
    // The blue screen collapses into the app header; logo and title fly into their slots.
    const MORPH = 14.15, MORPH_D = 0.85;
    tl.set('#headerBlue', { opacity: 0 }, 0);
    tl.set('#wipe', { opacity: 0 }, MORPH);
    tl.set('#headerBlue', { opacity: 1 }, MORPH);
    set({ rigO: 1 }, MORPH);
    ft('#headerBlue', { height: SH }, { height: M.headerH, duration: MORPH_D, ease: 'power3.inOut' }, MORPH);
    ft(logo, { ...logoC }, { ...logoHdr, duration: MORPH_D, ease: 'power3.inOut' }, MORPH);
    ft(title, { ...titleC }, { ...titleHdr, duration: MORPH_D, ease: 'power3.inOut' }, MORPH);
    ft('#logoLayer', { opacity: 1 }, { opacity: 0, duration: 0.2, ease: 'none' }, MORPH + MORPH_D + 0.02);
    tw({ bContext: 0 }, { bContext: 1 }, MORPH + 0.55, 0.6);
    tw({ bLibrary: 0 }, { bLibrary: 1 }, MORPH + 0.75, 0.65);
    tw({ bEditor: 0 }, { bEditor: 1 }, MORPH + 0.95, 0.65);
    tw({ bPreview: 0 }, { bPreview: 1 }, MORPH + 1.15, 0.65);
    camTw({ ...CAM0 }, { ...CAM0, s: 1.025 }, 15.95, 2.0);

    /* ---------------- SCENE 4 — writing (18–28) ---------------- */
    const camA = { cx: 865, cy: 505, s: 1.24 };   // wide: save button, editor, phone
    const camB = { cx: 1123, cy: 418, s: 1.9 };   // close on the text box and its output
    const camC = { cx: 850, cy: 470, s: 1.32 };   // phone bubble and text side by side
    const camC2 = { cx: 850, cy: 466, s: 1.36 };
    camTw({ ...CAM0, s: 1.025 }, camA, 17.95, 1.4);
    camTw(camA, camB, 19.55, 1.4);
    camTw(camB, camC, 22.65, 1.5);
    camTw(camC, camC2, 24.15, 3.7, 'none');
    set({ focus: 1, caret: 1 }, 18.55);
    tw({ chars: 0 }, { chars: N }, TYPE_START, TYPE_DUR, TY.ease);
    tw({ hSave: 0 }, { hSave: 1 }, TYPE_START + 0.1, 0.9, 'power1.out');
    capIn(CAP.c4a, 20.0);
    capOut(CAP.c4a, 22.5);
    capIn(CAP.c4b, 23.2);
    capOut(CAP.c4b, 27.45);

    /* ---------------- SCENE 5 — the magic (28–36) ---------------- */
    set({ focus: 0, caret: 0 }, 27.85);
    const camGen = { cx: M.gen.cx, cy: M.gen.cy, s: 1.85 };
    camTw(camC2, camGen, 27.85, 1.4);
    const SPLIT = 29.35;
    ft('#appLayer', { opacity: 1, scale: 1, filter: 'blur(0px)' }, { opacity: 0, scale: 0.97, filter: 'blur(10px)', duration: 0.55, ease: 'power2.in' }, SPLIT);
    ft('#split', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none' }, SPLIT + 0.2);
    ft('#spLeft', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65 }, SPLIT + 0.25);
    ft('#spRight', { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.65 }, SPLIT + 0.35);
    breaks.forEach((b, i) => ft(b.mark, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4 }, SPLIT + 0.6 + i * 0.05));
    const POP0 = SPLIT + 1.2, POP_GAP = 0.56;
    wireEls.forEach((w, k) => {
      const at = POP0 + k * POP_GAP;
      ft(lineEls[w.b.line], { backgroundColor: 'rgba(95,154,229,0)' }, { backgroundColor: 'rgba(95,154,229,0.13)', duration: 0.3, ease: 'none' }, at - 0.05);
      ft(w.b.mark, { scale: 1, backgroundColor: '#E6EFFC', color: '#5F9AE5' }, { scale: 1.12, backgroundColor: '#5F9AE5', color: '#FFFFFF', duration: 0.25 }, at - 0.05);
      ft(w.p, { strokeDashoffset: w.len }, { strokeDashoffset: 0, duration: 0.38, ease: 'power2.inOut' }, at);
      ft(w.tok, { opacity: 0, scale: 0.35 }, { opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(3)' }, at + 0.33);
      ft(w.tok, { boxShadow: '0 0 0 0px rgba(95,154,229,0.75)' }, { boxShadow: '0 0 0 18px rgba(95,154,229,0)', duration: 0.8, ease: 'power2.out' }, at + 0.36);
      ft(w.b.mark, { scale: 1.12 }, { scale: 1, duration: 0.3 }, at + 0.35);
    });
    capIn(CAP.c5, 33.15);
    capOut(CAP.c5, 35.6);

    /* ---------------- SCENE 6 — copy (36–42) ---------------- */
    ft('#split', { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 35.6);
    camSet(camCopy1, 35.7);
    ft('#appLayer', { opacity: 0, scale: 1.03, filter: 'blur(8px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.6 }, 35.8);
    const CLICK = 37.2;
    ft('#cursor', { x: 1560, y: 1010, opacity: 0 }, { x: copyS.cx - 6, y: copyS.cy - 4, opacity: 1, duration: 0.85 }, 36.3);
    ft('#cursor', { scale: 1 }, { scale: 0.84, duration: 0.08, ease: 'power2.out' }, CLICK - 0.06);
    ft('#cursor', { scale: 0.84 }, { scale: 1, duration: 0.16, ease: 'power2.out' }, CLICK + 0.04);
    ft('#cursor', { opacity: 1 }, { opacity: 0, duration: 0.2, ease: 'none' }, 37.42);
    ft('#clickRing', { x: copyS.cx, y: copyS.cy, scale: 0.25, opacity: 1 }, { x: copyS.cx, y: copyS.cy, scale: 1.25, opacity: 0, duration: 0.55, ease: 'power2.out' }, CLICK);
    set({ copied: 1 }, CLICK + 0.02);
    ft('#copyBurst', { left: copyS.x, top: copyS.y, width: copyS.w, height: copyS.h, borderRadius: 10, opacity: 0.95 },
      { left: copyS.x - 18, top: copyS.y - 18, width: copyS.w + 36, height: copyS.h + 36, borderRadius: 22, opacity: 0, duration: 0.6, ease: 'power2.out' }, CLICK + 0.03);
    tw({ toast: 0 }, { toast: 1 }, CLICK + 0.05, 0.3);
    camTw(camCopy1, camCopy, 37.32, 0.65);
    tw({ toast: 1 }, { toast: 0 }, 38.55, 0.2, 'power1.in');
    capIn(CAP.c6, 0, { times: [CLICK + 0.1, 39.08, 39.95] });
    capOut(CAP.c6, 41.7);

    // The text card lifts off the output box and flies into the old system.
    ft(fly, { x: outS.x, y: outS.y, scale: camCopy.s, opacity: 0, boxShadow: '0 0px 0px rgba(30,40,72,0)' },
      { x: outS.x - 6, y: outS.y - 14, scale: camCopy.s * 1.03, opacity: 1, boxShadow: '0 30px 70px rgba(30,40,72,0.28)', duration: 0.32, ease: 'power2.out' }, 38.0);
    ft(fly, { x: outS.x - 6, y: outS.y - 14, scale: camCopy.s * 1.03 }, { x: taTL.x + 10, y: taTL.y + 10, scale: flyEndScale, duration: 0.75, ease: 'power3.inOut' }, 38.32);
    ft(fly, { opacity: 1 }, { opacity: 0, duration: 0.18, ease: 'none' }, 39.07);
    ft('#appLayer', { opacity: 1, scale: 1, filter: 'blur(0px)' }, { opacity: 0, scale: 0.95, filter: 'blur(8px)', duration: 0.55, ease: 'power2.in' }, 38.05);
    set({ legacyMode: 1 }, 37.9);
    tl.set('#legacyLayer', { filter: 'grayscale(0) brightness(1)' }, 37.9);
    tl.set('#lgClock', { opacity: 0 }, 37.9);
    ft('#legacyLayer', { opacity: 0, x: -180, y: 40, scale: LG }, { opacity: 1, x: -30, y: 40, scale: LG, duration: 0.7 }, 38.0);
    tw({ pasteText: 0 }, { pasteText: 1 }, 39.08, 0.2, 'none');
    tw({ pasteLines: 0 }, { pasteLines: 1 }, 39.15, 0.75, 'power1.out');

    // The real app's phone, isolated with a clip, receives the message.
    camSet(camPhone, 38.7);
    set({ clipOn: 1, clipT: M.phone.y, clipR: SW - (M.phone.x + M.phone.w), clipB: SH - (M.phone.y + M.phone.h), clipL: M.phone.x, clipRad: M.phoneRadius }, 38.7);
    ft('#appLayer', { opacity: 0, y: 60, scale: 1, filter: 'blur(0px)' }, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.7 }, 38.85);
    tw({ bub: 0 }, { bub: 1 }, 39.35, 0.55);
    ft('#checkBadge', { left: bubS.x - 30, top: bubS.y + bubS.h - 34, scale: 0, opacity: 0 },
      { left: bubS.x - 30, top: bubS.y + bubS.h - 34, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)' }, 39.85);
    ft(['#legacyLayer', '#checkBadge', '#appLayer'], { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 41.65);

    /* ---------------- SCENE 7 — responsive (42–50) ---------------- */
    const D0 = 42.05;
    set({ copied: 0, clipOn: 0, devMode: 1, W: 1440, H: 900, devK: 0.6, devX: -110, devY: -36, view: 1 }, D0);
    tl.set(dev, { on: 1, bezel: 14, radius: 10, base: 1, notch: 0 }, D0);
    tl.set('#bgApp', { opacity: 1 }, D0);
    tl.set('#appLayer', { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }, D0);
    tw({ rigO: 0, rigS: 0.94, rigBlur: 6 }, { rigO: 1, rigS: 1, rigBlur: 0 }, D0, 0.7);
    tw({ devK: 0.6 }, { devK: 0.615 }, D0 + 0.7, 1.7, 'none');      // ends 44.45, before the first morph
    capIn(CAP.cL, D0 + 0.5);
    capOut(CAP.cL, 44.4);
    // Laptop -> tablet (crosses the 1200px breakpoint).
    const MORPH_EASE = 'power3.inOut';
    const T1 = 44.5, T1D = 1.1;
    tw({ W: 1440, H: 900, devK: 0.615, devX: -110, devY: -36 }, { W: 1024, H: 768, devK: 0.76, devX: -130, devY: -6 }, T1, T1D, MORPH_EASE);
    tl.fromTo(dev, { bezel: 14, radius: 10, base: 1 }, { bezel: 20, radius: 26, base: 0, duration: T1D, ease: MORPH_EASE, immediateRender: false }, T1);
    const x1 = Kit.crossTime(T1, T1D, 1440, 1024, 1199.5, MORPH_EASE);
    tw({ pulse: 0 }, { pulse: 1 }, x1 - 0.16, 0.16, 'power2.in');
    tw({ pulse: 1 }, { pulse: 0 }, x1, 0.28, 'power2.out');
    capIn(CAP.cT, 45.35);
    capOut(CAP.cT, 46.65);
    // Tablet -> phone (crosses the 900px breakpoint).
    const T2 = 46.75, T2D = 1.1;
    tw({ W: 1024, H: 768, devK: 0.76, devX: -130, devY: -6 }, { W: 390, H: 844, devK: 0.92, devX: -150, devY: 0 }, T2, T2D, MORPH_EASE);
    tl.fromTo(dev, { bezel: 20, radius: 26, notch: 0 }, { bezel: 13, radius: 46, notch: 1, duration: T2D, ease: MORPH_EASE, immediateRender: false }, T2);
    const x2 = Kit.crossTime(T2, T2D, 1024, 390, 899.5, MORPH_EASE);
    tw({ pulse: 0 }, { pulse: 1 }, x2 - 0.16, 0.16, 'power2.in');
    tw({ pulse: 1 }, { pulse: 0 }, x2, 0.3, 'power2.out');
    capIn(CAP.cP, 47.6);
    capOut(CAP.cP, 49.5);
    // Phone: setView('editor'), then setView('preview') — bottom nav highlighted on each switch.
    set({ view: 1 }, 47.95);
    tw({ hNavE: 0 }, { hNavE: 1 }, 47.95, 0.75, 'power1.out');
    ft('#tapDot', { x: navP.cx, y: navP.cy, scale: 0.4, opacity: 0 }, { x: navP.cx, y: navP.cy, scale: 1, opacity: 1, duration: 0.18, ease: 'power2.out' }, 48.6);
    ft('#tapDot', { scale: 1, opacity: 1 }, { scale: 1.5, opacity: 0, duration: 0.4, ease: 'power2.out' }, 48.8);
    set({ view: 2 }, 48.72);
    tw({ hNavP: 0 }, { hNavP: 1 }, 48.72, 0.75, 'power1.out');

    /* ---------------- SCENE 8 — montage + end card (50–55.5) ---------------- */
    const C1 = 50.0;
    set({ devMode: 0, W: 1920, H: 1080, view: 1, drawer: 1, pulse: 0, rigO: 1, rigS: 1, rigBlur: 0 }, C1);
    tl.set(dev, { on: 0 }, C1);
    tl.set('#bgApp', { opacity: 0 }, C1);
    camTw({ cx: 420, cy: 330, s: 2.3 }, { cx: 410, cy: 322, s: 2.42 }, C1, 0.5, 'none');            // versions drawer
    set({ drawer: 0, tag: 1 }, C1 + 0.5);
    camTw({ cx: 1440, cy: 400, s: 2.0 }, { cx: 1430, cy: 392, s: 2.08 }, C1 + 0.5, 0.5, 'none');    // tags
    set({ tag: 0 }, C1 + 1.0);
    camTw({ cx: 1490, cy: 560, s: 2.25 }, { cx: 1495, cy: 575, s: 2.35 }, C1 + 1.0, 0.5, 'none');   // serial numbers
    camTw(camSaveImg, { ...camSaveImg, cx: 505, s: 1.97 }, C1 + 1.5, 0.5, 'none');                   // save image
    tw({ hSaveImg: 0 }, { hSaveImg: 1 }, C1 + 1.5, 0.5, 'power1.out');
    ft('#pngCard', { left: sImg.cx - pngW / 2, top: sImg.cy, scale: 0.15, rotation: 0, opacity: 0 },
      { left: 1180, top: 300, scale: 1, rotation: -4, opacity: 1, duration: 0.42 }, C1 + 1.55);
    const E0 = 52.0;
    tl.set('#pngCard', { opacity: 0 }, E0);
    tl.set('#endcard', { opacity: 1 }, E0);
    set({ rigO: 0 }, E0);
    document.querySelectorAll('#endWords .w').forEach((w, i) => ft(w, { opacity: 0, y: 24, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.65 }, E0 + 0.15 + i * 0.42));
    ft('#endLogo', { opacity: 0, scale: 0.92, y: 16, filter: 'blur(6px)' }, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.7 }, E0 + 1.55);
    ft('#endLine', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, E0 + 2.05);
    tl.set({}, {}, DURATION);                  // pad to the full duration
    return tl;
  }

  /* =====================================================================
     SYNC + SEEK (shared engine in kit.js)
     ===================================================================== */
  const sync = Kit.makeSync({
    B, S, stageW: SW, stageH: SH, text: DEMO, typing: TY, encoded: ENC,
    els: { appWrap: $('appWrap'), chrome: $('deviceChrome'), base: $('laptopBase'), notch: $('deviceNotch'), rig: $('rig') },
    panels: [['.context-header', 'bContext', 0, -18], ['.library', 'bLibrary', 70, 0], ['.editor', 'bEditor', 0, 46], ['.preview', 'bPreview', -70, 0]],
    halos: [['save', '#saveBtn', 'hSave'], ['navE', '.mobile-nav button[data-view="editor"]', 'hNavE'],
      ['navP', '.mobile-nav button[data-view="preview"]', 'hNavP'], ['saveImg', '#saveImageBtn', 'hSaveImg']]
  });
  const seekCtl = Kit.installSeek({
    stageEl: $('stage'), build, sync, duration: DURATION, fps: FPS, scenes: Kit.SCENES,
    debug: { get P() { return S.P; }, get cam() { return S.cam; }, M, ENC, B }
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
