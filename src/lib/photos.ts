import { useEffect, useState } from 'react';
import { supabase, GALLERY_BUCKET } from './supabase';

export type Category = 'vehicles' | 'fleet' | 'interior';

export type Photo = {
  id: string;
  src: string; // full URL or site-relative path
  alt: string;
  cat: Category;
  showOnHome: boolean;
};

export type PhotoRow = {
  id: string;
  storage_path: string | null;
  image_url: string | null;
  alt: string;
  category: Category;
  sort_order: number;
  is_published: boolean;
  show_on_home: boolean;
  created_at: string;
};

export const CATEGORY_LABELS: Record<Category, string> = {
  vehicles: 'Vehicles',
  fleet: 'Fleet & Recreation',
  interior: 'Interior Transformations',
};

/** The photos from the original site, used until Supabase is connected. */
export const FALLBACK_PHOTOS: Photo[] = [
  { src: 'work-01.webp', alt: 'Polaris fleet vehicles at Reno Rodeo', cat: 'fleet' },
  { src: 'work-03.webp', alt: 'White GMC Denali pickup after detailing', cat: 'vehicles' },
  { src: 'work-04.webp', alt: 'White GMC pickup with a clean glossy finish', cat: 'vehicles' },
  { src: 'work-05.webp', alt: 'White Ford SUV in sunset light', cat: 'vehicles' },
  { src: 'work-06.webp', alt: 'Front of white Ford SUV after detailing', cat: 'vehicles' },
  { src: 'work-07.webp', alt: 'Luxury motorhome exterior detailing', cat: 'fleet' },
  { src: 'work-08.webp', alt: 'Silver GMC Denali HD pickup exterior', cat: 'vehicles' },
  { src: 'work-09.webp', alt: 'Silver GMC truck after exterior detail', cat: 'vehicles' },
  { src: 'work-10.webp', alt: 'Vehicle console before interior cleaning', cat: 'interior' },
  { src: 'work-11.webp', alt: 'Vehicle console after interior cleaning', cat: 'interior' },
].map((p, i) => ({ id: p.src, src: '/assets/' + p.src, alt: p.alt, cat: p.cat as Category, showOnHome: i < 6 }));

export function rowToPhoto(r: PhotoRow): Photo {
  let src = r.image_url || '';
  if (r.storage_path && supabase) {
    src = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(r.storage_path).data.publicUrl;
  }
  return { id: r.id, src, alt: r.alt, cat: r.category, showOnHome: r.show_on_home };
}

let cache: Photo[] | null = null;

/** Published gallery photos from Supabase, falling back to the bundled set. */
export function usePhotos(): Photo[] {
  const [photos, setPhotos] = useState<Photo[]>(cache ?? FALLBACK_PHOTOS);
  useEffect(() => {
    if (!supabase || cache) return;
    let alive = true;
    supabase
      .from('gallery_photos')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!alive || error || !data || data.length === 0) return;
        cache = (data as PhotoRow[]).map(rowToPhoto);
        setPhotos(cache);
      });
    return () => {
      alive = false;
    };
  }, []);
  return photos;
}

export function clearPhotoCache() {
  cache = null;
}
