import { randomUUID } from "node:crypto";

import type { Prisma, Question } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  SURVEY_SECTIONS,
  type QuestionType,
} from "@/lib/survey-content";
import type {
  Questionnaire,
  QuestionStatus,
  RuntimeOption,
  RuntimeQuestion,
  RuntimeSection,
} from "@/lib/survey-types";

/**
 * Question storage and versioning.
 *
 * The rule the admin UI is built around: an edit never mutates a question that
 * respondents have already seen. `updateQuestion` archives the current version —
 * which keeps every answer given to it — and forks a new live version starting
 * at zero answers. Deletes are soft for the same reason.
 *
 * Reordering and moving between sections are deliberately *not* versioned:
 * they change where a question sits, not what it asks, and forking a version
 * every time an admin drags a row would bury the real edits in noise.
 */

export interface QuestionInput {
  sectionId: string;
  type: QuestionType;
  text: string;
  hint?: string | null;
  options: RuntimeOption[];
}

function parseOptions(value: Prisma.JsonValue): RuntimeOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
    const label = (entry as Record<string, unknown>).label;
    if (typeof label !== "string") return [];
    const other = (entry as Record<string, unknown>).other;
    return [other === true ? { label, other: true } : { label }];
  });
}

function toRuntime(
  row: Question,
  number: number,
  versioned: boolean,
): RuntimeQuestion {
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
    text: row.text,
    hint: row.hint,
    options: parseOptions(row.options),
    status: row.status as QuestionStatus,
  };
}

/** Live questionnaire, in section then position order, numbered 1..n. */
export async function getQuestionnaire(): Promise<Questionnaire> {
  const sections = await prisma.section.findMany({
    orderBy: { position: "asc" },
    include: {
      questions: {
        where: { status: "live" },
        orderBy: { position: "asc" },
      },
    },
  });

  const lineageCounts = await countVersionsByLineage();

  let number = 0;
  const runtimeSections: RuntimeSection[] = sections.map((section) => ({
    id: section.id,
    position: section.position,
    title: section.title,
    questions: section.questions.map((row) =>
      toRuntime(row, ++number, (lineageCounts.get(row.lineageId) ?? 1) > 1),
    ),
  }));

  const questions = runtimeSections.flatMap((section) => section.questions);

  return {
    // Sections with no live questions would render as an empty step.
    sections: runtimeSections.filter((section) => section.questions.length > 0),
    questions,
    totalQuestions: questions.length,
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
 */
export async function getAllQuestionVersions(): Promise<RuntimeQuestion[]> {
  const rows = await prisma.question.findMany({
    include: { section: true },
    orderBy: [
      { section: { position: "asc" } },
      { position: "asc" },
      { version: "asc" },
    ],
  });

  const lineageCounts = new Map<string, number>();
  for (const row of rows) {
    lineageCounts.set(row.lineageId, (lineageCounts.get(row.lineageId) ?? 0) + 1);
  }

  // Numbering follows the live questionnaire; archived versions inherit the
  // number their lineage currently occupies so the dashboard reads in order.
  const { questions: live } = await getQuestionnaire();
  const numberByLineage = new Map(live.map((q) => [q.lineageId, q.number]));

  let fallback = live.length;
  const numbered = rows.map((row) => {
    let number = numberByLineage.get(row.lineageId);
    if (number === undefined) {
      // Lineage has no live version left (deleted); park it after the live set.
      number = ++fallback;
      numberByLineage.set(row.lineageId, number);
    }
    return toRuntime(row, number, (lineageCounts.get(row.lineageId) ?? 1) > 1);
  });

  return numbered.sort((a, b) => a.number - b.number || a.version - b.version);
}

export async function getSections() {
  return prisma.section.findMany({ orderBy: { position: "asc" } });
}

/** Adds a brand-new question (version 1 of a new lineage) at the end of a section. */
export async function createQuestion(input: QuestionInput): Promise<RuntimeQuestion> {
  const last = await prisma.question.findFirst({
    where: { sectionId: input.sectionId, status: "live" },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const lineageKey = await nextLineageKey();

  const row = await prisma.question.create({
    data: {
      lineageId: randomUUID(),
      version: 1,
      lineageKey,
      sectionId: input.sectionId,
      position: (last?.position ?? 0) + 1,
      type: input.type,
      text: input.text,
      hint: input.hint?.trim() ? input.hint.trim() : null,
      options: optionsToJson(normaliseOptions(input.type, input.options)),
      status: "live",
    },
  });

  return toRuntime(row, 0, false);
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

/**
 * Prisma's Json input type will not accept an object with optional properties,
 * so rebuild each option as a plain literal on the way into the column.
 */
function optionsToJson(options: RuntimeOption[]): Prisma.InputJsonValue {
  return options.map((option) =>
    option.other ? { label: option.label, other: true } : { label: option.label },
  );
}

function normaliseOptions(
  type: QuestionType,
  options: RuntimeOption[],
): RuntimeOption[] {
  if (type === "text") return [];
  return options
    .map((option) => ({
      label: option.label.trim(),
      // The underscore convention is what makes an option reveal a text input,
      // so keep the flag and the label in agreement rather than trusting input.
      ...(option.other || option.label.includes("__________")
        ? { other: true as const }
        : {}),
    }))
    .filter((option) => option.label.length > 0);
}

export interface UpdateResult {
  /** True when the edit forked a new version rather than only moving the row. */
  versioned: boolean;
  question: RuntimeQuestion;
}

/**
 * Applies an edit to the live version of a lineage.
 *
 * If any of text/hint/type/options changed, the current row is archived and a
 * new version is created; the archived row keeps its answers. If only the
 * section or position changed, the row is updated in place.
 */
export async function updateQuestion(
  questionId: string,
  input: QuestionInput,
): Promise<UpdateResult> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.question.findUnique({ where: { id: questionId } });
    if (!current) throw new Error("QUESTION_NOT_FOUND");
    if (current.status !== "live") throw new Error("QUESTION_NOT_LIVE");

    const nextOptions = normaliseOptions(input.type, input.options);
    const nextHint = input.hint?.trim() ? input.hint.trim() : null;

    const changed =
      current.text !== input.text.trim() ||
      current.hint !== nextHint ||
      current.type !== input.type ||
      JSON.stringify(parseOptions(current.options)) !== JSON.stringify(nextOptions);

    if (!changed) {
      // Nothing about the wording moved; only reposition.
      const moved = await tx.question.update({
        where: { id: questionId },
        data: { sectionId: input.sectionId },
      });
      return { versioned: false, question: toRuntime(moved, 0, false) };
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
        text: input.text.trim(),
        hint: nextHint,
        options: optionsToJson(nextOptions),
        status: "live",
      },
    });

    return { versioned: true, question: toRuntime(created, 0, true) };
  });
}

/**
 * Soft delete. The row keeps its answers and stays in the dashboard and the CSV
 * export; it is simply never shown to a respondent again.
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  await prisma.question.update({
    where: { id: questionId },
    data: { status: "deleted", archivedAt: new Date() },
  });
}

/** Restores a soft-deleted question, provided its lineage has no live version. */
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

/**
 * Applies an explicit order. Positions are rewritten densely so repeated moves
 * cannot drift into collisions.
 */
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
            options: (question.options ?? []).map((option) =>
              option.other ? { label: option.label, other: true } : { label: option.label },
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
