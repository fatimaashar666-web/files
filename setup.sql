-- Run this whole file in Supabase Dashboard > SQL Editor.

-- 1. Table
create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  email        text not null,
  phone        text not null,
  service      text not null,
  booking_date date not null,
  booking_time time not null,
  notes        text,
  status       text not null default 'pending'
               check (status in ('pending','confirmed','cancelled','completed')),
  created_at   timestamptz not null default now()
);

-- 2. One active booking per slot (also stops race conditions the JS check can't).
create unique index bookings_unique_active_slot
  on public.bookings (booking_date, booking_time)
  where status <> 'cancelled';

-- 3. Row Level Security: ON, with explicit policies only.
alter table public.bookings enable row level security;

-- Anyone (anon) may create a booking, but only as 'pending'.
create policy "Public can create pending bookings"
  on public.bookings for insert to anon, authenticated
  with check (status = 'pending');

-- Only the admin (a signed-in user with this email) can read/update/delete full rows.
-- Replace the email below with your own admin user's email.
create policy "Admin can read bookings"
  on public.bookings for select to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com');

create policy "Admin can update bookings"
  on public.bookings for update to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com')
  with check ((auth.jwt() ->> 'email') = 'admin@example.com');

create policy "Admin can delete bookings"
  on public.bookings for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com');

-- 4. Public view: only non-sensitive columns (no email, phone or notes).
-- Used for the public list and for availability checks.
create view public.public_bookings as
  select id, full_name, service, booking_date, booking_time, status
  from public.bookings;

grant select on public.public_bookings to anon, authenticated;
