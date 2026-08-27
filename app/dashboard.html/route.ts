import { NextResponse, type NextRequest } from "next/server";

// Preserve old bookmarks without keeping the dashboard as a public file.
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
