import { useCallback, useEffect, useRef, useState } from 'react';
import type { Video } from '../lib/videos';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A muted, looping preview that only plays while it is on screen. */
function ReelTile({ v, onOpen }: { v: Video; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <button className="reel-tile" aria-label={`Play video: ${v.alt}`} onClick={onOpen}>
      <video ref={ref} src={v.src} poster={v.poster} muted loop playsInline preload="none" aria-hidden="true" />
      <span className="reel-play" aria-hidden="true">▶</span>
      <span className="reel-label">{v.title}</span>
    </button>
  );
}

/** Portrait video tiles plus a full-screen player with sound and previous/next arrows. */
export function VideoReel({ videos }: { videos: Video[] }) {
  const [current, setCurrent] = useState<number | null>(null);
  const isOpen = current !== null && videos.length > 0;
  const close = useCallback(() => setCurrent(null), []);
  const next = useCallback(() => setCurrent((c) => (c === null ? c : (c + 1) % videos.length)), [videos.length]);
  const prev = useCallback(
    () => setCurrent((c) => (c === null ? c : (c - 1 + videos.length) % videos.length)),
    [videos.length],
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

  if (videos.length === 0) return null;
  const v = isOpen ? videos[Math.min(current!, videos.length - 1)] : null;

  return (
    <>
      <div className={'reel n' + Math.min(videos.length, 3)}>
        {videos.map((vid, i) => (
          <ReelTile key={vid.id} v={vid} onOpen={() => setCurrent(i)} />
        ))}
      </div>
      <div
        className={'lightbox' + (isOpen ? ' show' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Video player"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <button className="lbbtn close" aria-label="Close video" onClick={close}>×</button>
        {videos.length > 1 && <button className="lbbtn prev" aria-label="Previous video" onClick={prev}>‹</button>}
        {v && <video key={v.id} className="lb-video" src={v.src} poster={v.poster} controls autoPlay playsInline />}
        {videos.length > 1 && <button className="lbbtn next" aria-label="Next video" onClick={next}>›</button>}
        <div className="caption">{v ? `${current! + 1} / ${videos.length}  •  ${v.title}` : ''}</div>
      </div>
    </>
  );
}
