import { useEffect } from 'react';
import { useLocation } from './lib/router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Gallery } from './pages/Gallery';
import { Admin } from './pages/Admin';
import { NotFound } from './pages/NotFound';

const HOME_TITLE = "Reno's Finest Details | Premium Mobile Auto Detailing Reno NV";

export function App() {
  const { path, hash, key } = useLocation();

  // Old demo links used /#gallery — send them to the real gallery page.
  useEffect(() => {
    if (path === '/' && hash === '#gallery') window.history.replaceState({}, '', '/gallery');
  }, [path, hash]);

  const route = path.replace(/\/+$/, '') || '/';

  useEffect(() => {
    if (route === '/') document.title = HOME_TITLE;
    if (hash && hash !== '#gallery') {
      const t = setTimeout(() => document.querySelector(hash)?.scrollIntoView(), 20);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [route, hash, key]);

  let page;
  if (route === '/' && hash === '#gallery') page = <Gallery />;
  else if (route === '/') page = <Home />;
  else if (route === '/gallery') page = <Gallery />;
  else if (route === '/admin') page = <Admin />;
  else page = <NotFound />;

  return <Layout path={path + hash + key}>{page}</Layout>;
}
