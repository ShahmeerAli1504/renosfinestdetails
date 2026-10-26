-- ============================================================================
-- Reno's Finest Details: create the real admin login and remove the demo one
-- Supabase → SQL Editor → paste this whole file → fill in the two lines below → Run.
-- Safe to run more than once. Delete the password from this file after running it.
-- ============================================================================

do $$
declare
  admin_email    text := 'renosfinestdetails@gmail.com';  -- ← the real admin email
  admin_password text := 'RenoSFinestDetails2023!';                         -- ← a strong password (12+ characters)
  uid uuid;
begin
  if admin_email like 'CHANGE_ME%' or admin_password = 'CHANGE_ME' or length(admin_password) < 12 then
    raise exception 'Fill in admin_email and a password of at least 12 characters first.';
  end if;
  admin_email := lower(trim(admin_email));

  -- 1) Create (or update the password of) the real admin user
  select id into uid from auth.users where email = admin_email;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', admin_email,
      extensions.crypt(admin_password, extensions.gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}', '{}',
      '', '', '', ''
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid::text, uid,
            jsonb_build_object('sub', uid::text, 'email', admin_email, 'email_verified', true),
            'email', now(), now(), now());
  else
    update auth.users
       set encrypted_password = extensions.crypt(admin_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = uid;
  end if;

  -- 2) Make them an admin
  insert into public.admins (user_id) values (uid) on conflict (user_id) do nothing;

  -- 3) Remove the demo admin (its admins row is removed automatically) and the demo data
  delete from auth.users where email = 'demo@renosfinestdetails.com';
  delete from public.quote_requests where name like 'DEMO %';
end $$;

-- Check: should list only the new admin
select u.email, a.created_at as admin_since
from public.admins a join auth.users u on u.id = a.user_id;
