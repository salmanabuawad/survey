import { redirect } from "next/navigation";

import { AdminLogin } from "@/components/admin/admin-login";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (await isAuthenticated()) redirect("/admin/dashboard");
  return <AdminLogin />;
}
