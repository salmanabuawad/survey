import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import { reorderQuestions } from "@/lib/questions";
import { reorderSchema } from "@/lib/question-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reordering is not versioned: it changes where a question sits, not what it asks. */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "غير مصرّح" }, { status: 401 });
  }

  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "بيانات غير صالحة" }, { status: 400 });
  }

  await reorderQuestions(parsed.data.ordered);
  return NextResponse.json({ ok: true });
}
