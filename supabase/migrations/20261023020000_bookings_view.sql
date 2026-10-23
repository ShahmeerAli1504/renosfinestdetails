-- "bookings": the online orders (paid-deposit bookings) on their own, for the Table Editor and reports.
-- The rows live in quote_requests (kind = 'booking'); this view just filters and orders them.
-- security_invoker = the caller's permissions apply, so only admins can read it through the API.
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
  notes
from public.quote_requests
where kind = 'booking'
order by preferred_date desc nulls last, preferred_time;
