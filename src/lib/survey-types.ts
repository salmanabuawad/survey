import type { Locale } from "./i18n/config";
import type { QuestionType } from "./survey-content";

export type { QuestionType };

export type QuestionStatus = "live" | "archived" | "deleted";

export interface RuntimeOption {
  /**
   * Stable across languages and across wording edits. Answers reference this,
   * never the label — otherwise the same choice made in Hebrew and in Arabic
   * would count as two different options.
   */
  id: string;
  /** Resolved for the requested locale, falling back to the source language. */
  label: string;
  /** Reveals a free-text input when picked; the label keeps its underscores. */
  other?: boolean;
}

/** One *version* of a question, resolved into one language. */
export interface RuntimeQuestion {
  /** Primary key of this version. Answers point at this, not at the lineage. */
  id: string;
  lineageId: string;
  lineageKey: string;
  version: number;
  /** True when more than one version of this lineage exists. */
  versioned: boolean;
  /** Display number, derived from section and position order at render time. */
  number: number;
  sectionId: string;
  position: number;
  type: QuestionType;
  text: string;
  hint: string | null;
  options: RuntimeOption[];
  status: QuestionStatus;
  /** The language this was actually rendered in, after any fallback. */
  locale: Locale;
  /** False when the requested locale had no translation and Arabic was used. */
  translated: boolean;
}

export interface RuntimeSection {
  id: string;
  position: number;
  title: string;
  translated: boolean;
  questions: RuntimeQuestion[];
}

/** What the public survey renders: live questions only, in order, one language. */
export interface Questionnaire {
  locale: Locale;
  sections: RuntimeSection[];
  questions: RuntimeQuestion[];
  totalQuestions: number;
  /** How many questions still show the source language in this locale. */
  untranslatedCount: number;
}

export interface TranslationCoverage {
  locale: Locale;
  /** Questions carrying a translation for every option and the question text. */
  complete: number;
  /** Questions with a translation that is missing something or needs review. */
  partial: number;
  /** Questions with no translation at all. */
  missing: number;
  total: number;
  needsReview: number;
}
