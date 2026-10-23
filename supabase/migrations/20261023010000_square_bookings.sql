-- Online bookings paid with Square.
-- Bookings live in quote_requests (kind = 'booking') so they show up in the same admin list.
-- Rows are written only by the create-booking edge function (service role).

alter table public.quote_requests
  add column if not exists kind text not null default 'quote',
  add column if not exists preferred_time text,
  add column if not exists deposit_cents integer,
  add column if not exists payment_status text,
  add column if not exists square_payment_id text,
  add column if not exists receipt_url text,
  add column if not exists payment_idempotency_key text;

alter table public.quote_requests drop constraint if exists quote_requests_kind_check;
alter table public.quote_requests
  add constraint quote_requests_kind_check check (kind in ('quote', 'booking'));

alter table public.quote_requests drop constraint if exists quote_requests_payment_status_check;
alter table public.quote_requests
  add constraint quote_requests_payment_status_check
  check (payment_status is null or payment_status in ('pending', 'paid', 'failed', 'refunded'));

alter table public.quote_requests drop constraint if exists quote_requests_preferred_time_check;
alter table public.quote_requests
  add constraint quote_requests_preferred_time_check
  check (preferred_time is null or char_length(preferred_time) <= 20);

create unique index if not exists quote_requests_idem_idx
  on public.quote_requests (payment_idempotency_key)
  where payment_idempotency_key is not null;

-- One paid booking per date + start time. Marking a booking 'refunded' in the admin frees the slot.
create unique index if not exists quote_requests_slot_idx
  on public.quote_requests (preferred_date, preferred_time)
  where kind = 'booking' and payment_status = 'paid';

-- Public lookup of taken start times for a date (no customer details exposed).
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
    and payment_status = 'paid'
    and preferred_date = d
    and preferred_time is not null;
$$;

revoke all on function public.booked_slots(date) from public;
grant execute on function public.booked_slots(date) to anon, authenticated;
