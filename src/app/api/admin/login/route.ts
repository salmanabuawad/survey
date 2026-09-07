import { NextResponse } from "next/server";

import { createSessionValue, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { password?: string }
    | null;

  const password = body?.password ?? "";

  // A blunt delay so the endpoint is not a fast password oracle.
  await new Promise((resolve) => setTimeout(resolve, 400));

  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ message: "كلمة المرور غير صحيحة" }, { status: 401 });
  }

  const session = createSessionValue();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
