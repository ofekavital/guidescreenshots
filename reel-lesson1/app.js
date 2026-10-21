/* Motion graphics for the lesson-1 reel.
 * Everything is driven by one paused GSAP timeline plus per-frame updaters,
 * so any frame can be rendered deterministically with window.__seek(t). */
(() => {
  const TIM = window.TIMING;
  const SC = window.SCENES;
  const IC = window.ICONS;
  const D = TIM.duration;
  const tl = gsap.timeline({ paused: true });
  const updaters = [];
  const SFX = [];

  // ---------- helpers ----------
  const el = (tag, cls, html, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  const icon = (name, cls = '') => `<span class="ico ${cls}">${IC[name]}</span>`;
  const q = (root, sel) => root.querySelector(sel);
  const qa = (root, sel) => Array.from(root.querySelectorAll(sel));

  const sIdx = {};
  SC.forEach((s, i) => { sIdx[s.id] = i; });
  const beat = (id, b) => TIM.scenes[sIdx[id]].beats[b];
  const B = (id, b) => beat(id, b).start;
  const BE = (id, b) => beat(id, b).end;
  const W = (id, b, w) => { const ws = beat(id, b).words; return ws[Math.min(w, ws.length - 1)][1]; };

  const NEUTRAL = { x: 0, y: 0, xPercent: 0, yPercent: 0, scale: 1, scaleX: 1, scaleY: 1, rotation: 0,
    filter: 'blur(0px)', clipPath: 'inset(0% 0% 0% 0%)' };
  let lastPop = -10;
  function sfx(name, t, gain = 1) { SFX.push({ name, t: Math.max(0, t), gain }); }
  function reveal(targets, t, from, dur = 0.5, ease = 'power3.out', sound = null) {
    const arr = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!arr.length) return;
    arr.forEach((x) => gsap.set(x, Object.assign({ autoAlpha: 0 }, from)));
    const to = { autoAlpha: 1, duration: dur, ease };
    for (const k in from) to[k] = NEUTRAL[k];
    tl.to(arr, to, t);
    if (sound === 'pop' && t - lastPop > 0.22) { sfx('pop', t, 0.35); lastPop = t; }
  }
  const pop = (e, t, d = 0.55, s = 'pop') => reveal(e, t, { scale: 0.35 }, d, 'back.out(2.2)', s);
  const rise = (e, t, d = 0.55) => reveal(e, t, { y: 46 }, d);
  const slide = (e, t, d = 0.55, s = 'pop') => reveal(e, t, { x: 140 }, d, 'power3.out', s);
  const wipe = (e, t, d = 0.7) => reveal(e, t, { clipPath: 'inset(0% 0% 0% 100%)' }, d, 'power3.inOut');
  const blurIn = (e, t, d = 0.6) => reveal(e, t, { scale: 1.35, filter: 'blur(14px)' }, d, 'power3.out');
  const hide = (e, t, d = 0.35, extra = {}) => tl.to(e, Object.assign({ autoAlpha: 0, duration: d, ease: 'power2.in' }, extra), t);
  const shake = (e, t) => tl.to(e, { keyframes: [{ x: -16 }, { x: 14 }, { x: -10 }, { x: 6 }, { x: 0 }], duration: 0.42, ease: 'none' }, t);
  function countUp(node, from, to, t, dur = 0.9) {
    const o = { v: from };
    node.textContent = String(from);
    tl.to(o, { v: to, duration: dur, ease: 'power2.out', onUpdate: () => { node.textContent = String(Math.round(o.v)); } }, t);
  }
  const place = (e, css) => { Object.assign(e.style, css); return e; };

  // ---------- scenes container + windows ----------
  const root = document.getElementById('scenes');
  // a scene enters just before its first word and leaves just before the
  // next scene's first word, so the last spoken word always stays on screen
  const win = SC.map((s, i) => ({ t0: i === 0 ? 0 : TIM.scenes[i].beats[0].start - 0.2 }));
  win.forEach((w, i) => { w.t1 = i < win.length - 1 ? win[i + 1].t0 : D + 1; });

  function makeScene(id) {
    const i = sIdx[id];
    const sec = el('section', 'scene', null, root);
    sec.id = 's-' + id;
    const { t0, t1 } = win[i];
    gsap.set(sec, { autoAlpha: 0 });
    if (i === 0) {
      gsap.set(sec, { autoAlpha: 1 });
    } else {
      tl.fromTo(sec, { autoAlpha: 0, y: 80, scale: 1.04, filter: 'blur(10px)' },
        { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.42, ease: 'power3.out', immediateRender: false }, t0);
      sfx('whoosh', t0 - 0.12, 0.55);
    }
    if (i < SC.length - 1) {
      tl.to(sec, { autoAlpha: 0, y: -60, scale: 0.97, filter: 'blur(8px)', duration: 0.22, ease: 'power2.in' }, t1 - 0.04);
    }
    return sec;
  }

  // ---------- reusable blocks ----------
  function caseHead(sec, id, o) {
    const head = el('div', 'case-head', null, sec);
    head.innerHTML = `<div class="avatar" style="--c:${o.c}">${icon(o.icon)}</div>
      <div><div class="kicker" style="--c:${o.c}">${o.k}</div><div class="case-name">${o.name}</div><div class="case-sub">${o.sub}</div></div>`;
    const t = B(id, 0);
    pop(q(head, '.avatar'), t, 0.6);
    rise(q(head, '.kicker'), t + 0.05);
    wipe(q(head, '.case-name'), t + 0.12);
    rise(q(head, '.case-sub'), t + 0.35);
    return head;
  }
  const chipHTML = (ic, text, c, extra = '') =>
    `<div class="chip sm ${extra}" style="--c:${c}">${icon(ic)}<span>${text}</span></div>`;

  function critHead(sec, id, n, title, sub, t, cls = '') {
    const nav = el('div', 'nav5', null, sec);
    for (let k = 1; k <= 5; k++) el('div', 'd' + (k === n ? ' on' : k < n ? ' done' : ''), String(k), nav);
    place(nav, { position: 'absolute', top: '0px', left: '0', right: '0' });
    const head = el('div', 'crit-head', `<div class="bignum">0${n}</div><div class="crit-title ${cls}">${title}${sub ? `<small>${sub}</small>` : ''}</div>`, sec);
    place(head, { position: 'absolute', top: '100px', right: '0', left: '0' });
    blurIn(q(head, '.bignum'), t, 0.6);
    wipe(q(head, '.crit-title'), t + 0.1, 0.7);
    if (n === 1) rise(nav, t);
    return { nav, head };
  }

  // ---------- scene builders ----------
  const builders = {};

  builders.hook = (sec, id) => {
    // cover frame: what the reel shows before playback starts
    const cover = el('div', '', `<span class="kicker">פסיכופתולוגיה א׳ · שיעור 1</span>
      <div class="statement" style="margin-top:60px;font-size:150px">מי מהם<br><span style="color:var(--coral)">לא</span> נורמלי?</div>`, sec);
    place(cover, { position: 'absolute', top: '220px', left: '0', right: '0', textAlign: 'center' });
    tl.to(cover, { autoAlpha: 0, scale: 1.25, filter: 'blur(12px)', duration: 0.26, ease: 'power2.in' }, 0.08);
    const people = [['יוסי', 'laptop', 'var(--cyan)'], ['גיא', 'graduation-cap', 'var(--violet)'], ['דנה', 'drama', 'var(--amber)']];
    const row = el('div', 'hook-avatars', null, sec);
    const avs = people.map(([n, ic, c]) => el('div', 'hook-avatar',
      `<div class="avatar" style="--c:${c}">${icon(ic)}<div class="qm">?</div></div><div class="avatar-name">${n}</div>`, row));
    avs.forEach((a, i) => pop(a, B(id, i), 0.6));
    qa(row, '.qm').forEach((m, i) => pop(m, W(id, 4, 2) + 0.1 + i * 0.08, 0.45, null));
    // continuous gentle float
    updaters.push((t) => avs.forEach((a, i) => { a.style.translate = `0 ${Math.sin(t * 2.1 + i * 1.7) * 8}px`; }));

    const line = el('div', 'hook-line', 'שלושה אנשים.<br><span class="accent">שאלה אחת.</span>', sec);
    place(line, { top: '560px', fontSize: '112px', lineHeight: '1.08' });
    rise(line, B(id, 3));
    hide(line, B(id, 4) - 0.05, 0.25);

    const big = el('div', 'hook-big', '<div class="w1">מי מהם...</div><div class="w2"><span class="neg">לא</span> נורמלי?</div>', sec);
    rise(q(big, '.w1'), B(id, 4));
    pop(q(big, '.w2'), W(id, 4, 2), 0.5, null);
    shake(q(big, '.neg'), W(id, 4, 2) + 0.35);
    sfx('impact', W(id, 4, 2), 0.7);

    hide([row, big], B(id, 5) - 0.12, 0.3, { scale: 0.92 });
    const title = el('div', 'hook-title',
      `<div class="kicker">שיעור 1 · מבוא</div>
       <div class="title" style="font-size:120px">פסיכופתולוגיה</div>
       <div class="title" style="font-size:230px;line-height:.95"><span class="hl">א׳</span></div>`, sec);
    const parts = qa(title, ':scope > *');
    pop(parts[0], B(id, 5));
    wipe(parts[1], B(id, 5) + 0.05, 0.6);
    blurIn(parts[2], B(id, 5) + 0.25, 0.5);
    tl.to(q(title, '.hl'), { '--p': 1, duration: 0.45, ease: 'power2.out' }, B(id, 5) + 0.55);
    sfx('riser', B(id, 5) - 1.0, 0.35);
  };

  builders.yossi = (sec, id) => {
    caseHead(sec, id, { c: 'var(--cyan)', icon: 'laptop', k: 'מקרה 1 / 3', name: 'יוסי', sub: '40 · איש הייטק · נשוי + 2' });
    const body = el('div', 'case-body', null, sec);
    const stat = el('div', 'stat', `<div class="num">0</div><div class="lbl">שעות עבודה ביום<small>ועוד עבודה הביתה בסופי שבוע</small></div>`, body);
    stat.style.setProperty('--c', 'var(--cyan)');
    rise(stat, B(id, 1));
    countUp(q(stat, '.num'), 0, 14, B(id, 1) + 0.1, 0.9);
    const wife = el('div', '', chipHTML('messages-square', 'אשתו: ״הוא לא מתייחס אליי ואל הילדים״', 'var(--violet)', 'tint'), body);
    slide(wife.firstChild, B(id, 2));
    const chips = el('div', 'chips', [
      chipHTML('moon', 'קשיי שינה', 'var(--cyan)'),
      chipHTML('flame', 'מתרגז בקלות', 'var(--coral)'),
      chipHTML('activity', 'קיבה עצבנית', 'var(--amber)'),
    ].join('').replace(/chip sm/g, 'chip'), body);
    wife.firstChild.classList.remove('sm');
    place(body, { gap: '34px', top: '320px' });
    [1, 3, 6].forEach((w, i) => pop(chips.children[i], W(id, 3, w)));
  };

  builders.guy = (sec, id) => {
    caseHead(sec, id, { c: 'var(--violet)', icon: 'graduation-cap', k: 'מקרה 2 / 3', name: 'גיא', sub: '25 · סטודנט מצטיין לכלכלה' });
    const body = el('div', 'case-body', null, sec);
    const tlWrap = el('div', '', null, body);
    const lbl = el('div', 'mute', 'גלית, ארוסתו וחברתו מאז התיכון', tlWrap);
    place(lbl, { fontSize: '34px', fontWeight: '600', marginBottom: '6px' });
    const track = el('div', 'tl', `<div class="tl-track"></div><div class="tl-fill"></div>
      <div class="tl-node n1" style="right:14%"><div class="badge" style="--c:var(--violet)">${icon('stethoscope')}</div><div class="t">אבחנה: סרטן<small>3 חודשים לפני החתונה</small></div></div>
      <div class="tl-node n2" style="right:50%"><div class="badge" style="--c:var(--coral)">${icon('heart-crack')}</div><div class="t">נפטרה<small>תוך חודשיים</small></div></div>
      <div class="tl-node n3" style="right:86%"><div class="badge" style="--c:#5d5a7a">${icon('heart')}</div><div class="t">החתונה<small>לא התקיימה</small></div></div>`, tlWrap);
    rise(lbl, B(id, 1));
    rise(q(track, '.tl-track'), B(id, 1));
    pop(q(track, '.n3'), W(id, 1, 3));
    pop(q(track, '.n1'), W(id, 1, 6));
    tl.to(q(track, '.tl-fill'), { width: '36%', duration: 0.8, ease: 'power2.inOut' }, W(id, 1, 6));
    tl.to(q(track, '.tl-fill'), { width: '72%', background: 'var(--coral)', duration: 0.7, ease: 'power2.inOut' }, B(id, 2));
    pop(q(track, '.n2'), W(id, 2, 3));
    sfx('impact', W(id, 2, 3), 0.35);
    tl.to(q(track, '.n3'), { opacity: 0.35, duration: 0.4 }, W(id, 2, 3) + 0.3);

    const chips = el('div', 'chips', [
      chipHTML('door-closed', 'מסתגר בבית', 'var(--violet)'),
      chipHTML('briefcase', 'עזב לימודים ועבודה', 'var(--violet)'),
      chipHTML('ban', 'הפסיק לאכול, ירד במשקל', 'var(--coral)'),
      chipHTML('droplets', 'מרבה לבכות', 'var(--cyan)'),
      chipHTML('moon', 'מתקשה לישון', 'var(--cyan)'),
    ].join(''), body);
    [2, 3, 6, 8, 9].forEach((w, i) => pop(chips.children[i], W(id, 3, w)));

    const quote = el('div', 'quote', '<small>לחבר הוא אמר:</small>״אין עוד טעם לחיים שלי״', body);
    place(quote, { position: 'absolute', top: '0', left: '0', right: '0' });
    hide(tlWrap, B(id, 4) - 0.1, 0.3, { y: -30 });
    rise(quote, B(id, 4) + 0.1);
  };

  builders.dana = (sec, id) => {
    caseHead(sec, id, { c: 'var(--amber)', icon: 'drama', k: 'מקרה 3 / 3', name: 'דנה', sub: 'תלמידת תיכון · מגמת תיאטרון' });
    const body = el('div', 'case-body', null, sec);
    const c1 = el('div', 'chips', [
      chipHTML('shirt', 'בגדים שחורים וארוכים', 'var(--mute)'),
      chipHTML('hand', 'לק שחור', 'var(--mute)'),
      chipHTML('split', 'שיער מגולח לא סימטרית', 'var(--mute)'),
    ].join(''), body);
    [0, 3, 5].forEach((w, i) => pop(c1.children[i], W(id, 1, w)));
    const c2 = el('div', '', chipHTML('pen-line', 'בשירים: התאבדות · רצח · קניבליזם', 'var(--coral)', 'tint'), body);
    slide(c2.firstChild, B(id, 2));
    const sep = el('div', 'sep-label', 'אבל...', body);
    blurIn(sep, B(id, 3), 0.45);
    const c3 = el('div', 'chips', [
      chipHTML('users', 'קבוצת חברים רחבה', 'var(--lime)', 'tint'),
      chipHTML('book-open', 'ציונים ממוצעים', 'var(--lime)', 'tint'),
    ].join(''), body);
    [3, 5].forEach((w, i) => pop(c3.children[i], W(id, 3, w)));
    const c4 = el('div', 'chips', [
      chipHTML('door-closed', 'בבית: מסתגרת בחדר', 'var(--amber)', 'tint'),
      chipHTML('triangle-alert', 'ההורים חוששים שתפגע בעצמה או באחרים', 'var(--amber)', 'tint'),
    ].join(''), body);
    pop(c4.children[0], B(id, 4));
    pop(c4.children[1], W(id, 4, 3));
  };

  builders.questions = (sec, id) => {
    const people = [['laptop', 'var(--cyan)'], ['graduation-cap', 'var(--violet)'], ['drama', 'var(--amber)']];
    const row = el('div', '', null, sec);
    place(row, { position: 'absolute', top: '0', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '40px' });
    people.forEach(([ic, c], i) => {
      const a = el('div', 'avatar', icon(ic), row);
      a.style.setProperty('--c', c);
      place(a, { width: '130px', height: '130px' });
      pop(a, B(id, 0) + i * 0.08, 0.5, null);
    });
    const scale = el('div', '', `<div class="ico">${IC.scale}</div>`, sec);
    place(scale, { position: 'absolute', top: '210px', left: '0', right: '0', margin: '0 auto', width: '300px', height: '300px', color: 'var(--ink)' });
    pop(scale, B(id, 0) + 0.1);
    updaters.push((t) => { scale.firstChild.style.transform = `rotate(${Math.sin(t * 3.2) * 9}deg)`; });
    const lr = el('div', '', '<span style="color:var(--lime)">נורמלי?</span><span style="color:var(--coral)">אב-נורמלי?</span>', sec);
    place(lr, { position: 'absolute', top: '540px', left: '0', right: '0', display: 'flex', justifyContent: 'space-between', fontSize: '76px', fontWeight: '900', padding: '0 20px' });
    rise(lr.children[0], B(id, 0) + 0.2);
    rise(lr.children[1], W(id, 0, 3));
    const pp = el('div', 'hook-line', 'מי סובל מ<span class="accent" style="--c:var(--violet)">פסיכופתולוגיה</span>?', sec);
    place(pp, { top: '690px', fontSize: '64px' });
    rise(pp, W(id, 0, 4));

    hide([scale, lr, pp], B(id, 1) - 0.1, 0.3);
    const h = el('div', 'hook-line', 'מי צריך <span class="accent">טיפול?</span>', sec);
    place(h, { top: '200px', fontSize: '96px' });
    rise(h, B(id, 1));
    const cols = el('div', 'cols3', [
      ['brain', 'פסיכולוגי', 'var(--cyan)'],
      ['pill', 'פסיכיאטרי', 'var(--violet)'],
      ['stethoscope', 'רפואי־<br>פיזיולוגי', 'var(--amber)'],
    ].map(([ic, n, c]) => `<div class="card col-card" style="--c:${c}"><div class="badge">${icon(ic)}</div><div class="h">${n}</div></div>`).join(''), sec);
    place(cols, { position: 'absolute', top: '360px', left: '0', right: '0' });
    [3, 4, 6].forEach((w, i) => pop(cols.children[i], W(id, 1, w)));
    const keep = el('div', '', `<div class="pill" style="--c:var(--lime)">${icon('bookmark')}<span>תחזיקו את התשובה — נחזור לזה בסוף</span></div>`, sec);
    place(keep, { position: 'absolute', top: '820px', left: '0', right: '0', textAlign: 'center' });
    pop(keep.firstChild, B(id, 2));
    tl.to(q(keep, '.ico'), { keyframes: [{ rotation: -14 }, { rotation: 12 }, { rotation: -6 }, { rotation: 0 }], duration: 0.6 }, B(id, 2) + 0.4);
  };

  builders.warning = (sec, id) => {
    const badge = el('div', 'badge', icon('triangle-alert'), sec);
    badge.style.setProperty('--c', 'var(--coral)');
    place(badge, { position: 'absolute', top: '20px', left: '0', right: '0', margin: '0 auto', width: '250px', height: '250px',
      boxShadow: '0 0 0 18px rgba(255,77,106,.18), 0 0 120px rgba(255,77,106,.5)' });
    pop(badge, B(id, 0), 0.6, null);
    shake(badge, B(id, 0) + 0.45);
    sfx('impact', B(id, 0) + 0.05, 0.5);
    updaters.push((t) => { badge.style.scale = String(1 + Math.max(0, Math.sin(t * 5)) * 0.03); });
    const k = el('div', 'hook-line', '<span class="kicker" style="--c:var(--coral)">אזהרה</span>', sec);
    place(k, { top: '310px' });
    rise(k, B(id, 0) + 0.15);
    const title = el('div', 'hook-line title md', '״סינדרום המתמחים״', sec);
    place(title, { top: '400px' });
    wipe(title, W(id, 0, 2), 0.7);

    const card = el('div', 'card', null, sec);
    place(card, { position: 'absolute', top: '560px', left: '0', right: '0', display: 'flex', alignItems: 'center', gap: '34px' });
    card.innerHTML = `<div style="position:relative;width:170px;height:170px;flex:0 0 170px">
        <div class="avatar" style="--c:var(--violet);width:170px;height:170px">${icon('user')}</div>
        <div class="ico mag" style="position:absolute;width:92px;height:92px;top:-12px;right:-18px;color:var(--lime)">${IC.search}</div></div>
      <div style="font-size:48px;font-weight:700;line-height:1.2">כשלומדים על הפרעות —<br><span style="color:var(--lime)">מזהים אותן בעצמנו</span></div>`;
    rise(card, B(id, 1));
    const mag = q(card, '.mag');
    updaters.push((t) => { mag.style.transform = `translate(${Math.cos(t * 2.4) * 18}px, ${Math.sin(t * 2.4) * 22}px)`; });
    const lineB = q(card, 'span');
    reveal(lineB, W(id, 1, 6), { y: 20 }, 0.45);

    const eq = el('div', '', null, sec);
    place(eq, { position: 'absolute', top: '850px', left: '0', right: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '26px' });
    eq.innerHTML = `<div class="chip" style="--c:var(--cyan)">תסמין אחד</div>
      <div class="ico" style="width:90px;height:90px;color:var(--coral)">${IC['equal-not']}</div>
      <div class="chip" style="--c:var(--coral)">הפרעה</div>`;
    pop(eq.children[0], W(id, 2, 1));
    pop(eq.children[1], W(id, 2, 4));
    pop(eq.children[2], W(id, 2, 6));
  };

  builders.normal = (sec, id) => {
    const title = el('div', 'title md', 'מהי <span class="accent">נורמליות</span>?', sec);
    wipe(title, B(id, 0), 0.7);
    const rows = el('div', 'rows', null, sec);
    place(rows, { position: 'absolute', top: '170px', left: '0', right: '0' });
    const items = [['eye', 'תפיסה רציונלית'], ['hand', 'שליטה רצונית בהתנהגות'], ['user-check', 'הערכה עצמית וקבלה עצמית'],
      ['heart-handshake', 'יכולת ליצור קשרי אהבה וחיבה'], ['trending-up', 'פרודוקטיביות']];
    items.forEach(([ic, txt], i) => {
      const r = el('div', 'row', `<div class="badge" style="--c:var(--lime)">${icon(ic)}</div><div class="n">0${i + 1}</div><div class="txt">${txt}</div>`, rows);
      slide(r, B(id, i + 1));
    });
  };

  builders.abnormal = (sec, id) => {
    const title = el('div', 'title md', 'מהי <span class="accent" style="--c:var(--coral)">אב-נורמליות</span>?', sec);
    wipe(title, B(id, 0), 0.7);
    const k = el('div', '', '<span class="kicker" style="--c:var(--coral)">3 גישות</span>', sec);
    place(k, { position: 'absolute', top: '150px', right: '0' });
    pop(k.firstChild, W(id, 0, 1));
    const cols = el('div', 'cols3', [
      ['megaphone', 'הגישה<br>העממית', 'var(--coral)', '<span class="tag">מיתוסים וסטיגמות</span>'],
      ['stethoscope', 'הגישה<br>הרפואית', 'var(--cyan)', ''],
      ['brain', 'הגישה<br>הפסיכולוגית', 'var(--violet)', ''],
    ].map(([ic, n, c, extra]) => `<div class="card col-card tint" style="--c:${c}"><div class="badge">${icon(ic)}</div><div class="h">${n}</div>${extra}</div>`).join(''), sec);
    place(cols, { position: 'absolute', top: '280px', left: '0', right: '0', height: '560px' });
    pop(cols.children[0], B(id, 1));
    pop(q(cols, '.tag'), W(id, 1, 2), 0.45, null);
    pop(cols.children[1], B(id, 2));
    pop(cols.children[2], B(id, 3));
  };

  builders.panic = (sec, id) => {
    const head = el('div', '', `<span class="kicker" style="--c:var(--coral)">דוגמה</span>
      <div class="title md" style="margin-top:18px">התקף פאניקה <span class="mute" style="font-size:44px;font-weight:600;letter-spacing:0">Panic attack</span></div>`, sec);
    pop(head.children[0], B(id, 0));
    wipe(head.children[1], B(id, 0) + 0.1);
    // ECG
    const ecg = el('div', '', null, sec);
    place(ecg, { position: 'absolute', top: '200px', left: '-70px', right: '-70px', height: '110px' });
    const pts = [];
    const spikes = 9;
    for (let s = 0; s < spikes; s++) {
      const x0 = s * (1080 / spikes);
      pts.push(`${x0},55`, `${x0 + 40},55`, `${x0 + 52},40`, `${x0 + 62},55`, `${x0 + 72},55`, `${x0 + 80},96`, `${x0 + 90},6`, `${x0 + 100},78`, `${x0 + 110},55`);
    }
    pts.push('1080,55');
    ecg.innerHTML = `<svg width="1080" height="110" viewBox="0 0 1080 110">
      <polyline points="${pts.join(' ')}" fill="none" stroke="var(--coral)" stroke-opacity=".22" stroke-width="4" stroke-linejoin="round"/>
      <polyline class="hot" points="${pts.join(' ')}" fill="none" stroke="var(--coral)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    const poly = q(ecg, '.hot');
    const len = poly.getTotalLength();
    poly.style.strokeDasharray = `${len * 0.3} ${len}`;
    reveal(ecg, B(id, 0) + 0.2, {}, 0.4);
    updaters.push((t) => {
      const speed = t > B(id, 2) ? 900 : 520;
      poly.style.strokeDashoffset = String(-((t * speed) % (len * 1.22)));
    });

    const mind = el('div', 'panel', null, sec);
    mind.style.setProperty('--c', 'var(--cyan)');
    place(mind, { position: 'absolute', top: '330px', left: '0', right: '0' });
    mind.innerHTML = `<div class="panel-h"><div class="badge">${icon('brain')}</div>נפש</div><div class="grid2">
      <span class="mini">עלייה פתאומית וחדה בפחד</span><span class="mini">דה-ראליזציה / דה-פרסונליזציה</span>
      <span class="mini">מחשבות על אובדן השפיות</span><span class="mini">תחושה של מוות מתקרב</span></div>`;
    rise(mind, B(id, 1));
    const mm = qa(mind, '.mini');
    [1, 3, 3.5, 4].forEach((w, i) => {
      const t = Number.isInteger(w) ? W(id, 1, w) : (W(id, 1, 3) + W(id, 1, 4)) / 2;
      pop(mm[i], t, 0.4);
    });

    const body = el('div', 'panel', null, sec);
    body.style.setProperty('--c', 'var(--coral)');
    place(body, { position: 'absolute', top: '660px', left: '0', right: '0' });
    body.innerHTML = `<div class="panel-h"><div class="badge">${icon('heart-pulse')}</div>גוף</div><div class="grid2">
      ${['דופק מואץ', 'הזעה', 'קוצר נשימה / חנק', 'רעידות', 'כאבים בחזה', 'בחילה', 'סחרחורת / עילפון', 'גלי חום וצמרמורות']
        .map((s) => `<span class="mini">${s}</span>`).join('')}</div>`;
    rise(body, B(id, 2));
    const bm = qa(body, '.mini');
    pop(bm[0], W(id, 2, 1), 0.4);
    pop(bm[1], W(id, 2, 3), 0.4);
    pop(bm[2], W(id, 2, 4), 0.4);
    for (let i = 3; i < 8; i++) pop(bm[i], W(id, 2, 5) + 0.15 + (i - 3) * 0.14, 0.4, null);

    const both = el('div', '', `<div class="pill" style="--c:var(--lime)">${icon('zap')}<span>נפש + גוף — באותו רגע</span></div>`, sec);
    place(both, { position: 'absolute', top: '205px', left: '0', right: '0', textAlign: 'center' });
    hide(ecg, B(id, 3) - 0.05, 0.25);
    pop(both.firstChild, B(id, 3));
    tl.to([mind, body], { scale: 1.025, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, B(id, 3));
  };

  builders.bps = (sec, id) => {
    const k = el('div', 'hook-line', '<span class="kicker">התשובה</span>', sec);
    place(k, { top: '0' });
    pop(k.firstChild, B(id, 0));
    const pre = el('div', 'hook-line mute', 'הגישה', sec);
    place(pre, { top: '74px', fontSize: '52px' });
    rise(pre, W(id, 0, 1));
    const title = el('div', 'hook-line title md', '<span style="color:var(--lime)">ביו</span>-<span style="color:var(--cyan)">פסיכו</span>-<span style="color:var(--violet)">סוציאלית</span>', sec);
    place(title, { top: '136px' });
    wipe(title, W(id, 0, 2), 0.8);
    const hol = el('div', 'hook-line', '<span class="mini">תפיסה הוליסטית · אינטגרציה בין רמות</span>', sec);
    place(hol, { top: '250px' });
    pop(hol.firstChild, B(id, 1), 0.45);

    const cx = 470, cy = 560;
    const rings = [
      [226, 'var(--violet)', 'globe', 'תרבות, חברה וסביבה'],
      [168, 'var(--cyan)', 'user', 'התנהגות וחוויה סובייקטיבית'],
      [110, 'var(--lime)', 'brain', 'פיזיולוגיה: המוח ומערכת העצבים'],
      [52, 'var(--amber)', 'dna', 'גנטיקה ואפיגנטיקה'],
    ];
    const svgWrap = el('div', '', null, sec);
    place(svgWrap, { position: 'absolute', top: '0', left: '0', width: '940px', height: '800px' });
    svgWrap.innerHTML = `<svg width="940" height="800" viewBox="0 0 940 800">${rings.map(([r, c]) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" fill-opacity=".13" stroke="${c}" stroke-width="4"/>`).join('')}</svg>`;
    const circles = qa(svgWrap, 'circle');
    const labels = el('div', '', null, sec);
    place(labels, { position: 'absolute', top: '815px', left: '0', right: '0', display: 'flex', flexDirection: 'column', gap: '8px' });
    rings.forEach(([r, c, ic, txt], i) => {
      const inner = i < 3 ? rings[i + 1][0] : 0;
      const ry = cy - (r + inner) / 2;
      const ico = el('div', 'ico', IC[ic], sec);
      const sz = i === 3 ? 64 : 54;
      place(ico, { position: 'absolute', width: sz + 'px', height: sz + 'px', left: (cx - sz / 2) + 'px', top: (i === 3 ? cy - sz / 2 : ry - sz / 2) + 'px', color: c });
      gsap.set(circles[i], { transformOrigin: `${cx}px ${cy}px` });
      reveal(circles[i], B(id, 2 + i), { scale: 0.2 }, 0.6, 'back.out(1.6)', 'pop');
      pop(ico, B(id, 2 + i) + 0.15, 0.45, null);
      const lab = el('div', '', `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:${c};margin-left:16px"></span>${txt}`, labels);
      place(lab, { fontSize: '38px', fontWeight: '700' });
      slide(lab, B(id, 2 + i) + 0.05, 0.5, null);
    });
    hide(labels, B(id, 6) - 0.1, 0.3);
    const persp = el('div', '', `<div style="font-size:36px;font-weight:700;color:var(--mute);margin-bottom:16px">ובחלוקה עדכנית — 3 פרספקטיבות:</div>
      <div class="chips"><div class="pill" style="--c:var(--cyan)">התנהגותית-חווייתית</div><div class="pill" style="--c:var(--lime)">מדעי המוח</div><div class="pill" style="--c:var(--amber)">אבולוציונית</div></div>`, sec);
    place(persp, { position: 'absolute', top: '810px', left: '0', right: '0' });
    rise(persp.children[0], B(id, 6));
    const pills = qa(persp, '.pill');
    [2, 3, 5].forEach((w, i) => pop(pills[i], W(id, 6, w)));
  };

  builders.myth = (sec, id) => {
    const title = el('div', 'title md', '<span style="color:var(--coral)">מיתוס</span> או <span style="color:var(--lime)">עובדה</span>?', sec);
    wipe(title, B(id, 0), 0.6);
    const list = [
      'לחולי נפש סיכון גבוה יותר להתנהג באלימות',
      'כל אדם נמצא בסיכון כלשהו לחלות במחלת נפש',
      'רוב מחלות הנפש הן כרוניות',
      'רוב הסובלים ממחלות נפש לא מודעים למצבם',
      'טיפול תרופתי מסוכן ופוגע בתפקוד לאורך זמן',
      'מי שתויג כחולה נפש יתקשה להשתלב בחברה',
    ];
    const rows = el('div', 'rows', null, sec);
    place(rows, { position: 'absolute', top: '140px', left: '0', right: '0', gap: '14px' });
    const rs = list.map((s, i) => {
      const r = el('div', 'row', `<div class="n">${i + 1}</div><div class="txt" style="font-size:36px;font-weight:600">${s}</div><div class="badge qb" style="--c:var(--cyan);width:58px;height:58px;flex:0 0 58px;margin-right:auto;font-weight:900;font-size:36px">?</div>`, rows);
      place(r, { padding: '16px 26px' });
      return r;
    });
    rs.forEach((r, i) => {
      gsap.set(r, { autoAlpha: 0, x: 120 });
      tl.to(r, { autoAlpha: 0.42, x: 0, duration: 0.45, ease: 'power3.out' }, B(id, 0) + 0.25 + i * 0.09);
      gsap.set(q(r, '.qb'), { autoAlpha: 0, scale: 0.3 });
    });
    [[1, 0], [2, 2], [3, 4]].forEach(([b, ri]) => {
      tl.to(rs[ri], { autoAlpha: 1, borderColor: 'rgba(59,227,255,.8)', background: 'rgba(59,227,255,.10)', scale: 1.02, duration: 0.35 }, B(id, b));
      tl.to(q(rs[ri], '.qb'), { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.5)' }, B(id, b) + 0.1);
      sfx('pop', B(id, b), 0.35);
    });
    tl.to(rs, { autoAlpha: 0.28, scale: 1, duration: 0.4 }, B(id, 4));
    const ask = el('div', '', 'לפני שעונים — <span class="accent">תשאלו:</span>', sec);
    place(ask, { position: 'absolute', top: '800px', left: '0', right: '0', fontSize: '50px', fontWeight: '800' });
    rise(ask, B(id, 4));
    const qs = el('div', 'chips', [
      ['users', 'איזו אוכלוסייה?', 'var(--cyan)'], ['compass', 'איזה הקשר?', 'var(--violet)'], ['file-search', 'מה המקור?', 'var(--amber)'],
    ].map(([ic, t, c]) => `<div class="pill" style="--c:${c}">${icon(ic)}<span>${t}</span></div>`).join(''), sec);
    place(qs, { position: 'absolute', top: '880px', left: '0', right: '0' });
    [0, 2, 4].forEach((w, i) => pop(qs.children[i], W(id, 5, w)));
  };

  builders.nocond = (sec, id) => {
    const qm = el('div', '', '?', sec);
    place(qm, { position: 'absolute', top: '120px', left: '0', right: '0', textAlign: 'center', fontSize: '900px', fontWeight: '900', lineHeight: '1',
      color: 'transparent', WebkitTextStroke: '3px rgba(255,255,255,.07)' });
    reveal(qm, B(id, 0), { scale: 0.7 }, 0.8);
    updaters.push((t) => { qm.style.rotate = `${Math.sin(t * 0.9) * 6}deg`; });
    const k = el('div', '', '<span class="kicker" style="--c:var(--violet)">אז איך מגדירים?</span>', sec);
    pop(k.firstChild, B(id, 0));
    const title = el('div', 'title md', 'הגדרת <span class="accent" style="--c:var(--coral)">אב-נורמליות</span>', sec);
    place(title, { marginTop: '24px' });
    wipe(title, W(id, 0, 2), 0.7);
    const rows = [['אין תנאי', 'הכרחי'], ['אין תנאי', 'מספיק'], ['אין מאפיין הגדרתי', 'ייחודי']];
    rows.forEach(([a, b], i) => {
      const r = el('div', '', `<div class="badge" style="--c:var(--coral);width:130px;height:130px;flex:0 0 130px">${icon('x')}</div>
        <div style="font-size:64px;font-weight:800;line-height:1.05">${a} <span style="color:var(--coral)">${b}</span></div>`, sec);
      place(r, { position: 'absolute', top: (330 + i * 215) + 'px', left: '0', right: '0', display: 'flex', alignItems: 'center', gap: '34px' });
      reveal(r, B(id, i + 1), { scale: 1.4, filter: 'blur(12px)' }, 0.45, 'power3.out');
      sfx('impact', B(id, i + 1) + 0.05, 0.32);
    });
    const note = el('div', 'mute', 'אף מאפיין לא משותף רק למקרים האב-נורמליים', sec);
    place(note, { position: 'absolute', top: '980px', left: '0', right: '0', fontSize: '34px', fontWeight: '600' });
    rise(note, W(id, 3, 4));
  };

  builders.apa = (sec, id) => {
    const top = el('div', '', `<div class="badge" style="--c:var(--cyan);width:120px;height:120px;flex:0 0 120px">${icon('library')}</div>
      <div><div style="font-size:110px;font-weight:900;line-height:.9;letter-spacing:-2px">DSM-5</div>
      <div class="mute" style="font-size:32px;font-weight:600;margin-top:8px">ההגדרה של האגודה הפסיכיאטרית האמריקאית (APA)</div></div>`, sec);
    place(top, { position: 'absolute', top: '0', left: '0', right: '0', display: 'flex', alignItems: 'center', gap: '30px' });
    pop(top.children[0], B(id, 0));
    wipe(top.children[1], B(id, 0) + 0.1);

    const card = el('div', 'card', null, sec);
    place(card, { position: 'absolute', top: '200px', left: '0', right: '0', padding: '34px 36px' });
    const line = (txt) => `<div class="ln" style="font-size:42px;font-weight:700;line-height:1.2;margin:6px 0 16px">${txt}</div>`;
    const pills = (arr, c) => `<div class="chips pl" style="margin-bottom:26px">${arr.map((s) => `<div class="pill" style="--c:${c};font-size:36px;padding:12px 26px">${s}</div>`).join('')}</div>`;
    card.innerHTML = `<div class="ln mute" style="font-size:34px;font-weight:600">הפרעה נפשית היא סינדרום של —</div>
      ${line('הפרעה מובחנת קלינית ב:')}${pills(['קוגניציה', 'ויסות רגשי', 'התנהגות'], 'var(--cyan)')}
      ${line('שמשקפת לקות בתהליכים:')}${pills(['פסיכולוגיים', 'ביולוגיים', 'התפתחותיים'], 'var(--lime)')}
      ${line('ולרוב קשורה לפגיעה משמעותית בתפקוד:')}${pills(['חברתי', 'תעסוקתי', 'פעילויות חשובות אחרות'], 'var(--amber)')}`;
    const lns = qa(card, '.ln');
    const pls = qa(card, '.pl');
    rise(card, B(id, 1) - 0.05, 0.45);
    rise(lns[0], B(id, 1));
    rise(lns[1], W(id, 1, 3));
    [0, 1, 3].forEach((w, i) => pop(pls[0].children[i], W(id, 2, w)));
    rise(lns[2], B(id, 3));
    [4, 5, 7].forEach((w, i) => pop(pls[1].children[i], W(id, 3, w)));
    rise(lns[3], B(id, 4));
    Array.from(pls[2].children).forEach((p, i) => pop(p, W(id, 4, 1) + i * 0.18, 0.45, i ? null : 'pop'));

    hide(card, B(id, 5) - 0.15, 0.3, { y: -40 });
    const nb = el('div', '', null, sec);
    place(nb, { position: 'absolute', top: '210px', left: '0', right: '0' });
    nb.innerHTML = `<div class="title sm">ומה <span style="color:var(--coral)">לא</span> נחשב הפרעה?</div>
      <div class="rows" style="margin-top:34px">
        <div class="row"><div class="badge" style="--c:var(--coral)">${icon('ban')}</div><div class="txt">תגובה מקובלת תרבותית לדחק ולאובדן</div></div>
        <div class="row"><div class="badge" style="--c:var(--coral)">${icon('ban')}</div><div class="txt">חריגות חברתית: פוליטית, דתית או מינית<small>וגם קונפליקטים בין האדם לחברה</small></div></div>
      </div>
      <div class="card tint" style="--c:var(--amber);margin-top:30px;font-size:38px;font-weight:600;line-height:1.3;padding:26px 32px">
        ...אלא אם הם תוצאה של <span style="color:var(--amber);font-weight:800">פגיעה בתפקודים המנטליים</span> של היחיד</div>`;
    wipe(nb.children[0], B(id, 5) - 0.05, 0.6);
    const nrows = qa(nb, '.row');
    slide(nrows[0], W(id, 5, 1));
    slide(nrows[1], B(id, 6));
    rise(nb.children[2], W(id, 6, 7));
    const src = el('div', 'mute', 'American Psychiatric Association (2013). DSM-5, p. 20', sec);
    place(src, { position: 'absolute', top: '1000px', left: '0', right: '0', fontSize: '24px', direction: 'ltr', textAlign: 'right' });
    rise(src, B(id, 1));
  };

  builders.c1 = (sec, id) => {
    // intro: five indicators preview
    const pv = el('div', '', null, sec);
    place(pv, { position: 'absolute', top: '120px', left: '0', right: '0' });
    pv.innerHTML = `<div class="title sm" style="text-align:center">5 סימנים <span class="accent">לאב-נורמליות</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:70px">${[
        ['target', 'חוסר<br>הסתגלות'], ['frown', 'סבל'], ['split', 'חריגות'], ['unlink', 'פגיעה<br>בקשר'], ['lock', 'נוקשות'],
      ].map(([ic, t], i) => `<div style="width:176px;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center">
        <div class="badge" style="--c:var(--lime);width:140px;height:140px">${icon(ic)}</div>
        <div style="font-size:34px;font-weight:800;line-height:1.1">${t}</div><div class="mute" style="font-size:30px;font-weight:800">0${i + 1}</div></div>`).join('')}</div>`;
    wipe(pv.children[0], B(id, 0), 0.6);
    Array.from(pv.children[1].children).forEach((c, i) => pop(c, W(id, 0, 4) + i * 0.1, 0.5, i ? null : 'pop'));
    hide(pv, B(id, 1) - 0.12, 0.3, { scale: 0.9 });

    critHead(sec, id, 1, 'חוסר הסתגלות', 'Maladaptiveness', B(id, 1));
    const desc = el('div', 'mute', 'עד כמה האדם מתאים את עצמו לדרישות המציאות, מתפקד בהתאם לגילו ומתמודד עם הסטרסורים של החיים', sec);
    place(desc, { position: 'absolute', top: '400px', left: '0', right: '0', fontSize: '36px', fontWeight: '600', lineHeight: '1.3' });
    rise(desc, B(id, 2));
    const lab = el('div', '', 'המידה שבה ההתנהגות פוגעת ביעדים:', sec);
    place(lab, { position: 'absolute', top: '540px', left: '0', right: '0', fontSize: '42px', fontWeight: '800' });
    rise(lab, W(id, 2, 2));
    const tiles = el('div', 'cols3', [['briefcase', 'עבודה'], ['heart', 'אהבה'], ['users', 'יחסים']].map(([ic, t]) =>
      `<div class="card col-card" style="--c:var(--coral);padding:28px 10px 26px;gap:14px;position:relative"><div class="badge" style="width:110px;height:110px;--c:var(--ink)">${icon(ic)}</div><div class="h">${t}</div>
       <div class="badge brk" style="--c:var(--coral);position:absolute;top:-16px;left:-10px;width:64px;height:64px">${icon('unlink')}</div></div>`).join(''), sec);
    place(tiles, { position: 'absolute', top: '620px', left: '0', right: '0' });
    [5, 6, 7].forEach((w, i) => {
      pop(tiles.children[i], W(id, 2, w));
      pop(q(tiles.children[i], '.brk'), W(id, 2, w) + 0.25, 0.4, null);
    });
    const ban = el('div', 'card tint', `<div class="ico" style="width:64px;height:64px;flex:0 0 64px;color:var(--lime)">${IC['refresh-cw']}</div>
      <div style="font-size:36px;font-weight:700;line-height:1.25">רוב ההתנהגויות אינן אדפטיביות או לא־אדפטיביות מטבען.<br><span style="color:var(--lime)">מה שקובע: גמישות והתאמה להקשר</span></div>`, sec);
    ban.style.setProperty('--c', 'var(--lime)');
    place(ban, { position: 'absolute', top: '880px', left: '0', right: '0', display: 'flex', alignItems: 'center', gap: '26px', padding: '24px 30px' });
    rise(ban, B(id, 3));
  };

  builders.c2 = (sec, id) => {
    critHead(sec, id, 2, 'סבל', '', B(id, 0));
    const meter = el('div', '', null, sec);
    place(meter, { position: 'absolute', top: '400px', left: '0', right: '0' });
    meter.innerHTML = `<div style="font-size:40px;font-weight:700;margin-bottom:26px">ככל שהסבל גדל — גדל הסיכוי שנחשיב את המצב <span style="color:var(--coral)">אב-נורמלי</span></div>
      <div style="position:relative;height:40px;border-radius:20px;background:linear-gradient(270deg, var(--lime), var(--amber), var(--coral))">
        <div class="mk" style="position:absolute;top:-14px;right:2%;width:68px;height:68px;margin-right:-34px;border-radius:50%;background:var(--ink);box-shadow:0 0 0 8px rgba(255,255,255,.2)"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:18px;font-size:30px;color:var(--mute);font-weight:600"><span>מעט סבל</span><span>הרבה סבל</span></div>`;
    rise(meter, B(id, 1));
    tl.to(q(meter, '.mk'), { right: '92%', duration: 1.6, ease: 'power2.inOut' }, W(id, 1, 2));

    const chips = el('div', 'chips', [
      chipHTML('clock', 'לא כל הזמן (למשל, הפרעה דו-קוטבית)', 'var(--cyan)'),
      chipHTML('user', 'גם אנשים בריאים סובלים', 'var(--lime)'),
      chipHTML('users', 'לפעמים דווקא הסביבה סובלת (CD, ASPD)', 'var(--coral)'),
    ].join(''), sec);
    place(chips, { position: 'absolute', top: '660px', left: '0', right: '0' });
    pop(chips.children[0], B(id, 2));
    pop(chips.children[1], W(id, 2, 1));
    pop(chips.children[2], W(id, 2, 4));

    hide(meter, B(id, 3) - 0.1, 0.3);
    const ego = el('div', '', `
      <div class="card tint" style="--c:var(--cyan);flex:1;padding:26px 28px"><div style="font-size:44px;font-weight:900;color:var(--cyan)">אגו-דיסטוני</div><div style="font-size:34px;font-weight:600;margin-top:10px;line-height:1.25">״זה לא אני״ — הסימפטום מרגיש זר</div></div>
      <div class="card tint" style="--c:var(--amber);flex:1;padding:26px 28px"><div style="font-size:44px;font-weight:900;color:var(--amber)">אגו-סינטוני</div><div style="font-size:34px;font-weight:600;margin-top:10px;line-height:1.25">״זה חלק ממני״ — מרגיש טבעי</div></div>`, sec);
    place(ego, { position: 'absolute', top: '400px', left: '0', right: '0', display: 'flex', gap: '22px' });
    pop(ego.children[0], W(id, 3, 1));
    pop(ego.children[1], W(id, 3, 4));
  };

  builders.c3 = (sec, id) => {
    critHead(sec, id, 3, 'חריגות', 'התנהגות סוטה מהמקובל', B(id, 0));
    const curve = el('div', '', null, sec);
    place(curve, { position: 'absolute', top: '390px', left: '0', right: '0', height: '300px' });
    const pts = [];
    for (let x = 0; x <= 940; x += 10) { const u = (x - 470) / 150; pts.push(`${x},${(260 - 220 * Math.exp(-u * u / 2)).toFixed(1)}`); }
    curve.innerHTML = `<svg width="940" height="300" viewBox="0 0 940 300">
      <path d="M0,260 L${pts.join(' L')} L940,260 Z" fill="rgba(198,255,61,.10)"/>
      <polyline class="pl" points="${pts.join(' ')}" fill="none" stroke="var(--lime)" stroke-width="5"/>
      <line x1="0" y1="262" x2="940" y2="262" stroke="rgba(255,255,255,.25)" stroke-width="3"/>
      <circle class="dot" cx="96" cy="250" r="20" fill="var(--coral)"/></svg>
      <div class="lb1" style="position:absolute;top:150px;left:0;right:0;text-align:center;font-size:36px;font-weight:800;color:var(--lime)">המקובל</div>
      <div class="lb2" style="position:absolute;top:170px;left:30px;font-size:34px;font-weight:800;color:var(--coral)">חריג</div>`;
    const pl = q(curve, '.pl');
    const L = pl.getTotalLength();
    gsap.set(pl, { strokeDasharray: L, strokeDashoffset: L });
    reveal(curve, B(id, 0) + 0.2, {}, 0.3);
    tl.to(pl, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut' }, B(id, 0) + 0.25);
    rise(q(curve, '.lb1'), B(id, 0) + 0.8);
    const dot = q(curve, '.dot');
    gsap.set(dot, { attr: { r: 0 } });
    tl.to(dot, { attr: { r: 20 }, duration: 0.45, ease: 'back.out(3)' }, W(id, 0, 2));
    sfx('pop', W(id, 0, 2), 0.35);
    rise(q(curve, '.lb2'), W(id, 0, 2) + 0.15);
    const freq = el('div', '', chipHTML('repeat', 'גם בתדירות: בדיקה כפייתית, הימנעות מיציאה מהבית', 'var(--amber)', 'tint'), sec);
    place(freq, { position: 'absolute', top: '720px', left: '0', right: '0' });
    pop(freq.firstChild, W(id, 0, 4));
    hide([curve, freq], B(id, 1) - 0.1, 0.3);

    const cult = el('div', '', `<div class="pill" style="--c:var(--violet)">${icon('globe')}<span>ההגדרה תלויה בתרבות, בערכים ובנסיבות</span></div>`, sec);
    place(cult, { position: 'absolute', top: '400px', left: '0', right: '0', textAlign: 'center' });
    pop(cult.firstChild, B(id, 1));
    const yr = el('div', '', `<div class="yr" style="font-size:190px;font-weight:900;line-height:1;color:var(--lime);letter-spacing:-4px;text-align:center">1952</div>
      <div style="font-size:38px;font-weight:700;line-height:1.3;text-align:center;margin-top:10px">ה-APA הסירה את ההומוסקסואליות כשלעצמה<br>מקטגוריות ההפרעה ב-DSM-II</div>
      <div class="chips" style="justify-content:center;margin-top:22px"><span class="mini">דיון מקצועי</span><span class="mini">בחינת ראיות</span><span class="mini">מאבק ציבורי</span></div>`, sec);
    place(yr, { position: 'absolute', top: '520px', left: '0', right: '0' });
    rise(yr.children[0], B(id, 2));
    countUp(q(yr, '.yr'), 1952, 1973, B(id, 2) + 0.05, 1.0);
    rise(yr.children[1], W(id, 2, 3));
    qa(yr, '.mini').forEach((m, i) => pop(m, W(id, 2, 5) + i * 0.16, 0.4, i ? null : 'pop'));
    hide([yr.children[1], yr.children[2]], B(id, 3) - 0.1, 0.25);
    const ch = el('div', 'rows', `
      <div class="row"><div class="txt" style="flex:1">הנטייה המינית של האנשים</div><span class="tag" style="--c:var(--lime)">לא השתנתה</span></div>
      <div class="row"><div class="txt" style="flex:1">ההמשגה המקצועית</div><span class="tag" style="--c:var(--amber)">השתנתה</span></div>`, sec);
    place(ch, { position: 'absolute', top: '740px', left: '0', right: '0' });
    slide(ch.children[0], B(id, 3));
    slide(ch.children[1], W(id, 3, 3));
  };

  builders.c4 = (sec, id) => {
    critHead(sec, id, 4, 'פגיעה בקשר', 'עם הסביבה ועם העצמי', B(id, 0));
    const C = [470, 660];
    const nodes = [
      { p: [790, 440], ic: 'eye', t: 'המציאות', s: 'הלוצינציות' },
      { p: [150, 440], ic: 'users', t: 'אחרים', s: 'תקשורת ואינטימיות' },
      { p: [470, 900], ic: 'user-check', t: 'העצמי', s: 'החיבור לעצמך' },
    ];
    const svg = el('div', '', null, sec);
    place(svg, { position: 'absolute', top: '0', left: '0', width: '940px', height: '1040px' });
    svg.innerHTML = `<svg width="940" height="1040" viewBox="0 0 940 1040">${nodes.map((n) =>
      `<line class="ok" x1="${C[0]}" y1="${C[1]}" x2="${n.p[0]}" y2="${n.p[1]}" stroke="var(--lime)" stroke-opacity=".7" stroke-width="7"/>
       <line class="br" x1="${C[0]}" y1="${C[1]}" x2="${n.p[0]}" y2="${n.p[1]}" stroke="var(--coral)" stroke-width="7" stroke-dasharray="16 22"/>`).join('')}</svg>`;
    const ok = qa(svg, '.ok');
    const br = qa(svg, '.br');
    br.forEach((b) => gsap.set(b, { autoAlpha: 0 }));
    ok.forEach((o) => { const L = o.getTotalLength(); gsap.set(o, { strokeDasharray: L, strokeDashoffset: L }); tl.to(o, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' }, B(id, 0) + 0.4); });
    const center = el('div', 'avatar', icon('user'), sec);
    center.style.setProperty('--c', 'var(--ink)');
    place(center, { position: 'absolute', width: '170px', height: '170px', left: (C[0] - 85) + 'px', top: (C[1] - 85) + 'px' });
    pop(center, B(id, 0) + 0.2);
    nodes.forEach((n, i) => {
      const nd = el('div', '', `<div class="badge" style="--c:var(--lime);width:130px;height:130px;margin:0 auto">${icon(n.ic)}</div>
        <div style="font-size:40px;font-weight:800;margin-top:12px">${n.t}</div><div class="sub mute" style="font-size:28px;font-weight:600;margin-top:4px">${n.s}</div>`, sec);
      place(nd, { position: 'absolute', width: '360px', textAlign: 'center', left: (n.p[0] - 180) + 'px', top: (n.p[1] - 65) + 'px' });
      pop(q(nd, '.badge'), B(id, 0) + 0.5 + i * 0.1, 0.5, null);
      rise(nd.children[1], B(id, 0) + 0.6 + i * 0.1);
      const bt = B(id, i + 1);
      tl.to(ok[i], { autoAlpha: 0, duration: 0.25 }, bt);
      tl.to(br[i], { autoAlpha: 1, duration: 0.25 }, bt);
      tl.to(q(nd, '.badge'), { backgroundColor: '#ff4d6a', duration: 0.3 }, bt);
      rise(nd.children[2], bt + 0.1);
      const mid = el('div', 'badge', icon('unlink'), sec);
      mid.style.setProperty('--c', 'var(--coral)');
      const mx = n.p[0] + (C[0] - n.p[0]) * 0.58, my = n.p[1] + (C[1] - n.p[1]) * 0.58;
      place(mid, { position: 'absolute', width: '70px', height: '70px', left: (mx - 35) + 'px', top: (my - 35) + 'px' });
      pop(mid, bt + 0.05);
    });
  };

  builders.c5 = (sec, id) => {
    critHead(sec, id, 5, 'נוקשות', 'והיעדר אלטרנטיבות', B(id, 0));
    const chips = el('div', 'chips', [
      chipHTML('lock', 'דפוס מקובע: רגש · מחשבה · התנהגות', 'var(--coral)', 'tint'),
      chipHTML('ban', 'קשה לשלוט בו', 'var(--amber)', 'tint'),
    ].join(''), sec);
    place(chips, { position: 'absolute', top: '395px', left: '0', right: '0', justifyContent: 'center' });
    pop(chips.children[0], W(id, 1, 0));
    pop(chips.children[1], W(id, 1, 2));
    const S = [470, 1030];
    const ends = [[160, 830], [470, 800], [780, 830]];
    const pw = el('div', '', null, sec);
    place(pw, { position: 'absolute', top: '0', left: '0', width: '940px', height: '1040px' });
    pw.innerHTML = `<svg width="940" height="1040" viewBox="0 0 940 1040">${ends.map((e, i) =>
      `<path class="p${i}" d="M${S[0]},${S[1]} C${S[0]},${(S[1] + e[1]) / 2} ${e[0]},${(S[1] + e[1]) / 2 + 60} ${e[0]},${e[1] + 40}" fill="none"
        stroke="${i === 1 ? 'var(--coral)' : 'rgba(255,255,255,.35)'}" stroke-width="${i === 1 ? 12 : 6}" stroke-linecap="round" ${i === 1 ? '' : 'stroke-dasharray="4 18"'}/>`).join('')}
      <circle cx="${S[0]}" cy="${S[1]}" r="22" fill="var(--ink)"/></svg>`;
    const paths = [0, 1, 2].map((i) => q(pw, '.p' + i));
    reveal(pw, B(id, 0) + 0.3, {}, 0.4);
    const L = paths[1].getTotalLength();
    gsap.set(paths[1], { strokeDasharray: L, strokeDashoffset: L });
    tl.to(paths[1], { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out' }, B(id, 0) + 0.4);
    ends.forEach((e, i) => {
      const b = el('div', 'badge', icon(i === 1 ? 'repeat' : 'lock'), sec);
      b.style.setProperty('--c', i === 1 ? 'var(--coral)' : '#4a4766');
      place(b, { position: 'absolute', width: '110px', height: '110px', left: (e[0] - 55) + 'px', top: (e[1] - 70) + 'px' });
      if (i === 1) { pop(b, B(id, 0) + 1.1); updaters.push((t) => { if (t > B(id, 0) + 1.1) b.firstChild.style.rotate = `${(t * 140) % 360}deg`; }); }
      else pop(b, W(id, 1, 5) + (i ? 0.15 : 0));
    });
    const none = el('div', '', `<div class="pill" style="--c:var(--lime)">${icon('user')}<span>בחוויה של האדם: אין דרך אחרת</span></div>`, sec);
    place(none, { position: 'absolute', top: '610px', left: '0', right: '0', textAlign: 'center' });
    pop(none.firstChild, W(id, 1, 6));
  };

  builders.summary = (sec, id) => {
    const people = [['laptop', 'var(--cyan)'], ['graduation-cap', 'var(--violet)'], ['drama', 'var(--amber)']];
    const head = el('div', '', null, sec);
    place(head, { position: 'absolute', top: '0', left: '0', right: '0', display: 'flex', alignItems: 'center', gap: '24px' });
    head.innerHTML = `<div style="display:flex;gap:12px">${people.map(([ic, c]) => `<div class="avatar" style="--c:${c};width:96px;height:96px">${icon(ic)}</div>`).join('')}</div>
      <div><span class="kicker">לסיום</span><div style="font-size:54px;font-weight:900;margin-top:10px;line-height:1.05">מה מלמדים המקרים?</div></div>`;
    qa(head, '.avatar').forEach((a, i) => pop(a, B(id, 0) + i * 0.08, 0.45, i ? null : 'pop'));
    rise(head.children[1], B(id, 0) + 0.1);

    const card = (c, ic, h, tags, top) => {
      const k = el('div', 'card tint', `<div style="display:flex;align-items:center;gap:18px;font-size:44px;font-weight:900;color:${c};margin-bottom:16px">
        <div class="badge" style="--c:${c};width:66px;height:66px">${icon(ic)}</div>${h}</div>
        <div class="grid2">${tags.map((s) => `<span class="mini" style="font-size:31px">${s}</span>`).join('')}</div>`, sec);
      k.style.setProperty('--c', c);
      place(k, { position: 'absolute', top: top + 'px', left: '0', right: '0', padding: '24px 28px' });
      return k;
    };
    const c1 = card('var(--lime)', 'check', 'מה מכוון אותנו', ['מצוקה סובייקטיבית', 'פגיעה בתפקוד', 'משך', 'הקשר התפתחותי ותרבותי'], 170);
    const c2 = card('var(--coral)', 'x', 'מה לא מספיק', ['שונות מהנורמה', 'תסמין יחיד', 'העדפות תרבותיות', 'קביעה על סמך תיאור קצר'], 470);
    const c3 = card('var(--cyan)', 'circle-help', 'השאלה הקלינית', ['איזה מידע חסר כדי להעריך — בלי לתייג מוקדם מדי?'], 770);
    rise(c1, B(id, 1));
    qa(c1, '.mini').forEach((m, i) => pop(m, W(id, 1, [2, 3, 5, 6][i]), 0.4, null));
    rise(c2, B(id, 2));
    qa(c2, '.mini').forEach((m, i) => pop(m, i < 2 ? W(id, 2, [3, 6][i]) : W(id, 2, 7) + 0.1 + (i - 2) * 0.18, 0.4, null));
    rise(c3, B(id, 3));
    pop(q(c3, '.mini'), W(id, 3, 2), 0.45, null);

    hide([head, c1, c2, c3], B(id, 4) - 0.15, 0.3, { scale: 0.94 });
    const msg = el('div', '', `<div style="text-align:center"><span class="kicker">המסר המרכזי</span></div>
      <div class="statement" style="margin-top:60px">אבחנה היא</div>
      <div class="statement"><span class="hl">תהליך הערכה</span></div>
      <div style="position:relative;margin:70px auto 0;width:max-content"><div class="statement mute" style="font-size:80px">לא מבחן זיהוי תסמינים</div><div class="big-strike"></div></div>`, sec);
    place(msg, { position: 'absolute', top: '120px', left: '0', right: '0' });
    pop(msg.children[0].firstChild, B(id, 4) - 0.05);
    blurIn(msg.children[1], B(id, 4));
    blurIn(msg.children[2], W(id, 4, 2));
    tl.to(q(msg, '.hl'), { '--p': 1, duration: 0.5, ease: 'power2.out' }, W(id, 4, 2) + 0.3);
    sfx('impact', B(id, 4), 0.6);
    sfx('riser', B(id, 4) - 1.1, 0.3);
    rise(msg.children[3], B(id, 5));
    tl.to(q(msg, '.big-strike'), { width: '104%', duration: 0.6, ease: 'power2.inOut' }, B(id, 5) + 0.45);
    sfx('whoosh', B(id, 5) + 0.45, 0.3);
  };

  builders.outro = (sec, id) => {
    const k = el('div', '', '<span class="kicker" style="--c:var(--violet)">מבט להמשך</span>', sec);
    pop(k.firstChild, B(id, 0));
    const t = el('div', 'title sm', 'מתי הגדרה הופכת <span class="accent">לאבחנה</span>?', sec);
    place(t, { marginTop: '22px' });
    wipe(t, W(id, 0, 1), 0.7);
    const cols = el('div', '', null, sec);
    place(cols, { position: 'absolute', top: '260px', left: '0', right: '0', display: 'flex', gap: '22px' });
    const col = (c, ic, h, items) => `<div class="card tint" style="--c:${c};flex:1;padding:26px 24px">
      <div style="display:flex;align-items:center;gap:14px;font-size:42px;font-weight:900;color:${c};margin-bottom:18px"><div class="badge" style="--c:${c};width:60px;height:60px">${icon(ic)}</div>${h}</div>
      <div style="display:flex;flex-direction:column;gap:12px">${items.map((s) => `<span class="mini" style="font-size:30px">${s}</span>`).join('')}</div></div>`;
    cols.innerHTML = col('var(--lime)', 'check', 'התועלת', ['שפה מקצועית משותפת', 'מהימנות', 'תקשורת בין אנשי מקצוע', 'מחקר ותכנון שירותים'])
      + col('var(--coral)', 'triangle-alert', 'המגבלות', ['הטרוגניות בתוך קטגוריות', 'קומורבידיות', 'תלות בהקשר תרבותי', 'מגבלות תוקף וניבוי']);
    rise(cols.children[0], W(id, 0, 2));
    rise(cols.children[1], W(id, 0, 2) + 0.15);
    const L = qa(cols.children[0], '.mini');
    const R = qa(cols.children[1], '.mini');
    for (let i = 0; i < 4; i++) {
      slide(L[i], W(id, 0, 2) + 0.3 + i * 0.32, 0.45, null);
      slide(R[i], W(id, 0, 2) + 0.46 + i * 0.32, 0.45, null);
    }
    hide([k, t, cols], B(id, 1) - 0.15, 0.3, { scale: 0.94 });
    const end = el('div', '', `<div class="badge bm" style="--c:var(--lime);width:230px;height:230px;margin:0 auto;box-shadow:0 0 0 18px rgba(198,255,61,.15), 0 0 120px rgba(198,255,61,.45)">${icon('bookmark')}</div>
      <div class="title" style="text-align:center;margin-top:60px">שמרו את<br>הסרטון</div>
      <div style="text-align:center;font-size:52px;font-weight:700;margin-top:30px;color:var(--mute)">ונתראה בשיעור הבא</div>
      <div style="text-align:center;font-size:30px;font-weight:600;margin-top:60px;color:var(--dim)">פסיכופתולוגיה א׳ · שיעור 1 · תשפ״ז</div>`, sec);
    place(end, { position: 'absolute', top: '120px', left: '0', right: '0' });
    const p = Array.from(end.children);
    pop(p[0], B(id, 1), 0.6);
    tl.to(q(end, '.bm .ico'), { keyframes: [{ y: -18 }, { y: 0 }, { y: -8 }, { y: 0 }], duration: 0.7 }, B(id, 1) + 0.5);
    wipe(p[1], B(id, 1) + 0.1, 0.6);
    rise(p[2], W(id, 1, 3));
    rise(p[3], W(id, 1, 3) + 0.3);
  };

  SC.forEach((s) => builders[s.id](makeScene(s.id), s.id));

  // ---------- HUD ----------
  const CH = [
    ['המקרים', ['hook', 'yossi', 'guy', 'dana', 'questions']],
    ['נורמלי?', ['warning', 'normal', 'abnormal']],
    ['גישות', ['panic', 'bps']],
    ['הגדרה', ['myth', 'nocond', 'apa']],
    ['5 סימנים', ['c1', 'c2', 'c3', 'c4', 'c5']],
    ['סיכום', ['summary', 'outro']],
  ].map(([name, ids]) => ({ name, t0: win[sIdx[ids[0]]].t0, t1: win[sIdx[ids[ids.length - 1]]].t1 }));
  CH[CH.length - 1].t1 = D;
  const bars = document.querySelector('.hud-bars');
  const fills = CH.map(() => el('i', '', null, el('div', 'hud-bar', null, bars)));
  const chName = document.querySelector('.hud-chapter .name');
  const hud = document.getElementById('hud');
  gsap.set(hud, { autoAlpha: 0, y: -20 });
  tl.to(hud, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.2);
  let curCh = -1;
  updaters.push((t) => {
    let ci = 0;
    CH.forEach((c, i) => {
      const p = Math.max(0, Math.min(1, (t - c.t0) / (c.t1 - c.t0)));
      fills[i].style.width = (p * 100).toFixed(2) + '%';
      if (t >= c.t0) ci = i;
    });
    if (ci !== curCh) { chName.textContent = CH[ci].name; curCh = ci; }
    const since = t - CH[ci].t0;
    chName.style.opacity = String(Math.min(1, Math.max(0, since / 0.3)));
  });

  // ---------- captions ----------
  const capRoot = document.getElementById('captions');
  const pages = [];
  SC.forEach((s, si) => {
    s.beats.forEach((b, bi) => {
      const tw = TIM.scenes[si].beats[bi].words; // [text, start, end]
      const capWords = (b.cap || b.say).split(/\s+/).filter(Boolean);
      let timed;
      if (capWords.length === tw.length) {
        timed = capWords.map((w, i) => [w, tw[i][1], tw[i][2]]);
      } else {
        const t0 = tw[0][1], t1 = tw[tw.length - 1][2];
        const total = capWords.reduce((a, w) => a + w.length, 0);
        let acc = 0;
        timed = capWords.map((w) => { const a = t0 + (t1 - t0) * acc / total; acc += w.length; return [w, a, t0 + (t1 - t0) * acc / total]; });
      }
      let cur = [];
      let chars = 0;
      const flush = () => { if (cur.length) pages.push(cur); cur = []; chars = 0; };
      timed.forEach((w, i) => {
        if (cur.length && (chars + w[0].length > 24 || cur.length >= 5)) flush();
        cur.push(w);
        chars += w[0].length + 1;
        const endsClause = /[.?!:]$/.test(w[0]) || /\.\.\.$/.test(w[0]);
        if (endsClause && cur.length >= 2 && i < timed.length - 1) flush();
      });
      flush();
    });
  });
  const pageEls = pages.map((p, pi) => {
    const pe = el('div', 'cap-page', null, capRoot);
    const inner = el('div', 'cap-inner', null, pe);
    p.forEach((w, wi) => { const s = el('span', 'cap-w', w[0], inner); if (wi < p.length - 1) inner.appendChild(document.createTextNode(' ')); w.push(s); });
    const start = p[0][1] - 0.06;
    const next = pages[pi + 1];
    const endNat = p[p.length - 1][2] + 0.35;
    const end = next ? Math.min(endNat, next[0][1] - 0.06) : endNat;
    return { pe, inner, start, end: Math.max(end, p[p.length - 1][2]), words: p };
  });
  let activePage = null;
  updaters.push((t) => {
    let found = null;
    for (const pg of pageEls) { if (t >= pg.start && t < pg.end) { found = pg; break; } }
    if (activePage && activePage !== found) activePage.pe.style.opacity = '0';
    activePage = found;
    if (!found) return;
    const k = Math.min(1, (t - found.start) / 0.16);
    found.pe.style.opacity = '1';
    found.inner.style.transform = `scale(${(0.9 + 0.1 * (1 - Math.pow(1 - k, 3))).toFixed(4)})`;
    found.words.forEach((w) => {
      const span = w[3];
      const cls = t >= w[2] ? 'cap-w past' : t >= w[1] - 0.02 ? 'cap-w now' : 'cap-w';
      if (span.className !== cls) span.className = cls;
    });
  });

  // ---------- background ----------
  const [b1, b2, b3] = ['.b1', '.b2', '.b3'].map((s) => document.querySelector(s));
  const grid = document.querySelector('.grid');
  const grain = document.getElementById('grain');
  updaters.push((t) => {
    b1.style.transform = `translate(${-380 + Math.sin(t * 0.21) * 180}px, ${-260 + Math.cos(t * 0.17) * 220}px)`;
    b2.style.transform = `translate(${420 + Math.cos(t * 0.19) * 160}px, ${640 + Math.sin(t * 0.23) * 260}px)`;
    b3.style.transform = `translate(${-200 + Math.sin(t * 0.15 + 2) * 220}px, ${1280 + Math.cos(t * 0.13) * 200}px)`;
    grid.style.transform = `translateY(${((t * 14) % 80).toFixed(2)}px)`;
    const f = Math.round(t * 30);
    grain.style.transform = `translate(${((f * 37) % 200) - 100}px, ${((f * 53) % 200) - 100}px)`;
  });

  // ---------- public API ----------
  window.__duration = D;
  window.__sfx = SFX;
  window.__seek = (t) => {
    tl.seek(t, false);
    updaters.forEach((u) => u(t));
  };
  window.__ready = document.fonts.ready.then(() => { window.__seek(0); return true; });

  // preview mode: play in real time when opened directly with ?play
  if (location.search.includes('play')) {
    const audio = new Audio('build/mix.m4a');
    const t0 = performance.now();
    audio.play().catch(() => {});
    const loop = () => { window.__seek((performance.now() - t0) / 1000); requestAnimationFrame(loop); };
    loop();
  }
})();
