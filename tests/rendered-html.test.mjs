import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function renderRoot() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("routes the site root to the protected admin area", async () => {
  const response = await renderRoot();
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/admin");
});

test("implements custom admin authentication and admin protection", async () => {
  const [loginPage, loginRoute, adminSession, proxy, dashboardRoute, jinkoRoute] = await Promise.all([
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-session.ts", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/jinko-bills/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(loginPage, /fetch\("\/api\/auth\/login",/);
  assert.doesNotMatch(loginPage, /forgot-password/);
  assert.match(loginRoute, /ADMIN_PASSWORD/);
  assert.match(loginRoute, /ADMIN_SESSION_SECRET/);
  assert.match(loginRoute, /createAdminSession/);
  assert.match(loginRoute, /ADMIN_USERNAME/);
  assert.match(loginPage, /startsWith\("\/admin\/"\)/);
  assert.match(adminSession, /crypto\.subtle\.sign/);
  assert.match(adminSession, /constantTimeEqual/);
  assert.match(proxy, /isAdminSessionValid/);
  assert.match(proxy, /ADMIN_SESSION_SECRET/);
  assert.match(proxy, /"\/admin\/:path\*"/);
  assert.match(proxy, /"\/dashboard"/);
  assert.match(proxy, /"\/api\/jinko-bills"/);
  assert.match(dashboardRoute, /isAdminSessionValid/);
  assert.match(dashboardRoute, /dashboardDocument/);
  assert.match(jinkoRoute, /กรุณาเข้าสู่ระบบ/);
});

test("dashboard contains the required responsive UI and Supabase date filters", async () => {
  const [html, client, sql, config, jinkoRoute] = await Promise.all([
    readFile(new URL("../lib/dashboard-document.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/dashboard.js", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../public/config.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/jinko-bills/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /https:\/\/cdn\.tailwindcss\.com/);
  assert.match(html, /data-range="today"/);
  assert.match(html, /data-range="yesterday"/);
  assert.match(html, /data-range="this-month"/);
  assert.match(html, /id="start-date"/);
  assert.match(html, /id="end-date"/);
  assert.match(html, /id="total-sales"/);
  assert.match(html, /id="total-orders"/);
  assert.match(html, /id="average-order"/);
  assert.match(html, /10 อันดับเมนูขายดี/);

  assert.match(client, /async function fetchDashboardData\(startDate, endDate\)/);
  assert.match(client, /\.gte\("created_at", toStartOfDay\(startDate\)\)/);
  assert.match(client, /\.lte\("created_at", toEndOfDay\(endDate\)\)/);
  assert.match(client, /slice\(0, 10\)/);
  assert.match(client, /signInWithPassword/);
  assert.match(client, /normalizeJinkoBills/);
  assert.match(client, /jinkoBillsPath/);

  assert.match(sql, /create table if not exists public\.orders/);
  assert.match(sql, /create table if not exists public\.order_items/);
  assert.match(sql, /references public\.orders\(id\) on delete cascade/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /grant select on public\.orders to authenticated/);
  assert.match(config, /supabaseUrl:\s*""/);
  assert.match(config, /supabasePublishableKey:\s*""/);
  assert.match(config, /salesSource:\s*"jinko"/);
  assert.match(jinkoRoute, /https:\/\/jinko-order\.vercel\.app\/api\/bill-history/);
  assert.match(jinkoRoute, /cache:\s*"no-store"/);
});
