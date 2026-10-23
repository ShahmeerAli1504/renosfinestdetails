-- Reno's Finest Details — database schema
-- Tables: quote_requests (form submissions), gallery_photos (site gallery), admins (who can manage them)

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admins can see admin list"
  on public.admins for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Detail / quote requests
-- Inserted only by the submit-request edge function (service role), never directly by visitors.
-- ---------------------------------------------------------------------------
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (char_length(phone) between 7 and 30),
  email text not null check (char_length(email) between 3 and 200),
  location text not null check (char_length(location) between 1 and 100),
  vehicle text not null check (char_length(vehicle) between 1 and 150),
  service text not null check (char_length(service) between 1 and 100),
  preferred_date date,
  contact_method text not null default 'Phone call',
  message text check (message is null or char_length(message) <= 2000),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'scheduled', 'completed', 'archived')),
  notes text,
  email_sent boolean not null default false,
  ip_hash text
);

create index if not exists quote_requests_created_at_idx on public.quote_requests (created_at desc);
create index if not exists quote_requests_status_idx on public.quote_requests (status);
create index if not exists quote_requests_ip_hash_idx on public.quote_requests (ip_hash, created_at desc);

alter table public.quote_requests enable row level security;

create policy "admins read requests"
  on public.quote_requests for select
  to authenticated
  using (public.is_admin());

create policy "admins update requests"
  on public.quote_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins delete requests"
  on public.quote_requests for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Gallery photos
-- image_url: a site path (e.g. /assets/work-01.webp) for photos bundled with the site
-- storage_path: a file in the public "gallery" storage bucket for photos uploaded in the admin
-- ---------------------------------------------------------------------------
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  storage_path text,
  image_url text,
  alt text not null default '',
  category text not null default 'vehicles' check (category in ('vehicles', 'fleet', 'interior')),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  show_on_home boolean not null default false,
  constraint gallery_photos_has_image check (storage_path is not null or image_url is not null)
);

create index if not exists gallery_photos_order_idx on public.gallery_photos (sort_order, created_at);

alter table public.gallery_photos enable row level security;

create policy "anyone can view published photos"
  on public.gallery_photos for select
  to anon, authenticated
  using (is_published or public.is_admin());

create policy "admins insert photos"
  on public.gallery_photos for insert
  to authenticated
  with check (public.is_admin());

create policy "admins update photos"
  on public.gallery_photos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins delete photos"
  on public.gallery_photos for delete
  to authenticated
  using (public.is_admin());

-- Seed with the photos that ship with the site (same order and categories as the original design).
insert into public.gallery_photos (image_url, alt, category, sort_order, show_on_home)
select * from (values
  ('/assets/work-01.webp', 'Polaris fleet vehicles at Reno Rodeo', 'fleet', 10, true),
  ('/assets/work-02.webp', 'Detailed custom-wrapped business vehicle', 'vehicles', 20, true),
  ('/assets/work-03.webp', 'White GMC Denali pickup after detailing', 'vehicles', 30, true),
  ('/assets/work-04.webp', 'White GMC pickup with a clean glossy finish', 'vehicles', 40, true),
  ('/assets/work-05.webp', 'White Ford SUV in sunset light', 'vehicles', 50, true),
  ('/assets/work-06.webp', 'Front of white Ford SUV after detailing', 'vehicles', 60, true),
  ('/assets/work-07.webp', 'Luxury motorhome exterior detailing', 'fleet', 70, false),
  ('/assets/work-08.webp', 'Silver GMC Denali HD pickup exterior', 'vehicles', 80, false),
  ('/assets/work-09.webp', 'Silver GMC truck after exterior detail', 'vehicles', 90, false),
  ('/assets/work-10.webp', 'Vehicle console before interior cleaning', 'interior', 100, false),
  ('/assets/work-11.webp', 'Vehicle console after interior cleaning', 'interior', 110, false)
) as seed(image_url, alt, category, sort_order, show_on_home)
where not exists (select 1 from public.gallery_photos);

-- ---------------------------------------------------------------------------
-- Storage bucket for admin-uploaded gallery photos (publicly readable)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "public read gallery files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');

create policy "admins upload gallery files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());

create policy "admins update gallery files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

create policy "admins delete gallery files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin());
