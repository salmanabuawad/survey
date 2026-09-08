"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BidiText } from "@/components/survey/bidi-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { QuestionDistribution } from "@/lib/analytics";
import { isolateNumericBidi } from "@/lib/bidi";

/**
 * Horizontal bars, because the option labels are long Arabic sentences and a
 * vertical chart would either clip them or turn them sideways.
 *
 * RTL comes from two settings working together: the category axis sits on the
 * right (`orientation="right"`) and the value axis is reversed, so bars start
 * at the right edge and grow leftwards the way the text reads.
 */

const LINE_HEIGHT = 17;
const ROW_PADDING = 22;

function wrapLabel(label: string, charsPerLine: number): string[] {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > charsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  // Three lines is the most a row can carry before the chart gets unreadable.
  if (lines.length > 3) {
    return [...lines.slice(0, 2), `${lines[2].slice(0, charsPerLine - 1)}…`];
  }
  return lines;
}

interface TickProps {
  x?: number;
  y?: number;
  payload?: { value?: string };
  charsPerLine?: number;
}

function CategoryTick({ x = 0, y = 0, payload, charsPerLine = 26 }: TickProps) {
  const lines = wrapLabel(String(payload?.value ?? ""), charsPerLine);
  const offset = -((lines.length - 1) * LINE_HEIGHT) / 2;

  return (
    <text
      x={x}
      y={y}
      textAnchor="start"
      fill="var(--color-ink-600)"
      fontSize={13}
      // The SVG inherits RTL from the page; plaintext keeps mixed digits sane.
      style={{ direction: "rtl", unicodeBidi: "plaintext" }}
    >
      {lines.map((line, index) => (
        <tspan key={line + index} x={x + 8} dy={index === 0 ? offset : LINE_HEIGHT}>
          {isolateNumericBidi(line)}
        </tspan>
      ))}
    </text>
  );
}

const BAR_COLORS = [
  "var(--color-teal-500)",
  "var(--color-teal-400)",
  "var(--color-violet-400)",
  "var(--color-violet-300)",
  "var(--color-coral-400)",
];

export function DistributionChart({
  distribution,
}: {
  distribution: QuestionDistribution;
}) {
  // The label column has to shrink on a phone or the bars vanish.
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const axisWidth = narrow ? 150 : 260;
  const charsPerLine = narrow ? 20 : 34;

  const data = distribution.options.map((option) => ({
    ...option,
    lines: wrapLabel(option.label, charsPerLine).length,
  }));

  const height =
    data.reduce((sum, row) => sum + Math.max(38, row.lines * LINE_HEIGHT + ROW_PADDING), 0) +
    24;

  const maxCount = Math.max(1, ...data.map((row) => row.count));

  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <div className="mb-1 flex flex-wrap items-start gap-x-3 gap-y-2">
          <span className="flex min-h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-bl from-teal-200 to-teal-100 px-2 text-xs font-bold text-teal-800 tabular-nums">
            {distribution.number}
          </span>
          <h3 className="wrap-anywhere flex-1 text-base font-bold text-ink-800">
            {distribution.text}
          </h3>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 ps-10">
          <Badge tone={distribution.type === "multiple" ? "violet" : "teal"}>
            {distribution.type === "multiple" ? "اختيار متعدد" : "اختيار واحد"}
          </Badge>
          {/* Only shown once a question has actually been edited. */}
          {distribution.versioned ? (
            <Badge tone={distribution.status === "live" ? "coral" : "neutral"}>
              نسخة {distribution.version}
              {distribution.status === "live"
                ? " · حالي"
                : distribution.status === "deleted"
                  ? " · محذوف"
                  : " · مؤرشف"}
            </Badge>
          ) : distribution.status === "deleted" ? (
            <Badge tone="neutral">محذوف</Badge>
          ) : null}
          <span className="text-sm text-ink-500">
            أجابت على هذا السؤال {distribution.answered} معلمة
          </span>
        </div>

        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 4, bottom: 4, left: 8 }}
              barCategoryGap={6}
            >
              <XAxis
                type="number"
                // Right-to-left growth, and whole numbers only.
                reversed
                domain={[0, maxCount]}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-ink-400)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                orientation="right"
                width={axisWidth}
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={<CategoryTick charsPerLine={charsPerLine} />}
              />
              <Tooltip
                cursor={{ fill: "var(--color-cream-100)" }}
                contentStyle={{
                  direction: "rtl",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--color-cream-200)",
                  fontSize: 13,
                }}
                formatter={(value: number, _name, item) => [
                  `${value} (${item?.payload?.percent ?? 0}%)`,
                  "عدد الإجابات",
                ]}
              />
              <Bar dataKey="count" radius={[6, 0, 0, 6]} isAnimationActive={false}>
                {data.map((row, index) => (
                  <Cell key={row.label} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* The chart shows counts; the table underneath carries the percentages. */}
        <ul className="mt-4 space-y-1.5 border-t border-cream-200 pt-4 text-sm">
          {distribution.options.map((option) => (
            <li key={option.label} className="flex items-start justify-between gap-4">
              <span className="wrap-anywhere flex-1 text-ink-600">
                <BidiText>{option.label}</BidiText>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink-800">
                {option.count} · {option.percent}%
              </span>
            </li>
          ))}
        </ul>

        {distribution.otherTexts.length > 0 ? (
          <details className="mt-4 rounded-xl2 bg-cream-100 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink-700">
              ما كُتب في خانة «أخرى» ({distribution.otherTexts.length})
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              {distribution.otherTexts.map((text, index) => (
                <li key={`${text}-${index}`} className="wrap-anywhere border-s-2 border-teal-300 ps-3">
                  {text}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
