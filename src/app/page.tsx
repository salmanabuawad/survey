import { SurveyWizard } from "@/components/survey/survey-wizard";
import { getQuestionnaire, seedFromLockedSource } from "@/lib/questions";

// Questions live in the database so an admin can edit them. The first request
// on an empty database seeds version 1 from the locked original; the seed is a
// no-op forever after, so it can never overwrite an admin's edits.
export const dynamic = "force-dynamic";

export default async function Page() {
  await seedFromLockedSource();
  const questionnaire = await getQuestionnaire();
  return <SurveyWizard questionnaire={questionnaire} />;
}
