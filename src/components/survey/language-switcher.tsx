"use client";

import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/**
 * Switching language is a plain navigation to the other prefix.
 *
 * A teacher who switches mid-questionnaire keeps her answers: the saved draft is
 * keyed by question id and option id, both of which are the same in every
 * language. Only the words on screen change.
 */
export function LanguageSwitcher({
  current,
  available,
  className,
}: {
  current: Locale;
  available: Locale[];
  className?: string;
}) {
  if (available.length < 2) return null;

  const messages = getMessages(current);

  return (
    <nav
      aria-label={messages.language.switcherLabel}
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {available.map((locale) => {
        const active = locale === current;
        return (
          <a
            key={locale}
            href={`/${locale}`}
            hrefLang={locale}
            lang={locale}
            dir={LOCALE_META[locale].dir}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-semibold transition-colors",
              active
                ? "bg-teal-600 text-white"
                : "border border-cream-200 bg-white/80 text-ink-500 hover:border-teal-300 hover:text-teal-800",
            )}
          >
            {LOCALE_META[locale].label}
          </a>
        );
      })}
    </nav>
  );
}
