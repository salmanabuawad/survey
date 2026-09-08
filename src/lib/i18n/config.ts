/**
 * Locale configuration.
 *
 * Arabic is the source language: it is what Inas approved, what
 * `survey-content.ts` locks, and what every other locale falls back to when a
 * string has not been translated yet. It is never itself a translation.
 */

export const LOCALES = ["ar", "he", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** The language the questionnaire was written in. Never a translation target. */
export const SOURCE_LOCALE: Locale = "ar";

/** Locales an admin can supply translations for. */
export const TRANSLATION_LOCALES = LOCALES.filter(
  (locale) => locale !== SOURCE_LOCALE,
);

export const LOCALE_META: Record<
  Locale,
  { dir: "rtl" | "ltr"; label: string; englishName: string; htmlLang: string }
> = {
  ar: { dir: "rtl", label: "العربية", englishName: "Arabic", htmlLang: "ar" },
  he: { dir: "rtl", label: "עברית", englishName: "Hebrew", htmlLang: "he" },
  en: { dir: "ltr", label: "English", englishName: "English", htmlLang: "en" },
};

export function isLocale(value: string | undefined): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return LOCALE_META[locale].dir;
}

/**
 * Picks the best locale from an Accept-Language header.
 *
 * Deliberately simple: match the primary subtag, honour q-weights, fall back to
 * the source language. "he-IL" matches "he"; anything unknown lands on Arabic.
 */
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return SOURCE_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return {
        // "he-IL" -> "he"; Hebrew also still travels as the legacy tag "iw".
        primary: tag.trim().toLowerCase().split("-")[0],
        q: q === undefined ? 1 : Number.parseFloat(q) || 0,
      };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const entry of ranked) {
    const primary = entry.primary === "iw" ? "he" : entry.primary;
    if (isLocale(primary)) return primary;
  }

  return SOURCE_LOCALE;
}

/**
 * Stable option identifier, derived rather than stored so the locked source
 * file stays untouched. Answers reference these, not label text — otherwise a
 * Hebrew answer would count as a different option from the Arabic one.
 */
export function optionId(questionKey: string, index: number): string {
  return `${questionKey}o${index + 1}`;
}
