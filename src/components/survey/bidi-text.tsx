import { isNumericRun, splitNumericRuns } from "@/lib/bidi";

export function BidiText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const parts = splitNumericRuns(children);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part && isNumericRun(part) ? (
          <span key={index} dir="ltr" className="inline-block tabular-nums">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}
