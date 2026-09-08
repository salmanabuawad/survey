import { z } from "zod";

import { LOCALES } from "./i18n/config";
import { MAX_OTHER_LENGTH, MAX_TEXT_LENGTH } from "./limits";
import type { RuntimeQuestion } from "./survey-types";

export type AnswerValue = {
  /**
   * Chosen option *ids*, not labels. Ids are the same in every language, so a
   * Hebrew answer aggregates with the same choice made in Arabic.
   */
  selected?: string[];
  /** Body of a free-text question. */
  text?: string;
  /** What was typed after choosing an "other" option. */
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
    locale: z.enum(LOCALES),
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
  selectedOptionIds: string[];
  /** Labels exactly as this respondent read them, in her language. */
  selectedOptions: string[];
  textValue: string | null;
  otherText: string | null;
}

/**
 * Rejects anything that is not an option of the live questionnaire. The client
 * is not trusted to send option identity: a mismatch means either a stale tab
 * or a hand-rolled request, and either way the row would corrupt the analysis.
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
      errors.push("STALE_QUESTIONNAIRE");
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
    // Snapshot in the language this respondent actually read.
    questionText: question.text,
    questionType: question.type,
  };

  if (question.type === "text") {
    const text = raw?.text?.trim() ?? "";
    return {
      ...base,
      selectedOptionIds: [],
      selectedOptions: [],
      textValue: text.length > 0 ? text : null,
      otherText: null,
    };
  }

  const byId = new Map(question.options.map((option) => [option.id, option]));
  const selected = (raw?.selected ?? []).map((value) => value.trim()).filter(Boolean);

  for (const id of selected) {
    if (!byId.has(id)) errors.push(`UNKNOWN_OPTION:${question.number}`);
  }

  if (question.type === "single" && selected.length > 1) {
    errors.push(`TOO_MANY:${question.number}`);
  }

  // Keep the questionnaire's own option order, and drop duplicates.
  const chosen = question.options.filter((option) => selected.includes(option.id));
  const otherPicked = chosen.some((option) => option.other);

  return {
    ...base,
    selectedOptionIds: chosen.map((option) => option.id),
    selectedOptions: chosen.map((option) => option.label),
    textValue: null,
    otherText: otherPicked ? raw?.other?.trim() || null : null,
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

  // Picking "other" without saying what it is leaves the answer unusable.
  const otherIds = question.options
    .filter((option) => option.other)
    .map((option) => option.id);
  if (selected.some((id) => otherIds.includes(id))) {
    return (answer?.other?.trim().length ?? 0) > 0;
  }

  return true;
}
