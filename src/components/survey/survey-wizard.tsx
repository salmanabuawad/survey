"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { QuestionCard } from "@/components/survey/question-card";
import { SurveyIntro } from "@/components/survey/survey-intro";
import { SurveyThanks } from "@/components/survey/survey-thanks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SURVEY_VERSION } from "@/lib/survey-content";
import type { Questionnaire } from "@/lib/survey-types";
import { isAnswered, isRequired, type AnswerValue } from "@/lib/validation";

const STORAGE_KEY = `kidsphere-survey:${SURVEY_VERSION}`;

type Phase = "intro" | "questions" | "done";

interface SavedState {
  /** Keyed by question version id. */
  answers: Record<string, AnswerValue>;
  /** Index into the flat question list, 0-based. */
  step: number;
  startedAt: number;
  phase: Phase;
}

/** One question per screen, advanced with التالي. */
export function SurveyWizard({ questionnaire }: { questionnaire: Questionnaire }) {
  const { sections, questions, totalQuestions } = questionnaire;

  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [restored, setRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const startedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);
  const headingRef = useRef<HTMLDivElement>(null);

  const knownIds = useMemo(
    () => new Set(questions.map((question) => question.id)),
    [questions],
  );

  /** Which section each question belongs to, and where each section starts. */
  const { sectionOf, firstStepOf } = useMemo(() => {
    const sectionOf = new Map<string, { title: string; index: number }>();
    const firstStepOf = new Map<string, number>();
    let index = 0;
    sections.forEach((section, sectionIndex) => {
      firstStepOf.set(section.id, index);
      for (const question of section.questions) {
        sectionOf.set(question.id, { title: section.title, index: sectionIndex });
        index += 1;
      }
    });
    return { sectionOf, firstStepOf };
  }, [sections]);

  // --- restore ------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedState;
        if (saved && typeof saved === "object" && saved.answers) {
          // An admin may have edited the questionnaire since this draft was
          // saved. Answers to versions that are no longer live are dropped
          // rather than submitted against wording that has moved on.
          const kept: Record<string, AnswerValue> = {};
          for (const [id, value] of Object.entries(saved.answers)) {
            if (knownIds.has(id)) kept[id] = value;
          }

          setAnswers(kept);
          setStep(
            Math.min(Math.max(saved.step ?? 0, 0), Math.max(questions.length - 1, 0)),
          );
          startedAtRef.current = saved.startedAt ?? Date.now();
          if (saved.phase === "questions") {
            setPhase("questions");
            setRestored(Object.keys(kept).length > 0);
          }
        }
      }
    } catch {
      // Private mode, disabled storage, or corrupt JSON — start fresh.
    }
    setHydrated(true);
  }, [knownIds, questions.length]);

  // --- autosave -----------------------------------------------------------
  useEffect(() => {
    if (!hydrated || phase === "done") return;
    try {
      const payload: SavedState = {
        answers,
        step,
        startedAt: startedAtRef.current,
        phase,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage full or unavailable; the form still works, just without resume.
    }
  }, [answers, step, phase, hydrated]);

  const answeredCount = useMemo(
    () => questions.filter((q) => isAnswered(q, answers[q.id])).length,
    [answers, questions],
  );

  const setAnswer = useCallback((id: string, value: AnswerValue) => {
    setAnswers((previous) => ({ ...previous, [id]: value }));
  }, []);

  function focusTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    headingRef.current?.focus();
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16" aria-busy="true">
        <div className="h-2 w-full animate-pulse rounded-full bg-cream-200" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center px-4">
        <Card className="w-full">
          <CardContent className="py-16 text-center text-ink-500">
            الاستبيان غير متاح حالياً.
          </CardContent>
        </Card>
      </main>
    );
  }

  if (phase === "done") return <SurveyThanks />;

  if (phase === "intro") {
    return (
      <SurveyIntro
        totalQuestions={totalQuestions}
        resumable={restored}
        onStart={() => {
          if (!restored) startedAtRef.current = Date.now();
          setPhase("questions");
        }}
      />
    );
  }

  const safeStep = Math.min(step, questions.length - 1);
  const question = questions[safeStep];
  const section = sectionOf.get(question.id);
  const blocked = isRequired(question) && !isAnswered(question, answers[question.id]);
  const isLast = safeStep === questions.length - 1;

  // Disabled buttons say nothing on their own. The one case a teacher could
  // find genuinely puzzling is picking "أخرى" and not yet typing anything —
  // she has selected something, yet التالي stays dim — so name it.
  const answer = answers[question.id];
  const otherPicked = (question.options ?? []).some(
    (option) => option.other && (answer?.selected ?? []).includes(option.label),
  );
  const blockedReason = !blocked
    ? null
    : otherPicked
      ? "يرجى تحديد الإجابة في الخانة المخصصة للمتابعة."
      : "اختاري إجابة للمتابعة.";

  function goNext() {
    if (blocked) return;
    if (!isLast) {
      setStep(safeStep + 1);
      focusTop();
    }
  }

  function goPrevious() {
    if (safeStep > 0) {
      setStep(safeStep - 1);
      focusTop();
    } else {
      setPhase("intro");
    }
  }

  async function submit() {
    if (submittedRef.current || submitting || blocked) return;

    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyVersion: SURVEY_VERSION,
          completionSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
          answers,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? "تعذر إرسال الاستبيان");
      }

      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Nothing to clean up if storage was never available.
      }
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      // Let the teacher try again rather than stranding a completed form.
      submittedRef.current = false;
      setSubmitError(error instanceof Error ? error.message : "تعذر إرسال الاستبيان");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-32 pt-8 sm:px-6 sm:pt-12">
      {/* --- header ------------------------------------------------------- */}
      <div
        ref={headingRef}
        tabIndex={-1}
        className="scroll-mt-4 outline-none"
        aria-live="polite"
      >
        <div className="mb-2 flex items-baseline justify-between gap-3 text-sm text-ink-500">
          <span className="rounded-full bg-teal-100 px-3 py-1 font-semibold text-teal-800">
            السؤال {safeStep + 1} من {questions.length}
          </span>
          {/* Forced LTR: bidi would otherwise reorder "0 / 27" into "27 / 0". */}
          <span dir="ltr" className="inline-block tabular-nums">
            {answeredCount} / {totalQuestions}
          </span>
        </div>

        <Progress
          value={answeredCount}
          max={totalQuestions}
          label={`تقدّمك في الاستبيان: ${answeredCount} من ${totalQuestions} سؤالاً`}
          className="mb-5"
        />

        {/* One dot per section, not per question — 27 would be unreadable.
            Each jumps to the first question of its section. */}
        <ol className="mb-6 flex flex-wrap gap-1.5" aria-label="أقسام الاستبيان">
          {sections.map((item, index) => {
            const complete =
              item.questions.some((q) => isAnswered(q, answers[q.id])) &&
              item.questions.every((q) => !isRequired(q) || isAnswered(q, answers[q.id]));
            const current = section?.index === index;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(firstStepOf.get(item.id) ?? 0);
                    focusTop();
                  }}
                  aria-current={current ? "step" : undefined}
                  aria-label={`${item.title}${complete ? " (مكتمل)" : ""}`}
                  className={
                    "h-2.5 rounded-full transition-all duration-300 " +
                    (current
                      ? "w-8 bg-teal-600"
                      : complete
                        ? "w-2.5 bg-teal-300 hover:w-5"
                        : "w-2.5 bg-cream-200 hover:w-5")
                  }
                />
              </li>
            );
          })}
        </ol>

        {/* The section title stays on screen so the question keeps its context. */}
        {section ? (
          <h1 className="wrap-anywhere text-xl font-bold text-ink-800 sm:text-2xl">
            {section.title}
          </h1>
        ) : null}
      </div>

      {restored ? (
        <div
          role="status"
          className="mt-4 rounded-xl2 border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800"
        >
          تم استرجاع إجاباتك السابقة على هذا الجهاز، يمكنك المتابعة من حيث توقفت.
        </div>
      ) : null}

      {/* --- the one question -------------------------------------------- */}
      <div className="mt-6">
        {/* Keyed by id so each question mounts fresh and replays the entry animation. */}
        <Card key={question.id}>
          <CardContent className="pt-5 sm:pt-7">
            <QuestionCard
              question={question}
              answer={answers[question.id]}
              onChange={(value) => setAnswer(question.id, value)}
            />
          </CardContent>
        </Card>
      </div>

      {submitError ? (
        <p
          role="alert"
          className="mt-6 rounded-xl2 border border-coral-200 bg-coral-50 p-4 text-sm font-medium text-coral-700"
        >
          {submitError}
        </p>
      ) : null}

      {/* --- navigation --------------------------------------------------- */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-teal-100 bg-white/90 shadow-[0_-12px_32px_-16px_rgba(19,75,71,0.22)] backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
          {blockedReason ? (
            <p className="mb-2 text-center text-sm text-ink-400" aria-live="polite">
              {blockedReason}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={goPrevious}
              className="flex-1 sm:flex-none"
            >
              السابق
            </Button>

            {isLast ? (
              <Button
                variant="coral"
                onClick={submit}
                disabled={submitting || blocked}
                aria-busy={submitting}
                className="flex-1"
              >
                {submitting ? "جارٍ الإرسال…" : "إرسال الاستبيان"}
              </Button>
            ) : (
              <Button onClick={goNext} disabled={blocked} className="flex-1">
                التالي
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
