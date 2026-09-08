import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
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
    return NextResponse.json({ message: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "تعذر التحقق من الإجابات", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Validate against the questionnaire as it stands right now, not against a
  // copy in code — an admin may have edited it since this tab loaded.
  const { questions } = await getQuestionnaire();
  if (questions.length === 0) {
    return NextResponse.json({ message: "الاستبيان غير متاح حالياً" }, { status: 503 });
  }

  const normalised = normaliseSubmission(parsed.data, questions);
  if (!normalised.ok) {
    return NextResponse.json(
      { message: normalised.errors[0] ?? "تعذر التحقق من الإجابات" },
      { status: 400 },
    );
  }

  // The four profile questions back the dashboard filters. They are matched by
  // lineage key, so they keep working across edits and survive reordering.
  const pick = (key: string): string | null =>
    normalised.answers.find((answer) => answer.questionKey === key)
      ?.selectedOptions[0] ?? null;

  const completionSeconds = parsed.data.completionSeconds ?? null;

  try {
    // One transaction: a response row without its answers would look like a
    // completed submission with every value missing.
    const response = await prisma.$transaction(async (tx) => {
      const created = await tx.surveyResponse.create({
        data: {
          surveyVersion: parsed.data.surveyVersion,
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
      { message: "تعذر حفظ الاستبيان، يرجى المحاولة مرة أخرى" },
      { status: 500 },
    );
  }
}
