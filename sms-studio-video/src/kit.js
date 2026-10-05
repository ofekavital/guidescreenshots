/* Kit — the format-independent engine shared by the 16:9 and 9:16 stages.

   - forward-only seeking (restore stage styles + rebuild on backward jumps)
   - caption DOM + word-by-word in/out tweens
   - natural typing schedule as a GSAP ease
   - camera / device / rig geometry and app-state sync through the proxy objects
*/
(function () {
  const K = {};

  K.initGsap = function () {
    gsap.registerPlugin(CustomEase);
    gsap.config({ force3D: false });          // 2D transforms only: no GPU layers with stale raster scale
    return CustomEase.create('brand', 'M0,0 C0.2,0.75 0.2,1 1,1');
  };

  K.rng = function (a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };

  // Time at which an eased tween crosses a value (centres the breakpoint pulses).
  K.crossTime = function (start, dur, from, to, value, ease) {
    const e = gsap.parseEase(ease);
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if ((from + (to - from) * e(mid) - value) * (to - from) < 0) lo = mid; else hi = mid;
    }
    return start + dur * (lo + hi) / 2;
  };

  /* ---------- captions ---------- */
  K.caption = function (container, stageW, lines, { x, y, size = 88, white = false, center = false, pill = false, lineHeight }) {
    const el = document.createElement('div');
    el.className = 'cap' + (white ? ' white' : '') + (center ? ' center' : '') + (pill ? ' pill' : '');
    el.style.fontSize = size + 'px';
    if (lineHeight) el.style.lineHeight = lineHeight;
    if (center) { el.style.left = '0'; el.style.right = '0'; } else el.style.right = (stageW - x) + 'px';
    el.style.top = y + 'px';
    el.innerHTML = lines.map(l => `<span class="ln">${l.split(' ').map(w => `<span class="w">${w}</span>`).join(' ')}</span>`).join('');
    container.appendChild(el);
    return el;
  };

  // Tween helpers bound to one timeline.
  K.tweens = function (tl, BRAND) {
    const ft = (target, from, to, at) => tl.fromTo(target, from, { immediateRender: false, ...to }, at);
    function capIn(el, at, { stagger = 0.11, times } = {}) {
      const pill = el.classList.contains('pill');
      if (pill) ft(el.querySelectorAll('.ln'), { opacity: 0, scale: 0.9, y: 18 }, { opacity: 1, scale: 1, y: 0, duration: 0.55 }, at);
      el.querySelectorAll('.w').forEach((w, i) => ft(w, { opacity: 0, y: 20, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.62 }, times ? times[i] : at + (pill ? 0.1 : 0) + i * stagger));
    }
    function capOut(el, at) {
      if (el.classList.contains('pill')) ft(el.querySelectorAll('.ln'), { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.3, ease: 'power2.in' }, at + 0.05);
      ft(el.querySelectorAll('.w'), { opacity: 1, y: 0, filter: 'blur(0px)' },
        { opacity: 0, y: -14, filter: 'blur(5px)', duration: 0.3, ease: 'power2.in', stagger: 0.03 }, at);
    }
    return { ft, capIn, capOut };
  };

  /* ---------- typing: a natural rhythm expressed as a GSAP ease ---------- */
  K.typing = function (text, start, dur, seed = 21) {
    const N = text.length;
    const keyTimes = (() => {
      const r = K.rng(seed), out = []; let t = 0;
      for (let i = 0; i < N; i++) {
        const ch = text[i], prev = text[i - 1] || '';
        let d = 1;
        if (ch === ' ') d = 1.45;
        if (ch === '\n') d = prev === '\n' ? 1.8 : 3.2;
        if (/[.,:]/.test(prev)) d += 1.1;
        d *= (0.72 + r() * 0.56) * (1 + 0.22 * Math.sin(i / 7.5));
        t += d; out.push(t);
      }
      return out.map(v => v / t);             // normalised 0..1: char i lands at out[i]
    })();
    const ease = (p) => {                     // fraction of keys pressed by progress p
      let lo = 0, hi = N;
      while (lo < hi) { const m = (lo + hi) >> 1; if (keyTimes[m] <= p) lo = m + 1; else hi = m; }
      return lo / N;
    };
    const lastKeyAt = (k) => (k <= 0 ? start - 0.3 : start + keyTimes[k - 1] * dur);
    return { N, ease, lastKeyAt };
  };

  /* ---------- app state: one proxy object -> one real app instance ---------- */
  K.TOASTS = ['ההעתקה הושלמה', 'התמונה הועתקה'];
  K.makeAppSync = function ({ B, text, typing, panels = [], halos = [] }) {
    const haloEls = {};
    function placeHalo(name, sel, p) {
      let d = haloEls[name];
      if (!d) {
        d = haloEls[name] = B.doc.createElement('div');
        d.style.cssText = 'position:fixed;z-index:2147482000;pointer-events:none;border-radius:10px;opacity:0';
        B.doc.body.appendChild(d);
      }
      if (p <= 0 || p >= 1) { d.style.opacity = '0'; return; }
      const r = B.rect(sel);
      const spread = 2 + 12 * p, a = 0.55 * (1 - p);
      d.style.left = r.x + 'px'; d.style.top = r.y + 'px'; d.style.width = r.w + 'px'; d.style.height = r.h + 'px';
      d.style.boxShadow = `0 0 0 ${spread.toFixed(2)}px rgba(95,154,229,${a.toFixed(3)}), 0 0 0 2px rgba(95,154,229,${(1 - p).toFixed(3)})`;
      d.style.opacity = '1';
    }
    const buildCss = (el, p, dx, dy) => {
      if (!el) return;
      if (p >= 1) { el.style.opacity = ''; el.style.transform = ''; return; }
      el.style.opacity = String(p);
      el.style.transform = `translate(${(dx * (1 - p)).toFixed(2)}px, ${(dy * (1 - p)).toFixed(2)}px)`;
    };
    const views = ['library', 'editor', 'preview'];

    return function appSync(st, t) {
      B.setSize(st.W, st.H);
      if (st.scrollY !== undefined) B.setScroll(st.scrollY);
      // Every layout-changing write first, measurements (caret, halos) last.
      for (const [sel, key, dx, dy] of panels) buildCss(B.$(sel), st[key], dx, dy);
      const bub = B.$('#smsPreview');
      if (st.bub >= 1) { bub.style.opacity = ''; bub.style.transform = ''; }
      else {
        const e = Math.max(0, st.bub);
        bub.style.opacity = String(Math.min(1, e * 1.6));
        bub.style.transformOrigin = '100% 100%';
        bub.style.transform = `translateY(${(18 * (1 - e)).toFixed(2)}px) scale(${(0.86 + 0.14 * e).toFixed(4)})`;
      }
      B.setView(views[Math.round(st.view)]);
      B.setDrawer(st.drawer);
      B.setActiveTag(st.tag > 0.5 ? 'נוכחות' : null);
      B.setCopied(st.copied > 1.5 ? 'icon' : st.copied > 0.5 ? 'full' : false);
      B.setToast(st.toast, K.TOASTS[Math.round(st.toastMsg || 0)]);
      const k = Math.min(typing.N, Math.floor(st.chars + 1e-6));
      B.setText(text.slice(0, k));
      B.setFocus(st.focus > 0.5);
      let caretOp = 0;
      if (st.caret > 0.5) {
        const since = t - typing.lastKeyAt(k);
        caretOp = since < 0.5 ? 1 : (Math.floor((since - 0.5) / 0.53) % 2 === 0 ? 0 : 1);
      }
      B.setCaret(caretOp);
      for (const [name, sel, key] of halos) placeHalo(name, sel, st[key]);
    };
  };

  /* ---------- sync: proxies -> stage + real app (single-instance stages) ---------- */
  K.makeSync = function ({ B, S, stageW, stageH, text, typing, encoded, panels = [], halos = [], els }) {
    const { appWrap, chrome, base, notch, rig, card } = els;
    const appSync = K.makeAppSync({ B, text, typing, panels, halos });

    return function sync(t) {
      const { P, cam, dev } = S;

      // Old system (16:9 only)
      if (window.Legacy && document.getElementById('legacyLayer') && parseFloat(gsap.getProperty('#legacyLayer', 'opacity')) > 0) {
        if (P.legacyMode < 0.5) { Legacy.resetPaste(); Legacy.renderTyping(P.legacyT); }
        else Legacy.renderPaste(encoded, P.pasteText, P.pasteLines);
        Legacy.setClock(P.clockMin, P.clockSec);
      }

      // Viewport size of the real app — its media queries respond for real.
      B.setSize(P.W, P.H);
      if (P.scrollY !== undefined) B.setScroll(P.scrollY);
      // The camera maps app point (cx,cy) to the centre of the frame: the app card when it
      // is on (9:16), otherwise the whole stage.
      const cardOn = card && P.cardOn > 0.5 && P.devMode < 0.5;
      const fr = cardOn ? { x: P.cardX, y: P.cardY, w: P.cardW, h: P.cardH } : { x: 0, y: 0, w: stageW, h: stageH };
      if (card) {
        card.style.left = fr.x + 'px'; card.style.top = fr.y + 'px';
        card.style.width = fr.w + 'px'; card.style.height = fr.h + 'px';
        card.style.borderRadius = cardOn ? P.cardR + 'px' : '0px';
        card.style.overflow = cardOn ? 'hidden' : 'visible';
        card.style.boxShadow = cardOn ? '0 40px 90px rgba(24,32,64,.22), 0 0 0 1px rgba(24,32,64,.06)' : 'none';
      }
      const c = P.devMode > 0.5 ? { cx: P.W / 2 - P.devX / P.devK, cy: P.H / 2 - P.devY / P.devK, s: P.devK } : cam;
      const s = c.s, tx = fr.w / 2 - c.cx * s, ty = fr.h / 2 - c.cy * s;
      appWrap.style.width = P.W + 'px';
      appWrap.style.height = P.H + 'px';
      appWrap.style.transform = `translate(${tx.toFixed(3)}px, ${ty.toFixed(3)}px) scale(${s.toFixed(5)})`;
      appWrap.style.clipPath = P.clipOn > 0.5 ? `inset(${P.clipT}px ${P.clipR}px ${P.clipB}px ${P.clipL}px round ${P.clipRad}px)` : '';
      const sx = fr.x + tx, sy = fr.y + ty;     // screen top-left on the stage
      if (dev.on > 0) {
        const sw = P.W * s, sh = P.H * s, bz = dev.bezel;
        chrome.style.opacity = String(dev.on);
        chrome.style.left = (sx - bz) + 'px'; chrome.style.top = (sy - bz) + 'px';
        chrome.style.width = (sw + 2 * bz) + 'px'; chrome.style.height = (sh + 2 * bz) + 'px';
        chrome.style.borderRadius = (dev.radius + bz) + 'px';
        appWrap.style.borderRadius = (dev.radius / s) + 'px';
        const bw = (sw + 2 * bz) * 1.18;
        base.style.opacity = String(dev.on * dev.base);
        base.style.width = bw + 'px';
        base.style.left = (sx + sw / 2 - bw / 2) + 'px';
        base.style.top = (sy + sh + bz - 2) + 'px';
        const nw = dev.notchW || 110;
        notch.style.opacity = String(dev.on * dev.notch);
        if (dev.notchW) { notch.style.width = nw + 'px'; notch.style.height = dev.notchH + 'px'; notch.style.borderRadius = `0 0 ${dev.notchH * 0.6}px ${dev.notchH * 0.6}px`; }
        notch.style.left = (sx + sw / 2 - nw / 2) + 'px';
        notch.style.top = (sy - 1) + 'px';
      } else {
        chrome.style.opacity = '0'; base.style.opacity = '0'; notch.style.opacity = '0';
        appWrap.style.borderRadius = '0px';
      }
      rig.style.opacity = String(P.rigO);
      rig.style.transform = `scale(${(P.rigS * (1 - 0.035 * P.pulse)).toFixed(5)})`;
      const blur = P.rigBlur + 7 * P.pulse;
      rig.style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : '';

      appSync(P, t);
    };
  };

  /* ---------- forward-only seek ---------- */
  K.installSeek = function ({ stageEl, build, sync, duration, fps, scenes, debug }) {
    // Iframe sizes are owned by the bridges (setSize caches them), so they stay out of the snapshot.
    const SNAP = [stageEl, ...stageEl.querySelectorAll('*')].filter(el => el.tagName !== 'IFRAME').map(el => [el, el.getAttribute('style')]);
    function restore() {
      for (const [el, st] of SNAP) {
        if (st === null) el.removeAttribute('style'); else el.setAttribute('style', st);
        delete el._gsap;
      }
    }
    let tl = null, lastT = -1;
    window.seek = function (t) {
      t = Math.max(0, Math.min(duration, t));
      if (!tl || t < lastT) {
        if (tl) tl.kill();
        restore();
        tl = build();
      }
      tl.time(t, false);
      sync(t);
      lastT = t;
      return t;
    };
    window.DURATION = duration;
    window.FPS = fps;
    window.SCENES = scenes;
    window.__debug = debug;
    return {
      hideVeil(veil) {                       // keep the veil hidden across snapshot restores
        veil.style.display = 'none';
        SNAP.find(([el]) => el === veil)[1] = 'display:none';
      }
    };
  };

  K.SCENES = [
    { t: 0, name: '1 · הכאב' }, { t: 8, name: '2 · המפנה' }, { t: 12, name: '3 · החשיפה' },
    { t: 18, name: '4 · כתיבה' }, { t: 28, name: '5 · הקסם' }, { t: 36, name: '6 · העתקה' },
    { t: 42, name: '7 · רספונסיביות' }, { t: 50, name: '8 · סיום' }
  ];

  window.Kit = K;
})();
