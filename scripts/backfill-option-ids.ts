/**
 * One-time backfill for the multilingual schema.
 *
 *     npx tsx scripts/backfill-option-ids.ts
 *
 * Before multi-language support, an answer identified its choice by the option's
 * Arabic label. That cannot survive translation — a Hebrew answer would store a
 * Hebrew string and count as a different option — so options gained stable ids
 * and answers now reference those.
 *
 * This gives every existing option an id and rewrites existing answers to point
 * at them. Idempotent: rows that already carry ids are left alone.
 */

import { prisma } from "../src/lib/db.js";
import { optionId } from "../src/lib/i18n/config.js";

interface StoredOption {
  id?: string;
  label: string;
  other?: boolean;
}

async function main() {
  const questions = await prisma.question.findMany({
    select: { id: true, lineageKey: true, options: true },
  });

  let questionsUpdated = 0;

  for (const question of questions) {
    const options = (
      Array.isArray(question.options) ? question.options : []
    ) as unknown as StoredOption[];
    if (options.length === 0) continue;
    if (options.every((option) => typeof option.id === "string" && option.id)) continue;

    const withIds = options.map((option, index) => ({
      id: option.id ?? optionId(question.lineageKey, index),
      label: option.label,
      ...(option.other ? { other: true as const } : {}),
    }));

    await prisma.question.update({
      where: { id: question.id },
      data: { options: withIds },
    });
    questionsUpdated += 1;
  }

  console.log(`options: ${questionsUpdated} question row(s) given ids`);

  // --- answers --------------------------------------------------------------
  const reloaded = new Map(
    (
      await prisma.question.findMany({ select: { id: true, options: true } })
    ).map((question) => [
      question.id,
      (Array.isArray(question.options)
        ? question.options
        : []) as unknown as StoredOption[],
    ]),
  );

  const answers = await prisma.surveyAnswer.findMany({
    select: {
      id: true,
      questionId: true,
      selectedOptions: true,
      selectedOptionIds: true,
      questionNumber: true,
    },
  });

  let answersUpdated = 0;
  const unmatched: string[] = [];

  for (const answer of answers) {
    if (answer.selectedOptions.length === 0) continue;
    if (answer.selectedOptionIds.length === answer.selectedOptions.length) continue;

    const options = reloaded.get(answer.questionId) ?? [];
    const ids = answer.selectedOptions.map((label) => {
      const match = options.find((option) => option.label === label);
      if (!match?.id) {
        unmatched.push(`Q${answer.questionNumber}: ${JSON.stringify(label)}`);
        return null;
      }
      return match.id;
    });

    if (ids.some((id) => id === null)) continue;

    await prisma.surveyAnswer.update({
      where: { id: answer.id },
      data: { selectedOptionIds: ids as string[] },
    });
    answersUpdated += 1;
  }

  console.log(`answers: ${answersUpdated} row(s) mapped onto option ids`);

  // --- denormalised filter columns -----------------------------------------
  // survey_response copies the q1-q4 answers so the dashboard can filter
  // without joining. Those held labels too, and must become ids for Hebrew and
  // Arabic answers to land in the same bucket.
  const responses = await prisma.surveyResponse.findMany({
    select: {
      id: true,
      frameworkType: true,
      ageGroup: true,
      groupSize: true,
      experience: true,
      answers: {
        select: { questionKey: true, selectedOptionIds: true, selectedOptions: true },
      },
    },
  });

  let filtersUpdated = 0;

  for (const response of responses) {
    const toId = (key: string, stored: string | null): string | null => {
      if (!stored) return null;
      const answer = response.answers.find((entry) => entry.questionKey === key);
      if (!answer) return stored;
      // Already an id.
      if (answer.selectedOptionIds.includes(stored)) return stored;
      const index = answer.selectedOptions.indexOf(stored);
      return index >= 0 ? (answer.selectedOptionIds[index] ?? stored) : stored;
    };

    const next = {
      frameworkType: toId("q1", response.frameworkType),
      ageGroup: toId("q2", response.ageGroup),
      groupSize: toId("q3", response.groupSize),
      experience: toId("q4", response.experience),
    };

    const changed =
      next.frameworkType !== response.frameworkType ||
      next.ageGroup !== response.ageGroup ||
      next.groupSize !== response.groupSize ||
      next.experience !== response.experience;

    if (!changed) continue;

    await prisma.surveyResponse.update({ where: { id: response.id }, data: next });
    filtersUpdated += 1;
  }

  console.log(`responses: ${filtersUpdated} row(s) had filter columns converted to ids`);

  if (unmatched.length > 0) {
    console.warn(
      `\n${unmatched.length} stored label(s) matched no option and were left alone:`,
    );
    for (const entry of unmatched) console.warn(`  • ${entry}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
