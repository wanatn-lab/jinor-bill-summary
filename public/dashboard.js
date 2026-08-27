/**
 * Restaurant Sales Dashboard
 * A framework-free client. Configure public/config.js to read live Supabase data.
 */
(function dashboardApp() {
  "use strict";

  const config = window.RESTAURANT_DASHBOARD_CONFIG || {};
  const hasSupabaseCredentials = Boolean(
    config.supabaseUrl && config.supabasePublishableKey && window.supabase
  );
  const requestedSource = config.salesSource || "jinko";
  const dataSource = requestedSource === "supabase" && hasSupabaseCredentials
    ? "supabase"
    : requestedSource === "jinko"
      ? "jinko"
      : "demo";
  const isSupabaseConfigured = dataSource === "supabase";
  const db = isSupabaseConfigured
    ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey)
    : null;

  const elements = {
    startDate: document.querySelector("#start-date"),
    endDate: document.querySelector("#end-date"),
    form: document.querySelector("#date-range-form"),
    quickFilters: document.querySelectorAll(".quick-filter"),
    resetFilter: document.querySelector("#reset-filter"),
    filterError: document.querySelector("#filter-error"),
    dateSummary: document.querySelector("#date-summary"),
    totalSales: document.querySelector("#total-sales"),
    totalOrders: document.querySelector("#total-orders"),
    averageOrder: document.querySelector("#average-order"),
    salesNote: document.querySelector("#sales-note"),
    leaderboardBody: document.querySelector("#leaderboard-body"),
    emptyState: document.querySelector("#empty-state"),
    menuCount: document.querySelector("#menu-count"),
    connectionLabel: document.querySelector("#connection-label"),
    lastUpdated: document.querySelector("#last-updated"),
    loadingOverlay: document.querySelector("#loading-overlay"),
    authButton: document.querySelector("#auth-button"),
    authDialog: document.querySelector("#auth-dialog"),
    authForm: document.querySelector("#auth-form"),
    authEmail: document.querySelector("#auth-email"),
    authPassword: document.querySelector("#auth-password"),
    authError: document.querySelector("#auth-error"),
    authCancel: document.querySelector("#auth-cancel"),
  };

  const formatCurrency = new Intl.NumberFormat(config.locale || "th-TH", {
    style: "currency",
    currency: config.currency || "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formatNumber = new Intl.NumberFormat(config.locale || "th-TH");
  const formatDate = new Intl.DateTimeFormat(config.locale || "th-TH", {
    day: "numeric", month: "short", year: "numeric",
  });

  // Demo mode reflects the KPI and leading menus supplied in the source Drive file.
  // It lets the UI remain demonstrable until the owner connects Supabase.
  const demoDate = new Date();
  demoDate.setHours(12, 0, 0, 0);
  const DEMO_ORDERS = createDemoOrders(demoDate);

  function toLocalIsoDate(value) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
  }

  function parseIsoDate(dateString) {
    return new Date(`${dateString}T00:00:00`);
  }

  function dateFor(range) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (range === "yesterday") today.setDate(today.getDate() - 1);
    return toLocalIsoDate(today);
  }

  function getThisMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: toLocalIsoDate(firstDay), endDate: toLocalIsoDate(now) };
  }

  function setLoading(isLoading) {
    elements.loadingOverlay.classList.toggle("opacity-0", !isLoading);
    elements.loadingOverlay.setAttribute("aria-hidden", String(!isLoading));
  }

  function setError(message = "") {
    elements.filterError.textContent = message;
    elements.filterError.classList.toggle("hidden", !message);
  }

  function setActiveQuickFilter(activeRange) {
    elements.quickFilters.forEach((button) => {
      const active = button.dataset.range === activeRange;
      button.className = `quick-filter shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
      }`;
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function toStartOfDay(dateString) {
    return `${dateString}T00:00:00.000`;
  }

  function toEndOfDay(dateString) {
    return `${dateString}T23:59:59.999`;
  }

  /**
   * Pull orders and their line items for an inclusive calendar-date range.
   * The gte/lte filters are intentionally placed on orders.created_at, so the
   * database only returns bills within the selected range.
   */
  async function fetchDashboardData(startDate, endDate) {
    if (dataSource === "jinko") {
      const response = await fetch(config.jinkoBillsPath || "/api/jinko-bills", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("ไม่สามารถเชื่อมต่อ Jinko Order ได้");
      return normalizeJinkoBills(await response.json(), startDate, endDate);
    }

    if (!db) {
      const start = new Date(toStartOfDay(startDate));
      const end = new Date(toEndOfDay(endDate));
      return DEMO_ORDERS.filter((order) => {
        const createdAt = new Date(order.created_at);
        return createdAt >= start && createdAt <= end;
      });
    }

    const { data: sessionData } = await db.auth.getSession();
    if (!sessionData.session) {
      throw new Error("กรุณาเข้าสู่ระบบก่อนดูข้อมูลจริงของร้าน");
    }

    const { data, error } = await db
      .from("orders")
      .select(`
        id,
        total_price,
        created_at,
        order_items (
          id,
          menu_name,
          quantity,
          price
        )
      `)
      .gte("created_at", toStartOfDay(startDate))
      .lte("created_at", toEndOfDay(endDate))
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  // Convert Jinko's paid-bill shape to the same order shape used by Supabase.
  function normalizeJinkoBills(payload, startDate, endDate) {
    if (!payload || !Array.isArray(payload.bills)) {
      throw new Error("รูปแบบข้อมูลจาก Jinko Order ไม่ถูกต้อง");
    }
    const start = new Date(toStartOfDay(startDate));
    const end = new Date(toEndOfDay(endDate));

    return payload.bills
      .map((bill) => {
        const createdAt = bill.settledAt || bill.createdAt;
        const items = Array.isArray(bill.items) ? bill.items : [];
        return {
          id: bill.id,
          table_no: bill.table,
          total_price: Number(bill.total || 0),
          created_at: createdAt,
          order_items: items.map((item) => {
            const quantity = Number(item.qty || 0);
            const price = Number.isFinite(Number(item.price))
              ? Number(item.price)
              : Number(item.lineTotal || 0) / Math.max(quantity, 1);
            return {
              id: `${bill.id}-${item.name}`,
              menu_name: item.name || "ไม่ระบุเมนู",
              quantity,
              price,
            };
          }),
        };
      })
      .filter((order) => {
        const paidAt = new Date(order.created_at);
        return !Number.isNaN(paidAt.getTime()) && paidAt >= start && paidAt <= end;
      });
  }

  function calculateDashboard(orders) {
    const totalSales = orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0);
    const menuMap = new Map();

    orders.forEach((order) => {
      (order.order_items || []).forEach((item) => {
        const name = item.menu_name || "ไม่ระบุเมนู";
        const existing = menuMap.get(name) || { name, quantity: 0, revenue: 0 };
        existing.quantity += Number(item.quantity || 0);
        // price is the unit price at time of sale.
        existing.revenue += Number(item.quantity || 0) * Number(item.price || 0);
        menuMap.set(name, existing);
      });
    });

    const leaderboard = [...menuMap.values()]
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name, "th"))
      .slice(0, 10);

    return {
      totalSales,
      orderCount: orders.length,
      averageOrder: orders.length ? totalSales / orders.length : 0,
      leaderboard,
    };
  }

  function renderLeaderboard(leaderboard) {
    elements.leaderboardBody.replaceChildren();
    const hasData = leaderboard.length > 0;
    elements.emptyState.classList.toggle("hidden", hasData);
    elements.menuCount.textContent = hasData ? `${formatNumber.format(leaderboard.length)} เมนู` : "";

    leaderboard.forEach((menu, index) => {
      const row = document.createElement("tr");
      row.className = "hover:bg-slate-50/80";
      row.innerHTML = `
        <td class="px-5 py-4"><span class="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold ${index < 3 ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}">${index + 1}</span></td>
        <td class="px-5 py-4 font-semibold text-slate-800">${escapeHtml(menu.name)}</td>
        <td class="px-5 py-4 text-right font-medium tabular-nums text-slate-700">${formatNumber.format(menu.quantity)}</td>
        <td class="px-5 py-4 text-right font-semibold tabular-nums text-emerald-700">${formatCurrency.format(menu.revenue)}</td>
      `;
      elements.leaderboardBody.append(row);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderDashboard(orders, startDate, endDate) {
    const data = calculateDashboard(orders);
    elements.totalSales.textContent = formatCurrency.format(data.totalSales);
    elements.totalOrders.textContent = formatNumber.format(data.orderCount);
    elements.averageOrder.textContent = formatCurrency.format(data.averageOrder);
    elements.salesNote.textContent = data.orderCount
      ? dataSource === "jinko"
        ? "บิลคิดเงินจาก Jinko Order · ย้อนหลังสูงสุด 7 วัน"
        : "ตามช่วงเวลาที่เลือก"
      : "ยังไม่มีบิลในช่วงเวลานี้";
    elements.dateSummary.textContent = `${formatDate.format(parseIsoDate(startDate))} – ${formatDate.format(parseIsoDate(endDate))}`;
    elements.lastUpdated.textContent = `อัปเดต ${new Date().toLocaleTimeString(config.locale || "th-TH", { hour: "2-digit", minute: "2-digit" })} น.`;
    renderLeaderboard(data.leaderboard);
  }

  async function loadDashboard(startDate, endDate) {
    setError();
    setLoading(true);
    try {
      const orders = await fetchDashboardData(startDate, endDate);
      renderDashboard(orders, startDate, endDate);
    } catch (error) {
      console.error("Dashboard load error:", error);
      renderDashboard([], startDate, endDate);
      setError(`ไม่สามารถดึงข้อมูลได้: ${error.message || "โปรดลองอีกครั้ง"}`);
    } finally {
      setLoading(false);
    }
  }

  function applyRange(startDate, endDate, quickRange = "custom") {
    if (!startDate || !endDate) {
      setError("กรุณาเลือกวันเริ่มต้นและวันสิ้นสุด");
      return;
    }
    if (startDate > endDate) {
      setError("วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด");
      return;
    }
    elements.startDate.value = startDate;
    elements.endDate.value = endDate;
    elements.endDate.min = startDate;
    elements.startDate.max = endDate;
    setActiveQuickFilter(quickRange);
    loadDashboard(startDate, endDate);
  }

  function createDemoOrders(baseDate) {
    const menuDefinitions = [
      { name: "ข้าวมันไก่ต้ม", quantity: 42, price: 50 },
      { name: "ข้าวมันไก่ทอด", quantity: 28, price: 50 },
      { name: "ขนมจีบหมูไข่เค็ม", quantity: 15, price: 35 },
      { name: "ก๋วยเตี๋ยวต้มยำ", quantity: 14, price: 60 },
      { name: "ชามะนาว", quantity: 13, price: 35 },
      { name: "น้ำเก๊กฮวย", quantity: 12, price: 30 },
      { name: "เฉาก๊วยนมสด", quantity: 10, price: 45 },
    ];
    const items = menuDefinitions.flatMap((menu) => Array.from({ length: menu.quantity }, () => ({
      menu_name: menu.name, quantity: 1, price: menu.price,
    })));
    const orders = Array.from({ length: 54 }, (_, index) => ({
      id: `demo-${index + 1}`,
      table_no: String((index % 12) + 1),
      total_price: index === 53 ? 182 : 156,
      created_at: new Date(baseDate.getTime() - (index % 12) * 3_600_000).toISOString(),
      order_items: [],
    }));
    items.forEach((item, index) => orders[index % orders.length].order_items.push(item));
    return orders;
  }

  function initialize() {
    elements.connectionLabel.textContent = dataSource === "jinko"
      ? "Jinko Order · บิลคิดเงิน"
      : isSupabaseConfigured
        ? "เชื่อมต่อ Supabase"
        : "โหมดตัวอย่าง";
    if (isSupabaseConfigured) {
      elements.authButton.classList.remove("hidden");
      refreshAuthState();
    }
    const today = dateFor("today");
    applyRange(today, today, "today");

    elements.quickFilters.forEach((button) => {
      button.addEventListener("click", () => {
        const range = button.dataset.range;
        if (range === "this-month") {
          const dates = getThisMonthRange();
          applyRange(dates.startDate, dates.endDate, range);
        } else {
          const date = dateFor(range);
          applyRange(date, date, range);
        }
      });
    });

    elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      applyRange(elements.startDate.value, elements.endDate.value);
    });
    // Date-picker changes update the dashboard immediately; the button remains
    // available for keyboard and touch users who prefer an explicit action.
    [elements.startDate, elements.endDate].forEach((input) => {
      input.addEventListener("change", () => {
        const { value: startDate } = elements.startDate;
        const { value: endDate } = elements.endDate;
        if (startDate && endDate && startDate <= endDate) {
          applyRange(startDate, endDate);
        }
      });
    });
    elements.resetFilter.addEventListener("click", () => {
      const date = dateFor("today");
      applyRange(date, date, "today");
    });
    elements.authButton.addEventListener("click", handleAuthButtonClick);
    elements.authCancel.addEventListener("click", () => elements.authDialog.close());
    elements.authForm.addEventListener("submit", signIn);
  }

  async function refreshAuthState() {
    if (!db) return;
    const { data: sessionData } = await db.auth.getSession();
    const email = sessionData.session?.user?.email;
    elements.authButton.textContent = email ? "ออกจากระบบ" : "เข้าสู่ระบบ";
    elements.connectionLabel.textContent = email ? `เชื่อมต่อแล้ว: ${email}` : "ต้องเข้าสู่ระบบ";
  }

  async function handleAuthButtonClick() {
    const { data: sessionData } = await db.auth.getSession();
    if (sessionData.session) {
      await db.auth.signOut();
      await refreshAuthState();
      const date = dateFor("today");
      applyRange(date, date, "today");
      return;
    }
    elements.authError.classList.add("hidden");
    elements.authForm.reset();
    elements.authDialog.showModal();
    elements.authEmail.focus();
  }

  async function signIn(event) {
    event.preventDefault();
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;
    if (!email || !password) return;
    elements.authError.classList.add("hidden");
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      elements.authError.textContent = error.message;
      elements.authError.classList.remove("hidden");
      return;
    }
    elements.authDialog.close();
    await refreshAuthState();
    applyRange(elements.startDate.value, elements.endDate.value);
  }

  initialize();
})();
