// lib/yango-handoff.ts
// Builds the Yango redirect URL using the confirmed go.link format.
// https://yango.go.link/route?start-lat=X&start-lon=Y&end-lat=A&end-lon=B

export interface YangoHandoffParams {
  startLat: number;
  startLng: number;
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
  url.searchParams.set('start-lat', startLat.toFixed(6));
  url.searchParams.set('start-lon', startLng.toFixed(6));
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
 * Builds a Yango URL using only the destination (pickup = current location).
 * startLat/Lng defaults to Islamabad center when user location is unavailable.
 */
export function buildYangoUrlFromDestination(
  destLat: number,
  destLng: number,
  userLat?: number,
  userLng?: number
): string {
  // Default pickup: Islamabad city center
  const startLat = userLat ?? 33.6844;
  const startLng = userLng ?? 73.0479;

  return buildYangoUrl({
    startLat,
    startLng,
    endLat: destLat,
    endLng: destLng,
  });
}
