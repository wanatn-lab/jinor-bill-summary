import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  constantTimeEqual,
  createAdminSession,
} from "@/lib/admin-session";
import { NextResponse, type NextRequest } from "next/server";

const INVALID_CREDENTIALS = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return json({ error: "คำขอนี้ไม่ถูกต้อง" }, 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return json({ error: "คำขอนี้ไม่ถูกต้อง" }, 415);
  }

  let payload: { password?: unknown; username?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "คำขอนี้ไม่ถูกต้อง" }, 400);
  }

  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminSessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!adminUsername || !adminPassword || !adminSessionSecret) {
    return json({ error: "ระบบเข้าสู่ระบบยังไม่ได้ตั้งค่า" }, 503);
  }

  if (
    !username ||
    !password ||
    !constantTimeEqual(username, adminUsername) ||
    !constantTimeEqual(password, adminPassword)
  ) {
    return json({ error: INVALID_CREDENTIALS }, 401);
  }

  const response = json({ ok: true });
  response.cookies.set({
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE,
    name: ADMIN_SESSION_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    value: await createAdminSession(adminSessionSecret),
  });

  return response;
}
