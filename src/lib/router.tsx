import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

const EVENT = 'rfd:navigate';

export function navigate(to: string) {
  const url = new URL(to, window.location.href);
  if (url.href !== window.location.href) window.history.pushState({}, '', url);
  window.dispatchEvent(new Event(EVENT));
}

export function useLocation() {
  const read = () => ({ path: window.location.pathname, hash: window.location.hash, key: Math.random() });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const update = () => setLoc(read());
    window.addEventListener(EVENT, update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return loc;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** In-app link: client-side navigation for internal paths and section anchors. */
export function Link({ href, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target === '_blank') return;
    e.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handle} {...rest} />;
}
