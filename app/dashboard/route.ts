import { ADMIN_SESSION_COOKIE, isAdminSessionValid } from "@/lib/admin-session";
import { dashboardDocument } from "@/lib/dashboard-document";
import { NextResponse, type NextRequest } from "next/server";

function loginRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", "/dashboard");
  return NextResponse.redirect(loginUrl);
}

/**
 * The legacy dashboard is deliberately served from a route handler rather
 * than /public, so the HTML is never available before the signed cookie is
 * validated. Its JavaScript stays public, but the data API is protected too.
 */
export async function GET(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isSignedIn =
    Boolean(sessionSecret) && (await isAdminSessionValid(sessionToken, sessionSecret));

  if (!isSignedIn) {
    return loginRedirect(request);
  }

  return new NextResponse(dashboardDocument, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
