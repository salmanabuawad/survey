import { randomUUID } from "node:crypto";

import type { Prisma, Question, QuestionTranslation } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  isLocale,
  optionId,
  SOURCE_LOCALE,
  TRANSLATION_LOCALES,
  type Locale,
} from "@/lib/i18n/config";
import { SURVEY_SECTIONS, type QuestionType } from "@/lib/survey-content";
import type {
  Questionnaire,
  QuestionStatus,
  RuntimeQuestion,
  RuntimeSection,
  TranslationCoverage,
} from "@/lib/survey-types";

/**
 * Question storage, versioning and translation.
 *
 * The rule the admin UI is built around: an edit never mutates a question that
 * respondents have already seen. `updateQuestion` archives the current version —
 * which keeps every answer given to it — and forks a new live version starting
 * at zero answers. Deletes are soft for the same reason.
 *
 * Reordering and moving between sections are deliberately *not* versioned:
 * they change where a question sits, not what it asks.
 *
 * Translations attach to a question *version* and are edited in place: a Hebrew
 * wording fix is not a new research question, so it must not fragment the
 * Arabic answer counts. When the source wording forks, translations are carried
 * forward flagged `needsReview` rather than dropped.
 */

export interface QuestionInput {
  sectionId: string;
  type: QuestionType;
  text: string;
  hint?: string | null;
  options: Array<{ id?: string; label: string; other?: boolean }>;
}

interface StoredOption {
  id: string;
  label: string;
  other?: boolean;
}

function parseOptions(value: Prisma.JsonValue): StoredOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
    const record = entry as Record<string, unknown>;
    const label = record.label;
    const id = record.id;
    if (typeof label !== "string" || typeof id !== "string" || !id) return [];
    return [record.other === true ? { id, label, other: true as const } : { id, label }];
  });
}

function parseOptionLabels(value: Prisma.JsonValue): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, label] of Object.entries(value as Record<string, unknown>)) {
    if (typeof label === "string" && label.trim()) out[key] = label;
  }
  return out;
}

/** Prisma's Json input rejects objects with optional properties. */
function optionsToJson(options: StoredOption[]): Prisma.InputJsonValue {
  return options.map((option) =>
    option.other
      ? { id: option.id, label: option.label, other: true }
      : { id: option.id, label: option.label },
  );
}

type QuestionRow = Question & { translations?: QuestionTranslation[] };

/**
 * Resolves one stored question into one language, falling back to the source
 * language string by string rather than all-or-nothing.
 */
function toRuntime(
  row: QuestionRow,
  number: number,
  versioned: boolean,
  locale: Locale,
): RuntimeQuestion {
  const sourceOptions = parseOptions(row.options);
  const translation =
    locale === SOURCE_LOCALE
      ? undefined
      : row.translations?.find((entry) => entry.locale === locale);

  const labels = translation ? parseOptionLabels(translation.optionLabels) : {};

  return {
    id: row.id,
    lineageId: row.lineageId,
    lineageKey: row.lineageKey,
    version: row.version,
    versioned,
    number,
    sectionId: row.sectionId,
    position: row.position,
    type: row.type as QuestionType,
    text: translation?.text?.trim() || row.text,
    hint: translation ? translation.hint?.trim() || row.hint : row.hint,
    options: sourceOptions.map((option) => ({
      id: option.id,
      label: labels[option.id] ?? option.label,
      ...(option.other ? { other: true as const } : {}),
    })),
    status: row.status as QuestionStatus,
    locale,
    translated: locale === SOURCE_LOCALE || Boolean(translation?.text?.trim()),
  };
}

/** Live questionnaire in one language, in section then position order. */
export async function getQuestionnaire(
  locale: Locale = SOURCE_LOCALE,
): Promise<Questionnaire> {
  const sections = await prisma.section.findMany({
    orderBy: { position: "asc" },
    include: {
      translations: locale === SOURCE_LOCALE ? false : { where: { locale } },
      questions: {
        where: { status: "live" },
        orderBy: { position: "asc" },
        include: {
          translations: locale === SOURCE_LOCALE ? false : { where: { locale } },
        },
      },
    },
  });

  const lineageCounts = await countVersionsByLineage();

  let number = 0;
  const runtimeSections: RuntimeSection[] = sections.map((section) => {
    const title = section.translations?.[0]?.title?.trim();
    return {
      id: section.id,
      position: section.position,
      title: title || section.title,
      translated: locale === SOURCE_LOCALE || Boolean(title),
      questions: section.questions.map((row) =>
        toRuntime(row, ++number, (lineageCounts.get(row.lineageId) ?? 1) > 1, locale),
      ),
    };
  });

  const questions = runtimeSections.flatMap((section) => section.questions);

  return {
    locale,
    // Sections with no live questions would render as an empty step.
    sections: runtimeSections.filter((section) => section.questions.length > 0),
    questions,
    totalQuestions: questions.length,
    untranslatedCount: questions.filter((question) => !question.translated).length,
  };
}

async function countVersionsByLineage(): Promise<Map<string, number>> {
  const grouped = await prisma.question.groupBy({
    by: ["lineageId"],
    _count: { _all: true },
  });
  return new Map(grouped.map((row) => [row.lineageId, row._count._all]));
}

/**
 * Every question version that could carry data — live, archived and deleted —
 * ordered so each lineage's versions sit together in questionnaire order.
 * Always in the source language: the dashboard analyses one wording, not three.
 */
export async function getAllQuestionVersions(): Promise<RuntimeQuestion[]> {
  const rows = await prisma.question.findMany({
    include: { section: true },
    orderBy: [{ section: { position: "asc" } }, { position: "asc" }, { version: "asc" }],
  });

  const lineageCounts = new Map<string, number>();
  for (const row of rows) {
    lineageCounts.set(row.lineageId, (lineageCounts.get(row.lineageId) ?? 0) + 1);
  }

  const { questions: live } = await getQuestionnaire(SOURCE_LOCALE);
  const numberByLineage = new Map(live.map((q) => [q.lineageId, q.number]));

  let fallback = live.length;
  const numbered = rows.map((row) => {
    let number = numberByLineage.get(row.lineageId);
    if (number === undefined) {
      // Lineage has no live version left (deleted); park it after the live set.
      number = ++fallback;
      numberByLineage.set(row.lineageId, number);
    }
    return toRuntime(
      row,
      number,
      (lineageCounts.get(row.lineageId) ?? 1) > 1,
      SOURCE_LOCALE,
    );
  });

  return numbered.sort((a, b) => a.number - b.number || a.version - b.version);
}

export async function getSections() {
  return prisma.section.findMany({ orderBy: { position: "asc" } });
}

/** Per-language progress, for the admin translation view and the switcher. */
export async function getTranslationCoverage(): Promise<TranslationCoverage[]> {
  const questions = await prisma.question.findMany({
    where: { status: "live" },
    include: { translations: true },
  });

  return TRANSLATION_LOCALES.map((locale) => {
    let complete = 0;
    let partial = 0;
    let missing = 0;
    let needsReview = 0;

    for (const question of questions) {
      const translation = question.translations.find((entry) => entry.locale === locale);
      if (!translation?.text?.trim()) {
        missing += 1;
        continue;
      }
      if (translation.needsReview) needsReview += 1;

      const options = parseOptions(question.options);
      const labels = parseOptionLabels(translation.optionLabels);
      if (options.every((option) => labels[option.id])) complete += 1;
      else partial += 1;
    }

    return { locale, complete, partial, missing, needsReview, total: questions.length };
  });
}

/** Locales worth offering a respondent: the source, plus anything translated. */
export async function getAvailableLocales(): Promise<Locale[]> {
  const coverage = await getTranslationCoverage();
  return [
    SOURCE_LOCALE,
    ...coverage
      .filter((entry) => entry.complete + entry.partial > 0)
      .map((entry) => entry.locale),
  ];
}

// --- editing -----------------------------------------------------------------

/**
 * Assigns ids to options. Existing ids are preserved so that renaming an option
 * keeps its answers; only genuinely new options get new ids.
 */
function normaliseOptions(
  type: QuestionType,
  options: QuestionInput["options"],
  lineageKey: string,
  taken: Set<string>,
): StoredOption[] {
  if (type === "text") return [];

  let counter = 0;
  const nextId = (): string => {
    let candidate: string;
    do {
      candidate = optionId(lineageKey, counter++);
    } while (taken.has(candidate));
    taken.add(candidate);
    return candidate;
  };

  return options
    .map((option) => ({ ...option, label: option.label.trim() }))
    .filter((option) => option.label.length > 0)
    .map((option) => {
      const id = option.id && option.id.trim() ? option.id.trim() : nextId();
      taken.add(id);
      return {
        id,
        label: option.label,
        // The underscore convention is what makes an option reveal a text input,
        // so keep the flag and the label in agreement rather than trusting input.
        ...(option.other || option.label.includes("__________")
          ? { other: true as const }
          : {}),
      };
    });
}

export async function createQuestion(input: QuestionInput): Promise<RuntimeQuestion> {
  const last = await prisma.question.findFirst({
    where: { sectionId: input.sectionId, status: "live" },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const lineageKey = await nextLineageKey();
  const options = normaliseOptions(input.type, input.options, lineageKey, new Set());

  const row = await prisma.question.create({
    data: {
      lineageId: randomUUID(),
      version: 1,
      lineageKey,
      sectionId: input.sectionId,
      position: (last?.position ?? 0) + 1,
      type: input.type,
      text: input.text.trim(),
      hint: input.hint?.trim() ? input.hint.trim() : null,
      options: optionsToJson(options),
      status: "live",
    },
  });

  return toRuntime(row, 0, false, SOURCE_LOCALE);
}

/** "q28", "q29", … — continues past whatever the seed created. */
async function nextLineageKey(): Promise<string> {
  const rows = await prisma.question.findMany({ select: { lineageKey: true } });
  const highest = rows.reduce((max, row) => {
    const match = /^q(\d+)$/.exec(row.lineageKey);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `q${highest + 1}`;
}

export interface UpdateResult {
  /** True when the edit forked a new version rather than only moving the row. */
  versioned: boolean;
  question: RuntimeQuestion;
}

export async function updateQuestion(
  questionId: string,
  input: QuestionInput,
): Promise<UpdateResult> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.question.findUnique({
      where: { id: questionId },
      include: { translations: true },
    });
    if (!current) throw new Error("QUESTION_NOT_FOUND");
    if (current.status !== "live") throw new Error("QUESTION_NOT_LIVE");

    const currentOptions = parseOptions(current.options);
    const taken = new Set(currentOptions.map((option) => option.id));
    const nextOptions = normaliseOptions(
      input.type,
      input.options,
      current.lineageKey,
      taken,
    );
    const nextHint = input.hint?.trim() ? input.hint.trim() : null;
    const nextText = input.text.trim();

    const changed =
      current.text !== nextText ||
      current.hint !== nextHint ||
      current.type !== input.type ||
      JSON.stringify(currentOptions) !== JSON.stringify(nextOptions);

    if (!changed) {
      const moved = await tx.question.update({
        where: { id: questionId },
        data: { sectionId: input.sectionId },
      });
      return { versioned: false, question: toRuntime(moved, 0, false, SOURCE_LOCALE) };
    }

    await tx.question.update({
      where: { id: questionId },
      data: { status: "archived", archivedAt: new Date() },
    });

    const highest = await tx.question.aggregate({
      where: { lineageId: current.lineageId },
      _max: { version: true },
    });

    const created = await tx.question.create({
      data: {
        lineageId: current.lineageId,
        version: (highest._max.version ?? current.version) + 1,
        lineageKey: current.lineageKey,
        sectionId: input.sectionId,
        position: current.position,
        type: input.type,
        text: nextText,
        hint: nextHint,
        options: optionsToJson(nextOptions),
        status: "live",
      },
    });

    // Carry translations onto the new version rather than dropping them, but
    // flag them: the source wording moved, so each one needs a look. Labels for
    // options that no longer exist are discarded here.
    const validIds = new Set(nextOptions.map((option) => option.id));
    for (const translation of current.translations) {
      const labels = parseOptionLabels(translation.optionLabels);
      const kept: Record<string, string> = {};
      for (const [id, label] of Object.entries(labels)) {
        if (validIds.has(id)) kept[id] = label;
      }

      await tx.questionTranslation.create({
        data: {
          questionId: created.id,
          locale: translation.locale,
          text: translation.text,
          hint: translation.hint,
          optionLabels: kept,
          needsReview: true,
        },
      });
    }

    return { versioned: true, question: toRuntime(created, 0, true, SOURCE_LOCALE) };
  });
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await prisma.question.update({
    where: { id: questionId },
    data: { status: "deleted", archivedAt: new Date() },
  });
}

export async function restoreQuestion(questionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.question.findUnique({ where: { id: questionId } });
    if (!row) throw new Error("QUESTION_NOT_FOUND");

    const live = await tx.question.findFirst({
      where: { lineageId: row.lineageId, status: "live" },
    });
    if (live) throw new Error("LINEAGE_ALREADY_LIVE");

    await tx.question.update({
      where: { id: questionId },
      data: { status: "live", archivedAt: null },
    });
  });
}

export async function reorderQuestions(
  ordered: Array<{ id: string; sectionId: string }>,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const perSection = new Map<string, number>();
    for (const entry of ordered) {
      const next = (perSection.get(entry.sectionId) ?? 0) + 1;
      perSection.set(entry.sectionId, next);
      await tx.question.update({
        where: { id: entry.id },
        data: { sectionId: entry.sectionId, position: next },
      });
    }
  });
}

// --- translation editing -----------------------------------------------------

export interface TranslationInput {
  locale: string;
  text: string;
  hint?: string | null;
  /** { optionId: label } — ids must belong to this question version. */
  optionLabels: Record<string, string>;
}

/**
 * Writes one language's rendering of a question. In place, deliberately: a
 * translation fix is not a new research question.
 */
export async function saveTranslation(
  questionId: string,
  input: TranslationInput,
): Promise<void> {
  if (!isLocale(input.locale) || input.locale === SOURCE_LOCALE) {
    throw new Error("INVALID_LOCALE");
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) throw new Error("QUESTION_NOT_FOUND");

  const validIds = new Set(parseOptions(question.options).map((option) => option.id));
  const labels: Record<string, string> = {};
  for (const [id, label] of Object.entries(input.optionLabels)) {
    if (validIds.has(id) && label.trim()) labels[id] = label.trim();
  }

  await prisma.questionTranslation.upsert({
    where: { questionId_locale: { questionId, locale: input.locale } },
    create: {
      questionId,
      locale: input.locale,
      text: input.text.trim(),
      hint: input.hint?.trim() || null,
      optionLabels: labels,
      needsReview: false,
    },
    update: {
      text: input.text.trim(),
      hint: input.hint?.trim() || null,
      optionLabels: labels,
      needsReview: false,
    },
  });
}

/** All stored translations of one question version, for the editor. */
export async function getTranslations(questionId: string) {
  const rows = await prisma.questionTranslation.findMany({ where: { questionId } });
  return rows.map((row) => ({
    locale: row.locale,
    text: row.text,
    hint: row.hint,
    optionLabels: parseOptionLabels(row.optionLabels),
    needsReview: row.needsReview,
  }));
}

// --- seeding -----------------------------------------------------------------

/**
 * Seeds sections and version 1 of every question from the locked original.
 *
 * Idempotent and non-destructive: it does nothing at all once any question
 * exists, so it can never overwrite an admin's edits.
 */
export async function seedFromLockedSource(): Promise<
  { seeded: false } | { seeded: true; sections: number; questions: number }
> {
  const existing = await prisma.question.count();
  if (existing > 0) return { seeded: false };

  let questionCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const section of SURVEY_SECTIONS) {
      const created = await tx.section.create({
        data: { position: section.index, title: section.title },
      });

      for (const [index, question] of section.questions.entries()) {
        await tx.question.create({
          data: {
            lineageId: randomUUID(),
            version: 1,
            lineageKey: question.key,
            sectionId: created.id,
            position: index + 1,
            type: question.type,
            text: question.text,
            hint: question.hint ?? null,
            options: (question.options ?? []).map((option, optionIndex) =>
              option.other
                ? {
                    id: optionId(question.key, optionIndex),
                    label: option.label,
                    other: true,
                  }
                : { id: optionId(question.key, optionIndex), label: option.label },
            ),
            status: "live",
          },
        });
        questionCount += 1;
      }
    }
  });

  return { seeded: true, sections: SURVEY_SECTIONS.length, questions: questionCount };
}
