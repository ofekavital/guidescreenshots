/* Legacy sending system — a generic, gray, vendor-less "old system" mock.
   Its display rule (the pain): every real line break is shown doubled,
   and the literal tag \n is shown as a single break. */
(function () {
  const L = {};

  /* Display rule of the old system. */
  L.displayLines = function (raw) {
    return String(raw).replace(/\n/g, '\n\n').replace(/\\n/g, '\n').split('\n');
  };

  const CSS = `
  #legacy{position:absolute;inset:0;pointer-events:none}
  .lg-win{position:absolute;left:96px;top:176px;width:1080px;height:752px;background:#ECECEC;border:1px solid #9C9C9C;
    box-shadow:0 30px 60px rgba(40,40,40,.22),0 2px 0 rgba(255,255,255,.6) inset;font-family:Arimo,Arial,sans-serif;color:#2B2B2B;
    direction:rtl;transform-origin:50% 50%;border-radius:4px;overflow:hidden}
  .lg-title{height:36px;background:linear-gradient(#DADADA,#C2C2C2);border-bottom:1px solid #9A9A9A;display:flex;align-items:center;
    justify-content:space-between;padding:0 14px;font-size:16px;font-weight:700;color:#444}
  .lg-title .lg-btns{display:flex;gap:6px;direction:ltr}
  .lg-title .lg-btns i{display:block;width:16px;height:16px;border:1px solid #8E8E8E;background:#E3E3E3;border-radius:2px}
  .lg-menu{height:28px;display:flex;gap:22px;align-items:center;padding:0 16px;font-size:14px;color:#555;border-bottom:1px solid #C9C9C9;background:#F2F2F2}
  .lg-tools{height:50px;display:flex;gap:8px;align-items:center;padding:0 14px;border-bottom:1px solid #C9C9C9}
  .lg-b{height:32px;padding:0 16px;border:1px solid #9E9E9E;border-radius:3px;background:linear-gradient(#FAFAFA,#DCDCDC);
    font-size:15px;display:flex;align-items:center;color:#333}
  .lg-body{display:flex;gap:16px;padding:16px;height:calc(100% - 36px - 28px - 50px - 30px)}
  .lg-col{display:flex;flex-direction:column;gap:10px}
  .lg-form{width:520px}
  .lg-prev{flex:1}
  .lg-label{font-size:15px;color:#4A4A4A;font-weight:700}
  .lg-row{display:flex;align-items:center;gap:10px}
  .lg-row .lg-label{width:72px}
  .lg-input{flex:1;height:32px;border:1px solid #A9A9A9;background:#FFF;box-shadow:inset 1px 1px 2px rgba(0,0,0,.12);
    font-size:16px;display:flex;align-items:center;padding:0 10px;color:#333}
  .lg-ta{flex:1;border:1px solid #A9A9A9;background:#FFF;box-shadow:inset 1px 1px 3px rgba(0,0,0,.14);padding:12px 14px;
    font-size:20px;line-height:32px;white-space:pre-wrap;overflow:hidden;color:#222;position:relative}
  .lg-ta .lg-tok{color:#444;background:#ECECEC;border-radius:2px;padding:0 1px}
  .lg-caret{display:inline-block;width:2px;height:24px;background:#111;vertical-align:-5px;margin:0 1px}
  .lg-meta{display:flex;justify-content:space-between;font-size:14px;color:#666}
  .lg-pbox{flex:1;border:1px solid #B4B4B4;background:#F8F8F8;padding:12px 14px;overflow:hidden;position:relative}
  .lg-line{font-size:19px;line-height:30px;height:30px;white-space:pre;overflow:hidden;position:relative;color:#2B2B2B}
  .lg-line.extra{background:rgba(183,58,53,.10);box-shadow:inset -4px 0 0 #B73A35}
  .lg-line.extra::after{content:'שורה ריקה';position:absolute;left:10px;top:0;font-size:13px;color:#B73A35;font-weight:700;opacity:.85}
  .lg-count{font-size:15px;font-weight:700;transform-origin:100% 50%}
  .lg-count.bad{color:#B73A35}
  .lg-status{height:30px;border-top:1px solid #BDBDBD;background:#E2E2E2;display:flex;align-items:center;justify-content:space-between;
    padding:0 14px;font-size:14px;color:#555}
  .lg-clock{position:absolute;left:64px;top:30px;width:118px;height:118px;border-radius:50%;background:#FFF;
    box-shadow:0 14px 30px rgba(40,40,40,.22),0 0 0 6px #D9D9D9;direction:ltr}
  .lg-clock svg{width:100%;height:100%;display:block}
  .lg-clock-time{position:absolute;left:100%;top:50%;margin:-20px 0 0 26px;font:700 34px Arimo,Arial,sans-serif;color:#5A5A5A;letter-spacing:1px;white-space:nowrap}

  /* 9:16 — one column: text box above, display below; bigger type for phones. */
  #legacy.portrait .lg-win{left:60px;top:520px;width:960px;height:1330px}
  #legacy.portrait .lg-title{height:46px;font-size:22px}
  #legacy.portrait .lg-title .lg-btns i{width:20px;height:20px}
  #legacy.portrait .lg-menu{height:36px;font-size:19px;gap:26px}
  #legacy.portrait .lg-tools{height:62px;gap:10px}
  #legacy.portrait .lg-b{height:42px;font-size:20px;padding:0 20px}
  #legacy.portrait .lg-body{flex-direction:column;gap:14px;padding:18px;height:calc(100% - 46px - 36px - 62px - 38px)}
  #legacy.portrait .lg-form{width:auto;flex:none}
  #legacy.portrait .lg-label{font-size:20px}
  #legacy.portrait .lg-row .lg-label{width:92px}
  #legacy.portrait .lg-input{height:44px;font-size:21px}
  #legacy.portrait .lg-ta{flex:none;height:316px;font-size:28px;line-height:44px;padding:12px 16px}
  #legacy.portrait .lg-caret{height:32px;vertical-align:-7px}
  #legacy.portrait .lg-meta{font-size:19px}
  #legacy.portrait .lg-count{font-size:20px}
  #legacy.portrait .lg-line{font-size:26px;line-height:40px;height:40px}
  #legacy.portrait .lg-line.extra::after{font-size:17px}
  #legacy.portrait .lg-status{height:38px;font-size:18px}
  #legacy.portrait .lg-clock{left:70px;top:150px;width:128px;height:128px}
  #legacy.portrait .lg-clock-time{left:0;right:0;top:100%;margin:18px 0 0;text-align:center;font-size:36px}
  `;

  L.build = function (root, { portrait = false } = {}) {
    L.lineH = portrait ? 40 : 30;
    root.classList.toggle('portrait', portrait);
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    root.innerHTML = `
    <div class="lg-win" id="lgWin">
      <div class="lg-title"><span>מערכת שליחת הודעות</span><span class="lg-btns"><i></i><i></i><i></i></span></div>
      <div class="lg-menu"><span>קובץ</span><span>עריכה</span><span>תצוגה</span><span>כלים</span><span>עזרה</span></div>
      <div class="lg-tools"><span class="lg-b">שליחה</span><span class="lg-b">שמירה</span><span class="lg-b">ביטול</span><span class="lg-b">רענון</span></div>
      <div class="lg-body">
        <div class="lg-col lg-form">
          <div class="lg-row"><span class="lg-label">נמענים:</span><span class="lg-input">עובדי החברה — כלל המחוזות</span></div>
          <div class="lg-row"><span class="lg-label">נושא:</span><span class="lg-input" id="lgSubject">תזכורת דיווח נוכחות</span></div>
          <span class="lg-label">תוכן ההודעה:</span>
          <div class="lg-ta" id="lgTa"></div>
          <div class="lg-meta"><span id="lgChars">תווים: 0/670</span><span>הודעות: 1</span></div>
        </div>
        <div class="lg-col lg-prev">
          <span class="lg-label">תצוגת הודעה:</span>
          <div class="lg-pbox" id="lgPbox"></div>
          <div class="lg-meta"><span class="lg-count" id="lgCount">שורות: 0</span><span id="lgHint"></span></div>
        </div>
      </div>
      <div class="lg-status"><span>מוכן</span><span id="lgStatusTime">09:12</span></div>
    </div>
    <div class="lg-clock" id="lgClock">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="#FFF" stroke="#BDBDBD" stroke-width="2"/>
        ${Array.from({ length: 12 }, (_, i) => {
          const a = i * Math.PI / 6, r1 = i % 3 ? 39 : 35, r2 = 43;
          return `<line x1="${50 + r1 * Math.sin(a)}" y1="${50 - r1 * Math.cos(a)}" x2="${50 + r2 * Math.sin(a)}" y2="${50 - r2 * Math.cos(a)}" stroke="#9A9A9A" stroke-width="${i % 3 ? 1.5 : 3}" stroke-linecap="round"/>`;
        }).join('')}
        <line id="lgHour" x1="50" y1="50" x2="50" y2="28" stroke="#555" stroke-width="5" stroke-linecap="round"/>
        <line id="lgMin" x1="50" y1="50" x2="50" y2="14" stroke="#777" stroke-width="3" stroke-linecap="round"/>
        <line id="lgSec" x1="50" y1="58" x2="50" y2="10" stroke="#B73A35" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="4" fill="#B73A35"/>
      </svg>
      <div class="lg-clock-time" id="lgClockTime">09:12</div>
    </div>`;
    L.win = root.querySelector('#lgWin');
    L.ta = root.querySelector('#lgTa');
    L.pbox = root.querySelector('#lgPbox');
    L.count = root.querySelector('#lgCount');
    L.chars = root.querySelector('#lgChars');
    L.clock = root.querySelector('#lgClock');
    L.clockTime = root.querySelector('#lgClockTime');
    L.statusTime = root.querySelector('#lgStatusTime');
    L.hour = root.querySelector('#lgHour');
    L.min = root.querySelector('#lgMin');
    L.sec = root.querySelector('#lgSec');
    L.ops = buildScript();
  };

  /* ---------- scene 1 script: nervous typing, Enter, delete, Enter again ---------- */
  function buildScript() {
    const ops = [];
    let t = 0.35;
    const rnd = mulberry32(7);
    const type = (s, cps = 22) => {
      for (const ch of s) {
        ops.push({ t, op: 'ch', ch });
        t += (1 / cps) * (0.65 + rnd() * 0.7) * (ch === ' ' ? 1.4 : 1);
      }
    };
    const key = (op, gapBefore = 0.12, gapAfter = 0.1) => { t += gapBefore; ops.push({ t, op }); t += gapAfter; };
    type('שלום רב,');
    key('enter', 0.2, 0.28);
    type('תזכורת: מועד הגשת הדיווחים הוא ה-25 לחודש.', 26);
    key('enter', 0.15, 0.3);
    key('back', 0.12, 0.2);   // tries to remove the extra blank line
    key('enter', 0.12, 0.28); // ...and it comes right back
    key('back', 0.1, 0.18);
    key('enter', 0.1, 0.25);
    type('לעדכון הדיווח:', 24);
    key('enter', 0.12, 0.25);
    type('1. כניסה לפורטל', 24);
    key('enter', 0.12, 0.22);
    key('back', 0.12, 0.14);
    key('back', 0.06, 0.14);  // deletes a character too: one more fix to make
    type('ל', 20);
    key('enter', 0.12, 0.22);
    type('2. בחירה ב"נוכחות"', 26);
    key('enter', 0.1, 0.2);
    L.scriptEnd = t;
    const enters = ops.filter(o => o.op === 'enter').map(o => o.t);
    L.enterTimes = enters;
    // Frustration shakes when the blank line comes right back.
    L.shakes = [[enters[2] + 0.05, 8], [enters[3] + 0.05, 11], [enters[6] + 0.05, 9]];
    return ops;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* Simulates the script up to time t. Returns raw text, newline birth times, last key time. */
  function simulate(t) {
    let raw = '';
    const births = []; // birth time of each '\n' in raw, in order
    let last = -1, enters = 0;
    for (const o of L.ops) {
      if (o.t > t) break;
      last = o.t;
      if (o.op === 'ch') raw += o.ch;
      else if (o.op === 'enter') { raw += '\n'; births.push(o.t); enters++; }
      else if (o.op === 'back') {
        if (raw.endsWith('\n')) births.pop();
        raw = raw.slice(0, -1);
      }
    }
    return { raw, births, last, enters };
  }
  L.simulate = simulate;

  const esc = (s) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const backOut = (p) => { const s = 2.2; p = Math.min(1, Math.max(0, p)) - 1; return p * p * ((s + 1) * p + s) + 1; };

  /* Scene 1 rendering at script time t (seconds). */
  L.renderTyping = function (t) {
    const { raw, births, last } = simulate(t);
    const idle = t - last;
    const caretOn = idle < 0.45 || Math.floor((t - last) / 0.5) % 2 === 0;
    L.ta.innerHTML = esc(raw) + `<span class="lg-caret" style="opacity:${caretOn ? 1 : 0}"></span>`;

    // Display: each real line break becomes two.
    const rawLines = raw.split('\n');
    let html = '';
    let total = 0;
    rawLines.forEach((line, i) => {
      if (i > 0) {
        const age = t - births[i - 1];
        const h = L.lineH * backOut(age / 0.32);
        const flash = Math.max(0, 1 - age / 0.7);
        html += `<div class="lg-line extra" style="height:${h.toFixed(2)}px;background:rgba(183,58,53,${(0.10 + 0.32 * flash).toFixed(3)})"></div>`;
        total++;
      }
      html += `<div class="lg-line">${esc(line) || '&nbsp;'}</div>`;
      total++;
    });
    L.pbox.innerHTML = html;
    const extra = births.length;
    L.count.textContent = `שורות: ${raw ? total : 0}`;
    L.count.classList.toggle('bad', extra > 0);
    L.chars.textContent = `תווים: ${raw.length}/670`;

    // Line counter pulses on every Enter; the window shakes when the blank line returns.
    const lastEnter = L.enterTimes.filter(e => e <= t).pop();
    const age = lastEnter === undefined ? 1 : t - lastEnter;
    const pulse = age < 0.4 ? Math.pow(1 - age / 0.4, 2) : 0;
    L.count.style.transform = pulse ? `scale(${(1 + 0.25 * pulse).toFixed(4)})` : '';
    let x = 0;
    for (const [s0, amp] of L.shakes) {
      const a = t - s0;
      if (a >= 0 && a < 0.38) x += amp * Math.sin(a * Math.PI * 2 * 8) * (1 - a / 0.38);
    }
    L.win.style.transform = x ? `translateX(${x.toFixed(2)}px)` : '';
  };

  /* Scene 6: encoded text pasted into the old system — the display is now exact.
     p (0..1) reveals the display lines in order. */
  L.renderPaste = function (encoded, pText, pLines) {
    L.clearMotion();
    if (pText <= 0) {
      L.ta.innerHTML = '<span class="lg-caret" style="opacity:1"></span>';
    } else {
      // Raw text box shows exactly what was pasted, including the literal \n tags.
      L.ta.innerHTML = esc(encoded).replace(/\\n/g, '<bdi dir="ltr" class="lg-tok">\\n</bdi>');
      L.ta.style.opacity = String(Math.min(1, pText));
    }
    const lines = L.displayLines(encoded);
    const n = Math.round(lines.length * Math.max(0, Math.min(1, pLines)) * 100) / 100;
    let html = '';
    lines.forEach((line, i) => {
      const a = Math.max(0, Math.min(1, n - i));
      const y = (1 - a) * 10;
      html += `<div class="lg-line" style="opacity:${a.toFixed(3)};transform:translateY(${y.toFixed(2)}px)">${esc(line) || '&nbsp;'}</div>`;
    });
    L.pbox.innerHTML = html;
    L.count.textContent = `שורות: ${pLines > 0 ? lines.length : 0}`;
    L.count.classList.remove('bad');
    L.count.style.color = pLines >= 1 ? '#247B55' : '';
    L.chars.textContent = `תווים: ${pText > 0 ? encoded.length : 0}/670`;
  };

  L.resetPaste = function () { L.ta.style.opacity = ''; L.count.style.color = ''; };
  L.clearMotion = function () { L.win.style.transform = ''; L.count.style.transform = ''; };

  /* Clock: minutes elapsed since 09:12, accelerating. */
  L.setClock = function (minutes, secAngle) {
    const total = 9 * 60 + 12 + minutes;
    const hh = Math.floor(total / 60), mm = Math.floor(total % 60);
    const txt = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    L.clockTime.textContent = txt;
    L.statusTime.textContent = txt;
    L.min.setAttribute('transform', `rotate(${(total % 60) * 6} 50 50)`);
    L.hour.setAttribute('transform', `rotate(${(total / 60) * 30} 50 50)`);
    L.sec.setAttribute('transform', `rotate(${secAngle} 50 50)`);
  };

  window.Legacy = L;
})();
