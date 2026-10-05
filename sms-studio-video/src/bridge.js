/* AppBridge — loads the real app (source/sms-studio.html) into a same-origin iframe
   and drives it from outside. Nothing in the source file is modified: we only set
   values, dispatch `input`, and call the app's own functions (setView, showToast,
   openHistory, renderTagFilters, makePng, encodeSms...). */
(function () {
  const B = {};
  const FONT_WEIGHTS = [400, 500, 600, 700];
  const FONT_SAMPLE = 'אבגדהוזחטיכלמנסעפצקרשת abcdefghijklmnopqrstuvwxyz 0123456789 #\\.,:"';

  const raf = (win) => new Promise(r => win.requestAnimationFrame(() => r()));

  B.load = async function (iframe, src) {
    window.seedLocalStorage();
    await new Promise((res) => {
      iframe.addEventListener('load', res, { once: true });
      iframe.src = src;
    });
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    B.frame = iframe; B.win = win; B.doc = doc;

    // Let the app's async init finish (it awaits an IndexedDB lookup).
    for (let i = 0; i < 6; i++) await raf(win);
    await new Promise(r => setTimeout(r, 120));

    // Freeze every app timer (autosave debounce, toast auto-hide, live phone clock...).
    for (let i = 1; i < 10000; i++) { win.clearTimeout(i); win.clearInterval(i); }
    win.setTimeout = () => 0;
    win.setInterval = () => 0;
    win.scrollTo = () => {};
    win.alert = () => {};
    win.confirm = () => false;

    // Local Heebo (via @fontsource) + no CSS motion: GSAP drives every change.
    const head = doc.head;
    for (const w of FONT_WEIGHTS) {
      const l = doc.createElement('link');
      l.rel = 'stylesheet';
      l.href = `/node_modules/@fontsource/heebo/${w}.css`;
      head.appendChild(l);
      await new Promise(r => { l.onload = r; l.onerror = r; });
    }
    const st = doc.createElement('style');
    st.id = 'video-determinism';
    st.textContent = `
      *,*::before,*::after{transition:none!important;animation:none!important}
      textarea,input{caret-color:transparent!important}
      #__vcaret{position:fixed;z-index:2147483000;width:2px;pointer-events:none;background:#26334A;border-radius:1px;opacity:0}
    `;
    head.appendChild(st);
    for (const w of FONT_WEIGHTS) await doc.fonts.load(`${w} 16px Heebo`, FONT_SAMPLE);
    await doc.fonts.ready;

    // Deterministic phone clock.
    const clock = doc.getElementById('phoneClock');
    if (clock) clock.textContent = '09:41';

    // Handles to app internals (top-level const/function bindings live in the iframe's global scope).
    B.state = win.eval('state');
    B.$ = (sel) => doc.querySelector(sel);
    B.$$ = (sel) => [...doc.querySelectorAll(sel)];
    B.ta = doc.getElementById('messageInput');
    B.copyBtn = doc.getElementById('copyOutputBtn');
    B.copyBtnOriginal = B.copyBtn.innerHTML;
    // Same markup the app's own click handler swaps in.
    B.copyBtnCopied = '<svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 6"/></svg>הועתק';
    B.toastEl = doc.getElementById('toast');
    B.logoSrc = doc.querySelector('.brand img').getAttribute('src');

    const caret = doc.createElement('div');
    caret.id = '__vcaret';
    doc.body.appendChild(caret);
    B.caretEl = caret;

    B._last = {};
    return B;
  };

  /* ---------- geometry ---------- */
  B.rect = function (sel) {
    const el = typeof sel === 'string' ? B.doc.querySelector(sel) : sel;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };

  /* Caret coordinates at the end of the textarea value (mirror-div technique). */
  B.caretPoint = function () {
    const ta = B.ta, doc = B.doc;
    const cs = B.win.getComputedStyle(ta);
    let m = B._mirror;
    if (!m) {
      m = B._mirror = doc.createElement('div');
      m.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(m);
    }
    const props = ['boxSizing', 'width', 'height', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
      'letterSpacing', 'lineHeight', 'textAlign', 'textIndent', 'wordSpacing', 'tabSize', 'direction', 'unicodeBidi'];
    const s = m.style;
    props.forEach(p => { s[p] = cs[p]; });
    s.position = 'absolute'; s.visibility = 'hidden'; s.top = '0'; s.left = '-9999px';
    s.whiteSpace = 'pre-wrap'; s.overflowWrap = 'break-word'; s.overflow = 'hidden';
    s.height = 'auto';
    m.textContent = ta.value;
    // The textarea uses unicode-bidi:plaintext, so each line takes the direction of its first
    // strong letter (none -> LTR). The probe letter keeps that direction, and the insertion
    // point is the probe's leading edge: right edge for RTL lines, left edge for LTR lines.
    const lastLine = ta.value.split('\n').pop();
    let rtl = cs.direction === 'rtl';
    if (cs.unicodeBidi === 'plaintext') {
      const strong = lastLine.match(/[\u0590-\u05FF]|[A-Za-z]/);
      rtl = lastLine === '' ? true : (strong ? /[\u0590-\u05FF]/.test(strong[0]) : false);
    }
    const span = doc.createElement('span');
    span.textContent = rtl ? 'א' : 'a';
    m.appendChild(span);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
    const r = ta.getBoundingClientRect();
    return {
      x: r.left + span.offsetLeft + (rtl ? span.offsetWidth : 0) - ta.scrollLeft,
      y: r.top + span.offsetTop - ta.scrollTop + (lh - parseFloat(cs.fontSize) * 1.25) / 2,
      h: parseFloat(cs.fontSize) * 1.25, rtl,
      clipTop: r.top, clipBottom: r.bottom
    };
  };

  /* ---------- state application (idempotent) ---------- */
  B.setText = function (text) {
    if (B._last.text === text) return;
    B._last.text = text;
    const ta = B.ta;
    ta.value = text;
    ta.dispatchEvent(new B.win.Event('input', { bubbles: true }));
    if (!text) { B.state.dirty = false; B.win.eval('updateSaveButton()'); }
    ta.scrollTop = ta.scrollHeight;
  };

  B.setFocus = function (on) {
    if (B._last.focus === on) return;
    B._last.focus = on;
    if (on) { B.win.focus(); B.ta.focus({ preventScroll: true }); }
    else B.ta.blur();
  };

  B.setCaret = function (opacity) {
    const c = B.caretEl;
    if (opacity <= 0 || !B.ta.offsetWidth) { c.style.opacity = '0'; return; }
    const p = B.caretPoint();
    const visible = p.y >= p.clipTop - 2 && p.y + p.h <= p.clipBottom + 2;
    c.style.left = (p.rtl ? p.x - 2.5 : p.x + 0.5) + 'px';
    c.style.top = p.y + 'px';
    c.style.height = p.h + 'px';
    c.style.opacity = visible ? String(opacity) : '0';
  };

  B.setCopied = function (on) {
    if (B._last.copied === on) return;
    B._last.copied = on;
    B.copyBtn.innerHTML = on ? B.copyBtnCopied : B.copyBtnOriginal;
  };

  B.setToast = function (p, msg) {
    const el = B.toastEl;
    if (p <= 0) {
      if (B._last.toast !== 0) { el.classList.remove('show'); el.style.opacity = ''; el.style.transform = ''; }
      B._last.toast = 0;
      return;
    }
    if (B._last.toast === 0 || B._last.toastMsg !== msg) { B.win.showToast(msg); B._last.toastMsg = msg; }
    B._last.toast = p;
    el.style.opacity = String(Math.min(1, p));
    el.style.transform = `translate(-50%, ${(1 - Math.min(1, p)) * 8}px)`;
  };

  B.setView = function (v) {
    if (B._last.view === v) return;
    B._last.view = v;
    B.win.setView(v);
  };

  B.setDrawer = function (p) {
    const bd = B.doc.getElementById('historyBackdrop');
    const dr = bd.querySelector('.drawer');
    if (p <= 0) {
      if (B._last.drawer !== 0) { B.win.closeHistory(); bd.style.opacity = ''; dr.style.transform = ''; }
      B._last.drawer = 0;
      return;
    }
    if (!B._last.drawer) B.win.openHistory();
    B._last.drawer = p;
    bd.style.opacity = String(p);
    dr.style.transform = `translateX(${(-101 * (1 - p)).toFixed(3)}%)`;
  };

  B.setActiveTag = function (tag) {
    if (B._last.tag === tag) return;
    B._last.tag = tag;
    B.state.activeTag = tag || null;
    B.win.renderTagFilters();
    B.win.renderList();
  };

  B.setSize = function (w, h) {
    w = Math.round(w); h = Math.round(h);
    if (B._last.w === w && B._last.h === h) return false;
    B._last.w = w; B._last.h = h;
    B.frame.style.width = w + 'px';
    B.frame.style.height = h + 'px';
    return true;
  };

  /* Page scroll of the app document (the mobile layout scrolls the whole page). */
  B.setScroll = function (y) {
    y = Math.round(y);
    if (B._last.scroll === y) return;
    B._last.scroll = y;
    B.doc.scrollingElement.scrollTop = y;
  };

  /* Inline style on a real app element (used for build-in and emphasis moves). */
  B.style = function (sel, css) {
    const el = typeof sel === 'string' ? B.doc.querySelector(sel) : sel;
    if (!el) return;
    for (const k in css) el.style[k] = css[k];
  };

  window.AppBridge = B;
})();
