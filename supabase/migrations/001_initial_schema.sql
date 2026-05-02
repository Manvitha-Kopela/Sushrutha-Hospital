-- ============================================================
-- Sushruta Hospital – Initial Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- APPOINTMENTS TABLE (existing – ensure it exists)
create table if not exists appointments (
  id            uuid default gen_random_uuid() primary key,
  patient_name  text not null,
  phone         text not null,
  doctor        text not null,
  session       text,
  appointment_date date not null,
  age_gender    text,
  reason        text,
  status        text default 'confirmed',
  created_at    timestamptz default now()
);

-- TESTIMONIALS TABLE (new)
create table if not exists testimonials (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  location    text,
  rating      int not null check (rating between 1 and 5),
  message     text not null,
  doctor      text,
  approved    boolean default false,  -- admin must approve before showing
  created_at  timestamptz default now()
);

-- Row Level Security
alter table testimonials enable row level security;
alter table appointments enable row level security;

-- Allow anyone to INSERT a testimonial
create policy "Anyone can submit testimonial"
  on testimonials for insert
  with check (true);

-- Allow anyone to READ approved testimonials
create policy "Anyone can read approved testimonials"
  on testimonials for select
  using (approved = true);

-- Allow anon to insert appointments
create policy "Anyone can book appointment"
  on appointments for insert
  with check (true);

-- Admins (service role) can do everything – handled server-side
