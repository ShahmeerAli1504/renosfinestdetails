import { useEffect } from 'react';
import { Link } from '../lib/router';
import { ADD_ONS, BUSINESS, SERVICE_GROUPS } from '../lib/business';

export function Services() {
  useEffect(() => {
    document.title = "Services & Pricing | Reno's Finest Details";
  }, []);

  return (
    <main id="services-page">
      <section className="page-hero">
        <div className="wrap">
          <div className="eyebrow">SERVICES &amp; PRICING</div>
          <h1>HONEST PRICES. FINEST RESULTS.</h1>
          <p>
            Every package, every price. Final prices may vary depending on the size, condition, and services requested.
          </p>
          <nav className="jump">
            {SERVICE_GROUPS.map((g) => (
              <Link key={g.id} href={'/services#svc-' + g.id}>{g.title}</Link>
            ))}
            <Link href="/services#svc-addons">Add-Ons</Link>
            <Link href="/services#svc-booking">Booking</Link>
          </nav>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 30 }}>
        <div className="wrap">
          {SERVICE_GROUPS.map((g) => (
            <div className="price-group" key={g.id} id={'svc-' + g.id}>
              <div className="price-group-head">
                <span className="num">{g.num} /</span>
                <h3>{g.title}</h3>
                <p>{g.blurb}</p>
              </div>
              <div className={'price-grid n' + g.tiers.length}>
                {g.tiers.map((t) => (
                  <article className="price-card" key={t.name}>
                    <h4>{t.name}</h4>
                    <div className="price">
                      {t.unit === 'starting at' && <small>STARTS AT</small>}
                      <strong>{t.price}</strong>
                      {t.unit === 'per foot' && <small>/ FOOT</small>}
                    </div>
                    {t.intro && <p className="intro">{t.intro}</p>}
                    <ul>
                      {t.items.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                    <Link href={'/book?service=' + encodeURIComponent(t.option)}>BOOK THIS →</Link>
                  </article>
                ))}
              </div>
              {g.note && <p className="price-note">{g.note}</p>}
            </div>
          ))}

          <div className="price-group" id="svc-addons">
            <div className="price-group-head">
              <span className="num">05 /</span>
              <h3>Add-Ons</h3>
              <p>Add any of these to your detail. Ask us about pricing.</p>
            </div>
            <div className="chips">
              {ADD_ONS.map((a) => (
                <span className="chip" key={a}>{a}</span>
              ))}
            </div>
          </div>

          <div className="policy" id="svc-booking">
            <div>
              <div className="eyebrow">BOOKING &amp; DEPOSIT</div>
              <h3>${BUSINESS.deposit} SECURES YOUR DATE.</h3>
            </div>
            <ul>
              <li>A ${BUSINESS.deposit} deposit holds your date and time, and it goes toward your total.</li>
              <li>Cancel 48+ hours in advance and your deposit is refunded.</li>
              <li>Cancellations within 48 hours are non-refundable.</li>
              <li>Pay your deposit securely online when you <Link href="/book">book</Link>.</li>
            </ul>
          </div>
          <p className="form-note" style={{ marginTop: 18 }}>
            Final prices may vary depending on the size, condition, and services requested.
          </p>
          <div className="actions" style={{ justifyContent: 'center' }}>
            <Link href="/book" className="btn">BOOK ONLINE ↗</Link>
            <Link href="/#contact" className="btn ghost">REQUEST A QUOTE</Link>
            <a href={BUSINESS.phoneHref} className="btn ghost">CALL {BUSINESS.phoneDisplay}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
