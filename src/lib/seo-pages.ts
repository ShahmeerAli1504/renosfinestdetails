/**
 * SEO settings for every page, in one place.
 *
 * Used in two spots:
 *  - vite.config.ts, at build time, to write a separate HTML file per page with the right
 *    <title>, description, canonical and social tags already in it (so Google, Facebook,
 *    iMessage, etc. see them without running JavaScript);
 *  - src/lib/seo.ts, in the browser, to update the same tags when the visitor navigates.
 *
 * Keep this file free of browser-only code; it also runs in Node during the build.
 * If you add a page, add it here AND to public/sitemap.xml.
 */

/** The live domain, no trailing slash. */
export const SITE_URL = 'https://renosfinestdetails.com';

export const SITE_NAME = "Reno's Finest Details";

/** Default social share image (1200×630 is ideal; this is the best existing photo). */
export const DEFAULT_IMAGE = '/assets/work-08.webp';

export type PageSeo = {
  /** Canonical path. */
  path: string;
  title: string;
  description: string;
  /** Short name used in breadcrumbs. */
  crumb?: string;
  /** Keep this page out of search results. */
  noindex?: boolean;
  image?: string;
};

export const PAGES: Record<string, PageSeo> = {
  '/': {
    path: '/',
    title: "Reno's Finest Details | Mobile Auto Detailing in Reno, NV",
    description:
      'Mobile auto detailing in Reno, Sparks, Carson City & Truckee. Interior from $120, full details from $165, paint polishing, RV & boat wash. Call (775) 857-0381.',
    crumb: 'Home',
  },
  '/services': {
    path: '/services',
    title: "Auto Detailing Prices in Reno, NV | Reno's Finest Details",
    description:
      'Detailing prices: interior from $120, exterior & interior from $165, paint polishing from $400, RV & boat care from $7/ft, maintenance plans from $90.',
    crumb: 'Services & Pricing',
  },
  '/gallery': {
    path: '/gallery',
    title: "Detailing Gallery: Before & After Photos | Reno's Finest Details",
    description:
      'See our recent car, truck, RV, boat and fleet detailing work in Reno, plus interior before-and-after transformations and walk-around videos.',
    crumb: 'Gallery',
    image: '/assets/work-23.webp',
  },
  '/book': {
    path: '/book',
    title: "Book Mobile Detailing Online | Reno's Finest Details",
    description:
      'Pick your detailing service, date and time, and secure your appointment with a $50 deposit. Open 7 days, 6 AM–8 PM in Reno, Sparks, Carson City & Truckee.',
    crumb: 'Book Online',
  },
  '/admin': {
    path: '/admin',
    title: "Admin | Reno's Finest Details",
    description: "Reno's Finest Details admin.",
    noindex: true,
  },
};

/** /pricing is an alias of /services. */
export const ALIASES: Record<string, string> = { '/pricing': '/services' };

export const NOT_FOUND: PageSeo = {
  path: '/404',
  title: "Page Not Found | Reno's Finest Details",
  description: "The page you're looking for doesn't exist or has moved.",
  noindex: true,
};

export function seoFor(route: string): PageSeo {
  const r = ALIASES[route] ?? route;
  return PAGES[r] ?? NOT_FOUND;
}

export const absUrl = (p: string) => SITE_URL + (p === '/' ? '/' : p);

export function breadcrumbJsonLd(page: PageSeo) {
  if (page.path === '/' || page.noindex) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl('/') },
      { '@type': 'ListItem', position: 2, name: page.crumb ?? page.title, item: absUrl(page.path) },
    ],
  };
}
