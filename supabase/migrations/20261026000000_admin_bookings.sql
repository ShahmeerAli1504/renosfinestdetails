-- Bookings the owner adds by hand in /admin (phone, walk-in, regulars) without an online deposit.
-- They are stored with payment_status = 'waived' and block their time slot just like a paid booking.

-- 1) Allow the new payment status
alter table public.quote_requests drop constraint if exists quote_requests_payment_status_check;
alter table public.quote_requests
  add constraint quote_requests_payment_status_check
  check (payment_status is null or payment_status in ('pending', 'paid', 'failed', 'refunded', 'waived'));

-- 2) Email is optional for hand-entered bookings (phone-only customers)
alter table public.quote_requests drop constraint if exists quote_requests_email_check;
alter table public.quote_requests
  add constraint quote_requests_email_check check (char_length(email) <= 200);

-- 3) Admins may insert rows
drop policy if exists "admins insert requests" on public.quote_requests;
create policy "admins insert requests"
  on public.quote_requests for insert
  to authenticated
  with check (public.is_admin());

-- 4) One booking per date + start time, paid or no-deposit
drop index if exists public.quote_requests_slot_idx;
create unique index quote_requests_slot_idx
  on public.quote_requests (preferred_date, preferred_time)
  where kind = 'booking' and payment_status in ('paid', 'waived');

-- 5) The booking page hides times taken by either kind
create or replace function public.booked_slots(d date)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select preferred_time
  from public.quote_requests
  where kind = 'booking'
    and payment_status in ('paid', 'waived')
    and preferred_date = d
    and preferred_time is not null;
$$;

revoke all on function public.booked_slots(date) from public;
grant execute on function public.booked_slots(date) to anon, authenticated;
