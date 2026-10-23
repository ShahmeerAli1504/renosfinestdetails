# Reno's Finest Details — Website

Full-stack site for Reno's Finest Details (mobile auto detailing, Reno NV).

- **Frontend:** React + Vite, deployed on **Vercel**. Looks exactly like the original HTML design (same stylesheet), fully responsive.
- **Backend:** **Supabase**, which provides:
  - Postgres database for detail requests and gallery photos, with row-level security
  - an edge function `submit-request` that validates the quote form, stops spam, saves the request, and emails the owner (via Gmail SMTP)
  - an edge function `create-booking` for online booking: charges the $50 deposit through **Square**, saves the booking, and emails the owner and the customer
  - Storage bucket `gallery` for photos uploaded from the admin
  - Auth for the owner's admin login
- **Admin dashboard:** `/admin` opens on an income dashboard (monthly income for the last 12 months, or weekly for a chosen month, plus income by service and upcoming bookings). The second tab manages bookings and quote requests: status, final total charged, notes, rescheduling, refunds and search. Income counts each job's final total, or the paid deposit until a total is entered.
- **Gallery photos** are managed in code: add files to `public/assets` and list them in `src/lib/photos.ts` (plus a migration for the database list).

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
# put the single .env file in the project root (git-ignored); it holds every setting
npm run dev                    # http://localhost:5173
```

## 2. Set up Supabase (backend)

1. Project: `mdredbyhhmaeqenqpnlq` (https://mdredbyhhmaeqenqpnlq.supabase.co).
2. Link this folder and push the database:
   ```bash
   npx supabase login
   npx supabase link --project-ref mdredbyhhmaeqenqpnlq
   npx supabase db push
   ```
   This creates the tables, security policies, the `gallery` storage bucket, and adds all the gallery photos.
   (No CLI? Paste the contents of `supabase/migrations/20261019000000_init.sql` into **SQL Editor → Run**.)
3. **Email alerts (Gmail SMTP).** Requests are emailed to `renosfinestdetails@gmail.com`, sent from that same Gmail account.
   1. Sign in to that Gmail → Google Account → **Security** → turn on **2-Step Verification**.
   2. Then **App passwords** (search for it in Google Account) → create one named "Website". Copy the 16-character password.
   3. Paste it as `SMTP_PASS` in `.env`, then push the secrets (the function settings in `.env` become Supabase secrets):
   ```bash
   npx supabase secrets set --env-file .env
   ```
   | Secret | Meaning |
   | --- | --- |
   | `SMTP_HOST` / `SMTP_PORT` | `smtp.gmail.com` / `465`. Supabase blocks ports 25 and 587, so keep 465 |
   | `SMTP_USER` | Gmail account that sends the alerts |
   | `SMTP_PASS` | Gmail App Password. Requests are still saved if email fails |
   | `OWNER_EMAIL` | Where new-request emails go. Comma-separate several addresses |
   | `FROM_NAME` | Display name on the alert email |
   | `ALLOWED_ORIGINS` | Optional. Your site URL(s), comma-separated, to restrict which sites may post the form |

   Hitting **Reply** on an alert replies straight to the customer. `SUPABASE_SERVICE_ROLE_KEY` in that file is only for running the function locally. The hosted project supplies it automatically.
4. **Square (online booking).** In the Square Developer Dashboard → your app → **Credentials**, copy the **Production Access token** into `SQUARE_ACCESS_TOKEN` in `.env`. The application ID (`sq0idp-…`) and location ID (`L3ETSH83EM20E`) are already set. Run `npx supabase secrets set --env-file .env` again after adding it.
   - The booking page charges a **$50 deposit** (`DEPOSIT_CENTS=5000`), not the full price. If you change it, also change `deposit` in `src/lib/business.ts`.
   - Bookable services and start times live in `src/lib/business.ts` (`BOOKABLE_SERVICES`, `BOOKING_TIMES`) and must match `supabase/functions/create-booking/index.ts`.
   - Hours are 6 AM – 8 PM, 7 days a week; the last bookable start time is 4 PM because a detail takes 2–4 hours.
   - **Deposit policy:** refundable if the customer cancels or reschedules at least 48 hours before the appointment (`cancelHours` in `src/lib/business.ts` and `CANCEL_HOURS` in the `create-booking` function; change both together).
   - **Rescheduling:** press **Reschedule** on a paid booking in `/admin`, pick the new date and time (booked times are greyed out), and save. The change is logged in the booking's notes, and you get one-tap buttons to text or email the customer the new time.
   - **Refunds:** refund the deposit in the Square Dashboard, then press **Mark refunded** on the booking in `/admin` to free the time slot.
   - **Testing without real charges:** create Sandbox credentials in the Developer Dashboard, set both `VITE_SQUARE_ENVIRONMENT` and `SQUARE_ENVIRONMENT` to `sandbox`, use the Sandbox application ID, location ID and access token, and pay with Square's test card `4111 1111 1111 1111`.
5. Deploy both functions:
   ```bash
   npx supabase functions deploy submit-request --no-verify-jwt
   npx supabase functions deploy create-booking --no-verify-jwt
   ```
6. **Create the owner's admin login.** In **Authentication → Users → Add user**, enter the owner's email and password and tick "Auto confirm". Then in **SQL Editor** run:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'owner@example.com';
   ```
7. Under **Authentication → URL Configuration**, set **Site URL** to your live domain so password-reset links work.

## 3. Deploy the frontend on Vercel

1. Push this repo to GitHub, then go to https://vercel.com/new and import it. Vercel detects Vite automatically.
2. Add these **Environment Variables** (from Supabase → Project Settings → API):
   - `VITE_SUPABASE_URL` = `https://mdredbyhhmaeqenqpnlq.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the anon key (same value as in `.env`). It's safe to expose in the browser, because security is enforced by row-level security.
   - `VITE_SQUARE_APPLICATION_ID`, `VITE_SQUARE_LOCATION_ID`, `VITE_SQUARE_ENVIRONMENT` = same values as in `.env`.
   - Never add `SQUARE_ACCESS_TOKEN`, `SMTP_PASS` or the service role key to Vercel.
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

**Gallery:** the gallery is read from `gallery_photos`, which anyone can read for published photos. Photos uploaded in the admin are resized to a maximum of 1800px, converted to WebP in the browser, and stored in the `gallery` bucket. "On home page" controls the 9-photo Recent Work grid, and "Order" controls the sort order.

**Admin security:** only users listed in `public.admins` can read or change requests and manage photos. This is enforced in the database by RLS policies and the `is_admin()` function, not only in the UI.

## Before going live (from the original notes)
- Services, prices, hours, service area, deposit policy and owner bio come from Juan's info sheet (Oct 2026) and live in `src/lib/business.ts`. Ceramic coating is not offered.
- If you change `SERVICE_OPTIONS`, change `SERVICES` in the submit-request function to match and redeploy it.
- Add verified reviews only, never invented ones.
