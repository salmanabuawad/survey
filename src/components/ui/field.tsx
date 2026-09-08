import * as React from "react";

import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-base text-ink-700 placeholder:text-ink-400/70 transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:outline-none focus-visible:outline-none disabled:opacity-50";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, "min-h-12", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(base, "min-h-32 resize-y leading-loose", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    // A native select is the most reliable RTL control on Android and iOS, and
    // it comes with keyboard and screen-reader behaviour for free.
    className={cn(base, "min-h-12 cursor-pointer appearance-none pl-10", className)}
    {...props}
  />
));
Select.displayName = "Select";
