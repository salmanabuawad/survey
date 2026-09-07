import { prisma } from "@/lib/db";
import { getAllQuestionVersions } from "@/lib/questions";
import type { QuestionStatus, QuestionType } from "@/lib/survey-types";

export interface Filters {
  frameworkType?: string;
  ageGroup?: string;
  groupSize?: string;
  experience?: string;
}

export interface OptionTally {
  label: string;
  count: number;
  /** Share of the responses that answered this question version, 0-100. */
  percent: number;
}

export interface QuestionDistribution {
  /** Question *version* id. */
  id: string;
  number: number;
  version: number;
  /** True when this lineage has more than one version. */
  versioned: boolean;
  status: QuestionStatus;
  text: string;
  type: QuestionType;
  answered: number;
  options: OptionTally[];
  otherTexts: string[];
}

export interface OpenTextEntry {
  responseId: string;
  submittedAt: string;
  value: string;
}

export interface OpenTextQuestion {
  id: string;
  number: number;
  version: number;
  versioned: boolean;
  status: QuestionStatus;
  text: string;
  entries: OpenTextEntry[];
}

export interface Stats {
  total: number;
  byDay: Array<{ date: string; count: number }>;
  averageCompletionSeconds: number | null;
  medianCompletionSeconds: number | null;
  distributions: QuestionDistribution[];
  openText: OpenTextQuestion[];
  filterOptions: Record<string, string[]>;
  appliedFilters: Filters;
  /** Question versions that are archived or deleted but still hold answers. */
  archivedWithData: number;
}

function whereFromFilters(filters: Filters) {
  return {
    ...(filters.frameworkType ? { frameworkType: filters.frameworkType } : {}),
    ...(filters.ageGroup ? { ageGroup: filters.ageGroup } : {}),
    ...(filters.groupSize ? { groupSize: filters.groupSize } : {}),
    ...(filters.experience ? { experience: filters.experience } : {}),
  };
}

export async function getStats(filters: Filters): Promise<Stats> {
  const [responses, versions] = await Promise.all([
    prisma.surveyResponse.findMany({
      where: whereFromFilters(filters),
      orderBy: { submittedAt: "asc" },
      select: {
        id: true,
        submittedAt: true,
        completionSeconds: true,
        answers: {
          select: {
            questionId: true,
            selectedOptions: true,
            textValue: true,
            otherText: true,
          },
        },
      },
    }),
    getAllQuestionVersions(),
  ]);

  const total = responses.length;

  // --- submissions by day, with empty days filled in ------------------------
  const dayCounts = new Map<string, number>();
  for (const response of responses) {
    const key = response.submittedAt.toISOString().slice(0, 10);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const byDay: Array<{ date: string; count: number }> = [];
  if (responses.length > 0) {
    const first = new Date(responses[0].submittedAt);
    const last = new Date(responses[responses.length - 1].submittedAt);
    const cursor = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()),
    );
    const end = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
    // A gap day is real information ("nobody answered"), so plot it as zero.
    while (cursor.getTime() <= end) {
      const key = cursor.toISOString().slice(0, 10);
      byDay.push({ date: key, count: dayCounts.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  // --- completion time ------------------------------------------------------
  const durations = responses
    .map((response) => response.completionSeconds)
    .filter((value): value is number => typeof value === "number" && value > 0)
    .sort((a, b) => a - b);

  const averageCompletionSeconds =
    durations.length > 0
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null;

  // The mean is easily dragged by a tab left open overnight; show both.
  const medianCompletionSeconds =
    durations.length > 0
      ? durations.length % 2 === 1
        ? durations[(durations.length - 1) / 2]
        : Math.round(
            (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2,
          )
      : null;

  // --- index answers by question version -----------------------------------
  const answersByQuestion = new Map<
    string,
    Array<{
      responseId: string;
      submittedAt: Date;
      selectedOptions: string[];
      textValue: string | null;
      otherText: string | null;
    }>
  >();

  for (const response of responses) {
    for (const answer of response.answers) {
      const bucket = answersByQuestion.get(answer.questionId);
      const entry = {
        responseId: response.id,
        submittedAt: response.submittedAt,
        selectedOptions: answer.selectedOptions,
        textValue: answer.textValue,
        otherText: answer.otherText,
      };
      if (bucket) bucket.push(entry);
      else answersByQuestion.set(answer.questionId, [entry]);
    }
  }

  // --- distributions --------------------------------------------------------
  const distributions: QuestionDistribution[] = [];
  const openText: OpenTextQuestion[] = [];
  let archivedWithData = 0;

  for (const question of versions) {
    const bucket = answersByQuestion.get(question.id) ?? [];

    if (question.status !== "live" && bucket.length > 0) archivedWithData += 1;

    // A superseded version with no answers is just clutter.
    if (question.status !== "live" && bucket.length === 0) continue;

    if (question.type === "text") {
      const entries: OpenTextEntry[] = bucket
        .filter((entry) => entry.textValue?.trim())
        .map((entry) => ({
          responseId: entry.responseId,
          submittedAt: entry.submittedAt.toISOString(),
          value: entry.textValue!.trim(),
        }))
        .reverse();

      openText.push({
        id: question.id,
        number: question.number,
        version: question.version,
        versioned: question.versioned,
        status: question.status,
        text: question.text,
        entries,
      });
      continue;
    }

    const counts = new Map<string, number>(
      question.options.map((option) => [option.label, 0]),
    );
    const otherTexts: string[] = [];
    let answered = 0;

    for (const entry of bucket) {
      if (entry.selectedOptions.length === 0) continue;
      answered += 1;
      for (const label of entry.selectedOptions) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      const other = entry.otherText?.trim();
      if (other) otherTexts.push(other);
    }

    distributions.push({
      id: question.id,
      number: question.number,
      version: question.version,
      versioned: question.versioned,
      status: question.status,
      text: question.text,
      type: question.type,
      answered,
      // Percentages are of respondents, not of picks, so a multi-select column
      // reads as "63% of teachers chose this" and the total may exceed 100%.
      options: question.options.map((option) => {
        const count = counts.get(option.label) ?? 0;
        return {
          label: option.label,
          count,
          percent: answered > 0 ? Math.round((count / answered) * 1000) / 10 : 0,
        };
      }),
      otherTexts,
    });
  }

  // --- filter dropdown contents --------------------------------------------
  // Drawn from the live q1-q4 options rather than from the data, so a filter
  // never silently disappears just because nobody has picked it yet.
  const filterOptions: Record<string, string[]> = {};
  for (const [key, field] of [
    ["q1", "frameworkType"],
    ["q2", "ageGroup"],
    ["q3", "groupSize"],
    ["q4", "experience"],
  ] as const) {
    const question = versions.find(
      (candidate) => candidate.lineageKey === key && candidate.status === "live",
    );
    filterOptions[field] = (question?.options ?? []).map((option) => option.label);
  }

  return {
    total,
    byDay,
    averageCompletionSeconds,
    medianCompletionSeconds,
    distributions,
    openText,
    filterOptions,
    appliedFilters: filters,
    archivedWithData,
  };
}

/**
 * One row per response, one column per question version, in questionnaire
 * order. A version only ever has values for the responses collected while it
 * was live, so an edit shows up as one column ending and the next beginning.
 * Multi-select answers are joined with " | " so a cell stays a single field.
 */
export async function buildCsv(filters: Filters): Promise<string> {
  const [responses, versions] = await Promise.all([
    prisma.surveyResponse.findMany({
      where: whereFromFilters(filters),
      orderBy: { submittedAt: "asc" },
      include: { answers: true },
    }),
    getAllQuestionVersions(),
  ]);

  const header = [
    "response_id",
    "submitted_at",
    "survey_version",
    "completion_seconds",
    ...versions.map((question) => {
      const label = `${question.number}. ${question.text}`;
      // Only disambiguate where it is actually ambiguous.
      return question.versioned ? `${label} [نسخة ${question.version}]` : label;
    }),
  ];

  const rows = responses.map((response) => {
    const byQuestion = new Map(
      response.answers.map((answer) => [answer.questionId, answer]),
    );
    return [
      response.id,
      response.submittedAt.toISOString(),
      response.surveyVersion,
      response.completionSeconds?.toString() ?? "",
      ...versions.map((question) => {
        const answer = byQuestion.get(question.id);
        if (!answer) return "";
        if (answer.questionType === "text") return answer.textValue ?? "";
        const labels = [...answer.selectedOptions];
        // Keep the typed text next to the option it belongs to.
        if (answer.otherText) {
          const index = labels.findIndex((label) => label.includes("__________"));
          if (index >= 0) labels[index] = `${labels[index]} ${answer.otherText}`;
          else labels.push(answer.otherText);
        }
        return labels.join(" | ");
      }),
    ];
  });

  const escape = (value: string): string =>
    /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const lines = [header, ...rows].map((row) => row.map(escape).join(","));

  // BOM so Excel opens the Arabic as UTF-8 rather than mojibake.
  return `﻿${lines.join("\r\n")}\r\n`;
}
