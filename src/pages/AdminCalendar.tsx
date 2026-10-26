import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BOOKING_TIMES } from '../lib/business';

/* Admin calendar: month, week and list views of every booking (and, optionally, quote requests with a
   preferred date). Clicking a booking opens the full booking card with all its controls. */

export type CalRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  vehicle: string;
  location: string;
  preferred_date: string | null;
  preferred_time?: string | null;
  status: string;
  kind?: 'quote' | 'booking';
  payment_status?: string | null;
  deposit_cents?: number | null;
  job_total_cents?: number | null;
  message?: string | null;
};

type View = 'month' | 'week' | 'list';

const DAY_START = 6; // 6 AM
const DAY_END = 20; // 8 PM
const HOUR_PX = 46;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ------------------------------- date utils ------------------------------- */

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', o);

/** "9:00 AM" → 9, "1:30 PM" → 13.5. Null when there's no time. */
function hourOf(t?: string | null): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((t ?? '').trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h + Number(m[2]) / 60;
}

/** Rough job length for the week view (details take 2–4 hours). */
function hoursFor(service: string) {
  if (/Spot Cleaning|Interior Only – Standard/.test(service)) return 2;
  if (/Premium|Polish|RV|Boat/.test(service)) return 4;
  return 3;
}

const isCancelled = (r: CalRow) => r.payment_status === 'refunded' || r.status === 'archived';
const isQuote = (r: CalRow) => (r.kind ?? 'quote') === 'quote';
const money = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function tone(r: CalRow) {
  if (isCancelled(r)) return 'cancelled';
  if (isQuote(r)) return 'quote';
  return r.status; // new | contacted | scheduled | completed
}

function statusLabel(r: CalRow) {
  if (r.payment_status === 'refunded') return 'Refunded';
  if (r.status === 'archived') return 'Archived';
  if (isQuote(r)) return 'Quote request';
  return r.status.charAt(0).toUpperCase() + r.status.slice(1);
}

/* -------------------------------- component -------------------------------- */

export function Calendar<T extends CalRow>({
  rows,
  loading,
  onRefresh,
  renderCard,
}: {
  rows: T[];
  loading: boolean;
  onRefresh: () => void;
  renderCard: (r: T) => ReactNode;
}) {
  const today = ymd(new Date());
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches ? 'list' : 'month',
  );
  const [cursor, setCursor] = useState(today); // any day inside the month/week being shown
  const [selected, setSelected] = useState(today);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showQuotes, setShowQuotes] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  // Close the booking drawer with Escape.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenId(null);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [openId]);

  const events = useMemo(
    () =>
      rows
        .filter((r) => !!r.preferred_date)
        .filter((r) => (isQuote(r) ? showQuotes : r.payment_status === 'paid' || r.payment_status === 'waived' || r.payment_status === 'refunded'))
        .filter((r) => showCancelled || !isCancelled(r))
        .sort((a, b) => (a.preferred_date! + pad(hourOf(a.preferred_time) ?? 99)).localeCompare(b.preferred_date! + pad(hourOf(b.preferred_time) ?? 99))),
    [rows, showQuotes, showCancelled],
  );

  const byDay = useMemo(() => {
    const m = new Map<string, T[]>();
    for (const e of events) {
      const list = m.get(e.preferred_date!) ?? [];
      list.push(e);
      m.set(e.preferred_date!, list);
    }
    return m;
  }, [events]);

  const cur = parse(cursor);
  const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
  const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
  const weekStart = startOfWeek(cur);

  const title =
    view === 'week'
      ? `${fmt(weekStart, { month: 'short', day: 'numeric' })} – ${fmt(addDays(weekStart, 6), { month: 'short', day: 'numeric', year: 'numeric' })}`
      : fmt(cur, { month: 'long', year: 'numeric' });

  const move = (dir: 1 | -1) => {
    const next = view === 'week' ? addDays(cur, 7 * dir) : new Date(cur.getFullYear(), cur.getMonth() + dir, 1);
    setCursor(ymd(next));
  };
  const goToday = () => {
    setCursor(today);
    setSelected(today);
  };

  // Stats for the month being shown (bookings only, not quotes or cancellations).
  const monthKey = cursor.slice(0, 7);
  const monthBookings = rows.filter(
    (r) => r.kind === 'booking' && (r.payment_status === 'paid' || r.payment_status === 'waived') && r.status !== 'archived' && r.preferred_date?.startsWith(monthKey),
  );
  const busyDays = new Set(monthBookings.map((r) => r.preferred_date)).size;
  const deposits = monthBookings.reduce((s, r) => s + (r.deposit_cents ?? 0), 0);
  const completed = monthBookings.filter((r) => r.status === 'completed');
  const earned = completed.reduce((s, r) => s + (r.job_total_cents ?? (r.payment_status === 'paid' ? r.deposit_cents ?? 0 : 0)), 0);
  const upcoming = monthBookings.filter((r) => r.preferred_date! >= today && r.status !== 'completed').length;

  const open = openId ? rows.find((r) => r.id === openId) ?? null : null;
  const openEvent = (r: T) => setOpenId(r.id);
  const pickDay = (d: string) => {
    setSelected(d);
    if (view !== 'list') setTimeout(() => document.getElementById('cal-day')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  return (
    <div className="cal">
      <div className="ov-stats cal-stats">
        <div className="ov-stat ov-hero"><span>Bookings in {fmt(cur, { month: 'long' })}</span><strong>{monthBookings.length}</strong><small>{upcoming} still to do</small></div>
        <div className="ov-stat"><span>Busy days</span><strong>{busyDays}</strong><small>of {monthEnd.getDate()}</small></div>
        <div className="ov-stat"><span>Deposits</span><strong>{money(deposits)}</strong><small>paid online</small></div>
        <div className="ov-stat"><span>Completed</span><strong>{completed.length}</strong><small>jobs done</small></div>
        <div className="ov-stat"><span>Earned</span><strong>{money(earned)}</strong><small>from completed jobs</small></div>
      </div>

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button className="filter" onClick={() => move(-1)} aria-label="Previous">‹</button>
          <button className="filter" onClick={goToday}>TODAY</button>
          <button className="filter" onClick={() => move(1)} aria-label="Next">›</button>
          <h3>{title}</h3>
        </div>
        <div className="cal-views">
          {(['month', 'week', 'list'] as View[]).map((v) => (
            <button key={v} className={'filter' + (view === v ? ' active' : '')} onClick={() => setView(v)}>{v.toUpperCase()}</button>
          ))}
          <button className="filter" onClick={onRefresh}>{loading ? 'LOADING…' : 'REFRESH'}</button>
        </div>
      </div>

      <div className="cal-options">
        <label className="admin-check"><input type="checkbox" checked={showQuotes} onChange={(e) => setShowQuotes(e.target.checked)} /> Show quote requests (preferred dates)</label>
        <label className="admin-check"><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Show refunded &amp; archived</label>
        <div className="cal-legend">
          <span className="t-new">New</span>
          <span className="t-contacted">Contacted</span>
          <span className="t-scheduled">Scheduled</span>
          <span className="t-completed">Completed</span>
          {showQuotes && <span className="t-quote">Quote</span>}
          {showCancelled && <span className="t-cancelled">Cancelled</span>}
        </div>
      </div>

      {view === 'month' && (
        <MonthGrid monthStart={monthStart} monthEnd={monthEnd} today={today} selected={selected} byDay={byDay} onPickDay={pickDay} onOpen={openEvent} />
      )}
      {view === 'week' && (
        <WeekGrid weekStart={weekStart} today={today} selected={selected} byDay={byDay} onPickDay={pickDay} onOpen={openEvent} />
      )}
      {view === 'list' && <ListView monthStart={monthStart} monthEnd={monthEnd} today={today} byDay={byDay} onOpen={openEvent} />}

      {view !== 'list' && <DayPanel day={selected} today={today} list={byDay.get(selected) ?? []} onOpen={openEvent} />}

      {open && (
        <div className="cal-drawer-bg" onClick={() => setOpenId(null)}>
          <aside className="cal-drawer" role="dialog" aria-modal="true" aria-label={`Booking for ${open.name}`} onClick={(e) => e.stopPropagation()}>
            <div className="cal-drawer-head">
              <div>
                <div className="eyebrow">{isQuote(open) ? 'QUOTE REQUEST' : 'BOOKING'}</div>
                <strong>{open.preferred_date ? fmt(parse(open.preferred_date), { weekday: 'long', month: 'long', day: 'numeric' }) : 'No date'}{open.preferred_time ? ` · ${open.preferred_time}` : ''}</strong>
              </div>
              <button className="filter" onClick={() => setOpenId(null)} aria-label="Close">✕ CLOSE</button>
            </div>
            {renderCard(open)}
          </aside>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- month --------------------------------- */

function MonthGrid<T extends CalRow>({
  monthStart,
  monthEnd,
  today,
  selected,
  byDay,
  onPickDay,
  onOpen,
}: {
  monthStart: Date;
  monthEnd: Date;
  today: string;
  selected: string;
  byDay: Map<string, T[]>;
  onPickDay: (d: string) => void;
  onOpen: (r: T) => void;
}) {
  const first = startOfWeek(monthStart);
  const weeks = Math.ceil((monthEnd.getDate() + monthStart.getDay()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i));
  return (
    <div className="cal-month">
      {WEEKDAYS.map((w) => (
        <div key={w} className="cal-wd">{w}</div>
      ))}
      {days.map((d) => {
        const key = ymd(d);
        const list = byDay.get(key) ?? [];
        const out = d.getMonth() !== monthStart.getMonth();
        const cls = ['cal-cell', out && 'out', key === today && 'today', key === selected && 'sel', key < today && 'past'].filter(Boolean).join(' ');
        return (
          <div key={key} className={cls} onClick={() => onPickDay(key)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onPickDay(key)}>
            <div className="cal-date">
              <span>{d.getDate()}</span>
              {list.length > 0 && <em>{list.length}</em>}
            </div>
            <div className="cal-chips">
              {list.slice(0, 3).map((r) => (
                <button
                  key={r.id}
                  className={'cal-chip t-' + tone(r)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(r);
                  }}
                  title={`${r.preferred_time ?? ''} ${r.name} — ${r.service}`}
                >
                  <b>{r.preferred_time?.replace(':00', '') ?? '—'}</b> {r.name.split(' ')[0]}
                </button>
              ))}
              {list.length > 3 && <span className="cal-more">+{list.length - 3} more</span>}
            </div>
            <div className="cal-dots" aria-hidden="true">
              {list.slice(0, 4).map((r) => (
                <i key={r.id} className={'t-' + tone(r)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- week ---------------------------------- */

function WeekGrid<T extends CalRow>({
  weekStart,
  today,
  selected,
  byDay,
  onPickDay,
  onOpen,
}: {
  weekStart: Date;
  today: string;
  selected: string;
  byDay: Map<string, T[]>;
  onPickDay: (d: string) => void;
  onOpen: (r: T) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
  const lastStart = hourOf(BOOKING_TIMES[BOOKING_TIMES.length - 1]) ?? 16;
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;

  return (
    <div className="cal-week-scroll">
      <div className="cal-week">
        <div className="cal-week-head">
          <div />
          {days.map((d) => {
            const key = ymd(d);
            return (
              <button key={key} className={'cal-week-day' + (key === today ? ' today' : '') + (key === selected ? ' sel' : '')} onClick={() => onPickDay(key)}>
                <span>{WEEKDAYS[d.getDay()]}</span>
                <strong>{d.getDate()}</strong>
              </button>
            );
          })}
        </div>
        <div className="cal-week-body" style={{ height: hours.length * HOUR_PX }}>
          <div className="cal-hours">
            {hours.map((h) => (
              <span key={h} style={{ top: (h - DAY_START) * HOUR_PX }}>{h % 12 || 12} {h < 12 ? 'AM' : 'PM'}</span>
            ))}
          </div>
          {days.map((d) => {
            const key = ymd(d);
            const list = byDay.get(key) ?? [];
            const timed = list.filter((r) => hourOf(r.preferred_time) !== null);
            const untimed = list.filter((r) => hourOf(r.preferred_time) === null);
            // Side-by-side lanes when jobs overlap.
            const lanes: number[] = [];
            const placed = timed.map((r) => {
              const start = hourOf(r.preferred_time)!;
              const end = Math.min(start + hoursFor(r.service), DAY_END);
              let lane = lanes.findIndex((busyUntil) => busyUntil <= start);
              if (lane === -1) lane = lanes.push(end) - 1;
              else lanes[lane] = end;
              return { r, start, end, lane };
            });
            const laneCount = Math.max(1, lanes.length);
            return (
              <div key={key} className={'cal-col' + (key === today ? ' today' : '')} onClick={() => onPickDay(key)}>
                {hours.map((h) => (
                  <div key={h} className="cal-hline" style={{ top: (h - DAY_START) * HOUR_PX }} />
                ))}
                <div className="cal-after" style={{ top: (lastStart - DAY_START + 1) * HOUR_PX }} title="No new jobs start after 4 PM" />
                {key === today && nowH >= DAY_START && nowH <= DAY_END && <div className="cal-now" style={{ top: (nowH - DAY_START) * HOUR_PX }} />}
                {placed.map(({ r, start, end, lane }) => (
                  <button
                    key={r.id}
                    className={'cal-block t-' + tone(r)}
                    style={{
                      top: (start - DAY_START) * HOUR_PX + 1,
                      height: (end - start) * HOUR_PX - 3,
                      left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                      width: `calc(${100 / laneCount}% - 4px)`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(r);
                    }}
                  >
                    <b>{r.preferred_time}</b>
                    <span>{r.name}</span>
                    <small>{r.service.replace(/\s*\(.*\)$/, '')}</small>
                  </button>
                ))}
                {untimed.map((r, i) => (
                  <button
                    key={r.id}
                    className={'cal-block untimed t-' + tone(r)}
                    style={{ top: 2 + i * 26, height: 24, left: 2, width: 'calc(100% - 4px)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(r);
                    }}
                  >
                    <span>{r.name} · any time</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <p className="form-note">Block lengths are estimates (2–4 hours by service). The shaded area is after the last 4 PM start.</p>
    </div>
  );
}

/* ------------------------------ day + list ------------------------------ */

function EventRow<T extends CalRow>({ r, onOpen }: { r: T; onOpen: (r: T) => void }) {
  return (
    <button className={'cal-event t-' + tone(r)} onClick={() => onOpen(r)}>
      <div className="cal-event-time">
        <strong>{r.preferred_time ?? 'Any time'}</strong>
        {!isQuote(r) && hourOf(r.preferred_time) !== null && <span>~{hoursFor(r.service)} hrs</span>}
      </div>
      <div className="cal-event-main">
        <strong>{r.name}</strong>
        <span>{r.service}</span>
        <span>{r.vehicle} · {r.location}</span>
      </div>
      <div className="cal-event-side">
        <span className={'cal-tag t-' + tone(r)}>{statusLabel(r)}</span>
        {r.kind === 'booking' && r.payment_status === 'paid' && <span>{money(r.deposit_cents ?? 0)} deposit</span>}
        {r.kind === 'booking' && r.payment_status === 'waived' && <span>No deposit</span>}
        {r.job_total_cents != null && <span>Total {money(r.job_total_cents)}</span>}
        <span>{r.phone}</span>
      </div>
    </button>
  );
}

function DayPanel<T extends CalRow>({ day, today, list, onOpen }: { day: string; today: string; list: T[]; onOpen: (r: T) => void }) {
  const d = parse(day);
  const takenTimes = new Map(list.filter((r) => r.kind === 'booking' && !isCancelled(r) && r.preferred_time).map((r) => [r.preferred_time!, r]));
  return (
    <div className="admin-panel cal-day" id="cal-day">
      <div className="cal-day-head">
        <div>
          <div className="eyebrow">{day === today ? 'TODAY' : day < today ? 'PAST DAY' : 'SELECTED DAY'}</div>
          <h3>{fmt(d, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
        </div>
        <span className="form-note">{list.length === 0 ? 'Nothing booked' : `${list.length} on the calendar`}</span>
      </div>
      <div className="cal-slots">
        {BOOKING_TIMES.map((t) => {
          const r = takenTimes.get(t);
          return r ? (
            <button key={t} className={'cal-slot taken t-' + tone(r)} onClick={() => onOpen(r)}>
              <b>{t}</b>
              <span>{r.name.split(' ')[0]}</span>
            </button>
          ) : (
            <div key={t} className="cal-slot">
              <b>{t}</b>
              <span>Open</span>
            </div>
          );
        })}
      </div>
      {list.length > 0 && (
        <div className="cal-events">
          {list.map((r) => (
            <EventRow key={r.id} r={r} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListView<T extends CalRow>({
  monthStart,
  monthEnd,
  today,
  byDay,
  onOpen,
}: {
  monthStart: Date;
  monthEnd: Date;
  today: string;
  byDay: Map<string, T[]>;
  onOpen: (r: T) => void;
}) {
  const from = ymd(monthStart);
  const to = ymd(monthEnd);
  const days = [...byDay.keys()].filter((k) => k >= from && k <= to).sort();
  if (days.length === 0) {
    return (
      <div className="admin-panel">
        <p className="lead" style={{ margin: 0 }}>Nothing on the calendar this month.</p>
      </div>
    );
  }
  return (
    <div className="cal-list">
      {days.map((k) => (
        <section key={k} className={'cal-list-day' + (k === today ? ' today' : '') + (k < today ? ' past' : '')}>
          <h4>
            {fmt(parse(k), { weekday: 'long', month: 'short', day: 'numeric' })}
            {k === today && <span className="cal-tag t-new">Today</span>}
          </h4>
          <div className="cal-events">
            {byDay.get(k)!.map((r) => (
              <EventRow key={r.id} r={r} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
