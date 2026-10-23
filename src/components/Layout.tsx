import { useEffect, useState, type ReactNode } from 'react';
import { Link } from '../lib/router';
import { BUSINESS } from '../lib/business';

export function Layout({ children, path }: { children: ReactNode; path: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const close = () => setOpen(false);

  return (
    <>
      <div className="top">
        <div className="wrap">
          <span>RENO, NEVADA • MOBILE DETAILING &amp; SURROUNDING AREAS</span>
          <a href={BUSINESS.phoneHref}>CALL: {BUSINESS.phoneDisplay}</a>
        </div>
      </div>
      <header>
        <div className="wrap nav">
          <Link className="brand" href="/#home" onClick={close}>
            <img src="/assets/logo.webp" alt="Reno's Finest Details logo" />
            <span>RENO'S FINEST DETAILS</span>
          </Link>
          <button className="hamb" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            ☰
          </button>
          <nav className={'links' + (open ? ' open' : '')}>
            <Link href="/#home" onClick={close}>HOME</Link>
            <Link href="/#services" onClick={close}>SERVICES</Link>
            <Link href="/gallery" onClick={close}>GALLERY</Link>
            <Link href="/#about" onClick={close}>ABOUT</Link>
            <Link href="/#contact" onClick={close}>CONTACT</Link>
            <Link className="btn" href="/#contact" onClick={close}>REQUEST A DETAIL ↗</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="footer">
        <div className="wrap">
          <div className="footgrid">
            <div>
              <div className="brand">
                <img src="/assets/logo.webp" alt="Reno's Finest Details logo" />
                RENO'S FINEST DETAILS
              </div>
              <p>Professional mobile auto detailing serving Reno and surrounding areas. Local care, standout results.</p>
            </div>
            <div>
              <h4>EXPLORE</h4>
              <Link href="/#home">Home</Link>
              <Link href="/#services">Services</Link>
              <Link href="/gallery">Gallery</Link>
              <Link href="/#contact">Request a Detail</Link>
            </div>
            <div>
              <h4>CONNECT</h4>
              <a href={BUSINESS.phoneHref}>{BUSINESS.phoneDisplay}</a>
              <a href={BUSINESS.instagram} target="_blank" rel="noopener">Instagram ↗</a>
              <a href={BUSINESS.linktree} target="_blank" rel="noopener">Linktree ↗</a>
            </div>
          </div>
          <div className="copyright">
            © <span id="year">{new Date().getFullYear()}</span> {BUSINESS.legalName}. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
