import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getMessages } from "@/lib/i18n/messages";
import { getQuestionnaire } from "@/lib/questions";
import { normaliseSubmission, submissionSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Accepts one completed questionnaire.
 *
 * Nothing identifying is read off the request: no IP address, no user agent, no
 * headers of any kind are persisted. The response id is a server-side UUID.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const messages = getMessages(parsed.data.locale);

  // Validate against the questionnaire as it stands right now, in the language
  // this tab is showing — an admin may have edited it since the page loaded.
  const { questions } = await getQuestionnaire(parsed.data.locale);
  if (questions.length === 0) {
    return NextResponse.json({ message: messages.wizard.unavailable }, { status: 503 });
  }

  const normalised = normaliseSubmission(parsed.data, questions);
  if (!normalised.ok) {
    // The one failure a respondent can actually act on is a questionnaire that
    // changed under her; everything else means a hand-rolled request.
    const stale = normalised.errors.includes("STALE_QUESTIONNAIRE");
    return NextResponse.json(
      { message: stale ? messages.wizard.staleQuestionnaire : messages.wizard.submitFailed },
      { status: 400 },
    );
  }

  // The four profile questions back the dashboard filters. They are matched by
  // lineage key, so they keep working across edits and survive reordering.
  // Stored as option ids so the filters group Hebrew and Arabic answers together.
  const pick = (key: string): string | null =>
    normalised.answers.find((answer) => answer.questionKey === key)
      ?.selectedOptionIds[0] ?? null;

  const completionSeconds = parsed.data.completionSeconds ?? null;

  try {
    // One transaction: a response row without its answers would look like a
    // completed submission with every value missing.
    const response = await prisma.$transaction(async (tx) => {
      const created = await tx.surveyResponse.create({
        data: {
          surveyVersion: parsed.data.surveyVersion,
          locale: parsed.data.locale,
          completionSeconds:
            completionSeconds !== null && completionSeconds > 0
              ? completionSeconds
              : null,
          frameworkType: pick("q1"),
          ageGroup: pick("q2"),
          groupSize: pick("q3"),
          experience: pick("q4"),
        },
      });

      await tx.surveyAnswer.createMany({
        data: normalised.answers.map((answer) => ({
          responseId: created.id,
          questionId: answer.questionId,
          questionKey: answer.questionKey,
          questionNumber: answer.questionNumber,
          // Snapshot: a later edit forks a new version, so this stays true to
          // what this respondent actually read.
          questionText: answer.questionText,
          questionType: answer.questionType,
          selectedOptionIds: answer.selectedOptionIds,
          selectedOptions: answer.selectedOptions,
          textValue: answer.textValue,
          otherText: answer.otherText,
        })),
      });

      return created;
    });

    return NextResponse.json({ id: response.id }, { status: 201 });
  } catch (error) {
    console.error("survey submission failed", error);
    return NextResponse.json(
      { message: messages.wizard.submitFailed },
      { status: 500 },
    );
  }
}
