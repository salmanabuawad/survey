import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { matchLocale } from "@/lib/i18n/config";

// Middleware already redirects "/", but a direct render can still reach here
// (for example when middleware is skipped for a prefetch).
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const accept = (await headers()).get("accept-language");
  redirect(`/${matchLocale(accept)}`);
}
