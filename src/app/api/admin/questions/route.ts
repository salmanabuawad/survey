import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import { createQuestion, getAllQuestionVersions, getSections } from "@/lib/questions";
import { questionInputSchema } from "@/lib/question-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "غير مصرّح" }, { status: 401 });
  }
  const [questions, sections] = await Promise.all([
    getAllQuestionVersions(),
    getSections(),
  ]);
  return NextResponse.json({ questions, sections });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "غير مصرّح" }, { status: 401 });
  }

  const parsed = questionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const question = await createQuestion({
    sectionId: parsed.data.sectionId,
    type: parsed.data.type,
    text: parsed.data.text,
    hint: parsed.data.hint ?? null,
    options: parsed.data.options,
  });

  return NextResponse.json({ question }, { status: 201 });
}
