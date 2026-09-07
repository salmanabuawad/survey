/**
 * Restores responses exported from the pre-versioning schema.
 *
 *     npx tsx scripts/restore-responses.ts <export.json>
 *
 * The old `survey_answer` rows referenced a question only by its key ("q1"…),
 * because questions lived in code. This maps each of them onto the seeded
 * version 1 of the matching lineage, which is exactly the wording those
 * respondents saw.
 *
 * Safe to re-run: responses whose id is already present are skipped.
 */

import { readFileSync } from "node:fs";

import { prisma } from "../src/lib/db.js";

interface ExportedResponse {
  id: string;
  survey_version: string;
  submitted_at: string;
  completion_seconds: number | null;
  framework_type: string | null;
  age_group: string | null;
  group_size: string | null;
  experience: string | null;
}

interface ExportedAnswer {
  id: string;
  response_id: string;
  question_key: string;
  question_number: number;
  question_text: string;
  question_type: string;
  selected_options: string[];
  text_value: string | null;
  other_text: string | null;
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: tsx scripts/restore-responses.ts <export.json>");
    process.exit(1);
  }

  const payload = JSON.parse(readFileSync(path, "utf8")) as {
    responses: ExportedResponse[];
    answers: ExportedAnswer[];
  };

  // Map "q1" -> the version 1 row of that lineage.
  const questions = await prisma.question.findMany({
    where: { version: 1 },
    select: { id: true, lineageKey: true },
  });
  const idByKey = new Map(questions.map((q) => [q.lineageKey, q.id]));

  const answersByResponse = new Map<string, ExportedAnswer[]>();
  for (const answer of payload.answers) {
    const bucket = answersByResponse.get(answer.response_id);
    if (bucket) bucket.push(answer);
    else answersByResponse.set(answer.response_id, [answer]);
  }

  let restored = 0;
  let skipped = 0;
  const unmatched = new Set<string>();

  for (const response of payload.responses) {
    const existing = await prisma.surveyResponse.findUnique({
      where: { id: response.id },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const answers = (answersByResponse.get(response.id) ?? []).flatMap((answer) => {
      const questionId = idByKey.get(answer.question_key);
      if (!questionId) {
        // A question that no longer exists in the seed; recorded and skipped
        // rather than silently dropped.
        unmatched.add(answer.question_key);
        return [];
      }
      return [
        {
          id: answer.id,
          questionId,
          questionKey: answer.question_key,
          questionNumber: answer.question_number,
          questionText: answer.question_text,
          questionType: answer.question_type,
          selectedOptions: answer.selected_options ?? [],
          textValue: answer.text_value,
          otherText: answer.other_text,
        },
      ];
    });

    await prisma.$transaction(async (tx) => {
      await tx.surveyResponse.create({
        data: {
          id: response.id,
          surveyVersion: response.survey_version,
          submittedAt: new Date(response.submitted_at),
          completionSeconds: response.completion_seconds,
          frameworkType: response.framework_type,
          ageGroup: response.age_group,
          groupSize: response.group_size,
          experience: response.experience,
        },
      });
      await tx.surveyAnswer.createMany({
        data: answers.map((answer) => ({ ...answer, responseId: response.id })),
      });
    });

    restored += 1;
    console.log(`restored ${response.id} (${answers.length} answers)`);
  }

  console.log(`\nrestored ${restored}, skipped ${skipped} (already present)`);
  if (unmatched.size > 0) {
    console.warn(`unmatched question keys: ${[...unmatched].join(", ")}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
