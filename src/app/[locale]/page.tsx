import { notFound } from "next/navigation";

import { SurveyWizard } from "@/components/survey/survey-wizard";
import { isLocale } from "@/lib/i18n/config";
import { getSurveyCopy } from "@/lib/i18n/survey-copy";
import { getAvailableLocales, getQuestionnaire, seedFromLockedSource } from "@/lib/questions";

// Questions live in the database so an admin can edit them. The first request
// on an empty database seeds version 1 from the locked original; the seed is a
// no-op forever after, so it can never overwrite an admin's edits.
export const dynamic = "force-dynamic";

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  await seedFromLockedSource();

  const [questionnaire, available] = await Promise.all([
    getQuestionnaire(locale),
    getAvailableLocales(),
  ]);

  return (
    <SurveyWizard
      questionnaire={questionnaire}
      copy={getSurveyCopy(locale)}
      availableLocales={available}
    />
  );
}
