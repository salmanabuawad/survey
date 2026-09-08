"use client";

import { useId } from "react";

import { BidiText } from "@/components/survey/bidi-text";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/field";
import { MAX_OTHER_LENGTH, MAX_TEXT_LENGTH } from "@/lib/limits";
import { FREE_TEXT_PRIVACY_HINT } from "@/lib/survey-content";
import type { RuntimeQuestion } from "@/lib/survey-types";
import { cn } from "@/lib/utils";
import type { AnswerValue } from "@/lib/validation";

interface QuestionCardProps {
  question: RuntimeQuestion;
  answer: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Set once the respondent tries to leave a step with this question empty. */
  invalid?: boolean;
}

export function QuestionCard({
  question,
  answer,
  onChange,
  invalid = false,
}: QuestionCardProps) {
  const groupId = useId();
  const selected = answer?.selected ?? [];
  const otherOption = question.options.find((option) => option.other);
  const otherPicked = otherOption ? selected.includes(otherOption.label) : false;
  const errorId = `${groupId}-error`;

  function toggle(label: string) {
    if (question.type === "single") {
      onChange({ ...answer, selected: [label] });
      return;
    }
    const next = selected.includes(label)
      ? selected.filter((value) => value !== label)
      : [...selected, label];
    onChange({ ...answer, selected: next });
  }

  return (
    <fieldset
      className="animate-rise border-0 p-0"
      aria-describedby={invalid ? errorId : undefined}
    >
      <legend className="mb-1 flex w-full flex-wrap items-start gap-x-3 gap-y-2">
        <span className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-bl from-teal-200 to-teal-100 px-2 text-sm font-bold text-teal-800 shadow-[inset_0_0_0_1px_rgba(19,95,89,0.12)] tabular-nums">
          {question.number}
        </span>
        <span className="wrap-anywhere flex-1 text-base font-semibold text-ink-800 sm:text-lg">
          <BidiText>{question.text}</BidiText>
        </span>
      </legend>

      <div className="mb-4 flex flex-wrap items-center gap-2 ps-11">
        {question.hint ? (
          // Instruction line carried over from the questionnaire itself.
          <span className="text-sm font-medium text-teal-700">{question.hint}</span>
        ) : question.type === "multiple" ? (
          <Badge tone="violet">اختيار متعدد</Badge>
        ) : null}
      </div>

      {question.type === "text" ? (
        <div className="ps-0 sm:ps-11">
          <Textarea
            id={groupId}
            value={answer?.text ?? ""}
            onChange={(event) => onChange({ ...answer, text: event.target.value })}
            maxLength={MAX_TEXT_LENGTH}
            aria-label={question.text}
            aria-invalid={invalid || undefined}
            className={cn(invalid && "border-coral-400")}
            rows={5}
          />
          <p className="mt-2 text-sm text-ink-400">{FREE_TEXT_PRIVACY_HINT}</p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:ps-11">
          {question.options.map((option) => {
            const checked = selected.includes(option.label);
            const inputId = `${groupId}-${option.label}`;
            return (
              <div key={option.label}>
                <label
                  htmlFor={inputId}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-[border-color,background-color,box-shadow] duration-150 sm:p-4",
                    "min-h-14", // large tap target
                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500 has-[:focus-visible]:ring-offset-2",
                    checked
                      ? "border-teal-400 bg-gradient-to-l from-teal-50 to-violet-50/70 shadow-[0_0_0_1px_rgba(56,181,168,0.35)]"
                      : "border-cream-200 bg-white/70 hover:border-teal-200 hover:bg-teal-50/40",
                    invalid && !checked && "border-coral-200",
                  )}
                >
                  <input
                    id={inputId}
                    type={question.type === "single" ? "radio" : "checkbox"}
                    name={question.type === "single" ? groupId : inputId}
                    checked={checked}
                    onChange={() => toggle(option.label)}
                    aria-invalid={invalid || undefined}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center border-2 transition-colors",
                      question.type === "single" ? "rounded-full" : "rounded-md",
                      checked
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-cream-200 bg-white text-transparent",
                    )}
                  >
                    {question.type === "single" ? (
                      <span
                        className={cn(
                          "size-2 rounded-full bg-white",
                          !checked && "opacity-0",
                        )}
                      />
                    ) : (
                      <svg viewBox="0 0 12 12" className="size-3.5" fill="none">
                        <path
                          d="M2.2 6.2 L4.8 8.7 L9.8 3.3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={cn(
                      "wrap-anywhere flex-1 text-base leading-relaxed",
                      checked ? "font-semibold text-teal-900" : "text-ink-700",
                    )}
                  >
                    <BidiText>{option.label}</BidiText>
                  </span>
                </label>

                {/* The label above keeps its underscores; this is where they get filled. */}
                {option.other && otherPicked ? (
                  <div className="mt-2 ps-3 sm:ps-4">
                    <Input
                      value={answer?.other ?? ""}
                      onChange={(event) =>
                        onChange({ ...answer, other: event.target.value })
                      }
                      aria-label={option.label}
                      autoComplete="off"
                      maxLength={MAX_OTHER_LENGTH}
                      className={cn(
                        "bg-cream-50",
                        invalid && !(answer?.other ?? "").trim() && "border-coral-400",
                      )}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {invalid ? (
        <p
          id={errorId}
          role="alert"
          className="mt-3 text-sm font-medium text-coral-600 sm:ps-11"
        >
          {question.type === "text"
            ? "يرجى كتابة إجابتك للمتابعة."
            : otherPicked
              ? "يرجى تحديد الإجابة في الخانة المخصصة."
              : "يرجى اختيار إجابة للمتابعة."}
        </p>
      ) : null}
    </fieldset>
  );
}
