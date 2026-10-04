/*
 * ===================================================================
 *  סצנת קבוצות WhatsApp (קליפ שיווקי, 12 שניות) — קובץ הנתונים העריך
 * ===================================================================
 *  כל מה שמופיע בסרטון מוגדר כאן: הגדרות וידאו, טלפונים, מצלמה, אפקטים,
 *  ציר זמן (מתי כל קבוצה נכנסת), משתתפים, הודעות, תגובות וקבצים.
 *  אחרי עריכה: פתחו את index.html לתצוגה מקדימה, והריצו `npm run render`.
 *
 *  זמנים — בשניות מתחילת הסרטון (at). הודעה עם at אחרי סוף הסרטון לא מוצגת
 *  (השארנו אותן כדי שכל התסריט יהיה זמין אם מאריכים את הסרטון).
 *
 *  משתתף שמור באנשי הקשר  → { saved: true, name: '...' }  (מוצג שם בלבד)
 *  משתתף לא שמור          → { phone: '+972 ...', pushName: '...' }
 *                             (מוצג מספר בצבע + "~שם פרופיל" באפור)
 *
 *  סוגי הודעות:
 *    { type: 'system', text }                       הודעת מערכת
 *    { from, text }                                  הודעת טקסט
 *    { from, text, reply: 'id' }                     תשובה מצוטטת להודעה אחרת
 *    { from, file: {...}, text }                     קובץ PDF / מסמך (+כיתוב)
 *    { from, card: {...}, text }                     כרטיס מידע (+כיתוב)
 *    reactions: [{ at, emojis: ['❤️'], count }]      כל רשומה מחליפה את מצב התגובות
 *    time: '10:31'                                   (רשות) שעה מפורשת לבועה
 *    typing: 0.5                                     (רשות) משך "מקליד/ה…" לפני ההודעה, 0 לביטול
 *
 *  file: { kind: 'pdf' | 'doc', name, pages?, size? }   — PDF מוצג עם תצוגה מקדימה מופשטת (בלי תוכן)
 *  card: { title, subtitle?, art? }                      — art: galil | deadsea | eilat | vienna
 *  avatar של משתתף: default (צללית אפורה של WhatsApp), sunset, sea, flower, flower2,
 *                   leaf, mountain, city, balloon, beach, coffee
 *  avatar של קבוצה: galil | deadsea | eilat | vienna.  encryptionNotice: false מסתיר את הודעת ההצפנה
 *  id — מזהה להודעה, כדי לצטט אותה (reply)
 * ===================================================================
 */
window.SCENE = {
  video: {
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 12, // שניות
  },

  // שעון ההודעות ושורת הסטטוס: השעה בתחילת הסרטון, וכמה דקות "עוברות" בכל שנייה
  clock: { start: '10:24', minutesPerSecond: 0.5 },

  // מידות הטלפונים (בפיקסלים של הווידאו). כל הטלפונים באותו גודל, וממורכזים יחד
  phones: {
    width: 440,
    height: 940,
    gap: 34, // רווח בין טלפונים
    bezel: 10, // עובי המסגרת
    radius: 54, // עיגול פינות המכשיר
    dpWidth: 365, // רוחב המסך ביחידות dp של אנדרואיד (קובע את גודל הממשק בתוך הטלפון)
    joinDuration: 0.95, // משך הכניסה של טלפון חדש
    float: 5, // ריחוף עדין למעלה ולמטה (פיקסלים, 0 לביטול)
  },

  // מצלמה: זום לפי מספר הטלפונים על המסך — מתחיל קרוב ומתרחק ככל שנוספות קבוצות
  camera: { zoomByCount: { 1: 1.08, 2: 1.06, 3: 1.03, 4: 0.985 } },

  effects: {
    messageEnter: 0.32, // משך "קפיצת" הודעה חדשה
    reactionBursts: true, // אימוג'ים קטנים שעפים מתגובה חדשה
    joinGlow: true, // הילה ירוקה סביב טלפון שנכנס
    typingDefault: 0.5, // "מקליד/ה…" בכותרת לפני כל הודעה (שניות)
  },

  timeline: {
    // מתי כל קבוצה נכנסת למסך. הראשונה במרכז, וכל חדשה נכנסת משמאל והכול מתמרכז מחדש
    joins: [
      { group: 'galil', at: 0 },
      { group: 'deadsea', at: 2.5 },
      { group: 'eilat', at: 4.9 },
      { group: 'vienna', at: 7.3 },
    ],
  },

  groups: [
    /* ------------------------------------------------------------- */
    {
      id: 'galil',
      title: 'נופשON | גליל | 12–14.11.2026',
      avatar: 'galil',
      participants: {
        dana: { saved: true, name: 'דנה לוי', color: '#0E8A80', avatar: 'sunset' },
        avi: { phone: '+972 54-731-2289', pushName: 'אבי כהן - אורות רבין', color: '#1F6FD6', avatar: 'default' },
        gil: { phone: '+972 52-418-9036', pushName: 'גיל לוי', color: '#C2610C', avatar: 'mountain' },
        noa: { phone: '+972 50-296-5514', pushName: 'נועה 🌸', color: '#D13B86', avatar: 'flower' },
        ran: { phone: '+972 58-663-0417', pushName: 'רן - מחוז חיפה', color: '#7A4FD0', avatar: 'default' },
      },
      messages: [
        { at: 0.45, type: 'system', text: 'דנה לוי הוסיפה אותך לקבוצה' },
        {
          at: 0.85, from: 'dana', text: 'שלום לכולם! אני דנה, אלווה אתכם בנופשון 😊', typing: 0,
          reactions: [
            { at: 1.6, emojis: ['❤️'], count: 1 },
            { at: 2.4, emojis: ['❤️', '👍'], count: 3 },
          ],
        },
        {
          at: 1.45, from: 'dana', text: 'מצרפת את התוכנית ואת נקודות האיסוף',
          file: { kind: 'pdf', name: 'נופשON גליל - תוכנית ונקודות איסוף.pdf', pages: 2, size: '1.2 MB' },
        },
        { id: 'g1-hadera', at: 2.05, from: 'avi', text: 'מי עולה מחדרה?' },
        { at: 2.6, from: 'gil', text: 'אני, מאגף רשת', reply: 'g1-hadera' },
        { id: 'g1-meet', at: 3.15, from: 'noa', text: 'גם אני, נפגשים בנקודה?' },
        { at: 3.75, from: 'ran', text: 'אנחנו שניים מחיפה' },
        { at: 4.4, from: 'dana', text: 'פרטי שתי נקודות האיסוף מופיעים בקובץ 👆', reply: 'g1-meet' },
        { at: 5.05, from: 'avi', text: 'מצאתי, תודה', reactions: [{ at: 5.6, emojis: ['👍'], count: 1 }] },
        { at: 5.7, from: 'noa', text: 'מישהו כאן מהשירות באשדוד?' },
        { at: 6.35, from: 'ran', text: 'הייתי שם לפני כמה שנים' },
        { id: 'g1-team', at: 7.0, from: 'noa', text: 'רגע, רן מהצוות של מיכל?' },
        { at: 7.6, from: 'ran', text: 'כן 😂', reply: 'g1-team' },
        {
          at: 8.25, from: 'noa', text: 'איזה עולם קטן!',
          reactions: [{ at: 8.8, emojis: ['😂'], count: 1 }, { at: 9.4, emojis: ['😂', '❤️'], count: 3 }],
        },
        { at: 8.95, from: 'gil', text: 'כבר מתחילים להכיר פה' },
        {
          at: 9.65, from: 'dana', text: 'בדיוק בשביל זה אנחנו כאן 😊',
          reactions: [{ at: 10.35, emojis: ['❤️'], count: 2 }, { at: 11.1, emojis: ['❤️'], count: 4 }],
        },
        { at: 10.4, from: 'avi', text: 'יאללה, מחכה כבר לצאת', reactions: [{ at: 11.3, emojis: ['🙌'], count: 2 }] },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: 'deadsea',
      title: 'נופשON | ים המלח | 19–21.11.2026',
      avatar: 'deadsea',
      encryptionNotice: false,
      participants: {
        tal: { phone: '+972 53-327-8841', pushName: 'טל — נופשON', color: '#1B8A3A', avatar: 'default' },
        uri: { saved: true, name: 'אורי ברק', color: '#B0287A', avatar: 'sea' },
        lior: { phone: '+972 54-905-3326', pushName: 'ליאור דוד - רוטנברג', color: '#1F6FD6', avatar: 'default' },
        keren: { phone: '+972 52-771-4608', pushName: 'קרן - משאבי אנוש', color: '#C2610C', avatar: 'balloon' },
        yossi: { phone: '+972 50-184-6293', pushName: 'יוסי', color: '#4A55B8', avatar: 'default' },
      },
      messages: [
        { at: 2.95, type: 'system', text: 'טל אברהם הוסיף אותך לקבוצה' },
        {
          at: 3.35, from: 'tal', text: 'ברוכים הבאים! אני טל, המלווה שלכם', typing: 0,
          reactions: [{ at: 4.0, emojis: ['👋'], count: 1 }, { at: 5.2, emojis: ['👋', '❤️'], count: 4 }],
        },
        { id: 'g2-atv', at: 3.9, from: 'uri', text: 'מי בא לטרקטורונים ביום השלישי?' },
        { at: 4.45, from: 'lior', text: 'אני מגיע לבד, מצטרף', reply: 'g2-atv' },
        { at: 4.95, from: 'uri', text: 'מעולה 🙌' },
        { at: 5.45, from: 'keren', text: 'גם אנחנו בעניין' },
        { id: 'g2-register', at: 6.0, from: 'yossi', text: 'צריך להירשם מראש?' },
        {
          at: 6.65, from: 'tal', text: 'מצרף את פרטי הפעילות וההרשמה', reply: 'g2-register',
          card: { title: 'פרטי הפעילות וההרשמה', subtitle: 'נופשON | ים המלח', art: 'deadsea' },
        },
        { at: 7.3, from: 'keren', text: 'תודה טל' },
        { at: 7.95, from: 'lior', text: 'מישהו עולה מהמרכז?' },
        { at: 8.55, from: 'yossi', text: 'אני מראשון' },
        { at: 9.1, from: 'uri', text: 'גם אני' },
        { at: 9.7, from: 'lior', text: 'אז נתראה בהסעה', reactions: [{ at: 10.3, emojis: ['👍'], count: 2 }] },
        { id: 'g2-sms', at: 10.35, from: 'keren', text: 'קיבלתם את ה־SMS עם השובר?' },
        { at: 10.95, from: 'yossi', text: 'כן, הגיע עכשיו', reply: 'g2-sms' },
        { id: 'g2-notyet', at: 11.5, from: 'uri', text: 'אצלי עוד לא' },
        // מחוץ ל־12 השניות:
        { at: 12.2, from: 'tal', text: 'אורי, כתוב לי בפרטי ואבדוק איתך', reply: 'g2-notyet' },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: 'eilat',
      title: 'נופשON | אילת | 26–29.11.2026',
      avatar: 'eilat',
      encryptionNotice: false,
      participants: {
        maya: { saved: true, name: 'מאיה ביטון', color: '#C93636', avatar: 'beach' },
        michal: { phone: '+972 54-238-7719', pushName: 'מיכל פרץ - מחוז דן', color: '#7A4FD0', avatar: 'leaf' },
        roee: { phone: '+972 52-856-0943', pushName: 'רועי אדרי', color: '#0E8A80', avatar: 'default' },
        efrat: { phone: '+972 58-412-3375', pushName: 'אפרת - כספים', color: '#D13B86', avatar: 'default' },
        elad: { phone: '+972 50-639-8124', pushName: 'אלעד', color: '#9A5B3C', avatar: 'city' },
      },
      messages: [
        { at: 5.35, type: 'system', text: 'מאיה ביטון הוסיפה אותך לקבוצה' },
        {
          at: 5.75, from: 'maya', text: 'שלום לכולם, אני מאיה. אלווה אתכם לאורך הנופשון', typing: 0,
          reactions: [{ at: 6.4, emojis: ['❤️'], count: 1 }, { at: 8.5, emojis: ['❤️', '😊'], count: 3 }],
        },
        { id: 'g3-roee', at: 6.3, from: 'michal', text: 'רועי? זה אתה מהצוות הישן?' },
        { at: 6.85, from: 'roee', text: 'מה הסיכוי! לא התראינו שנים', reply: 'g3-roee' },
        { at: 7.4, from: 'michal', text: 'חייבים להשלים פערים!' },
        {
          at: 7.95, from: 'roee', text: 'קפה ראשון עליי ☕',
          reactions: [{ at: 8.55, emojis: ['😂'], count: 1 }, { at: 9.15, emojis: ['😂', '❤️'], count: 2 }],
        },
        { id: 'g3-kids', at: 8.6, from: 'efrat', text: 'יש פה עוד משפחות עם ילדים?' },
        { at: 9.2, from: 'elad', text: 'אנחנו עם שניים', reply: 'g3-kids' },
        { at: 9.8, from: 'efrat', text: 'מעולה, כבר יש להם חברים' },
        { at: 10.4, from: 'michal', text: 'מישהו רוצה להצטרף לטיילת בערב?' },
        { at: 10.95, from: 'roee', text: 'ברור' },
        { at: 11.45, from: 'elad', text: 'גם אנחנו' },
        // מחוץ ל־12 השניות:
        {
          at: 12.2, from: 'maya', text: 'מצרפת גם את תוכנית הפעילויות למשפחות',
          file: { kind: 'pdf', name: 'נופשON אילת - תוכנית פעילויות למשפחות.pdf', pages: 3, size: '2.4 MB' },
        },
        { id: 'g3-kosher', at: 12.8, from: 'efrat', text: 'ואיפה פרטי הכשרות?' },
        {
          at: 13.4, from: 'maya', text: 'כאן, יחד עם שעות הבריכה בהפרדה', reply: 'g3-kosher',
          card: { title: 'כשרות ושעות בריכה בהפרדה', subtitle: 'נופשON | אילת', art: 'eilat' },
        },
        { at: 14.0, from: 'elad', text: 'תודה רבה' },
        { at: 14.6, from: 'efrat', text: 'איזה כיף שהכול מרוכז פה' },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: 'vienna',
      title: 'נופשON | וינה | 3–6.12.2026',
      avatar: 'vienna',
      encryptionNotice: false,
      participants: {
        alon: { phone: '+972 52-904-1186', pushName: 'אלון — נופשON', color: '#1B8A3A', avatar: 'default' },
        shira: { saved: true, name: 'שירה גולן', color: '#1F6FD6', avatar: 'coffee' },
        david: { phone: '+972 54-517-6602', pushName: 'דוד - מחוז צפון', color: '#C2610C', avatar: 'default' },
        anat: { phone: '+972 53-268-9947', pushName: 'ענת - שירות לקוחות', color: '#B0287A', avatar: 'flower2' },
      },
      messages: [
        { at: 7.75, type: 'system', text: 'אלון שפירא הוסיף אותך לקבוצה' },
        {
          at: 8.15, from: 'alon', text: 'שלום לכולם! אני אלון, אלווה אתכם מהיציאה ועד החזרה', typing: 0,
          reactions: [{ at: 8.8, emojis: ['❤️'], count: 1 }, { at: 10.1, emojis: ['❤️', '👏'], count: 3 }],
        },
        { at: 8.7, from: 'shira', text: 'איזה כיף 😊' },
        { id: 'g4-north', at: 9.2, from: 'david', text: 'מי עוד מגיע מהצפון?' },
        { at: 9.7, from: 'anat', text: 'אנחנו מקריית אתא', reply: 'g4-north' },
        { at: 10.2, from: 'shira', text: 'אני מחיפה' },
        { at: 10.7, from: 'david', text: 'אז כבר יש חבורה', reactions: [{ at: 11.25, emojis: ['🙌'], count: 2 }] },
        { id: 'g4-shuttle', at: 11.25, from: 'anat', text: 'איפה פרטי ההסעה לשדה?' },
        // מחוץ ל־12 השניות:
        {
          id: 'g4-pdf', at: 12.2, from: 'alon', text: 'מצרף את פרטי ההגעה והמפגש', reply: 'g4-shuttle',
          file: { kind: 'pdf', name: 'נופשON וינה - פרטי הגעה ומפגש.pdf', pages: 2, size: '860 KB' },
        },
        { at: 12.8, from: 'david', text: 'תודה' },
        { at: 13.4, from: 'shira', text: 'איפה המידע על ביטוח הנסיעה?' },
        { at: 14.0, from: 'alon', text: 'מצורף כאן 👇' },
        { at: 14.5, from: 'alon', typing: 0, file: { kind: 'doc', name: 'ביטוח נסיעות - מידע למשתתפים.docx', size: '420 KB' } },
        { id: 'g4-sandwich', at: 15.1, from: 'anat', text: 'ואיפה מקבלים את הסנדוויץ והקפה בשדה?' },
        { at: 15.7, from: 'alon', text: 'פרטי האיסוף בהודעה המצורפת', reply: 'g4-pdf' },
        { at: 16.3, from: 'david', text: 'מישהו מצטרף לסיבוב בעיר בזמן החופשי?' },
        { at: 16.9, from: 'shira', text: 'אני!' },
        { at: 17.5, from: 'anat', text: 'גם אנחנו 🙋‍♀️' },
      ],
    },
  ],
};
