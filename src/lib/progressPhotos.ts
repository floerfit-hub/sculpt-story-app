import { supabase } from "@/integrations/supabase/client";

const BUCKET = "progress-photos";
const SIGN_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Convert a stored value (either a legacy public URL or a storage path) into
 * an object path inside the `progress-photos` bucket.
 * Returns null if we can't extract one (e.g. external URL).
 */
export const extractProgressPhotoPath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  // Strip cache-buster query
  const clean = value.split("?")[0];
  // Already a path (no protocol) — return as-is
  if (!/^https?:\/\//i.test(clean)) return clean;
  // Match both /object/public/<bucket>/<path> and /object/sign/<bucket>/<path>
  const m = clean.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/progress-photos\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
};

const cache = new Map<string, { url: string; expires: number }>();

export const getSignedProgressPhotoUrl = async (value: string | null | undefined): Promise<string | null> => {
  const path = extractProgressPhotoPath(value);
  if (!path) return null;
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expires: Date.now() + SIGN_TTL_SECONDS * 1000 });
  return data.signedUrl;
};

/** Sign many at once, preserving order (null for unresolvable). */
export const getSignedProgressPhotoUrls = async (values: (string | null | undefined)[]): Promise<(string | null)[]> => {
  return Promise.all(values.map((v) => getSignedProgressPhotoUrl(v)));
};