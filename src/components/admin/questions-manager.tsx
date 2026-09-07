"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  draftFrom,
  QuestionEditor,
  type QuestionDraft,
} from "@/components/admin/question-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RuntimeQuestion } from "@/lib/survey-types";

interface SectionRow {
  id: string;
  position: number;
  title: string;
}

const TYPE_LABEL: Record<string, string> = {
  single: "اختيار واحد",
  multiple: "اختيار متعدد",
  text: "إجابة مفتوحة",
};

export function QuestionsManager({
  initialQuestions,
  sections,
}: {
  initialQuestions: RuntimeQuestion[];
  sections: SectionRow[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingSectionId, setAddingSectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const live = useMemo(
    () => questions.filter((question) => question.status === "live"),
    [questions],
  );
  const history = useMemo(
    () => questions.filter((question) => question.status !== "live"),
    [questions],
  );

  const bySection = useMemo(() => {
    const map = new Map<string, RuntimeQuestion[]>();
    for (const question of live) {
      const bucket = map.get(question.sectionId);
      if (bucket) bucket.push(question);
      else map.set(question.sectionId, [question]);
    }
    for (const bucket of map.values()) bucket.sort((a, b) => a.position - b.position);
    return map;
  }, [live]);

  async function refresh(message?: string) {
    const response = await fetch("/api/admin/questions");
    if (response.ok) {
      const body = (await response.json()) as { questions: RuntimeQuestion[] };
      setQuestions(body.questions);
    }
    setEditingId(null);
    setAddingSectionId(null);
    setDraft(null);
    setError(null);
    if (message) setNotice(message);
    // The public survey reads the same rows; drop its cached render.
    router.refresh();
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);

    const payload = {
      sectionId: draft.sectionId,
      type: draft.type,
      text: draft.text,
      hint: draft.hint.trim() ? draft.hint.trim() : null,
      options: draft.type === "text" ? [] : draft.options.filter((o) => o.label.trim()),
    };

    try {
      const response = await fetch(
        editingId ? `/api/admin/questions/${editingId}` : "/api/admin/questions",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json().catch(() => null)) as
        | { message?: string; versioned?: boolean }
        | null;

      if (!response.ok) throw new Error(body?.message ?? "تعذر الحفظ");

      await refresh(
        editingId
          ? body?.versioned
            ? "تم إنشاء نسخة جديدة من السؤال، والنسخة السابقة محفوظة مع إجاباتها."
            : "تم تحديث موضع السؤال."
          : "تمت إضافة السؤال.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  async function remove(question: RuntimeQuestion) {
    const confirmed = window.confirm(
      `حذف السؤال «${question.text}»؟\n\nلن يظهر للمعلمات بعد الآن، وستبقى الإجابات التي جُمعت عليه محفوظة في النتائج وملف CSV.`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("تعذر الحذف");
      await refresh("تم حذف السؤال، وإجاباته السابقة محفوظة.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر الحذف");
    } finally {
      setBusy(false);
    }
  }

  async function restore(question: RuntimeQuestion) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/questions/${question.id}/restore`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "تعذر الاسترجاع");
      await refresh("تم استرجاع السؤال.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر الاسترجاع");
    } finally {
      setBusy(false);
    }
  }

  async function move(question: RuntimeQuestion, delta: number) {
    const siblings = bySection.get(question.sectionId) ?? [];
    const index = siblings.findIndex((item) => item.id === question.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= siblings.length) return;

    const reordered = [...siblings];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    // Send every live question so positions are rewritten densely everywhere.
    const ordered = sections.flatMap((section) =>
      (section.id === question.sectionId
        ? reordered
        : (bySection.get(section.id) ?? [])
      ).map((item) => ({ id: item.id, sectionId: section.id })),
    );

    setBusy(true);
    try {
      const response = await fetch("/api/admin/questions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered }),
      });
      if (!response.ok) throw new Error("تعذر تغيير الترتيب");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تغيير الترتيب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-800 sm:text-3xl">إدارة الأسئلة</h1>
          <p className="mt-1 text-sm text-ink-500">
            {live.length} سؤالاً حالياً في {sections.length} أقسام
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/dashboard"
            className="inline-flex min-h-12 items-center rounded-full border border-cream-200 bg-white/80 px-6 text-base font-semibold text-ink-600 hover:border-teal-300"
          >
            النتائج
          </a>
        </div>
      </header>

      <div className="mb-6 rounded-xl2 border border-teal-200 bg-teal-50 p-4 text-sm leading-loose text-teal-800">
        تعديل نص سؤال أو خياراته <strong>لا يغيّر</strong> الإجابات المجموعة سابقاً:
        تُؤرشف النسخة الحالية محتفظةً بكل إجاباتها، وتُنشأ نسخة جديدة تبدأ بصفر إجابات.
        تظهر كل نسخة في لوحة النتائج بشكل منفصل.
      </div>

      {notice ? (
        <p
          role="status"
          className="mb-5 rounded-xl2 border border-violet-200 bg-violet-50 p-4 text-sm font-medium text-violet-800"
        >
          {notice}
        </p>
      ) : null}

      {error && !draft ? (
        <p
          role="alert"
          className="mb-5 rounded-xl2 border border-coral-200 bg-coral-50 p-4 text-sm font-medium text-coral-700"
        >
          {error}
        </p>
      ) : null}

      {/* --- live questions, by section ------------------------------------ */}
      <div className="space-y-6">
        {sections.map((section) => {
          const items = bySection.get(section.id) ?? [];
          return (
            <Card key={section.id}>
              <CardContent className="pt-5 sm:pt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="wrap-anywhere text-base font-bold text-ink-800">
                    {section.title}
                  </h2>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(null);
                      setAddingSectionId(section.id);
                      setDraft(draftFrom(null, section.id));
                      setNotice(null);
                    }}
                  >
                    إضافة سؤال
                  </Button>
                </div>

                {items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-ink-400">
                    لا توجد أسئلة في هذا القسم.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {items.map((question, index) => (
                      <li key={question.id}>
                        {editingId === question.id && draft ? (
                          <QuestionEditor
                            draft={draft}
                            onChange={setDraft}
                            sections={sections}
                            editing={question}
                            onSave={save}
                            onCancel={() => {
                              setEditingId(null);
                              setDraft(null);
                              setError(null);
                            }}
                            busy={busy}
                            error={error}
                          />
                        ) : (
                          <div className="rounded-xl border border-cream-200 bg-white/70 p-3.5 sm:p-4">
                            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                              <span className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 px-2 text-sm font-bold text-teal-800 tabular-nums">
                                {question.number}
                              </span>
                              <p className="wrap-anywhere flex-1 text-base font-semibold text-ink-800">
                                {question.text}
                              </p>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2 ps-11">
                              <Badge
                                tone={question.type === "multiple" ? "violet" : "teal"}
                              >
                                {TYPE_LABEL[question.type]}
                              </Badge>
                              {question.versioned ? (
                                <Badge tone="coral">نسخة {question.version}</Badge>
                              ) : null}
                              {question.type !== "text" ? (
                                <span className="text-sm text-ink-400">
                                  {question.options.length} خيارات
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5 ps-11">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busy}
                                onClick={() => {
                                  setAddingSectionId(null);
                                  setEditingId(question.id);
                                  setDraft(draftFrom(question, question.sectionId));
                                  setNotice(null);
                                  setError(null);
                                }}
                              >
                                تعديل
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-3"
                                disabled={busy || index === 0}
                                onClick={() => move(question, -1)}
                                aria-label={`نقل السؤال ${question.number} للأعلى`}
                              >
                                ▲
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-3"
                                disabled={busy || index === items.length - 1}
                                onClick={() => move(question, 1)}
                                aria-label={`نقل السؤال ${question.number} للأسفل`}
                              >
                                ▼
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-coral-600"
                                disabled={busy}
                                onClick={() => remove(question)}
                              >
                                حذف
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {addingSectionId === section.id && draft ? (
                  <div className="mt-3">
                    <QuestionEditor
                      draft={draft}
                      onChange={setDraft}
                      sections={sections}
                      editing={null}
                      onSave={save}
                      onCancel={() => {
                        setAddingSectionId(null);
                        setDraft(null);
                        setError(null);
                      }}
                      busy={busy}
                      error={error}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* --- archived and deleted ------------------------------------------ */}
      {history.length > 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-5 sm:pt-6">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              aria-expanded={showHistory}
              className="flex w-full items-center justify-between gap-3 text-start"
            >
              <span className="text-base font-bold text-ink-800">
                النسخ السابقة والأسئلة المحذوفة
              </span>
              <Badge tone="neutral">{history.length}</Badge>
            </button>

            {showHistory ? (
              <ul className="mt-4 space-y-2.5">
                {history.map((question) => (
                  <li
                    key={question.id}
                    className="rounded-xl border border-cream-200 bg-cream-50 p-3.5"
                  >
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                      <span className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 px-2 text-sm font-bold text-ink-500 tabular-nums">
                        {question.number}
                      </span>
                      <p className="wrap-anywhere flex-1 text-sm text-ink-600">
                        {question.text}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 ps-11">
                      <Badge tone="neutral">
                        {question.status === "deleted" ? "محذوف" : "مؤرشف"} · نسخة{" "}
                        {question.version}
                      </Badge>
                      <span className="text-xs text-ink-400">
                        إجاباته السابقة محفوظة
                      </span>
                      {question.status === "deleted" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => restore(question)}
                        >
                          استرجاع
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
