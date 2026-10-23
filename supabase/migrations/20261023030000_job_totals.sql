-- Final amount charged for a job, entered by the owner in /admin. Drives the income dashboard.
alter table public.quote_requests
  add column if not exists job_total_cents integer;

alter table public.quote_requests drop constraint if exists quote_requests_job_total_check;
alter table public.quote_requests
  add constraint quote_requests_job_total_check check (job_total_cents is null or job_total_cents between 0 and 10000000);

-- Add it to the bookings view (new columns must go at the end).
create or replace view public.bookings
with (security_invoker = on) as
select
  id,
  created_at,
  preferred_date as booking_date,
  preferred_time as booking_time,
  service,
  name,
  phone,
  email,
  location,
  vehicle,
  message,
  round(deposit_cents / 100.0, 2) as deposit_usd,
  payment_status,
  square_payment_id,
  receipt_url,
  status,
  notes,
  round(job_total_cents / 100.0, 2) as final_total_usd
from public.quote_requests
where kind = 'booking'
order by preferred_date desc nulls last, preferred_time;
