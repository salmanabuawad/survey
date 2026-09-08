import * as React from "react";

import { cn } from "@/lib/utils";

type Tone = "teal" | "violet" | "coral" | "neutral";

const tones: Record<Tone, string> = {
  teal: "bg-teal-100 text-teal-800 ring-1 ring-teal-200/80",
  violet: "bg-violet-100 text-violet-800 ring-1 ring-violet-200/80",
  coral: "bg-coral-100 text-coral-700 ring-1 ring-coral-200/80",
  neutral: "bg-cream-100 text-ink-500 ring-1 ring-cream-200/80",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-6",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
