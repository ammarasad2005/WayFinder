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
}

const YANGO_BASE = 'https://yango.go.link/route';

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
  url.searchParams.set('ref', ref);
  url.searchParams.set('lang', 'en'); // Use English language for UI

  // Only set starting coordinates if they are explicitly provided
  if (startLat !== undefined && startLng !== undefined) {
    url.searchParams.set('start-lat', startLat.toFixed(6));
    url.searchParams.set('start-lon', startLng.toFixed(6));
  }
  
  url.searchParams.set('end-lat', endLat.toFixed(6));
  url.searchParams.set('end-lon', endLng.toFixed(6));

  // Determine fallback URL (web order page)
  let resolvedFallback = fallbackUrl;
  if (!resolvedFallback) {
    // Format the official Yango web ordering fallback:
    // https://yango.com/en_int/order/?gfrom=lon,lat&gto=lon,lat&ref=ref
    const fallbackBase = 'https://yango.com/en_int/order/';
    const fallbackParams = new URLSearchParams();
    
    if (startLat !== undefined && startLng !== undefined) {
      // Yango's web ordering uses `gfrom=longitude,latitude`
      fallbackParams.set('gfrom', `${startLng.toFixed(6)},${startLat.toFixed(6)}`);
    }
    // Yango's web ordering uses `gto=longitude,latitude`
    fallbackParams.set('gto', `${endLng.toFixed(6)},${endLat.toFixed(6)}`);
    fallbackParams.set('ref', ref);
    
    resolvedFallback = `${fallbackBase}?${fallbackParams.toString()}`;
  }

  url.searchParams.set('adj_fallback', resolvedFallback);

  return url.toString();
}

/**
 * Builds a Yango URL using only the destination.
 * We omit starting coordinates so the native Yango app automatically uses 
 * the mobile device's high-accuracy GPS for the pickup location. 
 * This avoids inter-city tariff loading failures and loading screen hangs.
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
