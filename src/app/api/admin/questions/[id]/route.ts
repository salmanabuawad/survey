import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import { deleteQuestion, updateQuestion } from "@/lib/questions";
import { questionInputSchema } from "@/lib/question-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Editing wording, type or options archives this version — which keeps every
 * answer already given to it — and forks a new live one. Moving it between
 * sections only repositions the existing row.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "غير مصرّح" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = questionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  try {
    const result = await updateQuestion(id, {
      sectionId: parsed.data.sectionId,
      type: parsed.data.type,
      text: parsed.data.text,
      hint: parsed.data.hint ?? null,
      options: parsed.data.options,
    });
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "QUESTION_NOT_FOUND") {
      return NextResponse.json({ message: "السؤال غير موجود" }, { status: 404 });
    }
    if (code === "QUESTION_NOT_LIVE") {
      return NextResponse.json(
        { message: "لا يمكن تعديل نسخة مؤرشفة" },
        { status: 409 },
      );
    }
    console.error("question update failed", error);
    return NextResponse.json({ message: "تعذر حفظ التعديل" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "غير مصرّح" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    // Soft delete: the answers already collected stay in the results and the
    // CSV export, the question is simply never shown again.
    await deleteQuestion(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("question delete failed", error);
    return NextResponse.json({ message: "تعذر حذف السؤال" }, { status: 500 });
  }
}
