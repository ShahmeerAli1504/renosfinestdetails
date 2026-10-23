import { Link } from '../lib/router';
import { usePhotos } from '../lib/photos';
import { PhotoGrid } from '../components/PhotoGrid';
import { QuoteForm } from '../components/QuoteForm';
import { BUSINESS } from '../lib/business';

const SERVICES = [
  {
    title: 'FULL DETAIL',
    text: 'Comprehensive interior and exterior refresh to restore a clean, polished look throughout your vehicle.',
    cta: 'REQUEST A QUOTE →',
  },
  {
    title: 'INTERIOR DEEP CLEAN',
    text: 'Deep vacuuming, upholstery and carpet attention, targeted stain treatment, and steam cleaning where appropriate.',
    cta: 'REQUEST A QUOTE →',
  },
  {
    title: 'EXTERIOR DETAIL',
    text: 'Careful hand washing, grime removal, trim attention, wax and protective finish options.',
    cta: 'REQUEST A QUOTE →',
  },
  {
    title: 'PAINT & PROTECTION',
    text: 'Ask about paint correction, polishing, and ceramic coating options for your vehicle.',
    cta: 'ASK ABOUT OPTIONS →',
  },
];

export function Home() {
  const photos = usePhotos();
  const homePhotos = (photos.some((p) => p.showOnHome) ? photos.filter((p) => p.showOnHome) : photos).slice(0, 6);

  return (
    <main id="home-page">
      <section className="hero" id="home">
        <div className="wrap">
          <div className="eyebrow">RENO'S PREMIER MOBILE AUTO DETAILING</div>
          <h1>
            EVERY DETAIL.
            <br />
            <span>DONE RIGHT.</span>
          </h1>
          <p>
            Premium interior and exterior care that brings back the shine, comfort, and pride in your ride. Professional
            mobile detailing in Reno and surrounding areas.
          </p>
          <div className="actions">
            <Link className="btn" href="/#contact">REQUEST YOUR DETAIL ↗</Link>
            <Link className="btn ghost" href="/#services">EXPLORE SERVICES →</Link>
          </div>
          <div className="hero-foot">
            <span>LOCALLY OWNED</span>
            <span>LICENSED &amp; INSURED</span>
            <span>MOBILE CONVENIENCE</span>
          </div>
        </div>
      </section>

      <section className="section" id="services">
        <div className="wrap">
          <div className="eyebrow">WHAT WE DO</div>
          <div className="head">
            <h2>
              EXCEPTIONAL CARE.
              <br />
              INSIDE &amp; OUT.
            </h2>
            <p>
              From everyday commuters to treasured classics and hard-working fleets, we tailor the detail to the vehicle
              and the finish you want.
            </p>
          </div>
          <div className="cards">
            {SERVICES.map((s, i) => (
              <article className="card" key={s.title}>
                <span className="num">0{i + 1} /</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <Link href="/#contact">{s.cta}</Link>
              </article>
            ))}
          </div>
          <p className="form-note" style={{ marginTop: 22 }}>
            Service availability and final pricing are confirmed directly by the business after reviewing your vehicle and
            its condition.
          </p>
        </div>
      </section>

      <section className="section alt" id="about">
        <div className="wrap feature">
          <img src="/assets/work-03.webp" alt="Detailed white GMC truck" />
          <div>
            <div className="eyebrow">LOCAL ROOTS. PREMIUM RESULTS.</div>
            <h2>
              PROUD TO SERVE
              <br />
              THE RENO AREA.
            </h2>
            <div className="line" />
            <p>
              Reno's Finest Details is a locally owned mobile auto detailing business serving Reno, Nevada and
              surrounding communities. We take pride in thoughtful workmanship, quality cleaning, and treating each
              vehicle with the care it deserves.
            </p>
            <p>
              Whether it's your daily driver, family SUV, work truck, recreational vehicle, or a special project, our goal
              is simple: help your vehicle look and feel its best.
            </p>
            <div className="quote">
              “Had the honor and pleasure to detail two beautiful classics, a '67 Camino and a '51 GMC, featured at the
              auto museum.”
            </div>
            <div className="actions">
              <Link href="/#contact" className="btn">GET IN TOUCH ↗</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">RECENT WORK</div>
          <div className="head">
            <h2>
              THE WORK
              <br />
              SPEAKS FOR ITSELF.
            </h2>
            <p>Real vehicles. Real details. Browse a selection of our recent projects and see the care behind every finish.</p>
          </div>
          <PhotoGrid id="home-grid" photos={homePhotos} />
          <div className="actions" style={{ justifyContent: 'center', marginTop: 30 }}>
            <Link className="btn ghost" href="/gallery">VIEW FULL GALLERY →</Link>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap feature">
          <div>
            <div className="eyebrow">TRUSTED FOR THE TOUGH JOBS</div>
            <h2>
              BUILT FOR MORE
              <br />
              THAN A QUICK WASH.
            </h2>
            <div className="line" />
            <p>
              We're proud to have supported the Reno Rodeo with a full interior and exterior service for seven Polaris
              vehicles. Our team tackled caked-on mud, dust, and grime to help elevate their appearance and protect their
              surfaces.
            </p>
            <p>
              Heavy buildup can contribute to stains and surface deterioration over time. Regular, careful detailing helps
              keep work and recreation vehicles ready for what comes next.
            </p>
            <Link className="btn" href="/#contact">ASK ABOUT FLEET DETAILING →</Link>
          </div>
          <img src="/assets/work-01.webp" alt="Polaris off-road utility vehicles serviced for Reno Rodeo" />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">DETAILS THAT MATTER</div>
          <div className="head">
            <h2>
              A CLEANER CABIN.
              <br />
              A BETTER DRIVE.
            </h2>
            <p>
              For tough interior stains, our process may include targeted enzyme treatment, citrus-based cleaning, steam,
              and a finishing neutralization step as appropriate for the material.
            </p>
          </div>
          <div className="compare">
            <figure>
              <img src="/assets/work-10.webp" alt="Vehicle center console before detailing" />
              <figcaption>BEFORE</figcaption>
            </figure>
            <figure>
              <img src="/assets/work-11.webp" alt="Vehicle center console after detailing" />
              <figcaption>AFTER</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="section alt" id="contact">
        <div className="wrap contact-layout">
          <div className="contact-info">
            <div className="eyebrow">LET'S GET YOUR VEHICLE LOOKING ITS BEST</div>
            <h2>
              REQUEST YOUR
              <br />
              NEXT DETAIL.
            </h2>
            <p>
              Tell us about your vehicle and the services you're interested in. We'll follow up to discuss the job,
              availability, and a personalized quote.
            </p>
            <div className="detail">
              <small>CALL OR TEXT</small>
              <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>
            </div>
            <div className="detail">
              <small>INSTAGRAM</small>
              <a href={BUSINESS.instagram} target="_blank" rel="noopener">{BUSINESS.instagramHandle} ↗</a>
            </div>
            <div className="detail">
              <small>MORE WAYS TO CONNECT</small>
              <a href={BUSINESS.linktree} target="_blank" rel="noopener">VISIT OUR LINKTREE ↗</a>
            </div>
            <div className="detail">
              <small>SERVICE AREA</small>
              <span>Reno, Nevada &amp; surrounding areas</span>
            </div>
          </div>
          <QuoteForm />
        </div>
      </section>

      <section className="banner">
        <div className="wrap">
          <h2>YOUR VEHICLE DESERVES THE FINEST.</h2>
          <p>Ready to bring back that fresh-detail feeling?</p>
          <a href={BUSINESS.phoneHref} className="btn">CALL {BUSINESS.phoneDisplay} ↗</a>
        </div>
      </section>
    </main>
  );
}
