/**
 * Reports how far the live questionnaire has drifted from Inas's original.
 *
 *     npx tsx scripts/diff-live.ts
 *
 * Questions are editable by admins, so drift is expected rather than an error;
 * this exits 0 either way. It exists so anyone can answer "is what teachers see
 * still what Inas wrote?" without reading the database by hand.
 *
 * `verify-content.ts` is the strict one: it guards the locked source itself,
 * which is what gets seeded and what "restore original" would restore to.
 */

import { prisma } from "../src/lib/db.js";
import { getQuestionnaire } from "../src/lib/questions.js";
import { ALL_QUESTIONS, SURVEY_SECTIONS } from "../src/lib/survey-content.js";

function optionLabels(options: ReadonlyArray<{ label: string }>): string {
  return options.map((option) => option.label).join(" ┃ ");
}

async function main() {
  const { sections, questions } = await getQuestionnaire();
  const differences: string[] = [];

  if (questions.length !== ALL_QUESTIONS.length) {
    differences.push(
      `عدد الأسئلة: live ${questions.length} vs original ${ALL_QUESTIONS.length}`,
    );
  }

  if (sections.length !== SURVEY_SECTIONS.length) {
    differences.push(
      `sections: live ${sections.length} vs original ${SURVEY_SECTIONS.length}`,
    );
  }

  // Compare by lineage key, which survives reordering and rewording.
  const originals = new Map(ALL_QUESTIONS.map((question) => [question.key, question]));
  const seen = new Set<string>();

  for (const live of questions) {
    seen.add(live.lineageKey);
    const original = originals.get(live.lineageKey);

    if (!original) {
      differences.push(`+ ${live.lineageKey} (Q${live.number}) added: "${live.text}"`);
      continue;
    }

    if (live.version > 1) {
      differences.push(`~ ${live.lineageKey} is at version ${live.version}`);
    }
    if (live.text !== original.text) {
      differences.push(
        `~ ${live.lineageKey} text\n    original: ${original.text}\n    live:     ${live.text}`,
      );
    }
    if (live.type !== original.type) {
      differences.push(
        `~ ${live.lineageKey} type: ${original.type} -> ${live.type}`,
      );
    }
    if ((live.hint ?? null) !== (original.hint ?? null)) {
      differences.push(
        `~ ${live.lineageKey} hint: ${original.hint ?? "—"} -> ${live.hint ?? "—"}`,
      );
    }
    const originalOptions = optionLabels(original.options ?? []);
    const liveOptions = optionLabels(live.options);
    if (originalOptions !== liveOptions) {
      differences.push(
        `~ ${live.lineageKey} options\n    original: ${originalOptions}\n    live:     ${liveOptions}`,
      );
    }
    if (live.number !== original.id) {
      differences.push(
        `~ ${live.lineageKey} moved: was Q${original.id}, now Q${live.number}`,
      );
    }
  }

  for (const key of originals.keys()) {
    if (!seen.has(key)) {
      differences.push(`- ${key} is no longer live (deleted)`);
    }
  }

  if (differences.length === 0) {
    console.log(
      `Live questionnaire is identical to the locked original — ${sections.length} sections, ${questions.length} questions, all at version 1.`,
    );
    return;
  }

  console.log(`Live questionnaire differs from the original in ${differences.length} place(s):\n`);
  for (const difference of differences) console.log(`  ${difference}`);
  console.log(
    "\nThis is informational — admins are allowed to edit. Every archived version still holds its own answers.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
