import { z } from "zod";

import { MAX_OTHER_LENGTH, MAX_TEXT_LENGTH } from "./limits";
import type { RuntimeQuestion } from "./survey-types";

export type AnswerValue = {
  /** Option labels the respondent picked, verbatim. */
  selected?: string[];
  /** Body of a free-text question. */
  text?: string;
  /** What was typed after choosing an "أخرى: __________" option. */
  other?: string;
};

export const answerSchema = z
  .object({
    selected: z.array(z.string()).max(200).optional(),
    text: z.string().max(MAX_TEXT_LENGTH).optional(),
    other: z.string().max(MAX_OTHER_LENGTH).optional(),
  })
  .strict();

export const submissionSchema = z
  .object({
    surveyVersion: z.string().min(1).max(120),
    /** Seconds spent filling the form, measured on the client. */
    completionSeconds: z.number().int().min(0).max(60 * 60 * 24).nullable().optional(),
    /** Keyed by question *version* id, so an edit mid-session cannot mis-file. */
    answers: z.record(z.string(), answerSchema),
  })
  .strict();

export type Submission = z.infer<typeof submissionSchema>;

export interface NormalisedAnswer {
  questionId: string;
  questionKey: string;
  questionNumber: number;
  questionText: string;
  questionType: string;
  selectedOptions: string[];
  textValue: string | null;
  otherText: string | null;
}

/**
 * Rejects anything that is not a label from the live questionnaire. The client
 * is not trusted to send option text: a mismatch means either a stale tab or a
 * hand-rolled request, and either way the row would corrupt the analysis.
 */
export function normaliseSubmission(
  submission: Submission,
  questions: readonly RuntimeQuestion[],
): { ok: true; answers: NormalisedAnswer[] } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const answers: NormalisedAnswer[] = [];
  const byId = new Map(questions.map((question) => [question.id, question]));

  for (const key of Object.keys(submission.answers)) {
    if (!byId.has(key)) {
      // Most likely an admin edited the questionnaire while this tab was open.
      errors.push("تم تحديث الاستبيان أثناء تعبئته، يرجى إعادة تحميل الصفحة.");
      break;
    }
  }

  for (const question of questions) {
    const raw = submission.answers[question.id];
    const normalised = normaliseAnswer(question, raw, errors);
    if (normalised) answers.push(normalised);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, answers };
}

function normaliseAnswer(
  question: RuntimeQuestion,
  raw: AnswerValue | undefined,
  errors: string[],
): NormalisedAnswer | null {
  const base = {
    questionId: question.id,
    questionKey: question.lineageKey,
    questionNumber: question.number,
    questionText: question.text,
    questionType: question.type,
  };

  if (question.type === "text") {
    const text = raw?.text?.trim() ?? "";
    return {
      ...base,
      selectedOptions: [],
      textValue: text.length > 0 ? text : null,
      otherText: null,
    };
  }

  const labels = new Set(question.options.map((option) => option.label));
  const otherLabels = new Set(
    question.options.filter((option) => option.other).map((option) => option.label),
  );

  const selected = (raw?.selected ?? []).map((value) => value.trim()).filter(Boolean);

  for (const value of selected) {
    if (!labels.has(value)) {
      errors.push(`إجابة غير معروفة للسؤال ${question.number}`);
    }
  }

  if (question.type === "single" && selected.length > 1) {
    errors.push(`السؤال ${question.number} يقبل إجابة واحدة فقط`);
  }

  const otherPicked = selected.some((value) => otherLabels.has(value));

  return {
    ...base,
    // Keep the order the options appear in, and drop duplicates.
    selectedOptions: question.options
      .map((option) => option.label)
      .filter((label) => selected.includes(label)),
    textValue: null,
    otherText: otherPicked ? (raw?.other?.trim() || null) : null,
  };
}

/** Free-text questions stay optional; everything else must be answered. */
export function isRequired(question: RuntimeQuestion): boolean {
  return question.type !== "text";
}

export function isAnswered(
  question: RuntimeQuestion,
  answer: AnswerValue | undefined,
): boolean {
  if (question.type === "text") return (answer?.text?.trim().length ?? 0) > 0;

  const selected = answer?.selected ?? [];
  if (selected.length === 0) return false;

  // Picking "أخرى" without saying what it is leaves the answer unusable.
  const otherLabels = question.options
    .filter((option) => option.other)
    .map((option) => option.label);
  if (selected.some((value) => otherLabels.includes(value))) {
    return (answer?.other?.trim().length ?? 0) > 0;
  }

  return true;
}
