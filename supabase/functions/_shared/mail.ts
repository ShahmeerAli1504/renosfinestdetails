// Gmail SMTP helper shared by edge functions.
// Secrets: SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS (Gmail App Password), OWNER_EMAIL, FROM_NAME.
import nodemailer from 'npm:nodemailer@6.9.16';

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function ownerEmails(): string[] {
  const user = Deno.env.get('SMTP_USER') ?? '';
  return (Deno.env.get('OWNER_EMAIL') ?? user).split(',').map((s) => s.trim()).filter(Boolean);
}

export function mailConfigured() {
  return !!(Deno.env.get('SMTP_USER') && Deno.env.get('SMTP_PASS'));
}

/** Sends one email through Gmail. Returns true on success, never throws. */
export async function sendMail(opts: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: { name: string; address: string };
}): Promise<boolean> {
  const user = Deno.env.get('SMTP_USER') ?? '';
  const pass = (Deno.env.get('SMTP_PASS') ?? '').replace(/\s+/g, ''); // Gmail shows app passwords with spaces
  if (!user || !pass || opts.to.length === 0) return false;
  try {
    const port = Number(Deno.env.get('SMTP_PORT') ?? '465');
    const transporter = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: { name: Deno.env.get('FROM_NAME') ?? "Reno's Finest Details", address: user },
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
  } catch (e) {
    console.error('gmail smtp error', e);
    return false;
  }
}

/** Simple two-column details table used in alert emails. */
export function detailsTable(rows: [string, string][]) {
  return `<table style="border-collapse:collapse;width:100%">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#777;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join('')}</table>`;
}
