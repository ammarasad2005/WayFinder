// lib/yango-handoff.ts
// Builds the Yango redirect URL using the confirmed go.link format from the partner documentation.
// https://yango.com/en_int/partner-program/documentation/

export interface YangoHandoffParams {
  startLat?: number;
  startLng?: number;
  endLat: number;
  endLng: number;
  /** Custom fallback URL if Yango app is not installed (optional) */
  fallbackUrl?: string;
  /** Affiliate / source ID (optional, defaults to 'wayfinder') */
  ref?: string;
  /** Locale directory for Yango web portal (optional, defaults to 'en_pk') */
  locale?: string;
}

const YANGO_BASE = 'https://yango.go.link/route';

/**
 * Generates a direct web ordering URL for Yango (bypassing Adjust tracking domain).
 * Used as a secondary fallback if the Adjust tracking proxy hangs or gets blocked.
 */
export function buildDirectWebOrderUrl(params: YangoHandoffParams): string {
  const { startLat, startLng, endLat, endLng, locale = 'en_pk', ref = 'wayfinder' } = params;
  
  const fallbackBase = `https://yango.com/${locale}/order/`;
  const fallbackParams = new URLSearchParams();
  
  // Always guarantee start coordinates are populated
  const resolvedStartLat = startLat ?? endLat;
  const resolvedStartLng = startLng ?? endLng;
  
  // Yango web order interface accepts gfrom/gto in (longitude,latitude) format
  fallbackParams.set('gfrom', `${resolvedStartLng.toFixed(6)},${resolvedStartLat.toFixed(6)}`);
  fallbackParams.set('gto', `${endLng.toFixed(6)},${endLat.toFixed(6)}`);
  fallbackParams.set('ref', ref);
  
  return `${fallbackBase}?${fallbackParams.toString()}`;
}

/**
 * Reusable wrapper to construct web fallback URLs with proper parameter typing.
 */
export function buildWebOrderFallbackUrl(params: YangoHandoffParams): string {
  return buildDirectWebOrderUrl(params);
}

/**
 * Builds a Yango deep link that:
 * - Opens the Yango app with destination pre-filled (if installed)
 * - Falls back to the Yango Web Order flow with coordinates prefilled (if not installed)
 */
export function buildYangoUrl(params: YangoHandoffParams): string {
  const { startLat, startLng, endLat, endLng, fallbackUrl, ref = 'wayfinder' } = params;

  const url = new URL(YANGO_BASE);
  
  // Required Technical parameters for Adjust tracking/deeplinking to work correctly
  url.searchParams.set('adj_t', 'vokme8e_nd9s9z9'); // Widget tracker token
  url.searchParams.set('adj_deeplink_js', '1');
  url.searchParams.set('utm_source', 'widget');
  url.searchParams.set('adj_adgroup', 'widget');
  url.searchParams.set('adj_channel', ref);
  url.searchParams.set('ref', ref);
  url.searchParams.set('lang', 'en'); // Use English language for UI

  // Always resolve start coordinates (fallback to destination if not provided)
  const resolvedStartLat = startLat ?? endLat;
  const resolvedStartLng = startLng ?? endLng;

  url.searchParams.set('start-lat', resolvedStartLat.toFixed(6));
  url.searchParams.set('start-lon', resolvedStartLng.toFixed(6));
  
  url.searchParams.set('end-lat', endLat.toFixed(6));
  url.searchParams.set('end-lon', endLng.toFixed(6));

  // Determine fallback URL (web order page)
  const resolvedFallback = fallbackUrl || buildDirectWebOrderUrl(params);
  url.searchParams.set('adj_fallback', resolvedFallback);

  return url.toString();
}

/**
 * Builds a Yango URL using only the destination.
 * We fallback starting coordinates to destination coordinates so the Yango app 
 * registers a valid local trip instantly, preventing loading screen hangs.
 */
export function buildYangoUrlFromDestination(
  destLat: number,
  destLng: number
): string {
  return buildYangoUrl({
    endLat: destLat,
    endLng: destLng,
  });
}
