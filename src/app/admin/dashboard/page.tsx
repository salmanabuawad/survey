import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getStats, type Filters } from "@/lib/analytics";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Filters live in the URL so a filtered view can be bookmarked and shared. */
function readFilters(params: Record<string, string | string[] | undefined>): Filters {
  const one = (key: string): string | undefined => {
    const value = params[key];
    const single = Array.isArray(value) ? value[0] : value;
    return single && single.length > 0 ? single : undefined;
  };

  return {
    frameworkType: one("frameworkType"),
    ageGroup: one("ageGroup"),
    groupSize: one("groupSize"),
    experience: one("experience"),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAuthenticated())) redirect("/admin");

  const filters = readFilters(await searchParams);
  const stats = await getStats(filters);

  return <AdminDashboard stats={stats} />;
}
