import { useCallback, useEffect, useState } from 'react';
import type { Photo } from '../lib/photos';

/** Photo tiles plus the full-size lightbox with previous/next arrows. */
export function PhotoGrid({ id, photos }: { id: string; photos: Photo[] }) {
  const [current, setCurrent] = useState<number | null>(null);
  const isOpen = current !== null && photos.length > 0;
  const close = useCallback(() => setCurrent(null), []);
  const next = useCallback(() => setCurrent((c) => (c === null ? c : (c + 1) % photos.length)), [photos.length]);
  const prev = useCallback(
    () => setCurrent((c) => (c === null ? c : (c - 1 + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close, next, prev]);

  // Swipe left/right on touch screens.
  const [touchX, setTouchX] = useState<number | null>(null);

  const p = isOpen ? photos[Math.min(current!, photos.length - 1)] : null;

  return (
    <>
      <div className="grid" id={id}>
        {photos.map((ph, i) => (
          <button key={ph.id} className="tile" aria-label={`Open ${ph.alt}`} onClick={() => setCurrent(i)}>
            <img loading="lazy" src={ph.src} alt={ph.alt} />
          </button>
        ))}
      </div>
      <div
        className={'lightbox' + (isOpen ? ' show' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Photo gallery"
        onClick={(e) => e.target === e.currentTarget && close()}
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const dx = e.changedTouches[0].clientX - touchX;
          if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
          setTouchX(null);
        }}
      >
        <button className="lbbtn close" aria-label="Close image" onClick={close}>×</button>
        <button className="lbbtn prev" aria-label="Previous image" onClick={prev}>‹</button>
        {p && <img src={p.src} alt={p.alt} />}
        <button className="lbbtn next" aria-label="Next image" onClick={next}>›</button>
        <div className="caption">
          {p ? `${current! + 1} / ${photos.length}  •  ${p.alt}` : ''}
        </div>
      </div>
    </>
  );
}
