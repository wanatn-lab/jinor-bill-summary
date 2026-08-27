import { ADMIN_SESSION_COOKIE, isAdminSessionValid } from "@/lib/admin-session";
import type { NextRequest } from "next/server";

const JINKO_BILL_HISTORY_URL = "https://jinko-order.vercel.app/api/bill-history";

type UpstreamItem = {
  name?: unknown;
  qty?: unknown;
  price?: unknown;
  lineTotal?: unknown;
};

type UpstreamBill = {
  id?: unknown;
  billNo?: unknown;
  table?: unknown;
  createdAt?: unknown;
  settledAt?: unknown;
  total?: unknown;
  items?: unknown;
};

type UpstreamPayload = { days?: unknown; bills?: unknown };

const text = (value: unknown) => (typeof value === "string" ? value : "");
const amount = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

/**
 * Same-origin adapter for paid Jinko bills. It keeps the upstream URL fixed,
 * validates the response shape, and avoids a browser CORS dependency.
 */
export async function GET(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isSignedIn =
    Boolean(sessionSecret) && (await isAdminSessionValid(sessionToken, sessionSecret));

  if (!isSignedIn) {
    return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const upstream = await fetch(JINKO_BILL_HISTORY_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      return Response.json({ error: "Jinko Order ไม่ตอบกลับ" }, { status: 502 });
    }

    const payload = (await upstream.json()) as UpstreamPayload;
    if (!Array.isArray(payload.bills)) {
      return Response.json({ error: "ข้อมูลบิลจาก Jinko Order ไม่ถูกต้อง" }, { status: 502 });
    }

    const bills = (payload.bills as UpstreamBill[]).map((bill) => ({
      id: text(bill.id),
      billNo: text(bill.billNo),
      table: text(bill.table),
      createdAt: text(bill.createdAt),
      settledAt: text(bill.settledAt),
      total: amount(bill.total),
      items: Array.isArray(bill.items)
        ? (bill.items as UpstreamItem[]).map((item) => ({
            name: text(item.name),
            qty: amount(item.qty),
            price: amount(item.price),
            lineTotal: amount(item.lineTotal),
          }))
        : [],
    }));

    return Response.json(
      { days: amount(payload.days), bills },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "เชื่อมต่อ Jinko Order ไม่สำเร็จ" }, { status: 502 });
  }
}
