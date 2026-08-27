-- Restaurant Sales Dashboard: Supabase schema
-- Run this once in Supabase Dashboard > SQL Editor.
-- The browser dashboard reads with a Publishable key and an authenticated
-- staff session. Never put a service_role / secret key in public/config.js.

begin;

create extension if not exists pgcrypto;

-- A private mapping of staff users to the restaurant they may read.
create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid not null,
  created_at timestamptz not null default now()
);

-- One row = one closed customer bill.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  table_no text not null,
  total_price numeric(12, 2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

-- One row = one menu item in a bill. price is the unit price at time of sale.
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_name text not null check (length(trim(menu_name)) > 0),
  quantity integer not null check (quantity > 0),
  price numeric(12, 2) not null check (price >= 0)
);

-- These indexes support date filtering, joins, and top-menu aggregation.
create index if not exists orders_restaurant_created_at_idx
  on public.orders (restaurant_id, created_at desc);
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

-- Public schema is reachable through Supabase Data API; enable RLS explicitly.
alter table public.staff_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Data API access is opt-in. RLS below still limits the rows each staff member sees.
grant usage on schema public to authenticated;
grant select on public.staff_profiles to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

-- Staff can see only their own mapping, never another restaurant's mapping.
drop policy if exists "Staff read own profile" on public.staff_profiles;
create policy "Staff read own profile"
  on public.staff_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Dashboard read policy: only bills for the signed-in staff member's restaurant.
drop policy if exists "Staff read own restaurant orders" on public.orders;
create policy "Staff read own restaurant orders"
  on public.orders for select
  to authenticated
  using (
    restaurant_id = (
      select staff_profiles.restaurant_id
      from public.staff_profiles
      where staff_profiles.user_id = (select auth.uid())
    )
  );

-- An item is readable only when its parent bill is readable.
drop policy if exists "Staff read own restaurant order items" on public.order_items;
create policy "Staff read own restaurant order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
    )
  );

commit;

-- After creating an Auth user, map that user to the correct restaurant:
-- insert into public.staff_profiles (user_id, restaurant_id)
-- values ('<AUTH_USER_UUID>', '<RESTAURANT_UUID>');
--
-- Insert data through a trusted POS/backend using the service_role key on the
-- server only. Do not add public INSERT/UPDATE/DELETE policies for this dashboard.
