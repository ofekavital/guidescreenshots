/*
 * גרפיקה וקטורית: אייקונים בסגנון Material (כמו WhatsApp לאנדרואיד),
 * תמונות פרופיל מאוירות, תמונות קבוצה וטפט ה"דודלים" של הצ'אט.
 * הכול נוצר כ־SVG בקוד, כך שאין תלות בקבצים חיצוניים.
 */
(function () {
  const svg = (vb, body, attrs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${attrs}>${body}</svg>`;

  /* ---------------- אייקונים (24×24) ---------------- */
  const icon = (d, extra = '') => svg('0 0 24 24', `<path fill="currentColor" d="${d}"/>${extra}`);
  const ICONS = {
    back: icon('M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'),
    video: icon(
      'M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z'
    ),
    call: icon(
      'M6.54 5c.06.89.21 1.76.45 2.59l-1.2 1.2c-.41-1.2-.67-2.47-.76-3.79h1.51m9.86 12.02c.85.24 1.72.39 2.6.45v1.49c-1.32-.09-2.59-.35-3.8-.75l1.2-1.19M7.5 3H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.49c0-.55-.45-1-1-1-1.24 0-2.45-.2-3.57-.57-.1-.04-.21-.05-.31-.05-.26 0-.51.1-.71.29l-2.2 2.2c-2.83-1.45-5.15-3.76-6.59-6.59l2.2-2.2c.28-.28.36-.67.25-1.02C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1z'
    ),
    more: icon(
      'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'
    ),
    mic: icon(
      'M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z'
    ),
    attach: icon(
      'M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z'
    ),
    camera: icon(
      'M14.12 4l1.83 2H20v12H4V6h4.05l1.83-2h4.24M15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2zm-3 7c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3m0-2c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z'
    ),
    emoji: icon(
      'M15.5 9.5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M8.5 9.5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-4c-1.48 0-2.75-.81-3.45-2H6.88c.8 2.05 2.79 3.5 5.12 3.5s4.32-1.45 5.12-3.5h-1.67c-.7 1.19-1.97 2-3.45 2z'
    ),
    lock: icon(
      'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z'
    ),
    down: icon('M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z'),
    doc: icon(
      'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'
    ),
  };

  /* ---------------- תמונות פרופיל (40×40) ---------------- */
  const av = (body) => svg('0 0 40 40', body, 'preserveAspectRatio="xMidYMid slice"');
  const grad = (id, a, b, x2 = 0, y2 = 1) =>
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
  let gid = 0;
  const g = () => 'g' + gid++;

  const AVATARS = {
    // ברירת המחדל של WhatsApp: צללית לבנה על אפור
    default: () =>
      av(
        `<rect width="40" height="40" fill="#DFE5E7"/><circle cx="20" cy="15.5" r="7.2" fill="#fff"/><path d="M5.5 40c.6-8.4 6.7-13.4 14.5-13.4S33.9 31.6 34.5 40z" fill="#fff"/>`
      ),
    sunset: () => {
      const id = g();
      return av(
        `${grad(id, '#FFB36B', '#F0567A')}<rect width="40" height="40" fill="url(#${id})"/><circle cx="20" cy="24" r="8" fill="#FFE29A"/><rect y="26" width="40" height="14" fill="#5B4A9B" opacity=".85"/><path d="M0 30h40M4 34h32" stroke="#FFD08A" stroke-width="1.2" opacity=".7"/>`
      );
    },
    sea: () => {
      const id = g();
      return av(
        `${grad(id, '#8FD3FE', '#E8F7FF')}<rect width="40" height="40" fill="url(#${id})"/><path d="M0 24c5-3 10 3 15 0s10-3 15 0 7 1 10 0v16H0z" fill="#2E8BD0"/><path d="M0 30c5-3 10 3 15 0s10-3 15 0 7 1 10 0v10H0z" fill="#1C6FB0"/><circle cx="30" cy="11" r="4.5" fill="#FFF3B0"/>`
      );
    },
    flower: () =>
      av(
        `<rect width="40" height="40" fill="#F8E5EE"/><g transform="translate(20 20)">${[0, 72, 144, 216, 288]
          .map((r) => `<ellipse rx="5.5" ry="9" cy="-8" fill="#F27BAA" transform="rotate(${r})"/>`)
          .join('')}<circle r="5" fill="#FFD25E"/></g>`
      ),
    flower2: () =>
      av(
        `<rect width="40" height="40" fill="#E9F3E1"/><g transform="translate(20 21)">${[0, 60, 120, 180, 240, 300]
          .map((r) => `<ellipse rx="4.2" ry="8" cy="-7.5" fill="#FFFFFF" stroke="#E2E8DA" stroke-width=".6" transform="rotate(${r})"/>`)
          .join('')}<circle r="4.6" fill="#F6B830"/></g>`
      ),
    leaf: () =>
      av(
        `<rect width="40" height="40" fill="#D5ECC8"/><path d="M8 32C8 16 20 7 33 7c0 15-9 25-25 25z" fill="#4E9E4A"/><path d="M9 31 30 10" stroke="#BFE3A8" stroke-width="1.4"/>`
      ),
    mountain: () => {
      const id = g();
      return av(
        `${grad(id, '#9CC9F2', '#E6F2FB')}<rect width="40" height="40" fill="url(#${id})"/><path d="M-2 36 13 14l8 11 6-7 15 18z" fill="#5A7183"/><path d="m13 14 4 5.8-2.6-1.4-2.6 2.6-2.2-1.6z" fill="#fff"/><rect y="34" width="40" height="6" fill="#4B8A4E"/>`
      );
    },
    city: () =>
      av(
        `<rect width="40" height="40" fill="#22305A"/><circle cx="31" cy="9" r="3.2" fill="#FFF1B5"/><path d="M2 40V22h7v-6h6v24zM16 40V18h8v22zM25 40V25h5v-5h7v20z" fill="#0F1938"/>${[
          [4, 26], [11, 20], [11, 25], [18, 21], [21, 26], [18, 31], [27, 28], [33, 23], [33, 29],
        ]
          .map(([x, y]) => `<rect x="${x}" y="${y}" width="1.8" height="2.2" fill="#FFD66B"/>`)
          .join('')}`
      ),
    balloon: () =>
      av(
        `<rect width="40" height="40" fill="#FFF0BF"/><ellipse cx="15" cy="15" rx="6.5" ry="8" fill="#F2645A"/><ellipse cx="25" cy="13" rx="6" ry="7.4" fill="#4AA7E8"/><path d="M15 23c1 5-2 9 1 17M25 20.5c-1 6 2 11-1 19.5" stroke="#8E7A55" stroke-width=".8" fill="none"/>`
      ),
    beach: () => {
      const id = g();
      return av(
        `${grad(id, '#7FD6F5', '#C9F0FF')}<rect width="40" height="40" fill="url(#${id})"/><rect y="25" width="40" height="15" fill="#F1D9A5"/><path d="M0 25c6-2 12 2 20 0s14 2 20 0v-3H0z" fill="#2BA6CF"/><path d="M14 30 20 14" stroke="#7A5233" stroke-width="1.2"/><path d="M9 17c3-6 15-7 21-1z" fill="#F15A5A"/>`
      );
    },
    coffee: () =>
      av(
        `<rect width="40" height="40" fill="#EAD9C6"/><path d="M10 17h16v8a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z" fill="#fff"/><path d="M26 19h2.5a3.2 3.2 0 0 1 0 6.4H25.5" stroke="#fff" stroke-width="2" fill="none"/><ellipse cx="18" cy="17" rx="8" ry="1.8" fill="#7B4A2A"/><path d="M15 8c-1.5 2 1.5 3 0 5M20 7c-1.5 2 1.5 3 0 5" stroke="#B89A80" stroke-width="1.2" fill="none"/>`
      ),
  };

  /* ---------------- תמונות קבוצה / איורי יעד ---------------- */
  const scene = (w, h, body) => svg(`0 0 ${w} ${h}`, body, 'preserveAspectRatio="xMidYMid slice"');
  const GROUP_ART = {
    galil: () => {
      const id = g();
      return scene(
        160,
        100,
        `${grad(id, '#8CCDF3', '#E9F7FF')}<rect width="160" height="100" fill="url(#${id})"/><circle cx="118" cy="30" r="13" fill="#FFE07A"/><path d="M0 70C30 48 55 50 80 62s50 4 80-12v50H0z" fill="#7DBB5E"/><path d="M0 82c40-18 70-10 100-2s40 2 60-6v26H0z" fill="#4E9A45"/><g fill="#2F7A36"><circle cx="30" cy="74" r="5"/><circle cx="38" cy="76" r="4"/><circle cx="128" cy="70" r="5"/></g>`
      );
    },
    deadsea: () => {
      const id = g();
      return scene(
        160,
        100,
        `${grad(id, '#FFCF94', '#FFF2DE')}<rect width="160" height="100" fill="url(#${id})"/><circle cx="40" cy="28" r="12" fill="#FFF6C9"/><path d="M0 62 22 36l18 14 20-24 26 30 22-20 26 18 26-8v20H0z" fill="#C9935E"/><path d="M0 62h160v38H0z" fill="#39A7C8"/><path d="M8 72h30M60 78h40M112 70h34M30 88h50" stroke="#E9FBFF" stroke-width="3" stroke-linecap="round" opacity=".9"/>`
      );
    },
    eilat: () => {
      const id = g();
      return scene(
        160,
        100,
        `${grad(id, '#6FCBF4', '#C8EEFF')}<rect width="160" height="100" fill="url(#${id})"/><path d="M60 58 84 30l16 16 14-12 22 24z" fill="#C4583A"/><path d="M0 58h160v42H0z" fill="#1F86C6"/><path d="M0 66c20-4 40 4 60 0s40-4 60 0 30 2 40 0" stroke="#7FD0F2" stroke-width="2" fill="none"/><path d="M28 98c2-18 0-34-4-46" stroke="#6A4A2E" stroke-width="4" fill="none" stroke-linecap="round"/><g fill="#2E8C4A"><path d="M24 52c-10-6-20-4-24 2 8-4 16-3 24-2z"/><path d="M24 52c6-10 18-12 26-8-10 0-18 3-26 8z"/><path d="M24 52c-4-10-14-14-22-12 9 1 16 6 22 12z"/><path d="M24 52c10-4 20 0 24 6-8-4-16-6-24-6z"/></g><circle cx="128" cy="22" r="10" fill="#FFF2A8"/>`
      );
    },
    vienna: () => {
      const id = g();
      const spokes = Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return `<line x1="100" y1="44" x2="${(100 + 26 * Math.cos(a)).toFixed(1)}" y2="${(44 + 26 * Math.sin(a)).toFixed(1)}"/>`;
      }).join('');
      const cabins = Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return `<rect x="${(97.5 + 26 * Math.cos(a)).toFixed(1)}" y="${(44 + 26 * Math.sin(a)).toFixed(1)}" width="5" height="4" rx="1" fill="#E85D4A"/>`;
      }).join('');
      return scene(
        160,
        100,
        `${grad(id, '#4C3F91', '#F4A97F')}<rect width="160" height="100" fill="url(#${id})"/><g stroke="#FFF4E6" stroke-width="1.2" fill="none"><circle cx="100" cy="44" r="26"/>${spokes}<path d="M88 100 100 44l12 56"/></g>${cabins}<path d="M0 100V74h14V62l6-10 6 10v12h12v-8h16v34zM124 100V70h10v-6h8v6h18v30z" fill="#2A214F"/>`
      );
    },
  };

  /* ---------------- טפט הדודלים של WhatsApp ---------------- */
  // דודלים בקווים דקים, מפוזרים באקראיות קבועה (seed) על אריח שחוזר על עצמו
  const DOODLES = [
    'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
    'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
    'M4 5h16v10H10l-5 4v-4H4z',
    'M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
    'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5',
    'M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 11.5 3.5 3.5 0 0 0 7 18z',
    'M3 8h4l2-2h6l2 2h4v11H3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3c-1 1.5 1 2.5 0 4M12 3c-1 1.5 1 2.5 0 4',
    'M3 12a9 9 0 0 1 18 0zM12 12v6a2 2 0 0 1-4 0',
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 10h.01M15.5 10h.01M8 14.5c2 2.5 6 2.5 8 0',
    'M3 6h18v12H3zM3 7l9 6 9-6',
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    'M4 10h16v10H4zM2 7h20v3H2zM12 7v13M12 7c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1',
    'M12 3c3.5 0 6 2.8 6 6.2 0 3.6-3 6.3-6 6.3S6 12.8 6 9.2C6 5.8 8.5 3 12 3zM12 15.5c-.5 2 .8 3.5-.4 5.5',
    'M13 2 4 14h7l-1 8 9-12h-7z',
    'M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    'M2 16l20-8-4 10-6-3-3 4v-5z',
    'M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19l8-8',
  ];

  function wallpaperDataUri(opts = {}) {
    const size = opts.size || 340;
    const bg = opts.bg || '#EFEAE2';
    const stroke = opts.stroke || 'rgba(110,94,70,0.12)';
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pts = [];
    let tries = 0;
    while (pts.length < 52 && tries < 6000) {
      tries++;
      const x = rnd() * size;
      const y = rnd() * size;
      let ok = true;
      for (const p of pts) {
        const dx = Math.min(Math.abs(p.x - x), size - Math.abs(p.x - x));
        const dy = Math.min(Math.abs(p.y - y), size - Math.abs(p.y - y));
        if (dx * dx + dy * dy < 41 * 41) { ok = false; break; }
      }
      if (ok) pts.push({ x, y });
    }
    let body = '';
    pts.forEach((p, i) => {
      const d = DOODLES[i % DOODLES.length];
      const rot = Math.round(rnd() * 70 - 35);
      const sc = (0.8 + rnd() * 0.3).toFixed(2);
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const x = p.x + ox, y = p.y + oy;
          if (x < -30 || y < -30 || x > size + 30 || y > size + 30) continue;
          body += `<path d="${d}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot}) scale(${sc}) translate(-12 -12)"/>`;
        }
      }
    });
    const s = svg(
      `0 0 ${size} ${size}`,
      `<rect width="${size}" height="${size}" fill="${bg}"/><g fill="none" stroke="${stroke}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${body}</g>`,
      `width="${size}" height="${size}"`
    );
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }

  /* ---------------- תצוגה מקדימה של עמוד PDF (מופשט, ללא תוכן) ---------------- */
  const pdfPagePreview = (accent = '#1F6FD6') =>
    svg(
      '0 0 300 150',
      `<rect width="300" height="150" fill="#E9EDEF"/><g transform="translate(40 14)"><rect width="220" height="170" rx="2" fill="#fff"/><rect width="220" height="26" fill="${accent}" opacity=".85"/><rect x="18" y="40" width="120" height="9" rx="4.5" fill="#D5DADD"/><rect x="18" y="58" width="184" height="6" rx="3" fill="#E4E8EA"/><rect x="18" y="71" width="170" height="6" rx="3" fill="#E4E8EA"/><rect x="18" y="84" width="178" height="6" rx="3" fill="#E4E8EA"/><rect x="18" y="104" width="90" height="8" rx="4" fill="#D5DADD"/><rect x="18" y="120" width="184" height="6" rx="3" fill="#E4E8EA"/></g>`,
      'preserveAspectRatio="xMidYMin slice"'
    );

  window.WA_ART = { ICONS, AVATARS, GROUP_ART, wallpaperDataUri, pdfPagePreview };
})();
