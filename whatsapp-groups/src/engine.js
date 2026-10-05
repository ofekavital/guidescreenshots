/*
 * מנוע הסצנה: בונה את ה־DOM מתוך data/scene.js, ומחשב כל פריים באופן
 * דטרמיניסטי מתוך הזמן t (בשניות) — בלי אנימציות CSS. כך כל פריים
 * ברינדור זהה בדיוק לתצוגה המקדימה.
 *
 *   window.WA.seek(t)   — מצייר את הסצנה ברגע t
 *   window.WA.duration  — אורך הסרטון
 */
(function () {
  const S = window.SCENE;
  const { ICONS, AVATARS, GROUP_ART, wallpaperDataUri, pdfPagePreview } = window.WA_ART;
  const VW = S.video.width;
  const VH = S.video.height;
  const PH = S.phones;
  const FX = S.effects || {};

  /* ---------------- עזרים ---------------- */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeOutQuart = (k) => 1 - Math.pow(1 - k, 4);
  const easeOutBack = (k, c1 = 1.4) => 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // רצפים של ספרות (תאריכים, טווחים, מספרים) מבודדים בכיוון LTR בתוך טקסט עברי
  const bidi = (s) =>
    esc(s).replace(/\+\d[\d \-]*\d|\d[\d.\-–\/:]*\d|\d/g, (m) => `<span class="ltr-iso">${m}</span>`);
  const ltr = (s) => `<span class="ltr-iso">${esc(s)}</span>`;
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  const ENTER = FX.messageEnter || 0.5; // משך כניסת הודעה
  const TYPING_DEFAULT = FX.typingDefault == null ? 0.5 : FX.typingDefault;

  // הזנב של בועה נכנסת. בעברית הבועה בצד ימין והזנב בפינה הימנית העליונה
  const TAIL = '<svg viewBox="0 0 8 12"><path fill="currentColor" d="M0 0h6.2c1.5 0 2.2 1.5 1.2 2.6L0 11.6z"/></svg>';

  /* ---------------- שעון ---------------- */
  const [ch, cm] = S.clock.start.split(':').map(Number);
  const clockAt = (at) => {
    const mins = ch * 60 + cm + Math.floor(at * S.clock.minutesPerSecond);
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  /* ---------------- הכנת נתונים ---------------- */
  const groups = S.groups.map((g) => {
    const G = { ...g, byId: {}, msgs: [] };
    let prev = null;
    g.messages.forEach((m, i) => {
      const M = { ...m, index: i, group: G };
      M.isSystem = m.type === 'system';
      M.first = !M.isSystem && (!prev || prev.isSystem || prev.from !== m.from);
      M.timeStr = m.time || clockAt(m.at);
      if (!M.isSystem) {
        // "מקליד/ה…" רק כשיש רווח אמיתי מההודעה הקודמת בקבוצה, כדי שהכותרת לא תהבהב
        const dur = m.typing == null ? TYPING_DEFAULT : m.typing;
        const len = Math.min(dur, prev ? m.at - prev.at - 0.6 : dur);
        M.typingFrom = dur > 0 && len >= 0.45 ? m.at - len : null;
      }
      if (m.id) G.byId[m.id] = M;
      G.msgs.push(M);
      prev = M;
    });
    const join = S.timeline.joins.find((j) => j.group === g.id);
    G.joinAt = join ? join.at : Infinity;
    G.scrolls = (S.timeline.scrolls || []).filter((s) => s.group === g.id);
    G.order = S.timeline.joins.findIndex((j) => j.group === g.id);
    return G;
  });
  const groupById = Object.fromEntries(groups.map((g) => [g.id, g]));
  const joinOrder = S.timeline.joins.map((j) => groupById[j.group]).filter(Boolean);

  const person = (G, key) => {
    const p = G.participants[key];
    if (!p) throw new Error(`משתתף לא מוגדר: ${key} בקבוצה ${G.id}`);
    return p;
  };
  // התווית הראשית: שם איש קשר שמור, או מספר טלפון למי שלא שמור
  const primaryLabel = (p) => (p.saved ? esc(p.name) : ltr(p.phone));
  const typingLabel = (p) => (p.saved ? p.name : '~' + p.pushName.split(/\s[-—–]\s/)[0]);

  /* ---------------- בניית DOM ---------------- */
  const stage = document.getElementById('stage');
  const wallpaper = `url("${wallpaperDataUri()}")`;
  // רקע חי: כתמי אור שזזים לאט + דודלים עדינים, "עולם" שמכיל את הטלפונים, ושכבת אפקטים
  const bg = el('div', 'bg');
  const blobs = [0, 1, 2].map((i) => {
    const b = el('div', 'blob b' + i);
    bg.appendChild(b);
    return b;
  });
  const doodles = el('div', 'bg-doodles');
  doodles.style.backgroundImage = `url("${wallpaperDataUri({ bg: 'none', stroke: 'rgba(255,255,255,0.055)' })}")`;
  bg.appendChild(doodles);
  stage.appendChild(bg);
  const world = el('div', 'world');
  stage.appendChild(world);
  const fxLayer = el('div', 'fx');
  stage.appendChild(fxLayer);

  function buildMessage(G, M) {
    const wrap = el('div', 'msg-wrap');
    const inner = el('div', 'msg-inner');
    wrap.appendChild(inner);
    const hl = el('div', 'msg-hl');
    inner.appendChild(hl);
    M.wrap = wrap;
    M.inner = inner;
    M.hl = hl;

    if (M.isSystem) {
      inner.appendChild(el('div', 'sys-row', `<div class="chip">${bidi(M.text)}</div>`));
      return wrap;
    }

    const p = person(G, M.from);
    const row = el('div', 'msg-row' + (M.first ? ' first' : ''));
    const avatar = el('div', 'avatar' + (M.first ? '' : ' spacer'), M.first ? (AVATARS[p.avatar] || AVATARS.default)() : '');
    row.appendChild(avatar);

    const bubble = el('div', 'bubble' + (M.file ? ' has-file' : '') + (M.card ? ' has-card' : ''));
    bubble.appendChild(el('span', 'tail', TAIL));

    if (M.first) {
      const sender = el('div', 'sender');
      sender.appendChild(el('span', 'primary', primaryLabel(p)));
      sender.firstChild.style.color = p.color;
      if (!p.saved) sender.appendChild(el('span', 'push', '~' + esc(p.pushName)));
      bubble.appendChild(sender);
    }

    if (M.reply) {
      const Q = G.byId[M.reply];
      if (!Q) throw new Error(`הודעה מצוטטת לא נמצאה: ${M.reply}`);
      const qp = person(G, Q.from);
      let qtext;
      if (Q.file) qtext = `<span class="qicon">${ICONS.doc}</span>${bidi(Q.file.name)}`;
      else if (Q.card) qtext = bidi(Q.card.title);
      else qtext = bidi(Q.text);
      const quote = el(
        'div',
        'quote',
        `<div class="bar" style="background:${qp.color}"></div><div class="qbody"><div class="qname" style="color:${qp.color}">${primaryLabel(qp)}</div><div class="qtext">${qtext}</div></div><div class="ripple"></div>`
      );
      M.ripple = quote.querySelector('.ripple');
      bubble.appendChild(quote);
    }

    if (M.file) {
      const f = M.file;
      const isPdf = f.kind === 'pdf';
      const parts = [];
      if (f.pages) parts.push(`${ltr(String(f.pages))} עמודים`);
      parts.push(isPdf ? 'PDF' : ltr((f.ext || f.name.split('.').pop()).toUpperCase()));
      if (f.size) parts.push(ltr(f.size));
      bubble.appendChild(
        el(
          'div',
          'doc',
          (isPdf ? `<div class="preview">${pdfPagePreview(p.color)}</div>` : '') +
            `<div class="row"><div class="ficon ${isPdf ? 'pdf' : 'doc'}">${isPdf ? 'PDF' : 'DOC'}</div><div class="fmeta"><div class="fname">${bidi(f.name)}</div><div class="finfo">${parts.join(' • ')}</div></div></div>`
        )
      );
    }

    if (M.card) {
      const c = M.card;
      bubble.appendChild(
        el(
          'div',
          'card',
          `<div class="art">${(GROUP_ART[c.art] || GROUP_ART[G.avatar])()}<div class="badge">i</div></div><div class="cbody"><div class="ctitle">${bidi(c.title)}</div>${c.subtitle ? `<div class="csub">${bidi(c.subtitle)}</div>` : ''}</div>`
        )
      );
    }

    const hasText = M.text && M.text.length;
    const textBlock = el('div', 'text', (hasText ? bidi(M.text) : '') + '<span class="time-spacer"></span>');
    textBlock.setAttribute('dir', 'auto');
    if (M.file || M.card) {
      const cap = el('div', 'caption' + (hasText ? '' : ' empty'));
      cap.appendChild(textBlock);
      bubble.appendChild(cap);
    } else {
      bubble.appendChild(textBlock);
    }
    bubble.appendChild(el('span', 'time', M.timeStr));

    if (M.reactions && M.reactions.length) {
      M.pill = el('div', 'reactions');
      M.pill.style.display = 'none';
      bubble.appendChild(M.pill);
      M.pillKey = '';
    }

    row.appendChild(bubble);
    inner.appendChild(row);
    return wrap;
  }

  function buildPhone(G) {
    const phone = el('div', 'phone');
    phone.style.width = PH.width + 'px';
    phone.style.height = PH.height + 'px';
    const device = el('div', 'device');
    device.style.borderRadius = PH.radius + 'px';
    const clip = el('div', 'screen-clip');
    clip.style.inset = PH.bezel + 'px';
    clip.style.borderRadius = PH.radius - PH.bezel + 'px';
    const screen = el('div', 'screen');
    const s = (PH.width - 2 * PH.bezel) / PH.dpWidth;
    screen.style.width = PH.dpWidth + 'px';
    screen.style.height = (PH.height - 2 * PH.bezel) / s + 'px';
    screen.style.transform = `scale(${s})`;
    clip.appendChild(screen);
    device.appendChild(clip);
    const punch = el('div', 'punch');
    punch.style.top = PH.bezel + 9 + 'px';
    device.appendChild(punch);
    phone.appendChild(device);
    const glow = el('div', 'glow');
    glow.style.borderRadius = PH.radius + 6 + 'px';
    phone.appendChild(glow);

    // שורת הסטטוס של אנדרואיד (בעברית: השעון מימין, הסמלים משמאל)
    const status = el(
      'div',
      'status',
      `<span class="clock ltr-iso"></span><span class="sicons">${ICONS.signal}${ICONS.wifi}${ICONS.battery}</span>`
    );
    screen.appendChild(status);

    // כותרת
    // רשימת המשתתפים בכותרת: אנשי קשר שמורים, אחריהם מספרי טלפון, ובסוף "את/ה"
    const saved = Object.values(G.participants).filter((p) => p.saved).map((p) => p.name);
    const phones = Object.values(G.participants).filter((p) => !p.saved).map((p) => p.phone);
    G.membersText = [...saved, ...phones, 'את/ה'].join(', ');
    const header = el(
      'div',
      'wa-header',
      `<div class="ic back">${ICONS.back}</div>
       <div class="gavatar">${(GROUP_ART[G.avatar] || AVATARS.default)()}</div>
       <div class="titles"><div class="title"></div>
         <div class="subwrap"><div class="sub members"></div><div class="sub typing"></div></div></div>
       <div class="icons"><div class="ic">${ICONS.video}</div><div class="ic">${ICONS.call}</div><div class="ic">${ICONS.more}</div></div>`
    );
    screen.appendChild(header);

    // צ'אט
    const chat = el('div', 'chat');
    chat.style.backgroundImage = wallpaper;
    const scroller = el('div', 'scroller');
    scroller.appendChild(el('div', 'sys-row', '<div class="chip date">היום</div>'));
    if (G.encryptionNotice !== false) {
      scroller.appendChild(
        el(
          'div',
          'sys-row',
          `<div class="chip crypto"><span class="lock">${ICONS.lock}</span>ההודעות והשיחות מוצפנות מקצה לקצה. רק המשתתפים בצ'אט הזה יכולים לקרוא אותן, להאזין להן או לשתף אותן. <span class="more">מידע נוסף</span></div>`
        )
      );
    }
    G.msgs.forEach((M) => {
      const w = buildMessage(G, M);
      w.style.display = 'none';
      M.vis = false;
      scroller.appendChild(w);
    });
    chat.appendChild(scroller);
    const fab = el('div', 'fab-down', ICONS.down);
    chat.appendChild(fab);
    screen.appendChild(chat);

    // שורת הקלדה
    screen.appendChild(
      el(
        'div',
        'wa-input',
        `<div class="field"><div class="ic">${ICONS.emoji}</div><div class="placeholder">הודעה</div><div class="ic attach">${ICONS.attach}</div><div class="ic">${ICONS.camera}</div></div><div class="mic">${ICONS.mic}</div>`
      )
    );

    phone.style.display = 'none';
    world.appendChild(phone);

    Object.assign(G, {
      phone,
      glow,
      clock: status.querySelector('.clock'),
      screen,
      chat,
      scroller,
      fab,
      titleEl: header.querySelector('.title'),
      titleFit: {},
      membersFit: {},
      subMembers: header.querySelector('.sub.members'),
      subTyping: header.querySelector('.sub.typing'),
      typingKey: '',
    });
  }

  groups.forEach(buildPhone);

  /* ---------------- אפקט: אימוג'ים שעפים מתגובה חדשה ---------------- */
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bursts = [];
  if (FX.reactionBursts) {
    for (const G of groups) {
      for (const M of G.msgs) {
        if (!M.reactions) continue;
        M.reactions.forEach((r, j) => {
          const prevE = j ? M.reactions[j - 1].emojis : [];
          const fresh = r.emojis.filter((e) => !prevE.includes(e));
          const emoji = (fresh.length ? fresh : r.emojis).slice(-1)[0];
          for (let n = 0; n < 3; n++) {
            const p = el('span', 'particle', emoji);
            p.style.display = 'none';
            fxLayer.appendChild(p);
            bursts.push({
              G,
              M,
              at: r.at + n * 0.08,
              el: p,
              ang: (-160 + rnd() * 120) * (Math.PI / 180),
              dist: 70 + rnd() * 70,
              size: 26 + rnd() * 10,
              spin: -25 + rnd() * 50,
            });
          }
        });
      }
    }
  }

  /* ---------------- קיצור טקסט בכותרת ----------------
   * קיצור "לוגי" עם … בסוף המחרוזת (כמו באנדרואיד), במקום קיצור ויזואלי של
   * הדפדפן שחותך מספרים וטווחי תאריכים מהצד הלא נכון בטקסט מימין לשמאל */
  const measureCtx = document.createElement('canvas').getContext('2d');
  const FONT_STACK = 'Roboto, "Noto Sans Hebrew", "Noto Color Emoji"';
  // byItems: לקצר רק בגבולות פריטים (", ") — כדי שלא יישאר חצי מספר טלפון
  function fitText(elm, text, font, st, byItems) {
    const avail = elm.clientWidth - 1;
    if (st.w != null && Math.abs(avail - st.w) < 0.3) return;
    st.w = avail;
    measureCtx.font = font + ' ' + FONT_STACK;
    const fits = (s) => measureCtx.measureText(s).width <= avail;
    let out = text;
    if (!fits(text)) {
      out = null;
      if (byItems) {
        const items = text.split(', ');
        for (let n = items.length - 1; n >= 1 && !out; n--) {
          const cand = items.slice(0, n).join(', ') + ', …';
          if (fits(cand)) out = cand;
        }
      }
      if (!out) {
        const chars = Array.from(text);
        const cut = (n) => chars.slice(0, n).join('').replace(/[\s,.|\-–—+]+$/, '') + '…';
        let lo = 0;
        let hi = chars.length;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (fits(cut(mid))) lo = mid;
          else hi = mid - 1;
        }
        out = cut(lo);
      }
    }
    if (out !== st.text) {
      elm.innerHTML = bidi(out);
      st.text = out;
    }
  }

  /* ---------------- פריסה ----------------
   * כל הטלפונים באותו גודל, בשורה אחת ממורכזת. קבוצה חדשה נכנסת משמאל
   * (סדר עברי: הראשונה מימין), והשורה כולה מתמרכזת מחדש בתנועה רכה. */
  function computeLayout(t) {
    const active = joinOrder.filter((g) => t >= g.joinAt);
    const enter = active.map((g) => clamp((t - g.joinAt) / PH.joinDuration));
    const pres = active.map((g, i) => (i === 0 ? 1 : easeInOut(enter[i])));
    const total = pres.reduce((a, p, i) => a + PH.width * p + (i ? PH.gap * p : 0), 0);
    const y0 = (VH - PH.height) / 2;
    let right = (VW + total) / 2;
    return active.map((g, i) => {
      if (i) right -= PH.gap * pres[i];
      const x = right - PH.width;
      right -= PH.width * pres[i];
      return { g, x, y: y0, enter: enter[i], presence: pres[i] };
    }).concat([{ nEff: pres.reduce((a, b) => a + b, 0) }]);
  }

  function zoomFor(n) {
    const Z = (S.camera && S.camera.zoomByCount) || {};
    const lo = Math.max(1, Math.floor(n));
    const hi = lo + 1;
    const zl = Z[lo] == null ? 1 : Z[lo];
    const zh = Z[hi] == null ? zl : Z[hi];
    return lerp(zl, zh, clamp(n - lo));
  }

  /* ---------------- עדכון צ'אט ---------------- */
  function reactionState(M, t) {
    if (!M.reactions) return null;
    let cur = null;
    for (const r of M.reactions) if (t >= r.at) cur = r;
    if (!cur) return null;
    const firstAt = M.reactions[0].at;
    return { r: cur, pop: clamp((t - cur.at) / 0.4), appear: clamp((t - firstAt) / 0.45) };
  }

  function updateChat(G, t) {
    const visible = [];
    for (const M of G.msgs) {
      if (t < M.at) {
        if (M.vis) {
          M.wrap.style.display = 'none';
          M.vis = false;
        }
        continue;
      }
      if (!M.vis) {
        M.wrap.style.display = '';
        M.vis = true;
      }
      visible.push(M);
      if (M.pill) {
        const rs = reactionState(M, t);
        if (!rs) {
          M.pill.style.display = 'none';
          M.inner.style.paddingBottom = '0px';
        } else {
          const key = rs.r.emojis.join('') + rs.r.count;
          if (key !== M.pillKey) {
            M.pill.innerHTML =
              rs.r.emojis.map((e) => `<span class="em">${e}</span>`).join('') +
              (rs.r.count > 1 ? `<span class="cnt">${ltr(String(rs.r.count))}</span>` : '');
            M.pillKey = key;
          }
          M.pill.style.display = '';
          const k = rs.pop;
          const sc = k < 1 ? 0.6 + 0.4 * easeOutBack(k, 1.3) : 1;
          M.pill.style.transform = `scale(${sc})`;
          M.pill.style.opacity = rs.appear < 1 ? clamp(rs.appear * 2) : 1;
          M.inner.style.paddingBottom = 19 * easeInOut(rs.appear) + 'px';
        }
      }
    }
    // מדידה ואז כתיבה (בלי לגרום לחישובי פריסה חוזרים)
    const heights = visible.map((M) => M.inner.offsetHeight);
    visible.forEach((M, i) => {
      const k = clamp((t - M.at) / ENTER);
      const e = easeOutQuart(k);
      M.wrap.style.height = heights[i] * e + 'px';
      M.inner.style.opacity = k < 1 ? clamp(k * 1.8) : 1;
      M.inner.style.transform = k < 1 ? `translateY(${(1 - e) * 10}px) scale(${0.97 + 0.03 * e})` : 'none';
      M.hl.style.opacity = 0;
    });

    // גלילה אל הודעה קודמת + הדגשה
    let Y = 0;
    let fab = 0;
    for (const sc of G.scrolls) {
      const tin = 0.75;
      const tout = 0.65;
      const a = sc.at;
      const b = a + tin + sc.hold;
      if (sc.tapReply) {
        const R = G.byId[sc.tapReply];
        if (R && R.ripple) {
          const k = clamp((t - (a - 0.5)) / 0.5);
          R.ripple.style.opacity = k > 0 && k < 1 ? 0.9 * (1 - k) : 0;
          R.ripple.style.transform = `scale(${0.2 + 1.6 * easeOut(k)})`;
        }
      }
      if (t < a || t > b + tout) continue;
      const T = G.byId[sc.target];
      if (!T || !T.vis) continue;
      const chatH = G.chat.clientHeight;
      const scrollerH = G.scroller.offsetHeight;
      const top = T.wrap.offsetTop;
      const h = T.wrap.offsetHeight;
      const target = clamp(chatH / 2 - (chatH - scrollerH + top + h / 2), 0, Math.max(0, scrollerH - chatH));
      let k;
      if (t < a + tin) k = easeInOut((t - a) / tin);
      else if (t <= b) k = 1;
      else k = 1 - easeInOut((t - b) / tout);
      Y = Math.max(Y, target * k);
      fab = Math.max(fab, clamp(k * 1.5));
      const hk = t < a + tin ? 0 : t <= b ? clamp((t - a - tin) / 0.25) : clamp(1 - (t - b) / 0.35);
      T.hl.style.opacity = hk * (0.75 + 0.25 * Math.cos((t - a - tin) * 5));
    }
    G.scroller.style.transform = Y ? `translateY(${Y}px)` : 'none';
    G.fab.style.opacity = fab;

    // "מקליד/ה…" בכותרת
    let typer = null;
    for (const M of G.msgs) {
      if (M.typingFrom != null && t >= M.typingFrom && t < M.at) typer = M;
    }
    let ty = 0;
    if (typer) {
      const key = typer.from;
      if (key !== G.typingKey) {
        G.subTyping.innerHTML = `${esc(typingLabel(person(G, typer.from)))} מקליד/ה…`;
        G.typingKey = key;
      }
      ty = Math.min(easeInOut(clamp((t - typer.typingFrom) / 0.22)), easeInOut(clamp((typer.at - t) / 0.18)));
    }
    G.subTyping.style.opacity = ty;
    G.subMembers.style.opacity = 1 - ty;
  }

  /* ---------------- ציור פריים ---------------- */
  function seek(t) {
    // רקע
    blobs.forEach((b, i) => {
      const a = t * (0.35 + i * 0.12) + i * 2.1;
      b.style.transform = `translate(${Math.cos(a) * 140}px, ${Math.sin(a * 1.3) * 90}px)`;
    });

    const lay = computeLayout(t);
    const { nEff } = lay.pop();
    const zoom = zoomFor(nEff);
    world.style.transform = zoom === 1 ? 'none' : `scale(${zoom})`;
    // כל טלפון הוא שכבה נפרדת (will-change), שזזה בתת־פיקסלים בלי "קפיצות" של הצמדה לפיקסל.
    // במנוחה המיקומים שלמים (המרכוז מחושב כך), כך שהטקסט חד.
    const snap = (v) => (Math.abs(v - Math.round(v)) < 0.002 ? Math.round(v) : v);

    const clockStr = clockAt(t);
    const shown = new Set();
    for (const it of lay) {
      const G = it.g;
      shown.add(G);
      const P = G.phone;
      if (P.style.display === 'none') P.style.display = '';
      // כניסה: הטלפון עולה מלמטה ומתייצב בתנועה רכה, בלי קפיצה מעבר ליעד
      const e = easeOut(it.enter);
      const fl = (PH.float || 0) * Math.sin(t * 1.7 + G.order * 1.9) * clamp(it.enter * 2);
      const ty = (1 - e) * (PH.enterRise == null ? 380 : PH.enterRise) + fl;
      // ההגדלה מסתיימת לפני סוף התנועה, כך שהסוף האיטי הוא הזזה בלבד (בלי ריצוד של טקסט)
      const sc = 0.94 + 0.06 * easeOut(clamp(it.enter / 0.65));
      const rot = (1 - e) * (PH.enterTilt || 0);
      const tr = `translate(${snap(it.x)}px, ${snap(it.y + ty)}px)`;
      P.style.transform = rot || sc !== 1 ? `${tr} rotate(${rot}deg) scale(${sc})` : tr;
      P.style.opacity = easeOut(clamp(it.enter * 2.5));
      P.style.zIndex = 10 + G.order;

      const gk = clamp((t - G.joinAt - 0.2) / 1.6);
      G.glow.style.opacity = FX.joinGlow && gk > 0 && gk < 1 ? Math.sin(gk * Math.PI) * 0.55 : 0;

      if (G.clock.textContent !== clockStr) G.clock.textContent = clockStr;
      fitText(G.titleEl, G.title, '500 17px', G.titleFit);
      fitText(G.subMembers, G.membersText, '400 13px', G.membersFit, true);
      updateChat(G, t);
    }
    for (const G of groups) if (!shown.has(G)) G.phone.style.display = 'none';

    // אימוג'ים שעפים מהתגובות
    if (bursts.length) {
      const sr = stage.getBoundingClientRect();
      const k0 = sr.width / VW;
      for (const b of bursts) {
        const k = (t - b.at) / 0.95;
        if (k < 0 || k > 1 || !b.M.vis || !b.M.pill || b.M.pill.style.display === 'none') {
          b.el.style.display = 'none';
          continue;
        }
        const r = b.M.pill.getBoundingClientRect();
        const cx = (r.left + r.width * 0.3 - sr.left) / k0;
        const cy = (r.top + r.height / 2 - sr.top) / k0;
        const d = b.dist * easeOut(k);
        const x = cx + Math.cos(b.ang) * d;
        const y = cy + Math.sin(b.ang) * d - 40 * k;
        const s2 = (0.4 + 0.8 * easeOutBack(clamp(k * 2.2), 2)) * (b.size / 30);
        b.el.style.display = '';
        b.el.style.opacity = k < 0.12 ? k / 0.12 : 1 - Math.pow((k - 0.12) / 0.88, 2);
        b.el.style.transform = `translate(${x - 15}px, ${y - 15}px) rotate(${b.spin * k}deg) scale(${s2})`;
      }
    }
  }

  // איפוס מטמון מדידות הטקסט (למשל אחרי שגופן סיים להיטען)
  function invalidate() {
    for (const G of groups) {
      G.titleFit = {};
      G.membersFit = {};
    }
  }
  document.fonts.addEventListener('loadingdone', invalidate);

  window.WA = {
    seek,
    invalidate,
    duration: S.video.duration,
    fps: S.video.fps,
    width: VW,
    height: VH,
    markers: S.timeline.joins.map((j) => ({ at: j.at, label: 'הצטרפות: ' + j.group })),
  };
})();
