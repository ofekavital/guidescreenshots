/* Demo data for the library (localStorage key: smsStudioCleanV1).
   All content is fictional. Timestamps are fixed so every load renders identically. */
(function () {
  const DEMO_TITLE = 'תזכורת דיווח נוכחות';
  const DEMO_TEXT = [
    'שלום רב,',
    'תזכורת: מועד הגשת דיווחי הנוכחות לחודש אוקטובר הוא ה-25 לחודש.',
    '',
    'לעדכון הדיווח:',
    '1. כניסה לפורטל העובד',
    '2. בחירה ב"נוכחות"',
    '3. אישור ושליחה',
    '',
    'בברכה,',
    'מחשוב משאבי אנוש'
  ].join('\n');

  const snap = (title, desiredText, tags, timestamp, versionId) => ({
    title, desiredText, encodedText: '', notes: '', tags: [...tags], timestamp, versionId
  });

  function msg(id, serialNumber, title, tags, text, versions, createdAt, savedAt) {
    const cur = snap(title, text, tags, savedAt, id + '_cur');
    return {
      id, serialNumber, title, tags: [...tags], createdAt, updatedAt: savedAt, lastSavedAt: savedAt,
      current: cur, draft: { ...cur }, versions
    };
  }

  const m1Text = 'שלום רב,\nתלוש השכר לחודש ספטמבר זמין לצפייה בפורטל העובד.\n\nבברכה,\nמחשוב משאבי אנוש';
  const m2Text = 'שלום רב,\nנא לעדכן את פרטי חשבון הבנק בפורטל העובד עד ה-15 לחודש.\n\nבברכה,\nמחשוב משאבי אנוש';
  const m3Text = 'שלום רב,\nסגירת חודש הנוכחות תתבצע ביום ה׳ הקרוב.\nנא לוודא שכל הדיווחים הושלמו.';
  const m4Text = 'שלום רב,\nיום עיון לעובדים חדשים יתקיים ב-12 לחודש.\nפרטים נוספים יישלחו בהמשך.';

  const v = (title, text, tags, ts, id) => snap(title, text, tags, ts, id);

  const m5Tags = ['נוכחות', 'תזכורת'];
  const m5Versions = [
    v(DEMO_TITLE, 'שלום רב,\nתזכורת להגשת דיווחי נוכחות.', m5Tags, '2026-10-01T06:12:00.000Z', 'v5a'),
    v(DEMO_TITLE, 'שלום רב,\nתזכורת: מועד הגשת דיווחי הנוכחות הוא ה-25 לחודש.\n\nבברכה,\nמחשוב משאבי אנוש', m5Tags, '2026-10-02T09:40:00.000Z', 'v5b'),
    v(DEMO_TITLE, 'שלום רב,\nתזכורת: מועד הגשת דיווחי הנוכחות לחודש אוקטובר הוא ה-25 לחודש.\n\nלעדכון הדיווח יש להיכנס לפורטל העובד.\n\nבברכה,\nמחשוב משאבי אנוש', m5Tags, '2026-10-04T13:05:00.000Z', 'v5c')
  ];

  const messages = [
    msg('sms_demo_0001', 1, 'הודעה על תלוש שכר', ['שכר'], m1Text,
      [v('הודעה על תלוש שכר', m1Text, ['שכר'], '2026-09-01T07:30:00.000Z', 'v1a')],
      '2026-09-01T07:10:00.000Z', '2026-09-01T07:30:00.000Z'),
    msg('sms_demo_0002', 2, 'עדכון פרטי חשבון בנק', ['שכר', 'תזכורת'], m2Text,
      [v('עדכון פרטי חשבון בנק', m2Text, ['שכר', 'תזכורת'], '2026-09-08T10:05:00.000Z', 'v2a'),
       v('עדכון פרטי חשבון בנק', m2Text, ['שכר', 'תזכורת'], '2026-09-09T08:20:00.000Z', 'v2b')],
      '2026-09-08T09:50:00.000Z', '2026-09-09T08:20:00.000Z'),
    msg('sms_demo_0003', 3, 'סגירת חודש נוכחות', ['נוכחות'], m3Text,
      [v('סגירת חודש נוכחות', m3Text, ['נוכחות'], '2026-09-24T12:00:00.000Z', 'v3a')],
      '2026-09-24T11:40:00.000Z', '2026-09-24T12:00:00.000Z'),
    msg('sms_demo_0004', 4, 'יום עיון לעובדים חדשים', ['הדרכה'], m4Text,
      [v('יום עיון לעובדים חדשים', m4Text, ['הדרכה'], '2026-09-29T08:15:00.000Z', 'v4a')],
      '2026-09-29T08:00:00.000Z', '2026-09-29T08:15:00.000Z'),
    (() => {
      // The demo message opens with an empty draft; the video types it in.
      const m = msg('sms_demo_0005', 5, DEMO_TITLE, m5Tags, m5Versions[2].desiredText, m5Versions,
        '2026-10-01T06:00:00.000Z', '2026-10-04T13:05:00.000Z');
      m.draft = { ...m.draft, desiredText: '' };
      return m;
    })()
  ];

  window.SMS_SEED_KEY = 'smsStudioCleanV1';
  window.SMS_SEED = { messages, currentId: 'sms_demo_0005' };
  window.DEMO_TITLE = DEMO_TITLE;
  window.DEMO_TEXT = DEMO_TEXT;
  window.seedLocalStorage = function () {
    localStorage.setItem(window.SMS_SEED_KEY, JSON.stringify(window.SMS_SEED));
  };
})();
