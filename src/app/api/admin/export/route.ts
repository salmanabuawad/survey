import { NextResponse } from "next/server";

import { buildCsv, type Filters } from "@/lib/analytics";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "غير مصرّح" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const filters: Filters = {
    frameworkType: params.get("frameworkType") || undefined,
    ageGroup: params.get("ageGroup") || undefined,
    groupSize: params.get("groupSize") || undefined,
    experience: params.get("experience") || undefined,
    locale: params.get("locale") || undefined,
  };

  const csv = await buildCsv(filters);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kidsphere-survey-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
