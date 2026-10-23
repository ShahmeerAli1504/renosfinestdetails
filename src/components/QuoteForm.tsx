import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { BUSINESS, CONTACT_METHODS, SERVICE_OPTIONS } from '../lib/business';

type Status = { kind: 'idle' | 'sending' | 'sent' | 'error'; text: string };

const IDLE_ONLINE = `Your request goes straight to our team. Prefer to talk? Call or text ${BUSINESS.phoneDisplay}.`;
const IDLE_OFFLINE =
  'This demo prepares your request to send by text message. Online submission to the owner will be enabled when their email or form service is connected.';

function smsBody(d: FormData) {
  return `Reno's Finest Details - Detail Request\nName: ${d.get('name')}\nPhone: ${d.get('phone')}\nEmail: ${d.get('email')}\nArea: ${d.get('location')}\nVehicle: ${d.get('vehicle')}\nService: ${d.get('service')}\nPreferred date: ${d.get('date') || 'Flexible'}\nContact via: ${d.get('method')}\nNotes: ${d.get('message') || 'None'}`;
}

function openSms(d: FormData) {
  const a = document.createElement('a');
  a.href = `sms:${BUSINESS.smsNumber}?body=` + encodeURIComponent(smsBody(d));
  a.click();
}

export function QuoteForm() {
  const online = !!supabase;
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: online ? IDLE_ONLINE : IDLE_OFFLINE });
  const [lastData, setLastData] = useState<FormData | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);

    if (!supabase) {
      openSms(d);
      setStatus({
        kind: 'sent',
        text: `Your text messaging app should open with your request ready to send. Please send the message to complete your inquiry. If it did not open, call ${BUSINESS.phoneDisplay}.`,
      });
      return;
    }

    setStatus({ kind: 'sending', text: 'Sending your request…' });
    const payload = Object.fromEntries(d.entries());
    const { data, error } = await supabase.functions.invoke('submit-request', { body: payload });

    if (error || !data?.ok) {
      let msg = data?.error as string | undefined;
      if (!msg && error && 'context' in error) {
        try {
          msg = (await (error as { context: Response }).context.json())?.error;
        } catch {
          /* ignore */
        }
      }
      setLastData(d);
      setStatus({
        kind: 'error',
        text: (msg ? msg + ' ' : "We couldn't send your request online. ") + `You can text it to us instead, or call ${BUSINESS.phoneDisplay}.`,
      });
      return;
    }

    form.reset();
    setStatus({
      kind: 'sent',
      text: "Thank you! Your detail request has been sent. We'll follow up soon using your preferred contact method to discuss the job, availability, and your quote.",
    });
  }

  const sending = status.kind === 'sending';

  return (
    <form className="form" id="quote-form" onSubmit={onSubmit}>
      <h3>DETAIL REQUEST FORM</h3>
      <p>
        {online
          ? "Complete the form below and we'll get back to you with availability and a personalized quote."
          : "Complete the form below to prepare your inquiry. We'll add direct form delivery once the business email is confirmed."}
      </p>
      <div className="fields">
        <div className="field">
          <label htmlFor="name">FULL NAME *</label>
          <input id="name" name="name" required maxLength={100} autoComplete="name" placeholder="Your name" />
        </div>
        <div className="field">
          <label htmlFor="phone">PHONE NUMBER *</label>
          <input id="phone" name="phone" type="tel" required maxLength={30} autoComplete="tel" placeholder="(775) 000-0000" />
        </div>
        <div className="field">
          <label htmlFor="email">EMAIL ADDRESS *</label>
          <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="field">
          <label htmlFor="location">CITY / AREA *</label>
          <input id="location" name="location" required maxLength={100} placeholder="Reno, Sparks, etc." />
        </div>
        <div className="field">
          <label htmlFor="vehicle">VEHICLE YEAR / MAKE / MODEL *</label>
          <input id="vehicle" name="vehicle" required maxLength={150} placeholder="2022 Ford Explorer" />
        </div>
        <div className="field">
          <label htmlFor="service">SERVICE INTEREST *</label>
          <select id="service" name="service" required defaultValue="">
            <option value="">Select a service</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="date">PREFERRED DATE</label>
          <input id="date" name="date" type="date" />
        </div>
        <div className="field">
          <label htmlFor="method">PREFERRED CONTACT</label>
          <select id="method" name="method">
            {CONTACT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="message">TELL US ABOUT YOUR VEHICLE</label>
          <textarea
            id="message"
            name="message"
            maxLength={2000}
            placeholder="Vehicle condition, stains, pet hair, specific areas of concern, or questions..."
          />
        </div>
        {/* Spam trap: hidden from people, bots tend to fill it in. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="company">Company</label>
          <input id="company" name="company" tabIndex={-1} autoComplete="off" />
        </div>
      </div>
      <button className="btn" type="submit" style={{ width: '100%', opacity: sending ? 0.7 : 1 }} disabled={sending}>
        {sending ? 'SENDING…' : online ? 'SEND REQUEST →' : 'PREPARE REQUEST →'}
      </button>
      <p
        className="form-note"
        id="form-status"
        aria-live="polite"
        style={status.kind === 'sent' ? { color: '#f7f8f8' } : status.kind === 'error' ? { color: '#f26a68' } : undefined}
      >
        {status.text}
        {status.kind === 'error' && lastData && (
          <>
            {' '}
            <a href="#" style={{ textDecoration: 'underline', color: '#f7f8f8' }} onClick={(e) => { e.preventDefault(); openSms(lastData); }}>
              Text my request →
            </a>
          </>
        )}
      </p>
    </form>
  );
}
