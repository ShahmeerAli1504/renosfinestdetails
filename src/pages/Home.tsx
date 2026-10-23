import { Link } from '../lib/router';
import { usePhotos } from '../lib/photos';
import { PhotoGrid } from '../components/PhotoGrid';
import { QuoteForm } from '../components/QuoteForm';
import { BUSINESS, CLIENTS } from '../lib/business';

const SERVICE_SUMMARY = [
  {
    id: 'interior',
    title: 'INTERIOR ONLY',
    unit: 'FROM',
    price: '$120',
    text: 'Vacuum, plastics, windows, vents and door jambs. Premium adds shampoo, stain and pet hair removal, and leather care.',
  },
  {
    id: 'full',
    title: 'EXTERIOR & INTERIOR',
    unit: 'FROM',
    price: '$165',
    text: 'Hand wash and wax, wheels and tire shine, plus a full interior clean. Our most popular way to bring a vehicle back.',
  },
  {
    id: 'paint',
    title: 'PAINT ENHANCEMENT',
    unit: 'FROM',
    price: '$400',
    text: 'Clay bar, decontamination, and one- or two-step polishing to remove swirls, scratches and oxidation.',
  },
  {
    id: 'rv-boat',
    title: 'RV & BOAT',
    unit: 'FROM',
    price: '$7/ft',
    text: 'Wash, or wash and wax, for motorhomes and boats, priced by the foot. Slide-outs, gutters, hulls and decks included.',
  },
];

export function Home() {
  const photos = usePhotos();
  const homePhotos = (photos.some((p) => p.showOnHome) ? photos.filter((p) => p.showOnHome) : photos).slice(0, 9);

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
            True, high-level craftsmanship at an affordable price. Interior and exterior detailing, paint enhancement,
            and RV and boat care for Reno, Sparks, Carson City, Truckee and surrounding areas.
          </p>
          <div className="actions">
            <Link className="btn" href="/book">BOOK YOUR DETAIL ↗</Link>
            <Link className="btn ghost" href="/services">SEE SERVICES &amp; PRICING →</Link>
          </div>
          <div className="hero-foot">
            <span>LOCALLY OWNED</span>
            <span>5+ YEARS EXPERIENCE</span>
            <span>HUNDREDS OF VEHICLES DETAILED</span>
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
              HONEST PRICES.
            </h2>
            <p>
              From everyday commuters and work trucks to motorhomes and boats, we tailor every detail to the vehicle
              and the finish you want.
            </p>
          </div>
          <div className="cards">
            {SERVICE_SUMMARY.map((s, i) => (
              <article className="card" key={s.id}>
                <span className="num">0{i + 1} /</span>
                <h3>{s.title}</h3>
                <div className="from">
                  <small>{s.unit}</small> <strong>{s.price}</strong>
                </div>
                <p>{s.text}</p>
                <Link href={'/services#svc-' + s.id}>SEE PACKAGES →</Link>
              </article>
            ))}
          </div>
          <div className="actions" style={{ justifyContent: 'center', marginTop: 34 }}>
            <Link className="btn" href="/services">VIEW FULL PRICING →</Link>
          </div>
        </div>
      </section>

      <section className="section alt" id="about">
        <div className="wrap feature">
          <img src="/assets/work-23.webp" alt="Classic light-blue MGB roadster after detailing" />
          <div>
            <div className="eyebrow">MEET THE OWNER</div>
            <h2>
              HI, I'M {BUSINESS.owner.toUpperCase()}.
              <br />
              WELCOME TO THE FINEST.
            </h2>
            <div className="line" />
            <p>
              I'm the owner and founder of Reno's Finest Details. I've been detailing for over 5 years and have detailed
              hundreds of vehicles. I started this business with a simple mission: bring true, high-level craftsmanship
              back to car care at an affordable price.
            </p>
            <p>
              Whether it's your daily driver, family SUV, work truck, RV, boat, or a special project, my goal is simple:
              help your vehicle look and feel its best.
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

      <section className="clients">
        <div className="wrap">
          <span className="eyebrow">PROUD TO HAVE DETAILED FOR</span>
          <ul>
            {CLIENTS.map((c) => (
              <li key={c}>{c}</li>
            ))}
            <li>And many more</li>
          </ul>
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
              vehicles, and to have detailed for Sparks Marina RV Park, Pizzava, Cruz Construction, and local car clubs.
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
              Stains and pet hair are covered in every Premium package, or book Spot Cleaning ($115) for just the stains
              on your seats or carpets.
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
              Tell us about your vehicle and the services you're interested in. We'll follow up to confirm the job,
              availability, and your price. Ready to lock in a date? <Link href="/book">Book online</Link> with a $
              {BUSINESS.deposit} deposit.
            </p>
            <div className="detail">
              <small>CALL OR TEXT</small>
              <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>
            </div>
            <div className="detail">
              <small>HOURS</small>
              <span>{BUSINESS.hours}</span>
              <span className="sub">{BUSINESS.hoursNote}</span>
            </div>
            <div className="detail">
              <small>SERVICE AREA</small>
              <span>{BUSINESS.serviceArea}</span>
            </div>
            <div className="detail">
              <small>FOLLOW US</small>
              <a href={BUSINESS.instagram} target="_blank" rel="noopener">Instagram {BUSINESS.instagramHandle} ↗</a>
              <a href={BUSINESS.facebook} target="_blank" rel="noopener">Facebook {BUSINESS.facebookHandle} ↗</a>
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
