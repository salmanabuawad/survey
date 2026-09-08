import enTranslation from "../../../content/translations/en.json";
import heTranslation from "../../../content/translations/he.json";
import { SURVEY_INTRO, SURVEY_THANKS } from "../survey-content";
import type { Locale } from "./config";

/**
 * The introduction and thank-you text per language.
 *
 * These are research content, not interface copy: the Arabic is Inas's, locked
 * and verified, and everything else is a translation of it. They are imported
 * statically so they are bundled rather than read from disk at runtime.
 *
 * Any empty string falls back to the Arabic, which is what makes a
 * partially-translated language usable instead of blank.
 */

export interface SurveyCopy {
  intro: {
    title: string;
    subtitle: string;
    salutation: string;
    paragraphs: string[];
    notice: string;
  };
  thanks: {
    heading: string;
    lead: string;
    bodyBefore: string;
    bodyEmphasis: string;
  };
}

interface RawCopy {
  intro?: Partial<SurveyCopy["intro"]>;
  thanks?: Partial<SurveyCopy["thanks"]>;
}

const SOURCE: SurveyCopy = {
  intro: {
    title: SURVEY_INTRO.title,
    subtitle: SURVEY_INTRO.subtitle,
    salutation: SURVEY_INTRO.salutation,
    paragraphs: [...SURVEY_INTRO.paragraphs],
    notice: SURVEY_INTRO.notice,
  },
  thanks: {
    heading: SURVEY_THANKS.heading,
    lead: SURVEY_THANKS.lead,
    bodyBefore: SURVEY_THANKS.bodyBefore,
    bodyEmphasis: SURVEY_THANKS.bodyEmphasis,
  },
};

const RAW: Partial<Record<Locale, RawCopy>> = {
  he: heTranslation as RawCopy,
  en: enTranslation as RawCopy,
};

function pick(translated: string | undefined, source: string): string {
  return translated && translated.trim().length > 0 ? translated : source;
}

export function getSurveyCopy(locale: Locale): SurveyCopy {
  const raw = RAW[locale];
  if (!raw) return SOURCE;

  const paragraphs = SOURCE.intro.paragraphs.map((source, index) =>
    pick(raw.intro?.paragraphs?.[index], source),
  );

  return {
    intro: {
      title: pick(raw.intro?.title, SOURCE.intro.title),
      subtitle: pick(raw.intro?.subtitle, SOURCE.intro.subtitle),
      salutation: pick(raw.intro?.salutation, SOURCE.intro.salutation),
      paragraphs,
      notice: pick(raw.intro?.notice, SOURCE.intro.notice),
    },
    thanks: {
      heading: pick(raw.thanks?.heading, SOURCE.thanks.heading),
      lead: pick(raw.thanks?.lead, SOURCE.thanks.lead),
      bodyBefore: pick(raw.thanks?.bodyBefore, SOURCE.thanks.bodyBefore),
      bodyEmphasis: pick(raw.thanks?.bodyEmphasis, SOURCE.thanks.bodyEmphasis),
    },
  };
}
