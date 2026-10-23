import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { usePhotos, type Category } from '../lib/photos';
import { PhotoGrid } from '../components/PhotoGrid';

const FILTERS: { key: 'all' | Category; label: string }[] = [
  { key: 'all', label: 'ALL PROJECTS' },
  { key: 'vehicles', label: 'VEHICLES' },
  { key: 'fleet', label: 'FLEET & RECREATION' },
  { key: 'interior', label: 'INTERIOR TRANSFORMATIONS' },
];

export function Gallery() {
  const photos = usePhotos();
  const [filter, setFilter] = useState<'all' | Category>('all');

  // The original stylesheet shows #gallery-page only in body.gallery-mode.
  useEffect(() => {
    document.body.classList.add('gallery-mode');
    document.title = "Gallery | Reno's Finest Details";
    return () => {
      document.body.classList.remove('gallery-mode');
    };
  }, []);

  const visible = photos.filter((p) => filter === 'all' || p.cat === filter);

  return (
    <main id="gallery-page">
      <section className="page-hero">
        <div className="wrap">
          <div className="eyebrow">OUR WORK</div>
          <h1>THE DETAIL GALLERY.</h1>
          <p>Explore recent projects, fleet work, vehicle finishes, and interior transformations.</p>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f.key} className={'filter' + (filter === f.key ? ' active' : '')} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <PhotoGrid key={filter} id="gallery-grid" photos={visible} />
          <div className="actions" style={{ justifyContent: 'center' }}>
            <Link href="/#contact" className="btn">REQUEST YOUR DETAIL ↗</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
