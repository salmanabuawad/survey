/**
 * Content lock check.
 *
 * Parses `content/SURVEY_SOURCE_AR.md` — the questionnaire as Inas approved it —
 * and diffs it against `src/lib/survey-content.ts`, which is what the app
 * actually renders and stores. Any drift in wording, ordering, option labels,
 * section names, the introduction or the thank-you text fails the run.
 *
 * `npm run verify:content`, and the deploy script runs it before building.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  ALL_QUESTIONS,
  SURVEY_INTRO,
  SURVEY_SECTIONS,
  SURVEY_THANKS,
} from "../src/lib/survey-content.js";

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(here, "..", "content", "SURVEY_SOURCE_AR.md");

const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    failures.push(
      `${label}\n    source: ${JSON.stringify(expected)}\n    app:    ${JSON.stringify(actual)}`,
    );
  }
}

/** Markdown emphasis and list bullets are layout, not wording. */
function clean(line: string): string {
  return line
    .replace(/\*\*/g, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^#+\s+/, "")
    .trim();
}

const raw = readFileSync(sourcePath, "utf8");
const lines = raw.split(/\r?\n/);

// --- parse the source ------------------------------------------------------

interface ParsedQuestion {
  id: number;
  text: string;
  hint?: string;
  options: string[];
  freeText: boolean;
}

interface ParsedSection {
  title: string;
  questions: ParsedQuestion[];
}

const sections: ParsedSection[] = [];
let current: ParsedSection | null = null;
let question: ParsedQuestion | null = null;

const sectionHeading = /^#{1,2}\s+(أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً|تاسعاً|عاشراً):\s*(.+)$/;
const questionHeading = /^\*\*(\d+)\.\s*(.+?)\*\*$/;
/** Everything past the thank-you heading is closing prose, not questionnaire. */
const closingHeading = /^#{1,3}\s+شكراً/;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "---") continue;

  if (closingHeading.test(trimmed)) break;

  const sectionMatch = trimmed.match(sectionHeading);
  if (sectionMatch) {
    current = { title: clean(trimmed), questions: [] };
    sections.push(current);
    question = null;
    continue;
  }

  const questionMatch = trimmed.match(questionHeading);
  if (questionMatch && current) {
    question = {
      id: Number(questionMatch[1]),
      text: questionMatch[2].trim(),
      options: [],
      freeText: false,
    };
    current.questions.push(question);
    continue;
  }

  if (!question) continue;

  if (trimmed.startsWith("- ")) {
    question.options.push(clean(trimmed));
  } else if (trimmed === "Free-text answer.") {
    question.freeText = true;
  } else if (question.options.length === 0 && !trimmed.startsWith("#")) {
    // An instruction line sitting between the question and its options.
    question.hint = clean(trimmed);
  }
}

// --- compare ---------------------------------------------------------------

const parsedQuestions = sections.flatMap((section) => section.questions);

check("question count", ALL_QUESTIONS.length, 27);
check("question count matches source", ALL_QUESTIONS.length, parsedQuestions.length);
check("section count", SURVEY_SECTIONS.length, sections.length);

sections.forEach((parsedSection, index) => {
  const appSection = SURVEY_SECTIONS[index];
  if (!appSection) {
    failures.push(`section ${index + 1} missing from the app`);
    return;
  }
  check(`section ${index + 1} title`, appSection.title, parsedSection.title);
});

parsedQuestions.forEach((parsed, index) => {
  const app = ALL_QUESTIONS[index];
  if (!app) {
    failures.push(`Q${parsed.id} missing from the app`);
    return;
  }

  check(`Q${parsed.id} number`, app.id, parsed.id);
  check(`Q${parsed.id} key`, app.key, `q${parsed.id}`);
  check(`Q${parsed.id} text`, app.text, parsed.text);

  if (parsed.hint) {
    check(`Q${parsed.id} hint`, app.hint, parsed.hint);
  }

  if (parsed.freeText) {
    check(`Q${parsed.id} type`, app.type, "text");
    if (app.options) failures.push(`Q${parsed.id} is free-text but carries options`);
    return;
  }

  const appOptions = (app.options ?? []).map((option) => option.label);
  check(`Q${parsed.id} option count`, appOptions.length, parsed.options.length);
  parsed.options.forEach((label, optionIndex) => {
    check(`Q${parsed.id} option ${optionIndex + 1}`, appOptions[optionIndex], label);
  });

  // Every "…: __________" option must reveal a text input.
  (app.options ?? []).forEach((option) => {
    const looksLikeOther = option.label.includes("__________");
    if (looksLikeOther !== Boolean(option.other)) {
      failures.push(
        `Q${parsed.id} option ${JSON.stringify(option.label)} is${looksLikeOther ? "" : " not"} an "other" label but is flagged ${JSON.stringify(option.other ?? false)}`,
      );
    }
  });
});

// Numbering must be a dense 1..27 with no gaps and no Q28.
ALL_QUESTIONS.forEach((app, index) => {
  check(`question ${index + 1} is numbered ${index + 1}`, app.id, index + 1);
});

// --- fixed prose -----------------------------------------------------------

const sourceText = raw.replace(/\*\*/g, "");
const mustAppear: Array<[string, string]> = [
  ["intro title", SURVEY_INTRO.title],
  ["intro subtitle", SURVEY_INTRO.subtitle],
  ["intro salutation", SURVEY_INTRO.salutation],
  ["intro paragraph 1", SURVEY_INTRO.paragraphs[0]],
  ["intro paragraph 2", SURVEY_INTRO.paragraphs[1]],
  ["intro notice", SURVEY_INTRO.notice],
  ["thanks heading", SURVEY_THANKS.heading],
  ["thanks lead", SURVEY_THANKS.lead],
  ["thanks body", SURVEY_THANKS.bodyBefore + SURVEY_THANKS.bodyEmphasis],
];

for (const [label, value] of mustAppear) {
  if (!sourceText.includes(value)) {
    failures.push(`${label} does not appear verbatim in the locked source:\n    ${JSON.stringify(value)}`);
  }
}

// --- report ----------------------------------------------------------------

if (failures.length > 0) {
  console.error(`\nContent lock FAILED — ${failures.length} difference(s):\n`);
  for (const failure of failures) console.error(`  • ${failure}`);
  console.error("");
  process.exit(1);
}

console.log(
  `Content lock OK — ${SURVEY_SECTIONS.length} sections, ${ALL_QUESTIONS.length} questions, verbatim against content/SURVEY_SOURCE_AR.md`,
);
