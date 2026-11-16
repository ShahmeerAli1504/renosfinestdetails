-- Date ranges the owner closes to new online bookings from /admin → Calendar → BLOCK DATES
-- (time off, fully booked weeks, events). Both ends are inclusive.
-- Replaces the hard-coded BLOCKED_DATES lists in src/lib/business.ts and the create-booking function.

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  from_date date not null,
  to_date date not null,
  reason text check (reason is null or char_length(reason) <= 200),
  constraint blocked_dates_order check (to_date >= from_date)
);

create index if not exists blocked_dates_range_idx on public.blocked_dates (to_date, from_date);

alter table public.blocked_dates enable row level security;

-- Only admins touch the table (the reason is an internal note). The create-booking function reads it
-- with the service role.
drop policy if exists "admins read blocked dates" on public.blocked_dates;
create policy "admins read blocked dates"
  on public.blocked_dates for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins insert blocked dates" on public.blocked_dates;
create policy "admins insert blocked dates"
  on public.blocked_dates for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins delete blocked dates" on public.blocked_dates;
create policy "admins delete blocked dates"
  on public.blocked_dates for delete
  to authenticated
  using (public.is_admin());

-- The booking page only needs the date ranges (current and upcoming), never the reason.
create or replace function public.blocked_ranges()
returns table (from_date date, to_date date)
language sql
stable
security definer
set search_path = public
as $$
  select b.from_date, b.to_date
  from public.blocked_dates b
  where b.to_date >= current_date - 1
  order by b.from_date;
$$;

revoke all on function public.blocked_ranges() from public;
grant execute on function public.blocked_ranges() to anon, authenticated;
