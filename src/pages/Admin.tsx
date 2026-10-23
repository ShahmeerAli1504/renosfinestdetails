import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Overview } from './AdminOverview';
import { Link } from '../lib/router';
import { BOOKING_TIMES, BUSINESS } from '../lib/business';

type RequestStatus = 'new' | 'contacted' | 'scheduled' | 'completed' | 'archived';
const STATUSES: RequestStatus[] = ['new', 'contacted', 'scheduled', 'completed', 'archived'];

type QuoteRequest = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  vehicle: string;
  service: string;
  preferred_date: string | null;
  contact_method: string;
  message: string | null;
  status: RequestStatus;
  notes: string | null;
  email_sent: boolean;
  kind?: 'quote' | 'booking';
  preferred_time?: string | null;
  deposit_cents?: number | null;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | null;
  square_payment_id?: string | null;
  receipt_url?: string | null;
  job_total_cents?: number | null;
};

/** Booking attempts that never got paid (declined cards, abandoned checkouts). */
const isUnpaidBooking = (r: QuoteRequest) => r.kind === 'booking' && (r.payment_status === 'failed' || r.payment_status === 'pending');

export function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = "Admin | Reno's Finest Details";
    if (!supabase) return setReady(true);
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) return setIsAdmin(null);
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  let body;
  if (!supabase) {
    body = (
      <div className="admin-panel">
        <h3>BACKEND NOT CONNECTED</h3>
        <p className="lead">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in Vercel (or <code>.env.local</code>)
          and redeploy to enable the admin dashboard.
        </p>
      </div>
    );
  } else if (!ready) {
    body = <p className="lead">Loading…</p>;
  } else if (!session) {
    body = <Login />;
  } else if (isAdmin === false) {
    body = (
      <div className="admin-panel">
        <h3>NO ADMIN ACCESS</h3>
        <p className="lead">
          You're signed in as {session.user.email}, but this account hasn't been given admin access. See the README for the
          one-line SQL that grants it.
        </p>
        <button className="btn ghost" onClick={() => supabase!.auth.signOut()}>SIGN OUT</button>
      </div>
    );
  } else if (isAdmin) {
    body = <Dashboard email={session.user.email ?? ''} />;
  } else {
    body = <p className="lead">Checking access…</p>;
  }

  return (
    <main className="admin">
      <section className="page-hero">
        <div className="wrap">
          <div className="eyebrow">OWNER DASHBOARD</div>
          <h1>ADMIN.</h1>
          <p>Income, bookings and detail requests in one place.</p>
        </div>
      </section>
      <section className="section">
        <div className="wrap">{body}</div>
      </section>
    </main>
  );
}

function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    const { error } = await supabase!.auth.signInWithPassword({
      email: String(d.get('email')),
      password: String(d.get('password')),
    });
    setBusy(false);
    if (error) setError(error.message);
  }

  async function forgot() {
    const email = (document.getElementById('admin-email') as HTMLInputElement).value;
    if (!email) return setError('Enter your email first.');
    const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/admin' });
    if (error) setError(error.message);
    else setResetSent(true);
  }

  return (
    <form className="form admin-login" onSubmit={onSubmit}>
      <h3>SIGN IN</h3>
      <p>Owner and staff access only.</p>
      <div className="field">
        <label htmlFor="admin-email">EMAIL</label>
        <input id="admin-email" name="email" type="email" required autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="admin-password">PASSWORD</label>
        <input id="admin-password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'SIGNING IN…' : 'SIGN IN →'}</button>
      {error && <p className="form-note admin-error">{error}</p>}
      {resetSent && <p className="form-note">Check your inbox for a password reset link.</p>}
      <p className="form-note">
        <button type="button" className="admin-linkbtn" onClick={forgot}>Forgot password?</button>
      </p>
    </form>
  );
}

function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<'overview' | 'requests' | 'account'>('overview');
  return (
    <>
      <div className="admin-bar">
        <div className="filters" style={{ margin: 0 }}>
          <button className={'filter' + (tab === 'overview' ? ' active' : '')} onClick={() => setTab('overview')}>DASHBOARD</button>
          <button className={'filter' + (tab === 'requests' ? ' active' : '')} onClick={() => setTab('requests')}>BOOKINGS &amp; REQUESTS</button>
          <button className={'filter' + (tab === 'account' ? ' active' : '')} onClick={() => setTab('account')}>ACCOUNT</button>
        </div>
        <div className="admin-user">
          <span>{email}</span>
          <button className="filter" onClick={() => supabase!.auth.signOut()}>SIGN OUT</button>
        </div>
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'requests' && <Requests />}
      {tab === 'account' && <Account />}
    </>
  );
}

/* ---------------------------- Detail requests ---------------------------- */

function Requests() {
  const [rows, setRows] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<RequestStatus | 'all' | 'open' | 'bookings' | 'unpaid'>('open');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase!.from('quote_requests').select('*').order('created_at', { ascending: false });
    setLoading(false);
    if (error) return setError(error.message);
    setRows(data as QuoteRequest[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (id: string, patch: Partial<QuoteRequest>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase!.from('quote_requests').update(patch).eq('id', id);
    if (error) setError(error.message);
  };

  /** Move a booking to a new date/time. Waits for the database so a taken slot is reported, not shown as saved. */
  const reschedule = async (r: QuoteRequest, date: string, time: string): Promise<string | null> => {
    const stamp = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const line = `Rescheduled ${stamp}: ${whenLabel(r.preferred_date, r.preferred_time)} → ${whenLabel(date, time)}`;
    const patch: Partial<QuoteRequest> = {
      preferred_date: date,
      preferred_time: time,
      notes: r.notes ? `${r.notes}\n${line}` : line,
      ...(r.status === 'new' || r.status === 'contacted' ? { status: 'scheduled' as RequestStatus } : {}),
    };
    const { error } = await supabase!.from('quote_requests').update(patch).eq('id', r.id);
    if (error) {
      return error.code === '23505' ? 'That date and time is already booked. Pick another time.' : error.message;
    }
    setRows((all) => all.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
    return null;
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this request permanently?')) return;
    const { error } = await supabase!.from('quote_requests').delete().eq('id', id);
    if (error) return setError(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const real = rows.filter((r) => !isUnpaidBooking(r));
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: real.filter((r) => r.status === s).length }), {} as Record<RequestStatus, number>);
  const paidBookings = rows.filter((r) => r.kind === 'booking' && r.payment_status === 'paid').length;
  const q = query.trim().toLowerCase();
  const shown = rows
    .filter((r) => filter === 'all' || filter === 'unpaid' || !isUnpaidBooking(r))
    .filter((r) =>
      filter === 'all'
        ? true
        : filter === 'unpaid'
          ? isUnpaidBooking(r)
          : filter === 'bookings'
            ? r.kind === 'booking' && r.payment_status !== 'refunded' && !['completed', 'archived'].includes(r.status)
            : filter === 'open'
              ? !['completed', 'archived'].includes(r.status)
              : r.status === filter,
    )
    .filter((r) => !q || [r.name, r.email, r.phone, r.vehicle, r.location, r.service].join(' ').toLowerCase().includes(q));

  return (
    <div>
      <div className="statbar admin-stats">
        <div className="stat"><strong>{counts.new ?? 0}</strong><span>New</span></div>
        <div className="stat"><strong>{(counts.contacted ?? 0) + (counts.scheduled ?? 0)}</strong><span>In progress</span></div>
        <div className="stat"><strong>{paidBookings}</strong><span>Paid bookings</span></div>
      </div>

      <div className="admin-toolbar">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="req-filter">SHOW</label>
          <select id="req-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="open">Open (new, contacted, scheduled)</option>
            <option value="bookings">Upcoming paid bookings ({paidBookings})</option>
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{cap(s)} ({counts[s] ?? 0})</option>
            ))}
            <option value="unpaid">Unpaid booking attempts</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0, flex: 1 }}>
          <label htmlFor="req-search">SEARCH</label>
          <input id="req-search" placeholder="Name, phone, email, vehicle…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn ghost" onClick={load}>REFRESH</button>
      </div>

      {error && <p className="form-note admin-error">{error}</p>}
      {loading && <p className="lead">Loading requests…</p>}
      {!loading && shown.length === 0 && <div className="admin-panel"><p className="lead" style={{ margin: 0 }}>No requests here yet.</p></div>}

      <div className="admin-list">
        {shown.map((r) => (
          <RequestCard key={r.id} r={r} onUpdate={update} onDelete={remove} onReschedule={reschedule} />
        ))}
      </div>
    </div>
  );
}

function RequestCard({
  r,
  onUpdate,
  onDelete,
  onReschedule,
}: {
  r: QuoteRequest;
  onUpdate: (id: string, patch: Partial<QuoteRequest>) => void;
  onDelete: (id: string) => void;
  onReschedule: (r: QuoteRequest, date: string, time: string) => Promise<string | null>;
}) {
  const [rescheduling, setRescheduling] = useState(false);
  const [moved, setMoved] = useState(false);
  const canReschedule = r.kind === 'booking' && r.payment_status === 'paid' && !['completed', 'archived'].includes(r.status);
  const [notes, setNotes] = useState(r.notes ?? '');
  useEffect(() => setNotes(r.notes ?? ''), [r.notes]);
  const savedTotal = r.job_total_cents != null ? (r.job_total_cents / 100).toFixed(2) : '';
  const [total, setTotal] = useState(savedTotal);
  const totalCents = total.trim() === '' ? null : Math.round(Number(total) * 100);
  const totalValid = total.trim() === '' || (Number.isFinite(Number(total)) && Number(total) >= 0 && Number(total) < 100000);
  const dirty = (notes !== (r.notes ?? '') || total !== savedTotal) && totalValid;
  return (
    <article className={'card admin-req status-' + r.status}>
      <div className="admin-req-head">
        <div>
          <span className="num">{new Date(r.created_at).toLocaleString()}</span>
          <h3>{r.name}</h3>
          {r.kind === 'booking' && (
            <span className={'admin-badge pay-' + (r.payment_status ?? 'pending')}>
              {r.payment_status === 'paid'
                ? `BOOKED · $${((r.deposit_cents ?? 0) / 100).toFixed(0)} DEPOSIT PAID`
                : r.payment_status === 'refunded'
                  ? 'BOOKING · DEPOSIT REFUNDED'
                  : r.payment_status === 'failed'
                    ? 'BOOKING · PAYMENT FAILED'
                    : 'BOOKING · NOT PAID'}
            </span>
          )}
        </div>
        <select aria-label="Status" value={r.status} onChange={(e) => onUpdate(r.id, { status: e.target.value as RequestStatus })}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{cap(s)}</option>
          ))}
        </select>
      </div>
      <dl className="admin-dl">
        <dt>Service</dt><dd>{r.service}</dd>
        <dt>Vehicle</dt><dd>{r.vehicle}</dd>
        <dt>Area</dt><dd>{r.location}</dd>
        <dt>Phone</dt><dd><a href={'tel:' + r.phone}>{r.phone}</a> · <a href={'sms:' + r.phone}>Text</a></dd>
        <dt>Email</dt><dd><a href={'mailto:' + r.email}>{r.email}</a></dd>
        <dt>{r.kind === 'booking' ? 'Booked for' : 'Preferred date'}</dt>
        <dd>
          {r.preferred_date ? new Date(r.preferred_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'}
          {r.preferred_time ? ` at ${r.preferred_time}` : ''}
        </dd>
        {r.square_payment_id && (
          <>
            <dt>Payment</dt>
            <dd>
              Square {r.square_payment_id.slice(0, 10)}…{r.receipt_url && <> · <a href={r.receipt_url} target="_blank" rel="noopener">Receipt</a></>}
            </dd>
          </>
        )}
        <dt>Contact via</dt><dd>{r.contact_method}</dd>
      </dl>
      {r.message && <div className="quote" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{r.message}</div>}
      {rescheduling && (
        <ReschedulePanel
          r={r}
          onCancel={() => setRescheduling(false)}
          onSave={async (date, time) => {
            const err = await onReschedule(r, date, time);
            if (!err) {
              setRescheduling(false);
              setMoved(true);
            }
            return err;
          }}
        />
      )}
      {moved && !rescheduling && <NotifyCustomer r={r} onClose={() => setMoved(false)} />}
      <div className="field admin-total" style={{ marginTop: 18 }}>
        <label htmlFor={'total-' + r.id}>FINAL TOTAL CHARGED ($)</label>
        <input
          id={'total-' + r.id}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder={r.kind === 'booking' && r.payment_status === 'paid' ? 'Full price incl. the $50 deposit' : 'Enter when the job is done'}
        />
        {!totalValid && <span className="form-note admin-error">Enter a dollar amount.</span>}
      </div>
      <div className="field">
        <label htmlFor={'notes-' + r.id}>INTERNAL NOTES</label>
        <textarea id={'notes-' + r.id} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quote given, booked time, follow-up…" style={{ minHeight: 70 }} />
      </div>
      <div className="admin-actions">
        <button className="btn" disabled={!dirty} style={{ opacity: dirty ? 1 : 0.5 }} onClick={() => onUpdate(r.id, { notes, job_total_cents: totalCents })}>SAVE</button>
        {canReschedule && !rescheduling && (
          <button className="btn ghost" onClick={() => { setRescheduling(true); setMoved(false); }}>RESCHEDULE</button>
        )}
        <button className="btn ghost" onClick={() => onDelete(r.id)}>DELETE</button>
        {r.kind === 'booking' && r.payment_status === 'paid' && (
          <button
            className="btn ghost"
            onClick={() => {
              if (window.confirm('Mark this deposit as refunded? Refund it in your Square Dashboard first. This frees up the time slot.'))
                onUpdate(r.id, { payment_status: 'refunded' });
            }}
          >
            MARK REFUNDED
          </button>
        )}
        {!r.email_sent && <span className="form-note">Email alert not sent for this one.</span>}
      </div>
    </article>
  );
}

/* ------------------------------ Reschedule ------------------------------- */

function ReschedulePanel({
  r,
  onCancel,
  onSave,
}: {
  r: QuoteRequest;
  onCancel: () => void;
  onSave: (date: string, time: string) => Promise<string | null>;
}) {
  const [date, setDate] = useState(r.preferred_date ?? '');
  const [time, setTime] = useState(r.preferred_time ?? '');
  const [taken, setTaken] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Times already booked on the chosen date (this booking's own slot doesn't count).
  useEffect(() => {
    if (!date) return setTaken([]);
    let live = true;
    supabase!.rpc('booked_slots', { d: date }).then(({ data }) => {
      if (!live) return;
      const list = Array.isArray(data) ? (data as unknown[]).map((x) => (typeof x === 'string' ? x : (x as { booked_slots?: string })?.booked_slots ?? '')) : [];
      setTaken(list.filter((t) => t && !(date === r.preferred_date && t === r.preferred_time)));
    });
    return () => {
      live = false;
    };
  }, [date, r.preferred_date, r.preferred_time]);

  // Keep a legacy time (e.g. an old 5:00 PM booking) selectable if it's the current one.
  const times = r.preferred_time && !BOOKING_TIMES.includes(r.preferred_time) ? [...BOOKING_TIMES, r.preferred_time] : BOOKING_TIMES;
  const unchanged = date === r.preferred_date && time === r.preferred_time;
  const valid = !!date && !!time && !taken.includes(time) && !unchanged;

  async function save() {
    setBusy(true);
    setError('');
    const err = await onSave(date, time);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="admin-resched">
      <div className="eyebrow">RESCHEDULE BOOKING</div>
      <p className="form-note" style={{ margin: '4px 0 14px' }}>
        Currently {whenLabel(r.preferred_date, r.preferred_time)}. The deposit stays with the booking.
      </p>
      <div className="fields">
        <div className="field">
          <label htmlFor={'rs-date-' + r.id}>NEW DATE</label>
          <input id={'rs-date-' + r.id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={'rs-time-' + r.id}>NEW START TIME</label>
          <select id={'rs-time-' + r.id} value={time} onChange={(e) => setTime(e.target.value)}>
            <option value="">Select a time</option>
            {times.map((t) => (
              <option key={t} value={t} disabled={taken.includes(t)}>
                {t}{taken.includes(t) ? ' (booked)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="form-note admin-error">{error}</p>}
      <div className="admin-actions">
        <button className="btn" disabled={!valid || busy} style={{ opacity: valid && !busy ? 1 : 0.5 }} onClick={save}>
          {busy ? 'SAVING…' : 'SAVE NEW TIME'}
        </button>
        <button className="btn ghost" onClick={onCancel} disabled={busy}>CANCEL</button>
      </div>
    </div>
  );
}

/** After a reschedule: one-tap text or email to the customer with the new time. */
function NotifyCustomer({ r, onClose }: { r: QuoteRequest; onClose: () => void }) {
  const first = r.name.split(' ')[0];
  const when = whenLabel(r.preferred_date, r.preferred_time);
  const msg = `Hi ${first}, this is ${BUSINESS.owner} from ${BUSINESS.name}. Your detail has been rescheduled to ${when}. Reply or call ${BUSINESS.phoneDisplay} if you have any questions. Thank you!`;
  const subject = `Your detail has been rescheduled: ${when}`;
  return (
    <div className="admin-resched done">
      <div className="eyebrow">MOVED TO {when.toUpperCase()}</div>
      <p className="form-note" style={{ margin: '4px 0 14px' }}>Let {first} know about the new time:</p>
      <div className="admin-actions">
        <a className="btn" href={`sms:${r.phone}?&body=${encodeURIComponent(msg)}`}>TEXT {first.toUpperCase()}</a>
        <a className="btn ghost" href={`mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`}>EMAIL</a>
        <button className="btn ghost" onClick={onClose}>DONE</button>
      </div>
    </div>
  );
}

/* ------------------------------- Account -------------------------------- */

function Account() {
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const pw = String(d.get('password'));
    if (pw !== String(d.get('confirm'))) return setError('Passwords do not match.');
    const { error } = await supabase!.auth.updateUser({ password: pw });
    if (error) return setError(error.message);
    setError('');
    setMsg('Password updated.');
    form.reset();
  }
  return (
    <form className="form admin-login" onSubmit={onSubmit}>
      <h3>CHANGE PASSWORD</h3>
      <p>Use at least 8 characters.</p>
      <div className="field">
        <label htmlFor="new-pw">NEW PASSWORD</label>
        <input id="new-pw" name="password" type="password" minLength={8} required autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="confirm-pw">CONFIRM PASSWORD</label>
        <input id="confirm-pw" name="confirm" type="password" minLength={8} required autoComplete="new-password" />
      </div>
      <button className="btn" style={{ width: '100%' }}>UPDATE PASSWORD →</button>
      {msg && <p className="form-note">{msg}</p>}
      {error && <p className="form-note admin-error">{error}</p>}
      <p className="form-note"><Link href="/">← Back to the website</Link></p>
    </form>
  );
}

/* -------------------------------- utils --------------------------------- */

function whenLabel(date: string | null | undefined, time: string | null | undefined) {
  if (!date) return 'no date set';
  const d = new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return time ? `${d} at ${time}` : d;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
