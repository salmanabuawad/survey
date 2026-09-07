import type { QuestionType } from "./survey-content";

export type { QuestionType };

export type QuestionStatus = "live" | "archived" | "deleted";

export interface RuntimeOption {
  label: string;
  /** Reveals a free-text input when picked; label keeps its underscores. */
  other?: boolean;
}

/** One *version* of a question, as stored and as rendered. */
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
}

export interface RuntimeSection {
  id: string;
  position: number;
  title: string;
  questions: RuntimeQuestion[];
}

/** What the public survey renders: live questions only, in order. */
export interface Questionnaire {
  sections: RuntimeSection[];
  questions: RuntimeQuestion[];
  totalQuestions: number;
}

export function isOtherOption(option: RuntimeOption): boolean {
  return option.other === true;
}
