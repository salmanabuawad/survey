/**
 * Western digit ranges reverse in RTL ("15–20" paints as "20-15").
 * Wrap those runs with isolate markers so display stays source-order.
 * Never persist the wrapped string — it is a rendering aid only.
 */
const NUMERIC_RUN = /(\d+(?:\s*[–\-−—]\s*\d+)?)/g;

const LRI = "\u2066";
const PDI = "\u2069";

export function isolateNumericBidi(text: string): string {
  return text.replace(NUMERIC_RUN, `${LRI}$1${PDI}`);
}

export function splitNumericRuns(text: string): string[] {
  return text.split(NUMERIC_RUN);
}

export function isNumericRun(part: string): boolean {
  return /^\d/.test(part);
}
