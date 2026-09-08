"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SURVEY_INTRO } from "@/lib/survey-content";

/** Abstract motif: overlapping soft shapes, no clip-art and nothing childish. */
function Motif() {
  return (
    <svg
      viewBox="0 0 320 120"
      role="presentation"
      aria-hidden="true"
      className="h-24 w-full"
    >
      <defs>
        <linearGradient id="motif-teal" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-teal-300)" />
          <stop offset="100%" stopColor="var(--color-teal-500)" />
        </linearGradient>
        <linearGradient id="motif-violet" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-violet-300)" />
          <stop offset="100%" stopColor="var(--color-violet-500)" />
        </linearGradient>
      </defs>
      <circle cx="228" cy="58" r="42" fill="url(#motif-teal)" opacity="0.85" />
      <circle cx="170" cy="58" r="30" fill="url(#motif-violet)" opacity="0.7" />
      <circle cx="118" cy="70" r="20" fill="var(--color-coral-300)" opacity="0.85" />
      <path
        d="M70 88 C90 46 130 34 168 44"
        fill="none"
        stroke="var(--color-teal-600)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="70" cy="88" r="6" fill="var(--color-teal-600)" opacity="0.6" />
    </svg>
  );
}

export function SurveyIntro({
  onStart,
  resumable,
  totalQuestions,
}: {
  onStart: () => void;
  resumable: boolean;
  totalQuestions: number;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <Card className="animate-rise overflow-hidden">
        <div className="bg-gradient-to-bl from-teal-100 via-cream-50 to-violet-100 px-5 pt-8 sm:px-8">
          <Motif />
        </div>

        <CardContent className="space-y-6 pt-7">
          <header className="space-y-3">
            <h1 className="wrap-anywhere text-2xl font-bold leading-snug text-ink-800 sm:text-3xl">
              {SURVEY_INTRO.title}
            </h1>
            <p className="wrap-anywhere text-base font-medium text-teal-700 sm:text-lg">
              {SURVEY_INTRO.subtitle}
            </p>
          </header>

          <div className="space-y-4 text-base leading-loose text-ink-600">
            <p className="font-semibold text-ink-800">{SURVEY_INTRO.salutation}</p>
            {SURVEY_INTRO.paragraphs.map((paragraph) => (
              <p key={paragraph} className="wrap-anywhere">
                {paragraph}
              </p>
            ))}
          </div>

          <p className="wrap-anywhere rounded-xl2 border border-teal-200 bg-teal-50 p-4 text-sm font-bold text-teal-800 sm:text-base">
            {SURVEY_INTRO.notice}
          </p>

          <dl className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl2 border border-teal-100 bg-gradient-to-bl from-teal-50 to-teal-100/70 p-4">
              <dt className="text-sm font-medium text-teal-700">عدد الأسئلة</dt>
              <dd className="text-xl font-bold text-teal-900 tabular-nums">
                {totalQuestions}
              </dd>
            </div>
            <div className="rounded-xl2 border border-violet-100 bg-gradient-to-bl from-violet-50 to-violet-100/70 p-4">
              <dt className="text-sm font-medium text-violet-700">الوقت التقريبي</dt>
              <dd className="text-xl font-bold text-violet-900">10 دقائق</dd>
            </div>
          </dl>

          <Button size="lg" onClick={onStart} className="w-full">
            {resumable ? "متابعة الاستبيان" : "ابدأ الاستبيان"}
          </Button>

          <p className="text-center text-sm text-ink-400">
            تُحفظ إجاباتك تلقائياً على هذا الجهاز حتى تنهي الاستبيان.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
