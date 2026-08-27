import { ADMIN_SESSION_COOKIE, isAdminSessionValid } from "@/lib/admin-session";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isSignedIn =
    Boolean(sessionSecret) && (await isAdminSessionValid(sessionToken, sessionSecret));

  if (!isSignedIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard", "/dashboard.html", "/api/jinko-bills"],
};
