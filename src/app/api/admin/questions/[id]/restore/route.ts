import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import { restoreQuestion } from "@/lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "غير مصرّح" }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await restoreQuestion(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "LINEAGE_ALREADY_LIVE") {
      return NextResponse.json(
        { message: "يوجد بالفعل نسخة حالية من هذا السؤال" },
        { status: 409 },
      );
    }
    return NextResponse.json({ message: "تعذر استرجاع السؤال" }, { status: 500 });
  }
}
