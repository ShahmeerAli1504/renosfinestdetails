import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/* Income dashboard for the admin.
 * Income per job = the final total the owner records on the request card.
 * If no total is recorded yet, a paid online deposit counts instead (dated the day it was paid).
 * Refunded deposits count as $0. */

type Row = {
  id: string;
  created_at: string;
  name: string;
  service: string;
  kind?: 'quote' | 'booking';
  preferred_date: string | null;
  preferred_time?: string | null;
  deposit_cents?: number | null;
  payment_status?: string | null;
  job_total_cents?: number | null;
  status: string;
};

type Entry = { date: string; cents: number; service: string; source: 'total' | 'deposit' };
type Bucket = { key: string; label: string; long: string; cents: number; jobs: number };

const TZ = 'America/Los_Angeles';
const dayOf = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso));
const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const usd = (cents: number, digits = 0) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
const compact = (cents: number) => {
  const d = cents / 100;
  return d >= 1000 ? `$${(d / 1000).toFixed(d % 1000 === 0 ? 0 : 1)}K` : `$${Math.round(d)}`;
};
const monthName = (ym: string, style: 'short' | 'long' = 'long') =>
  new Date(ym + '-15T12:00:00Z').toLocaleDateString('en-US', { month: style, year: 'numeric', timeZone: 'UTC' });

function lastMonths(n: number) {
  const [y, m] = todayStr().split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 15));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

/** Monday-start weeks clipped to the month. */
function weeksOf(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks: { start: number; end: number }[] = [];
  let start = 1;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun
    if (dow === 0 || d === days) {
      weeks.push({ start, end: d });
      start = d + 1;
    }
  }
  return weeks;
}

function toEntries(rows: Row[]): Entry[] {
  const out: Entry[] = [];
  for (const r of rows) {
    if (r.job_total_cents && r.job_total_cents > 0) {
      out.push({ date: r.preferred_date ?? dayOf(r.created_at), cents: r.job_total_cents, service: r.service, source: 'total' });
    } else if (r.kind === 'booking' && r.payment_status === 'paid' && r.deposit_cents) {
      out.push({ date: dayOf(r.created_at), cents: r.deposit_cents, service: r.service, source: 'deposit' });
    }
  }
  return out;
}

export function Overview() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<string>('last12');
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase!.from('quote_requests').select('*').order('created_at', { ascending: false });
    setLoading(false);
    if (error) return setError(error.message);
    setRows(data as Row[]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const months = useMemo(() => lastMonths(12), []);
  const entries = useMemo(() => toEntries(rows), [rows]);

  const { buckets, inPeriod, title, unit } = useMemo(() => {
    if (period === 'last12') {
      const b: Bucket[] = months.map((ym) => ({ key: ym, label: monthName(ym, 'short').split(' ')[0], long: monthName(ym), cents: 0, jobs: 0 }));
      const idx = new Map(b.map((x, i) => [x.key, i]));
      const inP: Entry[] = [];
      for (const e of entries) {
        const i = idx.get(e.date.slice(0, 7));
        if (i === undefined) continue;
        b[i].cents += e.cents;
        b[i].jobs += 1;
        inP.push(e);
      }
      return { buckets: b, inPeriod: inP, title: 'Income by month, last 12 months', unit: 'Month' };
    }
    const mon = new Date(period + '-15T12:00:00Z').toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const b: Bucket[] = weeksOf(period).map((w, i) => ({
      key: String(i),
      label: w.start === w.end ? `${mon} ${w.start}` : `${mon} ${w.start}–${w.end}`,
      long: w.start === w.end ? `${mon} ${w.start}` : `${mon} ${w.start} – ${w.end}`,
      cents: 0,
      jobs: 0,
    }));
    const ranges = weeksOf(period);
    const inP: Entry[] = [];
    for (const e of entries) {
      if (e.date.slice(0, 7) !== period) continue;
      const day = Number(e.date.slice(8, 10));
      const i = ranges.findIndex((w) => day >= w.start && day <= w.end);
      if (i < 0) continue;
      b[i].cents += e.cents;
      b[i].jobs += 1;
      inP.push(e);
    }
    return { buckets: b, inPeriod: inP, title: `Income by week, ${monthName(period)}`, unit: 'Week' };
  }, [period, entries, months]);

  // Period stats
  const inRange = (iso: string) => {
    const d = dayOf(iso);
    return period === 'last12' ? d.slice(0, 7) >= months[0] : d.slice(0, 7) === period;
  };
  const income = inPeriod.reduce((s, e) => s + e.cents, 0);
  const jobs = inPeriod.length;
  const depositsCollected = rows
    .filter((r) => r.kind === 'booking' && r.payment_status === 'paid' && inRange(r.created_at))
    .reduce((s, r) => s + (r.deposit_cents ?? 0), 0);
  const newBookings = rows.filter((r) => r.kind === 'booking' && (r.payment_status === 'paid' || r.payment_status === 'waived') && inRange(r.created_at)).length;
  const quotes = rows.filter((r) => (r.kind ?? 'quote') === 'quote' && inRange(r.created_at)).length;

  const byService = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of inPeriod) m.set(e.service, (m.get(e.service) ?? 0) + e.cents);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [inPeriod]);

  const today = todayStr();
  const upcoming = rows
    .filter((r) => r.kind === 'booking' && (r.payment_status === 'paid' || r.payment_status === 'waived') && r.preferred_date && r.preferred_date >= today && r.status !== 'archived')
    .sort((a, b) => (a.preferred_date! + (a.preferred_time ?? '')).localeCompare(b.preferred_date! + (b.preferred_time ?? '')))
    .slice(0, 6);
  const missingTotals = rows.filter((r) => r.status === 'completed' && !r.job_total_cents).length;

  if (loading) return <p className="lead">Loading dashboard…</p>;

  return (
    <div className="ov">
      {error && <p className="form-note admin-error">{error}</p>}

      <div className="admin-toolbar">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="ov-period">PERIOD</label>
          <select id="ov-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="last12">Last 12 months (by month)</option>
            {[...months].reverse().map((ym) => (
              <option key={ym} value={ym}>{monthName(ym)} (by week)</option>
            ))}
          </select>
        </div>
        <button className="btn ghost" onClick={load}>REFRESH</button>
      </div>

      <div className="ov-stats">
        <div className="ov-stat ov-hero">
          <span>Income</span>
          <strong>{usd(income)}</strong>
          <small>{period === 'last12' ? 'Last 12 months' : monthName(period)}</small>
        </div>
        <div className="ov-stat"><span>Jobs counted</span><strong>{jobs}</strong><small>Avg {jobs ? usd(income / jobs) : '$0'}</small></div>
        <div className="ov-stat"><span>Paid bookings</span><strong>{newBookings}</strong><small>Booked online</small></div>
        <div className="ov-stat"><span>Deposits collected</span><strong>{usd(depositsCollected)}</strong><small>Online + in person</small></div>
        <div className="ov-stat"><span>Quote requests</span><strong>{quotes}</strong><small>Received</small></div>
      </div>

      <div className="admin-panel ov-panel">
        <div className="ov-head">
          <h3>{title}</h3>
          <button className="admin-linkbtn" onClick={() => setShowTable((s) => !s)}>{showTable ? 'Show chart' : 'Show as table'}</button>
        </div>
        {showTable ? (
          <table className="ov-table">
            <thead><tr><th>{unit}</th><th>Jobs</th><th>Income</th></tr></thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.key}><td>{b.long}</td><td>{b.jobs}</td><td>{usd(b.cents)}</td></tr>
              ))}
              <tr className="total"><td>Total</td><td>{jobs}</td><td>{usd(income)}</td></tr>
            </tbody>
          </table>
        ) : (
          <ColumnChart buckets={buckets} />
        )}
        <p className="form-note ov-note">
          Income uses the <strong>final total</strong> recorded on each request (dated by the service date). Bookings without a final
          total yet count their $50 deposit on the day it was paid. Refunded deposits count as $0.
          {missingTotals > 0 && <> <span className="ov-warn">{missingTotals} completed job{missingTotals > 1 ? 's have' : ' has'} no final total yet.</span></>}
        </p>
      </div>

      <div className="ov-grid">
        <div className="admin-panel ov-panel">
          <h3>Income by service</h3>
          {byService.length === 0 ? (
            <p className="lead" style={{ margin: 0 }}>No income recorded for this period yet.</p>
          ) : (
            <ul className="ov-bars">
              {byService.map(([svc, cents]) => (
                <li key={svc} title={`${svc}: ${usd(cents)}`}>
                  <div className="ov-bar-label"><span>{svc}</span><strong>{usd(cents)}</strong></div>
                  <div className="ov-bar-track"><div className="ov-bar-fill" style={{ width: `${(cents / byService[0][1]) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="admin-panel ov-panel">
          <h3>Upcoming bookings</h3>
          {upcoming.length === 0 ? (
            <p className="lead" style={{ margin: 0 }}>No upcoming bookings.</p>
          ) : (
            <ul className="ov-upcoming">
              {upcoming.map((r) => (
                <li key={r.id}>
                  <div className="ov-when">
                    <strong>{new Date(r.preferred_date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}</strong>
                    <span>{r.preferred_time}</span>
                  </div>
                  <div className="ov-who"><strong>{r.name}</strong><span>{r.service}</span></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* Single-series column chart: thin columns, 4px rounded caps, recessive grid, hover tooltip. */
function ColumnChart({ buckets }: { buckets: Bucket[] }) {
  const [hoverRaw, setHover] = useState<number | null>(null);
  // Switching period changes the number of bars; drop a hover index that no longer exists.
  const hover = hoverRaw !== null && hoverRaw < buckets.length ? hoverRaw : null;
  useEffect(() => setHover(null), [buckets.length]);
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(900);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 280;
  const pad = { l: 52, r: 8, t: 26, b: 34 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = Math.max(0, ...buckets.map((b) => b.cents));
  const step = niceStep(max);
  const top = Math.max(step * 4, Math.ceil(max / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const band = iw / buckets.length;
  const bw = Math.min(24, band * 0.6);
  const y = (c: number) => pad.t + ih - (c / top) * ih;
  const maxIdx = max > 0 ? buckets.findIndex((b) => b.cents === max) : -1;
  // On narrow screens show every other month label so they don't collide.
  const labelEvery = band < 46 ? 2 : 1;

  return (
    <div className="ov-chart" ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Income chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="ov-grid-line" />
            <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" className="ov-axis">{compact(t)}</text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const cx = pad.l + band * i + band / 2;
          const h = Math.max(0, pad.t + ih - y(b.cents));
          const r = Math.min(4, h, bw / 2);
          const x0 = cx - bw / 2;
          const yTop = pad.t + ih - h;
          const path =
            h > 0
              ? `M${x0},${pad.t + ih} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + bw - r} Q${x0 + bw},${yTop} ${x0 + bw},${yTop + r} V${pad.t + ih} Z`
              : '';
          return (
            <g key={b.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="transparent" />
              {hover === i && <rect x={pad.l + band * i + 2} y={pad.t} width={band - 4} height={ih} className="ov-hover-band" />}
              {path && <path d={path} className={'ov-col' + (hover !== null && hover !== i ? ' dim' : '')} />}
              {i === maxIdx && hover === null && (
                <text x={cx} y={yTop - 8} textAnchor="middle" className="ov-cap">{compact(b.cents)}</text>
              )}
              {(i % labelEvery === 0 || hover === i) && (
                <text x={cx} y={H - 10} textAnchor="middle" className="ov-axis">{b.label}</text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} className="ov-baseline" />
      </svg>
      {hover !== null && (
        <div className="ov-tip" style={{ left: Math.min(W - 80, Math.max(80, pad.l + band * hover + band / 2)) }}>
          <span>{buckets[hover].long}</span>
          <strong>{usd(buckets[hover].cents)}</strong>
          <span>{buckets[hover].jobs} job{buckets[hover].jobs === 1 ? '' : 's'}</span>
        </div>
      )}
    </div>
  );
}

function niceStep(maxCents: number) {
  const max = Math.max(maxCents, 10000) / 4; // at least $100 per gridline; ~4 gridlines
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}
