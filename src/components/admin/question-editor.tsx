"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import type { QuestionType, RuntimeOption, RuntimeQuestion } from "@/lib/survey-types";
import { cn } from "@/lib/utils";

export interface QuestionDraft {
  sectionId: string;
  type: QuestionType;
  text: string;
  hint: string;
  options: RuntimeOption[];
}

export function draftFrom(
  question: RuntimeQuestion | null,
  fallbackSectionId: string,
): QuestionDraft {
  return {
    sectionId: question?.sectionId ?? fallbackSectionId,
    type: question?.type ?? "single",
    text: question?.text ?? "",
    hint: question?.hint ?? "",
    options: question ? question.options.map((o) => ({ ...o })) : [{ label: "" }, { label: "" }],
  };
}

/** True when saving this draft would fork a new version rather than just move it. */
export function wouldFork(question: RuntimeQuestion, draft: QuestionDraft): boolean {
  const normalise = (options: RuntimeOption[]) =>
    JSON.stringify(
      options
        .map((o) => ({
          label: o.label.trim(),
          ...(o.other || o.label.includes("__________") ? { other: true } : {}),
        }))
        .filter((o) => o.label.length > 0),
    );

  return (
    question.text !== draft.text.trim() ||
    (question.hint ?? "") !== draft.hint.trim() ||
    question.type !== draft.type ||
    normalise(question.options) !== normalise(draft.type === "text" ? [] : draft.options)
  );
}

interface QuestionEditorProps {
  draft: QuestionDraft;
  onChange: (draft: QuestionDraft) => void;
  sections: Array<{ id: string; title: string }>;
  /** Null when adding a brand-new question. */
  editing: RuntimeQuestion | null;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}

export function QuestionEditor({
  draft,
  onChange,
  sections,
  editing,
  onSave,
  onCancel,
  busy,
  error,
}: QuestionEditorProps) {
  const [confirmFork, setConfirmFork] = useState(false);
  const forking = editing ? wouldFork(editing, draft) : false;

  function setOption(index: number, next: Partial<RuntimeOption>) {
    const options = draft.options.map((option, i) =>
      i === index ? { ...option, ...next } : option,
    );
    onChange({ ...draft, options });
  }

  function addOption() {
    onChange({ ...draft, options: [...draft.options, { label: "" }] });
  }

  function removeOption(index: number) {
    onChange({ ...draft, options: draft.options.filter((_, i) => i !== index) });
  }

  function moveOption(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= draft.options.length) return;
    const options = [...draft.options];
    [options[index], options[target]] = [options[target], options[index]];
    onChange({ ...draft, options });
  }

  return (
    <div className="space-y-4 rounded-xl2 border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="q-section" className="block text-sm font-medium text-ink-600">
            القسم
          </label>
          <Select
            id="q-section"
            value={draft.sectionId}
            onChange={(event) => onChange({ ...draft, sectionId: event.target.value })}
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="q-type" className="block text-sm font-medium text-ink-600">
            نوع السؤال
          </label>
          <Select
            id="q-type"
            value={draft.type}
            onChange={(event) =>
              onChange({ ...draft, type: event.target.value as QuestionType })
            }
          >
            <option value="single">اختيار واحد</option>
            <option value="multiple">اختيار متعدد</option>
            <option value="text">إجابة مفتوحة</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="q-text" className="block text-sm font-medium text-ink-600">
          نص السؤال
        </label>
        <Textarea
          id="q-text"
          value={draft.text}
          onChange={(event) => onChange({ ...draft, text: event.target.value })}
          rows={3}
          className="min-h-24 bg-white"
          maxLength={600}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="q-hint" className="block text-sm font-medium text-ink-600">
          سطر إرشادي <span className="font-normal text-ink-400">(اختياري)</span>
        </label>
        <Input
          id="q-hint"
          value={draft.hint}
          onChange={(event) => onChange({ ...draft, hint: event.target.value })}
          placeholder="مثال: يمكن اختيار أكثر من إجابة:"
          className="bg-white"
          maxLength={300}
        />
      </div>

      {draft.type !== "text" ? (
        <fieldset className="space-y-2 border-0 p-0">
          <legend className="mb-2 text-sm font-medium text-ink-600">
            الخيارات
            <span className="ms-2 font-normal text-ink-400">
              أضف <code dir="ltr" className="rounded bg-cream-100 px-1">__________</code>{" "}
              في نهاية الخيار ليظهر حقل كتابة
            </span>
          </legend>

          {draft.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option.label}
                onChange={(event) => setOption(index, { label: event.target.value })}
                aria-label={`الخيار ${index + 1}`}
                className="flex-1 bg-white"
                maxLength={500}
              />
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-10 px-2"
                  onClick={() => moveOption(index, -1)}
                  disabled={index === 0}
                  aria-label={`نقل الخيار ${index + 1} للأعلى`}
                >
                  ▲
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-10 px-2"
                  onClick={() => moveOption(index, 1)}
                  disabled={index === draft.options.length - 1}
                  aria-label={`نقل الخيار ${index + 1} للأسفل`}
                >
                  ▼
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-10 px-2 text-coral-600"
                  onClick={() => removeOption(index)}
                  disabled={draft.options.length <= 2}
                  aria-label={`حذف الخيار ${index + 1}`}
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}

          <Button variant="secondary" size="sm" onClick={addOption} className="mt-1">
            إضافة خيار
          </Button>
        </fieldset>
      ) : (
        <p className="rounded-xl border border-cream-200 bg-white p-3 text-sm text-ink-500">
          سؤال بإجابة مفتوحة — لا يحتاج إلى خيارات.
        </p>
      )}

      {/* Editing live wording forks a version; make that explicit before saving. */}
      {editing && forking ? (
        <label className="flex items-start gap-3 rounded-xl border border-coral-200 bg-coral-50 p-3.5 text-sm text-coral-700">
          <input
            type="checkbox"
            checked={confirmFork}
            onChange={(event) => setConfirmFork(event.target.checked)}
            className="mt-1 size-5 shrink-0 accent-coral-500"
          />
          <span>
            سيتم أرشفة النسخة الحالية مع الاحتفاظ بكل الإجابات التي جُمعت عليها، وإنشاء
            نسخة جديدة تبدأ بصفر إجابات. أوافق على ذلك.
          </span>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-coral-600">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onSave}
          disabled={busy || (editing !== null && forking && !confirmFork)}
          className={cn(busy && "opacity-60")}
        >
          {busy ? "جارٍ الحفظ…" : editing ? "حفظ التعديل" : "إضافة السؤال"}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}
