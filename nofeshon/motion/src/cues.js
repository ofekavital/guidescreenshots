/*
 * כל התוכן העריך של שכבת המושן.
 * seg — מזהה השוט ב־edit/edl.json; at — שניות מתחילת השוט (אפשר שלילי); dur — משך,
 * או until — עד סוף שוט אחר. pos — מיקום בפיקסלים על פריים של 1920×1080.
 * ניסוחי הכותרות הם הצעות לפי רשימת המסרים (plan/messages.md), עדיין לא נעולים.
 */
window.CUES = [
  /* ---------- פתיחה: 2017 (ממשיך ישר אל השעון) ---------- */
  { type: 'opener', seg: '00', year: '2017', title: 'השתלמות אמ״א', sub: 'אי שם בצפון' },
  { type: 'push', seg: '02', at: 0, dur: 5.42, from: 1.0, to: 1.12 },
  { type: 'logo', seg: '02', at: 3.75, until: '02', untilAt: 0.3 },
  { type: 'flash', seg: '03', at: -0.1, dur: 0.5, strength: 0.85 },

  /* ---------- הבשורה ---------- */
  { type: 'notify', seg: '04-05', at: 0.25, dur: 3.9, pos: { left: 100, top: 56 },
    // ‏U+200F סוגר את הרצף הלטיני של ON, אחרת "2026" קופץ לצד הלא נכון
    title: 'נופשON‏ 2026 — ההרשמה נפתחה! 🎉', body: 'בארץ ובחו״ל, בקיץ ובחורף. בוחרים עכשיו.' },
  { type: 'title', seg: '06', at: 0.25, dur: 3.3, lines: ['מגיעים לכל עובד', '~בכל מקום'], scrim: 'br', pos: { right: 110, bottom: 110 } },
  { type: 'bubble', seg: '09', at: 0.4, dur: 2.7, text: 'נסגור טיסה ביחד? ✈️', origin: '0% 100%', pos: { left: 620, top: 120 } },
  { type: 'split', seg: '10-11', right: 'נועה', left: 'מיכל' },
  { type: 'title', seg: '10-11', at: 0.85, dur: 2.9, lines: ['בוחרים עם מי'], align: 'center', scrim: 'center', pos: { left: 0, right: 0, top: 380 } },
  { type: 'notify', seg: '12b', at: 0.05, dur: 1.85, from: [1290, 590], pos: { left: 420, top: 250 },
    title: 'הזמנה: נופש לצוות ולמשפחות 🌊', body: 'נופש משותף בכנרת. מצטרפים?' },
  { type: 'bubble', seg: '13', at: 0.45, dur: 2.25, text: 'אנחנו בפנים! 🙌', sent: true, origin: '100% 100%', pos: { right: 200, top: 230 } },
  { type: 'notify', seg: '14b', at: 0.35, dur: 3.75, pos: { right: 100, top: 64 },
    title: 'הזכאות שלך לנופש הוארכה 💛', body: 'תודה על השירות במילואים. הנופש מחכה לך.' },

  /* ---------- קבוצות ה־WhatsApp ---------- */
  { type: 'push', seg: '15', at: 0, dur: 8, from: 0.8, to: 0.84, y: 70, feather: '80% 85% at 50% 50%', fill: '#05261a' },
  { type: 'title', seg: '15', at: 0.5, dur: 7.1, lines: ['ההיכרות מתחילה עוד לפני היציאה'], align: 'center', bar: false, pos: { left: 0, right: 0, top: 26 } },

  /* ---------- בארץ: כל אחד והנופש שלו ---------- */
  { type: 'title', seg: '16', at: 0.1, dur: 3.6, lines: ['כל אחד', 'והנופש שלו'], scrim: 'top', pos: { right: 110, top: 70 } },
  { type: 'chip', seg: '16', at: 1.0, dur: 2.7, icon: 'family', main: 'עם המשפחה', sub: 'כנרת', pos: { right: 90, bottom: 84 } },
  { type: 'title', seg: '17', at: 1.5, dur: 2.95, lines: ['מכירים', 'גם מחוץ לעבודה'], scrim: 'br', pos: { right: 110, bottom: 110 } },
  { type: 'chip', seg: '18', at: 0.35, dur: 3.1, icon: 'friends', main: 'עם חברות מהעבודה', sub: 'הגליל', pos: { right: 90, bottom: 84 } },
  { type: 'chip', seg: '19', at: 0.35, dur: 2.95, icon: 'solo', main: 'לבד', sub: 'אילת', pos: { right: 90, bottom: 84 } },
  { type: 'chip', seg: '20', at: 0.3, dur: 3.35, icon: 'kosher', main: 'כשרות ושמירת שבת', sub: 'נופשון מותאם לציבור החרדי', subIcon: false, pos: { right: 90, bottom: 84 } },
  { type: 'chip', seg: '21', at: 0.2, dur: 2.15, icon: 'couple', main: 'בזוג', sub: 'רמת הגולן', pos: { right: 90, bottom: 84 } },
  { type: 'chip', seg: '22', at: 0.2, dur: 1.5, icon: 'family', main: 'אמא ובת', sub: 'חיפה', pos: { right: 90, bottom: 84 } },
  { type: 'chip', seg: '22', at: 1.65, dur: 1.55, icon: 'gift', main: 'שי מחכה לכם במלון', pos: { right: 90, bottom: 84 } },
  { type: 'notify', seg: '23', at: 0.2, dur: 2.75, pos: { right: 100, top: 64 }, appIcon: 'gift',
    title: 'קיבלת שובר BUYME 🎁', body: 'מתנה מחברת החשמל. תיהנו מהנופש!' },

  /* ---------- בחו״ל: הדרך ---------- */
  { type: 'chip', seg: '23.5', at: 0.3, dur: 3.0, icon: 'coffee', main: 'קפה וכריך בשדה, עלינו', sub: 'לטסים לחו״ל', subIcon: false, pos: { right: 90, bottom: 84 } },
  { type: 'leak', seg: '24a', at: -0.35, dur: 1.0 },
  { type: 'title', seg: '24a', at: 0.45, dur: 4.0, lines: ['טסים בחברות תעופה ישראליות'], align: 'center', scrim: 'bottom', pos: { left: 0, right: 0, bottom: 110 } },
  { type: 'panel', seg: '25', at: 0.15, until: '26', title: 'איתכם לאורך כל הדרך', pos: { left: 90, top: 190 },
    rows: [
      { icon: 'bus', label: 'הסעות משדה התעופה' },
      { icon: 'shield', label: 'ביטוח נסיעות לחו״ל' },
      { icon: 'support', label: 'זמינות מלאה, בכל שעה', small: 'בארץ ובעולם' },
    ] },
  { type: 'chip', seg: '27-28', at: 0.25, dur: 2.15, icon: 'snow', main: 'בקיץ או בחורף', pos: { right: 90, bottom: 84 } },
  { type: 'chip', seg: '29', at: 0.35, until: '29b', untilAt: -0.1, icon: 'friends', main: 'עם חברות מהעבודה', sub: 'תאילנד', pos: { right: 90, bottom: 84 } },
  { type: 'chip', seg: '30', at: 0.3, dur: 3.35, icon: 'access', main: 'בזוג, עם הגעה נגישה', sub: 'יוון', pos: { right: 90, bottom: 84 } },

  /* ---------- חוויות ---------- */
  { type: 'leak', seg: '32', at: -0.35, dur: 1.0, strength: 0.6 },
  { type: 'title', seg: '32', at: 0.2, until: '33b', untilAt: -0.2, lines: ['נופשים ומחזקים', 'את ישראל'], scrim: 'top', pos: { right: 110, top: 70 } },
  { type: 'label', seg: '32', at: 0.5, dur: 2.4, text: 'קיאקים בצפון', scrim: false, pos: { right: 110, bottom: 90 } },
  { type: 'label', seg: '33', at: 0.15, until: '33b', untilAt: -0.1, text: 'טיולי שטח', scrim: false, pos: { right: 110, bottom: 90 } },
  { type: 'label', seg: '37', at: 0.15, dur: 3.3, text: 'חוות אלפקות', pos: { right: 110, bottom: 90 } },
  { type: 'label', seg: '34', at: 0.15, until: '34b', untilAt: -0.1, text: 'רכבל מנרה', loc: 'הגליל העליון', pos: { right: 110, bottom: 90 } },
  { type: 'label', seg: '31', at: 0.15, dur: 3.15, text: 'שוק צף', loc: 'תאילנד', pos: { right: 110, bottom: 90 } },
  { type: 'label', seg: '36', at: 0.15, dur: 3.15, text: 'סיור מודרך', loc: 'וינה', pos: { right: 110, bottom: 90 } },
  { type: 'label', seg: '35', at: 0.15, dur: 2.65, text: 'ספא ופינוק', pos: { right: 110, bottom: 90 } },
  { type: 'label', seg: '38', at: 0.1, dur: 1.3, text: 'מופע WOW', loc: 'אילת', pos: { right: 110, bottom: 90 } },
  { type: 'title', seg: '38b', at: 0.1, dur: 2.3, lines: ['חוויה לכל אחד'], align: 'center', scrim: 'center', pos: { left: 0, right: 0, top: 420 } },

  /* ---------- סיום ---------- */
  { type: 'leak', seg: '40', at: -0.35, dur: 1.0, strength: 0.55 },
  { type: 'survey', seg: '42', at: 0.0, dur: 2.5, pos: { right: 150, top: 200 }, q: 'איך היה הנופש?', thanks: 'החוויה שלכם משפיעה<br>על הנופשונים הבאים' },
  { type: 'caption', seg: '44', at: 0.3, dur: 2.45, who: 'רוני', text: '״מוטי, אני בחופשה. אחזור אליך.״', rate: 0.22, pos: { left: 0, bottom: 80 } },
  { type: 'endcard', seg: '46', at: 0, dur: 4.5, tag: 'החופשה שלכם. הבחירה שלכם.' },
];
