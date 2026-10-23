import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The Supabase client, or null when the env vars aren't set yet.
 * Without it the public site still works: the gallery uses the bundled photos
 * and the form falls back to a prefilled text message, like the original demo.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export const GALLERY_BUCKET = 'gallery';
