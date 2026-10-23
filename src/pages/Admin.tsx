import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, GALLERY_BUCKET } from '../lib/supabase';
import { CATEGORY_LABELS, clearPhotoCache, rowToPhoto, type Category, type PhotoRow } from '../lib/photos';
import { Link } from '../lib/router';

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
};

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
          <p>Manage detail requests and the photo gallery.</p>
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
  const [tab, setTab] = useState<'requests' | 'gallery' | 'account'>('requests');
  return (
    <>
      <div className="admin-bar">
        <div className="filters" style={{ margin: 0 }}>
          <button className={'filter' + (tab === 'requests' ? ' active' : '')} onClick={() => setTab('requests')}>DETAIL REQUESTS</button>
          <button className={'filter' + (tab === 'gallery' ? ' active' : '')} onClick={() => setTab('gallery')}>GALLERY</button>
          <button className={'filter' + (tab === 'account' ? ' active' : '')} onClick={() => setTab('account')}>ACCOUNT</button>
        </div>
        <div className="admin-user">
          <span>{email}</span>
          <button className="filter" onClick={() => supabase!.auth.signOut()}>SIGN OUT</button>
        </div>
      </div>
      {tab === 'requests' && <Requests />}
      {tab === 'gallery' && <GalleryManager />}
      {tab === 'account' && <Account />}
    </>
  );
}

/* ---------------------------- Detail requests ---------------------------- */

function Requests() {
  const [rows, setRows] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<RequestStatus | 'all' | 'open'>('open');
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

  const remove = async (id: string) => {
    if (!window.confirm('Delete this request permanently?')) return;
    const { error } = await supabase!.from('quote_requests').delete().eq('id', id);
    if (error) return setError(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: rows.filter((r) => r.status === s).length }), {} as Record<RequestStatus, number>);
  const q = query.trim().toLowerCase();
  const shown = rows
    .filter((r) =>
      filter === 'all' ? true : filter === 'open' ? !['completed', 'archived'].includes(r.status) : r.status === filter,
    )
    .filter((r) => !q || [r.name, r.email, r.phone, r.vehicle, r.location, r.service].join(' ').toLowerCase().includes(q));

  return (
    <div>
      <div className="statbar admin-stats">
        <div className="stat"><strong>{counts.new ?? 0}</strong><span>New</span></div>
        <div className="stat"><strong>{(counts.contacted ?? 0) + (counts.scheduled ?? 0)}</strong><span>In progress</span></div>
        <div className="stat"><strong>{rows.length}</strong><span>Total requests</span></div>
      </div>

      <div className="admin-toolbar">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="req-filter">SHOW</label>
          <select id="req-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="open">Open (new, contacted, scheduled)</option>
            <option value="all">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{cap(s)} ({counts[s] ?? 0})</option>
            ))}
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
          <RequestCard key={r.id} r={r} onUpdate={update} onDelete={remove} />
        ))}
      </div>
    </div>
  );
}

function RequestCard({
  r,
  onUpdate,
  onDelete,
}: {
  r: QuoteRequest;
  onUpdate: (id: string, patch: Partial<QuoteRequest>) => void;
  onDelete: (id: string) => void;
}) {
  const [notes, setNotes] = useState(r.notes ?? '');
  const dirty = notes !== (r.notes ?? '');
  return (
    <article className={'card admin-req status-' + r.status}>
      <div className="admin-req-head">
        <div>
          <span className="num">{new Date(r.created_at).toLocaleString()}</span>
          <h3>{r.name}</h3>
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
        <dt>Preferred date</dt><dd>{r.preferred_date ? new Date(r.preferred_date + 'T12:00:00').toLocaleDateString() : 'Flexible'}</dd>
        <dt>Contact via</dt><dd>{r.contact_method}</dd>
      </dl>
      {r.message && <div className="quote" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{r.message}</div>}
      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor={'notes-' + r.id}>INTERNAL NOTES</label>
        <textarea id={'notes-' + r.id} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quote given, booked time, follow-up…" style={{ minHeight: 70 }} />
      </div>
      <div className="admin-actions">
        <button className="btn" disabled={!dirty} style={{ opacity: dirty ? 1 : 0.5 }} onClick={() => onUpdate(r.id, { notes })}>SAVE NOTES</button>
        <button className="btn ghost" onClick={() => onDelete(r.id)}>DELETE</button>
        {!r.email_sent && <span className="form-note">Email alert not sent for this one.</span>}
      </div>
    </article>
  );
}

/* ------------------------------- Gallery -------------------------------- */

function GalleryManager() {
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase!
      .from('gallery_photos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) return setError(error.message);
    setRows(data as PhotoRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const files = (form.elements.namedItem('file') as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    setBusy(true);
    setError('');
    setMsg('');
    let order = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    for (const file of Array.from(files)) {
      try {
        const blob = await compressImage(file);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const up = await supabase!.storage.from(GALLERY_BUCKET).upload(path, blob, { contentType: 'image/webp', cacheControl: '604800' });
        if (up.error) throw up.error;
        order += 10;
        const ins = await supabase!.from('gallery_photos').insert({
          storage_path: path,
          alt: String(d.get('alt') || '').trim() || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          category: d.get('category') as Category,
          show_on_home: d.get('show_on_home') === 'on',
          is_published: true,
          sort_order: order,
        });
        if (ins.error) throw ins.error;
      } catch (err) {
        setError(`${file.name}: ${(err as Error).message}`);
      }
    }
    setBusy(false);
    form.reset();
    clearPhotoCache();
    setMsg('Upload complete.');
    load();
  }

  async function save(row: PhotoRow) {
    const { id, alt, category, sort_order, is_published, show_on_home } = row;
    const { error } = await supabase!.from('gallery_photos').update({ alt, category, sort_order, is_published, show_on_home }).eq('id', id);
    if (error) return setError(error.message);
    clearPhotoCache();
    setMsg('Saved.');
    load();
  }

  async function remove(row: PhotoRow) {
    if (!window.confirm('Delete this photo from the gallery?')) return;
    if (row.storage_path) await supabase!.storage.from(GALLERY_BUCKET).remove([row.storage_path]);
    const { error } = await supabase!.from('gallery_photos').delete().eq('id', row.id);
    if (error) return setError(error.message);
    clearPhotoCache();
    load();
  }

  return (
    <div>
      <form className="form admin-upload" onSubmit={upload}>
        <h3>ADD PHOTOS</h3>
        <p>Images are resized and converted to WebP automatically before upload.</p>
        <div className="fields">
          <div className="field full">
            <label htmlFor="up-file">PHOTO(S) *</label>
            <input id="up-file" name="file" type="file" accept="image/*" multiple required />
          </div>
          <div className="field">
            <label htmlFor="up-alt">DESCRIPTION</label>
            <input id="up-alt" name="alt" placeholder="e.g. Black Tahoe after full detail" maxLength={160} />
          </div>
          <div className="field">
            <label htmlFor="up-cat">CATEGORY</label>
            <select id="up-cat" name="category" defaultValue="vehicles">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <label className="admin-check full">
            <input type="checkbox" name="show_on_home" /> Also show on the home page “Recent Work” grid (first 6 are shown)
          </label>
        </div>
        <button className="btn" disabled={busy} style={{ width: '100%' }}>{busy ? 'UPLOADING…' : 'UPLOAD →'}</button>
        {msg && <p className="form-note">{msg}</p>}
        {error && <p className="form-note admin-error">{error}</p>}
      </form>

      <div className="admin-photos">
        {rows.map((row) => (
          <PhotoEditor key={row.id + row.sort_order} row={row} onSave={save} onDelete={remove} />
        ))}
      </div>
    </div>
  );
}

function PhotoEditor({ row, onSave, onDelete }: { row: PhotoRow; onSave: (r: PhotoRow) => void; onDelete: (r: PhotoRow) => void }) {
  const [r, setR] = useState(row);
  const src = rowToPhoto(row).src;
  return (
    <article className={'admin-photo' + (r.is_published ? '' : ' unpublished')}>
      <img src={src} alt={r.alt} loading="lazy" />
      <div className="admin-photo-body">
        <div className="field">
          <label>DESCRIPTION</label>
          <input value={r.alt} onChange={(e) => setR({ ...r, alt: e.target.value })} />
        </div>
        <div className="fields">
          <div className="field">
            <label>CATEGORY</label>
            <select value={r.category} onChange={(e) => setR({ ...r, category: e.target.value as Category })}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>ORDER</label>
            <input type="number" value={r.sort_order} onChange={(e) => setR({ ...r, sort_order: Number(e.target.value) })} />
          </div>
        </div>
        <label className="admin-check"><input type="checkbox" checked={r.is_published} onChange={(e) => setR({ ...r, is_published: e.target.checked })} /> Published</label>
        <label className="admin-check"><input type="checkbox" checked={r.show_on_home} onChange={(e) => setR({ ...r, show_on_home: e.target.checked })} /> On home page</label>
        <div className="admin-actions">
          <button className="btn" onClick={() => onSave(r)}>SAVE</button>
          <button className="btn ghost" onClick={() => onDelete(r)}>DELETE</button>
        </div>
      </div>
    </article>
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

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function compressImage(file: File, max = 1800, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Could not read image'));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', quality));
    if (!blob) throw new Error('Could not convert image');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
