import type { Category } from './photos';

export type Video = {
  id: string;
  src: string;
  poster: string;
  title: string;
  alt: string;
  cat: Category;
};

/** Short walk-around clips of finished details, shown on the home page and in the gallery. */
export const VIDEOS: Video[] = [
  {
    id: 'ford-expedition',
    src: '/assets/videos/ford-expedition.mp4',
    poster: '/assets/videos/ford-expedition.jpg',
    title: 'Ford Expedition',
    alt: 'Walk-around of a white Ford Expedition after a full detail at sunset',
    cat: 'vehicles',
  },
  {
    id: 'luxury-motorhome',
    src: '/assets/videos/luxury-motorhome.mp4',
    poster: '/assets/videos/luxury-motorhome.jpg',
    title: 'Luxury Motorhome',
    alt: 'Walk-around of a luxury motorhome after an RV wash',
    cat: 'fleet',
  },
  {
    id: 'classic-gmc-truck',
    src: '/assets/videos/classic-gmc-truck.mp4',
    poster: '/assets/videos/classic-gmc-truck.jpg',
    title: 'Classic GMC Pickup',
    alt: 'Walk-around of a two-tone classic GMC pickup after detailing',
    cat: 'vehicles',
  },
];
