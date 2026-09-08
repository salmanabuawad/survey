import type { Locale } from "./config";

/**
 * Interface copy — buttons, hints, status lines.
 *
 * Distinct from the questionnaire itself, which is research content: that lives
 * in the database (source Arabic) and in `content/translations/*.json`.
 *
 * The survey addresses kindergarten teachers, who are women; the Arabic is
 * written in the feminine throughout, and the Hebrew follows it. English has no
 * grammatical gender here, so it stays neutral.
 *
 * The admin dashboard is Arabic only — it is for the research team, not for
 * respondents — so none of its copy appears here.
 */
export interface Messages {
  intro: {
    questionCount: string;
    approximateTime: string;
    tenMinutes: string;
    start: string;
    resume: string;
    autosaveNote: string;
  };
  wizard: {
    questionOf: (current: number, total: number) => string;
    progressLabel: (answered: number, total: number) => string;
    sectionsLabel: string;
    sectionComplete: string;
    restored: string;
    previous: string;
    next: string;
    submit: string;
    submitting: string;
    chooseAnswer: string;
    specifyOther: string;
    multipleChoice: string;
    privacyHint: string;
    unavailable: string;
    submitFailed: string;
    staleQuestionnaire: string;
  };
  thanks: {
    closeNote: string;
  };
  language: {
    switcherLabel: string;
  };
}

const ar: Messages = {
  intro: {
    questionCount: "عدد الأسئلة",
    approximateTime: "الوقت التقريبي",
    tenMinutes: "10 دقائق",
    start: "ابدأ الاستبيان",
    resume: "متابعة الاستبيان",
    autosaveNote: "تُحفظ إجاباتك تلقائياً على هذا الجهاز حتى تنهي الاستبيان.",
  },
  wizard: {
    questionOf: (current, total) => `السؤال ${current} من ${total}`,
    progressLabel: (answered, total) =>
      `تقدّمك في الاستبيان: ${answered} من ${total} سؤالاً`,
    sectionsLabel: "أقسام الاستبيان",
    sectionComplete: "مكتمل",
    restored: "تم استرجاع إجاباتك السابقة على هذا الجهاز، يمكنك المتابعة من حيث توقفت.",
    previous: "السابق",
    next: "التالي",
    submit: "إرسال الاستبيان",
    submitting: "جارٍ الإرسال…",
    chooseAnswer: "اختاري إجابة للمتابعة.",
    specifyOther: "يرجى تحديد الإجابة في الخانة المخصصة للمتابعة.",
    multipleChoice: "اختيار متعدد",
    privacyHint: "يرجى عدم ذكر أسماء الأطفال أو معلومات تكشف هويتهم.",
    unavailable: "الاستبيان غير متاح حالياً.",
    submitFailed: "تعذر إرسال الاستبيان",
    staleQuestionnaire: "تم تحديث الاستبيان أثناء تعبئته، يرجى إعادة تحميل الصفحة.",
  },
  thanks: {
    closeNote: "يمكنك الآن إغلاق هذه الصفحة.",
  },
  language: {
    switcherLabel: "اللغة",
  },
};

const he: Messages = {
  intro: {
    questionCount: "מספר השאלות",
    approximateTime: "זמן משוער",
    tenMinutes: "10 דקות",
    start: "התחילי את השאלון",
    resume: "המשיכי את השאלון",
    autosaveNote: "התשובות שלך נשמרות אוטומטית במכשיר הזה עד לסיום השאלון.",
  },
  wizard: {
    questionOf: (current, total) => `שאלה ${current} מתוך ${total}`,
    progressLabel: (answered, total) =>
      `ההתקדמות שלך בשאלון: ${answered} מתוך ${total} שאלות`,
    sectionsLabel: "חלקי השאלון",
    sectionComplete: "הושלם",
    restored: "התשובות הקודמות שלך במכשיר הזה שוחזרו, אפשר להמשיך מהמקום שבו הפסקת.",
    previous: "הקודם",
    next: "הבא",
    submit: "שליחת השאלון",
    submitting: "שולח…",
    chooseAnswer: "בחרי תשובה כדי להמשיך.",
    specifyOther: "נא לפרט בתיבה המיועדת כדי להמשיך.",
    multipleChoice: "בחירה מרובה",
    privacyHint: "נא לא לציין שמות של ילדים או פרטים שעלולים לזהות אותם.",
    unavailable: "השאלון אינו זמין כרגע.",
    submitFailed: "שליחת השאלון נכשלה",
    staleQuestionnaire: "השאלון עודכן בזמן המילוי, נא לרענן את הדף.",
  },
  thanks: {
    closeNote: "אפשר לסגור את הדף.",
  },
  language: {
    switcherLabel: "שפה",
  },
};

const en: Messages = {
  intro: {
    questionCount: "Questions",
    approximateTime: "Approximate time",
    tenMinutes: "10 minutes",
    start: "Start the survey",
    resume: "Continue the survey",
    autosaveNote: "Your answers are saved on this device until you finish.",
  },
  wizard: {
    questionOf: (current, total) => `Question ${current} of ${total}`,
    progressLabel: (answered, total) =>
      `Your progress: ${answered} of ${total} questions`,
    sectionsLabel: "Survey sections",
    sectionComplete: "complete",
    restored:
      "Your previous answers on this device have been restored — you can carry on where you left off.",
    previous: "Back",
    next: "Next",
    submit: "Submit the survey",
    submitting: "Sending…",
    chooseAnswer: "Please choose an answer to continue.",
    specifyOther: "Please fill in the box to continue.",
    multipleChoice: "Choose more than one",
    privacyHint:
      "Please do not mention children's names or anything that could identify them.",
    unavailable: "The survey is not available right now.",
    submitFailed: "The survey could not be submitted",
    staleQuestionnaire: "The survey was updated while you were filling it in — please reload the page.",
  },
  thanks: {
    closeNote: "You can close this page now.",
  },
  language: {
    switcherLabel: "Language",
  },
};

const MESSAGES: Record<Locale, Messages> = { ar, he, en };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}
