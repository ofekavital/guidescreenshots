/*
 * ===================================================================
 *  סצנת קבוצות WhatsApp — קובץ הנתונים העריך
 * ===================================================================
 *  כל מה שמופיע בסרטון מוגדר כאן: הגדרות וידאו, פריסה, ציר זמן (הצטרפות
 *  קבוצות, מיקוד, גלילות), משתתפים, הודעות, תגובות וקבצים.
 *  אחרי עריכה: פתחו את index.html לתצוגה מקדימה, והריצו `npm run render`.
 *
 *  זמנים — בשניות מתחילת הסרטון (at).
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
 *    typing: 1.2                                     (רשות) משך "מקליד/ה…" לפני ההודעה, 0 לביטול
 *
 *  file: { kind: 'pdf' | 'doc', name, pages?, size? }   — PDF מוצג עם תצוגה מקדימה מופשטת (בלי תוכן)
 *  card: { title, subtitle?, art? }                      — art: galil | deadsea | eilat | vienna
 *  avatar של משתתף: default (צללית אפורה של WhatsApp), sunset, sea, flower, flower2,
 *                   leaf, mountain, city, balloon, beach, coffee
 *  avatar של קבוצה: galil | deadsea | eilat | vienna.  encryptionNotice: false מסתיר את הודעת ההצפנה
 *  id — מזהה להודעה, כדי לצטט אותה (reply) או לגלול אליה (timeline.scrolls)
 * ===================================================================
 */
window.SCENE = {
  video: {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 104, // שניות
  },

  // שעון ההודעות: השעה בתחילת הסרטון, וכמה דקות "עוברות" בכל שנייה בסרטון
  clock: { start: '10:24', minutesPerSecond: 0.2 },

  layout: {
    margin: 24, // שוליים סביב המסך
    gap: 20, // רווח בין חלוניות
    radius: 22, // עיגול פינות החלוניות
    // עקומת הגדלה: [רוחב החלונית בפיקסלים, פקטור הגדלה של ממשק הטלפון].
    // חלונית צרה ≈ טלפון של ~390dp; חלונית במיקוד או במסך מלא גדלה כך שהטקסט
    // גדול וקריא, ושם הקבוצה המלא נכנס בכותרת
    scaleCurve: [
      [380, 0.975],
      [450, 1.1],
      [655, 1.36],
      [800, 1.5],
      [1030, 1.68],
      [1872, 1.95],
    ],
    // כמה רחבה הקבוצה שבמיקוד יחסית לאחרות, לפי מספר הקבוצות על המסך
    focusBoost: { 1: 0, 2: 0.25, 3: 0.55, 4: 0.72 },
    dimOthers: 0.26, // עמעום חלוניות שאינן במיקוד (0–1)
    joinDuration: 1.1, // משך כניסת קבוצה חדשה
    focusDuration: 0.9, // משך מעבר מיקוד
  },

  timeline: {
    // מתי כל קבוצה נכנסת למסך (הראשונה במסך מלא, הבאות מפצלות אותו)
    joins: [
      { group: 'galil', at: 0 },
      { group: 'deadsea', at: 18.4 },
      { group: 'eilat', at: 32.4 },
      { group: 'vienna', at: 46.4 },
    ],
    // מיקוד: מאיזה רגע כל קבוצה במיקוד. group: null = ללא מיקוד (כולן שוות)
    focus: [
      { at: 0, group: 'galil' },
      { at: 18.8, group: 'deadsea' },
      { at: 32.8, group: 'eilat' },
      { at: 46.8, group: 'vienna' },
      { at: 59.8, group: 'galil' },
      { at: 70.0, group: 'deadsea' },
      { at: 79.0, group: 'eilat' },
      { at: 88.2, group: 'vienna' },
      { at: 100.6, group: null },
    ],
    // גלילה אל הודעה קודמת (כמו לחיצה על ציטוט), הדגשה, וחזרה למטה
    scrolls: [
      { group: 'galil', target: 'g1-pdf', at: 15.3, hold: 1.9 },
      { group: 'vienna', target: 'g4-pdf', at: 92.2, hold: 2.3, tapReply: 'g4-pickup' },
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
        { at: 1.4, type: 'system', text: 'דנה לוי הוסיפה אותך לקבוצה' },
        {
          id: 'g1-welcome', at: 2.8, from: 'dana', text: 'שלום לכולם! אני דנה, אלווה אתכם בנופשון 😊',
          reactions: [
            { at: 4.6, emojis: ['❤️'], count: 1 },
            { at: 7.9, emojis: ['❤️', '👍'], count: 3 },
            { at: 24.5, emojis: ['❤️', '👍', '🙏'], count: 5 },
          ],
        },
        {
          id: 'g1-pdf', at: 5.0, from: 'dana', text: 'מצרפת את התוכנית ואת נקודות האיסוף',
          file: { kind: 'pdf', name: 'נופשON גליל - תוכנית ונקודות איסוף.pdf', pages: 2, size: '1.2 MB' },
        },
        { id: 'g1-hadera', at: 7.4, from: 'avi', text: 'מי עולה מחדרה?' },
        { at: 9.2, from: 'gil', text: 'אני, מאגף רשת', reply: 'g1-hadera' },
        { id: 'g1-meet', at: 11.0, from: 'noa', text: 'גם אני, נפגשים בנקודה?' },
        { at: 12.7, from: 'ran', text: 'אנחנו שניים מחיפה' },
        { at: 14.2, from: 'dana', text: 'פרטי שתי נקודות האיסוף מופיעים בקובץ 👆', reply: 'g1-meet' },
        { at: 22.6, from: 'avi', text: 'מצאתי, תודה', reactions: [{ at: 26.0, emojis: ['👍'], count: 1 }] },
        { at: 41.6, from: 'noa', text: 'מישהו כאן מהשירות באשדוד?' },
        { at: 52.4, from: 'ran', text: 'הייתי שם לפני כמה שנים' },
        { id: 'g1-team', at: 61.0, from: 'noa', text: 'רגע, רן מהצוות של מיכל?' },
        { at: 63.0, from: 'ran', text: 'כן 😂', reply: 'g1-team' },
        {
          at: 64.7, from: 'noa', text: 'איזה עולם קטן!',
          reactions: [{ at: 66.0, emojis: ['😂'], count: 1 }, { at: 67.6, emojis: ['😂', '❤️'], count: 3 }],
        },
        { at: 66.6, from: 'gil', text: 'כבר מתחילים להכיר פה' },
        {
          at: 68.6, from: 'dana', text: 'בדיוק בשביל זה אנחנו כאן 😊',
          reactions: [{ at: 73.5, emojis: ['❤️'], count: 2 }, { at: 81.0, emojis: ['❤️'], count: 4 }],
        },
        {
          at: 86.4, from: 'avi', text: 'יאללה, מחכה כבר לצאת',
          reactions: [{ at: 93.6, emojis: ['🙌'], count: 2 }],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: 'deadsea',
      title: 'נופשON | ים המלח | 19–21.11.2026',
      avatar: 'deadsea',
      participants: {
        tal: { phone: '+972 53-327-8841', pushName: 'טל — נופשON', color: '#1B8A3A', avatar: 'default' },
        uri: { saved: true, name: 'אורי ברק', color: '#B0287A', avatar: 'sea' },
        lior: { phone: '+972 54-905-3326', pushName: 'ליאור דוד - רוטנברג', color: '#1F6FD6', avatar: 'default' },
        keren: { phone: '+972 52-771-4608', pushName: 'קרן - משאבי אנוש', color: '#C2610C', avatar: 'balloon' },
        yossi: { phone: '+972 50-184-6293', pushName: 'יוסי', color: '#4A55B8', avatar: 'default' },
      },
      messages: [
        { at: 19.6, type: 'system', text: 'טל אברהם הוסיף אותך לקבוצה' },
        {
          at: 21.2, from: 'tal', text: 'ברוכים הבאים! אני טל, המלווה שלכם',
          reactions: [{ at: 23.0, emojis: ['👋'], count: 1 }, { at: 29.4, emojis: ['👋', '❤️'], count: 4 }],
        },
        { id: 'g2-atv', at: 23.6, from: 'uri', text: 'מי בא לטרקטורונים ביום השלישי?' },
        { at: 25.6, from: 'lior', text: 'אני מגיע לבד, מצטרף', reply: 'g2-atv' },
        { at: 27.2, from: 'uri', text: 'מעולה 🙌' },
        { at: 28.8, from: 'keren', text: 'גם אנחנו בעניין' },
        { id: 'g2-register', at: 30.6, from: 'yossi', text: 'צריך להירשם מראש?' },
        {
          at: 35.0, from: 'tal', text: 'מצרף את פרטי הפעילות וההרשמה', reply: 'g2-register',
          card: { title: 'פרטי הפעילות וההרשמה', subtitle: 'נופשON | ים המלח', art: 'deadsea' },
        },
        { at: 39.6, from: 'keren', text: 'תודה טל' },
        { at: 45.0, from: 'lior', text: 'מישהו עולה מהמרכז?' },
        { at: 50.4, from: 'yossi', text: 'אני מראשון' },
        { at: 55.0, from: 'uri', text: 'גם אני' },
        { at: 58.8, from: 'lior', text: 'אז נתראה בהסעה', reactions: [{ at: 61.2, emojis: ['👍'], count: 2 }] },
        { id: 'g2-sms', at: 71.2, from: 'keren', text: 'קיבלתם את ה־SMS עם השובר?' },
        { at: 73.0, from: 'yossi', text: 'כן, הגיע עכשיו', reply: 'g2-sms' },
        { id: 'g2-notyet', at: 74.6, from: 'uri', text: 'אצלי עוד לא' },
        {
          at: 76.6, from: 'tal', text: 'אורי, כתוב לי בפרטי ואבדוק איתך', reply: 'g2-notyet',
          reactions: [{ at: 78.4, emojis: ['🙏'], count: 1 }, { at: 85.0, emojis: ['🙏', '👍'], count: 3 }],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: 'eilat',
      title: 'נופשON | אילת | 26–29.11.2026',
      avatar: 'eilat',
      participants: {
        maya: { saved: true, name: 'מאיה ביטון', color: '#C93636', avatar: 'beach' },
        michal: { phone: '+972 54-238-7719', pushName: 'מיכל פרץ - מחוז דן', color: '#7A4FD0', avatar: 'leaf' },
        roee: { phone: '+972 52-856-0943', pushName: 'רועי אדרי', color: '#0E8A80', avatar: 'default' },
        efrat: { phone: '+972 58-412-3375', pushName: 'אפרת - כספים', color: '#D13B86', avatar: 'default' },
        elad: { phone: '+972 50-639-8124', pushName: 'אלעד', color: '#9A5B3C', avatar: 'city' },
      },
      messages: [
        { at: 33.6, type: 'system', text: 'מאיה ביטון הוסיפה אותך לקבוצה' },
        {
          at: 35.0, from: 'maya', text: 'שלום לכולם, אני מאיה. אלווה אתכם לאורך הנופשון',
          reactions: [{ at: 36.8, emojis: ['❤️'], count: 1 }, { at: 48.0, emojis: ['❤️', '😊'], count: 3 }],
        },
        { id: 'g3-roee', at: 37.4, from: 'michal', text: 'רועי? זה אתה מהצוות הישן?' },
        { at: 39.4, from: 'roee', text: 'מה הסיכוי! לא התראינו שנים', reply: 'g3-roee' },
        { at: 41.2, from: 'michal', text: 'חייבים להשלים פערים!' },
        {
          at: 42.8, from: 'roee', text: 'קפה ראשון עליי ☕',
          reactions: [{ at: 44.2, emojis: ['😂'], count: 1 }, { at: 45.6, emojis: ['😂', '❤️'], count: 2 }],
        },
        { id: 'g3-kids', at: 49.6, from: 'efrat', text: 'יש פה עוד משפחות עם ילדים?' },
        { at: 54.0, from: 'elad', text: 'אנחנו עם שניים', reply: 'g3-kids' },
        { at: 58.4, from: 'efrat', text: 'מעולה, כבר יש להם חברים' },
        { at: 64.0, from: 'michal', text: 'מישהו רוצה להצטרף לטיילת בערב?' },
        { at: 67.6, from: 'roee', text: 'ברור' },
        { at: 75.4, from: 'elad', text: 'גם אנחנו' },
        {
          at: 80.2, from: 'maya', text: 'מצרפת גם את תוכנית הפעילויות למשפחות',
          file: { kind: 'pdf', name: 'נופשON אילת - תוכנית פעילויות למשפחות.pdf', pages: 3, size: '2.4 MB' },
        },
        { id: 'g3-kosher', at: 82.4, from: 'efrat', text: 'ואיפה פרטי הכשרות?' },
        {
          at: 84.2, from: 'maya', text: 'כאן, יחד עם שעות הבריכה בהפרדה', reply: 'g3-kosher',
          card: { title: 'כשרות ושעות בריכה בהפרדה', subtitle: 'נופשON | אילת', art: 'eilat' },
        },
        { at: 86.2, from: 'elad', text: 'תודה רבה' },
        {
          at: 88.0, from: 'efrat', text: 'איזה כיף שהכול מרוכז פה',
          reactions: [{ at: 89.6, emojis: ['❤️'], count: 2 }],
        },
      ],
    },

    /* ------------------------------------------------------------- */
    {
      id: 'vienna',
      title: 'נופשON | וינה | 3–6.12.2026',
      avatar: 'vienna',
      participants: {
        alon: { phone: '+972 52-904-1186', pushName: 'אלון — נופשON', color: '#1B8A3A', avatar: 'default' },
        shira: { saved: true, name: 'שירה גולן', color: '#1F6FD6', avatar: 'coffee' },
        david: { phone: '+972 54-517-6602', pushName: 'דוד - מחוז צפון', color: '#C2610C', avatar: 'default' },
        anat: { phone: '+972 53-268-9947', pushName: 'ענת - שירות לקוחות', color: '#B0287A', avatar: 'flower2' },
      },
      messages: [
        { at: 47.6, type: 'system', text: 'אלון שפירא הוסיף אותך לקבוצה' },
        {
          at: 49.0, from: 'alon', text: 'שלום לכולם! אני אלון, אלווה אתכם מהיציאה ועד החזרה',
          reactions: [{ at: 50.8, emojis: ['❤️'], count: 1 }, { at: 57.0, emojis: ['❤️', '👏'], count: 3 }],
        },
        { at: 51.2, from: 'shira', text: 'איזה כיף 😊' },
        { id: 'g4-north', at: 53.0, from: 'david', text: 'מי עוד מגיע מהצפון?' },
        { at: 54.8, from: 'anat', text: 'אנחנו מקריית אתא', reply: 'g4-north' },
        { at: 56.4, from: 'shira', text: 'אני מחיפה' },
        { at: 58.2, from: 'david', text: 'אז כבר יש חבורה', reactions: [{ at: 59.4, emojis: ['🙌'], count: 2 }] },
        { id: 'g4-shuttle', at: 63.0, from: 'anat', text: 'איפה פרטי ההסעה לשדה?' },
        {
          id: 'g4-pdf', at: 68.0, from: 'alon', text: 'מצרף את פרטי ההגעה והמפגש', reply: 'g4-shuttle',
          file: { kind: 'pdf', name: 'נופשON וינה - פרטי הגעה ומפגש.pdf', pages: 2, size: '860 KB' },
        },
        { at: 72.8, from: 'david', text: 'תודה' },
        { at: 77.6, from: 'shira', text: 'איפה המידע על ביטוח הנסיעה?' },
        { at: 83.0, from: 'alon', text: 'מצורף כאן 👇' },
        { at: 83.9, from: 'alon', typing: 0, file: { kind: 'doc', name: 'ביטוח נסיעות - מידע למשתתפים.docx', size: '420 KB' } },
        { id: 'g4-sandwich', at: 89.0, from: 'anat', text: 'ואיפה מקבלים את הסנדוויץ והקפה בשדה?' },
        { id: 'g4-pickup', at: 90.8, from: 'alon', text: 'פרטי האיסוף בהודעה המצורפת', reply: 'g4-pdf' },
        { at: 96.2, from: 'david', text: 'מישהו מצטרף לסיבוב בעיר בזמן החופשי?' },
        { at: 97.8, from: 'shira', text: 'אני!' },
        { at: 99.2, from: 'anat', text: 'גם אנחנו 🙋‍♀️', reactions: [{ at: 100.8, emojis: ['🎉'], count: 2 }] },
      ],
    },
  ],
};
