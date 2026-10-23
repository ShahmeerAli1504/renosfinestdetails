# Reno's Finest Details — Website

Full-stack site for Reno's Finest Details (mobile auto detailing, Reno NV).

- **Frontend:** React + Vite, deployed on **Vercel**. Looks exactly like the original HTML design (same stylesheet), fully responsive.
- **Backend:** **Supabase**, which provides:
  - Postgres database for detail requests and gallery photos, with row-level security
  - an edge function `submit-request` that validates the form, stops spam, saves the request, and emails the owner (via Resend)
  - Storage bucket `gallery` for photos uploaded from the admin
  - Auth for the owner's admin login
- **Admin dashboard:** `/admin` lets the owner see and manage requests (status, notes, search) and the photo gallery (upload, edit, reorder, hide, delete).

```
├── index.html               Vite entry (meta tags, fonts)
├── public/assets/           Logo + work photos (served at /assets/...)
├── src/
│   ├── styles.css           Original stylesheet, unchanged
│   ├── admin.css            Admin dashboard styles
│   ├── pages/               Home, Gallery, Admin, NotFound
│   ├── components/          Layout (top bar/header/footer), PhotoGrid + lightbox, QuoteForm
│   └── lib/                 Supabase client, router, photo data, business info
├── supabase/
│   ├── migrations/          Database schema, security policies, storage bucket, seed photos
│   └── functions/submit-request/   Form handler + owner email
├── reference/original-demo.html    The original single-file design
└── vercel.json              SPA routing + caching headers
```

The site works even before Supabase is connected. The gallery uses the bundled photos, and the form falls back to opening a prefilled text message to (775) 857-0381, the same way the original demo did.

---

## 1. Run locally

```bash
npm install
cp .env.example .env.local     # fill in after step 2 (optional for local preview)
npm run dev                    # http://localhost:5173
```

## 2. Set up Supabase (backend)

1. Create a project at https://supabase.com/dashboard.
2. Link this folder and push the database:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase db push
   ```
   This creates the tables, security policies, the `gallery` storage bucket, and seeds the 11 existing photos.
   (No CLI? Paste the contents of `supabase/migrations/20261019000000_init.sql` into **SQL Editor → Run**.)
3. **Email alerts.** Create a free account at https://resend.com, get an API key, and verify your sending domain. Until the domain is verified, Resend only delivers to your own Resend account email. Then:
   ```bash
   cp supabase/functions/.env.example supabase/functions/.env   # fill in values
   npx supabase secrets set --env-file supabase/functions/.env
   ```
   | Secret | Meaning |
   | --- | --- |
   | `RESEND_API_KEY` | Resend API key. Optional: requests are still saved without it |
   | `OWNER_EMAIL` | Where new-request emails go. Comma-separate several addresses |
   | `FROM_EMAIL` | Verified sender, e.g. `Reno's Finest Details <requests@renosfinestdetails.com>` |
   | `ALLOWED_ORIGINS` | Optional. Your site URL(s), comma-separated, to restrict which sites may post the form |
4. Deploy the form function:
   ```bash
   npx supabase functions deploy submit-request --no-verify-jwt
   ```
5. **Create the owner's admin login.** In **Authentication → Users → Add user**, enter the owner's email and password and tick "Auto confirm". Then in **SQL Editor** run:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```
6. Under **Authentication → URL Configuration**, set **Site URL** to your live domain so password-reset links work.

## 3. Deploy the frontend on Vercel

1. Push this repo to GitHub, then go to https://vercel.com/new and import it. Vercel detects Vite automatically.
2. Add these **Environment Variables** (from Supabase → Project Settings → API):
   - `VITE_SUPABASE_URL` = `https://YOUR-PROJECT-REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the anon / publishable key. It's safe to expose in the browser, because security is enforced by row-level security.
3. Deploy. To add the custom domain, go to Vercel → Project → Settings → Domains.

After changing env vars, redeploy so the new values are built in.

---

## How it works

**Detail request form:** the browser sends the form to the `submit-request` function, which:
- validates every field
- drops bot submissions caught by the hidden honeypot field
- rate-limits each visitor to 5 requests per hour (the IP is stored only as a hash)
- inserts the request into `quote_requests` with the service role
- emails the owner with reply-to set to the customer

Visitors can't read or write the table directly. If sending fails, the visitor gets a one-tap "Text my request" fallback.

**Gallery:** the gallery is read from `gallery_photos`, which anyone can read for published photos. Photos uploaded in the admin are resized to a maximum of 1800px, converted to WebP in the browser, and stored in the `gallery` bucket. "On home page" controls the 6-photo Recent Work grid, and "Order" controls the sort order.

**Admin security:** only users listed in `public.admins` can read or change requests and manage photos. This is enforced in the database by RLS policies and the `is_admin()` function, not only in the UI.

## Before going live (from the original notes)
- Confirm with the owner that ceramic coating, paint correction, and RV services are offered.
- Confirm service claims, photos, business hours and prices. Add verified reviews only, never invented ones.
