import { NextResponse, type NextRequest } from "next/server";

import { isLocale, matchLocale, SOURCE_LOCALE } from "@/lib/i18n/config";

/**
 * Locale routing.
 *
 * The survey lives under a language prefix (/ar, /he, /en) so a link can carry
 * its language — you can send Hebrew-speaking teachers a Hebrew link. A bare "/"
 * redirects to whichever of those best matches the browser.
 *
 * The admin dashboard stays unprefixed and Arabic; it is for the research team,
 * not for respondents.
 *
 * The chosen locale is passed downstream as a header so the root layout can set
 * <html lang> and dir without every page having to thread it through.
 */

const LOCALE_HEADER = "x-survey-locale";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const target = matchLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${target}`;
    return NextResponse.redirect(url);
  }

  const first = pathname.split("/")[1];
  const locale = isLocale(first) ? first : SOURCE_LOCALE;

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except API routes, Next's own assets and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

export { LOCALE_HEADER };
