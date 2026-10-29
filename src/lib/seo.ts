import { DEFAULT_IMAGE, absUrl, breadcrumbJsonLd, seoFor } from './seo-pages';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Update title, description, canonical, robots and social tags for the current route. */
export function applySeo(route: string) {
  const page = seoFor(route);
  const url = absUrl(page.path);
  const image = absUrl(page.image ?? DEFAULT_IMAGE);

  document.title = page.title;
  setMeta('name', 'description', page.description);
  setMeta('name', 'robots', page.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  setMeta('property', 'og:title', page.title);
  setMeta('property', 'og:description', page.description);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', image);
  setMeta('name', 'twitter:title', page.title);
  setMeta('name', 'twitter:description', page.description);
  setMeta('name', 'twitter:image', image);
  if (!page.noindex) setLink('canonical', url);
  else document.head.querySelector('link[rel="canonical"]')?.remove();

  const id = 'ld-breadcrumb';
  document.getElementById(id)?.remove();
  const crumbs = breadcrumbJsonLd(page);
  if (crumbs) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = id;
    s.textContent = JSON.stringify(crumbs);
    document.head.appendChild(s);
  }
}
