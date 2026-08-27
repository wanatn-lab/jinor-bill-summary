/**
 * ตั้งค่าจาก Supabase Dashboard > Connect > App Frameworks
 * ใช้ Publishable key เท่านั้น — ห้ามใส่ service_role/secret key ในไฟล์นี้
 */
window.RESTAURANT_DASHBOARD_CONFIG = {
  // "jinko" uses paid bills from Jinko Order. Its current history API returns 7 days.
  // Change to "supabase" only after configuring the credentials and staff access below.
  salesSource: "jinko",
  jinkoBillsPath: "/api/jinko-bills",
  supabaseUrl: "",
  supabasePublishableKey: "",
  currency: "THB",
  locale: "th-TH",
};
