/**
 * Loads `content/translations/<locale>.json` into the database.
 *
 *     npx tsx scripts/seed-translations.ts          # every locale on disk
 *     npx tsx scripts/seed-translations.ts he       # just one
 *
 * Translations attach to the *live* version of each question lineage, keyed by
 * option id, so they line up with the source no matter how the questionnaire has
 * been reordered since. Re-running updates in place and clears the review flag
 * for the strings it writes; it never touches a question's own wording.
 *
 * The intro and thank-you text live in `src/lib/i18n/messages.ts` alongside the
 * rest of the interface copy, not here.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "../src/lib/db.js";
import { isLocale, SOURCE_LOCALE, TRANSLATION_LOCALES } from "../src/lib/i18n/config.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");

interface TranslationFile {
  locale: string;
  sections: Record<string, string>;
  questions: Record<
    string,
    { text: string; hint: string | null; options: Record<string, string> }
  >;
}

async function seedLocale(locale: string): Promise<void> {
  const path = resolve(repo, "content", "translations", `${locale}.json`);
  if (!existsSync(path)) {
    console.log(`${locale}: no file at content/translations/${locale}.json — skipped`);
    return;
  }

  const file = JSON.parse(readFileSync(path, "utf8")) as TranslationFile;

  // --- sections -------------------------------------------------------------
  const sections = await prisma.section.findMany({ select: { id: true, position: true } });
  let sectionCount = 0;

  for (const section of sections) {
    const title = file.sections[String(section.position)]?.trim();
    if (!title) continue;
    await prisma.sectionTranslation.upsert({
      where: { sectionId_locale: { sectionId: section.id, locale } },
      create: { sectionId: section.id, locale, title },
      update: { title },
    });
    sectionCount += 1;
  }

  // --- questions ------------------------------------------------------------
  const questions = await prisma.question.findMany({
    where: { status: "live" },
    select: { id: true, lineageKey: true, options: true },
  });

  let questionCount = 0;
  const missing: string[] = [];

  for (const question of questions) {
    const entry = file.questions[question.lineageKey];
    // A stub file carries the right shape with empty strings; writing those
    // would create translation rows that say nothing and mask the fallback.
    if (!entry?.text?.trim()) {
      missing.push(question.lineageKey);
      continue;
    }

    // Only keep labels whose option id still exists on this version.
    const validIds = new Set(
      (Array.isArray(question.options) ? question.options : [])
        .map((option) =>
          option && typeof option === "object" && "id" in option
            ? String((option as { id?: unknown }).id ?? "")
            : "",
        )
        .filter(Boolean),
    );

    const optionLabels: Record<string, string> = {};
    for (const [id, label] of Object.entries(entry.options ?? {})) {
      if (validIds.has(id)) optionLabels[id] = label;
    }

    const untranslated = [...validIds].filter((id) => !optionLabels[id]);
    if (untranslated.length > 0) {
      missing.push(`${question.lineageKey} (${untranslated.length} option(s))`);
    }

    await prisma.questionTranslation.upsert({
      where: { questionId_locale: { questionId: question.id, locale } },
      create: {
        questionId: question.id,
        locale,
        text: entry.text,
        hint: entry.hint,
        optionLabels,
        needsReview: false,
      },
      update: {
        text: entry.text,
        hint: entry.hint,
        optionLabels,
        needsReview: false,
      },
    });
    questionCount += 1;
  }

  console.log(
    `${locale}: ${sectionCount} section title(s), ${questionCount} question(s) translated`,
  );
  if (missing.length > 0) {
    console.warn(`${locale}: not fully covered — ${missing.join(", ")}`);
  }
}

async function main() {
  const requested = process.argv[2];

  if (requested) {
    if (!isLocale(requested) || requested === SOURCE_LOCALE) {
      console.error(
        `expected one of: ${TRANSLATION_LOCALES.join(", ")} (${SOURCE_LOCALE} is the source language)`,
      );
      process.exit(1);
    }
    await seedLocale(requested);
    return;
  }

  for (const locale of TRANSLATION_LOCALES) await seedLocale(locale);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
