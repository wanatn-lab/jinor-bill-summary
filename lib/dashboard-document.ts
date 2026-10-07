export const dashboardDocument = String.raw`<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#ea580c" />
    <meta name="description" content="Restaurant Sales Dashboard — สรุปยอดขายและเมนูขายดี" />
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icon-192x192.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Sales Dash">
    <title>Restaurant Sales Dashboard</title>
    <!-- Tailwind CDN: the interface stays framework-free and mobile-first. -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: { brand: { 50: "#fff7ed", 100: "#ffedd5", 500: "#f97316", 600: "#ea580c", 700: "#c2410c" } },
            boxShadow: { card: "0 12px 28px rgba(15, 23, 42, .07)" },
          },
        },
      };
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      body { font-family: "DM Sans", "Noto Sans Thai", sans-serif; }
      input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: .65; }
    </style>
  </head>
  <body class="min-h-screen bg-slate-50 text-slate-900">
    <div class="min-h-screen">
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex min-w-0 items-center gap-3">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-xl text-white shadow-sm" aria-hidden="true">🍜</div>
            <div class="min-w-0">
              <p class="truncate text-base font-bold text-slate-900">Restaurant Sales</p>
              <p class="text-xs text-slate-500">Dashboard สำหรับผู้บริหารร้าน</p>
            </div>
          </div>
          <div class="flex items-center gap-3 text-sm text-slate-500">
            <div class="hidden items-center gap-2 sm:flex">
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span id="connection-label">โหมดตัวอย่าง</span>
            </div>
            <button id="auth-button" type="button" class="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700">เข้าสู่ระบบ</button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section class="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="mb-1 text-sm font-medium text-brand-600">ภาพรวมรายได้</p>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ยอดขายร้านอาหาร</h1>
            <p id="date-summary" class="mt-1 text-sm text-slate-500" aria-live="polite">กำลังโหลดช่วงเวลา...</p>
          </div>
          <p id="last-updated" class="text-xs text-slate-400" aria-live="polite"></p>
        </section>

        <section aria-labelledby="filters-heading" class="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 id="filters-heading" class="font-semibold text-slate-900">เลือกช่วงเวลา</h2>
            <button id="reset-filter" type="button" class="text-sm font-semibold text-brand-600 hover:text-brand-700">ล้างตัวกรอง</button>
          </div>
          <div class="flex snap-x gap-2 overflow-x-auto pb-1" role="group" aria-label="ตัวกรองวันที่ด่วน">
            <button type="button" class="quick-filter shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition" data-range="today">วันนี้</button>
            <button type="button" class="quick-filter shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition" data-range="yesterday">เมื่อวาน</button>
            <button type="button" class="quick-filter shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition" data-range="this-month">เดือนนี้</button>
          </div>
          <form id="date-range-form" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" novalidate>
            <label class="grid gap-1.5 text-sm font-medium text-slate-700">
              วันที่เริ่มต้น
              <input id="start-date" name="startDate" type="date" required class="h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
            </label>
            <label class="grid gap-1.5 text-sm font-medium text-slate-700">
              วันที่สิ้นสุด
              <input id="end-date" name="endDate" type="date" required class="h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
            </label>
            <button type="submit" class="h-11 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200">แสดงผล</button>
          </form>
          <p id="filter-error" class="mt-3 hidden text-sm text-rose-600" role="alert"></p>
        </section>

        <section aria-label="ตัวชี้วัดยอดขาย" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article class="relative overflow-hidden rounded-2xl bg-brand-600 p-5 text-white shadow-card">
            <div class="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" aria-hidden="true"></div>
            <p class="relative text-sm font-medium text-orange-100">ยอดขายรวม</p>
            <p id="total-sales" class="relative mt-2 text-3xl font-bold tracking-tight tabular-nums">฿0.00</p>
            <p id="sales-note" class="relative mt-2 text-xs text-orange-100">ตามช่วงเวลาที่เลือก</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div class="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-lg" aria-hidden="true">▤</div>
            <p class="text-sm font-medium text-slate-500">จำนวนบิลทั้งหมด</p>
            <p id="total-orders" class="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">0</p>
            <p class="mt-2 text-xs text-slate-400">บิลที่ปิดในช่วงที่เลือก</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div class="mb-4 grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-lg" aria-hidden="true">◈</div>
            <p class="text-sm font-medium text-slate-500">ยอดเฉลี่ยต่อบิล</p>
            <p id="average-order" class="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">฿0.00</p>
            <p class="mt-2 text-xs text-slate-400">Average order value</p>
          </article>
        </section>

        <section class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card lg:mt-8" aria-labelledby="leaderboard-heading">
          <div class="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="leaderboard-heading" class="font-bold text-slate-900">10 อันดับเมนูขายดี</h2>
              <p class="mt-1 text-sm text-slate-500">เรียงตามจำนวนที่ขายได้ในช่วงเวลา</p>
            </div>
            <p id="menu-count" class="text-sm font-medium text-slate-500"></p>
          </div>
          <div>
            <table class="w-full table-fixed text-left">
              <caption class="sr-only">รายชื่อเมนูขายดี จำนวนที่ขาย และรายได้</caption>
              <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" class="w-14 px-3 py-3 font-semibold sm:w-20 sm:px-5">อันดับ</th>
                  <th scope="col" class="px-3 py-3 font-semibold sm:px-5">เมนู</th>
                  <th scope="col" class="w-16 px-3 py-3 text-right font-semibold sm:w-36 sm:px-5"><span class="sm:hidden">จำนวน</span><span class="hidden sm:inline">จำนวนที่ขาย</span></th>
                  <th scope="col" class="w-24 px-3 py-3 text-right font-semibold sm:w-40 sm:px-5">รายได้รวม</th>
                </tr>
              </thead>
              <tbody id="leaderboard-body" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
          <div id="empty-state" class="hidden px-5 py-12 text-center">
            <p class="text-lg">ยังไม่มีรายการขายในช่วงเวลานี้</p>
            <p class="mt-1 text-sm text-slate-500">ลองเลือกช่วงวันที่อื่น หรือตรวจสอบข้อมูลใน Supabase</p>
          </div>
        </section>
      </main>

      <footer class="mx-auto max-w-7xl px-4 pb-8 text-xs text-slate-400 sm:px-6 lg:px-8">
        <span>ข้อมูลจะอัปเดตเมื่อเปลี่ยนช่วงวันที่</span><span class="mx-2">•</span><span>ใช้ Publishable key เท่านั้น</span>
      </footer>
    </div>

    <div id="loading-overlay" class="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-slate-950/10 opacity-0 transition-opacity" aria-hidden="true">
      <div class="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg">กำลังอัปเดตข้อมูล...</div>
    </div>

    <dialog id="auth-dialog" class="w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40">
      <form id="auth-form" class="p-6" novalidate>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">เข้าสู่ระบบพนักงาน</h2>
            <p class="mt-1 text-sm text-slate-500">ใช้บัญชีที่มีสิทธิ์เข้าถึงร้านนี้</p>
          </div>
          <button type="button" id="auth-cancel" class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="ปิด">×</button>
        </div>
        <label class="mt-5 grid gap-1.5 text-sm font-medium text-slate-700">
          อีเมล
          <input id="auth-email" type="email" autocomplete="email" required class="h-11 rounded-lg border border-slate-300 px-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
        </label>
        <label class="mt-3 grid gap-1.5 text-sm font-medium text-slate-700">
          รหัสผ่าน
          <input id="auth-password" type="password" autocomplete="current-password" required class="h-11 rounded-lg border border-slate-300 px-3 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
        </label>
        <p id="auth-error" class="mt-3 hidden text-sm text-rose-600" role="alert"></p>
        <button type="submit" class="mt-5 h-11 w-full rounded-lg bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200">เข้าสู่ระบบ</button>
      </form>
    </dialog>

    <script src="./config.js"></script>
    <!-- Supabase's official browser client. Only public, browser-safe credentials are loaded. -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="./dashboard.js"></script>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(console.error);
        });
      }
    </script>
  </body>
</html>`;
