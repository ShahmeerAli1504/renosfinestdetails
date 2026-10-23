// Supabase Edge Function: submit-request
// Validates a detail request from the website, stores it, and emails the owner.
//
// Secrets (supabase secrets set ...):
//   SMTP_HOST        — smtp.gmail.com
//   SMTP_PORT        — 465 (Supabase blocks outbound 25 and 587, so use 465 / SSL)
//   SMTP_USER        — the Gmail address that sends the alerts
//   SMTP_PASS        — a Gmail *App Password* for that account (not the normal password)
//   OWNER_EMAIL      — where new-request alerts go (comma-separate for several)
//   FROM_NAME        — display name on the alert, e.g. Reno's Finest Details Website
//   ALLOWED_ORIGINS  — optional, comma-separated, e.g. "https://renosfinestdetails.com,https://www.renosfinestdetails.com"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

// Must match SERVICE_OPTIONS in src/lib/business.ts exactly.
const SERVICES = [
  'Interior Only – Standard ($120)',
  'Interior Only – Premium ($190)',
  'Spot Cleaning ($115)',
  'Exterior & Interior – Standard ($165)',
  'Exterior & Interior – Premium ($240)',
  'One-Step Polish (from $400)',
  'Two-Step Polish (from $600)',
  'RV Wash Only ($7/ft)',
  'RV Wash & Wax ($9/ft)',
  'Boat Wash & Wax ($10/ft)',
  'Add-Ons Only',
  'Fleet / Commercial',
  'Other / Not Sure',
];
const METHODS = ['Phone call', 'Text message', 'Email'];
const MAX_PER_HOUR_PER_IP = 5;

const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allow = allowed.length === 0 ? '*' : allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { ok: false, error: 'Method not allowed.' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { ok: false, error: 'Invalid request.' });
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success.
  if (str(body.rfd_hp, 200)) return json(req, 200, { ok: true });

  const data = {
    name: str(body.name, 100),
    phone: str(body.phone, 30),
    email: str(body.email, 200).toLowerCase(),
    location: str(body.location, 100),
    vehicle: str(body.vehicle, 150),
    service: str(body.service, 100),
    preferred_date: str(body.date, 10) || null,
    contact_method: str(body.method, 30) || 'Phone call',
    message: str(body.message, 2000) || null,
  };

  const errors: string[] = [];
  if (data.name.length < 2) errors.push('name');
  if (data.phone.replace(/\D/g, '').length < 10) errors.push('phone number');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.push('email address');
  if (!data.location) errors.push('city / area');
  if (!data.vehicle) errors.push('vehicle');
  if (!SERVICES.includes(data.service)) errors.push('service');
  if (data.preferred_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.preferred_date)) errors.push('preferred date');
  if (!METHODS.includes(data.contact_method)) data.contact_method = 'Phone call';
  if (errors.length) {
    return json(req, 400, { ok: false, error: `Please check your ${errors.join(', ')}.` });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Basic rate limit per IP (hashed, never stored raw).
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ip_hash = await sha256(ip + (Deno.env.get('SUPABASE_URL') ?? ''));
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('quote_requests')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ip_hash)
    .gte('created_at', since);
  if ((count ?? 0) >= MAX_PER_HOUR_PER_IP) {
    return json(req, 429, { ok: false, error: 'Too many requests — please try again later.' });
  }

  const { data: row, error } = await supabase
    .from('quote_requests')
    .insert({ ...data, ip_hash })
    .select('id, created_at')
    .single();
  if (error) {
    console.error('insert failed', error);
    return json(req, 500, { ok: false, error: 'Something went wrong saving your request.' });
  }

  // Email alert to the owner (best effort — the request is already saved).
  let emailed = false;
  const smtpUser = Deno.env.get('SMTP_USER') ?? '';
  const smtpPass = (Deno.env.get('SMTP_PASS') ?? '').replace(/\s+/g, ''); // Gmail shows app passwords with spaces
  const to = (Deno.env.get('OWNER_EMAIL') ?? smtpUser).split(',').map((s) => s.trim()).filter(Boolean);
  const fromName = Deno.env.get('FROM_NAME') ?? "Reno's Finest Details Website";
  if (smtpUser && smtpPass && to.length) {
    const rows: [string, string][] = [
      ['Name', data.name],
      ['Phone', data.phone],
      ['Email', data.email],
      ['City / Area', data.location],
      ['Vehicle', data.vehicle],
      ['Service', data.service],
      ['Preferred date', data.preferred_date ?? 'Flexible'],
      ['Preferred contact', data.contact_method],
      ['Notes', data.message ?? 'None'],
    ];
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="margin:0 0 4px;color:#e23d3c">New detail request</h2>
        <p style="margin:0 0 18px;color:#555">Submitted ${new Date(row.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} (Pacific)</p>
        <table style="border-collapse:collapse;width:100%">
          ${rows
            .map(
              ([k, v]) =>
                `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#777;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
            )
            .join('')}
        </table>
        <p style="margin-top:20px">
          <a href="tel:${escapeHtml(data.phone)}" style="background:#e23d3c;color:#fff;padding:10px 16px;text-decoration:none;display:inline-block">Call ${escapeHtml(data.name)}</a>
        </p>
      </div>`;
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    try {
      const port = Number(Deno.env.get('SMTP_PORT') ?? '465');
      const transporter = nodemailer.createTransport({
        host: Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: { name: fromName, address: smtpUser }, // Gmail only sends as the signed-in address
        to,
        replyTo: { name: data.name, address: data.email },
        subject: `New detail request: ${data.name} — ${data.service}`,
        html,
        text,
      });
      emailed = true;
    } catch (e) {
      console.error('gmail smtp error', e);
    }
    if (emailed) await supabase.from('quote_requests').update({ email_sent: true }).eq('id', row.id);
  }

  return json(req, 200, { ok: true, id: row.id, emailed });
});
