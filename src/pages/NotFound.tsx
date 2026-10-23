import { Link } from '../lib/router';

export function NotFound() {
  return (
    <main>
      <section className="page-hero" style={{ minHeight: '50vh' }}>
        <div className="wrap">
          <div className="eyebrow">404</div>
          <h1>PAGE NOT FOUND.</h1>
          <p>The page you're looking for doesn't exist or has moved.</p>
          <div className="actions">
            <Link className="btn" href="/">BACK TO HOME →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
