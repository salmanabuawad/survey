/**
 * LOCKED RESEARCH CONTENT — inas-kindergarten-teachers-ar-v1
 *
 * Every string below is transcribed verbatim from the questionnaire approved by
 * Inas. It is the authoritative source of truth for the survey.
 *
 * Do not rewrite, correct, shorten, expand, reorder, merge, split, add or remove
 * any question, section, answer option, introduction text or thank-you text.
 * There are exactly 27 numbered questions and there must never be a 28th.
 *
 * `scripts/verify-content.ts` diffs this file against the locked Arabic source
 * and fails the build on any drift. Presentation lives elsewhere; only wording
 * lives here.
 */

export const SURVEY_VERSION = "inas-kindergarten-teachers-ar-v1";

export type QuestionType = "single" | "multiple" | "text";

export interface SurveyOption {
  /** Shown to the respondent exactly as written in the source. */
  readonly label: string;
  /**
   * True for the "أخرى: __________" style options, which reveal a free-text
   * input when picked. The label keeps its underscores either way.
   */
  readonly other?: true;
}

export interface SurveyQuestion {
  /** 1-27, matching the numbering in the source. */
  readonly id: number;
  /** Stable storage key, `q1`…`q27`. */
  readonly key: string;
  readonly type: QuestionType;
  /** Question text without its leading number. */
  readonly text: string;
  /** Instruction line printed under the question in the source, if any. */
  readonly hint?: string;
  readonly options?: readonly SurveyOption[];
}

export interface SurveySection {
  /** 1-10, in source order. */
  readonly index: number;
  /** Section heading exactly as written in the source. */
  readonly title: string;
  readonly questions: readonly SurveyQuestion[];
}

export const SURVEY_INTRO = {
  title: "استبيان للمعلمات في رياض الأطفال",
  subtitle: "تحديد احتياجات الأطفال وبناء حلول تربوية واجتماعية وعاطفية مناسبة",
  salutation: "المعلمة الفاضلة،",
  paragraphs: [
    "نحن نعمل على تطوير برنامج/منصة رقمية تهدف إلى دعم الأطفال في مرحلة الطفولة المبكرة، من خلال اللعب الهادف، التعلم، وتنمية المهارات الاجتماعية والعاطفية، مع تعزيز التعاون بين الطفل، الأهل والإطار التربوي.",
    "يهدف هذا الاستبيان إلى التعرف على احتياجات الأطفال من وجهة نظر الطاقم التربوي، وفهم التحديات الموجودة في الروضة، بهدف تطوير محتوى وأدوات عملية وملائمة للاحتياجات الحقيقية في الميدان.",
  ],
  notice:
    "الاستبيان مجهول الهوية، وتستخدم المعلومات لأغراض التطوير والتخطيط فقط.",
} as const;

export const SURVEY_THANKS = {
  heading: "شكراً لمشاركتك",
  lead: "رأيك المهني مهم جداً بالنسبة لنا.",
  bodyBefore:
    "الهدف هو تطوير حل يستجيب للاحتياجات الحقيقية للأطفال والمعلمات والأهل، ويجعل من ",
  bodyEmphasis:
    "اللعب وسيلة للتعلم، والتواصل، والنمو الاجتماعي والعاطفي، وتعزيز المرونة والحصانة النفسية لدى الطفل.",
} as const;

/** Privacy helper shown beside free-text inputs. Not research content. */
export const FREE_TEXT_PRIVACY_HINT =
  "يرجى عدم ذكر أسماء الأطفال أو معلومات تكشف هويتهم.";

export const SURVEY_SECTIONS: readonly SurveySection[] = [
  {
    index: 1,
    title: "أولاً: معلومات عن الإطار التربوي",
    questions: [
      {
        id: 1,
        key: "q1",
        type: "single",
        text: "نوع الإطار التربوي:",
        options: [
          { label: "حضانة" },
          { label: "روضة أطفال" },
          { label: "بستان" },
          { label: "إطار آخر: __________", other: true },
        ],
      },
      {
        id: 2,
        key: "q2",
        type: "single",
        text: "الفئة العمرية للأطفال:",
        options: [
          { label: "3–4 سنوات" },
          { label: "4–5 سنوات" },
          { label: "5–6 سنوات" },
          { label: "أكثر من ذلك" },
        ],
      },
      {
        id: 3,
        key: "q3",
        type: "single",
        text: "عدد الأطفال في المجموعة:",
        options: [
          { label: "أقل من 15" },
          { label: "15–20" },
          { label: "21–25" },
          { label: "أكثر من 25" },
        ],
      },
      {
        id: 4,
        key: "q4",
        type: "single",
        text: "منذ كم سنة تعملين في مجال التربية والتعليم في الطفولة المبكرة؟",
        options: [
          { label: "أقل من 3 سنوات" },
          { label: "3–5 سنوات" },
          { label: "6–10 سنوات" },
          { label: "أكثر من 10 سنوات" },
        ],
      },
    ],
  },
  {
    index: 2,
    title: "ثانياً: ملاحظة احتياجات الأطفال",
    questions: [
      {
        id: 5,
        key: "q5",
        type: "multiple",
        text: "ما المجالات التي تلاحظين أن الأطفال بحاجة إلى دعم أكبر فيها؟",
        hint: "يمكن اختيار أكثر من إجابة:",
        options: [
          { label: "التعبير عن المشاعر" },
          { label: "التعرف على المشاعر وتسميتها" },
          { label: "تنظيم المشاعر والانفعالات" },
          { label: "التعامل مع الغضب" },
          { label: "التعامل مع الخوف والقلق" },
          { label: "تحمل الإحباط" },
          { label: "الثقة بالنفس" },
          { label: "الاستقلالية" },
          { label: "التواصل مع الآخرين" },
          { label: "تكوين علاقات اجتماعية" },
          { label: "المشاركة والتعاون" },
          { label: "حل النزاعات" },
          { label: "التعاطف" },
          { label: "التركيز والانتباه" },
          { label: "اللغة والتعبير" },
          { label: "المهارات الحركية" },
          { label: "حل المشكلات والتفكير" },
          { label: "أخرى: __________", other: true },
        ],
      },
      {
        id: 6,
        key: "q6",
        type: "text",
        text: "ما أبرز الصعوبات السلوكية أو العاطفية التي تواجهينها في المجموعة؟",
      },
      {
        id: 7,
        key: "q7",
        type: "single",
        text: "هل تلاحظين وجود أطفال يواجهون صعوبة في التعبير عن مشاعرهم أو احتياجاتهم؟",
        options: [
          { label: "بشكل كبير" },
          { label: "بدرجة متوسطة" },
          { label: "بدرجة قليلة" },
          { label: "لا ألاحظ ذلك" },
        ],
      },
    ],
  },
  {
    index: 3,
    title: "ثالثاً: المهارات الاجتماعية والعاطفية – SEL",
    questions: [
      {
        id: 8,
        key: "q8",
        type: "single",
        text: "إلى أي درجة ترين أن الأطفال بحاجة إلى تطوير المهارات الاجتماعية والعاطفية (SEL)؟",
        options: [
          { label: "حاجة كبيرة جداً" },
          { label: "حاجة كبيرة" },
          { label: "حاجة متوسطة" },
          { label: "حاجة قليلة" },
        ],
      },
      {
        id: 9,
        key: "q9",
        type: "multiple",
        text: "ما المهارات التي ترين أنها الأكثر أهمية للأطفال في هذه المرحلة؟",
        options: [
          { label: "التعرف على المشاعر" },
          { label: "التعبير عن المشاعر" },
          { label: "ضبط الانفعالات" },
          { label: "التعاطف" },
          { label: "التعاون" },
          { label: "المشاركة" },
          { label: "احترام الآخر" },
          { label: "حل المشكلات" },
          { label: "حل النزاعات" },
          { label: "الصبر وتأجيل الإشباع" },
          { label: "المرونة والقدرة على التكيف" },
          { label: "الثقة بالنفس" },
          { label: "الشعور بالأمان والانتماء" },
          { label: "أخرى: __________", other: true },
        ],
      },
      {
        id: 10,
        key: "q10",
        type: "multiple",
        text: "ما المواقف التي تثير عادةً صعوبة عاطفية أو اجتماعية لدى الأطفال؟",
        options: [
          { label: "الانتقال من نشاط إلى آخر" },
          { label: "مشاركة الألعاب" },
          { label: "الانتظار" },
          { label: "الخلاف مع طفل آخر" },
          { label: "الخسارة أو الفشل" },
          { label: "تغيير الروتين" },
          { label: "الانفصال عن الوالدين" },
          { label: "النشاط الجماعي" },
          { label: "وضع الحدود" },
          { label: "أخرى: __________", other: true },
        ],
      },
    ],
  },
  {
    index: 4,
    title: "رابعاً: اللعب والتعلم",
    questions: [
      {
        id: 11,
        key: "q11",
        type: "single",
        text: "إلى أي درجة تستخدمين اللعب كوسيلة للتعلم والتطور؟",
        options: [
          { label: "دائماً" },
          { label: "غالباً" },
          { label: "أحياناً" },
          { label: "نادراً" },
        ],
      },
      {
        id: 12,
        key: "q12",
        type: "multiple",
        text: "ما أنواع الأنشطة التي تجدينها أكثر فاعلية مع الأطفال؟",
        options: [
          { label: "الألعاب الجماعية" },
          { label: "الألعاب الفردية" },
          { label: "القصص" },
          { label: "الرسم والفنون" },
          { label: "الموسيقى والغناء" },
          { label: "الحركة والرياضة" },
          { label: "ألعاب حل المشكلات" },
          { label: "لعب الأدوار" },
          { label: "أنشطة التعرف على المشاعر" },
          { label: "أنشطة الاسترخاء والتنفس" },
          { label: "أنشطة حسية" },
          { label: "أخرى: __________", other: true },
        ],
      },
      {
        id: 13,
        key: "q13",
        type: "single",
        text: "ما المدة المثالية للنشاط الواحد بالنسبة للأطفال في مجموعتك؟",
        options: [
          { label: "5 دقائق" },
          { label: "10 دقائق" },
          { label: "15 دقيقة" },
          { label: "20 دقيقة" },
          { label: "أكثر من 20 دقيقة" },
        ],
      },
    ],
  },
  {
    index: 5,
    title: "خامساً: احتياجات المعلمة",
    questions: [
      {
        id: 14,
        key: "q14",
        type: "multiple",
        text: "ما الأدوات التي تحتاجين إليها أكثر لمساعدتك في التعامل مع الأطفال؟",
        options: [
          { label: "أنشطة جاهزة وسهلة التطبيق" },
          { label: "ألعاب لتنمية المهارات الاجتماعية" },
          { label: "أدوات للتعامل مع المشاعر" },
          { label: "قصص تربوية" },
          { label: "أدوات لتخفيف التوتر والقلق" },
          { label: "أدوات للتعامل مع السلوكيات الصعبة" },
          { label: "أنشطة لتعزيز الثقة بالنفس" },
          { label: "أدوات لمساعدة الأطفال على حل النزاعات" },
          { label: "مواد لإشراك الأهل" },
          { label: "إرشادات مهنية للمعلمة" },
          { label: "أخرى: __________", other: true },
        ],
      },
      {
        id: 15,
        key: "q15",
        type: "multiple",
        text: "ما أكثر ما يصعّب عليك تقديم الدعم العاطفي والاجتماعي للأطفال؟",
        options: [
          { label: "ضيق الوقت" },
          { label: "عدد الأطفال الكبير" },
          { label: "نقص الأدوات والمواد" },
          { label: "اختلاف احتياجات الأطفال" },
          { label: "نقص التدريب المهني" },
          { label: "صعوبة إشراك الأهل" },
          { label: "السلوكيات الصعبة" },
          { label: "ضغط العمل" },
          { label: "أخرى: __________", other: true },
        ],
      },
    ],
  },
  {
    index: 6,
    title: "سادساً: التعاون مع الأهل",
    questions: [
      {
        id: 16,
        key: "q16",
        type: "single",
        text: "إلى أي درجة ترين أن التعاون بين الروضة والأهل يؤثر على تطور الطفل؟",
        options: [
          { label: "بدرجة كبيرة جداً" },
          { label: "بدرجة كبيرة" },
          { label: "بدرجة متوسطة" },
          { label: "بدرجة قليلة" },
        ],
      },
      {
        id: 17,
        key: "q17",
        type: "multiple",
        text: "في أي مجالات تحتاجين إلى تعاون أكبر مع الأهل؟",
        options: [
          { label: "فهم احتياجات الطفل" },
          { label: "التعامل مع السلوك" },
          { label: "دعم المشاعر" },
          { label: "تعزيز الاستقلالية" },
          { label: "استخدام الشاشات" },
          { label: "تنظيم الروتين اليومي" },
          { label: "تعزيز التواصل بين الأهل والطفل" },
          { label: "تعزيز المهارات الاجتماعية" },
          { label: "أخرى: __________", other: true },
        ],
      },
      {
        id: 18,
        key: "q18",
        type: "single",
        text: "هل ترين أن وجود أنشطة يمكن تنفيذها في الروضة ثم استكمالها في المنزل سيكون مفيداً؟",
        options: [
          { label: "مفيد جداً" },
          { label: "مفيد" },
          { label: "ربما" },
          { label: "غير ضروري" },
        ],
      },
    ],
  },
  {
    index: 7,
    title: "سابعاً: فكرة البرنامج/التطبيق",
    questions: [
      {
        id: 19,
        key: "q19",
        type: "single",
        text: "لو توفر تطبيق يقدم أنشطة قصيرة ومهنية ومناسبة لعمر الأطفال، هل ترين أنه سيكون مفيداً في الروضة؟",
        options: [
          { label: "مفيد جداً" },
          { label: "مفيد" },
          { label: "ربما" },
          { label: "غير مفيد" },
        ],
      },
      {
        id: 20,
        key: "q20",
        type: "multiple",
        text: "ما الخصائص التي ترين أنها ضرورية في التطبيق؟",
        options: [
          { label: "محتوى مناسب للعمر" },
          { label: "أنشطة قصيرة وسهلة التطبيق" },
          { label: "محتوى باللغة العربية" },
          { label: "أنشطة فردية وجماعية" },
          { label: "أنشطة لتنمية المهارات الاجتماعية والعاطفية" },
          { label: "قصص تفاعلية" },
          { label: "ألعاب تعليمية" },
          { label: "أدوات تساعد المعلمة على متابعة تطور الطفل" },
          { label: "اقتراح أنشطة حسب احتياجات المجموعة" },
          { label: "إمكانية مشاركة الأنشطة مع الأهل" },
          { label: "إرشادات للمعلمة" },
          { label: "محتوى مبني على أسس تربوية ومهنية" },
          { label: "تقليل الاعتماد على الشاشة واستخدامها كوسيلة وليس كغاية" },
          { label: "أخرى: __________", other: true },
        ],
      },
    ],
  },
  {
    index: 8,
    title: "ثامناً: التخصيص حسب احتياجات الروضة",
    questions: [
      {
        id: 21,
        key: "q21",
        type: "single",
        text: "هل ترين أهمية أن يتم تحديد احتياجات كل مجموعة أطفال قبل اختيار الأنشطة المناسبة؟",
        options: [
          { label: "مهمة جداً" },
          { label: "مهمة" },
          { label: "متوسطة" },
          { label: "غير مهمة" },
        ],
      },
      {
        id: 22,
        key: "q22",
        type: "multiple",
        text: "ما المجالات التي تفضلين أن يتم تقييمها في بداية العام أو قبل استخدام البرنامج؟",
        options: [
          { label: "المهارات الاجتماعية" },
          { label: "المهارات العاطفية" },
          { label: "التواصل" },
          { label: "الاستقلالية" },
          { label: "الثقة بالنفس" },
          { label: "القدرة على التركيز" },
          { label: "التعامل مع الإحباط" },
          { label: "التعاون والمشاركة" },
          { label: "الشعور بالأمان والانتماء" },
          { label: "أخرى: __________", other: true },
        ],
      },
    ],
  },
  {
    index: 9,
    title: "تاسعاً: قياس التطور والأثر",
    questions: [
      {
        id: 23,
        key: "q23",
        type: "multiple",
        text: "كيف تتابعين عادةً التطور العاطفي والاجتماعي للأطفال؟",
        options: [
          { label: "ملاحظات يومية" },
          { label: "محادثات مع الطفل" },
          { label: "لقاءات مع الأهل" },
          { label: "أدوات تقييم منظمة" },
          { label: "لا توجد أداة ثابتة" },
          { label: "أخرى: __________", other: true },
        ],
      },
      {
        id: 24,
        key: "q24",
        type: "single",
        text: "هل ترين أن من المهم أن يوفر البرنامج أداة تساعد المعلمة على متابعة تطور الطفل؟",
        options: [
          { label: "مهم جداً" },
          { label: "مهم" },
          { label: "ربما" },
          { label: "غير مهم" },
        ],
      },
    ],
  },
  {
    index: 10,
    title: "عاشراً: سؤال مفتوح",
    questions: [
      {
        id: 25,
        key: "q25",
        type: "text",
        text: "ما الاحتياج الأساسي الذي تتمنين أن يساعدك البرنامج في تلبيته داخل الروضة؟",
      },
      {
        id: 26,
        key: "q26",
        type: "text",
        text: "إذا كان بإمكانك إضافة ميزة واحدة فقط إلى التطبيق، فما هي؟",
      },
      {
        id: 27,
        key: "q27",
        type: "text",
        text: "ما النصيحة التي تقدمينها لنا قبل تطوير البرنامج؟",
      },
    ],
  },
];

export const ALL_QUESTIONS: readonly SurveyQuestion[] = SURVEY_SECTIONS.flatMap(
  (section) => section.questions,
);

export const QUESTIONS_BY_KEY: ReadonlyMap<string, SurveyQuestion> = new Map(
  ALL_QUESTIONS.map((question) => [question.key, question]),
);

/** Q1-Q4 back the admin filters, so they are named rather than positional. */
export const FILTER_QUESTION_KEYS = ["q1", "q2", "q3", "q4"] as const;
export type FilterQuestionKey = (typeof FILTER_QUESTION_KEYS)[number];
