/**
 * Imports a translated questionnaire and checks it against the locked Arabic.
 *
 *     npx tsx scripts/import-translation.ts he content/SURVEY_HE.md
 *
 * The translation must mirror the source structurally: the same ten sections in
 * the same order, the same twenty-seven questions, the same number of options in
 * the same order, and free-text questions in the same positions. That is what
 * makes it safe to map option 3 of Q5 in Hebrew onto option 3 of Q5 in Arabic —
 * answers are stored against option *ids*, so a mismatch here would silently
 * mis-attribute responses.
 *
 * Writes `content/translations/<locale>.json`. It refuses to write anything if
 * the structure does not line up, and prints every discrepancy.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isLocale, optionId, SOURCE_LOCALE } from "../src/lib/i18n/config.js";
import { ALL_QUESTIONS, SURVEY_SECTIONS } from "../src/lib/survey-content.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

interface ParsedQuestion {
  number: number;
  text: string;
  hint?: string;
  options: string[];
  freeText: boolean;
}

interface ParsedSection {
  title: string;
  questions: ParsedQuestion[];
}

/** Markers that a question takes a written answer, in any of our languages. */
const FREE_TEXT_MARKERS = ["Free-text answer.", "تشوبه", "תשובה פתוחה."];

function stripMarkdown(line: string): string {
  return line
    .replace(/\*\*/g, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^#+\s+/, "")
    .trim();
}

function parse(markdown: string) {
  const lines = markdown.split(/\r?\n/);

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  let question: ParsedQuestion | null = null;

  // Everything before the first horizontal rule is the introduction.
  const firstRule = lines.findIndex((line) => line.trim() === "---");
  const head = lines.slice(0, firstRule === -1 ? 0 : firstRule);
  const body = lines.slice(firstRule === -1 ? 0 : firstRule + 1);

  const questionHeading = /^\*\*(\d+)\.\s*(.+?)\*\*$/;

  for (const raw of body) {
    const line = raw.trim();
    if (!line || line === "---") continue;

    if (line.startsWith("#")) {
      current = { title: stripMarkdown(line), questions: [] };
      sections.push(current);
      question = null;
      continue;
    }

    const match = line.match(questionHeading);
    if (match && current) {
      question = {
        number: Number(match[1]),
        text: match[2].trim(),
        options: [],
        freeText: false,
      };
      current.questions.push(question);
      continue;
    }

    if (!question) continue;

    if (line.startsWith("- ")) {
      question.options.push(stripMarkdown(line));
    } else if (FREE_TEXT_MARKERS.some((marker) => line === marker)) {
      question.freeText = true;
    } else if (question.options.length === 0) {
      question.hint = stripMarkdown(line);
    }
  }

  // The closing "thank you" heading carries no questions; it is not a section.
  const closing = sections.filter((section) => section.questions.length === 0);
  const questionSections = sections.filter((section) => section.questions.length > 0);

  // --- introduction ---------------------------------------------------------
  const headings = head.filter((line) => line.trim().startsWith("#"));
  const title = headings[0] ? stripMarkdown(headings[0]) : "";
  const subtitle = headings[1] ? stripMarkdown(headings[1]) : "";

  const prose = head
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const bold = prose.filter((line) => /^\*\*.*\*\*$/.test(line));
  const salutation = bold[0] ? stripMarkdown(bold[0]) : "";
  const notice = bold.length > 1 ? stripMarkdown(bold[bold.length - 1]) : "";
  const paragraphs = prose
    .filter((line) => !/^\*\*.*\*\*$/.test(line))
    .map(stripMarkdown);

  // --- closing --------------------------------------------------------------
  const closingIndex = lines.findIndex(
    (line) => closing[0] && stripMarkdown(line) === closing[0].title && line.trim().startsWith("#"),
  );
  const tail = closingIndex === -1 ? [] : lines.slice(closingIndex + 1);
  const tailProse = tail.map((line) => line.trim()).filter((line) => line && line !== "---");

  const lead = tailProse[0] ? stripMarkdown(tailProse[0]) : "";
  const bodyLine = tailProse[1] ?? "";
  const emphasisMatch = bodyLine.match(/^(.*?)\*\*(.+?)\*\*\s*$/);

  return {
    intro: { title, subtitle, salutation, paragraphs, notice },
    thanks: {
      heading: closing[0] ? closing[0].title : "",
      lead,
      bodyBefore: emphasisMatch ? emphasisMatch[1] : bodyLine,
      bodyEmphasis: emphasisMatch ? emphasisMatch[2] : "",
    },
    sections: questionSections,
  };
}

// --- main --------------------------------------------------------------------

const [localeArg, fileArg] = process.argv.slice(2);

if (!localeArg || !fileArg) {
  console.error("usage: tsx scripts/import-translation.ts <locale> <markdown file>");
  process.exit(1);
}

if (!isLocale(localeArg)) {
  console.error(`unknown locale: ${localeArg}`);
  process.exit(1);
}

if (localeArg === SOURCE_LOCALE) {
  console.error(
    `${SOURCE_LOCALE} is the source language, not a translation — it lives in src/lib/survey-content.ts`,
  );
  process.exit(1);
}

const parsed = parse(readFileSync(resolve(repo, fileArg), "utf8"));
const problems: string[] = [];

if (parsed.sections.length !== SURVEY_SECTIONS.length) {
  problems.push(
    `section count: translation has ${parsed.sections.length}, source has ${SURVEY_SECTIONS.length}`,
  );
}

const translatedQuestions = parsed.sections.flatMap((section) => section.questions);
if (translatedQuestions.length !== ALL_QUESTIONS.length) {
  problems.push(
    `question count: translation has ${translatedQuestions.length}, source has ${ALL_QUESTIONS.length}`,
  );
}

const sectionTitles: Record<string, string> = {};
parsed.sections.forEach((section, index) => {
  const source = SURVEY_SECTIONS[index];
  if (source) sectionTitles[String(source.index)] = section.title;
});

const questions: Record<
  string,
  { text: string; hint: string | null; options: Record<string, string> }
> = {};

ALL_QUESTIONS.forEach((source, index) => {
  const translated = translatedQuestions[index];
  if (!translated) {
    problems.push(`Q${source.id} missing from the translation`);
    return;
  }

  if (translated.number !== source.id) {
    problems.push(
      `question ${index + 1} is numbered ${translated.number} in the translation but ${source.id} in the source`,
    );
  }

  const sourceIsText = source.type === "text";
  if (sourceIsText !== translated.freeText) {
    problems.push(
      `Q${source.id}: source is ${sourceIsText ? "free-text" : "multiple choice"} but the translation is not`,
    );
  }

  const sourceOptions = source.options ?? [];
  if (sourceOptions.length !== translated.options.length) {
    problems.push(
      `Q${source.id} option count: translation has ${translated.options.length}, source has ${sourceOptions.length}`,
    );
    return;
  }

  const options: Record<string, string> = {};
  sourceOptions.forEach((option, optionIndex) => {
    const label = translated.options[optionIndex];
    options[optionId(source.key, optionIndex)] = label;

    // The "other" option must stay an "other" option in every language, or the
    // free-text box would appear against the wrong choice.
    const sourceIsOther = Boolean(option.other);
    const translatedIsOther = label.includes("__________");
    if (sourceIsOther !== translatedIsOther) {
      problems.push(
        `Q${source.id} option ${optionIndex + 1}: "other" marker mismatch — source ${sourceIsOther}, translation ${translatedIsOther} (${JSON.stringify(label)})`,
      );
    }
  });

  questions[source.key] = {
    text: translated.text,
    hint: translated.hint ?? null,
    options,
  };

  if (Boolean(source.hint) !== Boolean(translated.hint)) {
    problems.push(
      `Q${source.id}: source ${source.hint ? "has" : "has no"} instruction line, translation ${translated.hint ? "has" : "has no"} one`,
    );
  }
});

for (const [label, value] of Object.entries({
  "intro.title": parsed.intro.title,
  "intro.subtitle": parsed.intro.subtitle,
  "intro.salutation": parsed.intro.salutation,
  "intro.notice": parsed.intro.notice,
  "thanks.heading": parsed.thanks.heading,
  "thanks.lead": parsed.thanks.lead,
  "thanks.bodyEmphasis": parsed.thanks.bodyEmphasis,
})) {
  if (!value) problems.push(`${label} is empty`);
}

if (parsed.intro.paragraphs.length !== 2) {
  problems.push(`intro paragraphs: found ${parsed.intro.paragraphs.length}, expected 2`);
}

if (problems.length > 0) {
  console.error(`\nTranslation does NOT line up with the source — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  • ${problem}`);
  console.error("\nNothing was written.\n");
  process.exit(1);
}

const output = {
  locale: localeArg,
  intro: parsed.intro,
  thanks: parsed.thanks,
  sections: sectionTitles,
  questions,
};

const outDir = resolve(repo, "content", "translations");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, `${localeArg}.json`);
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(
  `${localeArg}: ${parsed.sections.length} sections, ${translatedQuestions.length} questions, ` +
    `${Object.values(questions).reduce((n, q) => n + Object.keys(q.options).length, 0)} options — structure matches the source.`,
);
console.log(`written to content/translations/${localeArg}.json`);
