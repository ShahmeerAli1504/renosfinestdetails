-- ============================================================================
-- Reno's Finest Details — one-time setup + DEMO admin
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to run more than once.
--
-- Demo admin login (for trying /admin):
--   Email:    demo@renosfinestdetails.com
--   Password: DemoAdmin123!
-- Delete it (bottom of this file) once Juan has his real login.
-- ============================================================================

-- 1) Booking / payment columns (same as migration 20261023010000) ------------
alter table public.quote_requests
  add column if not exists kind text not null default 'quote',
  add column if not exists preferred_time text,
  add column if not exists deposit_cents integer,
  add column if not exists payment_status text,
  add column if not exists square_payment_id text,
  add column if not exists receipt_url text,
  add column if not exists payment_idempotency_key text;

alter table public.quote_requests drop constraint if exists quote_requests_kind_check;
alter table public.quote_requests add constraint quote_requests_kind_check check (kind in ('quote', 'booking'));
alter table public.quote_requests drop constraint if exists quote_requests_payment_status_check;
alter table public.quote_requests add constraint quote_requests_payment_status_check
  check (payment_status is null or payment_status in ('pending', 'paid', 'failed', 'refunded'));
alter table public.quote_requests drop constraint if exists quote_requests_preferred_time_check;
alter table public.quote_requests add constraint quote_requests_preferred_time_check
  check (preferred_time is null or char_length(preferred_time) <= 20);

create unique index if not exists quote_requests_idem_idx
  on public.quote_requests (payment_idempotency_key) where payment_idempotency_key is not null;
create unique index if not exists quote_requests_slot_idx
  on public.quote_requests (preferred_date, preferred_time) where kind = 'booking' and payment_status = 'paid';

create or replace function public.booked_slots(d date)
returns setof text language sql stable security definer set search_path = public as $$
  select preferred_time from public.quote_requests
  where kind = 'booking' and payment_status = 'paid' and preferred_date = d and preferred_time is not null;
$$;
revoke all on function public.booked_slots(date) from public;
grant execute on function public.booked_slots(date) to anon, authenticated;

-- 2) "bookings" view (same as migration 20261023020000) ----------------------
create or replace view public.bookings with (security_invoker = on) as
select id, created_at, preferred_date as booking_date, preferred_time as booking_time, service,
       name, phone, email, location, vehicle, message,
       round(deposit_cents / 100.0, 2) as deposit_usd, payment_status, square_payment_id, receipt_url, status, notes
from public.quote_requests
where kind = 'booking'
order by preferred_date desc nulls last, preferred_time;

-- 3) Demo admin user ---------------------------------------------------------
do $$
declare
  uid uuid;
  demo_email text := 'demo@renosfinestdetails.com';
begin
  select id into uid from auth.users where email = demo_email;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', demo_email,
      extensions.crypt('DemoAdmin123!', extensions.gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}', '{}',
      '', '', '', ''
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid::text, uid,
            jsonb_build_object('sub', uid::text, 'email', demo_email, 'email_verified', true),
            'email', now(), now(), now());
  end if;
  insert into public.admins (user_id) values (uid) on conflict (user_id) do nothing;
end $$;

-- 4) Demo data so the dashboard isn't empty (names start with "DEMO") ---------
insert into public.quote_requests
  (name, phone, email, location, vehicle, service, preferred_date, preferred_time, contact_method, message,
   kind, deposit_cents, payment_status, square_payment_id, status, email_sent)
select * from (values
  ('DEMO Booking Customer', '(775) 555-0101', 'demo.booking@example.com', 'Sparks', '2021 Toyota Tacoma',
   'Exterior & Interior – Premium ($240)', date '2026-10-30', '10:00 AM', 'Text message', 'Dog hair in back seat.',
   'booking', 5000, 'paid', 'DEMO-PAYMENT', 'new', true),
  ('DEMO Quote Customer', '(775) 555-0102', 'demo.quote@example.com', 'Reno', '34 ft Winnebago RV',
   'RV Wash & Wax ($9/ft)', date '2026-11-04', null, 'Phone call', 'How long does an RV take?',
   'quote', null, null, null, 'new', true)
) as v(name, phone, email, location, vehicle, service, preferred_date, preferred_time, contact_method, message,
       kind, deposit_cents, payment_status, square_payment_id, status, email_sent)
where not exists (select 1 from public.quote_requests where name like 'DEMO %');

-- ============================================================================
-- CLEAN UP LATER (run these when you're done testing):
--   delete from public.quote_requests where name like 'DEMO %';
--   delete from auth.users where email = 'demo@renosfinestdetails.com';
-- ============================================================================
