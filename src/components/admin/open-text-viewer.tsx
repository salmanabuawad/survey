"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import type { OpenTextQuestion } from "@/lib/analytics";
import { formatDateTime } from "@/lib/utils";

export function OpenTextViewer({ questions }: { questions: OpenTextQuestion[] }) {
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const needle = term.trim();
    if (!needle) return questions;
    return questions.map((question) => ({
      ...question,
      entries: question.entries.filter((entry) => entry.value.includes(needle)),
    }));
  }, [questions, term]);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-5">
          <label htmlFor="text-search" className="mb-2 block text-sm font-medium text-ink-600">
            بحث داخل الإجابات المفتوحة
          </label>
          <Input
            id="text-search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="اكتب كلمة للبحث…"
            type="search"
          />
        </CardContent>
      </Card>

      {filtered.map((question) => (
        <Card key={question.id}>
          <CardContent className="pt-5 sm:pt-6">
            <div className="mb-4 flex flex-wrap items-start gap-x-3 gap-y-2">
              <span className="flex min-h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-coral-100 px-2 text-xs font-bold text-coral-700 tabular-nums">
                {question.number}
              </span>
              <h3 className="wrap-anywhere flex-1 text-base font-bold text-ink-800">
                {question.text}
              </h3>
              {question.versioned ? (
                <Badge tone="neutral">
                  نسخة {question.version}
                  {question.status === "live" ? " · حالي" : " · مؤرشف"}
                </Badge>
              ) : null}
              <Badge tone="coral">{question.entries.length} إجابة</Badge>
            </div>

            {question.entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">
                لا توجد إجابات مطابقة.
              </p>
            ) : (
              <ul className="space-y-3">
                {question.entries.map((entry) => (
                  <li
                    key={entry.responseId}
                    className="rounded-xl2 border border-cream-200 bg-cream-50 p-4"
                  >
                    <p className="wrap-anywhere whitespace-pre-wrap text-base leading-loose text-ink-700">
                      {entry.value}
                    </p>
                    <p className="mt-2 text-xs text-ink-400">
                      {formatDateTime(entry.submittedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
