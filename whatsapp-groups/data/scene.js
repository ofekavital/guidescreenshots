/*
 * ===================================================================
 *  סצנת קבוצות WhatsApp (קליפ שיווקי, 15 שניות) — קובץ הנתונים העריך
 * ===================================================================
 *  כל מה שמופיע בסרטון מוגדר כאן: הגדרות וידאו, טלפונים, מצלמה, אפקטים,
 *  ציר זמן (מתי כל קבוצה נכנסת), משתתפים, הודעות, תגובות וקבצים.
 *  אחרי עריכה: פתחו את index.html לתצוגה מקדימה, והריצו `npm run render`.
 *
 *  זמנים — בשניות מתחילת הסרטון (at). הקצב: ההודעות מתחלפות בין הטלפונים
 *  (כל ~0.3 שנ' במסך כולו, ~1.2 שנ' בכל טלפון), כניסת קבוצה היא רגע שקט, ובסוף רק תגובות.
 *  הודעה עם at שקודם לכניסת הקבוצה כבר מופיעה בצ'אט כשהטלפון נכנס (שיחה שכבר התחילה).
 *  שורות מהתסריט שלא נכנסו לקליפ מופיעות בהערה בסוף כל קבוצה.
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
 *    typing: 0.6                                     (רשות) משך "מקליד/ה…" לפני ההודעה, 0 לביטול
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
    duration: 15, // שניות
  },

  // שעון ההודעות ושורת הסטטוס: השעה בתחילת הסרטון, וכמה דקות "עוברות" בכל שנייה
  clock: { start: '10:24', minutesPerSecond: 0.4 },

  // מידות הטלפונים (בפיקסלים של הווידאו). כל הטלפונים באותו גודל, וממורכזים יחד
  phones: {
    width: 434,
    height: 926,
    gap: 34, // רווח בין טלפונים
    bezel: 10, // עובי המסגרת
    radius: 54, // עיגול פינות המכשיר
    dpWidth: 365, // רוחב המסך ביחידות dp של אנדרואיד (קובע את גודל הממשק בתוך הטלפון)
    joinDuration: 1.3, // משך הכניסה של טלפון חדש והמרכוז מחדש
    enterRise: 380, // מאיזה עומק (פיקסלים) הטלפון החדש עולה מלמטה
    enterTilt: 0, // סיבוב קל בכניסה (מעלות, 0 = בלי)
    float: 0, // ריחוף למעלה ולמטה (פיקסלים, 0 = בלי — שומר על טקסט יציב)
  },

  // מצלמה: זום לפי מספר הטלפונים על המסך (למשל { 1: 1.08, 2: 1.05, 3: 1.02, 4: 1 }).
  // כרגע קבוע על 1: זום רציף גורם לטקסט "לרצד" כשהתנועה נעצרת
  camera: { zoomByCount: { 1: 1, 2: 1, 3: 1, 4: 1 } },

  effects: {
    messageEnter: 0.5, // משך הכניסה של הודעה חדשה
    reactionBursts: false, // אימוג'ים קטנים שעפים מתגובה חדשה
    joinGlow: true, // הילה ירוקה עדינה סביב טלפון שנכנס
    typingDefault: 0.6, // "מקליד/ה…" בכותרת (מופיע רק כשיש רווח של שנייה ומעלה מההודעה הקודמת)
  },

  timeline: {
    // מתי כל קבוצה נכנסת למסך. הראשונה במרכז, וכל חדשה נכנסת משמאל והכול מתמרכז מחדש
    joins: [
      { group: 'galil', at: 0 },
      { group: 'deadsea', at: 3.2 },
      { group: 'eilat', at: 6.2 },
      { group: 'vienna', at: 9.2 },
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
        { at: 0.7, type: 'system', text: 'דנה לוי הוסיפה אותך לקבוצה' },
        {
          at: 1.3, from: 'dana', text: 'שלום לכולם! אני דנה, אלווה אתכם בנופשון 😊', typing: 0,
          reactions: [{ at: 2.25, emojis: ['❤️'], count: 1 }],
        },
        {
          at: 1.95, from: 'dana', text: 'מצרפת את התוכנית ואת נקודות האיסוף',
          file: { kind: 'pdf', name: 'נופשON גליל - תוכנית ונקודות איסוף.pdf', pages: 2, size: '1.2 MB' },
        },
        { id: 'g1-hadera', at: 2.55, from: 'avi', text: 'מי עולה מחדרה?' },
        { at: 3.0, from: 'gil', text: 'אני, מאגף רשת', reply: 'g1-hadera' },
        { id: 'g1-meet', at: 4.95, from: 'noa', text: 'גם אני, נפגשים בנקודה?' },
        { at: 5.75, from: 'ran', text: 'אנחנו שניים מחיפה' },
        {
          at: 8.0, from: 'dana', text: 'פרטי שתי נקודות האיסוף מופיעים בקובץ 👆', reply: 'g1-meet',
          reactions: [{ at: 14.6, emojis: ['👍'], count: 2 }],
        },
        { at: 9.0, from: 'avi', text: 'מצאתי, תודה' },
        { at: 11.85, from: 'noa', text: 'מישהו כאן מהשירות באשדוד?' },
        { at: 13.05, from: 'ran', text: 'הייתי שם לפני כמה שנים' },
        /* שורות נוספות מהתסריט:
           noa: 'רגע, רן מהצוות של מיכל?' · ran: 'כן 😂' · noa: 'איזה עולם קטן!'
           gil: 'כבר מתחילים להכיר פה' · dana: 'בדיוק בשביל זה אנחנו כאן 😊' · avi: 'יאללה, מחכה כבר לצאת' */
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
        { at: 3.9, type: 'system', text: 'טל אברהם הוסיף אותך לקבוצה' },
        { at: 4.6, from: 'tal', text: 'ברוכים הבאים! אני טל, המלווה שלכם', typing: 0 },
        { id: 'g2-atv', at: 5.3, from: 'uri', text: 'מי בא לטרקטורונים ביום השלישי?' },
        { at: 8.35, from: 'lior', text: 'אני מגיע לבד, מצטרף', reply: 'g2-atv' },
        { at: 11.25, from: 'uri', text: 'מעולה 🙌', reactions: [{ at: 14.8, emojis: ['👍'], count: 3 }] },
        { at: 12.45, from: 'keren', text: 'גם אנחנו בעניין' },
        { at: 13.95, from: 'yossi', text: 'צריך להירשם מראש?' },
        /* שורות נוספות מהתסריט:
           tal: 'מצרף את פרטי הפעילות וההרשמה' + card: { title: 'פרטי הפעילות וההרשמה', subtitle: 'נופשON | ים המלח', art: 'deadsea' }
           keren: 'תודה טל' · lior: 'מישהו עולה מהמרכז?' · yossi: 'אני מראשון' · uri: 'גם אני'
           lior: 'אז נתראה בהסעה' · keren: 'קיבלתם את ה־SMS עם השובר?' · yossi: 'כן, הגיע עכשיו'
           uri: 'אצלי עוד לא' · tal: 'אורי, כתוב לי בפרטי ואבדוק איתך' */
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
        // הודעות שכבר נמצאות בקבוצה כשהטלפון נכנס (at לפני זמן הכניסה, 6.2)
        { at: 4.2, type: 'system', text: 'מאיה ביטון הוסיפה אותך לקבוצה' },
        {
          at: 4.6, from: 'maya', text: 'שלום לכולם, אני מאיה. אלווה אתכם לאורך הנופשון',
          reactions: [{ at: 5.0, emojis: ['❤️', '😊'], count: 3 }],
        },
        { id: 'g3-roee', at: 5.0, from: 'michal', text: 'רועי? זה אתה מהצוות הישן?' },
        { at: 5.5, from: 'roee', text: 'מה הסיכוי! לא התראינו שנים', reply: 'g3-roee' },
        // מכאן — הודעות חדשות בזמן אמת
        { at: 7.3, from: 'michal', text: 'חייבים להשלים פערים!' },
        {
          at: 8.7, from: 'roee', text: 'קפה ראשון עליי ☕',
          reactions: [{ at: 14.2, emojis: ['😂', '❤️'], count: 2 }],
        },
        { id: 'g3-kids', at: 10.95, from: 'efrat', text: 'יש פה עוד משפחות עם ילדים?' },
        { at: 12.15, from: 'elad', text: 'אנחנו עם שניים', reply: 'g3-kids' },
        { at: 13.35, from: 'efrat', text: 'מעולה, כבר יש להם חברים' },
        /* שורות נוספות מהתסריט:
           michal: 'מישהו רוצה להצטרף לטיילת בערב?' · roee: 'ברור' · elad: 'גם אנחנו'
           maya: 'מצרפת גם את תוכנית הפעילויות למשפחות' + PDF · efrat: 'ואיפה פרטי הכשרות?'
           maya: 'כאן, יחד עם שעות הבריכה בהפרדה' + כרטיס מידע · elad: 'תודה רבה' · efrat: 'איזה כיף שהכול מרוכז פה' */
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
        // הודעות שכבר נמצאות בקבוצה כשהטלפון נכנס (at לפני זמן הכניסה, 9.2)
        { at: 7.0, type: 'system', text: 'אלון שפירא הוסיף אותך לקבוצה' },
        {
          at: 7.4, from: 'alon', text: 'שלום לכולם! אני אלון, אלווה אתכם מהיציאה ועד החזרה',
          reactions: [{ at: 8.0, emojis: ['❤️', '👏'], count: 3 }],
        },
        { at: 7.8, from: 'shira', text: 'איזה כיף 😊' },
        { id: 'g4-north', at: 8.2, from: 'david', text: 'מי עוד מגיע מהצפון?' },
        { at: 8.6, from: 'anat', text: 'אנחנו מקריית אתא', reply: 'g4-north' },
        // מכאן — הודעות חדשות בזמן אמת
        { at: 10.3, from: 'shira', text: 'אני מחיפה' },
        { at: 11.55, from: 'david', text: 'אז כבר יש חבורה', reactions: [{ at: 14.4, emojis: ['🙌'], count: 2 }] },
        { id: 'g4-shuttle', at: 12.75, from: 'anat', text: 'איפה פרטי ההסעה לשדה?' },
        {
          at: 13.65, from: 'alon', text: 'מצרף את פרטי ההגעה והמפגש', reply: 'g4-shuttle',
          file: { kind: 'pdf', name: 'נופשON וינה - פרטי הגעה ומפגש.pdf', pages: 2, size: '860 KB' },
        },
        /* שורות נוספות מהתסריט:
           david: 'תודה' · shira: 'איפה המידע על ביטוח הנסיעה?' · alon: 'מצורף כאן 👇' + מסמך
           anat: 'ואיפה מקבלים את הסנדוויץ והקפה בשדה?' · alon: 'פרטי האיסוף בהודעה המצורפת'
           david: 'מישהו מצטרף לסיבוב בעיר בזמן החופשי?' · shira: 'אני!' · anat: 'גם אנחנו 🙋‍♀️' */
      ],
    },
  ],
};
