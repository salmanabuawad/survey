import { redirect } from "next/navigation";

import { QuestionsManager } from "@/components/admin/questions-manager";
import { isAuthenticated } from "@/lib/auth";
import { getAllQuestionVersions, getSections, seedFromLockedSource } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  if (!(await isAuthenticated())) redirect("/admin");

  await seedFromLockedSource();
  const [questions, sections] = await Promise.all([
    getAllQuestionVersions(),
    getSections(),
  ]);

  return <QuestionsManager initialQuestions={questions} sections={sections} />;
}
