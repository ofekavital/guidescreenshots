/*
 * מנוע המושן. כל פריים נקבע רק לפי הזמן t (MG.seek), כך שהרינדור דטרמיניסטי ואפשר לפצל אותו
 * לכמה תהליכים. פריים הווידאו של אותו רגע נטען כרקע (#bg), ולכן אפשר לטשטש אותו מאחורי כרטיסים
 * (backdrop-filter) ולהזיז אותו (push). התוכן עצמו נמצא ב־cues.js, והזמנים יחסיים לשוטים
 * שב־edit/timeline.json, כך ששינוי בעריכה לא שובר את הסנכרון.
 */
(() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const P = (t, a, d) => clamp((t - a) / d);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    outBack: (x) => {
      const c1 = 1.35, c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
  };
  const env = (lt, dur, tin, tout, eIn = E.outExpo, eOut = E.inCubic) => [eIn(P(lt, 0, tin)), eOut(P(lt, dur - tout, tout))];
  const icon = (name) => `<svg viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`;
  const words = (text) => text.split(' ').map((w) => `<span class="w"><span>${w}</span></span>`).join(' ');
  const appIcon = '<b style="color:#fff;font-weight:400;font-size:19px;letter-spacing:.5px;direction:ltr">ON</b>';

  // כניסת מילים מתוך מסכה, אחת אחרי השנייה, ויציאה כלפי מעלה בסוף הקיו
  function wordsIn(root, lt, dur, { delay = 0, stagger = 0.07, tin = 0.8, tout = 0.42 } = {}) {
    const ws = root.querySelectorAll('.w > span');
    const n = ws.length;
    ws.forEach((s, i) => {
      const a = E.outExpo(P(lt, delay + i * stagger, tin));
      const b = E.inCubic(P(lt, dur - tout - (n - 1 - i) * 0.025, tout));
      s.style.transform = `translate3d(0, ${(1 - a - b) * 112}%, 0)`;
    });
  }

  function wrap(c, z = 3) {
    const w = document.createElement('div');
    w.className = 'cue';
    w.style.zIndex = z;
    for (const [k, v] of Object.entries(c.pos || {})) w.style[k] = typeof v === 'number' ? v + 'px' : v;
    return w;
  }

  function scrim(kind) {
    const s = document.createElement('div');
    s.className = 'cue scrim ' + kind;
    s.style.zIndex = 1;
    s.style.inset = '0';
    return s;
  }

  /* ---------------- סוגי הקיו ---------------- */
  const TYPES = {
    title(c) {
      const w = wrap(c);
      const lines = c.lines.map((l) => (l.startsWith('~') ? `<div class="line small">${words(l.slice(1))}</div>` : `<div class="line">${words(l)}</div>`));
      w.innerHTML = `<div class="title ${c.align || ''}">${lines.join('')}${c.bar === false ? '' : '<div class="bar"></div>'}</div>`;
      const bar = w.querySelector('.bar');
      const s = c.scrim ? scrim(c.scrim) : null;
      return {
        el: w, extra: s,
        update(lt, dur) {
          wordsIn(w, lt, dur, { delay: 0.05, stagger: 0.075 });
          if (bar) {
            const [a, b] = env(lt - 0.3, dur - 0.3, 0.9, 0.32);
            bar.style.transform = `scaleX(${a * (1 - b)})`;
          }
          if (s) s.style.opacity = E.inOutSine(P(lt, 0, 0.5)) * (1 - E.inOutSine(P(lt, dur - 0.5, 0.5)));
        },
      };
    },

    chip(c) {
      const w = wrap(c);
      const sub = c.sub ? `<div class="sub">${c.subIcon === false ? '' : icon('pin')}<span>${c.sub}</span></div>` : '';
      w.innerHTML = `<div class="chip"><div class="ico">${icon(c.icon)}</div><div class="txt"><div class="main">${words(c.main)}</div>${sub}</div></div>`;
      const chip = w.firstChild, ico = w.querySelector('.ico'), subEl = w.querySelector('.sub');
      return {
        el: w,
        update(lt, dur) {
          const [a, b] = env(lt, dur, 0.7, 0.38);
          chip.style.opacity = P(lt, 0, 0.18) * (1 - b);
          chip.style.transform = `translate3d(${(1 - a) * 70}px, ${b * 14}px, 0)`;
          ico.style.transform = `scale(${E.outBack(P(lt, 0.08, 0.55))}) rotate(${(1 - E.outExpo(P(lt, 0.08, 0.7))) * -40}deg)`;
          wordsIn(chip.querySelector('.main'), lt, dur + 1, { delay: 0.14, stagger: 0.06 });
          if (subEl) {
            const s = E.outExpo(P(lt, 0.32, 0.6));
            subEl.style.opacity = s;
            subEl.style.transform = `translate3d(${(1 - s) * 24}px,0,0)`;
          }
        },
      };
    },

    notify(c) {
      const w = wrap(c, 4);
      const ic = c.appIcon ? icon(c.appIcon) : appIcon;
      w.innerHTML = `<div class="notify"><div class="hd"><div class="app">${ic}</div><div class="name">${c.app || 'נופשON'}</div><div class="time">עכשיו</div></div><div class="tt">${c.title}</div><div class="bd">${c.body}</div></div>`;
      const n = w.firstChild;
      if (c.from) n.style.transformOrigin = `${c.from[0] - (c.pos.left ?? 1920 - c.pos.right - 640)}px ${c.from[1] - c.pos.top}px`;
      return {
        el: w,
        update(lt, dur) {
          const b = E.inCubic(P(lt, dur - 0.35, 0.35));
          if (c.from) {
            const a = E.outExpo(P(lt, 0, 0.75));
            n.style.transform = `scale(${lerp(0.08, 1, a) * (1 - 0.04 * b)}) translate3d(0, ${-b * 24}px, 0)`;
            n.style.opacity = P(lt, 0, 0.12) * (1 - b);
          } else {
            const a = E.outBack(P(lt, 0, 0.7));
            n.style.transform = `translate3d(0, ${(1 - a) * -80 - b * 30}px, 0) scale(${lerp(0.94, 1, P(lt, 0, 0.5)) - 0.03 * b})`;
            n.style.opacity = P(lt, 0, 0.22) * (1 - b);
          }
        },
      };
    },

    bubble(c) {
      const w = wrap(c, 4);
      const meta = c.sent ? `<span class="meta">${icon('check2')}</span>` : '';
      w.innerHTML = `<div class="bubble ${c.sent ? 'sent' : ''}">${c.text}${meta}</div>`;
      const bub = w.firstChild;
      bub.style.transformOrigin = c.origin || '100% 100%';
      return {
        el: w,
        update(lt, dur) {
          const a = E.outBack(P(lt, 0, 0.55));
          const b = E.inCubic(P(lt, dur - 0.3, 0.3));
          bub.style.transform = `scale(${lerp(0.3, 1, a) * (1 - 0.1 * b)})`;
          bub.style.opacity = P(lt, 0, 0.12) * (1 - b);
        },
      };
    },

    panel(c) {
      const w = wrap(c);
      const rows = c.rows.map((r) => `<div class="row"><div class="ico">${icon(r.icon)}</div><div class="lb">${r.label}${r.small ? `<small>${r.small}</small>` : ''}</div></div>`);
      w.innerHTML = `<div class="panel"><div class="ph">${words(c.title)}</div>${rows.join('')}</div>`;
      const panel = w.firstChild, rowEls = [...w.querySelectorAll('.row')];
      return {
        el: w,
        update(lt, dur) {
          const [a, b] = env(lt, dur, 0.8, 0.4);
          panel.style.opacity = P(lt, 0, 0.25) * (1 - b);
          panel.style.transform = `translate3d(${(1 - a) * -60}px, ${b * 16}px, 0)`;
          wordsIn(panel.querySelector('.ph'), lt, dur + 1, { delay: 0.12 });
          rowEls.forEach((r, i) => {
            const k = E.outExpo(P(lt, 0.6 + i * 0.4, 0.7));
            r.style.opacity = k;
            r.style.transform = `translate3d(${(1 - k) * 36}px,0,0)`;
            r.firstChild.style.transform = `scale(${E.outBack(P(lt, 0.6 + i * 0.4, 0.55))})`;
          });
        },
      };
    },

    label(c) {
      const w = wrap(c);
      w.innerHTML = `<div class="label"><span class="big">${words(c.text)}</span>${c.loc ? `<div class="loc">${icon('pin')}<span>${c.loc}</span></div>` : ''}<div class="bar"></div></div>`;
      const loc = w.querySelector('.loc'), bar = w.querySelector('.bar');
      const s = c.scrim === false ? null : scrim(c.scrim || 'br');
      return {
        el: w, extra: s,
        update(lt, dur) {
          wordsIn(w.querySelector('.big'), lt, dur, { delay: 0.04, stagger: 0.06, tin: 0.7, tout: 0.3 });
          const [a, b] = env(lt - 0.25, dur - 0.25, 0.6, 0.25);
          if (loc) {
            loc.style.opacity = a * (1 - b);
            loc.style.transform = `translate3d(${(1 - a) * 20}px,0,0)`;
          }
          const [ba, bb] = env(lt - 0.15, dur - 0.15, 0.8, 0.28);
          bar.style.transform = `scaleX(${ba * (1 - bb)})`;
          if (s) s.style.opacity = 0.85 * E.inOutSine(P(lt, 0, 0.3)) * (1 - E.inOutSine(P(lt, dur - 0.3, 0.3)));
        },
      };
    },

    survey(c) {
      const w = wrap(c, 4);
      const star = `<svg viewBox="0 0 24 24"><path d="${'M12 3.4l2.6 5.4 5.9.8-4.3 4.2 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.2 5.9-.8z'}"/></svg>`;
      w.innerHTML = `<div class="survey"><div class="hd"><div class="app">${appIcon}</div>נופשON · משוב</div><div class="q">${c.q}</div><div class="stars">${star.repeat(5)}</div><div class="thanks">${c.thanks}</div><div class="ripple"></div></div>`;
      const card = w.firstChild, stars = [...w.querySelectorAll('.stars path')], thanks = w.querySelector('.thanks'), rip = w.querySelector('.ripple');
      return {
        el: w,
        update(lt, dur) {
          const a = E.outBack(P(lt, 0, 0.6));
          const b = E.inCubic(P(lt, dur - 0.3, 0.3));
          card.style.transform = `translate3d(0, ${(1 - a) * 70 + b * 20}px, 0) scale(${lerp(0.92, 1, a)})`;
          card.style.opacity = P(lt, 0, 0.2) * (1 - b);
          stars.forEach((p, i) => {
            const k = P(lt, 0.55 + i * 0.1, 0.12);
            p.style.fill = `rgba(245,166,35,${k})`;
            p.parentNode.style.transform = `scale(${1 + 0.25 * Math.sin(Math.PI * k)})`;
          });
          // הדירוג מתמלא מימין לשמאל; הטאץ׳ נוחת על הכוכב החמישי (השמאלי)
          const last = stars[4].parentNode;
          const r = P(lt, 1.05, 0.5);
          rip.style.left = last.offsetLeft + last.offsetWidth / 2 - 60 + 'px';
          rip.style.top = last.offsetTop + last.offsetHeight / 2 - 60 + 'px';
          rip.style.opacity = r > 0 && r < 1 ? 1 - r : 0;
          rip.style.transform = `scale(${0.3 + r * 1.1})`;
          const tk = E.outExpo(P(lt, 1.2, 0.6));
          thanks.style.opacity = tk;
          thanks.style.transform = `translate3d(0, ${(1 - tk) * 16}px, 0)`;
        },
      };
    },

    caption(c) {
      const w = wrap(c, 4);
      w.innerHTML = `<div class="caption"><span class="who">${c.who}</span>${words(c.text)}</div>`;
      const ws = [...w.querySelectorAll('.w > span')], who = w.querySelector('.who');
      return {
        el: w,
        update(lt, dur) {
          const b = E.inCubic(P(lt, dur - 0.3, 0.3));
          who.style.opacity = P(lt, 0, 0.25) * (1 - b);
          ws.forEach((s, i) => {
            const k = E.outCubic(P(lt, (c.times ? c.times[i] : i * (c.rate || 0.26)), 0.3));
            s.style.opacity = k * (1 - b);
            s.style.transform = `translate3d(0, ${(1 - k) * 30}%, 0)`;
          });
        },
      };
    },

    split(c) {
      const w = wrap({ pos: { inset: 0 } });
      w.innerHTML = `<div class="divider"></div>
        <div class="nametag" style="right:70px"><div class="ico">${icon('phone')}</div>${c.right}</div>
        <div class="nametag" style="left:70px"><div class="ico">${icon('phone')}</div>${c.left}</div>`;
      const div = w.querySelector('.divider'), tags = [...w.querySelectorAll('.nametag')];
      return {
        el: w,
        update(lt, dur) {
          const [a, b] = env(lt, dur, 0.7, 0.3);
          div.style.transform = `scaleY(${a * (1 - b)})`;
          tags.forEach((t, i) => {
            const k = E.outExpo(P(lt, 0.25 + i * 0.15, 0.7));
            t.style.opacity = k * (1 - b);
            t.style.transform = `translate3d(0, ${(1 - k) * 50}px, 0)`;
          });
        },
      };
    },

    logo(c) {
      const w = wrap({ pos: { inset: 0 } }, 6);
      w.innerHTML = `<div class="logo"><div class="badge"><img src="assets/brand/nofeshon-badge.png"><div class="glow"></div><div class="sweep"><i></i></div></div></div>`;
      const badge = w.querySelector('.badge'), glow = w.querySelector('.glow'), sw = w.querySelector('.sweep i');
      return {
        el: w,
        update(lt, dur) {
          const a = E.outBack(P(lt, 0, 0.6));
          const x = E.inExpo(P(lt, dur - 0.32, 0.32));
          badge.style.transform = `scale(${lerp(0.78, 1, a) * lerp(1, 2.8, x)})`;
          badge.style.opacity = P(lt, 0, 0.2) * (1 - x);
          badge.style.filter = `blur(${(1 - P(lt, 0, 0.35)) * 16 + x * 10}px)`;
          sw.style.left = lerp(-35, 125, E.inOutCubic(P(lt, 0.35, 0.65))) + '%';
          // ההבהוב של ה־ON — "נדלק" כמו מנורה
          const f = [0, 1, 0.15, 0.9, 0.3, 1][Math.floor(P(lt, 0.4, 0.36) * 5.99)];
          glow.style.opacity = (lt < 0.4 ? 0 : f) * (1 - x) * 0.9;
        },
      };
    },

    flash(c) {
      const w = wrap({ pos: { inset: 0 } }, 8);
      w.innerHTML = '<div class="flash"></div>';
      return {
        el: w,
        update(lt, dur) {
          const peak = c.peak ?? 0.35;
          const k = lt < dur * peak ? E.outCubic(lt / (dur * peak)) : 1 - E.inOutSine((lt - dur * peak) / (dur * (1 - peak)));
          w.firstChild.style.opacity = k * (c.strength ?? 0.9);
        },
      };
    },

    leak(c) {
      const w = wrap({ pos: { inset: 0 } }, 7);
      w.innerHTML = '<div class="leak"></div>';
      return {
        el: w,
        update(lt, dur) {
          const k = Math.sin(Math.PI * P(lt, 0, dur));
          w.firstChild.style.opacity = k * (c.strength ?? 0.75);
          w.firstChild.style.transform = `translate3d(${lerp(-120, 120, lt / dur)}px, 0, 0)`;
        },
      };
    },

    push(c) {
      return {
        bg: true,
        update(lt, dur) {
          const k = E.inOutSine(P(lt, 0, dur));
          const s = lerp(c.from ?? 1, c.to ?? 1.06, k);
          bgwrap.style.transform = `translate3d(${c.x || 0}px, ${c.y || 0}px, 0) scale(${s})`;
          if (c.feather) bgwrap.style.webkitMaskImage = `radial-gradient(${c.feather}, #000 62%, transparent 100%)`;
          if (c.fill) stage.style.background = c.fill;
        },
      };
    },

    // שקף הפתיחה: חושך של אולם הרצאות, אלומת מקרן, אבק וגרעיניות, וטקסט במכונת כתיבה
    opener(c) {
      const w = wrap({ pos: { inset: 0 } }, 9);
      const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      const dust = Array.from({ length: 70 }, (_, i) => ({ x: rnd(i) * 1920, y: rnd(i + 99) * 1080, r: 0.8 + rnd(i + 7) * 2.4, s: 6 + rnd(i + 3) * 18, p: rnd(i + 51) * 6.28 }));
      const chars = [...c.title].map((ch) => `<span class="ch">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
      w.innerHTML = `<div class="opener">
        <div class="beam"></div>
        <svg class="dust" viewBox="0 0 1920 1080">${dust.map((d) => `<circle r="${d.r}" fill="#fff"/>`).join('')}</svg>
        <div class="txt">
          <div class="year">${c.year}</div>
          <div class="t1">${chars}<i class="caret"></i></div>
          <div class="rule"></div>
          <div class="t2">${c.sub}</div>
        </div>
        <svg class="grain" viewBox="0 0 1920 1080"><filter id="gn"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="1"/></filter><rect width="1920" height="1080" filter="url(#gn)"/></svg>
        <div class="vig"></div>
      </div>`;
      const op = w.firstChild, beam = w.querySelector('.beam'), circles = [...w.querySelectorAll('.dust circle')];
      const year = w.querySelector('.year'), t1 = w.querySelector('.t1'), chs = [...w.querySelectorAll('.ch')], caret = w.querySelector('.caret');
      const rule = w.querySelector('.rule'), t2 = w.querySelector('.t2'), turb = w.querySelector('feTurbulence');
      return {
        el: w,
        update(lt, dur) {
          const fade = 1 - E.inOutSine(P(lt, dur - 0.45, 0.45));
          op.style.opacity = E.outCubic(P(lt, 0, 0.5)) * fade;
          // הבהוב עדין של המקרן
          beam.style.opacity = 0.75 + 0.08 * Math.sin(lt * 23) + 0.05 * Math.sin(lt * 61);
          circles.forEach((el, i) => {
            const d = dust[i];
            el.setAttribute('cx', (d.x + Math.sin(lt * 0.4 + d.p) * d.s + lt * 8) % 1920);
            el.setAttribute('cy', d.y - lt * d.s * 0.8);
            el.setAttribute('opacity', 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(lt * 1.3 + d.p)));
          });
          turb.setAttribute('seed', Math.floor(lt * 24) % 97);
          const y = E.outExpo(P(lt, 0.25, 1.0));
          year.style.opacity = y;
          year.style.letterSpacing = lerp(40, 14, y) + 'px';
          // מכונת הכתיבה: אות כל 70ms, הסמן עוקב אחרי האות האחרונה ומהבהב בהמתנה
          const typed = Math.floor(clamp((lt - 0.75) / 0.07, 0, chs.length));
          chs.forEach((s, i) => (s.style.visibility = i < typed ? 'visible' : 'hidden'));
          const last = chs[Math.max(0, typed - 1)];
          caret.style.left = (typed ? last.offsetLeft - 14 : chs[0].offsetLeft + chs[0].offsetWidth) + 'px';
          caret.style.opacity = lt < 0.6 ? 0 : (typed < chs.length ? 1 : Math.floor(lt * 2.4) % 2 ? 0 : 1) * (1 - P(lt, 2.6, 0.3));
          const r = E.outExpo(P(lt, 1.75, 0.9));
          rule.style.transform = `scaleX(${r})`;
          const s = E.outExpo(P(lt, 1.95, 0.9));
          t2.style.opacity = s;
          t2.style.transform = `translate3d(0, ${(1 - s) * 18}px, 0)`;
          t1.style.transform = `scale(${lerp(1.0, 1.03, P(lt, 0, dur))})`;
        },
      };
    },

    endcard(c) {
      const w = wrap({ pos: { inset: 0 } }, 9);
      const wave = (y, amp, sw, op) => `<path d="M-200 ${y} C 300 ${y - amp}, 700 ${y + amp}, 1100 ${y - amp * 0.4} S 1800 ${y + amp}, 2200 ${y - amp * 0.6}" stroke="#fff" stroke-width="${sw}" stroke-opacity="${op}" fill="none"/>`;
      w.innerHTML = `<div class="end">
        <svg class="waves" viewBox="0 0 1920 1080" preserveAspectRatio="none">
          <g class="g1">${wave(820, 180, 3, 0.55)}${wave(860, 160, 1.5, 0.45)}${wave(900, 200, 6, 0.25)}</g>
          <g class="g2">${wave(260, -150, 2, 0.5)}${wave(220, -120, 1.2, 0.4)}${wave(300, -170, 8, 0.18)}</g>
        </svg>
        <div class="dots" style="left:-80px;top:120px"></div><div class="dots" style="right:-80px;bottom:-120px"></div>
        <div class="badge"><img src="assets/brand/nofeshon-badge.png"><div class="logo" style="position:absolute;inset:0;width:auto;height:auto"><div class="glow" style="left:6%;top:18%"></div></div><div class="sweep" style="position:absolute;inset:0;border-radius:24px;overflow:hidden;mix-blend-mode:screen"><i style="position:absolute;top:-30%;bottom:-30%;width:22%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.85),rgba(255,255,255,0));transform:skewX(-18deg)"></i></div></div>
        <div class="tag">${words(c.tag)}</div>
        <div class="iec"><img src="assets/brand/iec-logo.png"></div>
      </div>`;
      const end = w.firstChild, g1 = w.querySelector('.g1'), g2 = w.querySelector('.g2');
      const badge = w.querySelector('.badge'), glow = w.querySelector('.glow'), sw = w.querySelector('.sweep i');
      const tag = w.querySelector('.tag'), iec = w.querySelector('.iec');
      return {
        el: w,
        update(lt, dur) {
          const o = E.outCubic(P(lt, 0, 0.35));
          end.style.opacity = o;
          end.style.transform = `scale(${lerp(1.06, 1, E.outExpo(P(lt, 0, 1.2)))})`;
          g1.style.transform = `translate3d(${Math.sin(lt * 0.6) * 60 - lt * 30}px, ${Math.sin(lt * 0.9) * 10}px, 0)`;
          g2.style.transform = `translate3d(${-Math.sin(lt * 0.5) * 60 + lt * 24}px, ${Math.cos(lt * 0.8) * 10}px, 0)`;
          const a = E.outBack(P(lt, 0.15, 0.75));
          badge.style.transform = `translate(-50%, -50%) scale(${lerp(0.7, 1, a)})`;
          badge.style.opacity = P(lt, 0.15, 0.25);
          badge.style.filter = `blur(${(1 - P(lt, 0.15, 0.4)) * 14}px)`;
          sw.style.left = lerp(-35, 125, E.inOutCubic(P(lt, 0.8, 0.8))) + '%';
          const f = [0, 1, 0.15, 0.9, 0.3, 1][Math.floor(P(lt, 0.6, 0.36) * 5.99)];
          glow.style.opacity = lt < 0.6 ? 0 : f * (lt > 1.3 ? 0.55 + 0.15 * Math.sin(lt * 3) : 0.9);
          wordsIn(tag, lt, dur + 2, { delay: 1.0, stagger: 0.08 });
          const k = E.outExpo(P(lt, 1.5, 0.8));
          iec.style.opacity = k;
          iec.style.transform = `translate(-50%, ${(1 - k) * 24}px)`;
        },
      };
    },
  };

  /* ---------------- הבמה ---------------- */
  const stage = document.getElementById('stage');
  const bgwrap = document.getElementById('bgwrap');
  const bg = document.getElementById('bg');
  const layer = document.getElementById('layer');
  let TL, CUELIST, segAt;

  const ready = (async () => {
    TL = await (await fetch('../edit/timeline.json', { cache: 'no-store' })).json();
    const byId = Object.fromEntries(TL.segments.map((s) => [s.id, s]));
    CUELIST = CUES.map((c) => {
      const s = byId[c.seg];
      if (!s) throw new Error('unknown segment ' + c.seg);
      const start = s.start + (c.at || 0);
      const end = c.until ? byId[c.until].end + (c.untilAt || 0) : c.dur != null ? start + c.dur : s.end;
      const impl = TYPES[c.type](c);
      if (impl.el) layer.appendChild(impl.el);
      if (impl.extra) layer.appendChild(impl.extra);
      return { ...impl, c, start, dur: end - start };
    });
    const starts = TL.segments.map((s) => s.startFrame);
    segAt = (f) => {
      let lo = 0, hi = starts.length - 1;
      while (lo < hi) {
        const m = (lo + hi + 1) >> 1;
        if (starts[m] <= f) lo = m;
        else hi = m - 1;
      }
      return TL.segments[lo];
    };
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => im.decode().catch(() => {})));
  })();

  async function seek(t) {
    const f = Math.min(TL.frames - 1, Math.floor(t * TL.fps + 1e-6));
    const seg = segAt(f);
    if (seg.type === 'card' || !FRAMES) {
      bg.style.visibility = 'hidden';
    } else {
      bg.style.visibility = 'visible';
      const src = `/frames/${String(f + 1).padStart(5, '0')}.jpg`;
      if (bg.getAttribute('src') !== src) {
        bg.src = src;
        await bg.decode().catch(() => {});
      }
    }
    bgwrap.style.transform = '';
    bgwrap.style.webkitMaskImage = '';
    stage.style.background = '#000';
    for (const q of CUELIST) {
      const lt = t - q.start;
      const on = lt >= 0 && lt < q.dur;
      if (q.el) q.el.classList.toggle('on', on);
      if (q.extra) q.extra.classList.toggle('on', on);
      if (on) q.update(lt, q.dur);
    }
  }

  const FRAMES = new URLSearchParams(location.search).has('frames');
  window.MG = {
    ready,
    seek,
    get duration() { return TL.duration; },
    get fps() { return TL.fps; },
    width: 1920,
    height: 1080,
  };
})();
