# Restaurant Sales Dashboard

แดชบอร์ดสรุปยอดขายร้านอาหารแบบ responsive ใช้ Vanilla JavaScript และ Tailwind CSS ผ่าน CDN โดยมีตัวกรองวันนี้/เมื่อวาน/เดือนนี้, เลือกช่วงวันที่เอง, KPI 3 ค่า และ Top 10 เมนูขายดี

## การล็อกอินผู้ดูแลระบบ

ระบบใช้บัญชีผู้ดูแลแบบง่ายเพียงบัญชีเดียว โดยไม่ผูกอีเมลหรือ Supabase Auth

1. ตั้ง `ADMIN_USERNAME` เป็นชื่อที่ต้องการ
2. ตั้ง `ADMIN_PASSWORD` เป็นรหัสผ่าน และเก็บเป็น runtime secret ของ Sites เท่านั้น
3. ตั้ง `ADMIN_SESSION_SECRET` เป็นข้อความสุ่มยาว ๆ และเก็บเป็น runtime secret เช่นกัน
4. เปิด `/login` เพื่อเข้าสู่ระบบ หรือเข้าที่ `/admin` และ `/dashboard` โดยตรง ระบบจะพาไปหน้า Login อัตโนมัติ

รหัสผ่านจะไม่อยู่ใน source code หรือ browser bundle ระบบออก session cookie ที่เซ็นด้วย `ADMIN_SESSION_SECRET`; `/dashboard` และ `/api/jinko-bills` ตรวจสอบ session ซ้ำในเส้นทางจริงด้วย เพื่อไม่ให้ไฟล์ Dashboard เดิมถูกเปิดตรง ๆ ได้.

## แหล่งข้อมูล Jinko Order

ค่าเริ่มต้นของระบบดึงบิลที่คิดเงินแล้วจาก Jinko Order อัตโนมัติผ่าน `/api/jinko-bills` ซึ่งเชื่อมกับ API บันทึกบิลของ Jinko Order โดยตรง ข้อมูลต้นทางปัจจุบันส่งย้อนหลัง **7 วัน**; ตัวกรองวันที่ในแดชบอร์ดจะทำงานภายในช่วงข้อมูลดังกล่าว

หากต้องการเก็บประวัติมากกว่า 7 วัน ให้ตั้งงาน sync ฝั่ง backend/POS บันทึกบิลเข้าฐาน Supabase แล้วเปลี่ยน `salesSource` เป็น `"supabase"` ใน `public/config.js`.

## เริ่มใช้งานจริงกับ Supabase

1. เปิด **Supabase Dashboard → SQL Editor** แล้วรันไฟล์ `supabase/schema.sql`.
2. สร้างผู้ใช้สำหรับพนักงานใน **Authentication** และเพิ่มแถวใน `staff_profiles` ตามตัวอย่างท้ายไฟล์ SQL เพื่อกำหนดร้านที่ผู้ใช้นั้นดูได้.
3. คัดลอก Project URL และ **Publishable key** จาก **Connect** ไปใส่ใน `public/config.js`.
4. ให้ระบบ POS หรือ backend ที่เชื่อถือได้บันทึกข้อมูลลง `orders` และ `order_items` โดยเก็บ `price` เป็นราคาต่อหน่วย. ห้ามวาง `service_role` หรือ secret key ไว้หน้าเว็บ.

เมื่อยังไม่ตั้งค่า Supabase หน้าเว็บจะแสดงโหมดตัวอย่าง ซึ่งยึด KPI และเมนูหลักจากไฟล์ที่ให้ไว้ใน Google Drive เพื่อให้ทดลองตัวกรองช่วงวันได้ทันที.

## รูปแบบข้อมูล

`orders` คือบิลที่ปิดแล้ว: `id`, `restaurant_id`, `table_no`, `total_price`, `created_at`

`order_items` คือรายการอาหารในบิล: `id`, `order_id`, `menu_name`, `quantity`, `price`

`fetchDashboardData(startDate, endDate)` อยู่ใน `public/dashboard.js` และใช้ `.gte('created_at', ...)` กับ `.lte('created_at', ...)` เพื่อให้ตัวกรองช่วงวันที่ดึงข้อมูลจาก Supabase แบบ dynamic.
