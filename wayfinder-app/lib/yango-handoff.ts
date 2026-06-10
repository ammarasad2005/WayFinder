// lib/yango-handoff.ts
// Builds the Yango redirect URL using the confirmed go.link format.
// https://yango.go.link/route?start-lat=X&start-lon=Y&end-lat=A&end-lon=B

export interface YangoHandoffParams {
  startLat?: number;
  startLng?: number;
  endLat: number;
  endLng: number;
  /** Fallback URL if Yango app is not installed */
  fallbackUrl?: string;
}

const YANGO_BASE = 'https://yango.go.link/route';
const YANGO_FALLBACK = 'https://yango.com';

/**
 * Builds a Yango deep link that:
 * - Opens the Yango app with destination pre-filled (if installed)
 * - Falls back to yango.com if app is not installed
 */
export function buildYangoUrl(params: YangoHandoffParams): string {
  const { startLat, startLng, endLat, endLng, fallbackUrl } = params;

  const url = new URL(YANGO_BASE);
  
  // Only set starting coordinates if they are explicitly provided
  if (startLat !== undefined && startLng !== undefined) {
    url.searchParams.set('start-lat', startLat.toFixed(6));
    url.searchParams.set('start-lon', startLng.toFixed(6));
  }
  
  url.searchParams.set('end-lat', endLat.toFixed(6));
  url.searchParams.set('end-lon', endLng.toFixed(6));

  if (fallbackUrl) {
    url.searchParams.set('adj_fallback', fallbackUrl);
  } else {
    url.searchParams.set('adj_fallback', YANGO_FALLBACK);
  }

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
