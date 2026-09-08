"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { DayChart } from "@/components/admin/day-chart";
import { DistributionChart } from "@/components/admin/distribution-chart";
import { OpenTextViewer } from "@/components/admin/open-text-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import type { Stats } from "@/lib/analytics";
import { SURVEY_VERSION } from "@/lib/survey-content";
import { formatDuration } from "@/lib/utils";

const FILTER_LABELS: Array<{ field: string; label: string }> = [
  { field: "frameworkType", label: "نوع الإطار التربوي" },
  { field: "ageGroup", label: "الفئة العمرية" },
  { field: "groupSize", label: "عدد الأطفال في المجموعة" },
  { field: "experience", label: "سنوات الخبرة" },
];

type Tab = "overview" | "questions" | "text";

export function AdminDashboard({ stats }: { stats: Stats }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("overview");

  const query = useMemo(() => searchParams.toString(), [searchParams]);
  const activeFilterCount = Object.values(stats.appliedFilters).filter(Boolean).length;

  function setFilter(field: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(field, value);
    else next.delete(field);
    router.push(`/admin/dashboard?${next.toString()}`);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* --- header --------------------------------------------------------- */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-800 sm:text-3xl">
            نتائج الاستبيان
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            استبيان المعلمات في رياض الأطفال · نسخة{" "}
            <span dir="ltr" className="inline-block font-mono text-xs">
              {SURVEY_VERSION}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/admin/questions"
            className="inline-flex min-h-12 items-center rounded-full border border-cream-200 bg-white/80 px-6 text-base font-semibold text-ink-600 transition-colors hover:border-teal-300 hover:text-ink-800"
          >
            إدارة الأسئلة
          </a>
          <a
            href={`/api/admin/export${query ? `?${query}` : ""}`}
            className="inline-flex min-h-12 items-center rounded-full bg-gradient-to-l from-teal-700 to-teal-500 px-6 text-base font-semibold text-white shadow-warm transition-colors hover:from-teal-800 hover:to-teal-600"
          >
            تصدير CSV
          </a>
          <Button variant="secondary" onClick={logout}>
            خروج
          </Button>
        </div>
      </header>

      {/* --- filters -------------------------------------------------------- */}
      <Card className="mb-6">
        <CardContent className="pt-5 sm:pt-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-base font-bold text-ink-800">تصفية النتائج</h2>
            {activeFilterCount > 0 ? (
              <Badge tone="teal">{activeFilterCount} مرشّح</Badge>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FILTER_LABELS.map(({ field, label }) => (
              <div key={field} className="space-y-1.5">
                <label
                  htmlFor={`filter-${field}`}
                  className="block text-sm font-medium text-ink-600"
                >
                  {label}
                </label>
                <Select
                  id={`filter-${field}`}
                  value={
                    (stats.appliedFilters[
                      field as keyof typeof stats.appliedFilters
                    ] as string) ?? ""
                  }
                  onChange={(event) => setFilter(field, event.target.value)}
                >
                  <option value="">الكل</option>
                  {(stats.filterOptions[field] ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>

          {activeFilterCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => router.push("/admin/dashboard")}
            >
              إزالة كل المرشّحات
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* --- summary -------------------------------------------------------- */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="إجمالي الردود" value={String(stats.total)} tone="teal" />
        <StatTile
          label="متوسط وقت التعبئة"
          value={formatDuration(stats.averageCompletionSeconds)}
          tone="violet"
        />
        <StatTile
          label="الوسيط لوقت التعبئة"
          value={formatDuration(stats.medianCompletionSeconds)}
          tone="violet"
        />
        <StatTile
          label="أيام فيها ردود"
          value={String(stats.byDay.filter((day) => day.count > 0).length)}
          tone="coral"
        />
      </div>

      {/* --- tabs ----------------------------------------------------------- */}
      <div
        role="tablist"
        aria-label="أقسام لوحة التحكم"
        className="mb-5 flex flex-wrap gap-2"
      >
        {(
          [
            ["overview", "نظرة عامة"],
            ["questions", "توزيع الإجابات"],
            ["text", "الإجابات المفتوحة"],
          ] as Array<[Tab, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={
              tab === value
                ? "min-h-11 rounded-full bg-gradient-to-l from-teal-700 to-teal-500 px-5 text-sm font-semibold text-white shadow-warm"
                : "min-h-11 rounded-full border border-cream-200 bg-white/70 px-5 text-sm font-semibold text-ink-500 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {stats.total === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-ink-500">
            لا توجد ردود مطابقة لهذه المرشّحات بعد.
          </CardContent>
        </Card>
      ) : tab === "overview" ? (
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-base font-bold text-ink-800">
              الردود حسب اليوم
            </h2>
            <DayChart data={stats.byDay} />
          </CardContent>
        </Card>
      ) : tab === "questions" ? (
        <div className="space-y-5">
          {stats.archivedWithData > 0 ? (
            <p className="rounded-xl2 border border-cream-200 bg-cream-100 p-4 text-sm leading-loose text-ink-600">
              {stats.archivedWithData} نسخة سابقة من الأسئلة تحتفظ بإجاباتها وتظهر
              أدناه بشكل منفصل. لم تُدمج مع النسخ الحالية لأن نص السؤال تغيّر.
            </p>
          ) : null}
          {stats.distributions.map((distribution) => (
            <DistributionChart key={distribution.id} distribution={distribution} />
          ))}
        </div>
      ) : (
        <OpenTextViewer questions={stats.openText} />
      )}
    </main>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "teal" | "violet" | "coral";
}) {
  const tones = {
    teal: "border-teal-100 from-teal-50 to-teal-100/80 text-teal-800",
    violet: "border-violet-100 from-violet-50 to-violet-100/80 text-violet-800",
    coral: "border-coral-100 from-coral-50 to-coral-100/80 text-coral-700",
  } as const;

  return (
    <div
      className={`rounded-xl2 border bg-gradient-to-bl p-5 shadow-warm ${tones[tone]}`}
    >
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
