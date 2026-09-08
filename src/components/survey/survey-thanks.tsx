import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { SurveyCopy } from "@/lib/i18n/survey-copy";

export function SurveyThanks({
  locale,
  copy,
}: {
  locale: Locale;
  copy: SurveyCopy;
}) {
  const messages = getMessages(locale);
  const thanks = copy.thanks;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center px-4 py-12 sm:px-6">
      <Card className="animate-rise w-full overflow-hidden">
        <div className="flex justify-center bg-gradient-to-bl from-teal-100 via-cream-50 to-violet-100 pt-10">
          <svg
            viewBox="0 0 96 96"
            role="presentation"
            aria-hidden="true"
            className="h-24 w-24"
          >
            <circle cx="48" cy="48" r="40" fill="var(--color-teal-100)" />
            <circle cx="48" cy="48" r="28" fill="var(--color-teal-500)" />
            <path
              d="M36 49 L45 58 L61 40"
              fill="none"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <CardContent className="space-y-5 pt-7 text-center">
          <h1 className="text-2xl font-bold text-ink-800 sm:text-3xl">
            {thanks.heading}
          </h1>

          <p className="text-lg font-medium text-teal-700">{thanks.lead}</p>

          <p className="wrap-anywhere text-base leading-loose text-ink-600">
            {thanks.bodyBefore}
            <strong className="font-bold text-ink-800">
              {thanks.bodyEmphasis}
            </strong>
          </p>

          <p className="pt-2 text-sm text-ink-400">{messages.thanks.closeNote}</p>
        </CardContent>
      </Card>
    </main>
  );
}
